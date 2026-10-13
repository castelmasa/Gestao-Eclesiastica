const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

code = code.replace("    </motion.div>\n  )\n}", `      <PrintDebugger 
        isOpen={showPrintDebugger} 
        onClose={() => setShowPrintDebugger(false)} 
        onForcePrint={() => {
           window.open('', '_blank')?.document.write('Pressione Ctrl+P (ou Cmd+P) para imprimir esta página.<br><br>Verifique se os bloqueadores de pop-up estão desativados.');
           toast.info("Tente imprimir usando o atalho de teclado na nova aba.");
        }} 
      />
    </motion.div>
  )
}`);

fs.writeFileSync('src/pages/Financeiro.tsx', code);
