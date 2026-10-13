const fs = require('fs');
let code = fs.readFileSync('src/components/layout/Layout.tsx', 'utf8');

if (!code.includes('import { Breadcrumbs }')) {
  code = code.replace(
    'import { Sidebar } from "./Sidebar"',
    'import { Sidebar } from "./Sidebar"\nimport { Breadcrumbs } from "./Breadcrumbs"'
  );
  
  code = code.replace(
    '<Outlet />',
    '<Breadcrumbs />\n            <Outlet />'
  );
  
  fs.writeFileSync('src/components/layout/Layout.tsx', code);
}
