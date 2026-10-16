import React, { useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Printer,
  Calendar,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import { printDocument } from "@/lib/printUtils";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";

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
  churchName = "Igreja Evangélica Manancial",
  activeBranchName = "Templo Sede"
}: BalanceteMensalModalProps) {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<string>(String(currentDate.getMonth()));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentDate.getFullYear()));
  const printRef = useRef<HTMLDivElement>(null);

  const churchLogo = getRegisteredChurchLogo();
  const churchCNPJ = localStorage.getItem("church_cnpj") || "50.123.456/0001-89";
  const churchAddress = localStorage.getItem("church_address") || "Rua Principal, 1000 - Centro";
  const pastorName = localStorage.getItem("pastor_name") || "Pr. Presidente da Igreja";
  const tesoureiroName = localStorage.getItem("tesoureiro_name") || "1º Tesoureiro Geral";

  // Parse and calculate financial figures for the selected period
  const balanceteData = useMemo(() => {
    const month = parseInt(selectedMonth, 10);
    const year = parseInt(selectedYear, 10);

    const startOfPeriod = new Date(year, month, 1, 0, 0, 0);
    const endOfPeriod = new Date(year, month + 1, 0, 23, 59, 59);

    let saldoAnterior = 0;
    const entradasPorCategoria: Record<string, number> = {};
    const saidasPorCategoria: Record<string, number> = {};

    let totalEntradas = 0;
    let totalSaidas = 0;

    transactions.forEach(t => {
      if (!t.date) return;
      const tDate = new Date(t.date);
      if (isNaN(tDate.getTime())) return;

      const amt = Number(t.amount) || 0;
      const isIncome = t.type === "entrada" || t.type === "income";
      const isExpense = t.type === "saida" || t.type === "expense";

      // Transactions prior to this month go to Saldo Anterior
      if (tDate < startOfPeriod) {
        if (isIncome) saldoAnterior += amt;
        if (isExpense) saldoAnterior -= amt;
      } else if (tDate <= endOfPeriod) {
        // Transactions within the selected month
        const cat = t.category || "Outros";
        if (isIncome) {
          entradasPorCategoria[cat] = (entradasPorCategoria[cat] || 0) + amt;
          totalEntradas += amt;
        } else if (isExpense) {
          saidasPorCategoria[cat] = (saidasPorCategoria[cat] || 0) + amt;
          totalSaidas += amt;
        }
      }
    });

    const saldoAtual = saldoAnterior + totalEntradas - totalSaidas;
    const superavit = totalEntradas - totalSaidas;

    return {
      saldoAnterior,
      entradasPorCategoria,
      saidasPorCategoria,
      totalEntradas,
      totalSaidas,
      superavit,
      saldoAtual,
    };
  }, [transactions, selectedMonth, selectedYear]);

  const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || "Mês";

  const handlePrint = () => {
    printDocument({
      elementId: "balancete-print-area",
      title: `Balancete_Mensal_${monthLabel}_${selectedYear}`,
      orientation: "portrait",
    });
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] flex flex-col p-0 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        <DialogHeader className="!m-0 !mx-0 !mt-0 !mb-0 p-5 sm:p-6 pb-4 border-b border-border bg-muted/20 sticky top-0 bg-background z-10 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                Balancete Mensal para Assembleia Geral
              </DialogTitle>
              <DialogDescription className="text-sm">
                Relatório oficial de prestação de contas com parecer da comissão de exame de contas e assinaturas.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold">
                <Printer className="w-4 h-4 mr-2" /> Imprimir Balancete Oficial
              </Button>
            </div>
          </div>

          {/* Month / Year Filters */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Mês de Referência:</span>
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px] h-9 text-xs">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(m => (
                  <SelectItem key={m.value} value={m.value} className="text-xs">
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px] h-9 text-xs">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {["2024", "2025", "2026", "2027"].map(y => (
                  <SelectItem key={y} value={y} className="text-xs">
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Badge variant="outline" className="text-xs py-1 px-2.5 bg-background">
              {activeBranchName}
            </Badge>
          </div>
        </DialogHeader>

        {/* Printable Balancete Document */}
        <div className="p-6 sm:p-8 space-y-6 flex-1 overflow-y-auto bg-white text-slate-900 print-page" id="balancete-print-area" ref={printRef}>
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {churchLogo ? (
                <img src={churchLogo} alt="Brasão da Igreja" className="w-16 h-16 object-contain" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl">
                  IM
                </div>
              )}
              <div>
                <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">{churchName}</h1>
                <p className="text-xs text-slate-600 font-medium">{churchAddress}</p>
                <p className="text-xs text-slate-500">CNPJ: {churchCNPJ} • {activeBranchName}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">Documento Oficial</span>
              <h2 className="text-base font-black text-slate-900">BALANCETE FINANCEIRO</h2>
              <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full inline-block mt-0.5 border border-emerald-200">
                {monthLabel.toUpperCase()} / {selectedYear}
              </p>
            </div>
          </div>

          {/* Resumo Sintético Top Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Saldo Anterior</span>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {formatCurrency(balanceteData.saldoAnterior)}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60">
              <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Total Entradas</span>
              <div className="text-sm font-bold text-emerald-800 mt-0.5 flex items-center justify-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                {formatCurrency(balanceteData.totalEntradas)}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50/60">
              <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wide">Total Saídas</span>
              <div className="text-sm font-bold text-rose-800 mt-0.5 flex items-center justify-center gap-1">
                <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                {formatCurrency(balanceteData.totalSaidas)}
              </div>
            </div>
            <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/60">
              <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">Saldo Atual em Caixa</span>
              <div className="text-sm font-bold text-blue-900 mt-0.5">
                {formatCurrency(balanceteData.saldoAtual)}
              </div>
            </div>
          </div>

          {/* Tabelas de Entradas e Saídas lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Quadro de Entradas */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-emerald-700 text-white px-4 py-2 flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" /> 1. Receitas do Exercício (Entradas)
                </span>
                <span className="font-black text-xs">{formatCurrency(balanceteData.totalEntradas)}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 text-[11px]">
                    <TableHead className="py-2 text-slate-700 font-bold">Categoria / Origem</TableHead>
                    <TableHead className="py-2 text-right text-slate-700 font-bold">Valor (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {Object.keys(balanceteData.entradasPorCategoria).length > 0 ? (
                    Object.entries(balanceteData.entradasPorCategoria).map(([cat, val]) => (
                      <TableRow key={cat} className="hover:bg-slate-50/50">
                        <TableCell className="py-2 font-medium text-slate-800">{cat}</TableCell>
                        <TableCell className="py-2 text-right font-semibold text-emerald-800">
                          {formatCurrency(val)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-slate-400 italic">
                        Nenhuma receita registrada neste período.
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="bg-emerald-50/50 font-bold border-t-2 border-emerald-200">
                    <TableCell className="py-2.5 text-slate-900">TOTAL GERAL DE ENTRADAS</TableCell>
                    <TableCell className="py-2.5 text-right text-emerald-900">
                      {formatCurrency(balanceteData.totalEntradas)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            {/* 2. Quadro de Saídas */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-rose-700 text-white px-4 py-2 flex items-center justify-between">
                <span className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5" /> 2. Despesas do Exercício (Saídas)
                </span>
                <span className="font-black text-xs">{formatCurrency(balanceteData.totalSaidas)}</span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 text-[11px]">
                    <TableHead className="py-2 text-slate-700 font-bold">Categoria / Destinação</TableHead>
                    <TableHead className="py-2 text-right text-slate-700 font-bold">Valor (R$)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {Object.keys(balanceteData.saidasPorCategoria).length > 0 ? (
                    Object.entries(balanceteData.saidasPorCategoria).map(([cat, val]) => (
                      <TableRow key={cat} className="hover:bg-slate-50/50">
                        <TableCell className="py-2 font-medium text-slate-800">{cat}</TableCell>
                        <TableCell className="py-2 text-right font-semibold text-rose-800">
                          {formatCurrency(val)}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-4 text-slate-400 italic">
                        Nenhuma despesa registrada neste período.
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow className="bg-rose-50/50 font-bold border-t-2 border-rose-200">
                    <TableCell className="py-2.5 text-slate-900">TOTAL GERAL DE SAÍDAS</TableCell>
                    <TableCell className="py-2.5 text-right text-rose-900">
                      {formatCurrency(balanceteData.totalSaidas)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 3. Demonstrativo de Conciliação Final */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              3. Demonstrativo de Fechamento do Exercício
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 pt-1 text-slate-700">
              <div className="flex justify-between border-b border-slate-200 py-1">
                <span>(+) Saldo em Caixa / Bancos Anterior:</span>
                <span className="font-semibold text-slate-900">{formatCurrency(balanceteData.saldoAnterior)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 py-1">
                <span>(+) Receitas Totais Arrecadadas:</span>
                <span className="font-semibold text-emerald-700">+{formatCurrency(balanceteData.totalEntradas)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 py-1">
                <span>(-) Despesas e Pagamentos Efetuados:</span>
                <span className="font-semibold text-rose-700">-{formatCurrency(balanceteData.totalSaidas)}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 py-1">
                <span>(=) Resultado do Mês (Superávit/Déficit):</span>
                <span className={`font-black ${balanceteData.superavit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {formatCurrency(balanceteData.superavit)}
                </span>
              </div>
            </div>
            <div className="flex justify-between pt-2 border-t-2 border-slate-300 font-black text-sm text-slate-900">
              <span>(=) SALDO ATUAL DISPONÍVEL (CAIXA / CONTAS BANCÁRIAS):</span>
              <span className="text-blue-900">{formatCurrency(balanceteData.saldoAtual)}</span>
            </div>
          </div>

          {/* 4. Parecer do Conselho Fiscal */}
          <div className="p-4 rounded-xl border border-slate-200 bg-white text-xs space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              4. Parecer da Comissão de Exame de Contas / Conselho Fiscal
            </h4>
            <p className="text-slate-600 leading-relaxed text-justify">
              A Comissão de Exame de Contas da {churchName}, no cumprimento de suas atribuições estatutárias, examinou detidamente os lançamentos contábeis, notas fiscais, recibos e extratos bancários referentes ao mês de <strong>{monthLabel} de {selectedYear}</strong>, constatando a exatidão dos comprovantes de receitas e despesas apresentados pela Tesouraria, opinando por sua <strong>APROVAÇÃO INTEGRAL SEM RESSALVAS</strong> pela Assembleia Geral Ordinária.
            </p>
          </div>

          {/* 5. Linhas de Assinatura Oficiais */}
          <div className="pt-6 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-8 text-center text-xs mb-8">
              <div className="flex flex-col items-center">
                <div className="w-56 border-b border-slate-800 mb-1"></div>
                <span className="font-bold text-slate-900">{pastorName}</span>
                <span className="text-slate-500 text-[11px]">Pastor Presidente / Dirigente</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-56 border-b border-slate-800 mb-1"></div>
                <span className="font-bold text-slate-900">{tesoureiroName}</span>
                <span className="text-slate-500 text-[11px]">1º Tesoureiro Geral</span>
              </div>
            </div>

            <div className="text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">
              Membros do Conselho Fiscal
            </div>

            <div className="grid grid-cols-3 gap-6 text-center text-xs">
              <div className="flex flex-col items-center">
                <div className="w-44 border-b border-slate-700 mb-1"></div>
                <span className="font-medium text-slate-800">1º Conselheiro Fiscal</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-44 border-b border-slate-700 mb-1"></div>
                <span className="font-medium text-slate-800">2º Conselheiro Fiscal</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-44 border-b border-slate-700 mb-1"></div>
                <span className="font-medium text-slate-800">3º Conselheiro Fiscal</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="!m-0 !mx-0 !mb-0 !mt-auto p-4 border-t border-border bg-muted/20 flex flex-row justify-end items-center gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} className="rounded-xl px-5 h-10 font-semibold">
            Fechar
          </Button>
          <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 h-10 font-semibold shadow-xs">
            <Printer className="w-4 h-4 mr-2" /> Imprimir Balancete Oficial
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
