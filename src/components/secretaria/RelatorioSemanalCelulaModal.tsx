import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Users,
  HeartHandshake,
  Calendar,
  Share2,
  Plus,
  DollarSign,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Clock,
  Trash2
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

export interface CelulaMeetingReport {
  id?: string;
  celulaName: string;
  leaderName: string;
  hostName?: string;
  address?: string;
  date: string;
  membrosCount: number;
  visitantesCount: number;
  criancasCount: number;
  novasDecisoes: string; // Vidas que aceitaram Jesus
  ofertaAmount: number;
  temaEstudo?: string;
  testemunhos?: string;
  branchId?: string;
}

interface RelatorioSemanalCelulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  churchName?: string;
  activeBranchName?: string;
}

const DEFAULT_CELULAS = [
  { name: "Célula Betel (Jovens)", leader: "Lucas Ferreira", host: "Casa do Lucas" },
  { name: "Célula Manancial de Vida (Famílias)", leader: "Pr. Marcos & Ana", host: "Irmão Carlos" },
  { name: "Célula Monte Sião (Bairro Santa Casa)", leader: "Diác. Roberto", host: "Irmã Maria" },
  { name: "Célula Ágape (Mulheres)", leader: "Pra. Cristina", host: "Irmã Sandra" },
];

export function RelatorioSemanalCelulaModal({
  isOpen,
  onClose,
  churchName = "Igreja Evangélica Manancial",
  activeBranchName = "Templo Sede"
}: RelatorioSemanalCelulaModalProps) {
  const [reports, setReports] = useState<CelulaMeetingReport[]>([]);
  const [activeTab, setActiveTab] = useState<"novo" | "relatorios">("novo");

  // Form states
  const [celulaName, setCelulaName] = useState(DEFAULT_CELULAS[0].name);
  const [leaderName, setLeaderName] = useState(DEFAULT_CELULAS[0].leader);
  const [hostName, setHostName] = useState(DEFAULT_CELULAS[0].host);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [membrosCount, setMembrosCount] = useState<number>(8);
  const [visitantesCount, setVisitantesCount] = useState<number>(2);
  const [criancasCount, setCriancasCount] = useState<number>(3);
  const [novasDecisoes, setNovasDecisoes] = useState("");
  const [ofertaAmount, setOfertaAmount] = useState<string>("50,00");
  const [temaEstudo, setTemaEstudo] = useState("");
  const [testemunhos, setTestemunhos] = useState("");

  // Auto update leader when celula changes
  const handleCelulaChange = (name: string) => {
    setCelulaName(name);
    const found = DEFAULT_CELULAS.find(c => c.name === name);
    if (found) {
      setLeaderName(found.leader);
      setHostName(found.host);
    }
  };

  useEffect(() => {
    try {
      const q = collection(db, "celulaReports");
      const unsub = onSnapshot(q, (snapshot) => {
        const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as CelulaMeetingReport));
        loaded.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        setReports(loaded);
      }, (err) => {
        console.warn("Firestore celulaReports error, local fallback:", err);
        const saved = localStorage.getItem("churchCelulaReports");
        if (saved) {
          try { setReports(JSON.parse(saved)); } catch (e) {}
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn("Error listening celulaReports:", e);
    }
  }, []);

  const syncLocalStorage = (newReports: CelulaMeetingReport[]) => {
    localStorage.setItem("churchCelulaReports", JSON.stringify(newReports));
  };

  const handleSaveReport = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanOferta = parseFloat(ofertaAmount.replace(/[^\d.,]/g, "").replace(",", ".")) || 0;

    const newReport: CelulaMeetingReport = {
      celulaName,
      leaderName,
      hostName,
      date,
      membrosCount: Number(membrosCount) || 0,
      visitantesCount: Number(visitantesCount) || 0,
      criancasCount: Number(criancasCount) || 0,
      novasDecisoes: novasDecisoes.trim(),
      ofertaAmount: cleanOferta,
      temaEstudo: temaEstudo.trim() || undefined,
      testemunhos: testemunhos.trim() || undefined,
    };

    try {
      await addDoc(collection(db, "celulaReports"), {
        ...newReport,
        serverCreatedAt: serverTimestamp(),
      });
      toast.success("Relatório de célula registrado com sucesso!");
    } catch (err) {
      const updated = [newReport, ...reports];
      setReports(updated);
      syncLocalStorage(updated);
      toast.success("Relatório salvo localmente!");
    }

    setActiveTab("relatorios");
    // Reset
    setNovasDecisoes("");
    setTemaEstudo("");
    setTestemunhos("");
  };

  const handleDeleteReport = async (id?: string) => {
    if (!id) return;
    if (!confirm("Excluir este relatório de reunião de célula?")) return;
    try {
      await deleteDoc(doc(db, "celulaReports", id));
      toast.success("Relatório excluído!");
    } catch (e) {
      const updated = reports.filter(r => r.id !== id);
      setReports(updated);
      syncLocalStorage(updated);
      toast.success("Relatório excluído localmente!");
    }
  };

  // WhatsApp formatted sharing
  const handleShareWhatsApp = (report: CelulaMeetingReport) => {
    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date(`${report.date}T12:00:00`));

    const totalPresentes = report.membrosCount + report.visitantesCount + report.criancasCount;

    let text = `🔥 *RELATÓRIO SEMANAL DE CÉLULA*\n`;
    text += `⛪ *Igreja:* ${churchName}\n`;
    text += `🏡 *Célula:* ${report.celulaName}\n`;
    text += `👤 *Líder:* ${report.leaderName}\n`;
    text += `📅 *Data da Reunião:* ${formattedDate}\n`;
    if (report.hostName) text += `📍 *Anfitrião:* ${report.hostName}\n`;
    text += `────────────────────\n`;
    text += `👥 *Membros presentes:* ${report.membrosCount}\n`;
    text += `👋 *Visitantes / Amigos:* ${report.visitantesCount}\n`;
    text += `👶 *Crianças:* ${report.criancasCount}\n`;
    text += `📊 *TOTAL GERAL:* ${totalPresentes} pessoas\n`;
    text += `────────────────────\n`;

    if (report.novasDecisoes) {
      text += `✨ *VIDAS ALCANÇADAS (DECISÕES):* 🎉\n`;
      text += `👉 ${report.novasDecisoes}\n\n`;
    }

    if (report.ofertaAmount > 0) {
      const ofertaFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(report.ofertaAmount);
      text += `💰 *Oferta da Célula:* ${ofertaFmt}\n`;
    }

    if (report.temaEstudo) {
      text += `📖 *Tema Ministrado:* ${report.temaEstudo}\n`;
    }

    if (report.testemunhos) {
      text += `🕊️ *Testemunho:* ${report.testemunhos}\n`;
    }

    text += `\n_“E todos os dias, no templo e de casa em casa, não cessavam de ensinar e de pregar Jesus Cristo.” (Atos 5:42)_`;

    navigator.clipboard.writeText(text);
    toast.success("Relatório copiado! Abra o WhatsApp para colar no grupo pastoral.");
  };

  const totalVidasAlcancadas = reports.reduce((acc, curr) => {
    return acc + (curr.novasDecisoes ? curr.novasDecisoes.split(",").length : 0);
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] flex flex-col p-0 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        <DialogHeader className="!m-0 !mx-0 !mt-0 !mb-0 p-5 sm:p-6 pb-4 border-b border-border bg-muted/20 sticky top-0 bg-background z-10 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-primary" />
                Gestão de Células & Relatórios Semanais
              </DialogTitle>
              <DialogDescription className="text-sm">
                Acompanhe o crescimento dos pequenos grupos nos lares, frequência, vidas alcançadas e ofertas.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-300 py-1 px-3">
                <Sparkles className="w-3.5 h-3.5 mr-1" /> {totalVidasAlcancadas} vidas alcançadas registradas
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-3 border-t border-border/50">
            <Button
              variant={activeTab === "novo" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("novo")}
              className="text-xs rounded-xl"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Lançar Relatório Semanal
            </Button>
            <Button
              variant={activeTab === "relatorios" ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab("relatorios")}
              className="text-xs rounded-xl"
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1" /> Histórico de Relatórios ({reports.length})
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6">
          {activeTab === "novo" && (
            <form onSubmit={handleSaveReport} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Célula / Pequeno Grupo *</Label>
                  <Select value={celulaName} onValueChange={handleCelulaChange}>
                    <SelectTrigger className="text-xs h-9 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DEFAULT_CELULAS.map(c => (
                        <SelectItem key={c.name} value={c.name} className="text-xs">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Líder Responsável *</Label>
                  <Input
                    value={leaderName}
                    onChange={(e) => setLeaderName(e.target.value)}
                    className="text-xs h-9 mt-1"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Data da Reunião *</Label>
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="text-xs h-9 mt-1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Anfitrião / Casa de:</Label>
                  <Input
                    value={hostName}
                    onChange={(e) => setHostName(e.target.value)}
                    placeholder="Ex: Irmão Carlos e Família"
                    className="text-xs h-9 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Tema ou Passagem Estudada:</Label>
                  <Input
                    value={temaEstudo}
                    onChange={(e) => setTemaEstudo(e.target.value)}
                    placeholder="Ex: O Poder da Oração em Família"
                    className="text-xs h-9 mt-1"
                  />
                </div>
              </div>

              {/* Attendance metrics */}
              <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" /> Frequência da Reunião
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Membros</Label>
                    <Input
                      type="number"
                      min={0}
                      value={membrosCount}
                      onChange={(e) => setMembrosCount(parseInt(e.target.value) || 0)}
                      className="text-xs h-9 mt-1 font-semibold"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Visitantes / Amigos</Label>
                    <Input
                      type="number"
                      min={0}
                      value={visitantesCount}
                      onChange={(e) => setVisitantesCount(parseInt(e.target.value) || 0)}
                      className="text-xs h-9 mt-1 font-semibold text-emerald-600"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Crianças</Label>
                    <Input
                      type="number"
                      min={0}
                      value={criancasCount}
                      onChange={(e) => setCriancasCount(parseInt(e.target.value) || 0)}
                      className="text-xs h-9 mt-1 font-semibold text-pink-600"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Oferta da Célula (R$)</Label>
                    <Input
                      value={ofertaAmount}
                      onChange={(e) => setOfertaAmount(e.target.value)}
                      placeholder="0,00"
                      className="text-xs h-9 mt-1 font-semibold text-blue-600"
                    />
                  </div>
                </div>
              </div>

              {/* Decisions / Salvation */}
              <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-2">
                <Label className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Novas Decisões de Fé / Vidas Alcançadas (Conversões / Reconciliações):
                </Label>
                <Input
                  value={novasDecisoes}
                  onChange={(e) => setNovasDecisoes(e.target.value)}
                  placeholder="Digite os nomes das pessoas que aceitaram Jesus (separados por vírgula)"
                  className="text-xs h-9 bg-white dark:bg-card border-emerald-300 dark:border-emerald-800"
                />
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 italic">
                  * Esses nomes serão direcionados ao ministério pastoral para início do discipulado e visitação.
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold">Testemunhos / Pedidos de Oração da Célula:</Label>
                <Textarea
                  value={testemunhos}
                  onChange={(e) => setTestemunhos(e.target.value)}
                  placeholder="Relate milagres, curas, respostas de oração ou necessidades de apoio da célula..."
                  className="text-xs mt-1 h-20"
                />
              </div>

              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-10 shadow-xs">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Salvar Relatório Semanal de Célula
              </Button>
            </form>
          )}

          {activeTab === "relatorios" && (
            <div className="space-y-4">
              <div className="border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead>Data</TableHead>
                      <TableHead>Célula</TableHead>
                      <TableHead>Líder</TableHead>
                      <TableHead>Frequência Total</TableHead>
                      <TableHead>Vidas Alcançadas</TableHead>
                      <TableHead>Oferta</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {reports.length > 0 ? (
                      reports.map(r => {
                        const total = (r.membrosCount || 0) + (r.visitantesCount || 0) + (r.criancasCount || 0);
                        return (
                          <TableRow key={r.id || r.date}>
                            <TableCell className="font-semibold">{r.date}</TableCell>
                            <TableCell className="font-bold text-foreground">{r.celulaName}</TableCell>
                            <TableCell>{r.leaderName}</TableCell>
                            <TableCell>
                              <span className="font-bold">{total}</span>{" "}
                              <span className="text-[11px] text-muted-foreground">
                                ({r.membrosCount}M / {r.visitantesCount}V / {r.criancasCount}C)
                              </span>
                            </TableCell>
                            <TableCell>
                              {r.novasDecisoes ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold">
                                  ✨ {r.novasDecisoes}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">—</span>
                              )}
                            </TableCell>
                            <TableCell className="font-medium text-emerald-700">
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(r.ofertaAmount || 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  onClick={() => handleShareWhatsApp(r)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs px-2.5 rounded-lg"
                                >
                                  <Share2 className="w-3 h-3 mr-1" /> WhatsApp
                                </Button>
                                {r.id && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteReport(r.id)}
                                    className="text-destructive h-7 w-7 p-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum relatório de reunião de célula registrado ainda.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="!m-0 !mx-0 !mb-0 !mt-auto p-4 border-t border-border bg-muted/20 flex flex-row justify-end items-center gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} className="rounded-xl px-5 h-10 font-semibold">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
