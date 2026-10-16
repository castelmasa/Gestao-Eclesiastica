import { motion } from "motion/react";
import React, { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Users, TrendingUp, TrendingDown, Target, Bell, Calendar, Wallet, Activity, Box, Loader2, Download, Maximize, Building2, ShieldCheck, Send, CheckCircle2, Lock } from "lucide-react"
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
import { collection, onSnapshot, query, where, getDocs, addDoc } from "firebase/firestore"
import { parseFirestoreDate } from "@/lib/dateUtils";
import { matchesBranch, isSedeBranch } from "@/lib/branchUtils";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { FinancialSummaryCards } from "@/components/dashboard/FinancialSummaryCards";
import { PendingBillsAlerts } from "@/components/dashboard/PendingBillsAlerts";
import { BirthdaysCard } from "@/components/dashboard/BirthdaysCard";
import { RevenueEvolutionChart } from "@/components/dashboard/RevenueEvolutionChart";
import { MemberGrowthChart } from "@/components/dashboard/MemberGrowthChart";
import { MonthlyFinancialComparisonChart } from "@/components/dashboard/MonthlyFinancialComparisonChart";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Dashboard() {
  const { user } = useAuth();
  const { activeBranch, branches, activeBranchName } = useBranch();
  const [isLoading, setIsLoading] = useState(true);

  // States
  const [members, setMembers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);

  // Modal de solicitação de acesso para novo usuário
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [requestedRole, setRequestedRole] = useState("Secretária");
  const [requestNotes, setRequestNotes] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);
  
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

  const isAdmin = user?.role?.toLowerCase() === 'administrador';
  const isDev = Boolean(
    user?.isDeveloper ||
    user?.role?.toLowerCase() === 'desenvolvedor' ||
    user?.role?.toLowerCase() === 'developer'
  );
  const isNovoUsuario = Boolean(
    !isAdmin && !isDev && (
      (user?.role || '').toLowerCase().includes('novo') ||
      (user?.role || '').toLowerCase().includes('visitante') ||
      (user?.status === 'trial' && (!user?.permissions || Object.values(user.permissions).every((p: any) => !p?.view)))
    )
  );

  const canViewFinanceiro = isAdmin || isDev || (user?.permissions?.financeiro?.view === true && !isNovoUsuario);
  const canViewMembers = isAdmin || isDev || (user?.permissions?.secretaria?.view === true && !isNovoUsuario);

  const handleSendAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingRequest(true);
    try {
      await addDoc(collection(db, 'access_requests'), {
        userId: user.id,
        userName: user.name || 'Usuário',
        userEmail: user.email || '',
        currentRole: user.role || 'Novo Usuário',
        requestedRole,
        notes: requestNotes.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      const savedRequests = JSON.parse(localStorage.getItem('church_access_requests') || '[]');
      savedRequests.unshift({
        id: 'req_' + Date.now(),
        userId: user.id,
        userName: user.name || 'Usuário',
        userEmail: user.email || '',
        currentRole: user.role || 'Novo Usuário',
        requestedRole,
        notes: requestNotes.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('church_access_requests', JSON.stringify(savedRequests));

      toast.success("Solicitação enviada com sucesso! Um administrador da igreja avaliará sua liberação.");
      setHasRequested(true);
      setIsRequestModalOpen(false);
    } catch (err) {
      console.warn("Erro ao salvar solicitação:", err);
      const savedRequests = JSON.parse(localStorage.getItem('church_access_requests') || '[]');
      savedRequests.unshift({
        id: 'req_' + Date.now(),
        userId: user.id,
        userName: user.name || 'Usuário',
        userEmail: user.email || '',
        currentRole: user.role || 'Novo Usuário',
        requestedRole,
        notes: requestNotes.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('church_access_requests', JSON.stringify(savedRequests));
      toast.success("Solicitação registrada com sucesso!");
      setHasRequested(true);
      setIsRequestModalOpen(false);
    } finally {
      setIsSubmittingRequest(false);
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
              Bem-vindo de volta, {user?.name || 'Usuário'}. {isNovoUsuario ? 'Seu cadastro está ativo com perfil restrito.' : 'Aqui está o resumo e alertas do sistema.'}
            </p>
          </div>
        }
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex flex-col text-left sm:text-right bg-white/10 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/20">
              <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold leading-none mb-0.5">Perfil</span>
              <span className="text-xs sm:text-sm font-semibold text-white leading-tight">
                {user?.role || 'Novo Usuário'}
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
            {canViewFinanceiro && (
              <Button onClick={handleExportPDF} className="bg-white text-blue-600 hover:bg-slate-100 whitespace-nowrap h-10 rounded-xl px-4 font-semibold text-xs sm:text-sm shadow-xs">
                <Download className="w-4 h-4 mr-1.5" /> Exportar Relatório
              </Button>
            )}
          </div>
        }
      />

      {/* BANNER INFORMATIVO PARA NOVO USUÁRIO */}
      {isNovoUsuario && (
        <Card className="border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-card shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  Perfil Inicial: Novo Usuário (Acesso Restrito Provisório)
                </div>
                <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                  Bem-vindo(a) à Plataforma da Igreja, {user?.name}!
                </h2>
                <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                  Para resguardar o sigilo eclesiástico, a movimentação financeira e os dados da congregação, novos usuários possuem o acesso inibido aos módulos administrativos e à <strong>opção de Configurações no menu lateral</strong>. Abaixo você tem acesso à agenda e aos eventos programados.
                </p>
                {hasRequested && (
                  <div className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Sua solicitação de acesso para "{requestedRole}" foi enviada com sucesso!
                  </div>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
                <Button 
                  onClick={() => setIsRequestModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-xs font-semibold h-11 px-5"
                >
                  <Send className="w-4 h-4 mr-2" /> Solicitar Liberação de Perfil
                </Button>
                <Link to="/agenda">
                  <Button variant="outline" className="rounded-xl w-full h-11 px-4">
                    <Calendar className="w-4 h-4 mr-2" /> Agenda de Cultos
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AVISOS DE EXPIRAÇÃO DE LICENÇA (SE APLICÁVEL) */}
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
                {!isNovoUsuario && (
                  <Link to="/configuracoes"><Button variant="destructive" size="sm" className="whitespace-nowrap">Renovar Agora</Button></Link>
                )}
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
                {!isNovoUsuario && (
                  <Link to="/configuracoes"><Button variant="outline" className="text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-800 hover:bg-orange-100 whitespace-nowrap bg-white dark:bg-card" size="sm">Renovar Licença</Button></Link>
                )}
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
                {!isNovoUsuario && (
                  <Link to="/configuracoes"><Button variant="outline" className="text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100 whitespace-nowrap bg-white dark:bg-card" size="sm">Ver Opções</Button></Link>
                )}
             </div>
          );
        }
        return null;
      })()}

      {/* BLOCO FINANCEIRO E ADMINISTRATIVO (INIBIDO PARA NOVO USUÁRIO) */}
      {canViewFinanceiro && (
        <>
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
        </>
      )}

      {/* 4. Grid: Aniversariantes do Mês & Distribuição de Despesas / Agenda */}
      <div className="grid gap-6 lg:grid-cols-12">
        
        {/* Aniversariantes do Mês (Left: 5 cols on lg) - Visível para quem tem acesso a membros */}
        {canViewMembers && (
          <div className="lg:col-span-5">
            <BirthdaysCard members={filteredMembers} activeBranch={activeBranch} />
          </div>
        )}

        {/* Despesas Chart & Próximos Eventos (Right: span changes based on canViewMembers) */}
        <div className={canViewMembers ? "lg:col-span-7 space-y-6" : "lg:col-span-12 space-y-6"}>
          {/* Despesas Chart (Somente visível com permissão financeira) */}
          {canViewFinanceiro && (
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
          )}

          {/* Agenda Widget - Sempre visível para todos os usuários (incluindo Novo Usuário) */}
          <Card className="shadow-sm border-border/80 dark:border-border/60 rounded-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2 text-foreground">
                     <Calendar className="w-5 h-5 text-primary" /> Próximos Eventos & Cultos da Igreja
                  </CardTitle>
                  <CardDescription>Acompanhe a programação dos cultos e eventos oficiais</CardDescription>
                </div>
                <Link to="/agenda" className="inline-flex items-center text-xs font-semibold text-primary hover:text-primary/80 px-3 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
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
                     <div key={idx} className="flex items-start gap-4 p-3.5 rounded-xl bg-muted/40 hover:bg-muted/70 transition-colors border border-border/60">
                       <div className="bg-card border border-border shadow-xs rounded-xl p-2 text-center min-w-[62px]">
                         <div className="text-[11px] font-bold text-primary uppercase">{dateStr.split(' de ')[1]}</div>
                         <div className="text-xl font-black text-foreground">{dateStr.split(' ')[0]}</div>
                       </div>
                       <div className="min-w-0 flex-1">
                         <h4 className="font-semibold text-sm text-foreground truncate">{evt.title}</h4>
                         <p className="text-xs text-muted-foreground mt-0.5">{timeStr} • {evt.location || 'Templo Sede'}</p>
                       </div>
                     </div>
                   )
                 }) : (
                   <div className="text-center p-8 text-muted-foreground border border-dashed border-border rounded-xl text-sm">
                      Não há eventos futuros programados na agenda para este período.
                   </div>
                 )}
               </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* MODAL DE SOLICITAÇÃO DE PERFIL / ACESSO */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-500" /> Solicitar Liberação de Acesso
            </DialogTitle>
            <DialogDescription>
              Selecione o ministério ou área em que você atua para que a administração da igreja libere seu perfil.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendAccessRequest} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Perfil Desejado</Label>
              <Select value={requestedRole} onValueChange={setRequestedRole}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione a área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Secretária">✍️ Secretária (Membros, Atas, Documentos)</SelectItem>
                  <SelectItem value="Tesoureiro">💰 Tesouraria (Finanças, Dízimos, Ofertas)</SelectItem>
                  <SelectItem value="Assistência Social / Diaconia">🤝 Assistência Social / Diaconia (Cestas Básicas)</SelectItem>
                  <SelectItem value="Pastor / Liderança">📖 Pastor / Presbítero (Área Pastoral, Aconselhamentos)</SelectItem>
                  <SelectItem value="Membro">👥 Membro da Igreja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mensagem / Congregação de Atuação</Label>
              <Textarea 
                placeholder="Ex: Sou da congregação Central e atuo no cadastro de membros da secretaria."
                value={requestNotes}
                onChange={(e) => setRequestNotes(e.target.value)}
                rows={3}
                className="rounded-xl text-sm resize-none"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsRequestModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmittingRequest} className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white">
                {isSubmittingRequest ? "Enviando..." : "Enviar Solicitação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
}
