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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users,
  Calendar,
  Clock,
  Plus,
  Trash2,
  Copy,
  Printer,
  Check,
  AlertTriangle,
  Music,
  Tv,
  DoorClosed,
  Smile,
  Baby,
  Coffee,
  CheckCircle2,
  Share2
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { printDocument } from "@/lib/printUtils";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";

interface VolunteerRole {
  department: string;
  roleName: string;
  volunteerName: string;
  volunteerPhone?: string;
}

export interface ScaleRecord {
  id?: string;
  serviceTitle: string;
  date: string;
  time: string;
  branchId?: string;
  assignments: VolunteerRole[];
  notes?: string;
  createdAt?: any;
}

interface GestaoEscalasModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Array<{ id?: string; name: string; phone?: string; role?: string }>;
  churchName?: string;
  activeBranchName?: string;
}

const DEPARTMENTS = [
  { name: "Louvor", icon: Music, color: "text-purple-600 bg-purple-50 border-purple-200" },
  { name: "Mídia & Sonoplastia", icon: Tv, color: "text-blue-600 bg-blue-50 border-blue-200" },
  { name: "Diaconia & Portaria", icon: DoorClosed, color: "text-amber-600 bg-amber-50 border-amber-200" },
  { name: "Recepção", icon: Smile, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  { name: "Ministério Kids", icon: Baby, color: "text-pink-600 bg-pink-50 border-pink-200" },
  { name: "Cantina & Apoio", icon: Coffee, color: "text-orange-600 bg-orange-50 border-orange-200" },
];

const DEFAULT_ROLES = [
  { department: "Louvor", roleName: "Ministro / Dirigente" },
  { department: "Louvor", roleName: "Teclado" },
  { department: "Louvor", roleName: "Violão / Guitarra" },
  { department: "Louvor", roleName: "Baixo" },
  { department: "Louvor", roleName: "Bateria" },
  { department: "Louvor", roleName: "Vocal / Backing" },
  { department: "Mídia & Sonoplastia", roleName: "Mesa de Som" },
  { department: "Mídia & Sonoplastia", roleName: "Transmissão / Live" },
  { department: "Mídia & Sonoplastia", roleName: "Projeção / Telão" },
  { department: "Diaconia & Portaria", roleName: "Portaria Principal" },
  { department: "Diaconia & Portaria", roleName: "Recolhimento de Dízimos" },
  { department: "Recepção", roleName: "Acolhimento de Visitantes" },
  { department: "Ministério Kids", roleName: "Professora Turma A" },
  { department: "Cantina & Apoio", roleName: "Atendimento Cantina" },
];

export function GestaoEscalasModal({
  isOpen,
  onClose,
  members,
  churchName = "Igreja Evangélica Manancial",
  activeBranchName = "Templo Sede"
}: GestaoEscalasModalProps) {
  const [scales, setScales] = useState<ScaleRecord[]>([]);
  const [selectedScale, setSelectedScale] = useState<ScaleRecord | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form states for new scale
  const [formServiceTitle, setFormServiceTitle] = useState("Culto da Família");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [formTime, setFormTime] = useState("19:00");
  const [formNotes, setFormNotes] = useState("");
  const [assignments, setAssignments] = useState<VolunteerRole[]>([]);

  // Temp state to add a role assignment
  const [selectedDept, setSelectedDept] = useState("Louvor");
  const [selectedRole, setSelectedRole] = useState("Ministro / Dirigente");
  const [selectedVolunteer, setSelectedVolunteer] = useState("");

  const churchLogo = getRegisteredChurchLogo();

  // Load scales from Firestore (or fallback to localStorage)
  useEffect(() => {
    try {
      const q = collection(db, "volunteerScales");
      const unsub = onSnapshot(q, (snapshot) => {
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ScaleRecord));
        // Sort descending by date
        docs.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        setScales(docs);
        if (docs.length > 0 && !selectedScale && !isCreatingNew) {
          setSelectedScale(docs[0]);
        }
      }, (err) => {
        console.warn("Firestore volunteerScales listener error, using localStorage:", err);
        const saved = localStorage.getItem("churchVolunteerScales");
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setScales(parsed);
            if (parsed.length > 0) setSelectedScale(parsed[0]);
          } catch (e) {}
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn("Error subscribing volunteerScales:", e);
    }
  }, []);

  // Save changes to localStorage as fallback
  const syncLocalStorage = (newScales: ScaleRecord[]) => {
    localStorage.setItem("churchVolunteerScales", JSON.stringify(newScales));
  };

  // Conflict Detection: check if any volunteer has multiple roles in the active scale
  const volunteerConflicts = useMemo(() => {
    const list = isCreatingNew ? assignments : selectedScale?.assignments || [];
    const count: Record<string, string[]> = {};

    list.forEach(a => {
      if (!a.volunteerName) return;
      const key = a.volunteerName.trim().toLowerCase();
      if (!count[key]) count[key] = [];
      count[key].push(`${a.department}: ${a.roleName}`);
    });

    const conflicts: Array<{ name: string; roles: string[] }> = [];
    Object.entries(count).forEach(([k, roles]) => {
      if (roles.length > 1) {
        conflicts.push({ name: list.find(a => a.volunteerName.trim().toLowerCase() === k)?.volunteerName || k, roles });
      }
    });

    return conflicts;
  }, [assignments, selectedScale, isCreatingNew]);

  const handleAddAssignment = () => {
    if (!selectedVolunteer.trim()) {
      toast.error("Selecione ou digite o nome do voluntário");
      return;
    }

    const memberObj = members.find(m => m.name.toLowerCase() === selectedVolunteer.toLowerCase());

    const newAssignment: VolunteerRole = {
      department: selectedDept,
      roleName: selectedRole,
      volunteerName: selectedVolunteer,
      volunteerPhone: memberObj?.phone || "",
    };

    setAssignments([...assignments, newAssignment]);
    setSelectedVolunteer("");
    toast.success(`${selectedRole} atribuído com sucesso!`);
  };

  const handleRemoveAssignment = (idx: number) => {
    setAssignments(assignments.filter((_, i) => i !== idx));
  };

  const handleSaveScale = async () => {
    if (!formServiceTitle.trim() || !formDate) {
      toast.error("Preencha o título do culto e a data");
      return;
    }
    if (assignments.length === 0) {
      toast.error("Adicione ao menos um voluntário escalado");
      return;
    }

    const scaleId = 'scale_' + Date.now();
    const newScale: ScaleRecord = {
      id: scaleId,
      serviceTitle: formServiceTitle,
      date: formDate,
      time: formTime,
      assignments,
      notes: formNotes,
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, "volunteerScales"), {
        ...newScale,
        serverCreatedAt: serverTimestamp(),
      });
      newScale.id = docRef.id;
      toast.success("Escala salva com sucesso no sistema!");
    } catch (e) {
      console.warn("Could not save to firestore, saved to local cache:", e);
      toast.success("Escala salva localmente!");
    }

    const updated = [newScale, ...scales.filter(s => s.id !== newScale.id && (s.date !== newScale.date || s.serviceTitle !== newScale.serviceTitle))];
    setScales(updated);
    syncLocalStorage(updated);

    setIsCreatingNew(false);
    setSelectedScale(newScale);
  };

  const handleDeleteScale = async (scale: ScaleRecord) => {
    const scaleId = scale.id;
    // Update state immediately
    const updated = scales.filter(s => {
      if (scaleId && s.id === scaleId) return false;
      if (s.date === scale.date && s.serviceTitle === scale.serviceTitle) return false;
      return true;
    });
    setScales(updated);
    syncLocalStorage(updated);

    if (selectedScale?.id === scaleId || (selectedScale?.date === scale.date && selectedScale?.serviceTitle === scale.serviceTitle)) {
      setSelectedScale(updated[0] || null);
    }

    if (scaleId && !scaleId.startsWith('scale_')) {
      try {
        await deleteDoc(doc(db, "volunteerScales", scaleId));
      } catch (e) {
        console.warn("Could not delete from firestore:", e);
      }
    }
    toast.success(`Escala "${scale.serviceTitle}" excluída com sucesso!`);
  };

  // Format WhatsApp message text
  const formatWhatsAppText = (scale: ScaleRecord) => {
    const formattedDate = new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    }).format(new Date(`${scale.date}T12:00:00`));

    let text = `⛪ *ESCALA DE VOLUNTÁRIOS - ${churchName.toUpperCase()}*\n`;
    text += `📅 *Culto:* ${scale.serviceTitle}\n`;
    text += `🗓️ *Data:* ${formattedDate} às ${scale.time}\n`;
    text += `📍 *Local:* ${activeBranchName}\n`;
    text += `────────────────────\n\n`;

    // Group by department
    const grouped: Record<string, VolunteerRole[]> = {};
    scale.assignments.forEach(a => {
      if (!grouped[a.department]) grouped[a.department] = [];
      grouped[a.department].push(a);
    });

    Object.entries(grouped).forEach(([dept, list]) => {
      text += `🔷 *${dept.toUpperCase()}:*\n`;
      list.forEach(item => {
        text += `• ${item.roleName}: *${item.volunteerName}*\n`;
      });
      text += `\n`;
    });

    if (scale.notes) {
      text += `📝 *Observações:* ${scale.notes}\n\n`;
    }

    text += `_“Tudo quanto fizerdes, fazei-o de todo o coração, como ao Senhor e não aos homens.” (Colossenses 3:23)_\n`;
    text += `Que Deus abençoe seu ministério! 🙌🕊️`;

    return text;
  };

  const handleCopyWhatsApp = (scale: ScaleRecord) => {
    const text = formatWhatsAppText(scale);
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Texto da escala copiado! Agora é só colar no grupo do WhatsApp da igreja.");
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrintScale = () => {
    printDocument({
      elementId: "escala-printable-area",
      title: `Escala_${selectedScale?.serviceTitle || "Culto"}_${selectedScale?.date || "data"}`,
      orientation: "portrait",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] flex flex-col p-0 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        <DialogHeader className="!m-0 !mx-0 !mt-0 !mb-0 p-5 sm:p-6 pb-4 border-b border-border bg-muted/20 sticky top-0 bg-background z-10 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Gestão de Escalas de Voluntários & Ministérios
              </DialogTitle>
              <DialogDescription className="text-sm">
                Organize escalas de louvor, mídia, diaconia, recepção e kids, com aviso de conflitos e envio para WhatsApp.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              {!isCreatingNew ? (
                <Button onClick={() => { setIsCreatingNew(true); setAssignments([...DEFAULT_ROLES.slice(0, 7).map(r => ({ ...r, volunteerName: "" }))]); }} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs">
                  <Plus className="w-4 h-4 mr-2" /> Nova Escala de Culto
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setIsCreatingNew(false)}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="p-6">
          {/* Conflict Alert Banner */}
          {volunteerConflicts.length > 0 && (
            <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm">Aviso de Escala Duplicada (Conflito de Voluntário):</h4>
                <div className="text-xs space-y-1 mt-1">
                  {volunteerConflicts.map((c, i) => (
                    <div key={i}>
                      • <strong>{c.name}</strong> está escalado(a) em mais de uma função: {c.roles.join(" + ")}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isCreatingNew ? (
            /* Creation Form */
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold">Título do Culto / Evento</Label>
                  <Input
                    value={formServiceTitle}
                    onChange={(e) => setFormServiceTitle(e.target.value)}
                    placeholder="Ex: Culto da Família, Santa Ceia"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Data</Label>
                  <Input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Horário</Label>
                  <Input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Add assignment row */}
              <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Atribuir Voluntário ao Ministério:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">Ministério</Label>
                    <Select value={selectedDept} onValueChange={setSelectedDept}>
                      <SelectTrigger className="text-xs h-9 mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map(d => (
                          <SelectItem key={d.name} value={d.name} className="text-xs">
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Função / Instrumento</Label>
                    <Input
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      placeholder="Ex: Bateria, Som, Portaria"
                      className="text-xs h-9 mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Voluntário (Membro)</Label>
                    <Input
                      list="members-datalist"
                      value={selectedVolunteer}
                      onChange={(e) => setSelectedVolunteer(e.target.value)}
                      placeholder="Nome do voluntário"
                      className="text-xs h-9 mt-1"
                    />
                    <datalist id="members-datalist">
                      {members.map(m => (
                        <option key={m.id || m.name} value={m.name} />
                      ))}
                    </datalist>
                  </div>

                  <div className="flex items-end">
                    <Button onClick={handleAddAssignment} className="w-full h-9 text-xs">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar à Escala
                    </Button>
                  </div>
                </div>
              </div>

              {/* Assignments Table */}
              <div className="border border-border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-xs">
                      <TableHead>Ministério</TableHead>
                      <TableHead>Função</TableHead>
                      <TableHead>Voluntário</TableHead>
                      <TableHead className="w-[80px] text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="text-xs">
                    {assignments.length > 0 ? (
                      assignments.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-semibold">{item.department}</TableCell>
                          <TableCell>{item.roleName}</TableCell>
                          <TableCell className="font-medium">
                            {item.volunteerName || <span className="text-muted-foreground italic">Não definido</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveAssignment(idx)}
                              className="text-destructive h-7 w-7 p-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          Nenhum voluntário adicionado ainda. Use os campos acima para preencher.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setIsCreatingNew(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveScale} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Check className="w-4 h-4 mr-2" /> Salvar Escala de Culto
                </Button>
              </div>
            </div>
          ) : (
            /* Scales Viewer */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: List of saved scales */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Escalas Recentes ({scales.length})
                </h4>
                <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                  {scales.length > 0 ? (
                    scales.map(s => (
                      <div
                        key={s.id || s.date}
                        onClick={() => setSelectedScale(s)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedScale?.id === s.id || (selectedScale?.date === s.date && selectedScale?.serviceTitle === s.serviceTitle)
                            ? "border-primary bg-primary/5 shadow-xs"
                            : "border-border hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="font-semibold text-sm text-foreground truncate">{s.serviceTitle}</h5>
                          <Badge variant="outline" className="text-[10px]">
                            {s.assignments?.length || 0} pessoas
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          {s.date} às {s.time}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center p-6 border border-dashed rounded-xl text-xs text-muted-foreground">
                      Nenhuma escala cadastrada. Clique em "Nova Escala de Culto" para começar.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Selected Scale details */}
              <div className="md:col-span-2 space-y-4">
                {selectedScale ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border bg-muted/20">
                      <div>
                        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-primary" /> {selectedScale.serviceTitle}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Data: {selectedScale.date} às {selectedScale.time} • {activeBranchName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleCopyWhatsApp(selectedScale)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-xl shadow-xs"
                        >
                          {copied ? <Check className="w-3.5 h-3.5 mr-1" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                          {copied ? "Copiado!" : "Copiar WhatsApp"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handlePrintScale}
                          className="text-xs rounded-xl"
                        >
                          <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir A4
                        </Button>
                        {selectedScale && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Excluir Escala"
                            onClick={() => handleDeleteScale(selectedScale)}
                            className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Printable Scale View */}
                    <div
                      id="escala-printable-area"
                      className="p-6 bg-white text-slate-900 rounded-xl border border-slate-200 space-y-4 font-sans"
                      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}
                    >
                      <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {churchLogo ? (
                            <img src={churchLogo} alt="Logo" className="w-14 h-14 object-contain shrink-0" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-slate-900 text-white font-black flex items-center justify-center text-sm shrink-0">
                              OBPC
                            </div>
                          )}
                          <div>
                            <h2 className="text-base font-black uppercase text-slate-950 tracking-normal leading-snug">{churchName}</h2>
                            <p className="text-xs text-slate-700 font-bold tracking-wider mt-0.5 uppercase">ESCALA OFICIAL DE VOLUNTÁRIOS</p>
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          <span className="font-black text-sm text-slate-950 block">{selectedScale.serviceTitle}</span>
                          <p className="text-slate-700 text-xs font-semibold mt-0.5">{selectedScale.date} às {selectedScale.time}</p>
                        </div>
                      </div>

                      {/* Grouped ministries */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {DEPARTMENTS.map(dept => {
                          const items = selectedScale.assignments.filter(a => a.department === dept.name);
                          if (items.length === 0) return null;
                          const IconComp = dept.icon;

                          return (
                            <div key={dept.name} className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                              <div className="bg-slate-100 font-bold px-3 py-1.5 flex items-center gap-1.5 border-b border-slate-200 text-slate-800">
                                <IconComp className="w-3.5 h-3.5 text-primary" /> {dept.name}
                              </div>
                              <div className="divide-y divide-slate-100 p-1">
                                {items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center py-1.5 px-2">
                                    <span className="text-slate-600 font-medium">{item.roleName}:</span>
                                    <span className="font-bold text-slate-900">{item.volunteerName}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {selectedScale.notes && (
                        <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 italic">
                          <strong>Observações:</strong> {selectedScale.notes}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 border border-dashed rounded-xl text-muted-foreground text-sm">
                    Selecione uma escala à esquerda para visualizar ou crie uma nova.
                  </div>
                )}
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
