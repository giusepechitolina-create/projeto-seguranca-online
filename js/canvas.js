import { state, images, dom } from './state.js';

export function draw() {
    const { ctx, canvas } = dom;
    ctx.save();
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.translate(state.pan.x, state.pan.y);
    ctx.scale(state.zoom, state.zoom);
    
    drawScene(ctx, state.elements);
    drawSelection();
    
    ctx.restore();
}

export function drawScene(targetCtx, elementsToDraw) {
    elementsToDraw.forEach(el => {
       targetCtx.save();
       if (el.type === 'wall') {
           targetCtx.beginPath();
           targetCtx.moveTo(el.x1, el.y1);
           targetCtx.lineTo(el.x2, el.y2);
           targetCtx.strokeStyle = '#333';
           targetCtx.lineWidth = 5;
           targetCtx.stroke();
       } else if (el.type === 'object') {
           const img = images[el.subType];
           if (img && img.complete) {
               targetCtx.translate(el.x + el.width / 2, el.y + el.height / 2);
               targetCtx.rotate(el.rotation * Math.PI / 180);
               targetCtx.drawImage(img, -el.width / 2, -el.height / 2, el.width, el.height);
           }
       } else if (el.type === 'text') {
           targetCtx.translate(el.x, el.y);
           targetCtx.rotate(el.rotation * Math.PI / 180);
           targetCtx.font = `${el.fontSize}px ${el.fontFamily}`;
           targetCtx.fillStyle = '#333';
           targetCtx.textAlign = 'left';
           targetCtx.textBaseline = 'top';
           targetCtx.fillText(el.text, 0, 0);
       } else if (el.type === 'shape') {
           targetCtx.translate(el.x + el.width / 2, el.y + el.height / 2);
           targetCtx.rotate(el.rotation * Math.PI / 180);
           targetCtx.strokeStyle = el.strokeColor;
           targetCtx.fillStyle = el.fillColor;
           targetCtx.lineWidth = 3;
           targetCtx.beginPath();

           switch(el.subType) {
               case 'rectangle': targetCtx.rect(-el.width/2, -el.height/2, el.width, el.height); break;
               case 'circle': targetCtx.arc(0, 0, el.width / 2, 0, 2 * Math.PI); break;
               case 'triangle':
                   targetCtx.moveTo(0, -el.height / 2);
                   targetCtx.lineTo(el.width / 2, el.height / 2);
                   targetCtx.lineTo(-el.width / 2, el.height / 2);
                   targetCtx.closePath();
                   break;
           }
           if (el.fillColor && el.fillColor !== 'transparent') targetCtx.fill();
           targetCtx.stroke();
       }

       if ((el.type === 'object' || el.type === 'shape') && el.name) {
           targetCtx.font = `12px Montserrat`;
           targetCtx.fillStyle = '#333';
           targetCtx.textAlign = 'center';
           targetCtx.textBaseline = 'top';
           targetCtx.fillText(el.name, 0, el.height / 2 + 5);
       }
       targetCtx.restore();
   });
}

function drawSelection() {
    const selectedElements = state.elements.filter(el => state.selectedElementIds.includes(el.id));
    if (selectedElements.length === 0) return;

    if (selectedElements.length === 1) {
        const el = selectedElements[0];
        if (el.type === 'wall') {
            drawWallSelection(el);
        } else {
            drawSelectionBox(el);
        }
    } else {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selectedElements.forEach(el => {
            const width = el.width || (el.type === 'wall' ? Math.abs(el.x2 - el.x1) : 0);
            const height = el.height || (el.type === 'wall' ? Math.abs(el.y2 - el.y1) : 0);
            const elX = el.type === 'wall' ? Math.min(el.x1, el.x2) : el.x;
            const elY = el.type === 'wall' ? Math.min(el.y1, el.y2) : el.y;
            minX = Math.min(minX, elX);
            minY = Math.min(minY, elY);
            maxX = Math.max(maxX, elX + width);
            maxY = Math.max(maxY, elY + height);
        });
        
        dom.ctx.save();
        dom.ctx.strokeStyle = '#8bc53f';
        dom.ctx.lineWidth = 2 / state.zoom;
        dom.ctx.setLineDash([6 / state.zoom, 3 / state.zoom]);
        dom.ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
        dom.ctx.restore();
    }
}

function drawSelectionBox(el) {
    const { ctx } = dom;
    ctx.save();
    
    let boxX, boxY, boxWidth, boxHeight, centerX, centerY;
    if (el.type === 'object' || el.type === 'shape') {
        boxX = -el.width / 2; boxY = -el.height / 2; boxWidth = el.width; boxHeight = el.height;
        centerX = el.x + el.width / 2; centerY = el.y + el.height / 2;
    } else if (el.type === 'text') {
        ctx.font = `${el.fontSize}px ${el.fontFamily}`;
        const metrics = ctx.measureText(el.text);
        boxWidth = metrics.width; boxHeight = el.fontSize;
        boxX = 0; boxY = 0; centerX = el.x; centerY = el.y;
    }

    ctx.translate(centerX, centerY);
    ctx.rotate(el.rotation * Math.PI / 180);
    ctx.strokeStyle = '#8bc53f';
    ctx.lineWidth = 2 / state.zoom;
    ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

    ctx.beginPath();
    ctx.arc(boxX + boxWidth/2, boxY - 15/state.zoom, 5/state.zoom, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.stroke();

    if (el.type !== 'text') {
        const handleSize = 8 / state.zoom;
        ctx.fillStyle = '#8bc53f';
        const handles = getResizeHandles(el);
        Object.values(handles).forEach(h => {
             ctx.fillRect(h.x - handleSize/2, h.y - handleSize/2, handleSize, handleSize);
        });
    }
    ctx.restore();
}

function drawWallSelection(el) {
    const { ctx } = dom;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(el.x1, el.y1);
    ctx.lineTo(el.x2, el.y2);
    ctx.strokeStyle = '#8bc53f';
    ctx.lineWidth = 7 / state.zoom;
    ctx.stroke();

    const handleSize = 8 / state.zoom;
    ctx.fillStyle = '#8bc53f';
    ctx.fillRect(el.x1 - handleSize / 2, el.y1 - handleSize / 2, handleSize, handleSize);
    ctx.fillRect(el.x2 - handleSize / 2, el.y2 - handleSize / 2, handleSize, handleSize);
    ctx.restore();
}

export function getResizeHandles(el) {
    const hw = el.width / 2;
    const hh = el.height / 2;
    return {
        'top-left': { x: -hw, y: -hh, cursor: 'nwse-resize' },
        'top-right': { x: hw, y: -hh, cursor: 'nesw-resize' },
        'bottom-left': { x: -hw, y: hh, cursor: 'nesw-resize' },
        'bottom-right': { x: hw, y: hh, cursor: 'nwse-resize' }
    };
}