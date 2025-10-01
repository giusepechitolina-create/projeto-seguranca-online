// js/events.js
import { state, dom } from './state.js';
import { draw, getResizeHandles, getInsertableHandles } from './canvas.js';
import { saveState, setCanvasSize } from './main.js';
import { editText, deleteSelected, duplicateSelected } from './actions.js';
import { toggleControls } from './ui.js';
import { TOOL_CONFIG } from './config.js';

const snapThreshold = 10;

function findSnapPoints(pos, excludeId) {
    const snapLines = [];
    let snappedPos = { ...pos };
    let snappedX = false, snappedY = false;
    const threshold = snapThreshold / state.zoom;

    state.elements.forEach(el => {
        if (el.id === excludeId || el.type !== 'wall') return;
        
        [ { x: el.x1, y: el.y1 }, { x: el.x2, y: el.y2 } ].forEach(p => {
            if (!snappedX && Math.abs(pos.x - p.x) < threshold) {
                snappedPos.x = p.x;
                snappedX = true;
                snapLines.push({ x1: p.x, y1: p.y - 10000, x2: p.x, y2: p.y + 10000 });
            }
            if (!snappedY && Math.abs(pos.y - p.y) < threshold) {
                snappedPos.y = p.y;
                snappedY = true;
                snapLines.push({ x1: p.x - 10000, y1: p.y, x2: p.x + 10000, y2: p.y });
            }
        });
    });

    return { snappedPos, snapLines };
}

function getEventPos(e) {
    const rect = dom.canvas.getBoundingClientRect();
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    const clientY = e.touches?.[0]?.clientY ?? e.clientY;
    return { 
        x: (clientX - rect.left - state.pan.x) / state.zoom, 
        y: (clientY - rect.top - state.pan.y) / state.zoom 
    };
}

function getWallAtPos(x, y) {
    for (let i = state.elements.length - 1; i >= 0; i--) {
        const el = state.elements[i];
        if (el.type === 'wall' && distToSegment({x, y}, {x: el.x1, y: el.y1}, {x: el.x2, y: el.y2}) < el.thickness) {
            return el;
        }
    }
    return null;
}

function getInsertableAtPos(x, y) {
    for (let i = state.elements.length - 1; i >= 0; i--) {
        const el = state.elements[i];
        if (['door', 'window'].includes(el.type)) {
            const wall = state.elements.find(w => w.id === el.wallId);
            if (!wall) continue;
            const wallDx = wall.x2 - wall.x1;
            const wallDy = wall.y2 - wall.y1;
            const cx = wall.x1 + wallDx * el.position;
            const cy = wall.y1 + wallDy * el.position;
            if (Math.sqrt((x-cx)**2 + (y-cy)**2) < Math.max(el.width / 2, wall.thickness)) return el;
        }
    }
    return null;
}

function getElementAtPos(x, y) {
    const insertable = getInsertableAtPos(x, y);
    if(insertable) return insertable;
    
    for (let i = state.elements.length - 1; i >= 0; i--) {
        const el = state.elements[i];
        if (['wall', 'door', 'window'].includes(el.type)) {
            if (el.type === 'wall' && distToSegment({x, y}, {x: el.x1, y: el.y1}, {x: el.x2, y: el.y2}) < el.thickness / 2) return el;
            continue;
        }
        
        const centerX = (el.type === 'text') ? el.x : el.x + el.width/2;
        const centerY = (el.type === 'text') ? el.y : el.y + el.height/2;
        const dx = x - centerX;
        const dy = y - centerY;
        const angle = -el.rotation * Math.PI / 180;
        const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
        const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);
        let hit = false;
        if (el.type === 'text') {
            dom.ctx.font = `${el.fontSize}px ${el.fontFamily}`;
            const metrics = dom.ctx.measureText(el.text);
            hit = (rotatedX >= 0 && rotatedX <= metrics.width && rotatedY >= 0 && rotatedY <= el.fontSize);
        } else {
            hit = (rotatedX > -el.width / 2 && rotatedX < el.width / 2 && rotatedY > -el.height / 2 && rotatedY < el.height / 2);
        }
        if (hit) return el;
    }
    return null;
}

function getVisionHandleAtPos(el, x, y) {
    if (!el.vision) return null;
    const handleHitboxSize = 12 / state.zoom;
    const { range, angle } = el.vision;
    
    const centerX = el.x + el.width/2;
    const centerY = el.y + el.height/2;
    const dx = x - centerX;
    const dy = y - centerY;
    const mainAngle = -el.rotation * Math.PI / 180;
    const rotatedX = dx * Math.cos(mainAngle) - dy * Math.sin(mainAngle);
    const rotatedY = dx * Math.sin(mainAngle) + dy * Math.cos(mainAngle);
    
    if (Math.abs(rotatedX - range) < handleHitboxSize && Math.abs(rotatedY) < handleHitboxSize) {
        return 'vision-range';
    }

    const angleRad = angle / 2 * (Math.PI / 180);
    const angleHandle1 = { x: range * Math.cos(angleRad), y: range * Math.sin(angleRad) };
    if (Math.sqrt((rotatedX - angleHandle1.x)**2 + (rotatedY - angleHandle1.y)**2) < handleHitboxSize) {
        return 'vision-angle';
    }
    const angleHandle2 = { x: range * Math.cos(-angleRad), y: range * Math.sin(-angleRad) };
    if (Math.sqrt((rotatedX - angleHandle2.x)**2 + (rotatedY - angleHandle2.y)**2) < handleHitboxSize) {
        return 'vision-angle';
    }
    
    return null;
}

function getHandleAtPos(el, x, y) {
    const handleHitboxSize = 12 / state.zoom;
    
    const visionHandle = getVisionHandleAtPos(el, x, y);
    if (visionHandle) return visionHandle;

    if (['door', 'window'].includes(el.type)) {
        const wall = state.elements.find(w => w.id === el.wallId);
        if (!wall) return null;
        const wallDx = wall.x2 - wall.x1;
        const wallDy = wall.y2 - wall.y1;
        const cx = wall.x1 + wallDx * el.position;
        const cy = wall.y1 + wallDy * el.position;
        const angle = -Math.atan2(wallDy, wallDx);
        
        const dx = x - cx;
        const dy = y - cy;
        const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
        const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);
        
        const handles = getInsertableHandles(el, wall);
        for (const [key, handle] of Object.entries(handles)) {
            if (Math.sqrt((rotatedX - handle.x)**2 + (rotatedY - handle.y)**2) < handleHitboxSize / 2) {
                return key;
            }
        }
    } else if (el.type === 'wall') {
        if (Math.sqrt((x - el.x1)**2 + (y - el.y1)**2) < handleHitboxSize) return 'start';
        if (Math.sqrt((x - el.x2)**2 + (y - el.y2)**2) < handleHitboxSize) return 'end';
    } else if (el.type !== 'text') {
        let centerX = el.x + el.width / 2;
        let centerY = el.y + el.height / 2;
        const dx = x - centerX;
        const dy = y - centerY;
        const angle = -el.rotation * Math.PI / 180;
        const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
        const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);
        const rotHandleY = -el.height / 2 - 20/state.zoom;
        if (Math.sqrt((rotatedX - 0)**2 + (rotatedY - rotHandleY)**2) < handleHitboxSize) return 'rotate';
        const handles = getResizeHandles(el);
        for (const [key, handle] of Object.entries(handles)) {
            if (Math.abs(rotatedX - handle.x) < handleHitboxSize / 2 && Math.abs(rotatedY - handle.y) < handleHitboxSize / 2) return key;
        }
    }
    return null;
}

function distToSegment(p, v, w) {
    const l2 = (v.x - w.x)**2 + (v.y - w.y)**2;
    if (l2 === 0) return Math.sqrt((p.x - v.x)**2 + (p.y - v.y)**2);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const closestPoint = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
    return Math.sqrt((p.x - closestPoint.x)**2 + (p.y - closestPoint.y)**2);
}

function createElement(type, subType, pos) {
    const commonProps = { id: Date.now(), x: pos.x, y: pos.y, rotation: 0, name: '' };
    switch(type) {
        case 'wall': return { id: Date.now(), type: 'wall', x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y, thickness: 10 };
        case 'text': return { ...commonProps, type: 'text', text: 'Novo Texto', fontSize: 16, fontFamily: 'Montserrat' };
        case 'shape': return { ...commonProps, type: 'shape', subType, width: 200, height: 200, strokeColor: 'transparent', fillColor: 'rgba(200, 200, 200, 0.5)' };
        case 'object':
            const object = { ...commonProps, type: 'object', subType, width: 40, height: 40 };
            if (subType === 'camera' || subType === 'motion_sensor') {
                object.vision = { range: 150, angle: 90 };
            }
            return object;
        default: return null;
    }
}

function handleSelectToolMouseDown(e, mousePos) {
    const singleSelectedEl = state.selectedElementIds.length === 1 ? state.elements.find(el => el.id === state.selectedElementIds[0]) : null;
    const handle = singleSelectedEl ? getHandleAtPos(singleSelectedEl, mousePos.x, mousePos.y) : null;

    if (handle) {
        if (handle === 'flip' && singleSelectedEl) {
            singleSelectedEl.flip = (singleSelectedEl.flip || 1) * -1;
            saveState(); draw(); return;
        }
        if (handle === 'swing' && singleSelectedEl) {
            singleSelectedEl.swing = (singleSelectedEl.swing || 1) * -1;
            saveState(); draw(); return;
        }
        state.dragAction = { type: handle, elements: [singleSelectedEl], startPos: mousePos, originalElements: [JSON.parse(JSON.stringify(singleSelectedEl))] };
        return;
    }
    
    const element = getElementAtPos(mousePos.x, mousePos.y);

    if (e.shiftKey) {
        if (element) {
            const index = state.selectedElementIds.indexOf(element.id);
            if (index > -1) state.selectedElementIds.splice(index, 1);
            else state.selectedElementIds.push(element.id);
        }
    } else {
        state.selectedElementIds = element ? [element.id] : [];
        if (!element) state.marquee = { x1: mousePos.x, y1: mousePos.y, x2: mousePos.x, y2: mousePos.y };
    }
    
    if (state.selectedElementIds.length > 0 && !state.marquee) {
        const selected = state.elements.filter(el => state.selectedElementIds.includes(el.id));
        const type = (['door', 'window'].includes(selected[0].type)) ? 'move-on-wall' : 'move';
        state.dragAction = { type: type, elements: selected, startPos: mousePos, originalElements: JSON.parse(JSON.stringify(selected)) };
    }
}

function handleCreationMouseDown(type, subType, mousePos) {
    const { snappedPos, snapLines } = findSnapPoints(mousePos);
    state.snapLines = snapLines;
    const newElement = createElement(type, subType, snappedPos);
    if (!newElement) return;
    state.elements.push(newElement);
    state.selectedElementIds = [newElement.id];
    if (type !== 'wall') {
        state.activeTool = 'select';
        window.updateActiveTool();
        saveState();
    }
}

function handleInsertableMouseDown(type, mousePos) {
    const closestWall = getWallAtPos(mousePos.x, mousePos.y);
    if (closestWall) {
        const wallDx = closestWall.x2 - closestWall.x1;
        const wallDy = closestWall.y2 - closestWall.y1;
        const t = ((mousePos.x - closestWall.x1) * wallDx + (mousePos.y - closestWall.y1) * wallDy) / (wallDx**2 + wallDy**2);
        
        const newInsertable = {
            id: Date.now(), type: type, wallId: closestWall.id,
            position: Math.max(0, Math.min(1, t)),
            width: type === 'door' ? 60 : 80,
            flip: 1, swing: 1,
        };
        state.elements.push(newInsertable);
        state.activeTool = 'select';
        window.updateActiveTool();
        state.selectedElementIds = [newInsertable.id];
        saveState();
    }
}

function onMouseDown(e) {
    state.isDrawing = true;
    const mousePos = getEventPos(e);
    state.startPoint = mousePos;

    if (e.ctrlKey || e.button === 1) {
        state.pan.active = true;
        state.pan.start = { x: e.clientX, y: e.clientY };
        dom.canvas.style.cursor = 'grabbing';
        return;
    }
    
    switch (state.activeTool) {
        case 'select': handleSelectToolMouseDown(e, mousePos); break;
        case 'wall': case 'text': handleCreationMouseDown(state.activeTool, null, mousePos); break;
        case 'shape': case 'object': handleCreationMouseDown(state.activeTool, state.toolSubType, mousePos); break;
        case 'door': case 'window': handleInsertableMouseDown(state.activeTool, mousePos); break;
    }
    
    const selectedEl = state.selectedElementIds.length === 1 ? state.elements.find(el => el.id === state.selectedElementIds[0]) : null;
    toggleControls(selectedEl);
    draw();
}

function onMouseMove(e) {
    if (state.pan.active) {
        const dx = e.clientX - state.pan.start.x; const dy = e.clientY - state.pan.start.y;
        state.pan.x += dx; state.pan.y += dy;
        state.pan.start = { x: e.clientX, y: e.clientY };
        draw(); return;
    }
    
    if (!state.isDrawing) return;
    
    const mousePos = getEventPos(e);
    let currentPos = mousePos;
    state.snapLines = [];

    if (state.dragAction.type === 'start' || state.dragAction.type === 'end' || (state.activeTool === 'wall' && state.selectedElementIds.length > 0)) {
        const excludeId = state.selectedElementIds[0] || null;
        const { snappedPos, snapLines } = findSnapPoints(mousePos, excludeId);
        currentPos = snappedPos;
        state.snapLines = snapLines;
    }

    if (state.marquee) {
        state.marquee.x2 = currentPos.x; state.marquee.y2 = currentPos.y;
    } else if (state.activeTool === 'wall' && state.selectedElementIds.length > 0) {
        const wall = state.elements.find(el => el.id === state.selectedElementIds[0]);
        if (wall) {
            const { snappedPos: startSnapped } = findSnapPoints({x: wall.x1, y: wall.y1}, wall.id);
            wall.x1 = startSnapped.x;
            wall.y1 = startSnapped.y;
            
            const dx = currentPos.x - wall.x1;
            const dy = currentPos.y - wall.y1;
            if (e.shiftKey) {
                if (Math.abs(dx) > Math.abs(dy)) { wall.x2 = currentPos.x; wall.y2 = wall.y1; } 
                else { wall.x2 = wall.x1; wall.y2 = currentPos.y; }
            } else {
                wall.x2 = currentPos.x; wall.y2 = currentPos.y;
            }
        }
    } else if (state.dragAction.type === 'start' || state.dragAction.type === 'end') {
        const wall = state.dragAction.elements[0];
        if (e.shiftKey) {
            const otherEnd = state.dragAction.type === 'start' ? {x: wall.x2, y: wall.y2} : {x: wall.x1, y: wall.y1};
            const dx = currentPos.x - otherEnd.x;
            const dy = currentPos.y - otherEnd.y;
            if (Math.abs(dx) > Math.abs(dy)) { currentPos.y = otherEnd.y; }
            else { currentPos.x = otherEnd.x; }
        }
        if (state.dragAction.type === 'start') { wall.x1 = currentPos.x; wall.y1 = currentPos.y; }
        else { wall.x2 = currentPos.x; wall.y2 = currentPos.y; }
    } else if (state.dragAction.type === 'move-on-wall') {
        const el = state.dragAction.elements[0];
        const wall = state.elements.find(w => w.id === el.wallId);
        if (wall) {
            const wallDx = wall.x2 - wall.x1;
            const wallDy = wall.y2 - wall.y1;
            const wallLengthSq = wallDx**2 + wallDy**2;
            if (wallLengthSq > 0) {
                const t = ((mousePos.x - wall.x1) * wallDx + (mousePos.y - wall.y1) * wallDy) / wallLengthSq;
                el.position = Math.max(0, Math.min(1, t));
            }
        }
    } else if (['resize-start', 'resize-end'].includes(state.dragAction.type)) {
        const el = state.dragAction.elements[0];
        const orig = state.dragAction.originalElements[0];
        const wall = state.elements.find(w => w.id === el.wallId);
        if (wall) {
            const wallDx = wall.x2 - wall.x1;
            const wallDy = wall.y2 - wall.y1;
            const wallAngle = Math.atan2(wallDy, wallDx);
            const dx = mousePos.x - state.dragAction.startPos.x;
            const dy = mousePos.y - state.dragAction.startPos.y;
            const projectedD = dx * Math.cos(wallAngle) + dy * Math.sin(wallAngle);
            const resizeAmount = state.dragAction.type === 'resize-start' ? -projectedD : projectedD;
            el.width = Math.max(20, orig.width + resizeAmount * 2);
        }
    } else if (state.dragAction.type === 'vision-range' || state.dragAction.type === 'vision-angle') {
        const el = state.dragAction.elements[0];
        const centerX = el.x + el.width/2;
        const centerY = el.y + el.height/2;
        const dx = mousePos.x - centerX;
        const dy = mousePos.y - centerY;
        const mainAngle = -el.rotation * Math.PI / 180; // Inverse rotation
        const rotatedX = dx * Math.cos(mainAngle) - dy * Math.sin(mainAngle);
        const rotatedY = dx * Math.sin(mainAngle) + dy * Math.cos(mainAngle);

        if (state.dragAction.type === 'vision-range') {
            el.vision.range = Math.max(20, rotatedX);
        } else { // vision-angle
            const angleInRad = Math.atan2(rotatedY, rotatedX);
            el.vision.angle = Math.min(359, Math.max(10, Math.abs(angleInRad * 180 / Math.PI) * 2));
        }
    } else if (['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(state.dragAction.type)) {
        const el = state.dragAction.elements[0];
        const orig = state.dragAction.originalElements[0];
        const angle = -orig.rotation * Math.PI / 180;
        const dx = mousePos.x - state.startPoint.x;
        const dy = mousePos.y - state.startPoint.y;
        const rotatedDx = dx * Math.cos(angle) - dy * Math.sin(angle);
        const rotatedDy = dx * Math.sin(angle) + dy * Math.cos(angle);
        let newWidth = orig.width, newHeight = orig.height;
        if (state.dragAction.type.includes('right')) newWidth = Math.max(10, orig.width + rotatedDx);
        if (state.dragAction.type.includes('left')) newWidth = Math.max(10, orig.width - rotatedDx);
        if (state.dragAction.type.includes('bottom')) newHeight = Math.max(10, orig.height + rotatedDy);
        if (state.dragAction.type.includes('top')) newHeight = Math.max(10, orig.height - rotatedDy);
        el.width = newWidth; el.height = newHeight;
        const dw = newWidth - orig.width; const dh = newHeight - orig.height;
        const finalAngle = orig.rotation * Math.PI / 180;
        let offsetX = 0; let offsetY = 0;
        if (state.dragAction.type.includes('left')) offsetX = dw / 2;
        if (state.dragAction.type.includes('right')) offsetX = -dw / 2;
        if (state.dragAction.type.includes('top')) offsetY = dh / 2;
        if (state.dragAction.type.includes('bottom')) offsetY = -dh / 2;
        el.x = orig.x - (offsetX * Math.cos(finalAngle) - offsetY * Math.sin(finalAngle));
        el.y = orig.y - (offsetX * Math.sin(finalAngle) + offsetY * Math.cos(finalAngle));
    } else if (state.dragAction.type === 'move') {
        const dx = mousePos.x - state.startPoint.x;
        const dy = mousePos.y - state.startPoint.y;
        state.dragAction.originalElements.forEach((origEl, index) => {
            const currentEl = state.dragAction.elements[index];
            if (currentEl) {
                if (currentEl.type === 'wall') {
                    currentEl.x1 = origEl.x1 + dx; currentEl.y1 = origEl.y1 + dy;
                    currentEl.x2 = origEl.x2 + dx; currentEl.y2 = origEl.y2 + dy;
                } else {
                    currentEl.x = origEl.x + dx; currentEl.y = origEl.y + dy;
                }
            }
        });
    } else if (state.dragAction.type === 'rotate') {
        const el = state.dragAction.elements[0];
        const orig = state.dragAction.originalElements[0];
        let centerX = orig.x + orig.width / 2;
        let centerY = orig.y + orig.height / 2;
        const startAngle = Math.atan2(state.dragAction.startPos.y - centerY, state.dragAction.startPos.x - centerX);
        const currentAngle = Math.atan2(mousePos.y - centerY, mousePos.x - centerX);
        let rotation = orig.rotation + (currentAngle - startAngle) * 180 / Math.PI;
        if (e.shiftKey) {
            rotation = Math.round(rotation / 45) * 45;
        }
        el.rotation = rotation;
    }
    
    draw();
}

function onMouseUp() {
    if (state.isDrawing) {
        saveState();
    }
    
    state.isDrawing = false; 
    state.pan.active = false;
    state.dragAction = { type: null, elements: [], handle: null, startPos: null, originalElements: [] };
    state.snapLines = [];
    dom.canvas.style.cursor = 'default';
    
    if (state.marquee) {
        const x1 = Math.min(state.marquee.x1, state.marquee.x2);
        const y1 = Math.min(state.marquee.y1, state.marquee.y2);
        const x2 = Math.max(state.marquee.x1, state.marquee.x2);
        const y2 = Math.max(state.marquee.y1, state.marquee.y2);
        
        state.selectedElementIds = state.elements
            .filter(el => {
                if (['wall', 'door', 'window'].includes(el.type)) return false;
                const cx = el.x + (el.width || 0) / 2;
                const cy = el.y + (el.height || 0) / 2;
                return cx > x1 && cx < x2 && cy > y1 && cy < y2;
            })
            .map(el => el.id);
        state.marquee = null;
    }
    
    draw();
}

function onDblClick(e) {
    const mousePos = getEventPos(e);
    const element = getElementAtPos(mousePos.x, mousePos.y);
    if (element?.type === 'text' && state.selectedElementIds.includes(element.id)) {
        editText(element);
    }
}

function onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.ctrlKey) {
        if (e.key.toLowerCase() === 'z') { e.preventDefault(); window.undo(); }
        if (e.key.toLowerCase() === 'y') { e.preventDefault(); window.redo(); }
        if (e.key.toLowerCase() === 'd' && state.activeTool !== 'door') { e.preventDefault(); duplicateSelected(); }
        return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); }
    const toolKey = Object.keys(TOOL_CONFIG).find(k => TOOL_CONFIG[k].key === e.key.toLowerCase());
    if (toolKey) {
        state.activeTool = toolKey;
        window.updateActiveTool();
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const amount = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        if (e.key === 'ArrowLeft') dx = -amount;
        if (e.key === 'ArrowRight') dx = amount;
        if (e.key === 'ArrowUp') dy = -amount;
        if (e.key === 'ArrowDown') dy = amount;
        state.elements.forEach(el => {
            if (state.selectedElementIds.includes(el.id)) {
                if (el.type === 'wall') {
                    el.x1 += dx; el.x2 += dx; el.y1 += dy; el.y2 += dy;
                } else if (!['door', 'window'].includes(el.type)) {
                    el.x += dx; el.y += dy;
                }
            }
        });
        draw();
        clearTimeout(window.nudgeTimeout);
        window.nudgeTimeout = setTimeout(saveState, 500);
    }
}

export function initializeCanvasEvents() {
    window.addEventListener('resize', setCanvasSize);
    dom.canvas.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    dom.canvas.addEventListener('dblclick', onDblClick);
    document.addEventListener('keydown', onKeyDown);
}