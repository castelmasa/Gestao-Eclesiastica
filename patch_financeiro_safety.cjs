const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

code = code.replace(
  'const dbNames = new Set(categories.map(c => c.name.toLowerCase()));',
  'const dbNames = new Set(categories.map(c => (c?.name || "").toLowerCase()));'
);

code = code.replace(
  'const filteredDefaults = defaultCategories.filter(c => !dbNames.has(c.name.toLowerCase()));',
  'const filteredDefaults = defaultCategories.filter(c => !dbNames.has((c?.name || "").toLowerCase()));'
);

code = code.replace(
  'return [...filteredDefaults, ...categories].sort((a, b) => a.name.localeCompare(b.name));',
  'return [...filteredDefaults, ...categories].sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));'
);

fs.writeFileSync('src/pages/Financeiro.tsx', code);
