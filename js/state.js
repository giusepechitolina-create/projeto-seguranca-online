// js/state.js
import { EQUIPMENT_CONFIG } from './config.js';

export const state = {
    elements: [],
    selectedElementIds: [],
    activeTool: 'select',
    toolSubType: null,
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
    marquee: null,
    snapLines: []
};

export const images = {};
export const objectTitles = {};
export const dom = {};

export function initializeDOMReferences() {
    dom.canvas = document.getElementById('floorPlanCanvas');
    dom.ctx = dom.canvas.getContext('2d');
    dom.canvasContainer = document.getElementById('canvas-container');
    dom.zoomDisplay = document.getElementById('zoom-display');
    
    Object.entries(EQUIPMENT_CONFIG).forEach(([key, config]) => {
        objectTitles[key] = config.title;
        const img = new Image();
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 24 24" fill="none" stroke="#1a2e4f" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${config.icon.match(/<svg.*?>(.*)<\/svg>/)[1]}</svg>`;
        img.src = "data:image/svg+xml;base64," + btoa(svgString);
        images[key] = img;
    });
}