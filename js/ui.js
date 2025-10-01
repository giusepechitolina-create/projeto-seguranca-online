// js/ui.js
import { state } from './state.js';
import { TOOL_CONFIG, SHAPE_CONFIG, EQUIPMENT_CONFIG, ACTION_CONFIG } from './config.js';

let notificationTimeout;

export function showNotification(message, type = 'error') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.style.backgroundColor = type === 'error' ? '#ef4444' : (type === 'success' ? '#22c55e' : '#3b82f6');
    notification.style.transform = 'translateX(0)';

    clearTimeout(notificationTimeout);
    notificationTimeout = setTimeout(() => {
        notification.style.transform = 'translateX(120%)';
    }, 3000);
}

export function updateZoomDisplay() {
    document.getElementById('zoom-display').textContent = `${Math.round(state.zoom * 100)}%`;
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

export function updateUndoRedoButtons() {
    document.getElementById('undoBtn').disabled = state.historyIndex <= 0;
    document.getElementById('redoBtn').disabled = state.historyIndex >= state.history.length - 1;
}

export function updateActiveToolButton(activeBtnId) {
    document.querySelectorAll('.tool-btn').forEach(b => {
        b.classList.remove('active');
        if (!['portraitBtn', 'landscapeBtn'].includes(b.id)) {
            b.classList.remove('bg-gray-700');
        }
    });
    const btnToActivate = document.getElementById(activeBtnId);
    if (btnToActivate) btnToActivate.classList.add('active');
}


function createButton(config, key, groupClass) {
    const btn = document.createElement('button');
    btn.id = config.id || `${key}Btn`;
    btn.className = `flex-shrink-0 flex flex-col lg:flex-row items-center gap-1 lg:gap-3 p-2 lg:px-2 lg:py-2 rounded-md tool-btn lg:w-full ${groupClass} ${config.hoverClass || ''}`;
    btn.dataset.type = key;

    btn.innerHTML = `
        ${config.icon}
        <span class="text-xs lg:text-sm font-medium text-center">${config.title}</span>
    `;
    return btn;
}

export function populateToolbar() {
    const toolsContainer = document.getElementById('tools-container');
    const shapesContainer = document.getElementById('shapes-container');
    const equipmentContainer = document.getElementById('equipment-container');
    const actionsContainer = document.getElementById('actions-container');

    Object.entries(TOOL_CONFIG).forEach(([key, config]) => {
        const btn = createButton(config, key, 'tool-btn-main');
        toolsContainer.appendChild(btn);
    });

    Object.entries(SHAPE_CONFIG).forEach(([key, config]) => {
        const btn = createButton(config, key, 'shape-btn');
        shapesContainer.appendChild(btn);
    });
    
    Object.entries(EQUIPMENT_CONFIG).forEach(([key, config]) => {
        const btn = createButton(config, key, 'object-btn');
        equipmentContainer.appendChild(btn);
    });

    Object.entries(ACTION_CONFIG).forEach(([key, config]) => {
        const btn = createButton(config, key, 'action-btn');
        actionsContainer.appendChild(btn);
    });
}