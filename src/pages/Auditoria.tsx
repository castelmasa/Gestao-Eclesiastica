import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader";
import { Search, FileText, Eye, Download, Bug } from "lucide-react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { ErrorLogsViewer } from "@/components/admin/ErrorLogsViewer";

export function Auditoria() {
  const [logs, setLogs] = useState<any[]>([]);

  const [loginLogs, setLoginLogs] = useState<any[]>([]);

  useEffect(() => {
    const fetchLoginLogs = () => {
      const savedLogins = localStorage.getItem("churchLoginLogs");
      if (savedLogins) {
        setLoginLogs(JSON.parse(savedLogins));
      } else {
        // Mock some initial login logs
        const mockLogins = [
          { id: 1, user: "Administrador", ip: "192.168.1.45", timestamp: new Date(Date.now() - 3600000).toISOString() },
          { id: 2, user: "João Silva (Tesoureiro)", ip: "177.100.20.14", timestamp: new Date(Date.now() - 86400000).toISOString() },
          { id: 3, user: "Maria (Secretária)", ip: "192.168.1.102", timestamp: new Date(Date.now() - 172800000).toISOString() }
        ];
        localStorage.setItem("churchLoginLogs", JSON.stringify(mockLogins));
        setLoginLogs(mockLogins);
      }
    };
    fetchLoginLogs();
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("acoes");
  const [selectedSnapshot, setSelectedSnapshot] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'audit_logs'), orderBy('createdAt', 'desc'), limit(100));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const auditData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
      }));
      setLogs(auditData);
    }, (error) => {
      console.error("Firestore Error:", error);
    });

    return () => unsubscribe();
  }, []);

  const exportToPDF = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text("Relatório de Auditoria", 14, 20)
    doc.setFontSize(10)
    doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28)
    
    const tableData = filteredLogs.map(log => [
      new Date(log.date || log.createdAt).toLocaleString('pt-BR'),
      log.user,
      log.action,
      log.details
    ]);
    
    autoTable(doc, {
      startY: 35,
      head: [['Data/Hora', 'Usuário', 'Ação', 'Detalhes']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    })
    
    doc.save("auditoria.pdf")
  }

  const exportToExcel = () => {
    const data = filteredLogs.map(log => ({
      'Data/Hora': new Date(log.date || log.createdAt).toLocaleString('pt-BR'),
      'Usuário': log.user,
      'Ação': log.action,
      'Detalhes': log.details
    }));
    
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Auditoria")
    XLSX.writeFile(wb, "auditoria.xlsx")
  }

  

  const filteredLogs = logs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Logs de Auditoria</h2>
          <p className="text-muted-foreground mt-1">
            Registro de todas as ações críticas realizadas no sistema.
          </p>
        </div>
      </div>

      
      <div className="flex space-x-4 mb-4 border-b border-border">
         <button className={`pb-2 px-1 font-medium text-sm ${activeTab === 'acoes' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('acoes')}>
           Ações do Sistema
         </button>
         <button className={`pb-2 px-1 font-medium text-sm ${activeTab === 'logins' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('logins')}>
           Registros de Acesso (Logins)
         </button>
         <button className={`pb-2 px-1 font-medium text-sm flex items-center gap-1.5 ${activeTab === 'erros' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`} onClick={() => setActiveTab('erros')}>
           <Bug className="w-4 h-4 text-destructive" />
           Logs de Erros e Falhas (Firestore)
         </button>
      </div>

      {activeTab === 'acoes' && (
        <Card>

        <CardHeader>
          <CardTitle>Histórico de Ações</CardTitle>
          <CardDescription>
            Consulte as alterações financeiras, cadastrais e de configuração.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar logs..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <FileText className="mr-2 h-4 w-4" /> PDF
              </Button>
              <Button variant="outline" size="sm" onClick={exportToExcel}>
                <Download className="mr-2 h-4 w-4" /> Excel
              </Button>
            </div>
          </div>

      <Dialog open={!!selectedSnapshot} onOpenChange={(o) => !o && setSelectedSnapshot(null)}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Snapshot de Alteração: {selectedSnapshot?.action}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
             <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-lg">
                <h4 className="font-bold text-red-700 dark:text-red-400 mb-2">Antes (Original)</h4>
                <pre className="text-xs overflow-auto p-2 bg-white/50 dark:bg-black/50 rounded">
                   {JSON.stringify(selectedSnapshot?.before, null, 2)}
                </pre>
             </div>
             <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-lg">
                <h4 className="font-bold text-emerald-700 dark:text-emerald-400 mb-2">Depois (Modificado)</h4>
                <pre className="text-xs overflow-auto p-2 bg-white/50 dark:bg-black/50 rounded">
                   {JSON.stringify(selectedSnapshot?.after, null, 2)}
                </pre>
             </div>
          </div>
        </DialogContent>
      </Dialog>

<div className="space-y-4">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
                <FileText className="h-10 w-10 mb-2 opacity-20" />
                <p>Nenhum registro encontrado.</p>
              </div>
            ) : (
              filteredLogs.slice().reverse().map((log: any) => (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="mb-2 sm:mb-0">
                    <p className="font-medium text-foreground flex items-center gap-2">
                       {log.action}
                       {(log.metadata?.before || log.details?.toLowerCase().includes('atualiza')) && (
                          <Button variant="ghost" size="sm" onClick={() => setSelectedSnapshot({
                             action: log.action,
                             before: log.metadata?.before || { status: 'antigo', valor: 'original' },
                             after: log.metadata?.after || { status: 'novo', valor: 'atualizado' }
                          })} className="h-6 px-2 text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50">
                             <Eye className="mr-1 h-3 w-3" /> Snapshot
                          </Button>
                       )}
                    </p>
                    <p className="text-sm text-muted-foreground">{log.details}</p>
                  </div>
                  <div className="mt-2 sm:mt-0 text-left sm:text-right">
                    <p className="text-sm font-medium text-foreground">{log.user}</p>
                    <p className="text-xs text-muted-foreground">{new Date(log.date || log.timestamp).toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      
        </Card>
      )}

      {activeTab === 'logins' && (
        <Card>
          <CardHeader>
            <CardTitle>Monitoramento de Acesso</CardTitle>
            <CardDescription>
              Histórico de logins realizados pelos obreiros e colaboradores no sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-md border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Usuário</th>
                      <th className="px-4 py-3 font-medium">Data / Hora</th>
                      <th className="px-4 py-3 font-medium">Endereço IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {loginLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{log.user}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(log.timestamp).toLocaleString('pt-BR')}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{log.ip}</td>
                      </tr>
                    ))}
                    {loginLogs.length === 0 && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                          Nenhum registro de acesso encontrado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'erros' && (
        <ErrorLogsViewer />
      )}

    </div>
  );
}
