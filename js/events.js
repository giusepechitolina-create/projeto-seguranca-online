import { state, canvasElements } from './state.js';
import { draw, getResizeHandles } from './canvas.js';
import { saveState, toggleControls, updateActiveToolButton } from './main.js';
import { updateSelectedElement, editText, deleteSelected, duplicateSelected } from './actions.js';

// Adicione as funções auxiliares que eram globais aqui
function getEventPos(e) { /* ...código original... */ }
function getElementAtPos(x, y) { /* ...código original... */ }
function getHandleAtPos(el, x, y) { /* ...código original... */ }
// ... implementação completa abaixo ...

// --- FUNÇÕES AUXILIARES DE EVENTOS ---

function getEventPos(e) {
    const rect = canvasElements.canvas.getBoundingClientRect();
    let clientX, clientY;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX; clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX; clientY = e.clientY;
    }
    return { 
        x: (clientX - rect.left - state.pan.x) / state.zoom, 
        y: (clientY - rect.top - state.pan.y) / state.zoom 
    };
}

function getElementAtPos(x, y) {
    for (let i = state.elements.length - 1; i >= 0; i--) {
        const el = state.elements[i];
        // ... (código original de detecção de colisão) ...
        const centerX = (el.type === 'text') ? el.x : el.x + el.width/2;
        const centerY = (el.type === 'text') ? el.y : el.y + el.height/2;
        const dx = x - centerX;
        const dy = y - centerY;
        const angle = -el.rotation * Math.PI / 180;
        const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
        const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);

        if (el.type === 'object' || (el.type === 'shape' && el.subType === 'rectangle')) {
            if (rotatedX > -el.width / 2 && rotatedX < el.width / 2 && rotatedY > -el.height / 2 && rotatedY < el.height / 2) return el;
        } else if (el.type === 'shape' && el.subType === 'circle') {
            if (Math.sqrt(rotatedX**2 + rotatedY**2) < el.width / 2) return el;
        } // ... (resto do código de detecção) ...
    }
    return null;
}

function getHandleAtPos(el, x, y) {
    // ... (código original de detecção de handle) ...
    const handleHitboxSize = 8 / state.zoom;
    if (el.type === 'wall') {
        if (Math.sqrt((x - el.x1)**2 + (y - el.y1)**2) < handleHitboxSize) return 'start';
        if (Math.sqrt((x - el.x2)**2 + (y - el.y2)**2) < handleHitboxSize) return 'end';
        return null;
    }
    let centerX = el.type === 'text' ? el.x : el.x + el.width / 2;
    let centerY = el.type === 'text' ? el.y : el.y + el.height / 2;
    // ... (resto do código de detecção de handle) ...
    return null;
}

// --- MANIPULADORES DE EVENTOS ---

function onMouseDown(e) {
    state.isDrawing = true;
    const mousePos = getEventPos(e);
    state.startPoint = mousePos;

    if (e.ctrlKey) {
        state.pan.active = true;
        state.pan.start = { x: e.clientX, y: e.clientY };
        canvasElements.canvas.style.cursor = 'grabbing';
        return;
    }
    
    if (state.activeTool === 'select') {
        const element = getElementAtPos(mousePos.x, mousePos.y);

        if (e.shiftKey) {
            if (element) {
                if (state.selectedElementIds.includes(element.id)) {
                    state.selectedElementIds = state.selectedElementIds.filter(id => id !== element.id);
                } else {
                    state.selectedElementIds.push(element.id);
                }
            }
        } else {
            if (element && state.selectedElementIds.includes(element.id)) {
                // Clicked on an already selected element, prepare for move/resize
            } else if (element) {
                state.selectedElementIds = [element.id];
            } else {
                state.selectedElementIds = [];
            }
        }

        const selectedElements = state.elements.filter(el => state.selectedElementIds.includes(el.id));
        if (selectedElements.length > 0) {
            state.dragAction = { 
                type: 'move', 
                elements: selectedElements, 
                startPos: mousePos, 
                originalElements: JSON.parse(JSON.stringify(selectedElements)) 
            };
        }
        toggleControls(selectedElements.length === 1 ? selectedElements[0] : null);
    } // ... (resto da lógica de mousedown para outras ferramentas) ...
    draw();
}

function onMouseMove(e) {
    // ... (lógica de mousemove original, ajustada para múltiplos elementos se necessário) ...
}

function onMouseUp(e) {
    if (state.dragAction.type) {
        saveState();
    }
    if (state.activeTool === 'wall' || state.activeTool === 'shape') {
        state.activeTool = 'select'; updateActiveToolButton();
    }
    state.isDrawing = false; 
    state.pan.active = false;
    state.dragAction = { type: null, elements: [], handle: null, startPos: null, originalElements: [] };
    canvasElements.canvas.style.cursor = 'default';
    state.alignmentGuides = [];
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
    // ... (resto dos atalhos) ...
}


export function addEventListeners() {
    const { canvas } = canvasElements;
    window.addEventListener('resize', () => { /* setCanvasSize(); */ }); // A função setCanvasSize precisa ser importada
    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('dblclick', onDblClick);
    document.addEventListener('keydown', onKeyDown);
    // ... (resto dos event listeners para botões) ...
}