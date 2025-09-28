import { state, dom } from './state.js';
import { draw } from './canvas.js';
import { saveState, toggleControls } from './main.js';

let notificationTimeout;

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
    if (selectedElements.length > 0 && selectedElements.every(el => el.type !== 'wall')) {
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
    const selectedElements = state.elements.filter(el => state.selectedElementIds.includes(el.id));
    if (selectedElements.length > 0) {
        selectedElements.forEach(el => Object.assign(el, props));
        
        if (selectedElements.length === 1) {
            const el = selectedElements[0];
            if (props.strokeColor) document.getElementById('strokeColorPreview').style.backgroundColor = el.strokeColor;
            if (props.fillColor) document.getElementById('fillColorPreview').style.backgroundColor = el.fillColor;
        }
        
        saveState();
        draw();
    }
}

export function editText(element) {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    
    const canvasRect = dom.canvas.getBoundingClientRect();
    textarea.value = element.text;
    textarea.style.position = 'absolute';
    textarea.style.left = `${canvasRect.left + element.x * state.zoom + state.pan.x}px`;
    textarea.style.top = `${canvasRect.top + element.y * state.zoom + state.pan.y}px`;
    textarea.style.fontFamily = element.fontFamily;
    textarea.style.fontSize = `${element.fontSize * state.zoom}px`;
    textarea.style.border = '1px solid #8bc53f';
    textarea.style.outline = 'none';
    textarea.style.zIndex = '100';
    textarea.style.transformOrigin = 'top left';
    textarea.style.transform = `rotate(${element.rotation}deg)`;
    textarea.style.lineHeight = '1.1';
    
    textarea.focus();
    textarea.select();

    const onFinish = () => {
        element.text = textarea.value;
        document.body.removeChild(textarea);
        saveState();
        draw();
    };
    
    textarea.addEventListener('blur', onFinish);
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onFinish();
        }
    });
}

export function zoomIn() {
    state.zoom = Math.min(4, state.zoom + 0.25);
    updateZoomDisplay();
    draw();
}

export function zoomOut() {
    state.zoom = Math.max(0.25, state.zoom - 0.25);
    updateZoomDisplay();
    draw();
}

export function fitToScreen() {
    state.zoom = 1;
    state.pan = { x: 0, y: 0, active: false, start: {x: 0, y: 0} };
    updateZoomDisplay();
    draw();
}

export function updateZoomDisplay() {
    dom.zoomDisplay.textContent = `${Math.round(state.zoom * 100)}%`;
}

export function showNotification(message, isError = true) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.backgroundColor = isError ? '#ef4444' : '#22c55e';
    notification.style.transform = 'translateX(0)';
    
    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
        notification.style.transform = 'translateX(120%)';
    }, 3000);
}