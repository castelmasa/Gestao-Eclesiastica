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
  Upload,
  FileCheck,
  Flag,
  Undo2,
  Award,
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
  isObreiroAltarRole,
  calculateValidityText,
} from "@/lib/carteirinhaThemeHelper";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { BrasaoWatermark } from "./BrasaoWatermark";
import { removeImageBackground } from "@/lib/imageBackgroundRemover";

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
  const pastorPresidenteName = churchLeadership.pastorPresidente?.name || "Pr. Carlito Carvalho Rodrigues";
  const pastorLocalName = churchLeadership.pastorLocal?.name || pastorName;
  const pastorPresidenteSig = churchLeadership.pastorPresidente?.signatureUrl || "";
  const pastorLocalSig = churchLeadership.pastorLocal?.signatureUrl || churchLeadership.pastor?.signatureUrl || "";

  // Checagem automática e override de Obreiro do Altar
  const isAutoObreiro = isObreiroAltarRole(activeMember?.role);
  const isObreiro = cardTheme.isObreiroAltar !== undefined ? cardTheme.isObreiroAltar : isAutoObreiro;

  // Selo Superior ativo: respeita a escolha manual do usuário no dropdown; se não definida, usa o padrão correspondente
  const activeBadgeLabel = cardTheme.badgeLabel || (isObreiro ? "CREDENCIAL MINISTERIAL" : "OFICIAL");

  // Cálculo da validade oficial configurada nos parâmetros
  const validitySetting = isObreiro
    ? churchLeadership.carteirinha?.validadeObreiro || "1 Ano"
    : churchLeadership.carteirinha?.validadeMembro || "2 Anos";
  const formattedValidity = cardTheme.validadeOverride || calculateValidityText(validitySetting);

  const cardBorderWidth = cardTheme.borderWidth || 2;
  const watermarkInputRef = React.useRef<HTMLInputElement>(null);

  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        toast.info("Processando logotipo e removendo pano de fundo...");
        const cleanTransparentUrl = await removeImageBackground(dataUrl);
        handleUpdateCustomTheme({
          customWatermarkUrl: cleanTransparentUrl,
          watermarkMode: "upload",
          bgTexture: "brasao",
        });
        toast.success("Logo importada e pano de fundo removido com transparência!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRestoreParametersWatermark = async () => {
    let cleanLogo = registeredLogo;
    if (registeredLogo) {
      toast.info("Processando logo dos Parâmetros sem pano de fundo...");
      cleanLogo = await removeImageBackground(registeredLogo);
    }
    handleUpdateCustomTheme({
      watermarkMode: "parametros",
      customWatermarkUrl: cleanLogo,
      bgTexture: "brasao",
    });
    toast.success("Logo oficial dos Parâmetros vinculada sem pano de fundo!");
  };

  const handleClearWatermark = async () => {
    let cleanLogo = registeredLogo;
    if (registeredLogo) {
      cleanLogo = await removeImageBackground(registeredLogo);
    }
    handleUpdateCustomTheme({
      customWatermarkUrl: cleanLogo,
      watermarkMode: "parametros",
      bgTexture: "brasao",
    });
    toast.success("Logo oficial dos Parâmetros restaurada sem pano de fundo!");
  };

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

  // Salvar tema e atualizar estado mantendo as preferências de verso, borda e obreiro
  const handleSelectPresetTheme = (themeKey: string) => {
    const selected = PRESET_THEMES[themeKey];
    if (selected) {
      const merged: CarteirinhaThemeConfig = {
        ...selected,
        borderWidth: cardTheme.borderWidth ?? selected.borderWidth ?? 2,
        showConstituicaoVerso: cardTheme.showConstituicaoVerso !== undefined ? cardTheme.showConstituicaoVerso : true,
        isObreiroAltar: cardTheme.isObreiroAltar,
        badgeLabel: cardTheme.badgeLabel || selected.badgeLabel,
        watermarkMode: cardTheme.watermarkMode || "parametros",
        customWatermarkUrl: cardTheme.customWatermarkUrl,
        validadeOverride: cardTheme.validadeOverride,
      };
      setCardTheme(merged);
      saveCardTheme(merged);
      toast.success(`Tema "${selected.name}" aplicado com sucesso!`);
    }
  };

  const handleUpdateCustomTheme = (updates: Partial<CarteirinhaThemeConfig>) => {
    const updated: CarteirinhaThemeConfig = { ...cardTheme, ...updates, themeId: "custom" };
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

  // Renderizador dos controles de edição do crachá (Cores, Fundo, Selo, Marca d'água e Obreiros)
  const renderEditorControls = () => (
    <div className="p-4 sm:p-5 bg-muted/30 border-r border-border space-y-4 pb-36">
      <div className="flex items-center justify-between pb-1">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-primary" />
          Personalizar Cores, Fundo e Estilo do Crachá
        </h4>
        <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
          Salvo Automático
        </Badge>
      </div>

      {/* 1. Paletas Predefinidas */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">Temas & Cores Principais:</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(PRESET_THEMES).map(([key, t]) => {
            const isSelected = cardTheme.themeId === t.themeId;
            return (
              <button
                key={key}
                type="button"
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
      <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-border/50">
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground font-semibold">Cor Inicial (Degradê)</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={cardTheme.fromColor}
              onChange={(e) => handleUpdateCustomTheme({ fromColor: e.target.value })}
              className="w-7 h-7 rounded-lg cursor-pointer border border-border p-0.5 bg-background shrink-0"
            />
            <span className="text-[10px] font-mono text-muted-foreground">{cardTheme.fromColor}</span>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground font-semibold">Cor Final (Degradê)</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={cardTheme.toColor}
              onChange={(e) => handleUpdateCustomTheme({ toColor: e.target.value })}
              className="w-7 h-7 rounded-lg cursor-pointer border border-border p-0.5 bg-background shrink-0"
            />
            <span className="text-[10px] font-mono text-muted-foreground">{cardTheme.toColor}</span>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground font-semibold">Cor da Borda</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={cardTheme.borderColor}
              onChange={(e) => handleUpdateCustomTheme({ borderColor: e.target.value })}
              className="w-7 h-7 rounded-lg cursor-pointer border border-border p-0.5 bg-background shrink-0"
            />
            <span className="text-[10px] font-mono text-muted-foreground">{cardTheme.borderColor}</span>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground font-semibold">Cor dos Detalhes / Ouro</Label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={cardTheme.accentColor}
              onChange={(e) => handleUpdateCustomTheme({ accentColor: e.target.value })}
              className="w-7 h-7 rounded-lg cursor-pointer border border-border p-0.5 bg-background shrink-0"
            />
            <span className="text-[10px] font-mono text-muted-foreground">{cardTheme.accentColor}</span>
          </div>
        </div>
      </div>

      {/* 3. Textura de Fundo, Selo Superior e Formato da Foto (Organizado em 2 colunas para nunca sobrepor texto) */}
      <div className="space-y-2.5 pt-2 border-t border-border/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <Label className="text-[10px] text-muted-foreground font-semibold">Fundo / Textura</Label>
            <Select
              value={cardTheme.bgTexture}
              onValueChange={(val: any) => handleUpdateCustomTheme({ bgTexture: val })}
            >
              <SelectTrigger className="h-9 text-xs bg-background rounded-lg font-medium">
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
            <Label className="text-[10px] text-muted-foreground font-semibold">Selo Superior</Label>
            <Select
              value={cardTheme.badgeLabel}
              onValueChange={(val: string) => handleUpdateCustomTheme({ badgeLabel: val })}
            >
              <SelectTrigger className="h-9 text-xs bg-background rounded-lg font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OFICIAL" className="text-xs">OFICIAL</SelectItem>
                <SelectItem value="CREDENCIAL" className="text-xs">CREDENCIAL</SelectItem>
                <SelectItem value="MEMBRO ATIVO" className="text-xs">MEMBRO ATIVO</SelectItem>
                <SelectItem value="MINISTERIAL" className="text-xs">MINISTERIAL</SelectItem>
                <SelectItem value="CREDENCIAL MINISTERIAL" className="text-xs">CREDENCIAL MINISTERIAL</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground font-semibold">Formato da Foto</Label>
          <Select
            value={cardTheme.photoShape}
            onValueChange={(val: any) => handleUpdateCustomTheme({ photoShape: val })}
          >
            <SelectTrigger className="h-9 text-xs bg-background rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rounded" className="text-xs">Cantos Arredondados (Padrão 3x4)</SelectItem>
              <SelectItem value="circle" className="text-xs">Foto Circular (Redonda)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 4. Logo / Imagem no Fundo da Carteirinha (Marca d'Água Central) */}
      <div className="pt-2.5 border-t border-border/50 space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary" />
            Logo de Fundo (Marca d'Água Central):
          </Label>
          <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300">
            {cardTheme.watermarkMode === "upload" ? "Upload Próprio" : cardTheme.watermarkMode === "brasao" ? "Brasão Heráldico" : "Padrão Parâmetros"}
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground leading-snug">
          A marca d'água busca <strong>automaticamente</strong> a Logo dos <strong>Parâmetros</strong> sem pano de fundo, perfeitamente harmonizada com a cor da credencial.
        </p>

        {/* 3 Opções de Marca d'Água */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          {/* Opção 1: Logo dos Parâmetros (Padrão Oficial) */}
          <button
            type="button"
            onClick={async () => {
              let cleanLogo = registeredLogo;
              if (registeredLogo) {
                toast.info("Processando logo dos Parâmetros sem pano de fundo...");
                cleanLogo = await removeImageBackground(registeredLogo);
              }
              handleUpdateCustomTheme({
                watermarkMode: "parametros",
                customWatermarkUrl: cleanLogo,
                bgTexture: "brasao",
              });
              toast.success("Logo dos Parâmetros vinculada sem pano de fundo!");
            }}
            className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
              (cardTheme.watermarkMode === "parametros" || !cardTheme.watermarkMode)
                ? "border-primary ring-2 ring-primary/30 bg-primary/5 font-bold shadow-2xs"
                : "border-border/70 hover:border-primary/40 bg-background"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[10px] font-bold text-foreground flex items-center gap-1">
                <Building2 className="w-3 h-3 text-emerald-600" />
                Logo Parâmetros
              </span>
              {(cardTheme.watermarkMode === "parametros" || !cardTheme.watermarkMode) && (
                <Check className="w-3 h-3 text-primary" />
              )}
            </div>
            <p className="text-[9px] text-muted-foreground font-normal leading-snug">
              Padrão automático sem pano de fundo.
            </p>
            {registeredLogo && (
              <div className="mt-1.5 flex items-center gap-1 pt-1 border-t border-border/40">
                <img src={registeredLogo} alt="Logo" className="w-4 h-4 object-contain rounded-full bg-slate-100 p-0.5" />
                <span className="text-[8.5px] text-emerald-600 font-medium truncate">100% Transparente</span>
              </div>
            )}
          </button>

          {/* Opção 2: Brasão Heráldico */}
          <button
            type="button"
            onClick={() => {
              handleUpdateCustomTheme({ watermarkMode: "brasao", bgTexture: "brasao" });
              toast.success("Brasão heráldico de segurança aplicado!");
            }}
            className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
              cardTheme.watermarkMode === "brasao"
                ? "border-primary ring-2 ring-primary/30 bg-primary/5 font-bold shadow-2xs"
                : "border-border/70 hover:border-primary/40 bg-background"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[10px] font-bold text-foreground flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-500" />
                Brasão Heráldico
              </span>
              {cardTheme.watermarkMode === "brasao" && (
                <Check className="w-3 h-3 text-primary" />
              )}
            </div>
            <p className="text-[9px] text-muted-foreground font-normal leading-snug">
              Filigrana de segurança eclesiástica.
            </p>
            <span className="text-[8.5px] text-muted-foreground mt-1.5 pt-1 border-t border-border/40 block">
              Selo de Cruz & Bíblia
            </span>
          </button>

          {/* Opção 3: Upload de Imagem Própria */}
          <div
            className={`p-2 rounded-xl border text-left flex flex-col justify-between transition-all ${
              cardTheme.watermarkMode === "upload"
                ? "border-primary ring-2 ring-primary/30 bg-primary/5 font-bold shadow-2xs"
                : "border-border/70 hover:border-primary/40 bg-background"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-1">
              <span className="text-[10px] font-bold text-foreground flex items-center gap-1">
                <Upload className="w-3 h-3 text-blue-500" />
                Upload de Imagem
              </span>
              {cardTheme.watermarkMode === "upload" && (
                <Check className="w-3 h-3 text-primary" />
              )}
            </div>
            <p className="text-[9px] text-muted-foreground font-normal mb-1.5 leading-snug">
              Carregue uma arte personalizada.
            </p>
            <div className="flex items-center gap-1 mt-auto pt-1 border-t border-border/40">
              <input
                type="file"
                ref={watermarkInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleWatermarkUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => watermarkInputRef.current?.click()}
                className="h-6 text-[9px] font-semibold gap-1 rounded-lg w-full px-1"
              >
                <Upload className="w-2.5 h-2.5" />
                {cardTheme.customWatermarkUrl ? "Alterar" : "Carregar"}
              </Button>
            </div>
          </div>
        </div>

        {/* Harmonia Visual da Logo com a Cor da Carteirinha */}
        <div className="space-y-1.5 p-2.5 rounded-xl border border-border/60 bg-background/50">
          <Label className="text-[11px] font-bold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Harmonia de Cor da Logo de Fundo:
            </span>
            <span className="text-[10px] text-primary font-semibold">
              {cardTheme.watermarkHarmony === "white"
                ? "Filigrana Branca"
                : cardTheme.watermarkHarmony === "blend"
                ? "Tom sobre Tom"
                : cardTheme.watermarkHarmony === "original"
                ? "Original"
                : "Dourado Oficial"}
            </span>
          </Label>
          <p className="text-[9.5px] text-muted-foreground">
            Ajuste a cor da marca d'água para harmonizar perfeitamente com os tons e detalhes da credencial.
          </p>
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => handleUpdateCustomTheme({ watermarkHarmony: "accent" })}
              className={`p-1.5 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                (cardTheme.watermarkHarmony === "accent" || !cardTheme.watermarkHarmony)
                  ? "border-primary bg-primary/10 font-bold text-primary shadow-2xs"
                  : "border-border/70 hover:border-primary/40 bg-background text-muted-foreground"
              }`}
            >
              <span className="text-[10px] truncate flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                Dourado / Detalhes
              </span>
              {(cardTheme.watermarkHarmony === "accent" || !cardTheme.watermarkHarmony) && (
                <Check className="w-3 h-3 text-primary shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleUpdateCustomTheme({ watermarkHarmony: "white" })}
              className={`p-1.5 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                cardTheme.watermarkHarmony === "white"
                  ? "border-primary bg-primary/10 font-bold text-primary shadow-2xs"
                  : "border-border/70 hover:border-primary/40 bg-background text-muted-foreground"
              }`}
            >
              <span className="text-[10px] truncate flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300 inline-block shrink-0" />
                Filigrana Branca
              </span>
              {cardTheme.watermarkHarmony === "white" && (
                <Check className="w-3 h-3 text-primary shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleUpdateCustomTheme({ watermarkHarmony: "blend" })}
              className={`p-1.5 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                cardTheme.watermarkHarmony === "blend"
                  ? "border-primary bg-primary/10 font-bold text-primary shadow-2xs"
                  : "border-border/70 hover:border-primary/40 bg-background text-muted-foreground"
              }`}
            >
              <span className="text-[10px] truncate flex items-center gap-1">
                <Palette className="w-3 h-3 text-indigo-500 shrink-0" />
                Tom sobre Tom (Blend)
              </span>
              {cardTheme.watermarkHarmony === "blend" && (
                <Check className="w-3 h-3 text-primary shrink-0" />
              )}
            </button>

            <button
              type="button"
              onClick={() => handleUpdateCustomTheme({ watermarkHarmony: "original" })}
              className={`p-1.5 rounded-lg border text-left flex items-center justify-between text-xs transition-all ${
                cardTheme.watermarkHarmony === "original"
                  ? "border-primary bg-primary/10 font-bold text-primary shadow-2xs"
                  : "border-border/70 hover:border-primary/40 bg-background text-muted-foreground"
              }`}
            >
              <span className="text-[10px] truncate flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-emerald-500 shrink-0" />
                Cores Originais
              </span>
              {cardTheme.watermarkHarmony === "original" && (
                <Check className="w-3 h-3 text-primary shrink-0" />
              )}
            </button>
          </div>
        </div>

        {/* Botão para buscar / restaurar padrão dos Parâmetros */}
        {(cardTheme.watermarkMode === "upload" || cardTheme.watermarkMode === "brasao" || cardTheme.customWatermarkUrl) && (
          <div className="pt-0.5 flex items-center justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRestoreParametersWatermark}
              className="h-6 text-[10px] text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1 font-semibold"
            >
              <Building2 className="w-3 h-3" />
              Buscar Padrão dos Parâmetros
            </Button>
          </div>
        )}
      </div>

      {/* 5. Borda, Verso Constitucional (Bandeira) e Checagem Obreiro do Altar (Totalmente Visível e Espaçoso) */}
      <div className="space-y-3 pt-3 border-t border-border/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Largura da Borda */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-foreground">Largura da Borda (Contorno)</Label>
            <Select
              value={String(cardTheme.borderWidth || 2)}
              onValueChange={(val) => handleUpdateCustomTheme({ borderWidth: parseInt(val, 10) })}
            >
              <SelectTrigger className="h-9 text-xs bg-background rounded-lg font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1" className="text-xs">1px (Borda Fina)</SelectItem>
                <SelectItem value="2" className="text-xs">2px (Borda Padrão)</SelectItem>
                <SelectItem value="3" className="text-xs">3px (Borda Média)</SelectItem>
                <SelectItem value="4" className="text-xs">4px (Borda Grossa)</SelectItem>
                <SelectItem value="5" className="text-xs">5px (Borda Mais Larga)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Modelo do Verso: Constitucional com Bandeira ou Tradicional Simples */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-foreground">Modelo do Verso da Carteirinha:</Label>
            <Select
              value={cardTheme.showConstituicaoVerso !== false ? "bandeira" : "simples"}
              onValueChange={(val) => handleUpdateCustomTheme({ showConstituicaoVerso: val === "bandeira" })}
            >
              <SelectTrigger className="h-9 text-xs bg-background rounded-lg font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bandeira" className="text-xs font-semibold">
                  🇧🇷 Verso com Bandeira & CF/88 (Constitucional)
                </SelectItem>
                <SelectItem value="simples" className="text-xs font-semibold">
                  ⚪ Verso Simples (Eclesiástico Tradicional)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Obreiro do Altar */}
        <div className="space-y-1.5 p-3 rounded-xl border border-border/70 bg-background/50">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              Função Ministerial (Obreiro do Altar):
            </Label>
            {isAutoObreiro && (
              <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300">
                Auto-detectado
              </Badge>
            )}
          </div>
          <Select
            value={isObreiro ? "obreiro" : "membro"}
            onValueChange={(val) => handleUpdateCustomTheme({ isObreiroAltar: val === "obreiro" })}
          >
            <SelectTrigger className="h-9 text-xs bg-background rounded-lg font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="obreiro" className="text-xs font-bold text-amber-700 dark:text-amber-300">
                Obreiro do Altar (Pastor Presidente + Pastor Local)
              </SelectItem>
              <SelectItem value="membro" className="text-xs font-medium">
                Membro Comum (Pastor Local / Secretaria)
              </SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground leading-tight mt-1">
            {isObreiro
              ? "Exibe no verso as assinaturas oficiais do Pastor Presidente e do Pastor Local."
              : "Exibe no verso a assinatura do Pastor Titular Local da congregação."}
          </p>
        </div>
      </div>
    </div>
  );

  // Renderizador da Carteirinha em Cartão PVC (Frente ou Verso)
  const renderCardPreview = () => (
    <div
      onClick={() => setCardSide(cardSide === "front" ? "back" : "front")}
      title="Clique no cartão para girar frente/verso"
      className="relative group perspective-1000 my-auto cursor-pointer transition-transform hover:scale-[1.01] shrink-0"
    >
      {cardSide === "front" ? (
        /* FRENTE DA CARTEIRINHA COM ESTILO PERSONALIZÁVEL */
        <div
          id="carteirinha-digital-front"
          className="w-[360px] sm:w-[440px] h-[230px] sm:h-[265px] rounded-2xl text-white p-4 sm:p-5 shadow-2xl relative flex flex-col justify-between overflow-hidden select-none"
          style={{
            background: `linear-gradient(135deg, ${cardTheme.fromColor} 0%, ${cardTheme.viaColor} 50%, ${cardTheme.toColor} 100%)`,
            borderColor: cardTheme.borderColor,
            borderWidth: `${cardBorderWidth}px`,
            borderStyle: "solid",
            boxShadow: `0 20px 40px -15px ${cardTheme.fromColor}99, 0 0 20px ${cardTheme.borderColor}33`,
          }}
        >
          {/* Brasão d'Água Centralizado com Fundo Transparente ou Imagem Customizada */}
          {cardTheme.bgTexture === "brasao" && (
            <BrasaoWatermark
              color={cardTheme.accentColor || "#ffffff"}
              registeredLogo={registeredLogo}
              customWatermarkUrl={cardTheme.customWatermarkUrl}
              watermarkMode={cardTheme.watermarkMode || "parametros"}
              watermarkHarmony={cardTheme.watermarkHarmony || "accent"}
              opacity={cardTheme.watermarkMode === "upload" ? 0.22 : 0.18}
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
            className="flex items-center justify-between pb-2 z-10 border-b gap-2"
            style={{ borderColor: `${cardTheme.borderColor}40` }}
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              {cardTheme.showLogo && (
                <>
                  {registeredLogo ? (
                    <img
                      src={registeredLogo}
                      alt="Logo"
                      className="h-10 w-10 sm:h-11 sm:w-11 object-contain rounded-full bg-white/10 p-1 border shrink-0"
                      style={{ borderColor: `${cardTheme.borderColor}60` }}
                    />
                  ) : (
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-xs border shrink-0"
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
              <div className="min-w-0 flex-1">
                <h3 className="text-xs sm:text-sm font-black tracking-wide uppercase leading-tight text-white drop-shadow-xs truncate">
                  {churchLeadership.church.name}
                </h3>
                <span
                  className="text-[10px] uppercase block font-semibold truncate"
                  style={{ color: cardTheme.accentColor }}
                >
                  {branchName} • {isObreiro ? "CORPO DE OBREIROS" : "ROL DE MEMBROS"}
                </span>
              </div>
            </div>
            <Badge
              className="text-slate-950 text-[9px] font-extrabold uppercase px-2 py-0.5 shadow-xs shrink-0 whitespace-nowrap self-center"
              style={{ backgroundColor: cardTheme.accentColor }}
            >
              {activeBadgeLabel}
            </Badge>
          </div>

          {/* Centro: Foto + Dados Principais */}
          <div className="flex items-center gap-3.5 my-auto z-10 py-1">
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
                {isObreiro ? "OBREIRO DO ALTAR" : "NOME DO MEMBRO"}
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

              <div className="grid grid-cols-2 gap-1.5 pt-1 text-[9px] text-slate-300">
                <div>
                  <span className="font-semibold block" style={{ color: cardTheme.accentColor }}>
                    BATISMO:
                  </span>
                  {activeMember?.baptismDate ? new Date(activeMember.baptismDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Confirmado"}
                </div>
                <div>
                  <span className="font-semibold block" style={{ color: cardTheme.accentColor }}>
                    VALIDADE:
                  </span>
                  <span className="font-bold text-white">{formattedValidity}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé do Cartão */}
          <div
            className="flex items-center justify-between pt-1.5 text-[9px] text-slate-200 z-10 border-t"
            style={{ borderColor: `${cardTheme.borderColor}40` }}
          >
            <div>
              {cardTheme.showPastor ? (
                <>Pastor: <strong className="text-white">{pastorLocalName}</strong></>
              ) : (
                <span className="text-[9px] opacity-75">{churchLeadership.church.cidade}</span>
              )}
            </div>
            <div
              className="flex items-center gap-1 font-semibold"
              style={{ color: cardTheme.accentColor }}
            >
              <Sparkles className="w-3 h-3" /> {isObreiro ? "CREDENCIAL MINISTERIAL" : "CREDENCIAL DIGITAL"}
            </div>
          </div>
        </div>
      ) : (
        /* VERSO DA CARTEIRINHA: CONSTITUCIONAL COM BANDEIRA (ANEXO 2) OU SIMPLES */
        cardTheme.showConstituicaoVerso !== false ? (
          <div
            id="carteirinha-digital-back"
            className="w-[360px] sm:w-[440px] h-[230px] sm:h-[265px] rounded-2xl text-slate-900 p-3 sm:p-3.5 shadow-2xl relative flex flex-col justify-between overflow-hidden select-none bg-white"
            style={{
              borderColor: cardTheme.borderColor,
              borderWidth: `${cardBorderWidth}px`,
              borderStyle: "solid",
              boxShadow: `0 20px 40px -15px ${cardTheme.fromColor}99, 0 0 20px ${cardTheme.borderColor}33`,
            }}
          >
            {/* Fundo da Bandeira do Brasil vetorizada, com fade suave para fundo branco limpo */}
            <div
              className="absolute inset-0 pointer-events-none z-0"
              style={{
                backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.92) 46%, #ffffff 80%), url('/assets/bandeira_brasil.svg')`,
                backgroundPosition: "left center",
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
              }}
            />

            {/* Topo Verso Constitucional - Perfeitamente enquadrado, sem cortes e com letras nítidas */}
            <div
              className="pb-1 pt-0.5 text-center border-b z-10"
              style={{ borderColor: `${cardTheme.borderColor}45` }}
            >
              <div
                className="text-[10px] sm:text-[11.5px] font-black uppercase tracking-wider leading-tight text-emerald-950"
              >
                REPÚBLICA FEDERATIVA DO BRASIL • CONSTITUIÇÃO DE 1988
              </div>
              <p className="text-[7.5px] sm:text-[8px] text-slate-800 font-semibold leading-tight mt-0.5">
                Solicitamos às autoridades oficiais, civis e militares que dispensem ao portador todas as facilidades e auxílios no exercício de seu Ministério.
              </p>
            </div>

            {/* Meio: Leis Constitucionais Enquadradas em Frames + QR Code de Validação */}
            <div className="flex items-center justify-between gap-2.5 my-auto py-1 z-10">
              <div className="flex-1 space-y-1 text-slate-900 pr-1">
                <div className="bg-white/90 rounded-md p-1 border border-slate-200/90 shadow-2xs">
                  <span
                    className="text-[8px] sm:text-[8.5px] font-black uppercase block leading-tight text-emerald-950"
                  >
                    ENTRADAS EM HOSPITAIS E PRESÍDIOS
                  </span>
                  <p className="text-[7px] sm:text-[7.5px] text-slate-800 font-medium leading-tight">
                    <strong>Art. 5º VII-A / Lei 9.982:</strong> Assegura a prestação de assistência religiosa nas entidades civis e militares de internação coletiva.
                  </p>
                </div>

                <div className="bg-white/90 rounded-md p-1 border border-slate-200/90 shadow-2xs">
                  <span
                    className="text-[8px] sm:text-[8.5px] font-black uppercase block leading-tight text-emerald-950"
                  >
                    LIBERDADE DE CULTO
                  </span>
                  <p className="text-[7px] sm:text-[7.5px] text-slate-800 font-medium leading-tight">
                    <strong>Art. 5º VI:</strong> É inviolável a liberdade de consciência e de crença, sendo assegurado o livre exercício dos cultos religiosos.
                  </p>
                </div>

                <div className="text-[7px] sm:text-[7.5px] font-bold text-slate-700 italic px-0.5 leading-tight">
                  Esta Credencial é pessoal e intransferível. Válida com apresentação de RG/CPF.
                </div>
              </div>

              {/* QR Code de Validação */}
              <div
                className="bg-white p-1.5 rounded-xl shrink-0 shadow-sm border-2 flex flex-col items-center"
                style={{ borderColor: cardTheme.borderColor }}
              >
                <QRCodeSVG
                  value={validationUrl}
                  size={62}
                  level="M"
                  includeMargin={false}
                />
                <span
                  className="text-[6.5px] font-black uppercase mt-0.5 tracking-wider text-emerald-950"
                >
                  VALIDAR DIGITAL
                </span>
                <span className="text-[6px] text-slate-600 font-mono font-bold">
                  VAL: {formattedValidity}
                </span>
              </div>
            </div>

            {/* Faixa Oficial de Validade antes das Assinaturas */}
            <div className="flex items-center justify-center my-0.5 z-10 w-full">
              <div
                className="py-0.5 px-3 rounded-full inline-flex items-center justify-center gap-2 text-[8px] sm:text-[9px] font-bold border shadow-xs"
                style={{
                  backgroundColor: `${cardTheme.fromColor}12`,
                  borderColor: `${cardTheme.borderColor}70`,
                  color: "#0f172a",
                }}
              >
                <Calendar className="w-3 h-3 shrink-0" style={{ color: cardTheme.fromColor }} />
                <span className="font-extrabold uppercase tracking-wider text-slate-900">
                  Validade da Credencial:
                </span>
                <span
                  className="font-mono font-black px-1.5 py-0.2 rounded text-[8.5px] sm:text-[9.5px] text-white shadow-2xs"
                  style={{
                    backgroundColor: cardTheme.fromColor,
                  }}
                >
                  {formattedValidity}
                </span>
              </div>
            </div>

            {/* Assinaturas Oficiais (Pastor Presidente e Pastor Local quando Obreiro) */}
            <div
              className="pt-1 grid grid-cols-2 gap-3 text-center border-t z-10"
              style={{ borderColor: `${cardTheme.borderColor}35` }}
            >
              <div className="flex flex-col justify-end">
                {isObreiro && pastorPresidenteSig && (
                  <img
                    src={pastorPresidenteSig}
                    alt="Assinatura Pastor Presidente"
                    className="h-6 sm:h-7 object-contain mx-auto -mb-1 pointer-events-none select-none drop-shadow-xs"
                  />
                )}
                {!isObreiro && pastorLocalSig && (
                  <img
                    src={pastorLocalSig}
                    alt="Assinatura Pastor Local"
                    className="h-6 sm:h-7 object-contain mx-auto -mb-1 pointer-events-none select-none drop-shadow-xs"
                  />
                )}
                <div
                  className="border-t mx-auto w-4/5 pt-0.5 text-[8px] sm:text-[8.5px] font-bold text-slate-900 truncate"
                  style={{ borderColor: cardTheme.borderColor }}
                >
                  {isObreiro ? pastorPresidenteName : pastorLocalName}
                </div>
                <div
                  className="text-[6.5px] sm:text-[7px] font-semibold uppercase tracking-wider text-emerald-900"
                >
                  {isObreiro ? "Pastor Presidente" : "Pastor Local"}
                </div>
              </div>

              <div className="flex flex-col justify-end">
                {isObreiro && pastorLocalSig && (
                  <img
                    src={pastorLocalSig}
                    alt="Assinatura Pastor Local"
                    className="h-6 sm:h-7 object-contain mx-auto -mb-1 pointer-events-none select-none drop-shadow-xs"
                  />
                )}
                <div
                  className="border-t mx-auto w-4/5 pt-0.5 text-[8px] sm:text-[8.5px] font-bold text-slate-900 truncate"
                  style={{ borderColor: cardTheme.borderColor }}
                >
                  {isObreiro ? pastorLocalName : "Secretaria Geral"}
                </div>
                <div
                  className="text-[6.5px] sm:text-[7px] font-semibold uppercase tracking-wider text-emerald-900"
                >
                  {isObreiro ? "Pastor Local" : "Secretaria Geral"}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* VERSO SIMPLES / TRADICIONAL */
          <div
            id="carteirinha-digital-back"
            className="w-[360px] sm:w-[440px] h-[230px] sm:h-[265px] rounded-2xl text-white p-4 sm:p-5 shadow-2xl relative flex flex-col justify-between overflow-hidden select-none"
            style={{
              background: `linear-gradient(135deg, ${cardTheme.toColor} 0%, #09090b 60%, ${cardTheme.fromColor} 100%)`,
              borderColor: cardTheme.borderColor,
              borderWidth: `${cardBorderWidth}px`,
              borderStyle: "solid",
              boxShadow: `0 20px 40px -15px ${cardTheme.fromColor}99, 0 0 20px ${cardTheme.borderColor}33`,
            }}
          >
            {/* Brasão d'Água Centralizado com Fundo Transparente e Harmonia Cromática */}
            {cardTheme.bgTexture === "brasao" && (
              <BrasaoWatermark
                color={cardTheme.accentColor || "#ffffff"}
                registeredLogo={registeredLogo}
                customWatermarkUrl={cardTheme.customWatermarkUrl}
                watermarkMode={cardTheme.watermarkMode || "parametros"}
                watermarkHarmony={cardTheme.watermarkHarmony || "accent"}
                opacity={cardTheme.customWatermarkUrl ? 0.22 : 0.18}
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

            <div className="flex items-center justify-between gap-4 my-auto py-1 z-10">
              <div className="space-y-1 text-[10px] text-slate-300 flex-1">
                <p className="leading-tight">
                  Este documento certifica que o titular é {isObreiro ? "obreiro ministerial" : "membro em plena comunhão"} na <strong>{churchLeadership.church.name}</strong>.
                </p>
                <div className="pt-0.5 space-y-0.5 text-[8.5px] text-slate-300">
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
                  size={72}
                  level="M"
                  includeMargin={false}
                />
                <span className="text-[6.5px] text-slate-800 font-bold uppercase mt-0.5 tracking-wider">
                  VALIDAR DIGITAL
                </span>
              </div>
            </div>

            {/* Faixa Oficial de Validade antes das Assinaturas (Anexo 4: harmonizada, centralizada verticalmente e data próxima à legenda) */}
            <div className="flex items-center justify-center my-1 z-10 w-full">
              <div
                className="py-0.5 px-3 rounded-full inline-flex items-center justify-center gap-2 text-[8px] sm:text-[9px] font-bold border shadow-xs"
                style={{
                  backgroundColor: `${cardTheme.accentColor}18`,
                  borderColor: `${cardTheme.borderColor}60`,
                  color: cardTheme.accentColor,
                }}
              >
                <Calendar className="w-3 h-3 shrink-0" style={{ color: cardTheme.accentColor }} />
                <span className="font-extrabold uppercase tracking-wider">
                  Validade da Credencial:
                </span>
                <span
                  className="font-mono font-black px-1.5 py-0.2 rounded text-[8.5px] sm:text-[9.5px] shadow-2xs"
                  style={{
                    backgroundColor: `${cardTheme.borderColor}30`,
                    color: "#ffffff",
                  }}
                >
                  {formattedValidity}
                </span>
              </div>
            </div>

            {/* Assinaturas no Verso Tradicional */}
            <div
              className="pt-1 grid grid-cols-2 gap-3 text-center border-t z-10"
              style={{ borderColor: `${cardTheme.borderColor}35` }}
            >
              <div className="flex flex-col justify-end">
                {isObreiro && pastorPresidenteSig && (
                  <img
                    src={pastorPresidenteSig}
                    alt="Assinatura Pastor Presidente"
                    className="h-5 sm:h-6 object-contain mx-auto -mb-1 pointer-events-none select-none drop-shadow-xs invert"
                  />
                )}
                {!isObreiro && pastorLocalSig && (
                  <img
                    src={pastorLocalSig}
                    alt="Assinatura Pastor Local"
                    className="h-5 sm:h-6 object-contain mx-auto -mb-1 pointer-events-none select-none drop-shadow-xs invert"
                  />
                )}
                <div
                  className="border-t mx-auto w-4/5 pt-0.5 text-[8px] sm:text-[8.5px] font-bold text-white truncate"
                  style={{ borderColor: cardTheme.borderColor }}
                >
                  {isObreiro ? pastorPresidenteName : pastorLocalName}
                </div>
                <div
                  className="text-[6.5px] sm:text-[7px] font-semibold uppercase tracking-wider"
                  style={{ color: cardTheme.accentColor }}
                >
                  {isObreiro ? "Pastor Presidente" : "Pastor Local"}
                </div>
              </div>

              <div className="flex flex-col justify-end">
                {isObreiro && pastorLocalSig && (
                  <img
                    src={pastorLocalSig}
                    alt="Assinatura Pastor Local"
                    className="h-5 sm:h-6 object-contain mx-auto -mb-1 pointer-events-none select-none drop-shadow-xs invert"
                  />
                )}
                <div
                  className="border-t mx-auto w-4/5 pt-0.5 text-[8px] sm:text-[8.5px] font-bold text-white truncate"
                  style={{ borderColor: cardTheme.borderColor }}
                >
                  {isObreiro ? pastorLocalName : "Secretaria Geral"}
                </div>
                <div
                  className="text-[6.5px] sm:text-[7px] font-semibold uppercase tracking-wider"
                  style={{ color: cardTheme.accentColor }}
                >
                  {isObreiro ? "Pastor Local" : "Secretaria Geral"}
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );

  // Renderizador da Barra de Ações (WhatsApp, Download, Imprimir)
  const renderActionsToolbar = (maxWidthClass = "max-w-2xl") => (
    <div className={`w-full ${maxWidthClass} bg-card border border-border rounded-2xl p-3 shadow-xs space-y-3`}>
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
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`w-[98vw] max-h-[96vh] flex flex-col p-0 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden transition-all duration-300 ${isCustomizing ? "max-w-6xl" : "max-w-3xl"}`}>
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



        {/* CORPO DO MODAL: LAYOUT RESPONSIVO 2 COLUNAS QUANDO EDITOR ABERTO (EVITA CORTE DA CARTEIRINHA - ANEXOS 3 E 5) */}
        {isCustomizing ? (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto min-h-0">
            {/* Coluna Esquerda: Controles do Editor Visual com Rolagem Completa até a última opção (Anexo 5) */}
            <div className="lg:col-span-6 xl:col-span-5 overflow-y-auto custom-scrollbar flex-1 min-h-0">
              {renderEditorControls()}
            </div>

            {/* Coluna Direita: Carteirinha 100% Visível e Barra de Ações (Anexo 3) */}
            <div className="lg:col-span-6 xl:col-span-7 flex flex-col items-center justify-start p-3 sm:p-5 bg-slate-900/5 dark:bg-slate-950/40 overflow-y-auto space-y-4 border-t lg:border-t-0 min-h-0">
              <div className="w-full flex flex-col items-center my-auto py-2">
                {renderCardPreview()}

                <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-primary" />
                  Dica: Clique em cima do cartão para girar entre a Frente e o Verso com QR Code.
                </p>
              </div>

              {/* Barra de Ações adaptada à coluna */}
              {renderActionsToolbar("max-w-xl")}
            </div>
          </div>
        ) : (
          /* Modo Visualização Normal: Totalmente visível sem corte no topo (Anexo 3) */
          <div className="p-3 sm:p-5 overflow-y-auto flex-1 flex flex-col items-center justify-start bg-slate-900/5 dark:bg-slate-950/40 min-h-0">
            <div className="w-full flex flex-col items-center my-auto py-2">
              {renderCardPreview()}

              <p className="text-[11px] text-muted-foreground mt-3 mb-3 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5 text-primary" />
                Dica: Clique em cima do cartão para girar entre a Frente e o Verso com QR Code.
              </p>

              {/* Barra de Ações */}
              {renderActionsToolbar("max-w-2xl")}
            </div>
          </div>
        )}

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
                      border: `${cardBorderWidth}px solid ${cardTheme.borderColor}`,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      position: "relative",
                      overflow: "hidden",
                      boxSizing: "border-box",
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                    }}
                  >
                    {/* Brasão d'Água Centralizado e Sem Fundo com Harmonia de Cor */}
                    <BrasaoWatermark
                      color={cardTheme.accentColor || "#ffffff"}
                      registeredLogo={registeredLogo}
                      customWatermarkUrl={cardTheme.customWatermarkUrl}
                      watermarkMode={cardTheme.watermarkMode || "parametros"}
                      watermarkHarmony={cardTheme.watermarkHarmony || "accent"}
                      opacity={cardTheme.customWatermarkUrl ? 0.22 : 0.18}
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
                            {branchName} • {isObreiro ? "CORPO DE OBREIROS" : "ROL DE MEMBROS"}
                          </div>
                        </div>
                      </div>
                      <div style={{ backgroundColor: cardTheme.accentColor, color: "#020617", fontSize: "7px", fontWeight: "900", padding: "1px 6px", borderRadius: "4px", textTransform: "uppercase" }}>
                        {activeBadgeLabel}
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
                          {isObreiro ? "OBREIRO DO ALTAR" : "NOME DO MEMBRO"}
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
                          <div>Validade: <strong style={{ color: "#ffffff" }}>{formattedValidity}</strong></div>
                        </div>
                      </div>
                    </div>

                    {/* Rodapé Frente */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: `1px solid ${cardTheme.borderColor}40`, paddingTop: "3px", fontSize: "6.5px", zIndex: 1 }}>
                      <div>Pastor: <strong style={{ color: "#ffffff" }}>{pastorLocalName}</strong></div>
                      <div style={{ color: cardTheme.accentColor, fontWeight: "bold" }}>
                        {isObreiro ? "CREDENCIAL MINISTERIAL" : "CREDENCIAL DIGITAL"}
                      </div>
                    </div>
                  </div>

                  {/* LINHA PONTILHADA CENTRAL DE DOBRA */}
                  <div style={{ height: "54mm", borderRight: "1.5px dashed #cbd5e1" }} />

                  {/* VERSO DA CARTEIRINHA PARA IMPRESSÃO */}
                  {cardTheme.showConstituicaoVerso !== false ? (
                    <div
                      style={{
                        width: "86mm",
                        height: "54mm",
                        borderRadius: "10px",
                        padding: "7px 9px",
                        backgroundColor: "#ffffff",
                        backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.92) 46%, #ffffff 80%), url('/assets/bandeira_brasil.svg')`,
                        backgroundPosition: "left center",
                        backgroundSize: "contain",
                        backgroundRepeat: "no-repeat",
                        color: "#0f172a",
                        border: `${cardBorderWidth}px solid ${cardTheme.borderColor}`,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        position: "relative",
                        overflow: "hidden",
                        boxSizing: "border-box",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                    >
                      {/* Topo Verso Constitucional */}
                      <div style={{ borderBottom: `1px solid ${cardTheme.borderColor}45`, paddingBottom: "2px", textAlign: "center" }}>
                        <div style={{ fontSize: "8px", fontWeight: "900", color: "#064e3b", textTransform: "uppercase", letterSpacing: "0.2px" }}>
                          REPÚBLICA FEDERATIVA DO BRASIL • CONSTITUIÇÃO DE 1988
                        </div>
                        <div style={{ fontSize: "5.5px", color: "#1e293b", lineHeight: 1.1, fontWeight: "500" }}>
                          Solicitamos às autoridades oficiais e civis facilidades no exercício ministerial.
                        </div>
                      </div>

                      {/* Meio: Leis e QR Code */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", margin: "auto 0" }}>
                        <div style={{ flex: 1, fontSize: "5.5px", lineHeight: 1.25, color: "#0f172a" }}>
                          <div style={{ backgroundColor: "rgba(255,255,255,0.9)", padding: "2px 4px", borderRadius: "3px", border: "0.5px solid #e2e8f0", marginBottom: "2px" }}>
                            <div style={{ fontWeight: "900", color: "#064e3b", textTransform: "uppercase" }}>
                              ASSISTÊNCIA RELIGIOSA (HOSPITAIS E PRESÍDIOS)
                            </div>
                            <div style={{ color: "#334155" }}>Art. 5º VII-A / Lei 9.982: Assegura assistência religiosa em entidades coletivas.</div>
                          </div>
                          <div style={{ backgroundColor: "rgba(255,255,255,0.9)", padding: "2px 4px", borderRadius: "3px", border: "0.5px solid #e2e8f0" }}>
                            <div style={{ fontWeight: "900", color: "#064e3b", textTransform: "uppercase" }}>
                              LIBERDADE DE CULTO
                            </div>
                            <div style={{ color: "#334155" }}>Art. 5º VI: Inviolável liberdade de crença e livre exercício de cultos.</div>
                          </div>
                          <div style={{ fontSize: "5px", color: "#475569", fontStyle: "italic", marginTop: "1px" }}>
                            Esta Credencial é pessoal e intransferível. Válida com RG/CPF.
                          </div>
                        </div>

                        <div style={{ backgroundColor: "#ffffff", padding: "3px", borderRadius: "4px", border: `1px solid ${cardTheme.borderColor}`, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                          <QRCodeSVG value={validationUrl} size={38} level="M" includeMargin={false} />
                          <span style={{ fontSize: "4.5px", color: "#064e3b", fontWeight: "900", marginTop: "1px" }}>
                            VALIDAR DIGITAL
                          </span>
                        </div>
                      </div>

                      {/* Faixa Oficial de Validade antes das Assinaturas */}
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", fontSize: "6.5px", padding: "1px 8px", borderRadius: "999px", backgroundColor: `${cardTheme.fromColor}15`, border: `0.5px solid ${cardTheme.borderColor}70`, margin: "1px auto", zIndex: 1, width: "fit-content" }}>
                        <span style={{ fontWeight: "900", color: "#064e3b", textTransform: "uppercase" }}>VALIDADE DA CREDENCIAL:</span>
                        <strong style={{ color: "#ffffff", fontFamily: "monospace", backgroundColor: cardTheme.fromColor, padding: "0 5px", borderRadius: "3px" }}>{formattedValidity}</strong>
                      </div>

                      {/* Assinaturas no Verso */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", borderTop: `1px solid ${cardTheme.borderColor}40`, paddingTop: "2px", textAlign: "center" }}>
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                          {(isObreiro ? pastorPresidenteSig : pastorLocalSig) && (
                            <img
                              src={isObreiro ? pastorPresidenteSig : pastorLocalSig}
                              alt="Assinatura"
                              style={{ height: "13px", objectFit: "contain", margin: "0 auto -2px auto", display: "block" }}
                            />
                          )}
                          <div style={{ borderTop: `1px solid ${cardTheme.borderColor}`, width: "80%", margin: "0 auto", fontSize: "6.5px", fontWeight: "bold", color: "#0f172a" }}>
                            {isObreiro ? pastorPresidenteName : pastorLocalName}
                          </div>
                          <div style={{ fontSize: "5px", color: cardTheme.fromColor, fontWeight: "bold" }}>
                            {isObreiro ? "Pastor Presidente" : "Pastor Local"}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                          {isObreiro && pastorLocalSig && (
                            <img
                              src={pastorLocalSig}
                              alt="Assinatura"
                              style={{ height: "13px", objectFit: "contain", margin: "0 auto -2px auto", display: "block" }}
                            />
                          )}
                          <div style={{ borderTop: `1px solid ${cardTheme.borderColor}`, width: "80%", margin: "0 auto", fontSize: "6.5px", fontWeight: "bold", color: "#0f172a" }}>
                            {isObreiro ? pastorLocalName : "Secretaria Geral"}
                          </div>
                          <div style={{ fontSize: "5px", color: cardTheme.fromColor, fontWeight: "bold" }}>
                            {isObreiro ? "Pastor Local" : "Secretaria Geral"}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        width: "86mm",
                        height: "54mm",
                        borderRadius: "10px",
                        padding: "10px 12px",
                        background: `linear-gradient(135deg, ${cardTheme.toColor} 0%, #09090b 60%, ${cardTheme.fromColor} 100%)`,
                        color: "#ffffff",
                        border: `${cardBorderWidth}px solid ${cardTheme.borderColor}`,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        position: "relative",
                        overflow: "hidden",
                        boxSizing: "border-box",
                        boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                      }}
                    >
                      <BrasaoWatermark
                        color={cardTheme.accentColor || "#ffffff"}
                        registeredLogo={registeredLogo}
                        customWatermarkUrl={cardTheme.customWatermarkUrl}
                        watermarkMode={cardTheme.watermarkMode || "parametros"}
                        watermarkHarmony={cardTheme.watermarkHarmony || "accent"}
                        opacity={cardTheme.customWatermarkUrl ? 0.22 : 0.18}
                        size={110}
                      />

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${cardTheme.borderColor}50`, paddingBottom: "3px", zIndex: 1 }}>
                        <div style={{ fontSize: "7.5px", fontWeight: "bold", color: cardTheme.accentColor, textTransform: "uppercase" }}>
                          AUTENTICIDADE ELETRÔNICA & QR CODE
                        </div>
                        <span style={{ fontSize: "7.5px", fontFamily: "monospace", opacity: 0.8 }}>{registrationNum}</span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", margin: "auto 0", zIndex: 1 }}>
                        <div style={{ flex: 1, fontSize: "7px", lineHeight: 1.3, opacity: 0.9 }}>
                          <p style={{ margin: "0 0 4px 0" }}>
                            Certificamos que o titular é membro em comunhão na <strong>{churchLeadership.church.name}</strong>.
                          </p>
                          <div>CNPJ: {churchLeadership.church.cnpj}</div>
                          <div>Cidade: {churchLeadership.church.cidade}</div>
                        </div>

                        <div style={{ backgroundColor: "#ffffff", padding: "4px", borderRadius: "6px", display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, border: `1.5px solid ${cardTheme.accentColor}` }}>
                          <QRCodeSVG value={validationUrl} size={48} level="M" includeMargin={false} />
                          <span style={{ fontSize: "5px", color: "#0f172a", fontWeight: "bold", marginTop: "2px", textTransform: "uppercase" }}>
                            VALIDAÇÃO DIGITAL
                          </span>
                        </div>
                      </div>

                      {/* Faixa Oficial de Validade antes das Assinaturas (Anexo 4: harmonizada, centralizada verticalmente e data próxima à legenda) */}
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", fontSize: "6.5px", padding: "1.5px 8px", borderRadius: "999px", backgroundColor: `${cardTheme.accentColor}18`, border: `0.5px solid ${cardTheme.borderColor}60`, margin: "1.5px auto", zIndex: 1, width: "fit-content" }}>
                        <span style={{ fontWeight: "900", color: cardTheme.accentColor, textTransform: "uppercase" }}>VALIDADE DA CREDENCIAL:</span>
                        <strong style={{ color: "#ffffff", fontFamily: "monospace", backgroundColor: `${cardTheme.borderColor}30`, padding: "0 4px", borderRadius: "3px" }}>{formattedValidity}</strong>
                      </div>

                      {/* Assinaturas Verso Simples para Impressão */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", borderTop: `1px solid ${cardTheme.borderColor}40`, paddingTop: "2px", textAlign: "center", zIndex: 1 }}>
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                          {(isObreiro ? pastorPresidenteSig : pastorLocalSig) && (
                            <img
                              src={isObreiro ? pastorPresidenteSig : pastorLocalSig}
                              alt="Assinatura"
                              style={{ height: "13px", objectFit: "contain", margin: "0 auto -2px auto", display: "block", filter: "invert(1)" }}
                            />
                          )}
                          <div style={{ borderTop: `1px solid ${cardTheme.borderColor}`, width: "80%", margin: "0 auto", fontSize: "6.5px", fontWeight: "bold", color: "#ffffff" }}>
                            {isObreiro ? pastorPresidenteName : pastorLocalName}
                          </div>
                          <div style={{ fontSize: "5px", color: cardTheme.accentColor, fontWeight: "bold" }}>
                            {isObreiro ? "Pastor Presidente" : "Pastor Local"}
                          </div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                          {isObreiro && pastorLocalSig && (
                            <img
                              src={pastorLocalSig}
                              alt="Assinatura"
                              style={{ height: "13px", objectFit: "contain", margin: "0 auto -2px auto", display: "block", filter: "invert(1)" }}
                            />
                          )}
                          <div style={{ borderTop: `1px solid ${cardTheme.borderColor}`, width: "80%", margin: "0 auto", fontSize: "6.5px", fontWeight: "bold", color: "#ffffff" }}>
                            {isObreiro ? pastorLocalName : "Secretaria Geral"}
                          </div>
                          <div style={{ fontSize: "5px", color: cardTheme.accentColor, fontWeight: "bold" }}>
                            {isObreiro ? "Pastor Local" : "Secretaria Geral"}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
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
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  {(isObreiro ? pastorPresidenteSig : pastorLocalSig) && (
                    <img
                      src={isObreiro ? pastorPresidenteSig : pastorLocalSig}
                      alt="Assinatura"
                      style={{ height: "36px", objectFit: "contain", margin: "0 auto -4px auto", display: "block" }}
                    />
                  )}
                  <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: "6px", width: "80%", margin: "0 auto", fontWeight: "bold" }}>
                    {isObreiro ? pastorPresidenteName : pastorLocalName}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>
                    {isObreiro ? "Pastor Presidente • Convenção / Regional" : "Pastor Titular • Ministério Pastoral"}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  {(isObreiro ? pastorLocalSig : "") && (
                    <img
                      src={pastorLocalSig}
                      alt="Assinatura"
                      style={{ height: "36px", objectFit: "contain", margin: "0 auto -4px auto", display: "block" }}
                    />
                  )}
                  <div style={{ borderTop: "1.5px solid #0f172a", paddingTop: "6px", width: "80%", margin: "0 auto", fontWeight: "bold" }}>
                    {isObreiro ? pastorLocalName : "Secretaria Geral da Igreja"}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>
                    {isObreiro ? "Pastor Local • Dirigente da Congregação" : "Visto e Registro no Livro de Membros"}
                  </div>
                </div>
              </div>

              {/* Rodapé do Relatório */}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "8px", marginTop: "24px", display: "flex", justifyContent: "space-between", fontSize: "9px", color: "#94a3b8" }}>
                <span>Sistema de Gestão Eclesiástica Integrada • Desenvolvedor: Carlito Carvalho Rodrigues • Tel: (18) 99109-9608</span>
                <span>Documento Oficial Impresso</span>
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
