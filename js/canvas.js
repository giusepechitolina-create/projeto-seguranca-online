// js/canvas.js
import { state, images, dom } from './state.js';

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

function drawDoorSymbol(ctx, door, wall) {
    const wallLength = Math.sqrt((wall.x2 - wall.x1)**2 + (wall.y2 - wall.y1)**2);
    if (wallLength === 0) return;
    const cx = wall.x1 + (wall.x2 - wall.x1) * door.position;
    const cy = wall.y1 + (wall.y2 - wall.y1) * door.position;
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1));
    
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(0, -wall.thickness / 2);
    ctx.lineTo(0, wall.thickness / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, wall.thickness / 2);
    ctx.lineTo(door.width, wall.thickness / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash([2, 2]);
    ctx.arc(0, wall.thickness / 2, door.width, 0, -Math.PI / 2, true);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
}

function drawWindowSymbol(ctx, win, wall) {
    const wallLength = Math.sqrt((wall.x2 - wall.x1)**2 + (wall.y2 - wall.y1)**2);
    if (wallLength === 0) return;
    const cx = wall.x1 + (wall.x2 - wall.x1) * win.position;
    const cy = wall.y1 + (wall.y2 - wall.y1) * win.position;
    
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.atan2(wall.y2 - wall.y1, wall.x2 - wall.x1));
    
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
    
    ctx.restore();
}

const elementRenderers = {
    wall: (ctx, el) => {
        const points = getWallPolygon(el);
        if (points.length < 4) return;
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
        ctx.closePath();
        ctx.fillStyle = '#EAEAEA';
        ctx.fill();
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.stroke();
    },
    object: (ctx, el) => {
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
        ctx.lineWidth = 0; // Borda invisível para áreas
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

export function draw() {
    const { ctx, canvas } = dom;
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(state.pan.x, state.pan.y);
    ctx.scale(state.zoom, state.zoom);
    drawScene(ctx, state.elements);
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
        if (wallLength === 0) {
            renderElement(targetCtx, wall);
            return;
        }

        let lastPos = 0;
        wallInsertables.forEach(insertable => {
            const halfWidthNormalized = (insertable.width / 2) / wallLength;
            const startPos = insertable.position - halfWidthNormalized;
            if (startPos > lastPos) {
                const segment = { ...wall,
                    x1: wall.x1 + (wall.x2 - wall.x1) * lastPos,
                    y1: wall.y1 + (wall.y2 - wall.y1) * lastPos,
                    x2: wall.x1 + (wall.x2 - wall.x1) * startPos,
                    y2: wall.y1 + (wall.y2 - wall.y1) * startPos,
                };
                renderElement(targetCtx, segment);
            }
            lastPos = insertable.position + halfWidthNormalized;
        });
        if (lastPos < 1) {
            const segment = { ...wall,
                x1: wall.x1 + (wall.x2 - wall.x1) * lastPos,
                y1: wall.y1 + (wall.y2 - wall.y1) * lastPos
            };
            renderElement(targetCtx, segment);
        }
    });
    
    insertables.forEach(insertable => {
        const parentWall = walls.find(w => w.id === insertable.wallId);
        if (parentWall) {
            if (insertable.type === 'door') drawDoorSymbol(targetCtx, insertable, parentWall);
            if (insertable.type === 'window') drawWindowSymbol(targetCtx, insertable, parentWall);
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
        } else if(!['door', 'window'].includes(el.type)) {
            drawSelectionBox(el);
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
    ctx.beginPath();
    ctx.arc(boxX + boxWidth / 2, boxY - 20 / state.zoom, 5 / state.zoom, 0, 2 * Math.PI);
    ctx.moveTo(boxX + boxWidth / 2, boxY - 20 / state.zoom);
    ctx.lineTo(boxX + boxWidth / 2, boxY);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.stroke();
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
    const poly = getWallPolygon(el);
    if(poly.length < 4) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y);
    for(let i=1; i<poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(139, 197, 63, 0.7)';
    ctx.lineWidth = 4 / state.zoom;
    ctx.stroke();
    const handleSize = 10 / state.zoom;
    ctx.fillStyle = '#8bc53f';
    ctx.fillRect(el.x1 - handleSize / 2, el.y1 - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(el.x2 - handleSize / 2, el.y2 - handleSize / 2, handleSize, handleSize);
    ctx.restore();
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