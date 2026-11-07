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
  Baby,
  ShieldCheck,
  Printer,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Phone,
  User,
  Heart,
  DoorOpen,
  QrCode,
  Download,
  Eye,
  Image as ImageIcon,
  Check,
  Church
} from "lucide-react";
import { toast } from "sonner";
import { printDocument, downloadElementAsPdf, downloadElementAsImage } from "@/lib/printUtils";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";
import { BarcodeGenerator } from "@/components/common/BarcodeGenerator";
import { useBranch } from "@/contexts/BranchContext";
import { getChurchLeadershipConfig } from "@/lib/churchConfigHelper";

export interface KidsCheckinRecord {
  id?: string;
  childName: string;
  age: string;
  classroom: string;
  parentName: string;
  parentRelationship: string;
  parentPhone: string;
  securityCode: string;
  allergies?: string;
  notes?: string;
  status: "presente" | "retirado";
  checkinTime: string;
  checkoutTime?: string;
  branchId?: string;
}

interface CheckinKidsModalProps {
  isOpen: boolean;
  onClose: () => void;
  churchName?: string;
  activeBranchName?: string;
}

const CLASSROOMS = [
  { name: "Berçário (0 a 2 anos)", code: "BER" },
  { name: "Maternal (3 a 5 anos)", code: "MAT" },
  { name: "Primários (6 a 8 anos)", code: "PRI" },
  { name: "Juniores (9 a 11 anos)", code: "JUN" },
];

function generateSecurityCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `KD-${num}`;
}

export function CheckinKidsModal({
  isOpen,
  onClose,
  churchName,
  activeBranchName: branchNameProp
}: CheckinKidsModalProps) {
  const { activeBranch, activeBranchName: branchCtxName } = useBranch();
  const effectiveBranchName = branchNameProp || branchCtxName || "Templo Sede";

  // Obter Dados Oficiais da Igreja e Pastor do módulo de Parâmetros
  const leadership = getChurchLeadershipConfig(activeBranch);
  const resolvedChurchName = (churchName && !churchName.includes("Manancial"))
    ? churchName
    : (leadership.church.name || effectiveBranchName || "Igreja Evangélica Pentecostal O Brasil para Cristo");
  const pastorName = leadership.pastor.name || "Pr. Samuel de Oliveira";

  const [records, setRecords] = useState<KidsCheckinRecord[]>([]);
  const [activeTab, setActiveTab] = useState<"novo" | "ativos" | "historico">("novo");
  const [lastCheckin, setLastCheckin] = useState<KidsCheckinRecord | null>(null);
  const [printTargetChild, setPrintTargetChild] = useState<KidsCheckinRecord | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Form states
  const [childName, setChildName] = useState("");
  const [age, setAge] = useState("");
  const [classroom, setClassroom] = useState("Maternal (3 a 5 anos)");
  const [parentName, setParentName] = useState("");
  const [parentRelationship, setParentRelationship] = useState("Mãe");
  const [parentPhone, setParentPhone] = useState("");
  const [allergies, setAllergies] = useState("");
  const [notes, setNotes] = useState("");

  const churchLogo = getRegisteredChurchLogo();

  // Load records from Firestore or localStorage
  useEffect(() => {
    try {
      const q = collection(db, "kidsCheckins");
      const unsub = onSnapshot(q, (snapshot) => {
        const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as KidsCheckinRecord));
        // Sort newest first
        loaded.sort((a, b) => (b.checkinTime || "").localeCompare(a.checkinTime || ""));
        setRecords(loaded);
      }, (err) => {
        console.warn("Firestore kidsCheckins error, using local fallback:", err);
        const saved = localStorage.getItem("churchKidsCheckins");
        if (saved) {
          try { setRecords(JSON.parse(saved)); } catch (e) {}
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn("Error listening kidsCheckins:", e);
    }
  }, []);

  const syncLocalStorage = (newRecords: KidsCheckinRecord[]) => {
    localStorage.setItem("churchKidsCheckins", JSON.stringify(newRecords));
  };

  const handleCreateCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!childName.trim() || !parentName.trim() || !parentPhone.trim()) {
      toast.error("Preencha o nome da criança, responsável e telefone");
      return;
    }

    const code = generateSecurityCode();
    const timeNow = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date());

    const newRecord: KidsCheckinRecord = {
      childName,
      age: age || "Não informada",
      classroom,
      parentName,
      parentRelationship,
      parentPhone,
      securityCode: code,
      allergies: allergies.trim() || undefined,
      notes: notes.trim() || undefined,
      status: "presente",
      checkinTime: timeNow,
    };

    try {
      const docRef = await addDoc(collection(db, "kidsCheckins"), {
        ...newRecord,
        serverCreatedAt: serverTimestamp(),
      });
      newRecord.id = docRef.id;
      toast.success(`Check-in de ${childName} realizado! Código: ${code}`);
    } catch (err) {
      const updated = [newRecord, ...records];
      setRecords(updated);
      syncLocalStorage(updated);
      toast.success(`Check-in salvo localmente! Código: ${code}`);
    }

    setLastCheckin(newRecord);
    setPrintTargetChild(newRecord);
    // Reset form
    setChildName("");
    setAge("");
    setParentName("");
    setParentPhone("");
    setAllergies("");
    setNotes("");
  };

  const handleCheckout = async (record: KidsCheckinRecord) => {
    const timeNow = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date());

    try {
      if (record.id) {
        await updateDoc(doc(db, "kidsCheckins", record.id), {
          status: "retirado",
          checkoutTime: timeNow,
        });
      }
      toast.success(`Saída de ${record.childName} confirmada às ${timeNow}!`);
    } catch (e) {
      const updated = records.map(r => r.securityCode === record.securityCode ? { ...r, status: "retirado" as const, checkoutTime: timeNow } : r);
      setRecords(updated);
      syncLocalStorage(updated);
      toast.success(`Saída confirmada localmente!`);
    }
  };

  // Impressão oficial dos canhotos da criança
  const handlePrintBadges = (record: KidsCheckinRecord) => {
    setPrintTargetChild(record);
    setIsPrintModalOpen(true);
    toast.info(`Preparando impressão de canhotos de ${record.childName} (${record.securityCode})...`);

    // Dispara a impressão na thread com sincronia
    setTimeout(() => {
      printDocument({
        elementId: "kids-badge-global-print-area",
        title: `Canhotos_Kids_${record.childName.replace(/\s+/g, '_')}_${record.securityCode}`,
        orientation: "portrait",
      });
    }, 120);
  };

  const handleDownloadPdfCanhotos = async (record: KidsCheckinRecord) => {
    setPrintTargetChild(record);
    const toastId = toast.loading("Gerando arquivo PDF dos canhotos de segurança...");
    const success = await downloadElementAsPdf(
      "kids-badge-global-print-area",
      `Canhotos_Kids_${record.childName.replace(/\s+/g, '_')}_${record.securityCode}.pdf`
    );
    if (success) {
      toast.success("PDF dos canhotos baixado com sucesso!", { id: toastId });
    } else {
      toast.error("Erro ao gerar PDF. Use o botão Imprimir para salvar em PDF.", { id: toastId });
    }
  };

  const handleDownloadImageCanhotos = async (record: KidsCheckinRecord) => {
    setPrintTargetChild(record);
    await downloadElementAsImage(
      "kids-badge-global-print-area",
      `Canhotos_Kids_${record.childName.replace(/\s+/g, '_')}_${record.securityCode}.png`
    );
  };

  const activeChildren = records.filter(r => r.status === "presente");
  const childForGlobalPrint = printTargetChild || lastCheckin || activeChildren[0] || records[0] || null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] flex flex-col p-0 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
          <DialogHeader className="!m-0 !mx-0 !mt-0 !mb-0 p-5 sm:p-6 pb-4 border-b border-border bg-muted/20 sticky top-0 bg-background z-10 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Baby className="w-5 h-5 text-pink-600" />
                  Check-in Seguro de Crianças • Ministério Kids
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Segurança infantil nos cultos: emissão de crachá para a criança e canhoto exclusivo de retirada para os pais.
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-300 py-1 px-3">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {activeChildren.length} crianças no culto
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
                <Plus className="w-3.5 h-3.5 mr-1" /> Novo Check-in
              </Button>
              <Button
                variant={activeTab === "ativos" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("ativos")}
                className="text-xs rounded-xl"
              >
                <Baby className="w-3.5 h-3.5 mr-1" /> Crianças no Culto ({activeChildren.length})
              </Button>
              <Button
                variant={activeTab === "historico" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("historico")}
                className="text-xs rounded-xl"
              >
                <Clock className="w-3.5 h-3.5 mr-1" /> Histórico do Dia ({records.length})
              </Button>
            </div>
          </DialogHeader>

          <div className="p-6 overflow-y-auto flex-1">
            {activeTab === "novo" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Form */}
                <form onSubmit={handleCreateCheckin} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Dados da Criança
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Input
                          placeholder="Nome da criança *"
                          value={childName}
                          onChange={(e) => setChildName(e.target.value)}
                          className="rounded-xl h-10 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="Idade (ex: 5 anos)"
                          value={age}
                          onChange={(e) => setAge(e.target.value)}
                          className="rounded-xl h-10 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Turma / Sala
                    </Label>
                    <Select value={classroom} onValueChange={setClassroom}>
                      <SelectTrigger className="rounded-xl h-10 text-sm">
                        <SelectValue placeholder="Selecione a turma" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASSROOMS.map(c => (
                          <SelectItem key={c.code} value={c.name}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Responsável Legal
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Input
                          placeholder="Nome do responsável *"
                          value={parentName}
                          onChange={(e) => setParentName(e.target.value)}
                          className="rounded-xl h-10 text-sm"
                          required
                        />
                      </div>
                      <div>
                        <Select value={parentRelationship} onValueChange={setParentRelationship}>
                          <SelectTrigger className="rounded-xl h-10 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mãe">Mãe</SelectItem>
                            <SelectItem value="Pai">Pai</SelectItem>
                            <SelectItem value="Avô(ó)">Avô(ó)</SelectItem>
                            <SelectItem value="Tio(a)">Tio(a)</SelectItem>
                            <SelectItem value="Outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Telefone / WhatsApp de Contato *
                    </Label>
                    <Input
                      placeholder="(18) 99999-9999"
                      value={parentPhone}
                      onChange={(e) => setParentPhone(e.target.value)}
                      className="rounded-xl h-10 text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                      <span>Alergias ou Cuidados Especiais</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Opcional</span>
                    </Label>
                    <Input
                      placeholder="Ex: Alergia a amendoim, intolerância a lactose, asmático..."
                      value={allergies}
                      onChange={(e) => setAllergies(e.target.value)}
                      className="rounded-xl h-10 text-sm border-rose-200 focus-visible:ring-rose-500"
                    />
                  </div>

                  <Button type="submit" className="w-full bg-pink-600 hover:bg-pink-700 text-white rounded-xl h-11 font-semibold shadow-sm">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Realizar Check-in e Gerar Código
                  </Button>
                </form>

                {/* Right preview: Last generated badges */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Canhotos de Impressão (Segurança)
                  </h4>

                  {lastCheckin ? (
                    <div className="space-y-4">
                      <div
                        id={`kids-badge-preview-area-${lastCheckin.securityCode}`}
                        className="p-5 rounded-xl border border-slate-300 bg-white text-slate-900 space-y-4 shadow-sm"
                      >
                        {/* Header Oficial da Igreja */}
                        <div className="flex items-center justify-between border-b pb-2">
                          <div className="flex items-center gap-2">
                            {churchLogo && <img src={churchLogo} alt="Logo" className="w-6 h-6 object-contain" />}
                            <div>
                              <p className="text-[11px] font-black uppercase text-slate-800 leading-tight">
                                {resolvedChurchName}
                              </p>
                              <p className="text-[9px] text-slate-500 font-semibold">
                                {effectiveBranchName} • Ministério Kids
                              </p>
                            </div>
                          </div>
                          <span className="text-[9px] font-bold text-slate-500">
                            Pastor: {pastorName}
                          </span>
                        </div>

                        {/* Canhoto 1: Crachá da Criança */}
                        <div className="border-2 border-dashed border-pink-400 p-4 rounded-xl relative bg-pink-50/30">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-pink-700 tracking-wider">CRACHÁ DE PEITO DA CRIANÇA</span>
                              <h3 className="text-base font-black text-slate-900">{lastCheckin.childName}</h3>
                              <p className="text-xs text-slate-600 font-semibold">{lastCheckin.classroom} • {lastCheckin.age}</p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <span className="text-[10px] font-bold text-slate-500 block">CÓDIGO DE RETIRADA</span>
                              <div className="text-lg font-black text-pink-700 bg-white border border-pink-300 px-2 py-0.5 rounded-lg shadow-2xs font-mono">
                                {lastCheckin.securityCode}
                              </div>
                              <div className="mt-1 bg-white p-1 rounded border border-pink-200">
                                <BarcodeGenerator
                                  value={lastCheckin.securityCode.replace(/[^a-zA-Z0-9]/g, "")}
                                  text={lastCheckin.securityCode}
                                  width={1.1}
                                  height={18}
                                  fontSize={8}
                                  displayValue={true}
                                  lineColor="#000000"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-pink-200 text-xs flex justify-between">
                            <span>Resp: <strong>{lastCheckin.parentName} ({lastCheckin.parentRelationship})</strong></span>
                            <span>Tel: <strong>{lastCheckin.parentPhone}</strong></span>
                          </div>

                          {lastCheckin.allergies && (
                            <div className="mt-2 bg-rose-100 text-rose-800 text-[11px] font-bold p-1.5 rounded-md flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> ALERTA: {lastCheckin.allergies}
                            </div>
                          )}
                        </div>

                        {/* Canhoto 2: Comprovante dos Pais */}
                        <div className="border-2 border-dashed border-blue-400 p-4 rounded-xl relative bg-blue-50/30">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-blue-700 tracking-wider">COMPROVANTE DE RETIRADA DOS PAIS</span>
                              <h4 className="text-xs font-semibold text-slate-700">Entregue à: {lastCheckin.parentName}</h4>
                              <p className="text-xs text-slate-600 font-medium">Filho(a): <strong>{lastCheckin.childName}</strong></p>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <span className="text-[10px] font-bold text-slate-500 block">CÓDIGO OBRIGATÓRIO</span>
                              <div className="text-lg font-black text-blue-700 bg-white border border-blue-300 px-2 py-0.5 rounded-lg shadow-2xs font-mono">
                                {lastCheckin.securityCode}
                              </div>
                              <div className="mt-1 bg-white p-1 rounded border border-blue-200">
                                <BarcodeGenerator
                                  value={lastCheckin.securityCode.replace(/[^a-zA-Z0-9]/g, "")}
                                  text={lastCheckin.securityCode}
                                  width={1.1}
                                  height={18}
                                  fontSize={8}
                                  displayValue={true}
                                  lineColor="#000000"
                                />
                              </div>
                            </div>
                          </div>

                          <p className="text-[10px] text-slate-500 mt-2 italic leading-tight">
                            * Apresente este canhoto na porta do Ministério Kids ao término do culto. A criança não será liberada sem a validação do código.
                          </p>
                        </div>
                      </div>

                      {/* Botões de Ação Imediata */}
                      <div className="space-y-2">
                        <Button
                          onClick={() => handlePrintBadges(lastCheckin)}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs h-10 font-bold"
                        >
                          <Printer className="w-4 h-4 mr-2" /> Imprimir Canhotos ({lastCheckin.securityCode})
                        </Button>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleDownloadPdfCanhotos(lastCheckin)}
                            className="flex-1 rounded-xl text-xs h-9 border-slate-300 hover:bg-slate-100 font-semibold"
                          >
                            <Download className="w-3.5 h-3.5 mr-1 text-slate-700" /> Baixar Canhoto (PDF)
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              setPrintTargetChild(lastCheckin);
                              setIsPrintModalOpen(true);
                            }}
                            className="rounded-xl text-xs h-9 px-3 border-slate-300 hover:bg-slate-100 font-semibold"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-slate-700" /> Visualizar
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-8 border border-dashed rounded-xl text-muted-foreground text-xs">
                      Preencha o formulário ao lado para gerar os canhotos e crachás de segurança.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "ativos" && (
              <div className="space-y-4">
                <div className="border border-border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 text-xs">
                        <TableHead>Código</TableHead>
                        <TableHead>Criança</TableHead>
                        <TableHead>Sala / Turma</TableHead>
                        <TableHead>Responsável & Contato</TableHead>
                        <TableHead>Entrada</TableHead>
                        <TableHead>Alergias</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeChildren.length > 0 ? (
                        activeChildren.map(record => (
                          <TableRow key={record.id || record.securityCode} className="text-xs">
                            <TableCell className="font-mono font-bold text-pink-700">
                              {record.securityCode}
                            </TableCell>
                            <TableCell className="font-bold text-foreground">
                              {record.childName} <span className="text-muted-foreground font-normal">({record.age})</span>
                            </TableCell>
                            <TableCell>{record.classroom}</TableCell>
                            <TableCell>
                              <div className="font-medium">{record.parentName} ({record.parentRelationship})</div>
                              <div className="text-[11px] text-muted-foreground">{record.parentPhone}</div>
                            </TableCell>
                            <TableCell>{record.checkinTime}</TableCell>
                            <TableCell>
                              {record.allergies ? (
                                <Badge variant="outline" className="text-[10px] bg-rose-50 text-rose-700 border-rose-300">
                                  <AlertTriangle className="w-3 h-3 mr-1 text-rose-600" /> {record.allergies}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-[11px] italic">Sem alergias</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePrintBadges(record)}
                                  className="h-8 text-xs px-2.5 rounded-lg border-slate-300 hover:bg-slate-100 font-semibold"
                                  title="Imprimir canhoto de segurança e crachá"
                                >
                                  <Printer className="w-3.5 h-3.5 mr-1 text-slate-700" /> Canhoto
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleCheckout(record)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs px-3 rounded-lg font-semibold"
                                >
                                  <DoorOpen className="w-3.5 h-3.5 mr-1" /> Check-out
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Nenhuma criança presente no momento.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {activeTab === "historico" && (
              <div className="space-y-4">
                <div className="border border-border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 text-xs">
                        <TableHead>Código</TableHead>
                        <TableHead>Criança</TableHead>
                        <TableHead>Sala</TableHead>
                        <TableHead>Responsável</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Entrada / Saída</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="text-xs">
                      {records.map(r => (
                        <TableRow key={r.id || r.securityCode}>
                          <TableCell className="font-bold font-mono text-pink-700">{r.securityCode}</TableCell>
                          <TableCell className="font-medium">{r.childName} ({r.age})</TableCell>
                          <TableCell>{r.classroom}</TableCell>
                          <TableCell>{r.parentName}</TableCell>
                          <TableCell>
                            <Badge variant={r.status === "presente" ? "default" : "secondary"}>
                              {r.status === "presente" ? "Presente" : "Retirado"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-[11px]">
                            {r.checkinTime} {r.checkoutTime ? `➔ ${r.checkoutTime}` : ""}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePrintBadges(r)}
                              className="h-7 text-xs px-2"
                            >
                              <Printer className="w-3 h-3 mr-1" /> Canhoto
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
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

      {/* Modal Dedicado de Impressão e Segurança Infantil */}
      <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[92vh] flex flex-col p-0 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
          <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted/20 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                <Printer className="w-5 h-5 text-pink-600" />
                Impressão de Canhoto e Crachá • Ministério Kids
              </DialogTitle>
              <DialogDescription className="text-xs">
                {childForGlobalPrint ? `Criança: ${childForGlobalPrint.childName} • Código: ${childForGlobalPrint.securityCode}` : "Canhoto oficial de identificação"}
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="p-4 sm:p-6 overflow-y-auto bg-slate-100 dark:bg-slate-900/50 flex-1 flex justify-center">
            {childForGlobalPrint && (
              <div
                id="kids-badge-global-print-area"
                className="print-page w-full max-w-[180mm] p-6 bg-white text-slate-900 space-y-6 border border-slate-300 rounded-2xl shadow-md"
              >
                {/* Cabeçalho Oficial da Igreja conforme Parâmetros */}
                <div className="flex items-center justify-between border-b-2 border-slate-800 pb-3">
                  <div className="flex items-center gap-3">
                    {churchLogo && (
                      <img src={churchLogo} alt="Logo" className="h-10 w-10 object-contain" />
                    )}
                    <div>
                      <h3 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide leading-tight">
                        {resolvedChurchName}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] font-bold text-slate-600">
                        MINISTÉRIO KIDS • CONTROLE DE ACESSO & SEGURANÇA
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[10px] sm:text-[11px] text-slate-600">
                    <span className="font-bold block uppercase">{effectiveBranchName}</span>
                    <span className="text-[10px] text-slate-500">Pastor: {pastorName}</span>
                  </div>
                </div>

                {/* Crachá de Peito da Criança */}
                <div className="border-2 border-dashed border-pink-500 p-5 rounded-2xl bg-pink-50/40 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-pink-700 bg-pink-100 px-2 py-0.5 rounded">
                        CRACHÁ DE PEITO DA CRIANÇA
                      </span>
                      <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">{childForGlobalPrint.childName}</h2>
                      <p className="text-sm font-bold text-slate-700 mt-0.5">
                        {childForGlobalPrint.classroom} • {childForGlobalPrint.age}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase block">CÓDIGO DE RETIRADA</span>
                      <div className="text-2xl font-black text-pink-700 bg-white border-2 border-pink-400 px-3 py-0.5 rounded-xl shadow-xs inline-block mt-0.5 font-mono">
                        {childForGlobalPrint.securityCode}
                      </div>
                      <div className="mt-1.5 bg-white p-1 rounded-lg border border-pink-300">
                        <BarcodeGenerator
                          value={childForGlobalPrint.securityCode.replace(/[^a-zA-Z0-9]/g, "")}
                          text={childForGlobalPrint.securityCode}
                          width={1.2}
                          height={20}
                          fontSize={9}
                          displayValue={true}
                          lineColor="#000000"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-pink-200 text-xs flex flex-wrap justify-between gap-2 text-slate-700">
                    <span>Responsável: <strong>{childForGlobalPrint.parentName} ({childForGlobalPrint.parentRelationship})</strong></span>
                    <span>Contato: <strong>{childForGlobalPrint.parentPhone}</strong></span>
                    <span>Entrada: <strong>{childForGlobalPrint.checkinTime}</strong></span>
                  </div>

                  {childForGlobalPrint.allergies && (
                    <div className="mt-3 bg-rose-100 border border-rose-300 text-rose-800 text-xs font-bold p-2.5 rounded-xl flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>ALERTA MÉDICO / ALIMENTAR: {childForGlobalPrint.allergies}</span>
                    </div>
                  )}
                </div>

                {/* Comprovante de Retirada dos Pais */}
                <div className="border-2 border-dashed border-blue-500 p-5 rounded-2xl bg-blue-50/40 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                        COMPROVANTE DE RETIRADA DOS PAIS
                      </span>
                      <h3 className="text-base font-bold text-slate-800 mt-2">
                        Entregue à: <strong>{childForGlobalPrint.parentName}</strong>
                      </h3>
                      <p className="text-sm font-semibold text-slate-700">
                        Filho(a): <strong>{childForGlobalPrint.childName}</strong> ({childForGlobalPrint.classroom})
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase block">CÓDIGO OBRIGATÓRIO</span>
                      <div className="text-2xl font-black text-blue-700 bg-white border-2 border-blue-400 px-3 py-0.5 rounded-xl shadow-xs inline-block mt-0.5 font-mono">
                        {childForGlobalPrint.securityCode}
                      </div>
                      <div className="mt-1.5 bg-white p-1 rounded-lg border border-blue-300">
                        <BarcodeGenerator
                          value={childForGlobalPrint.securityCode.replace(/[^a-zA-Z0-9]/g, "")}
                          text={childForGlobalPrint.securityCode}
                          width={1.2}
                          height={20}
                          fontSize={9}
                          displayValue={true}
                          lineColor="#000000"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-blue-200 text-xs flex justify-between text-slate-700">
                    <span>Horário: <strong>{childForGlobalPrint.checkinTime}</strong></span>
                    <span>Status: <strong className="text-emerald-700">Criança sob cuidados do Ministério Infantil</strong></span>
                  </div>

                  <p className="text-xs text-slate-600 mt-3 pt-2 border-t border-blue-200 italic leading-relaxed">
                    * <strong>AVISO DE SEGURANÇA:</strong> Apresente este canhoto na porta do Ministério Kids ao término do culto. A criança só será liberada mediante a conferência obrigatória deste código.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Validação por código e código de barras ativo</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {childForGlobalPrint && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadImageCanhotos(childForGlobalPrint)}
                    className="rounded-xl text-xs h-9"
                    title="Baixar imagem para envio no WhatsApp dos pais"
                  >
                    <ImageIcon className="w-3.5 h-3.5 mr-1" /> Imagem WhatsApp
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadPdfCanhotos(childForGlobalPrint)}
                    className="rounded-xl text-xs h-9 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5 mr-1 text-slate-700" /> Baixar PDF
                  </Button>
                  <Button
                    onClick={() => {
                      printDocument({
                        elementId: "kids-badge-global-print-area",
                        title: `Canhotos_Kids_${childForGlobalPrint.childName.replace(/\s+/g, '_')}_${childForGlobalPrint.securityCode}`,
                        orientation: "portrait",
                      });
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs h-9 font-bold px-4"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" /> Imprimir Agora
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                onClick={() => setIsPrintModalOpen(false)}
                className="rounded-xl text-xs h-9"
              >
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
