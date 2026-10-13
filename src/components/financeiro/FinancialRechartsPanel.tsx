import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { matchesBranch } from "@/lib/branchUtils";
import { Branch } from "@/contexts/BranchContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Cell,
  PieChart,
  Pie
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  BarChart3,
  PieChart as PieIcon,
  Percent,
  Sparkles,
  Building2
} from "lucide-react";

interface Transaction {
  id?: string;
  amount: number;
  type: string; // "entrada" | "saida"
  date: any;
  category?: string;
  branchId?: string;
  description?: string;
  paymentMethod?: string;
  costCenter?: string;
}

interface FinancialRechartsPanelProps {
  transactions: Transaction[];
  branches?: Branch[];
  activeBranch?: string;
  onOpenBackupModal?: () => void;
}

export function FinancialRechartsPanel({
  transactions,
  branches = [],
  activeBranch: initialBranch = "all",
  onOpenBackupModal
}: FinancialRechartsPanelProps) {
  const [periodFilter, setPeriodFilter] = useState<"6m" | "12m" | "current_year" | "all">("12m");
  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch);
  const [chartMode, setChartMode] = useState<"comparison" | "stacked" | "net_margin">("comparison");
  const [categoryView, setCategoryView] = useState<"despesas" | "receitas">("despesas");

  useEffect(() => {
    setSelectedBranch(initialBranch);
  }, [initialBranch]);

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const fullMonthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Filter transactions by branch
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => matchesBranch(t, selectedBranch, branches));
  }, [transactions, selectedBranch, branches]);

  // Aggregate monthly data for Recharts BarChart
  const monthlyData = useMemo(() => {
    const today = new Date();
    let targetMonthsCount = 12;

    if (periodFilter === "6m") targetMonthsCount = 6;
    if (periodFilter === "12m") targetMonthsCount = 12;
    if (periodFilter === "current_year") {
      targetMonthsCount = today.getMonth() + 1;
    }

    const monthMap = new Map<string, {
      rawMonthKey: string;
      label: string;
      fullLabel: string;
      receitas: number;
      dizimos: number;
      ofertas: number;
      despesas: number;
      saldoLiquido: number;
      margemPercentual: number;
    }>();

    if (periodFilter === "all") {
      // Find range in transactions
      const uniqueMonthKeys = new Set<string>();
      filteredTransactions.forEach(t => {
        if (!t.date) return;
        const dStr = typeof t.date === "string" ? t.date : "";
        if (dStr.length >= 7) {
          uniqueMonthKeys.add(dStr.substring(0, 7));
        }
      });

      const sortedKeys = Array.from(uniqueMonthKeys).sort();
      sortedKeys.forEach(mKey => {
        const [yearStr, monthStr] = mKey.split("-");
        const y = parseInt(yearStr, 10);
        const m = parseInt(monthStr, 10) - 1;
        if (!isNaN(y) && !isNaN(m)) {
          monthMap.set(mKey, {
            rawMonthKey: mKey,
            label: `${monthNames[m]}/${String(y).slice(-2)}`,
            fullLabel: `${fullMonthNames[m]} de ${y}`,
            receitas: 0,
            dizimos: 0,
            ofertas: 0,
            despesas: 0,
            saldoLiquido: 0,
            margemPercentual: 0
          });
        }
      });
    } else {
      // Generate slots for the past N months
      for (let i = targetMonthsCount - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const m = d.getMonth();
        const y = d.getFullYear();
        const mKey = `${y}-${String(m + 1).padStart(2, "0")}`;

        monthMap.set(mKey, {
          rawMonthKey: mKey,
          label: `${monthNames[m]}/${String(y).slice(-2)}`,
          fullLabel: `${fullMonthNames[m]} de ${y}`,
          receitas: 0,
          dizimos: 0,
          ofertas: 0,
          despesas: 0,
          saldoLiquido: 0,
          margemPercentual: 0
        });
      }
    }

    // Populate with transaction data
    filteredTransactions.forEach(t => {
      if (!t.date) return;
      const dStr = typeof t.date === "string" ? t.date : "";
      if (dStr.length < 7) return;

      const mKey = dStr.substring(0, 7);
      const entry = monthMap.get(mKey);
      if (!entry) return;

      const amt = Number(t.amount) || 0;
      if (t.type === "entrada") {
        entry.receitas += amt;
        const cat = (t.category || "").toLowerCase();
        if (cat.includes("dízimo") || cat.includes("dizimo")) {
          entry.dizimos += amt;
        } else {
          entry.ofertas += amt;
        }
      } else if (t.type === "saida") {
        entry.despesas += amt;
      }
    });

    // Compute net and margin
    const list = Array.from(monthMap.values());
    list.forEach(item => {
      item.saldoLiquido = item.receitas - item.despesas;
      item.margemPercentual = item.receitas > 0
        ? Math.round((item.saldoLiquido / item.receitas) * 100)
        : item.despesas > 0 ? -100 : 0;
    });

    return list;
  }, [filteredTransactions, periodFilter]);

  // Aggregate KPI summary metrics for the active period
  const summary = useMemo(() => {
    let totalReceitas = 0;
    let totalDespesas = 0;
    let totalDizimos = 0;
    let totalOfertas = 0;
    let superavitMonthsCount = 0;
    let deficitMonthsCount = 0;
    let maxReceitaMonth = { label: "-", amount: 0 };
    let maxDespesaMonth = { label: "-", amount: 0 };

    monthlyData.forEach(m => {
      totalReceitas += m.receitas;
      totalDespesas += m.despesas;
      totalDizimos += m.dizimos;
      totalOfertas += m.ofertas;

      if (m.saldoLiquido >= 0) superavitMonthsCount++;
      else deficitMonthsCount++;

      if (m.receitas > maxReceitaMonth.amount) {
        maxReceitaMonth = { label: m.label, amount: m.receitas };
      }
      if (m.despesas > maxDespesaMonth.amount) {
        maxDespesaMonth = { label: m.label, amount: m.despesas };
      }
    });

    const saldoLiquido = totalReceitas - totalDespesas;
    const monthsCount = Math.max(monthlyData.length, 1);
    const mediaReceitas = totalReceitas / monthsCount;
    const mediaDespesas = totalDespesas / monthsCount;
    const taxaRetencao = totalReceitas > 0 ? ((saldoLiquido / totalReceitas) * 100).toFixed(1) : "0.0";

    return {
      totalReceitas,
      totalDespesas,
      totalDizimos,
      totalOfertas,
      saldoLiquido,
      mediaReceitas,
      mediaDespesas,
      taxaRetencao,
      superavitMonthsCount,
      deficitMonthsCount,
      maxReceitaMonth,
      maxDespesaMonth
    };
  }, [monthlyData]);

  // Category breakdown for Pie Chart
  const categoryData = useMemo(() => {
    const map = new Map<string, number>();

    filteredTransactions.forEach(t => {
      if (t.type !== (categoryView === "despesas" ? "saida" : "entrada")) return;

      // Filter within the months present in monthlyData
      if (periodFilter !== "all") {
        const dStr = typeof t.date === "string" ? t.date : "";
        const mKey = dStr.substring(0, 7);
        if (!monthlyData.some(m => m.rawMonthKey === mKey)) return;
      }

      const catName = t.category?.trim() || (categoryView === "despesas" ? "Outras Despesas" : "Outras Entradas");
      map.set(catName, (map.get(catName) || 0) + (Number(t.amount) || 0));
    });

    const colors = [
      "#10b981", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6",
      "#06b6d4", "#ef4444", "#14b8a6", "#64748b", "#84cc16"
    ];

    const sorted = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([name, value], idx) => ({
        name,
        value,
        color: colors[idx % colors.length]
      }));

    return sorted;
  }, [filteredTransactions, categoryView, periodFilter, monthlyData]);

  const formatCurrency = (value: number) => {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card border rounded-xl p-4 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-semibold text-base text-foreground">
              Comparativo Mensal: Receitas vs Despesas
            </h3>
            <Badge variant="outline" className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-xs">
              Recharts Analytics
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Análise gráfica interativa da saúde orçamentária e arrecadação da igreja
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Period selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground hidden sm:inline" />
            <Select value={periodFilter} onValueChange={(v: any) => setPeriodFilter(v)}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6m">Últimos 6 Meses</SelectItem>
                <SelectItem value="12m">Últimos 12 Meses</SelectItem>
                <SelectItem value="current_year">Ano Vigente</SelectItem>
                <SelectItem value="all">Todo o Histórico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Branch selector */}
          {branches.length > 0 && (
            <div className="flex items-center gap-1.5">
              <Building2 className="h-4 w-4 text-muted-foreground hidden sm:inline" />
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-8 text-xs w-[150px]">
                  <SelectValue placeholder="Congregação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Unidades</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Visual Mode selector */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border">
            <Button
              type="button"
              variant={chartMode === "comparison" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setChartMode("comparison")}
              title="Comparativo Direto de Barras Lado a Lado"
            >
              Lado a Lado
            </Button>
            <Button
              type="button"
              variant={chartMode === "stacked" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setChartMode("stacked")}
              title="Receitas Detalhadas (Dízimos + Ofertas) vs Despesas"
            >
              Empilhado
            </Button>
            <Button
              type="button"
              variant={chartMode === "net_margin" ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs px-2.5"
              onClick={() => setChartMode("net_margin")}
              title="Resultado Líquido Mensal (Superávit / Déficit)"
            >
              Saldo Líquido
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Receitas */}
        <Card className="shadow-2xs border-emerald-100 dark:border-emerald-950/40 bg-gradient-to-br from-white to-emerald-50/30 dark:from-background dark:to-emerald-950/10">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-800 dark:text-emerald-400">Total Receitas</span>
              <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg text-emerald-700 dark:text-emerald-400">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {formatCurrency(summary.totalReceitas)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
              <span>Média mensal: {formatCurrency(summary.mediaReceitas)}</span>
            </div>
            <div className="flex gap-2 mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-950/60 text-[10px] text-slate-500">
              <span className="text-emerald-600 font-medium">Dízimos: {formatCurrency(summary.totalDizimos)}</span>
              <span>•</span>
              <span className="text-teal-600 font-medium">Ofertas: {formatCurrency(summary.totalOfertas)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Total Despesas */}
        <Card className="shadow-2xs border-rose-100 dark:border-rose-950/40 bg-gradient-to-br from-white to-rose-50/30 dark:from-background dark:to-rose-950/10">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-rose-800 dark:text-rose-400">Total Despesas</span>
              <div className="p-1.5 bg-rose-100 dark:bg-rose-900/40 rounded-lg text-rose-700 dark:text-rose-400">
                <ArrowDownRight className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(summary.totalDespesas)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
              <span>Média mensal: {formatCurrency(summary.mediaDespesas)}</span>
            </div>
            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-rose-100 dark:border-rose-950/60 text-[10px] text-slate-500">
              <span>Pico de gastos: </span>
              <span className="font-semibold text-rose-600">{summary.maxDespesaMonth.label}</span>
              <span>({formatCurrency(summary.maxDespesaMonth.amount)})</span>
            </div>
          </CardContent>
        </Card>

        {/* Saldo Líquido do Período */}
        <Card className={`shadow-2xs border-blue-100 dark:border-blue-950/40 bg-gradient-to-br from-white to-blue-50/30 dark:from-background dark:to-blue-950/10`}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Resultado Líquido</span>
              <div className={`p-1.5 rounded-lg ${summary.saldoLiquido >= 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400"}`}>
                <Wallet className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className={`text-2xl font-bold ${summary.saldoLiquido >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {summary.saldoLiquido >= 0 ? "+" : ""}{formatCurrency(summary.saldoLiquido)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-1">
              <Badge variant={summary.saldoLiquido >= 0 ? "default" : "destructive"} className="text-[10px] h-4.5 px-1.5">
                {summary.saldoLiquido >= 0 ? "Superávit Acumulado" : "Déficit Acumulado"}
              </Badge>
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t text-[10px] text-slate-500">
              <span>Meses positivos: <strong className="text-emerald-600">{summary.superavitMonthsCount}</strong></span>
              <span>Meses deficitários: <strong className="text-rose-600">{summary.deficitMonthsCount}</strong></span>
            </div>
          </CardContent>
        </Card>

        {/* Margem / Taxa de Retenção */}
        <Card className="shadow-2xs border-slate-200 dark:border-slate-800">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Margem Operacional</span>
              <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-300">
                <Percent className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-foreground">
              {summary.taxaRetencao}%
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              da receita convertida em reserva líquida
            </p>
            <div className="flex items-center gap-1 mt-2 pt-2 border-t text-[10px] text-slate-500">
              <Sparkles className="h-3 w-3 text-amber-500" />
              <span>Maior arrecadação: <strong className="text-emerald-600">{summary.maxReceitaMonth.label}</strong></span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Bar Chart Section */}
      <Card className="shadow-xs border-slate-200 dark:border-slate-800">
        <CardHeader className="p-4 sm:p-6 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {chartMode === "comparison" && "Comparativo Direto: Receitas vs Despesas"}
                {chartMode === "stacked" && "Composição de Entradas vs Saídas"}
                {chartMode === "net_margin" && "Resultado Líquido Mensal (Superávit / Déficit)"}
              </CardTitle>
              <CardDescription className="text-xs">
                {chartMode === "comparison" && "Barras lado a lado confrontando o total arrecadado contra o total desembolsado por mês."}
                {chartMode === "stacked" && "Entradas discriminadas entre Dízimos e Ofertas em comparação com o total de despesas."}
                {chartMode === "net_margin" && "Saldo positivo (verde) ou negativo (vermelho) obtido no encerramento de cada mês."}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block"></span>
                <span>Receitas</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-xs bg-rose-500 inline-block"></span>
                <span>Despesas</span>
              </div>
              {chartMode === "net_margin" && (
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block"></span>
                  <span>Saldo Líquido</span>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-6 pt-2">
          <div className="h-[360px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartMode === "net_margin" ? (
                <BarChart data={monthlyData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    dy={5}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                  />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      const isPositive = data.saldoLiquido >= 0;

                      return (
                        <div className="bg-popover text-popover-foreground border rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[200px]">
                          <div className="font-bold border-b pb-1 text-sm text-foreground">
                            {data.fullLabel || label}
                          </div>
                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                            <span>Receitas:</span>
                            <span className="font-semibold">{formatCurrency(data.receitas)}</span>
                          </div>
                          <div className="flex justify-between text-rose-600 dark:text-rose-400">
                            <span>Despesas:</span>
                            <span className="font-semibold">{formatCurrency(data.despesas)}</span>
                          </div>
                          <div className={`flex justify-between pt-1 border-t font-bold ${isPositive ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                            <span>Saldo Líquido:</span>
                            <span>{isPositive ? "+" : ""}{formatCurrency(data.saldoLiquido)}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground text-right">
                            Margem: {data.margemPercentual}%
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="saldoLiquido" name="Saldo Líquido" radius={[4, 4, 0, 0]} maxBarSize={45}>
                    {monthlyData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.saldoLiquido >= 0 ? "#10b981" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartMode === "stacked" ? (
                <BarChart data={monthlyData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    dy={5}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      const isPositive = data.saldoLiquido >= 0;

                      return (
                        <div className="bg-popover text-popover-foreground border rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[210px]">
                          <div className="font-bold border-b pb-1 text-sm text-foreground">
                            {data.fullLabel || label}
                          </div>
                          <div className="flex justify-between text-emerald-600">
                            <span>Dízimos:</span>
                            <span className="font-semibold">{formatCurrency(data.dizimos)}</span>
                          </div>
                          <div className="flex justify-between text-teal-600">
                            <span>Ofertas & Outros:</span>
                            <span className="font-semibold">{formatCurrency(data.ofertas)}</span>
                          </div>
                          <div className="flex justify-between font-medium text-emerald-700 dark:text-emerald-400 pt-0.5 border-t border-dashed">
                            <span>Total Receitas:</span>
                            <span>{formatCurrency(data.receitas)}</span>
                          </div>
                          <div className="flex justify-between text-rose-600 dark:text-rose-400">
                            <span>Total Despesas:</span>
                            <span className="font-semibold">{formatCurrency(data.despesas)}</span>
                          </div>
                          <div className={`flex justify-between pt-1 border-t font-bold ${isPositive ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                            <span>Resultado:</span>
                            <span>{isPositive ? "+" : ""}{formatCurrency(data.saldoLiquido)}</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: "10px" }} />
                  <Bar name="Dízimos" dataKey="dizimos" stackId="entradas" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={38} />
                  <Bar name="Ofertas & Outros" dataKey="ofertas" stackId="entradas" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={38} />
                  <Bar name="Despesas" dataKey="despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={38} />
                </BarChart>
              ) : (
                /* Default: Comparison Mode (Side by side Bar Chart: Receitas vs Despesas) */
                <BarChart data={monthlyData} margin={{ top: 20, right: 20, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    dy={5}
                  />
                  <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload || !payload.length) return null;
                      const data = payload[0].payload;
                      const isPositive = data.saldoLiquido >= 0;

                      return (
                        <div className="bg-popover text-popover-foreground border rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[210px]">
                          <div className="font-bold border-b pb-1 text-sm text-foreground">
                            {data.fullLabel || label}
                          </div>
                          <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                            <span>Receitas Totais:</span>
                            <span className="font-semibold">{formatCurrency(data.receitas)}</span>
                          </div>
                          <div className="flex justify-between text-rose-600 dark:text-rose-400">
                            <span>Despesas Totais:</span>
                            <span className="font-semibold">{formatCurrency(data.despesas)}</span>
                          </div>
                          <div className={`flex justify-between pt-1 border-t font-bold ${isPositive ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                            <span>Saldo Líquido:</span>
                            <span>{isPositive ? "+" : ""}{formatCurrency(data.saldoLiquido)}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground flex justify-between">
                            <span>Margem Operacional:</span>
                            <span className="font-medium">{data.margemPercentual}%</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: "10px" }} />
                  <Bar
                    name="Receitas (Entradas)"
                    dataKey="receitas"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    name="Despesas (Saídas)"
                    dataKey="despesas"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Secondary Analytics Row: Distribution by Categories and Monthly Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown (Pie / Distribution) */}
        <Card className="shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <PieIcon className="h-4 w-4 text-primary" />
                Distribuição por Categoria
              </CardTitle>
              <div className="flex bg-muted/60 p-0.5 rounded-md border text-[11px]">
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded-sm font-medium ${categoryView === "despesas" ? "bg-background text-rose-600 shadow-2xs" : "text-muted-foreground"}`}
                  onClick={() => setCategoryView("despesas")}
                >
                  Despesas
                </button>
                <button
                  type="button"
                  className={`px-2 py-0.5 rounded-sm font-medium ${categoryView === "receitas" ? "bg-background text-emerald-600 shadow-2xs" : "text-muted-foreground"}`}
                  onClick={() => setCategoryView("receitas")}
                >
                  Receitas
                </button>
              </div>
            </div>
            <CardDescription className="text-xs">
              Principais destinos ou origens dos recursos
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {categoryData.length > 0 ? (
              <div className="space-y-3">
                <div className="h-[180px] w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: any) => [formatCurrency(Number(val)), "Valor"]}
                        contentStyle={{ borderRadius: "8px", fontSize: "11px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                  {categoryData.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-0.5 border-b border-border/40 last:border-0">
                      <div className="flex items-center gap-2 truncate max-w-[150px]">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }}></span>
                        <span className="truncate font-medium">{c.name}</span>
                      </div>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-xs text-muted-foreground">
                Nenhum dado encontrado para o período selecionado.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Monthly Balance Table */}
        <Card className="lg:col-span-2 shadow-xs border-slate-200 dark:border-slate-800">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Resumo Mensal Consolidado</CardTitle>
              <CardDescription className="text-xs">
                Tabela analítica com entradas, saídas e resultado líquido de cada competência
              </CardDescription>
            </div>
            {onOpenBackupModal && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={onOpenBackupModal}
              >
                Backup / Exportar Dados
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0 sm:p-4 pt-0">
            <div className="overflow-x-auto w-full max-h-[300px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/50 text-muted-foreground sticky top-0 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-2.5 font-semibold">Competência</th>
                    <th className="p-2.5 font-semibold text-right">Receitas</th>
                    <th className="p-2.5 font-semibold text-right">Despesas</th>
                    <th className="p-2.5 font-semibold text-right">Saldo Líquido</th>
                    <th className="p-2.5 font-semibold text-center">Margem</th>
                    <th className="p-2.5 font-semibold text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {monthlyData.map((m, idx) => (
                    <tr key={idx} className="hover:bg-muted/30 transition-colors">
                      <td className="p-2.5 font-medium">{m.fullLabel}</td>
                      <td className="p-2.5 text-right font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(m.receitas)}
                      </td>
                      <td className="p-2.5 text-right font-medium text-rose-600 dark:text-rose-400">
                        {formatCurrency(m.despesas)}
                      </td>
                      <td className={`p-2.5 text-right font-bold ${m.saldoLiquido >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
                        {m.saldoLiquido >= 0 ? "+" : ""}{formatCurrency(m.saldoLiquido)}
                      </td>
                      <td className="p-2.5 text-center font-medium">
                        {m.margemPercentual}%
                      </td>
                      <td className="p-2.5 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0 ${m.saldoLiquido >= 0 ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40" : "bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40"}`}
                        >
                          {m.saldoLiquido >= 0 ? "Superávit" : "Déficit"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  {monthlyData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-muted-foreground">
                        Nenhum registro localizado no período selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
