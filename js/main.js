import { state, initializeDOMReferences, dom } from './state.js';
import { draw } from './canvas.js';
import { addEventListeners } from './events.js';
import { updateZoomDisplay, deleteSelected, duplicateSelected, zoomIn, zoomOut, fitToScreen, updateSelectedElement, showNotification } from './actions.js';
import { downloadPDF } from './pdf.js';

// --- FUNÇÕES DE PERSISTÊNCIA (localStorage) ---

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

// --- FUNÇÕES DE HISTÓRICO (UNDO/REDO) ---

export function saveState() {
    state.history.splice(state.historyIndex + 1);
    state.history.push(JSON.parse(JSON.stringify(state.elements)));
    if (state.history.length > 21) { // Aumentando um pouco o limite
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

// Para que os atalhos de teclado acessem as funções de undo/redo
window.undo = undo;
window.redo = redo;

// --- FUNÇÕES DE UI E CONTROLE ---

export function setCanvasSize() {
    const containerWidth = dom.canvasContainer.clientWidth - 40;
    const containerHeight = dom.canvasContainer.clientHeight - 40;
    const ratio = state.orientation === 'portrait' ? 210 / 297 : 297 / 210;
    let canvasWidth, canvasHeight;

    if (containerWidth / containerHeight > ratio) {
        canvasHeight = containerHeight;
        canvasWidth = canvasHeight * ratio;
    } else {
        canvasWidth = containerWidth;
        canvasHeight = canvasWidth / ratio;
    }

    dom.canvas.width = canvasWidth;
    dom.canvas.height = canvasHeight;
    draw();
}

export function changeOrientation(orientation) {
    state.orientation = orientation;
    const isPortrait = orientation === 'portrait';
    document.getElementById('portraitBtn').classList.toggle('active', isPortrait);
    document.getElementById('portraitBtn').classList.toggle('bg-gray-700', !isPortrait);
    document.getElementById('landscapeBtn').classList.toggle('active', !isPortrait);
    document.getElementById('landscapeBtn').classList.toggle('bg-gray-700', isPortrait);
    setCanvasSize();
    saveProjectToLocalStorage();
}

export function updateActiveToolButton(activeBtn) {
    document.querySelectorAll('.tool-btn').forEach(b => {
        b.classList.remove('active');
        if (b.id !== 'portraitBtn' && b.id !== 'landscapeBtn') {
            b.classList.remove('bg-gray-700');
        }
    });
    const btnToActivate = activeBtn || document.getElementById(state.activeTool === 'select' ? 'selectTool' : `${state.activeTool}Tool`);
    if(btnToActivate) btnToActivate.classList.add('active');
}

export function toggleControls(element) {
    const textControls = document.getElementById('textControls');
    const shapeControls = document.getElementById('shapeControls');
    const nameControls = document.getElementById('nameControls');
    
    textControls.style.display = 'none';
    shapeControls.style.display = 'none';
    nameControls.style.display = 'none';

    if (!element) return;

    if (element.type === 'text') {
        textControls.style.display = 'flex';
        document.getElementById('fontFamilySelect').value = element.fontFamily;
        document.getElementById('fontSizeInput').value = element.fontSize;
    } else if (element.type === 'shape') {
        shapeControls.style.display = 'flex';
        nameControls.style.display = 'flex';
        document.getElementById('strokeColorPicker').value = element.strokeColor;
        document.getElementById('strokeColorPreview').style.backgroundColor = element.strokeColor;
        document.getElementById('fillColorPicker').value = element.fillColor;
        document.getElementById('fillColorPreview').style.backgroundColor = element.fillColor;
        document.getElementById('objectNameInput').value = element.name || '';
    } else if (element.type === 'object') {
        nameControls.style.display = 'flex';
        document.getElementById('objectNameInput').value = element.name || '';
    }
}

function updateUndoRedoButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    undoBtn.disabled = state.historyIndex <= 0;
    redoBtn.disabled = state.historyIndex >= state.history.length - 1;
}

function clearProject() {
    if (confirm("Você tem certeza que deseja limpar o canvas? O projeto atual será substituído.")) {
        state.elements = [];
        state.projectName = 'Projeto Sem Título';
        state.selectedElementIds = [];
        document.getElementById('projectName').value = state.projectName;
        toggleControls(null);
        saveState();
        draw();
    }
}

// --- FUNÇÃO DE INICIALIZAÇÃO ---

function initialize() {
    initializeDOMReferences();
    
    // Anexa os listeners aos botões
    document.getElementById('undoBtn').addEventListener('click', undo);
    document.getElementById('redoBtn').addEventListener('click', redo);
    document.getElementById('projectName').addEventListener('change', e => {
        state.projectName = e.target.value;
        saveProjectToLocalStorage();
    });
    document.getElementById('portraitBtn').addEventListener('click', () => changeOrientation('portrait'));
    document.getElementById('landscapeBtn').addEventListener('click', () => changeOrientation('landscape'));
    document.getElementById('downloadPdfBtn').addEventListener('click', downloadPDF);
    document.getElementById('newProjectBtn').addEventListener('click', clearProject);
    document.getElementById('duplicateBtn').addEventListener('click', duplicateSelected);
    document.getElementById('deleteBtn').addEventListener('click', deleteSelected);
    document.getElementById('zoomInBtn').addEventListener('click', zoomIn);
    document.getElementById('zoomOutBtn').addEventListener('click', zoomOut);
    document.getElementById('fitToScreenBtn').addEventListener('click', fitToScreen);
    
    // Listeners dos controles de edição
    document.getElementById('fontFamilySelect').addEventListener('change', (e) => updateSelectedElement({ fontFamily: e.target.value }));
    document.getElementById('fontSizeInput').addEventListener('change', (e) => updateSelectedElement({ fontSize: parseInt(e.target.value, 10) }));
    document.getElementById('objectNameInput').addEventListener('input', (e) => updateSelectedElement({ name: e.target.value }));
    document.getElementById('strokeColorPicker').addEventListener('input', (e) => updateSelectedElement({ strokeColor: e.target.value }));
    document.getElementById('fillColorPicker').addEventListener('input', (e) => updateSelectedElement({ fillColor: e.target.value }));

    // Listeners das ferramentas
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('shape-btn')) {
                state.activeTool = 'shape';
                state.shapeToAdd = btn.dataset.type;
            } else if (btn.classList.contains('object-btn')) {
                state.activeTool = 'add_object';
                state.objectToAdd = btn.dataset.type;
            } else if (btn.id.includes('Tool')) {
                state.activeTool = btn.id.replace('Tool', '');
            }
            updateActiveToolButton(btn);
        });
    });

    addEventListeners(); // Adiciona os listeners de canvas e teclado

    // Carrega o projeto
    const projectLoaded = loadProjectFromLocalStorage();
    if (!projectLoaded) {
        changeOrientation('portrait');
    } else {
        changeOrientation(state.orientation);
    }
    
    setCanvasSize();
    updateZoomDisplay();
    
    if (!projectLoaded) {
        saveState();
    } else {
        state.history = [JSON.parse(JSON.stringify(state.elements))];
        state.historyIndex = 0;
        updateUndoRedoButtons();
    }
    
    draw();
}

// Inicia a aplicação quando o DOM estiver pronto.
document.addEventListener('DOMContentLoaded', initialize);