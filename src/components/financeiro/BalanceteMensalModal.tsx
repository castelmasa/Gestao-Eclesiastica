import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Printer,
  Download,
  Calendar,
  Eye,
  EyeOff,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { printDocument } from "@/lib/printUtils";
import {
  getRegisteredChurchLogo,
  drawSafeChurchReportHeader,
} from "@/lib/churchLogoHelper";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  type: string;
  amount: number;
  costCenter?: string;
  branchId?: string;
}

interface BalanceteMensalModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  churchName?: string;
  activeBranchName?: string;
}

const MONTHS = [
  { value: "0", label: "Janeiro" },
  { value: "1", label: "Fevereiro" },
  { value: "2", label: "Março" },
  { value: "3", label: "Abril" },
  { value: "4", label: "Maio" },
  { value: "5", label: "Junho" },
  { value: "6", label: "Julho" },
  { value: "7", label: "Agosto" },
  { value: "8", label: "Setembro" },
  { value: "9", label: "Outubro" },
  { value: "10", label: "Novembro" },
  { value: "11", label: "Dezembro" },
];

export function BalanceteMensalModal({
  isOpen,
  onClose,
  transactions,
  churchName = "Igreja Evangélica Pentecostal O Brasil para Cristo",
  activeBranchName = "Templo Sede"
}: BalanceteMensalModalProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth()));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentDate.getFullYear()));
  const [reportModel, setReportModel] = useState<"assembleia" | "sintetico" | "analitico">("assembleia");
  const [showSignatures, setShowSignatures] = useState(true);

  // Church config e logo
  const [churchConfig, setChurchConfig] = useState<any>(() => {
    try {
      const activeBranch = localStorage.getItem("activeBranch");
      if (activeBranch && activeBranch !== "all" && activeBranch !== "sede") {
        const branchSaved = localStorage.getItem(`churchConfig_${activeBranch}`);
        if (branchSaved) return JSON.parse(branchSaved);
      }
      const globalSaved = localStorage.getItem("churchConfig");
      if (globalSaved) return JSON.parse(globalSaved);
    } catch {}
    return {
      nome: churchName,
      endereco: "Rua Bartolomeu Bueno, Nº 629 - Santa Casa",
      cidade: "Valparaíso - SP",
      cnpj: "51.105.484/0001-74",
      pastorTitular: "Pr. Samuel de Oliveira",
      tesoureiro1: "Carlos Roberto"
    };
  });

  const [churchLogo, setChurchLogo] = useState<string | null>(null);

  useEffect(() => {
    const updateLogo = () => {
      const logo = getRegisteredChurchLogo();
      setChurchLogo(logo);
      try {
        const globalSaved = localStorage.getItem("churchConfig");
        if (globalSaved) setChurchConfig(JSON.parse(globalSaved));
      } catch {}
    };
    updateLogo();
    window.addEventListener("churchConfigUpdated", updateLogo);
    window.addEventListener("storage", updateLogo);
    return () => {
      window.removeEventListener("churchConfigUpdated", updateLogo);
      window.removeEventListener("storage", updateLogo);
    };
  }, [isOpen]);

  const pastorName = churchConfig?.pastorTitular || localStorage.getItem("pastor_name") || "Pr. Responsável";
  const tesoureiroName = churchConfig?.tesoureiro1 || localStorage.getItem("tesoureiro_name") || "1º Tesoureiro";

  // Financial calculations
  const balanceteData = useMemo(() => {
    const month = parseInt(selectedMonth, 10);
    const year = parseInt(selectedYear, 10);

    const startOfPeriod = new Date(year, month, 1, 0, 0, 0);
    const endOfPeriod = new Date(year, month + 1, 0, 23, 59, 59);

    let saldoAnterior = 0;
    const entradasPorCategoria: Record<string, { total: number; count: number }> = {};
    const saidasPorCategoria: Record<string, { total: number; count: number }> = {};

    let totalEntradas = 0;
    let totalSaidas = 0;

    transactions.forEach(t => {
      if (!t.date) return;
      const tDate = new Date(t.date);
      if (isNaN(tDate.getTime())) return;

      const amt = Number(t.amount) || 0;
      const isIncome = t.type === "entrada" || t.type === "income";
      const isExpense = t.type === "saida" || t.type === "expense";

      if (tDate < startOfPeriod) {
        if (isIncome) saldoAnterior += amt;
        if (isExpense) saldoAnterior -= amt;
      } else if (tDate <= endOfPeriod) {
        const cat = (t.category || "Outros").trim();
        if (isIncome) {
          if (!entradasPorCategoria[cat]) entradasPorCategoria[cat] = { total: 0, count: 0 };
          entradasPorCategoria[cat].total += amt;
          entradasPorCategoria[cat].count += 1;
          totalEntradas += amt;
        } else if (isExpense) {
          if (!saidasPorCategoria[cat]) saidasPorCategoria[cat] = { total: 0, count: 0 };
          saidasPorCategoria[cat].total += amt;
          saidasPorCategoria[cat].count += 1;
          totalSaidas += amt;
        }
      }
    });

    const saldoAtual = saldoAnterior + totalEntradas - totalSaidas;
    const superavit = totalEntradas - totalSaidas;

    const entradasOrdenadas = Object.entries(entradasPorCategoria)
      .map(([cat, data]) => ({
        category: cat,
        total: data.total,
        count: data.count,
        pct: totalEntradas > 0 ? (data.total / totalEntradas) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);

    const saidasOrdenadas = Object.entries(saidasPorCategoria)
      .map(([cat, data]) => ({
        category: cat,
        total: data.total,
        count: data.count,
        pct: totalSaidas > 0 ? (data.total / totalSaidas) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total);

    return {
      saldoAnterior,
      entradasOrdenadas,
      saidasOrdenadas,
      totalEntradas,
      totalSaidas,
      superavit,
      saldoAtual,
    };
  }, [transactions, selectedMonth, selectedYear]);

  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || "Mês";
  const displayChurchName = (churchConfig?.nome || churchName || "IGREJA O BRASIL PARA CRISTO").toUpperCase();
  const displayAddress = (churchConfig?.endereco || "RUA BARTOLOMEU BUENO, Nº 629 - SANTA CASA").toUpperCase();
  const displayCity = (churchConfig?.cidade || "VALPARAÍSO - SP").toUpperCase();
  const displayCnpj = churchConfig?.cnpj || "51.105.484/0001-74";

  const formatCurrency = (val: number) => {
    return val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handlePrint = () => {
    toast.info("Processando impressão do Balancete para Assembleia...");
    try {
      printDocument(undefined, undefined, "balancete-assembleia-print-area");
    } catch {
      window.print();
    }
  };

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const headerRes = drawSafeChurchReportHeader(doc, {
        title: "BALANCETE FINANCEIRO PARA ASSEMBLEIA GERAL ORDINÁRIA",
        subtitle: `Mês de Apuração: ${monthLabel.toUpperCase()} / ${selectedYear} | Unidade: ${activeBranchName} | Emissão: ${new Date().toLocaleDateString("pt-BR")}`,
        churchData: churchConfig,
        activeBranchName: activeBranchName,
        leftMargin: 14,
        rightMargin: 14,
        topY: 10
      });

      let currentY = headerRes.nextY;

      // Resumo sintético em tabela no topo
      autoTable(doc, {
        startY: currentY,
        head: [["Saldo Anterior", "Total Entradas (Receitas)", "Total Saídas (Despesas)", "Saldo Atual em Caixa"]],
        body: [[
          `R$ ${formatCurrency(balanceteData.saldoAnterior)}`,
          `R$ ${formatCurrency(balanceteData.totalEntradas)}`,
          `R$ ${formatCurrency(balanceteData.totalSaidas)}`,
          `R$ ${formatCurrency(balanceteData.saldoAtual)}`
        ]],
        theme: "grid",
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5, halign: "center" },
        styles: { fontSize: 9, fontStyle: "bold", halign: "center", cellPadding: 2.5 },
      });

      currentY = (doc as any).lastAutoTable?.finalY + 6;

      // Entradas
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("1. DEMONSTRATIVO DE RECEITAS (ENTRADAS):", 14, currentY);

      autoTable(doc, {
        startY: currentY + 2,
        head: [["Categoria de Receita", "Qtd", "Participação (%)", "Valor Arrecadado (R$)"]],
        body: balanceteData.entradasOrdenadas.length > 0
          ? [
              ...balanceteData.entradasOrdenadas.map(e => [
                e.category,
                String(e.count),
                `${e.pct.toFixed(1)}%`,
                `R$ ${formatCurrency(e.total)}`
              ]),
              ["TOTAL GERAL DE RECEITAS", "-", "100.0%", `R$ ${formatCurrency(balanceteData.totalEntradas)}`]
            ]
          : [["Nenhuma receita registrada neste período", "-", "-", "R$ 0,00"]],
        theme: "grid",
        headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { halign: "center", cellWidth: 15 },
          2: { halign: "center", cellWidth: 30 },
          3: { halign: "right", fontStyle: "bold", cellWidth: 45 }
        }
      });

      currentY = (doc as any).lastAutoTable?.finalY + 6;

      // Saídas
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.text("2. DEMONSTRATIVO DE DESPESAS (SAÍDAS):", 14, currentY);

      autoTable(doc, {
        startY: currentY + 2,
        head: [["Categoria de Despesa", "Qtd", "Participação (%)", "Valor Pago (R$)"]],
        body: balanceteData.saidasOrdenadas.length > 0
          ? [
              ...balanceteData.saidasOrdenadas.map(s => [
                s.category,
                String(s.count),
                `${s.pct.toFixed(1)}%`,
                `R$ ${formatCurrency(s.total)}`
              ]),
              ["TOTAL GERAL DE DESPESAS", "-", "100.0%", `R$ ${formatCurrency(balanceteData.totalSaidas)}`]
            ]
          : [["Nenhuma despesa registrada neste período", "-", "-", "R$ 0,00"]],
        theme: "grid",
        headStyles: { fillColor: [60, 60, 60], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 90 },
          1: { halign: "center", cellWidth: 15 },
          2: { halign: "center", cellWidth: 30 },
          3: { halign: "right", fontStyle: "bold", cellWidth: 45 }
        }
      });

      currentY = (doc as any).lastAutoTable?.finalY + 6;

      // Conciliação
      autoTable(doc, {
        startY: currentY,
        head: [["CONCILIAÇÃO CONTÁBIL E FECHAMENTO DO EXERCÍCIO", "VALOR (R$)"]],
        body: [
          ["(+) Saldo Anterior Transportado em Caixa e Bancos", `R$ ${formatCurrency(balanceteData.saldoAnterior)}`],
          ["(+) Total de Receitas Arrecadadas no Período", `R$ ${formatCurrency(balanceteData.totalEntradas)}`],
          ["(-) Total de Despesas e Pagamentos Efetuados", `R$ ${formatCurrency(balanceteData.totalSaidas)}`],
          ["(=) Resultado Operacional do Exercício (Superávit/Déficit)", `R$ ${formatCurrency(balanceteData.superavit)}`],
          ["(=) SALDO ATUAL DISPONÍVEL (CAIXA / CONTAS BANCÁRIAS)", `R$ ${formatCurrency(balanceteData.saldoAtual)}`]
        ],
        theme: "grid",
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 135 },
          1: { halign: "right", fontStyle: "bold", cellWidth: 45 }
        }
      });

      currentY = (doc as any).lastAutoTable?.finalY + 6;

      // Parecer Conselho Fiscal
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("PARECER DA COMISSÃO DE EXAME DE CONTAS / CONSELHO FISCAL:", 14, currentY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      const parecer = `A Comissão de Exame de Contas da ${displayChurchName}, no cumprimento de suas atribuições estatutárias, examinou detidamente os lançamentos contábeis, notas fiscais, recibos e extratos bancários referentes ao mês de ${monthLabel} de ${selectedYear}, constatando a regularidade e conformidade de todas as contas, opinando pela sua APROVAÇÃO INTEGRAL SEM RESSALVAS pela Assembleia Geral dos Membros.`;
      doc.text(doc.splitTextToSize(parecer, 180), 14, currentY + 4);

      // Assinaturas
      if (showSignatures) {
        const sigY = 265;
        doc.setLineWidth(0.2);
        doc.line(20, sigY, 90, sigY);
        doc.line(120, sigY, 190, sigY);

        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.text(pastorName, 55, sigY + 3.5, { align: "center" });
        doc.text(tesoureiroName, 155, sigY + 3.5, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(6.5);
        doc.text("Pastor Titular / Presidente", 55, sigY + 7, { align: "center" });
        doc.text("1º Tesoureiro Geral", 155, sigY + 7, { align: "center" });
      }

      doc.save(`Balancete_Assembleia_${monthLabel}_${selectedYear}.pdf`);
      toast.success("Balancete para Assembleia baixado em PDF com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF do Balancete.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[98vw] max-w-5xl max-h-[96vh] flex flex-col p-0 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* Header de Configuração do Modal */}
        <DialogHeader className="!m-0 !mx-0 !mt-0 !mb-0 p-4 sm:p-5 pb-3 border-b border-border bg-muted/20 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Balancete Financeiro para Assembleia Geral
              </DialogTitle>
              <DialogDescription className="text-xs">
                Relatório oficial de prestação de contas timbrado no padrão dos demais relatórios da igreja.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                className="h-8 text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-slate-700" />
                Baixar PDF
              </Button>
              <Button
                size="sm"
                onClick={handlePrint}
                className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Imprimir Balancete (A4)
              </Button>
            </div>
          </div>

          {/* Barra de Filtros e Opções de Formatação */}
          <div className="flex flex-wrap items-center gap-3 pt-3 text-xs border-t border-border/60 mt-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="text-xs font-semibold">Mês:</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[125px] h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={m.value} className="text-xs">
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <Label className="text-xs font-semibold">Ano:</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[90px] h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["2024", "2025", "2026", "2027"].map(y => (
                    <SelectItem key={y} value={y} className="text-xs">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5">
              <Label className="text-xs font-semibold">Formato:</Label>
              <Select value={reportModel} onValueChange={(v: any) => setReportModel(v)}>
                <SelectTrigger className="w-[160px] h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="assembleia">Assembleia Oficial</SelectItem>
                  <SelectItem value="sintetico">Sintético (1 Página)</SelectItem>
                  <SelectItem value="analitico">Analítico Detalhado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-slate-700 dark:text-slate-300 ml-auto"
              onClick={() => setShowSignatures(!showSignatures)}
            >
              {showSignatures ? <Eye className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
              {showSignatures ? "Assinaturas Ativas" : "Sem Assinaturas"}
            </Button>
          </div>
        </DialogHeader>

        {/* Canvas de Impressão Papel A4 Padrão (Exata mesma formatação dos demais relatórios da igreja) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200 dark:bg-slate-900/50 flex justify-center">
          <div
            id="balancete-assembleia-print-area"
            className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black p-[10mm_14mm] shadow-lg print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none text-xs leading-normal font-sans"
            style={{ color: "#000", backgroundColor: "#fff" }}
          >
            {/* Header Oficial da Igreja (Idêntico ao FinancialEcoPrintModal e demais relatórios) */}
            <div className="border-b-2 border-black pb-2 mb-3">
              <div className="flex items-center justify-between gap-4">
                {churchLogo ? (
                  <img
                    src={churchLogo}
                    alt="Logo da Igreja"
                    className="h-16 max-w-[45mm] object-contain shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 border border-dashed border-gray-400 flex items-center justify-center text-[9px] font-bold text-gray-400 shrink-0">
                    LOGO
                  </div>
                )}

                <div className="flex-1 text-center min-w-0 px-2">
                  <h1 className="font-extrabold text-[13px] sm:text-[14px] tracking-tight uppercase leading-snug break-words max-w-[140mm] mx-auto">
                    {displayChurchName}
                  </h1>
                  <p className="text-[9.5px] font-bold tracking-tight uppercase mt-0.5 break-words max-w-[140mm] mx-auto">
                    {displayAddress} - {displayCity} {displayCnpj ? `| CNPJ: ${displayCnpj}` : ""}
                  </p>
                  <div className="mt-1.5 inline-block border border-black px-4 py-0.5 font-bold uppercase text-[10.5px] bg-gray-100 print:bg-transparent">
                    BALANCETE FINANCEIRO PARA ASSEMBLEIA GERAL ORDINÁRIA
                  </div>
                </div>

                {churchLogo ? (
                  <img
                    src={churchLogo}
                    alt=""
                    className="h-16 max-w-[45mm] object-contain shrink-0 opacity-0 pointer-events-none"
                    aria-hidden="true"
                  />
                ) : (
                  <div className="w-14 h-14 opacity-0 shrink-0 pointer-events-none" aria-hidden="true" />
                )}
              </div>
            </div>

            {/* Metadados Oficiais do Relatório */}
            <div className="flex justify-between items-center border border-black p-1.5 mb-3 bg-gray-50 print:bg-transparent text-[9.5px]">
              <div>
                <span className="font-bold">Mês de Apuração: </span>
                <span className="font-semibold uppercase">{monthLabel} / {selectedYear}</span>
              </div>
              <div>
                <span className="font-bold">Congregação / Unidade: </span>
                <span className="font-semibold">{activeBranchName}</span>
              </div>
              <div>
                <span className="font-bold">Emissão Oficial: </span>
                <span>{new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>

            {/* Quadro Resumo Sintético em 4 Colunas com Bordas Pretas */}
            <div className="grid grid-cols-4 gap-2 border border-black p-2 mb-3 text-center">
              <div className="border-r border-black pr-2">
                <div className="text-[8.5px] uppercase font-bold text-gray-700">Saldo Anterior</div>
                <div className="text-[12.5px] font-black mt-0.5">
                  R$ {formatCurrency(balanceteData.saldoAnterior)}
                </div>
              </div>
              <div className="border-r border-black pr-2">
                <div className="text-[8.5px] uppercase font-bold text-gray-700">Total de Entradas</div>
                <div className="text-[12.5px] font-black mt-0.5">
                  R$ {formatCurrency(balanceteData.totalEntradas)}
                </div>
              </div>
              <div className="border-r border-black pr-2">
                <div className="text-[8.5px] uppercase font-bold text-gray-700">Total de Saídas</div>
                <div className="text-[12.5px] font-black mt-0.5">
                  R$ {formatCurrency(balanceteData.totalSaidas)}
                </div>
              </div>
              <div>
                <div className="text-[8.5px] uppercase font-bold text-gray-700">Saldo Atual em Caixa</div>
                <div className="text-[12.5px] font-black mt-0.5">
                  R$ {formatCurrency(balanceteData.saldoAtual)}
                </div>
              </div>
            </div>

            {/* Tabelas de Entradas e Saídas Lado a Lado ou em Seções Estruturadas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {/* 1. Demonstração de Entradas / Receitas */}
              <div className="border border-black">
                <div className="bg-black text-white px-2 py-1 font-bold text-[9.5px] uppercase tracking-wide flex justify-between">
                  <span>1. RECEITAS ARRECADADAS (ENTRADAS)</span>
                  <span>R$ {formatCurrency(balanceteData.totalEntradas)}</span>
                </div>
                <table className="w-full text-[9px] border-collapse">
                  <thead>
                    <tr className="border-b border-black bg-gray-100 font-bold">
                      <th className="text-left p-1">Origem / Categoria</th>
                      <th className="text-center p-1 w-10">Qtd</th>
                      <th className="text-center p-1 w-14">Part. (%)</th>
                      <th className="text-right p-1 w-24">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceteData.entradasOrdenadas.length > 0 ? (
                      balanceteData.entradasOrdenadas.map((e, idx) => (
                        <tr key={idx} className="border-b border-gray-300">
                          <td className="p-1 font-medium">{e.category}</td>
                          <td className="p-1 text-center text-gray-600">{e.count}</td>
                          <td className="p-1 text-center font-medium">{e.pct.toFixed(1)}%</td>
                          <td className="p-1 text-right font-bold">R$ {formatCurrency(e.total)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-2 text-center text-gray-500 italic">
                          Nenhuma receita registrada neste período.
                        </td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-black font-black bg-gray-50">
                      <td colSpan={2} className="p-1 uppercase">TOTAL DE ENTRADAS</td>
                      <td className="p-1 text-center">100%</td>
                      <td className="p-1 text-right">R$ {formatCurrency(balanceteData.totalEntradas)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 2. Demonstração de Saídas / Despesas */}
              <div className="border border-black">
                <div className="bg-black text-white px-2 py-1 font-bold text-[9.5px] uppercase tracking-wide flex justify-between">
                  <span>2. DESPESAS REALIZADAS (SAÍDAS)</span>
                  <span>R$ {formatCurrency(balanceteData.totalSaidas)}</span>
                </div>
                <table className="w-full text-[9px] border-collapse">
                  <thead>
                    <tr className="border-b border-black bg-gray-100 font-bold">
                      <th className="text-left p-1">Destinação / Categoria</th>
                      <th className="text-center p-1 w-10">Qtd</th>
                      <th className="text-center p-1 w-14">Part. (%)</th>
                      <th className="text-right p-1 w-24">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balanceteData.saidasOrdenadas.length > 0 ? (
                      balanceteData.saidasOrdenadas.map((s, idx) => (
                        <tr key={idx} className="border-b border-gray-300">
                          <td className="p-1 font-medium">{s.category}</td>
                          <td className="p-1 text-center text-gray-600">{s.count}</td>
                          <td className="p-1 text-center font-medium">{s.pct.toFixed(1)}%</td>
                          <td className="p-1 text-right font-bold">R$ {formatCurrency(s.total)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="p-2 text-center text-gray-500 italic">
                          Nenhuma despesa registrada neste período.
                        </td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-black font-black bg-gray-50">
                      <td colSpan={2} className="p-1 uppercase">TOTAL DE SAÍDAS</td>
                      <td className="p-1 text-center">100%</td>
                      <td className="p-1 text-right">R$ {formatCurrency(balanceteData.totalSaidas)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Quadro de Conciliação e Fechamento Contábil */}
            <div className="border border-black mb-3">
              <div className="bg-gray-200 border-b border-black px-2 py-1 font-bold text-[9.5px] uppercase">
                3. DEMONSTRATIVO DE CONCILIAÇÃO CONTÁBIL E FECHAMENTO DO EXERCÍCIO
              </div>
              <div className="grid grid-cols-2 text-[9px] p-2 gap-x-6 gap-y-1">
                <div className="flex justify-between border-b border-gray-300 py-0.5">
                  <span>(+) Saldo Transportado em Caixa e Bancos:</span>
                  <span className="font-bold">R$ {formatCurrency(balanceteData.saldoAnterior)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-300 py-0.5">
                  <span>(+) Total Geral de Receitas Arrecadadas:</span>
                  <span className="font-bold">R$ {formatCurrency(balanceteData.totalEntradas)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-300 py-0.5">
                  <span>(-) Total Geral de Despesas e Pagamentos:</span>
                  <span className="font-bold">R$ {formatCurrency(balanceteData.totalSaidas)}</span>
                </div>
                <div className="flex justify-between border-b border-gray-300 py-0.5">
                  <span>(=) Resultado do Exercício (Superávit/Déficit):</span>
                  <span className={`font-black ${balanceteData.superavit >= 0 ? "text-black" : "text-red-700"}`}>
                    R$ {formatCurrency(balanceteData.superavit)}
                  </span>
                </div>
              </div>
              <div className="bg-gray-100 border-t border-black px-2 py-1.5 flex justify-between items-center text-[10px] font-black">
                <span>(=) SALDO ATUAL DISPONÍVEL (CAIXA / CONTAS BANCÁRIAS):</span>
                <span>R$ {formatCurrency(balanceteData.saldoAtual)}</span>
              </div>
            </div>

            {/* 4. Parecer Formal da Comissão de Exame de Contas / Conselho Fiscal */}
            <div className="border border-black p-2 mb-3 bg-white text-[8.5px] leading-relaxed">
              <div className="font-bold uppercase mb-1">
                4. PARECER DA COMISSÃO DE EXAME DE CONTAS / CONSELHO FISCAL:
              </div>
              <p className="text-justify">
                A Comissão de Exame de Contas e Conselho Fiscal da <strong>{displayChurchName}</strong>, no cumprimento rigoroso de suas atribuições estatutárias e regimentais, procedeu ao exame minucioso de toda a documentação, livros-caixa, comprovantes de depósitos bancários, recibos e notas fiscais referentes ao mês de <strong>{monthLabel} de {selectedYear}</strong>, constatando a exatidão, lisura e conformidade dos lançamentos apresentados pela Tesouraria Geral, emitindo parecer favorável pela sua <strong>APROVAÇÃO INTEGRAL SEM QUAISQUER RESSALVAS</strong> pela soberana Assembleia Geral Ordinária.
              </p>
            </div>

            {/* 5. Linhas Oficiais de Assinatura (Pastor, Tesoureiro e Conselho Fiscal) Ampliadas */}
            {showSignatures && (
              <div className="pt-3">
                <div className="grid grid-cols-2 gap-6 text-center text-[9px] mb-4">
                  <div className="flex flex-col items-center justify-end min-h-[64px]">
                    {churchConfig?.pastorTitularSignatureUrl && (
                      <img 
                        src={churchConfig.pastorTitularSignatureUrl} 
                        alt="Assinatura Pastor" 
                        className="h-14 sm:h-16 w-auto max-w-[220px] object-contain mb-0.5 filter contrast-125" 
                      />
                    )}
                    <div className="w-60 border-b-2 border-black mb-1"></div>
                    <span className="font-bold uppercase text-[9.5px]">{pastorName}</span>
                    <span className="text-gray-600 text-[8.5px]">Pastor Titular / Presidente</span>
                  </div>
                  <div className="flex flex-col items-center justify-end min-h-[64px]">
                    {churchConfig?.tesoureiroSignatureUrl && (
                      <img 
                        src={churchConfig.tesoureiroSignatureUrl} 
                        alt="Assinatura Tesoureiro" 
                        className="h-14 sm:h-16 w-auto max-w-[220px] object-contain mb-0.5 filter contrast-125" 
                      />
                    )}
                    <div className="w-60 border-b-2 border-black mb-1"></div>
                    <span className="font-bold uppercase text-[9.5px]">{tesoureiroName}</span>
                    <span className="text-gray-600 text-[8.5px]">1º Tesoureiro Geral</span>
                  </div>
                </div>

                <div className="text-center text-[8.5px] font-bold text-gray-700 uppercase tracking-wider mb-2">
                  COMISSÃO DE EXAME DE CONTAS / CONSELHO FISCAL
                </div>

                <div className="grid grid-cols-3 gap-4 text-center text-[8.5px]">
                  <div className="flex flex-col items-center justify-end min-h-[56px]">
                    {churchConfig?.conselhoFiscal1SignatureUrl && (
                      <img 
                        src={churchConfig.conselhoFiscal1SignatureUrl} 
                        alt="Assinatura Conselho 1" 
                        className="h-12 w-auto max-w-[160px] object-contain mb-0.5 filter contrast-125" 
                      />
                    )}
                    <div className="w-44 border-b border-black mb-1"></div>
                    <span className="font-medium">{churchConfig?.conselhoFiscal1 || "1º Conselheiro(a) Fiscal"}</span>
                  </div>
                  <div className="flex flex-col items-center justify-end min-h-[56px]">
                    {churchConfig?.conselhoFiscal2SignatureUrl && (
                      <img 
                        src={churchConfig.conselhoFiscal2SignatureUrl} 
                        alt="Assinatura Conselho 2" 
                        className="h-12 w-auto max-w-[160px] object-contain mb-0.5 filter contrast-125" 
                      />
                    )}
                    <div className="w-44 border-b border-black mb-1"></div>
                    <span className="font-medium">{churchConfig?.conselhoFiscal2 || "2º Conselheiro(a) Fiscal"}</span>
                  </div>
                  <div className="flex flex-col items-center justify-end min-h-[56px]">
                    {churchConfig?.conselhoFiscal3SignatureUrl && (
                      <img 
                        src={churchConfig.conselhoFiscal3SignatureUrl} 
                        alt="Assinatura Conselho 3" 
                        className="h-12 w-auto max-w-[160px] object-contain mb-0.5 filter contrast-125" 
                      />
                    )}
                    <div className="w-44 border-b border-black mb-1"></div>
                    <span className="font-medium">{churchConfig?.conselhoFiscal3 || "3º Conselheiro(a) Fiscal"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
