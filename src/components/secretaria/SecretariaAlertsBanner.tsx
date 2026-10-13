import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Cake, AlertTriangle, Clock, Calendar, CheckCircle2, Phone, MessageSquare, ChevronDown, ChevronUp, ArrowRight, ShieldAlert, Sparkles, ExternalLink } from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

interface Member {
  id: string
  name: string
  birthDate?: string
  phone?: string
  role?: string
  branchId?: string
}

interface Transaction {
  id: string
  description: string
  amount: number
  type: string
  date?: string
  dueDate?: string
  status?: string
  category?: string
  supplier?: string
  branchId?: string
}

interface SecretariaAlertsBannerProps {
  members: Member[]
  transactions?: Transaction[]
  onOpenMember?: (memberId: string) => void
}

export function SecretariaAlertsBanner({
  members,
  transactions = [],
  onOpenMember
}: SecretariaAlertsBannerProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState<"aniversariantes" | "vencimentos">("aniversariantes")

  const today = new Date()
  const currentMonth = today.getMonth()
  const currentDay = today.getDate()

  // 1. Calculate Birthdays for the Month
  const birthdaysData = useMemo(() => {
    const list = members.filter(m => {
      if (!m.birthDate) return false
      try {
        const parts = m.birthDate.split("-")
        if (parts.length < 3) return false
        const mMonth = parseInt(parts[1], 10) - 1
        return mMonth === currentMonth
      } catch {
        return false
      }
    }).map(m => {
      const parts = m.birthDate!.split("-")
      const day = parseInt(parts[2], 10)
      const isToday = day === currentDay
      const isPast = day < currentDay
      return {
        ...m,
        day,
        isToday,
        isPast,
        daysUntil: isToday ? 0 : day - currentDay
      }
    }).sort((a, b) => a.day - b.day)

    const todayCount = list.filter(m => m.isToday).length
    const upcomingCount = list.filter(m => m.day >= currentDay).length

    return { list, todayCount, upcomingCount, totalMonth: list.length }
  }, [members, currentMonth, currentDay])

  // 2. Calculate Pending Installments and Contracts
  const pendingBillsData = useMemo(() => {
    const todayStr = today.toISOString().split("T")[0]
    const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    const list = transactions.filter(t => {
      const isExpense = t.type === "expense" || t.type === "saida"
      const isPending = t.status === "Pendente" || t.status === "pendente" || !t.status
      return isExpense && isPending
    }).map(t => {
      const d = t.dueDate || t.date || todayStr
      const targetDate = d.split("T")[0]
      const isOverdue = targetDate < todayStr
      const isToday = targetDate === todayStr
      const isUpcoming7Days = targetDate > todayStr && targetDate <= sevenDaysFromNow

      return {
        ...t,
        targetDate,
        isOverdue,
        isToday,
        isUpcoming7Days
      }
    }).sort((a, b) => a.targetDate.localeCompare(b.targetDate))

    const overdueCount = list.filter(t => t.isOverdue).length
    const todayCount = list.filter(t => t.isToday).length
    const upcomingCount = list.filter(t => t.isUpcoming7Days).length
    const totalPendingAmount = list.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)

    return { list, overdueCount, todayCount, upcomingCount, totalPendingAmount, totalCount: list.length }
  }, [transactions, today])

  const totalAlerts = birthdaysData.upcomingCount + pendingBillsData.overdueCount + pendingBillsData.todayCount

  const handleSendWhatsApp = (member: Member) => {
    if (!member.phone) {
      toast.error(`Membro ${member.name} não possui telefone cadastrado.`)
      return
    }
    const cleanPhone = member.phone.replace(/\D/g, "")
    const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone
    const message = encodeURIComponent(
      `A Paz do Senhor, querido(a) ${member.name}! A liderança e a secretaria da Igreja O Brasil para Cristo (2ª Congregação) desejam um Feliz Aniversário abençoado! Que as ricas bênçãos do Senhor estejam sobre você e sua família. "O Senhor te abençoe e te guarde!" (Números 6:24)`
    )
    const pref = localStorage.getItem("whatsappPreferredMode") || "app"
    if (pref === "app") {
      window.location.href = `whatsapp://send?phone=${fullPhone}&text=${message}`
      toast.success(`Abrindo WhatsApp para enviar parabéns a ${member.name}!`)
    } else {
      window.open(`https://web.whatsapp.com/send?phone=${fullPhone}?text=${message}`, "_blank")
      toast.success(`Abrindo WhatsApp Web com parabéns pronto!`)
    }
  }

  return (
    <Card className="border-border/80 shadow-sm bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-purple-50/50 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 overflow-hidden">
      <CardHeader className="py-3 px-4 sm:px-6 flex flex-row items-center justify-between border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                Central de Alertas da Secretaria
              </CardTitle>
              {totalAlerts > 0 && (
                <Badge variant="secondary" className="bg-blue-600 text-white font-bold text-xs h-5 px-1.5">
                  {totalAlerts} {totalAlerts === 1 ? "aviso ativo" : "avisos ativos"}
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              Acompanhamento de aniversariantes do mês e vencimentos de parcelas e contratos
            </CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Tabs toggle */}
          <div className="bg-white/80 dark:bg-slate-800/80 p-0.5 rounded-lg border border-border/60 hidden sm:flex text-xs font-semibold">
            <button
              onClick={() => { setActiveTab("aniversariantes"); setIsExpanded(true) }}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "aniversariantes" 
                  ? "bg-blue-600 text-white shadow-xs" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Cake className="w-3.5 h-3.5" />
              Aniversários ({birthdaysData.totalMonth})
            </button>
            <button
              onClick={() => { setActiveTab("vencimentos"); setIsExpanded(true) }}
              className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 ${
                activeTab === "vencimentos" 
                  ? "bg-amber-600 text-white shadow-xs" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Vencimentos ({pendingBillsData.totalCount})
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>

      {/* Mobile subtabs */}
      <div className="sm:hidden px-4 pt-2 flex gap-2 border-b border-border/50 text-xs">
        <button
          onClick={() => setActiveTab("aniversariantes")}
          className={`flex-1 py-1.5 text-center font-bold border-b-2 ${
            activeTab === "aniversariantes" ? "border-blue-600 text-blue-600" : "border-transparent text-muted-foreground"
          }`}
        >
          Aniversários ({birthdaysData.totalMonth})
        </button>
        <button
          onClick={() => setActiveTab("vencimentos")}
          className={`flex-1 py-1.5 text-center font-bold border-b-2 ${
            activeTab === "vencimentos" ? "border-amber-600 text-amber-600" : "border-transparent text-muted-foreground"
          }`}
        >
          Vencimentos ({pendingBillsData.totalCount})
        </button>
      </div>

      {isExpanded && (
        <CardContent className="p-4 sm:p-5">
          {activeTab === "aniversariantes" ? (
            /* 1. Aniversariantes do Mês */
            <div>
              {birthdaysData.list.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground bg-white/40 dark:bg-slate-900/40 rounded-xl border border-dashed border-border">
                  Nenhum aniversariante cadastrado com data de nascimento neste mês.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {birthdaysData.todayCount > 0 ? (
                        <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                          🎉 {birthdaysData.todayCount} aniversariante(s) comemorando HOJE!
                        </span>
                      ) : (
                        `Total de ${birthdaysData.totalMonth} aniversariantes neste mês`
                      )}
                    </span>
                    <span>Mês {currentMonth + 1} / {today.getFullYear()}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {birthdaysData.list.map(m => {
                      return (
                        <div
                          key={m.id}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            m.isToday
                              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-xs"
                              : m.isPast
                              ? "bg-white/60 dark:bg-slate-900/60 border-border/70 opacity-80"
                              : "bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-900/60 shadow-xs"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center font-bold text-center shrink-0 border ${
                              m.isToday 
                                ? "bg-emerald-600 text-white border-emerald-700 animate-pulse" 
                                : m.isPast
                                ? "bg-muted text-muted-foreground border-border"
                                : "bg-blue-600 text-white border-blue-700"
                            }`}>
                              <span className="text-[9px] uppercase leading-none font-semibold">Dia</span>
                              <span className="text-sm font-extrabold leading-none mt-0.5">{m.day}</span>
                            </div>

                            <div className="min-w-0">
                              <h4 className="font-bold text-xs text-foreground truncate">
                                {m.name}
                              </h4>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {m.role || "Membro"} • {m.isToday ? (
                                  <strong className="text-emerald-600 dark:text-emerald-400 font-bold">É HOJE! 🎂</strong>
                                ) : m.daysUntil > 0 ? (
                                  `em ${m.daysUntil} dia(s)`
                                ) : (
                                  "já comemorou"
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {m.phone && (
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleSendWhatsApp(m)}
                                title="Enviar Parabéns no WhatsApp"
                                className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-300 dark:border-emerald-800"
                              >
                                <MessageSquare className="w-3.5 h-3.5" />
                              </Button>
                            )}

                            {onOpenMember && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => onOpenMember(m.id)}
                                title="Ver Ficha do Membro"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* 2. Vencimentos de Contratos e Parcelas Financeiras */
            <div>
              {pendingBillsData.list.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground bg-white/40 dark:bg-slate-900/40 rounded-xl border border-dashed border-border flex flex-col items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-2" />
                  <p className="font-semibold text-foreground">Tudo em dia!</p>
                  <p>Nenhuma conta, parcela ou contrato com pendência financeira de pagamento.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      {pendingBillsData.overdueCount > 0 && (
                        <Badge variant="destructive" className="font-bold">
                          {pendingBillsData.overdueCount} vencida(s)
                        </Badge>
                      )}
                      {pendingBillsData.todayCount > 0 && (
                        <Badge className="bg-amber-600 text-white font-bold">
                          {pendingBillsData.todayCount} vence hoje
                        </Badge>
                      )}
                      <span className="text-muted-foreground">
                        Total pendente: <strong className="text-foreground">R$ {pendingBillsData.totalPendingAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong>
                      </span>
                    </div>

                    <Link to="/financeiro" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 font-semibold inline-flex items-center gap-1 hover:underline">
                      Abrir Módulo Financeiro <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {pendingBillsData.list.slice(0, 6).map(t => {
                      const formattedDate = t.targetDate ? new Date(t.targetDate + "T12:00:00").toLocaleDateString("pt-BR") : "-"
                      return (
                        <div
                          key={t.id}
                          className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                            t.isOverdue
                              ? "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-900 shadow-xs"
                              : t.isToday
                              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-900 shadow-xs"
                              : "bg-white dark:bg-slate-900 border-border"
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              {t.isOverdue ? (
                                <span className="text-[10px] font-bold text-red-700 dark:text-red-400 uppercase">
                                  Vencida ({formattedDate})
                                </span>
                              ) : t.isToday ? (
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase">
                                  Vence Hoje
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                  Venc: {formattedDate}
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-xs text-foreground truncate mt-0.5">
                              {t.description || "Pagamento Pendente"}
                            </h4>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {t.supplier || t.category || "Despesa / Contrato"}
                            </p>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs font-black text-foreground">
                              R$ {Number(t.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </div>
                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 border-muted-foreground/30">
                              Pendente
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
