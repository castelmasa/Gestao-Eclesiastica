import { toast } from "sonner";
import { GlobalShortcuts } from "@/components/GlobalShortcuts"
import { Outlet, Link, useNavigate, useLocation } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Breadcrumbs } from "./Breadcrumbs"
import { useState, useEffect } from "react"
import { Bell, Maximize, Minimize, Eye, Search, FileText, User, Archive, CalendarClock, PlusCircle, Accessibility, Menu, Building2, PanelLeftClose, PanelLeftOpen, Palette, Sparkles, Sun, Moon, Laptop, Check } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { PWAInstallButton } from "@/components/PWAInstallButton"
import { useBranch } from "@/contexts/BranchContext"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext"
import { useColorTheme, ColorTheme } from "@/contexts/ColorThemeContext"
import { ChurchBranchSelector } from "./ChurchBranchSelector"
import { OfflineIndicator } from "@/components/OfflineIndicator"
import { GlobalSearchCommandPalette } from "@/components/search/GlobalSearchCommandPalette"
import { ChurchLogo } from "@/components/ChurchLogo"

import { db } from "@/lib/firebase"
import { collection, onSnapshot, query, orderBy, limit, addDoc, serverTimestamp, updateDoc, doc, getDocs } from "firebase/firestore"


export function Layout() {

    const { user } = useAuth();
    const { activeBranch, setActiveBranch, branches, canChangeBranch, activeBranchName } = useBranch();
    const { colorTheme, setColorTheme } = useColorTheme();
    const { theme, setTheme } = useTheme();
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hideSidebar, setHideSidebar] = useState(() => localStorage.getItem("ui_hideSidebar") === "true");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("ui_sidebar_collapsed") === "true");

  useEffect(() => {
    const handleToggle = () => setIsSidebarCollapsed(localStorage.getItem("ui_sidebar_collapsed") === "true");
    window.addEventListener("ui_sidebar_toggle", handleToggle);
    window.addEventListener("storage", handleToggle);
    return () => {
      window.removeEventListener("ui_sidebar_toggle", handleToggle);
      window.removeEventListener("storage", handleToggle);
    };
  }, []);

  const toggleCollapseSidebar = () => {
    const next = !isSidebarCollapsed;
    setIsSidebarCollapsed(next);
    localStorage.setItem("ui_sidebar_collapsed", String(next));
    window.dispatchEvent(new Event("ui_sidebar_toggle"));
  };

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    // Setup real-time listener for notifications
    const q = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(20));
    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const notifs: any[] = [];
        let unread = 0;
        snapshot.forEach((doc) => {
          const data = doc.data();
          notifs.push({ id: doc.id, ...data });
          if (!data.read) unread++;
        });
        setNotifications(notifs);
        setUnreadCount(unread);
        
        // Request FCM permission here if we wanted full push, but for now we rely on in-app real-time via Firestore
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }
      },
      (error) => {
        console.warn("Notifications listener error:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K for search/quick actions
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      
      // Ctrl+S or Cmd+S for save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        window.dispatchEvent(new Event('app:save-record'));
      }
      
      // Ctrl+N or Cmd+N for new record
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        window.dispatchEvent(new Event('app:new-record'));
      }
    };
    
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, []);


  useEffect(() => {
    const checkDailyNotifications = async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastChecked = localStorage.getItem('lastCheckedNotifs');
      
      if (lastChecked !== today) {
        try {
            // Fetch Members and Transactions from Firestore
            const membersSnap = await getDocs(collection(db, 'members'));
            const txsSnap = await getDocs(collection(db, 'transactions'));
            
            const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const txs = txsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const currentMonth = new Date().getMonth() + 1;
            const currentDay = new Date().getDate();
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            
            members.forEach((m: any) => {
              if (m.birthDate) {
                const [y, mm, d] = m.birthDate.split('-');
                if (parseInt(mm) === currentMonth && parseInt(d) === currentDay) {
                  // Generate default notification
                  addDoc(collection(db, 'notifications'), {
                    title: "Aniversariante do Dia",
                    message: `Hoje é aniversário de ${m.name}!`,
                    link: "/secretaria",
                    read: false,
                    createdAt: serverTimestamp()
                  });
                  
                  // Dispatch automation event
                  window.dispatchEvent(new CustomEvent('app:birthday', { 
                     detail: { name: m.name, email: m.email, phone: m.phone, message: `Feliz aniversário ${m.name}!` } 
                  }));
                }
              }

              // Inactive Tither Check (90 days)
              if (m.status === 'ativo') {
                  const memberTithes = txs.filter((t: any) => t.memberId === m.id && t.type === 'entrada' && (t.category || '').toLowerCase().includes('dízimo'));
                  if (memberTithes.length > 0) {
                      // Has tithed before. When was the last one?
                      const lastTitheDate = new Date(Math.max(...memberTithes.map((t: any) => new Date(t.date).getTime())));
                      if (lastTitheDate < ninetyDaysAgo) {
                          // Inactive for > 90 days
                          window.dispatchEvent(new CustomEvent('app:inactive-tither', {
                              detail: { name: m.name, desc: `O membro ${m.name} não registra dízimos há mais de 90 dias.`, link: "/financeiro" }
                          }));
                      }
                  }
              }
            });

            // Pending Bills
            const todayDate = new Date();
            const in3Days = new Date();
            in3Days.setDate(todayDate.getDate() + 3);
            
            txs.forEach((t: any) => {
               if (t.type === 'saida' && t.status === 'Pendente' && t.date) {
                 const dueDate = new Date(t.date);
                 if (dueDate >= todayDate && dueDate <= in3Days) {
                   const notifId = `vencimento_${t.id}`;
                   const alreadyNotified = localStorage.getItem(notifId);
                   if (!alreadyNotified) {
                     localStorage.setItem(notifId, 'true');
                     addDoc(collection(db, 'notifications'), {
                        title: "Conta Próxima ao Vencimento",
                        message: `A despesa "${t.description}" (${t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) vence em breve.`,
                        link: "/financeiro",
                        read: false,
                        createdAt: serverTimestamp()
                     });
                   }
                 }
               }
            });

            localStorage.setItem('lastCheckedNotifs', today);
        } catch (err) {
            console.error("Erro ao verificar notificações diárias", err);
        }
      }
    };
    
    // Short delay to not block initial render
    setTimeout(checkDailyNotifications, 2000);
  }, []);


  const markAsRead = async (id: string, link?: string) => {
     try {
       await updateDoc(doc(db, 'notifications', id), { read: true });
       if (link) {
         navigate(link);
       }
     } catch (error) {
       console.error("Error updating notification", error);
     }
  };

  const markAllAsRead = async () => {
     try {
        const unreadNotifs = notifications.filter(n => !n.read);
        for (const n of unreadNotifs) {
           await updateDoc(doc(db, 'notifications', n.id), { read: true });
        }
     } catch (error) {
       console.error(error);
     }
  };


  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAccessibleMode, setIsAccessibleMode] = useState(() => {
    return localStorage.getItem("theme-accessible") === "true";
  });

  const [isHighContrast, setIsHighContrast] = useState(() => {
    return localStorage.getItem('theme-high-contrast') === 'true';
  });

  
  useEffect(() => {
    if (isAccessibleMode) {
        document.documentElement.classList.add('theme-accessible');
    } else {
        document.documentElement.classList.remove('theme-accessible');
    }
    localStorage.setItem('theme-accessible', String(isAccessibleMode));
  }, [isAccessibleMode]);

  useEffect(() => {
    if (isHighContrast) {
        document.documentElement.classList.add('theme-high-contrast');
    } else {
        document.documentElement.classList.remove('theme-high-contrast');
    }
    localStorage.setItem('theme-high-contrast', String(isHighContrast));
  }, [isHighContrast]);

  
  // Automation Engine
  useEffect(() => {
    // Seed default automation rules if none exist
    if (!localStorage.getItem("churchAutomations")) {
      const defaultRules = [
        {
          id: "rule-budget",
          name: "Alerta de Limite Orçamentário",
          trigger: "BUDGET_EXCEEDED",
          action: "SEND_NOTIFICATION",
          actionParams: "Alerta ao Tesoureiro: Uma despesa ultrapassou o teto estipulado para a categoria.",
          active: true
        },
        {
          id: "rule-birthday",
          name: "Felicitações aos Aniversariantes",
          trigger: "BIRTHDAY",
          action: "SEND_WHATSAPP",
          actionParams: "Feliz Aniversário em nome de toda a igreja! Que o Senhor derrame ricas bênçãos sobre sua vida.",
          active: true
        },
        {
          id: "rule-inactive-tither",
          name: "Atenção Pastoral: Dizimista Inativo (>90 dias)",
          trigger: "INACTIVE_TITHER",
          action: "SEND_NOTIFICATION",
          actionParams: "Notificação Pastoral: Membro sem registro de contribuição de dízimo há mais de 90 dias.",
          active: true
        },
        {
          id: "rule-new-tither",
          name: "Boas-vindas ao Novo Dizimista",
          trigger: "NEW_TITHER",
          action: "SEND_WHATSAPP",
          actionParams: "Agradecemos de coração pela sua fidelidade e generosidade. Seja muito bem-vindo!",
          active: true
        }
      ];
      localStorage.setItem("churchAutomations", JSON.stringify(defaultRules));
    }

    const processRule = (triggerType: string, payload: any) => {
        const rulesStr = localStorage.getItem("churchAutomations");
        if (!rulesStr) return;
        let rules = [];
        try {
            rules = JSON.parse(rulesStr);
        } catch {
            return;
        }

        rules.filter((r: any) => r.active && r.trigger === triggerType).forEach((rule: any) => {
            const contextText = payload.name ? ` (${payload.name})` : (payload.desc ? ` (${payload.desc})` : (payload.message ? ` (${payload.message})` : ''));
            const finalMessage = rule.actionParams + contextText;
            
            if (rule.action === 'CREATE_TASK') {
                const eventsStr = localStorage.getItem("churchEvents");
                const events = eventsStr ? JSON.parse(eventsStr) : [];
                events.push({
                    id: Date.now() + Math.random(),
                    title: finalMessage,
                    date: new Date().toISOString().split('T')[0],
                    type: 'Lembrete',
                    description: 'Gerado automaticamente por automação.'
                });
                localStorage.setItem("churchEvents", JSON.stringify(events));
                window.dispatchEvent(new Event("storage"));
            } else if (rule.action === 'SEND_NOTIFICATION') {
                addDoc(collection(db, 'notifications'), {
                  title: rule.name,
                  message: finalMessage,
                  link: payload.link || "/",
                  read: false,
                  createdAt: serverTimestamp()
                });
            } else if (rule.action === 'SEND_EMAIL') {
                toast.success(`E-mail automático na fila de envio: "${finalMessage}"`);
                addDoc(collection(db, 'notifications'), {
                  title: `[E-mail Automático] ${rule.name}`,
                  message: `Enviado para: ${payload.email || 'Usuário/Contato'}. Conteúdo: ${finalMessage}`,
                  link: payload.link || "/",
                  read: false,
                  createdAt: serverTimestamp()
                });
            } else if (rule.action === 'SEND_WHATSAPP') {
                toast.success(`Mensagem de WhatsApp na fila: "${finalMessage}"`);
                addDoc(collection(db, 'notifications'), {
                  title: `[WhatsApp Automático] ${rule.name}`,
                  message: `Enviado para: ${payload.phone || 'Usuário/Contato'}. Conteúdo: ${finalMessage}`,
                  link: payload.link || "/",
                  read: false,
                  createdAt: serverTimestamp()
                });
            }
        });
    };

    const handleMemberAdded = (e: any) => processRule('MEMBER_ADDED', e.detail || {});
    const handleTxAdded = (e: any) => processRule('TRANSACTION_ADDED', e.detail || {});
    const handleDocIssued = (e: any) => processRule('DOCUMENT_ISSUED', e.detail || {});
    const handleBudgetExceeded = (e: any) => processRule('BUDGET_EXCEEDED', e.detail || {});
    const handleNewTither = (e: any) => processRule('NEW_TITHER', e.detail || {});
    const handleBirthday = (e: any) => processRule('BIRTHDAY', e.detail || {});
    const handleInactiveTither = (e: any) => processRule('INACTIVE_TITHER', e.detail || {});

    window.addEventListener('app:member-added', handleMemberAdded);
    window.addEventListener('app:tx-added', handleTxAdded);
    window.addEventListener('app:doc-issued', handleDocIssued);
    window.addEventListener('app:budget-exceeded', handleBudgetExceeded);
    window.addEventListener('app:new-tither', handleNewTither);
    window.addEventListener('app:birthday', handleBirthday);
    window.addEventListener('app:inactive-tither', handleInactiveTither);

    // Verificações periódicas automáticas de Aniversários e Dizimistas Inativos
    const runScheduledChecks = async () => {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const checkKey = `church_daily_auto_${todayStr}`;
      if (sessionStorage.getItem(checkKey)) return;
      sessionStorage.setItem(checkKey, "true");

      try {
        const [membersSnap, txSnap] = await Promise.all([
          getDocs(collection(db, 'members')),
          getDocs(collection(db, 'transactions'))
        ]);

        const membersList: any[] = [];
        membersSnap.forEach(d => membersList.push({ id: d.id, ...d.data() }));

        const txList: any[] = [];
        txSnap.forEach(d => txList.push({ id: d.id, ...d.data() }));

        const currentDay = today.getDate();
        const currentMonth = today.getMonth() + 1;

        // 1. Verificação de Aniversariantes do Dia
        membersList.forEach(member => {
          if (member.birthDate) {
            const parts = String(member.birthDate).split('-');
            let bDay = 0;
            let bMonth = 0;
            if (parts.length === 3) {
              bDay = parseInt(parts[2], 10);
              bMonth = parseInt(parts[1], 10);
            } else {
              const d = new Date(member.birthDate);
              bDay = d.getDate();
              bMonth = d.getMonth() + 1;
            }

            if (bDay === currentDay && bMonth === currentMonth) {
              const bkey = `bday_auto_${member.id}_${todayStr}`;
              if (!localStorage.getItem(bkey)) {
                localStorage.setItem(bkey, "true");
                processRule('BIRTHDAY', {
                  name: member.name,
                  phone: member.phone,
                  email: member.email,
                  desc: `Hoje é o aniversário de ${member.name}!`,
                  link: '/membros'
                });
              }
            }
          }
        });

        // 2. Verificação de Dizimistas Inativos (> 90 dias)
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const monthYearKey = `${today.getFullYear()}_${today.getMonth() + 1}`;

        membersList.forEach(member => {
          const memberTithes = txList.filter(t => 
            (t.memberId === member.id || t.memberName?.toLowerCase() === member.name?.toLowerCase()) &&
            t.type === 'entrada' &&
            (t.category?.toLowerCase().includes('dízimo') || t.category?.toLowerCase().includes('dizimo'))
          );

          let isInactive = false;
          if (memberTithes.length === 0) {
            if (member.createdAt?.seconds) {
              const joinedDate = new Date(member.createdAt.seconds * 1000);
              if (joinedDate < ninetyDaysAgo) {
                isInactive = true;
              }
            }
          } else {
            const dates = memberTithes.map(t => new Date(t.date || (t.createdAt?.seconds ? t.createdAt.seconds * 1000 : 0)).getTime());
            const lastTitheTime = Math.max(...dates);
            if (lastTitheTime < ninetyDaysAgo.getTime()) {
              isInactive = true;
            }
          }

          if (isInactive) {
            const inactKey = `inactive_tither_${member.id}_${monthYearKey}`;
            if (!localStorage.getItem(inactKey)) {
              localStorage.setItem(inactKey, "true");
              processRule('INACTIVE_TITHER', {
                name: member.name,
                phone: member.phone,
                email: member.email,
                desc: `${member.name} não contribui com dízimo há mais de 90 dias`,
                link: '/financeiro'
              });
            }
          }
        });
      } catch (err) {
        console.error("Erro nas automações agendadas:", err);
      }
    };

    runScheduledChecks();

    return () => {
        window.removeEventListener('app:member-added', handleMemberAdded);
        window.removeEventListener('app:tx-added', handleTxAdded);
        window.removeEventListener('app:doc-issued', handleDocIssued);
        window.removeEventListener('app:budget-exceeded', handleBudgetExceeded);
        window.removeEventListener('app:new-tither', handleNewTither);
        window.removeEventListener('app:birthday', handleBirthday);
        window.removeEventListener('app:inactive-tither', handleInactiveTither);
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Ctrl+N (or Cmd+N)
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('app:new-record'));
        }
        // Ctrl+S (or Cmd+S)
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('app:save-record'));
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  
  const navigate = useNavigate();

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global search shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const checkNotifications = () => {
    const notifs = [];
    
    // Check pending docs
    const docsStr = localStorage.getItem("churchDocumentHistory");
    if (docsStr) {
      const docs = JSON.parse(docsStr);
      const pendingCount = docs.filter((d: any) => d.status === 'pendente').length;
      if (pendingCount > 0) {
        notifs.push({
          id: 'docs',
          title: 'Documentos Pendentes',
          desc: `Você tem ${pendingCount} documento(s) aguardando aprovação.`,
          link: '/secretaria'
        });
      }
    }

    // Check overdue maintenance (using status "Manutenção" as a trigger or checking lastMaintenance)
    const assetsStr = localStorage.getItem("churchAssets");
    if (assetsStr) {
      const assets = JSON.parse(assetsStr);
      const maintenanceCount = assets.filter((a: any) => a.status === 'Manutenção').length;
      if (maintenanceCount > 0) {
        notifs.push({
          id: 'assets',
          title: 'Patrimônio em Manutenção',
          desc: `Existem ${maintenanceCount} ativo(s) registrados em estado de manutenção.`,
          link: '/patrimonio'
        });
      }
    }

    // Check birthdays and pending tithes
    const membersStr = localStorage.getItem("churchMembers");
    const txStr = localStorage.getItem("churchTransactions");
    
    if (membersStr) {
      const members = JSON.parse(membersStr);
      
      // Birthdays this month
      const currentMonth = new Date().getMonth() + 1; // 1-12
      const currentMonthStr = currentMonth.toString().padStart(2, '0');
      
      const birthdays = members.filter((m: any) => {
        if (!m.dataNascimento) return false;
        let month = "";
        if (m.dataNascimento.includes('/')) {
            const parts = m.dataNascimento.split('/');
            if (parts.length >= 2) month = parts[1];
        } else if (m.dataNascimento.includes('-')) {
            const parts = m.dataNascimento.split('-');
            if (parts.length >= 2) month = parts[1];
        }
        return month === currentMonthStr;
      });

      if (birthdays.length > 0) {
        notifs.push({
          id: 'birthdays',
          title: 'Aniversariantes do Mês',
          desc: `Existem ${birthdays.length} aniversariante(s) neste mês.`,
          link: '/secretaria'
        });
      }

      // Pending Tithes/Offerings
      if (txStr) {
        const transactions = JSON.parse(txStr);
        // Find active members
        const activeMembers = members.filter((m: any) => m.status === 'Ativo');
        
        // Get this month's string in YYYY-MM format
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
        
        const thisMonthTxs = transactions.filter((t: any) => {
            return t.date && t.date.startsWith(yearMonth) && t.type === 'entrada' && (t.category.toLowerCase().includes('dízimo') || t.category.toLowerCase().includes('oferta'));
        });

        // Members who haven't contributed
        const contributedMemberIds = new Set(thisMonthTxs.map((t: any) => t.memberId?.toString()).filter(Boolean));
        const pendingCount = activeMembers.filter((m: any) => !contributedMemberIds.has(m.id.toString())).length;
        
        if (pendingCount > 0) {
           notifs.push({
             id: 'pending-tithes',
             title: 'Contribuições Pendentes',
             desc: `${pendingCount} membro(s) ativo(s) não registraram dízimos ou ofertas este mês.`,
             link: '/financeiro'
           });
        }
      }
    }

    setNotifications(notifs);
  }

  useEffect(() => {
    checkNotifications();
    // Re-check periodically or on storage change
    const interval = setInterval(checkNotifications, 10000);
    window.addEventListener('storage', checkNotifications);
    window.addEventListener('churchAuditLogsUpdated', checkNotifications); // custom event just to trigger update
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', checkNotifications);
      window.removeEventListener('churchAuditLogsUpdated', checkNotifications);
    };
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'd':
            e.preventDefault();
            navigate('/');
            break;
          case 's':
            e.preventDefault();
            navigate('/secretaria');
            break;
          case 'f':
            e.preventDefault();
            navigate('/financeiro');
            break;
          case 'a':
            e.preventDefault();
            navigate('/agenda');
            break;
          case 'p':
            e.preventDefault();
            navigate('/patrimonio');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="flex h-screen print:h-auto print:overflow-visible bg-background overflow-hidden w-full">

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative z-50 flex w-72 max-w-[85vw] bg-card shadow-2xl">
             <Sidebar />
          </div>
        </div>
      )}

      {!hideSidebar && <div className="print:hidden hidden md:block"><Sidebar /></div>}
      <div className="flex-1 flex flex-col min-w-0 print:w-full print:m-0 print:p-0">
        <header className="print:hidden h-16 flex items-center justify-between px-4 sm:px-6 border-b border-border/50 bg-card shrink-0 gap-2 sm:gap-3">
          {/* Left: Mobile Menu & Search */}
          <div className="flex items-center gap-2 flex-1 max-w-sm">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="md:hidden shrink-0">
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2 md:hidden shrink-0">
              <ChurchLogo className="h-7 w-7" />
              <span className="font-bold text-xs tracking-tight text-foreground truncate">Gestão</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapseSidebar}
              className="hidden md:flex shrink-0 h-9 w-9 text-muted-foreground hover:text-foreground rounded-lg"
              title={isSidebarCollapsed ? "Expandir barra lateral (Clique)" : "Encolher barra lateral (Clique)"}
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
    
            <Button
              variant="outline"
              className="w-full max-w-[260px] justify-between text-muted-foreground bg-muted/40 hover:bg-muted/70 hidden md:flex h-9 px-3 border-border/60 rounded-xl"
              onClick={() => setIsSearchOpen(true)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs truncate">Buscar membros, caixa, bens...</span>
              </div>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 text-muted-foreground shrink-0">
                Ctrl+K
              </kbd>
            </Button>

            <Button variant="ghost" size="icon" onClick={() => setIsSearchOpen(true)} title="Buscar (Ctrl+K)" className="md:hidden shrink-0">
              <Search className="h-5 w-5 text-muted-foreground" />
            </Button>
          </div>

          {/* Right: Quick Actions */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">

            <Button variant="ghost" size="icon" onClick={() => setIsHighContrast(!isHighContrast)} title="Alto Contraste">
              <Eye className={`h-5 w-5 ${isHighContrast ? 'text-primary' : 'text-muted-foreground'}`} />
            </Button>
            <GlobalShortcuts />
            <PWAInstallButton />
            <Button variant="ghost" size="icon" onClick={toggleFullscreen} title={isFullscreen ? "Sair da Tela Cheia" : "Tela Cheia"} className="hidden sm:inline-flex">
              {isFullscreen ? <Minimize className="h-5 w-5 text-muted-foreground" /> : <Maximize className="h-5 w-5 text-muted-foreground" />}
            </Button>
            
            <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" title="Notificações">
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <h4 className="font-semibold text-sm">Notificações</h4>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-muted-foreground hover:text-primary" onClick={markAllAsRead}>
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">Nenhuma notificação</div>
                ) : (
                  <div className="flex flex-col">
                    {notifications.map((n) => (
                      <div 
                        key={n.id} 
                        className={`flex flex-col gap-1 border-b p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer ${!n.read ? 'bg-primary/5' : ''}`}
                        onClick={() => markAsRead(n.id, n.link)}
                      >
                        <div className="flex justify-between items-start">
                            <span className={`text-sm font-medium ${!n.read ? 'text-primary' : 'text-foreground'}`}>{n.title}</span>
                            {!n.read && <span className="h-2 w-2 rounded-full bg-primary mt-1.5" />}
                        </div>
                        <span className="text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                        {n.createdAt && (
                          <span className="text-[10px] text-muted-foreground mt-1">
                             {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString('pt-BR') : ''}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-50 via-slate-50/80 to-slate-100/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 relative w-full min-w-0">
          <div className="mx-auto max-w-7xl px-2.5 sm:px-6 py-4 sm:py-8 w-full min-w-0 max-w-full">
            <Breadcrumbs />
            <Outlet />
          </div>
        </main>
      </div>
      <OfflineIndicator />
      <GlobalSearchCommandPalette open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </div>
  )
}
