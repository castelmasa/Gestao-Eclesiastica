import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Award,
  Heart,
  Baby,
  RotateCw,
  Printer,
  Download,
  Share2,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  User,
  Building2,
  Sparkles,
  Ruler,
  Plus,
  Minus,
  FileCheck2,
  Phone,
  Palette,
  Sliders,
  Check,
  Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";
import { getChurchLeadershipConfig } from "@/lib/churchConfigHelper";
import { removeImageBackground, getCachedTransparentLogo } from "@/lib/imageBackgroundRemover";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

interface CertidaoCartaoDigitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: any[];
  activeBranchName?: string;
  churchData?: any;
}

export interface CertidaoTheme {
  id: string;
  name: string;
  bgFrom: string;
  bgVia: string;
  bgTo: string;
  accentColor: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
}

const PRESET_THEMES: CertidaoTheme[] = [
  {
    id: "vinho_ouro",
    name: "Vinho Nobre & Ouro",
    bgFrom: "#450a0a",
    bgVia: "#2a0808",
    bgTo: "#09090b",
    accentColor: "#fbbf24",
    borderColor: "#d97706",
    textColor: "#fef3c7",
    badgeBg: "#f59e0b"
  },
  {
    id: "esmeralda_ouro",
    name: "Esmeralda & Ouro",
    bgFrom: "#064e3b",
    bgVia: "#022c22",
    bgTo: "#09090b",
    accentColor: "#facc15",
    borderColor: "#10b981",
    textColor: "#fef08a",
    badgeBg: "#10b981"
  },
  {
    id: "azul_ouro",
    name: "Azul Real & Ouro",
    bgFrom: "#0c4a6e",
    bgVia: "#082f49",
    bgTo: "#020617",
    accentColor: "#38bdf8",
    borderColor: "#0284c7",
    textColor: "#e0f2fe",
    badgeBg: "#0284c7"
  },
  {
    id: "preto_ouro",
    name: "Preto Gala & Ouro",
    bgFrom: "#18181b",
    bgVia: "#09090b",
    bgTo: "#000000",
    accentColor: "#fbbf24",
    borderColor: "#d97706",
    textColor: "#fef3c7",
    badgeBg: "#eab308"
  },
  {
    id: "rosa_ouro",
    name: "Pérola Rosé & Dourado",
    bgFrom: "#701a75",
    bgVia: "#4a044e",
    bgTo: "#09090b",
    accentColor: "#f472b6",
    borderColor: "#db2777",
    textColor: "#fce7f3",
    badgeBg: "#ec4899"
  },
  {
    id: "safira_prata",
    name: "Safira & Prata",
    bgFrom: "#1e3a8a",
    bgVia: "#172554",
    bgTo: "#020617",
    accentColor: "#e2e8f0",
    borderColor: "#94a3b8",
    textColor: "#ffffff",
    badgeBg: "#3b82f6"
  }
];

export function CertidaoCartaoDigitalModal({
  isOpen,
  onClose,
  members,
  activeBranchName = "Sede",
  churchData
}: CertidaoCartaoDigitalModalProps) {
  // Tipo de Certidão em Cartão: Casamento ou Apresentação de Crianças
  const [certType, setCertType] = useState<"casamento" | "apresentacao">("casamento");

  // Visualização ativa: Frente ou Verso
  const [activeSide, setActiveSide] = useState<"front" | "back">("front");

  // TEMA DE CORES SELECIONADO
  const [selectedThemeId, setSelectedThemeId] = useState<string>("vinho_ouro");
  const [customAccent, setCustomAccent] = useState<string>("#fbbf24");
  const [customBgFrom, setCustomBgFrom] = useState<string>("#450a0a");
  const [customBgTo, setCustomBgTo] = useState<string>("#09090b");

  // MODO DE HARMONIZAÇÃO DA LOGO DA IGREJA
  const [logoHarmonyMode, setLogoHarmonyMode] = useState<"accent" | "white" | "original">("accent");

  // Configurações de Liderança e Assinaturas
  const leadership = useMemo(() => getChurchLeadershipConfig(), []);

  // Dados para Casamento
  const [groomName, setGroomName] = useState("Lucas Gabriel Ferreira");
  const [brideName, setBrideName] = useState("Larissa Mendes de Carvalho");
  const [marriageDate, setMarriageDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [marriageRegister, setMarriageRegister] = useState("Livro 03 • Fls. 14 • Termo 182");
  const [marriageWitnesses, setMarriageWitnesses] = useState("Carlos Eduardo & Maria Silva");
  const [marriagePastor, setMarriagePastor] = useState(leadership.pastorPresidente.name || "Pr. Manoel Messias de Menezes");
  const [marriageChurch, setMarriageChurch] = useState("Templo Sede • O Brasil para Cristo");

  // Dados para Apresentação de Crianças
  const [childName, setChildName] = useState("Davi Lucas Ferreira Silva");
  const [childBirthDate, setChildBirthDate] = useState("12/03/2024");
  const [childPresentationDate, setChildPresentationDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [childParents, setChildParents] = useState("Lucas Gabriel Ferreira e Larissa Mendes");
  const [childGodparents, setChildGodparents] = useState("João Batista & Ana Lúcia Barbosa");
  const [childPastor, setChildPastor] = useState(leadership.pastorLocal.name || "Pr. Carlito Carvalho Rodrigues");
  const [childRegister, setChildRegister] = useState("Livro 02 • Fls. 89 • Registro 405");

  // Dimensões do Cartão em Milímetros (Padrão 86x54mm ajustável)
  const [cardWidthMm, setCardWidthMm] = useState<number>(86);
  const [cardHeightMm, setCardHeightMm] = useState<number>(54);

  // Logo Oficial Cadastrado nos Parâmetros
  const rawLogoUrl = useMemo(() => getRegisteredChurchLogo(activeBranchName), [activeBranchName]);
  const [cleanLogoUrl, setCleanLogoUrl] = useState<string | null>(() => getCachedTransparentLogo(rawLogoUrl) || null);

  // Remove automaticamente qualquer fundo branco/sólido da logo em alta fidelidade
  useEffect(() => {
    let isMounted = true;
    if (!rawLogoUrl) {
      setCleanLogoUrl(null);
      return;
    }
    const cached = getCachedTransparentLogo(rawLogoUrl);
    if (cached) {
      setCleanLogoUrl(cached);
      return;
    }
    removeImageBackground(rawLogoUrl).then(url => {
      if (isMounted) setCleanLogoUrl(url);
    });
    return () => { isMounted = false; };
  }, [rawLogoUrl]);

  // Tema ativo
  const activeTheme = useMemo(() => {
    const preset = PRESET_THEMES.find(t => t.id === selectedThemeId);
    if (preset) return preset;
    return {
      id: "custom",
      name: "Personalizado",
      bgFrom: customBgFrom,
      bgVia: customBgFrom,
      bgTo: customBgTo,
      accentColor: customAccent,
      borderColor: customAccent,
      textColor: "#ffffff",
      badgeBg: customAccent
    };
  }, [selectedThemeId, customBgFrom, customBgTo, customAccent]);

  // Proporções calculadas
  const widthRatio = cardWidthMm / 86;
  const heightRatio = cardHeightMm / 54;
  const avgScale = Math.min(widthRatio, heightRatio);

  const formatIsoDate = (d: string) => {
    if (!d) return "";
    if (d.includes("-")) {
      const parts = d.split("-");
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return d;
  };

  const validationCode = useMemo(() => {
    const prefix = certType === "casamento" ? "CAS" : "APR";
    const raw = `${groomName || childName}_${marriageDate || childPresentationDate}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `${prefix}-${Math.abs(hash).toString(16).toUpperCase().padStart(8, "0")}`;
  }, [certType, groomName, brideName, childName, marriageDate, childPresentationDate]);

  const qrValidationUrl = `https://valida.obpc.com.br/certidao?code=${validationCode}&tipo=${certType}`;

  // Referência para impressão
  const printableSheetRef = useRef<HTMLDivElement>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // IMPRESSÃO A4 DIRETA VIA IFRAME
  const handlePrintSheet = () => {
    const el = printableSheetRef.current;
    if (!el) {
      toast.error("Área de impressão não encontrada.");
      return;
    }

    try {
      const iframeId = "__certidao_cartao_iframe__";
      let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = iframeId;
        iframe.style.position = "fixed";
        iframe.style.top = "-9999px";
        iframe.style.left = "-9999px";
        iframe.style.width = "297mm";
        iframe.style.height = "210mm";
        iframe.style.border = "none";
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Certidao_Cartao_${certType}_${validationCode}</title>
            <style>
              @page {
                size: A4 landscape;
                margin: 6mm !important;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                margin: 0;
                padding: 4mm;
                background: #ffffff;
                color: #0f172a;
                font-family: Arial, Helvetica, sans-serif;
              }
            </style>
          </head>
          <body>
            ${el.innerHTML}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
          toast.success("Diálogo de impressão aberto!");
        } catch {
          window.print();
        }
      }, 350);
    } catch (e) {
      console.warn("Print error, downloading PDF fallback:", e);
      handleDownloadPdf();
    }
  };

  // BAIXAR PDF A4 DOBRÁVEL
  const handleDownloadPdf = async () => {
    const el = printableSheetRef.current;
    if (!el) return;

    setIsExportingPdf(true);
    const toastId = toast.loading("Gerando PDF A4 do Cartão Digital...");

    try {
      const imgData = await toPng(el, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      pdf.addImage(imgData, "PNG", 0, 0, 297, 210);
      pdf.save(`Cartao_Digital_${certType.toUpperCase()}_${validationCode}.pdf`);
      toast.success("PDF baixado com sucesso!", { id: toastId });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Falha ao gerar PDF.", { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleShareWhatsApp = () => {
    let msg = "";
    if (certType === "casamento") {
      msg = `💍 *CERTIDÃO DE CASAMENTO RELIGIOSO EM CARTÃO DIGITAL*
🏛 *Igreja:* ${churchData?.nome || "O Brasil para Cristo"}
👰 *Esposa:* ${brideName}
🤵 *Esposo:* ${groomName}
📅 *Data da Celebração:* ${formatIsoDate(marriageDate)}
📜 *Registro Eclesiástico:* ${marriageRegister}
✝️ *Celebrante:* ${marriagePastor}
🔒 *Código de Autenticidade:* ${validationCode}
🌐 *Validação Digital:* ${qrValidationUrl}

_"Assim não são mais dois, mas uma só carne. O que Deus uniu, não o separe o homem." - Mt 19:6_`;
    } else {
      msg = `👶 *CERTIDÃO DE APRESENTAÇÃO DE CRIANÇA EM CARTÃO DIGITAL*
🏛 *Igreja:* ${churchData?.nome || "O Brasil para Cristo"}
👶 *Criança:* ${childName}
👨‍👩‍👦 *Pais:* ${childParents}
📅 *Nascimento:* ${childBirthDate}
✝️ *Data de Apresentação:* ${formatIsoDate(childPresentationDate)}
📜 *Registro:* ${childRegister}
🕊️ *Pastor Celebrante:* ${childPastor}
🔒 *Código de Autenticidade:* ${validationCode}
🌐 *Validação Digital:* ${qrValidationUrl}

_"Deixai vir a mim as criancinhas e não as impeçais, pois delas é o Reino de Deus." - Mc 10:14_`;
    }
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // Renderizador do Logo com Fundo Transparente e Harmonização Cromática
  const renderHarmonizedLogo = (sizePx: number = 36) => {
    const src = cleanLogoUrl || rawLogoUrl;
    if (!src) {
      return (
        <div
          className="rounded-full flex items-center justify-center font-bold text-xs shrink-0"
          style={{
            width: `${sizePx}px`,
            height: `${sizePx}px`,
            backgroundColor: `${activeTheme.accentColor}25`,
            color: activeTheme.accentColor,
            border: `1px solid ${activeTheme.accentColor}50`
          }}
        >
          OBPC
        </div>
      );
    }

    let filterStyle: React.CSSProperties = {
      width: `${sizePx}px`,
      height: `${sizePx}px`,
      objectFit: "contain",
      flexShrink: 0,
      backgroundColor: "transparent",
      display: "block"
    };

    if (logoHarmonyMode === "accent") {
      // Aplica tom dourado ou harmonizado com os acentos
      filterStyle = {
        ...filterStyle,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))",
      };
    } else if (logoHarmonyMode === "white") {
      filterStyle = {
        ...filterStyle,
        filter: "brightness(0) invert(1) drop-shadow(0 1px 3px rgba(0,0,0,0.5))",
      };
    } else {
      // Cores originais sem fundo
      filterStyle = {
        ...filterStyle,
        filter: "drop-shadow(0 1px 3px rgba(0,0,0,0.4))",
      };
    }

    return (
      <img
        src={src}
        alt="Logo Oficial da Igreja"
        style={filterStyle}
      />
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-slate-800">
        {/* Cabeçalho do Modal */}
        <div
          className="p-6 text-white border-b transition-colors"
          style={{
            background: `linear-gradient(135deg, ${activeTheme.bgFrom} 0%, ${activeTheme.bgVia} 50%, ${activeTheme.bgTo} 100%)`,
            borderBottomColor: `${activeTheme.borderColor}60`
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl ring-1 ring-white/20 shadow-inner">
                {certType === "casamento" ? (
                  <Heart className="w-7 h-7" style={{ color: activeTheme.accentColor }} />
                ) : (
                  <Baby className="w-7 h-7" style={{ color: activeTheme.accentColor }} />
                )}
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  {certType === "casamento"
                    ? "Certidão de Casamento em Cartão Digital"
                    : "Certidão de Apresentação em Cartão Digital"}
                  <Badge className="bg-white/20 text-white border-white/30 text-xs font-bold">
                    PADRÃO CRACHÁ / CREDENCIAL
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-white/80 text-sm mt-0.5">
                  Frente e verso giratório, logo sem fundo dos parâmetros, código de registro e validação por QR Code.
                </DialogDescription>
              </div>
            </div>

            {/* Alternador de Tipo de Certidão */}
            <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/15">
              <button
                type="button"
                onClick={() => setCertType("casamento")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  certType === "casamento"
                    ? "bg-amber-400 text-slate-950 shadow-sm"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                Casamento
              </button>
              <button
                type="button"
                onClick={() => setCertType("apresentacao")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  certType === "apresentacao"
                    ? "bg-sky-400 text-slate-950 shadow-sm"
                    : "text-white/80 hover:text-white"
                }`}
              >
                <Baby className="w-3.5 h-3.5" />
                Apresentação Bebês
              </button>
            </div>
          </div>
        </div>

        {/* Corpo com Configurações e Visualização Interativa do Cartão */}
        <div className="p-6 bg-slate-50 dark:bg-slate-950 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna Esquerda: Cores, Parâmetros e Formulário (5 colunas) */}
          <div className="lg:col-span-5 space-y-4">
            {/* SELETOR DE CORES & HARMONIZAÇÃO DA LOGO */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-emerald-600" />
                  Personalizar Paleta de Cores:
                </Label>
                <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50">
                  {activeTheme.name}
                </Badge>
              </div>

              {/* Botões dos Temas Predefinidos */}
              <div className="grid grid-cols-3 gap-2">
                {PRESET_THEMES.map(th => {
                  const isSelected = selectedThemeId === th.id;
                  return (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => setSelectedThemeId(th.id)}
                      className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? "border-emerald-500 ring-2 ring-emerald-500/30 bg-slate-50 dark:bg-slate-800"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <div
                          className="w-4 h-4 rounded-full border shadow-xs"
                          style={{
                            background: `linear-gradient(135deg, ${th.bgFrom}, ${th.accentColor})`
                          }}
                        />
                        <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200 truncate">
                          {th.name.split("&")[0]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: th.accentColor }} />
                        {isSelected && <Check className="w-3 h-3 text-emerald-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Harmonização da Logo da Igreja (Puxada dos Parâmetros e Sem Fundo) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                  <span>Logo dos Parâmetros (Sem Fundo Branco):</span>
                  <span className="text-[10px] text-emerald-600 font-normal">Fundo 100% Transparente</span>
                </Label>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setLogoHarmonyMode("accent")}
                    className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${
                      logoHarmonyMode === "accent"
                        ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-bold"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Dourado / Acento
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoHarmonyMode("white")}
                    className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${
                      logoHarmonyMode === "white"
                        ? "border-slate-500 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-bold"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Branco Puro
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoHarmonyMode("original")}
                    className={`p-2 rounded-lg border text-xs font-medium text-center transition-all ${
                      logoHarmonyMode === "original"
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-bold"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Cores Originais
                  </button>
                </div>
              </div>
            </div>

            {/* Ajuste de Dimensões Físicas (Largura x Altura) */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Ruler className="w-4 h-4 text-emerald-600" />
                  Dimensões do Cartão:
                </Label>
                <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-300">
                  Válido Frente e Verso
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center text-xs font-semibold mb-1">
                    <span>Largura:</span>
                    <span className="text-emerald-700 font-bold">{cardWidthMm} mm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCardWidthMm(w => Math.max(50, w - 1))}
                      className="w-7 h-7 rounded bg-white dark:bg-slate-700 border border-slate-300 text-xs font-bold hover:bg-slate-100 flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={cardWidthMm}
                      onChange={e => setCardWidthMm(Number(e.target.value) || 86)}
                      className="w-full text-center text-xs font-bold h-7 bg-white dark:bg-slate-900 border rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setCardWidthMm(w => Math.min(150, w + 1))}
                      className="w-7 h-7 rounded bg-white dark:bg-slate-700 border border-slate-300 text-xs font-bold hover:bg-slate-100 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center text-xs font-semibold mb-1">
                    <span>Altura:</span>
                    <span className="text-emerald-700 font-bold">{cardHeightMm} mm</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCardHeightMm(h => Math.max(40, h - 1))}
                      className="w-7 h-7 rounded bg-white dark:bg-slate-700 border border-slate-300 text-xs font-bold hover:bg-slate-100 flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={cardHeightMm}
                      onChange={e => setCardHeightMm(Number(e.target.value) || 54)}
                      className="w-full text-center text-xs font-bold h-7 bg-white dark:bg-slate-900 border rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setCardHeightMm(h => Math.min(120, h + 1))}
                      className="w-7 h-7 rounded bg-white dark:bg-slate-700 border border-slate-300 text-xs font-bold hover:bg-slate-100 flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulário dos Dados Conforme a Certidão */}
            {certType === "casamento" ? (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-rose-600" />
                  Dados da Celebração Matrimonial
                </h4>

                <div className="space-y-1">
                  <Label className="text-xs">Nome do Noivo (Esposo):</Label>
                  <Input
                    value={groomName}
                    onChange={e => setGroomName(e.target.value)}
                    placeholder="Nome completo do esposo"
                    className="h-8 text-xs font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Nome da Noiva (Esposa):</Label>
                  <Input
                    value={brideName}
                    onChange={e => setBrideName(e.target.value)}
                    placeholder="Nome completo da esposa"
                    className="h-8 text-xs font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Data da Celebração:</Label>
                    <Input
                      type="date"
                      value={marriageDate}
                      onChange={e => setMarriageDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Registro / Livro:</Label>
                    <Input
                      value={marriageRegister}
                      onChange={e => setMarriageRegister(e.target.value)}
                      placeholder="Livro 03 Fls 14"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Padrinhos / Testemunhas:</Label>
                  <Input
                    value={marriageWitnesses}
                    onChange={e => setMarriageWitnesses(e.target.value)}
                    placeholder="Ex: Carlos Eduardo & Maria Silva"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Pastor Celebrante:</Label>
                  <Input
                    value={marriagePastor}
                    onChange={e => setMarriagePastor(e.target.value)}
                    placeholder="Nome do Pastor Celebrante"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Baby className="w-4 h-4 text-sky-600" />
                  Dados da Apresentação de Criança
                </h4>

                <div className="space-y-1">
                  <Label className="text-xs">Nome Completo da Criança:</Label>
                  <Input
                    value={childName}
                    onChange={e => setChildName(e.target.value)}
                    placeholder="Nome do bebê / criança"
                    className="h-8 text-xs font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Data de Nascimento:</Label>
                    <Input
                      value={childBirthDate}
                      onChange={e => setChildBirthDate(e.target.value)}
                      placeholder="DD/MM/AAAA"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Data de Apresentação:</Label>
                    <Input
                      type="date"
                      value={childPresentationDate}
                      onChange={e => setChildPresentationDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Filiação (Pais):</Label>
                  <Input
                    value={childParents}
                    onChange={e => setChildParents(e.target.value)}
                    placeholder="Nome do pai e da mãe"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Padrinhos / Consagradores:</Label>
                  <Input
                    value={childGodparents}
                    onChange={e => setChildGodparents(e.target.value)}
                    placeholder="Nome dos padrinhos"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Pastor Celebrante:</Label>
                    <Input
                      value={childPastor}
                      onChange={e => setChildPastor(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Livro / Registro:</Label>
                    <Input
                      value={childRegister}
                      onChange={e => setChildRegister(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Ações de Compartilhamento, Impressão e PDF */}
            <div className="flex items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="flex-1 border-emerald-600 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 text-xs font-semibold gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar PDF A4
              </Button>
              <Button
                type="button"
                onClick={handlePrintSheet}
                className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold gap-1.5 shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir A4
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleShareWhatsApp}
                className="border-emerald-500/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 text-xs gap-1"
                title="Compartilhar no WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              </Button>
            </div>
          </div>

          {/* Coluna Direita: Preview Interativo Frente & Verso do Cartão (7 colunas) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-200/50 dark:bg-slate-900/40 p-6 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
            {/* Controles do Cartão */}
            <div className="w-full flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={activeSide === "front" ? "default" : "outline"}
                  onClick={() => setActiveSide("front")}
                  className={activeSide === "front" ? "bg-slate-900 text-white" : ""}
                >
                  Frente do Cartão
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={activeSide === "back" ? "default" : "outline"}
                  onClick={() => setActiveSide("back")}
                  className={activeSide === "back" ? "bg-slate-900 text-white" : ""}
                >
                  Verso (QR Code)
                </Button>
              </div>

              <button
                type="button"
                onClick={() => setActiveSide(s => (s === "front" ? "back" : "front"))}
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-emerald-600 flex items-center gap-1.5 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border shadow-xs"
              >
                <RotateCw className="w-3.5 h-3.5" />
                Girar Cartão
              </button>
            </div>

            {/* O Cartão Digital Renderizado com Dimensionamento em Proporção Fiel */}
            <div
              onClick={() => setActiveSide(s => (s === "front" ? "back" : "front"))}
              className="cursor-pointer transition-transform duration-300 hover:scale-[1.01] shadow-2xl rounded-2xl overflow-hidden relative"
              style={{
                width: `${cardWidthMm * 4.8}px`,
                height: `${cardHeightMm * 4.8}px`,
                maxWidth: "100%",
                background: `linear-gradient(135deg, ${activeTheme.bgFrom} 0%, ${activeTheme.bgVia} 50%, ${activeTheme.bgTo} 100%)`,
                border: `2px solid ${activeTheme.borderColor}`,
              }}
            >
              {/* CASAMENTO - FRENTE */}
              {certType === "casamento" && activeSide === "front" && (
                <div className="w-full h-full text-white p-5 flex flex-col justify-between relative select-none">
                  {/* Topo: Logo sem fundo e harmonizado */}
                  <div className="flex items-center justify-between relative z-10 border-b pb-2" style={{ borderColor: `${activeTheme.borderColor}40` }}>
                    <div className="flex items-center gap-2.5">
                      {renderHarmonizedLogo(36)}
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: activeTheme.accentColor }}>
                          {churchData?.nome || "IGREJA O BRASIL PARA CRISTO"}
                        </div>
                        <div className="text-[8px] text-white/80 uppercase">
                          {marriageChurch} • {activeBranchName}
                        </div>
                      </div>
                    </div>
                    <Badge
                      className="font-black text-[9px] px-2 py-0.5 border-none text-slate-950"
                      style={{ backgroundColor: activeTheme.badgeBg }}
                    >
                      OFICIAL
                    </Badge>
                  </div>

                  {/* Centro: Título e Nomes dos Noivos */}
                  <div className="text-center my-auto py-2 relative z-10">
                    <div className="text-[10px] tracking-widest uppercase font-bold mb-1 flex items-center justify-center gap-1.5" style={{ color: activeTheme.accentColor }}>
                      <Heart className="w-3 h-3 fill-current" />
                      CERTIDÃO DE CASAMENTO RELIGIOSO
                      <Heart className="w-3 h-3 fill-current" />
                    </div>

                    <div className="text-lg font-black tracking-tight text-white leading-tight mt-1">
                      {groomName}
                    </div>
                    <div className="text-xs font-semibold my-0.5" style={{ color: activeTheme.accentColor }}>&</div>
                    <div className="text-lg font-black tracking-tight text-white leading-tight">
                      {brideName}
                    </div>

                    <div className="text-[9px] text-white/80 mt-2 font-medium">
                      Unidos perante Deus e a Igreja em {formatIsoDate(marriageDate)}
                    </div>
                  </div>

                  {/* Rodapé da Frente */}
                  <div className="flex items-end justify-between border-t pt-2 text-[9px] relative z-10" style={{ borderColor: `${activeTheme.borderColor}40` }}>
                    <div>
                      <div className="font-semibold text-white">Registro Eclesiástico:</div>
                      <div className="font-mono text-[8px]" style={{ color: activeTheme.accentColor }}>{marriageRegister}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] uppercase" style={{ color: activeTheme.accentColor }}>Autenticidade</div>
                      <div className="font-mono font-bold text-white text-[9px]">{validationCode}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* CASAMENTO - VERSO */}
              {certType === "casamento" && activeSide === "back" && (
                <div className="w-full h-full bg-slate-900 text-white p-5 flex flex-col justify-between relative select-none">
                  <div className="text-center border-b border-white/10 pb-2">
                    <div className="text-[8px] italic leading-snug" style={{ color: activeTheme.textColor }}>
                      "Assim não são mais dois, mas uma só carne. Portanto, o que Deus ajuntou, não o separe o homem."
                    </div>
                    <div className="text-[8px] font-bold mt-0.5" style={{ color: activeTheme.accentColor }}>MATEUS 19:6</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-center my-auto py-1">
                    <div className="col-span-2 space-y-1.5 text-[9px]">
                      <div>
                        <span className="font-bold block text-[8px] uppercase" style={{ color: activeTheme.accentColor }}>
                          Testemunhas / Padrinhos:
                        </span>
                        <span className="text-white font-medium text-[9px] leading-tight block">
                          {marriageWitnesses}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold block text-[8px] uppercase" style={{ color: activeTheme.accentColor }}>
                          Pastor Celebrante:
                        </span>
                        <span className="text-white font-semibold text-[9px] block">
                          {marriagePastor}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold block text-[8px] uppercase" style={{ color: activeTheme.accentColor }}>
                          Local da Cerimônia:
                        </span>
                        <span className="text-slate-300 text-[8px] block">
                          {marriageChurch}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl shadow-md">
                      <QRCodeSVG value={qrValidationUrl} size={64} level="M" />
                      <div className="text-[7px] font-bold text-slate-900 mt-1 uppercase tracking-tighter">
                        VALIDAR DIGITAL
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 pt-1.5 text-[8px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>Documento Eclesiástico Oficial</span>
                    </div>
                    <span className="font-mono font-bold" style={{ color: activeTheme.accentColor }}>{validationCode}</span>
                  </div>
                </div>
              )}

              {/* APRESENTAÇÃO DE CRIANÇAS - FRENTE */}
              {certType === "apresentacao" && activeSide === "front" && (
                <div className="w-full h-full text-white p-5 flex flex-col justify-between relative select-none">
                  <div className="flex items-center justify-between relative z-10 border-b pb-2" style={{ borderColor: `${activeTheme.borderColor}40` }}>
                    <div className="flex items-center gap-2.5">
                      {renderHarmonizedLogo(36)}
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: activeTheme.accentColor }}>
                          {churchData?.nome || "IGREJA O BRASIL PARA CRISTO"}
                        </div>
                        <div className="text-[8px] text-white/80 uppercase">
                          DEPARTAMENTO DE CRIANÇAS • {activeBranchName}
                        </div>
                      </div>
                    </div>
                    <Badge
                      className="font-black text-[9px] px-2 py-0.5 border-none text-slate-950"
                      style={{ backgroundColor: activeTheme.badgeBg }}
                    >
                      REGISTRO
                    </Badge>
                  </div>

                  <div className="text-center my-auto py-2 relative z-10">
                    <div className="text-[10px] tracking-widest uppercase font-bold mb-1 flex items-center justify-center gap-1.5" style={{ color: activeTheme.accentColor }}>
                      <Baby className="w-3 h-3" />
                      CERTIDÃO DE APRESENTAÇÃO DE CRIANÇA
                    </div>

                    <div className="text-xl font-black tracking-tight text-white leading-tight mt-1">
                      {childName}
                    </div>

                    <div className="text-[10px] text-white/90 mt-2 font-medium">
                      Filho(a) de: <span className="font-semibold text-white">{childParents}</span>
                    </div>

                    <div className="text-[9px] text-slate-300 mt-0.5">
                      Nascido(a) em: {childBirthDate} • Apresentado(a) ao Senhor em: {formatIsoDate(childPresentationDate)}
                    </div>
                  </div>

                  <div className="flex items-end justify-between border-t pt-2 text-[9px] relative z-10" style={{ borderColor: `${activeTheme.borderColor}40` }}>
                    <div>
                      <div className="font-semibold text-white">Livro de Registro:</div>
                      <div className="font-mono text-[8px]" style={{ color: activeTheme.accentColor }}>{childRegister}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[8px] uppercase" style={{ color: activeTheme.accentColor }}>Autenticidade</div>
                      <div className="font-mono font-bold text-white text-[9px]">{validationCode}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* APRESENTAÇÃO DE CRIANÇAS - VERSO */}
              {certType === "apresentacao" && activeSide === "back" && (
                <div className="w-full h-full bg-slate-900 text-white p-5 flex flex-col justify-between relative select-none">
                  <div className="text-center border-b border-white/10 pb-2">
                    <div className="text-[8px] italic leading-snug" style={{ color: activeTheme.textColor }}>
                      "Deixai vir a mim as criancinhas e não as impeçais, porque das tais é o Reino de Deus."
                    </div>
                    <div className="text-[8px] font-bold mt-0.5" style={{ color: activeTheme.accentColor }}>MARCOS 10:14</div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-center my-auto py-1">
                    <div className="col-span-2 space-y-1.5 text-[9px]">
                      <div>
                        <span className="font-bold block text-[8px] uppercase" style={{ color: activeTheme.accentColor }}>
                          Padrinhos / Consagradores:
                        </span>
                        <span className="text-white font-medium text-[9px] block">
                          {childGodparents}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold block text-[8px] uppercase" style={{ color: activeTheme.accentColor }}>
                          Pastor Celebrante:
                        </span>
                        <span className="text-white font-semibold text-[9px] block">
                          {childPastor}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold block text-[8px] uppercase" style={{ color: activeTheme.accentColor }}>
                          Congregação:
                        </span>
                        <span className="text-slate-300 text-[8px] block">
                          {activeBranchName} • {churchData?.cidade || "Valparaíso/SP"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl shadow-md">
                      <QRCodeSVG value={qrValidationUrl} size={64} level="M" />
                      <div className="text-[7px] font-bold text-slate-900 mt-1 uppercase tracking-tighter">
                        VALIDAR DIGITAL
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/10 pt-1.5 text-[8px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-sky-400" />
                      <span>Consagração & Dedicação ao Senhor</span>
                    </div>
                    <span className="font-mono font-bold" style={{ color: activeTheme.accentColor }}>{validationCode}</span>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-slate-500 mt-3 flex items-center gap-1">
              <RotateCw className="w-3 h-3 text-slate-400" />
              Clique no cartão para girar entre a Frente e o Verso com QR Code
            </p>
          </div>
        </div>

        {/* CONTAINER DE IMPRESSÃO A4 DOBRÁVEL (RENDERIZADO FIXO OFFSCREEN PARA TOTAL CAPTURA) */}
        <div
          style={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            width: "297mm",
            minHeight: "210mm",
            backgroundColor: "#ffffff",
            color: "#0f172a",
            zIndex: -100,
            visibility: "visible",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          <div
            ref={printableSheetRef}
            id="certidao-cartao-print-area"
            style={{
              padding: "12mm 10mm",
              backgroundColor: "#ffffff",
              width: "297mm",
              minHeight: "210mm",
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            <div style={{ textAlign: "center", fontSize: "11px", fontWeight: "bold", color: "#64748b", marginBottom: "16px", textTransform: "uppercase", letterSpacing: "1px" }}>
              ✂ Linha de Corte e Dobra • Padrão Crachá ({cardWidthMm} × {cardHeightMm} mm)
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed #94a3b8", borderRadius: "12px", padding: "12px", backgroundColor: "#f8fafc" }}>
              {/* Frente Impressa */}
              <div
                style={{
                  width: `${cardWidthMm}mm`,
                  height: `${cardHeightMm}mm`,
                  boxSizing: "border-box",
                  padding: "10px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  color: "#ffffff",
                  background: `linear-gradient(135deg, ${activeTheme.bgFrom}, ${activeTheme.bgTo})`,
                  borderRight: "2px dashed #94a3b8"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${activeTheme.accentColor}50`, paddingBottom: "4px" }}>
                  <div style={{ fontSize: "7.5px", fontWeight: "bold", textTransform: "uppercase", color: activeTheme.accentColor }}>
                    {churchData?.nome || "O BRASIL PARA CRISTO"}
                  </div>
                  <div style={{ fontSize: "7px", color: "#ffffff", backgroundColor: activeTheme.badgeBg, padding: "1px 4px", borderRadius: "2px", fontWeight: "bold" }}>
                    OFICIAL
                  </div>
                </div>

                <div style={{ textAlign: "center", margin: "auto 0" }}>
                  <div style={{ fontSize: "7px", textTransform: "uppercase", fontWeight: "bold", color: activeTheme.accentColor }}>
                    {certType === "casamento" ? "CERTIDÃO DE CASAMENTO" : "CERTIDÃO DE APRESENTAÇÃO"}
                  </div>
                  <div style={{ fontSize: "11px", fontWeight: "900", color: "#ffffff", marginTop: "3px", lineHeight: "1.2" }}>
                    {certType === "casamento" ? `${groomName} & ${brideName}` : childName}
                  </div>
                  <div style={{ fontSize: "7px", color: "#e2e8f0", marginTop: "3px" }}>
                    {certType === "casamento"
                      ? `Data: ${formatIsoDate(marriageDate)}`
                      : `Nasc: ${childBirthDate} • Apresentação: ${formatIsoDate(childPresentationDate)}`}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "6.5px", borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "4px", color: "#cbd5e1" }}>
                  <span>Reg: {certType === "casamento" ? marriageRegister : childRegister}</span>
                  <span>{validationCode}</span>
                </div>
              </div>

              {/* Verso Impresso com QR Code */}
              <div
                style={{
                  width: `${cardWidthMm}mm`,
                  height: `${cardHeightMm}mm`,
                  boxSizing: "border-box",
                  padding: "10px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  backgroundColor: "#0f172a",
                  color: "#ffffff"
                }}
              >
                <div style={{ textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: "4px", fontSize: "6.5px", fontStyle: "italic", color: activeTheme.textColor }}>
                  {certType === "casamento"
                    ? '"Assim não são mais dois, mas uma só carne." - Mt 19:6'
                    : '"Deixai vir a mim as criancinhas." - Mc 10:14'}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "6px", alignItems: "center", margin: "auto 0" }}>
                  <div style={{ fontSize: "6.5px", display: "flex", flexDirection: "column", gap: "3px" }}>
                    <div>
                      <strong style={{ color: activeTheme.accentColor }}>Celebrante:</strong> {certType === "casamento" ? marriagePastor : childPastor}
                    </div>
                    <div>
                      <strong style={{ color: activeTheme.accentColor }}>Padrinhos:</strong> {certType === "casamento" ? marriageWitnesses : childGodparents}
                    </div>
                    <div>
                      <strong style={{ color: activeTheme.accentColor }}>Local:</strong> {activeBranchName}
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", backgroundColor: "#ffffff", padding: "3px", borderRadius: "4px" }}>
                    <QRCodeSVG value={qrValidationUrl} size={42} />
                    <span style={{ fontSize: "5px", color: "#0f172a", fontWeight: "bold", marginTop: "2px" }}>VALIDAR</span>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "6.5px", color: "#94a3b8", borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: "4px" }}>
                  <span>Documento Eclesiástico</span>
                  <span>{validationCode}</span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: "10px", color: "#64748b", marginTop: "16px", textAlign: "center" }}>
              Dobre na linha central pontilhada após o recorte para obter o crachá oficial frente e verso.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
