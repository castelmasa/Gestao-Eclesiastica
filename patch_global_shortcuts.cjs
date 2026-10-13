const fs = require('fs');
let code = fs.readFileSync('src/components/GlobalShortcuts.tsx', 'utf8');

const additionalShortcuts = `
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Salvar (em modais)</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘/Ctrl</span>S
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fechar / Cancelar</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">Esc</span>
              </kbd>
            </div>
`;

code = code.replace(
  '<div className="flex items-center justify-between">\n              <span className="text-sm font-medium">Ver Atalhos</span>',
  additionalShortcuts + '\n            <div className="flex items-center justify-between">\n              <span className="text-sm font-medium">Ver Atalhos</span>'
);

fs.writeFileSync('src/components/GlobalShortcuts.tsx', code);
