import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Award,
  FileText,
  Printer,
  Download,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  User,
  Baby,
  Droplet,
  Send,
  FileCheck2,
  CheckCircle2,
  FileImage,
  Palette,
  Sliders,
  Type,
  Upload,
  Image as ImageIcon,
  Feather,
  Stamp,
  Layers,
  Trash2,
  Brush,
  AlignLeft,
  AlignCenter
} from "lucide-react";
import { toast } from "sonner";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";
import { printDocument, downloadElementAsPdf } from "@/lib/printUtils";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";
import { getChurchLeadershipConfig } from "@/lib/churchConfigHelper";
import { useBranch } from "@/contexts/BranchContext";

export type DocType = "batismo" | "apresentacao" | "membrasia";

interface CustomBgModel {
  id: string;
  name: string;
  url: string;
  createdAt: string;
}

interface CertificadosCartasOficiaisModalProps {
  isOpen: boolean;
  onClose: () => void;
  members?: Array<{ id: string; name: string; role?: string; phone?: string; birthDate?: string; baptismDate?: string; spouseName?: string; parents?: string }>;
  churchData?: any;
  activeBranchName?: string;
  activeBranchId?: string;
  responsiblePastorName?: string;
  secretaryName?: string;
}

// Available Fonts for Dynamic Injection
const FONT_OPTIONS_TITLE = [
  { label: "Cinzel (Clássico Eclesiástico)", value: "'Cinzel', serif" },
  { label: "Playfair Display (Elegante & Solene)", value: "'Playfair Display', serif" },
  { label: "Great Vibes (Caligrafia Fluida)", value: "'Great Vibes', cursive" },
  { label: "Pinyon Script (Manuscrito Imperial)", value: "'Pinyon Script', cursive" },
  { label: "Montserrat (Moderno & Limpo)", value: "'Montserrat', sans-serif" },
  { label: "Georgia (Tradicional Acadêmico)", value: "Georgia, serif" },
  { label: "Times New Roman (Formal)", value: "'Times New Roman', Times, serif" }
];

const FONT_OPTIONS_NAME = [
  { label: "Great Vibes (Caligrafia Solene)", value: "'Great Vibes', cursive" },
  { label: "Pinyon Script (Manuscrito Nobre)", value: "'Pinyon Script', cursive" },
  { label: "Cinzel (Caixa Alta Majestosa)", value: "'Cinzel', serif" },
  { label: "Playfair Display (Serifado Sofisticado)", value: "'Playfair Display', serif" },
  { label: "Montserrat (Caixa Alta Moderna)", value: "'Montserrat', sans-serif" },
  { label: "Georgia (Formal)", value: "Georgia, serif" }
];

const FONT_OPTIONS_BODY = [
  { label: "Times New Roman (Clássico Eclesiástico)", value: "'Times New Roman', Times, serif" },
  { label: "Georgia (Leitura Fluida)", value: "Georgia, serif" },
  { label: "Playfair Display (Serifado Suave)", value: "'Playfair Display', serif" },
  { label: "Montserrat (Sans-Serif Limpo)", value: "'Montserrat', sans-serif" }
];

export function CertificadosCartasOficiaisModal({
  isOpen,
  onClose,
  members = [],
  churchData,
  activeBranchName = "Sede Principal",
  activeBranchId,
  responsiblePastorName,
  secretaryName
}: CertificadosCartasOficiaisModalProps) {
  const { activeBranch, branches } = useBranch();
  const currentBranch = activeBranchId || activeBranch;

  // Inject Google Fonts dynamically when modal mounts
  useEffect(() => {
    const fontId = "certificate-google-fonts";
    if (!document.getElementById(fontId)) {
      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href = "https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800;900&family=Great+Vibes&family=Montserrat:wght@500;700;900&family=Playfair+Display:ital,wght@0,600;0,800;1,600&family=Pinyon+Script&display=swap";
      document.head.appendChild(link);
    }
  }, []);

  // Leadership Config dos Parâmetros do Sistema
  const leadership = useMemo(() => getChurchLeadershipConfig(currentBranch, branches), [currentBranch, branches, isOpen]);

  // Document Type & Core Settings (Apenas Certificados Solenes: Batismo, Apresentação e Membrasia)
  const [docType, setDocType] = useState<DocType>("batismo");
  const [orientation, setOrientation] = useState<"landscape">("landscape");
  const [inputMode, setInputMode] = useState<"member" | "custom">("member");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("none");

  // Layout do Cabeçalho: "left_logo" (Logo à esquerda + dados à direita) vs "center" (Centralizado)
  const [headerLayout, setHeaderLayout] = useState<"left_logo" | "center">("left_logo");

  // Editable Header & Titles
  const [churchHeaderName, setChurchHeaderName] = useState<string>("IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO");
  const [churchHeaderBranch, setChurchHeaderBranch] = useState<string>("2ª Congregação • MINISTÉRIO NACIONAL OBPC");
  const [customTitle, setCustomTitle] = useState<string>("CERTIFICADO DE BATISMO NAS ÁGUAS");
  const [introPhrase, setIntroPhrase] = useState<string>("Certificamos que o(a) amado(a) irmão(ã)");

  // Editable Form Content Fields (Digitação Livre ou Puxado do Membro)
  const [candidateName, setCandidateName] = useState<string>("MARIA FRANCINETE DOS SANTOS");
  const [candidateRole, setCandidateRole] = useState<string>("Membro em Plena Comunhão");
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [candidateBirthDate, setCandidateBirthDate] = useState<string>("");
  const [eventLocation, setEventLocation] = useState<string>("Sede da Igreja OBPC");
  const [fatherName, setFatherName] = useState<string>("Manoel Francisco dos Santos");
  const [motherName, setMotherName] = useState<string>("Ana Maria dos Santos");
  const [celebrantPastor, setCelebrantPastor] = useState<string>("");
  const [bookNumber, setBookNumber] = useState<string>("01");
  const [pageNumber, setPageNumber] = useState<string>("42");
  const [recordNumber, setRecordNumber] = useState<string>("128");
  const [customVerse, setCustomVerse] = useState<string>("\"Quem crer e for batizado será salvo.\" - Marcos 16:16");
  const [customText, setCustomText] = useState<string>(
    "Atestamos para os devidos fins que o(a) irmão(ã) acima nominado(a) foi devidamente batizado(a) nas águas por imersão, conforme o mandamento do Nosso Senhor Jesus Cristo, sendo recebido(a) na comunhão do corpo de Cristo."
  );

  // Assinantes e Assinaturas Vindas Direto dos Parâmetros
  const [pastorTitle, setPastorTitle] = useState<string>("Pastor Presidente");
  const [pastorName, setPastorName] = useState<string>("");
  const [pastorSignatureUrl, setPastorSignatureUrl] = useState<string>("");

  const [secTitle, setSecTitle] = useState<string>("Secretário(a) Geral");
  const [secName, setSecName] = useState<string>("");
  const [secSignatureUrl, setSecSignatureUrl] = useState<string>("");

  // Typography & Styling Control State
  const [fontFamilyTitle, setFontFamilyTitle] = useState<string>("'Cinzel', serif");
  const [fontFamilyName, setFontFamilyName] = useState<string>("'Great Vibes', cursive");
  const [fontFamilyBody, setFontFamilyBody] = useState<string>("'Times New Roman', Times, serif");

  const [fontSizeTitle, setFontSizeTitle] = useState<number>(28);
  const [fontSizeName, setFontSizeName] = useState<number>(32);
  const [fontSizeBody, setFontSizeBody] = useState<number>(14);

  const [colorTitle, setColorTitle] = useState<string>("#92400E");
  const [colorName, setColorName] = useState<string>("#78350F");
  const [colorBody, setColorBody] = useState<string>("#1F2937");
  const [colorAccentBorder, setColorAccentBorder] = useState<string>("#D97706");

  const [textEffect, setTextEffect] = useState<"none" | "shadow" | "gold_glow" | "emboss">("shadow");

  // Background Models, Textures & Uploads
  const [bgType, setBgType] = useState<"white" | "pergaminho" | "marfim" | "ouro_soft" | "azul_royal" | "vinho_imperial" | "esmeralda" | "custom_img">("pergaminho");
  const [bgImageFit, setBgImageFit] = useState<"cover" | "contain" | "fill">("cover");
  const [customBgImageUrl, setCustomBgImageUrl] = useState<string>("");

  // Saved Custom Background Models Gallery (stored in localStorage)
  const [savedBgModels, setSavedBgModels] = useState<CustomBgModel[]>(() => {
    try {
      const saved = localStorage.getItem("church_certificate_bg_models");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [borderPattern, setBorderPattern] = useState<"gold_double" | "filigrana_royal" | "moldura_tripla" | "minimalista" | "none">("gold_double");
  const [sealType, setSealType] = useState<"gold_3d" | "red_ribbon" | "silver_badge" | "emerald_seal" | "none">("gold_3d");

  const [showWatermark, setShowWatermark] = useState<boolean>(true);
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(0.05);
  const [includeDigitalSignatures, setIncludeDigitalSignatures] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pastorSigInputRef = useRef<HTMLInputElement>(null);
  const secSigInputRef = useRef<HTMLInputElement>(null);

  // Synchronize Signatures & Church Header from Parameters when modal opens or props/leadership changes
  useEffect(() => {
    if (!isOpen) return;

    // Load Church Header Info from Parameters / Leadership
    const cName = churchData?.nome || leadership.church.name || "IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO";
    const cBranch = activeBranchName ? `${activeBranchName} • MINISTÉRIO NACIONAL OBPC` : `${leadership.church.cidade || "2ª Congregação"} • MINISTÉRIO NACIONAL OBPC`;
    setChurchHeaderName(cName);
    setChurchHeaderBranch(cBranch);

    // Load Pastor Info & Signature from Parameters
    const pName = responsiblePastorName || churchData?.pastorName || churchData?.pastorTitular || leadership.pastor.name || "Pr. Presidente";
    const pSig = churchData?.pastorSignatureUrl || churchData?.pastorSignatureDataUrl || churchData?.pastorSignature || leadership.pastor.signatureUrl || "";
    setPastorName(pName);
    setPastorSignatureUrl(pSig);

    // Load Secretary Info & Signature from Parameters
    const sName = secretaryName || churchData?.secretaryName || churchData?.secretario1 || leadership.secretaria.name || "Secretaria Geral";
    const sSig = churchData?.secretarySignatureUrl || churchData?.secretarySignatureDataUrl || churchData?.secretario1SignatureUrl || leadership.secretaria.signatureUrl || "";
    setSecName(sName);
    setSecSignatureUrl(sSig);
  }, [isOpen, churchData, activeBranchName, responsiblePastorName, secretaryName, leadership]);

  // Auto-fill form when selecting a member from the dropdown
  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    if (memberId === "none") return;
    const found = members.find(m => m.id === memberId);
    if (found) {
      setCandidateName(found.name.toUpperCase());
      if (found.role) setCandidateRole(found.role);
      if (found.baptismDate) setEventDate(found.baptismDate);
      if (found.birthDate) setCandidateBirthDate(found.birthDate);
      if (found.parents) {
        const parts = found.parents.split("/");
        if (parts[0]) setFatherName(parts[0].trim());
        if (parts[1]) setMotherName(parts[1].trim());
      }
      toast.success(`Dados de ${found.name} carregados no certificado!`);
    }
  };

  // Sync orientation & default preset texts automatically when changing document type
  const handleDocTypeChange = (type: DocType) => {
    setDocType(type);
    setOrientation("landscape");
    if (type === "batismo") {
      setCustomTitle("CERTIFICADO DE BATISMO NAS ÁGUAS");
      setIntroPhrase("Certificamos que o(a) amado(a) irmão(ã)");
      setCustomVerse("\"Quem crer e for batizado será salvo.\" - Marcos 16:16");
      setCustomText("Atestamos para os devidos fins que o(a) irmão(ã) acima nominado(a) foi devidamente batizado(a) nas águas por imersão, conforme o mandamento do Nosso Senhor Jesus Cristo, passando a integrar como membro ativo desta igreja.");
      setColorTitle("#92400E");
      setColorName("#78350F");
      setColorAccentBorder("#D97706");
      setBgType("pergaminho");
    } else if (type === "apresentacao") {
      setCustomTitle("CERTIFICADO DE APRESENTAÇÃO DE CRIANÇA");
      setIntroPhrase("Com grande alegria e gratidão a Deus, certificamos que a criança");
      setCustomVerse("\"Por este menino orava eu; e o Senhor ouviu a minha oração.\" - 1 Samuel 1:27");
      setCustomText("Certificamos que a criança acima nominada foi apresentada ao Senhor Jesus Cristo em culto solene de gratidão, recebendo a oração da igreja e a bênção eclesiástica pastoral.");
      setColorTitle("#92400E");
      setColorName("#B45309");
      setColorAccentBorder("#F59E0B");
      setBgType("marfim");
    } else if (type === "membrasia") {
      setCustomTitle("CERTIFICADO DE MEMBRASIA & COMUNHÃO");
      setIntroPhrase("Atestamos com jubilo que o(a) estimado(a) irmão(ã)");
      setCustomVerse("\"Assim que já não sois estrangeiros, mas concidadãos dos santos, e da família de Deus.\" - Efésios 2:19");
      setCustomText("Certificamos que o(a) irmão(ã) acima nominado(a) encontra-se devidamente matriculado(a) nos registros da Secretaria Geral desta igreja, estando em plena comunhão espiritual, ética e doutrinária.");
      setColorTitle("#1E40AF");
      setColorName("#1E3A8A");
      setColorAccentBorder("#2563EB");
      setBgType("pergaminho");
    }
  };

  // Background Styling Resolver
  const getBackgroundStyle = (): React.CSSProperties => {
    switch (bgType) {
      case "white":
        return { backgroundColor: "#FFFFFF" };
      case "pergaminho":
        return {
          backgroundColor: "#FDFBF7",
          backgroundImage: "radial-gradient(#E5D5C0 0.75px, transparent 0.75px), radial-gradient(#E5D5C0 0.75px, #FDFBF7 0.75px)",
          backgroundSize: "30px 30px",
          backgroundPosition: "0 0, 15px 15px"
        };
      case "marfim":
        return {
          background: "linear-gradient(135deg, #FFFDF9 0%, #FDF8ED 50%, #FAF0D9 100%)"
        };
      case "ouro_soft":
        return {
          background: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 40%, #FDE68A 100%)"
        };
      case "azul_royal":
        return {
          background: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 50%, #BAE6FD 100%)"
        };
      case "vinho_imperial":
        return {
          background: "linear-gradient(135deg, #FFF1F2 0%, #FFE4E6 50%, #FECDD3 100%)"
        };
      case "esmeralda":
        return {
          background: "linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 50%, #A7F3D0 100%)"
        };
      case "custom_img":
        return customBgImageUrl
          ? {
              backgroundImage: `url(${customBgImageUrl})`,
              backgroundSize: bgImageFit === "cover" ? "cover" : bgImageFit === "contain" ? "contain" : "100% 100%",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat"
            }
          : { backgroundColor: "#FFFFFF" };
    }
  };

  // Upload and Save Custom Background Models
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        toast.error("Imagem muito grande! Selecione um arquivo menor que 8MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const urlStr = event.target.result as string;
          setCustomBgImageUrl(urlStr);
          setBgType("custom_img");

          // Save to models gallery
          const modelName = file.name.replace(/\.[^/.]+$/, "") || `Modelo Fundo ${savedBgModels.length + 1}`;
          const newModel: CustomBgModel = {
            id: `bg_model_${Date.now()}`,
            name: modelName,
            url: urlStr,
            createdAt: new Date().toLocaleDateString("pt-BR")
          };

          const updated = [newModel, ...savedBgModels];
          setSavedBgModels(updated);
          try {
            localStorage.setItem("church_certificate_bg_models", JSON.stringify(updated));
          } catch (err) {
            console.warn("Storage quota limit reached for bg models gallery:", err);
          }

          toast.success("Modelo de fundo adicionado à galeria e aplicado com sucesso!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectBgModel = (model: CustomBgModel) => {
    setCustomBgImageUrl(model.url);
    setBgType("custom_img");
    toast.success(`Modelo "${model.name}" aplicado no certificado!`);
  };

  const handleDeleteBgModel = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedBgModels.filter(m => m.id !== id);
    setSavedBgModels(updated);
    try {
      localStorage.setItem("church_certificate_bg_models", JSON.stringify(updated));
    } catch {}
    toast.success("Modelo de fundo removido.");
  };

  // Upload custom signatures directly if requested
  const handleUploadPastorSig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPastorSignatureUrl(ev.target.result as string);
          toast.success("Assinatura do Pastor atualizada no certificado!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSecSig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setSecSignatureUrl(ev.target.result as string);
          toast.success("Assinatura da Secretaria atualizada no certificado!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Text Shadow Effect Resolver
  const getTextEffectStyle = (type: "title" | "name" | "body") => {
    switch (textEffect) {
      case "shadow":
        return { textShadow: "1px 2px 4px rgba(0,0,0,0.18)" };
      case "gold_glow":
        return { textShadow: "0 0 8px rgba(217, 119, 6, 0.4), 1px 1px 2px rgba(0,0,0,0.3)" };
      case "emboss":
        return { textShadow: "-1px -1px 1px rgba(255,255,255,0.8), 1px 1px 2px rgba(0,0,0,0.4)" };
      case "none":
      default:
        return {};
    }
  };

  const churchName = churchHeaderName || "IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO";
  const logoUrl = getRegisteredChurchLogo(currentBranch) || leadership.church.logoUrl || null;

  // Print Document A4 Paisagem (297 x 210 mm) - Resolução e enquadramento exatos
  const handlePrint = async () => {
    const toastId = toast.loading("Preparando impressão em A4 Paisagem (297 × 210 mm)...");
    try {
      const el = document.getElementById("certificado-print-container");
      if (!el) {
        toast.error("Certificado não encontrado para impressão.", { id: toastId });
        return;
      }

      // Gera imagem nítida com alta densidade de pixels
      const dataUrl = await toPng(el, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: bgType === "white" ? "#ffffff" : undefined,
      });

      // Cria iframe oculto isolado com estilização paisagem estrita
      const iframeId = "__certificate_isolated_print_frame__";
      let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
      if (iframe) iframe.remove();

      iframe = document.createElement("iframe");
      iframe.id = iframeId;
      iframe.setAttribute(
        "style",
        "position:fixed; top:-9999px; left:-9999px; width:297mm; height:210mm; border:0; opacity:0; pointer-events:none;"
      );
      document.body.appendChild(iframe);

      const iDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iDoc) {
        throw new Error("Contexto de impressão não disponível.");
      }

      iDoc.open();
      iDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${customTitle} - ${candidateName}</title>
            <style>
              @page {
                size: A4 landscape;
                margin: 0mm !important;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                width: 297mm !important;
                height: 210mm !important;
                background: #ffffff !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                overflow: hidden !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              img {
                width: 297mm !important;
                height: 210mm !important;
                object-fit: contain !important;
                display: block !important;
              }
            </style>
          </head>
          <body>
            <img id="cert-img-node" src="${dataUrl}" alt="Certificado" />
          </body>
        </html>
      `);
      iDoc.close();

      const imgNode = iDoc.getElementById("cert-img-node") as HTMLImageElement;
      const doPrint = () => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
          toast.success("Diálogo de impressão aberto!", { id: toastId });
        } catch (printErr) {
          console.warn("Direct iframe print blocked by sandbox:", printErr);
          handleDownloadPdf();
          toast.info("Impressão direta bloqueada. Baixando PDF A4 Paisagem oficial...", { id: toastId });
        }
      };

      if (imgNode.complete) {
        setTimeout(doPrint, 200);
      } else {
        imgNode.onload = () => setTimeout(doPrint, 200);
      }
    } catch (err) {
      console.error("Erro na impressão:", err);
      handleDownloadPdf();
      toast.info("Baixando PDF A4 Paisagem de alta definição...", { id: toastId });
    }
  };

  // Download PDF A4 Paisagem (297 x 210 mm)
  const handleDownloadPdf = async () => {
    const toastId = toast.loading("Gerando PDF oficial em A4 Paisagem (297 × 210 mm)...");
    try {
      const el = document.getElementById("certificado-print-container");
      if (!el) {
        toast.error("Certificado não encontrado.", { id: toastId });
        return;
      }
      const dataUrl = await toPng(el, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: bgType === "white" ? "#ffffff" : undefined,
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      pdf.addImage(dataUrl, "PNG", 0, 0, 297, 210, undefined, "FAST");
      pdf.save(`CERTIFICADO_${docType.toUpperCase()}_${candidateName.replace(/\s+/g, "_")}.pdf`);
      toast.success("Certificado baixado em PDF A4 Paisagem com sucesso!", { id: toastId });
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
      toast.error("Erro ao gerar PDF do certificado.", { id: toastId });
    }
  };

  // Save PNG
  const handleSavePng = async () => {
    const toastId = toast.loading("Gerando imagem HD (300 DPI)...");
    try {
      const el = document.getElementById("certificado-print-container");
      if (!el) {
        toast.error("Elemento não encontrado.", { id: toastId });
        return;
      }
      const dataUrl = await toPng(el, { quality: 1, pixelRatio: 3, backgroundColor: bgType === "white" ? "#ffffff" : undefined });
      const a = document.createElement("a");
      a.download = `${docType.toUpperCase()}_${candidateName.replace(/\s+/g, '_')}.png`;
      a.href = dataUrl;
      a.click();
      toast.success("Imagem gerada e baixada com sucesso!", { id: toastId });
    } catch (e) {
      toast.error("Erro ao gerar imagem.", { id: toastId });
    }
  };

  const formatDateBR = (isoDateStr: string) => {
    if (!isoDateStr) return new Date().toLocaleDateString("pt-BR");
    try {
      const [y, m, d] = isoDateStr.split("-");
      if (y && m && d) {
        const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
        return dateObj.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
      }
      return isoDateStr;
    } catch {
      return isoDateStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] lg:max-w-7xl w-[98vw] max-h-[96vh] flex flex-col p-3 sm:p-5 overflow-hidden bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        {/* Header Superior Solene */}
        <DialogHeader className="border-b pb-2.5 shrink-0 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-amber-800 text-white shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                Emissão de Certificados Eclesiásticos Solenes
                <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-900 border-amber-300 font-bold uppercase">
                  A4 Paisagem • Alta Resolução
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Certificados solenes de Batismo, Apresentação de Crianças e Membrasia com cabeçalho oficial e assinaturas diretas dos parâmetros.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo Principal Dividido em 2 Colunas: Painel de Abas + Visualizador A4 */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 py-2 overflow-y-auto min-h-0">
          
          {/* PAINEL ESQUERDO COM ABAS DE EDICÃO (5 colunas) */}
          <div className="lg:col-span-5 flex flex-col space-y-3 pr-1 overflow-y-auto max-h-[78vh]">
            
            {/* Seleção do Tipo de Certificado (Somente Certificados Solenes, sem cartas) */}
            <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border shadow-2xs">
              <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 mb-1.5">
                <Award className="w-3.5 h-3.5 text-amber-600" />
                Certificado Solene:
              </Label>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { id: "batismo", label: "Batismo", icon: Droplet },
                  { id: "apresentacao", label: "Apresentação", icon: Baby },
                  { id: "membrasia", label: "Membrasia", icon: Award }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleDocTypeChange(item.id as DocType)}
                    className={`py-2 px-2 rounded-lg border text-left transition-all flex items-center gap-1.5 text-xs font-bold ${
                      docType === item.id
                        ? "bg-amber-500/15 border-amber-500 ring-2 ring-amber-500 text-amber-950 dark:text-amber-200"
                        : "bg-background hover:bg-muted text-muted-foreground border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ABAS ORGANIZADAS DE EDICÃO COMPLETA */}
            <Tabs defaultValue="conteudo" className="w-full">
              <TabsList className="grid grid-cols-3 h-9 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl">
                <TabsTrigger value="conteudo" className="text-[11px] font-bold flex items-center gap-1">
                  <Feather className="w-3 h-3" /> Conteúdo
                </TabsTrigger>
                <TabsTrigger value="tipografia" className="text-[11px] font-bold flex items-center gap-1">
                  <Type className="w-3 h-3" /> Fontes & Cores
                </TabsTrigger>
                <TabsTrigger value="estilo" className="text-[11px] font-bold flex items-center gap-1">
                  <Palette className="w-3 h-3" /> Fundos & Bordas
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: CONTEÚDO E TEXTOS */}
              <TabsContent value="conteudo" className="space-y-3 pt-2">
                {/* Escolha entre Selecionar Membro Cadastrado ou Digitação Livre (Anexo 3) */}
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      Preenchimento dos Dados:
                    </Label>
                    <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg border text-[10px]">
                      <button
                        type="button"
                        onClick={() => setInputMode("member")}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                          inputMode === "member" ? "bg-amber-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Rol de Membros
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setInputMode("custom");
                          setSelectedMemberId("none");
                        }}
                        className={`px-2 py-0.5 rounded-md font-bold transition-all ${
                          inputMode === "custom" ? "bg-amber-600 text-white shadow-xs" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Digitação Livre
                      </button>
                    </div>
                  </div>

                  {inputMode === "member" ? (
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Selecione o membro do rol:</Label>
                      <Select value={selectedMemberId} onValueChange={handleSelectMember}>
                        <SelectTrigger className="h-8 text-xs bg-background font-semibold">
                          <SelectValue placeholder="Selecione um membro..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          <SelectItem value="none">-- Selecionar Membro do Rol --</SelectItem>
                          {members.map(m => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name} {m.role ? `(${m.role})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[9.5px] text-muted-foreground">
                        Puxa automaticamente nome, cargo, data de batismo e filiação cadastrados.
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-[10.5px] text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                      <span>Modo Digitação Livre ativado: preencha ou ajuste livremente o nome, datas e filiação abaixo.</span>
                    </div>
                  )}
                </div>

                {/* Campos do Cabeçalho e Título Editáveis */}
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border shadow-2xs space-y-2">
                  <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1 border-b pb-1">
                    <Sliders className="w-3.5 h-3.5 text-amber-600" />
                    Títulos & Cabeçalho Editáveis:
                  </Label>

                  {/* Disposição do Cabeçalho (Logo à Esquerda vs Centralizado) */}
                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Alinhamento do Cabeçalho:</Label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => setHeaderLayout("left_logo")}
                        className={`py-1.5 px-2 rounded text-xs font-bold border transition-all flex items-center gap-1.5 ${
                          headerLayout === "left_logo"
                            ? "bg-amber-600 text-white border-amber-700 shadow-2xs"
                            : "bg-background hover:bg-muted text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" /> Logo à Esquerda
                      </button>
                      <button
                        type="button"
                        onClick={() => setHeaderLayout("center")}
                        className={`py-1.5 px-2 rounded text-xs font-bold border transition-all flex items-center gap-1.5 ${
                          headerLayout === "center"
                            ? "bg-amber-600 text-white border-amber-700 shadow-2xs"
                            : "bg-background hover:bg-muted text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        <AlignCenter className="w-3.5 h-3.5" /> Centralizado
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Nome da Igreja (Cabeçalho):</Label>
                    <Input
                      value={churchHeaderName}
                      onChange={(e) => setChurchHeaderName(e.target.value)}
                      className="h-7 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Congregação / Ministério:</Label>
                    <Input
                      value={churchHeaderBranch}
                      onChange={(e) => setChurchHeaderBranch(e.target.value)}
                      className="h-7 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Título Principal do Certificado:</Label>
                    <Input
                      value={customTitle}
                      onChange={(e) => setCustomTitle(e.target.value)}
                      className="h-8 text-xs font-black uppercase text-amber-900 dark:text-amber-200"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Frase de Introdução / Concessão:</Label>
                    <Input
                      value={introPhrase}
                      onChange={(e) => setIntroPhrase(e.target.value)}
                      className="h-7 text-xs italic"
                    />
                  </div>
                </div>

                {/* Dados Principais do Candidato / Criança (Digitação Livre ou Editável) */}
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border shadow-2xs space-y-2">
                  <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1 border-b pb-1">
                    <User className="w-3.5 h-3.5 text-amber-600" />
                    Dados do Candidato / Criança (Edição Livre):
                  </Label>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Nome Completo do Candidato(a):</Label>
                    <Input
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="Digite o nome completo da pessoa"
                      className="h-8 text-xs font-bold uppercase"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Cargo ou Condição Eclesiástica:</Label>
                    <Input
                      value={candidateRole}
                      onChange={(e) => setCandidateRole(e.target.value)}
                      className="h-7 text-xs"
                      placeholder="Ex: Membro em Plena Comunhão"
                    />
                  </div>

                  {/* Filiação (Pais) */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Nome do Pai:</Label>
                      <Input
                        value={fatherName}
                        onChange={(e) => setFatherName(e.target.value)}
                        placeholder="Nome do Pai"
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Nome da Mãe:</Label>
                      <Input
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                        placeholder="Nome da Mãe"
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>

                  {/* Datas e Localidade */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Data do Evento / Batismo:</Label>
                      <Input
                        type="date"
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Data de Nascimento (Opcional):</Label>
                      <Input
                        type="date"
                        value={candidateBirthDate}
                        onChange={(e) => setCandidateBirthDate(e.target.value)}
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Livro, Folha e Registro */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1 border-t">
                    <div className="space-y-1">
                      <Label className="text-[9.5px] text-muted-foreground font-semibold">Livro Nº:</Label>
                      <Input
                        value={bookNumber}
                        onChange={(e) => setBookNumber(e.target.value)}
                        placeholder="Ex: 01"
                        className="h-7 text-xs text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9.5px] text-muted-foreground font-semibold">Folha Nº:</Label>
                      <Input
                        value={pageNumber}
                        onChange={(e) => setPageNumber(e.target.value)}
                        placeholder="Ex: 42"
                        className="h-7 text-xs text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9.5px] text-muted-foreground font-semibold">Registro / Termo:</Label>
                      <Input
                        value={recordNumber}
                        onChange={(e) => setRecordNumber(e.target.value)}
                        placeholder="Ex: 128"
                        className="h-7 text-xs text-center"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Cidade / Localidade:</Label>
                      <Input
                        value={eventLocation}
                        onChange={(e) => setEventLocation(e.target.value)}
                        className="h-7 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Pastor Oficiante / Celebrante:</Label>
                      <Input
                        value={celebrantPastor}
                        onChange={(e) => setCelebrantPastor(e.target.value)}
                        placeholder="Deixe em branco p/ usar Pastor Titular"
                        className="h-7 text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Versículo Bíblico Destaque:</Label>
                    <Input
                      value={customVerse}
                      onChange={(e) => setCustomVerse(e.target.value)}
                      className="h-7 text-xs italic"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Texto do Corpo do Certificado:</Label>
                    <Textarea
                      value={customText}
                      onChange={(e) => setCustomText(e.target.value)}
                      rows={3}
                      className="text-xs resize-none leading-relaxed"
                    />
                  </div>
                </div>

                {/* Assinaturas Pastor e Secretário Vindas Direto dos Parâmetros */}
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between border-b pb-1">
                    <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      <Stamp className="w-3.5 h-3.5 text-amber-600" />
                      Assinantes Oficiais (Parâmetros):
                    </Label>
                    <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-800 border-emerald-300 font-bold">
                      <CheckCircle2 className="w-2.5 h-2.5 mr-1 text-emerald-600" />
                      Sincronizado
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {/* Pastor */}
                    <div className="space-y-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                      <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block border-b pb-0.5">
                        1º Assinante (Pastor)
                      </span>
                      <div className="space-y-1">
                        <Label className="text-[9px] text-muted-foreground font-semibold">Título:</Label>
                        <Input
                          value={pastorTitle}
                          onChange={(e) => setPastorTitle(e.target.value)}
                          className="h-6 text-[11px]"
                        />
                        <Label className="text-[9px] text-muted-foreground font-semibold">Nome:</Label>
                        <Input
                          value={pastorName}
                          onChange={(e) => setPastorName(e.target.value)}
                          className="h-6 text-[11px] font-bold"
                        />
                      </div>

                      {/* Status / Visualização da Assinatura Digital do Pastor */}
                      <div className="pt-1">
                        <Label className="text-[9px] text-muted-foreground font-semibold block mb-1">
                          Assinatura Digital (Parâmetros):
                        </Label>
                        {pastorSignatureUrl ? (
                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded border">
                            <img src={pastorSignatureUrl} alt="Assinatura Pastor" className="h-6 w-auto object-contain max-w-[80px]" />
                            <span className="text-[9px] text-emerald-600 font-bold">✓ Ativa</span>
                          </div>
                        ) : (
                          <div className="text-[9px] text-amber-700 font-medium italic">
                            Nenhuma assinatura cadastrada nos parâmetros.
                          </div>
                        )}
                        <input
                          type="file"
                          ref={pastorSigInputRef}
                          accept="image/*"
                          onChange={handleUploadPastorSig}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => pastorSigInputRef.current?.click()}
                          className="h-6 w-full text-[9.5px] mt-1 font-bold text-amber-700 hover:bg-amber-50"
                        >
                          <Upload className="w-2.5 h-2.5 mr-1" /> Trocar Assinatura
                        </Button>
                      </div>
                    </div>

                    {/* Secretário */}
                    <div className="space-y-1.5 p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                      <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 block border-b pb-0.5">
                        2º Assinante (Secretária)
                      </span>
                      <div className="space-y-1">
                        <Label className="text-[9px] text-muted-foreground font-semibold">Título:</Label>
                        <Input
                          value={secTitle}
                          onChange={(e) => setSecTitle(e.target.value)}
                          className="h-6 text-[11px]"
                        />
                        <Label className="text-[9px] text-muted-foreground font-semibold">Nome:</Label>
                        <Input
                          value={secName}
                          onChange={(e) => setSecName(e.target.value)}
                          className="h-6 text-[11px] font-bold"
                        />
                      </div>

                      {/* Status / Visualização da Assinatura Digital do Secretário */}
                      <div className="pt-1">
                        <Label className="text-[9px] text-muted-foreground font-semibold block mb-1">
                          Assinatura Digital (Parâmetros):
                        </Label>
                        {secSignatureUrl ? (
                          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1 rounded border">
                            <img src={secSignatureUrl} alt="Assinatura Secretária" className="h-6 w-auto object-contain max-w-[80px]" />
                            <span className="text-[9px] text-emerald-600 font-bold">✓ Ativa</span>
                          </div>
                        ) : (
                          <div className="text-[9px] text-amber-700 font-medium italic">
                            Nenhuma assinatura cadastrada nos parâmetros.
                          </div>
                        )}
                        <input
                          type="file"
                          ref={secSigInputRef}
                          accept="image/*"
                          onChange={handleUploadSecSig}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => secSigInputRef.current?.click()}
                          className="h-6 w-full text-[9.5px] mt-1 font-bold text-amber-700 hover:bg-amber-50"
                        >
                          <Upload className="w-2.5 h-2.5 mr-1" /> Trocar Assinatura
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: TIPOGRAFIA, TAMANHOS & CORES */}
              <TabsContent value="tipografia" className="space-y-3 pt-2">
                {/* Seleção de Modelo de Fontes */}
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border shadow-2xs space-y-2.5">
                  <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b pb-1">
                    <Type className="w-3.5 h-3.5 text-amber-600" />
                    Modelo de Fontes Tipográficas:
                  </Label>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Fonte do Título Principal:</Label>
                    <Select value={fontFamilyTitle} onValueChange={setFontFamilyTitle}>
                      <SelectTrigger className="h-8 text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS_TITLE.map((f) => (
                          <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Fonte do Nome do Candidato:</Label>
                    <Select value={fontFamilyName} onValueChange={setFontFamilyName}>
                      <SelectTrigger className="h-8 text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS_NAME.map((f) => (
                          <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Fonte do Corpo do Texto:</Label>
                    <Select value={fontFamilyBody} onValueChange={setFontFamilyBody}>
                      <SelectTrigger className="h-8 text-xs font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS_BODY.map((f) => (
                          <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Tamanhos de Fontes */}
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border shadow-2xs space-y-2.5">
                  <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b pb-1">
                    <Sliders className="w-3.5 h-3.5 text-amber-600" />
                    Tamanhos de Fontes (Pixels):
                  </Label>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[9px] text-muted-foreground font-semibold">Título ({fontSizeTitle}px):</Label>
                      <Input
                        type="number"
                        min={18}
                        max={42}
                        value={fontSizeTitle}
                        onChange={(e) => setFontSizeTitle(Number(e.target.value))}
                        className="h-7 text-xs text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] text-muted-foreground font-semibold">Nome ({fontSizeName}px):</Label>
                      <Input
                        type="number"
                        min={20}
                        max={52}
                        value={fontSizeName}
                        onChange={(e) => setFontSizeName(Number(e.target.value))}
                        className="h-7 text-xs text-center"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[9px] text-muted-foreground font-semibold">Corpo ({fontSizeBody}px):</Label>
                      <Input
                        type="number"
                        min={10}
                        max={22}
                        value={fontSizeBody}
                        onChange={(e) => setFontSizeBody(Number(e.target.value))}
                        className="h-7 text-xs text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Cores das Fontes e Paletas Rápida */}
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border shadow-2xs space-y-2.5">
                  <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b pb-1">
                    <Brush className="w-3.5 h-3.5 text-amber-600" />
                    Cores das Fontes & Detalhes:
                  </Label>

                  {/* Color Pickers em Linha */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Cor do Título:</Label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={colorTitle}
                          onChange={(e) => setColorTitle(e.target.value)}
                          className="w-7 h-7 rounded border cursor-pointer p-0.5"
                        />
                        <Input
                          value={colorTitle}
                          onChange={(e) => setColorTitle(e.target.value)}
                          className="h-7 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Cor do Nome:</Label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={colorName}
                          onChange={(e) => setColorName(e.target.value)}
                          className="w-7 h-7 rounded border cursor-pointer p-0.5"
                        />
                        <Input
                          value={colorName}
                          onChange={(e) => setColorName(e.target.value)}
                          className="h-7 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Cor do Corpo:</Label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={colorBody}
                          onChange={(e) => setColorBody(e.target.value)}
                          className="w-7 h-7 rounded border cursor-pointer p-0.5"
                        />
                        <Input
                          value={colorBody}
                          onChange={(e) => setColorBody(e.target.value)}
                          className="h-7 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Cor das Bordas:</Label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={colorAccentBorder}
                          onChange={(e) => setColorAccentBorder(e.target.value)}
                          className="w-7 h-7 rounded border cursor-pointer p-0.5"
                        />
                        <Input
                          value={colorAccentBorder}
                          onChange={(e) => setColorAccentBorder(e.target.value)}
                          className="h-7 text-xs font-mono uppercase"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Paleta de Cores Pré-definida Eclesiástica */}
                  <div className="pt-1 space-y-1">
                    <Label className="text-[10px] text-muted-foreground font-semibold">Paleta Rápida Eclesiástica:</Label>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {[
                        { name: "Ouro Nobre", title: "#92400E", nameC: "#78350F", border: "#D97706" },
                        { name: "Azul Royal", title: "#1E40AF", nameC: "#1E3A8A", border: "#2563EB" },
                        { name: "Vinho Imperial", title: "#831843", nameC: "#9F1239", border: "#BE185D" },
                        { name: "Esmeralda", title: "#065F46", nameC: "#047857", border: "#059669" },
                        { name: "Preto Solene", title: "#111827", nameC: "#000000", border: "#374151" }
                      ].map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setColorTitle(p.title);
                            setColorName(p.nameC);
                            setColorAccentBorder(p.border);
                            toast.success(`Paleta ${p.name} aplicada!`);
                          }}
                          className="px-2 py-1 rounded text-[10px] font-bold border transition-all flex items-center gap-1 bg-white hover:bg-slate-100 dark:bg-slate-800"
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.border }} />
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Efeitos de Texto */}
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border shadow-2xs space-y-2">
                  <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b pb-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Efeito Visual no Título e Nome:
                  </Label>

                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "none", label: "Padrão Liso" },
                      { id: "shadow", label: "Sombra Elegante" },
                      { id: "gold_glow", label: "Brilho Dourado" },
                      { id: "emboss", label: "Relevo (Emboss)" }
                    ].map((eff) => (
                      <button
                        key={eff.id}
                        type="button"
                        onClick={() => setTextEffect(eff.id as any)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all ${
                          textEffect === eff.id
                            ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                            : "bg-background hover:bg-muted text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {eff.label}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: FUNDO, UPLOAD DE MODELOS, BORDAS & SELOS */}
              <TabsContent value="estilo" className="space-y-3 pt-2">
                {/* Upload e Galeria de Modelos de Fundo */}
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between border-b pb-1">
                    <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-amber-600" />
                      Upload de Modelos de Fundo:
                    </Label>
                    <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-900 border-amber-300 font-bold">
                      JPG, PNG, WEBP
                    </Badge>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-9 text-xs font-bold border-dashed border-amber-500 hover:bg-amber-50 dark:hover:bg-slate-800 text-amber-900 dark:text-amber-200 flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4 text-amber-600" />
                    Fazer Upload de Novo Modelo de Fundo
                  </Button>

                  {/* Galeria de Modelos Salvos */}
                  {savedBgModels.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Galeria de Modelos de Fundo Salvos:</Label>
                      <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1 border rounded-lg bg-slate-50 dark:bg-slate-900">
                        {savedBgModels.map((model) => (
                          <div
                            key={model.id}
                            onClick={() => handleSelectBgModel(model)}
                            className={`p-1.5 rounded-lg border cursor-pointer relative group transition-all flex flex-col items-center text-center ${
                              bgType === "custom_img" && customBgImageUrl === model.url
                                ? "bg-amber-500/15 border-amber-500 ring-2 ring-amber-500"
                                : "bg-white dark:bg-slate-800 hover:border-amber-400"
                            }`}
                          >
                            <img src={model.url} alt={model.name} className="h-12 w-full object-cover rounded border mb-1" />
                            <span className="text-[10px] font-bold truncate w-full">{model.name}</span>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteBgModel(model.id, e)}
                              className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Excluir modelo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ajuste de Enquadramento da Imagem de Fundo Customizada */}
                  {bgType === "custom_img" && (
                    <div className="space-y-1 pt-1 border-t">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Ajuste de Enquadramento do Fundo:</Label>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: "cover", label: "Preencher (Cover)" },
                          { id: "contain", label: "Proporção (Contain)" },
                          { id: "fill", label: "Esticar 100%" }
                        ].map((fit) => (
                          <button
                            key={fit.id}
                            type="button"
                            onClick={() => setBgImageFit(fit.id as any)}
                            className={`py-1 px-1 rounded text-[9.5px] font-bold border ${
                              bgImageFit === fit.id ? "bg-amber-600 text-white border-amber-700" : "bg-background hover:bg-muted"
                            }`}
                          >
                            {fit.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Estilos Tradicionais e Texturas de Fundo */}
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border shadow-2xs space-y-2">
                  <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b pb-1">
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    Texturas Pré-definidas do Sistema:
                  </Label>

                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: "pergaminho", label: "📜 Pergaminho Antigo" },
                      { id: "marfim", label: "📜 Marfim Imperial" },
                      { id: "white", label: "📄 Branco Diplomático" },
                      { id: "ouro_soft", label: "✨ Ouro Suave Solene" },
                      { id: "azul_royal", label: "🔷 Azul Royal Eclesiástico" },
                      { id: "vinho_imperial", label: "🍷 Vinho Imperial" },
                      { id: "esmeralda", label: "🟢 Esmeralda Festivo" }
                    ].map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setBgType(bg.id as any)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border text-left truncate transition-all ${
                          bgType === bg.id
                            ? "bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-200 ring-1 ring-amber-500"
                            : "bg-background hover:bg-muted text-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Molduras e Bordas Ornamentais */}
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border shadow-2xs space-y-2">
                  <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b pb-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                    Estilo de Borda Ornamental:
                  </Label>

                  <Select value={borderPattern} onValueChange={(v: any) => setBorderPattern(v)}>
                    <SelectTrigger className="h-8 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gold_double">🥇 Borda Dupla Solene com Filigrana</SelectItem>
                      <SelectItem value="filigrana_royal">👑 Filigrana Royal Trabalhada</SelectItem>
                      <SelectItem value="moldura_tripla">🛡️ Moldura Tripla Acadêmica</SelectItem>
                      <SelectItem value="minimalista">✏️ Borda Fina Minimalista</SelectItem>
                      <SelectItem value="none">🚫 Sem Borda Externa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Selo 3D de Autenticidade & Emblema */}
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border shadow-2xs space-y-2">
                  <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 border-b pb-1">
                    <Award className="w-3.5 h-3.5 text-amber-600" />
                    Selo 3D de Autenticidade / Fita:
                  </Label>

                  <Select value={sealType} onValueChange={(v: any) => setSealType(v)}>
                    <SelectTrigger className="h-8 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gold_3d">🥇 Selo 3D Dourado em Relevo</SelectItem>
                      <SelectItem value="red_ribbon">🎗️ Fita de Gala Vermelha Imperial</SelectItem>
                      <SelectItem value="silver_badge">🥈 Distintivo Prateado de Excelência</SelectItem>
                      <SelectItem value="emerald_seal">🟢 Selo Esmeralda Sacro</SelectItem>
                      <SelectItem value="none">🚫 Omitir Selo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Marca d'Água do Logo da Igreja */}
                <div className="bg-white dark:bg-slate-800/80 p-3 rounded-xl border shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                      <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
                      Marca d'Água Central do Logo:
                    </Label>
                    <Switch checked={showWatermark} onCheckedChange={setShowWatermark} />
                  </div>

                  {showWatermark && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] font-semibold text-muted-foreground">
                        <span>Opacidade da Marca d'Água:</span>
                        <span>{Math.round(watermarkOpacity * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.01"
                        max="0.25"
                        step="0.01"
                        value={watermarkOpacity}
                        onChange={(e) => setWatermarkOpacity(parseFloat(e.target.value))}
                        className="w-full accent-amber-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300">Incluir Assinaturas Digitais:</span>
                    <Switch checked={includeDigitalSignatures} onCheckedChange={setIncludeDigitalSignatures} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* PAINEL DIREITO: VISUALIZADOR REAL EM TAMANHO A4 (7 colunas) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-start bg-slate-200/90 dark:bg-slate-950 p-3 rounded-2xl border overflow-x-auto min-h-[520px]">
            {/* BARRA SUPERIOR DE AÇÕES DO PREVIEW */}
            <div className="w-full flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-300 dark:border-slate-800 shrink-0">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                Pré-visualização A4 ({orientation === "landscape" ? "297 × 210 mm - Paisagem" : "210 × 297 mm - Retrato"})
              </span>

              <div className="flex items-center gap-1.5">
                <Button size="sm" onClick={handlePrint} className="h-8 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-xs">
                  <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir A4
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadPdf} className="h-8 text-xs font-semibold bg-white dark:bg-slate-800">
                  <Download className="w-3.5 h-3.5 mr-1" /> Baixar PDF
                </Button>
                <Button size="sm" variant="secondary" onClick={handleSavePng} className="h-8 text-xs font-semibold">
                  <FileImage className="w-3.5 h-3.5 mr-1" /> PNG HD
                </Button>
              </div>
            </div>

            {/* O CERTIFICADO/CARTA EM SI (CONTÊINER CAPTURADO VIA HTML-TO-IMAGE E PRINT) */}
            <div className="w-full flex justify-center overflow-x-auto p-1">
              <div
                id="certificado-print-container"
                className={`text-slate-900 shadow-2xl relative transition-all duration-300 select-none overflow-hidden ${
                  orientation === "landscape" 
                    ? "w-[297mm] min-w-[297mm] h-[210mm] min-h-[210mm]" 
                    : "w-[210mm] min-w-[210mm] h-[297mm] min-h-[297mm]"
                }`}
                style={{
                  boxSizing: "border-box",
                  ...getBackgroundStyle()
                }}
              >
                {/* MARCA D'ÁGUA CENTRAL EM BRANDING SUAVE */}
                {showWatermark && logoUrl && (
                  <div 
                    className="absolute inset-0 flex items-center justify-center pointer-events-none z-0"
                    style={{ opacity: watermarkOpacity }}
                  >
                    <img src={logoUrl} alt="OBPC Watermark" className="w-[120mm] h-[120mm] object-contain" />
                  </div>
                )}

                {/* BORDAS ORNAMENTAIS DINÂMICAS */}
                {borderPattern !== "none" && (
                  <>
                    {/* Borda Externa Dupla */}
                    <div 
                      className={`absolute inset-3 border-4 ${borderPattern === "gold_double" ? "border-double" : "border-solid"} rounded-lg pointer-events-none z-10 flex flex-col justify-between p-3`}
                      style={{ borderColor: colorAccentBorder }}
                    >
                      {/* Cantos Filigranados com Simbologia */}
                      <div className="flex justify-between items-center text-xs font-mono font-bold" style={{ color: colorAccentBorder }}>
                        <span>❖</span>
                        <span className="text-[9px] tracking-widest uppercase font-serif">
                          {churchHeaderBranch.toUpperCase()}
                        </span>
                        <span>❖</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-mono font-bold" style={{ color: colorAccentBorder }}>
                        <span>❖</span>
                        <span className="text-[9px] tracking-widest uppercase font-serif">
                          DOCUMENTO ECLESIÁSTICO AUTÊNTICO • SECRETARIA GERAL
                        </span>
                        <span>❖</span>
                      </div>
                    </div>

                    {/* Borda Interna Fina Trastejada */}
                    <div 
                      className="absolute inset-5 border border-dashed rounded-md pointer-events-none z-10"
                      style={{ borderColor: `${colorAccentBorder}90` }}
                    />
                  </>
                )}

                {/* CONTEÚDO PRINCIPAL DO CERTIFICADO CENTRALIZADO */}
                <div className="relative z-20 h-full p-6 sm:p-10 flex flex-col justify-between items-center text-center">
                  
                  {/* CABEÇALHO DO DOCUMENTO: LOGO À ESQUERDA + DADOS À DIREITA (CONFORME REQUISITADO) */}
                  <div className="w-full flex flex-col items-center pt-1">
                    {headerLayout === "left_logo" ? (
                      /* CABEÇALHO COM LOGO À ESQUERDA E DADOS À SUA DIREITA */
                      <div className="w-full max-w-4xl flex items-center justify-center gap-5 sm:gap-7 pb-2.5 border-b border-slate-300/80">
                        {logoUrl ? (
                          <div className="shrink-0 flex items-center justify-center">
                            <img src={logoUrl} alt="Logo Church" className="h-16 sm:h-20 w-auto object-contain filter drop-shadow-xs" />
                          </div>
                        ) : null}
                        <div className="flex flex-col text-left justify-center min-w-0 flex-1">
                          <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-slate-800 font-serif leading-snug">
                            {churchName}
                          </h3>
                          <p className="text-[10px] sm:text-[11px] font-semibold text-slate-600 uppercase tracking-wider font-serif mt-0.5">
                            {churchHeaderBranch}
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* CABEÇALHO CENTRALIZADO TRADICIONAL */
                      <div className="w-full flex flex-col items-center space-y-1 pb-2 border-b border-slate-300/80">
                        {logoUrl && (
                          <div className="flex items-center justify-center mb-1">
                            <img src={logoUrl} alt="Logo Church" className="h-16 w-auto object-contain filter drop-shadow-xs" />
                          </div>
                        )}
                        <h3 className="text-xs sm:text-sm font-bold tracking-widest uppercase text-slate-800 font-serif">
                          {churchName}
                        </h3>
                        <p className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider font-serif">
                          {churchHeaderBranch}
                        </p>
                      </div>
                    )}

                    {/* TÍTULO PRINCIPAL SOLENE */}
                    <div className="pt-3 pb-1 relative text-center w-full">
                      <h1 
                        className="uppercase tracking-wider px-6 py-1 font-bold border-b-2 inline-block"
                        style={{
                          fontFamily: fontFamilyTitle,
                          fontSize: `${fontSizeTitle}px`,
                          color: colorTitle,
                          borderColor: colorAccentBorder,
                          ...getTextEffectStyle("title")
                        }}
                      >
                        {customTitle}
                      </h1>
                    </div>
                  </div>

                  {/* CORPO DO CERTIFICADO / CARTA */}
                  <div className="w-full max-w-3xl my-auto px-4 space-y-3">
                    <p 
                      className="text-xs sm:text-sm leading-relaxed text-slate-700 italic"
                      style={{ fontFamily: fontFamilyBody }}
                    >
                      {introPhrase}
                    </p>

                    {/* NOME DO CANDIDATO EM DESTAQUE NOBRE */}
                    <div className="py-2 border-b border-t border-slate-300/80">
                      <h2 
                        className="uppercase tracking-wide text-center"
                        style={{
                          fontFamily: fontFamilyName,
                          fontSize: `${fontSizeName}px`,
                          color: colorName,
                          ...getTextEffectStyle("name")
                        }}
                      >
                        {candidateName || "NOME DO CANDIDATO(A)"}
                      </h2>
                      {candidateRole && (
                        <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mt-1 font-serif">
                          {candidateRole}
                        </p>
                      )}
                    </div>

                    {/* TEXTO EXPLICATIVO DO CORPO DO CERTIFICADO */}
                    <p 
                      className="leading-relaxed text-justify sm:text-center"
                      style={{
                        fontFamily: fontFamilyBody,
                        fontSize: `${fontSizeBody}px`,
                        color: colorBody
                      }}
                    >
                      {customText}
                    </p>

                    {/* Detalhes de Filiação & Nascimento */}
                    {(fatherName || motherName || candidateBirthDate) && (
                      <p className="text-xs font-bold text-slate-800 uppercase tracking-wide font-serif">
                        {(fatherName || motherName) && `Filho(a) de: ${fatherName || "—"} ${motherName ? `e ${motherName}` : ""}`}
                        {candidateBirthDate && ` • Nascido(a) em: ${formatDateBR(candidateBirthDate)}`}
                      </p>
                    )}

                    {/* Registro Eclesiástico e Pastor Celebrante */}
                    {(bookNumber || pageNumber || recordNumber || celebrantPastor) && (
                      <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wider font-mono flex items-center justify-center gap-2 flex-wrap">
                        {bookNumber && <span>LIVRO: {bookNumber}</span>}
                        {pageNumber && <span>• FOLHA: {pageNumber}</span>}
                        {recordNumber && <span>• TERMO Nº: {recordNumber}</span>}
                        {celebrantPastor && <span>• CELEBRANTE: {celebrantPastor}</span>}
                      </div>
                    )}

                    {/* VERSÍCULO BÍBLICO BORDADO */}
                    {customVerse && (
                      <div 
                        className="p-2.5 rounded-lg border text-xs italic text-slate-800 max-w-2xl mx-auto shadow-2xs font-serif"
                        style={{
                          backgroundColor: "rgba(255,255,255,0.6)",
                          borderColor: `${colorAccentBorder}60`
                        }}
                      >
                        {customVerse}
                      </div>
                    )}
                  </div>

                  {/* RODAPÉ DO CERTIFICADO: LOCAL, DATA, SELO DOURADO 3D & ASSINATURAS DOS PARÂMETROS */}
                  <div className="w-full pt-3 border-t border-slate-300/80 flex items-end justify-between px-4 text-xs">
                    
                    {/* LOCAL E DATA */}
                    <div className="text-left font-serif text-slate-700">
                      <p className="font-semibold text-[11px]">{eventLocation},</p>
                      <p className="font-bold text-slate-900 text-xs">{formatDateBR(eventDate)}</p>
                    </div>

                    {/* SELO DOURADO DE RELEVO 3D / FITAS */}
                    {sealType !== "none" && (
                      <div className="flex flex-col items-center justify-center my-auto">
                        {sealType === "gold_3d" && (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 text-white shadow-lg flex flex-col items-center justify-center border-2 border-amber-200 text-[8.5px] font-black uppercase tracking-tighter p-1 text-center">
                            <Award className="w-5 h-5 mb-0.5 text-amber-200" />
                            <span>AUTÊNTICO</span>
                            <span className="text-[7px] text-amber-100 font-mono">OBPC</span>
                          </div>
                        )}

                        {sealType === "red_ribbon" && (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-600 via-rose-700 to-red-900 text-white shadow-lg flex flex-col items-center justify-center border-2 border-amber-300 text-[8.5px] font-black uppercase tracking-tighter p-1 text-center relative">
                            <Award className="w-5 h-5 mb-0.5 text-amber-300" />
                            <span>SELO OFICIAL</span>
                            <div className="absolute -bottom-2 w-10 h-3 bg-red-800 rounded-xs border-t border-amber-300 shadow-xs" />
                          </div>
                        )}

                        {sealType === "silver_badge" && (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-300 via-slate-400 to-slate-600 text-slate-950 shadow-lg flex flex-col items-center justify-center border-2 border-white text-[8.5px] font-black uppercase tracking-tighter p-1 text-center">
                            <ShieldCheck className="w-5 h-5 mb-0.5 text-slate-900" />
                            <span>REGISTRADO</span>
                          </div>
                        )}

                        {sealType === "emerald_seal" && (
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-800 text-white shadow-lg flex flex-col items-center justify-center border-2 border-emerald-200 text-[8.5px] font-black uppercase tracking-tighter p-1 text-center">
                            <Award className="w-5 h-5 mb-0.5 text-emerald-200" />
                            <span>COMUNHÃO</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ASSINATURAS VINDAS DIRETO DOS PARÂMETROS DA IGREJA */}
                    <div className="flex items-center gap-6 sm:gap-10">
                      {/* Assinante 1 (Pastor) */}
                      <div className="flex flex-col items-center text-center">
                        <div className="w-36 sm:w-44 border-b border-slate-800 mb-1 flex items-end justify-center min-h-[36px]">
                          {includeDigitalSignatures && pastorSignatureUrl ? (
                            <img src={pastorSignatureUrl} alt="Assinatura Pastor" className="h-10 mx-auto object-contain mb-0.5 max-w-[140px]" />
                          ) : (
                            <div className="h-6" />
                          )}
                        </div>
                        <span className="font-bold text-slate-900 text-[11px] font-serif">{pastorName}</span>
                        <span className="text-[9px] font-semibold text-slate-600 uppercase font-serif">{pastorTitle}</span>
                      </div>

                      {/* Assinante 2 (Secretário) */}
                      <div className="flex flex-col items-center text-center">
                        <div className="w-36 sm:w-44 border-b border-slate-800 mb-1 flex items-end justify-center min-h-[36px]">
                          {includeDigitalSignatures && secSignatureUrl ? (
                            <img src={secSignatureUrl} alt="Assinatura Secretária" className="h-10 mx-auto object-contain mb-0.5 max-w-[140px]" />
                          ) : (
                            <div className="h-6" />
                          )}
                        </div>
                        <span className="font-bold text-slate-900 text-[11px] font-serif">{secName}</span>
                        <span className="text-[9px] font-semibold text-slate-600 uppercase font-serif">{secTitle}</span>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Rodapé do Modal */}
        <DialogFooter className="border-t pt-2.5 shrink-0 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Certificado com layout oficial, assinaturas sincronizadas e suporte a modelos de fundo personalizados.
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
