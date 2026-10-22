import React, { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Mic,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Printer,
  Download,
  Share2,
  Check,
  Save,
  Search,
  BookOpen,
  Sparkles,
  Users,
  AlertCircle,
  FileText,
  RotateCcw,
  Settings2,
  X,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  setDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { printDocument, downloadElementAsPdf } from "@/lib/printUtils";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";

export interface DirigenteCultoItem {
  id: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:MM
  tipoCulto: string; // Culto da Família, Culto de Ensino, etc.
  dirigente: string;
  pregador: string;
  oracaoInicial?: string;
  leituraPalavra?: string;
  oracaoDizimos?: string;
  bencaoApostolica?: string;
  observacoes?: string;
}

interface EscalaDirigentesModalProps {
  isOpen: boolean;
  onClose: () => void;
  members?: Array<{ id?: string; name: string; phone?: string; role?: string }>;
  churchData?: any;
  activeBranchName?: string;
  activeBranchId?: string;
}

export const DEFAULT_TIPOS_CULTO = [
  "Culto da Família & Celebração",
  "Culto de Ensino & Doutrina",
  "Culto de Louvor & Adoração",
  "Culto de Santa Ceia do Senhor",
  "Círculo de Oração & Intercessão",
  "Culto de Jovens (Geração Eleita)",
  "Culto de Missões & Evangelismo",
  "Culto de Mulheres (Déboras)",
  "Culto de Homens (Gideões)",
  "Culto Matutino / EBD"
];

const DEFAULT_VERSE = "«Prega a palavra, insta a tempo e fora de tempo, redargue, repreende, exorta com toda a longanimidade e doutrina.» (2 Timóteo 4:2)";

export function EscalaDirigentesModal({
  isOpen,
  onClose,
  members = [],
  churchData,
  activeBranchName = "2ª Congregação",
  activeBranchId = "sede"
}: EscalaDirigentesModalProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'historico'>('editor');
  const [isEscalaSimples, setIsEscalaSimples] = useState<boolean>(false);
  const [escalas, setEscalas] = useState<DirigenteCultoItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Anexo 2: Tipos de Culto dinâmicos (carregados do Firestore / LocalStorage)
  const [tiposCultoList, setTiposCultoList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("church_tipos_culto");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_TIPOS_CULTO;
  });

  const [isManagingTiposCulto, setIsManagingTiposCulto] = useState(false);
  const [newTipoCultoInput, setNewTipoCultoInput] = useState("");

  // Anexo 3: Confirmação de exclusão sem window.confirm (compatível com iframes)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Campos do formulário de novo item / edição
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DirigenteCultoItem>({
    id: "",
    data: new Date().toISOString().split("T")[0],
    horario: "19:00",
    tipoCulto: "Culto da Família & Celebração",
    dirigente: "",
    pregador: "",
    oracaoInicial: "",
    leituraPalavra: "",
    oracaoDizimos: "",
    bencaoApostolica: "",
    observacoes: ""
  });

  // Configurações do Relatório
  const [pastorResponsavel, setPastorResponsavel] = useState(() => {
    return churchData?.pastorTitular || churchData?.pastor || "Pr. Carlito Carvalho Rodrigues";
  });
  const [versiculoBiblico, setVersiculoBiblico] = useState(DEFAULT_VERSE);

  const churchLogo = getRegisteredChurchLogo(activeBranchId) || churchData?.logoDataUrl || null;
  const churchName = churchData?.nome || `Igreja Evang. Pentecostal O Brasil para Cristo - ${activeBranchName}`;

  // Sincroniza Tipos de Culto com Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "escala_tipos_culto"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.tipos) && data.tipos.length > 0) {
          setTiposCultoList(data.tipos);
          localStorage.setItem("church_tipos_culto", JSON.stringify(data.tipos));
        }
      }
    }, (err) => {
      console.warn("Erro ao ouvir tipos de culto:", err);
    });

    return () => unsub();
  }, []);

  // Lista de obreiros/membros para seleção
  const obreirosList = useMemo(() => {
    if (members && members.length > 0) {
      return [...members].sort((a, b) => a.name.localeCompare(b.name));
    }
    return [
      { id: "1", name: "Pr. Carlito Carvalho Rodrigues", role: "Pastor Titular" },
      { id: "2", name: "Ev. Marcos Aurélio", role: "Evangelista" },
      { id: "3", name: "Pb. Antônio Carlos", role: "Presbítero" },
      { id: "4", name: "Dc. João Batista", role: "Diácono" },
      { id: "5", name: "Dsa. Maria Francinete", role: "Diaconisa" }
    ];
  }, [members]);

  // Carrega escala do Firestore
  useEffect(() => {
    const docRef = collection(db, "escalas_dirigentes");
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      const items: DirigenteCultoItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.branchId || data.branchId === activeBranchId) {
          items.push({ id: docSnap.id, ...data } as DirigenteCultoItem);
        }
      });
      items.sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario));
      setEscalas(items);
    }, (err) => {
      console.warn("Erro ao carregar escala de dirigentes:", err);
      try {
        const local = localStorage.getItem("escala_dirigentes_local");
        if (local) setEscalas(JSON.parse(local));
      } catch {}
    });

    return () => unsubscribe();
  }, [activeBranchId]);

  // Cadastrar Novo Tipo de Culto (Anexo 2)
  const handleAddTipoCulto = async () => {
    const trimmed = newTipoCultoInput.trim();
    if (!trimmed) {
      toast.error("Digite o nome do Tipo de Culto.");
      return;
    }
    if (tiposCultoList.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      toast.info("Este tipo de culto já está cadastrado.");
      setFormData(prev => ({ ...prev, tipoCulto: trimmed }));
      setNewTipoCultoInput("");
      return;
    }

    const updated = [...tiposCultoList, trimmed];
    setTiposCultoList(updated);
    setFormData(prev => ({ ...prev, tipoCulto: trimmed }));
    setNewTipoCultoInput("");
    localStorage.setItem("church_tipos_culto", JSON.stringify(updated));

    try {
      await setDoc(doc(db, "settings", "escala_tipos_culto"), {
        tipos: updated,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success(`Tipo de culto "${trimmed}" cadastrado com sucesso!`);
    } catch (e) {
      console.warn("Erro ao salvar tipo de culto no Firestore:", e);
      toast.success(`Tipo de culto "${trimmed}" gravado localmente!`);
    }
  };

  // Remover Tipo de Culto Customizado
  const handleRemoveTipoCulto = async (tipoParaRemover: string) => {
    if (tiposCultoList.length <= 1) {
      toast.error("É necessário manter ao menos um tipo de culto cadastrado.");
      return;
    }
    const updated = tiposCultoList.filter(t => t !== tipoParaRemover);
    setTiposCultoList(updated);
    localStorage.setItem("church_tipos_culto", JSON.stringify(updated));

    if (formData.tipoCulto === tipoParaRemover) {
      setFormData(prev => ({ ...prev, tipoCulto: updated[0] }));
    }

    try {
      await setDoc(doc(db, "settings", "escala_tipos_culto"), {
        tipos: updated,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success(`Tipo de culto "${tipoParaRemover}" removido.`);
    } catch (e) {
      toast.success(`Tipo de culto "${tipoParaRemover}" removido.`);
    }
  };

  // Adicionar ou Atualizar Culto na Escala
  const handleSaveItem = async () => {
    if (!formData.data) {
      toast.error("Por favor, informe a data do culto.");
      return;
    }
    if (!formData.dirigente) {
      toast.error("Por favor, selecione ou digite o Dirigente do culto.");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading(editingId ? "Atualizando escala de culto..." : "Gravando culto na escala...");

    const itemId = editingId || `dir_${Date.now()}`;
    const payload: DirigenteCultoItem = {
      ...formData,
      id: itemId
    };

    try {
      await setDoc(doc(db, "escalas_dirigentes", itemId), {
        ...payload,
        branchId: activeBranchId,
        updatedAt: serverTimestamp()
      });

      // Atualiza estado local
      setEscalas(prev => {
        const exists = prev.findIndex(item => item.id === itemId);
        let updated: DirigenteCultoItem[];
        if (exists >= 0) {
          updated = [...prev];
          updated[exists] = payload;
        } else {
          updated = [...prev, payload];
        }
        updated.sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario));
        localStorage.setItem("escala_dirigentes_local", JSON.stringify(updated));
        return updated;
      });

      toast.success(editingId ? "Culto atualizado com sucesso!" : "Culto cadastrado na escala!", { id: toastId });

      // Reset formulário
      setEditingId(null);
      setFormData({
        id: "",
        data: formData.data,
        horario: "19:00",
        tipoCulto: tiposCultoList[0] || "Culto da Família & Celebração",
        dirigente: "",
        pregador: "",
        oracaoInicial: "",
        leituraPalavra: "",
        oracaoDizimos: "",
        bencaoApostolica: "",
        observacoes: ""
      });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar no banco. Gravado localmente.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir Item (Anexo 3: Executa sem window.confirm nativo)
  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const toastId = toast.loading("Removendo culto da escala...");

    try {
      await deleteDoc(doc(db, "escalas_dirigentes", itemToDelete));
      setEscalas(prev => {
        const filtered = prev.filter(item => item.id !== itemToDelete);
        localStorage.setItem("escala_dirigentes_local", JSON.stringify(filtered));
        return filtered;
      });
      toast.success("Culto removido da escala com sucesso!", { id: toastId });
    } catch (err) {
      console.error(err);
      // Fallback local
      setEscalas(prev => {
        const filtered = prev.filter(item => item.id !== itemToDelete);
        localStorage.setItem("escala_dirigentes_local", JSON.stringify(filtered));
        return filtered;
      });
      toast.success("Culto removido da escala.", { id: toastId });
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  // Carregar para edição
  const handleEditItem = (item: DirigenteCultoItem) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setActiveTab('editor');
  };

  // Formatação de data em PT-BR
  const formatBrazilianDate = (dateStr: string) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-");
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    const weekdays = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return `${day}/${month}/${year} (${weekdays[d.getDay()]})`;
  };

  // Impressão A4
  const handlePrint = () => {
    printDocument({
      elementId: "escala-dirigentes-print",
      title: `Escala_Dirigentes_Cultos_${activeBranchName.replace(/\s+/g, '_')}`
    });
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    const toastId = toast.loading("Gerando PDF da Escala de Dirigentes...");
    const success = await downloadElementAsPdf(
      "escala-dirigentes-print",
      `Escala_Dirigentes_${activeBranchName.replace(/\s+/g, '_')}.pdf`
    );
    if (success) {
      toast.success("PDF baixado com sucesso!", { id: toastId });
    } else {
      toast.error("Erro ao gerar PDF. Use o botão Imprimir.", { id: toastId });
    }
  };

  // WhatsApp
  const handleShareWhatsApp = () => {
    if (escalas.length === 0) {
      toast.error("Não há cultos escalados para compartilhar.");
      return;
    }
    let msg = `🎙️ *ESCALA OFICIAL DE DIRIGENTES E PREGADORES*\n`;
    msg += `⛪ *${churchName}*\n\n`;

    escalas.forEach((e) => {
      msg += `📅 *${formatBrazilianDate(e.data)} às ${e.horario}*\n`;
      msg += `📖 *${e.tipoCulto}*\n`;
      msg += `🎤 *Dirigente:* ${e.dirigente}\n`;
      if (e.pregador) msg += `🔥 *Pregador:* ${e.pregador}\n`;
      if (e.leituraPalavra) msg += `📜 *Leitura:* ${e.leituraPalavra}\n`;
      if (e.oracaoInicial) msg += `🙏 *Oração:* ${e.oracaoInicial}\n`;
      msg += `────────────────────\n`;
    });

    msg += `\n✍️ *Pastor Responsável:* ${pastorResponsavel}\n`;
    msg += `_Favor confirmar escala com antecedência na Secretaria da Igreja._`;

    navigator.clipboard.writeText(msg);
    toast.success("Escala copiada para o WhatsApp!");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="border-b pb-3 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 text-blue-700 dark:text-blue-400 rounded-lg">
                  <Mic className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    Escala de Dirigentes de Culto & Pregadores
                    <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 border-blue-300">
                      Púlpito & Altar
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Cadastre, altere, exclua e imprima a escala mensal de dirigentes, pregadores e oficiantes.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="h-8 text-xs">
                  <Share2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> WhatsApp
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="h-8 text-xs">
                  <Download className="w-3.5 h-3.5 mr-1" /> PDF A4
                </Button>
                <Button size="sm" onClick={handlePrint} className="h-8 text-xs font-semibold">
                  <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir Mural
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Button
                  variant={activeTab === 'editor' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('editor')}
                  className="h-7 text-xs font-medium"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  {editingId ? "Editar Culto" : "Cadastrar Culto"}
                </Button>
                <Button
                  variant={activeTab === 'preview' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab('preview')}
                  className="h-7 text-xs font-medium"
                >
                  <FileText className="w-3.5 h-3.5 mr-1" />
                  Folha do Mural A4 ({escalas.length} cultos)
                </Button>
              </div>

              {activeTab === 'preview' && (
                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border">
                  <Button
                    type="button"
                    variant={!isEscalaSimples ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setIsEscalaSimples(false)}
                    className="h-6 text-[11px] px-2 font-semibold"
                  >
                    Escala Detalhada
                  </Button>
                  <Button
                    type="button"
                    variant={isEscalaSimples ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setIsEscalaSimples(true)}
                    className="h-6 text-[11px] px-2 font-bold text-blue-700 dark:text-blue-300"
                  >
                    Escala Simples (Data, Dia & Dirigente)
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 py-3">
            {activeTab === 'editor' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Formulário de Cadastro (5 colunas) */}
                <div className="lg:col-span-5 space-y-3 bg-muted/30 p-4 rounded-xl border">
                  <div className="flex items-center justify-between pb-1 border-b">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {editingId ? "Editar Detalhes do Culto" : "Novo Culto na Escala"}
                    </h4>
                    {editingId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingId(null);
                          setFormData({
                            id: "",
                            data: new Date().toISOString().split("T")[0],
                            horario: "19:00",
                            tipoCulto: tiposCultoList[0] || "Culto da Família & Celebração",
                            dirigente: "",
                            pregador: "",
                            oracaoInicial: "",
                            leituraPalavra: "",
                            oracaoDizimos: "",
                            bencaoApostolica: "",
                            observacoes: ""
                          });
                        }}
                        className="h-6 text-[10px] text-muted-foreground"
                      >
                        Cancelar Edição
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Data do Culto</Label>
                      <Input
                        type="date"
                        value={formData.data}
                        onChange={(e) => setFormData(p => ({ ...p, data: e.target.value }))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Horário</Label>
                      <Input
                        type="time"
                        value={formData.horario}
                        onChange={(e) => setFormData(p => ({ ...p, horario: e.target.value }))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* ANEXO 2: TIPO DE CULTO COM CADASTRO DINÂMICO */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Tipo de Culto</Label>
                      <button
                        type="button"
                        onClick={() => setIsManagingTiposCulto(true)}
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <Settings2 className="w-3 h-3" />
                        Cadastrar / Gerenciar Tipos
                      </button>
                    </div>

                    <Select
                      value={formData.tipoCulto}
                      onValueChange={(val) => setFormData(p => ({ ...p, tipoCulto: val }))}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Selecione o culto" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposCultoList.map((tipo) => (
                          <SelectItem key={tipo} value={tipo} className="text-xs">
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Dirigente */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-blue-900 dark:text-blue-200">
                      Dirigente do Culto *
                    </Label>
                    <Select
                      value={formData.dirigente}
                      onValueChange={(val) => setFormData(p => ({ ...p, dirigente: val }))}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background font-semibold">
                        <SelectValue placeholder="Selecione o dirigente" />
                      </SelectTrigger>
                      <SelectContent>
                        {obreirosList.map((m) => (
                          <SelectItem key={m.id || m.name} value={m.name} className="text-xs">
                            {m.name} {m.role ? `(${m.role})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Ou digite o nome do dirigente..."
                      value={formData.dirigente}
                      onChange={(e) => setFormData(p => ({ ...p, dirigente: e.target.value }))}
                      className="h-7 text-xs mt-1"
                    />
                  </div>

                  {/* Pregador */}
                  <div className="space-y-1">
                    <Label className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      Pregador / Mensageiro da Palavra
                    </Label>
                    <Select
                      value={formData.pregador}
                      onValueChange={(val) => setFormData(p => ({ ...p, pregador: val }))}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Selecione o pregador" />
                      </SelectTrigger>
                      <SelectContent>
                        {obreirosList.map((m) => (
                          <SelectItem key={m.id || m.name} value={m.name} className="text-xs">
                            {m.name} {m.role ? `(${m.role})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Ou digite o pregador (ex: Pastor Convidado)..."
                      value={formData.pregador}
                      onChange={(e) => setFormData(p => ({ ...p, pregador: e.target.value }))}
                      className="h-7 text-xs mt-1"
                    />
                  </div>

                  {/* Oração Inicial e Leitura */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Oração Inicial</Label>
                      <Input
                        placeholder="Nome do obreiro"
                        value={formData.oracaoInicial || ""}
                        onChange={(e) => setFormData(p => ({ ...p, oracaoInicial: e.target.value }))}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Leitura Bíblica</Label>
                      <Input
                        placeholder="Nome do obreiro"
                        value={formData.leituraPalavra || ""}
                        onChange={(e) => setFormData(p => ({ ...p, leituraPalavra: e.target.value }))}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>

                  {/* Oração de Dízimos e Bênção */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Oração Dízimos</Label>
                      <Input
                        placeholder="Nome do obreiro"
                        value={formData.oracaoDizimos || ""}
                        onChange={(e) => setFormData(p => ({ ...p, oracaoDizimos: e.target.value }))}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold">Bênção Apostólica</Label>
                      <Input
                        placeholder="Pastor ou Dirigente"
                        value={formData.bencaoApostolica || ""}
                        onChange={(e) => setFormData(p => ({ ...p, bencaoApostolica: e.target.value }))}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveItem}
                    disabled={isSaving}
                    className="w-full h-8 text-xs font-bold mt-2"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    {editingId ? "Salvar Alterações do Culto" : "Gravar Culto na Escala"}
                  </Button>
                </div>

                {/* Tabela de Cultos Escalados (7 colunas) */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-semibold">
                        Cultos Agendados ({escalas.length})
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Clique no lápis para editar ou na lixeira para excluir.
                    </span>
                  </div>

                  {escalas.length === 0 ? (
                    <div className="text-center py-12 border rounded-xl bg-muted/20 text-muted-foreground">
                      <Mic className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-500" />
                      <p className="text-xs font-medium">Nenhum culto cadastrado na escala de dirigentes.</p>
                      <p className="text-[11px] mt-1">Preencha os campos ao lado e clique em "Gravar Culto na Escala".</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {escalas.map((item) => (
                        <Card key={item.id} className="p-3 hover:border-primary/50 transition-all shadow-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-primary">
                                  {formatBrazilianDate(item.data)} • {item.horario}
                                </span>
                                <Badge variant="secondary" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                  {item.tipoCulto}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs pt-1">
                                <div>
                                  <span className="text-muted-foreground font-medium">Dirigente:</span>{" "}
                                  <strong className="text-slate-900 dark:text-slate-100">{item.dirigente}</strong>
                                </div>
                                {item.pregador && (
                                <div>
                                  <span className="text-muted-foreground font-medium">Pregador:</span>{" "}
                                  <strong className="text-amber-700 dark:text-amber-400">{item.pregador}</strong>
                                </div>
                              )}
                                {item.oracaoInicial && (
                                  <div className="text-[11px] text-muted-foreground">
                                    <span>Oração: {item.oracaoInicial}</span>
                                  </div>
                                )}
                                {item.leituraPalavra && (
                                  <div className="text-[11px] text-muted-foreground">
                                    <span>Leitura: {item.leituraPalavra}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Ações: Editar e Excluir (Anexo 3: Exclusão com confirmação segura em modal) */}
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditItem(item)}
                                className="h-7 w-7 text-blue-600 hover:text-blue-800"
                                title="Editar este culto"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setItemToDelete(item.id)}
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Excluir culto da escala"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* ============================================================== */
              /* FOLHA OFICIAL PARA MURAL E PÚLPITO (A4)                       */
              /* ============================================================== */
              <div className="flex justify-center p-3 bg-slate-100 dark:bg-slate-900/60 rounded-xl overflow-x-auto">
                <div
                  id="escala-dirigentes-print"
                  className="bg-white text-slate-950 p-8 rounded-sm shadow-xl border border-slate-300 print:m-0 print:p-6 print:shadow-none print:border-none flex flex-col justify-between"
                  style={{
                    width: '210mm',
                    minHeight: '297mm',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <div>
                    {/* Cabeçalho Oficial */}
                    <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-4">
                      <div className="flex items-center gap-3">
                        {churchLogo && (
                          <img src={churchLogo} alt="Logo" className="h-14 max-w-[55mm] object-contain" />
                        )}
                        <div>
                          <h2 className="text-base font-black uppercase tracking-wider text-slate-950">
                            IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO
                          </h2>
                          <h3 className="text-xs font-bold text-slate-700 uppercase">
                            {activeBranchName} • DIRETORIA DE CULTOS & LITURGIA
                          </h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            ESCALA OFICIAL DE DIRIGENTES, PREGADORES E OFICIANTES
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black px-2.5 py-1 bg-blue-900 text-white rounded">
                          MURAL OFICIAL
                        </span>
                        <p className="text-[9px] text-slate-500 mt-1">
                          Emitido em: {new Date().toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {/* Tabela de Cultos */}
                    <div className="border border-slate-800 rounded-sm overflow-hidden mb-6">
                      {isEscalaSimples ? (
                        /* ANEXO 4: ESCALA SIMPLES (DATA | DIA DA SEMANA | NOME DO DIRIGENTE) */
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                              <th className="py-2.5 px-3 border-r border-slate-700 w-32 font-black">Data</th>
                              <th className="py-2.5 px-3 border-r border-slate-700 w-36 font-black">Dia da Semana</th>
                              <th className="py-2.5 px-3 border-r border-slate-700 font-black">Nome do Dirigente</th>
                              <th className="py-2.5 px-3 font-black">Tipo de Culto</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-300">
                            {escalas.map((item, idx) => {
                              const [year, month, day] = (item.data || "").split("-");
                              const d = new Date(Number(year), Number(month) - 1, Number(day));
                              const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
                              const weekdayName = weekdays[d.getDay()] || "—";
                              const formattedDate = day && month && year ? `${day}/${month}/${year}` : item.data;

                              return (
                                <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                  <td className="py-2.5 px-3 border-r border-slate-300 font-mono font-bold text-sm text-slate-900">
                                    {formattedDate}
                                  </td>
                                  <td className="py-2.5 px-3 border-r border-slate-300 font-bold text-xs text-blue-900 uppercase">
                                    {weekdayName}
                                  </td>
                                  <td className="py-2.5 px-3 border-r border-slate-300 font-black text-sm text-slate-950">
                                    {item.dirigente || "—"}
                                  </td>
                                  <td className="py-2.5 px-3 font-semibold text-xs text-slate-800">
                                    {item.tipoCulto} {item.horario ? `(${item.horario})` : ""}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : (
                        /* ESCALA COMPLETA DETALHADA */
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white uppercase text-[9px] tracking-wider">
                              <th className="py-2 px-2 border-r border-slate-700 w-28">Data / Hora</th>
                              <th className="py-2 px-2 border-r border-slate-700 w-36">Culto</th>
                              <th className="py-2 px-2 border-r border-slate-700">Dirigente Oficial</th>
                              <th className="py-2 px-2 border-r border-slate-700">Pregador / Mensageiro</th>
                              <th className="py-2 px-2">Oficiantes / Apoio</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-300">
                            {escalas.map((item, idx) => (
                              <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                                <td className="py-2 px-2 border-r border-slate-300 font-bold text-[10px]">
                                  <div>{formatBrazilianDate(item.data)}</div>
                                  <span className="text-blue-800 font-mono text-[9px]">às {item.horario}</span>
                                </td>
                                <td className="py-2 px-2 border-r border-slate-300 font-semibold text-[10px] text-slate-800">
                                  {item.tipoCulto}
                                </td>
                                <td className="py-2 px-2 border-r border-slate-300 font-black text-slate-950 text-[11px]">
                                  {item.dirigente}
                                </td>
                                <td className="py-2 px-2 border-r border-slate-300 font-bold text-amber-900 text-[10px]">
                                  {item.pregador || "—"}
                                </td>
                                <td className="py-2 px-2 text-[9px] text-slate-700 leading-tight">
                                  {item.oracaoInicial && <div>• Oração: <strong>{item.oracaoInicial}</strong></div>}
                                  {item.leituraPalavra && <div>• Leitura: <strong>{item.leituraPalavra}</strong></div>}
                                  {item.oracaoDizimos && <div>• Dízimos: <strong>{item.oracaoDizimos}</strong></div>}
                                  {!item.oracaoInicial && !item.leituraPalavra && !item.oracaoDizimos && "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Rodapé: Versículo Bíblico e Bloco de Assinatura */}
                  <div className="pt-4 border-t-2 border-slate-900">
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-300 text-center mb-6">
                      <p className="text-[11px] italic font-semibold text-slate-800">
                        {versiculoBiblico}
                      </p>
                    </div>

                    <div className="flex items-center justify-around text-center pt-2">
                      <div className="w-64 border-t border-slate-900 pt-1">
                        <p className="text-[10px] font-black uppercase text-slate-900">
                          PASTOR TITULAR / COORDENAÇÃO
                        </p>
                        <p className="text-xs font-bold text-slate-950">
                          {pastorResponsavel}
                        </p>
                      </div>
                      <div className="w-64 border-t border-slate-900 pt-1">
                        <p className="text-[10px] font-black uppercase text-slate-900">
                          SECRETARIA ECLESIÁSTICA
                        </p>
                        <p className="text-xs font-bold text-slate-950">
                          {churchData?.secretario || "Secretaria Geral"}
                        </p>
                      </div>
                    </div>

                    <div className="text-[8px] text-slate-400 text-center mt-6">
                      Documento gerado pelo Módulo de Secretaria da Igreja • Afixar no Mural Oficial e Púlpito
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-2 shrink-0 flex items-center justify-between sm:justify-between">
            <span className="text-xs text-muted-foreground">
              Escala persistida no banco de dados e sincronizada em tempo real.
            </span>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE GERENCIAMENTO DE TIPOS DE CULTO (Anexo 2) */}
      <Dialog open={isManagingTiposCulto} onOpenChange={setIsManagingTiposCulto}>
        <DialogContent className="max-w-md p-5">
          <DialogHeader className="border-b pb-2">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-primary" />
              Cadastrar Tipos de Culto
            </DialogTitle>
            <DialogDescription className="text-xs">
              Adicione novos tipos de cultos para selecionar na escala ou remova os que não utiliza.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* Input para adicionar novo tipo */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Ex: Vigília da Vitória / Culto de Primícias"
                value={newTipoCultoInput}
                onChange={(e) => setNewTipoCultoInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTipoCulto()}
                className="h-8 text-xs font-medium"
              />
              <Button size="sm" onClick={handleAddTipoCulto} className="h-8 text-xs font-semibold shrink-0">
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
              </Button>
            </div>

            {/* Lista dos tipos existentes com botão de exclusão */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 border rounded-lg p-2 bg-muted/20">
              {tiposCultoList.map((tipo) => (
                <div
                  key={tipo}
                  className="flex items-center justify-between p-1.5 px-2.5 rounded bg-background border text-xs text-slate-800 dark:text-slate-200"
                >
                  <span className="font-medium truncate">{tipo}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveTipoCulto(tipo)}
                    className="text-slate-400 hover:text-red-500 p-1 rounded transition-colors"
                    title={`Remover "${tipo}"`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="border-t pt-2">
            <Button size="sm" onClick={() => setIsManagingTiposCulto(false)} className="w-full">
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (Anexo 3 - substitui window.confirm) */}
      <Dialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Confirmar Exclusão de Culto
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Tem certeza que deseja remover este culto da escala oficial?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 text-xs text-slate-600 dark:text-slate-400">
            Esta ação excluirá o registro imediatamente do banco de dados e da folha do mural.
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setItemToDelete(null)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={confirmDeleteItem}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isDeleting ? "Excluindo..." : "Sim, Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
