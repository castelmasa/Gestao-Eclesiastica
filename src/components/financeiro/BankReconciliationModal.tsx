import React, { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  Download,
  Building2,
  HelpCircle,
  Plus,
  Trash2,
  RefreshCw,
  FileCheck2,
  ShieldCheck,
  Loader2,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import {
  parseOFX,
  parseSpreadsheetStatement,
  runBankReconciliation,
  BankStatementData,
  BankStatementTransaction,
  ReconciliationResult,
} from "@/lib/bankReconciliationHelper";
import { downloadElementAsPdf, openElementInNewTabForPrint } from "@/lib/printUtils";
import { getChurchLeadershipConfig } from "@/lib/churchConfigHelper";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";

export interface BankReconciliationModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId: string;
  branchName: string;
  churchTransactions: any[];
  onAddTransaction?: (transaction: any) => Promise<void> | void;
}

export function BankReconciliationModal({
  isOpen,
  onClose,
  branchId,
  branchName,
  churchTransactions,
  onAddTransaction,
}: BankReconciliationModalProps) {
  const [statementData, setStatementData] = useState<BankStatementData | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [reconciliationResult, setReconciliationResult] = useState<ReconciliationResult | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "matched" | "missing_bank" | "all">("pending");
  const [addingTxId, setAddingTxId] = useState<string | null>(null);

  const churchLeadership = useMemo(() => {
    return getChurchLeadershipConfig(branchId);
  }, [branchId]);

  const registeredLogo = useMemo(() => {
    return getRegisteredChurchLogo(branchId);
  }, [branchId]);

  // Handler de upload de arquivo (OFX, XLSX, CSV)
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setIsProcessingFile(true);
    const toastId = toast.loading(`Lendo extrato bancário: ${file.name}...`);

    try {
      const fileNameLower = file.name.toLowerCase();
      let parsed: BankStatementData;

      if (fileNameLower.endsWith(".ofx")) {
        const text = await file.text();
        parsed = parseOFX(text);
      } else if (fileNameLower.endsWith(".xlsx") || fileNameLower.endsWith(".xls") || fileNameLower.endsWith(".csv")) {
        parsed = await parseSpreadsheetStatement(file);
      } else {
        toast.error("Formato não suportado. Por favor envie arquivo .OFX, .XLSX ou .CSV", { id: toastId });
        setIsProcessingFile(false);
        return;
      }

      if (!parsed || parsed.transactions.length === 0) {
        toast.error("Nenhuma transação financeira foi identificada no arquivo.", { id: toastId });
        setIsProcessingFile(false);
        return;
      }

      setStatementData(parsed);

      // Executa o cruzamento automático
      const result = runBankReconciliation(parsed.transactions, churchTransactions);
      setReconciliationResult(result);

      toast.success(
        `Extrato lido com sucesso! ${parsed.transactions.length} lançamentos encontrados (${result.matchedCount} conciliados automaticamente).`,
        { id: toastId }
      );
    } catch (err: any) {
      console.error("Erro ao processar extrato bancário:", err);
      toast.error("Falha ao ler extrato: " + (err.message || String(err)), { id: toastId });
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Lançar um item pendente no caixa da igreja
  const handleLaunchToChurch = async (tx: BankStatementTransaction) => {
    if (!onAddTransaction) {
      toast.info("Lançamento direto no caixa não configurado.");
      return;
    }

    setAddingTxId(tx.id);
    try {
      const newTxData = {
        date: tx.date,
        description: tx.description || tx.memo || "Lançamento Bancário",
        amount: tx.amount,
        type: tx.type,
        category: tx.type === "entrada" ? "Dízimos e Ofertas (Pix/Banco)" : "Despesas Bancárias / Tarifas",
        documentNumber: tx.documentNumber || tx.id,
        branchId: branchId === "all" ? "sede" : branchId,
        status: "Efetivado",
        supplier: tx.description.includes("TARIFA") || tx.description.includes("MANUT") ? statementData?.bankName : undefined,
      };

      await onAddTransaction(newTxData);

      // Atualiza o resultado de conciliação local
      if (reconciliationResult && statementData) {
        const updatedChurch = [...churchTransactions, { ...newTxData, id: `temp_${Date.now()}` }];
        const recheck = runBankReconciliation(statementData.transactions, updatedChurch);
        setReconciliationResult(recheck);
      }

      toast.success(`Lançamento de R$ ${tx.amount.toFixed(2)} registrado no caixa da igreja!`);
    } catch (err: any) {
      toast.error("Erro ao registrar no caixa: " + (err.message || String(err)));
    } finally {
      setAddingTxId(null);
    }
  };

  // Lançar todas as pendências de uma vez
  const handleLaunchAllMissing = async () => {
    if (!reconciliationResult || reconciliationResult.missingInChurchItems.length === 0) return;
    if (!onAddTransaction) return;

    const count = reconciliationResult.missingInChurchItems.length;
    const confirmLaunch = window.confirm(
      `Deseja realmente registrar todos os ${count} lançamentos do extrato que faltam no caixa da igreja?`
    );
    if (!confirmLaunch) return;

    setIsProcessingFile(true);
    const toastId = toast.loading(`Lançando ${count} movimentações no caixa...`);

    try {
      for (const tx of reconciliationResult.missingInChurchItems) {
        await onAddTransaction({
          date: tx.date,
          description: tx.description || tx.memo || "Lançamento Bancário",
          amount: tx.amount,
          type: tx.type,
          category: tx.type === "entrada" ? "Dízimos e Ofertas (Pix/Banco)" : "Despesas Bancárias / Tarifas",
          documentNumber: tx.documentNumber || tx.id,
          branchId: branchId === "all" ? "sede" : branchId,
          status: "Efetivado",
          supplier: tx.description.includes("TARIFA") ? statementData?.bankName : undefined,
        });
      }

      toast.success(`${count} movimentações registradas com sucesso no caixa!`, { id: toastId });
      onClose();
    } catch (err: any) {
      toast.error("Erro durante o lançamento em lote: " + (err.message || String(err)), { id: toastId });
    } finally {
      setIsProcessingFile(false);
    }
  };

  // Impressão / Exportação do Relatório de Conciliação
  const handlePrintReport = () => {
    const targetId = "printable-reconciliation-report";
    const filename = `Conciliacao_Bancaria_${branchName.replace(/\s+/g, "_")}`;
    try {
      openElementInNewTabForPrint(targetId, filename);
    } catch {
      downloadElementAsPdf(targetId, `${filename}.pdf`);
    }
  };

  const handleDownloadPdf = () => {
    const targetId = "printable-reconciliation-report";
    const filename = `Conciliacao_Bancaria_${branchName.replace(/\s+/g, "_")}.pdf`;
    downloadElementAsPdf(targetId, filename);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-5xl max-h-[94vh] flex flex-col p-0 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="!m-0 p-5 sm:p-6 pb-4 border-b border-border bg-muted/20 sticky top-0 bg-background z-10 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Conciliação Bancária Inteligente • Leitura de Extrato</span>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-0.5">
                Importe seu extrato (OFX, Excel ou CSV) e cruze automaticamente com o caixa da igreja para detectar divergências e tarifas.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 flex items-center gap-1.5 border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Building2 className="w-3.5 h-3.5" />
                {branchName}
              </Badge>
              {statementData && (
                <Badge className="bg-emerald-600 text-white text-xs font-bold">
                  {statementData.bankName}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* Seção de Upload quando nenhum extrato foi carregado */}
          {!statementData ? (
            <div className="border-2 border-dashed border-border rounded-2xl p-8 sm:p-12 text-center bg-card hover:bg-muted/10 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">
                Selecione ou Arraste o Extrato Bancário da Igreja
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Suporta formato <strong>.OFX</strong> (padrão de todos os bancos: Sicredi, Sicoob, Bradesco, Itaú, BB, Caixa, NuBank) ou planilhas <strong>.XLSX / .CSV</strong>.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".ofx,.xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                    }}
                  />
                  <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition-all">
                    <FileSpreadsheet className="w-4 h-4" />
                    Escolher Arquivo do Extrato
                  </span>
                </label>
              </div>

              <div className="mt-8 pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-4 text-left text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Cruzamento Automático:</strong> Identifica na hora lançamentos que já batem com data e valor exatos.</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span><strong>Alerta de Tarifas e Pix:</strong> Mostra dízimos ou taxas que entraram/saíram no banco e faltam no caixa.</span>
                </div>
                <div className="flex items-start gap-2">
                  <Printer className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span><strong>Relatório de Auditoria:</strong> Gera demonstrativo oficial para assinar e anexar na Pasta de Fechamento.</span>
                </div>
              </div>
            </div>
          ) : (
            /* EXTRATO CARREGADO E CONCILIADO */
            <div className="space-y-6">
              {/* Barra de Ações do Extrato Carregado */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 bg-muted/30 border border-border rounded-xl">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-2">
                    {statementData.bankName}
                    {statementData.accountNumber && (
                      <span className="text-xs text-muted-foreground font-normal">
                        (Conta: {statementData.accountNumber})
                      </span>
                    )}
                  </h4>
                  <span className="text-xs text-muted-foreground">
                    Período: {statementData.startDate || "Início"} até {statementData.endDate || "Fim"} • {statementData.transactions.length} movimentações no extrato
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept=".ofx,.xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                      }}
                    />
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold">
                      <RefreshCw className="w-3.5 h-3.5" />
                      Trocar Arquivo
                    </span>
                  </label>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handlePrintReport}
                    className="text-xs h-8 border-slate-300 font-semibold"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1 text-slate-700 dark:text-slate-300" />
                    Imprimir Relatório
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadPdf}
                    className="text-xs h-8 border-emerald-300 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Baixar PDF
                  </Button>
                </div>
              </div>

              {/* Cards de Métricas da Conciliação */}
              {reconciliationResult && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Card 1: Conciliados */}
                  <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Conciliados (100% Batidos)
                      </span>
                      <Badge className="bg-emerald-600 text-white text-xs font-bold">
                        {reconciliationResult.matchedCount}
                      </Badge>
                    </div>
                    <p className="text-xs text-emerald-900/80 dark:text-emerald-300/80 mt-1">
                      Lançamentos do banco que coincidem exatamente com o caixa da igreja.
                    </p>
                  </div>

                  {/* Card 2: Pendentes no Caixa */}
                  <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Pendentes no Caixa
                      </span>
                      <Badge className="bg-amber-600 text-white text-xs font-bold">
                        {reconciliationResult.missingInChurchCount}
                      </Badge>
                    </div>
                    <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mt-1">
                      Estão no extrato do banco, mas ainda não foram registrados na igreja.
                    </p>
                    {reconciliationResult.missingInChurchCount > 0 && (
                      <Button
                        size="sm"
                        onClick={handleLaunchAllMissing}
                        disabled={isProcessingFile}
                        className="mt-3 w-full bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold h-8 rounded-lg"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        Lançar Todas ({reconciliationResult.missingInChurchCount}) no Caixa
                      </Button>
                    )}
                  </div>

                  {/* Card 3: Pendentes no Banco */}
                  <div className="p-4 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-300 dark:border-blue-800 rounded-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-blue-600" />
                        Pendentes no Banco
                      </span>
                      <Badge className="bg-blue-600 text-white text-xs font-bold">
                        {reconciliationResult.missingInBankCount}
                      </Badge>
                    </div>
                    <p className="text-xs text-blue-900/80 dark:text-blue-300/80 mt-1">
                      Lançamentos no caixa da igreja que ainda não compensaram no extrato.
                    </p>
                  </div>
                </div>
              )}

              {/* Abas da Tabela de Movimentações */}
              <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
                <TabsList className="bg-muted p-1 rounded-xl">
                  <TabsTrigger value="pending" className="text-xs font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                    Faltam no Caixa ({reconciliationResult?.missingInChurchCount || 0})
                  </TabsTrigger>
                  <TabsTrigger value="matched" className="text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                    Conciliados ({reconciliationResult?.matchedCount || 0})
                  </TabsTrigger>
                  <TabsTrigger value="missing_bank" className="text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    Só na Igreja ({reconciliationResult?.missingInBankCount || 0})
                  </TabsTrigger>
                  <TabsTrigger value="all" className="text-xs font-semibold">
                    Todas ({statementData.transactions.length})
                  </TabsTrigger>
                </TabsList>

                {/* ABA 1: ITENS QUE ESTÃO NO EXTRATO E FALTAM NO CAIXA */}
                <TabsContent value="pending" className="mt-4">
                  <div className="border border-border rounded-xl overflow-hidden bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-bold">Data</TableHead>
                          <TableHead className="text-xs font-bold">Descrição no Extrato</TableHead>
                          <TableHead className="text-xs font-bold">Tipo</TableHead>
                          <TableHead className="text-xs font-bold text-right">Valor (R$)</TableHead>
                          <TableHead className="text-xs font-bold text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!reconciliationResult || reconciliationResult.missingInChurchItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-8 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                              <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-600" />
                              Parabéns! Todos os lançamentos do extrato bancário já constam no caixa da igreja.
                            </TableCell>
                          </TableRow>
                        ) : (
                          reconciliationResult.missingInChurchItems.map((tx) => (
                            <TableRow key={tx.id} className="hover:bg-amber-500/5">
                              <TableCell className="text-xs font-medium">
                                {new Date(tx.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                              </TableCell>
                              <TableCell className="text-xs">
                                <span className="font-semibold block">{tx.description}</span>
                                {tx.documentNumber && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    Doc: {tx.documentNumber}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  className={`text-[10px] font-bold ${
                                    tx.type === "entrada"
                                      ? "bg-emerald-500/15 text-emerald-800 border-emerald-300"
                                      : "bg-rose-500/15 text-rose-800 border-rose-300"
                                  }`}
                                >
                                  {tx.type === "entrada" ? "Crédito (+)" : "Débito (-)"}
                                </Badge>
                              </TableCell>
                              <TableCell
                                className={`text-xs font-mono font-bold text-right ${
                                  tx.type === "entrada" ? "text-emerald-600" : "text-rose-600"
                                }`}
                              >
                                {tx.type === "entrada" ? "+" : "-"} R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  onClick={() => handleLaunchToChurch(tx)}
                                  disabled={addingTxId === tx.id}
                                  className="text-xs h-7 font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-2xs"
                                >
                                  {addingTxId === tx.id ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                                  ) : (
                                    <Plus className="w-3.5 h-3.5 mr-1" />
                                  )}
                                  Lançar no Caixa
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* ABA 2: ITENS CONCILIADOS */}
                <TabsContent value="matched" className="mt-4">
                  <div className="border border-border rounded-xl overflow-hidden bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-bold">Data Extrato</TableHead>
                          <TableHead className="text-xs font-bold">Descrição no Banco</TableHead>
                          <TableHead className="text-xs font-bold">Descrição no Caixa</TableHead>
                          <TableHead className="text-xs font-bold text-right">Valor</TableHead>
                          <TableHead className="text-xs font-bold text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!reconciliationResult || reconciliationResult.matchedItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                              Nenhum item conciliado ainda.
                            </TableCell>
                          </TableRow>
                        ) : (
                          reconciliationResult.matchedItems.map(({ statementTx, churchTx }) => (
                            <TableRow key={statementTx.id}>
                              <TableCell className="text-xs">
                                {new Date(statementTx.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                              </TableCell>
                              <TableCell className="text-xs font-medium">
                                {statementTx.description}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {churchTx.description}
                                {churchTx.supplier && ` (${churchTx.supplier})`}
                              </TableCell>
                              <TableCell className="text-xs font-mono font-bold text-right">
                                R$ {statementTx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge className="bg-emerald-500/20 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                                  ✓ Conciliado
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* ABA 3: SÓ NA IGREJA */}
                <TabsContent value="missing_bank" className="mt-4">
                  <div className="border border-border rounded-xl overflow-hidden bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-bold">Data Caixa</TableHead>
                          <TableHead className="text-xs font-bold">Descrição no Caixa</TableHead>
                          <TableHead className="text-xs font-bold">Categoria</TableHead>
                          <TableHead className="text-xs font-bold text-right">Valor</TableHead>
                          <TableHead className="text-xs font-bold text-center">Situação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {!reconciliationResult || reconciliationResult.missingInBankItems.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                              Todos os lançamentos do caixa foram localizados no extrato do banco.
                            </TableCell>
                          </TableRow>
                        ) : (
                          reconciliationResult.missingInBankItems.map((chTx) => (
                            <TableRow key={chTx.id}>
                              <TableCell className="text-xs">
                                {chTx.date ? new Date(chTx.date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"}
                              </TableCell>
                              <TableCell className="text-xs font-medium">
                                {chTx.description}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {chTx.category || "-"}
                              </TableCell>
                              <TableCell className="text-xs font-mono font-bold text-right">
                                R$ {Number(chTx.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-blue-700 border-blue-300 text-[10px]">
                                  Pendente no Extrato
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* ABA 4: TODAS AS TRANSAÇÕES DO EXTRATO */}
                <TabsContent value="all" className="mt-4">
                  <div className="border border-border rounded-xl overflow-hidden bg-card">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs font-bold">Data</TableHead>
                          <TableHead className="text-xs font-bold">Histórico</TableHead>
                          <TableHead className="text-xs font-bold">Tipo</TableHead>
                          <TableHead className="text-xs font-bold text-right">Valor</TableHead>
                          <TableHead className="text-xs font-bold text-center">Conciliação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {statementData.transactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="text-xs">
                              {new Date(tx.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                            </TableCell>
                            <TableCell className="text-xs font-medium">
                              {tx.description}
                            </TableCell>
                            <TableCell>
                              <span className={`text-[10px] font-bold ${tx.type === "entrada" ? "text-emerald-700" : "text-rose-700"}`}>
                                {tx.type === "entrada" ? "Crédito" : "Débito"}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs font-mono font-bold text-right">
                              R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-center">
                              {tx.reconciliationStatus === "matched" ? (
                                <Badge className="bg-emerald-500/20 text-emerald-800 text-[10px] font-bold">
                                  ✓ Batido
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500/20 text-amber-900 text-[10px] font-bold">
                                  Pendente
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>

              {/* MODELO DE IMPRESSÃO OFICIAL DA CONCILIAÇÃO BANCÁRIA (OCULTO NA TELA, VISÍVEL NO PRINT/PDF) */}
              <div
                id="printable-reconciliation-report"
                className="hidden print:block bg-white text-slate-900 p-8 text-left"
                style={{ fontFamily: "Arial, sans-serif" }}
              >
                <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {registeredLogo && (
                      <img src={registeredLogo} alt="Logo" className="h-14 w-14 object-contain" />
                    )}
                    <div>
                      <h2 className="text-sm font-bold uppercase">{churchLeadership.church.name}</h2>
                      <h3 className="text-xs text-slate-600 uppercase">{branchName} • CNPJ: {churchLeadership.church.cnpj}</h3>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-bold block uppercase">Termo de Conciliação Bancária</span>
                    <span className="text-[10px] text-slate-500">Emitido em: {new Date().toLocaleDateString("pt-BR")}</span>
                  </div>
                </div>

                <div className="bg-slate-100 p-3 rounded-sm mb-4 text-xs">
                  <span className="font-bold uppercase block mb-1">Instituição Financeira: {statementData.bankName}</span>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>Conta: <strong>{statementData.accountNumber || "Padrão"}</strong></div>
                    <div>Conciliados: <strong>{reconciliationResult?.matchedCount} itens</strong></div>
                    <div>Pendências no Caixa: <strong>{reconciliationResult?.missingInChurchCount} itens</strong></div>
                  </div>
                </div>

                <h4 className="text-xs font-bold uppercase mb-2">Resumo das Movimentações</h4>
                <table className="w-full text-[10px] border-collapse border border-slate-400 mb-6">
                  <thead>
                    <tr className="bg-slate-200">
                      <th className="border border-slate-400 p-1 text-left">Data</th>
                      <th className="border border-slate-400 p-1 text-left">Descrição no Extrato</th>
                      <th className="border border-slate-400 p-1 text-center">Tipo</th>
                      <th className="border border-slate-400 p-1 text-right">Valor (R$)</th>
                      <th className="border border-slate-400 p-1 text-center">Situação Contábil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementData.transactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-300">
                        <td className="border border-slate-400 p-1">{new Date(tx.date).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
                        <td className="border border-slate-400 p-1 font-medium">{tx.description}</td>
                        <td className="border border-slate-400 p-1 text-center">{tx.type === "entrada" ? "Crédito" : "Débito"}</td>
                        <td className="border border-slate-400 p-1 text-right font-mono">R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
                        <td className="border border-slate-400 p-1 text-center font-bold">
                          {tx.reconciliationStatus === "matched" ? "CONCILIADO" : "PENDENTE NO CAIXA"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="pt-8 border-t-2 border-slate-900 grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <div className="border-b border-slate-800 pb-1 font-semibold">{churchLeadership.tesoureiro.name || "1º Tesoureiro"}</div>
                    <div className="font-bold uppercase text-[10px] mt-1">1º Tesoureiro / Responsável</div>
                  </div>
                  <div>
                    <div className="border-b border-slate-800 pb-1 font-semibold">{churchLeadership.pastor.name || "Pastor Titular"}</div>
                    <div className="font-bold uppercase text-[10px] mt-1">Pastor Titular / Presidente</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-row items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>

          {statementData && reconciliationResult && reconciliationResult.missingInChurchCount > 0 && (
            <Button
              type="button"
              onClick={handleLaunchAllMissing}
              disabled={isProcessingFile}
              className="text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Lançar {reconciliationResult.missingInChurchCount} Pendências no Caixa
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
