import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  ChevronRight,
  Activity,
  Calendar,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useBranch } from "@/contexts/BranchContext";
import { matchesBranch, isSedeBranch } from "@/lib/branchUtils";
import { parseFirestoreDate } from "@/lib/dateUtils";

interface SummaryCardsProps {
  activeBranch?: string;
  className?: string;
}

export function SummaryCards({ activeBranch: propActiveBranch, className = "" }: SummaryCardsProps) {
  const navigate = useNavigate();
  const { activeBranch: contextActiveBranch, branches, activeBranchName } = useBranch();
  const activeBranch = propActiveBranch || contextActiveBranch;

  const [isLoading, setIsLoading] = useState(true);
  const [members, setMembers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());

  // Real-time Firestore Listeners
  useEffect(() => {
    setIsLoading(true);
    let unsubs: (() => void)[] = [];

    const isSede = isSedeBranch(activeBranch, branches);
    const shouldFilterBranch = activeBranch && activeBranch !== "all" && !isSede;

    // 1. Members real-time listener
    try {
      const membersQuery = shouldFilterBranch
        ? query(collection(db, "members"), where("branchId", "==", activeBranch))
        : collection(db, "members");

      const unsubMembers = onSnapshot(
        membersQuery,
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setMembers(docs);
          setLastSyncTime(new Date());
          setIsLoading(false);
        },
        (err) => {
          console.warn("SummaryCards members listener error, falling back to cache:", err);
          try {
            const saved = localStorage.getItem("churchMembers");
            if (saved) setMembers(JSON.parse(saved));
          } catch {}
          setIsLoading(false);
        }
      );
      unsubs.push(unsubMembers);
    } catch {
      setIsLoading(false);
    }

    // 2. Transactions real-time listener
    try {
      const transQuery = shouldFilterBranch
        ? query(collection(db, "transactions"), where("branchId", "==", activeBranch))
        : collection(db, "transactions");

      const unsubTrans = onSnapshot(
        transQuery,
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setTransactions(docs);
          setLastSyncTime(new Date());
        },
        (err) => {
          console.warn("SummaryCards transactions listener error, falling back to cache:", err);
          try {
            const saved = localStorage.getItem("churchTransactions");
            if (saved) setTransactions(JSON.parse(saved));
          } catch {}
        }
      );
      unsubs.push(unsubTrans);
    } catch {}

    // 3. Events / Tasks real-time listener
    try {
      const eventsQuery = shouldFilterBranch
        ? query(collection(db, "events"), where("branchId", "==", activeBranch))
        : collection(db, "events");

      const unsubEvents = onSnapshot(
        eventsQuery,
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setEvents(docs);
          setLastSyncTime(new Date());
        },
        (err) => {
          console.warn("SummaryCards events listener error:", err);
        }
      );
      unsubs.push(unsubEvents);
    } catch {}

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [activeBranch, branches]);

  // Calculations scoped to branch
  const metrics = useMemo(() => {
    const branchMembers = members.filter((m) => matchesBranch(m, activeBranch, branches));
    const branchTransactions = transactions.filter((t) => matchesBranch(t, activeBranch, branches));
    const branchEvents = events.filter((e) => matchesBranch(e, activeBranch, branches));

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentYearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1);
    const prevYearMonth = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, "0")}`;

    // --- 1. MEMBERS METRICS ---
    const totalMembers = branchMembers.length;
    const activeMembers = branchMembers.filter((m) => {
      const st = (m.status || "ativo").toLowerCase();
      return st === "ativo";
    }).length;

    const newMembersThisMonth = branchMembers.filter((m) => {
      if (!m.createdAt) return false;
      try {
        const d = m.createdAt.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      } catch {
        return false;
      }
    }).length;

    const memberActiveRatio = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 100;

    // --- 2. CURRENT MONTH'S REVENUE ---
    const thisMonthTxs = branchTransactions.filter((t) => t.date && t.date.startsWith(currentYearMonth));
    const prevMonthTxs = branchTransactions.filter((t) => t.date && t.date.startsWith(prevYearMonth));

    const revenuesThisMonth = thisMonthTxs
      .filter((t) => t.type === "entrada" || t.type === "income")
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const revenuesPrevMonth = prevMonthTxs
      .filter((t) => t.type === "entrada" || t.type === "income")
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const revenueGrowth = revenuesPrevMonth > 0
      ? ((revenuesThisMonth - revenuesPrevMonth) / revenuesPrevMonth) * 100
      : 0;

    const dizimosAmount = thisMonthTxs
      .filter(
        (t) =>
          (t.type === "entrada" || t.type === "income") &&
          (t.category || "").toLowerCase().includes("dízimo")
      )
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    const ofertasAmount = thisMonthTxs
      .filter(
        (t) =>
          (t.type === "entrada" || t.type === "income") &&
          (t.category || "").toLowerCase().includes("oferta")
      )
      .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    // --- 3. PENDING TASKS & BILLS ---
    // Pending bills to pay
    const pendingBillsToPay = branchTransactions.filter(
      (t) => (t.type === "saida" || t.type === "expense") && t.status === "Pendente"
    );
    const pendingToPayAmount = pendingBillsToPay.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    // Pending bills to receive
    const pendingBillsToReceive = branchTransactions.filter(
      (t) => (t.type === "entrada" || t.type === "income") && t.status === "Pendente"
    );
    const pendingToReceiveAmount = pendingBillsToReceive.reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

    // Check overdue bills
    const todayStr = now.toISOString().split("T")[0];
    const overdueBillsCount = pendingBillsToPay.filter((t) => {
      const dueDate = t.dueDate || t.date;
      return dueDate && dueDate < todayStr;
    }).length;

    // Upcoming agenda commitments in the next 7 days
    const upcomingEventsCount = branchEvents.filter((e) => {
      const d = parseFirestoreDate(e.start);
      const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 7;
    }).length;

    const totalPendingTasks = pendingBillsToPay.length + pendingBillsToReceive.length + (overdueBillsCount > 0 ? 1 : 0);

    return {
      totalMembers,
      activeMembers,
      newMembersThisMonth,
      memberActiveRatio,
      revenuesThisMonth,
      revenueGrowth,
      dizimosAmount,
      ofertasAmount,
      pendingBillsToPayCount: pendingBillsToPay.length,
      pendingToPayAmount,
      pendingBillsToReceiveCount: pendingBillsToReceive.length,
      pendingToReceiveAmount,
      overdueBillsCount,
      upcomingEventsCount,
      totalPendingTasks
    };
  }, [members, transactions, events, activeBranch, branches]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(val);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Real-time sync sub-header */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            Sincronização em Tempo Real (Firestore)
            <span className="text-[11px] text-muted-foreground/70 hidden sm:inline">
              • {activeBranchName}
            </span>
          </span>
        </div>
        <div className="text-[11px] text-muted-foreground/60 hidden sm:block">
          Atualizado às {lastSyncTime.toLocaleTimeString("pt-BR")}
        </div>
      </div>

      {/* 3 Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD 1: TOTAL DE MEMBROS */}
        <Card className="relative overflow-hidden border border-border/70 hover:border-blue-500/50 transition-all duration-300 shadow-xs hover:shadow-md bg-gradient-to-br from-card via-card to-blue-50/20 dark:to-blue-950/20 group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  Total de Membros
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight text-foreground">
                    {metrics.totalMembers}
                  </span>
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border-blue-200 dark:border-blue-800 text-[10px] font-semibold"
                  >
                    {metrics.memberActiveRatio}% ativos
                  </Badge>
                </div>
              </div>

              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/10 to-indigo-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
            </div>

            {/* Sub-metrics */}
            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <UserPlus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>
                  <strong className="text-foreground font-semibold">+{metrics.newMembersThisMonth}</strong> novos este mês
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/secretaria")}
                className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/60 font-medium"
              >
                Secretaria <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CARD 2: RECEITAS DO MÊS ATUAL (REVENUE) */}
        <Card className="relative overflow-hidden border border-border/70 hover:border-emerald-500/50 transition-all duration-300 shadow-xs hover:shadow-md bg-gradient-to-br from-card via-card to-emerald-50/20 dark:to-emerald-950/20 group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Receitas do Mês Atual
                </span>
                <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                  <span className="text-3xl font-black tracking-tight text-foreground">
                    {formatCurrency(metrics.revenuesThisMonth)}
                  </span>
                  {metrics.revenueGrowth !== 0 && (
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-semibold flex items-center gap-0.5 ${
                        metrics.revenueGrowth > 0
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200"
                          : "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200"
                      }`}
                    >
                      {metrics.revenueGrowth > 0 ? (
                        <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 text-rose-600" />
                      )}
                      {Math.abs(metrics.revenueGrowth).toFixed(1)}% vs anterior
                    </Badge>
                  )}
                </div>
              </div>

              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>

            {/* Sub-metrics */}
            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
              <div className="text-muted-foreground truncate">
                <span>Dízimos: <strong className="text-foreground">{formatCurrency(metrics.dizimosAmount)}</strong></span>
                <span className="mx-1.5">•</span>
                <span>Ofertas: <strong className="text-foreground">{formatCurrency(metrics.ofertasAmount)}</strong></span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/financeiro")}
                className="h-7 px-2 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 font-medium shrink-0 ml-2"
              >
                Caixa <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: TAREFAS & PENDÊNCIAS */}
        <Card className="relative overflow-hidden border border-border/70 hover:border-amber-500/50 transition-all duration-300 shadow-xs hover:shadow-md bg-gradient-to-br from-card via-card to-amber-50/20 dark:to-amber-950/20 group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Tarefas & Pendências
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight text-foreground">
                    {metrics.totalPendingTasks}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">itens pendentes</span>
                  {metrics.overdueBillsCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="text-[10px] font-bold animate-pulse px-1.5 py-0.5"
                    >
                      {metrics.overdueBillsCount} atrasada(s)
                    </Badge>
                  )}
                </div>
              </div>

              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/10 to-rose-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                {metrics.overdueBillsCount > 0 ? (
                  <AlertTriangle className="w-6 h-6 text-rose-500" />
                ) : (
                  <Clock className="w-6 h-6" />
                )}
              </div>
            </div>

            {/* Sub-metrics */}
            <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-muted-foreground truncate">
                <span>
                  A pagar: <strong className="text-rose-600 dark:text-rose-400">{formatCurrency(metrics.pendingToPayAmount)}</strong>
                </span>
                {metrics.upcomingEventsCount > 0 && (
                  <>
                    <span>•</span>
                    <span><strong className="text-foreground">{metrics.upcomingEventsCount}</strong> eventos prox.</span>
                  </>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/financeiro", { state: { activeTab: "fluxo" } })}
                className="h-7 px-2 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/60 font-medium shrink-0 ml-2"
              >
                Gerenciar <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
