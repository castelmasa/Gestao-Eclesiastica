const fs = require('fs');

const content = `export const printDocument = (
  onBeforePrint?: () => void,
  onAfterPrint?: () => void
): boolean => {
  if (onBeforePrint) {
    onBeforePrint();
  }
  
  let success = false;
  
  try {
      const inIframe = window.self !== window.top;

      if (!inIframe) {
          window.print();
          success = true;
      } else {
          // Identify what to print BEFORE opening the window
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

          // SYNCHRONOUS window.open (avoids popup blockers)
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
                      }, 800);
                    };
                  </script>
                </body>
              </html>
            \`;
            printWindow.document.open();
            printWindow.document.write(htmlContent);
            printWindow.document.close();
            success = true;
          } else {
             // Popup was blocked
             success = false;
          }
      }
  } catch(e) {
      console.error(e);
      success = false;
  }
  
  if (onAfterPrint) {
     // Delay closing the modal to allow the print dialog to capture the DOM
     setTimeout(onAfterPrint, 500);
  }
  
  return success;
};
`;
fs.writeFileSync('src/lib/printUtils.ts', content);
