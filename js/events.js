import { state, dom } from './state.js';
import { draw, getResizeHandles } from './canvas.js';
import { saveState, toggleControls, updateActiveToolButton, setCanvasSize } from './main.js';
import { editText, deleteSelected, duplicateSelected } from './actions.js';

// Rastreia o estado do gesto de pinça/pan com dois dedos
let twoFingerTouch = {
    startDist: 0,
    startZoom: 1,
    startPan: { x: 0, y: 0 },
    lastMidpoint: { x: 0, y: 0 }
};

// --- FUNÇÕES AUXILIARES DE EVENTOS (sem alterações) ---
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

    if (e.ctrlKey || e.button === 1) {
        state.pan.active = true;
        state.pan.start = { x: e.clientX, y: e.clientY };
        dom.canvas.style.cursor = 'grabbing';
        return;
    }
    
    if (state.activeTool === 'select') {
        const singleSelectedEl = state.selectedElementIds.length === 1 ? state.elements.find(el => el.id === state.selectedElementIds[0]) : null;
        const handleUnderMouse = singleSelectedEl ? getHandleAtPos(singleSelectedEl, mousePos.x, mousePos.y) : null;

        if (handleUnderMouse) {
            state.dragAction = { type: handleUnderMouse, elements: [singleSelectedEl], handle: handleUnderMouse, startPos: mousePos, originalElements: [JSON.parse(JSON.stringify(singleSelectedEl))] };
            draw();
            return;
        }

        const elementUnderMouse = getElementAtPos(mousePos.x, mousePos.y);
        
        if (e.shiftKey) {
            if (elementUnderMouse) {
                if (state.selectedElementIds.includes(elementUnderMouse.id)) {
                    state.selectedElementIds = state.selectedElementIds.filter(id => id !== elementUnderMouse.id);
                } else {
                    state.selectedElementIds.push(elementUnderMouse.id);
                }
            }
        } else {
            if (elementUnderMouse) {
                if (!state.selectedElementIds.includes(elementUnderMouse.id)) {
                    state.selectedElementIds = [elementUnderMouse.id];
                }
            } else {
                state.selectedElementIds = [];
                state.marquee = { x1: mousePos.x, y1: mousePos.y, x2: mousePos.x, y2: mousePos.y };
            }
        }

        // Prepara para mover APENAS se não estivermos fazendo um marquee
        if (state.selectedElementIds.length > 0 && !state.marquee) {
            const selectedElements = state.elements.filter(el => state.selectedElementIds.includes(el.id));
            state.dragAction = { type: 'move', elements: selectedElements, startPos: mousePos, originalElements: JSON.parse(JSON.stringify(selectedElements)) };
        }
        
    } else if (state.activeTool === 'wall') {
        const wall = { id: Date.now(), type: 'wall', x1: mousePos.x, y1: mousePos.y, x2: mousePos.x, y2: mousePos.y };
        state.elements.push(wall);
        state.selectedElementIds = [wall.id];
    } else if (state.activeTool === 'add_object') {
        const object = { id: Date.now(), type: 'object', subType: state.objectToAdd, x: mousePos.x - 25, y: mousePos.y - 25, width: 50, height: 50, rotation: 0, name: '' };
        state.elements.push(object);
        state.activeTool = 'select'; state.selectedElementIds = [object.id];
        updateActiveToolButton();
        saveState();
    } else if (state.activeTool === 'text') {
        const text = { id: Date.now(), type: 'text', text: 'Novo Texto', x: mousePos.x, y: mousePos.y, fontSize: 16, fontFamily: 'Montserrat', rotation: 0 };
        state.elements.push(text);
        state.activeTool = 'select'; state.selectedElementIds = [text.id];
        updateActiveToolButton();
        saveState();
    } else if (state.activeTool === 'shape') {
        const defaultSize = 50;
        const shape = { 
            id: Date.now(), type: 'shape', subType: state.shapeToAdd, 
            x: mousePos.x - defaultSize / 2, y: mousePos.y - defaultSize / 2, 
            width: defaultSize, height: defaultSize, rotation: 0, 
            strokeColor: '#333333', fillColor: 'transparent', name: ''
        };
        state.elements.push(shape);
        state.activeTool = 'select';
        state.selectedElementIds = [shape.id];
        updateActiveToolButton();
        saveState();
    }
    
    toggleControls(state.selectedElementIds.length === 1 ? state.elements.find(el => el.id === state.selectedElementIds[0]) : null);
    draw();
}

// ... O resto do arquivo (onMouseMove, onMouseUp, etc.) permanece o mesmo da sua versão enviada anteriormente.
// Vou incluí-lo aqui para garantir que você tenha o arquivo completo e correto.

function onMouseMove(e) {
    const mousePos = getEventPos(e);

    if (state.marquee) {
        state.marquee.x2 = mousePos.x;
        state.marquee.y2 = mousePos.y;
        draw();
        return;
    }

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
        return;
    }
    
    const dx = mousePos.x - state.startPoint.x;
    const dy = mousePos.y - state.startPoint.y;

    if (state.dragAction.type === 'move') {
        state.dragAction.originalElements.forEach((origEl) => {
            const currentEl = state.elements.find(el => el.id === origEl.id);
            if (currentEl) {
                if (currentEl.type === 'wall') {
                    currentEl.x1 = origEl.x1 + dx; currentEl.y1 = origEl.y1 + dy;
                    currentEl.x2 = origEl.x2 + dx; currentEl.y2 = origEl.y2 + dy;
                } else {
                    currentEl.x = origEl.x + dx;
                    currentEl.y = origEl.y + dy;
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
            const snapAngle = 45;
            rotation = Math.round(rotation / snapAngle) * snapAngle;
        }
        el.rotation = rotation;
    } else if (['top-left', 'top-right', 'bottom-left', 'bottom-right'].includes(state.dragAction.type)) {
        const el = state.dragAction.elements[0];
        const orig = state.dragAction.originalElements[0];
        const handle = state.dragAction.type;

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
    } else if (state.activeTool === 'wall' && state.selectedElementIds.length > 0) {
        const wall = state.elements.find(el => el.id === state.selectedElementIds[0]);
        if (wall) {
            const totalDx = Math.abs(dx);
            const totalDy = Math.abs(dy);
            if (e.shiftKey || totalDx > totalDy) {
                wall.x2 = mousePos.x; wall.y2 = state.startPoint.y;
            } else {
                wall.x2 = state.startPoint.x; wall.y2 = mousePos.y;
            }
        }
    }
    draw();
}

function onMouseUp() {
    if (state.marquee) {
        const x1 = Math.min(state.marquee.x1, state.marquee.x2);
        const y1 = Math.min(state.marquee.y1, state.marquee.y2);
        const x2 = Math.max(state.marquee.x1, state.marquee.x2);
        const y2 = Math.max(state.marquee.y1, state.marquee.y2);
        
        const selectedIds = [];
        state.elements.forEach(el => {
            const elCenterX = el.x + (el.width || 0) / 2;
            const elCenterY = el.y + (el.height || 0) / 2;
            if (elCenterX > x1 && elCenterX < x2 && elCenterY > y1 && elCenterY < y2) {
                selectedIds.push(el.id);
            }
        });
        state.selectedElementIds = selectedIds;
        
        state.marquee = null;
        toggleControls(state.selectedElementIds.length === 1 ? state.elements.find(el => el.id === state.selectedElementIds[0]) : null);
    }

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
}
function onTouchStart(e) {
    e.preventDefault(); // Previne o comportamento padrão do navegador (scroll, etc.)

    // Se o gesto já começa com dois dedos, é para Pan/Zoom.
    if (e.touches.length === 2) {
        state.isDrawing = false; // Garante que não estamos desenhando/movendo objetos
        state.pan.active = true; // Ativa o modo de pan

        const t1 = e.touches[0];
        const t2 = e.touches[1];

        // Calcula a distância inicial entre os dedos
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        twoFingerTouch.startDist = dist;
        twoFingerTouch.startZoom = state.zoom;

        // Calcula o ponto médio para o Pan
        const midpoint = { 
            x: (t1.clientX + t2.clientX) / 2, 
            y: (t1.clientY + t2.clientY) / 2 
        };
        twoFingerTouch.lastMidpoint = midpoint;
        twoFingerTouch.startPan = { ...state.pan }; // Salva a posição inicial do pan

    } else if (e.touches.length === 1) {
        // Se for um toque único, usa a mesma lógica do onMouseDown
        onMouseDown(e.touches[0]);
    }
}
function onTouchMove(e) {
    e.preventDefault();

    // Se estamos movendo com dois dedos...
    if (e.touches.length === 2 && state.pan.active) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        
        // --- LÓGICA DO ZOOM ---
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const zoomFactor = currentDist / twoFingerTouch.startDist;
        state.zoom = Math.max(0.1, Math.min(5, twoFingerTouch.startZoom * zoomFactor)); // Limita o zoom
        updateZoomDisplay();

        // --- LÓGICA DO PAN ---
        const midpoint = { 
            x: (t1.clientX + t2.clientX) / 2, 
            y: (t1.clientY + t2.clientY) / 2 
        };
        const dx = midpoint.x - twoFingerTouch.lastMidpoint.x;
        const dy = midpoint.y - twoFingerTouch.lastMidpoint.y;

        state.pan.x += dx;
        state.pan.y += dy;
        
        twoFingerTouch.lastMidpoint = midpoint;

        draw(); // Redesenha o canvas com o novo zoom e pan

    } else if (e.touches.length === 1) {
        // Se for um toque único, usa a mesma lógica do onMouseMove
        onMouseMove(e.touches[0]);
    }
}
function onTouchEnd(e) {
    // Se estávamos em um gesto de dois dedos e agora não estamos mais, finaliza a ação
    if (state.pan.active && e.touches.length < 2) {
        state.pan.active = false;
    }
    
    // Se não há mais toques na tela, usa a lógica do onMouseUp
    if (e.touches.length === 0) {
        onMouseUp(e.changedTouches[0]);
    }
}
export function addEventListeners() {
    window.addEventListener('resize', setCanvasSize);
   // Eventos de Toque
    dom.canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    dom.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    dom.canvas.addEventListener('touchend', onTouchEnd);
    dom.canvas.addEventListener('touchcancel', onTouchEnd);
}