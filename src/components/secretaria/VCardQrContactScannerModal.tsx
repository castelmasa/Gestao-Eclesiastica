import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useBranch } from "@/contexts/BranchContext";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { executeDbOperation } from "@/lib/firebaseHelper";
import { parseVCardString, ParsedContact } from "@/lib/vcardParser";
import { 
  Camera, 
  QrCode, 
  FileText, 
  UploadCloud, 
  CheckCircle2, 
  UserPlus, 
  RefreshCw, 
  AlertCircle, 
  Building2, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  FileUp, 
  Sparkles,
  StopCircle,
  ExternalLink
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";

interface VCardQrContactScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullForm?: (contact: Partial<ParsedContact> & { branchId: string }) => void;
  onMemberAdded?: () => void;
}

export function VCardQrContactScannerModal({
  isOpen,
  onClose,
  onOpenFullForm,
  onMemberAdded
}: VCardQrContactScannerModalProps) {
  const { activeBranch, branches, activeBranchName } = useBranch();

  const [activeTab, setActiveTab] = useState<"camera" | "vcard" | "qrimage" | "paste">("camera");
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [selectedContactIndex, setSelectedContactIndex] = useState(0);

  // Form State for editing the contact before saving
  const [formContact, setFormContact] = useState<ParsedContact>({
    name: "",
    phone: "",
    email: "",
    birthDate: "",
    address: "",
    bairro: "",
    cidade: "",
    cep: "",
    role: "Membro",
    notes: ""
  });
  const [selectedBranchId, setSelectedBranchId] = useState<string>("sede");
  const [memberStatus, setMemberStatus] = useState<string>("Ativo");
  const [isSaving, setIsSaving] = useState(false);

  // Camera State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const readerElementId = "qr-code-interactive-scanner";

  // Pasted text state
  const [pastedText, setPastedText] = useState("");

  // Sync default branch
  useEffect(() => {
    if (activeBranch && activeBranch !== "all") {
      setSelectedBranchId(activeBranch);
    } else if (branches.length > 0) {
      const sede = branches.find(b => b.type === "sede");
      setSelectedBranchId(sede ? sede.id : branches[0].id);
    }
  }, [activeBranch, branches, isOpen]);

  // When a parsed contact is selected or loaded, update the formContact
  useEffect(() => {
    if (parsedContacts.length > 0 && parsedContacts[selectedContactIndex]) {
      const c = parsedContacts[selectedContactIndex];
      setFormContact({
        name: c.name || "",
        phone: c.phone || "",
        email: c.email || "",
        birthDate: c.birthDate || "",
        address: c.address || "",
        bairro: c.bairro || "",
        cidade: c.cidade || "",
        cep: c.cep || "",
        role: c.role || "Membro",
        notes: c.notes || ""
      });
    }
  }, [parsedContacts, selectedContactIndex]);

  // Handle Camera scanning
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(readerElementId);
      }

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 }
        },
        (decodedText) => {
          handleDecodedText(decodedText);
          stopCamera();
        },
        () => {
          // ignore scan frame errors
        }
      );
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn("Camera start error:", err);
      setCameraError(
        err?.message?.includes("NotAllowedError")
          ? "Acesso à câmera bloqueado. Por favor, permita o uso da câmera nas permissões do navegador ou utilize a aba 'Arquivo VCard' ou 'Imagem de QR Code'."
          : "Não foi possível acessar a câmera do dispositivo. Tente enviar uma foto do QR Code ou arquivo de contato."
      );
      setIsCameraActive(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current && isCameraActive) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.warn("Camera stop error:", err);
      } finally {
        setIsCameraActive(false);
      }
    }
  };

  // Start/Stop camera depending on modal visibility and active tab
  useEffect(() => {
    if (isOpen && activeTab === "camera" && parsedContacts.length === 0) {
      const timer = setTimeout(() => {
        startCamera();
      }, 300);
      return () => {
        clearTimeout(timer);
        stopCamera();
      };
    } else {
      stopCamera();
    }
  }, [isOpen, activeTab, parsedContacts.length]);

  // Clean on modal unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleDecodedText = (text: string) => {
    const contacts = parseVCardString(text);
    if (contacts.length > 0) {
      setParsedContacts(contacts);
      setSelectedContactIndex(0);
      toast.success(
        contacts.length === 1 
          ? `Contato identificado: ${contacts[0].name || "Novo Contato"}`
          : `${contacts.length} contatos encontrados!`
      );
    } else {
      // Try treating text as name / phone lines
      const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length > 0) {
        const fallbackContact: ParsedContact = {
          name: lines[0] || "",
          phone: lines[1] || "",
          email: lines.find(l => l.includes("@")) || "",
          role: "Membro"
        };
        setParsedContacts([fallbackContact]);
        setSelectedContactIndex(0);
        toast.info("Dados de contato lidos do QR Code.");
      } else {
        toast.error("O código lido não contém formato vCard ou dados válidos de contato.");
      }
    }
  };

  // Handle File Input (.vcf or .vcard)
  const handleVCardFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        handleDecodedText(text);
      }
    };
    reader.onerror = () => {
      toast.error("Erro ao ler o arquivo de contato.");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Handle QR Code Image upload
  const handleQrImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode("qr-code-file-decoder");
      const decodedText = await html5QrCode.scanFile(file, true);
      handleDecodedText(decodedText);
    } catch (err) {
      console.warn("QR file scan error:", err);
      toast.error("Não foi possível identificar um QR Code nítido nesta imagem. Tente uma foto mais aproximada.");
    }
    e.target.value = "";
  };

  // Handle text paste
  const handleProcessPastedText = () => {
    if (!pastedText.trim()) {
      toast.warning("Cole o texto do vCard ou dados do contato.");
      return;
    }
    handleDecodedText(pastedText);
  };

  const handleReset = () => {
    setParsedContacts([]);
    setSelectedContactIndex(0);
    setPastedText("");
    if (activeTab === "camera") {
      setTimeout(() => startCamera(), 200);
    }
  };

  // Save directly to Firestore
  const handleSaveToFirestore = async () => {
    if (!formContact.name.trim()) {
      toast.error("O nome do membro é obrigatório.");
      return;
    }

    setIsSaving(true);
    const branchObj = branches.find(b => b.id === selectedBranchId);
    const finalBranchName = branchObj ? branchObj.name : activeBranchName;

    const memberPayload = {
      name: formContact.name.trim(),
      phone: formContact.phone || "",
      email: formContact.email || "",
      birthDate: formContact.birthDate || "",
      address: formContact.address || "",
      bairro: formContact.bairro || "",
      cidade: formContact.cidade || "",
      cep: formContact.cep || "",
      role: formContact.role || "Membro",
      status: memberStatus,
      branchId: selectedBranchId,
      congregation: finalBranchName,
      membroDesde: new Date().toLocaleDateString("pt-BR"),
      createdAt: serverTimestamp(),
      scannedDocs: []
    };

    const res = await executeDbOperation({
      operation: async () => addDoc(collection(db, "members"), memberPayload),
      actionName: "Cadastro Rápido via QR/vCard",
      successMessage: `Membro ${memberPayload.name} cadastrado com sucesso!`,
      userName: "Secretaria"
    });

    setIsSaving(false);

    if (res.success) {
      // Disparar evento de membro adicionado
      window.dispatchEvent(new CustomEvent("app:member-added", { detail: memberPayload }));
      if (onMemberAdded) onMemberAdded();
      
      // Se houver mais contatos na lista, avançar para o próximo
      if (parsedContacts.length > 1 && selectedContactIndex < parsedContacts.length - 1) {
        setSelectedContactIndex(prev => prev + 1);
        toast.info(`Pronto para cadastrar o próximo contato (${selectedContactIndex + 2} de ${parsedContacts.length})`);
      } else {
        handleReset();
        onClose();
      }
    }
  };

  // Transfer to full member form
  const handleTransferToFullForm = () => {
    if (onOpenFullForm) {
      onOpenFullForm({
        ...formContact,
        branchId: selectedBranchId
      });
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        stopCamera();
        handleReset();
        onClose();
      }
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 rounded-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <QrCode className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-foreground">
                Leitor de Contatos (QR Code & VCard)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Cadastre membros rapidamente escaneando cartões digitais, crachás ou importando arquivos de contato (.vcf).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* If no contact parsed yet, show tabs for reading */}
        {parsedContacts.length === 0 ? (
          <div className="space-y-4 my-2">
            <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="camera" className="text-xs flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Câmera QR</span>
                  <span className="sm:hidden">Câmera</span>
                </TabsTrigger>
                <TabsTrigger value="vcard" className="text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Arquivo VCard</span>
                  <span className="sm:hidden">.VCF</span>
                </TabsTrigger>
                <TabsTrigger value="qrimage" className="text-xs flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Foto QR</span>
                  <span className="sm:hidden">Foto</span>
                </TabsTrigger>
                <TabsTrigger value="paste" className="text-xs flex items-center gap-1.5">
                  <FileUp className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Colar Texto</span>
                  <span className="sm:hidden">Texto</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Live Camera */}
              <TabsContent value="camera" className="space-y-3 pt-3">
                <div className="relative border-2 border-dashed border-border/80 rounded-2xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center min-h-[300px] text-white">
                  <div id={readerElementId} className="w-full max-w-[360px] aspect-square rounded-xl overflow-hidden" />
                  
                  {cameraError && (
                    <div className="absolute inset-0 bg-background/95 p-6 flex flex-col items-center justify-center text-center">
                      <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
                      <p className="text-sm font-semibold text-foreground mb-1">Câmera Indisponível</p>
                      <p className="text-xs text-muted-foreground max-w-sm mb-4">{cameraError}</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={startCamera}>
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Tentar Novamente
                        </Button>
                        <Button size="sm" onClick={() => setActiveTab("vcard")}>
                          <FileText className="w-3.5 h-3.5 mr-1.5" /> Usar Arquivo .VCF
                        </Button>
                      </div>
                    </div>
                  )}

                  {!isCameraActive && !cameraError && (
                    <div className="p-6 text-center">
                      <Camera className="w-12 h-12 text-slate-400 mx-auto mb-3 animate-pulse" />
                      <p className="text-sm font-medium text-slate-300">Iniciando leitor de QR Code...</p>
                      <Button size="sm" variant="outline" onClick={startCamera} className="mt-3 text-slate-900 bg-white hover:bg-slate-100">
                        Ativar Câmera
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Aponte para o QR Code de contato (vCard / WhatsApp / Crachá)</span>
                  {isCameraActive && (
                    <Button size="sm" variant="ghost" onClick={stopCamera} className="text-red-500 hover:text-red-600 h-7 text-xs">
                      <StopCircle className="w-3.5 h-3.5 mr-1" /> Parar Câmera
                    </Button>
                  )}
                </div>
              </TabsContent>

              {/* Tab 2: VCard File */}
              <TabsContent value="vcard" className="space-y-4 pt-3">
                <div className="border-2 border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-2xl p-8 text-center bg-muted/20">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">Importar Arquivo .VCF / .VCARD</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Arraste ou selecione um arquivo de contatos exportado do Google Contatos, iPhone, Outlook ou WhatsApp.
                  </p>

                  <div className="mt-4">
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center justify-center rounded-xl font-medium text-xs h-9 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs">
                        <UploadCloud className="w-4 h-4 mr-1.5" /> Escolher Arquivo .VCF
                      </span>
                      <input 
                        type="file" 
                        accept=".vcf,.vcard,text/vcard,text/x-vcard" 
                        className="hidden" 
                        onChange={handleVCardFileUpload}
                      />
                    </label>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 3: QR Image */}
              <TabsContent value="qrimage" className="space-y-4 pt-3">
                <div id="qr-code-file-decoder" className="hidden" />
                <div className="border-2 border-dashed border-border/80 hover:border-primary/50 transition-colors rounded-2xl p-8 text-center bg-muted/20">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <h4 className="font-semibold text-sm text-foreground">Decodificar Imagem de QR Code</h4>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    Envie um print, captura de tela ou foto que contenha o QR Code do cartão do membro.
                  </p>

                  <div className="mt-4">
                    <label className="cursor-pointer">
                      <span className="inline-flex items-center justify-center rounded-xl font-medium text-xs h-9 px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors shadow-xs">
                        <UploadCloud className="w-4 h-4 mr-1.5" /> Selecionar Imagem (PNG, JPG)
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={handleQrImageUpload}
                      />
                    </label>
                  </div>
                </div>
              </TabsContent>

              {/* Tab 4: Paste text */}
              <TabsContent value="paste" className="space-y-3 pt-3">
                <div className="space-y-2">
                  <Label htmlFor="paste-area" className="text-xs">
                    Cole o código vCard ou dados do contato abaixo:
                  </Label>
                  <textarea
                    id="paste-area"
                    rows={6}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="BEGIN:VCARD&#10;VERSION:3.0&#10;FN:João da Silva&#10;TEL:11999999999&#10;EMAIL:joao@email.com&#10;END:VCARD"
                    className="w-full rounded-xl border border-input bg-background/50 px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <Button onClick={handleProcessPastedText} size="sm" className="w-full">
                  <Sparkles className="w-4 h-4 mr-1.5" /> Processar Texto de Contato
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          /* Preview and confirmation form */
          <div className="space-y-4 my-2">
            {/* Multiple contacts badge if more than 1 */}
            {parsedContacts.length > 1 && (
              <div className="flex items-center justify-between p-3 bg-primary/10 border border-primary/20 rounded-xl">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="font-semibold text-xs">
                    Contato {selectedContactIndex + 1} de {parsedContacts.length}
                  </Badge>
                  <span className="text-xs font-medium text-foreground">
                    Múltiplos contatos encontrados no arquivo
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={selectedContactIndex === 0}
                    onClick={() => setSelectedContactIndex(prev => prev - 1)}
                    className="h-7 text-xs"
                  >
                    Anterior
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={selectedContactIndex === parsedContacts.length - 1}
                    onClick={() => setSelectedContactIndex(prev => prev + 1)}
                    className="h-7 text-xs"
                  >
                    Próximo
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="text-xs font-semibold">Contato lido e pronto para cadastro</span>
              </div>
              <Button size="sm" variant="ghost" onClick={handleReset} className="h-7 text-xs text-muted-foreground hover:text-foreground">
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Ler Outro
              </Button>
            </div>

            {/* Editable Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold">Nome Completo *</Label>
                <Input 
                  value={formContact.name} 
                  onChange={(e) => setFormContact({ ...formContact, name: e.target.value })}
                  placeholder="Nome do membro"
                  className="font-medium"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-primary" /> Congregação / Unidade *
                </Label>
                <Select value={selectedBranchId} onValueChange={setSelectedBranchId}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="Selecione a igreja" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">
                        {b.name} {b.type === "sede" ? "(Sede)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Cargo / Ministério</Label>
                <Select 
                  value={formContact.role || "Membro"} 
                  onValueChange={(val) => setFormContact({ ...formContact, role: val })}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Membro">Membro</SelectItem>
                    <SelectItem value="Cooperador">Cooperador</SelectItem>
                    <SelectItem value="Diácono">Diácono</SelectItem>
                    <SelectItem value="Diaconisa">Diaconisa</SelectItem>
                    <SelectItem value="Presbítero">Presbítero</SelectItem>
                    <SelectItem value="Evangelista">Evangelista</SelectItem>
                    <SelectItem value="Pastor">Pastor</SelectItem>
                    <SelectItem value="Líder de Ministério">Líder de Ministério</SelectItem>
                    <SelectItem value="Músico">Músico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Telefone / WhatsApp
                </Label>
                <Input 
                  value={formContact.phone} 
                  onChange={(e) => setFormContact({ ...formContact, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" /> E-mail
                </Label>
                <Input 
                  type="email"
                  value={formContact.email} 
                  onChange={(e) => setFormContact({ ...formContact, email: e.target.value })}
                  placeholder="exemplo@igreja.com"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Data de Nascimento
                </Label>
                <Input 
                  value={formContact.birthDate || ""} 
                  onChange={(e) => setFormContact({ ...formContact, birthDate: e.target.value })}
                  placeholder="DD/MM/AAAA"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Status de Membresia</Label>
                <Select value={memberStatus} onValueChange={setMemberStatus}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Em Observação">Em Observação</SelectItem>
                    <SelectItem value="Congregado">Congregado</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Endereço Residencial
                </Label>
                <Input 
                  value={formContact.address || ""} 
                  onChange={(e) => setFormContact({ ...formContact, address: e.target.value })}
                  placeholder="Rua, número, complemento"
                />
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border/80">
              <Button 
                variant="outline" 
                onClick={handleTransferToFullForm}
                className="w-full sm:w-auto text-xs"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir no Cadastro Completo
              </Button>

              <Button 
                onClick={handleSaveToFirestore} 
                disabled={isSaving || !formContact.name.trim()}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <UserPlus className="w-4 h-4 mr-1.5" /> 
                {isSaving ? "Cadastrando..." : "Confirmar e Cadastrar Membro"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
