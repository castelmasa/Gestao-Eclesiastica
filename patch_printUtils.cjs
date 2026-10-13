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
          // Identify what to print
          let printableContent = "";
          const dynamicPrint = document.getElementById('printable-dynamic');
          const standardPrint = document.getElementById('printable-standard');
          
          if (dynamicPrint) {
             printableContent = dynamicPrint.outerHTML;
          } else if (standardPrint) {
             printableContent = standardPrint.outerHTML;
          } else {
             // Fallback to whole body if specific IDs not found
             printableContent = document.body.innerHTML;
          }

          const printWindow = window.open('', '_blank');
          if (printWindow) {
            const htmlContent = \`
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Impressão</title>
                  \${document.head.innerHTML}
                  <style>
                    /* Force the printable area to be visible and reset body margins */
                    body { margin: 0; padding: 0; background: white !important; }
                    #printable-dynamic, #printable-standard { 
                       visibility: visible !important; 
                       position: relative !important; 
                       left: 0 !important; 
                       top: 0 !important;
                       width: 100% !important;
                       height: auto !important;
                    }
                    @media print {
                       body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                  </style>
                </head>
                <body class="print-mode bg-white">
                  \${printableContent}
                  <script>
                    window.onload = function() {
                      setTimeout(function() {
                        window.print();
                      }, 500);
                    };
                  </script>
                </body>
              </html>
            \`;
            printWindow.document.open();
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            resolve(true);
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
