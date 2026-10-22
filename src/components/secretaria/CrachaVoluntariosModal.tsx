import React, { useState, useMemo, useRef, useEffect } from "react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  IdCard,
  Printer,
  Download,
  Share2,
  Users,
  User,
  Upload,
  Camera,
  Check,
  RotateCcw,
  Sparkles,
  QrCode,
  ShieldCheck,
  Eye,
  Sliders,
  ChevronRight,
  Layers,
  Palette,
  FileImage,
  Maximize2,
  CheckCircle2,
  Info,
  ExternalLink,
  Paintbrush
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { printDocument, downloadElementAsPdf } from "@/lib/printUtils";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";

export interface CrachaItem {
  id: string;
  name: string;
  role: string;
  department?: string;
  matricula?: string;
  photoUrl?: string;
  phone?: string;
  themeColor?: string;
  validity?: string;
}

interface CrachaVoluntariosModalProps {
  isOpen: boolean;
  onClose: () => void;
  volunteers?: Array<{ id: string; name: string; role?: string; phone?: string }>;
  churchData?: any;
  activeBranchName?: string;
  activeBranchId?: string;
  responsibleRole?: string;
  responsibleName?: string;
}

// 10 Paletas de Cores Nobres + Suporte a Cores Personalizadas
export const COLOR_THEMES = [
  { id: "navy", name: "Azul Marinho Real (Diáconos)", primary: "#1E3A8A", badge: "#2563EB", text: "#FFFFFF" },
  { id: "wine", name: "Vinho Nobre (Diaconisas)", primary: "#831843", badge: "#BE185D", text: "#FFFFFF" },
  { id: "brown_gold", name: "Marrom Café & Ouro (Tradição OBPC)", primary: "#451A03", badge: "#D97706", text: "#FFFFFF" },
  { id: "emerald", name: "Verde Esmeralda (Recepção & Apoio)", primary: "#065F46", badge: "#059669", text: "#FFFFFF" },
  { id: "green_forest", name: "Verde Militar / Floresta", primary: "#14532D", badge: "#16A34A", text: "#FFFFFF" },
  { id: "black_gold", name: "Preto Nobre & Dourado (Diretoria Eclesiástica)", primary: "#0F172A", badge: "#B45309", text: "#FFFFFF" },
  { id: "purple_royal", name: "Roxo Imperial (Presbitério & Pastor)", primary: "#581C87", badge: "#9333EA", text: "#FFFFFF" },
  { id: "petrol_blue", name: "Azul Petróleo & Prata", primary: "#0E7490", badge: "#0284C7", text: "#FFFFFF" },
  { id: "carmine_red", name: "Vermelho Carmim Nobre", primary: "#991B1B", badge: "#DC2626", text: "#FFFFFF" },
  { id: "slate_lead", name: "Cinza Chumbo & Grafite", primary: "#1F2937", badge: "#4B5563", text: "#FFFFFF" },
  { id: "custom", name: "🎨 Cores Personalizadas (Manual)", primary: "#1E3A8A", badge: "#D97706", text: "#FFFFFF" }
];

// Presets de Dimensões para Crachá
export const BADGE_SIZE_PRESETS = [
  { id: "cr80", name: "CR-80 Padrão PVC (54 × 86 mm - Recomendado)", width: 54, height: 86, desc: "Tamanho clássico de cartão de crédito e porta-crachá rígido." },
  { id: "medio", name: "Médio Plastificado (60 × 90 mm)", width: 60, height: 90, desc: "Excelente para polaseal ou porta-crachá com cordão." },
  { id: "grande", name: "Grande Credencial (70 × 100 mm)", width: 70, height: 100, desc: "Formato amplo de alta visibilidade em eventos." },
  { id: "especial", name: "Especial Eventos (75 × 105 mm)", width: 75, height: 105, desc: "Crachá institucional ampliado para congressos." },
  { id: "custom", name: "Personalizado (Definir Largura × Altura)", width: 54, height: 86, desc: "Ajuste milimétrico livre da largura e altura." }
];

// Presets de Atividades e Ministérios da Igreja (Conferência Missionária, Kids, Portaria, Recepção, etc.)
export const ACTIVITY_PRESETS = [
  {
    id: "diaconato",
    name: "Diaconato & Portaria",
    themeId: "wine",
    headerTitle: "O BRASIL PARA CRISTO",
    role: "Diaconisa",
    department: "DIACONATO & PORTARIA",
    matriculaPrefix: "DIA-2026",
    termoHeader: "TERMO DE IDENTIFICAÇÃO ECLESIÁSTICA",
    termoSubheader: "DIACONATO • CORPO ECLESIÁSTICO",
    line1: "Uso pessoal, intransferível e obrigatório nos cultos e eventos.",
    line2: "Identifica o voluntário devidamente escalado na congregação.",
    line3: "Em caso de perda ou dano, avise à Secretaria da Igreja.",
    verse: "Porque os que servirem bem como diáconos adquirirão para si uma boa posição e muita confiança na fé que há em Cristo Jesus.",
    verseRef: "1 Timóteo 3:13",
    responsibleRole: "DIRETOR(A) DO DIACONATO"
  },
  {
    id: "conferencia",
    name: "Conferência Missionária",
    themeId: "brown_gold",
    headerTitle: "O BRASIL PARA CRISTO",
    role: "Voluntário(a) de Missões",
    department: "SECRETARIA DE MISSÕES (SEMADEC)",
    matriculaPrefix: "MIS-2026",
    termoHeader: "CREDENCIAL MISSIONÁRIA OFICIAL",
    termoSubheader: "CONFERÊNCIA MISSIONÁRIA • EQUIPE OFICIAL",
    line1: "Credencial de apoio oficial da Conferência Missionária.",
    line2: "Acesso liberado às áreas ministeriais, estandes e recepção.",
    line3: "Identificação indispensável durante todos os dias do congresso.",
    verse: "E disse-lhes: Ide por todo o mundo, pregai o evangelho a toda criatura.",
    verseRef: "Marcos 16:15",
    responsibleRole: "COORDENADOR(A) DE MISSÕES"
  },
  {
    id: "kids",
    name: "Espaço Kids / Infantil",
    themeId: "purple_royal",
    headerTitle: "O BRASIL PARA CRISTO",
    role: "Professora / Monitora Kids",
    department: "MINISTÉRIO INFANTIL - ESPAÇO KIDS",
    matriculaPrefix: "KID-2026",
    termoHeader: "IDENTIFICAÇÃO MINISTÉRIO INFANTIL",
    termoSubheader: "ESPAÇO KIDS • EQUIPE DE APOIO INFANTIL",
    line1: "Identificação obrigatória para monitoras e professoras das salas.",
    line2: "Autorizada a receber e entregar as crianças aos responsáveis.",
    line3: "Zelar pelo cuidado, acolhimento e proteção de cada criança.",
    verse: "Deixai os pequeninos e não os estorveis de vir a mim, porque dos tais é o Reino dos céus.",
    verseRef: "Mateus 19:14",
    responsibleRole: "COORDENADORA INFANTIL / KIDS"
  },
  {
    id: "recepcao",
    name: "Recepção & Boas-Vindas",
    themeId: "emerald",
    headerTitle: "O BRASIL PARA CRISTO",
    role: "Recepcionista",
    department: "EQUIPE DE HOSPITALIDADE",
    matriculaPrefix: "REC-2026",
    termoHeader: "TERMO DE IDENTIFICAÇÃO ECLESIÁSTICA",
    termoSubheader: "RECEPÇÃO & HOSPITALIDADE • BOAS-VINDAS",
    line1: "Acolhimento solene aos membros, visitantes e caravanas.",
    line2: "Distribuição de folhetos, boletins e direcionamento aos assentos.",
    line3: "Uso obrigatório na porta de entrada do templo durante os cultos.",
    verse: "Sede hospitaleiros uns para com os outros, sem murmurações.",
    verseRef: "1 Pedro 4:9",
    responsibleRole: "LÍDER DA RECEPÇÃO"
  },
  {
    id: "portaria",
    name: "Portaria & Segurança",
    themeId: "navy",
    headerTitle: "O BRASIL PARA CRISTO",
    role: "Agente de Portaria",
    department: "SEGURANÇA & APOIO AO TEMPLO",
    matriculaPrefix: "POR-2026",
    termoHeader: "TERMO DE IDENTIFICAÇÃO ECLESIÁSTICA",
    termoSubheader: "PORTARIA & SEGURANÇA PATRIMONIAL",
    line1: "Controle de fluxo de entrada, saída e apoio ao estacionamento.",
    line2: "Vigilância atenta e auxílio aos irmãos e visitantes na chegada.",
    line3: "Comunicação imediata à liderança em qualquer eventualidade.",
    verse: "Pôs o Senhor guardas sobre os teus muros, ó Jerusalém, que não se calarão de dia nem de noite.",
    verseRef: "Isaías 62:6",
    responsibleRole: "COORDENADOR DE PORTARIA"
  },
  {
    id: "louvor",
    name: "Louvor & Adoração",
    themeId: "petrol_blue",
    headerTitle: "O BRASIL PARA CRISTO",
    role: "Músico / Levita",
    department: "MINISTÉRIO DE LOUVOR & MÚSICA",
    matriculaPrefix: "LOU-2026",
    termoHeader: "TERMO DE IDENTIFICAÇÃO MINISTERIAL",
    termoSubheader: "MINISTÉRIO DE LOUVOR • CORPO MUSICAL",
    line1: "Credencial dos músicos e levitas escalados nos cultos.",
    line2: "Acesso autorizado à plataforma, estúdio e instrumentos.",
    line3: "Pontualidade aos ensaios e dedicação à ministração.",
    verse: "Tudo quanto tem fôlego louve ao Senhor. Louvai ao Senhor!",
    verseRef: "Salmos 150:6",
    responsibleRole: "MINISTRO DE LOUVOR"
  },
  {
    id: "jovens",
    name: "Juventude / Jovens",
    themeId: "carmine_red",
    headerTitle: "O BRASIL PARA CRISTO",
    role: "Líder Jovem",
    department: "MINISTÉRIO JOVEM & ADOLESCENTES",
    matriculaPrefix: "JUV-2026",
    termoHeader: "CREDENCIAL JUVENTUDE ECLESIÁSTICA",
    termoSubheader: "JUVENTUDE ECLESIÁSTICA • EQUIPE DE APOIO",
    line1: "Apoio a congressos, retiros, vigílias e evangelismos de jovens.",
    line2: "Credencial oficial de liderança e dinamização jovem.",
    line3: "Servir com amor, alegria e testemunho cristão.",
    verse: "Ninguém despreze a tua mocidade; pelo contrário, torna-te padrão dos fiéis, na palavra, no procedimento, no amor, na fé, na pureza.",
    verseRef: "1 Timóteo 4:12",
    responsibleRole: "LÍDER DA JUVENTUDE"
  }
];

// Helper para detectar cor escura e ajustar contraste do texto
const isColorDark = (hexColor: string): boolean => {
  if (!hexColor || !hexColor.startsWith("#")) return false;
  let color = hexColor.substring(1);
  if (color.length === 3) {
    color = color.split('').map(c => c + c).join('');
  }
  const r = parseInt(color.substring(0, 2), 16) || 0;
  const g = parseInt(color.substring(2, 4), 16) || 0;
  const b = parseInt(color.substring(4, 6), 16) || 0;
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness < 128;
};

export function CrachaVoluntariosModal({
  isOpen,
  onClose,
  volunteers = [],
  churchData,
  activeBranchName = "2ª Congregação",
  activeBranchId = "sede",
  responsibleRole: initialResponsibleRole = "DIRETOR(A) DO DIACONATO",
  responsibleName: initialResponsibleName
}: CrachaVoluntariosModalProps) {
  // Mode: 'single' (customizar e imprimir 1 crachá frente/verso) ou 'batch' (grade de crachás na folha A4)
  const [viewMode, setViewMode] = useState<'single' | 'batch'>('single');

  // Selected volunteer index
  const [selectedVolId, setSelectedVolId] = useState<string>(() => {
    return volunteers.length > 0 ? volunteers[0].id : "v1";
  });

  // Active volunteer object
  const activeVolunteer = useMemo(() => {
    return volunteers.find(v => v.id === selectedVolId) || volunteers[0] || {
      id: "v1",
      name: "Maria Francinete",
      role: "Diaconisa",
      phone: ""
    };
  }, [volunteers, selectedVolId]);

  // Dimensions state (Largura x Altura em milímetros)
  const [selectedSizePreset, setSelectedSizePreset] = useState<string>("cr80");
  const [badgeWidthMm, setBadgeWidthMm] = useState<number>(54);
  const [badgeHeightMm, setBadgeHeightMm] = useState<number>(86);

  // Logo transparent background toggle
  const [removeLogoWhiteBg, setRemoveLogoWhiteBg] = useState<boolean>(true);

  // ANEXO 4.1: Cor da Logo da Igreja e Emblema
  const [logoColorMode, setLogoColorMode] = useState<'original' | 'white' | 'gold' | 'black' | 'custom'>('white');
  const [customLogoColor, setCustomLogoColor] = useState<string>("#FFFFFF");
  const [logoSize, setLogoSize] = useState<'normal' | 'grande' | 'extragrande'>('grande');

  // ANEXO 4.2: Cor de Fundo Individualizada (Frente & Verso independentes)
  const [cardBgColorFrente, setCardBgColorFrente] = useState<string>("#FFFFFF");
  const [cardBgColorVerso, setCardBgColorVerso] = useState<string>("#FFFFFF");

  // Atividade e Modelo Rápido
  const [selectedActivityId, setSelectedActivityId] = useState<string>("diaconato");

  // Textos Totalmente Customizáveis da Frente do Crachá
  const [customHeaderTitle, setCustomHeaderTitle] = useState<string>("O BRASIL PARA CRISTO");
  const [customHeaderSubtitle, setCustomHeaderSubtitle] = useState<string>(activeBranchName);

  // ANEXO 4.3: Cor onde fica as informações de Registro e QR Code (Rodapé da Frente)
  const [footerBgColor, setFooterBgColor] = useState<string>("#F8FAFC");
  const [footerTextColor, setFooterTextColor] = useState<string>("#0F172A");
  const [footerStylePreset, setFooterStylePreset] = useState<string>("light_gray");

  // QR Code validation preview modal
  const [isValidatingQr, setIsValidatingQr] = useState<boolean>(false);

  // Custom volunteer card fields
  const [customName, setCustomName] = useState(activeVolunteer.name);
  const [customRole, setCustomRole] = useState(activeVolunteer.role || "Diaconisa");
  const [customDepartment, setCustomDepartment] = useState("DIACONATO & PORTARIA");
  const [customMatricula, setCustomMatricula] = useState("DIA-2026-001");
  const [customValidity, setCustomValidity] = useState("2026 / 2027");
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string>("wine");
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>("#1E3A8A");
  const [customBadgeColor, setCustomBadgeColor] = useState<string>("#D97706");
  const [includeVerso, setIncludeVerso] = useState<boolean>(true);

  // Textos Totalmente Customizáveis do Verso do Crachá
  const [customVersoHeader, setCustomVersoHeader] = useState<string>("TERMO DE IDENTIFICAÇÃO ECLESIÁSTICA");
  const [customVersoSubheader, setCustomVersoSubheader] = useState<string>("DIACONATO • CORPO ECLESIÁSTICO");
  const [customVersoLine1, setCustomVersoLine1] = useState<string>("Uso pessoal, intransferível e obrigatório nos cultos e eventos.");
  const [customVersoLine2, setCustomVersoLine2] = useState<string>("Identifica o voluntário devidamente escalado na congregação.");
  const [customVersoLine3, setCustomVersoLine3] = useState<string>("Em caso de perda ou dano, avise à Secretaria da Igreja.");
  const [customVersoVerse, setCustomVersoVerse] = useState<string>("Porque os que servirem bem como diáconos adquirirão para si uma boa posição e muita confiança na fé que há em Cristo Jesus.");
  const [customVersoVerseRef, setCustomVersoVerseRef] = useState<string>("1 Timóteo 3:13");

  // Responsável pela Diretoria do Diaconato (igual da escala de voluntários e diáconos)
  const [customResponsibleRole, setCustomResponsibleRole] = useState<string>(initialResponsibleRole);
  const [customResponsibleName, setCustomResponsibleName] = useState<string>(() => {
    return initialResponsibleName || churchData?.pastorTitular || churchData?.pastor || "Pr. Carlito Carvalho Rodrigues";
  });
  const [customChurchFooter, setCustomChurchFooter] = useState<string>(() => {
    return `${churchData?.nome || "Igreja Evangélica Pentecostal O Brasil para Cristo"} • Secretaria Geral`;
  });

  // Selected volunteers for batch print
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>(() => {
    return volunteers.map(v => v.id);
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update dimensions when preset changes
  const handleSizePresetChange = (presetId: string) => {
    setSelectedSizePreset(presetId);
    const found = BADGE_SIZE_PRESETS.find(p => p.id === presetId);
    if (found && presetId !== "custom") {
      setBadgeWidthMm(found.width);
      setBadgeHeightMm(found.height);
    }
  };

  // Alterar cor de fundo individual (independente frente vs verso)
  const handleUpdateBgColor = (color: string, side: 'frente' | 'verso') => {
    if (side === 'frente') {
      setCardBgColorFrente(color);
    } else {
      setCardBgColorVerso(color);
    }
  };

  // Copiar cor da frente para o verso (opção prática sob demanda)
  const handleCopyFrenteToVerso = () => {
    setCardBgColorVerso(cardBgColorFrente);
    toast.success("Cor do verso igualada à cor da frente!");
  };

  // Selecionar Modelo / Preset de Atividade da Igreja
  const handleSelectActivity = (actId: string) => {
    setSelectedActivityId(actId);
    const act = ACTIVITY_PRESETS.find(a => a.id === actId);
    if (act) {
      if (act.themeId) setSelectedThemeId(act.themeId);
      if (act.headerTitle) setCustomHeaderTitle(act.headerTitle);
      if (act.role) setCustomRole(act.role);
      if (act.department) setCustomDepartment(act.department);
      if (act.termoHeader) setCustomVersoHeader(act.termoHeader);
      if (act.termoSubheader) setCustomVersoSubheader(act.termoSubheader);
      if (act.line1) setCustomVersoLine1(act.line1);
      if (act.line2) setCustomVersoLine2(act.line2);
      if (act.line3) setCustomVersoLine3(act.line3);
      if (act.verse) setCustomVersoVerse(act.verse);
      if (act.verseRef) setCustomVersoVerseRef(act.verseRef);
      if (act.responsibleRole) setCustomResponsibleRole(act.responsibleRole);
      const num = volunteers.findIndex(v => v.id === selectedVolId) + 1;
      setCustomMatricula(`${act.matriculaPrefix}-${String(num > 0 ? num : 1).padStart(3, '0')}`);
      toast.success(`Modelo "${act.name}" aplicado! Todos os campos continuam editáveis.`);
    }
  };

  // Alterar cor do rodapé do registro / QR Code
  const handleSelectFooterPreset = (preset: string) => {
    setFooterStylePreset(preset);
    if (preset === "white") {
      setFooterBgColor("#FFFFFF");
      setFooterTextColor("#0F172A");
    } else if (preset === "light_gray") {
      setFooterBgColor("#F8FAFC");
      setFooterTextColor("#0F172A");
    } else if (preset === "gold") {
      setFooterBgColor("#FEF3C7");
      setFooterTextColor("#78350F");
    } else if (preset === "theme") {
      setFooterBgColor(currentTheme.primary);
      setFooterTextColor("#FFFFFF");
    } else if (preset === "dark") {
      setFooterBgColor("#0F172A");
      setFooterTextColor("#FFFFFF");
    }
  };

  // Sync active volunteer when selection changes
  useEffect(() => {
    if (activeVolunteer) {
      setCustomName(activeVolunteer.name);
      setCustomRole(activeVolunteer.role || "Diaconisa");
      const lowerRole = (activeVolunteer.role || "").toLowerCase();
      if (lowerRole.includes("diaconisa")) {
        setSelectedThemeId("wine");
      } else if (lowerRole.includes("diácono") || lowerRole.includes("diacono")) {
        setSelectedThemeId("navy");
      } else if (lowerRole.includes("cooperad")) {
        setSelectedThemeId("emerald");
      } else if (lowerRole.includes("pastor") || lowerRole.includes("titular")) {
        setSelectedThemeId("brown_gold");
      } else if (lowerRole.includes("líder") || lowerRole.includes("diretor")) {
        setSelectedThemeId("black_gold");
      }
      const num = volunteers.findIndex(v => v.id === activeVolunteer.id) + 1;
      setCustomMatricula(`DIA-2026-${String(num > 0 ? num : 1).padStart(3, '0')}`);
      setCustomPhotoUrl(null);
    }
  }, [activeVolunteer, volunteers]);

  // Current active theme colors
  const currentTheme = useMemo(() => {
    if (selectedThemeId === "custom") {
      return {
        id: "custom",
        name: "Personalizado",
        primary: customPrimaryColor,
        badge: customBadgeColor,
        text: "#FFFFFF"
      };
    }
    return COLOR_THEMES.find(t => t.id === selectedThemeId) || COLOR_THEMES[0];
  }, [selectedThemeId, customPrimaryColor, customBadgeColor]);

  // Filtro CSS dinâmico para a Logo
  const logoFilterStyle = useMemo(() => {
    if (logoColorMode === "white") {
      return "brightness(0) invert(1)";
    }
    if (logoColorMode === "gold") {
      return "sepia(1) saturate(6) hue-rotate(5deg) brightness(1.2)";
    }
    if (logoColorMode === "black") {
      return "grayscale(1) brightness(0)";
    }
    if (logoColorMode === "custom") {
      return "drop-shadow(0px 0px 0px " + customLogoColor + ")";
    }
    // original
    return removeLogoWhiteBg ? "contrast(1.15) brightness(1.05)" : "none";
  }, [logoColorMode, customLogoColor, removeLogoWhiteBg]);

  const churchLogo = getRegisteredChurchLogo(activeBranchId) || churchData?.logoDataUrl || null;
  const churchName = churchData?.nome || `Igreja Evang. Pentecostal O Brasil para Cristo - ${activeBranchName}`;

  // QR Code structured verified payload
  const qrValidationData = useMemo(() => {
    return {
      sistema: "OBPC ECLESIÁSTICO",
      tipo: "CRACHÁ DE DIACONATO & CORPO DE VOLUNTÁRIOS",
      registro: customMatricula,
      nome: customName,
      cargo: customRole,
      departamento: customDepartment,
      igreja: "Igreja Evangélica Pentecostal O Brasil para Cristo",
      congregacao: activeBranchName,
      validade: customValidity,
      diretoriaResponsavel: `${customResponsibleRole}: ${customResponsibleName}`,
      autenticacao: `OBPC-AUTH-${customMatricula}-${new Date().getFullYear()}`,
      status: "REGISTRO ATIVO E VERIFICADO"
    };
  }, [customMatricula, customName, customRole, customDepartment, activeBranchName, customValidity, customResponsibleRole, customResponsibleName]);

  const qrCodeText = useMemo(() => {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://igreja-obpc.app';
    const params = new URLSearchParams({
      reg: customMatricula,
      nome: customName,
      cargo: customRole,
      depto: customDepartment,
      dir: `${customResponsibleRole} - ${customResponsibleName}`,
      val: customValidity,
      cong: activeBranchName
    });
    return `${origin}/validar-cracha?${params.toString()}`;
  }, [customMatricula, customName, customRole, customDepartment, customResponsibleRole, customResponsibleName, customValidity, activeBranchName]);

  // Handle Photo upload from computer / camera
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomPhotoUrl(event.target?.result as string);
        toast.success("Foto carregada com sucesso e centralizada no crachá!");
      };
      reader.readAsDataURL(file);
    }
  };

  // Print Badge with exact physical size
  const handlePrintCrachas = () => {
    toast.info("Abrindo impressão de crachás no tamanho real exato...");
    printDocument({
      elementId: viewMode === 'single' ? "cracha-print-single" : "cracha-print-batch",
      title: `Cracha_${customName.replace(/\s+/g, '_')}_${badgeWidthMm}x${badgeHeightMm}mm`
    });
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    const toastId = toast.loading("Gerando arquivo PDF dos crachás com escala real...");
    const targetId = viewMode === 'single' ? "cracha-print-single" : "cracha-print-batch";
    const filename = viewMode === 'single'
      ? `Cracha_${customName.replace(/\s+/g, '_')}_${badgeWidthMm}x${badgeHeightMm}mm.pdf`
      : `Grade_Crachas_Voluntarios_${activeBranchName.replace(/\s+/g, '_')}.pdf`;

    const success = await downloadElementAsPdf(targetId, filename);
    if (success) {
      toast.success("PDF gerado e baixado com sucesso!", { id: toastId });
    } else {
      toast.error("Erro ao gerar PDF. Utilize o botão de Imprimir para salvar em PDF.", { id: toastId });
    }
  };

  // Save as High Resolution Image (PNG)
  const handleSaveAsImage = async (targetId: string, filename: string) => {
    const toastId = toast.loading("Gerando imagem em alta resolução (300 DPI)...");
    try {
      const el = document.getElementById(targetId);
      if (!el) {
        toast.error("Elemento para exportar imagem não encontrado.", { id: toastId });
        return;
      }
      const dataUrl = await toPng(el, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
      toast.success("Imagem PNG gerada e baixada com sucesso!", { id: toastId });
    } catch (err) {
      console.error("Erro ao gerar imagem:", err);
      toast.error("Erro ao exportar como imagem.", { id: toastId });
    }
  };

  // Share on WhatsApp
  const handleShareWhatsApp = () => {
    let msg = `🪪 *CRACHÁ OFICIAL DE VOLUNTÁRIO / DIACONATO*\n`;
    msg += `⛪ *${churchName}*\n`;
    msg += `👤 *Nome:* ${customName}\n`;
    msg += `🎖️ *Cargo:* ${customRole.toUpperCase()}\n`;
    msg += `📂 *Departamento:* ${customDepartment}\n`;
    msg += `🔢 *Matrícula:* ${customMatricula}\n`;
    msg += `🗓️ *Validade:* ${customValidity}\n`;
    msg += `📐 *Dimensões:* ${badgeWidthMm} mm × ${badgeHeightMm} mm\n`;
    msg += `✍️ *${customResponsibleRole}:* ${customResponsibleName}\n\n`;
    msg += `_Crachá emitido pelo Módulo de Secretaria da Igreja para uso no uniforme e escala oficial._`;

    navigator.clipboard.writeText(msg);
    toast.success("Dados do crachá copiados para o WhatsApp!");
  };

  // Toggle volunteer for batch print
  const handleToggleBatchVolunteer = (id: string) => {
    setBatchSelectedIds(prev => 
      prev.includes(id) ? prev.filter(vId => vId !== id) : [...prev, id]
    );
  };

  // Dynamic Photo Box Dimensions based on badge size
  const photoWidthMm = Math.max(22, Math.min(38, Math.round(badgeWidthMm * 0.46)));
  const photoHeightMm = Math.max(28, Math.min(48, Math.round(badgeHeightMm * 0.36)));

  const isFrenteDark = isColorDark(cardBgColorFrente);
  const isVersoDark = isColorDark(cardBgColorVerso);

  // Render a Single Badge (Frente)
  const renderCrachaFrente = (vol: { name: string; role: string; matricula?: string; photo?: string | null }) => {
    return (
      <div 
        id="card-frente-render"
        className="rounded-lg border-2 border-slate-900 shadow-md flex flex-col justify-between overflow-hidden relative print:shadow-none print:border-slate-900 select-none transition-colors"
        style={{ 
          width: `${badgeWidthMm}mm`,
          height: `${badgeHeightMm}mm`,
          minWidth: `${badgeWidthMm}mm`,
          maxWidth: `${badgeWidthMm}mm`,
          minHeight: `${badgeHeightMm}mm`,
          maxHeight: `${badgeHeightMm}mm`,
          backgroundColor: cardBgColorFrente,
          boxSizing: 'border-box' 
        }}
      >
        {/* Furo para presilha / cordão do crachá */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-slate-200 border border-slate-400 rounded-full z-20"></div>

        {/* Top Header com Cor do Tema */}
        <div 
          className="pt-2.5 pb-1.5 px-2 text-white relative flex items-center justify-between gap-1.5 shrink-0"
          style={{ backgroundColor: currentTheme.primary }}
        >
          {/* Logo da Igreja Posicionado à Esquerda e com Tamanho Ajustável */}
          <div className="flex items-center justify-center shrink-0 min-w-[26px]">
            {churchLogo ? (
              <img 
                src={churchLogo} 
                alt="Logo" 
                className={`${logoSize === 'extragrande' ? 'h-11 max-h-11' : logoSize === 'normal' ? 'h-7 max-h-7' : 'h-9 max-h-9'} w-auto max-w-[28mm] object-contain transition-all`}
                style={{
                  mixBlendMode: removeLogoWhiteBg ? 'multiply' : 'normal',
                  filter: logoFilterStyle
                }}
              />
            ) : (
              <span 
                className="font-black text-[10px] tracking-wider transition-colors px-1 py-0.5 border border-white/20 rounded"
                style={{ color: logoColorMode === 'original' ? '#FBBF24' : customLogoColor }}
              >
                OBPC
              </span>
            )}
          </div>

          {/* Nome da Igreja Centralizado Geometricamente */}
          <div className="flex-1 text-center min-w-0 flex flex-col items-center justify-center px-1">
            <span 
              className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider block leading-tight text-center"
              style={{ color: logoColorMode === 'original' ? '#FFFFFF' : customLogoColor }}
            >
              {customHeaderTitle || "O BRASIL PARA CRISTO"}
            </span>
            <span className="text-[6.5px] sm:text-[7.5px] font-semibold text-white/95 block truncate mt-0.5 text-center">
              {customHeaderSubtitle || activeBranchName}
            </span>
          </div>

          {/* Espaçador equilibrado para manter centralização perfeita com a logo à esquerda */}
          <div className="min-w-[26px] shrink-0" aria-hidden="true" />
        </div>

        {/* Faixa do Ministério / Cargo em destaque - Fonte Maior com Mais Destaque */}
        <div 
          className="py-1 px-1.5 text-center font-black text-[9.5px] sm:text-[10px] tracking-widest text-white uppercase shadow-xs shrink-0 truncate transition-all"
          style={{ backgroundColor: currentTheme.badge }}
        >
          {vol.role || "VOLUNTÁRIO(A)"}
        </div>

        {/* ÁREA CENTRAL: Foto Reposicionada no Centro do Crachá e Nome */}
        <div className="flex-1 flex flex-col items-center justify-center px-1.5 py-1 my-auto overflow-hidden">
          {/* Moldura da Foto 3x4 Centralizada */}
          <div 
            className="rounded-md border-2 border-slate-700 bg-slate-100 overflow-hidden shadow-xs flex items-center justify-center shrink-0 mb-1"
            style={{
              width: `${photoWidthMm}mm`,
              height: `${photoHeightMm}mm`
            }}
          >
            {vol.photo ? (
              <img src={vol.photo} alt={vol.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-sm mb-1 shadow-xs"
                  style={{ backgroundColor: currentTheme.badge }}
                >
                  {vol.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-[6px] font-bold text-slate-600 uppercase tracking-wider">FOTO OFICIAL</span>
              </div>
            )}
          </div>

          {/* Nome do Voluntário adaptável à cor de fundo */}
          <h4 
            className="text-[10px] font-black uppercase leading-snug line-clamp-2 text-center max-w-full"
            style={{ color: isFrenteDark ? '#FFFFFF' : '#020617' }}
          >
            {vol.name}
          </h4>
          <span 
            className="text-[6.5px] font-bold uppercase mt-0.5 block truncate max-w-full text-center"
            style={{ color: isFrenteDark ? '#CBD5E1' : '#475569' }}
          >
            {customDepartment}
          </span>
        </div>

        {/* Rodapé do Crachá com QR Code, Matrícula e Validade - Fontes Maiores para Legibilidade */}
        <div 
          className="border-t px-2 py-1.5 flex items-center justify-between shrink-0 transition-colors"
          style={{ 
            backgroundColor: footerBgColor, 
            color: footerTextColor,
            borderColor: isColorDark(footerBgColor) ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'
          }}
        >
          <div className="text-left leading-tight">
            <span 
              className="text-[7px] font-bold block uppercase tracking-wider"
              style={{ opacity: 0.85 }}
            >
              REGISTRO
            </span>
            <span 
              className="text-[9px] font-black block font-mono mt-0.5 tracking-tight"
              style={{ color: footerTextColor }}
            >
              {vol.matricula || customMatricula}
            </span>
            <span 
              className="text-[7px] font-semibold block mt-0.5"
              style={{ opacity: 0.9 }}
            >
              VAL: {customValidity}
            </span>
          </div>

          <div 
            className="bg-white p-0.5 border border-slate-300 rounded shadow-2xs cursor-pointer hover:ring-2 hover:ring-primary transition-all"
            title="Clique para validar dados deste QR Code em tela cheia"
            onClick={() => setIsValidatingQr(true)}
          >
            <QRCodeSVG 
              value={qrCodeText}
              size={badgeWidthMm < 60 ? 24 : 28}
              level="M"
            />
          </div>
        </div>
      </div>
    );
  };

  // Render Single Badge (Verso)
  const renderCrachaVerso = () => {
    return (
      <div 
        id="card-verso-render"
        className="rounded-lg border-2 border-slate-900 shadow-md flex flex-col justify-between overflow-hidden p-2 relative print:shadow-none print:border-slate-900 select-none transition-colors"
        style={{ 
          width: `${badgeWidthMm}mm`,
          height: `${badgeHeightMm}mm`,
          minWidth: `${badgeWidthMm}mm`,
          maxWidth: `${badgeWidthMm}mm`,
          minHeight: `${badgeHeightMm}mm`,
          maxHeight: `${badgeHeightMm}mm`,
          backgroundColor: cardBgColorVerso,
          color: isVersoDark ? '#FFFFFF' : '#0F172A',
          boxSizing: 'border-box' 
        }}
      >
        {/* Furo para presilha */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-6 h-1.5 bg-slate-200 border border-slate-400 rounded-full z-20"></div>

        <div className="pt-2 text-center border-b pb-1" style={{ borderColor: isVersoDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }}>
          <span 
            className="text-[7.5px] font-black uppercase tracking-wider block truncate"
            style={{ color: isVersoDark ? '#FFFFFF' : '#1E293B' }}
          >
            {customVersoHeader || "TERMO DE IDENTIFICAÇÃO ECLESIÁSTICA"}
          </span>
          <span 
            className="text-[7px] font-bold block mt-0.5 uppercase tracking-wide truncate"
            style={{ color: isVersoDark ? '#38BDF8' : '#0284C7' }}
          >
            {customVersoSubheader || `${customRole.toUpperCase()} • CORPO ECLESIÁSTICO`}
          </span>
        </div>

        {/* Instruções de Uso com Fonte Maior e Editáveis */}
        <div 
          className="space-y-1 py-1 text-[7px] leading-tight"
          style={{ color: isVersoDark ? '#E2E8F0' : '#334155' }}
        >
          <p className="flex items-start gap-1">
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
            <span>{customVersoLine1 || "Uso pessoal, intransferível e obrigatório nos cultos e eventos."}</span>
          </p>
          <p className="flex items-start gap-1">
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
            <span>{customVersoLine2 || "Identifica o voluntário devidamente escalado na congregação."}</span>
          </p>
          <p className="flex items-start gap-1">
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
            <span>{customVersoLine3 || "Em caso de perda ou dano, avise à Secretaria da Igreja."}</span>
          </p>
        </div>

        {/* Versículo Bíblico Editável com Fonte Maior */}
        <div 
          className="p-1.5 rounded text-center border"
          style={{
            backgroundColor: isVersoDark ? 'rgba(255,255,255,0.08)' : '#F8FAFC',
            borderColor: isVersoDark ? 'rgba(255,255,255,0.15)' : '#E2E8F0'
          }}
        >
          <p 
            className="text-[6.5px] italic font-semibold leading-relaxed"
            style={{ color: isVersoDark ? '#F1F5F9' : '#1E293B' }}
          >
            "{customVersoVerse || "Porque os que servirem bem como diáconos adquirirão para si uma boa posição e muita confiança na fé que há em Cristo Jesus."}"
          </p>
          <span 
            className="text-[6.5px] font-black block mt-0.5"
            style={{ color: isVersoDark ? '#F8FAFC' : '#0F172A' }}
          >
            {customVersoVerseRef || "1 Timóteo 3:13"}
          </span>
        </div>

        {/* Assinatura Oficial do Responsável pela Diretoria */}
        <div className="pt-2 pb-1 text-center mt-auto shrink-0">
          <div 
            className="w-36 mx-auto border-t pt-0.5"
            style={{ borderColor: isVersoDark ? '#FFFFFF' : '#0F172A' }}
          >
            <span 
              className="text-[7.5px] font-black uppercase block truncate"
              style={{ color: isVersoDark ? '#FFFFFF' : '#0F172A' }}
            >
              {customResponsibleRole || "DIRETORIA DO DIACONATO"}
            </span>
            <span 
              className="text-[7px] font-bold block truncate"
              style={{ color: isVersoDark ? '#CBD5E1' : '#334155' }}
            >
              {customResponsibleName || "Pr. Carlito Carvalho Rodrigues"}
            </span>
          </div>
        </div>

        {/* Rodapé institucional com Fonte Maior */}
        <div 
          className="text-[6px] text-center border-t pt-0.5 truncate"
          style={{ 
            borderColor: isVersoDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
            color: isVersoDark ? '#94A3B8' : '#64748B' 
          }}
        >
          {customChurchFooter || `${churchName} • Secretaria Geral`}
        </div>
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="border-b pb-3 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg">
                  <IdCard className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    Crachás de Voluntários, Diáconos e Diaconisas
                    <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300">
                      Identificação Eclesiástica
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Configure tamanho, cores, fotos e imprima crachás individuais ou em lote para a congregação.
                  </DialogDescription>
                </div>
              </div>

              {/* Botões de Ação Superior */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsValidatingQr(true)}
                  className="h-8 text-xs font-semibold text-primary border-primary/30"
                >
                  <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Validar QR Code
                </Button>
                <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="h-8 text-xs">
                  <Share2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  WhatsApp
                </Button>
                <Button variant="default" size="sm" onClick={handlePrintCrachas} className="h-8 text-xs font-semibold">
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Imprimir Crachás
                </Button>
              </div>
            </div>

            {/* Alternador de Modo: Individual vs Folha A4 em Lote */}
            <div className="flex items-center gap-2 mt-3 pt-2 border-t">
              <Button
                variant={viewMode === 'single' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('single')}
                className="h-7 text-xs font-medium"
              >
                <User className="w-3.5 h-3.5 mr-1" />
                Crachá Individual (Frente & Verso)
              </Button>
              <Button
                variant={viewMode === 'batch' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('batch')}
                className="h-7 text-xs font-medium"
              >
                <Users className="w-3.5 h-3.5 mr-1" />
                Folha A4 Coletiva ({batchSelectedIds.length} selecionados)
              </Button>
            </div>
          </DialogHeader>

          {/* Conteúdo: Painel de Edição com Scroll Independente e Crachá Fixo/Sticky */}
          <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden pr-1">
            {viewMode === 'single' ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 py-2 lg:h-[calc(92vh-140px)]">
                {/* Painel de Controles e Customização (5 colunas) COM SCROLL INDEPENDENTE */}
                <div className="lg:col-span-5 space-y-3.5 bg-muted/30 p-4 rounded-xl border lg:overflow-y-auto lg:max-h-[calc(92vh-155px)] pr-2">
                  
                  {/* 1. SELEÇÃO DE MODELO / ATIVIDADE DA IGREJA (PRESETS RÁPIDOS) */}
                  <div className="space-y-2 bg-background p-3 rounded-xl border shadow-2xs">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Modelos por Atividade / Ministério
                      </Label>
                      <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-800 border-amber-300">
                        100% Customizável
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Selecione uma atividade para pré-configurar temas, cargos e regras. Todos os campos continuam editáveis!
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {ACTIVITY_PRESETS.map((act) => (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => handleSelectActivity(act.id)}
                          className={`px-2 py-1.5 rounded-lg border text-left text-xs transition-all flex flex-col justify-between ${
                            selectedActivityId === act.id
                              ? 'border-primary ring-2 ring-primary/40 bg-primary/10 font-bold text-primary shadow-xs'
                              : 'hover:bg-muted text-foreground'
                          }`}
                        >
                          <span className="text-[11px] font-bold leading-tight truncate">{act.name}</span>
                          <span className="text-[9px] text-muted-foreground truncate mt-0.5">{act.role}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Seletor de Voluntário Cadastrado */}
                  <div className="space-y-1 bg-background p-2.5 rounded-lg border">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span>Selecionar Voluntário Cadastrado</span>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Total: {volunteers.length}
                      </span>
                    </Label>
                    <Select 
                      value={selectedVolId} 
                      onValueChange={(val) => setSelectedVolId(val)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Escolha um voluntário" />
                      </SelectTrigger>
                      <SelectContent>
                        {volunteers.map((v) => (
                          <SelectItem key={v.id} value={v.id} className="text-xs">
                            {v.name} {v.role ? `(${v.role})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3. AJUSTE DE TAMANHO (Largura x Altura) */}
                  <div className="space-y-2 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Maximize2 className="w-3.5 h-3.5 text-amber-600" />
                        Tamanho do Crachá (Largura × Altura)
                      </Label>
                      <Badge variant="outline" className="text-[9px] font-mono bg-background">
                        {badgeWidthMm}mm × {badgeHeightMm}mm
                      </Badge>
                    </div>

                    {/* Presets Rápidos */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {BADGE_SIZE_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSizePresetChange(preset.id)}
                          className={`p-1.5 px-2 rounded-md border text-left text-xs transition-all ${
                            selectedSizePreset === preset.id
                              ? 'border-primary ring-1 ring-primary bg-primary/10 font-bold text-primary'
                              : 'hover:bg-muted/70 text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] leading-tight truncate">{preset.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Ajuste Manual Livre de Milímetros */}
                    <div className="grid grid-cols-2 gap-2 pt-1 bg-background/60 p-2 rounded-lg border">
                      <div className="space-y-1">
                        <Label className="text-[10px] font-medium text-muted-foreground">Largura (mm)</Label>
                        <Input 
                          type="number"
                          min={45}
                          max={120}
                          value={badgeWidthMm}
                          onChange={(e) => {
                            setSelectedSizePreset("custom");
                            setBadgeWidthMm(Number(e.target.value) || 54);
                          }}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] font-medium text-muted-foreground">Altura / Cumprimento (mm)</Label>
                        <Input 
                          type="number"
                          min={60}
                          max={160}
                          value={badgeHeightMm}
                          onChange={(e) => {
                            setSelectedSizePreset("custom");
                            setBadgeHeightMm(Number(e.target.value) || 86);
                          }}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4. PERSONALIZAÇÃO DE CORES DA LOGO */}
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Paintbrush className="w-3.5 h-3.5 text-primary" />
                      Logotipo da Igreja (Cor e Tamanho)
                    </Label>

                    <div className="space-y-1.5 bg-background p-2.5 rounded-lg border">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-semibold">Cor da Logo da Igreja</Label>
                        <span className="text-[10px] text-muted-foreground">Contraste com o tema</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setLogoColorMode("white")}
                          className={`p-1 rounded border text-[10px] font-medium flex items-center justify-center gap-1 ${
                            logoColorMode === "white" ? "bg-primary text-white border-primary" : "bg-muted/40 hover:bg-muted"
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-white border border-slate-300"></span>
                          Branco Puro
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogoColorMode("gold")}
                          className={`p-1 rounded border text-[10px] font-medium flex items-center justify-center gap-1 ${
                            logoColorMode === "gold" ? "bg-primary text-white border-primary" : "bg-muted/40 hover:bg-muted"
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border"></span>
                          Dourado
                        </button>
                        <button
                          type="button"
                          onClick={() => setLogoColorMode("original")}
                          className={`p-1 rounded border text-[10px] font-medium flex items-center justify-center gap-1 ${
                            logoColorMode === "original" ? "bg-primary text-white border-primary" : "bg-muted/40 hover:bg-muted"
                          }`}
                        >
                          Original
                        </button>
                      </div>

                      {/* Cor personalizada de logo */}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-muted-foreground">Ou cor personalizada da logo:</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="color" 
                            value={customLogoColor}
                            onChange={(e) => {
                              setLogoColorMode("custom");
                              setCustomLogoColor(e.target.value);
                            }}
                            className="w-6 h-6 rounded border cursor-pointer"
                          />
                          <span className="text-[10px] font-mono">{customLogoColor}</span>
                        </div>
                      </div>

                      {/* Toggle de remoção do fundo branco */}
                      <div className="flex items-center justify-between pt-1 border-t mt-1">
                        <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
                          Remover fundo branco da logo
                        </span>
                        <Switch 
                          checked={removeLogoWhiteBg} 
                          onCheckedChange={setRemoveLogoWhiteBg} 
                        />
                      </div>

                      {/* Ajuste de Altura e Destaque da Logo */}
                      <div className="pt-2 border-t mt-1 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300">
                            Tamanho da Logo (à Esquerda)
                          </span>
                          <span className="text-[9px] text-primary font-bold">
                            {logoSize === 'normal' ? 'Normal' : logoSize === 'grande' ? '⭐ Grande' : 'Extra Grande'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => setLogoSize("normal")}
                            className={`p-1 rounded border text-[10px] font-medium ${
                              logoSize === "normal" ? "bg-primary text-white border-primary" : "bg-muted/40 hover:bg-muted"
                            }`}
                          >
                            Normal
                          </button>
                          <button
                            type="button"
                            onClick={() => setLogoSize("grande")}
                            className={`p-1 rounded border text-[10px] font-medium ${
                              logoSize === "grande" ? "bg-primary text-white border-primary" : "bg-muted/40 hover:bg-muted"
                            }`}
                          >
                            ⭐ Grande
                          </button>
                          <button
                            type="button"
                            onClick={() => setLogoSize("extragrande")}
                            className={`p-1 rounded border text-[10px] font-medium ${
                              logoSize === "extragrande" ? "bg-primary text-white border-primary" : "bg-muted/40 hover:bg-muted"
                            }`}
                          >
                            Extra Grande
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. COR DO FUNDO INDIVIDUALIZADA (FRENTE E VERSO SEPARADOS - ANEXO 1) */}
                  <div className="space-y-3 bg-background p-3 rounded-xl border shadow-2xs">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <Label className="text-xs font-bold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                        <Palette className="w-3.5 h-3.5 text-primary" />
                        Cores de Fundo (Frente e Verso Separados)
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyFrenteToVerso}
                        className="h-6 text-[10px] text-primary hover:bg-primary/10 px-2"
                        title="Aplica a cor de fundo da frente também no verso"
                      >
                        <Layers className="w-3 h-3 mr-1" />
                        Igualar Verso à Frente
                      </Button>
                    </div>

                    {/* Fundo da Frente */}
                    <div className="space-y-1.5 p-2.5 rounded-lg bg-muted/40 border">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground">Cor do Fundo da Frente:</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="color" 
                            value={cardBgColorFrente}
                            onChange={(e) => handleUpdateBgColor(e.target.value, 'frente')}
                            className="w-5 h-5 rounded border cursor-pointer"
                          />
                          <Input 
                            type="text" 
                            value={cardBgColorFrente} 
                            onChange={(e) => handleUpdateBgColor(e.target.value, 'frente')} 
                            className="h-6 w-20 text-[10px] font-mono uppercase p-1 text-center" 
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {[
                          { color: "#FFFFFF", name: "Branco" },
                          { color: "#F8FAFC", name: "Gelo" },
                          { color: "#FEFCE8", name: "Marfim" },
                          { color: "#FEF3C7", name: "Dourado" },
                          { color: "#E0F2FE", name: "Azul Céu" },
                          { color: "#DCFCE7", name: "Menta" },
                          { color: "#F1F5F9", name: "Cinza" },
                          { color: "#0F172A", name: "Escuro" }
                        ].map((item) => (
                          <button
                            key={`frente-${item.color}`}
                            type="button"
                            onClick={() => handleUpdateBgColor(item.color, 'frente')}
                            className={`px-2 py-0.5 rounded border text-[10px] flex items-center gap-1.5 transition-all ${
                              cardBgColorFrente.toLowerCase() === item.color.toLowerCase() ? "ring-2 ring-primary font-bold bg-background shadow-xs" : "hover:bg-muted/80"
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: item.color }}></span>
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Fundo do Verso */}
                    <div className="space-y-1.5 p-2.5 rounded-lg bg-muted/40 border">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground">Cor do Fundo do Verso:</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="color" 
                            value={cardBgColorVerso}
                            onChange={(e) => handleUpdateBgColor(e.target.value, 'verso')}
                            className="w-5 h-5 rounded border cursor-pointer"
                          />
                          <Input 
                            type="text" 
                            value={cardBgColorVerso} 
                            onChange={(e) => handleUpdateBgColor(e.target.value, 'verso')} 
                            className="h-6 w-20 text-[10px] font-mono uppercase p-1 text-center" 
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {[
                          { color: "#FFFFFF", name: "Branco" },
                          { color: "#F8FAFC", name: "Gelo" },
                          { color: "#FEFCE8", name: "Marfim" },
                          { color: "#FEF3C7", name: "Dourado" },
                          { color: "#E0F2FE", name: "Azul Céu" },
                          { color: "#DCFCE7", name: "Menta" },
                          { color: "#F1F5F9", name: "Cinza" },
                          { color: "#0F172A", name: "Escuro" }
                        ].map((item) => (
                          <button
                            key={`verso-${item.color}`}
                            type="button"
                            onClick={() => handleUpdateBgColor(item.color, 'verso')}
                            className={`px-2 py-0.5 rounded border text-[10px] flex items-center gap-1.5 transition-all ${
                              cardBgColorVerso.toLowerCase() === item.color.toLowerCase() ? "ring-2 ring-primary font-bold bg-background shadow-xs" : "hover:bg-muted/80"
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-slate-300" style={{ backgroundColor: item.color }}></span>
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 6. COR DA FAIXA DO REGISTRO E QR CODE */}
                  <div className="space-y-1.5 bg-background p-2.5 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-semibold">Cor da Faixa do Registro & QR Code</Label>
                      <Badge variant="outline" className="text-[9px] bg-muted/50">Rodapé Frente</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectFooterPreset("light_gray")}
                        className={`p-1 rounded border text-[10px] font-medium flex items-center justify-center gap-1 ${
                          footerStylePreset === "light_gray" ? "bg-primary text-white border-primary" : "bg-muted/40 hover:bg-muted"
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-slate-100 border"></span>
                        Cinza Claro
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectFooterPreset("gold")}
                        className={`p-1 rounded border text-[10px] font-medium flex items-center justify-center gap-1 ${
                          footerStylePreset === "gold" ? "bg-primary text-white border-primary" : "bg-muted/40 hover:bg-muted"
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-100 border"></span>
                        Dourado
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectFooterPreset("theme")}
                        className={`p-1 rounded border text-[10px] font-medium flex items-center justify-center gap-1 ${
                          footerStylePreset === "theme" ? "bg-primary text-white border-primary" : "bg-muted/40 hover:bg-muted"
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full border" style={{ backgroundColor: currentTheme.primary }}></span>
                        Tom do Tema
                      </button>
                    </div>

                    {/* Seletor manual para a faixa de registro */}
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Fundo Faixa:</span>
                        <div className="flex items-center gap-1">
                          <input 
                            type="color" 
                            value={footerBgColor}
                            onChange={(e) => {
                              setFooterStylePreset("custom");
                              setFooterBgColor(e.target.value);
                            }}
                            className="w-5 h-5 rounded border cursor-pointer"
                          />
                          <span className="text-[9px] font-mono">{footerBgColor}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">Texto Registro:</span>
                        <div className="flex items-center gap-1">
                          <input 
                            type="color" 
                            value={footerTextColor}
                            onChange={(e) => {
                              setFooterStylePreset("custom");
                              setFooterTextColor(e.target.value);
                            }}
                            className="w-5 h-5 rounded border cursor-pointer"
                          />
                          <span className="text-[9px] font-mono">{footerTextColor}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 7. EDIÇÃO COMPLETA DE TEXTOS DA FRENTE */}
                  <div className="space-y-2.5 bg-background p-3 rounded-xl border shadow-2xs">
                    <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-primary" />
                      Textos da Frente do Crachá
                    </Label>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground font-semibold">Tema Superior</Label>
                        <Input 
                          value={customHeaderTitle} 
                          onChange={(e) => setCustomHeaderTitle(e.target.value)} 
                          placeholder="O BRASIL PARA CRISTO"
                          className="h-8 text-xs font-bold" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground font-semibold">Subtítulo / Congregação</Label>
                        <Input 
                          value={customHeaderSubtitle} 
                          onChange={(e) => setCustomHeaderSubtitle(e.target.value)} 
                          placeholder="2ª Congregação"
                          className="h-8 text-xs font-semibold" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground font-semibold">Nome no Crachá</Label>
                        <Input 
                          value={customName} 
                          onChange={(e) => setCustomName(e.target.value)} 
                          className="h-8 text-xs font-bold" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground font-semibold">Cargo / Faixa Destaque</Label>
                        <Input 
                          value={customRole} 
                          onChange={(e) => setCustomRole(e.target.value)} 
                          className="h-8 text-xs font-bold text-primary" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground font-semibold">Departamento / Equipe</Label>
                        <Input 
                          value={customDepartment} 
                          onChange={(e) => setCustomDepartment(e.target.value)} 
                          className="h-8 text-[11px]" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground font-semibold">Nº Matrícula</Label>
                        <Input 
                          value={customMatricula} 
                          onChange={(e) => setCustomMatricula(e.target.value)} 
                          className="h-8 text-xs font-mono font-bold" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground font-semibold">Validade / Gestão</Label>
                        <Input 
                          value={customValidity} 
                          onChange={(e) => setCustomValidity(e.target.value)} 
                          className="h-8 text-xs font-semibold" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* 8. EDIÇÃO COMPLETA DE TEXTOS DO VERSO */}
                  <div className="space-y-2.5 bg-background p-3 rounded-xl border shadow-2xs">
                    <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-primary" />
                      Textos do Verso do Crachá
                    </Label>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground font-semibold">Título do Verso</Label>
                        <Input 
                          value={customVersoHeader} 
                          onChange={(e) => setCustomVersoHeader(e.target.value)} 
                          placeholder="TERMO DE IDENTIFICAÇÃO ECLESIÁSTICA"
                          className="h-8 text-xs font-bold" 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground font-semibold">Subtítulo / Vinculação</Label>
                        <Input 
                          value={customVersoSubheader} 
                          onChange={(e) => setCustomVersoSubheader(e.target.value)} 
                          placeholder="DIACONATO • CORPO ECLESIÁSTICO"
                          className="h-8 text-xs font-semibold text-blue-600" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Instruções de Uso (3 Linhas)</Label>
                      <Input 
                        value={customVersoLine1} 
                        onChange={(e) => setCustomVersoLine1(e.target.value)} 
                        placeholder="Instrução 1"
                        className="h-7 text-xs" 
                      />
                      <Input 
                        value={customVersoLine2} 
                        onChange={(e) => setCustomVersoLine2(e.target.value)} 
                        placeholder="Instrução 2"
                        className="h-7 text-xs" 
                      />
                      <Input 
                        value={customVersoLine3} 
                        onChange={(e) => setCustomVersoLine3(e.target.value)} 
                        placeholder="Instrução 3"
                        className="h-7 text-xs" 
                      />
                    </div>

                    <div className="space-y-1.5 pt-1 border-t">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Versículo Bíblico ou Lema</Label>
                      <Input 
                        value={customVersoVerse} 
                        onChange={(e) => setCustomVersoVerse(e.target.value)} 
                        placeholder="Texto bíblico inspirador..."
                        className="h-8 text-xs italic" 
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input 
                          value={customVersoVerseRef} 
                          onChange={(e) => setCustomVersoVerseRef(e.target.value)} 
                          placeholder="Referência (ex: 1 Timóteo 3:13)"
                          className="h-7 text-xs font-bold" 
                        />
                        <Input 
                          value={customChurchFooter} 
                          onChange={(e) => setCustomChurchFooter(e.target.value)} 
                          placeholder="Rodapé Institucional"
                          className="h-7 text-xs text-muted-foreground" 
                        />
                      </div>
                    </div>

                    {/* Assinatura Oficial do Verso */}
                    <div className="space-y-1 pt-1 border-t">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Assinatura Oficial do Verso</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-muted-foreground">Cargo da Assinatura</Label>
                          <Input 
                            value={customResponsibleRole} 
                            onChange={(e) => setCustomResponsibleRole(e.target.value)} 
                            placeholder="DIRETOR(A) DO DIACONATO" 
                            className="h-7 text-xs" 
                          />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[9px] text-muted-foreground">Nome da Assinatura</Label>
                          <Input 
                            value={customResponsibleName} 
                            onChange={(e) => setCustomResponsibleName(e.target.value)} 
                            placeholder="Nome do Pastor ou Diretor" 
                            className="h-7 text-xs font-bold" 
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 9. PALETA DE CORES EXPANDIDA (10 opções + Cores Livres) */}
                  <div className="space-y-1.5 pt-2 border-t">
                    <Label className="text-xs font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-primary" />
                        Opções de Cores do Tema da Faixa
                      </span>
                      <span className="text-[10px] text-muted-foreground">10 temas disponíveis</span>
                    </Label>
                    
                    <div className="grid grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-1">
                      {COLOR_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => setSelectedThemeId(theme.id)}
                          className={`flex items-center justify-between p-1.5 px-2 rounded-md border text-left text-xs transition-all ${
                            selectedThemeId === theme.id 
                              ? 'border-primary ring-1 ring-primary bg-primary/10 font-bold' 
                              : 'hover:bg-muted/60 text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="w-3 h-3 rounded-full shrink-0 border border-black/20" style={{ backgroundColor: theme.primary }}></span>
                            <span className="text-[10px] truncate">{theme.name}</span>
                          </div>
                          {selectedThemeId === theme.id && <Check className="w-3 h-3 text-primary shrink-0" />}
                        </button>
                      ))}
                    </div>

                    {/* Seleção de cores manuais se escolher "Personalizado" */}
                    {selectedThemeId === "custom" && (
                      <div className="grid grid-cols-2 gap-2 pt-1 bg-background p-2 rounded-lg border">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium">Cor Cabeçalho</Label>
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="color" 
                              value={customPrimaryColor}
                              onChange={(e) => setCustomPrimaryColor(e.target.value)}
                              className="w-7 h-7 rounded border cursor-pointer"
                            />
                            <span className="text-[10px] font-mono">{customPrimaryColor}</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-medium">Cor Faixa Cargo</Label>
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="color" 
                              value={customBadgeColor}
                              onChange={(e) => setCustomBadgeColor(e.target.value)}
                              className="w-7 h-7 rounded border cursor-pointer"
                            />
                            <span className="text-[10px] font-mono">{customBadgeColor}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 10. Upload de Foto 3x4 do Voluntário */}
                  <div className="space-y-1.5 pt-2 border-t">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-primary" />
                      Foto 3x4 do Voluntário
                    </Label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handlePhotoUpload} 
                        accept="image/*" 
                        className="hidden" 
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => fileInputRef.current?.click()}
                        className="h-8 text-xs flex-1 font-medium"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1" />
                        {customPhotoUrl ? "Trocar Foto" : "Carregar Foto"}
                      </Button>
                      {customPhotoUrl && (
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setCustomPhotoUrl(null)}
                          className="h-8 text-xs text-red-500 hover:text-red-700 px-2"
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      A foto é automaticamente centralizada no centro geométrico do crachá.
                    </p>
                  </div>
                </div>

                {/* Área de Visualização e Exportação (7 colunas) FIXA / STICKY */}
                <div className="lg:col-span-7 flex flex-col items-center justify-between p-4 sm:p-5 bg-slate-100 dark:bg-slate-900/60 rounded-xl border lg:sticky lg:top-0 lg:overflow-y-auto lg:max-h-[calc(92vh-155px)]">
                  <div className="text-center mb-3">
                    <div className="flex items-center justify-center gap-2">
                      <Badge variant="outline" className="text-[10px] bg-background font-bold text-slate-800">
                        Dimensões Físicas Reais: {badgeWidthMm} mm × {badgeHeightMm} mm
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">
                        Foto Centralizada & Cores Customizadas
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Visualização exata para impressão em papel couchê ou PVC com guia de corte.
                    </p>
                  </div>

                  {/* Contêiner de Impressão e Captura de Imagem do Crachá Individual */}
                  <div 
                    id="cracha-print-single"
                    className="bg-white p-4 sm:p-6 rounded-lg shadow-xl border border-slate-300 flex flex-col items-center justify-center print:m-0 print:p-0 print:shadow-none print:border-none"
                    style={{ boxSizing: 'border-box' }}
                  >
                    <div className="flex flex-row items-center justify-center gap-6 print:gap-4">
                      {/* Frente */}
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 print:hidden">
                          FRENTE ({badgeWidthMm}×{badgeHeightMm}mm)
                        </span>
                        <div id="cracha-export-frente">
                          {renderCrachaFrente({
                            name: customName,
                            role: customRole,
                            matricula: customMatricula,
                            photo: customPhotoUrl
                          })}
                        </div>
                      </div>

                      {/* Linha pontilhada de dobra entre frente e verso */}
                      <div 
                        className="border-r border-dashed border-slate-400 my-auto print:border-slate-600"
                        style={{ height: `${badgeHeightMm}mm` }}
                      ></div>

                      {/* Verso */}
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 print:hidden">
                          VERSO ({badgeWidthMm}×{badgeHeightMm}mm)
                        </span>
                        <div id="cracha-export-verso">
                          {renderCrachaVerso()}
                        </div>
                      </div>
                    </div>

                    <div className="text-[8px] text-slate-400 mt-2 text-center print:text-slate-600">
                      Linha pontilhada indica marca de dobra para crachá frente e verso. Recorte nas bordas sólidas.
                    </div>
                  </div>

                  {/* BARRA DE AÇÕES: SALVAR COMO IMAGEM E IMPRESSÃO */}
                  <div className="mt-4 w-full flex flex-wrap items-center justify-center gap-2 pt-3 border-t">
                    <Button 
                      size="sm" 
                      onClick={handlePrintCrachas} 
                      className="h-8 text-xs font-semibold bg-primary hover:bg-primary/90"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir Crachá
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleDownloadPdf} 
                      className="h-8 text-xs font-medium"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> Baixar PDF
                    </Button>

                    {/* SALVAR COMO IMAGEM (PNG) */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSaveAsImage("cracha-export-frente", `Cracha_Frente_${customName.replace(/\s+/g, '_')}.png`)}
                      className="h-8 text-xs font-medium text-amber-700 dark:text-amber-400 border-amber-300"
                    >
                      <FileImage className="w-3.5 h-3.5 mr-1" />
                      Salvar Imagem Frente (.PNG)
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSaveAsImage("cracha-export-verso", `Cracha_Verso_${customName.replace(/\s+/g, '_')}.png`)}
                      className="h-8 text-xs font-medium text-amber-700 dark:text-amber-400 border-amber-300"
                    >
                      <FileImage className="w-3.5 h-3.5 mr-1" />
                      Salvar Verso (.PNG)
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => handleSaveAsImage("cracha-print-single", `Cracha_Completo_${customName.replace(/\s+/g, '_')}.png`)}
                      className="h-8 text-xs font-semibold"
                    >
                      <FileImage className="w-3.5 h-3.5 mr-1 text-primary" />
                      Salvar Imagem Completa (.PNG)
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* ============================================================== */
              /* MODO EM LOTE (FOLHA A4 COLETIVA COM GRADE DE CRACHÁS)         */
              /* ============================================================== */
              <div className="space-y-4 py-3">
                {/* Barra de Seleção Rápida */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 border">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs font-medium"
                      onClick={() => setBatchSelectedIds(volunteers.map(v => v.id))}
                    >
                      Selecionar Todos ({volunteers.length})
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => setBatchSelectedIds([])}
                    >
                      Desmarcar Todos
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs font-mono">
                      Formato: {badgeWidthMm} × {badgeHeightMm} mm
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      Marcados para impressão: <strong>{batchSelectedIds.length}</strong> crachás
                    </div>
                  </div>
                </div>

                {/* Seletor de voluntários em tags */}
                <div className="flex flex-wrap gap-1.5 p-3 rounded-lg border bg-background max-h-36 overflow-y-auto">
                  {volunteers.map((vol) => {
                    const isChecked = batchSelectedIds.includes(vol.id);
                    return (
                      <button
                        key={vol.id}
                        type="button"
                        onClick={() => handleToggleBatchVolunteer(vol.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border flex items-center gap-1.5 transition-all ${
                          isChecked 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : 'bg-muted/40 hover:bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {isChecked && <Check className="w-3 h-3" />}
                        <span>{vol.name}</span>
                        <span className="text-[10px] opacity-80">({vol.role || "Voluntário"})</span>
                      </button>
                    );
                  })}
                </div>

                {/* Grade de Impressão Coletiva na Folha A4 */}
                <div className="flex justify-center p-4 bg-slate-100 dark:bg-slate-900/60 rounded-xl overflow-x-auto">
                  <div 
                    id="cracha-print-batch"
                    className="bg-white p-6 rounded-sm shadow-xl border border-slate-300 print:m-0 print:p-2 print:shadow-none print:border-none"
                    style={{
                      width: '210mm',
                      minHeight: '297mm',
                      boxSizing: 'border-box',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    {/* Cabeçalho da folha de corte */}
                    <div className="pb-2 mb-3 border-b border-dashed border-slate-300 flex items-center justify-between text-[9px] text-slate-500">
                      <span>IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO • {activeBranchName.toUpperCase()}</span>
                      <span>GRADE DE CRACHÁS DE VOLUNTÁRIOS E DIACONATO ({badgeWidthMm}×{badgeHeightMm}mm)</span>
                      <span>{new Date().toLocaleDateString('pt-BR')}</span>
                    </div>

                    {/* Grade adaptativa de crachás */}
                    <div 
                      className="grid gap-4 justify-items-center"
                      style={{
                        gridTemplateColumns: badgeWidthMm <= 56 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)'
                      }}
                    >
                      {volunteers
                        .filter(v => batchSelectedIds.includes(v.id))
                        .map((vol, idx) => (
                          <div key={vol.id} className="relative p-1 border border-dashed border-slate-300 rounded">
                            {renderCrachaFrente({
                              name: vol.name,
                              role: vol.role || "Diaconato",
                              matricula: `DIA-2026-${String(idx + 1).padStart(3, '0')}`,
                              photo: null
                            })}
                          </div>
                        ))}
                    </div>

                    {batchSelectedIds.length === 0 && (
                      <div className="text-center py-20 text-slate-400 font-medium">
                        Nenhum voluntário selecionado para a folha de crachás.
                      </div>
                    )}
                  </div>
                </div>

                {/* Ações da Folha em Lote */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleSaveAsImage("cracha-print-batch", `Folha_A4_Crachas_${activeBranchName.replace(/\s+/g, '_')}.png`)}
                    className="h-8 text-xs font-medium"
                  >
                    <FileImage className="w-3.5 h-3.5 mr-1" />
                    Salvar Folha em Imagem (.PNG)
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="h-8 text-xs">
                    <Download className="w-3.5 h-3.5 mr-1" /> Baixar PDF A4
                  </Button>
                  <Button size="sm" onClick={handlePrintCrachas} className="h-8 text-xs font-semibold">
                    <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir Folha A4
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-2 shrink-0 flex items-center justify-between sm:justify-between">
            <span className="text-xs text-muted-foreground">
              Formato com proporção áurea, contraste inteligente e alinhamento milimétrico para corte.
            </span>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE VALIDAÇÃO DO QR CODE */}
      <Dialog open={isValidatingQr} onOpenChange={setIsValidatingQr}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-emerald-100 text-emerald-700">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">
                  Validação de Autenticidade do Crachá
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Leitura instantânea dos dados codificados no QR Code oficial.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <div className="flex items-center justify-center p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-bold gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>REGISTRO 100% VÁLIDO E AUTENTICADO NO SISTEMA</span>
            </div>

            <div className="space-y-2 bg-slate-50 p-3 rounded-lg border text-xs">
              <div className="flex justify-between border-b pb-1">
                <span className="text-muted-foreground">Nome do Titular:</span>
                <span className="font-bold text-slate-900">{customName}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-muted-foreground">Cargo:</span>
                <span className="font-bold text-slate-900">{customRole}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-muted-foreground">Nº de Matrícula:</span>
                <span className="font-mono font-bold text-slate-900">{customMatricula}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-muted-foreground">Departamento:</span>
                <span className="font-semibold text-slate-900">{customDepartment}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-muted-foreground">Validade:</span>
                <span className="font-bold text-slate-900">{customValidity}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-muted-foreground">Diretoria Responsável:</span>
                <span className="font-bold text-slate-900">{customResponsibleRole} - {customResponsibleName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Congregação:</span>
                <span className="font-semibold text-slate-900">{activeBranchName}</span>
              </div>
            </div>

            <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Ao apontar a câmera do celular ou leitor óptico para o QR Code do crachá físico, estes exatos dados de certificação são verificados em tempo real.
              </span>
            </div>
          </div>

          <DialogFooter className="border-t pt-2">
            <Button size="sm" onClick={() => setIsValidatingQr(false)} className="w-full">
              Fechar Validação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
