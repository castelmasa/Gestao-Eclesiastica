import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import { toast } from 'sonner';

/**
 * Robust print function that opens the browser's printer selection dialog
 * for the target document element without downloading a PDF file.
 * Must run synchronously inside the user's click gesture to prevent browser blockers.
 */
export interface PrintOptions {
  elementId?: string;
  targetElementId?: string;
  onBeforePrint?: () => void;
  onAfterPrint?: () => void;
  title?: string;
  orientation?: 'portrait' | 'landscape';
}

export const printDocument = (
  arg1?: (() => void) | PrintOptions | string,
  onAfterPrint?: () => void,
  targetElementId?: string
): boolean => {
  let beforeCb: (() => void) | undefined;
  let afterCb: (() => void) | undefined = onAfterPrint;
  let explicitTargetId: string | undefined = targetElementId;

  if (typeof arg1 === 'object' && arg1 !== null) {
    explicitTargetId = arg1.elementId || arg1.targetElementId;
    beforeCb = arg1.onBeforePrint;
    if (arg1.onAfterPrint) afterCb = arg1.onAfterPrint;
  } else if (typeof arg1 === 'string') {
    explicitTargetId = arg1;
  } else if (typeof arg1 === 'function') {
    beforeCb = arg1;
  }

  if (beforeCb) {
    try {
      beforeCb();
    } catch (e) {
      console.warn("onBeforePrint error:", e);
    }
  }

  try {
    const isVisible = (el: HTMLElement) => {
      try {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && (rect.width > 0 || el.offsetWidth > 0);
      } catch {
        return false;
      }
    };

    let printableEl: HTMLElement | null = null;

    if (explicitTargetId) {
      printableEl = document.getElementById(explicitTargetId);
      if (!printableEl) {
        const elements = Array.from(document.querySelectorAll<HTMLElement>(`#${explicitTargetId}`));
        printableEl = elements.find(isVisible) || elements[elements.length - 1] || null;
      }
    }

    // Only fallback if no explicit target was requested
    if (!printableEl && !explicitTargetId) {
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
    let nativePrintOpened = false;
    const markPrinted = () => { nativePrintOpened = true; };
    window.addEventListener('beforeprint', markPrinted, { once: true });

    // 1. Try dedicated print iframe (works in many environments where window.print is blocked)
    try {
      const iframeId = '__church_hidden_print_frame__';
      let pIframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
      if (!pIframe) {
        pIframe = document.createElement('iframe');
        pIframe.id = iframeId;
        pIframe.setAttribute('style', 'position:fixed; top:-9999px; left:-9999px; width:210mm; height:297mm; border:0; opacity:0; pointer-events:none;');
        document.body.appendChild(pIframe);
      }
      
      const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(el => el.outerHTML)
        .join('\n');

      const iDoc = pIframe.contentDocument || pIframe.contentWindow?.document;
      if (iDoc) {
        iDoc.open();
        iDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Impressão Oficial</title>
              ${headStyles}
              <style>
                @page { size: A4 portrait; margin: 0mm !important; }
                html, body {
                  background: #ffffff !important;
                  color: #000000 !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  width: 210mm !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .recibo-page, .print-page, .dynamic-page {
                  margin: 0 auto !important;
                  box-shadow: none !important;
                }
              </style>
            </head>
            <body>
              ${printableEl.outerHTML}
            </body>
          </html>
        `);
        iDoc.close();
        pIframe.contentWindow?.focus();
        pIframe.contentWindow?.print();
      }
    } catch (e) {
      console.warn("Iframe print attempt warning:", e);
    }

    // 2. Also trigger main window print
    try {
      window.focus();
      window.print();
    } catch (printErr) {
      console.warn("window.print bloqueado ou indisponível:", printErr);
    }

    // 3. Fallback: If inside an iframe sandbox or if beforeprint didn't trigger, guarantee user receives printable PDF
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;
    setTimeout(() => {
      window.removeEventListener('beforeprint', markPrinted);
      if (!nativePrintOpened && isIframe) {
        toast.info("Documento oficial preparado! Abrindo para sua impressora ou download...", { id: "print-toast-fallback" });
        const targetElement = printableEl || (explicitTargetId ? document.getElementById(explicitTargetId) : null);
        if (targetElement) {
          downloadElementAsPdf(targetElement, `formulario-${new Date().toISOString().slice(0, 10)}.pdf`);
        }
      }
    }, 450);

    if (onAfterPrint) {
      window.addEventListener('afterprint', () => onAfterPrint(), { once: true });
    }

    return true;
  } catch (err) {
    console.warn("Print call issue:", err);
    try {
      const targetId = targetElementId || 'printable-standard';
      downloadElementAsPdf(targetId, `formulario-${new Date().toISOString().slice(0, 10)}.pdf`);
      if (onAfterPrint) onAfterPrint();
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
 * Accepts either an element ID (string) or an HTMLElement directly.
 */
export async function downloadElementAsPdf(
  target: string | HTMLElement, 
  fileName: string = 'documento.pdf'
): Promise<boolean> {
  let element: HTMLElement | null = null;

  if (typeof target === 'string') {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(`#${target}`));
    const isVisible = (el: HTMLElement) => {
      try {
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && (rect.width > 0 || el.offsetWidth > 0);
      } catch {
        return false;
      }
    };

    if (elements.length > 0) {
      element = elements.find(isVisible) || elements[elements.length - 1];
    }

    if (!element) {
      element = 
        document.getElementById('printable-standard') ||
        document.getElementById('printable-dynamic') ||
        document.getElementById('printable-ficha-pastoral') ||
        document.getElementById('church-active-print-stage');
    }
  } else {
    element = target;
  }

  if (!element) {
    console.error("Element not found for PDF export.");
    toast.error("Elemento de impressão não encontrado na tela.");
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

