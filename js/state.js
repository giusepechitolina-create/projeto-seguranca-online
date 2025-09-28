// Gerencia o estado central da aplicação e objetos globais
export const state = {
    elements: [],
    selectedElementIds: [],
    activeTool: 'select',
    objectToAdd: null,
    shapeToAdd: null,
    isDrawing: false,
    startPoint: { x: 0, y: 0 },
    pan: { x: 0, y: 0, active: false, start: {x: 0, y: 0} },
    zoom: 1,
    orientation: 'portrait',
    projectName: 'Projeto Sem Título',
    history: [],
    historyIndex: -1,
    dragAction: { 
        type: null, 
        elements: [], 
        handle: null, 
        startPos: null, 
        originalElements: [] 
    },
    marquee: null // Armazena as coordenadas {x1, y1, x2, y2} do retângulo de seleção
};

export const images = {};
export const objectTitles = {};
export const dom = {}; // Referências aos elementos do DOM

// Pega referências dos elementos HTML para uso global
export function initializeDOMReferences() {
    dom.canvas = document.getElementById('floorPlanCanvas');
    dom.ctx = dom.canvas.getContext('2d');
    dom.canvasContainer = document.getElementById('canvas-container');
    dom.zoomDisplay = document.getElementById('zoom-display');
    
    document.querySelectorAll('.object-btn, .shape-btn').forEach(btn => {
        const type = btn.dataset.type;
        const span = btn.querySelector('span');
        if (span) objectTitles[type] = span.textContent.trim();

        if (btn.classList.contains('object-btn')) {
            const img = new Image();
            const svgElement = btn.querySelector('svg');
            const coloredSvg = svgElement.cloneNode(true);
            coloredSvg.setAttribute('class', ''); // Remove classes do tailwind para renderização limpa
            const svgString = new XMLSerializer().serializeToString(coloredSvg);
            img.src = "data:image/svg+xml;base64," + btoa(svgString);
            images[type] = img;
        }
    });
}