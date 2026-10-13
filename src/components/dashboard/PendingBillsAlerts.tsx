import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  Calendar, 
  Filter, 
  PlusCircle, 
  ExternalLink,
  Check,
  Building2,
  User,
  Sparkles
} from "lucide-react";
import { Link } from "react-router-dom";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { matchesBranch } from "@/lib/branchUtils";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'entrada' | 'saida' | 'income' | 'expense';
  status?: string;
  date: string;
  dueDate?: string;
  category?: string;
  supplier?: string;
  memberId?: string;
  memberName?: string;
  documentNumber?: string;
  branchId?: string;
}

interface PendingBillsAlertsProps {
  transactions: Transaction[];
  onRefresh?: () => void;
}

export function PendingBillsAlerts({ transactions, onRefresh }: PendingBillsAlertsProps) {
  const { user } = useAuth();
  const { activeBranch, branches } = useBranch();
  const [filterType, setFilterType] = useState<'all' | 'pagar' | 'receber' | 'urgent'>('all');
  const [isNewBillDialogOpen, setIsNewBillDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  // Parse pending items
  const pendingItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return transactions
      .filter(t => {
        // Pending status
        const isPending = t.status === 'Pendente' || (!t.status && t.type === 'saida');
        // If branch filter is active
        if (!matchesBranch(t, activeBranch, branches)) {
          return false;
        }
        return isPending;
      })
      .map(t => {
        // Standardize type
        const isExpense = t.type === 'saida' || t.type === 'expense';
        const dateStr = t.dueDate || t.date;
        
        // Parse date
        let dueDateObj: Date;
        if (dateStr.includes('/')) {
          const [d, m, y] = dateStr.split('/');
          dueDateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        } else {
          dueDateObj = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
        }
        dueDateObj.setHours(0, 0, 0, 0);

        const diffTime = dueDateObj.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let urgency: 'overdue' | 'today' | 'near' | 'normal' = 'normal';
        if (diffDays < 0) urgency = 'overdue';
        else if (diffDays === 0) urgency = 'today';
        else if (diffDays <= 7) urgency = 'near';

        return {
          ...t,
          isExpense,
          dueDateObj,
          diffDays,
          urgency
        };
      })
      .sort((a, b) => a.diffDays - b.diffDays);
  }, [transactions, activeBranch]);

  // Totals calculations
  const stats = useMemo(() => {
    const pagarList = pendingItems.filter(i => i.isExpense);
    const receberList = pendingItems.filter(i => !i.isExpense);
    const overdueList = pendingItems.filter(i => i.urgency === 'overdue');
    const nearList = pendingItems.filter(i => i.urgency === 'today' || i.urgency === 'near');

    const totalPagar = pagarList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalReceber = receberList.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalOverdue = overdueList.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return {
      totalPagar,
      totalReceber,
      totalOverdue,
      countPagar: pagarList.length,
      countReceber: receberList.length,
      countOverdue: overdueList.length,
      countNear: nearList.length
    };
  }, [pendingItems]);

  // Filtered list based on tab
  const displayedItems = useMemo(() => {
    if (filterType === 'pagar') return pendingItems.filter(i => i.isExpense);
    if (filterType === 'receber') return pendingItems.filter(i => !i.isExpense);
    if (filterType === 'urgent') return pendingItems.filter(i => i.urgency === 'overdue' || i.urgency === 'today' || i.urgency === 'near');
    return pendingItems;
  }, [pendingItems, filterType]);

  // Quick action: settle bill
  const handleMarkAsSettled = async (item: typeof pendingItems[0]) => {
    try {
      setMarkingId(item.id);
      const txRef = doc(db, "transactions", item.id);
      await updateDoc(txRef, {
        status: "Pago",
        settledAt: serverTimestamp(),
        settledBy: user?.name || "Administrador"
      });

      toast.success(
        item.isExpense 
          ? `Conta "${item.description}" marcada como PAGA com sucesso!` 
          : `Receita "${item.description}" marcada como RECEBIDA com sucesso!`
      );
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      toast.error("Não foi possível atualizar o status da conta.");
    } finally {
      setMarkingId(null);
    }
  };

  // Quick action: add new pending bill
  const handleCreatePendingBill = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const type = formData.get("billType") as "saida" | "entrada";
    const description = formData.get("description") as string;
    const amountStr = (formData.get("amount") as string).replace(',', '.');
    const amount = parseFloat(amountStr);
    const dueDate = formData.get("dueDate") as string;
    const category = formData.get("category") as string;
    const supplier = formData.get("supplier") as string;

    if (!description || isNaN(amount) || !dueDate) {
      toast.error("Preencha todos os campos obrigatórios.");
      setIsSubmitting(false);
      return;
    }

    try {
      await addDoc(collection(db, "transactions"), {
        description,
        amount,
        type,
        status: "Pendente",
        date: dueDate,
        dueDate,
        category: category || (type === 'saida' ? "Contas a Pagar" : "Contas a Receber"),
        supplier: supplier || "",
        branchId: activeBranch !== 'all' ? activeBranch : 'default_branch',
        createdAt: serverTimestamp(),
        createdBy: user?.name || "Administrador"
      });

      toast.success("Nova pendência financeira registrada com sucesso!");
      setIsNewBillDialogOpen(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar a pendência.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-border/80 dark:border-border/60 shadow-sm overflow-hidden" id="pending-bills-section">
      <CardHeader className="pb-4 border-b border-border/50 bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent dark:from-amber-950/25 dark:via-orange-950/15">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <CardTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                  Pendências Financeiras & Vencimentos
                  {pendingItems.length > 0 && (
                    <Badge variant="destructive" className="h-5 text-xs font-semibold px-2 bg-amber-600 hover:bg-amber-600 text-white dark:bg-amber-500">
                      {pendingItems.length} {pendingItems.length === 1 ? 'pendência' : 'pendências'}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-sm">
                  Acompanhamento de contas a pagar e receber próximas ao vencimento ou em atraso.
                </CardDescription>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Dialog open={isNewBillDialogOpen} onOpenChange={setIsNewBillDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5 h-9 font-medium border-amber-300 dark:border-amber-700/60 hover:bg-amber-50 dark:hover:bg-amber-950/30">
                  <PlusCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  Nova Pendência
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <form onSubmit={handleCreatePendingBill}>
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold">Registrar Conta Pendente</DialogTitle>
                    <DialogDescription>
                      Cadastre uma conta a pagar ou a receber com data de vencimento programada.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="billType">Tipo de Movimentação *</Label>
                      <Select name="billType" defaultValue="saida">
                        <SelectTrigger id="billType">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="saida">Conta a Pagar (Despesa / Saída)</SelectItem>
                          <SelectItem value="entrada">Conta a Receber (Receita / Entrada)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="description">Descrição / Fornecedor / Membro *</Label>
                      <Input id="description" name="description" placeholder="Ex: Conta de Energia - Sede, Dízimo Prometido..." required />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="amount">Valor (R$) *</Label>
                        <Input id="amount" name="amount" type="number" step="0.01" min="0" placeholder="0,00" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="dueDate">Vencimento *</Label>
                        <Input id="dueDate" name="dueDate" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <Label htmlFor="category">Categoria</Label>
                        <Select name="category" defaultValue="Água/Luz">
                          <SelectTrigger id="category">
                            <SelectValue placeholder="Categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Água/Luz">Água / Luz / Internet</SelectItem>
                            <SelectItem value="Aluguel">Aluguel / Imóvel</SelectItem>
                            <SelectItem value="Manutenção">Manutenção Predial</SelectItem>
                            <SelectItem value="Missões">Missões / Ajuda</SelectItem>
                            <SelectItem value="Dízimo">Dízimo Programado</SelectItem>
                            <SelectItem value="Doação">Doação / Oferta</SelectItem>
                            <SelectItem value="Outros">Outros</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="supplier">Favorecido / Fornecedor</Label>
                        <Input id="supplier" name="supplier" placeholder="Ex: Enel, Sabesp..." />
                      </div>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setIsNewBillDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white">
                      {isSubmitting ? "Salvando..." : "Salvar Pendência"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            <Link to="/financeiro" className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground font-medium px-2.5 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
              Módulo Financeiro <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </div>
        </div>

        {/* Quick summary metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
          <div className="rounded-xl border border-red-200/80 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-3">
            <div className="flex items-center justify-between text-xs font-medium text-red-700 dark:text-red-400">
              <span>Vencidas (Atrasadas)</span>
              <AlertTriangle className="h-3.5 w-3.5" />
            </div>
            <div className="text-lg font-bold text-red-800 dark:text-red-300 mt-1">
              R$ {stats.totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-red-600/80 dark:text-red-400/80 font-medium">
              {stats.countOverdue} {stats.countOverdue === 1 ? 'conta vencida' : 'contas vencidas'}
            </div>
          </div>

          <div className="rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 p-3">
            <div className="flex items-center justify-between text-xs font-medium text-amber-700 dark:text-amber-400">
              <span>Próximas (7 Dias)</span>
              <Clock className="h-3.5 w-3.5" />
            </div>
            <div className="text-lg font-bold text-amber-800 dark:text-amber-300 mt-1">
              {stats.countNear} {stats.countNear === 1 ? 'pendência' : 'pendências'}
            </div>
            <div className="text-[11px] text-amber-600/80 dark:text-amber-400/80 font-medium">
              Atenção no fluxo de caixa
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Total a Pagar</span>
              <ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <div className="text-lg font-bold text-foreground mt-1">
              R$ {stats.totalPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">
              {stats.countPagar} {stats.countPagar === 1 ? 'saída pendente' : 'saídas pendentes'}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Total a Receber</span>
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              R$ {stats.totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-muted-foreground font-medium">
              {stats.countReceber} {stats.countReceber === 1 ? 'entrada prevista' : 'entradas previstas'}
            </div>
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-1.5 pt-2 overflow-x-auto pb-1">
          <Button
            size="sm"
            variant={filterType === 'all' ? 'default' : 'ghost'}
            className="h-7 text-xs rounded-full px-3"
            onClick={() => setFilterType('all')}
          >
            Todas ({pendingItems.length})
          </Button>
          <Button
            size="sm"
            variant={filterType === 'urgent' ? 'default' : 'ghost'}
            className="h-7 text-xs rounded-full px-3"
            onClick={() => setFilterType('urgent')}
          >
            Urgentes & Vencidas ({stats.countOverdue + stats.countNear})
          </Button>
          <Button
            size="sm"
            variant={filterType === 'pagar' ? 'default' : 'ghost'}
            className="h-7 text-xs rounded-full px-3"
            onClick={() => setFilterType('pagar')}
          >
            A Pagar ({stats.countPagar})
          </Button>
          <Button
            size="sm"
            variant={filterType === 'receber' ? 'default' : 'ghost'}
            className="h-7 text-xs rounded-full px-3"
            onClick={() => setFilterType('receber')}
          >
            A Receber ({stats.countReceber})
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {displayedItems.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-base font-semibold text-foreground">
                Tudo em dia com as contas!
              </h4>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                {filterType === 'all' 
                  ? "Nenhuma pendência financeira ou conta em aberto no momento. Todas as obrigações e receitas estão devidamente conciliadas."
                  : "Nenhuma conta pendente encontrada para este filtro selecionado."}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsNewBillDialogOpen(true)}
              className="mt-2"
            >
              <PlusCircle className="h-4 w-4 mr-2 text-primary" />
              Agendar Nova Conta
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border/60 max-h-[380px] overflow-y-auto">
            {displayedItems.map((item) => {
              const isMarking = markingId === item.id;

              return (
                <div 
                  key={item.id} 
                  className={`p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-colors hover:bg-muted/40 ${
                    item.urgency === 'overdue' ? 'bg-red-500/5 dark:bg-red-950/15' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                      item.urgency === 'overdue' 
                        ? 'bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400' 
                        : item.urgency === 'today'
                        ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                        : item.urgency === 'near'
                        ? 'bg-orange-100 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400'
                        : item.isExpense 
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' 
                        : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {item.isExpense ? (
                        <ArrowDownRight className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-foreground truncate max-w-[260px] sm:max-w-md">
                          {item.description}
                        </span>

                        {/* Urgency Badge */}
                        {item.urgency === 'overdue' && (
                          <Badge variant="destructive" className="text-[10px] font-bold px-1.5 py-0 h-4 bg-red-600 text-white">
                            VENCEU HÁ {Math.abs(item.diffDays)} {Math.abs(item.diffDays) === 1 ? 'DIA' : 'DIAS'}
                          </Badge>
                        )}
                        {item.urgency === 'today' && (
                          <Badge className="text-[10px] font-bold px-1.5 py-0 h-4 bg-amber-500 text-slate-950">
                            VENCE HOJE
                          </Badge>
                        )}
                        {item.urgency === 'near' && (
                          <Badge variant="outline" className="text-[10px] font-medium px-1.5 py-0 h-4 border-orange-300 text-orange-700 dark:text-orange-400 dark:border-orange-800">
                            Em {item.diffDays} {item.diffDays === 1 ? 'dia' : 'dias'}
                          </Badge>
                        )}

                        <span className="text-xs text-muted-foreground">
                          {item.isExpense ? "Conta a Pagar" : "Conta a Receber"}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1 font-medium text-foreground/80">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          Vencimento: {item.dueDateObj.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </span>
                        {item.category && (
                          <span className="bg-muted px-2 py-0.5 rounded-md text-[11px]">
                            {item.category}
                          </span>
                        )}
                        {item.supplier && (
                          <span className="flex items-center gap-1 truncate max-w-[150px]">
                            <Building2 className="h-3 w-3" /> {item.supplier}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                    <div className="text-left sm:text-right">
                      <div className={`text-base font-bold ${
                        item.isExpense 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {item.isExpense ? '- ' : '+ '}
                        R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                        Pendente
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isMarking}
                      onClick={() => handleMarkAsSettled(item)}
                      className={`h-8 px-2.5 text-xs font-medium border-border hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-400 ${
                        item.urgency === 'overdue' ? 'border-red-300 dark:border-red-900/60' : ''
                      }`}
                      title={item.isExpense ? "Confirmar Pagamento da Conta" : "Confirmar Recebimento da Receita"}
                    >
                      <Check className="h-3.5 w-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                      {isMarking ? "Baixando..." : item.isExpense ? "Dar Baixa" : "Recebido"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
