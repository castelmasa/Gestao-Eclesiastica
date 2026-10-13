import { motion } from "motion/react";
import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Users, TrendingUp, TrendingDown, Target, Bell, Calendar, Wallet, Activity, Box, Loader2, Download, Maximize, Building2 } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { useBranch } from "@/contexts/BranchContext"
import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, where, getDocs } from "firebase/firestore"
import { parseFirestoreDate } from "@/lib/dateUtils";
import { matchesBranch, isSedeBranch } from "@/lib/branchUtils";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { FinancialSummaryCards } from "@/components/dashboard/FinancialSummaryCards";
import { PendingBillsAlerts } from "@/components/dashboard/PendingBillsAlerts";
import { BirthdaysCard } from "@/components/dashboard/BirthdaysCard";
import { RevenueEvolutionChart } from "@/components/dashboard/RevenueEvolutionChart";
import { MemberGrowthChart } from "@/components/dashboard/MemberGrowthChart";
import { MonthlyFinancialComparisonChart } from "@/components/dashboard/MonthlyFinancialComparisonChart";

export function Dashboard() {
  const { user } = useAuth();
  const { activeBranch, branches, activeBranchName } = useBranch();
  const [isLoading, setIsLoading] = useState(true);

  // States
  const [members, setMembers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    let unsubs: any[] = [];
    
    const isSede = isSedeBranch(activeBranch, branches);
    const shouldFilterBranch = activeBranch && activeBranch !== 'all' && !isSede;

    // Load Members query scoped to branch
    const membersQuery = shouldFilterBranch
      ? query(collection(db, 'members'), where('branchId', '==', activeBranch))
      : collection(db, 'members');

    const membersUnsub = onSnapshot(membersQuery, (snap) => {
      setMembers(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }, (error) => {
      console.warn("Dashboard members listener error, fallback to cache:", error);
      const saved = localStorage.getItem("churchMembers");
      if (saved) {
        try { setMembers(JSON.parse(saved)); } catch (e) {}
      }
    });
    unsubs.push(membersUnsub);

    // Load Transactions query scoped to branch
    const transQuery = shouldFilterBranch
      ? query(collection(db, 'transactions'), where('branchId', '==', activeBranch))
      : collection(db, 'transactions');

    const transUnsub = onSnapshot(transQuery, (snap) => {
      setTransactions(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }, (error) => {
      console.warn("Dashboard transactions listener error, fallback to cache:", error);
      const saved = localStorage.getItem("churchTransactions");
      if (saved) {
        try { setTransactions(JSON.parse(saved)); } catch (e) {}
      }
    });
    unsubs.push(transUnsub);

    // Load Events query scoped to branch
    const eventsQuery = shouldFilterBranch
      ? query(collection(db, 'events'), where('branchId', '==', activeBranch))
      : collection(db, 'events');

    const eventsUnsub = onSnapshot(eventsQuery, (snap) => {
      setEvents(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }, (error) => {
      console.warn("Dashboard events listener error:", error);
    });
    unsubs.push(eventsUnsub);

    setIsLoading(false);

    return () => unsubs.forEach(u => u());
  }, [user, activeBranch, branches]);

  // Filtering by branch strictly according to selected church
  const filteredMembers = useMemo(() => {
    return members.filter(m => matchesBranch(m, activeBranch, branches));
  }, [members, activeBranch, branches]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => matchesBranch(t, activeBranch, branches));
  }, [transactions, activeBranch, branches]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => matchesBranch(e, activeBranch, branches));
  }, [events, activeBranch, branches]);

  // Analytics Calculations
  const stats = useMemo(() => {
    const monthTrans = filteredTransactions.filter(t => {
      if (!t.date) return false;
      const d = t.date.toDate ? t.date.toDate() : new Date(t.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const receitas = monthTrans
      .filter(t => t.type === 'income' || t.type === 'entrada')
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const despesas = monthTrans
      .filter(t => t.type === 'expense' || t.type === 'saida')
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const saldo = receitas - despesas;
    
    const meta = 50000; // Configurable later
    const progress = Math.min((receitas / meta) * 100, 100);

    // Group expenses by category
    const expByCategory = monthTrans
      .filter(t => t.type === 'expense' || t.type === 'saida')
      .reduce((acc: any, curr) => {
        const cat = curr.category || 'Outros';
        acc[cat] = (acc[cat] || 0) + (Number(curr.amount) || 0);
        return acc;
      }, {});

    const pieData = Object.keys(expByCategory).map(key => ({
      name: key,
      value: expByCategory[key]
    })).sort((a,b) => b.value - a.value).slice(0, 5); // top 5

    // Next Events
    const upcomingEvents = filteredEvents
      .filter(e => {
         const eventDate = parseFirestoreDate(e.start);
         return eventDate >= new Date();
      })
      .sort((a, b) => {
        const dA = parseFirestoreDate(a.start);
        const dB = parseFirestoreDate(b.start);
        return dA.getTime() - dB.getTime();
      })
      .slice(0, 4);

    return { receitas, despesas, saldo, progress, pieData, upcomingEvents };
  }, [filteredTransactions, filteredEvents, currentMonth, currentYear]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(20);
      doc.text("Relatorio Gerencial - Dashboard", 14, 22);
      
      doc.setFontSize(12);
      doc.text(`Data de Geracao: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, 14, 30);
      doc.text(`Igreja/Filial: ${activeBranchName}`, 14, 36);

      autoTable(doc, {
        startY: 45,
        head: [['Metrica', 'Valor']],
        body: [
          ['Receitas do Mes', `R$ ${stats.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
          ['Despesas do Mes', `R$ ${stats.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
          ['Saldo do Mes', `R$ ${stats.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
          ['Membros Ativos', filteredMembers.length.toString()],
        ],
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
      });
      
      doc.save("relatorio-dashboard.pdf");
      toast.success("Relatório PDF gerado com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF.");
    }
  };

  if (isLoading) {
    return <div className="h-full flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      
      <PageHeader 
        title="Visão Geral" 
        description={
          <div className="space-y-1">
            <p className="text-white/80 text-sm">
              Bem-vindo de volta, {user?.name || 'Administrador'}. Aqui está o resumo e alertas do sistema.
            </p>
          </div>
        }
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col text-left sm:text-right bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/20">
              <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold leading-none mb-0.5">Licença</span>
              <span className="text-xs sm:text-sm font-semibold text-white leading-tight">
                {user?.status === 'exempt' ? 'Vitalícia' :
                  user?.status === 'expired' || (user?.expirationDate && new Date(user.expirationDate) < new Date()) ? 'Expirada' : 
                  user?.status === 'trial' ? 'Teste' : 'Ativa'}
              </span>
            </div>
            
            <Button onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch((err) => {
                  toast.error("Erro ao ativar tela cheia: " + err.message);
                });
              } else {
                document.exitFullscreen();
              }
            }} variant="outline" className="bg-white/10 text-white hover:bg-white/20 border-white/20 whitespace-nowrap h-10 rounded-xl px-3.5 font-medium text-xs sm:text-sm hidden md:inline-flex">
              <Maximize className="w-4 h-4 mr-1.5" /> Tela Cheia
            </Button>
            <Button onClick={handleExportPDF} className="bg-white text-blue-600 hover:bg-slate-100 whitespace-nowrap h-10 rounded-xl px-4 font-semibold text-xs sm:text-sm shadow-xs">
              <Download className="w-4 h-4 mr-1.5" /> Exportar Relatório
            </Button>
          </div>
        }
      />

      {(() => {
        if (!user || user.status === 'exempt' || user.status === 'blocked') return null;
        if (!user.expirationDate) return null;
        
        const diffTime = new Date(user.expirationDate).getTime() - new Date().getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (daysRemaining <= 0 || user.status === 'expired') {
          return (
             <div className="bg-red-50 dark:bg-red-950/40 border-l-4 border-red-500 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-red-800 dark:text-red-300 font-medium flex items-center gap-2"><Target className="w-5 h-5"/> Licença Expirada</h3>
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">Sua licença expirou. O acesso aos recursos foi limitado. Por favor, regularize sua assinatura.</p>
                </div>
                <Link to="/configuracoes"><Button variant="destructive" size="sm" className="whitespace-nowrap">Renovar Agora</Button></Link>
             </div>
          );
        }
        
        if (daysRemaining <= 3) {
          return (
             <div className="bg-orange-50 dark:bg-orange-950/40 border-l-4 border-orange-500 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-orange-800 dark:text-orange-300 font-medium flex items-center gap-2"><Activity className="w-5 h-5"/> Acesso Limitado em Breve</h3>
                  <p className="text-orange-700 dark:text-orange-400 text-sm mt-1">Sua licença expira em {daysRemaining} dia(s). Renove agora para evitar o bloqueio da conta.</p>
                </div>
                <Link to="/configuracoes"><Button variant="outline" className="text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800 hover:bg-orange-100 whitespace-nowrap bg-white dark:bg-card" size="sm">Renovar Licença</Button></Link>
             </div>
          );
        }

        if (daysRemaining <= 15) {
          return (
             <div className="bg-amber-50 dark:bg-amber-950/40 border-l-4 border-amber-500 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-amber-800 dark:text-amber-300 font-medium flex items-center gap-2"><Bell className="w-5 h-5"/> Aviso de Renovação</h3>
                  <p className="text-amber-700 dark:text-amber-400 text-sm mt-1">Sua licença expira em {daysRemaining} dias. Programe-se para renovar sua assinatura.</p>
                </div>
                <Link to="/configuracoes"><Button variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 whitespace-nowrap bg-white dark:bg-card" size="sm">Ver Opções</Button></Link>
             </div>
          );
        }
        return null;
      })()}

      {/* 0. Summary Cards Executivo (Firestore Real-time: Membros, Receitas do Mês e Tarefas) */}
      <SummaryCards activeBranch={activeBranch} />

      {/* 1. Cards de Resumo Financeiro (Entradas vs Saídas, Balanço & Taxa de Comprometimento) */}
      <FinancialSummaryCards transactions={filteredTransactions} activeBranch={activeBranch} />

      {/* 2. Sistema de Alertas Visuais para Contas a Pagar e Receber Próximas ao Vencimento */}
      <PendingBillsAlerts transactions={filteredTransactions} />

      {/* 2.1. Gráfico Visual Recharts: Resumo de Entradas e Saídas Financeiras do Mês Atual */}
      <MonthlyFinancialComparisonChart transactions={filteredTransactions} activeBranch={activeBranch} />

      {/* 3. Gráficos Principais: Evolução da Arrecadação Mensal e Crescimento de Novos Membros (Recharts) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <RevenueEvolutionChart transactions={filteredTransactions} activeBranch={activeBranch} />
        <MemberGrowthChart members={filteredMembers} activeBranch={activeBranch} />
      </div>

      {/* 4. Grid: Aniversariantes do Mês & Distribuição de Despesas / Agenda */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* Aniversariantes do Mês (Left: 5 cols on lg) */}
        <div className="lg:col-span-5">
          <BirthdaysCard members={filteredMembers} activeBranch={activeBranch} />
        </div>

        {/* Despesas Chart & Próximos Eventos (Right: 7 cols on lg) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Despesas Chart */}
          <Card className="shadow-sm border-border/80 dark:border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
                 <Activity className="w-5 h-5 text-primary" /> Distribuição de Despesas por Categoria
              </CardTitle>
              <CardDescription>Principais custos e desembolsos deste mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[260px]">
                 {stats.pieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={stats.pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {stats.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                 ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                      Nenhuma despesa registrada neste mês.
                    </div>
                 )}
              </div>
            </CardContent>
          </Card>

          {/* Agenda Widget */}
          <Card className="shadow-sm border-border/80 dark:border-border/60">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
                   <Calendar className="w-5 h-5 text-primary" /> Próximos Eventos da Igreja
                </CardTitle>
                <Link to="/agenda" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-medium px-2.5 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                  Ver Agenda Completa
                </Link>
              </div>
            </CardHeader>
            <CardContent>
               <div className="space-y-3">
                 {stats.upcomingEvents.length > 0 ? stats.upcomingEvents.map((evt, idx) => {
                   const d = parseFirestoreDate(evt.start);
                   const dateStr = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d);
                   const timeStr = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(d);
                   return (
                     <div key={idx} className="flex items-start gap-4 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors border border-border/60">
                       <div className="bg-card border border-border shadow-xs rounded-lg p-2 text-center min-w-[58px]">
                         <div className="text-[11px] font-bold text-primary uppercase">{dateStr.split(' de ')[1]}</div>
                         <div className="text-lg font-bold text-foreground">{dateStr.split(' ')[0]}</div>
                       </div>
                       <div className="min-w-0 flex-1">
                         <h4 className="font-semibold text-sm text-foreground truncate">{evt.title}</h4>
                         <p className="text-xs text-muted-foreground mt-0.5">{timeStr} • {evt.location || 'Templo Sede'}</p>
                       </div>
                     </div>
                   )
                 }) : (
                   <div className="text-center p-6 text-muted-foreground border border-dashed border-border rounded-xl text-sm">
                      Não há eventos futuros programados na agenda.
                   </div>
                 )}
               </div>
            </CardContent>
          </Card>
        </div>

      </div>

    </motion.div>
  );
}
