const fs = require('fs');
let code = fs.readFileSync('src/components/layout/Layout.tsx', 'utf8');

// Enhance global layout wrapper
code = code.replace(
  '<main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50">',
  '<main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-50 via-slate-50/80 to-slate-100/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative">'
);

fs.writeFileSync('src/components/layout/Layout.tsx', code);
