// js/actions.js
import { state, dom } from './state.js';
import { draw } from './canvas.js';
import { saveState } from './main.js';
import { toggleControls } from './ui.js';

export function deleteSelected() {
    if (state.selectedElementIds.length > 0) {
        state.elements = state.elements.filter(el => !state.selectedElementIds.includes(el.id));
        state.selectedElementIds = [];
        toggleControls(null);
        saveState();
        draw();
    }
}

export function duplicateSelected() {
    const selectedElements = state.elements.filter(el => state.selectedElementIds.includes(el.id));
    if (selectedElements.length > 0 && selectedElements.every(el => !['wall', 'door', 'window'].includes(el.type))) {
        const newIds = [];
        selectedElements.forEach(el => {
            const newElement = JSON.parse(JSON.stringify(el));
            newElement.id = Date.now() + Math.random();
            newElement.x += 20;
            newElement.y += 20;
            state.elements.push(newElement);
            newIds.push(newElement.id);
        });
        state.selectedElementIds = newIds;
        saveState();
        draw();
    }
}

export function updateSelectedElement(props) {
    state.elements.forEach(el => {
        if (state.selectedElementIds.includes(el.id)) {
            Object.assign(el, props);
        }
    });
        
    if (state.selectedElementIds.length === 1) {
        const el = state.elements.find(el => el.id === state.selectedElementIds[0]);
        if (props.strokeColor) document.getElementById('strokeColorPreview').style.backgroundColor = el.strokeColor;
        if (props.fillColor) document.getElementById('fillColorPreview').style.backgroundColor = el.fillColor;
    }
    
    saveState();
    draw();
}

export function editText(element) {
    const textarea = document.createElement('textarea');
    dom.canvasContainer.appendChild(textarea);
    
    const canvasRect = dom.canvas.getBoundingClientRect();
    const containerRect = dom.canvasContainer.getBoundingClientRect();

    textarea.value = element.text;
    textarea.style.position = 'absolute';
    textarea.style.left = `${canvasRect.left - containerRect.left + element.x * state.zoom + state.pan.x}px`;
    textarea.style.top = `${canvasRect.top - containerRect.top + element.y * state.zoom + state.pan.y}px`;
    textarea.style.fontFamily = element.fontFamily;
    textarea.style.fontSize = `${element.fontSize * state.zoom}px`;
    textarea.style.border = '1px solid #8bc53f';
    textarea.style.outline = 'none';
    textarea.style.zIndex = '100';
    textarea.style.transformOrigin = 'top left';
    textarea.style.transform = `rotate(${element.rotation}deg)`;
    textarea.style.lineHeight = '1.1';
    textarea.style.background = 'rgba(255, 255, 255, 0.9)';
    
    textarea.focus();
    textarea.select();

    const onFinish = () => {
        element.text = textarea.value;
        if (textarea.parentElement) {
            dom.canvasContainer.removeChild(textarea);
        }
        saveState();
        draw();
    };
    
    textarea.addEventListener('blur', onFinish);
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onFinish();
        } else if (e.key === 'Escape') {
            textarea.value = element.text;
            onFinish();
        }
    });
}

export function zoomIn() {
    state.zoom = Math.min(4, state.zoom + 0.25);
    draw();
}

export function zoomOut() {
    state.zoom = Math.max(0.25, state.zoom - 0.25);
    draw();
}

export function fitToScreen() {
    state.zoom = 1;
    state.pan = { x: 0, y: 0, active: false, start: {x: 0, y: 0} };
    draw();
}