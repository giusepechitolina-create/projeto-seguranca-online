// js/canvas.js
import { state, images, dom } from './state.js';

// --- HELPERS DE DESENHO E LÓGICA ---

function getWallPolygon(el) {
    const { x1, y1, x2, y2, thickness } = el;
    const halfThick = thickness / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return [];
    const px = -dy / length;
    const py = dx / length;
    return [
        { x: x1 + px * halfThick, y: y1 + py * halfThick },
        { x: x2 + px * halfThick, y: y2 + py * halfThick },
        { x: x2 - px * halfThick, y: y2 - py * halfThick },
        { x: x1 - px * halfThick, y: y1 - py * halfThick }
    ];
}

export function getInsertableHandles(el, wall) {
    if (!wall) return {};
    const halfWidth = el.width / 2;
    const flipY = el.flip || 1; 
    const swingX = el.swing || 1;

    let handles = {
        'resize-start': { x: -halfWidth, y: 0, cursor: 'ew-resize' },
        'resize-end': { x: halfWidth, y: 0, cursor: 'ew-resize' },
        'flip': { x: 0, y: (wall.thickness / 2 + 10 / state.zoom) * flipY, cursor: 'pointer' },
    };
    if (el.type === 'door') {
        handles['swing'] = { x: (halfWidth / 2) * swingX, y: (wall.thickness / 2 + (halfWidth / 2) * Math.abs(swingX)) * flipY, cursor: 'pointer' };
    }
    return handles;
}


// --- RENDERERS DE SÍMBOLOS E SELEÇÃO ---

function drawDoorSymbol(ctx, door, wall) {
    const flipY = door.flip || 1;
    const swingX = door.swing || 1;
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    
    ctx.save();
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, -wall.thickness / 2);
    ctx.lineTo(0, wall.thickness / 2);
    ctx.stroke();
    ctx.restore();

    const pivotY = (wall.thickness / 2) * flipY;
    const pivotX = 0;

    ctx.beginPath();
    ctx.moveTo(pivotX, pivotY);
    ctx.lineTo(pivotX + (door.width * swingX), pivotY);
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    if (swingX > 0) {
        ctx.arc(pivotX, pivotY, door.width, 0, -Math.PI / 2 * flipY, flipY < 0);
    } else {
        ctx.arc(pivotX, pivotY, door.width, Math.PI, Math.PI + (Math.PI / 2 * flipY), flipY < 0);
    }
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawWindowSymbol(ctx, win, wall) {
    const halfWidth = win.width / 2;
    ctx.fillStyle = 'rgba(173, 216, 230, 0.7)';
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    
    ctx.fillRect(-halfWidth, -wall.thickness / 2, win.width, wall.thickness);
    ctx.strokeRect(-halfWidth, -wall.thickness / 2, win.width, wall.thickness);
    
    ctx.beginPath();
    ctx.moveTo(-halfWidth, 0);
    ctx.lineTo(halfWidth, 0);
    ctx.stroke();
}

function drawInsertableSelection(el, wall) {
    const { ctx } = dom;
    ctx.save();
    
    const wallDx = wall.x2 - wall.x1;
    const wallDy = wall.y2 - wall.y1;
    const cx = wall.x1 + wallDx * el.position;
    const cy = wall.y1 + wallDy * el.position;

    ctx.translate(cx, cy);
    ctx.rotate(Math.atan2(wallDy, wallDx));

    const handles = getInsertableHandles(el, wall);
    const handleSize = 8 / state.zoom;
    
    ctx.strokeStyle = '#8bc53f';
    ctx.lineWidth = 2 / state.zoom;
    ctx.setLineDash([4 / state.zoom, 2 / state.zoom]);
    ctx.strokeRect(-el.width / 2, -wall.thickness / 2, el.width, wall.thickness);
    ctx.setLineDash([]);
    
    Object.values(handles).forEach(h => {
        ctx.fillStyle = h.cursor === 'pointer' ? '#f59e0b' : '#8bc53f';
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 1.5 / state.zoom;
        ctx.beginPath();
        ctx.arc(h.x, h.y, handleSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    });

    ctx.restore();
}

function drawCoverageArea(ctx, el) {
    if (!el.vision) return;

    const { range, angle } = el.vision;
    const startAngle = -angle / 2 * (Math.PI / 180);
    const endAngle = angle / 2 * (Math.PI / 180);

    ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; // Vermelho fraco
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, range, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
}

function drawVisionHandles(el) {
    if (!el.vision) return;
    const { ctx } = dom;
    const { range, angle } = el.vision;
    const handleSize = 8 / state.zoom;
    const angleRad = angle / 2 * (Math.PI / 180);

    const rangeHandle = { x: range, y: 0 };
    const angleHandle1 = { x: range * Math.cos(angleRad), y: range * Math.sin(angleRad) };
    const angleHandle2 = { x: range * Math.cos(-angleRad), y: range * Math.sin(-angleRad) };
    
    ctx.fillStyle = '#f59e0b';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5 / state.zoom;
    [rangeHandle, angleHandle1, angleHandle2].forEach(h => {
        ctx.beginPath();
        ctx.arc(h.x, h.y, handleSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
    });
}

const elementRenderers = {
    wall: (ctx, el) => {
        const { x1, y1, x2, y2, thickness } = el;
        const halfThick = thickness / 2;
        ctx.fillStyle = '#EAEAEA';
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;

        ctx.beginPath();
        const points = getWallPolygon(el);
        if (points.length < 4) return;
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.closePath();
        ctx.arc(x1, y1, halfThick, 0, 2 * Math.PI);
        ctx.arc(x2, y2, halfThick, 0, 2 * Math.PI);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x1, y1, halfThick, Math.atan2(y2-y1, x2-x1) - Math.PI/2, Math.atan2(y2-y1, x2-x1) + Math.PI/2);
        ctx.arc(x2, y2, halfThick, Math.atan2(y1-y2, x1-x2) - Math.PI/2, Math.atan2(y1-y2, x1-x2) + Math.PI/2);
        ctx.closePath();
        ctx.stroke();
    },
    object: (ctx, el) => {
        drawCoverageArea(ctx, el);
        const img = images[el.subType];
        if (img?.complete) ctx.drawImage(img, -el.width / 2, -el.height / 2, el.width, el.height);
    },
    text: (ctx, el) => {
        ctx.font = `${el.fontSize}px ${el.fontFamily}`;
        ctx.fillStyle = '#333';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(el.text, 0, 0);
    },
    shape: (ctx, el) => {
        ctx.strokeStyle = el.strokeColor;
        ctx.fillStyle = el.fillColor;
        ctx.lineWidth = 0;
        ctx.beginPath();
        if (el.subType === 'rectangle') ctx.rect(-el.width / 2, -el.height / 2, el.width, el.height);
        if (el.fillColor && el.fillColor !== 'transparent') ctx.fill();
        ctx.stroke();
    }
};

function renderElement(ctx, el) {
    ctx.save();
    const renderer = elementRenderers[el.type];
    if (!renderer) { ctx.restore(); return; }
    if (el.type === 'object' || el.type === 'shape') {
        ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
        ctx.rotate(el.rotation * Math.PI / 180);
    } else if (el.type === 'text') {
        ctx.translate(el.x, el.y);
        ctx.rotate(el.rotation * Math.PI / 180);
    }
    renderer(ctx, el);
    if (el.type === 'shape' && el.name) {
        ctx.font = `bold ${Math.min(el.width, el.height) / 8}px Montserrat`;
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(el.name, 0, 0);
    }
    ctx.restore();
}

function drawSnapLines() {
    if (!state.snapLines || state.snapLines.length === 0) return;
    const { ctx } = dom;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.8)';
    ctx.lineWidth = 1 / state.zoom;
    ctx.setLineDash([4 / state.zoom, 4 / state.zoom]);
    state.snapLines.forEach(line => {
        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
    });
    ctx.restore();
}

export function draw() {
    const { ctx, canvas } = dom;
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(state.pan.x, state.pan.y);
    ctx.scale(state.zoom, state.zoom);
    drawScene(ctx, state.elements);
    drawSnapLines();
    drawSelection();
    if (state.marquee) drawMarquee();
    ctx.restore();
}

export function drawScene(targetCtx, elementsToDraw) {
    const rooms = elementsToDraw.filter(el => el.type === 'shape');
    const walls = elementsToDraw.filter(el => el.type === 'wall');
    const insertables = elementsToDraw.filter(el => ['door', 'window'].includes(el.type));
    const others = elementsToDraw.filter(el => !['shape', 'wall', 'door', 'window'].includes(el.type));

    rooms.forEach(room => renderElement(targetCtx, room));
    walls.forEach(wall => {
        const wallInsertables = insertables.filter(i => i.wallId === wall.id).sort((a, b) => a.position - b.position);
        const wallLength = Math.sqrt((wall.x2 - wall.x1)**2 + (wall.y2 - wall.y1)**2);
        if (wallLength === 0) { renderElement(targetCtx, wall); return; }
        let lastPos = 0;
        wallInsertables.forEach(insertable => {
            const halfWidthNormalized = (insertable.width / 2) / wallLength;
            const startPos = insertable.position - halfWidthNormalized;
            if (startPos > lastPos) {
                const segment = { ...wall, x1: wall.x1 + (wall.x2 - wall.x1) * lastPos, y1: wall.y1 + (wall.y2 - wall.y1) * lastPos, x2: wall.x1 + (wall.x2 - wall.x1) * startPos, y2: wall.y1 + (wall.y2 - wall.y1) * startPos };
                renderElement(targetCtx, segment);
            }
            lastPos = insertable.position + halfWidthNormalized;
        });
        if (lastPos < 1) {
            const segment = { ...wall, x1: wall.x1 + (wall.x2 - wall.x1) * lastPos, y1: wall.y1 + (wall.y2 - wall.y1) * lastPos };
            renderElement(targetCtx, segment);
        }
    });
    insertables.forEach(insertable => {
        const parentWall = walls.find(w => w.id === insertable.wallId);
        if (parentWall) {
            const wallDx = parentWall.x2 - parentWall.x1;
            const wallDy = parentWall.y2 - parentWall.y1;
            const cx = parentWall.x1 + wallDx * insertable.position;
            const cy = parentWall.y1 + wallDy * insertable.position;
            targetCtx.save();
            targetCtx.translate(cx, cy);
            targetCtx.rotate(Math.atan2(wallDy, wallDx));
            if (insertable.type === 'door') drawDoorSymbol(targetCtx, insertable, parentWall);
            if (insertable.type === 'window') drawWindowSymbol(targetCtx, insertable, parentWall);
            targetCtx.restore();
        }
    });
    others.forEach(obj => renderElement(targetCtx, obj));
}

function drawSelection() {
    const selectedElements = state.elements.filter(el => state.selectedElementIds.includes(el.id));
    if (selectedElements.length === 0) return;
    if (selectedElements.length === 1) {
        const el = selectedElements[0];
        if (el.type === 'wall') {
            drawWallSelection(el);
        } else if (['door', 'window'].includes(el.type)) {
            const wall = state.elements.find(w => w.id === el.wallId);
            if (wall) drawInsertableSelection(el, wall);
        } else {
            drawSelectionBox(el);
            if (el.vision) {
                dom.ctx.save();
                dom.ctx.translate(el.x + el.width/2, el.y + el.height/2);
                dom.ctx.rotate(el.rotation * Math.PI / 180);
                drawVisionHandles(el);
                dom.ctx.restore();
            }
        }
    } else {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selectedElements.forEach(el => {
            const width = el.width || (el.type === 'wall' ? Math.abs(el.x2 - el.x1) : 0);
            const height = el.height || (el.type === 'wall' ? Math.abs(el.y2 - el.y1) : 0);
            const elX = el.type === 'wall' ? Math.min(el.x1, el.x2) : el.x;
            const elY = el.type === 'wall' ? Math.min(el.y1, el.y2) : el.y;
            minX = Math.min(minX, elX); minY = Math.min(minY, elY);
            maxX = Math.max(maxX, elX + width); maxY = Math.max(maxY, elY + height);
        });
        dom.ctx.save();
        dom.ctx.strokeStyle = '#8bc53f';
        dom.ctx.lineWidth = 2 / state.zoom;
        dom.ctx.setLineDash([6 / state.zoom, 3 / state.zoom]);
        dom.ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        dom.ctx.restore();
    }
}

function drawSelectionBox(el) {
    const { ctx } = dom;
    ctx.save();
    let boxX, boxY, boxWidth, boxHeight, centerX, centerY;
    if (el.type === 'object' || el.type === 'shape') {
        boxX = -el.width / 2; boxY = -el.height / 2; boxWidth = el.width; boxHeight = el.height;
        centerX = el.x + el.width / 2; centerY = el.y + el.height / 2;
    } else if (el.type === 'text') {
        ctx.font = `${el.fontSize}px ${el.fontFamily}`;
        const metrics = ctx.measureText(el.text);
        boxWidth = metrics.width; boxHeight = el.fontSize;
        boxX = 0; boxY = 0; centerX = el.x; centerY = el.y;
    }
    ctx.translate(centerX, centerY);
    ctx.rotate(el.rotation * Math.PI / 180);
    ctx.strokeStyle = '#8bc53f';
    ctx.lineWidth = 2 / state.zoom;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    
    if (el.type !== 'text') { // Rotation handle only for non-text
        ctx.beginPath();
        ctx.arc(0, -boxHeight / 2 - 20 / state.zoom, 5 / state.zoom, 0, 2 * Math.PI);
        ctx.moveTo(0, -boxHeight / 2 - 20 / state.zoom);
        ctx.lineTo(0, -boxHeight/2);
        ctx.fillStyle = 'white';
        ctx.fill();
        ctx.stroke();
    }
    
    if (el.type !== 'text') {
        const handleSize = 8 / state.zoom;
        ctx.fillStyle = '#8bc53f';
        const handles = getResizeHandles(el);
        Object.values(handles).forEach(h => {
             ctx.fillRect(h.x - handleSize / 2, h.y - handleSize / 2, handleSize, handleSize);
        });
    }
    ctx.restore();
}

function drawWallSelection(el) {
    const { ctx } = dom;
    const handleSize = 10 / state.zoom;
    ctx.fillStyle = '#8bc53f';
    ctx.fillRect(el.x1 - handleSize / 2, el.y1 - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(el.x2 - handleSize / 2, el.y2 - handleSize / 2, handleSize, handleSize);
}

export function getResizeHandles(el) {
    const hw = el.width / 2; const hh = el.height / 2;
    return {
        'top-left': { x: -hw, y: -hh, cursor: 'nwse-resize' },
        'top-right': { x: hw, y: -hh, cursor: 'nesw-resize' },
        'bottom-left': { x: -hw, y: hh, cursor: 'nesw-resize' },
        'bottom-right': { x: hw, y: hh, cursor: 'nwse-resize' }
    };
}

function drawMarquee() {
    const { ctx } = dom;
    const width = state.marquee.x2 - state.marquee.x1;
    const height = state.marquee.y2 - state.marquee.y1;
    ctx.save();
    ctx.fillStyle = 'rgba(139, 197, 63, 0.2)';
    ctx.strokeStyle = 'rgba(26, 46, 79, 0.6)';
    ctx.lineWidth = 1 / state.zoom;
    ctx.fillRect(state.marquee.x1, state.marquee.y1, width, height);
    ctx.strokeRect(state.marquee.x1, state.marquee.y1, width, height);
    ctx.restore();
}