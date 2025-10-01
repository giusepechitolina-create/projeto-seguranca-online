// js/pdf.js
import { state, images, objectTitles, dom } from './state.js';
import { draw, drawScene } from './canvas.js';
import { showNotification } from './ui.js';

export function downloadPDF() {
    const originalIds = [...state.selectedElementIds];
    state.selectedElementIds = [];
    draw();
    
    setTimeout(() => {
        try {
            if (state.elements.length === 0) {
                showNotification("O projeto está vazio.", 'error'); return;
            }
            if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
                showNotification("Erro: A biblioteca jsPDF não foi carregada.", 'error'); return;
            }

            const { jsPDF } = window.jspdf;
            const equipmentInUse = state.elements.filter(el => el.type === 'object');
            const objectTypesInUse = [...new Set(equipmentInUse.map(el => el.subType))];
            
            const objectCounts = {};
            equipmentInUse.forEach(el => {
                objectCounts[el.subType] = (objectCounts[el.subType] || 0) + 1;
            });

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            state.elements.forEach(el => {
                getElementCorners(el).forEach(p => {
                    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
                });
            });

            if (maxX === -Infinity) {
                showNotification("O projeto está vazio.", 'error'); return;
            }

            const pdf = new jsPDF({ orientation: state.orientation, unit: 'mm', format: 'a4' });
            const pdfWidthMM = pdf.internal.pageSize.getWidth();
            const pdfHeightMM = pdf.internal.pageSize.getHeight();
            const marginMM = 10;
            const projectNameHeightMM = 7;
            const legendTitleHeightMM = objectTypesInUse.length > 0 ? 6 : 0;
            const legendItemHeightMM = 7;
            const legendContentHeightMM = legendTitleHeightMM + (objectTypesInUse.length * legendItemHeightMM);
            const headerPaddingMM = 5;
            const headerHeightMM = projectNameHeightMM + legendContentHeightMM + headerPaddingMM;
            const drawingStartY_MM = marginMM + headerHeightMM;
            const drawingWidthMM = pdfWidthMM - (marginMM * 2);
            const drawingHeightMM = pdfHeightMM - drawingStartY_MM - marginMM;
            
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text(state.projectName, marginMM, marginMM + 5);

            if (objectTypesInUse.length > 0) {
                let legendY = marginMM + projectNameHeightMM + 5;
                pdf.setFontSize(12);
                pdf.setFont('helvetica', 'bold');
                pdf.text("Legenda de Equipamentos:", marginMM, legendY);
                legendY += legendItemHeightMM;
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'normal');
                const iconSizeMM = 6;
                const legendIconCanvas = document.createElement('canvas');
                const legendIconCtx = legendIconCanvas.getContext('2d');
                legendIconCanvas.width = 64; legendIconCanvas.height = 64;
                
                objectTypesInUse.forEach(subType => {
                    const img = images[subType];
                    const count = objectCounts[subType] || 0;
                    const title = `${objectTitles[subType] || subType} (x${count})`;
                    legendIconCtx.clearRect(0, 0, 64, 64);
                    if (img && img.complete) legendIconCtx.drawImage(img, 0, 0, 64, 64);
                    const iconPngDataUrl = legendIconCanvas.toDataURL('image/png');
                    pdf.addImage(iconPngDataUrl, 'PNG', marginMM, legendY, iconSizeMM, iconSizeMM);
                    pdf.text(title, marginMM + iconSizeMM + 2, legendY + iconSizeMM / 2 + 1);
                    legendY += legendItemHeightMM;
                });
            }

            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            const padding = 50;
            const contentWidth = (maxX - minX) + padding * 2;
            const contentHeight = (maxY - minY) + padding * 2;
            
            if (!isFinite(contentWidth) || contentWidth <= 0 || !isFinite(contentHeight) || contentHeight <= 0) {
                showNotification("Conteúdo inválido para exportação.", 'error'); return;
            }

            const highResScale = 3;
            tempCanvas.width = contentWidth * highResScale;
            tempCanvas.height = contentHeight * highResScale;
            
            tempCtx.fillStyle = 'white';
            tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            tempCtx.save();
            tempCtx.scale(highResScale, highResScale);
            tempCtx.translate(-minX + padding, -minY + padding);
            drawScene(tempCtx, state.elements);
            tempCtx.restore();
            
            const imgData = tempCanvas.toDataURL('image/jpeg', 0.95);
            const contentRatio = contentWidth / contentHeight;
            const pdfDrawingRatio = drawingWidthMM / drawingHeightMM;
            let finalImageWidthMM, finalImageHeightMM;

            if (contentRatio > pdfDrawingRatio) {
                finalImageWidthMM = drawingWidthMM;
                finalImageHeightMM = drawingWidthMM / contentRatio;
            } else {
                finalImageHeightMM = drawingHeightMM;
                finalImageWidthMM = drawingHeightMM * contentRatio;
            }
            
            const offsetX_MM = marginMM + (drawingWidthMM - finalImageWidthMM) / 2;
            const offsetY_MM = drawingStartY_MM + (drawingHeightMM - finalImageHeightMM) / 2;

            pdf.addImage(imgData, 'JPEG', offsetX_MM, offsetY_MM, finalImageWidthMM, finalImageHeightMM, undefined, 'FAST');
            pdf.setDrawColor(180, 180, 180);
            pdf.rect(marginMM / 2, marginMM / 2, pdfWidthMM - marginMM, pdfHeightMM - marginMM);
            pdf.save(`${state.projectName}.pdf`);
            showNotification('PDF gerado com sucesso!', 'success');

        } catch(error) {
            console.error("Erro ao gerar PDF:", error);
            showNotification(`Ocorreu um erro ao gerar o PDF.`, 'error');
        } finally {
            state.selectedElementIds = originalIds;
            draw();
        }
    }, 100);
}

function getElementCorners(el) {
    if (el.type === 'wall') {
        return [{x: el.x1, y: el.y1}, {x: el.x2, y: el.y2}];
    }
    if (el.type === 'door' || el.type === 'window') return [];
    
    let { x, y, rotation, width, height } = el;
    if (el.type === 'text') {
        dom.ctx.font = `${el.fontSize}px ${el.fontFamily}`;
        width = dom.ctx.measureText(el.text).width;
        height = el.fontSize;
    }
    const cx = x + width / 2;
    const cy = y + height / 2;
    const angle = rotation * Math.PI / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    const corners = [
        { x: x, y: y }, { x: x + width, y: y },
        { x: x + width, y: y + height }, { x: x, y: y + height }
    ];
    return corners.map(p => ({
        x: (p.x - cx) * cos - (p.y - cy) * sin + cx,
        y: (p.x - cx) * sin + (p.y - cy) * cos + cy
    }));
}