import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Cloud,
  CloudUpload,
  HardDriveDownload,
  Calendar,
  Clock,
  FileSpreadsheet,
  FileCode2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ExternalLink,
  RefreshCw,
  Database,
  Layers,
  Users,
  DollarSign
} from "lucide-react";
import {
  BackupConfig,
  SystemBackupRecord,
  getBackupConfig,
  saveBackupConfig,
  gatherChurchData,
  generateMembersCSV,
  generateTransactionsCSV,
  triggerBrowserDownload,
  uploadBackupToFirebaseStorage,
  getBackupHistory,
  deleteBackupRecord,
  calculateNextRunDate
} from "@/services/backupService";
import { toast } from "sonner";

interface CloudBackupAndExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { name?: string; role?: string; email?: string } | null;
}

export function CloudBackupAndExportModal({
  isOpen,
  onClose,
  currentUser
}: CloudBackupAndExportModalProps) {
  const [activeTab, setActiveTab] = useState<"export" | "schedule" | "history">("export");
  const [exportFormat, setExportFormat] = useState<"json" | "csv" | "both">("json");
  const [exportDestination, setExportDestination] = useState<"local" | "firebase_storage" | "google_drive">("firebase_storage");
  const [includeMembers, setIncludeMembers] = useState(true);
  const [includeFinance, setIncludeFinance] = useState(true);
  const [includeCategories, setIncludeCategories] = useState(true);
  const [includeAssets, setIncludeAssets] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Scheduler state
  const [config, setConfig] = useState<BackupConfig>({
    enabled: true,
    frequency: "weekly",
    scheduledHour: 23,
    scheduledDayOfWeek: 0,
    scheduledDayOfMonth: 1,
    destination: "firebase_storage",
    format: "json",
    includeMembers: true,
    includeFinance: true,
    includeAssets: true,
    includeCategories: true,
  });
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [isTestingSchedule, setIsTestingSchedule] = useState(false);

  // History state
  const [history, setHistory] = useState<SystemBackupRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
      loadHistory();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      const loaded = await getBackupConfig();
      setConfig(loaded);
    } catch (err) {
      console.warn("Failed to load backup config", err);
    }
  };

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const records = await getBackupHistory();
      setHistory(records);
    } catch (err) {
      console.warn("Failed to load backup history", err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Perform Immediate Export
  const handleExecuteExport = async () => {
    if (!includeMembers && !includeFinance && !includeCategories && !includeAssets) {
      toast.error("Selecione pelo menos um tipo de dado para exportar.");
      return;
    }

    setIsExporting(true);
    try {
      const data = await gatherChurchData({
        includeMembers,
        includeFinance,
        includeCategories,
        includeAssets,
      });

      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const timeStr = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;

      // 1. JSON Export
      if (exportFormat === "json" || exportFormat === "both") {
        const jsonContent = JSON.stringify(data, null, 2);
        const filename = `backup_igreja_obpc_${dateStr}_${timeStr}.json`;

        if (exportDestination === "local" || exportDestination === "google_drive") {
          triggerBrowserDownload(jsonContent, filename, "application/json");
        }

        if (exportDestination === "firebase_storage") {
          toast.loading("Enviando arquivo JSON para o Firebase Storage...", { id: "export-json" });
          const record = await uploadBackupToFirebaseStorage(jsonContent, filename, "json", {
            membersCount: data.membersCount || 0,
            transactionsCount: data.transactionsCount || 0,
            type: "manual",
            userName: currentUser?.name || "Administrador",
          });
          toast.success("Backup JSON enviado com sucesso para o Firebase Storage!", { id: "export-json" });
          loadHistory();
        }
      }

      // 2. CSV Export
      if (exportFormat === "csv" || exportFormat === "both") {
        if (includeMembers && data.members) {
          const membersCSV = generateMembersCSV(data.members);
          const membersFilename = `membros_igreja_obpc_${dateStr}.csv`;

          if (exportDestination === "local" || exportDestination === "google_drive") {
            triggerBrowserDownload(membersCSV, membersFilename, "text/csv");
          }

          if (exportDestination === "firebase_storage") {
            toast.loading("Enviando CSV de Membros para o Firebase Storage...", { id: "export-csv-m" });
            await uploadBackupToFirebaseStorage(membersCSV, membersFilename, "csv", {
              membersCount: data.membersCount || 0,
              transactionsCount: 0,
              type: "manual",
              userName: currentUser?.name || "Administrador",
            });
            toast.success("CSV de Membros salvo no Firebase Storage!", { id: "export-csv-m" });
            loadHistory();
          }
        }

        if (includeFinance && data.transactions) {
          const transCSV = generateTransactionsCSV(data.transactions);
          const transFilename = `financeiro_igreja_obpc_${dateStr}.csv`;

          if (exportDestination === "local" || exportDestination === "google_drive") {
            triggerBrowserDownload(transCSV, transFilename, "text/csv");
          }

          if (exportDestination === "firebase_storage") {
            toast.loading("Enviando CSV Financeiro para o Firebase Storage...", { id: "export-csv-t" });
            await uploadBackupToFirebaseStorage(transCSV, transFilename, "csv", {
              membersCount: 0,
              transactionsCount: data.transactionsCount || 0,
              type: "manual",
              userName: currentUser?.name || "Administrador",
            });
            toast.success("CSV Financeiro salvo no Firebase Storage!", { id: "export-csv-t" });
            loadHistory();
          }
        }
      }

      // 3. Special handling for Google Drive
      if (exportDestination === "google_drive") {
        toast.info(
          "Download concluído! Abrindo Google Drive para você salvar seus arquivos na pasta de backups da igreja...",
          { duration: 6000 }
        );
        setTimeout(() => {
          window.open("https://drive.google.com/drive/u/0/my-drive", "_blank", "noopener,noreferrer");
        }, 1200);
      } else if (exportDestination === "local") {
        toast.success("Arquivos gerados e baixados para o seu computador com sucesso!");
      }
    } catch (err: any) {
      console.error("Export error:", err);
      toast.error(`Falha ao exportar dados: ${err?.message || "Erro desconhecido"}`);
    } finally {
      setIsExporting(false);
    }
  };

  // Save Schedule Config
  const handleSaveSchedule = async () => {
    setIsSavingSchedule(true);
    try {
      await saveBackupConfig(config);
      toast.success("Configuração de backup automático atualizada com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar configuração do agendamento.");
    } finally {
      setIsSavingSchedule(false);
    }
  };

  // Immediate Test Run of Scheduled Backup
  const handleTestScheduleRun = async () => {
    setIsTestingSchedule(true);
    try {
      toast.loading("Executando backup imediato para o Firebase Storage...", { id: "test-backup" });
      const data = await gatherChurchData({
        includeMembers: config.includeMembers,
        includeFinance: config.includeFinance,
        includeCategories: config.includeCategories,
        includeAssets: config.includeAssets,
      });

      const now = new Date();
      const dateStr = now.toISOString().split("T")[0];
      const filename = `backup_agendado_teste_${dateStr}.json`;
      const jsonContent = JSON.stringify(data, null, 2);

      const record = await uploadBackupToFirebaseStorage(jsonContent, filename, "json", {
        membersCount: data.membersCount || 0,
        transactionsCount: data.transactionsCount || 0,
        type: "automatic",
        userName: currentUser?.name || "Administrador",
      });

      const updated = {
        ...config,
        lastRunAt: now.toISOString(),
        nextRunAt: calculateNextRunDate(config),
        lastStatus: "success" as const,
      };
      setConfig(updated);
      await saveBackupConfig(updated);

      toast.success(
        `Backup teste concluído! Salvo no Firebase Storage (${record.membersCount} membros, ${record.transactionsCount} transações).`,
        { id: "test-backup" }
      );
      loadHistory();
      setActiveTab("history");
    } catch (err: any) {
      console.error(err);
      toast.error(`Falha no backup teste: ${err?.message || "Erro"}`, { id: "test-backup" });
    } finally {
      setIsTestingSchedule(false);
    }
  };

  // Delete history item
  const handleDeleteRecord = async (id?: string) => {
    if (!id) return;
    try {
      await deleteBackupRecord(id);
      setHistory(prev => prev.filter(item => item.id !== id));
      toast.success("Registro de backup excluído com sucesso.");
    } catch (err) {
      toast.error("Erro ao excluir registro de backup.");
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "0 KB";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg">
              <CloudUpload className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Exportação & Backup em Nuvem</DialogTitle>
              <DialogDescription className="text-xs">
                Exporte dados em JSON/CSV e agende backups automáticos para o Firebase Storage ou Google Drive
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="export" className="text-xs">
              <HardDriveDownload className="h-3.5 w-3.5 mr-1.5" />
              Exportação Imediata
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs">
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Agendamento Automático
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              <Database className="h-3.5 w-3.5 mr-1.5" />
              Histórico na Nuvem
              {history.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 text-[10px] h-4 px-1 py-0">
                  {history.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: EXPORTAÇÃO IMEDIATA */}
          <TabsContent value="export" className="space-y-4 pt-2">
            {/* Escolha do Formato */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Formato de Exportação</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  className={`flex flex-col items-center justify-center p-3 border rounded-xl text-xs transition-all ${
                    exportFormat === "json"
                      ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold ring-1 ring-blue-500"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                  onClick={() => setExportFormat("json")}
                >
                  <FileCode2 className="h-5 w-5 mb-1 text-blue-600" />
                  <span>JSON Estruturado</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Backup Completo</span>
                </button>

                <button
                  type="button"
                  className={`flex flex-col items-center justify-center p-3 border rounded-xl text-xs transition-all ${
                    exportFormat === "csv"
                      ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                  onClick={() => setExportFormat("csv")}
                >
                  <FileSpreadsheet className="h-5 w-5 mb-1 text-emerald-600" />
                  <span>CSV (Planilha)</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Excel / Google Sheets</span>
                </button>

                <button
                  type="button"
                  className={`flex flex-col items-center justify-center p-3 border rounded-xl text-xs transition-all ${
                    exportFormat === "both"
                      ? "border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold ring-1 ring-purple-500"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                  onClick={() => setExportFormat("both")}
                >
                  <Layers className="h-5 w-5 mb-1 text-purple-600" />
                  <span>Ambos (JSON + CSV)</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">Pacote Consolidado</span>
                </button>
              </div>
            </div>

            {/* Escolha do Destino */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground">Destino dos Arquivos</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  className={`flex items-center gap-2.5 p-3 border rounded-xl text-xs text-left transition-all ${
                    exportDestination === "firebase_storage"
                      ? "border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold ring-1 ring-blue-500"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                  onClick={() => setExportDestination("firebase_storage")}
                >
                  <Cloud className="h-5 w-5 text-blue-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-foreground">Firebase Storage</div>
                    <div className="text-[10px] text-muted-foreground">Nuvem segura da Igreja</div>
                  </div>
                </button>

                <button
                  type="button"
                  className={`flex items-center gap-2.5 p-3 border rounded-xl text-xs text-left transition-all ${
                    exportDestination === "google_drive"
                      ? "border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-semibold ring-1 ring-amber-500"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                  onClick={() => setExportDestination("google_drive")}
                >
                  <ExternalLink className="h-5 w-5 text-amber-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-foreground">Google Drive</div>
                    <div className="text-[10px] text-muted-foreground">Download + Envio ao Drive</div>
                  </div>
                </button>

                <button
                  type="button"
                  className={`flex items-center gap-2.5 p-3 border rounded-xl text-xs text-left transition-all ${
                    exportDestination === "local"
                      ? "border-slate-500 bg-slate-50 dark:bg-slate-900 text-foreground font-semibold ring-1 ring-slate-500"
                      : "border-border hover:bg-muted/50 text-muted-foreground"
                  }`}
                  onClick={() => setExportDestination("local")}
                >
                  <HardDriveDownload className="h-5 w-5 text-slate-600 shrink-0" />
                  <div>
                    <div className="font-semibold text-foreground">Download Local</div>
                    <div className="text-[10px] text-muted-foreground">Salvar no computador</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Dados a Incluir */}
            <div className="space-y-2 border rounded-xl p-3 bg-muted/20">
              <Label className="text-xs font-semibold text-foreground">Dados a Serem Exportados</Label>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeMembers}
                    onChange={(e) => setIncludeMembers(e.target.checked)}
                    className="rounded text-blue-600"
                  />
                  <Users className="h-3.5 w-3.5 text-blue-600" />
                  <span>Membros & Congregados</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeFinance}
                    onChange={(e) => setIncludeFinance(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Movimentações Financeiras</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeCategories}
                    onChange={(e) => setIncludeCategories(e.target.checked)}
                    className="rounded text-purple-600"
                  />
                  <Layers className="h-3.5 w-3.5 text-purple-600" />
                  <span>Plano de Contas & Filiais</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeAssets}
                    onChange={(e) => setIncludeAssets(e.target.checked)}
                    className="rounded text-amber-600"
                  />
                  <Database className="h-3.5 w-3.5 text-amber-600" />
                  <span>Patrimônio & Configurações</span>
                </label>
              </div>
            </div>

            <Button
              type="button"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-10 mt-2"
              disabled={isExporting}
              onClick={handleExecuteExport}
            >
              {isExporting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Gerando e Enviando Exportação...
                </>
              ) : (
                <>
                  <CloudUpload className="h-4 w-4 mr-2" />
                  Executar Exportação Imediata
                </>
              )}
            </Button>
          </TabsContent>

          {/* TAB 2: AGENDAMENTO AUTOMÁTICO */}
          <TabsContent value="schedule" className="space-y-4 pt-2">
            <div className="flex items-center justify-between p-3 border rounded-xl bg-card">
              <div className="space-y-0.5">
                <Label htmlFor="auto-backup-toggle" className="text-sm font-semibold cursor-pointer">
                  Backup Automático em Segundo Plano
                </Label>
                <p className="text-xs text-muted-foreground">
                  Executa o backup dos dados de membros e finanças sem necessidade de intervenção manual
                </p>
              </div>
              <Switch
                id="auto-backup-toggle"
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            <div className={`space-y-4 transition-opacity ${config.enabled ? "opacity-100" : "opacity-50 pointer-events-none"}`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Frequência */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Frequência de Execução</Label>
                  <Select
                    value={config.frequency}
                    onValueChange={(v: any) => setConfig(prev => ({ ...prev, frequency: v }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Selecione a frequência" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Diário (Todos os dias)</SelectItem>
                      <SelectItem value="weekly">Semanal (Uma vez por semana)</SelectItem>
                      <SelectItem value="monthly">Mensal (Uma vez por mês)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Horário */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Horário Programado</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <Select
                      value={String(config.scheduledHour)}
                      onValueChange={(v) => setConfig(prev => ({ ...prev, scheduledHour: parseInt(v, 10) }))}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Horário" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">00:00 (Meia-noite)</SelectItem>
                        <SelectItem value="6">06:00 da manhã</SelectItem>
                        <SelectItem value="12">12:00 (Meio-dia)</SelectItem>
                        <SelectItem value="18">18:00 (Fim de tarde)</SelectItem>
                        <SelectItem value="22">22:00 da noite</SelectItem>
                        <SelectItem value="23">23:00 da noite (Recomendado)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Opções condicionais de dia */}
              {config.frequency === "weekly" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Dia da Semana</Label>
                  <Select
                    value={String(config.scheduledDayOfWeek ?? 0)}
                    onValueChange={(v) => setConfig(prev => ({ ...prev, scheduledDayOfWeek: parseInt(v, 10) }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Dia da semana" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Domingo (Após os cultos dominicais)</SelectItem>
                      <SelectItem value="1">Segunda-feira</SelectItem>
                      <SelectItem value="3">Quarta-feira</SelectItem>
                      <SelectItem value="5">Sexta-feira</SelectItem>
                      <SelectItem value="6">Sábado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {config.frequency === "monthly" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Dia do Mês</Label>
                  <Select
                    value={String(config.scheduledDayOfMonth ?? 1)}
                    onValueChange={(v) => setConfig(prev => ({ ...prev, scheduledDayOfMonth: parseInt(v, 10) }))}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Dia do mês" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1º dia de cada mês</SelectItem>
                      <SelectItem value="15">Dia 15 de cada mês</SelectItem>
                      <SelectItem value="28">Últimos dias do mês (Dia 28)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Destino Padrão do Agendamento */}
              <div className="p-3 border rounded-xl bg-blue-50/40 dark:bg-blue-950/20 text-xs space-y-1">
                <div className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                  <Cloud className="h-4 w-4 text-blue-600" />
                  Destino dos Backups Automáticos: Firebase Storage
                </div>
                <p className="text-muted-foreground text-[11px]">
                  Os backups automáticos agendados são armazenados no Firebase Storage com controle de integridade, histórico auditado e sem limite de 1MB por documento.
                </p>
              </div>

              {/* Status do Agendamento */}
              <div className="grid grid-cols-2 gap-3 p-3 border rounded-xl bg-muted/20 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Última Execução:</span>
                  <strong className="text-foreground">
                    {config.lastRunAt
                      ? new Date(config.lastRunAt).toLocaleString("pt-BR")
                      : "Nenhuma execução registrada"}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Próxima Execução:</span>
                  <strong className="text-blue-600 dark:text-blue-400">
                    {config.nextRunAt
                      ? new Date(config.nextRunAt).toLocaleString("pt-BR")
                      : new Date(calculateNextRunDate(config)).toLocaleString("pt-BR")}
                  </strong>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={handleSaveSchedule}
                disabled={isSavingSchedule}
              >
                {isSavingSchedule ? "Salvando..." : "Salvar Configuração de Agendamento"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestScheduleRun}
                disabled={isTestingSchedule}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                {isTestingSchedule ? "Executando Teste..." : "Executar Backup Agora"}
              </Button>
            </div>
          </TabsContent>

          {/* TAB 3: HISTÓRICO NA NUVEM */}
          <TabsContent value="history" className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-foreground">Backups Armazenados na Nuvem</h4>
                <p className="text-[11px] text-muted-foreground">
                  Snapshots salvos no Firebase Storage com registro auditado
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={loadHistory}
                disabled={isLoadingHistory}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoadingHistory ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>

            <div className="border rounded-xl divide-y max-h-[340px] overflow-y-auto">
              {history.map((record) => (
                <div key={record.id || record.name} className="p-3 text-xs flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div className="space-y-1 max-w-[340px] sm:max-w-[420px]">
                    <div className="flex items-center gap-1.5 font-medium truncate">
                      {record.format === "csv" ? (
                        <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <FileCode2 className="h-4 w-4 text-blue-600 shrink-0" />
                      )}
                      <span className="truncate" title={record.name}>{record.name}</span>
                      <Badge variant="outline" className={`text-[9px] px-1 py-0 ${record.type === "automatic" ? "bg-purple-50 text-purple-700 border-purple-200" : "bg-slate-50 text-slate-700"}`}>
                        {record.type === "automatic" ? "Automático" : "Manual"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 text-[10px] text-muted-foreground">
                      <span>{new Date(record.createdAt).toLocaleString("pt-BR")}</span>
                      <span>Tamanho: <strong>{formatFileSize(record.fileSizeBytes)}</strong></span>
                      {record.membersCount > 0 && <span>Membros: <strong>{record.membersCount}</strong></span>}
                      {record.transactionsCount > 0 && <span>Transações: <strong>{record.transactionsCount}</strong></span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {record.storageUrl ? (
                      <a
                        href={record.storageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={record.name}
                        className="inline-flex items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground h-7 text-xs px-2 text-blue-600 font-medium transition-colors"
                      >
                        <HardDriveDownload className="h-3.5 w-3.5 mr-1" />
                        Baixar
                      </a>
                    ) : (
                      <span className="text-[10px] text-muted-foreground px-2">Salvo</span>
                    )}

                    {record.id && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeleteRecord(record.id)}
                        title="Excluir Registro"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              {history.length === 0 && !isLoadingHistory && (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  <Cloud className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  Nenhum backup em nuvem encontrado até o momento.
                  <div className="mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setActiveTab("export")}
                    >
                      Criar Primeiro Backup Agora
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-2 border-t pt-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
