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
    marquee: null
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
        const svgString = config.icon.replace(/class=".*?"/g, '');
        img.src = "data:image/svg+xml;base64," + btoa(svgString);
        images[key] = img;
    });
}