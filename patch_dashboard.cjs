const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// 1. Add imports for PageHeader, jsPDF, jspdf-autotable, toast
if (!code.includes('PageHeader')) {
  code = code.replace(
    'import { Button } from "@/components/ui/button"',
    'import { Button } from "@/components/ui/button"\nimport { PageHeader } from "@/components/layout/PageHeader"\nimport jsPDF from "jspdf"\nimport autoTable from "jspdf-autotable"\nimport { toast } from "sonner"'
  );
}

// 2. Add Export Logic inside Dashboard component
// First find the end of useMemo for stats
const statsSearchStr = 'const stats = useMemo(() => {';
if (code.includes(statsSearchStr)) {
  const insertPos = code.indexOf('return { receitas, despesas, saldo };\n  }, [branchTransactions, currentMonth, currentYear]);');
  const exportCode = `
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Relatorio Gerencial - Dashboard", 14, 22);
      
      doc.setFontSize(12);
      doc.text(\`Data de Geracao: \${new Date().toLocaleDateString('pt-BR')} \${new Date().toLocaleTimeString('pt-BR')}\`, 14, 30);
      doc.text(\`Igreja/Filial: \${activeBranch ? activeBranch.name : 'Todas as Filiais'}\`, 14, 36);

      autoTable(doc, {
        startY: 45,
        head: [['Metrica', 'Valor']],
        body: [
          ['Receitas do Mes', \`R$ \${stats.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`],
          ['Despesas do Mes', \`R$ \${stats.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`],
          ['Saldo do Mes', \`R$ \${stats.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\`],
          ['Membros Ativos', activeBranchMembers.length.toString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
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
    'return { receitas, despesas, saldo };\n  }, [branchTransactions, currentMonth, currentYear]);',
    'return { receitas, despesas, saldo };\n  }, [branchTransactions, currentMonth, currentYear]);\n\n' + exportCode
  );
}

// 3. Replace the header UI with PageHeader
const headerStartStr = '<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">';
const headerEndStr = '<p className="text-muted-foreground mt-1">Bem-vindo ao painel de controle.</p>\n        </div>\n      </div>';
const headerEndFallback = 'Bem-vindo ao painel de controle.</p>\n        </div>\n      </div>';

if (code.includes(headerStartStr)) {
  const startIdx = code.indexOf(headerStartStr);
  const endIdx = code.indexOf('</div>', code.indexOf(headerEndFallback)) + 6;
  
  if (startIdx !== -1 && endIdx !== -1) {
    const newHeader = `
      <PageHeader 
        title="Dashboard" 
        description="Bem-vindo ao painel de controle. Visão geral da sua igreja."
        action={
          <Button onClick={handleExportPDF} className="bg-white/20 hover:bg-white/30 text-white border-none shadow-none">
            Exportar PDF
          </Button>
        }
      />
    `;
    code = code.substring(0, startIdx) + newHeader + code.substring(endIdx);
  }
}

fs.writeFileSync('src/pages/Dashboard.tsx', code);
