const fs = require('fs');
let code = fs.readFileSync('src/pages/Configuracoes.tsx', 'utf8');

code = code.replace(
  'import { logAction } from "@/lib/audit"',
  'import { logAction } from "@/lib/audit"\nimport { executeDbOperation } from "@/lib/firebaseHelper"'
);

fs.writeFileSync('src/pages/Configuracoes.tsx', code);
