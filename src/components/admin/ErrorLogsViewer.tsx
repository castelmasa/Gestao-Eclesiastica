import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TablePagination } from "@/components/ui/table-pagination";
import { logCriticalError, ErrorLogData } from "@/lib/errorLogger";
import { toast } from "sonner";
import {
  AlertOctagon,
  AlertTriangle,
  Bug,
  CheckCircle2,
  Trash2,
  Eye,
  RefreshCw,
  Search,
  Filter,
  Check,
  ShieldCheck,
  Database,
  ExternalLink,
} from "lucide-react";

export function ErrorLogsViewer() {
  const [logs, setLogs] = useState<ErrorLogData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<ErrorLogData | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginationMode, setPaginationMode] = useState<"pagination" | "infinite">("pagination");

  useEffect(() => {
    setLoading(true);
    const q = query(
      collection(db, "error_logs"),
      orderBy("createdAt", "desc"),
      limit(150)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: ErrorLogData[] = [];
        snapshot.forEach((docSnap) => {
          fetched.push({
            id: docSnap.id,
            ...(docSnap.data() as any),
          });
        });
        setLogs(fetched);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao escutar error_logs:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleResolve = async (id: string, currentStatus: boolean = false) => {
    try {
      await updateDoc(doc(db, "error_logs", id), {
        resolved: !currentStatus,
        resolvedAt: serverTimestamp(),
      });
      toast.success(!currentStatus ? "Falha marcada como resolvida." : "Falha reaberta.");
      if (selectedLog && selectedLog.id === id) {
        setSelectedLog((prev) => prev ? { ...prev, resolved: !currentStatus } : null);
      }
    } catch (err) {
      toast.error("Não foi possível atualizar o status.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este registro de falha?")) return;
    try {
      await deleteDoc(doc(db, "error_logs", id));
      toast.success("Registro removido.");
      if (selectedLog?.id === id) setSelectedLog(null);
    } catch (err) {
      toast.error("Erro ao excluir log.");
    }
  };

  const handleTestError = async () => {
    toast.info("Enviando exceção de teste para o Firestore...");
    try {
      const id = await logCriticalError({
        message: "Simulação de teste: Falha de processamento disparada pelo administrador",
        source: "processing",
        severity: "critical",
        context: {
          testTimestamp: new Date().toISOString(),
          environment: "Teste de Diagnóstico",
        },
      });
      if (id) {
        toast.success(`Exceção gravada no Firestore com sucesso (ID: ${id})!`);
      } else {
        toast.info("A gravação foi realizada ou suprimida por taxa recente.");
      }
    } catch (e: any) {
      toast.error("Falha ao emitir teste: " + e.message);
    }
  };

  // Filtered list
  const filtered = logs.filter((log) => {
    const matchesSearch =
      !search ||
      log.message?.toLowerCase().includes(search.toLowerCase()) ||
      log.url?.toLowerCase().includes(search.toLowerCase()) ||
      log.source?.toLowerCase().includes(search.toLowerCase()) ||
      log.userEmail?.toLowerCase().includes(search.toLowerCase());

    const matchesSeverity =
      severityFilter === "all" || log.severity === severityFilter;

    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "resolved"
        ? log.resolved === true
        : log.resolved !== true;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, severityFilter, statusFilter, pageSize]);

  // Paginated items
  const paginatedLogs =
    paginationMode === "infinite"
      ? filtered.slice(0, currentPage * pageSize)
      : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const hasMore = currentPage * pageSize < filtered.length;

  const criticalCount = logs.filter((l) => l.severity === "critical" && !l.resolved).length;
  const unresolvedCount = logs.filter((l) => !l.resolved).length;

  return (
    <Card className="border border-border/80 shadow-xs">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bug className="w-5 h-5 text-destructive" />
            Monitoramento de Logs e Falhas (Firestore)
            {criticalCount > 0 && (
              <Badge variant="destructive" className="ml-2 animate-pulse text-xs">
                {criticalCount} crítica(s)
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Rastreie exceções de sistema, falhas em formulários ou travamentos de interface reportados pelos usuários.
          </CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestError}
            className="text-xs gap-1.5"
            title="Disparar exceção simulada para validar integração"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Simular Exceção
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Filters bar */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por mensagem, URL, usuário ou fonte..."
              className="pl-8 text-xs"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Gravidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Gravidades</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
                <SelectItem value="warning">Aviso</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="unresolved">Pendentes</SelectItem>
                <SelectItem value="resolved">Resolvidos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Status Counter overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-muted/40 rounded-lg border text-center">
            <span className="text-xs text-muted-foreground block">Total Registrados</span>
            <span className="text-lg font-bold text-foreground">{logs.length}</span>
          </div>
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
            <span className="text-xs text-red-600 dark:text-red-400 block font-medium">Críticos Abertos</span>
            <span className="text-lg font-bold text-red-600 dark:text-red-400">{criticalCount}</span>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-center">
            <span className="text-xs text-amber-600 dark:text-amber-400 block font-medium">Total Pendente</span>
            <span className="text-lg font-bold text-amber-600 dark:text-amber-400">{unresolvedCount}</span>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-center">
            <span className="text-xs text-emerald-600 dark:text-emerald-400 block font-medium">Resolvidos</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {logs.filter((l) => l.resolved).length}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="w-[90px]">Gravidade</TableHead>
                <TableHead className="w-[100px]">Origem</TableHead>
                <TableHead>Mensagem da Exceção</TableHead>
                <TableHead className="w-[150px] hidden sm:table-cell">Usuário / Filial</TableHead>
                <TableHead className="w-[130px] hidden md:table-cell">Data/Hora</TableHead>
                <TableHead className="w-[90px]">Status</TableHead>
                <TableHead className="text-right w-[110px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Carregando logs do Firestore...
                  </TableCell>
                </TableRow>
              ) : paginatedLogs.length > 0 ? (
                paginatedLogs.map((log) => {
                  const dateStr = log.createdAt?.toDate
                    ? log.createdAt.toDate().toLocaleString("pt-BR")
                    : log.createdAt
                    ? new Date(log.createdAt).toLocaleString("pt-BR")
                    : "Agora";

                  return (
                    <TableRow key={log.id} className={log.resolved ? "opacity-60 bg-muted/20" : ""}>
                      <TableCell>
                        {log.severity === "critical" ? (
                          <Badge variant="destructive" className="text-[10px] uppercase font-bold">
                            Crítico
                          </Badge>
                        ) : log.severity === "error" ? (
                          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] uppercase font-bold">
                            Erro
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] uppercase">
                            Aviso
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-muted">
                          {log.source || "ui"}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[280px] sm:max-w-md">
                        <div
                          className="font-medium text-xs truncate cursor-pointer hover:underline"
                          onClick={() => setSelectedLog(log)}
                          title={log.message}
                        >
                          {log.message}
                        </div>
                        {log.url && (
                          <span className="text-[10px] text-muted-foreground truncate block">
                            {log.url.replace(/^https?:\/\/[^/]+/, "")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs">
                        <span className="truncate block font-medium">{log.userEmail || "Anônimo"}</span>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {log.churchBranch || "sede"}
                        </span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                        {dateStr}
                      </TableCell>
                      <TableCell>
                        {log.resolved ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Resolvido
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            <AlertOctagon className="w-3.5 h-3.5" /> Aberto
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setSelectedLog(log)}
                            title="Ver detalhes da exceção"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 ${
                              log.resolved ? "text-amber-600" : "text-emerald-600"
                            }`}
                            onClick={() => log.id && handleResolve(log.id, log.resolved)}
                            title={log.resolved ? "Reabrir falha" : "Marcar como resolvida"}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            onClick={() => log.id && handleDelete(log.id)}
                            title="Excluir log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-xs text-muted-foreground">
                    <ShieldCheck className="w-6 h-6 mx-auto mb-1 text-emerald-500 opacity-60" />
                    Nenhuma falha crítica encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        {filtered.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={filtered.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            mode={paginationMode}
            onModeChange={setPaginationMode}
            hasMore={hasMore}
            onLoadMore={() => setCurrentPage((p) => p + 1)}
            itemName="logs"
          />
        )}
      </CardContent>

      {/* Exception Detail Modal */}
      <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Bug className="w-5 h-5 text-destructive" />
              Detalhes da Exceção
            </DialogTitle>
            <DialogDescription>
              Dados técnicos do erro para diagnóstico e depuração.
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-muted/40 rounded border">
                  <span className="text-muted-foreground block text-[10px]">Gravidade</span>
                  <span className="font-semibold uppercase">{selectedLog.severity}</span>
                </div>
                <div className="p-2 bg-muted/40 rounded border">
                  <span className="text-muted-foreground block text-[10px]">Origem</span>
                  <span className="font-semibold">{selectedLog.source}</span>
                </div>
                <div className="p-2 bg-muted/40 rounded border">
                  <span className="text-muted-foreground block text-[10px]">Filial</span>
                  <span className="font-semibold capitalize">{selectedLog.churchBranch || "sede"}</span>
                </div>
                <div className="p-2 bg-muted/40 rounded border">
                  <span className="text-muted-foreground block text-[10px]">Usuário</span>
                  <span className="font-semibold truncate block">{selectedLog.userEmail || "Anônimo"}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold">Mensagem de Erro:</span>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md text-xs font-mono text-red-700 dark:text-red-300 break-words">
                  {selectedLog.message}
                </div>
              </div>

              {selectedLog.url && (
                <div className="space-y-1 text-xs">
                  <span className="font-semibold">URL de Ocorrência:</span>
                  <div className="p-2 bg-muted/40 border rounded text-[11px] font-mono break-all flex items-center justify-between">
                    <span>{selectedLog.url}</span>
                  </div>
                </div>
              )}

              {selectedLog.stack && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold">Pilha de Execução (Stack Trace):</span>
                  <pre className="p-3 bg-slate-950 text-slate-100 rounded-md text-[10px] font-mono overflow-auto max-h-48 whitespace-pre-wrap">
                    {selectedLog.stack}
                  </pre>
                </div>
              )}

              {selectedLog.componentStack && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold">Hierarquia do Componente React:</span>
                  <pre className="p-3 bg-slate-900 text-slate-200 rounded-md text-[10px] font-mono overflow-auto max-h-36 whitespace-pre-wrap">
                    {selectedLog.componentStack}
                  </pre>
                </div>
              )}

              {selectedLog.context && Object.keys(selectedLog.context).length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-semibold">Metadados de Contexto:</span>
                  <pre className="p-2 bg-muted/50 border rounded text-[11px] font-mono overflow-auto max-h-32">
                    {JSON.stringify(selectedLog.context, null, 2)}
                  </pre>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => selectedLog.id && handleDelete(selectedLog.id)}
                  className="gap-1.5 text-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir Registro
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedLog(null)}
                    className="text-xs"
                  >
                    Fechar
                  </Button>
                  <Button
                    size="sm"
                    variant={selectedLog.resolved ? "secondary" : "default"}
                    onClick={() => selectedLog.id && handleResolve(selectedLog.id, selectedLog.resolved)}
                    className="gap-1.5 text-xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {selectedLog.resolved ? "Reabrir Falha" : "Marcar como Resolvido"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
