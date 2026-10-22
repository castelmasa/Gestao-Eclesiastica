import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  ResponsiveContainer, 
  ComposedChart,
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ReferenceLine
} from "recharts"
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Building2 
} from "lucide-react"
import { matchesBranch } from "@/lib/branchUtils"
import { useBranch } from "@/contexts/BranchContext"
import { cn } from "@/lib/utils"

interface Transaction {
  id: string
  amount: number
  type: string
  date: any
  category?: string
  branchId?: string
}

interface RevenueEvolutionChartProps {
  transactions: Transaction[]
  activeBranch?: string
}

export function RevenueEvolutionChart({
  transactions,
  activeBranch: propActiveBranch
}: RevenueEvolutionChartProps) {
  const { activeBranch: contextActiveBranch, branches, activeBranchName } = useBranch()
  const activeBranch = propActiveBranch || contextActiveBranch

  const [periodMonths, setPeriodMonths] = useState<number>(6) // 6 or 12 months
  const [chartMode, setChartMode] = useState<"composed" | "area" | "bar">("composed")

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

  const chartData = useMemo(() => {
    const today = new Date()
    const result = []

    // Build array for past N months
    for (let i = periodMonths - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()
      const label = `${monthNames[m]}/${String(y).slice(-2)}`

      result.push({
        monthIndex: m,
        year: y,
        label,
        receitas: 0,
        dizimos: 0,
        ofertas: 0,
        despesas: 0,
        saldo: 0
      })
    }

    transactions.forEach(t => {
      // Filtragem precisa por filial
      if (!matchesBranch(t, activeBranch, branches)) {
        return
      }

      if (!t.date) return
      let itemDate: Date
      if (t.date.toDate) {
        itemDate = t.date.toDate()
      } else if (typeof t.date === "string") {
        itemDate = new Date(t.date.includes("T") ? t.date : t.date + "T12:00:00")
      } else {
        itemDate = new Date(t.date)
      }

      if (isNaN(itemDate.getTime())) return

      const tMonth = itemDate.getMonth()
      const tYear = itemDate.getFullYear()

      const slot = result.find(r => r.monthIndex === tMonth && r.year === tYear)
      if (slot) {
        const val = Number(t.amount) || 0
        const isIncome = t.type === "income" || t.type === "entrada"
        const isExpense = t.type === "expense" || t.type === "saida"

        if (isIncome) {
          slot.receitas += val
          const cat = (t.category || "").toLowerCase()
          if (cat.includes("dízimo") || cat.includes("dizimo")) {
            slot.dizimos += val
          } else if (cat.includes("oferta")) {
            slot.ofertas += val
          }
        } else if (isExpense) {
          slot.despesas += val
        }
      }
    })

    // Calculate saldo for each month
    result.forEach(r => {
      r.saldo = r.receitas - r.despesas
    })

    return result
  }, [transactions, activeBranch, branches, periodMonths])

  // Summary statistics and Financial Health Diagnosis
  const stats = useMemo(() => {
    const totalReceitas = chartData.reduce((acc, curr) => acc + curr.receitas, 0)
    const totalDespesas = chartData.reduce((acc, curr) => acc + curr.despesas, 0)
    const saldoLiquido = totalReceitas - totalDespesas
    const mediaMensalReceitas = chartData.length > 0 ? totalReceitas / chartData.length : 0
    const mediaMensalDespesas = chartData.length > 0 ? totalDespesas / chartData.length : 0

    // Margem Líquida (%)
    const margemLiquida = totalReceitas > 0 ? (saldoLiquido / totalReceitas) * 100 : 0
    // Taxa de Comprometimento de Despesas (%)
    const taxaComprometimento = totalReceitas > 0 ? (totalDespesas / totalReceitas) * 100 : (totalDespesas > 0 ? 100 : 0)

    // Diagnóstico da Saúde Financeira
    let statusLabel = "Estável"
    let statusColor = "text-blue-600 bg-blue-500/10 border-blue-500/20"
    let statusIcon = Activity
    let statusDesc = "Equilíbrio entre arrecadação e custos"

    if (totalReceitas === 0 && totalDespesas === 0) {
      statusLabel = "Sem Lançamentos"
      statusColor = "text-muted-foreground bg-muted border-border"
      statusIcon = Activity
      statusDesc = "Nenhuma movimentação no período"
    } else if (saldoLiquido < 0) {
      statusLabel = "Déficit Operacional"
      statusColor = "text-rose-600 bg-rose-500/10 border-rose-500/20"
      statusIcon = ShieldAlert
      statusDesc = "Despesas superaram as receitas"
    } else if (margemLiquida >= 20) {
      statusLabel = "Saúde Excelente"
      statusColor = "text-emerald-600 bg-emerald-500/10 border-emerald-500/20"
      statusIcon = CheckCircle2
      statusDesc = "Superávit expressivo (>20%)"
    } else if (margemLiquida >= 5) {
      statusLabel = "Saúde Positiva"
      statusColor = "text-blue-600 bg-blue-500/10 border-blue-500/20"
      statusIcon = TrendingUp
      statusDesc = "Contas em dia com margem segura"
    } else {
      statusLabel = "Ponto de Equilíbrio"
      statusColor = "text-amber-600 bg-amber-500/10 border-amber-500/20"
      statusIcon = AlertTriangle
      statusDesc = "Margem estreita (0 a 5%)"
    }

    return { 
      totalReceitas, 
      totalDespesas, 
      saldoLiquido, 
      mediaMensalReceitas, 
      mediaMensalDespesas, 
      margemLiquida,
      taxaComprometimento,
      statusLabel,
      statusColor,
      statusIcon,
      statusDesc
    }
  }, [chartData])

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(val)
  }

  const StatusIconComponent = stats.statusIcon

  return (
    <Card className="border-border/80 shadow-xs flex flex-col justify-between w-full min-w-0 overflow-hidden">
      <CardHeader className="p-3.5 sm:p-5 pb-2.5 sm:pb-3 space-y-2">
        {/* Linha 1: Título e Identificação da Igreja */}
        <div className="flex items-center justify-between gap-1.5 min-w-0 w-full">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <CardTitle className="text-sm sm:text-base font-bold text-foreground truncate">
              Receitas vs Despesas
            </CardTitle>
          </div>
          
          <Badge 
            variant="outline" 
            className="text-[10px] sm:text-[11px] font-medium whitespace-nowrap shrink-0 gap-1 items-center px-2 py-0.5 border-border/80 bg-muted/30 max-w-[120px] sm:max-w-[170px]"
          >
            <Building2 className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary shrink-0" />
            <span className="truncate">{activeBranchName}</span>
          </Badge>
        </div>

        {/* Linha 2: Subtítulo e Controles alinhados responsivamente */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/40 w-full min-w-0">
          <CardDescription className="text-xs text-muted-foreground truncate">
            Evolução mensal e demonstrativo financeiro
          </CardDescription>

          <div className="flex items-center gap-1.5 flex-wrap w-full sm:w-auto justify-between sm:justify-start">
            {/* Seletor de Período */}
            <div className="inline-flex bg-muted/80 p-0.5 rounded-lg text-xs font-medium shrink-0">
              <button
                type="button"
                onClick={() => setPeriodMonths(6)}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-all text-[11px] sm:text-xs font-semibold whitespace-nowrap",
                  periodMonths === 6 
                    ? "bg-card text-foreground shadow-2xs font-bold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                6 Meses
              </button>
              <button
                type="button"
                onClick={() => setPeriodMonths(12)}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-all text-[11px] sm:text-xs font-semibold whitespace-nowrap",
                  periodMonths === 12 
                    ? "bg-card text-foreground shadow-2xs font-bold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                12 Meses
              </button>
            </div>

            {/* Seletor de Tipo de Gráfico */}
            <div className="inline-flex bg-muted/80 p-0.5 rounded-lg text-xs font-medium shrink-0">
              <button
                type="button"
                onClick={() => setChartMode("composed")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-all text-[11px] sm:text-xs font-semibold whitespace-nowrap",
                  chartMode === "composed" 
                    ? "bg-card text-foreground shadow-2xs font-bold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Barras com Linha de Saldo"
              >
                Misto
              </button>
              <button
                type="button"
                onClick={() => setChartMode("area")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-all text-[11px] sm:text-xs font-semibold whitespace-nowrap",
                  chartMode === "area" 
                    ? "bg-card text-foreground shadow-2xs font-bold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Área com Gradiente"
              >
                Área
              </button>
              <button
                type="button"
                onClick={() => setChartMode("bar")}
                className={cn(
                  "px-2 py-0.5 rounded-md transition-all text-[11px] sm:text-xs font-semibold whitespace-nowrap",
                  chartMode === "bar" 
                    ? "bg-card text-foreground shadow-2xs font-bold" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Barras Lado a Lado"
              >
                Barras
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3.5 sm:p-5 pt-0 space-y-3 sm:space-y-4 w-full min-w-0">
        {/* Painel de Saúde Financeira & KPIs: 2 colunas perfeitamente equilibradas */}
        <div className="grid grid-cols-2 gap-2 sm:gap-2.5 w-full min-w-0">
          {/* Card 1: Receitas */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 flex flex-col justify-between min-w-0 overflow-hidden">
            <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider truncate">
              Receitas ({periodMonths}m)
            </span>
            <div className="text-sm sm:text-lg font-black text-emerald-900 dark:text-emerald-200 my-0.5 whitespace-nowrap truncate">
              {formatCurrency(stats.totalReceitas)}
            </div>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
              Média: {formatCurrency(stats.mediaMensalReceitas)}/mês
            </span>
          </div>

          {/* Card 2: Despesas */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 border border-rose-200/70 dark:border-rose-900/50 flex flex-col justify-between min-w-0 overflow-hidden">
            <span className="text-[10px] font-bold uppercase text-rose-700 dark:text-rose-400 tracking-wider truncate">
              Despesas ({periodMonths}m)
            </span>
            <div className="text-sm sm:text-lg font-black text-rose-900 dark:text-rose-200 my-0.5 whitespace-nowrap truncate">
              {formatCurrency(stats.totalDespesas)}
            </div>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
              Comprometimento: {stats.taxaComprometimento.toFixed(0)}%
            </span>
          </div>

          {/* Card 3: Saldo Líquido */}
          <div className="p-2 sm:p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 flex flex-col justify-between min-w-0 overflow-hidden">
            <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400 tracking-wider truncate">
              Saldo Líquido
            </span>
            <div className={cn(
              "text-sm sm:text-lg font-black my-0.5 whitespace-nowrap truncate",
              stats.saldoLiquido >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"
            )}>
              {formatCurrency(stats.saldoLiquido)}
            </div>
            <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
              Margem: {stats.margemLiquida.toFixed(1)}%
            </span>
          </div>

          {/* Card 4: Termômetro de Saúde Financeira */}
          <div className={cn(
            "p-2 sm:p-2.5 rounded-xl border flex flex-col justify-between min-w-0 overflow-hidden",
            stats.statusColor
          )}>
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider truncate">
                Saúde Financeira
              </span>
              <StatusIconComponent className="w-3.5 h-3.5 shrink-0" />
            </div>
            <div className="text-xs sm:text-sm font-black my-0.5 truncate">
              {stats.statusLabel}
            </div>
            <p className="text-[9px] sm:text-[10px] opacity-90 truncate leading-tight">
              {stats.statusDesc}
            </p>
          </div>
        </div>

        {/* Recharts Visualizer */}
        <div className="h-[240px] sm:h-[270px] w-full min-w-0 overflow-hidden pt-1">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            {chartMode === "composed" ? (
              <ComposedChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  width={36}
                  tickFormatter={val => val === 0 ? "0" : `R$${Math.abs(val) >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} 
                  tick={{ fontSize: 10 }} 
                />
                <Tooltip 
                  formatter={(val: number, name: string) => [
                    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val), 
                    name
                  ]}
                  contentStyle={{ 
                    backgroundColor: "rgba(15, 23, 42, 0.95)", 
                    borderColor: "rgba(255,255,255,0.15)", 
                    borderRadius: "10px", 
                    color: "#fff", 
                    fontSize: "11px",
                    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
                  }}
                />
                <Legend verticalAlign="top" height={26} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />
                <Bar name="Receitas" dataKey="receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar name="Despesas" dataKey="despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Line 
                  type="monotone" 
                  name="Saldo Líquido" 
                  dataKey="saldo" 
                  stroke="#3b82f6" 
                  strokeWidth={2.5} 
                  dot={{ r: 3, fill: "#3b82f6", strokeWidth: 1.5, stroke: "#fff" }} 
                  activeDot={{ r: 4.5 }} 
                />
              </ComposedChart>
            ) : chartMode === "area" ? (
              <AreaChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.7}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  width={36}
                  tickFormatter={val => val === 0 ? "0" : `R$${Math.abs(val) >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} 
                  tick={{ fontSize: 10 }} 
                />
                <Tooltip 
                  formatter={(val: number, name: string) => [
                    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val), 
                    name
                  ]}
                  contentStyle={{ 
                    backgroundColor: "rgba(15, 23, 42, 0.95)", 
                    borderColor: "rgba(255,255,255,0.15)", 
                    borderRadius: "10px", 
                    color: "#fff", 
                    fontSize: "11px" 
                  }}
                />
                <Legend verticalAlign="top" height={26} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />
                <Area type="monotone" name="Receitas" dataKey="receitas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorReceitas)" />
                <Area type="monotone" name="Despesas" dataKey="despesas" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorDespesas)" />
                <Area type="monotone" name="Saldo Líquido" dataKey="saldo" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSaldo)" />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  width={36}
                  tickFormatter={val => val === 0 ? "0" : `R$${Math.abs(val) >= 1000 ? (val/1000).toFixed(0) + 'k' : val}`} 
                  tick={{ fontSize: 10 }} 
                />
                <Tooltip 
                  formatter={(val: number, name: string) => [
                    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val), 
                    name
                  ]}
                  contentStyle={{ 
                    backgroundColor: "rgba(15, 23, 42, 0.95)", 
                    borderColor: "rgba(255,255,255,0.15)", 
                    borderRadius: "10px", 
                    color: "#fff", 
                    fontSize: "11px" 
                  }}
                />
                <Legend verticalAlign="top" height={26} iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="2 2" />
                <Bar name="Receitas" dataKey="receitas" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar name="Despesas" dataKey="despesas" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
