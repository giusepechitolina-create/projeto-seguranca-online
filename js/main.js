import { state, initializeDOMReferences, canvasElements } from './state.js';
import { draw } from './canvas.js';
import { addEventListeners } from './events.js';
import { updateZoomDisplay } from './actions.js';

// --- FUNÇÕES DE PERSISTÊNCIA ---
function saveProjectToLocalStorage() { /* ...código original... */ }
function loadProjectFromLocalStorage() { /* ...código original... */ }

// --- FUNÇÕES DE HISTÓRICO (UNDO/REDO) ---
export function saveState() { /* ...código original... */ }
window.undo = function() { /* ...código original... */ }
window.redo = function() { /* ...código original... */ }

// --- FUNÇÕES DE UI ---
export function toggleControls(element) { /* ...código original... */ }
export function updateActiveToolButton(activeBtn) { /* ...código original... */ }
function changeOrientation(orientation) { /* ...código original... */ }
function setCanvasSize() { /* ...código original... */ }

// --- FUNÇÃO DE INICIALIZAÇÃO ---
function initialize() {
    initializeDOMReferences();
    const projectLoaded = loadProjectFromLocalStorage();
    setCanvasSize();
    addEventListeners(); // Isso agora anexa todos os eventos do events.js
    updateActiveToolButton();
    updateZoomDisplay();

    if (projectLoaded) {
        changeOrientation(state.orientation);
    }
    
    if (!projectLoaded) {
        saveState(); 
    } else {
        state.history = [JSON.parse(JSON.stringify(state.elements))];
        state.historyIndex = 0;
        updateUndoRedoButtons();
    }
    draw();
}

document.addEventListener('DOMContentLoaded', initialize);