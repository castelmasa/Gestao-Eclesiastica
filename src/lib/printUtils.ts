import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

/**
 * Robust print function that opens the browser's printer selection dialog
 * for the target document element without downloading a PDF file.
 * Must run synchronously inside the user's click gesture to prevent browser blockers.
 */
export const printDocument = (
  onBeforePrint?: () => void,
  onAfterPrint?: () => void,
  targetElementId?: string
): boolean => {
  if (onBeforePrint) {
    try {
      onBeforePrint();
    } catch (e) {
      console.warn("onBeforePrint error:", e);
    }
  }

  try {
    let targetId = targetElementId || 'printable-standard';
    
    // Find target element. If multiple elements share targetId (e.g. main page and modal), prefer the visible one inside a modal or the last one in DOM
    let printableEl: HTMLElement | null = null;
    const elements = Array.from(document.querySelectorAll<HTMLElement>(`#${targetId}`));
    if (elements.length > 0) {
      // Find one that is visible or in dialog
      printableEl = elements.find(el => el.closest('[role="dialog"]') !== null) || elements[elements.length - 1];
    }

    if (!printableEl) {
      printableEl = 
        document.getElementById('printable-standard') ||
        document.getElementById('printable-dynamic') ||
        document.getElementById('printable-ficha-pastoral') ||
        document.getElementById('printable-social-analytic') ||
        document.getElementById('printable-social-simple') ||
        document.getElementById('printable-ficha-membro') ||
        document.getElementById('financial-eco-print-area');
    }

    if (!printableEl) {
      toast.error("Documento para impressão não encontrado na tela.");
      return false;
    }

    const stageId = 'church-active-print-stage';
    let printStage = document.getElementById(stageId);
    if (!printStage) {
      printStage = document.createElement('div');
      printStage.id = stageId;
      document.body.appendChild(printStage);
    }

    // Clone target HTML into print stage so it's immune to parent transforms (zoom/scale) or modal print:hidden
    printStage.innerHTML = printableEl.innerHTML;
    printStage.className = printableEl.className || '';

    // Remove any legacy inner <style> tags that had conflicting visibility rules
    const innerStyles = printStage.querySelectorAll('style');
    innerStyles.forEach(s => s.remove());

    // Inject high-priority print styles so ONLY the staging container prints cleanly on A4 with 100% true scale and centered
    const printStyleId = '__church_print_style_injector__';
    let styleTag = document.getElementById(printStyleId) as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = document.createElement('style');
      styleTag.id = printStyleId;
      document.head.appendChild(styleTag);
    }

    styleTag.textContent = `
      @media print {
        @page {
          size: A4 portrait;
          margin: 0mm !important;
        }
        html, body {
          background: #ffffff !important;
          color: #000000 !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 210mm !important;
          min-height: 297mm !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        /* Oculta tudo na tela com exceção do palco oficial de impressão */
        body > *:not(#${stageId}) {
          display: none !important;
          visibility: hidden !important;
        }
        #${stageId} {
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: flex-start !important;
          visibility: visible !important;
          position: absolute !important;
          left: 0 !important;
          top: 0 !important;
          width: 210mm !important;
          margin: 0 auto !important;
          padding: 0 !important;
          background: #ffffff !important;
          box-shadow: none !important;
          transform: none !important;
          z-index: 99999999 !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #${stageId} * {
          visibility: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        .recibo-page {
          width: 210mm !important;
          height: 297mm !important;
          max-height: 297mm !important;
          min-height: 297mm !important;
          box-sizing: border-box !important;
          margin: 0 auto !important;
          padding: 12mm 10mm !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          align-items: center !important;
          overflow: hidden !important;
          background: #ffffff !important;
        }
        .print-page, .dynamic-page {
          width: 210mm !important;
          height: 297mm !important;
          max-height: 297mm !important;
          min-height: 297mm !important;
          box-sizing: border-box !important;
          margin: 0 auto !important;
          padding: 8mm !important;
          page-break-after: always !important;
          break-after: page !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          align-items: stretch !important;
          overflow: hidden !important;
          background: #ffffff !important;
        }
        .recibo-page:last-child, .print-page:last-child, .dynamic-page:last-child {
          page-break-after: auto !important;
          break-after: auto !important;
        }
      }
    `;

    // Trigger print dialog
    window.focus();
    window.print();

    // Cleanup print stage only after print dialog closes
    const handleAfterPrint = () => {
      setTimeout(() => {
        const stage = document.getElementById(stageId);
        if (stage) {
          stage.innerHTML = '';
        }
      }, 500);
      if (onAfterPrint) {
        onAfterPrint();
      }
    };

    window.addEventListener('afterprint', handleAfterPrint, { once: true });
    
    // Safety fallback: if afterprint doesn't fire, invoke onAfterPrint after a short delay
    setTimeout(() => {
      if (onAfterPrint) {
        onAfterPrint();
      }
    }, 1500);

    return true;
  } catch (err) {
    console.warn("Print call issue:", err);
    try {
      window.focus();
      window.print();
      if (onAfterPrint) setTimeout(onAfterPrint, 500);
      return true;
    } catch (fallbackErr) {
      console.error("Window print error:", fallbackErr);
      toast.error("O navegador não pôde abrir o diálogo de impressão. Tente salvar em PDF.");
      return false;
    }
  }
};

/**
 * Export any HTML element directly to a clean A4 PDF file using html-to-image and jsPDF.
 */
export async function downloadElementAsPdf(elementId: string, fileName: string = 'documento.pdf'): Promise<boolean> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element #${elementId} not found for PDF export.`);
    toast.error("Elemento de impressão não encontrado.");
    return false;
  }

  const toastId = toast.loading("Gerando arquivo PDF de alta definição...");

  // Save current transform/zoom to restore afterwards
  const originalTransform = element.style.transform;
  const originalTransformOrigin = element.style.transformOrigin;
  const originalMarginBottom = element.style.marginBottom;
  const parentEl = element.parentElement;
  const originalParentTransform = parentEl ? parentEl.style.transform : '';

  try {
    element.style.transform = 'none';
    element.style.transformOrigin = 'top center';
    element.style.marginBottom = '0';
    if (parentEl) {
      parentEl.style.transform = 'none';
    }

    // Identify if there are multiple pages (.print-page, .recibo-page, .dynamic-page)
    const pages = element.querySelectorAll('.print-page, .recibo-page, .dynamic-page');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    if (pages.length > 0) {
      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i] as HTMLElement;
        const dataUrl = await toPng(pageEl, {
          quality: 0.98,
          pixelRatio: 2,
          backgroundColor: '#ffffff'
        });
        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }
        pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297);
      }
    } else {
      const dataUrl = await toPng(element, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: '#ffffff'
      });
      pdf.addImage(dataUrl, 'PNG', 0, 0, 210, 297);
    }

    pdf.save(fileName);
    toast.success("PDF baixado com sucesso!", { id: toastId });
    return true;
  } catch (err) {
    console.error("Error generating PDF:", err);
    toast.error("Erro ao gerar PDF. Tente imprimir pelo navegador.", { id: toastId });
    return false;
  } finally {
    element.style.transform = originalTransform;
    element.style.transformOrigin = originalTransformOrigin;
    element.style.marginBottom = originalMarginBottom;
    if (parentEl) {
      parentEl.style.transform = originalParentTransform;
    }
  }
}

