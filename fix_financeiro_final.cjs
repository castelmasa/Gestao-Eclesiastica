const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

// Fix churchData properties
code = code.replace(
  'const churchData = { \n    name: "Igreja Local", \n    address: "Rua Principal, 123", \n    phone: "(00) 0000-0000", \n    logo: "" \n  };',
  'const churchData = { \n    nome: "Igreja Local", \n    endereco: "Rua Principal, 123", \n    cidade: "São Paulo", \n    cnpj: "00.000.000/0001-00", \n    phone: "(00) 0000-0000", \n    logoDataUrl: "" \n  };'
);

// We need to fix the TS errors for generateFilteredListPDF / generateFechamentoPDF
code = code.replace(/const generatePDF = \(\) => toast\.info\("Gerando PDF\.\.\."\);/g, 'const generatePDF = (e?: any) => toast.info("Gerando PDF...");');
code = code.replace(/const generateFilteredListPDF = \(\) => toast\.info\("Gerando PDF da lista\.\.\."\);/g, 'const generateFilteredListPDF = (e?: any) => toast.info("Gerando PDF da lista...");');
code = code.replace(/const generateFechamentoPDF = \(\) => toast\.info\("Gerando Fechamento\.\.\."\);/g, 'const generateFechamentoPDF = (e?: any) => toast.info("Gerando Fechamento...");');

// Fix the file import handler
code = code.replace(/onChange=\{handleImportFile\}/g, 'onChange={(e) => { if (e.target.files?.[0]) handleImportFile(e.target.files[0]); }}');

// Fix the Add category handler
code = code.replace(/handleAddCategoryFromManager\(\)/g, 'handleAddCategoryFromManager("entrada")');
code = code.replace(/onClick=\{handleAddCategoryFromManager\}/g, 'onClick={() => handleAddCategoryFromManager("entrada")}');

// Fix the transaction type handler
code = code.replace(/onValueChange=\{setTransactionType\}/g, 'onValueChange={(val) => setTransactionType(val as "entrada" | "saida")}');

fs.writeFileSync('src/pages/Financeiro.tsx', code);
