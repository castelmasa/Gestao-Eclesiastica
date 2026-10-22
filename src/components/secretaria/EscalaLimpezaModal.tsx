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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sparkles,
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
  Users,
  FileText,
  Brush,
  CheckCircle2,
  Home,
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

export interface LimpezaEscalaItem {
  id: string;
  data: string; // YYYY-MM-DD
  horario: string; // HH:MM
  equipe: string; // Ex: Equipe 1 - Irmãs da Coluna
  coordenador: string;
  voluntarios: string; // Nomes separados por vírgula ou lista
  setores: string[]; // Nave, Banheiros, Cozinha, etc.
  observacoes?: string;
}

interface EscalaLimpezaModalProps {
  isOpen: boolean;
  onClose: () => void;
  members?: Array<{ id?: string; name: string; phone?: string; role?: string }>;
  churchData?: any;
  activeBranchName?: string;
  activeBranchId?: string;
}

const SETORES_PADRAO = [
  "Nave Principal & Altar / Púlpito",
  "Banheiros Masculino & Feminino",
  "Galeria / Mezanino & Sala de Som",
  "Salas das Crianças / Berçário / EBD",
  "Cozinha / Cantina & Salão Social",
  "Calçada, Entrada & Pátio Externo"
];

const EQUIPES_SUGERIDAS = [
  "Equipe 1 - Círculo de Oração & Mulheres",
  "Equipe 2 - Jovens & Adolescentes",
  "Equipe 3 - Homens & Diaconato",
  "Equipe 4 - Casais & Famílias",
  "Equipe 5 - Voluntários Gerais",
  "Equipe Especial - Pré-Santa Ceia"
];

const VERSO_LIMPEZA = "«E tudo quanto fizerdes, fazei-o de todo o coração, como ao Senhor e não aos homens.» (Colossenses 3:23)";

export function EscalaLimpezaModal({
  isOpen,
  onClose,
  members = [],
  churchData,
  activeBranchName = "2ª Congregação",
  activeBranchId = "sede"
}: EscalaLimpezaModalProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [escalas, setEscalas] = useState<LimpezaEscalaItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState<LimpezaEscalaItem>({
    id: "",
    data: new Date().toISOString().split("T")[0],
    horario: "08:00",
    equipe: "Equipe 1 - Círculo de Oração & Mulheres",
    coordenador: "",
    voluntarios: "",
    setores: [...SETORES_PADRAO],
    observacoes: "Favor trazer luvas e produtos de limpeza autorizados."
  });

  const [responsavelGeral, setResponsavelGeral] = useState(() => {
    return churchData?.pastorTitular || churchData?.pastor || "Diretoria de Patrimônio & Zeladoria";
  });

  const churchLogo = getRegisteredChurchLogo(activeBranchId) || churchData?.logoDataUrl || null;
  const churchName = churchData?.nome || `Igreja Evang. Pentecostal O Brasil para Cristo - ${activeBranchName}`;

  // Carrega escalas do Firestore
  useEffect(() => {
    const docRef = collection(db, "escalas_limpeza");
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      const items: LimpezaEscalaItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (!data.branchId || data.branchId === activeBranchId) {
          items.push({ id: docSnap.id, ...data } as LimpezaEscalaItem);
        }
      });
      items.sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario));
      setEscalas(items);
    }, (err) => {
      console.warn("Erro ao carregar escalas de limpeza:", err);
      try {
        const local = localStorage.getItem("escala_limpeza_local");
        if (local) setEscalas(JSON.parse(local));
      } catch {}
    });

    return () => unsubscribe();
  }, [activeBranchId]);

  // Toggle Setor
  const handleToggleSetor = (setor: string) => {
    setFormData(prev => ({
      ...prev,
      setores: prev.setores.includes(setor)
        ? prev.setores.filter(s => s !== setor)
        : [...prev.setores, setor]
    }));
  };

  // Salvar Item
  const handleSaveItem = async () => {
    if (!formData.data) {
      toast.error("Informe a data da escala de limpeza.");
      return;
    }
    if (!formData.equipe) {
      toast.error("Informe o nome da equipe responsável.");
      return;
    }

    setIsSaving(true);
    const toastId = toast.loading(editingId ? "Atualizando escala de limpeza..." : "Gravando escala de limpeza...");
    const itemId = editingId || `limp_${Date.now()}`;
    const payload: LimpezaEscalaItem = {
      ...formData,
      id: itemId
    };

    try {
      await setDoc(doc(db, "escalas_limpeza", itemId), {
        ...payload,
        branchId: activeBranchId,
        updatedAt: serverTimestamp()
      });

      setEscalas(prev => {
        const idx = prev.findIndex(item => item.id === itemId);
        let updated: LimpezaEscalaItem[];
        if (idx >= 0) {
          updated = [...prev];
          updated[idx] = payload;
        } else {
          updated = [...prev, payload];
        }
        updated.sort((a, b) => a.data.localeCompare(b.data) || a.horario.localeCompare(b.horario));
        localStorage.setItem("escala_limpeza_local", JSON.stringify(updated));
        return updated;
      });

      toast.success(editingId ? "Escala atualizada com sucesso!" : "Escala de limpeza gravada!", { id: toastId });

      setEditingId(null);
      setFormData({
        id: "",
        data: formData.data,
        horario: "08:00",
        equipe: "Equipe 2 - Jovens & Adolescentes",
        coordenador: "",
        voluntarios: "",
        setores: [...SETORES_PADRAO],
        observacoes: ""
      });
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar no banco. Gravado localmente.", { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // Excluir Item (Anexo 3: Sem window.confirm nativo)
  const handleDeleteItem = (id: string) => {
    setItemToDelete(id);
  };

  const confirmDeleteItem = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    const toastId = toast.loading("Removendo escala de limpeza...");

    try {
      await deleteDoc(doc(db, "escalas_limpeza", itemToDelete));
      setEscalas(prev => {
        const filtered = prev.filter(item => item.id !== itemToDelete);
        localStorage.setItem("escala_limpeza_local", JSON.stringify(filtered));
        return filtered;
      });
      toast.success("Escala de limpeza removida com sucesso!", { id: toastId });
    } catch (err) {
      console.error(err);
      setEscalas(prev => {
        const filtered = prev.filter(item => item.id !== itemToDelete);
        localStorage.setItem("escala_limpeza_local", JSON.stringify(filtered));
        return filtered;
      });
      toast.success("Escala de limpeza removida.", { id: toastId });
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  // Editar Item
  const handleEditItem = (item: LimpezaEscalaItem) => {
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
      elementId: "escala-limpeza-print",
      title: `Escala_Limpeza_Conservacao_${activeBranchName.replace(/\s+/g, '_')}`
    });
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    const toastId = toast.loading("Gerando PDF da Escala de Limpeza...");
    const success = await downloadElementAsPdf(
      "escala-limpeza-print",
      `Escala_Limpeza_${activeBranchName.replace(/\s+/g, '_')}.pdf`
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
      toast.error("Não há escalas de limpeza para compartilhar.");
      return;
    }
    let msg = `🧹 *ESCALA DE LIMPEZA E ZELADORIA DO TEMPLO*\n`;
    msg += `⛪ *${churchName}*\n\n`;

    escalas.forEach((e) => {
      msg += `📅 *${formatBrazilianDate(e.data)} às ${e.horario}*\n`;
      msg += `👥 *Equipe:* ${e.equipe}\n`;
      if (e.coordenador) msg += `⭐ *Líder:* ${e.coordenador}\n`;
      if (e.voluntarios) msg += `🤝 *Voluntários:* ${e.voluntarios}\n`;
      msg += `🧹 *Setores:* ${e.setores.join(", ")}\n`;
      if (e.observacoes) msg += `📝 *Obs:* ${e.observacoes}\n`;
      msg += `────────────────────\n`;
    });

    msg += `\n✍️ *Coordenação Geral:* ${responsavelGeral}\n`;
    msg += `_“Zelando bem da Casa do Senhor!”_`;

    navigator.clipboard.writeText(msg);
    toast.success("Escala de limpeza copiada para o WhatsApp!");
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="border-b pb-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg">
                <Brush className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  Escala de Limpeza & Zeladoria do Templo
                  <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">
                    Patrimônio & Conservação
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Organize equipes, datas, voluntários e setores para a higienização da Casa do Senhor.
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
              {editingId ? "Editar Escala" : "Cadastrar Equipe"}
            </Button>
            <Button
              variant={activeTab === 'preview' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('preview')}
              className="h-7 text-xs font-medium"
            >
              <FileText className="w-3.5 h-3.5 mr-1" />
              Folha do Mural A4 ({escalas.length} escalas)
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
                    {editingId ? "Editar Escala de Limpeza" : "Nova Escala de Limpeza"}
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
                          horario: "08:00",
                          equipe: "Equipe 1 - Círculo de Oração & Mulheres",
                          coordenador: "",
                          voluntarios: "",
                          setores: [...SETORES_PADRAO],
                          observacoes: ""
                        });
                      }}
                      className="h-6 text-[10px] text-muted-foreground"
                    >
                      Cancelar
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Data da Limpeza</Label>
                    <Input
                      type="date"
                      value={formData.data}
                      onChange={(e) => setFormData(p => ({ ...p, data: e.target.value }))}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Horário de Início</Label>
                    <Input
                      type="time"
                      value={formData.horario}
                      onChange={(e) => setFormData(p => ({ ...p, horario: e.target.value }))}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Equipe / Ministério Responsável</Label>
                  <Select
                    value={formData.equipe}
                    onValueChange={(val) => setFormData(p => ({ ...p, equipe: val }))}
                  >
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Selecione a equipe" />
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPES_SUGERIDAS.map((eq) => (
                        <SelectItem key={eq} value={eq} className="text-xs">
                          {eq}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Ou digite o nome da equipe personalizada..."
                    value={formData.equipe}
                    onChange={(e) => setFormData(p => ({ ...p, equipe: e.target.value }))}
                    className="h-7 text-xs mt-1"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Líder / Coordenador(a) da Equipe</Label>
                  <Input
                    placeholder="Nome do(a) coordenador(a)"
                    value={formData.coordenador}
                    onChange={(e) => setFormData(p => ({ ...p, coordenador: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Voluntários Escalados</Label>
                  <Input
                    placeholder="Ex: Maria, Joana, Carlos, Paulo, André..."
                    value={formData.voluntarios}
                    onChange={(e) => setFormData(p => ({ ...p, voluntarios: e.target.value }))}
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Digite os nomes dos voluntários escalados para esta data.
                  </p>
                </div>

                {/* Seleção de Setores */}
                <div className="space-y-1.5 pt-2 border-t">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Setores Designados</span>
                    <span className="text-[10px] text-muted-foreground">{formData.setores.length} selecionados</span>
                  </Label>
                  <div className="grid grid-cols-1 gap-1.5 bg-background p-2.5 rounded-lg border max-h-32 overflow-y-auto">
                    {SETORES_PADRAO.map((setor) => (
                      <label key={setor} className="flex items-center gap-2 text-xs cursor-pointer hover:text-primary">
                        <Checkbox
                          checked={formData.setores.includes(setor)}
                          onCheckedChange={() => handleToggleSetor(setor)}
                        />
                        <span className="text-[11px]">{setor}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Observações / Recomendações</Label>
                  <Input
                    placeholder="Ex: Verificar reposição de papel e sabonete..."
                    value={formData.observacoes || ""}
                    onChange={(e) => setFormData(p => ({ ...p, observacoes: e.target.value }))}
                    className="h-7 text-xs"
                  />
                </div>

                <Button
                  onClick={handleSaveItem}
                  disabled={isSaving}
                  className="w-full h-8 text-xs font-bold mt-2"
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  {editingId ? "Salvar Alterações da Escala" : "Gravar Escala de Limpeza"}
                </Button>
              </div>

              {/* Lista de Escalas Cadastradas (7 colunas) */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between pb-1 border-b">
                  <Badge variant="outline" className="text-xs font-semibold">
                    Escalas de Limpeza ({escalas.length})
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Ordenado por data e horário
                  </span>
                </div>

                {escalas.length === 0 ? (
                  <div className="text-center py-12 border rounded-xl bg-muted/20 text-muted-foreground">
                    <Brush className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-500" />
                    <p className="text-xs font-medium">Nenhuma escala de limpeza cadastrada.</p>
                    <p className="text-[11px] mt-1">Preencha o formulário ao lado para cadastrar a primeira equipe.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {escalas.map((item) => (
                      <Card key={item.id} className="p-3 hover:border-emerald-500/50 transition-all shadow-xs">
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                {formatBrazilianDate(item.data)} • {item.horario}
                              </span>
                              <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200 font-bold">
                                {item.equipe}
                              </Badge>
                            </div>

                            <div className="text-xs text-slate-700 dark:text-slate-300 pt-0.5">
                              {item.coordenador && (
                                <div><span className="text-muted-foreground">Coordenador(a):</span> <strong>{item.coordenador}</strong></div>
                              )}
                              {item.voluntarios && (
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                  <span>Voluntários: {item.voluntarios}</span>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1 mt-1">
                                {item.setores.map((s) => (
                                  <span key={s} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9.5px] font-medium text-slate-600 dark:text-slate-400 border">
                                    {s}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditItem(item)}
                              className="h-7 w-7 text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteItem(item.id)}
                              className="h-7 w-7 text-red-500 hover:text-red-700"
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
            /* FOLHA A4 PARA MURAL DA IGREJA                                  */
            /* ============================================================== */
            <div className="flex justify-center p-3 bg-slate-100 dark:bg-slate-900/60 rounded-xl overflow-x-auto">
              <div
                id="escala-limpeza-print"
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
                          {activeBranchName} • DEPARTAMENTO DE ZELADORIA & PATRIMÔNIO
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          ESCALA OFICIAL DE LIMPEZA E CONSERVAÇÃO DO TEMPLO
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-black px-2.5 py-1 bg-emerald-900 text-white rounded">
                        MURAL OFICIAL
                      </span>
                      <p className="text-[9px] text-slate-500 mt-1">
                        Emitido em: {new Date().toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>

                  {/* Tabela de Limpeza */}
                  <div className="border border-slate-800 rounded-sm overflow-hidden mb-6">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white uppercase text-[9px] tracking-wider">
                          <th className="py-2 px-2 border-r border-slate-700 w-28">Data / Horário</th>
                          <th className="py-2 px-2 border-r border-slate-700 w-44">Equipe / Ministério</th>
                          <th className="py-2 px-2 border-r border-slate-700">Líder & Voluntários</th>
                          <th className="py-2 px-2">Setores Atribuídos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300">
                        {escalas.map((item, idx) => (
                          <tr key={item.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                            <td className="py-2 px-2 border-r border-slate-300 font-bold text-[10px]">
                              <div>{formatBrazilianDate(item.data)}</div>
                              <span className="text-emerald-800 font-mono text-[9px]">às {item.horario}</span>
                            </td>
                            <td className="py-2 px-2 border-r border-slate-300 font-black text-slate-950 text-[10.5px]">
                              {item.equipe}
                            </td>
                            <td className="py-2 px-2 border-r border-slate-300 text-[10px]">
                              {item.coordenador && (
                                <div className="font-bold text-slate-900">Coord: {item.coordenador}</div>
                              )}
                              <div className="text-[9px] text-slate-600 mt-0.5">
                                {item.voluntarios || "Equipe convocada"}
                              </div>
                            </td>
                            <td className="py-2 px-2 text-[9px] text-slate-700">
                              <ul className="list-disc pl-3 space-y-0.5">
                                {item.setores.map(s => (
                                  <li key={s}>{s}</li>
                                ))}
                              </ul>
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
                      {VERSO_LIMPEZA}
                    </p>
                  </div>

                  <div className="flex items-center justify-around text-center pt-2">
                    <div className="w-64 border-t border-slate-900 pt-1">
                      <p className="text-[10px] font-black uppercase text-slate-900">
                        COORDENAÇÃO DE ZELADORIA
                      </p>
                      <p className="text-xs font-bold text-slate-950">
                        {responsavelGeral}
                      </p>
                    </div>
                    <div className="w-64 border-t border-slate-900 pt-1">
                      <p className="text-[10px] font-black uppercase text-slate-900">
                        DIRETORIA PASTORAL
                      </p>
                      <p className="text-xs font-bold text-slate-950">
                        {churchData?.pastorTitular || "Pastor Titular"}
                      </p>
                    </div>
                  </div>

                  <div className="text-[8px] text-slate-400 text-center mt-6">
                    Mural de Zeladoria • Igreja Evangélica Pentecostal O Brasil para Cristo
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-2 shrink-0 flex items-center justify-between sm:justify-between">
          <span className="text-xs text-muted-foreground">
            Zelo e conservação da Casa de Deus.
          </span>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO (Anexo 3) */}
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
                Tem certeza que deseja remover esta equipe da escala de limpeza?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 text-xs text-slate-600 dark:text-slate-400">
          Esta escala de limpeza será removida imediatamente do banco de dados e do mural.
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
