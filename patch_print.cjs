const fs = require('fs');
const content = `export const printDocument = async (
  onBeforePrint?: () => void | Promise<void>,
  onAfterPrint?: () => void,
  delayMs = 500
): Promise<boolean> => {
  if (onBeforePrint) {
    await onBeforePrint();
  }
  return new Promise((resolve) => {
    setTimeout(() => {
      let printed = false;
      
      const inIframe = window.self !== window.top;

      if (!inIframe) {
        try {
          window.print();
          printed = true;
        } catch (e) {
          console.error("Print blocked, using fallback window...");
        }
      }

      if (!printed) {
        try {
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write('<!DOCTYPE html><html><head>' + document.head.innerHTML + '</head><body class="print-mode">' + document.body.innerHTML + '</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
              try {
                printWindow.print();
              } catch(err) {
                 console.error("Popup print failed too", err);
              }
              resolve(true);
            }, 500);
          } else {
             // Popup blocked
             resolve(false);
          }
        } catch(fallbackErr) {
            console.error("Fallback failed", fallbackErr);
            resolve(false);
        }
      } else {
         resolve(true);
      }
      
      if (onAfterPrint) setTimeout(onAfterPrint, 1000);
    }, delayMs);
  });
};
`;
fs.writeFileSync('src/lib/printUtils.ts', content);
