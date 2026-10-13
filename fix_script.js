const fs = require('fs');
let file = fs.readFileSync('src/pages/Secretaria.tsx', 'utf8');

// The signatures part starts around line 430:
file = file.replace(/\/\/ Signatures\n        \n        \n        let sigY = currentY \+ 53;/, '// Signatures\n        doc.setDrawColor(100)\n        doc.setLineWidth(0.1)\n        \n        let sigY = currentY + 53;');

fs.writeFileSync('src/pages/Secretaria.tsx', file);
