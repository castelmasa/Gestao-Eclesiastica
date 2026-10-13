const fs = require('fs');
let code = fs.readFileSync('src/pages/Formularios.tsx', 'utf8');

code = code.replace("    </div>\n  )\n}", `      <PrintDebugger 
        isOpen={showPrintDebugger} 
        onClose={() => setShowPrintDebugger(false)} 
        onForcePrint={() => {
           window.open('', '_blank')?.document.write('Pressione Ctrl+P (ou Cmd+P) para imprimir esta página.<br><br>Verifique se os bloqueadores de pop-up estão desativados.');
           toast.info("Tente imprimir usando o atalho de teclado na nova aba.");
        }} 
      />
    </div>
  )
}`);

fs.writeFileSync('src/pages/Formularios.tsx', code);
