// js/actions.js
import { state, dom } from './state.js';
import { draw } from './canvas.js';
import { saveState } from './main.js';
import { toggleControls } from './ui.js';
import { distToSegment } from './events.js';

export function deleteSelected() {
    if (state.selectedElementIds.length > 0) {
        const wallIdsToDelete = state.elements
            .filter(el => state.selectedElementIds.includes(el.id) && el.type === 'wall')
            .map(wall => wall.id);

        state.elements = state.elements.filter(el => {
            if (state.selectedElementIds.includes(el.id)) return false;
            if (['door', 'window'].includes(el.type) && wallIdsToDelete.includes(el.wallId)) return false;
            return true;
        });

        state.selectedElementIds = [];
        toggleControls(null);
        saveState();
        draw();
    }
}

export function placeDuplicatedInsertable(mousePos) {
    const elToPlace = state.elements.find(el => el.wallId === 'pending');
    if (!elToPlace) return;

    const wall = state.elements.find(w => w.type === 'wall' && distToSegment(mousePos, {x: w.x1, y: w.y1}, {x: w.x2, y: w.y2}) < w.thickness);
    
    if (wall) {
        const wallDx = wall.x2 - wall.x1;
        const wallDy = wall.y2 - wall.y1;
        const wallLengthSq = wallDx**2 + wallDy**2;
        const t = ((mousePos.x - wall.x1) * wallDx + (mousePos.y - wall.y1) * wallDy) / wallLengthSq;
        
        elToPlace.wallId = wall.id;
        elToPlace.position = Math.max(0, Math.min(1, t));
        delete elToPlace.x;
        delete elToPlace.y;
        
        state.activeTool = 'select';
        state.toolSubType = null;
        dom.canvas.style.cursor = 'default';
        saveState();
    } else {
        state.elements = state.elements.filter(el => el.id !== elToPlace.id);
        state.selectedElementIds = [];
        state.activeTool = 'select';
        state.toolSubType = null;
        dom.canvas.style.cursor = 'default';
    }
    draw();
}

export function duplicateSelected() {
    const selectedElements = state.elements.filter(el => state.selectedElementIds.includes(el.id));
    if (selectedElements.length === 0) return;

    if (selectedElements.length === 1 && ['door', 'window'].includes(selectedElements[0].type)) {
        const original = selectedElements[0];
        const newElement = JSON.parse(JSON.stringify(original));
        newElement.id = Date.now() + Math.random();
        newElement.wallId = 'pending';
        
        const wall = state.elements.find(w => w.id === original.wallId);
        if (wall) {
            newElement.x = wall.x1 + (wall.x2 - wall.x1) * original.position + 20;
            newElement.y = wall.y1 + (wall.y2 - wall.y1) * original.position + 20;
        } else {
            newElement.x = state.startPoint.x;
            newElement.y = state.startPoint.y;
        }
        
        state.elements.push(newElement);
        state.selectedElementIds = [newElement.id];
        state.activeTool = 'select';
        state.toolSubType = 'place_insertable';
        dom.canvas.style.cursor = 'crosshair';
        draw();
        return;
    }

    const newIds = [];
    const offset = 20 / state.zoom;

    selectedElements.forEach(el => {
        const newElement = JSON.parse(JSON.stringify(el));
        newElement.id = Date.now() + Math.random();
        
        if (el.type === 'wall') {
            newElement.x1 += offset;
            newElement.y1 += offset;
            newElement.x2 += offset;
            newElement.y2 += offset;
        } else {
            newElement.x += offset;
            newElement.y += offset;
        }

        state.elements.push(newElement);
        newIds.push(newElement.id);
    });
    state.selectedElementIds = newIds;
    saveState();
    draw();
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