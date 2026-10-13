const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

code = code.replace(
  'supplier: transactionType === \'saida\' ? formData.get("supplier") as string : undefined,',
  'supplier: transactionType === \'saida\' ? (formData.get("supplier") as string || "") : "",'
);
code = code.replace(
  'documentCpfCnpj: transactionType === \'saida\' ? formData.get("documentCpfCnpj") as string : undefined,',
  'documentCpfCnpj: transactionType === \'saida\' ? (formData.get("documentCpfCnpj") as string || "") : "",'
);
code = code.replace(
  'costCenter: transactionType === \'saida\' ? formData.get("costCenter") as string : undefined',
  'costCenter: transactionType === \'saida\' ? (formData.get("costCenter") as string || "") : ""'
);

// Also check for supplierId or paymentMethod?
code = code.replace(
  'txData.memberId = formData.get("memberId") as string;',
  'txData.memberId = formData.get("memberId") as string || "";'
);
code = code.replace(
  'txData.paymentMethod = formData.get("paymentMethod") as string;',
  'txData.paymentMethod = formData.get("paymentMethod") as string || "";'
);

fs.writeFileSync('src/pages/Financeiro.tsx', code);
