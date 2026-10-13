const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

const defaultCategories = `
  const defaultCategories = [
    { id: 'def-1', name: 'Dízimo', type: 'entrada' },
    { id: 'def-2', name: 'Oferta', type: 'entrada' },
    { id: 'def-3', name: 'Doação', type: 'entrada' },
    { id: 'def-4', name: 'Água', type: 'saida' },
    { id: 'def-5', name: 'Luz', type: 'saida' },
    { id: 'def-6', name: 'Internet', type: 'saida' },
    { id: 'def-7', name: 'Aluguel', type: 'saida' },
    { id: 'def-8', name: 'Manutenção', type: 'saida' },
    { id: 'def-9', name: 'Missões', type: 'saida' },
    { id: 'def-10', name: 'Ministério Louvor', type: 'saida' },
    { id: 'def-11', name: 'Ministério Infantil', type: 'saida' },
    { id: 'def-12', name: 'Salário/Prebenda', type: 'saida' },
    { id: 'def-13', name: 'Material de Limpeza', type: 'saida' }
  ];

  const availableCategories = useMemo(() => {
    // Merge defaults with DB categories, preferring DB categories if names conflict
    const dbNames = new Set(categories.map(c => c.name.toLowerCase()));
    const filteredDefaults = defaultCategories.filter(c => !dbNames.has(c.name.toLowerCase()));
    return [...filteredDefaults, ...categories].sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);
`;

code = code.replace(
  'const availableCategories = categories;',
  defaultCategories
);

fs.writeFileSync('src/pages/Financeiro.tsx', code);
