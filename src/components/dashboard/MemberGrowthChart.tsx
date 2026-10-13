import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts"
import { Users, UserPlus, Building2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBranch } from "@/contexts/BranchContext"

interface Member {
  id: string
  name: string
  status?: string
  role?: string
  createdAt?: any
  baptismDate?: string
  branchId?: string
}

interface MemberGrowthChartProps {
  members: Member[]
  activeBranch?: string
}

export function MemberGrowthChart({
  members,
  activeBranch: propActiveBranch
}: MemberGrowthChartProps) {
  const { activeBranch: contextActiveBranch, activeBranchName } = useBranch()
  const activeBranch = propActiveBranch || contextActiveBranch

  const [periodMonths, setPeriodMonths] = useState<number>(6) // 6 or 12 months

  const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]

  const filteredMembers = useMemo(() => {
    if (!activeBranch || activeBranch === "all") return members
    return members.filter(m => m.branchId === activeBranch)
  }, [members, activeBranch])

  const chartData = useMemo(() => {
    const today = new Date()
    const result = []

    // Build slots for past N months
    for (let i = periodMonths - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const m = d.getMonth()
      const y = d.getFullYear()
      const label = `${monthNames[m]}/${String(y).slice(-2)}`

      result.push({
        monthIndex: m,
        year: y,
        label,
        novosMembros: 0,
        totalAcumulado: 0
      })
    }

    // Distribute members into creation slots
    filteredMembers.forEach((member, index) => {
      let memberDate: Date | null = null

      if (member.createdAt) {
        if (member.createdAt.toDate) {
          memberDate = member.createdAt.toDate()
        } else if (typeof member.createdAt === "string") {
          memberDate = new Date(member.createdAt)
        }
      } else if (member.baptismDate) {
        memberDate = new Date(member.baptismDate)
      }

      if (!memberDate || isNaN(memberDate.getTime())) {
        memberDate = new Date(today.getFullYear(), today.getMonth() - (index % periodMonths), 15)
      }

      const mMonth = memberDate.getMonth()
      const mYear = memberDate.getFullYear()

      const slot = result.find(r => r.monthIndex === mMonth && r.year === mYear)
      if (slot) {
        slot.novosMembros += 1
      }
    })

    // Compute cumulative curve
    let runningTotal = Math.max(0, filteredMembers.length - result.reduce((acc, curr) => acc + curr.novosMembros, 0))
    result.forEach(r => {
      runningTotal += r.novosMembros
      r.totalAcumulado = runningTotal
    })

    return result
  }, [filteredMembers, periodMonths])

  // Summary statistics
  const stats = useMemo(() => {
    const totalMembros = filteredMembers.length
    const ativos = filteredMembers.filter(m => (m.status || "Ativo").toLowerCase() === "ativo").length
    const novosNoPeriodo = chartData.reduce((acc, curr) => acc + curr.novosMembros, 0)

    return { totalMembros, ativos, novosNoPeriodo }
  }, [filteredMembers, chartData])

  return (
    <Card className="border-border/80 shadow-xs flex flex-col justify-between">
      <CardHeader className="pb-3 space-y-2.5">
        {/* Linha 1: Título e Identificação da Igreja */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <CardTitle className="text-base font-bold text-foreground truncate">
              Crescimento de Membros
            </CardTitle>
          </div>
          
          <Badge 
            variant="outline" 
            className="text-[11px] font-medium whitespace-nowrap shrink-0 gap-1.5 items-center px-2.5 py-0.5 border-border/80 bg-muted/30"
          >
            <Building2 className="w-3 h-3 text-primary shrink-0" />
            <span className="truncate max-w-[130px]">{activeBranchName}</span>
          </Badge>
        </div>

        {/* Linha 2: Subtítulo e Período */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-border/40">
          <CardDescription className="text-xs text-muted-foreground truncate">
            Novos membros e taxa de crescimento
          </CardDescription>

          <div className="inline-flex bg-muted/80 p-0.5 rounded-lg text-xs font-medium self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setPeriodMonths(6)}
              className={cn(
                "px-2.5 py-0.5 rounded-md transition-all text-xs font-semibold whitespace-nowrap",
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
                "px-2.5 py-0.5 rounded-md transition-all text-xs font-semibold whitespace-nowrap",
                periodMonths === 12 
                  ? "bg-card text-foreground shadow-2xs font-bold" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              12 Meses
            </button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* KPI Strip: 3 colunas proporcionais com min-w-0 */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
          <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 flex flex-col justify-between min-w-0">
            <span className="text-[10px] font-bold uppercase text-blue-700 dark:text-blue-400 tracking-wider truncate">
              Membros Ativos
            </span>
            <div className="text-base sm:text-lg font-black text-blue-900 dark:text-blue-200 my-0.5 whitespace-nowrap truncate">
              {stats.ativos}
            </div>
            <span className="text-[11px] text-muted-foreground truncate">
              Total: {stats.totalMembros}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 flex flex-col justify-between min-w-0">
            <span className="text-[10px] font-bold uppercase text-indigo-700 dark:text-indigo-400 tracking-wider truncate">
              Novos ({periodMonths}m)
            </span>
            <div className="text-base sm:text-lg font-black text-indigo-900 dark:text-indigo-200 my-0.5 flex items-center gap-1 whitespace-nowrap truncate">
              <UserPlus className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> +{stats.novosNoPeriodo}
            </div>
            <span className="text-[11px] text-muted-foreground truncate">
              No período
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/70 dark:border-emerald-900/50 flex flex-col justify-between min-w-0">
            <span className="text-[10px] font-bold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider truncate">
              Atividade
            </span>
            <div className="text-base sm:text-lg font-black text-emerald-900 dark:text-emerald-200 my-0.5 whitespace-nowrap truncate">
              {stats.totalMembros > 0 ? ((stats.ativos / stats.totalMembros) * 100).toFixed(0) : "100"}%
            </div>
            <span className="text-[11px] text-muted-foreground truncate">
              Engajamento
            </span>
          </div>
        </div>

        {/* Composite Chart View */}
        <div className="h-[270px] w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="left" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: "rgba(15, 23, 42, 0.95)", 
                  borderColor: "rgba(255,255,255,0.15)", 
                  borderRadius: "10px", 
                  color: "#fff", 
                  fontSize: "12px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)"
                }}
              />
              <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: "12px" }} />
              <Bar yAxisId="left" name="Novos Membros / Mês" dataKey="novosMembros" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} />
              <Line yAxisId="right" type="monotone" name="Total Acumulado" dataKey="totalAcumulado" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3.5, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 5 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
