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
import {
  Music,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Printer,
  Download,
  Share2,
  Save,
  Users,
  FileText,
  Volume2,
  Tv,
  ListMusic,
  AlertTriangle,
  Settings2,
  X
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

export interface MusicoEscalaItem {
  id: string;
  data: string; // YYYY-MM-DD
  horarioCulto: string; // HH:MM
  horarioEnsaio: string; // HH:MM
  cultoTipo: string;
  ministro: string;
  vocais: string; // Backing vocals
  teclado?: string;
  violao?: string;
  guitarra?: string;
  baixo?: string;
  bateria?: string;
  sonoplastia?: string; // Mesa de som
  midiaProjecao?: string; // Telão / Live
  repertorio?: string; // Músicas programadas
  observacoes?: string;
}

interface EscalaMusicosModalProps {
  isOpen: boolean;
  onClose: () => void;
  members?: Array<{ id?: string; name: string; phone?: string; role?: string }>;
  churchData?: any;
  activeBranchName?: string;
  activeBranchId?: string;
}

export const DEFAULT_CULTOS_LOUVOR = [
  "Culto da Família & Celebração (Domingo Noite)",
  "Culto Matutino & EBD (Domingo Manhã)",
  "Culto de Louvor & Adoração (Quarta-Feira)",
  "Culto de Santa Ceia do Senhor",
  "Culto de Jovens (Geração Eleita)",
  "Vigília de Oração & Louvor",
  "Conferência & Congresso"
];

const VERSO_LOUVOR = "«Cantai-lhe um cântico novo; tocai bem e com júbilo.» (Salmo 33:3)";

export function EscalaMusicosModal({
  isOpen,
  onClose,
  members = [],
  churchData,
  activeBranchName = "2ª Congregação",
  activeBranchId = "sede"
}: EscalaMusicosModalProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [escalas, setEscalas] = useState<MusicoEscalaItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Tipos de Culto Dinâmicos
  const [tiposCultoList, setTiposCultoList] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("church_tipos_culto_musica");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_CULTOS_LOUVOR;
  });
  const [isManagingTiposCulto, setIsManagingTiposCulto] = useState(false);
  const [newTipoCultoInput, setNewTipoCultoInput] = useState("");

  // Confirmação de Exclusão (Anexo 3: Sem window.confirm nativo)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [formData, setFormData] = useState<MusicoEscalaItem>({
    id: "",
    data: new Date().toISOString().split("T")[0],
    horarioCulto: "19:00",
    horarioEnsaio: "18:00",
    cultoTipo: "Culto da Família & Celebração (Domingo Noite)",
    ministro: "",
    vocais: "",
    teclado: "",
    violao: "",
    guitarra: "",
    baixo: "",
    bateria: "",
    sonoplastia: "",
    midiaProjecao: "",
    repertorio: "1. Bondade de Deus | 2. Grandioso És Tu | 3. Porque Ele Vive",
    observacoes: "Chegar 1h antes para afinação e passagem de som."
  });

  const [liderLouvor, setLiderLouvor] = useState(() => {
    return churchData?.liderLouvor || "Líder do Ministério de Louvor";
  });

  const churchLogo = getRegisteredChurchLogo(activeBranchId) || churchData?.logoDataUrl || null;
  const churchName = churchData?.nome || `Igreja Evang. Pentecostal O Brasil para Cristo - ${activeBranchName}`;

  // Sincroniza Tipos de Culto
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "escala_tipos_culto_musica"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (Array.isArray(data.tipos) && data.tipos.length > 0) {
          setTiposCultoList(data.tipos);
          localStorage.setItem("church_tipos_culto_musica", JSON.stringify(data.tipos));
        }
      }
    }, (err) => {
      console.warn("Erro ao ouvir tipos de culto louvor:", err);
    });

    return () => unsub();
  }, []);

  // Carrega escalas do Firestore
  useEffect(() => {
    const docRef = collection(db, "escalas_musicos");
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      const items: MusicoEscalaItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.branchId || data.branchId === activeBranchId) {
          items.push({ id: docSnap.id, ...data } as MusicoEscalaItem);
        }
      });
      items.sort((a, b) => a.data.localeCompare(b.data) || a.horarioCulto.localeCompare(b.horarioCulto));
      setEscalas(items);
    }, (err) => {
      console.warn("Erro ao carregar escala de músicos:", err);
      try {
        const local = localStorage.getItem("escala_musicos_local");
        if (local) setEscalas(JSON.parse(local));
      } catch {}
    });

    return () => unsubscribe();
  }, [activeBranchId]);

  // Cadastrar Tipo de Culto
  const handleAddTipoCulto = async () => {
    const trimmed = newTipoCultoInput.trim();
    if (!trimmed) {
      toast.error("Digite o nome do culto.");
      return;
    }
    if (tiposCultoList.some(t => t.toLowerCase() === trimmed.toLowerCase())) {
      toast.info("Este tipo de culto já existe.");
      setFormData(prev => ({ ...prev, cultoTipo: trimmed }));
      setNewTipoCultoInput("");
      return;
    }
    const updated = [...tiposCultoList, trimmed];
    setTiposCultoList(updated);
    setFormData(prev => ({ ...prev, cultoTipo: trimmed }));
    setNewTipoCultoInput("");
    localStorage.setItem("church_tipos_culto_musica", JSON.stringify(updated));

    try {
      await setDoc(doc(db, "settings", "escala_tipos_culto_musica"), {
        tipos: updated,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success(`Culto "${trimmed}" cadastrado com sucesso!`);
    } catch {
      toast.success(`Culto "${trimmed}" gravado localmente!`);
    }
  };

  const handleRemoveTipoCulto = async (tipo: string) => {
    if (tiposCultoList.length <= 1) {
      toast.error("Mantenha ao menos um culto cadastrado.");
      return;
    }
    const updated = tiposCultoList.filter(t => t !== tipo);
    setTiposCultoList(updated);
    localStorage.setItem("church_tipos_culto_musica", JSON.stringify(updated));
    if (formData.cultoTipo === tipo) {
      setFormData(prev => ({ ...prev, cultoTipo: updated[0] }));
    }
    try {
      await setDoc(doc(db, "settings", "escala_tipos_culto_musica"), {
        tipos: updated,
        updatedAt: serverTimestamp()
      }, { merge: true });
      toast.success("Culto removido.");
    } catch {
      toast.success("Culto removido.");
    }
  };

  // Salvar Item
  const handleSaveItem = async () => {
    if (!formData.data) {
      toast.error("Informe a data da escala de louvor.");
      return;
    }
    if (!formData.ministro) {
      toast.error("Informe o Ministro / Líder de Louvor para a data.");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading(editingId ? "Atualizando escala de louvor..." : "Gravando escala de louvor...");
    const itemId = editingId || `mus_${Date.now()}`;
    const payload: MusicoEscalaItem = {
      ...formData,
      id: itemId
    };

    try {
      await setDoc(doc(db, "escalas_musicos", itemId), {
        ...payload,
        branchId: activeBranchId,
        updatedAt: serverTimestamp()
      });

      setEscalas(prev => {
        const idx = prev.findIndex(item => item.id === itemId);
        let updated: MusicoEscalaItem[];
        if (idx >= 0) {
          updated = [...prev];
          updated[idx] = payload;
        } else {
          updated = [...prev, payload];
        }
        updated.sort((a, b) => a.data.localeCompare(b.data) || a.horarioCulto.localeCompare(b.horarioCulto));
        localStorage.setItem("escala_musicos_local", JSON.stringify(updated));
        return updated;
      });

      toast.success(editingId ? "Escala atualizada com sucesso!" : "Escala de músicos gravada!", { id: toastId });

      setEditingId(null);
      setFormData({
        id: "",
        data: formData.data,
        horarioCulto: "19:00",
        horarioEnsaio: "18:00",
        cultoTipo: tiposCultoList[0] || "Culto da Família & Celebração (Domingo Noite)",
        ministro: "",
        vocais: "",
        teclado: "",
        violao: "",
        guitarra: "",
        baixo: "",
        bateria: "",
        sonoplastia: "",
        midiaProjecao: "",
        repertorio: "",
        observacoes: ""
      });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar no banco. Gravado localmente.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir Item (Anexo 3: Executa com confirmação em Modal sem bloqueio de iframe)
  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const toastId = toast.loading("Removendo escala de louvor...");

    try {
      await deleteDoc(doc(db, "escalas_musicos", itemToDelete));
      setEscalas(prev => {
        const filtered = prev.filter(item => item.id !== itemToDelete);
        localStorage.setItem("escala_musicos_local", JSON.stringify(filtered));
        return filtered;
      });
      toast.success("Escala de louvor removida com sucesso!", { id: toastId });
    } catch (err) {
      console.error(err);
      setEscalas(prev => {
        const filtered = prev.filter(item => item.id !== itemToDelete);
        localStorage.setItem("escala_musicos_local", JSON.stringify(filtered));
        return filtered;
      });
      toast.success("Escala removida.", { id: toastId });
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  // Editar Item
  const handleEditItem = (item: MusicoEscalaItem) => {
    setEditingId(item.id);
    setFormData({ ...item });
    setActiveTab('editor');
  };

  // Formatação Data PT-BR
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
      elementId: "escala-musicos-print",
      title: `Escala_Musicos_Louvor_${activeBranchName.replace(/\s+/g, '_')}`
    });
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    const toastId = toast.loading("Gerando PDF da Escala de Músicos...");
    const success = await downloadElementAsPdf(
      "escala-musicos-print",
      `Escala_Musicos_Louvor_${activeBranchName.replace(/\s+/g, '_')}.pdf`
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
      toast.error("Não há escalas de músicos para compartilhar.");
      return;
    }
    let msg = `🎵 *ESCALA DE MÚSICOS & MINISTÉRIO DE LOUVOR*\n`;
    msg += `⛪ *${churchName}*\n\n`;

    escalas.forEach((e) => {
      msg += `📅 *${formatBrazilianDate(e.data)}*\n`;
      msg += `⏰ Culto: *${e.horarioCulto}* | Passagem de Som: *${e.horarioEnsaio}*\n`;
      msg += `📖 *${e.cultoTipo}*\n`;
      msg += `🎤 *Ministro:* ${e.ministro}\n`;
      if (e.vocais) msg += `🗣️ *Vocais:* ${e.vocais}\n`;
      if (e.teclado) msg += `🎹 *Teclado:* ${e.teclado}\n`;
      if (e.violao) msg += `🎸 *Violão:* ${e.violao}\n`;
      if (e.guitarra) msg += `🎸 *Guitarra:* ${e.guitarra}\n`;
      if (e.baixo) msg += `🎸 *Baixo:* ${e.baixo}\n`;
      if (e.bateria) msg += `🥁 *Bateria:* ${e.bateria}\n`;
      if (e.sonoplastia) msg += `🎚️ *Mesa de Som:* ${e.sonoplastia}\n`;
      if (e.midiaProjecao) msg += `💻 *Mídia / Live:* ${e.midiaProjecao}\n`;
      if (e.repertorio) msg += `🎼 *Repertório:* ${e.repertorio}\n`;
      msg += `────────────────────\n`;
    });

    msg += `\n✍️ *Liderança de Louvor:* ${liderLouvor}\n`;
    msg += `_“Tudo quanto tem fôlego, louve ao Senhor!”_`;

    navigator.clipboard.writeText(msg);
    toast.success("Escala de louvor copiada para o WhatsApp!");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="border-b pb-3 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-500/10 text-purple-700 dark:text-purple-400 rounded-lg">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    Escala de Músicos & Ministério de Louvor
                    <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-800 border-purple-300">
                      Vozes & Instrumentos
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Cadastre ministros, instrumentistas, sonoplastia e repertório para cada culto.
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

            <div className="flex items-center gap-2 mt-3 pt-2 border-t">
              <Button
                variant={activeTab === 'editor' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab('editor')}
                className="h-7 text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                {editingId ? "Editar Escala" : "Cadastrar Culto"}
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
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-1 py-3">
            {activeTab === 'editor' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Formulário (5 colunas) */}
                <div className="lg:col-span-5 space-y-3 bg-muted/30 p-4 rounded-xl border">
                  <div className="flex items-center justify-between pb-1 border-b">
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {editingId ? "Editar Escala de Louvor" : "Nova Escala de Louvor"}
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
                            horarioCulto: "19:00",
                            horarioEnsaio: "18:00",
                            cultoTipo: tiposCultoList[0] || "Culto da Família & Celebração (Domingo Noite)",
                            ministro: "",
                            vocais: "",
                            teclado: "",
                            violao: "",
                            guitarra: "",
                            baixo: "",
                            bateria: "",
                            sonoplastia: "",
                            midiaProjecao: "",
                            repertorio: "",
                            observacoes: ""
                          });
                        }}
                        className="h-6 text-[10px] text-muted-foreground"
                      >
                        Cancelar
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Data</Label>
                      <Input
                        type="date"
                        value={formData.data}
                        onChange={(e) => setFormData(p => ({ ...p, data: e.target.value }))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Hora Culto</Label>
                      <Input
                        type="time"
                        value={formData.horarioCulto}
                        onChange={(e) => setFormData(p => ({ ...p, horarioCulto: e.target.value }))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Ensaio / Som</Label>
                      <Input
                        type="time"
                        value={formData.horarioEnsaio}
                        onChange={(e) => setFormData(p => ({ ...p, horarioEnsaio: e.target.value }))}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* TIPO DE CULTO COM GESTÃO DINÂMICA */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Culto</Label>
                      <button
                        type="button"
                        onClick={() => setIsManagingTiposCulto(true)}
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <Settings2 className="w-3 h-3" />
                        Cadastrar Tipos
                      </button>
                    </div>

                    <Select
                      value={formData.cultoTipo}
                      onValueChange={(val) => setFormData(p => ({ ...p, cultoTipo: val }))}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Selecione o culto" />
                      </SelectTrigger>
                      <SelectContent>
                        {tiposCultoList.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Vozes */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-purple-900 dark:text-purple-300">
                        Ministro(a) de Louvor *
                      </Label>
                      <Input
                        placeholder="Nome do(a) ministro(a)"
                        value={formData.ministro}
                        onChange={(e) => setFormData(p => ({ ...p, ministro: e.target.value }))}
                        className="h-8 text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Backing Vocals</Label>
                      <Input
                        placeholder="Ex: Ana, Débora, Lucas"
                        value={formData.vocais}
                        onChange={(e) => setFormData(p => ({ ...p, vocais: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>

                  {/* Instrumentos Principais */}
                  <div className="space-y-1.5 pt-1 border-t">
                    <Label className="text-xs font-semibold">Instrumentistas</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="🎹 Teclado / Piano"
                        value={formData.teclado || ""}
                        onChange={(e) => setFormData(p => ({ ...p, teclado: e.target.value }))}
                        className="h-7 text-xs"
                      />
                      <Input
                        placeholder="🎸 Violão"
                        value={formData.violao || ""}
                        onChange={(e) => setFormData(p => ({ ...p, violao: e.target.value }))}
                        className="h-7 text-xs"
                      />
                      <Input
                        placeholder="🎸 Guitarra"
                        value={formData.guitarra || ""}
                        onChange={(e) => setFormData(p => ({ ...p, guitarra: e.target.value }))}
                        className="h-7 text-xs"
                      />
                      <Input
                        placeholder="🎸 Baixo"
                        value={formData.baixo || ""}
                        onChange={(e) => setFormData(p => ({ ...p, baixo: e.target.value }))}
                        className="h-7 text-xs"
                      />
                      <Input
                        placeholder="🥁 Bateria"
                        value={formData.bateria || ""}
                        onChange={(e) => setFormData(p => ({ ...p, bateria: e.target.value }))}
                        className="h-7 text-xs"
                      />
                      <Input
                        placeholder="🎚️ Sonoplastia (Som)"
                        value={formData.sonoplastia || ""}
                        onChange={(e) => setFormData(p => ({ ...p, sonoplastia: e.target.value }))}
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Mídia / Projeção / Telão</Label>
                    <Input
                      placeholder="Nome do operador de mídia"
                      value={formData.midiaProjecao || ""}
                      onChange={(e) => setFormData(p => ({ ...p, midiaProjecao: e.target.value }))}
                      className="h-7 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Repertório / Músicas do Culto</Label>
                    <Input
                      placeholder="Ex: Hino 15 da Harpa, Bondade de Deus, Ele Vive..."
                      value={formData.repertorio || ""}
                      onChange={(e) => setFormData(p => ({ ...p, repertorio: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>

                  <Button
                    onClick={handleSaveItem}
                    disabled={isSaving}
                    className="w-full h-8 text-xs font-bold mt-2"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    {editingId ? "Salvar Alterações da Escala" : "Gravar Escala de Músicos"}
                  </Button>
                </div>

                {/* Lista de Escalas Cadastradas (7 colunas) */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b">
                    <Badge variant="outline" className="text-xs font-semibold">
                      Cultos com Louvor ({escalas.length})
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Ordenado por data do culto
                    </span>
                  </div>

                  {escalas.length === 0 ? (
                    <div className="text-center py-12 border rounded-xl bg-muted/20 text-muted-foreground">
                      <Music className="w-8 h-8 mx-auto mb-2 opacity-40 text-purple-500" />
                      <p className="text-xs font-medium">Nenhum culto com escala de músicos cadastrado.</p>
                      <p className="text-[11px] mt-1">Preencha o formulário ao lado para cadastrar a equipe de louvor.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                      {escalas.map((item) => (
                        <Card key={item.id} className="p-3 hover:border-purple-500/50 transition-all shadow-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-purple-700 dark:text-purple-400">
                                  {formatBrazilianDate(item.data)} • Culto: {item.horarioCulto}
                                </span>
                                <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-800 border-purple-200 font-bold">
                                  Ensaio: {item.horarioEnsaio}
                                </Badge>
                              </div>

                              <div className="text-xs text-slate-800 dark:text-slate-200 pt-0.5">
                                <div><span className="text-muted-foreground">Ministro(a):</span> <strong>{item.ministro}</strong></div>
                                {item.vocais && (
                                  <div className="text-[11px] text-muted-foreground">Vocais: {item.vocais}</div>
                                )}
                                <div className="flex flex-wrap gap-1 mt-1 text-[10px] text-slate-600 dark:text-slate-400">
                                  {item.teclado && <span className="bg-muted px-1.5 py-0.5 rounded border">🎹 {item.teclado}</span>}
                                  {item.violao && <span className="bg-muted px-1.5 py-0.5 rounded border">🎸 {item.violao}</span>}
                                  {item.guitarra && <span className="bg-muted px-1.5 py-0.5 rounded border">🎸 {item.guitarra}</span>}
                                  {item.baixo && <span className="bg-muted px-1.5 py-0.5 rounded border">🎸 {item.baixo}</span>}
                                  {item.bateria && <span className="bg-muted px-1.5 py-0.5 rounded border">🥁 {item.bateria}</span>}
                                  {item.sonoplastia && <span className="bg-muted px-1.5 py-0.5 rounded border">🎚️ Som: {item.sonoplastia}</span>}
                                </div>
                                {item.repertorio && (
                                  <div className="text-[10.5px] text-purple-900 dark:text-purple-300 font-medium mt-1 truncate">
                                    🎼 {item.repertorio}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Ações: Editar e Excluir (Anexo 3: Exclusão com Modal seguro) */}
                            <div className="flex items-center gap-1 shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditItem(item)}
                                className="h-7 w-7 text-blue-600 hover:text-blue-800"
                                title="Editar escala"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setItemToDelete(item.id)}
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Excluir escala de louvor"
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
              /* FOLHA A4 PARA MURAL DA IGREJA & MESA DE SOM                    */
              /* ============================================================== */
              <div className="flex justify-center p-3 bg-slate-100 dark:bg-slate-900/60 rounded-xl overflow-x-auto">
                <div
                  id="escala-musicos-print"
                  className="bg-white text-slate-950 p-8 rounded-sm shadow-xl border border-slate-300 print:m-0 print:p-6 print:shadow-none print:border-none flex flex-col justify-between"
                  style={{
                    width: '210mm',
                    minHeight: '297mm',
                    boxSizing: 'border-box',
                    backgroundColor: '#ffffff'
                  }}
                >
                  <div>
                    {/* Cabeçalho */}
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
                            {activeBranchName} • MINISTÉRIO DE LOUVOR & MÚSICA
                          </h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            ESCALA OFICIAL DE MINISTROS, MÚSICOS E SONOPLASTIA
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black px-2.5 py-1 bg-purple-900 text-white rounded">
                          MURAL OFICIAL
                        </span>
                        <p className="text-[9px] text-slate-500 mt-1">
                          Emitido em: {new Date().toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {/* Tabela de Louvor */}
                    <div className="border border-slate-800 rounded-sm overflow-hidden mb-6">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white uppercase text-[9px] tracking-wider">
                            <th className="py-2 px-2 border-r border-slate-700 w-28">Data / Horários</th>
                            <th className="py-2 px-2 border-r border-slate-700 w-36">Vozes & Ministro</th>
                            <th className="py-2 px-2 border-r border-slate-700">Instrumentos Escalados</th>
                            <th className="py-2 px-2 border-r border-slate-700 w-32">Equipe Técnica</th>
                            <th className="py-2 px-2">Repertório Previsto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          {escalas.map((item, idx) => (
                            <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                              <td className="py-2 px-2 border-r border-slate-300 font-bold text-[10px]">
                                <div>{formatBrazilianDate(item.data)}</div>
                                <div className="text-purple-800 font-mono text-[9px]">Culto: {item.horarioCulto}</div>
                                <div className="text-slate-500 font-mono text-[8.5px]">Ensaio: {item.horarioEnsaio}</div>
                              </td>
                              <td className="py-2 px-2 border-r border-slate-300 text-[10px]">
                                <div className="font-black text-slate-950">{item.ministro}</div>
                                {item.vocais && (
                                  <div className="text-[9px] text-slate-600 mt-0.5">Vozes: {item.vocais}</div>
                                )}
                              </td>
                              <td className="py-2 px-2 border-r border-slate-300 text-[9.5px] text-slate-800 leading-tight">
                                {item.teclado && <div>• Teclado: <strong>{item.teclado}</strong></div>}
                                {item.violao && <div>• Violão: <strong>{item.violao}</strong></div>}
                                {item.guitarra && <div>• Guitarra: <strong>{item.guitarra}</strong></div>}
                                {item.baixo && <div>• Baixo: <strong>{item.baixo}</strong></div>}
                                {item.bateria && <div>• Bateria: <strong>{item.bateria}</strong></div>}
                                {!item.teclado && !item.violao && !item.guitarra && !item.baixo && !item.bateria && "—"}
                              </td>
                              <td className="py-2 px-2 border-r border-slate-300 text-[9px] text-slate-700">
                                {item.sonoplastia && <div>Som: <strong>{item.sonoplastia}</strong></div>}
                                {item.midiaProjecao && <div>Mídia: <strong>{item.midiaProjecao}</strong></div>}
                                {!item.sonoplastia && !item.midiaProjecao && "—"}
                              </td>
                              <td className="py-2 px-2 text-[9px] text-purple-950 font-medium">
                                {item.repertorio || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Rodapé e Versículo */}
                  <div className="pt-4 border-t-2 border-slate-900">
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-300 text-center mb-6">
                      <p className="text-[11px] italic font-semibold text-slate-800">
                        {VERSO_LOUVOR}
                      </p>
                    </div>

                    <div className="flex items-center justify-around text-center pt-2">
                      <div className="w-64 border-t border-slate-900 pt-1">
                        <p className="text-[10px] font-black uppercase text-slate-900">
                          LIDERANÇA DO MINISTÉRIO DE LOUVOR
                        </p>
                        <p className="text-xs font-bold text-slate-950">
                          {liderLouvor}
                        </p>
                      </div>
                      <div className="w-64 border-t border-slate-900 pt-1">
                        <p className="text-[10px] font-black uppercase text-slate-900">
                          PASTOR TITULAR
                        </p>
                        <p className="text-xs font-bold text-slate-950">
                          {churchData?.pastorTitular || "Pastor Titular"}
                        </p>
                      </div>
                    </div>

                    <div className="text-[8px] text-slate-400 text-center mt-6">
                      Mural de Louvor & Adoração • Igreja Evangélica Pentecostal O Brasil para Cristo
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-2 shrink-0 flex items-center justify-between sm:justify-between">
            <span className="text-xs text-muted-foreground">
              Louvor e adoração com excelência na Casa de Deus.
            </span>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE GERENCIAMENTO DE TIPOS DE CULTO (Louvor) */}
      <Dialog open={isManagingTiposCulto} onOpenChange={setIsManagingTiposCulto}>
        <DialogContent className="max-w-md p-5">
          <DialogHeader className="border-b pb-2">
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-purple-600" />
              Cadastrar Tipos de Culto (Louvor)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Adicione cultos ou reuniões com ministério de louvor e adoração.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Ex: Noite de Adoração / Vigília de Oração"
                value={newTipoCultoInput}
                onChange={(e) => setNewTipoCultoInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTipoCulto()}
                className="h-8 text-xs font-medium"
              />
              <Button size="sm" onClick={handleAddTipoCulto} className="h-8 text-xs font-semibold shrink-0">
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
              </Button>
            </div>

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
                  Confirmar Exclusão de Escala
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Tem certeza que deseja remover esta escala de louvor?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 text-xs text-slate-600 dark:text-slate-400">
            Esta escala de músicos será removida imediatamente do banco de dados e do mural.
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
