import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Lock,
  Unlock,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  FileCheck2,
  History,
  Info,
  Clock,
  User,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  FolderArchive,
  Tag,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import {
  ClosedFinancialMonth,
  formatYearMonthDisplay,
  lockFinancialMonth,
  unlockFinancialMonth,
  getClosedMonthRecord,
} from "@/lib/closedMonthsHelper";
import { FolderCoverAndLabelsModal } from "./FolderCoverAndLabelsModal";

export interface ClosedMonthManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  yearMonth: string; // "YYYY-MM"
  branchId: string;
  branchName: string;
  transactions?: any[];
  totalEntradas?: number;
  totalSaidas?: number;
  saldoAnterior?: number;
  saldoAtual?: number;
  totalTransacoes?: number;
  userName: string;
  userEmail?: string;
  currentLockRecord?: ClosedFinancialMonth;
  allClosedMonths: ClosedFinancialMonth[];
  onLockStatusChanged?: () => void;
  onOpenFolderCovers?: (yearMonth: string) => void;
}

export function ClosedMonthManagerModal({
  isOpen,
  onClose,
  yearMonth,
  branchId,
  branchName,
  transactions = [],
  totalEntradas: initialTotalEntradas,
  totalSaidas: initialTotalSaidas,
  saldoAnterior: initialSaldoAnterior,
  saldoAtual: initialSaldoAtual,
  totalTransacoes: initialTotalTransacoes,
  userName,
  userEmail,
  currentLockRecord: initialLockRecord,
  allClosedMonths,
  onLockStatusChanged,
  onOpenFolderCovers,
}: ClosedMonthManagerModalProps) {
  // Mês selecionado no modal
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(yearMonth);
  const [activeTab, setActiveTab] = useState<"current" | "pending" | "history">("current");
  const [notes, setNotes] = useState("");
  const [unlockReason, setUnlockReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCoverModalOpen, setIsCoverModalOpen] = useState(false);

  // Mês atual do calendário (ex: "2026-11")
  const currentCalendarMonth = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // Quando a prop yearMonth muda ao abrir o modal, atualiza selectedYearMonth
  useEffect(() => {
    if (yearMonth) {
      setSelectedYearMonth(yearMonth);
    }
  }, [yearMonth, isOpen]);

  // Lista todos os meses distintos com movimentação (ou previstos)
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentCalendarMonth);

    // Mês anterior garantido
    const d = new Date();
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    set.add(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);

    transactions.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.substring(0, 7));
      }
    });

    return Array.from(set).sort().reverse();
  }, [transactions, currentCalendarMonth]);

  // Identifica meses anteriores ao mês vigente que ainda NÃO foram travados e têm movimentação
  const openPriorMonths = useMemo(() => {
    return availableMonths.filter((ym) => {
      // Meses que já findaram (anteriores ao mês atual)
      if (ym >= currentCalendarMonth) return false;
      const rec = getClosedMonthRecord(allClosedMonths, ym, branchId);
      const isLocked = Boolean(rec?.isLocked);
      return !isLocked;
    });
  }, [availableMonths, currentCalendarMonth, allClosedMonths, branchId]);

  // Se houver mês anterior em aberto e o usuário abriu no mês atual, destaca o mês anterior
  const oldestUnclosedPriorMonth = openPriorMonths.length > 0 ? openPriorMonths[0] : null;

  // Recalcula métricas dinamicamente para o selectedYearMonth
  const activeMetrics = useMemo(() => {
    // Se o selectedYearMonth for igual ao yearMonth original e tivermos transações calculadas
    if (transactions.length === 0 && initialTotalEntradas !== undefined) {
      return {
        saldoAnterior: initialSaldoAnterior || 0,
        totalEntradas: initialTotalEntradas || 0,
        totalSaidas: initialTotalSaidas || 0,
        saldoAtual: initialSaldoAtual || 0,
        totalTransacoes: initialTotalTransacoes || 0,
      };
    }

    let anterior = 0;
    let entradas = 0;
    let saidas = 0;
    let count = 0;

    transactions.forEach((t) => {
      if (!t.date) return;
      const txMonth = t.date.substring(0, 7);
      const val = Number(t.amount || 0);

      if (txMonth === selectedYearMonth) {
        count++;
        if (t.type === "entrada") entradas += val;
        else if (t.type === "saida") saidas += val;
      } else if (txMonth < selectedYearMonth) {
        if (t.type === "entrada") anterior += val;
        else if (t.type === "saida") anterior -= val;
      }
    });

    return {
      saldoAnterior: anterior,
      totalEntradas: entradas,
      totalSaidas: saidas,
      saldoAtual: anterior + entradas - saidas,
      totalTransacoes: count,
    };
  }, [
    transactions,
    selectedYearMonth,
    initialSaldoAnterior,
    initialTotalEntradas,
    initialTotalSaidas,
    initialSaldoAtual,
    initialTotalTransacoes,
  ]);

  // Registro de trava do mês selecionado
  const currentLockRecord = useMemo(() => {
    return getClosedMonthRecord(allClosedMonths, selectedYearMonth, branchId);
  }, [allClosedMonths, selectedYearMonth, branchId]);

  const isLocked = Boolean(currentLockRecord?.isLocked);
  const monthLabel = formatYearMonthDisplay(selectedYearMonth);

  const handleLock = async () => {
    setIsSubmitting(true);
    try {
      const res = await lockFinancialMonth({
        yearMonth: selectedYearMonth,
        branchId,
        totalEntradas: activeMetrics.totalEntradas,
        totalSaidas: activeMetrics.totalSaidas,
        saldoFinal: activeMetrics.saldoAtual,
        userName,
        userEmail,
        notes: notes.trim(),
      });
      if (res.success) {
        toast.success(res.message);
        setNotes("");
        onLockStatusChanged?.();
      }
    } catch (err: any) {
      toast.error("Erro ao travar mês: " + (err.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlock = async () => {
    if (!unlockReason.trim()) {
      toast.error("Por favor, informe a justificativa para destravar o mês.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await unlockFinancialMonth({
        yearMonth: selectedYearMonth,
        branchId,
        userName,
        userEmail,
        reason: unlockReason.trim(),
      });
      if (res.success) {
        toast.success(res.message);
        setUnlockReason("");
        onLockStatusChanged?.();
      }
    } catch (err: any) {
      toast.error("Erro ao destravar mês: " + (err.message || String(err)));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[92vh] flex flex-col p-0 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
          {/* Header Superior */}
          <DialogHeader className="!m-0 p-5 sm:p-6 pb-4 border-b border-border bg-muted/20 sticky top-0 bg-background z-10 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  {isLocked ? (
                    <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  )}
                  <span>Fechamento & Trava Contábil do Mês</span>
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm mt-0.5">
                  Congela ou libera os lançamentos financeiros da congregação <strong>{branchName}</strong>.
                </DialogDescription>
              </div>

              {/* Status e Seletor Rápido de Mês */}
              <div className="flex items-center gap-2">
                <Badge
                  variant={isLocked ? "destructive" : "outline"}
                  className={
                    isLocked
                      ? "bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 py-1 px-3 text-xs font-bold"
                      : "bg-emerald-50 text-emerald-800 border-emerald-300 py-1 px-3 text-xs font-semibold"
                  }
                >
                  {isLocked ? "🔒 Mês Travado (Bloqueado)" : "🔓 Mês Aberto"}
                </Badge>
              </div>
            </div>

            {/* Barra de Seleção de Mês e Abas */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  variant={activeTab === "current" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("current")}
                  className="text-xs rounded-xl font-semibold"
                >
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  {monthLabel}
                </Button>

                <Button
                  variant={activeTab === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("pending")}
                  className={`text-xs rounded-xl font-semibold ${
                    openPriorMonths.length > 0
                      ? "border-amber-400 text-amber-900 dark:text-amber-200 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40"
                      : ""
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                  Meses em Aberto ({openPriorMonths.length})
                </Button>

                <Button
                  variant={activeTab === "history" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("history")}
                  className="text-xs rounded-xl font-semibold"
                >
                  <History className="w-3.5 h-3.5 mr-1.5" />
                  Histórico de Fechados ({allClosedMonths.length})
                </Button>
              </div>

              {/* Seletor dropdown para escolher qualquer mês */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  Mudar Mês:
                </span>
                <Select value={selectedYearMonth} onValueChange={setSelectedYearMonth}>
                  <SelectTrigger className="h-8 text-xs w-[170px] bg-background font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((ym) => {
                      const rec = getClosedMonthRecord(allClosedMonths, ym, branchId);
                      const isMonthLock = Boolean(rec?.isLocked);
                      return (
                        <SelectItem key={ym} value={ym} className="text-xs">
                          {formatYearMonthDisplay(ym)} {isMonthLock ? "🔒" : "🔓"}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </DialogHeader>

          {/* Conteúdo do Modal */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
            {/* Alerta de Meses Anteriores Não Travados (ex: Outubro quando estamos em Novembro) */}
            {oldestUnclosedPriorMonth && activeTab === "current" && selectedYearMonth !== oldestUnclosedPriorMonth && (
              <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-l-4 border-amber-500 border-y border-r border-amber-300 dark:border-amber-800 p-3.5 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200">
                      Mês anterior em aberto: {formatYearMonthDisplay(oldestUnclosedPriorMonth)}
                    </h5>
                    <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mt-0.5">
                      Este mês já foi concluído no calendário, mas ainda não foi travado. Deseja conferir e realizar a trava contábil dele agora?
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => setSelectedYearMonth(oldestUnclosedPriorMonth)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-8 shrink-0 rounded-lg shadow-xs"
                >
                  <Lock className="w-3.5 h-3.5 mr-1.5" /> Travar {formatYearMonthDisplay(oldestUnclosedPriorMonth)}
                </Button>
              </div>
            )}

            {/* ABA 1: GERENCIAR O MÊS ATUAL / SELECIONADO */}
            {activeTab === "current" && (
              <div className="space-y-5">
                {/* Banner de Botões Rápidos de Pasta e Etiquetas */}
                <div className="flex items-center justify-between bg-muted/40 p-3 rounded-xl border border-border">
                  <div className="flex items-center gap-2">
                    <FolderArchive className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-foreground">
                      Documentação Física da Pasta de <strong>{monthLabel}</strong>
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (onOpenFolderCovers) onOpenFolderCovers(selectedYearMonth);
                      else setIsCoverModalOpen(true);
                    }}
                    className="text-xs h-8 border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold"
                  >
                    <Tag className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    Gerar Capa A4 & Etiquetas da Pasta
                  </Button>
                </div>

                {/* Cards de Métricas do Mês Selecionado */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase block">Saldo Anterior</span>
                    <span className="text-sm sm:text-base font-bold font-mono text-slate-800 dark:text-slate-200">
                      R$ {activeMetrics.saldoAnterior.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase flex items-center gap-1">
                      <ArrowUpRight className="w-3 h-3" /> Entradas
                    </span>
                    <span className="text-sm sm:text-base font-bold font-mono text-emerald-700 dark:text-emerald-300">
                      + R$ {activeMetrics.totalEntradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl">
                    <span className="text-[10px] font-bold text-rose-800 dark:text-rose-400 uppercase flex items-center gap-1">
                      <ArrowDownRight className="w-3 h-3" /> Saídas
                    </span>
                    <span className="text-sm sm:text-base font-bold font-mono text-rose-700 dark:text-rose-300">
                      - R$ {activeMetrics.totalSaidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-xl">
                    <span className="text-[10px] font-bold text-blue-900 dark:text-blue-300 uppercase flex items-center gap-1">
                      <Wallet className="w-3 h-3" /> Saldo Final
                    </span>
                    <span className="text-sm sm:text-base font-bold font-mono text-blue-700 dark:text-blue-300">
                      R$ {activeMetrics.saldoAtual.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                {/* Status e Ações do Mês */}
                {isLocked ? (
                  <div className="space-y-4">
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-amber-500 text-white rounded-xl shrink-0 mt-0.5">
                          <Lock className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <h4 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                            O mês de {monthLabel} está oficialmente FECHADO e TRAVADO
                          </h4>
                          <p className="text-xs text-amber-900/80 dark:text-amber-300/80 leading-relaxed">
                            Nenhum membro ou operador poderá cadastrar novas movimentações, editar valores existentes ou excluir transações pertencentes a <strong>{monthLabel}</strong>.
                          </p>
                          <div className="pt-3 border-t border-amber-200 dark:border-amber-800/80 text-xs text-amber-900 dark:text-amber-300 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <span className="text-amber-700 dark:text-amber-400">Travado por:</span>{" "}
                              <strong>{currentLockRecord?.lockedBy}</strong>
                            </div>
                            <div>
                              <span className="text-amber-700 dark:text-amber-400">Data da Trava:</span>{" "}
                              <strong>
                                {currentLockRecord?.lockedAt
                                  ? new Date(currentLockRecord.lockedAt).toLocaleString("pt-BR")
                                  : "-"}
                              </strong>
                            </div>
                          </div>
                          {currentLockRecord?.notes && (
                            <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40 p-2.5 rounded-lg mt-2 italic">
                              "{currentLockRecord.notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Formulário para Destravar com Justificativa */}
                    <div className="border border-border rounded-2xl p-4 sm:p-5 space-y-3 bg-card">
                      <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
                        <Unlock className="w-4 h-4 text-amber-600" />
                        <span>Reabrir / Destravar Mês Contábil</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Caso seja estritamente necessário lançar uma nota atrasada ou corrigir um valor, informe a justificativa abaixo. Essa reabertura será gravada no histórico de auditoria contábil.
                      </p>
                      <div className="space-y-1.5">
                        <Label htmlFor="unlockReason" className="text-xs">
                          Justificativa para reabrir este mês <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id="unlockReason"
                          placeholder="Ex: Correção de comprovante bancário solicitado pela comissão fiscal..."
                          value={unlockReason}
                          onChange={(e) => setUnlockReason(e.target.value)}
                          className="text-xs h-20 resize-none bg-background"
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <Button
                          variant="outline"
                          onClick={handleUnlock}
                          disabled={isSubmitting || !unlockReason.trim()}
                          className="text-xs font-semibold border-amber-300 text-amber-900 dark:text-amber-200 hover:bg-amber-50"
                        >
                          <Unlock className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                          {isSubmitting ? "Destravando..." : "Confirmar e Destravar Mês"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* MÊS EM ABERTO: OPÇÃO DE TRAVAR */
                  <div className="space-y-4">
                    <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 sm:p-5">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-600 text-white rounded-xl shrink-0 mt-0.5">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-200">
                            Pronto para fechar e travar o mês de {monthLabel}?
                          </h4>
                          <p className="text-xs text-emerald-900/80 dark:text-emerald-300/80 leading-relaxed">
                            Ao travar este mês, as <strong>{activeMetrics.totalTransacoes} transações</strong> registradas serão blindadas contra edições e exclusões, garantindo a integridade dos balancetes físicos e assembleias.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border border-border rounded-2xl p-4 sm:p-5 space-y-3 bg-card">
                      <div className="space-y-1.5">
                        <Label htmlFor="closeNotes" className="text-xs">
                          Observações de Fechamento (Opcional)
                        </Label>
                        <Textarea
                          id="closeNotes"
                          placeholder="Ex: Todas as contas conferidas com os extratos bancários físicos e notas arquivadas na pasta..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="text-xs h-20 resize-none bg-background"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-slate-400" />
                          Responsável pelo fechamento: <strong>{userName}</strong>
                        </span>

                        <Button
                          onClick={handleLock}
                          disabled={isSubmitting}
                          className="w-full sm:w-auto bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-9 shadow-xs rounded-xl"
                        >
                          <Lock className="w-3.5 h-3.5 mr-1.5" />
                          {isSubmitting ? "Travando..." : `Fechar e Travar ${monthLabel}`}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ABA 2: LISTA DE MESES ANTERIORES EM ABERTO */}
            {activeTab === "pending" && (
              <div className="space-y-4">
                <div className="border border-border rounded-2xl p-4 bg-card space-y-2">
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Meses que já finalizaram e continuam em aberto
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Aqui você pode localizar meses passados (como Outubro, Setembro, etc.) que já tiveram suas movimentações conferidas na secretaria/tesouraria, mas a trava contábil ainda não havia sido acionada.
                  </p>
                </div>

                {openPriorMonths.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-border rounded-2xl p-6">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2 opacity-80" />
                    <h5 className="font-bold text-sm text-foreground">Todos os meses anteriores estão travados!</h5>
                    <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                      Excelente trabalho! Nenhum mês passado possui pendências de fechamento na congregação {branchName}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {openPriorMonths.map((ym) => {
                      // Calcula dados rápidos desse mês
                      let count = 0;
                      let tot = 0;
                      transactions.forEach((t) => {
                        if (t.date && t.date.substring(0, 7) === ym) {
                          count++;
                          tot += Number(t.amount || 0);
                        }
                      });

                      return (
                        <div
                          key={ym}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-amber-500/10 border border-amber-300 dark:border-amber-800/80 rounded-xl gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-amber-950 dark:text-amber-200">
                                {formatYearMonthDisplay(ym)}
                              </span>
                              <Badge className="bg-amber-600 text-white text-[10px]">
                                Pendente de Trava
                              </Badge>
                            </div>
                            <span className="text-xs text-amber-900/80 dark:text-amber-300/80 mt-0.5 block">
                              Possui <strong>{count} lançamentos</strong> registrados na congregação.
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedYearMonth(ym);
                                setActiveTab("current");
                              }}
                              className="text-xs font-semibold bg-white dark:bg-slate-900"
                            >
                              Ver Detalhes
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedYearMonth(ym);
                                setActiveTab("current");
                              }}
                              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
                            >
                              <Lock className="w-3.5 h-3.5 mr-1" />
                              Travar Agora
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ABA 3: HISTÓRICO DE MESES FECHADOS */}
            {activeTab === "history" && (
              <div className="space-y-4">
                <div className="border border-border rounded-xl overflow-hidden bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs font-bold">Mês Referência</TableHead>
                        <TableHead className="text-xs font-bold">Status</TableHead>
                        <TableHead className="text-xs font-bold text-right">Saldo Final</TableHead>
                        <TableHead className="text-xs font-bold">Responsável</TableHead>
                        <TableHead className="text-xs font-bold text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {allClosedMonths.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                            Nenhum mês contábil travado até o momento.
                          </TableCell>
                        </TableRow>
                      ) : (
                        allClosedMonths.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell className="font-semibold text-xs">
                              {m.monthName || formatYearMonthDisplay(m.yearMonth)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={m.isLocked ? "destructive" : "outline"}
                                className={
                                  m.isLocked
                                    ? "bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-300 text-[10px]"
                                    : "text-slate-500 text-[10px]"
                                }
                              >
                                {m.isLocked ? "🔒 Travado" : "🔓 Aberto"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold">
                              R$ {Number(m.saldoFinal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {m.lockedBy}
                              <span className="block text-[10px]">
                                {m.lockedAt ? new Date(m.lockedAt).toLocaleDateString("pt-BR") : ""}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedYearMonth(m.yearMonth);
                                  setActiveTab("current");
                                }}
                                className="text-xs text-primary hover:text-primary"
                              >
                                Selecionar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          {/* Footer do Modal */}
          <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-row items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                if (onOpenFolderCovers) onOpenFolderCovers(selectedYearMonth);
                else setIsCoverModalOpen(true);
              }}
              className="text-xs border-emerald-300 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 font-semibold"
            >
              <FolderArchive className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Capa & Etiquetas de Pasta Física
            </Button>

            <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Embutido de Capas e Etiquetas */}
      <FolderCoverAndLabelsModal
        isOpen={isCoverModalOpen}
        onClose={() => setIsCoverModalOpen(false)}
        initialYearMonth={selectedYearMonth}
        branchId={branchId}
        branchName={branchName}
        transactions={transactions}
        closedMonths={allClosedMonths}
      />
    </>
  );
}
