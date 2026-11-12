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
  Ruler,
  Plus,
  Minus,
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
  CARD_DIMENSION_PRESETS,
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
  dataBatismo?: string;
  dataBatismoAguas?: string;
  admissionDate?: string;
  maritalStatus?: string;
  branchId?: string;
  status?: string;
  registrationNumber?: string;
}

export const formatBaptismDate = (raw?: string): string => {
  if (!raw || raw === "Sim" || raw === "Confirmado") return "20/10/2000";
  const trimmed = String(raw).trim();
  if (!trimmed) return "20/10/2000";
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parts = trimmed.split("T")[0].split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  }
  return trimmed;
};

export interface CarteirinhaDigitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: MemberCardData | null;
  allMembers?: any[];
  onSelectMember?: (m: any) => void;
  branchName?: string;
  onOpenTraditionalCards?: () => void;
}

export function CarteirinhaDigitalModal({
  isOpen,
  onClose,
  member,
  allMembers,
  onSelectMember,
  branchName = "Sede Geral",
  onOpenTraditionalCards,
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

  const memberBaptismDate = formatBaptismDate(activeMember?.dataBatismo || activeMember?.baptismDate || activeMember?.dataBatismoAguas);

  const pastorName = churchLeadership.pastor.name || "Carlito Carvalho Rodrigues";
  const pastorPresidenteName = churchLeadership.pastorPresidente?.name || "Pr. Carlito Carvalho Rodrigues";
  const pastorLocalName = churchLeadership.pastorLocal?.name || pastorName;
  const pastorPresidenteSig = churchLeadership.pastorPresidente?.signatureUrl || "";
  const pastorLocalSig = churchLeadership.pastorLocal?.signatureUrl || churchLeadership.pastor?.signatureUrl || "";
  const pastorPresidenteCodigo = cardTheme.pastorPresidenteCodigoOverride !== undefined
    ? cardTheme.pastorPresidenteCodigoOverride
    : (churchLeadership.pastorPresidente?.codigoCredencial || "");
  const pastorLocalCodigo = cardTheme.pastorLocalCodigoOverride !== undefined
    ? cardTheme.pastorLocalCodigoOverride
    : (churchLeadership.pastorLocal?.codigoCredencial || "");

  // Link móvel seguro, leve e sem risco de erro 414 Request-URI Too Large (NÃO inclui base64 da foto na URL)
  const mobileCardUrl = activeMember
    ? `${window.location.origin}/carteirinha?id=${activeMember.id}&n=${encodeURIComponent(activeMember.name)}&r=${encodeURIComponent(activeMember.role || "Membro")}&c=${encodeURIComponent(activeMember.cpf || "")}&p=${encodeURIComponent(activeMember.phone || "")}&b=${encodeURIComponent(memberBaptismDate)}&a=${encodeURIComponent(activeMember.admissionDate || "")}&ig=${encodeURIComponent(churchLeadership.church.name || branchName)}&ppc=${encodeURIComponent(pastorPresidenteCodigo)}&plc=${encodeURIComponent(pastorLocalCodigo)}`
    : `${window.location.origin}/carteirinha`;

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
  const cardWidthMm = cardTheme.cardWidthMm || 86;
  const cardHeightMm = cardTheme.cardHeightMm || 54;
  const cardSizePreset = cardTheme.cardSizePreset || "86x54";
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

  // Salvar tema e atualizar estado mantendo as preferências de dimensões, verso, borda e obreiro
  const handleSelectPresetTheme = (themeKey: string) => {
    const selected = PRESET_THEMES[themeKey];
    if (selected) {
      const merged: CarteirinhaThemeConfig = {
        ...selected,
        borderWidth: cardTheme.borderWidth ?? selected.borderWidth ?? 2,
        cardWidthMm: cardTheme.cardWidthMm ?? 86,
        cardHeightMm: cardTheme.cardHeightMm ?? 54,
        cardSizePreset: cardTheme.cardSizePreset ?? "86x54",
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

  // Ajustar dimensões do crachá via predefinições (ex: 86x54, 90x60, 100x70)
  const handleSelectDimensionPreset = (presetId: string) => {
    const found = CARD_DIMENSION_PRESETS.find((p) => p.id === presetId);
    if (found && presetId !== "custom") {
      handleUpdateCustomTheme({
        cardWidthMm: found.widthMm,
        cardHeightMm: found.heightMm,
        cardSizePreset: found.id,
      });
      toast.success(`Tamanho ajustado para ${found.name}`);
    } else {
      handleUpdateCustomTheme({
        cardSizePreset: "custom",
      });
    }
  };

  // Alterar largura ou altura manualmente em milímetros
  const handleChangeDimension = (type: "width" | "height", deltaOrValue: number, isDelta: boolean = false) => {
    let nextVal = isDelta
      ? (type === "width" ? cardWidthMm : cardHeightMm) + deltaOrValue
      : deltaOrValue;

    if (type === "width") {
      nextVal = Math.max(50, Math.min(150, Math.round(nextVal)));
      handleUpdateCustomTheme({
        cardWidthMm: nextVal,
        cardSizePreset: "custom",
      });
    } else {
      nextVal = Math.max(40, Math.min(120, Math.round(nextVal)));
      handleUpdateCustomTheme({
        cardHeightMm: nextVal,
        cardSizePreset: "custom",
      });
    }
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

      {/* 5. Tamanho do Crachá (Largura e Altura em Milímetros - Válido para Frente e Verso) */}
      <div className="space-y-2 pt-3 border-t border-border/50">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <Ruler className="w-3.5 h-3.5 text-primary" />
            Tamanho do Crachá (Largura × Altura):
          </Label>
          <Badge variant="outline" className="text-[9px] text-emerald-600 border-emerald-300 font-semibold">
            Válido Frente e Verso
          </Badge>
        </div>
        <p className="text-[10px] text-muted-foreground leading-snug">
          Defina as dimensões físicas em milímetros. Ajusta a proporção na tela e o tamanho exato de corte na impressão A4.
        </p>

        {/* Seletor de Padrões Pré-definidos */}
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground font-semibold">Modelos Padrões de Mercado:</Label>
          <Select
            value={cardSizePreset}
            onValueChange={handleSelectDimensionPreset}
          >
            <SelectTrigger className="h-9 text-xs bg-background rounded-lg font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CARD_DIMENSION_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id} className="text-xs">
                  {preset.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Inputs Manuais de Largura e Altura com Controles Numéricos (+ e -) */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Largura (Horizontal) em mm */}
          <div className="p-2.5 rounded-xl border border-border/70 bg-background/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold text-foreground">Largura (Horizontal):</Label>
              <span className="text-[11px] font-mono font-extrabold text-primary">{cardWidthMm} mm</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleChangeDimension("width", -1, true)}
                className="h-7 w-7 rounded-lg shrink-0"
                title="Diminuir largura (dimensão horizontal)"
              >
                <Minus className="w-3 h-3" />
              </Button>
              <input
                type="number"
                min="50"
                max="150"
                value={cardWidthMm}
                onChange={(e) => handleChangeDimension("width", parseInt(e.target.value, 10) || 86)}
                className="h-7 w-full text-center text-xs font-mono font-bold bg-background border border-border rounded-lg"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleChangeDimension("width", 1, true)}
                className="h-7 w-7 rounded-lg shrink-0"
                title="Aumentar largura (dimensão horizontal)"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex justify-between text-[8.5px] text-muted-foreground px-0.5">
              <span>Mín: 50mm</span>
              <span>Máx: 150mm</span>
            </div>
          </div>

          {/* Altura (Vertical) em mm */}
          <div className="p-2.5 rounded-xl border border-border/70 bg-background/60 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] font-bold text-foreground">Altura (Vertical):</Label>
              <span className="text-[11px] font-mono font-extrabold text-primary">{cardHeightMm} mm</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleChangeDimension("height", -1, true)}
                className="h-7 w-7 rounded-lg shrink-0"
                title="Diminuir altura (dimensão vertical)"
              >
                <Minus className="w-3 h-3" />
              </Button>
              <input
                type="number"
                min="40"
                max="120"
                value={cardHeightMm}
                onChange={(e) => handleChangeDimension("height", parseInt(e.target.value, 10) || 54)}
                className="h-7 w-full text-center text-xs font-mono font-bold bg-background border border-border rounded-lg"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleChangeDimension("height", 1, true)}
                className="h-7 w-7 rounded-lg shrink-0"
                title="Aumentar altura (dimensão vertical)"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex justify-between text-[8.5px] text-muted-foreground px-0.5">
              <span>Mín: 40mm</span>
              <span>Máx: 120mm</span>
            </div>
          </div>
        </div>

        {/* Resumo da Proporção & Botão de Restauração */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[9.5px] text-muted-foreground font-mono">
            Proporção: <strong>{(cardWidthMm / cardHeightMm).toFixed(2)}:1</strong> (Área: {cardWidthMm} × {cardHeightMm} mm)
          </span>
          {(cardWidthMm !== 86 || cardHeightMm !== 54) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleSelectDimensionPreset("86x54")}
              className="h-6 text-[9.5px] text-primary hover:text-primary gap-1 font-semibold"
            >
              <Undo2 className="w-3 h-3" />
              Restaurar 86 × 54 mm
            </Button>
          )}
        </div>
      </div>

      {/* 6. Borda, Verso Constitucional (Bandeira) e Checagem Obreiro do Altar (Totalmente Visível e Espaçoso) */}
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

        {/* Códigos das Credenciais dos Pastores (Livre Digitação - Exibido no Verso) */}
        <div className="space-y-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
          <Label className="text-[11px] font-bold text-foreground flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <IdCard className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Códigos de Credencial Ministerial (Verso):
            </span>
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Livre Digitação</span>
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground block">
                Reg. Pastor Presidente:
              </span>
              <Input
                value={pastorPresidenteCodigo}
                onChange={(e) => handleUpdateCustomTheme({ pastorPresidenteCodigoOverride: e.target.value })}
                placeholder="Ex: CGADB 12.345"
                className="h-8 text-xs font-mono bg-background"
              />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-semibold text-muted-foreground block">
                Reg. Pastor Local:
              </span>
              <Input
                value={pastorLocalCodigo}
                onChange={(e) => handleUpdateCustomTheme({ pastorLocalCodigoOverride: e.target.value })}
                placeholder="Ex: IEPC 4567"
                className="h-8 text-xs font-mono bg-background"
              />
            </div>
          </div>
          <p className="text-[9.5px] text-muted-foreground leading-tight">
            Estes códigos aparecem impressos no verso sob a respectiva assinatura oficial.
          </p>
        </div>
      </div>
    </div>
  );

  // Renderizador da Carteirinha em Cartão PVC (Frente ou Verso)
  // Renderizador da Carteirinha em Cartão PVC (Frente ou Verso)
  const renderCardPreview = () => {
    // Base física internacional do padrão de cartão CR-80 (86 mm × 54 mm)
    const baseW = 86;
    const baseH = 54;
    const widthRatio = cardWidthMm / baseW;
    const heightRatio = cardHeightMm / baseH;

    // Escala milimétrica direta para pixels: 4.4px por mm físico
    const previewScale = 4.4;
    const previewWidthPx = Math.round(cardWidthMm * previewScale);
    const previewHeightPx = Math.round(cardHeightMm * previewScale);

    // Escala dimensional harmônica equilibrada
    // Se a altura for reduzida, a escala vertical pondera para impedir que o conteúdo estoure
    const contentScale = Math.min(widthRatio * 0.35 + heightRatio * 0.65, heightRatio * 1.05);

    // Fator de compactação para alturas menores (ex: <= 58mm)
    const isTightVertical = cardHeightMm < 60;
    const isVeryTightVertical = cardHeightMm <= 54;

    // Dimensões dinâmicas proporcionais e perfeitamente ajustadas
    const dynamicLogoSize = Math.round(Math.min(54, Math.max(36, 48 * Math.min(heightRatio, 1.2))));
    
    // Proporção de foto 3x4 perfeitamente vinculada à altura da credencial
    const dynamicPhotoH = Math.round(previewHeightPx * (isTightVertical ? 0.48 : 0.52));
    const dynamicPhotoW = cardTheme.photoShape === "circle" ? dynamicPhotoH : Math.round(dynamicPhotoH * 0.76);

    const dynamicChurchFontSize = Math.round(Math.max(11, Math.min(16, 13 * contentScale)));
    const dynamicChurchSubFontSize = Math.round(Math.max(9, Math.min(12, 10 * contentScale)));
    const dynamicNameFontSize = Math.round(Math.max(13, Math.min(20, 16 * contentScale)));
    const dynamicRoleFontSize = Math.round(Math.max(9.5, Math.min(13, 11 * contentScale)));
    const dynamicMetaFontSize = Math.round(Math.max(8.5, Math.min(12, 9.5 * contentScale)));
    const dynamicBadgeFontSize = Math.round(Math.max(8.5, Math.min(11, 9.5 * contentScale)));

    // Elementos do Verso: Leis, QR Code e Assinaturas
    const dynamicQrSize = Math.round(Math.max(48, Math.min(isTightVertical ? 62 : 74, previewHeightPx * (isTightVertical ? 0.27 : 0.31))));
    const dynamicSigHeight = Math.round(Math.max(14, Math.min(isTightVertical ? 20 : 26, 22 * heightRatio)));
    const dynamicSigNameSize = Math.round(Math.max(7.5, Math.min(10.5, 8.5 * contentScale)));
    const dynamicSigTitleSize = Math.round(Math.max(6.5, Math.min(8.5, 7 * contentScale)));
    const dynamicSigCodeSize = Math.round(Math.max(6, Math.min(8, 6.5 * contentScale)));

    // Espaçamentos e paddings dinâmicos
    const cardPaddingClass = isVeryTightVertical ? "p-2.5 sm:p-3" : isTightVertical ? "p-3 sm:p-3.5" : "p-3.5 sm:p-4";
    const headerTitleSize = Math.round(Math.max(8.5, Math.min(12, 10 * contentScale)));
    const headerSubSize = Math.round(Math.max(6.5, Math.min(9, 7.5 * contentScale)));
    const lawsBoxPadding = isVeryTightVertical ? "py-0.5 px-1.5" : "py-1 px-2";
    const lawsTitleSize = Math.round(Math.max(7, Math.min(9.5, 8 * contentScale)));
    const lawsTextSize = Math.round(Math.max(6.5, Math.min(8.5, 7.2 * contentScale)));
    const legalNoticeSize = Math.round(Math.max(6, Math.min(8, 6.8 * contentScale)));
    const validityFontSize = Math.round(Math.max(7.5, Math.min(10, 8.5 * contentScale)));

    return (
      <div className="w-full flex justify-center items-center overflow-x-auto py-1">
        <div
          onClick={() => setCardSide(cardSide === "front" ? "back" : "front")}
          title="Clique no cartão para girar frente/verso"
          className="relative group perspective-1000 my-auto cursor-pointer transition-all duration-150 hover:scale-[1.01] shrink-0 flex flex-col items-center justify-center"
          style={{
            width: `${previewWidthPx}px`,
            minWidth: `${previewWidthPx}px`,
          }}
        >
          {/* Indicador de dimensão física ativa */}
          <div className="w-full flex items-center justify-between pb-1.5 px-1 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1 font-mono font-semibold text-primary">
              <Ruler className="w-3 h-3" />
              {cardWidthMm} mm (Largura) × {cardHeightMm} mm (Altura)
            </span>
            <span className="text-[9px] opacity-75">
              {cardSide === "front" ? "Frente (Clique p/ Girar)" : "Verso (Clique p/ Girar)"}
            </span>
          </div>

          {cardSide === "front" ? (
            /* FRENTE DA CARTEIRINHA COM ESTILO PERSONALIZÁVEL */
            <div
              id="carteirinha-digital-front"
              className={`w-full rounded-2xl text-white ${cardPaddingClass} shadow-2xl relative flex flex-col justify-between overflow-hidden select-none transition-all duration-150`}
              style={{
                width: `${previewWidthPx}px`,
                height: `${previewHeightPx}px`,
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
                size={Math.round(155 * contentScale)}
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

            {/* Topo: Logo Maior + Nome da Igreja + Badge */}
            <div
              className={`flex items-center justify-between ${isTightVertical ? "pb-1.5" : "pb-2"} z-10 border-b gap-3`}
              style={{ borderColor: `${cardTheme.borderColor}40` }}
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                {cardTheme.showLogo && (
                  <>
                    {registeredLogo ? (
                      <img
                        src={registeredLogo}
                        alt="Logo da Igreja"
                        className="object-contain rounded-xl bg-white/10 p-1 border shadow-xs shrink-0"
                        style={{
                          width: `${dynamicLogoSize}px`,
                          height: `${dynamicLogoSize}px`,
                          borderColor: `${cardTheme.borderColor}80`,
                        }}
                      />
                    ) : (
                      <div
                        className="rounded-xl flex items-center justify-center font-black border shadow-xs shrink-0"
                        style={{
                          width: `${dynamicLogoSize}px`,
                          height: `${dynamicLogoSize}px`,
                          backgroundColor: `${cardTheme.accentColor}25`,
                          borderColor: cardTheme.accentColor,
                          color: cardTheme.accentColor,
                          fontSize: `${Math.round(14 * Math.max(0.85, contentScale))}px`,
                        }}
                      >
                        IEPC
                      </div>
                    )}
                  </>
                )}
                <div className="min-w-0 flex-1">
                  <h3
                    className="font-black tracking-wide uppercase leading-tight text-white drop-shadow-xs truncate"
                    style={{ fontSize: `${dynamicChurchFontSize}px` }}
                  >
                    {churchLeadership.church.name}
                  </h3>
                  <span
                    className="uppercase block font-bold truncate mt-0.5 tracking-wider"
                    style={{
                      color: cardTheme.accentColor,
                      fontSize: `${dynamicChurchSubFontSize}px`,
                    }}
                  >
                    {branchName} • ROL DE MEMBROS
                  </span>
                </div>
              </div>
              <Badge
                className="text-slate-950 font-black uppercase px-2.5 py-1 shadow-xs shrink-0 whitespace-nowrap self-center tracking-wider"
                style={{
                  backgroundColor: cardTheme.accentColor,
                  fontSize: `${dynamicBadgeFontSize}px`,
                }}
              >
                {activeBadgeLabel}
              </Badge>
            </div>

            {/* Centro: Foto 3x4 Proporcional + Dados Principais Rebalanceados */}
            <div className={`flex items-center gap-3 sm:gap-4 my-auto z-10 ${isTightVertical ? "py-1" : "py-1.5"} flex-1`}>
              {/* Foto do Membro */}
              <div className="relative shrink-0">
                <div
                  className={`overflow-hidden border-2 bg-slate-950/70 shadow-md flex items-center justify-center ${
                    cardTheme.photoShape === "circle" ? "rounded-full" : "rounded-xl"
                  }`}
                  style={{
                    width: `${dynamicPhotoW}px`,
                    height: `${dynamicPhotoH}px`,
                    borderColor: cardTheme.borderColor,
                  }}
                >
                  {activeMember?.photoUrl ? (
                    <img
                      src={activeMember.photoUrl}
                      alt={activeMember.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12 opacity-60 text-white" />
                  )}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 text-white rounded-full p-0.5 shadow-xs"
                  style={{ backgroundColor: cardTheme.borderColor }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              {/* Informações Reajustadas e Altamente Legíveis */}
              <div className="space-y-1 sm:space-y-1.5 flex-1 overflow-hidden">
                <div
                  className="uppercase font-extrabold tracking-widest text-[9px]"
                  style={{ color: cardTheme.accentColor }}
                >
                  NOME DO MEMBRO
                </div>
                <div
                  className="font-black text-white truncate leading-tight drop-shadow-xs"
                  style={{ fontSize: `${dynamicNameFontSize}px` }}
                >
                  {activeMember?.name || "Membro Não Selecionado"}
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <span
                    className="inline-block px-2.5 py-0.5 rounded-md font-black uppercase border shadow-xs"
                    style={{
                      backgroundColor: cardTheme.tagBg,
                      color: cardTheme.tagText,
                      borderColor: `${cardTheme.borderColor}70`,
                      fontSize: `${dynamicRoleFontSize}px`,
                    }}
                  >
                    {activeMember?.role || "Membro Eclesiástico"}
                  </span>
                  <span
                    className="font-mono text-slate-200 font-bold tracking-wider"
                    style={{ fontSize: `${Math.round(10 * Math.max(0.85, contentScale))}px` }}
                  >
                    {registrationNum}
                  </span>
                </div>

                {/* Grid de Metadados: Data de Batismo, Validade */}
                <div
                  className="grid grid-cols-2 gap-2 pt-0.5"
                  style={{ fontSize: `${dynamicMetaFontSize}px` }}
                >
                  <div className="bg-black/25 rounded-lg p-1 sm:p-1.5 border border-white/10 backdrop-blur-xs">
                    <span
                      className="font-extrabold block uppercase tracking-wider text-[8px]"
                      style={{ color: cardTheme.accentColor }}
                    >
                      DATA DO BATISMO:
                    </span>
                    <span className="font-bold text-white tracking-wide block truncate">
                      {memberBaptismDate}
                    </span>
                  </div>
                  <div className="bg-black/25 rounded-lg p-1 sm:p-1.5 border border-white/10 backdrop-blur-xs">
                    <span
                      className="font-extrabold block uppercase tracking-wider text-[8px]"
                      style={{ color: cardTheme.accentColor }}
                    >
                      VALIDADE:
                    </span>
                    <span className="font-bold text-white tracking-wide block truncate">
                      {formattedValidity}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* VERSO DA CARTEIRINHA: CONSTITUCIONAL COM BANDEIRA (ANEXO 2) OU SIMPLES */
          cardTheme.showConstituicaoVerso !== false ? (
            <div
              id="carteirinha-digital-back"
              className={`w-full rounded-2xl text-slate-900 ${cardPaddingClass} shadow-2xl relative flex flex-col justify-between overflow-hidden select-none bg-white transition-all duration-150`}
              style={{
                width: `${previewWidthPx}px`,
                height: `${previewHeightPx}px`,
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
                className="pb-1 text-center border-b z-10"
                style={{ borderColor: `${cardTheme.borderColor}45` }}
              >
                <div
                  className="font-black uppercase tracking-wider leading-tight text-emerald-950"
                  style={{ fontSize: `${headerTitleSize}px` }}
                >
                  REPÚBLICA FEDERATIVA DO BRASIL • CONSTITUIÇÃO DE 1988
                </div>
                <p
                  className="text-slate-800 font-semibold leading-tight mt-0.5"
                  style={{ fontSize: `${headerSubSize}px` }}
                >
                  Solicitamos às autoridades oficiais, civis e militares que dispensem ao portador todas as facilidades e auxílios no exercício de seu Ministério.
                </p>
              </div>

              {/* Meio: Leis Constitucionais Enquadradas em Frames + QR Code de Validação */}
              <div className="flex items-center justify-between gap-2.5 my-auto py-0.5 z-10 flex-1">
                <div className="flex-1 space-y-1 text-slate-900 pr-1">
                  <div
                    className={`bg-white/95 rounded-md border border-slate-200/90 shadow-2xs ${lawsBoxPadding}`}
                  >
                    <span
                      className="font-black uppercase block leading-tight text-emerald-950"
                      style={{ fontSize: `${lawsTitleSize}px` }}
                    >
                      ENTRADAS EM HOSPITAIS E PRESÍDIOS
                    </span>
                    <p
                      className="text-slate-800 font-medium leading-tight mt-0.5"
                      style={{ fontSize: `${lawsTextSize}px` }}
                    >
                      <strong>Art. 5º VII-A / Lei 9.982:</strong> Assegura a prestação de assistência religiosa nas entidades civis e militares de internação coletiva.
                    </p>
                  </div>

                  <div
                    className={`bg-white/95 rounded-md border border-slate-200/90 shadow-2xs ${lawsBoxPadding}`}
                  >
                    <span
                      className="font-black uppercase block leading-tight text-emerald-950"
                      style={{ fontSize: `${lawsTitleSize}px` }}
                    >
                      LIBERDADE DE CULTO
                    </span>
                    <p
                      className="text-slate-800 font-medium leading-tight mt-0.5"
                      style={{ fontSize: `${lawsTextSize}px` }}
                    >
                      <strong>Art. 5º VI:</strong> É inviolável a liberdade de consciência e de crença, sendo assegurado o livre exercício dos cultos religiosos.
                    </p>
                  </div>

                  <div
                    className="font-bold text-slate-700 italic px-0.5 leading-tight"
                    style={{ fontSize: `${legalNoticeSize}px` }}
                  >
                    Esta Credencial é pessoal e intransferível. Válida com apresentação de RG/CPF.
                  </div>
                </div>

                {/* QR Code de Validação */}
                <div
                  className="bg-white p-1 rounded-xl shrink-0 shadow-sm border-2 flex flex-col items-center justify-center"
                  style={{ borderColor: cardTheme.borderColor }}
                >
                  <QRCodeSVG
                    value={validationUrl}
                    size={dynamicQrSize}
                    level="M"
                    includeMargin={false}
                  />
                  <span
                    className="font-black uppercase mt-0.5 tracking-wider text-emerald-950 text-[6px]"
                  >
                    VALIDAR DIGITAL
                  </span>
                  <span className="text-[5.5px] text-slate-600 font-mono font-bold">
                    VAL: {formattedValidity}
                  </span>
                </div>
              </div>

              {/* Faixa Oficial de Validade antes das Assinaturas */}
              <div className="flex items-center justify-center my-0.5 z-10 w-full shrink-0">
                <div
                  className="py-0.5 px-2.5 rounded-full inline-flex items-center justify-center gap-1.5 font-bold border shadow-xs"
                  style={{
                    backgroundColor: `${cardTheme.fromColor}12`,
                    borderColor: `${cardTheme.borderColor}70`,
                    color: "#0f172a",
                    fontSize: `${validityFontSize}px`,
                  }}
                >
                  <Calendar className="w-2.5 h-2.5 shrink-0" style={{ color: cardTheme.fromColor }} />
                  <span className="font-extrabold uppercase tracking-wider text-slate-900">
                    Validade da Credencial:
                  </span>
                  <span
                    className="font-mono font-black px-1.5 py-0.2 rounded text-white shadow-2xs"
                    style={{
                      backgroundColor: cardTheme.fromColor,
                      fontSize: `${validityFontSize}px`,
                    }}
                  >
                    {formattedValidity}
                  </span>
                </div>
              </div>

              {/* Assinaturas Oficiais com Código da Credencial */}
              <div
                className="pt-1 grid grid-cols-2 gap-2 text-center border-t z-10 shrink-0"
                style={{ borderColor: `${cardTheme.borderColor}35` }}
              >
                <div className="flex flex-col justify-end">
                  {isObreiro && pastorPresidenteSig && (
                    <img
                      src={pastorPresidenteSig}
                      alt="Assinatura Pastor Presidente"
                      className="object-contain mx-auto -mb-0.5 pointer-events-none select-none drop-shadow-xs"
                      style={{ height: `${dynamicSigHeight}px` }}
                    />
                  )}
                  {!isObreiro && pastorLocalSig && (
                    <img
                      src={pastorLocalSig}
                      alt="Assinatura Pastor Local"
                      className="object-contain mx-auto -mb-0.5 pointer-events-none select-none drop-shadow-xs"
                      style={{ height: `${dynamicSigHeight}px` }}
                    />
                  )}
                  <div
                    className="border-t mx-auto w-full pt-0.5 font-bold text-slate-900 leading-tight"
                    style={{
                      borderColor: cardTheme.borderColor,
                      fontSize: `${Math.min(
                        dynamicSigNameSize,
                        Math.max(6.5, Math.round(92 / Math.max(12, (isObreiro ? pastorPresidenteName : pastorLocalName).length) * (widthRatio * 1.05)))
                      )}px`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isObreiro ? pastorPresidenteName : pastorLocalName}
                  </div>
                  <div
                    className="font-semibold uppercase tracking-wider text-emerald-900 leading-tight"
                    style={{ fontSize: `${dynamicSigTitleSize}px`, whiteSpace: "nowrap" }}
                  >
                    {isObreiro ? "Pastor Presidente" : "Pastor Local"}
                  </div>
                  {((isObreiro && pastorPresidenteCodigo) || (!isObreiro && pastorLocalCodigo)) && (
                    <div
                      className="font-mono font-bold tracking-tight text-slate-700 pt-0.5 leading-tight"
                      style={{ fontSize: `${dynamicSigCodeSize}px`, whiteSpace: "nowrap" }}
                    >
                      Reg: {isObreiro ? pastorPresidenteCodigo : pastorLocalCodigo}
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-end">
                  {isObreiro && pastorLocalSig && (
                    <img
                      src={pastorLocalSig}
                      alt="Assinatura Pastor Local"
                      className="object-contain mx-auto -mb-0.5 pointer-events-none select-none drop-shadow-xs"
                      style={{ height: `${dynamicSigHeight}px` }}
                    />
                  )}
                  <div
                    className="border-t mx-auto w-full pt-0.5 font-bold text-slate-900 leading-tight"
                    style={{
                      borderColor: cardTheme.borderColor,
                      fontSize: `${Math.min(
                        dynamicSigNameSize,
                        Math.max(6.5, Math.round(92 / Math.max(12, (isObreiro ? pastorLocalName : "Secretaria Geral").length) * (widthRatio * 1.05)))
                      )}px`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isObreiro ? pastorLocalName : "Secretaria Geral"}
                  </div>
                  <div
                    className="font-semibold uppercase tracking-wider text-emerald-900 leading-tight"
                    style={{ fontSize: `${dynamicSigTitleSize}px`, whiteSpace: "nowrap" }}
                  >
                    {isObreiro ? "Pastor Local" : "Secretaria Geral"}
                  </div>
                  {isObreiro && pastorLocalCodigo && (
                    <div
                      className="font-mono font-bold tracking-tight text-slate-700 pt-0.5 leading-tight"
                      style={{ fontSize: `${dynamicSigCodeSize}px`, whiteSpace: "nowrap" }}
                    >
                      Reg: {pastorLocalCodigo}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* VERSO SIMPLES / TRADICIONAL */
            <div
              id="carteirinha-digital-back"
              className="w-full rounded-2xl text-white p-4 sm:p-5 shadow-2xl relative flex flex-col justify-between overflow-hidden select-none transition-all duration-150"
              style={{
                width: `${previewWidthPx}px`,
                height: `${previewHeightPx}px`,
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
                    size={dynamicQrSize}
                    level="M"
                    includeMargin={false}
                  />
                  <span className="text-[6.5px] text-slate-800 font-bold uppercase mt-0.5 tracking-wider">
                    VALIDAR DIGITAL
                  </span>
                </div>
              </div>

              {/* Faixa Oficial de Validade antes das Assinaturas */}
              <div className="flex items-center justify-center my-0.5 z-10 w-full shrink-0">
                <div
                  className="py-0.5 px-2.5 rounded-full inline-flex items-center justify-center gap-1.5 font-bold border shadow-xs"
                  style={{
                    backgroundColor: `${cardTheme.accentColor}18`,
                    borderColor: `${cardTheme.borderColor}60`,
                    color: cardTheme.accentColor,
                    fontSize: `${validityFontSize}px`,
                  }}
                >
                  <Calendar className="w-2.5 h-2.5 shrink-0" style={{ color: cardTheme.accentColor }} />
                  <span className="font-extrabold uppercase tracking-wider">
                    Validade da Credencial:
                  </span>
                  <span
                    className="font-mono font-black px-1.5 py-0.2 rounded shadow-2xs"
                    style={{
                      backgroundColor: `${cardTheme.borderColor}30`,
                      color: "#ffffff",
                      fontSize: `${validityFontSize}px`,
                    }}
                  >
                    {formattedValidity}
                  </span>
                </div>
              </div>

              {/* Assinaturas no Verso Tradicional com Código da Credencial */}
              <div
                className="pt-1 grid grid-cols-2 gap-2 text-center border-t z-10 shrink-0"
                style={{ borderColor: `${cardTheme.borderColor}35` }}
              >
                <div className="flex flex-col justify-end">
                  {isObreiro && pastorPresidenteSig && (
                    <img
                      src={pastorPresidenteSig}
                      alt="Assinatura Pastor Presidente"
                      className="object-contain mx-auto -mb-0.5 pointer-events-none select-none drop-shadow-xs invert"
                      style={{ height: `${dynamicSigHeight}px` }}
                    />
                  )}
                  {!isObreiro && pastorLocalSig && (
                    <img
                      src={pastorLocalSig}
                      alt="Assinatura Pastor Local"
                      className="object-contain mx-auto -mb-0.5 pointer-events-none select-none drop-shadow-xs invert"
                      style={{ height: `${dynamicSigHeight}px` }}
                    />
                  )}
                  <div
                    className="border-t mx-auto w-full pt-0.5 font-bold text-white leading-tight"
                    style={{
                      borderColor: cardTheme.borderColor,
                      fontSize: `${Math.min(
                        dynamicSigNameSize,
                        Math.max(6.5, Math.round(92 / Math.max(12, (isObreiro ? pastorPresidenteName : pastorLocalName).length) * (widthRatio * 1.05)))
                      )}px`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isObreiro ? pastorPresidenteName : pastorLocalName}
                  </div>
                  <div
                    className="font-semibold uppercase tracking-wider leading-tight"
                    style={{ color: cardTheme.accentColor, fontSize: `${dynamicSigTitleSize}px`, whiteSpace: "nowrap" }}
                  >
                    {isObreiro ? "Pastor Presidente" : "Pastor Local"}
                  </div>
                  {((isObreiro && pastorPresidenteCodigo) || (!isObreiro && pastorLocalCodigo)) && (
                    <div
                      className="font-mono font-bold tracking-tight text-slate-300 pt-0.5 leading-tight"
                      style={{ fontSize: `${dynamicSigCodeSize}px`, whiteSpace: "nowrap" }}
                    >
                      Reg: {isObreiro ? pastorPresidenteCodigo : pastorLocalCodigo}
                    </div>
                  )}
                </div>

                <div className="flex flex-col justify-end">
                  {isObreiro && pastorLocalSig && (
                    <img
                      src={pastorLocalSig}
                      alt="Assinatura Pastor Local"
                      className="object-contain mx-auto -mb-0.5 pointer-events-none select-none drop-shadow-xs invert"
                      style={{ height: `${dynamicSigHeight}px` }}
                    />
                  )}
                  <div
                    className="border-t mx-auto w-full pt-0.5 font-bold text-white leading-tight"
                    style={{
                      borderColor: cardTheme.borderColor,
                      fontSize: `${Math.min(
                        dynamicSigNameSize,
                        Math.max(6.5, Math.round(92 / Math.max(12, (isObreiro ? pastorLocalName : "Secretaria Geral").length) * (widthRatio * 1.05)))
                      )}px`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isObreiro ? pastorLocalName : "Secretaria Geral"}
                  </div>
                  <div
                    className="font-semibold uppercase tracking-wider leading-tight"
                    style={{ color: cardTheme.accentColor, fontSize: `${dynamicSigTitleSize}px`, whiteSpace: "nowrap" }}
                  >
                    {isObreiro ? "Pastor Local" : "Secretaria Geral"}
                  </div>
                  {isObreiro && pastorLocalCodigo && (
                    <div
                      className="font-mono font-bold tracking-tight text-slate-300 pt-0.5 leading-tight"
                      style={{ fontSize: `${dynamicSigCodeSize}px`, whiteSpace: "nowrap" }}
                    >
                      Reg: {pastorLocalCodigo}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
    );
  };

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
                Cartão digital para celular com QR Code. Para impressão física em lote (PVC ou papel com filiação completa e código de barras), acesse a <strong>Carteirinha Padrão Impressa</strong>.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {onOpenTraditionalCards && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onOpenTraditionalCards}
                  className="h-8 text-xs font-bold border-emerald-600/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5 rounded-xl shadow-2xs"
                  title="Abrir gerador e impressor de Carteirinhas Tradicionais em PVC / Papel"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Carteirinha Padrão Impressa</span>
                </Button>
              )}
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

              {/* Informações do Titular e Régua de Calibração */}
              <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", fontSize: "11px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: "10px", alignItems: "center" }}>
                  <div><strong>Membro:</strong> {activeMember?.name}</div>
                  <div><strong>Cargo:</strong> {activeMember?.role || "Membro"}</div>
                  <div><strong>Registro:</strong> {registrationNum}</div>
                </div>

                {/* Régua de Verificação de Escala 100% (Garante fidelidade milimétrica) */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed #cbd5e1", fontSize: "9px", color: "#64748b" }}>
                  <span>📌 <strong>Guia de Impressão Escala 1:1:</strong> Se impresso em 100% (tamanho real), a barra ao lado medirá exatamente 50 mm (5 cm):</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "50mm", height: "4px", backgroundColor: "#0f172a", position: "relative", borderRadius: "1px" }}>
                      <div style={{ position: "absolute", left: 0, top: "-3px", width: "1.5px", height: "10px", backgroundColor: "#0f172a" }}></div>
                      <div style={{ position: "absolute", right: 0, top: "-3px", width: "1.5px", height: "10px", backgroundColor: "#0f172a" }}></div>
                      <div style={{ position: "absolute", left: "50%", top: "-2px", width: "1px", height: "8px", backgroundColor: "#0f172a" }}></div>
                    </div>
                    <span style={{ fontSize: "8.5px", fontFamily: "monospace", fontWeight: "bold", color: "#0f172a" }}>50 mm</span>
                  </div>
                </div>
              </div>

              {/* Área das Carteirinhas (Frente e Verso lado a lado com linhas de corte e dobra) */}
              <div style={{ border: "2px dashed #94a3b8", borderRadius: "12px", padding: "22px 18px", backgroundColor: "#fcfdfe", position: "relative" }}>
                {/* Marcas de Registro / Cruzes de Corte nos 4 Cantos */}
                <div style={{ position: "absolute", top: "4px", left: "4px", fontSize: "10px", color: "#94a3b8", fontWeight: "bold" }}>┌</div>
                <div style={{ position: "absolute", top: "4px", right: "4px", fontSize: "10px", color: "#94a3b8", fontWeight: "bold" }}>┐</div>
                <div style={{ position: "absolute", bottom: "4px", left: "4px", fontSize: "10px", color: "#94a3b8", fontWeight: "bold" }}>└</div>
                <div style={{ position: "absolute", bottom: "4px", right: "4px", fontSize: "10px", color: "#94a3b8", fontWeight: "bold" }}>┘</div>

                <div style={{ position: "absolute", top: "-10px", left: "20px", backgroundColor: "#ffffff", padding: "0 8px", fontSize: "10px", fontWeight: "bold", color: "#059669", textTransform: "uppercase", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
                  ✂️ Linha de Corte e Dobra • Dimensões do Crachá: {cardWidthMm} × {cardHeightMm} mm
                </div>

                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "20px", flexWrap: "nowrap" }}>
                  {/* FRENTE DA CARTEIRINHA PARA IMPRESSÃO */}
                  <div
                    style={{
                      width: `${cardWidthMm}mm`,
                      height: `${cardHeightMm}mm`,
                      borderRadius: "10px",
                      padding: "8px 11px",
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
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact",
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
                      size={Math.min(130, Math.max(90, cardHeightMm * 1.8))}
                    />

                    {/* Topo Frente */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${cardTheme.borderColor}50`, paddingBottom: "3px", zIndex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {registeredLogo && (
                          <img src={registeredLogo} alt="Logo" style={{ width: "32px", height: "32px", objectFit: "contain", borderRadius: "6px", backgroundColor: "rgba(255,255,255,0.15)", padding: "1px", border: `1px solid ${cardTheme.borderColor}80` }} />
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
                      <div style={{ backgroundColor: cardTheme.accentColor, color: "#020617", fontSize: "7px", fontWeight: "900", padding: "1.5px 6px", borderRadius: "3px", textTransform: "uppercase" }}>
                        {activeBadgeLabel}
                      </div>
                    </div>

                    {/* Meio Frente */}
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "auto 0", zIndex: 1, flex: 1, padding: "4px 0" }}>
                      <div style={{ width: "42px", height: "54px", borderRadius: "6px", border: `1.5px solid ${cardTheme.borderColor}`, overflow: "hidden", backgroundColor: "#020617", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {activeMember?.photoUrl ? (
                          <img src={activeMember.photoUrl} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <div style={{ color: "#ffffff", opacity: 0.6, fontSize: "16px" }}>👤</div>
                        )}
                      </div>
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ fontSize: "7px", fontWeight: "bold", color: cardTheme.accentColor, textTransform: "uppercase" }}>
                          NOME DO MEMBRO
                        </div>
                        <div style={{ fontSize: "11px", fontWeight: "900", textTransform: "uppercase", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.2 }}>
                          {activeMember?.name}
                        </div>
                        <div style={{ marginTop: "2px", display: "flex", alignItems: "center", gap: "5px" }}>
                          <span style={{ backgroundColor: cardTheme.tagBg, color: cardTheme.tagText, padding: "1.5px 5px", borderRadius: "3px", fontSize: "7px", fontWeight: "bold", textTransform: "uppercase" }}>
                            {activeMember?.role || "Membro"}
                          </span>
                          <span style={{ fontSize: "7px", fontFamily: "monospace", opacity: 0.9 }}>
                            {registrationNum}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "8px", marginTop: "4px", fontSize: "6.5px", opacity: 0.95 }}>
                          <div>Data Batismo: <strong style={{ color: "#ffffff" }}>{memberBaptismDate}</strong></div>
                          <div>Validade: <strong style={{ color: "#ffffff" }}>{formattedValidity}</strong></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* LINHA PONTILHADA CENTRAL DE DOBRA */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", height: `${cardHeightMm}mm` }}>
                    <span style={{ fontSize: "6px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>▲ Dobra</span>
                    <div style={{ height: `calc(${cardHeightMm}mm - 20px)`, borderRight: "1.5px dashed #94a3b8" }} />
                    <span style={{ fontSize: "6px", color: "#64748b", textTransform: "uppercase", fontWeight: "bold" }}>▼ Dobra</span>
                  </div>

                  {/* VERSO DA CARTEIRINHA PARA IMPRESSÃO */}
                  {cardTheme.showConstituicaoVerso !== false ? (
                    <div
                      style={{
                        width: `${cardWidthMm}mm`,
                        height: `${cardHeightMm}mm`,
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
                        WebkitPrintColorAdjust: "exact",
                        printColorAdjust: "exact",
                      }}
                    >
                      {/* Topo Verso Constitucional */}
                      <div style={{ borderBottom: `1px solid ${cardTheme.borderColor}45`, paddingBottom: "2px", textAlign: "center", flexShrink: 0 }}>
                        <div style={{ fontSize: "7px", fontWeight: "900", color: "#064e3b", textTransform: "uppercase", letterSpacing: "0.2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          REPÚBLICA FEDERATIVA DO BRASIL • CONSTITUIÇÃO DE 1988
                        </div>
                        <div style={{ fontSize: "5.2px", color: "#1e293b", lineHeight: 1.1, fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "1px" }}>
                          Solicitamos às autoridades oficiais e civis facilidades no exercício ministerial.
                        </div>
                      </div>

                      {/* Meio: Leis e QR Code */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "6px", margin: "auto 0", flex: 1, padding: "2px 0" }}>
                        <div style={{ flex: 1, fontSize: "5.5px", lineHeight: 1.25, color: "#0f172a" }}>
                          <div style={{ backgroundColor: "rgba(255,255,255,0.95)", padding: "2px 4px", borderRadius: "3px", border: "0.5px solid #e2e8f0", marginBottom: "2px" }}>
                            <div style={{ fontWeight: "900", color: "#064e3b", textTransform: "uppercase" }}>
                              ASSISTÊNCIA RELIGIOSA (HOSPITAIS E PRESÍDIOS)
                            </div>
                            <div style={{ color: "#334155" }}>Art. 5º VII-A / Lei 9.982: Assegura assistência religiosa em entidades coletivas.</div>
                          </div>
                          <div style={{ backgroundColor: "rgba(255,255,255,0.95)", padding: "2px 4px", borderRadius: "3px", border: "0.5px solid #e2e8f0" }}>
                            <div style={{ fontWeight: "900", color: "#064e3b", textTransform: "uppercase" }}>
                              LIBERDADE DE CULTO
                            </div>
                            <div style={{ color: "#334155" }}>Art. 5º VI: Inviolável liberdade de crença e livre exercício de cultos.</div>
                          </div>
                          <div style={{ fontSize: "4.8px", color: "#475569", fontStyle: "italic", marginTop: "1px" }}>
                            Esta Credencial é pessoal e intransferível. Válida com RG/CPF.
                          </div>
                        </div>

                        <div style={{ backgroundColor: "#ffffff", padding: "3px", borderRadius: "4px", border: `1px solid ${cardTheme.borderColor}`, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                          <QRCodeSVG value={validationUrl} size={Math.min(42, Math.max(32, cardHeightMm * 0.6))} level="M" includeMargin={false} />
                          <span style={{ fontSize: "4.5px", color: "#064e3b", fontWeight: "900", marginTop: "1px" }}>
                            VALIDAR DIGITAL
                          </span>
                        </div>
                      </div>

                      {/* Faixa Oficial de Validade antes das Assinaturas */}
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", fontSize: "6.5px", padding: "1px 8px", borderRadius: "999px", backgroundColor: `${cardTheme.fromColor}15`, border: `0.5px solid ${cardTheme.borderColor}70`, margin: "1px auto", zIndex: 1, width: "fit-content", flexShrink: 0 }}>
                        <span style={{ fontWeight: "900", color: "#064e3b", textTransform: "uppercase" }}>VALIDADE DA CREDENCIAL:</span>
                        <strong style={{ color: "#ffffff", fontFamily: "monospace", backgroundColor: cardTheme.fromColor, padding: "0 5px", borderRadius: "3px" }}>{formattedValidity}</strong>
                      </div>

                      {/* Assinaturas no Verso */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", borderTop: `1px solid ${cardTheme.borderColor}40`, paddingTop: "2px", textAlign: "center", flexShrink: 0 }}>
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                          {(isObreiro ? pastorPresidenteSig : pastorLocalSig) && (
                            <img
                              src={isObreiro ? pastorPresidenteSig : pastorLocalSig}
                              alt="Assinatura"
                              style={{ height: "12px", objectFit: "contain", margin: "0 auto -2px auto", display: "block" }}
                            />
                          )}
                          <div style={{ borderTop: `1px solid ${cardTheme.borderColor}`, width: "92%", margin: "0 auto", fontSize: "6.5px", fontWeight: "bold", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {isObreiro ? pastorPresidenteName : pastorLocalName}
                          </div>
                          <div style={{ fontSize: "5px", color: cardTheme.fromColor, fontWeight: "bold", whiteSpace: "nowrap" }}>
                            {isObreiro ? "Pastor Presidente" : "Pastor Local"}
                          </div>
                          {((isObreiro && pastorPresidenteCodigo) || (!isObreiro && pastorLocalCodigo)) && (
                            <div style={{ fontSize: "4.8px", color: "#475569", fontFamily: "monospace", fontWeight: "bold", paddingTop: "0.5px", whiteSpace: "nowrap" }}>
                              Reg: {isObreiro ? pastorPresidenteCodigo : pastorLocalCodigo}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                          {isObreiro && pastorLocalSig && (
                            <img
                              src={pastorLocalSig}
                              alt="Assinatura"
                              style={{ height: "12px", objectFit: "contain", margin: "0 auto -2px auto", display: "block" }}
                            />
                          )}
                          <div style={{ borderTop: `1px solid ${cardTheme.borderColor}`, width: "92%", margin: "0 auto", fontSize: "6.5px", fontWeight: "bold", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {isObreiro ? pastorLocalName : "Secretaria Geral"}
                          </div>
                          <div style={{ fontSize: "5px", color: cardTheme.fromColor, fontWeight: "bold", whiteSpace: "nowrap" }}>
                            {isObreiro ? "Pastor Local" : "Secretaria Geral"}
                          </div>
                          {isObreiro && pastorLocalCodigo && (
                            <div style={{ fontSize: "4.8px", color: "#475569", fontFamily: "monospace", fontWeight: "bold", paddingTop: "0.5px", whiteSpace: "nowrap" }}>
                              Reg: {pastorLocalCodigo}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        width: `${cardWidthMm}mm`,
                        height: `${cardHeightMm}mm`,
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
                        WebkitPrintColorAdjust: "exact",
                        printColorAdjust: "exact",
                      }}
                    >
                      <BrasaoWatermark
                        color={cardTheme.accentColor || "#ffffff"}
                        registeredLogo={registeredLogo}
                        customWatermarkUrl={cardTheme.customWatermarkUrl}
                        watermarkMode={cardTheme.watermarkMode || "parametros"}
                        watermarkHarmony={cardTheme.watermarkHarmony || "accent"}
                        opacity={cardTheme.customWatermarkUrl ? 0.22 : 0.18}
                        size={Math.min(130, Math.max(90, cardHeightMm * 1.8))}
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
                          <QRCodeSVG value={validationUrl} size={Math.min(44, Math.max(34, cardHeightMm * 0.65))} level="M" includeMargin={false} />
                          <span style={{ fontSize: "5px", color: "#0f172a", fontWeight: "bold", marginTop: "2px", textTransform: "uppercase" }}>
                            VALIDAÇÃO DIGITAL
                          </span>
                        </div>
                      </div>

                      {/* Faixa Oficial de Validade antes das Assinaturas */}
                      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", fontSize: "6.5px", padding: "1.5px 8px", borderRadius: "999px", backgroundColor: `${cardTheme.accentColor}18`, border: `0.5px solid ${cardTheme.borderColor}60`, margin: "1.5px auto", zIndex: 1, width: "fit-content" }}>
                        <span style={{ fontWeight: "900", color: cardTheme.accentColor, textTransform: "uppercase" }}>VALIDADE DA CREDENCIAL:</span>
                        <strong style={{ color: "#ffffff", fontFamily: "monospace", backgroundColor: `${cardTheme.borderColor}30`, padding: "0 4px", borderRadius: "3px" }}>{formattedValidity}</strong>
                      </div>

                      {/* Assinaturas Verso Simples para Impressão */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", borderTop: `1px solid ${cardTheme.borderColor}40`, paddingTop: "2px", textAlign: "center", zIndex: 1, flexShrink: 0 }}>
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                          {(isObreiro ? pastorPresidenteSig : pastorLocalSig) && (
                            <img
                              src={isObreiro ? pastorPresidenteSig : pastorLocalSig}
                              alt="Assinatura"
                              style={{ height: "12px", objectFit: "contain", margin: "0 auto -2px auto", display: "block", filter: "invert(1)" }}
                            />
                          )}
                          <div style={{ borderTop: `1px solid ${cardTheme.borderColor}`, width: "92%", margin: "0 auto", fontSize: "6.5px", fontWeight: "bold", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {isObreiro ? pastorPresidenteName : pastorLocalName}
                          </div>
                          <div style={{ fontSize: "5px", color: cardTheme.accentColor, fontWeight: "bold", whiteSpace: "nowrap" }}>
                            {isObreiro ? "Pastor Presidente" : "Pastor Local"}
                          </div>
                          {((isObreiro && pastorPresidenteCodigo) || (!isObreiro && pastorLocalCodigo)) && (
                            <div style={{ fontSize: "4.8px", color: "#cbd5e1", fontFamily: "monospace", fontWeight: "bold", paddingTop: "0.5px", whiteSpace: "nowrap" }}>
                              Reg: {isObreiro ? pastorPresidenteCodigo : pastorLocalCodigo}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                          {isObreiro && pastorLocalSig && (
                            <img
                              src={pastorLocalSig}
                              alt="Assinatura"
                              style={{ height: "12px", objectFit: "contain", margin: "0 auto -2px auto", display: "block", filter: "invert(1)" }}
                            />
                          )}
                          <div style={{ borderTop: `1px solid ${cardTheme.borderColor}`, width: "92%", margin: "0 auto", fontSize: "6.5px", fontWeight: "bold", color: "#ffffff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {isObreiro ? pastorLocalName : "Secretaria Geral"}
                          </div>
                          <div style={{ fontSize: "5px", color: cardTheme.accentColor, fontWeight: "bold", whiteSpace: "nowrap" }}>
                            {isObreiro ? "Pastor Local" : "Secretaria Geral"}
                          </div>
                          {isObreiro && pastorLocalCodigo && (
                            <div style={{ fontSize: "4.8px", color: "#cbd5e1", fontFamily: "monospace", fontWeight: "bold", paddingTop: "0.5px", whiteSpace: "nowrap" }}>
                              Reg: {pastorLocalCodigo}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Instruções de Plastificação / Acabamento */}
              <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "10px 14px", fontSize: "10.5px", color: "#1e3a8a", marginTop: "16px" }}>
                <strong>📌 Instruções de Montagem & Acabamento:</strong>
                <ol style={{ margin: "4px 0 0 16px", padding: 0 }}>
                  <li>Recorte no contorno externo pontilhado com tesoura ou estilete guiado por régua.</li>
                  <li>Dobre exatamente ao meio na linha pontilhada vertical central para emparelhar a Frente e o Verso perfeitamente.</li>
                  <li>Insira em polaseal para termolaminação/plastificação ou utilize porta-crachá correspondente ({cardWidthMm} × {cardHeightMm} mm).</li>
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
