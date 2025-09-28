export const state = {
    elements: [],
    selectedElementIds: [], // Mudou para um array para seleção múltipla
    activeTool: 'select',
    objectToAdd: null,
    shapeToAdd: null,
    isDrawing: false,
    startPoint: { x: 0, y: 0 },
    pan: { x: 0, y: 0, active: false, start: {x: 0, y: 0} },
    zoom: 1,
    orientation: 'portrait',
    projectName: 'Projeto Sem Título',
    alignmentGuides: [],
    history: [],
    historyIndex: -1,
    dragAction: { type: null, elements: [], handle: null, startPos: null, originalElements: [] }
};

export const images = {};
export const objectTitles = {};
export const canvasElements = {};

// Função para inicializar objetos globais que dependem do DOM
export function initializeDOMReferences() {
    canvasElements.canvas = document.getElementById('floorPlanCanvas');
    canvasElements.ctx = canvasElements.canvas.getContext('2d');
    canvasElements.canvasContainer = document.getElementById('canvas-container');
    canvasElements.zoomDisplay = document.getElementById('zoom-display');

    document.querySelectorAll('.object-btn').forEach(btn => {
        const img = new Image();
        const svgElement = btn.querySelector('svg');
        const coloredSvg = svgElement.cloneNode(true);
        coloredSvg.setAttribute('class', '');
        const svgString = new XMLSerializer().serializeToString(coloredSvg);
        const svgDataUrl = "data:image/svg+xml;base64," + btoa(svgString);
        img.src = svgDataUrl;
        images[btn.dataset.type] = img;
    });
    
    document.querySelectorAll('button[data-type]').forEach(btn => {
        const titleElement = btn.querySelector('span');
        if (titleElement) {
            objectTitles[btn.dataset.type] = titleElement.textContent.trim();
        }
    });
}