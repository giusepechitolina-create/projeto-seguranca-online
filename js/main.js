// js/main.js
import { state, initializeDOMReferences, dom } from './state.js';
import { draw } from './canvas.js';
import { initializeCanvasEvents } from './events.js';
import { updateSelectedElement, deleteSelected, duplicateSelected, zoomIn, zoomOut, fitToScreen } from './actions.js';
import { downloadPDF } from './pdf.js';
import { populateToolbar, toggleControls, updateUndoRedoButtons, updateZoomDisplay, showNotification, updateActiveToolButton } from './ui.js';
import { TOOL_CONFIG } from './config.js';

function saveProjectToLocalStorage() {
    try {
        const projectData = {
            elements: state.elements,
            projectName: state.projectName,
            orientation: state.orientation,
        };
        localStorage.setItem('securityProjectData', JSON.stringify(projectData));
    } catch (error) {
        console.error("Erro ao salvar o projeto:", error);
        showNotification("Não foi possível salvar seu projeto. O armazenamento pode estar cheio.");
    }
}

function loadProjectFromLocalStorage() {
    try {
        const savedData = localStorage.getItem('securityProjectData');
        if (savedData) {
            const projectData = JSON.parse(savedData);
            state.elements = projectData.elements || [];
            state.projectName = projectData.projectName || 'Projeto Sem Título';
            state.orientation = projectData.orientation || 'portrait';
            document.getElementById('projectName').value = state.projectName;
            return true;
        }
    } catch (error) {
        console.error("Erro ao carregar o projeto:", error);
        localStorage.removeItem('securityProjectData');
    }
    return false;
}

export function saveState() {
    state.history.splice(state.historyIndex + 1);
    state.history.push(JSON.parse(JSON.stringify(state.elements)));
    if (state.history.length > 50) {
        state.history.shift();
    }
    state.historyIndex = state.history.length - 1;
    updateUndoRedoButtons();
    saveProjectToLocalStorage();
}

function undo() {
    if (state.historyIndex > 0) {
        state.historyIndex--;
        state.elements = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        state.selectedElementIds = [];
        toggleControls(null);
        updateUndoRedoButtons();
        saveProjectToLocalStorage();
        draw();
    }
}

function redo() {
    if (state.historyIndex < state.history.length - 1) {
        state.historyIndex++;
        state.elements = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
        state.selectedElementIds = [];
        toggleControls(null);
        updateUndoRedoButtons();
        saveProjectToLocalStorage();
        draw();
    }
}

window.undo = undo;
window.redo = redo;

export function setCanvasSize() {
    const container = dom.canvasContainer;
    const padding = 32;
    const containerWidth = container.clientWidth - padding;
    const containerHeight = container.clientHeight - padding;
    
    const ratio = state.orientation === 'portrait' ? 210 / 297 : 297 / 210;
    
    dom.canvas.width = (containerWidth / containerHeight > ratio) 
        ? containerHeight * ratio 
        : containerWidth;
    dom.canvas.height = (containerWidth / containerHeight > ratio)
        ? containerHeight
        : containerWidth / ratio;
        
    draw();
}

function changeOrientation(orientation) {
    state.orientation = orientation;
    document.getElementById('portraitBtn').classList.toggle('active', orientation === 'portrait');
    document.getElementById('landscapeBtn').classList.toggle('active', orientation !== 'portrait');
    setCanvasSize();
    saveProjectToLocalStorage();
}

function clearProject() {
    if (confirm("Você tem certeza que deseja iniciar um novo projeto? Todas as alterações não salvas serão perdidas.")) {
        state.elements = [];
        state.projectName = 'Projeto Sem Título';
        state.selectedElementIds = [];
        document.getElementById('projectName').value = state.projectName;
        toggleControls(null);
        saveState();
        draw();
    }
}

function initializeEventListeners() {
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.getElementById('projectName').addEventListener('change', e => {
        state.projectName = e.target.value || 'Projeto Sem Título';
        saveProjectToLocalStorage();
    });
    document.getElementById('portraitBtn').addEventListener('click', () => changeOrientation('portrait'));
    document.getElementById('landscapeBtn').addEventListener('click', () => changeOrientation('landscape'));
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadPDF);

    document.getElementById('tools-container').addEventListener('click', (e) => {
        const btn = e.target.closest('.tool-btn-main');
        if (!btn) return;
        state.activeTool = btn.dataset.type;
        updateActiveToolButton(btn.id);
    });
    document.getElementById('shapes-container').addEventListener('click', (e) => {
        const btn = e.target.closest('.shape-btn');
        if (!btn) return;
        state.activeTool = 'shape';
        state.toolSubType = btn.dataset.type;
        updateActiveToolButton(btn.id);
    });
    document.getElementById('equipment-container').addEventListener('click', (e) => {
        const btn = e.target.closest('.object-btn');
        if (!btn) return;
        state.activeTool = 'object';
        state.toolSubType = btn.dataset.type;
        updateActiveToolButton(btn.id);
    });
    document.getElementById('actions-container').addEventListener('click', (e) => {
        const btn = e.target.closest('.action-btn');
        if (!btn) return;
        switch(btn.dataset.type) {
            case 'newProject': clearProject(); break;
            case 'duplicate': duplicateSelected(); break;
            case 'delete': deleteSelected(); break;
        }
    });
    
    document.getElementById('fontFamilySelect').addEventListener('change', (e) => updateSelectedElement({ fontFamily: e.target.value }));
    document.getElementById('fontSizeInput').addEventListener('change', (e) => updateSelectedElement({ fontSize: parseInt(e.target.value, 10) }));
    document.getElementById('objectNameInput').addEventListener('input', (e) => updateSelectedElement({ name: e.target.value }));
    document.getElementById('strokeColorPicker').addEventListener('input', (e) => updateSelectedElement({ strokeColor: e.target.value }));
    document.getElementById('fillColorPicker').addEventListener('input', (e) => updateSelectedElement({ fillColor: e.target.value }));
    
    document.getElementById('zoomInBtn').addEventListener('click', () => { zoomIn(); updateZoomDisplay(); });
    document.getElementById('zoomOutBtn').addEventListener('click', () => { zoomOut(); updateZoomDisplay(); });
    document.getElementById('fitToScreenBtn').addEventListener('click', () => { fitToScreen(); updateZoomDisplay(); });

    window.updateActiveTool = () => updateActiveToolButton(TOOL_CONFIG[state.activeTool].id);
}

function initialize() {
    initializeDOMReferences();
    populateToolbar();
    initializeEventListeners();
    initializeCanvasEvents();

    if (!loadProjectFromLocalStorage()) {
        saveState();
    } else {
        state.history = [JSON.parse(JSON.stringify(state.elements))];
        state.historyIndex = 0;
    }
    
    changeOrientation(state.orientation);
    updateUndoRedoButtons();
    updateZoomDisplay();
    updateActiveToolButton('selectTool');
    
    draw();
}

document.addEventListener('DOMContentLoaded', initialize);