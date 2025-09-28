import { state, dom } from './state.js';
import { draw, getResizeHandles } from './canvas.js';
import { saveState, toggleControls, updateActiveToolButton, setCanvasSize } from './main.js';
import { editText, deleteSelected, duplicateSelected } from './actions.js';

// --- FUNÇÕES AUXILIARES DE EVENTOS ---

function getEventPos(e) {
    const rect = dom.canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    return { 
        x: (clientX - rect.left - state.pan.x) / state.zoom, 
        y: (clientY - rect.top - state.pan.y) / state.zoom 
    };
}

function getElementAtPos(x, y) {
    for (let i = state.elements.length - 1; i >= 0; i--) {
        const el = state.elements[i];
        
        const centerX = (el.type === 'text') ? el.x : el.x + el.width/2;
        const centerY = (el.type === 'text') ? el.y : el.y + el.height/2;

        const dx = x - centerX;
        const dy = y - centerY;
        const angle = -el.rotation * Math.PI / 180;
        const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
        const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);

        if (el.type === 'object' || (el.type === 'shape' && el.subType === 'rectangle')) {
            if (rotatedX > -el.width / 2 && rotatedX < el.width / 2 && rotatedY > -el.height / 2 && rotatedY < el.height / 2) {
                return el;
            }
        } else if (el.type === 'shape' && el.subType === 'circle') {
            if (Math.sqrt(rotatedX**2 + rotatedY**2) < el.width / 2) {
                return el;
            }
        } else if (el.type === 'shape' && el.subType === 'triangle') {
            const p = {x: rotatedX, y: rotatedY};
            const p0 = {x: 0, y: -el.height / 2};
            const p1 = {x: el.width / 2, y: el.height / 2};
            const p2 = {x: -el.width / 2, y: el.height / 2};
            if (isPointInTriangle(p, p0, p1, p2)) return el;

        } else if (el.type === 'text') {
            dom.ctx.font = `${el.fontSize}px ${el.fontFamily}`;
            const metrics = dom.ctx.measureText(el.text);
            if (rotatedX > 0 && rotatedX < metrics.width && rotatedY > 0 && rotatedY < el.fontSize) {
               return el;
            }
        } else if (el.type === 'wall') {
            if (distToSegment({x, y}, {x: el.x1, y: el.y1}, {x: el.x2, y: el.y2}) < 5 / state.zoom) return el;
        }
    }
    return null;
}

function getHandleAtPos(el, x, y) {
    const handleHitboxSize = 8 / state.zoom;
    if (el.type === 'wall') {
        if (Math.sqrt((x - el.x1)**2 + (y - el.y1)**2) < handleHitboxSize) return 'start';
        if (Math.sqrt((x - el.x2)**2 + (y - el.y2)**2) < handleHitboxSize) return 'end';
        return null;
    }
    
    let centerX = el.type === 'text' ? el.x : el.x + el.width / 2;
    let centerY = el.type === 'text' ? el.y : el.y + el.height / 2;
    
    let boxHeight = el.type === 'text' ? el.fontSize : el.height;
    let boxWidth;
    if (el.type === 'text') {
        dom.ctx.font = `${el.fontSize}px ${el.fontFamily}`;
        boxWidth = dom.ctx.measureText(el.text).width;
    } else {
        boxWidth = el.width;
    }

    const dx = x - centerX;
    const dy = y - centerY;
    const angle = -el.rotation * Math.PI / 180;
    const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
    const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);

    const rotHandleY = (el.type === 'text' ? 0 : -boxHeight / 2) - 15/state.zoom;
    const rotHandleX = (el.type === 'text' ? boxWidth/2 : 0);
    if (Math.sqrt((rotatedX - rotHandleX)**2 + (rotatedY - rotHandleY)**2) < handleHitboxSize) return 'rotate';
     
    if (el.type !== 'text') {
        const handles = getResizeHandles(el);
        for (const [key, handle] of Object.entries(handles)) {
            if (Math.abs(rotatedX - handle.x) < handleHitboxSize / 2 && Math.abs(rotatedY - handle.y) < handleHitboxSize / 2) {
                return key;
            }
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

function isPointInTriangle(p, p0, p1, p2) {
    const dX = p.x - p2.x;
    const dY = p.y - p2.y;
    const dX21 = p2.x - p1.x;
    const dY12 = p1.y - p2.y;
    const D = dY12 * (p0.x - p2.x) + dX21 * (p0.y - p2.y);
    const s = dY12 * dX + dX21 * dY;
    const t = (p2.y - p0.y) * dX + (p0.x - p2.x) * dY;
    if (D < 0) return s <= 0 && t <= 0 && s + t >= D;
    return s >= 0 && t >= 0 && s + t <= D;
}

// --- MANIPULADORES DE EVENTOS ---

function onMouseDown(e) {
    state.isDrawing = true;
    const mousePos = getEventPos(e);
    state.startPoint = mousePos;

    if (e.ctrlKey || e.button === 1) { // Pan with Ctrl+Click/Drag or Middle Mouse
        state.pan.active = true;
        state.pan.start = { x: e.clientX, y: e.clientY };
        dom.canvas.style.cursor = 'grabbing';
        return;
    }
    
    if (state.activeTool === 'select') {
    const singleSelectedEl = state.selectedElementIds.length === 1 ? state.elements.find(el => el.id === state.selectedElementIds[0]) : null;
    const handleUnderMouse = singleSelectedEl ? getHandleAtPos(singleSelectedEl, mousePos.x, mousePos.y) : null;

    // CORREÇÃO: A verificação do handle vem ANTES de qualquer outra lógica de seleção.
    if (handleUnderMouse) {
        state.dragAction = { type: handleUnderMouse, elements: [singleSelectedEl], handle: handleUnderMouse, startPos: mousePos, originalElements: [JSON.parse(JSON.stringify(singleSelectedEl))] };
        draw();
        return; // Impede que o resto do código de seleção seja executado.
    }

    const elementUnderMouse = getElementAtPos(mousePos.x, mousePos.y);
    
    // Lógica de seleção (Shift para adicionar/remover)
    if (e.shiftKey) {
        if (elementUnderMouse) {
            if (state.selectedElementIds.includes(elementUnderMouse.id)) {
                state.selectedElementIds = state.selectedElementIds.filter(id => id !== elementUnderMouse.id);
            } else {
                state.selectedElementIds.push(elementUnderMouse.id);
            }
        }
    } else { // Lógica de seleção normal
        if (elementUnderMouse) {
            if (!state.selectedElementIds.includes(elementUnderMouse.id)) {
                state.selectedElementIds = [elementUnderMouse.id];
            }
        } else {
            state.selectedElementIds = [];
        }
    }

    // Prepara para mover os elementos selecionados
    if (state.selectedElementIds.length > 0) {
        const selectedElements = state.elements.filter(el => state.selectedElementIds.includes(el.id));
        state.dragAction = { type: 'move', elements: selectedElements, startPos: mousePos, originalElements: JSON.parse(JSON.stringify(selectedElements)) };
    }

    toggleControls(state.selectedElementIds.length === 1 ? state.elements.find(el => el.id === state.selectedElementIds[0]) : null);
}

function onMouseMove(e) {
    const mousePos = getEventPos(e);

    if (state.pan.active) {
        const dx = e.clientX - state.pan.start.x; 
        const dy = e.clientY - state.pan.start.y;
        state.pan.x += dx; 
        state.pan.y += dy;
        state.pan.start = { x: e.clientX, y: e.clientY };
        draw(); 
        return;
    }

    if (!state.isDrawing) {
        // Lógica de cursor
        return;
    }
    
    const dx = mousePos.x - state.startPoint.x;
    const dy = mousePos.y - state.startPoint.y;

    if (state.dragAction.type === 'move') {
        state.dragAction.originalElements.forEach((origEl, index) => {
            const currentEl = state.elements.find(el => el.id === origEl.id);
            if (currentEl) {
                if (currentEl.type === 'wall') {
                    currentEl.x1 = origEl.x1 + dx;
                    currentEl.y1 = origEl.y1 + dy;
                    currentEl.x2 = origEl.x2 + dx;
                    currentEl.y2 = origEl.y2 + dy;
                } else {
                    currentEl.x = origEl.x + dx;
                    currentEl.y = origEl.y + dy;
                }
            }
        });
    } } else if (['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(state.dragAction.type)) { // Lógica de Redimensionamento
    const el = state.dragAction.elements[0];
    const orig = state.dragAction.originalElements[0];
    const handle = state.dragAction.type;

    // Converte o movimento do mouse (dx, dy) para o sistema de coordenadas rotacionado do objeto
    const angle = -orig.rotation * Math.PI / 180;
    const rotatedDx = dx * Math.cos(angle) - dy * Math.sin(angle);
    const rotatedDy = dx * Math.sin(angle) + dy * Math.cos(angle);
    
    let newWidth = orig.width;
    let newHeight = orig.height;

    if (handle.includes('right')) newWidth = Math.max(10, orig.width + rotatedDx);
    if (handle.includes('left')) newWidth = Math.max(10, orig.width - rotatedDx);
    if (handle.includes('bottom')) newHeight = Math.max(10, orig.height + rotatedDy);
    if (handle.includes('top')) newHeight = Math.max(10, orig.height - rotatedDy);

    if (el.subType === 'circle') {
        newWidth = Math.max(newWidth, newHeight);
        newHeight = newWidth;
    }
    
    el.width = newWidth;
    el.height = newHeight;

    // Recalcula a posição X, Y para que o objeto pareça crescer a partir do lado oposto
    // (Esta é uma matemática um pouco complexa, mas é o que faz o resize funcionar corretamente)
    const dw = newWidth - orig.width;
    const dh = newHeight - orig.height;

    const finalAngle = orig.rotation * Math.PI / 180;
    let offsetX = 0;
    let offsetY = 0;
    
    if (handle.includes('left')) offsetX = dw / 2;
    if (handle.includes('right')) offsetX = -dw / 2;
    if (handle.includes('top')) offsetY = dh / 2;
    if (handle.includes('bottom')) offsetY = -dh / 2;

    el.x = orig.x - (offsetX * Math.cos(finalAngle) - offsetY * Math.sin(finalAngle));
    el.y = orig.y - (offsetX * Math.sin(finalAngle) + offsetY * Math.cos(finalAngle));
} else if (state.dragAction.type === 'create' && state.dragAction.elements[0].type === 'shape') {
        const shape = state.dragAction.elements[0];
        shape.width = Math.abs(dx);
        shape.height = Math.abs(dy);
        shape.x = Math.min(mousePos.x, state.startPoint.x);
        shape.y = Math.min(mousePos.y, state.startPoint.y);
        if (shape.subType === 'circle') {
            shape.width = Math.max(shape.width, shape.height);
            shape.height = shape.width;
        }
    } else if (state.activeTool === 'wall' && state.selectedElementIds.length > 0) {
        const wall = state.elements.find(el => el.id === state.selectedElementIds[0]);
        if (wall) {
            const totalDx = Math.abs(dx);
            const totalDy = Math.abs(dy);
            if (totalDx > totalDy) {
                wall.x2 = mousePos.x;
                wall.y2 = state.startPoint.y;
            } else {
                wall.x2 = state.startPoint.x;
                wall.y2 = mousePos.y;
            }
        }
    }
    draw();
}

function onMouseUp() {
    if (state.dragAction.type) {
        saveState();
    }
    if (state.activeTool === 'wall' || state.activeTool === 'shape') {
        state.activeTool = 'select'; 
        updateActiveToolButton();
    }
    state.isDrawing = false; 
    state.pan.active = false;
    state.dragAction = { type: null, elements: [], handle: null, startPos: null, originalElements: [] };
    dom.canvas.style.cursor = 'default';
    draw();
}

function onDblClick(e) {
    const mousePos = getEventPos(e);
    const element = getElementAtPos(mousePos.x, mousePos.y);
    if (element && element.type === 'text' && state.selectedElementIds.includes(element.id)) {
        editText(element);
    }
}

function onKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); window.undo(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'y') { e.preventDefault(); window.redo(); }
    if (e.ctrlKey && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelected(); }
    if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelected(); }
    if (e.key.toLowerCase() === 'v') { state.activeTool = 'select'; updateActiveToolButton(); } 
    if (e.key.toLowerCase() === 'w') { state.activeTool = 'wall'; updateActiveToolButton(); }
    if (e.key.toLowerCase() === 't') { state.activeTool = 'text'; updateActiveToolButton(); }
    
    // Movimento com setas
}

export function addEventListeners() {
    window.addEventListener('resize', setCanvasSize);
    
    dom.canvas.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    dom.canvas.addEventListener('dblclick', onDblClick);
    document.addEventListener('keydown', onKeyDown);

    // ... (Listeners para botões, etc.) ...
}