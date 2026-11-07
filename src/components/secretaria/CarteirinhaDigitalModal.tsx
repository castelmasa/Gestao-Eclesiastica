import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  IdCard,
  QrCode,
  Download,
  Share2,
  Printer,
  Copy,
  ExternalLink,
  Building2,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  User,
  RotateCw,
  Phone,
  ImageIcon,
  Palette,
  Sliders,
  Check,
  Smartphone,
  Globe,
  Layers,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { downloadElementAsPdf, downloadElementAsImage, openElementInNewTabForPrint } from "@/lib/printUtils";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";
import { getChurchLeadershipConfig } from "@/lib/churchConfigHelper";
import {
  CarteirinhaThemeConfig,
  PRESET_THEMES,
  DEFAULT_CARD_THEME,
  getSavedCardTheme,
  saveCardTheme,
} from "@/lib/carteirinhaThemeHelper";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BrasaoWatermark } from "./BrasaoWatermark";

export interface MemberCardData {
  id: string;
  name: string;
  role?: string;
  photoUrl?: string;
  phone?: string;
  email?: string;
  cpf?: string;
  rg?: string;
  birthDate?: string;
  baptismDate?: string;
  admissionDate?: string;
  maritalStatus?: string;
  branchId?: string;
  status?: string;
  registrationNumber?: string;
}

export interface CarteirinhaDigitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberCardData | null;
  allMembers?: any[];
  onSelectMember?: (m: any) => void;
  branchName?: string;
}

export function CarteirinhaDigitalModal({
  isOpen,
  onClose,
  member,
  allMembers,
  onSelectMember,
  branchName = "Sede Geral",
}: CarteirinhaDigitalModalProps) {
  const [cardSide, setCardSide] = useState<"front" | "back">("front");
  const [isExporting, setIsExporting] = useState(false);
  const [internalMember, setInternalMember] = useState<MemberCardData | null>(member);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [cardTheme, setCardTheme] = useState<CarteirinhaThemeConfig>(getSavedCardTheme);

  useEffect(() => {
    if (member) {
      setInternalMember(member);
    } else if (allMembers && allMembers.length > 0) {
      setInternalMember(allMembers[0]);
    }
  }, [member, allMembers]);

  const activeMember = internalMember || member || (allMembers && allMembers[0]) || null;

  // Garante que os dados do membro ativo estejam gravados no Firestore e localStorage
  useEffect(() => {
    if (activeMember && activeMember.id) {
      try {
        const docRef = doc(db, "members", activeMember.id);
        setDoc(
          docRef,
          {
            ...activeMember,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        ).catch(console.warn);

        // Atualiza também no localStorage para abertura instantânea e offline
        try {
          const saved = localStorage.getItem("churchMembers");
          const list = saved ? JSON.parse(saved) : [];
          const idx = list.findIndex((m: any) => m.id === activeMember.id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...activeMember };
          } else {
            list.unshift(activeMember);
          }
          localStorage.setItem("churchMembers", JSON.stringify(list));
        } catch {}
      } catch (err) {
        console.warn("Auto-sync member error:", err);
      }
    }
  }, [activeMember]);

  const churchLeadership = useMemo(() => {
    return getChurchLeadershipConfig(activeMember?.branchId || "all");
  }, [activeMember?.branchId]);

  const registeredLogo = useMemo(() => {
    return getRegisteredChurchLogo(activeMember?.branchId || "all");
  }, [activeMember?.branchId]);

  const registrationNum =
    activeMember?.registrationNumber ||
    (activeMember ? `MB-${activeMember.id.slice(0, 6).toUpperCase()}` : "MB-000000");

  // URL pública de validação da carteirinha via QR Code
  const validationUrl = activeMember
    ? `${window.location.origin}/validar-cracha?tipo=membro&id=${activeMember.id}&nome=${encodeURIComponent(activeMember.name)}&cargo=${encodeURIComponent(activeMember.role || "Membro")}&igreja=${encodeURIComponent(churchLeadership.church.name)}`
    : window.location.origin;

  // Link móvel seguro, leve e sem risco de erro 414 Request-URI Too Large (NÃO inclui base64 da foto na URL)
  const mobileCardUrl = activeMember
    ? `${window.location.origin}/carteirinha?id=${activeMember.id}&n=${encodeURIComponent(activeMember.name)}&r=${encodeURIComponent(activeMember.role || "Membro")}&c=${encodeURIComponent(activeMember.cpf || "")}&p=${encodeURIComponent(activeMember.phone || "")}&b=${encodeURIComponent(activeMember.baptismDate || "")}&a=${encodeURIComponent(activeMember.admissionDate || "")}&ig=${encodeURIComponent(churchLeadership.church.name || branchName)}`
    : `${window.location.origin}/carteirinha`;

  const pastorName = churchLeadership.pastor.name || "Carlito Carvalho Rodrigues";

  const getCleanPhone = () => {
    const raw = (activeMember?.phone || "").replace(/\D/g, "");
    if (!raw) return "";
    return raw.startsWith("55") ? raw : `55${raw}`;
  };

  const getWhatsAppMessageText = () => {
    return `Olá, a Paz do Senhor ${activeMember?.name || "Irmão(ã)"}! 🙏\n\nAqui está o link da sua *Carteirinha Oficial Digital de Membro* da *${churchLeadership.church.name}*:\n\n👉 ${mobileCardUrl}\n\nVocê pode abrir este link no seu celular e salvá-lo na tela inicial como um aplicativo para identificação em congressos, convenções e assembleias gerais da igreja. Deus abençoe!`;
  };

  // Helper robusto para cópia de texto na área de transferência com fallback
  const copyTextToClipboard = async (text: string, successMessage: string) => {
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      // fallback abaixo
    }

    if (!copied) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.width = "2em";
        textArea.style.height = "2em";
        textArea.style.padding = "0";
        textArea.style.border = "none";
        textArea.style.outline = "none";
        textArea.style.boxShadow = "none";
        textArea.style.background = "transparent";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        copied = document.execCommand("copy");
        document.body.removeChild(textArea);
      } catch (err) {
        console.warn("Clipboard fallback error:", err);
      }
    }

    if (copied) {
      toast.success(successMessage);
    } else {
      window.prompt("Copie o link abaixo (Ctrl+C):", text);
    }
  };

  // Enviar diretamente no WhatsApp Web (no computador desktop, pula a tela intermediária)
  const handleSendWhatsAppWeb = () => {
    if (!activeMember) return;
    const phone = getCleanPhone();
    const text = encodeURIComponent(getWhatsAppMessageText());
    const url = phone
      ? `https://web.whatsapp.com/send?phone=${phone}&text=${text}`
      : `https://web.whatsapp.com/send?text=${text}`;
    window.open(url, "_blank");
    toast.success("Abrindo WhatsApp Web diretamente...");
  };

  // Enviar via link wa.me (indicado para celular ou caso prefira o app de desktop)
  const handleSendWhatsAppMobile = () => {
    if (!activeMember) return;
    const phone = getCleanPhone();
    const text = encodeURIComponent(getWhatsAppMessageText());
    const url = phone
      ? `https://wa.me/${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, "_blank");
  };

  // Copiar mensagem completa já formatada com o link
  const handleCopyMessage = () => {
    copyTextToClipboard(getWhatsAppMessageText(), "Mensagem completa copiada! Basta colar na conversa do WhatsApp.");
  };

  // Copiar apenas o link da carteirinha
  const handleCopyLink = () => {
    copyTextToClipboard(mobileCardUrl, "Link da Carteirinha Digital copiado com sucesso!");
  };

  // Abrir no celular / testar em nova aba
  const handleOpenMobilePreview = () => {
    window.open(mobileCardUrl, "_blank");
  };

  // Salvar tema e atualizar estado
  const handleSelectPresetTheme = (themeKey: string) => {
    const selected = PRESET_THEMES[themeKey];
    if (selected) {
      setCardTheme(selected);
      saveCardTheme(selected);
      toast.success(`Tema "${selected.name}" aplicado com sucesso!`);
    }
  };

  const handleUpdateCustomTheme = (updates: Partial<CarteirinhaThemeConfig>) => {
    const updated = { ...cardTheme, ...updates, themeId: "custom" };
    setCardTheme(updated);
    saveCardTheme(updated);
  };

  // Baixar Imagem PNG da carteirinha
  const handleDownloadImage = async () => {
    if (!activeMember) return;
    setIsExporting(true);
    const targetId = cardSide === "front" ? "carteirinha-digital-front" : "carteirinha-digital-back";
    const filename = `Carteirinha_${activeMember.name.replace(/\s+/g, "_")}_${cardSide}.png`;
    try {
      await downloadElementAsImage(targetId, filename);
    } finally {
      setIsExporting(false);
    }
  };

  // Baixar PDF da carteirinha
  const handleDownloadPdf = async () => {
    if (!activeMember) return;
    setIsExporting(true);
    const targetId = "carteirinha-digital-printable-container";
    const filename = `Carteirinha_Membro_${activeMember.name.replace(/\s+/g, "_")}.pdf`;
    try {
      await downloadElementAsPdf(targetId, filename);
    } finally {
      setIsExporting(false);
    }
  };

  // Imprimir
  const handlePrint = () => {
    if (!activeMember) return;
    const targetId = "carteirinha-digital-printable-container";
    const filename = `Carteirinha_${activeMember.name}`;
    try {
      openElementInNewTabForPrint(targetId, filename);
    } catch {
      downloadElementAsPdf(targetId, `${filename}.pdf`);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-3xl max-h-[95vh] flex flex-col p-0 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="!m-0 p-4 sm:p-5 pb-3 border-b border-border bg-muted/20 sticky top-0 bg-background z-10 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <IdCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Carteirinha Oficial Digital do Membro</span>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-0.5">
                Cartão digital para celular com validação em tempo real por QR Code para convenções e cultos.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-600 text-white text-xs font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Membro Ativo
              </Badge>
            </div>
          </div>

          {allMembers && allMembers.length > 0 && (
            <div className="flex items-center gap-2 pt-2.5 pb-1">
              <Label className="text-xs text-muted-foreground font-semibold shrink-0">Membro:</Label>
              <Select
                value={activeMember?.id || ""}
                onValueChange={(val) => {
                  const found = allMembers.find((m) => m.id === val);
                  if (found) {
                    setInternalMember(found);
                    onSelectMember?.(found);
                  }
                }}
              >
                <SelectTrigger className="h-8 text-xs bg-background rounded-xl font-medium w-full max-w-sm">
                  <SelectValue placeholder="Escolha um membro..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {allMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      {m.name} ({m.role || "Membro"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Botão para abrir o Editor de Design */}
              <Button
                variant={isCustomizing ? "secondary" : "outline"}
                size="sm"
                onClick={() => setIsCustomizing(!isCustomizing)}
                className="h-8 text-xs font-semibold gap-1.5 ml-auto rounded-xl"
              >
                <Palette className="w-3.5 h-3.5 text-primary" />
                <span>{isCustomizing ? "Ocultar Editor" : "🎨 Cores & Design"}</span>
                {isCustomizing ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </Button>
            </div>
          )}

          {/* Abas Frente / Verso */}
          <div className="flex items-center justify-between pt-2.5 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={cardSide === "front" ? "default" : "outline"}
                onClick={() => setCardSide("front")}
                className="text-xs rounded-xl font-semibold h-8"
              >
                Frente do Cartão
              </Button>
              <Button
                size="sm"
                variant={cardSide === "back" ? "default" : "outline"}
                onClick={() => setCardSide("back")}
                className="text-xs rounded-xl font-semibold h-8"
              >
                Verso (QR Code & Validação)
              </Button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setCardSide(cardSide === "front" ? "back" : "front")}
              className="text-xs h-8 text-primary font-semibold"
            >
              <RotateCw className="w-3.5 h-3.5 mr-1" />
              Girar Cartão
            </Button>
          </div>
        </DialogHeader>

        {/* PAINEL EXPANSÍVEL: EDITOR VISUAL DO CRACHÁ (CORES, FUNDO E MELHORIAS - ANEXO 3) */}
        {isCustomizing && (
          <div className="p-4 sm:p-5 bg-muted/40 border-b border-border space-y-4 max-h-72 overflow-y-auto animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-primary" />
                Personalizar Cores, Fundo e Estilo do Crachá
              </h4>
              <Badge variant="outline" className="text-[10px]">
                Salvo Automaticamente
              </Badge>
            </div>

            {/* 1. Paletas Predefinidas */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Temas & Cores Principais:</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {Object.entries(PRESET_THEMES).map(([key, t]) => {
                  const isSelected = cardTheme.themeId === t.themeId;
                  return (
                    <button
                      key={key}
                      onClick={() => handleSelectPresetTheme(key)}
                      className={`flex flex-col items-start p-2 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/40 bg-background shadow-xs font-bold"
                          : "border-border/70 hover:border-primary/50 bg-background/60"
                      }`}
                    >
                      <div
                        className="w-full h-5 rounded-md mb-1.5 shadow-2xs border border-white/20 flex items-center justify-end px-1"
                        style={{
                          background: `linear-gradient(135deg, ${t.fromColor}, ${t.toColor})`,
                        }}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white drop-shadow-sm" />}
                      </div>
                      <span className="text-[10px] truncate w-full">{t.name.split(" ")[0]}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Cores Personalizadas (Color Pickers) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/50">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-semibold">Cor Inicial (Degradê)</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cardTheme.fromColor}
                    onChange={(e) => handleUpdateCustomTheme({ fromColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-border p-0.5 bg-background"
                  />
                  <span className="text-[11px] font-mono text-muted-foreground">{cardTheme.fromColor}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-semibold">Cor Final (Degradê)</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cardTheme.toColor}
                    onChange={(e) => handleUpdateCustomTheme({ toColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-border p-0.5 bg-background"
                  />
                  <span className="text-[11px] font-mono text-muted-foreground">{cardTheme.toColor}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-semibold">Cor da Borda / Contorno</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cardTheme.borderColor}
                    onChange={(e) => handleUpdateCustomTheme({ borderColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-border p-0.5 bg-background"
                  />
                  <span className="text-[11px] font-mono text-muted-foreground">{cardTheme.borderColor}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-semibold">Cor dos Detalhes / Ouro</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={cardTheme.accentColor}
                    onChange={(e) => handleUpdateCustomTheme({ accentColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-border p-0.5 bg-background"
                  />
                  <span className="text-[11px] font-mono text-muted-foreground">{cardTheme.accentColor}</span>
                </div>
              </div>
            </div>

            {/* 3. Textura de Fundo, Formato da Foto e Rótulo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/50">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-semibold">Fundo / Textura</Label>
                <Select
                  value={cardTheme.bgTexture}
                  onValueChange={(val: any) => handleUpdateCustomTheme({ bgTexture: val })}
                >
                  <SelectTrigger className="h-8 text-xs bg-background rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brasao" className="text-xs">Brasão d'Água Oficial</SelectItem>
                    <SelectItem value="ondas" className="text-xs">Ondas & Curvas Modernas</SelectItem>
                    <SelectItem value="geometria" className="text-xs">Malha Geométrica / Grid</SelectItem>
                    <SelectItem value="liso" className="text-xs">Fundo Liso Fosco</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-semibold">Formato da Foto</Label>
                <Select
                  value={cardTheme.photoShape}
                  onValueChange={(val: any) => handleUpdateCustomTheme({ photoShape: val })}
                >
                  <SelectTrigger className="h-8 text-xs bg-background rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rounded" className="text-xs">Cantos Arredondados (Padrão 3x4)</SelectItem>
                    <SelectItem value="circle" className="text-xs">Circular Clássica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground font-semibold">Selo Superior</Label>
                <Select
                  value={cardTheme.badgeLabel}
                  onValueChange={(val: string) => handleUpdateCustomTheme({ badgeLabel: val })}
                >
                  <SelectTrigger className="h-8 text-xs bg-background rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="OFICIAL" className="text-xs">OFICIAL</SelectItem>
                    <SelectItem value="CREDENCIAL" className="text-xs">CREDENCIAL</SelectItem>
                    <SelectItem value="MEMBRO ATIVO" className="text-xs">MEMBRO ATIVO</SelectItem>
                    <SelectItem value="MINISTERIAL" className="text-xs">MINISTERIAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Corpo: Visualizador da Carteirinha */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-900/5 dark:bg-slate-950/40">
          {/* CONTAINER DA CARTEIRINHA (DIMENSÕES PROPORCIONAIS DE CARTÃO PVC: 85.6mm x 54mm) */}
          <div
            onClick={() => setCardSide(cardSide === "front" ? "back" : "front")}
            title="Clique no cartão para girar frente/verso"
            className="relative group perspective-1000 my-2 cursor-pointer transition-transform hover:scale-[1.01]"
          >
            {cardSide === "front" ? (
              /* FRENTE DA CARTEIRINHA COM ESTILO PERSONALIZÁVEL */
              <div
                id="carteirinha-digital-front"
                className="w-[360px] sm:w-[440px] h-[230px] sm:h-[265px] rounded-2xl text-white p-4 sm:p-5 shadow-2xl relative flex flex-col justify-between overflow-hidden select-none border-2"
                style={{
                  background: `linear-gradient(135deg, ${cardTheme.fromColor} 0%, ${cardTheme.viaColor} 50%, ${cardTheme.toColor} 100%)`,
                  borderColor: cardTheme.borderColor,
                  boxShadow: `0 20px 40px -15px ${cardTheme.fromColor}99, 0 0 20px ${cardTheme.borderColor}33`,
                }}
              >
                {/* Brasão d'Água Oficial Centralizado e com Fundo Transparente */}
                {cardTheme.bgTexture === "brasao" && (
                  <BrasaoWatermark
                    color={cardTheme.accentColor || "#ffffff"}
                    registeredLogo={registeredLogo}
                    opacity={0.16}
                    size={155}
                  />
                )}

                {cardTheme.bgTexture === "ondas" && (
                  <div className="absolute inset-0 opacity-15 pointer-events-none overflow-hidden">
                    <svg viewBox="0 0 500 300" className="w-full h-full preserve-3d" fill="none">
                      <path d="M-50,150 C100,50 250,250 400,100 C500,0 550,200 600,150 L600,350 L-50,350 Z" fill="white" fillOpacity="0.2" />
                      <path d="M-50,200 C150,100 200,300 450,150 L600,350 L-50,350 Z" fill={cardTheme.accentColor} fillOpacity="0.15" />
                    </svg>
                  </div>
                )}

                {cardTheme.bgTexture === "geometria" && (
                  <div
                    className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{
                      backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                      backgroundSize: "20px 20px",
                    }}
                  />
                )}

                {/* Topo: Logo + Nome da Igreja */}
                <div
                  className="flex items-center justify-between pb-2.5 z-10 border-b"
                  style={{ borderColor: `${cardTheme.borderColor}40` }}
                >
                  <div className="flex items-center gap-2.5">
                    {cardTheme.showLogo && (
                      <>
                        {registeredLogo ? (
                          <img
                            src={registeredLogo}
                            alt="Logo"
                            className="h-10 w-10 sm:h-11 sm:w-11 object-contain rounded-full bg-white/10 p-1 border"
                            style={{ borderColor: `${cardTheme.borderColor}60` }}
                          />
                        ) : (
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs border"
                            style={{
                              backgroundColor: `${cardTheme.accentColor}25`,
                              borderColor: cardTheme.accentColor,
                              color: cardTheme.accentColor,
                            }}
                          >
                            IEPC
                          </div>
                        )}
                      </>
                    )}
                    <div>
                      <h3 className="text-xs sm:text-sm font-black tracking-wide uppercase leading-tight text-white drop-shadow-xs">
                        {churchLeadership.church.name}
                      </h3>
                      <span
                        className="text-[10px] uppercase block font-semibold"
                        style={{ color: cardTheme.accentColor }}
                      >
                        {branchName} • ROL DE MEMBROS
                      </span>
                    </div>
                  </div>
                  <Badge
                    className="text-slate-950 text-[9px] font-extrabold uppercase px-2 py-0.5 shadow-xs"
                    style={{ backgroundColor: cardTheme.accentColor }}
                  >
                    {cardTheme.badgeLabel}
                  </Badge>
                </div>

                {/* Centro: Foto + Dados Principais */}
                <div className="flex items-center gap-4 my-auto z-10 py-1">
                  {/* Foto do Membro */}
                  <div className="relative shrink-0">
                    <div
                      className={`overflow-hidden border-2 bg-slate-950/60 shadow-md flex items-center justify-center ${
                        cardTheme.photoShape === "circle"
                          ? "w-20 h-20 sm:w-22 sm:h-22 rounded-full"
                          : "w-18 h-22 sm:w-20 sm:h-26 rounded-xl"
                      }`}
                      style={{ borderColor: cardTheme.borderColor }}
                    >
                      {activeMember?.photoUrl ? (
                        <img
                          src={activeMember.photoUrl}
                          alt={activeMember.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-10 h-10 opacity-60 text-white" />
                      )}
                    </div>
                    <div
                      className="absolute -bottom-1 -right-1 text-white rounded-full p-0.5 shadow-xs"
                      style={{ backgroundColor: cardTheme.borderColor }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  </div>

                  {/* Informações */}
                  <div className="space-y-1 flex-1 overflow-hidden">
                    <div
                      className="text-[10px] uppercase font-bold tracking-widest"
                      style={{ color: cardTheme.accentColor }}
                    >
                      NOME DO MEMBRO
                    </div>
                    <div className="text-sm sm:text-base font-extrabold text-white truncate leading-tight">
                      {activeMember?.name || "Membro Não Selecionado"}
                    </div>

                    <div className="pt-0.5 flex items-center gap-2 flex-wrap">
                      <span
                        className="inline-block px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold uppercase border"
                        style={{
                          backgroundColor: cardTheme.tagBg,
                          color: cardTheme.tagText,
                          borderColor: `${cardTheme.borderColor}60`,
                        }}
                      >
                        {activeMember?.role || "Membro Eclesiástico"}
                      </span>
                      <span className="text-[10px] text-slate-300 font-mono">
                        {registrationNum}
                      </span>
                    </div>

                    {cardTheme.showDates && (
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[9px] text-slate-300">
                        <div>
                          <span className="font-semibold block" style={{ color: cardTheme.accentColor }}>
                            BATISMO:
                          </span>
                          {activeMember?.baptismDate ? new Date(activeMember.baptismDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Confirmado"}
                        </div>
                        <div>
                          <span className="font-semibold block" style={{ color: cardTheme.accentColor }}>
                            ADMISSÃO:
                          </span>
                          {activeMember?.admissionDate ? new Date(activeMember.admissionDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Registrado"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Rodapé do Cartão */}
                <div
                  className="flex items-center justify-between pt-2 text-[9px] text-slate-200 z-10 border-t"
                  style={{ borderColor: `${cardTheme.borderColor}40` }}
                >
                  <div>
                    {cardTheme.showPastor ? (
                      <>Pastor Titular: <strong className="text-white">{pastorName}</strong></>
                    ) : (
                      <span className="text-[9px] opacity-75">{churchLeadership.church.cidade}</span>
                    )}
                  </div>
                  <div
                    className="flex items-center gap-1 font-semibold"
                    style={{ color: cardTheme.accentColor }}
                  >
                    <Sparkles className="w-3 h-3" /> CREDENCIAL DIGITAL
                  </div>
                </div>
              </div>
            ) : (
              /* VERSO DA CARTEIRINHA COM QR CODE DE VALIDAÇÃO */
              <div
                id="carteirinha-digital-back"
                className="w-[360px] sm:w-[440px] h-[230px] sm:h-[265px] rounded-2xl text-white p-4 sm:p-5 shadow-2xl relative flex flex-col justify-between overflow-hidden select-none border-2"
                style={{
                  background: `linear-gradient(135deg, ${cardTheme.toColor} 0%, #09090b 60%, ${cardTheme.fromColor} 100%)`,
                  borderColor: cardTheme.borderColor,
                  boxShadow: `0 20px 40px -15px ${cardTheme.fromColor}99, 0 0 20px ${cardTheme.borderColor}33`,
                }}
              >
                {/* Brasão d'Água Oficial Centralizado e com Fundo Transparente no Verso */}
                {cardTheme.bgTexture === "brasao" && (
                  <BrasaoWatermark
                    color={cardTheme.accentColor || "#ffffff"}
                    registeredLogo={registeredLogo}
                    opacity={0.16}
                    size={145}
                  />
                )}

                <div
                  className="pb-2 flex items-center justify-between border-b z-10"
                  style={{ borderColor: `${cardTheme.borderColor}40` }}
                >
                  <div
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: cardTheme.accentColor }}
                  >
                    VALIDAÇÃO ELETRÔNICA & AUTENTICIDADE
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{registrationNum}</span>
                </div>

                <div className="flex items-center justify-between gap-4 my-auto py-2 z-10">
                  <div className="space-y-1.5 text-[10px] text-slate-300 flex-1">
                    <p className="leading-relaxed">
                      Este documento certifica que o titular é membro em plena comunhão eclesiástica na <strong>{churchLeadership.church.name}</strong>.
                    </p>
                    <div className="pt-1 space-y-0.5 text-[9px]">
                      <div>CNPJ: {churchLeadership.church.cnpj}</div>
                      <div>Cidade: {churchLeadership.church.cidade}</div>
                      {activeMember?.cpf && <div>CPF: {activeMember.cpf}</div>}
                    </div>
                  </div>

                  {/* QR Code de Validação Oficial */}
                  <div
                    className="bg-white p-2 rounded-xl shrink-0 shadow-lg border-2 flex flex-col items-center"
                    style={{ borderColor: cardTheme.accentColor }}
                  >
                    <QRCodeSVG
                      value={validationUrl}
                      size={86}
                      level="M"
                      includeMargin={false}
                    />
                    <span className="text-[7px] text-slate-800 font-bold uppercase mt-1 tracking-wider">
                      ESCANEAR P/ VALIDAR
                    </span>
                  </div>
                </div>

                <div
                  className="pt-2 flex items-center justify-between text-[8px] text-slate-400 border-t z-10"
                  style={{ borderColor: `${cardTheme.borderColor}40` }}
                >
                  <span>Válida em todo o território nacional para fins eclesiásticos.</span>
                  <span className="font-semibold" style={{ color: cardTheme.accentColor }}>
                    STATUS: ATIVO
                  </span>
                </div>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1.5">
            <RotateCw className="w-3.5 h-3.5 text-primary" />
            Dica: Clique em cima do cartão para girar entre a Frente e o Verso com QR Code.
          </p>

          {/* RECIPIENTE DE IMPRESSÃO OFICIAL (FRENTE E VERSO LADO A LADO PARA A4 COM CORTE E ASSINATURA) */}
          <div style={{ position: "absolute", left: "-99999px", top: "-99999px", opacity: 0, pointerEvents: "none" }}>
            <div
              id="carteirinha-digital-printable-container"
              style={{
                width: "210mm",
                minHeight: "297mm",
                padding: "16mm 18mm",
                margin: "0 auto",
                backgroundColor: "#ffffff",
                color: "#0f172a",
                fontFamily: "Arial, 'Segoe UI', sans-serif",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              {/* Cabeçalho Institucional Oficial */}
              <div style={{ borderBottom: "2px solid #0f172a", paddingBottom: "12px", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    {registeredLogo && (
                      <img
                        src={registeredLogo}
                        alt="Logo"
                        style={{ width: "50px", height: "50px", objectFit: "contain" }}
                      />
                    )}
                    <div>
                      <h1 style={{ margin: 0, fontSize: "16px", fontWeight: "900", textTransform: "uppercase", color: "#0f172a" }}>
                        {churchLeadership.church.name}
                      </h1>
                      <div style={{ fontSize: "11px", color: "#475569", marginTop: "2px" }}>
                        CNPJ: {churchLeadership.church.cnpj} • {churchLeadership.church.cidade} • {branchName}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "12px", fontWeight: "bold", textTransform: "uppercase", color: "#059669" }}>
                      CREDENCIAL ECLESIÁSTICA OFICIAL
                    </div>
                    <div style={{ fontSize: "10px", color: "#64748b" }}>
                      Emissão: {new Date().toLocaleDateString("pt-BR")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações do Titular */}
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", marginBottom: "18px", fontSize: "11px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "10px" }}>
                  <div><strong>Membro:</strong> {activeMember?.name}</div>
                  <div><strong>Cargo:</strong> {activeMember?.role || "Membro"}</div>
                  <div><strong>Registro:</strong> {registrationNum}</div>
                </div>
              </div>

              {/* Área das Carteirinhas (Frente e Verso lado a lado com linhas de corte) */}
              <div style={{ border: "2px dashed #94a3b8", borderRadius: "12px", padding: "20px 16px", backgroundColor: "#fcfdfe", position: "relative" }}>
                <div style={{ position: "absolute", top: "-10px", left: "20px", backgroundColor: "#ffffff", padding: "0 8px", fontSize: "10px", fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>
                  ✂️ Linha de Corte e Dobra • Padrão Crachá (86 × 54 mm)
                </div>

                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "24px", flexWrap: "nowrap" }}>
                  {/* FRENTE DA CARTEIRINHA PARA IMPRESSÃO */}
                  <div
                    style={{
                      width: "86mm",
                      height: "54mm",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      background: `linear-gradient(135deg, ${cardTheme.fromColor} 0%, ${cardTheme.viaColor} 50%, ${cardTheme.toColor} 100%)`,
                      color: "#ffffff",
                      border: `2px solid ${cardTheme.borderColor}`,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      position: "relative",
                      overflow: "hidden",
                      boxSizing: "border-box",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    }}
                  >
                    {/* Brasão d'Água Centralizado e Sem Fundo */}
                    <BrasaoWatermark
                      color={cardTheme.accentColor || "#ffffff"}
                      registeredLogo={registeredLogo}
                      opacity={0.18}
                      size={110}
                    />

                    {/* Topo Frente */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${cardTheme.borderColor}50`, paddingBottom: "4px", zIndex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {registeredLogo && (
                          <img src={registeredLogo} alt="Logo" style={{ width: "24px", height: "24px", objectFit: "contain", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.15)", padding: "1px" }} />
                        )}
                        <div>
                          <div style={{ fontSize: "9px", fontWeight: "900", textTransform: "uppercase", lineHeight: 1.1 }}>
                            {churchLeadership.church.name}
                          </div>
                          <div style={{ fontSize: "7px", color: cardTheme.accentColor, fontWeight: "bold", textTransform: "uppercase" }}>
                            {branchName} • ROL DE MEMBROS
                          </div>
                        </div>
                      </div>
                      <div style={{ backgroundColor: cardTheme.accentColor, color: "#020617", fontSize: "7px", fontWeight: "900", padding: "1px 6px", borderRadius: "4px", textTransform: "uppercase" }}>
                        {cardTheme.badgeLabel}
                      </div>
                    </div>

                    {/* Meio Frente */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "auto 0", zIndex: 1 }}>
                      <div style={{ width: "42px", height: "52px", borderRadius: "6px", border: `1.5px solid ${cardTheme.borderColor}`, overflow: "hidden", backgroundColor: "#020617", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {activeMember?.photoUrl ? (
                          <img src={activeMember.photoUrl} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ color: "#ffffff", opacity: 0.6, fontSize: "18px" }}>👤</div>
                        )}
                      </div>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ fontSize: "7px", fontWeight: "bold", color: cardTheme.accentColor, textTransform: "uppercase" }}>
                          NOME DO MEMBRO
                        </div>
                        <div style={{ fontSize: "11px", fontWeight: "900", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>
                          {activeMember?.name}
                        </div>
                        <div style={{ marginTop: "3px", display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ backgroundColor: cardTheme.tagBg, color: cardTheme.tagText, padding: "1px 4px", borderRadius: "3px", fontSize: "7px", fontWeight: "bold", textTransform: "uppercase" }}>
                            {activeMember?.role || "Membro"}
                          </span>
                          <span style={{ fontSize: "7px", fontFamily: "monospace", opacity: 0.8 }}>
                            {registrationNum}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "8px", marginTop: "3px", fontSize: "6.5px", opacity: 0.85 }}>
                          <div>Batismo: {activeMember?.baptismDate ? new Date(activeMember.baptismDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Confirmado"}</div>
                          <div>Admissão: {activeMember?.admissionDate ? new Date(activeMember.admissionDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Registrado"}</div>
                        </div>
                      </div>
                    </div>

                    {/* Rodapé Frente */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${cardTheme.borderColor}40`, paddingTop: "3px", fontSize: "6.5px", zIndex: 1 }}>
                      <div>Pastor Titular: <strong style={{ color: "#ffffff" }}>{pastorName}</strong></div>
                      <div style={{ color: cardTheme.accentColor, fontWeight: "bold" }}>CREDENCIAL DIGITAL</div>
                    </div>
                  </div>

                  {/* LINHA PONTILHADA CENTRAL DE DOBRA */}
                  <div style={{ height: "54mm", borderRight: "1.5px dashed #cbd5e1" }} />

                  {/* VERSO DA CARTEIRINHA PARA IMPRESSÃO */}
                  <div
                    style={{
                      width: "86mm",
                      height: "54mm",
                      borderRadius: "10px",
                      padding: "10px 12px",
                      background: `linear-gradient(135deg, ${cardTheme.toColor} 0%, #09090b 60%, ${cardTheme.fromColor} 100%)`,
                      color: "#ffffff",
                      border: `2px solid ${cardTheme.borderColor}`,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      position: "relative",
                      overflow: "hidden",
                      boxSizing: "border-box",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    }}
                  >
                    {/* Brasão d'Água Centralizado e Sem Fundo no Verso */}
                    <BrasaoWatermark
                      color={cardTheme.accentColor || "#ffffff"}
                      registeredLogo={registeredLogo}
                      opacity={0.18}
                      size={110}
                    />

                    {/* Topo Verso */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${cardTheme.borderColor}50`, paddingBottom: "3px", zIndex: 1 }}>
                      <div style={{ fontSize: "7.5px", fontWeight: "bold", color: cardTheme.accentColor, textTransform: "uppercase" }}>
                        AUTENTICIDADE ELETRÔNICA & QR CODE
                      </div>
                      <span style={{ fontSize: "7.5px", fontFamily: "monospace", opacity: 0.8 }}>{registrationNum}</span>
                    </div>

                    {/* Meio Verso */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", margin: "auto 0", zIndex: 1 }}>
                      <div style={{ flex: 1, fontSize: "7px", lineHeight: 1.3, opacity: 0.9 }}>
                        <p style={{ margin: "0 0 4px 0" }}>
                          Certificamos que o titular é membro em comunhão na <strong>{churchLeadership.church.name}</strong>.
                        </p>
                        <div>CNPJ: {churchLeadership.church.cnpj}</div>
                        <div>Cidade: {churchLeadership.church.cidade}</div>
                        {activeMember?.cpf && <div>CPF: {activeMember.cpf}</div>}
                      </div>

                      <div style={{ backgroundColor: "#ffffff", padding: "4px", borderRadius: "6px", display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, border: `1.5px solid ${cardTheme.accentColor}` }}>
                        <QRCodeSVG value={validationUrl} size={48} level="M" includeMargin={false} />
                        <span style={{ fontSize: "5px", color: "#0f172a", fontWeight: "bold", marginTop: "2px", textTransform: "uppercase" }}>
                          VALIDAÇÃO DIGITAL
                        </span>
                      </div>
                    </div>

                    {/* Rodapé Verso */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${cardTheme.borderColor}40`, paddingTop: "3px", fontSize: "6.5px", zIndex: 1 }}>
                      <span style={{ opacity: 0.8 }}>Válida em território nacional</span>
                      <span style={{ color: cardTheme.accentColor, fontWeight: "bold" }}>STATUS: ATIVO</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Instruções de Plastificação / Acabamento */}
              <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "10px 14px", fontSize: "10.5px", color: "#1e3a8a", marginTop: "16px" }}>
                <strong>📌 Instruções de Montagem:</strong>
                <ol style={{ margin: "4px 0 0 16px", padding: 0 }}>
                  <li>Recorte no contorno externo pontilhado com tesoura ou estilete.</li>
                  <li>Dobre exatamente ao meio na linha pontilhada vertical para emparelhar Frente e Verso.</li>
                  <li>Insira em polaseal para plastificação a quente ou utilize porta-crachá rígido padrão (86 × 54 mm).</li>
                </ol>
              </div>

              {/* Campo Oficial de Assinatura Pastoral e Secretaria */}
              <div style={{ marginTop: "32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", textAlign: "center", fontSize: "11px" }}>
                <div>
                  <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: "6px", width: "80%", margin: "0 auto", fontWeight: "bold" }}>
                    {pastorName}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>Pastor Titular • Ministério Pastoral</div>
                </div>

                <div>
                  <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: "6px", width: "80%", margin: "0 auto", fontWeight: "bold" }}>
                    Secretaria Geral da Igreja
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>Visto e Registro no Livro de Membros</div>
                </div>
              </div>

              {/* Rodapé do Relatório */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "24px", display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94a3b8" }}>
                <span>Sistema de Gestão Eclesiástica Integrada • Desenvolvedor: Carlito Carvalho Rodrigues • Tel: (18) 99109-9608</span>
                <span>Documento Oficial Impresso</span>
              </div>
            </div>
          </div>

          {/* BARRA DE AÇÕES: WHATSAPP WEB, WHATSAPP CELULAR, COPIAR LINK E EXPORTAÇÃO */}
          <div className="mt-5 w-full max-w-2xl bg-card border border-border rounded-2xl p-3 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border/50">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Share2 className="w-4 h-4 text-emerald-600" />
                Disparo no WhatsApp & Acesso no Celular do Membro:
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenMobilePreview}
                className="h-7 text-xs font-semibold gap-1 text-primary hover:text-primary"
                title="Abrir página do celular em nova aba"
              >
                <Smartphone className="w-3.5 h-3.5" />
                Visualizar no Celular
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* 1. WhatsApp Web Direto (PC/Desktop) */}
              <Button
                onClick={handleSendWhatsAppWeb}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 shadow-xs rounded-xl flex items-center justify-center gap-1.5"
                title="Abre diretamente a conversa no WhatsApp Web do seu navegador sem telas intermediárias"
              >
                <Globe className="w-3.5 h-3.5" />
                WhatsApp Web (PC)
              </Button>

              {/* 2. WhatsApp Mobile (wa.me) */}
              <Button
                variant="outline"
                onClick={handleSendWhatsAppMobile}
                className="text-xs h-9 font-semibold rounded-xl border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 flex items-center justify-center gap-1.5"
                title="Abre o aplicativo do WhatsApp no celular ou tablet"
              >
                <Smartphone className="w-3.5 h-3.5" />
                WhatsApp (wa.me)
              </Button>

              {/* 3. Copiar Mensagem Completa */}
              <Button
                variant="outline"
                onClick={handleCopyMessage}
                className="text-xs h-9 font-semibold rounded-xl bg-background flex items-center justify-center gap-1.5"
                title="Copia o texto completo e o link para colar em qualquer aplicativo ou chat"
              >
                <Copy className="w-3.5 h-3.5 text-primary" />
                Copiar Mensagem
              </Button>
            </div>

            {/* Segunda linha de ações: Links e Exportação */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyLink}
                className="h-8 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Copy className="w-3.5 h-3.5 mr-1" />
                Copiar Somente Link
              </Button>

              <div className="flex items-center gap-1.5 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadImage}
                  disabled={isExporting}
                  className="h-8 text-xs font-semibold rounded-xl"
                >
                  <ImageIcon className="w-3.5 h-3.5 mr-1 text-primary" />
                  Imagem PNG
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={isExporting}
                  className="h-8 text-xs font-semibold rounded-xl"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  PDF
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrint}
                  className="h-8 text-xs font-semibold rounded-xl"
                >
                  <Printer className="w-3.5 h-3.5 mr-1 text-slate-600" />
                  Imprimir
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="p-3 sm:p-4 border-t border-border bg-muted/20 flex flex-row items-center justify-between">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            O membro pode adicionar este link direto à tela inicial do celular como um aplicativo.
          </span>
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
