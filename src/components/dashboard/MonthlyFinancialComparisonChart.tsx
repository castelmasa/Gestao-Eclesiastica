import React, { useState, useMemo } from "react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Cell,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Layers,
  BarChart3,
  Percent,
} from "lucide-react"

interface MonthlyFinancialComparisonChartProps {
  transactions: any[]
  activeBranch?: string
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
]

export function MonthlyFinancialComparisonChart({
  transactions,
  activeBranch,
}: MonthlyFinancialComparisonChartProps) {
  const [viewMode, setViewMode] = useState<"semanal" | "acumulado" | "categorias">("semanal")

  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const monthName = MONTH_NAMES[currentMonth]

  // Filtra transações do mês atual
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (!t.date) return false
      const d = t.date?.toDate ? t.date.toDate() : new Date(t.date)
      if (isNaN(d.getTime())) return false
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear
    })
  }, [transactions, currentMonth, currentYear])

  // Métricas totais do mês atual
  const { totalEntradas, totalSaidas, saldoMes, countEntradas, countSaidas, margemRetencao } =
    useMemo(() => {
      let entradas = 0
      let saidas = 0
      let cEntradas = 0
      let cSaidas = 0

      currentMonthTransactions.forEach((t) => {
        const val = Number(t.amount) || 0
        const isIncome = t.type === "income" || t.type === "entrada"
        const isExpense = t.type === "expense" || t.type === "saida"

        if (isIncome) {
          entradas += val
          cEntradas++
        } else if (isExpense) {
          saidas += val
          cSaidas++
        }
      })

      const saldo = entradas - saidas
      const margem = entradas > 0 ? ((saldo / entradas) * 100).toFixed(1) : "0"

      return {
        totalEntradas: entradas,
        totalSaidas: saidas,
        saldoMes: saldo,
        countEntradas: cEntradas,
        countSaidas: cSaidas,
        margemRetencao: margem,
      }
    }, [currentMonthTransactions])

  // 1. Dados Semanais do Mês Atual (Semanas 1 a 5)
  const weeklyData = useMemo(() => {
    const weeks = [
      { name: "Sem 1 (1-7)", range: [1, 7], entradas: 0, saidas: 0, saldo: 0 },
      { name: "Sem 2 (8-14)", range: [8, 14], entradas: 0, saidas: 0, saldo: 0 },
      { name: "Sem 3 (15-21)", range: [15, 21], entradas: 0, saidas: 0, saldo: 0 },
      { name: "Sem 4 (22-28)", range: [22, 28], entradas: 0, saidas: 0, saldo: 0 },
      { name: "Sem 5 (29-31)", range: [29, 31], entradas: 0, saidas: 0, saldo: 0 },
    ]

    currentMonthTransactions.forEach((t) => {
      const d = t.date?.toDate ? t.date.toDate() : new Date(t.date)
      const day = d.getDate()
      const val = Number(t.amount) || 0
      const isIncome = t.type === "income" || t.type === "entrada"
      const isExpense = t.type === "expense" || t.type === "saida"

      const targetWeek = weeks.find((w) => day >= w.range[0] && day <= w.range[1])
      if (targetWeek) {
        if (isIncome) targetWeek.entradas += val
        if (isExpense) targetWeek.saidas += val
      }
    })

    weeks.forEach((w) => {
      w.saldo = w.entradas - w.saidas
    })

    return weeks
  }, [currentMonthTransactions])

  // 2. Fluxo Acumulado no Mês Atual
  const cumulativeData = useMemo(() => {
    let runningEntradas = 0
    let runningSaidas = 0

    return weeklyData.map((w) => {
      runningEntradas += w.entradas
      runningSaidas += w.saidas
      return {
        name: w.name.split(" ")[0],
        entradas: runningEntradas,
        saidas: runningSaidas,
        saldo: runningEntradas - runningSaidas,
      }
    })
  }, [weeklyData])

  // 3. Top Categorias de Entradas vs Saídas no Mês
  const categoryData = useMemo(() => {
    const catMap: Record<string, { name: string; entradas: number; saidas: number }> = {}

    currentMonthTransactions.forEach((t) => {
      const cat = t.category || "Geral"
      const val = Number(t.amount) || 0
      const isIncome = t.type === "income" || t.type === "entrada"
      const isExpense = t.type === "expense" || t.type === "saida"

      if (!catMap[cat]) {
        catMap[cat] = { name: cat, entradas: 0, saidas: 0 }
      }

      if (isIncome) catMap[cat].entradas += val
      if (isExpense) catMap[cat].saidas += val
    })

    return Object.values(catMap)
      .sort((a, b) => b.entradas + b.saidas - (a.entradas + a.saidas))
      .slice(0, 6)
  }, [currentMonthTransactions])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(val)
  }

  // Custom Tooltip para o Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover text-popover-foreground p-3 rounded-xl shadow-lg border border-border text-xs space-y-1.5 min-w-[170px]">
          <p className="font-bold text-foreground border-b border-border/60 pb-1 flex items-center justify-between">
            <span>{label}</span>
            <span className="text-[10px] text-muted-foreground">{monthName}</span>
          </p>
          {payload.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-1.5 font-medium" style={{ color: item.color }}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                {item.name}:
              </span>
              <span className="font-bold font-mono">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="shadow-sm border border-border/80 dark:border-border/60 overflow-hidden bg-card">
      <CardHeader className="pb-3 border-b border-border/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <BarChart3 className="h-4 w-4" />
              </div>
              <CardTitle className="text-lg font-bold text-foreground">
                Resumo de Entradas & Saídas — {monthName} de {currentYear}
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground mt-0.5">
              Comparativo gráfico visual de arrecadações e despesas do mês corrente via Recharts
            </CardDescription>
          </div>

          {/* Seletor de Modo de Visualização */}
          <div className="flex items-center bg-muted/70 p-1 rounded-xl border border-border/60 text-xs self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("semanal")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "semanal"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Semanal
            </button>
            <button
              type="button"
              onClick={() => setViewMode("acumulado")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "acumulado"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Fluxo Acumulado
            </button>
            <button
              type="button"
              onClick={() => setViewMode("categorias")}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                viewMode === "categorias"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Categorias
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-5">
        {/* Painel de Métricas Rápidas do Mês Atual */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Card Entradas */}
          <div className="p-3.5 rounded-xl border border-emerald-200/80 dark:border-emerald-950/60 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" /> Entradas do Mês
              </span>
              <div className="text-lg font-bold text-emerald-950 dark:text-emerald-100 font-mono">
                {formatCurrency(totalEntradas)}
              </div>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                {countEntradas} arrecadações registradas
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>

          {/* Card Saídas */}
          <div className="p-3.5 rounded-xl border border-rose-200/80 dark:border-rose-950/60 bg-rose-50/40 dark:bg-rose-950/20 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1">
                <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" /> Saídas do Mês
              </span>
              <div className="text-lg font-bold text-rose-950 dark:text-rose-100 font-mono">
                {formatCurrency(totalSaidas)}
              </div>
              <span className="text-[10px] text-rose-700 dark:text-rose-400">
                {countSaidas} despesas registradas
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>

          {/* Card Saldo Líquido */}
          <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-primary uppercase tracking-wider flex items-center gap-1">
                <Wallet className="h-3.5 w-3.5" /> Saldo Líquido ({monthName})
              </span>
              <div
                className={`text-lg font-bold font-mono ${
                  saldoMes >= 0 ? "text-primary" : "text-rose-600"
                }`}
              >
                {formatCurrency(saldoMes)}
              </div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Percent className="h-3 w-3" />
                Retenção: <strong>{margemRetencao}%</strong> da arrecadação
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* GRÁFICOS RECHARTS VISUAIS */}
        <div className="h-[280px] w-full pt-1">
          {currentMonthTransactions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-border rounded-xl">
              <Calendar className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm font-semibold text-foreground">
                Nenhuma movimentação financeira neste mês ({monthName})
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Os gráficos visuais serão exibidos automaticamente assim que entradas ou saídas forem lançadas.
              </p>
            </div>
          ) : viewMode === "semanal" ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={weeklyData}
                margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
                barGap={6}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  fontSize={11}
                  fontWeight={500}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={30}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px", fontWeight: 600 }}
                />
                <Bar
                  name="Entradas (Receitas)"
                  dataKey="entradas"
                  fill="#10b981"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={38}
                />
                <Bar
                  name="Saídas (Despesas)"
                  dataKey="saidas"
                  fill="#f43f5e"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={38}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : viewMode === "acumulado" ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={cumulativeData}
                margin={{ top: 10, right: 15, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.25} />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                  fontSize={11}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={30}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px", fontWeight: 600 }}
                />
                <Area
                  type="monotone"
                  name="Entradas Acumuladas"
                  dataKey="entradas"
                  fill="#10b981"
                  fillOpacity={0.15}
                  stroke="#10b981"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  name="Saídas Acumuladas"
                  dataKey="saidas"
                  fill="#f43f5e"
                  fillOpacity={0.12}
                  stroke="#f43f5e"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  name="Saldo Acumulado"
                  dataKey="saldo"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#6366f1" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.25} />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  fontSize={10}
                  tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  width={110}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={30}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px", fontWeight: 600 }}
                />
                <Bar
                  name="Entradas"
                  dataKey="entradas"
                  fill="#10b981"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={16}
                />
                <Bar
                  name="Saídas"
                  dataKey="saidas"
                  fill="#f43f5e"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={16}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
