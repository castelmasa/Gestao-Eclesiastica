import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import {
  User,
  DollarSign,
  Archive,
  ArrowUpRight,
  ArrowDownRight,
  PlusCircle,
  Calendar,
  FileText,
  Settings,
  Sparkles,
  Search,
  ExternalLink,
  Users,
  Building2,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, limit } from "firebase/firestore";

interface MemberItem {
  id: string;
  name: string;
  role?: string;
  status?: string;
  cpf?: string;
  phone?: string;
  email?: string;
}

interface TransactionItem {
  id: string;
  description: string;
  category?: string;
  type: string; // 'entrada' | 'saida'
  amount: number;
  date?: string;
  status?: string;
  memberId?: string;
  paymentMethod?: string;
}

interface AssetItem {
  id: string;
  tag?: string;
  name: string;
  category?: string;
  location?: string;
  status?: string;
  value?: number;
}

interface AgendaItem {
  id: string;
  title: string;
  start?: any;
  end?: any;
  description?: string;
  type?: string;
  location?: string;
}

interface GlobalSearchCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchCommandPalette({ open, onOpenChange }: GlobalSearchCommandPaletteProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"all" | "members" | "finance" | "agenda" | "assets" | "actions">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [events, setEvents] = useState<AgendaItem[]>([]);

  // Load data from Firestore and merge with localStorage fallback
  useEffect(() => {
    // 1. Members
    const loadLocalMembers = () => {
      try {
        const local = localStorage.getItem("churchMembers");
        if (local) return JSON.parse(local);
      } catch (e) {
        console.error(e);
      }
      return [];
    };

    let unsubMembers = () => {};
    try {
      const q = query(collection(db, "members"), limit(200));
      unsubMembers = onSnapshot(q, (snapshot) => {
        const remote: MemberItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          remote.push({
            id: doc.id,
            name: data.name || data.nome || "Membro sem nome",
            role: data.role || data.cargo || "Membro",
            status: data.status || "Ativo",
            cpf: data.cpf || "",
            phone: data.phone || data.telefone || "",
            email: data.email || ""
          });
        });
        if (remote.length > 0) {
          setMembers(remote);
        } else {
          setMembers(loadLocalMembers());
        }
      }, () => {
        setMembers(loadLocalMembers());
      });
    } catch {
      setMembers(loadLocalMembers());
    }

    // 2. Transactions
    const loadLocalTransactions = () => {
      try {
        const local = localStorage.getItem("churchTransactions");
        if (local) return JSON.parse(local);
      } catch (e) {
        console.error(e);
      }
      return [];
    };

    let unsubTxs = () => {};
    try {
      const q = query(collection(db, "transactions"), limit(250));
      unsubTxs = onSnapshot(q, (snapshot) => {
        const remote: TransactionItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          remote.push({
            id: doc.id,
            description: data.description || "Lançamento Financeiro",
            category: data.category || "Geral",
            type: data.type || "entrada",
            amount: Number(data.amount) || 0,
            date: data.date || "",
            status: data.status || "Pago",
            memberId: data.memberId,
            paymentMethod: data.paymentMethod
          });
        });
        if (remote.length > 0) {
          setTransactions(remote);
        } else {
          setTransactions(loadLocalTransactions());
        }
      }, () => {
        setTransactions(loadLocalTransactions());
      });
    } catch {
      setTransactions(loadLocalTransactions());
    }

    // 3. Assets
    const loadLocalAssets = () => {
      try {
        const local = localStorage.getItem("churchAssets");
        if (local) return JSON.parse(local);
      } catch (e) {
        console.error(e);
      }
      return [];
    };

    let unsubAssets = () => {};
    try {
      const q = query(collection(db, "assets"), limit(150));
      unsubAssets = onSnapshot(q, (snapshot) => {
        const remote: AssetItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          remote.push({
            id: doc.id,
            tag: data.tag || data.code || "",
            name: data.name || "Item de Patrimônio",
            category: data.category || "Geral",
            location: data.location || "Templo",
            status: data.status || "Em uso",
            value: Number(data.value) || 0
          });
        });
        if (remote.length > 0) {
          setAssets(remote);
        } else {
          setAssets(loadLocalAssets());
        }
      }, () => {
        setAssets(loadLocalAssets());
      });
    } catch {
      setAssets(loadLocalAssets());
    }

    // 4. Events / Agenda
    const loadLocalEvents = () => {
      try {
        const local = localStorage.getItem("churchEvents") || localStorage.getItem("calendarEvents");
        if (local) return JSON.parse(local);
      } catch (e) {
        console.error(e);
      }
      return [];
    };

    let unsubEvents = () => {};
    try {
      const q = query(collection(db, "events"), limit(150));
      unsubEvents = onSnapshot(q, (snapshot) => {
        const remote: AgendaItem[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          remote.push({
            id: doc.id,
            title: data.title || data.titulo || "Compromisso",
            start: data.start || data.data || "",
            end: data.end || "",
            description: data.description || data.descricao || "",
            type: data.type || data.categoria || "Evento",
            location: data.location || data.local || "Templo"
          });
        });
        if (remote.length > 0) {
          setEvents(remote);
        } else {
          setEvents(loadLocalEvents());
        }
      }, () => {
        setEvents(loadLocalEvents());
      });
    } catch {
      setEvents(loadLocalEvents());
    }

    return () => {
      unsubMembers();
      unsubTxs();
      unsubAssets();
      unsubEvents();
    };
  }, []);

  // Filtered lists based on search query
  const qClean = searchQuery.toLowerCase().trim();

  const filteredEvents = useMemo(() => {
    if (!qClean) return events.slice(0, 8);
    return events.filter((e) => {
      return (
        e.title.toLowerCase().includes(qClean) ||
        (e.description && e.description.toLowerCase().includes(qClean)) ||
        (e.type && e.type.toLowerCase().includes(qClean)) ||
        (e.location && e.location.toLowerCase().includes(qClean))
      );
    }).slice(0, 15);
  }, [events, qClean]);

  const filteredMembers = useMemo(() => {
    if (!qClean) return members.slice(0, 8);
    return members.filter((m) => {
      return (
        m.name.toLowerCase().includes(qClean) ||
        (m.cpf && m.cpf.toLowerCase().includes(qClean)) ||
        (m.email && m.email.toLowerCase().includes(qClean)) ||
        (m.phone && m.phone.toLowerCase().includes(qClean)) ||
        (m.role && m.role.toLowerCase().includes(qClean))
      );
    }).slice(0, 15);
  }, [members, qClean]);

  const filteredTransactions = useMemo(() => {
    if (!qClean) return transactions.slice(0, 8);
    return transactions.filter((t) => {
      const amountStr = t.amount.toString();
      const amountFmt = t.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      return (
        t.description.toLowerCase().includes(qClean) ||
        (t.category && t.category.toLowerCase().includes(qClean)) ||
        amountStr.includes(qClean) ||
        amountFmt.includes(qClean) ||
        (t.type && t.type.toLowerCase().includes(qClean)) ||
        (t.date && t.date.includes(qClean))
      );
    }).slice(0, 15);
  }, [transactions, qClean]);

  const filteredAssets = useMemo(() => {
    if (!qClean) return assets.slice(0, 8);
    return assets.filter((a) => {
      return (
        a.name.toLowerCase().includes(qClean) ||
        (a.tag && a.tag.toLowerCase().includes(qClean)) ||
        (a.category && a.category.toLowerCase().includes(qClean)) ||
        (a.location && a.location.toLowerCase().includes(qClean)) ||
        (a.status && a.status.toLowerCase().includes(qClean))
      );
    }).slice(0, 15);
  }, [assets, qClean]);

  // Quick navigation and actions
  const quickActions = [
    {
      id: "act-new-member",
      title: "Cadastrar Novo Membro",
      desc: "Abrir formulário de cadastro na Secretaria",
      icon: User,
      category: "Secretaria",
      action: () => {
        onOpenChange(false);
        navigate("/secretaria", { state: { openNewMember: true } });
      }
    },
    {
      id: "act-reports-tithers",
      title: "Relatório de Dizimistas e Ofertantes",
      desc: "Consultar ranking de contribuições e exportar PDF",
      icon: Sparkles,
      category: "Secretaria / Relatórios",
      action: () => {
        onOpenChange(false);
        navigate("/secretaria", { state: { activeTab: "relatorios", reportSubTab: "dizimistas" } });
      }
    },
    {
      id: "act-new-tx",
      title: "Novo Lançamento Financeiro",
      desc: "Registrar dízimo, oferta ou despesa de caixa",
      icon: PlusCircle,
      category: "Financeiro",
      action: () => {
        onOpenChange(false);
        navigate("/financeiro", { state: { openNewTransaction: true } });
      }
    },
    {
      id: "act-patrimonio",
      title: "Cadastrar Item de Patrimônio",
      desc: "Adicionar bem, equipamento ou mobiliário",
      icon: Archive,
      category: "Patrimônio",
      action: () => {
        onOpenChange(false);
        navigate("/patrimonio", { state: { openAddModal: true } });
      }
    },
    {
      id: "act-agenda",
      title: "Novo Compromisso na Agenda",
      desc: "Agendar culto, reunião pastoral ou evento",
      icon: Calendar,
      category: "Agenda",
      action: () => {
        onOpenChange(false);
        navigate("/agenda", { state: { openNewReminder: true } });
      }
    },
    {
      id: "act-nav-dash",
      title: "Ir para o Dashboard Geral",
      desc: "Visão executiva com indicadores e gráficos",
      icon: Building2,
      category: "Navegação",
      action: () => {
        onOpenChange(false);
        navigate("/");
      }
    },
    {
      id: "act-nav-config",
      title: "Configurações do Sistema",
      desc: "Dados da igreja, filiais e parâmetros gerais",
      icon: Settings,
      category: "Configurações",
      action: () => {
        onOpenChange(false);
        navigate("/configuracoes");
      }
    }
  ];

  const filteredActions = useMemo(() => {
    if (!qClean) return quickActions;
    return quickActions.filter(
      (a) =>
        a.title.toLowerCase().includes(qClean) ||
        a.desc.toLowerCase().includes(qClean) ||
        a.category.toLowerCase().includes(qClean)
    );
  }, [quickActions, qClean]);

  const handleSelectMember = (member: MemberItem) => {
    onOpenChange(false);
    navigate("/secretaria", { state: { memberIdToOpen: member.id, searchTerm: member.name } });
  };

  const handleSelectTransaction = (tx: TransactionItem) => {
    onOpenChange(false);
    navigate("/financeiro", { state: { highlightTxId: tx.id, searchTerm: tx.description } });
  };

  const handleSelectAsset = (asset: AssetItem) => {
    onOpenChange(false);
    navigate("/patrimonio", { state: { searchTerm: asset.name } });
  };

  const handleSelectEvent = (event: AgendaItem) => {
    onOpenChange(false);
    navigate("/agenda", { state: { selectedEventId: event.id, searchTerm: event.title } });
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col border-b border-border/60 bg-muted/20">
        <CommandInput
          placeholder="Buscar membros, lançamentos financeiros, agenda/eventos ou patrimônio... (Ctrl+K)"
          value={searchQuery}
          onValueChange={setSearchQuery}
          className="text-base"
        />

        {/* Category Filters Pills */}
        <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto border-t border-border/40 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`px-2.5 py-1 rounded-full font-medium transition-colors ${
              activeTab === "all"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted"
            }`}
          >
            Tudo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("members")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-colors ${
              activeTab === "members"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted"
            }`}
          >
            <Users className="w-3 h-3" />
            Membros ({members.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("finance")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-colors ${
              activeTab === "finance"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted"
            }`}
          >
            <DollarSign className="w-3 h-3" />
            Financeiro ({transactions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("agenda")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-colors ${
              activeTab === "agenda"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted"
            }`}
          >
            <Calendar className="w-3 h-3" />
            Agenda ({events.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("assets")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-colors ${
              activeTab === "assets"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted"
            }`}
          >
            <Archive className="w-3 h-3" />
            Patrimônio ({assets.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("actions")}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full font-medium transition-colors ${
              activeTab === "actions"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-muted/70 text-muted-foreground hover:bg-muted"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Ações Rápidas
          </button>
        </div>
      </div>

      <CommandList className="max-h-[380px] p-2">
        <CommandEmpty className="py-8 text-center text-sm text-muted-foreground">
          Nenhum registro encontrado para "{searchQuery}".
        </CommandEmpty>

        {/* 1. Quick Actions */}
        {(activeTab === "all" || activeTab === "actions") && filteredActions.length > 0 && (
          <CommandGroup heading="Ações Rápidas & Navegação">
            {filteredActions.map((action) => {
              const Icon = action.icon;
              return (
                <CommandItem
                  key={action.id}
                  onSelect={action.action}
                  className="flex items-center justify-between p-2.5 cursor-pointer rounded-lg hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">{action.title}</div>
                      <div className="text-xs text-muted-foreground">{action.desc}</div>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-semibold">
                    {action.category}
                  </Badge>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* 2. Members Group */}
        {(activeTab === "all" || activeTab === "members") && filteredMembers.length > 0 && (
          <CommandGroup heading={`Membros Cadastrados (${filteredMembers.length})`}>
            {filteredMembers.map((member) => (
              <CommandItem
                key={`member-${member.id}`}
                onSelect={() => handleSelectMember(member)}
                className="flex items-center justify-between p-2.5 cursor-pointer rounded-lg hover:bg-accent"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold text-xs shrink-0">
                    {member.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{member.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {member.role || "Membro"}
                      {member.cpf ? ` • CPF: ${member.cpf}` : ""}
                      {member.phone ? ` • Tel: ${member.phone}` : ""}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    variant={member.status === "Ativo" ? "default" : "secondary"}
                    className={
                      member.status === "Ativo"
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]"
                        : "text-[10px]"
                    }
                  >
                    {member.status || "Ativo"}
                  </Badge>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* 3. Finance Transactions Group */}
        {(activeTab === "all" || activeTab === "finance") && filteredTransactions.length > 0 && (
          <CommandGroup heading={`Transações Financeiras (${filteredTransactions.length})`}>
            {filteredTransactions.map((tx) => {
              const isEntrada = tx.type === "entrada";
              return (
                <CommandItem
                  key={`tx-${tx.id}`}
                  onSelect={() => handleSelectTransaction(tx)}
                  className="flex items-center justify-between p-2.5 cursor-pointer rounded-lg hover:bg-accent"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-md shrink-0 ${
                        isEntrada
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-400"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400"
                      }`}
                    >
                      {isEntrada ? (
                        <ArrowDownRight className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{tx.description}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                        <span>{tx.category || "Geral"}</span>
                        {tx.date && <span>• {new Date(tx.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</span>}
                        {tx.paymentMethod && <span>• {tx.paymentMethod}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-semibold text-sm ${
                        isEntrada ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {isEntrada ? "+" : "-"}{" "}
                      {tx.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* 4. Agenda & Events Group */}
        {(activeTab === "all" || activeTab === "agenda") && filteredEvents.length > 0 && (
          <CommandGroup heading={`Agenda & Eventos (${filteredEvents.length})`}>
            {filteredEvents.map((evt) => {
              const formatEventDate = (val: any) => {
                if (!val) return "";
                try {
                  const d = val.toDate ? val.toDate() : new Date(val);
                  if (!isNaN(d.getTime())) {
                    return d.toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    });
                  }
                } catch {}
                return String(val);
              };

              return (
                <CommandItem
                  key={`evt-${evt.id}`}
                  onSelect={() => handleSelectEvent(evt)}
                  className="flex items-center justify-between p-2.5 cursor-pointer rounded-lg hover:bg-accent"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-400 shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{evt.title}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5 truncate">
                        <span>{evt.type || "Evento"}</span>
                        {evt.start && <span>• {formatEventDate(evt.start)}</span>}
                        {evt.location && <span>• {evt.location}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-[10px] text-indigo-600 dark:text-indigo-400 border-indigo-200">
                      {evt.type || "Agenda"}
                    </Badge>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/* 5. Assets Group */}
        {(activeTab === "all" || activeTab === "assets") && filteredAssets.length > 0 && (
          <CommandGroup heading={`Patrimônio & Bens (${filteredAssets.length})`}>
            {filteredAssets.map((asset) => (
              <CommandItem
                key={`asset-${asset.id}`}
                onSelect={() => handleSelectAsset(asset)}
                className="flex items-center justify-between p-2.5 cursor-pointer rounded-lg hover:bg-accent"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-8 h-8 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400 shrink-0">
                    <Archive className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">{asset.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {asset.tag ? `Tombo: ${asset.tag} • ` : ""}
                      {asset.location ? `Local: ${asset.location} • ` : ""}
                      {asset.category || "Geral"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {asset.value ? (
                    <span className="text-xs font-semibold text-muted-foreground">
                      {asset.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  ) : null}
                  <Badge variant="outline" className="text-[10px]">
                    {asset.status || "Ativo"}
                  </Badge>
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-60" />
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>

      <div className="flex items-center justify-between px-3 py-2 border-t border-border/40 text-[11px] text-muted-foreground bg-muted/10">
        <div className="flex items-center gap-3">
          <span>Navegar: <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px]">↓</kbd></span>
          <span>Abrir: <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px]">Enter</kbd></span>
          <span>Fechar: <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px]">Esc</kbd></span>
        </div>
        <div>
          <span>Dica: Pressione <kbd className="px-1.5 py-0.5 rounded border bg-muted font-mono text-[10px]">Ctrl+K</kbd> a qualquer momento</span>
        </div>
      </div>
    </CommandDialog>
  );
}
