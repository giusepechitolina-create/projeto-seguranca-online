// js/config.js

export const TOOL_CONFIG = {
    select: {
        id: 'selectTool',
        title: 'Selecionar',
        type: 'tool',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="text-white" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 3 7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="m13 13 6 6"/></svg>`,
        cursor: 'default',
        key: 'v',
    },
    wall: {
        id: 'wallTool',
        title: 'Parede',
        type: 'tool',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="text-white" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L3 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z"/><path d="m14.5 12.5 2-2"/><path d="m11.5 9.5 2-2"/><path d="m8.5 6.5 2-2"/><path d="m17.5 15.5 2-2"/></svg>`,
        cursor: 'crosshair',
        key: 'w',
    },
    door: {
        id: 'doorTool',
        title: 'Porta',
        type: 'tool',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"/><path d="M2 20h20"/><path d="M14 12v.01"/></svg>`,
        cursor: 'crosshair',
        key: 'd',
    },
    window: {
        id: 'windowTool',
        title: 'Janela',
        type: 'tool',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12h20M12 2v20"/><path d="M20 2H4a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>`,
        cursor: 'crosshair',
        key: 'j',
    },
    text: {
        id: 'textTool',
        title: 'Texto',
        type: 'tool',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="text-white" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15V6M3 15V6M3 15h18M3 6h18"/><path d="M12 6v15"/></svg>`,
        cursor: 'text',
        key: 't',
    },
};

export const SHAPE_CONFIG = {
    rectangle: {
        title: 'Sala/Área',
        type: 'shape',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" class="text-white" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect></svg>`,
    },
};

export const EQUIPMENT_CONFIG = {
    camera: { title: 'Câmera', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><circle cx="12" cy="12" r="4"/></svg>` },
    motion_sensor: { title: 'S. Movim.', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f97316" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15.5 12a3.5 3.5 0 0 0-3.5-3.5V6a6 6 0 0 1 6 6h-2.5Z"/><path d="M8.5 12a3.5 3.5 0 0 1 3.5 3.5V18a6 6 0 0 0-6-6h2.5Z"/><path d="m12 15.5 3.5-3.5"/><path d="M8.5 12 12 8.5"/></svg>` },
    open_sensor: { title: 'S. Abert.', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="16" x="3" y="6" rx="2"/><path d="M11 12h2"/></svg>` },
    siren: { title: 'Sirene', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4z"/><path d="M4.2 11.2C3 10 2 11 2 12.4v2.2c0 1.5 1.2 2.5 2.5 2.5h1.4c.5 0 .9.3 1.2.6l2.3 2.3c1.3 1.3 3.3.4 3.3-1.4v-6.6c0-1.8-2-2.7-3.3-1.4L8.1 11c-.3.3-.7.6-1.2.6H5.5C4.8 11.6 4.4 11.4 4.2 11.2z"/><path d="M18 8.7a4.2 4.2 0 0 1 0 6.6"/><path d="M20.5 6.2a8.5 8.5 0 0 1 0 11.6"/></svg>` },
    dvr: { title: 'DVR', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg>` },
    alarm_panel: { title: 'Central Alarme', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fb923c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>` },
    remote_control: { title: 'C. Remoto', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="2" width="8" height="20" rx="2"/><path d="M7 6v0"/><path d="M7 12v0"/><path d="M7 18v0"/></svg>` },
    keypad: { title: 'Teclado', icon: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#facc15" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h.01"/><path d="M12 8h.01"/><path d="M17 8h.01"/><path d="M7 13h.01"/><path d="M12 13h.01"/><path d="M17 13h.01"/><path d="M7 18h.01"/><path d="M12 18h.01"/><path d="M17 18h.01"/></svg>` },
};

export const ACTION_CONFIG = {
    newProject: { id: 'newProjectBtn', title: 'Novo Projeto', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="text-white" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>`, hoverClass: 'hover:bg-green-500' },
    duplicate: { id: 'duplicateBtn', title: 'Duplicar', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="text-white" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`, hoverClass: 'hover:bg-blue-500' },
    delete: { id: 'deleteBtn', title: 'Apagar', icon: `<svg xmlns="http://www.w3.org/2000/svg" class="text-white" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="m5 6 1 0 1-0"/><path d="M10 3v3h4V3"/></svg>`, hoverClass: 'hover:bg-red-500' },
};