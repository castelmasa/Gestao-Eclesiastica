const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Remove the old injected logic first
const startOld = code.indexOf('const handleExportPDF = () => {');
if(startOld !== -1) {
  const endOld = code.indexOf('};', startOld) + 2;
  code = code.substring(0, startOld) + code.substring(endOld);
}

const exportLogic = `
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Relatorio Gerencial - Dashboard", 14, 22);
      
      doc.setFontSize(12);
      doc.text(\`Data de Geracao: \${new Date().toLocaleDateString('pt-BR')} \${new Date().toLocaleTimeString('pt-BR')}\`, 14, 30);
      doc.text(\`Igreja/Filial: \${activeBranch ? activeBranch : 'Todas as Filiais'}\`, 14, 36);

      autoTable(doc, {
        startY: 45,
        head: [['Metrica', 'Valor']],
        body: [
          ['Receitas do Mes', \`R$ \${stats.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`],
          ['Despesas do Mes', \`R$ \${stats.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`],
          ['Saldo do Mes', \`R$ \${stats.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`],
          ['Membros Ativos', filteredMembers.length.toString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
      });
      
      doc.save("relatorio-dashboard.pdf");
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF.");
    }
  };
`;

code = code.replace(
  'if (isLoading) {',
  exportLogic + '\n  if (isLoading) {'
);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
