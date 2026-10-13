import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  PiggyBank, 
  DollarSign, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Percent
} from "lucide-react";
import { Link } from "react-router-dom";
import { useBranch } from "@/contexts/BranchContext";
import { matchesBranch } from "@/lib/branchUtils";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'entrada' | 'saida' | 'income' | 'expense';
  status?: string;
  date: string;
  dueDate?: string;
  category?: string;
  branchId?: string;
}

interface FinancialSummaryCardsProps {
  transactions: Transaction[];
  activeBranch?: string;
}

export function FinancialSummaryCards({ transactions, activeBranch: propActiveBranch }: FinancialSummaryCardsProps) {
  const { activeBranch: contextActiveBranch, branches } = useBranch();
  const activeBranch = propActiveBranch || contextActiveBranch;

  // Current month transactions calculation
  const summary = useMemo(() => {
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevYearMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // Filter by branch with matchesBranch
    const branchFiltered = transactions.filter(t => matchesBranch(t, activeBranch, branches));

    // Current month
    const thisMonthTxs = branchFiltered.filter(t => t.date && t.date.startsWith(currentYearMonth));
    // Previous month for comparison
    const prevMonthTxs = branchFiltered.filter(t => t.date && t.date.startsWith(prevYearMonth));

    // Entradas this month
    const entradas = thisMonthTxs.filter(t => t.type === 'entrada' || t.type === 'income');
    const totalEntradas = entradas.reduce((acc, t) => acc + (t.amount || 0), 0);

    const dizimos = entradas
      .filter(t => (t.category || '').toLowerCase().includes('dízimo'))
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    const ofertas = entradas
      .filter(t => (t.category || '').toLowerCase().includes('oferta'))
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    const outrasEntradas = Math.max(0, totalEntradas - (dizimos + ofertas));

    // Saídas this month
    const saidas = thisMonthTxs.filter(t => t.type === 'saida' || t.type === 'expense');
    const totalSaidas = saidas.reduce((acc, t) => acc + (t.amount || 0), 0);

    const saidasPagas = saidas
      .filter(t => t.status === 'Pago' || !t.status)
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    const saidasPendentes = saidas
      .filter(t => t.status === 'Pendente')
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    // Prev month comparison
    const prevEntradas = prevMonthTxs
      .filter(t => t.type === 'entrada' || t.type === 'income')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const prevSaidas = prevMonthTxs
      .filter(t => t.type === 'saida' || t.type === 'expense')
      .reduce((acc, t) => acc + (t.amount || 0), 0);

    const diffEntradas = prevEntradas > 0 ? ((totalEntradas - prevEntradas) / prevEntradas) * 100 : 0;
    const diffSaidas = prevSaidas > 0 ? ((totalSaidas - prevSaidas) / prevSaidas) * 100 : 0;

    // Saldo
    const saldoLiquido = totalEntradas - totalSaidas;

    // All-time accumulated balance
    const totalEntradasAllTime = branchFiltered
      .filter(t => t.type === 'entrada' || t.type === 'income')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const totalSaidasAllTime = branchFiltered
      .filter(t => t.type === 'saida' || t.type === 'expense')
      .reduce((acc, t) => acc + (t.amount || 0), 0);
    const saldoAcumulado = totalEntradasAllTime - totalSaidasAllTime;

    // Proportion
    const totalMovimentado = totalEntradas + totalSaidas;
    const percentEntradas = totalMovimentado > 0 ? Math.round((totalEntradas / totalMovimentado) * 100) : 50;
    const percentSaidas = totalMovimentado > 0 ? Math.round((totalSaidas / totalMovimentado) * 100) : 50;

    // Taxa de comprometimento (Saídas / Entradas)
    const taxaComprometimento = totalEntradas > 0 ? Math.min(100, Math.round((totalSaidas / totalEntradas) * 100)) : (totalSaidas > 0 ? 100 : 0);

    return {
      totalEntradas,
      dizimos,
      ofertas,
      outrasEntradas,
      totalSaidas,
      saidasPagas,
      saidasPendentes,
      saldoLiquido,
      saldoAcumulado,
      diffEntradas,
      diffSaidas,
      percentEntradas,
      percentSaidas,
      taxaComprometimento,
      monthName: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    };
  }, [transactions, activeBranch]);

  return (
    <div className="space-y-4">
      {/* 3 Main Summary Cards: Entradas vs Saídas vs Saldo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Entradas do Mês */}
        <Card className="border-border/80 dark:border-border/60 bg-gradient-to-br from-emerald-50/60 via-card to-card dark:from-emerald-950/20 dark:via-card dark:to-card overflow-hidden relative shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Entradas Realizadas
              </span>
              <Badge variant="outline" className="text-[11px] font-medium border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40">
                {summary.diffEntradas >= 0 ? `+${summary.diffEntradas.toFixed(1)}%` : `${summary.diffEntradas.toFixed(1)}%`} vs anterior
              </Badge>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-700 dark:text-emerald-400 mt-1">
              R$ {summary.totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground capitalize">
              Receitas em {summary.monthName}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2 pb-4">
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/60">
              <div>
                <span className="text-muted-foreground block">Dízimos</span>
                <span className="font-semibold text-foreground">
                  R$ {summary.dizimos.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Ofertas & Doações</span>
                <span className="font-semibold text-foreground">
                  R$ {(summary.ofertas + summary.outrasEntradas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Saídas do Mês */}
        <Card className="border-border/80 dark:border-border/60 bg-gradient-to-br from-red-50/60 via-card to-card dark:from-red-950/20 dark:via-card dark:to-card overflow-hidden relative shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ArrowDownRight className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                Saídas / Despesas
              </span>
              <Badge variant="outline" className="text-[11px] font-medium border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40">
                {summary.diffSaidas >= 0 ? `+${summary.diffSaidas.toFixed(1)}%` : `${summary.diffSaidas.toFixed(1)}%`} vs anterior
              </Badge>
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight text-rose-700 dark:text-rose-400 mt-1">
              R$ {summary.totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground capitalize">
              Despesas em {summary.monthName}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2 pb-4">
            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/60">
              <div>
                <span className="text-muted-foreground block">Já Pagas</span>
                <span className="font-semibold text-foreground">
                  R$ {summary.saidasPagas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">Pendentes</span>
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  R$ {summary.saidasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Saldo Operacional Líquido */}
        <Card className={`border-border/80 dark:border-border/60 overflow-hidden relative shadow-sm ${
          summary.saldoLiquido >= 0 
            ? 'bg-gradient-to-br from-blue-50/60 via-card to-card dark:from-blue-950/20 dark:via-card dark:to-card' 
            : 'bg-gradient-to-br from-amber-50/60 via-card to-card dark:from-amber-950/20 dark:via-card dark:to-card'
        }`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-primary" />
                Saldo Operacional
              </span>
              <Badge 
                variant="outline" 
                className={`text-[11px] font-semibold ${
                  summary.saldoLiquido >= 0 
                    ? 'border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40' 
                    : 'border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'
                }`}
              >
                {summary.saldoLiquido >= 0 ? "Superávit do Mês" : "Déficit do Mês"}
              </Badge>
            </div>
            <CardTitle className={`text-2xl sm:text-3xl font-bold tracking-tight mt-1 ${
              summary.saldoLiquido >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'
            }`}>
              {summary.saldoLiquido >= 0 ? '+ ' : ''}
              R$ {summary.saldoLiquido.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Saldo geral acumulado em caixa: <span className="font-semibold text-foreground">R$ {summary.saldoAcumulado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2 pb-4">
            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
              <span className="text-muted-foreground">Taxa de Comprometimento:</span>
              <span className={`font-semibold ${
                summary.taxaComprometimento <= 70 ? 'text-emerald-600 dark:text-emerald-400' : summary.taxaComprometimento <= 90 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {summary.taxaComprometimento}% das receitas
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Comparison Bar (Entradas vs Saídas) */}
      <div className="rounded-2xl border border-border/80 dark:border-border/60 bg-card p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              Balanço Proporcional (Entradas vs Saídas)
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              • {summary.monthName}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
              <span className="text-muted-foreground">Entradas ({summary.percentEntradas}%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500 inline-block" />
              <span className="text-muted-foreground">Saídas ({summary.percentSaidas}%)</span>
            </div>
          </div>
        </div>

        {/* Multi-segment progress bar */}
        <div className="w-full h-3 rounded-full bg-muted overflow-hidden flex shadow-inner">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500" 
            style={{ width: `${summary.percentEntradas}%` }} 
            title={`Entradas: ${summary.percentEntradas}% (R$ ${summary.totalEntradas.toLocaleString('pt-BR')})`}
          />
          <div 
            className="h-full bg-rose-500 transition-all duration-500" 
            style={{ width: `${summary.percentSaidas}%` }} 
            title={`Saídas: ${summary.percentSaidas}% (R$ ${summary.totalSaidas.toLocaleString('pt-BR')})`}
          />
        </div>

        <div className="flex justify-between items-center text-[11px] text-muted-foreground mt-2">
          <span>
            {summary.totalEntradas > summary.totalSaidas 
              ? "Margem de segurança positiva. As receitas superam as despesas neste período."
              : "Atenção: despesas superando as entradas neste período."}
          </span>
          <Link to="/financeiro" className="inline-flex items-center text-xs text-primary hover:underline font-medium">
            Ver Relatório Detalhado <ExternalLink className="h-3 w-3 ml-1" />
          </Link>
        </div>
      </div>
    </div>
  );
}
