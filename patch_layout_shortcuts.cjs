const fs = require('fs');
let code = fs.readFileSync('src/components/layout/Layout.tsx', 'utf8');

code = code.replace(
  "// Ctrl+N or Cmd+N for new record",
  `// Ctrl+S or Cmd+S for save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        window.dispatchEvent(new Event('app:save-record'));
      }
      
      // Ctrl+N or Cmd+N for new record`
);

fs.writeFileSync('src/components/layout/Layout.tsx', code);
