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
  Paintbrush,
  ZoomIn,
  ZoomOut,
  Trash2,
  Type,
  Plus,
  Minus,
  BookmarkPlus,
  BookmarkCheck,
  Scissors,
  Save,
  SlidersHorizontal,
  FolderOpen,
  Circle,
  Square,
  Video,
  VideoOff,
  RefreshCw,
  Crop,
  Crosshair,
  Move,
  UserCheck,
  HeartHandshake,
  Baby,
  GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { printDocument, downloadElementAsPdf } from "@/lib/printUtils";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

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
  volunteers?: Array<{ id: string; name: string; role?: string; phone?: string; photo?: string; photoUrl?: string }>;
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

// Tipografia Totalmente Customizável (Tamanho de Fonte em Pixels para Cada Posição)
export interface CrachaFontSizes {
  // Frente
  headerTitle: number;
  headerSubtitle: number;
  role: number;
  name: number;
  department: number;
  matricula: number;
  matriculaLabel: number;
  validade: number;
  // Verso
  versoHeader: number;
  versoSubheader: number;
  versoRules: number;
  versoVerse: number;
  versoVerseRef: number;
  versoSignatureRole: number;
  versoSignatureName: number;
  versoFooter: number;
}

export const DEFAULT_CRACHA_FONT_SIZES: CrachaFontSizes = {
  headerTitle: 8.5,
  headerSubtitle: 7,
  role: 9.5,
  name: 10,
  department: 6.5,
  matricula: 9,
  matriculaLabel: 7,
  validade: 7,
  versoHeader: 7.5,
  versoSubheader: 7,
  versoRules: 7,
  versoVerse: 6.5,
  versoVerseRef: 6.5,
  versoSignatureRole: 8.5,
  versoSignatureName: 7.5,
  versoFooter: 6
};

// Interface Completa de Modelos de Crachá (Salvar como Modelo)
export interface BadgeTemplate {
  id: string;
  name: string;
  category: 'padrao' | 'personalizado';
  tag: 'Membro' | 'Obreiro' | 'Visitante' | 'Voluntário' | 'Berçário' | 'Ensino Infantil' | 'Diaconato' | 'Louvor' | 'Kids' | 'Jovens' | 'Outro';
  description?: string;
  createdAt?: string;

  // Dimensões & Margens Internas de Segurança (mm)
  badgeWidthMm: number;
  badgeHeightMm: number;
  selectedSizePreset: string;
  safeMarginMm: number;
  safeMarginTopMm: number;
  safeMarginBottomMm: number;
  safeMarginSideMm: number;
  useIndividualMargins: boolean;

  // Temas e Cores
  selectedThemeId: string;
  customPrimaryColor: string;
  customBadgeColor: string;
  cardBgColorFrente: string;
  cardBgColorVerso: string;
  footerBgColor: string;
  footerTextColor: string;
  footerStylePreset: string;

  // Bordas do Crachá
  badgeBorderTop?: boolean;
  badgeBorderBottom?: boolean;
  badgeBorderLeft?: boolean;
  badgeBorderRight?: boolean;
  badgeBorderWidth?: number;
  badgeBorderColor?: string;
  badgeBorderStyle?: 'solid' | 'double' | 'dashed';
  badgeBorderRadius?: 'none' | 'sm' | 'md' | 'lg';

  // Foto do Membro: Máscara, Zoom e Centralização
  photoShape?: 'rect' | 'circle' | 'rounded';
  photoZoom?: number;
  photoOffsetX?: number;
  photoOffsetY?: number;
  photoBorderColor?: string;
  photoBorderWidth?: number;

  // Logo
  logoSize: 'normal' | 'grande' | 'extragrande';
  logoHeightPx: number;
  logoColorMode: 'original' | 'white' | 'gold' | 'black' | 'custom';
  customLogoColor: string;
  logoHasOutline: boolean;
  logoOutlineColor: string;
  logoOutlineWidth: 'fino' | 'medio' | 'forte';
  logoBgShape: 'circle' | 'rounded' | 'square' | 'transparent';
  logoBgColor: string;
  logoPadding: number;
  removeLogoWhiteBg: boolean;

  // QR Code
  qrCodeSizePx: number;
  qrCodeColor: string;
  qrCodeBgColor: string;
  qrHasBorder: boolean;
  qrBorderColor: string;
  qrBorderWidth: 'fino' | 'medio' | 'forte';
  qrBorderRadius: 'none' | 'sm' | 'md' | 'lg';

  // Tipografia Livre
  fontSizes: CrachaFontSizes;

  // Textos Frente
  headerTitle: string;
  headerSubtitle?: string;
  defaultRole: string;
  defaultDepartment: string;
  matriculaPrefix: string;
  validity: string;
  includeVerso: boolean;

  // Textos Verso
  versoHeader: string;
  versoSubheader: string;
  versoLine1: string;
  versoLine2: string;
  versoLine3: string;
  versoVerse: string;
  versoVerseRef: string;
  responsibleRole: string;
}

export const DEFAULT_BADGE_TEMPLATES: BadgeTemplate[] = [
  {
    id: "tpl_membro",
    name: "Membro em Plena Comunhão",
    category: "padrao",
    tag: "Membro",
    description: "Identificação solene em Azul Marinho Real para membros da igreja com QR Code oficial e termo de membresia.",
    badgeWidthMm: 54,
    badgeHeightMm: 86,
    selectedSizePreset: "cr80",
    safeMarginMm: 3.5,
    safeMarginTopMm: 4.0,
    safeMarginBottomMm: 3.5,
    safeMarginSideMm: 3.0,
    useIndividualMargins: false,
    selectedThemeId: "navy",
    customPrimaryColor: "#1E3A8A",
    customBadgeColor: "#D97706",
    cardBgColorFrente: "#FFFFFF",
    cardBgColorVerso: "#FFFFFF",
    footerBgColor: "#F8FAFC",
    footerTextColor: "#0F172A",
    footerStylePreset: "light_gray",
    logoSize: "grande",
    logoHeightPx: 46,
    logoColorMode: "original",
    customLogoColor: "#FFFFFF",
    logoHasOutline: true,
    logoOutlineColor: "#FFFFFF",
    logoOutlineWidth: "medio",
    logoBgShape: "circle",
    logoBgColor: "#FFFFFF",
    logoPadding: 3,
    removeLogoWhiteBg: false,
    qrCodeSizePx: 28,
    qrCodeColor: "#000000",
    qrCodeBgColor: "#FFFFFF",
    qrHasBorder: true,
    qrBorderColor: "#CBD5E1",
    qrBorderWidth: "fino",
    qrBorderRadius: "md",
    fontSizes: DEFAULT_CRACHA_FONT_SIZES,
    headerTitle: "O BRASIL PARA CRISTO",
    defaultRole: "Membro em Comunhão",
    defaultDepartment: "MEMBRO OFICIAL",
    matriculaPrefix: "MEM-2026",
    validity: "2026 / 2027",
    includeVerso: true,
    versoHeader: "TERMO DE IDENTIFICAÇÃO ECLESIÁSTICA",
    versoSubheader: "MEMBRESIA • COMUNHÃO ECLESIÁSTICA",
    versoLine1: "Identificação eclesiástica pessoal e intransferível de membro.",
    versoLine2: "Válido para participação em assembleias, cultos e reuniões.",
    versoLine3: "Em caso de perda ou extravio, comunique imediatamente a Secretaria.",
    versoVerse: "Assim que já não sois estrangeiros, nem forasteiros, mas concidadãos dos Santos e da família de Deus.",
    versoVerseRef: "Efésios 2:19",
    responsibleRole: "SECRETÁRIO(A) GERAL"
  },
  {
    id: "tpl_obreiro",
    name: "Obreiro & Ministério",
    category: "padrao",
    tag: "Obreiro",
    description: "Credencial nobre em Vinho & Ouro Antigo para Pastores, Presbíteros, Evangelistas, Diáconos e Obreiros.",
    badgeWidthMm: 54,
    badgeHeightMm: 86,
    selectedSizePreset: "cr80",
    safeMarginMm: 3.5,
    safeMarginTopMm: 4.0,
    safeMarginBottomMm: 3.5,
    safeMarginSideMm: 3.0,
    useIndividualMargins: false,
    selectedThemeId: "wine",
    customPrimaryColor: "#831843",
    customBadgeColor: "#B45309",
    cardBgColorFrente: "#FFFFFF",
    cardBgColorVerso: "#FFFFFF",
    footerBgColor: "#FEF3C7",
    footerTextColor: "#78350F",
    footerStylePreset: "gold",
    logoSize: "grande",
    logoHeightPx: 46,
    logoColorMode: "original",
    customLogoColor: "#FFFFFF",
    logoHasOutline: true,
    logoOutlineColor: "#FFFFFF",
    logoOutlineWidth: "medio",
    logoBgShape: "circle",
    logoBgColor: "#FFFFFF",
    logoPadding: 3,
    removeLogoWhiteBg: false,
    qrCodeSizePx: 30,
    qrCodeColor: "#831843",
    qrCodeBgColor: "#FEF3C7",
    qrHasBorder: true,
    qrBorderColor: "#B45309",
    qrBorderWidth: "medio",
    qrBorderRadius: "md",
    fontSizes: DEFAULT_CRACHA_FONT_SIZES,
    headerTitle: "O BRASIL PARA CRISTO",
    defaultRole: "Obreiro(a) do Senhor",
    defaultDepartment: "CORPO MINISTERIAL & DIACONAL",
    matriculaPrefix: "OBR-2026",
    validity: "2026 / 2027",
    includeVerso: true,
    versoHeader: "CREDENCIAL MINISTERIAL OFICIAL",
    versoSubheader: "MINISTÉRIO ECLESIÁSTICO • CORPO DE OBREIROS",
    versoLine1: "Credencial ministerial oficial para serviço ao altar e à igreja.",
    versoLine2: "Identifica o obreiro devidamente consagrado pela congregação.",
    versoLine3: "Uso obrigatório nas celebrações, unções e visitas eclesiásticas.",
    versoVerse: "Porque os que servirem bem como diáconos adquirirão para si uma boa posição e muita confiança na fé que há em Cristo Jesus.",
    versoVerseRef: "1 Timóteo 3:13",
    responsibleRole: "PASTOR TITULAR / MINISTÉRIO"
  },
  {
    id: "tpl_visitante",
    name: "Visitante de Honra & Convidado",
    category: "padrao",
    tag: "Visitante",
    description: "Design acolhedor em Verde Esmeralda para visitantes, congressistas e pregadores convidados.",
    badgeWidthMm: 54,
    badgeHeightMm: 86,
    selectedSizePreset: "cr80",
    safeMarginMm: 3.5,
    safeMarginTopMm: 4.0,
    safeMarginBottomMm: 3.5,
    safeMarginSideMm: 3.0,
    useIndividualMargins: false,
    selectedThemeId: "emerald",
    customPrimaryColor: "#065F46",
    customBadgeColor: "#D97706",
    cardBgColorFrente: "#FFFFFF",
    cardBgColorVerso: "#FFFFFF",
    footerBgColor: "#F8FAFC",
    footerTextColor: "#0F172A",
    footerStylePreset: "light_gray",
    logoSize: "grande",
    logoHeightPx: 46,
    logoColorMode: "original",
    customLogoColor: "#FFFFFF",
    logoHasOutline: true,
    logoOutlineColor: "#FFFFFF",
    logoOutlineWidth: "medio",
    logoBgShape: "circle",
    logoBgColor: "#FFFFFF",
    logoPadding: 3,
    removeLogoWhiteBg: false,
    qrCodeSizePx: 28,
    qrCodeColor: "#065F46",
    qrCodeBgColor: "#FFFFFF",
    qrHasBorder: true,
    qrBorderColor: "#CBD5E1",
    qrBorderWidth: "fino",
    qrBorderRadius: "md",
    fontSizes: DEFAULT_CRACHA_FONT_SIZES,
    headerTitle: "O BRASIL PARA CRISTO",
    defaultRole: "Visitante de Honra",
    defaultDepartment: "RECEPÇÃO & HOSPITALIDADE",
    matriculaPrefix: "VIS-2026",
    validity: "GESTÃO 2026",
    includeVerso: true,
    versoHeader: "CREDENCIAL DE CONVIDADO",
    versoSubheader: "RECEPÇÃO • BOAS-VINDAS AO TEMPLO",
    versoLine1: "Bem-vindo à Igreja Evangélica Pentecostal O Brasil para Cristo!",
    versoLine2: "Identificação especial para cultos solenes, conferências e eventos.",
    versoLine3: "Guarde com carinho como lembrança da sua abençoada visita.",
    versoVerse: "Alegrei-me quando me disseram: Vamos à casa do Senhor!",
    versoVerseRef: "Salmos 122:1",
    responsibleRole: "EQUIPE DE RECEPÇÃO & BOAS-VINDAS"
  },
  {
    id: "tpl_diaconato",
    name: "Diaconato & Portaria",
    category: "padrao",
    tag: "Diaconato",
    description: "Credencial clássica para voluntários de acolhimento, recolhimento de ofertas e ordem.",
    badgeWidthMm: 54,
    badgeHeightMm: 86,
    selectedSizePreset: "cr80",
    safeMarginMm: 3.5,
    safeMarginTopMm: 4.0,
    safeMarginBottomMm: 3.5,
    safeMarginSideMm: 3.0,
    useIndividualMargins: false,
    selectedThemeId: "wine",
    customPrimaryColor: "#831843",
    customBadgeColor: "#BE185D",
    cardBgColorFrente: "#FFFFFF",
    cardBgColorVerso: "#FFFFFF",
    footerBgColor: "#F8FAFC",
    footerTextColor: "#0F172A",
    footerStylePreset: "light_gray",
    logoSize: "grande",
    logoHeightPx: 46,
    logoColorMode: "original",
    customLogoColor: "#FFFFFF",
    logoHasOutline: true,
    logoOutlineColor: "#FFFFFF",
    logoOutlineWidth: "medio",
    logoBgShape: "circle",
    logoBgColor: "#FFFFFF",
    logoPadding: 3,
    removeLogoWhiteBg: false,
    qrCodeSizePx: 28,
    qrCodeColor: "#000000",
    qrCodeBgColor: "#FFFFFF",
    qrHasBorder: true,
    qrBorderColor: "#CBD5E1",
    qrBorderWidth: "fino",
    qrBorderRadius: "md",
    fontSizes: DEFAULT_CRACHA_FONT_SIZES,
    headerTitle: "O BRASIL PARA CRISTO",
    defaultRole: "Diaconisa",
    defaultDepartment: "DIACONATO & PORTARIA",
    matriculaPrefix: "DIA-2026",
    validity: "2026 / 2027",
    includeVerso: true,
    versoHeader: "TERMO DE IDENTIFICAÇÃO ECLESIÁSTICA",
    versoSubheader: "DIACONATO • CORPO ECLESIÁSTICO",
    versoLine1: "Uso pessoal, intransferível e obrigatório nos cultos e eventos.",
    versoLine2: "Identifica o voluntário devidamente escalado na congregação.",
    versoLine3: "Em caso de perda ou dano, avise à Secretaria da Igreja.",
    versoVerse: "Porque os que servirem bem como diáconos adquirirão para si uma boa posição e muita confiança na fé que há em Cristo Jesus.",
    versoVerseRef: "1 Timóteo 3:13",
    responsibleRole: "DIRETOR(A) DO DIACONATO"
  },
  {
    id: "tpl_louvor",
    name: "Ministério de Louvor & Levitas",
    category: "padrao",
    tag: "Louvor",
    description: "Design moderno em Azul Petróleo para cantores, instrumentistas e coral da igreja.",
    badgeWidthMm: 54,
    badgeHeightMm: 86,
    selectedSizePreset: "cr80",
    safeMarginMm: 3.5,
    safeMarginTopMm: 4.0,
    safeMarginBottomMm: 3.5,
    safeMarginSideMm: 3.0,
    useIndividualMargins: false,
    selectedThemeId: "petrol_blue",
    customPrimaryColor: "#0E7490",
    customBadgeColor: "#0284C7",
    cardBgColorFrente: "#FFFFFF",
    cardBgColorVerso: "#FFFFFF",
    footerBgColor: "#F8FAFC",
    footerTextColor: "#0F172A",
    footerStylePreset: "light_gray",
    logoSize: "grande",
    logoHeightPx: 46,
    logoColorMode: "original",
    customLogoColor: "#FFFFFF",
    logoHasOutline: true,
    logoOutlineColor: "#FFFFFF",
    logoOutlineWidth: "medio",
    logoBgShape: "circle",
    logoBgColor: "#FFFFFF",
    logoPadding: 3,
    removeLogoWhiteBg: false,
    qrCodeSizePx: 28,
    qrCodeColor: "#0E7490",
    qrCodeBgColor: "#FFFFFF",
    qrHasBorder: true,
    qrBorderColor: "#CBD5E1",
    qrBorderWidth: "fino",
    qrBorderRadius: "md",
    fontSizes: DEFAULT_CRACHA_FONT_SIZES,
    headerTitle: "O BRASIL PARA CRISTO",
    defaultRole: "Músico / Levita",
    defaultDepartment: "MINISTÉRIO DE LOUVOR & MÚSICA",
    matriculaPrefix: "LOU-2026",
    validity: "2026 / 2027",
    includeVerso: true,
    versoHeader: "MINISTÉRIO DE LOUVOR & MÚSICA",
    versoSubheader: "CORPO MUSICAL • LEVITAS",
    versoLine1: "Credencial dos músicos e levitas escalados nos cultos.",
    versoLine2: "Acesso autorizado à plataforma, estúdio e instrumentos.",
    versoLine3: "Pontualidade aos ensaios e dedicação à ministração.",
    versoVerse: "Tudo quanto tem fôlego louve ao Senhor. Louvai ao Senhor!",
    versoVerseRef: "Salmos 150:6",
    responsibleRole: "MINISTRO DE LOUVOR"
  },
  {
    id: "tpl_kids",
    name: "Ministério Infantil & Kids",
    category: "padrao",
    tag: "Kids",
    description: "Design alegre e acolhedor para professores de EBD, tias e monitores do berçário infantil.",
    badgeWidthMm: 54,
    badgeHeightMm: 86,
    selectedSizePreset: "cr80",
    safeMarginMm: 3.5,
    safeMarginTopMm: 4.0,
    safeMarginBottomMm: 3.5,
    safeMarginSideMm: 3.0,
    useIndividualMargins: false,
    selectedThemeId: "brown_gold",
    customPrimaryColor: "#EA580C",
    customBadgeColor: "#D97706",
    cardBgColorFrente: "#FFFFFF",
    cardBgColorVerso: "#FFFFFF",
    footerBgColor: "#FEF3C7",
    footerTextColor: "#78350F",
    footerStylePreset: "gold",
    logoSize: "grande",
    logoHeightPx: 46,
    logoColorMode: "original",
    customLogoColor: "#FFFFFF",
    logoHasOutline: true,
    logoOutlineColor: "#FFFFFF",
    logoOutlineWidth: "medio",
    logoBgShape: "circle",
    logoBgColor: "#FFFFFF",
    logoPadding: 3,
    removeLogoWhiteBg: false,
    qrCodeSizePx: 28,
    qrCodeColor: "#EA580C",
    qrCodeBgColor: "#FEF3C7",
    qrHasBorder: true,
    qrBorderColor: "#D97706",
    qrBorderWidth: "fino",
    qrBorderRadius: "md",
    fontSizes: DEFAULT_CRACHA_FONT_SIZES,
    headerTitle: "O BRASIL PARA CRISTO",
    defaultRole: "Tia / Monitor Kids",
    defaultDepartment: "DEPARTAMENTO INFANTIL & EBD",
    matriculaPrefix: "KID-2026",
    validity: "2026 / 2027",
    includeVerso: true,
    versoHeader: "DEPARTAMENTO INFANTIL & KIDS",
    versoSubheader: "MINISTÉRIO INFANTIL • EBD",
    versoLine1: "Identificação oficial dos monitores e professores de crianças.",
    versoLine2: "Acesso autorizado às salas de aula, berçário e brinquedoteca.",
    versoLine3: "Atenção zelosa e acolhimento com amor a cada criança.",
    versoVerse: "Instrui o menino no caminho em que deve andar, e, até quando envelhecer, não se desviará dele.",
    versoVerseRef: "Provérbios 22:6",
    responsibleRole: "COORDENADORA INFANTIL"
  },
  {
    id: "tpl_voluntario",
    name: "Voluntário Geral (Posso te Ajudar?)",
    category: "padrao",
    tag: "Voluntário",
    description: "Identificação acolhedora em Azul Petróleo para equipes de apoio, recepção, logística e acolhimento nos cultos.",
    badgeWidthMm: 54,
    badgeHeightMm: 86,
    selectedSizePreset: "cr80",
    safeMarginMm: 3.5,
    safeMarginTopMm: 4.0,
    safeMarginBottomMm: 3.5,
    safeMarginSideMm: 3.0,
    useIndividualMargins: false,
    selectedThemeId: "petrol_blue",
    customPrimaryColor: "#0E7490",
    customBadgeColor: "#0284C7",
    cardBgColorFrente: "#FFFFFF",
    cardBgColorVerso: "#FFFFFF",
    footerBgColor: "#F8FAFC",
    footerTextColor: "#0F172A",
    footerStylePreset: "light_gray",
    photoShape: "rect",
    photoZoom: 1,
    photoOffsetX: 0,
    photoOffsetY: 0,
    logoSize: "grande",
    logoHeightPx: 46,
    logoColorMode: "original",
    customLogoColor: "#FFFFFF",
    logoHasOutline: true,
    logoOutlineColor: "#FFFFFF",
    logoOutlineWidth: "medio",
    logoBgShape: "circle",
    logoBgColor: "#FFFFFF",
    logoPadding: 3,
    removeLogoWhiteBg: false,
    qrCodeSizePx: 28,
    qrCodeColor: "#0E7490",
    qrCodeBgColor: "#FFFFFF",
    qrHasBorder: true,
    qrBorderColor: "#CBD5E1",
    qrBorderWidth: "fino",
    qrBorderRadius: "md",
    fontSizes: DEFAULT_CRACHA_FONT_SIZES,
    headerTitle: "O BRASIL PARA CRISTO",
    defaultRole: "Posso te Ajudar? / Voluntário",
    defaultDepartment: "EQUIPE DE APOIO & EVENTOS",
    matriculaPrefix: "VOL-2026",
    validity: "2026 / 2027",
    includeVerso: true,
    versoHeader: "CREDENCIAL DE VOLUNTARIADO CRISTÃO",
    versoSubheader: "EQUIPE DE APOIO • SERVIÇO CRISTÃO",
    versoLine1: "Voluntário em serviço dedicado ao Reino de Deus e à congregação.",
    versoLine2: "Acesso autorizado aos setores de apoio, recepção e logística de cultos.",
    versoLine3: "Zelar pelo bom testemunho cristão, simpatia e acolhimento fraterno.",
    versoVerse: "Tudo o que fizerem, façam de todo o coração, como para o Senhor, e não para os homens.",
    versoVerseRef: "Colossenses 3:23",
    responsibleRole: "COORDENADOR(A) DE VOLUNTÁRIOS"
  },
  {
    id: "tpl_bercario",
    name: "Berçário & Cuidados com Bebês",
    category: "padrao",
    tag: "Berçário",
    description: "Design suave e seguro em Roxo Imperial / Lilás com corte circular da foto e regras de segurança na entrega aos pais.",
    badgeWidthMm: 54,
    badgeHeightMm: 86,
    selectedSizePreset: "cr80",
    safeMarginMm: 3.5,
    safeMarginTopMm: 4.0,
    safeMarginBottomMm: 3.5,
    safeMarginSideMm: 3.0,
    useIndividualMargins: false,
    selectedThemeId: "purple_royal",
    customPrimaryColor: "#581C87",
    customBadgeColor: "#9333EA",
    cardBgColorFrente: "#FFFFFF",
    cardBgColorVerso: "#FFFFFF",
    footerBgColor: "#FAF5FF",
    footerTextColor: "#581C87",
    footerStylePreset: "light_gray",
    photoShape: "circle",
    photoZoom: 1.05,
    photoOffsetX: 0,
    photoOffsetY: 0,
    logoSize: "grande",
    logoHeightPx: 46,
    logoColorMode: "original",
    customLogoColor: "#FFFFFF",
    logoHasOutline: true,
    logoOutlineColor: "#FFFFFF",
    logoOutlineWidth: "medio",
    logoBgShape: "circle",
    logoBgColor: "#FFFFFF",
    logoPadding: 3,
    removeLogoWhiteBg: false,
    qrCodeSizePx: 28,
    qrCodeColor: "#581C87",
    qrCodeBgColor: "#FAF5FF",
    qrHasBorder: true,
    qrBorderColor: "#C084FC",
    qrBorderWidth: "fino",
    qrBorderRadius: "md",
    fontSizes: DEFAULT_CRACHA_FONT_SIZES,
    headerTitle: "O BRASIL PARA CRISTO",
    defaultRole: "Cuidadora / Berçário",
    defaultDepartment: "BERÇÁRIO & CUIDADOS COM BEBÊS",
    matriculaPrefix: "BER-2026",
    validity: "2026 / 2027",
    includeVerso: true,
    versoHeader: "CREDENCIAL OFICIAL DO BERÇÁRIO",
    versoSubheader: "MINISTÉRIO INFANTIL • CUIDADOS COM BEBÊS",
    versoLine1: "Acesso restrito ao berçário e fraldário da igreja durante as celebrações.",
    versoLine2: "Entrega do bebê somente mediante apresentação da senha ou crachá dos pais.",
    versoLine3: "Higienização constante, amor e zelo com a segurança e o bem-estar dos bebês.",
    versoVerse: "Deixai vir a mim as criancinhas e não as impeçais, porque das tais é o Reino de Deus.",
    versoVerseRef: "Marcos 10:14",
    responsibleRole: "COORDENADORA DO BERÇÁRIO"
  },
  {
    id: "tpl_ensino_infantil",
    name: "Ensino Infantil & Salas de EBD",
    category: "padrao",
    tag: "Ensino Infantil",
    description: "Identificação lúdica e acolhedora em Laranja / Âmbar para tias, professoras de EBD e monitoras de salas de crianças.",
    badgeWidthMm: 54,
    badgeHeightMm: 86,
    selectedSizePreset: "cr80",
    safeMarginMm: 3.5,
    safeMarginTopMm: 4.0,
    safeMarginBottomMm: 3.5,
    safeMarginSideMm: 3.0,
    useIndividualMargins: false,
    selectedThemeId: "brown_gold",
    customPrimaryColor: "#EA580C",
    customBadgeColor: "#D97706",
    cardBgColorFrente: "#FFFFFF",
    cardBgColorVerso: "#FFFFFF",
    footerBgColor: "#FEF3C7",
    footerTextColor: "#78350F",
    footerStylePreset: "gold",
    photoShape: "rect",
    photoZoom: 1,
    photoOffsetX: 0,
    photoOffsetY: 0,
    logoSize: "grande",
    logoHeightPx: 46,
    logoColorMode: "original",
    customLogoColor: "#FFFFFF",
    logoHasOutline: true,
    logoOutlineColor: "#FFFFFF",
    logoOutlineWidth: "medio",
    logoBgShape: "circle",
    logoBgColor: "#FFFFFF",
    logoPadding: 3,
    removeLogoWhiteBg: false,
    qrCodeSizePx: 28,
    qrCodeColor: "#EA580C",
    qrCodeBgColor: "#FEF3C7",
    qrHasBorder: true,
    qrBorderColor: "#D97706",
    qrBorderWidth: "fino",
    qrBorderRadius: "md",
    fontSizes: DEFAULT_CRACHA_FONT_SIZES,
    headerTitle: "O BRASIL PARA CRISTO",
    defaultRole: "Professora EBD Kids",
    defaultDepartment: "ENSINO BÍBLICO INFANTIL",
    matriculaPrefix: "ENS-2026",
    validity: "2026 / 2027",
    includeVerso: true,
    versoHeader: "CREDENCIAL DE ENSINO INFANTIL & EBD",
    versoSubheader: "DEPARTAMENTO INFANTIL • EDUCAÇÃO CRISTÃ",
    versoLine1: "Identificação para professoras e monitoras das salas de ensino bíblico.",
    versoLine2: "Acesso autorizado às salas de aula, material pedagógico e brinquedoteca.",
    versoLine3: "Atenção zelosa e ensino alicerçado na Palavra de Deus com amor.",
    versoVerse: "Instrui o menino no caminho em que deve andar, e, até quando envelhecer, não se desviará dele.",
    versoVerseRef: "Provérbios 22:6",
    responsibleRole: "DIRETORA DO DEPARTAMENTO INFANTIL"
  }
];

// Predefinições Primárias do Seletor Rápido de Modelos (1 Clique)
export const PRIMARY_BADGE_PRESETS = [
  {
    id: "tpl_membro",
    label: "Membro",
    subtitle: "Membro em Comunhão",
    themeId: "navy",
    color: "#1E3A8A",
    badgeColor: "#2563EB",
    icon: UserCheck
  },
  {
    id: "tpl_obreiro",
    label: "Obreiro",
    subtitle: "Corpo Ministerial",
    themeId: "wine",
    color: "#831843",
    badgeColor: "#B45309",
    icon: ShieldCheck
  },
  {
    id: "tpl_visitante",
    label: "Visitante",
    subtitle: "Visitante de Honra",
    themeId: "emerald",
    color: "#065F46",
    badgeColor: "#059669",
    icon: HeartHandshake
  },
  {
    id: "tpl_voluntario",
    label: "Voluntário",
    subtitle: "Posso te Ajudar?",
    themeId: "petrol_blue",
    color: "#0E7490",
    badgeColor: "#0284C7",
    icon: Users
  },
  {
    id: "tpl_bercario",
    label: "Berçário",
    subtitle: "Cuidados com Bebês",
    themeId: "purple_royal",
    color: "#581C87",
    badgeColor: "#9333EA",
    icon: Baby
  },
  {
    id: "tpl_ensino_infantil",
    label: "Ensino Infantil",
    subtitle: "EBD Kids & Salas",
    themeId: "brown_gold",
    color: "#EA580C",
    badgeColor: "#D97706",
    icon: GraduationCap
  }
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
  },
  {
    id: "bercario",
    name: "Berçário & Cuidados com Bebês",
    themeId: "purple_royal",
    headerTitle: "O BRASIL PARA CRISTO",
    role: "Berçarista / Cuidadora",
    department: "BERÇÁRIO • MINISTÉRIO INFANTIL",
    matriculaPrefix: "BER-2026",
    termoHeader: "CREDENCIAL BERÇÁRIO INFANTIL",
    termoSubheader: "BERÇÁRIO INFANTIL • CUIDADO ESPECIAL",
    line1: "Acesso autorizado ao berçário, fraldário e sala de amamentação.",
    line2: "Entrega do bebê permitida somente ao portador do ticket/crachá de mãe.",
    line3: "Zelo, higienização rigorosa e amor maternal no cuidado dos bebês.",
    verse: "Em verdade vos digo que, quando a um destes meus pequeninos irmãos o fizestes, a mim o fizestes.",
    verseRef: "Mateus 25:40",
    responsibleRole: "COORDENADORA DO BERÇÁRIO"
  },
  {
    id: "ebd_salas",
    name: "Salas de Ensino & EBD Infantil",
    themeId: "brown_gold",
    headerTitle: "O BRASIL PARA CRISTO",
    role: "Professora de EBD Infantil",
    department: "ESCOLA BÍBLICA • SALAS DE ENSINO",
    matriculaPrefix: "EBD-2026",
    termoHeader: "CREDENCIAL DE DOCÊNCIA BÍBLICA",
    termoSubheader: "ESCOLA BÍBLICA DOMINICAL • SALAS INFANTIS",
    line1: "Docência bíblica e apoio pedagógico nas salas de aula das crianças.",
    line2: "Acompanhamento do aprendizado espiritual e das dinâmicas cristãs.",
    line3: "Ministrar com mansidão, alegria e sólida fundamentação na Palavra.",
    verse: "Instrui o menino no caminho em que deve andar, e até quando envelhecer não se desviará dele.",
    verseRef: "Provérbios 22:6",
    responsibleRole: "DIRETORIA DA EBD"
  },
  {
    id: "midia_som",
    name: "Mídia, Som & Transmissão (Live)",
    themeId: "petrol_blue",
    headerTitle: "O BRASIL PARA CRISTO",
    role: "Técnico de Som / Mídia",
    department: "COMUNICAÇÃO, MÍDIA & TRANSMISSÃO",
    matriculaPrefix: "MID-2026",
    termoHeader: "IDENTIFICAÇÃO TÉCNICA DE MÍDIA",
    termoSubheader: "COMUNICAÇÃO • ÁUDIO & TRANSMISSÃO",
    line1: "Operação da mesa de áudio, corte de câmeras e transmissão ao vivo.",
    line2: "Acesso à cabine técnica de som, estúdio e mesa de iluminação.",
    line3: "Compromisso com a pontualidade e excelência na transmissão.",
    verse: "E disse-lhes: Ide por todo o mundo, pregai o evangelho a toda criatura.",
    verseRef: "Marcos 16:15",
    responsibleRole: "COORDENADOR DE COMUNICAÇÃO"
  },
  {
    id: "intercessao",
    name: "Intercessão & Sala de Oração",
    themeId: "wine",
    headerTitle: "O BRASIL PARA CRISTO",
    role: "Intercessor(a) de Oração",
    department: "MINISTÉRIO DE INTERCESSÃO & CLAMOR",
    matriculaPrefix: "INT-2026",
    termoHeader: "CREDENCIAL DO CORPO DE ORAÇÃO",
    termoSubheader: "INTERCESSÃO • SALA DE ORAÇÃO",
    line1: "Plantão de oração e intercessão durante os cultos e vigílias da igreja.",
    line2: "Apoio no altar e atendimento pastoral aos que buscam oração.",
    line3: "Sigilo ministerial, empatia e vida consagrada à oração.",
    verse: "Orai sem cessar. Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus para convosco.",
    verseRef: "1 Tessalonicenses 5:17-18",
    responsibleRole: "LÍDER DA INTERCESSÃO"
  },
  {
    id: "acao_social",
    name: "Ação Social & Apoio ao Próximo",
    themeId: "emerald",
    headerTitle: "O BRASIL PARA CRISTO",
    role: "Agente de Ação Social",
    department: "MINISTÉRIO DE AÇÃO SOCIAL & COMUNIDADE",
    matriculaPrefix: "SOC-2026",
    termoHeader: "IDENTIFICAÇÃO DE AÇÃO SOCIAL",
    termoSubheader: "AÇÃO SOCIAL • APOIO COMUNITÁRIO",
    line1: "Triagem e distribuição de cestas básicas, roupas e doações da igreja.",
    line2: "Atendimento acolhedor e compassivo às famílias em vulnerabilidade.",
    line3: "Apoio a mutirões comunitários e projetos beneficentes da congregação.",
    verse: "A religião pura e imaculada para com Deus, o Pai, é esta: Visitar os órfãos e as viúvas nas suas tribulações.",
    verseRef: "Tiago 1:27",
    responsibleRole: "COORDENADOR(A) SOCIAL"
  },
  {
    id: "estacionamento",
    name: "Estacionamento & Trânsito",
    themeId: "slate_lead",
    headerTitle: "O BRASIL PARA CRISTO",
    role: "Agente de Estacionamento",
    department: "APOIO EXTERNO & TRÂNSITO",
    matriculaPrefix: "EST-2026",
    termoHeader: "APOIO VIÁRIO E ESTACIONAMENTO",
    termoSubheader: "ESTACIONAMENTO • SEGURANÇA EXTERNA",
    line1: "Organização do fluxo de veículos e vagas de estacionamento da igreja.",
    line2: "Atenção prioritária para idosos, gestantes e pessoas com deficiência.",
    line3: "Uso obrigatório de crachá de identificação e colete refletivo.",
    verse: "Portanto, meus amados irmãos, sede firmes e constantes, sempre abundantes na obra do Senhor.",
    verseRef: "1 Coríntios 15:58",
    responsibleRole: "COORDENADOR DE SEGURANÇA"
  },
  {
    id: "zeladoria",
    name: "Zeladoria & Apoio ao Templo",
    themeId: "brown_gold",
    headerTitle: "O BRASIL PARA CRISTO",
    role: "Zelador(a) do Templo",
    department: "PATRIMÔNIO & CONSERVAÇÃO",
    matriculaPrefix: "ZEL-2026",
    termoHeader: "CONSERVAÇÃO DO SANTUÁRIO",
    termoSubheader: "PATRIMÔNIO • CONSERVAÇÃO DO TEMPLO",
    line1: "Preparo, higienização e organização das dependências da igreja.",
    line2: "Apoio a cultos de batismo, Santa Ceia e eventos comemorativos.",
    line3: "Cuidar com amor e reverência da Casa de Oração do Senhor.",
    verse: "O zelo da tua casa me consumiu.",
    verseRef: "Salmos 69:9",
    responsibleRole: "DIRETORIA DE PATRIMÔNIO"
  },
  {
    id: "celulas",
    name: "Liderança de Célula / PG",
    themeId: "navy",
    headerTitle: "O BRASIL PARA CRISTO",
    role: "Líder de Célula",
    department: "REDE DE CÉLULAS & PEQUENOS GRUPOS",
    matriculaPrefix: "CEL-2026",
    termoHeader: "CREDENCIAL DE LIDERANÇA DE CÉLULA",
    termoSubheader: "CÉLULAS • COMUNHÃO & DISCIPULADO",
    line1: "Coordenação da reunião semanal da célula no lar anfitrião.",
    line2: "Acompanhamento e discipulado bíblico dos participantes.",
    line3: "Compromisso com os treinamentos e reuniões de líderes da igreja.",
    verse: "E todos os dias, no templo e nas casas, não cessavam de ensinar e de anunciar a Jesus Cristo.",
    verseRef: "Atos 5:42",
    responsibleRole: "COORDENADOR(A) DE CÉLULAS"
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

  // Logo Customization: Fundo, Contorno, Cor da Logo, Tamanho Ampliado (Não fica apagada!)
  const [removeLogoWhiteBg, setRemoveLogoWhiteBg] = useState<boolean>(false);
  const [logoColorMode, setLogoColorMode] = useState<'original' | 'white' | 'gold' | 'black' | 'custom'>('original');
  const [customLogoColor, setCustomLogoColor] = useState<string>("#FFFFFF");
  const [logoSize, setLogoSize] = useState<'normal' | 'grande' | 'extragrande'>('grande');
  const [logoHeightPx, setLogoHeightPx] = useState<number>(46);
  const [logoHasOutline, setLogoHasOutline] = useState<boolean>(true);
  const [logoOutlineColor, setLogoOutlineColor] = useState<string>("#FFFFFF");
  const [logoOutlineWidth, setLogoOutlineWidth] = useState<'fino' | 'medio' | 'forte'>('medio');
  const [logoBgShape, setLogoBgShape] = useState<'circle' | 'rounded' | 'square' | 'transparent'>('circle');
  const [logoBgColor, setLogoBgColor] = useState<string>("#FFFFFF");
  const [logoPadding, setLogoPadding] = useState<number>(3);

  // Personalização Avançada do QR Code (Tamanho, Cores, Modo e Contorno)
  const [qrCodePayloadMode, setQrCodePayloadMode] = useState<'short_url' | 'vcard' | 'text' | 'full_url'>('short_url');
  const [qrCodeSizePx, setQrCodeSizePx] = useState<number>(36);
  const [qrCodeColor, setQrCodeColor] = useState<string>("#000000");
  const [qrCodeBgColor, setQrCodeBgColor] = useState<string>("#FFFFFF");
  const [qrHasBorder, setQrHasBorder] = useState<boolean>(true);
  const [qrBorderColor, setQrBorderColor] = useState<string>("#CBD5E1");
  const [qrBorderWidth, setQrBorderWidth] = useState<'fino' | 'medio' | 'forte'>('fino');
  const [qrBorderRadius, setQrBorderRadius] = useState<'none' | 'sm' | 'md' | 'lg'>('md');

  const resetQrCodeCustomization = () => {
    setQrCodePayloadMode('short_url');
    setQrCodeSizePx(36);
    setQrCodeColor("#000000");
    setQrCodeBgColor("#FFFFFF");
    setQrHasBorder(true);
    setQrBorderColor("#CBD5E1");
    setQrBorderWidth('fino');
    setQrBorderRadius('md');
    toast.success("Estilo do QR Code restaurado ao padrão!");
  };

  // Tipografia Livre: Tamanhos de fonte por posição (Frente & Verso)
  const [fontSizes, setFontSizes] = useState<CrachaFontSizes>(DEFAULT_CRACHA_FONT_SIZES);

  const updateFontSize = (key: keyof CrachaFontSizes, delta: number) => {
    setFontSizes(prev => {
      const current = prev[key] ?? DEFAULT_CRACHA_FONT_SIZES[key];
      const next = Math.max(4, Math.min(26, Math.round((current + delta) * 2) / 2));
      return { ...prev, [key]: next };
    });
  };

  const setExactFontSize = (key: keyof CrachaFontSizes, value: number) => {
    setFontSizes(prev => ({
      ...prev,
      [key]: Math.max(4, Math.min(26, Math.round(value * 2) / 2 || DEFAULT_CRACHA_FONT_SIZES[key]))
    }));
  };

  const applyGlobalFontScale = (factor: number) => {
    setFontSizes(() => {
      const updated: any = {};
      for (const k of Object.keys(DEFAULT_CRACHA_FONT_SIZES) as (keyof CrachaFontSizes)[]) {
        updated[k] = Math.max(4, Math.min(26, Math.round((DEFAULT_CRACHA_FONT_SIZES[k] * factor) * 2) / 2));
      }
      return updated as CrachaFontSizes;
    });
    toast.success(`Tipografia ajustada em ${factor > 1 ? `+${Math.round((factor - 1) * 100)}%` : factor < 1 ? `-${Math.round((1 - factor) * 100)}%` : 'padrão'}`);
  };

  const resetFontSizes = () => {
    setFontSizes(DEFAULT_CRACHA_FONT_SIZES);
    toast.info("Tamanhos de fonte restaurados para o padrão original equilibrado.");
  };

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

  // Margens de Segurança e Corte (Safe Margin Sliders)
  const [safeMarginMm, setSafeMarginMm] = useState<number>(3.5);
  const [safeMarginTopMm, setSafeMarginTopMm] = useState<number>(4.0);
  const [safeMarginBottomMm, setSafeMarginBottomMm] = useState<number>(3.5);
  const [safeMarginSideMm, setSafeMarginSideMm] = useState<number>(3.0);
  const [useIndividualMargins, setUseIndividualMargins] = useState<boolean>(false);
  const [showSafeZoneGuides, setShowSafeZoneGuides] = useState<boolean>(false);

  // Valores Efetivos Calculados para Margens Internas
  const effMarginTop = useIndividualMargins ? safeMarginTopMm : (safeMarginMm + 0.5);
  const effMarginBottom = useIndividualMargins ? safeMarginBottomMm : safeMarginMm;
  const effMarginSide = useIndividualMargins ? safeMarginSideMm : safeMarginMm;

  // Bordas e Moldura do Crachá (Superior, Inferior, Lateral Esquerda e Direita)
  const [badgeBorderTop, setBadgeBorderTop] = useState<boolean>(true);
  const [badgeBorderBottom, setBadgeBorderBottom] = useState<boolean>(true);
  const [badgeBorderLeft, setBadgeBorderLeft] = useState<boolean>(true);
  const [badgeBorderRight, setBadgeBorderRight] = useState<boolean>(true);
  const [badgeBorderWidth, setBadgeBorderWidth] = useState<number>(2);
  const [badgeBorderColor, setBadgeBorderColor] = useState<string>("#0F172A");
  const [badgeBorderStyle, setBadgeBorderStyle] = useState<'solid' | 'double' | 'dashed'>('solid');
  const [badgeBorderRadius, setBadgeBorderRadius] = useState<'none' | 'sm' | 'md' | 'lg'>('md');

  // Foto do Membro: Máscara (Circular ou Quadrada 3x4), Zoom e Centralização
  const [photoShape, setPhotoShape] = useState<'rect' | 'circle' | 'rounded'>('rect');
  const [photoZoom, setPhotoZoom] = useState<number>(1);
  const [photoOffsetX, setPhotoOffsetX] = useState<number>(0);
  const [photoOffsetY, setPhotoOffsetY] = useState<number>(0);
  const [photoBorderColor, setPhotoBorderColor] = useState<string>("#334155");
  const [photoBorderWidth, setPhotoBorderWidth] = useState<number>(2);

  // Modal de Adicionar Foto (Câmera ao Vivo e Seleção de Arquivo)
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('user');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activePhotoTab, setActivePhotoTab] = useState<'camera' | 'upload' | 'adjust'>('camera');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Controle da Câmera (API getUserMedia)
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startCamera = async (facing: 'user' | 'environment' = cameraFacingMode) => {
    try {
      setCameraError(null);
      stopCamera();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("A API de câmera não está disponível ou não é suportada neste navegador.");
      }
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (e) {}
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error("Erro ao iniciar câmera:", err);
      setCameraError(err.message || "Não foi possível acessar a câmera do dispositivo. Verifique as permissões de vídeo.");
      setIsCameraActive(false);
    }
  };

  const toggleCameraFacing = async () => {
    const nextMode = cameraFacingMode === 'user' ? 'environment' : 'user';
    setCameraFacingMode(nextMode);
    if (isCameraActive) {
      await startCamera(nextMode);
    }
  };

  const captureCameraPhoto = () => {
    if (!videoRef.current) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 640;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setCustomPhotoUrl(dataUrl);
      stopCamera();
      setActivePhotoTab('adjust');
      toast.success("Foto capturada com sucesso! Ajuste o zoom, máscara e centralização.");
    } catch (err) {
      toast.error("Erro ao capturar foto da câmera.");
    }
  };

  const handleClosePhotoModal = () => {
    stopCamera();
    setIsPhotoModalOpen(false);
  };

  const handleResetPhotoAdjustments = () => {
    setPhotoZoom(1);
    setPhotoOffsetX(0);
    setPhotoOffsetY(0);
    toast.info("Enquadramento centralizado no padrão!");
  };

  // Desligar câmera ao desmontar
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Sistema de Modelos Salvos pelo Usuário (Salvar como Modelo + Sincronização)
  const [customTemplates, setCustomTemplates] = useState<BadgeTemplate[]>(() => {
    try {
      const saved = localStorage.getItem("church_badge_custom_templates");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [];
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("tpl_membro");
  const [isSaveTemplateDialogOpen, setIsSaveTemplateDialogOpen] = useState<boolean>(false);
  const [isManageTemplatesDialogOpen, setIsManageTemplatesDialogOpen] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>("");
  const [newTemplateTag, setNewTemplateTag] = useState<BadgeTemplate['tag']>("Membro");
  const [newTemplateDesc, setNewTemplateDesc] = useState<string>("");

  const allTemplates = useMemo(() => {
    return [...DEFAULT_BADGE_TEMPLATES, ...customTemplates];
  }, [customTemplates]);

  // Sincronizar modelos do Firestore com fallback local
  useEffect(() => {
    const loadFirestoreTemplates = async () => {
      try {
        const ref = doc(db, "church_settings", "badge_templates");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.templates) && data.templates.length > 0) {
            setCustomTemplates(prev => {
              const ids = new Set(prev.map(p => p.id));
              const merged = [...prev];
              for (const t of data.templates) {
                if (!ids.has(t.id)) {
                  merged.push(t);
                  ids.add(t.id);
                }
              }
              localStorage.setItem("church_badge_custom_templates", JSON.stringify(merged));
              return merged;
            });
          }
        }
      } catch (err) {
        // Fallback para localStorage
      }
    };
    loadFirestoreTemplates();
  }, []);

  // Aplicação Rápida de Modelo Completo (Design, Cores, Bordas, Fontes)
  const handleApplyTemplate = (tplOrId: BadgeTemplate | string) => {
    const tpl = typeof tplOrId === 'string' ? allTemplates.find(t => t.id === tplOrId) : tplOrId;
    if (!tpl) return;
    setSelectedTemplateId(tpl.id);

    // Dimensões e Margens
    setBadgeWidthMm(tpl.badgeWidthMm || 54);
    setBadgeHeightMm(tpl.badgeHeightMm || 86);
    setSelectedSizePreset(tpl.selectedSizePreset || "cr80");
    setSafeMarginMm(tpl.safeMarginMm ?? 3.5);
    setSafeMarginTopMm(tpl.safeMarginTopMm ?? 4.0);
    setSafeMarginBottomMm(tpl.safeMarginBottomMm ?? 3.5);
    setSafeMarginSideMm(tpl.safeMarginSideMm ?? 3.0);
    setUseIndividualMargins(tpl.useIndividualMargins ?? false);

    // Bordas do Crachá
    if (tpl.badgeBorderTop !== undefined) setBadgeBorderTop(tpl.badgeBorderTop);
    if (tpl.badgeBorderBottom !== undefined) setBadgeBorderBottom(tpl.badgeBorderBottom);
    if (tpl.badgeBorderLeft !== undefined) setBadgeBorderLeft(tpl.badgeBorderLeft);
    if (tpl.badgeBorderRight !== undefined) setBadgeBorderRight(tpl.badgeBorderRight);
    if (tpl.badgeBorderWidth !== undefined) setBadgeBorderWidth(tpl.badgeBorderWidth);
    if (tpl.badgeBorderColor !== undefined) setBadgeBorderColor(tpl.badgeBorderColor);
    if (tpl.badgeBorderStyle !== undefined) setBadgeBorderStyle(tpl.badgeBorderStyle);
    if (tpl.badgeBorderRadius !== undefined) setBadgeBorderRadius(tpl.badgeBorderRadius);

    // Foto do Membro: Máscara, Zoom e Centralização
    if (tpl.photoShape) setPhotoShape(tpl.photoShape);
    if (tpl.photoZoom !== undefined) setPhotoZoom(tpl.photoZoom);
    if (tpl.photoOffsetX !== undefined) setPhotoOffsetX(tpl.photoOffsetX);
    if (tpl.photoOffsetY !== undefined) setPhotoOffsetY(tpl.photoOffsetY);
    if (tpl.photoBorderColor !== undefined) setPhotoBorderColor(tpl.photoBorderColor);
    if (tpl.photoBorderWidth !== undefined) setPhotoBorderWidth(tpl.photoBorderWidth);

    // Temas e Cores
    setSelectedThemeId(tpl.selectedThemeId || "navy");
    setCustomPrimaryColor(tpl.customPrimaryColor || "#1E3A8A");
    setCustomBadgeColor(tpl.customBadgeColor || "#D97706");
    setCardBgColorFrente(tpl.cardBgColorFrente || "#FFFFFF");
    setCardBgColorVerso(tpl.cardBgColorVerso || "#FFFFFF");
    setFooterBgColor(tpl.footerBgColor || "#F8FAFC");
    setFooterTextColor(tpl.footerTextColor || "#0F172A");
    setFooterStylePreset(tpl.footerStylePreset || "light_gray");

    // Logo
    setLogoSize(tpl.logoSize || "grande");
    setLogoHeightPx(tpl.logoHeightPx || 46);
    setLogoColorMode(tpl.logoColorMode || "original");
    setCustomLogoColor(tpl.customLogoColor || "#FFFFFF");
    setLogoHasOutline(tpl.logoHasOutline ?? true);
    setLogoOutlineColor(tpl.logoOutlineColor || "#FFFFFF");
    setLogoOutlineWidth(tpl.logoOutlineWidth || "medio");
    setLogoBgShape(tpl.logoBgShape || "circle");
    setLogoBgColor(tpl.logoBgColor || "#FFFFFF");
    setLogoPadding(tpl.logoPadding ?? 3);
    setRemoveLogoWhiteBg(tpl.removeLogoWhiteBg ?? false);

    // QR Code
    setQrCodeSizePx(tpl.qrCodeSizePx || 28);
    setQrCodeColor(tpl.qrCodeColor || "#000000");
    setQrCodeBgColor(tpl.qrCodeBgColor || "#FFFFFF");
    setQrHasBorder(tpl.qrHasBorder ?? true);
    setQrBorderColor(tpl.qrBorderColor || "#CBD5E1");
    setQrBorderWidth(tpl.qrBorderWidth || "fino");
    setQrBorderRadius(tpl.qrBorderRadius || "md");

    // Tipografia Livre
    if (tpl.fontSizes) {
      setFontSizes(tpl.fontSizes);
    }

    // Textos Frente
    setCustomHeaderTitle(tpl.headerTitle || "O BRASIL PARA CRISTO");
    if (tpl.headerSubtitle) setCustomHeaderSubtitle(tpl.headerSubtitle);
    setCustomRole(tpl.defaultRole || "Membro");
    setCustomDepartment(tpl.defaultDepartment || "MINISTÉRIO OFICIAL");
    if (tpl.matriculaPrefix) {
      setCustomMatricula(`${tpl.matriculaPrefix}-001`);
    }
    setCustomValidity(tpl.validity || "2026 / 2027");
    setIncludeVerso(tpl.includeVerso ?? true);

    // Textos Verso
    setCustomVersoHeader(tpl.versoHeader || "TERMO DE IDENTIFICAÇÃO ECLESIÁSTICA");
    setCustomVersoSubheader(tpl.versoSubheader || `${(tpl.defaultRole || "Membro").toUpperCase()} • CORPO ECLESIÁSTICO`);
    setCustomVersoLine1(tpl.versoLine1 || "Uso pessoal, intransferível e obrigatório nos cultos e eventos.");
    setCustomVersoLine2(tpl.versoLine2 || "Identifica o voluntário devidamente escalado na congregação.");
    setCustomVersoLine3(tpl.versoLine3 || "Em caso de perda ou dano, avise à Secretaria da Igreja.");
    setCustomVersoVerse(tpl.versoVerse || "Porque os que servirem bem como diáconos adquirirão para si uma boa posição e muita confiança na fé que há em Cristo Jesus.");
    setCustomVersoVerseRef(tpl.versoVerseRef || "1 Timóteo 3:13");
    setCustomResponsibleRole(tpl.responsibleRole || "SECRETÁRIO(A) GERAL");

    toast.success(`Modelo "${tpl.name}" aplicado!`);
  };

  // Salvar Design Atual como Novo Modelo
  const handleSaveCurrentAsTemplate = async () => {
    const trimmed = newTemplateName.trim();
    if (!trimmed) {
      toast.error("Por favor, digite um nome para o novo modelo de crachá.");
      return;
    }

    const newTpl: BadgeTemplate = {
      id: `custom_${Date.now()}`,
      name: trimmed,
      category: "personalizado",
      tag: newTemplateTag,
      description: newTemplateDesc.trim() || `Modelo personalizado para ${newTemplateTag}`,
      createdAt: new Date().toISOString(),

      badgeWidthMm,
      badgeHeightMm,
      selectedSizePreset,
      safeMarginMm,
      safeMarginTopMm,
      safeMarginBottomMm,
      safeMarginSideMm,
      useIndividualMargins,

      selectedThemeId,
      customPrimaryColor,
      customBadgeColor,
      cardBgColorFrente,
      cardBgColorVerso,
      footerBgColor,
      footerTextColor,
      footerStylePreset,

      // Bordas do Crachá
      badgeBorderTop,
      badgeBorderBottom,
      badgeBorderLeft,
      badgeBorderRight,
      badgeBorderWidth,
      badgeBorderColor,
      badgeBorderStyle,
      badgeBorderRadius,

      // Foto do Membro
      photoShape,
      photoZoom,
      photoOffsetX,
      photoOffsetY,
      photoBorderColor,
      photoBorderWidth,

      logoSize,
      logoHeightPx,
      logoColorMode,
      customLogoColor,
      logoHasOutline,
      logoOutlineColor,
      logoOutlineWidth,
      logoBgShape,
      logoBgColor,
      logoPadding,
      removeLogoWhiteBg,

      qrCodeSizePx,
      qrCodeColor,
      qrCodeBgColor,
      qrHasBorder,
      qrBorderColor,
      qrBorderWidth,
      qrBorderRadius,

      fontSizes,

      headerTitle: customHeaderTitle,
      headerSubtitle: customHeaderSubtitle,
      defaultRole: customRole,
      defaultDepartment: customDepartment,
      matriculaPrefix: customMatricula.split('-').slice(0, 2).join('-') || "OBPC-2026",
      validity: customValidity,
      includeVerso,

      versoHeader: customVersoHeader,
      versoSubheader: customVersoSubheader,
      versoLine1: customVersoLine1,
      versoLine2: customVersoLine2,
      versoLine3: customVersoLine3,
      versoVerse: customVersoVerse,
      versoVerseRef: customVersoVerseRef,
      responsibleRole: customResponsibleRole
    };

    const updated = [newTpl, ...customTemplates];
    setCustomTemplates(updated);
    setSelectedTemplateId(newTpl.id);
    localStorage.setItem("church_badge_custom_templates", JSON.stringify(updated));

    try {
      await setDoc(doc(db, "church_settings", "badge_templates"), {
        templates: updated,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {}

    setIsSaveTemplateDialogOpen(false);
    setNewTemplateName("");
    setNewTemplateDesc("");
    toast.success(`Modelo "${trimmed}" salvo com sucesso!`);
  };

  // Excluir Modelo Personalizado
  const handleDeleteTemplate = async (templateId: string) => {
    const updated = customTemplates.filter(t => t.id !== templateId);
    setCustomTemplates(updated);
    localStorage.setItem("church_badge_custom_templates", JSON.stringify(updated));

    if (selectedTemplateId === templateId) {
      setSelectedTemplateId("tpl_membro");
    }

    try {
      await setDoc(doc(db, "church_settings", "badge_templates"), {
        templates: updated,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {}

    toast.info("Modelo removido.");
  };

  // Selected volunteers for batch print
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>(() => {
    return volunteers.map(v => v.id);
  });

  // Assinatura Oficial do Responsável (Pastor / Diretor) para o Verso do Crachá
  const [customResponsibleSignatureUrl, setCustomResponsibleSignatureUrl] = useState<string | null>(() => {
    return churchData?.pastorTitularSignatureUrl || churchData?.secretarioSignatureUrl || null;
  });
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Escala de Zoom da Visualização Geral sem Cortes
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [isFullscreenPreviewOpen, setIsFullscreenPreviewOpen] = useState<boolean>(false);

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

  // Alterar cor do rodapé do registro / QR Code com paletas nobres
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
    } else if (preset === "badge") {
      setFooterBgColor(currentTheme.badge);
      setFooterTextColor("#FFFFFF");
    } else if (preset === "navy") {
      setFooterBgColor("#1E3A8A");
      setFooterTextColor("#FFFFFF");
    } else if (preset === "wine") {
      setFooterBgColor("#831843");
      setFooterTextColor("#FFFFFF");
    } else if (preset === "emerald") {
      setFooterBgColor("#065F46");
      setFooterTextColor("#FFFFFF");
    } else if (preset === "dark") {
      setFooterBgColor("#0F172A");
      setFooterTextColor("#FFFFFF");
    }
  };

  const handleAutoFooterTextColor = () => {
    const isDark = isColorDark(footerBgColor);
    setFooterTextColor(isDark ? "#FFFFFF" : "#0F172A");
    toast.success("Cor do texto ajustada automaticamente para contraste ideal!");
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCustomResponsibleSignatureUrl(event.target?.result as string);
        toast.success("Assinatura oficial do verso carregada com sucesso!");
      };
      reader.readAsDataURL(file);
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

  const outlineWidthPx = useMemo(() => {
    return logoOutlineWidth === 'fino' ? 1 : logoOutlineWidth === 'medio' ? 2 : 3;
  }, [logoOutlineWidth]);

  const logoContainerTotalWidth = useMemo(() => {
    return logoBgShape !== 'transparent' ? logoHeightPx + logoPadding * 2 + 4 : logoHeightPx;
  }, [logoBgShape, logoHeightPx, logoPadding]);

  // Filtro CSS dinâmico para a Logo - Otimizado para nitidez e vivacidade sem ficar apagada
  const logoFilterStyle = useMemo(() => {
    let filterStr = "";
    if (logoColorMode === "white") {
      filterStr = "brightness(0) invert(1)";
    } else if (logoColorMode === "gold") {
      filterStr = "sepia(1) saturate(6) hue-rotate(5deg) brightness(1.2)";
    } else if (logoColorMode === "black") {
      filterStr = "grayscale(1) brightness(0)";
    } else if (logoColorMode === "custom") {
      filterStr = `drop-shadow(0px 0px 1px ${customLogoColor})`;
    } else {
      // original: VIBRANTE! Saturação e nitidez reforçadas para não ficar desbotada nem apagada
      filterStr = "contrast(1.25) saturate(1.2) brightness(1.08)";
    }

    // Se o contorno estiver ativado e o formato for transparente, projeta o contorno diretamente na imagem da logo
    if (logoHasOutline && logoBgShape === 'transparent') {
      const w = outlineWidthPx;
      const c = logoOutlineColor;
      filterStr += ` drop-shadow(${w}px 0px 0px ${c}) drop-shadow(-${w}px 0px 0px ${c}) drop-shadow(0px ${w}px 0px ${c}) drop-shadow(0px -${w}px 0px ${c})`;
    }

    return filterStr.trim();
  }, [logoColorMode, customLogoColor, logoHasOutline, logoBgShape, outlineWidthPx, logoOutlineColor]);

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
    
    if (qrCodePayloadMode === 'vcard') {
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${customName}\nTITLE:${customRole}\nORG:${activeBranchName || 'OBPC'}\nNOTE:Matrícula: ${customMatricula}\nEND:VCARD`;
    }

    if (qrCodePayloadMode === 'text') {
      return `OBPC - CREDENCIAL\nNOME: ${customName}\nCARGO: ${customRole}\nMATRÍCULA: ${customMatricula}\nVAL: ${customValidity}`;
    }

    if (qrCodePayloadMode === 'full_url') {
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
    }

    // Default: 'short_url' (Compact URL -> 25x25 matrix -> Huge readable blocks -> Scans instantly on any camera!)
    const params = new URLSearchParams({
      reg: customMatricula,
      nome: customName,
      cargo: customRole
    });
    return `${origin}/validar-cracha?${params.toString()}`;
  }, [qrCodePayloadMode, customMatricula, customName, customRole, customDepartment, customResponsibleRole, customResponsibleName, customValidity, activeBranchName]);

  const getVolQrPayload = (volItem?: { name?: string; role?: string; matricula?: string }) => {
    const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://igreja-obpc.app';
    const name = volItem?.name || customName;
    const role = volItem?.role || customRole;
    const mat = volItem?.matricula || customMatricula;

    if (qrCodePayloadMode === 'vcard') {
      return `BEGIN:VCARD\nVERSION:3.0\nFN:${name}\nTITLE:${role}\nORG:${activeBranchName || 'OBPC'}\nNOTE:Matrícula: ${mat}\nEND:VCARD`;
    }

    if (qrCodePayloadMode === 'text') {
      return `OBPC CREDENCIAL | NOME: ${name} | CARGO: ${role} | MATRÍCULA: ${mat}`;
    }

    if (qrCodePayloadMode === 'full_url') {
      const params = new URLSearchParams({
        reg: mat,
        nome: name,
        cargo: role,
        depto: customDepartment,
        dir: `${customResponsibleRole} - ${customResponsibleName}`,
        val: customValidity,
        cong: activeBranchName
      });
      return `${origin}/validar-cracha?${params.toString()}`;
    }

    // Default: 'short_url' (Ultra short parameters -> 21x21 matrix -> Massive readable modules)
    const params = new URLSearchParams({
      reg: mat,
      nome: name,
      cargo: role
    });
    return `${origin}/validar-cracha?${params.toString()}`;
  };

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
        className="shadow-md flex flex-col justify-between overflow-hidden relative print:shadow-none select-none transition-all"
        style={{ 
          width: `${badgeWidthMm}mm`,
          height: `${badgeHeightMm}mm`,
          minWidth: `${badgeWidthMm}mm`,
          maxWidth: `${badgeWidthMm}mm`,
          minHeight: `${badgeHeightMm}mm`,
          maxHeight: `${badgeHeightMm}mm`,
          backgroundColor: cardBgColorFrente,
          boxSizing: 'border-box',
          borderTop: badgeBorderTop ? `${badgeBorderWidth}px ${badgeBorderStyle} ${badgeBorderColor}` : 'none',
          borderBottom: badgeBorderBottom ? `${badgeBorderWidth}px ${badgeBorderStyle} ${badgeBorderColor}` : 'none',
          borderLeft: badgeBorderLeft ? `${badgeBorderWidth}px ${badgeBorderStyle} ${badgeBorderColor}` : 'none',
          borderRight: badgeBorderRight ? `${badgeBorderWidth}px ${badgeBorderStyle} ${badgeBorderColor}` : 'none',
          borderRadius: badgeBorderRadius === 'none' ? '0px' : badgeBorderRadius === 'sm' ? '4px' : badgeBorderRadius === 'md' ? '8px' : '14px',
        }}
      >
        {/* Guia Visual de Área Segura e Corte (Visível apenas na tela) */}
        {showSafeZoneGuides && (
          <div 
            className="absolute pointer-events-none border border-dashed border-red-500/80 z-30 print:hidden transition-all"
            style={{ 
              top: `${effMarginTop}mm`,
              bottom: `${effMarginBottom}mm`,
              left: `${effMarginSide}mm`,
              right: `${effMarginSide}mm`
            }}
          >
            <span className="absolute -top-3.5 left-1 bg-red-600/90 text-[7px] text-white px-1 py-0.2 rounded font-mono font-bold tracking-tighter shadow-xs">
              Área Segura ({effMarginSide}mm)
            </span>
          </div>
        )}

        {/* Furo para presilha / cordão do crachá - Posicionamento Seguro Rebaixado (não rasga a borda) */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-8 h-2.5 bg-slate-200/90 border border-slate-600 rounded-full z-20 shadow-xs print:border-slate-800 transition-all"
          style={{ top: `${Math.max(2, effMarginTop - 0.5)}mm` }}
          title={`Furo do Crachá (${effMarginTop}mm de margem segura da borda superior)`}
        />

        {/* Top Header com Cor do Tema - Espaçado para o Furo não Cortar o Texto */}
        <div 
          className="pb-2 text-white relative flex items-center justify-between gap-1.5 shrink-0 transition-all"
          style={{ 
            backgroundColor: currentTheme.primary,
            paddingTop: `${Math.max(22, effMarginTop * 3.8 + 6)}px`,
            paddingLeft: `${Math.max(6, effMarginSide * 2.8)}px`,
            paddingRight: `${Math.max(6, effMarginSide * 2.8)}px`
          }}
        >
          {/* Logo da Igreja com Contorno, Fundo Customizável, Cor e Tamanho Ampliado */}
          <div 
            className="flex items-center justify-center shrink-0 transition-all select-none overflow-hidden"
            style={{
              width: `${logoContainerTotalWidth}px`,
              height: `${logoContainerTotalWidth}px`,
              minWidth: `${logoContainerTotalWidth}px`,
              backgroundColor: logoBgShape === 'transparent' ? 'transparent' : logoBgColor,
              borderRadius: logoBgShape === 'circle' ? '9999px' : logoBgShape === 'rounded' ? '8px' : '0px',
              border: (logoHasOutline && logoBgShape !== 'transparent') ? `${outlineWidthPx}px solid ${logoOutlineColor}` : 'none',
              boxShadow: (logoHasOutline && logoBgShape !== 'transparent') ? '0 1px 3px rgba(0,0,0,0.3)' : 'none',
              padding: logoBgShape !== 'transparent' ? `${logoPadding}px` : '0px'
            }}
          >
            {churchLogo ? (
              <img 
                src={churchLogo} 
                alt="Logo" 
                className="w-auto object-contain transition-all"
                style={{
                  height: `${logoHeightPx}px`,
                  maxHeight: `${logoHeightPx}px`,
                  maxWidth: '28mm',
                  mixBlendMode: (logoBgShape === 'transparent' && removeLogoWhiteBg && logoColorMode === 'original') ? 'multiply' : 'normal',
                  filter: logoFilterStyle
                }}
              />
            ) : (
              <span 
                className="font-black text-[10px] tracking-wider transition-colors px-1 py-0.5 border rounded"
                style={{ 
                  color: logoColorMode === 'original' ? '#FBBF24' : customLogoColor,
                  borderColor: logoHasOutline ? logoOutlineColor : 'rgba(255,255,255,0.3)'
                }}
              >
                OBPC
              </span>
            )}
          </div>

          {/* Nome da Igreja Centralizado Geometricamente */}
          <div className="flex-1 text-center min-w-0 flex flex-col items-center justify-center px-1">
            <span 
              className="font-black uppercase tracking-wider block leading-tight text-center transition-all"
              style={{ 
                color: logoColorMode === 'original' ? '#FFFFFF' : customLogoColor,
                fontSize: `${fontSizes.headerTitle}px`
              }}
            >
              {customHeaderTitle || "O BRASIL PARA CRISTO"}
            </span>
            <span 
              className="font-semibold text-white/95 block truncate mt-0.5 text-center transition-all"
              style={{ fontSize: `${fontSizes.headerSubtitle}px` }}
            >
              {customHeaderSubtitle || activeBranchName}
            </span>
          </div>

          {/* Espaçador perfeitamente equilibrado com a largura da logo para centralização milimétrica */}
          <div 
            style={{ 
              width: `${logoContainerTotalWidth}px`, 
              minWidth: `${logoContainerTotalWidth}px` 
            }} 
            className="shrink-0" 
            aria-hidden="true" 
          />
        </div>

        {/* Faixa do Ministério / Cargo em destaque - Fonte Flexível */}
        <div 
          className="py-1 px-1.5 text-center font-black tracking-widest text-white uppercase shadow-xs shrink-0 truncate transition-all"
          style={{ 
            backgroundColor: currentTheme.badge,
            fontSize: `${fontSizes.role}px`
          }}
        >
          {vol.role || "VOLUNTÁRIO(A)"}
        </div>

        {/* ÁREA CENTRAL: Foto Reposicionada no Centro do Crachá e Nome */}
        <div 
          className="flex-1 flex flex-col items-center justify-center py-1 my-auto overflow-hidden transition-all"
          style={{
            paddingLeft: `${Math.max(6, effMarginSide * 2.8)}px`,
            paddingRight: `${Math.max(6, effMarginSide * 2.8)}px`
          }}
        >
          {/* Moldura da Foto Centralizada com Máscara Circular ou Quadrada 3x4 e Clique para Câmera/Ajuste */}
          <div 
            className={`overflow-hidden shadow-xs flex items-center justify-center shrink-0 mb-1 cursor-pointer hover:border-primary group relative transition-all ${
              photoShape === 'circle' 
                ? 'rounded-full aspect-square' 
                : photoShape === 'rounded' 
                  ? 'rounded-2xl' 
                  : 'rounded-md'
            }`}
            style={{
              width: photoShape === 'circle' ? `${Math.min(photoWidthMm, photoHeightMm) + 3}mm` : `${photoWidthMm}mm`,
              height: photoShape === 'circle' ? `${Math.min(photoWidthMm, photoHeightMm) + 3}mm` : `${photoHeightMm}mm`,
              borderWidth: `${photoBorderWidth}px`,
              borderColor: photoBorderColor,
              borderStyle: 'solid',
              backgroundColor: '#F8FAFC'
            }}
            onClick={() => setIsPhotoModalOpen(true)}
            title="Clique para adicionar, capturar pela câmera ou ajustar a foto"
          >
            {vol.photo ? (
              <div className="relative w-full h-full overflow-hidden flex items-center justify-center group">
                <img 
                  src={vol.photo} 
                  alt={vol.name} 
                  className="w-full h-full object-cover transition-transform select-none" 
                  style={{
                    transform: `scale(${photoZoom}) translate(${photoOffsetX}%, ${photoOffsetY}%)`,
                    transformOrigin: 'center center'
                  }}
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-white text-[7.5px] font-bold">
                  <Camera className="w-3.5 h-3.5 mb-0.5" />
                  Editar Foto
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400 p-1 text-center group-hover:text-primary transition-colors">
                <div 
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs mb-0.5 shadow-xs"
                  style={{ backgroundColor: currentTheme.badge }}
                >
                  {vol.name.slice(0, 1).toUpperCase()}
                </div>
                <span className="text-[6.5px] font-bold text-slate-600 group-hover:text-primary uppercase tracking-wider flex items-center gap-0.5">
                  <Camera className="w-2.5 h-2.5" /> FOTO {photoShape === 'circle' ? 'CIRCULAR' : '3×4'}
                </span>
              </div>
            )}
          </div>

          {/* Nome do Voluntário adaptável à cor de fundo e tamanho configurável */}
          <h4 
            className="font-black uppercase leading-snug line-clamp-2 text-center max-w-full transition-all"
            style={{ 
              color: isFrenteDark ? '#FFFFFF' : '#020617',
              fontSize: `${fontSizes.name}px`
            }}
          >
            {vol.name}
          </h4>
          <span 
            className="font-bold uppercase mt-0.5 block truncate max-w-full text-center transition-all"
            style={{ 
              color: isFrenteDark ? '#CBD5E1' : '#475569',
              fontSize: `${fontSizes.department}px`
            }}
          >
            {customDepartment}
          </span>
        </div>

        {/* Rodapé do Crachá com QR Code, Matrícula e Validade - Margens de Segurança */}
        <div 
          className="border-t flex items-center justify-between shrink-0 transition-colors"
          style={{ 
            backgroundColor: footerBgColor, 
            color: footerTextColor,
            borderColor: isColorDark(footerBgColor) ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
            paddingTop: '6px',
            paddingBottom: `${Math.max(6, effMarginBottom * 2.8)}px`,
            paddingLeft: `${Math.max(6, effMarginSide * 2.8)}px`,
            paddingRight: `${Math.max(6, effMarginSide * 2.8)}px`
          }}
        >
          <div className="text-left leading-tight flex-1 min-w-0 pr-1.5">
            <span 
              className="font-bold block uppercase tracking-wider transition-all"
              style={{ opacity: 0.85, fontSize: `${fontSizes.matriculaLabel}px` }}
            >
              REGISTRO
            </span>
            <span 
              className="font-black block font-mono mt-0.5 tracking-tight transition-all"
              style={{ color: footerTextColor, fontSize: `${fontSizes.matricula}px` }}
            >
              {vol.matricula || customMatricula}
            </span>
            <span 
              className="font-semibold block mt-0.5 transition-all truncate"
              style={{ opacity: 0.9, fontSize: `${fontSizes.validade}px` }}
            >
              VAL: {customValidity}
            </span>
          </div>

          <div 
            className="cursor-pointer hover:scale-105 transition-all flex items-center justify-center shrink-0"
            style={{
              backgroundColor: qrCodeBgColor,
              border: qrHasBorder 
                ? `${qrBorderWidth === 'fino' ? '1px' : qrBorderWidth === 'medio' ? '2px' : '3px'} solid ${qrBorderColor}` 
                : 'none',
              borderRadius: qrBorderRadius === 'none' ? '0px' : qrBorderRadius === 'sm' ? '3px' : qrBorderRadius === 'md' ? '6px' : '10px',
              boxShadow: qrHasBorder ? '0 1px 3px rgba(0,0,0,0.12)' : 'none',
              padding: '2px'
            }}
            title="Clique para validar dados deste QR Code em tela cheia"
            onClick={() => setIsValidatingQr(true)}
          >
            <QRCodeSVG 
              value={getVolQrPayload(vol)}
              size={qrCodeSizePx}
              fgColor={qrCodeColor}
              bgColor={qrCodeBgColor}
              level="L"
              includeMargin={true}
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
        className="shadow-md flex flex-col justify-between overflow-hidden relative print:shadow-none select-none transition-all"
        style={{ 
          width: `${badgeWidthMm}mm`,
          height: `${badgeHeightMm}mm`,
          minWidth: `${badgeWidthMm}mm`,
          maxWidth: `${badgeWidthMm}mm`,
          minHeight: `${badgeHeightMm}mm`,
          maxHeight: `${badgeHeightMm}mm`,
          backgroundColor: cardBgColorVerso,
          color: isVersoDark ? '#FFFFFF' : '#0F172A',
          boxSizing: 'border-box',
          borderTop: badgeBorderTop ? `${badgeBorderWidth}px ${badgeBorderStyle} ${badgeBorderColor}` : 'none',
          borderBottom: badgeBorderBottom ? `${badgeBorderWidth}px ${badgeBorderStyle} ${badgeBorderColor}` : 'none',
          borderLeft: badgeBorderLeft ? `${badgeBorderWidth}px ${badgeBorderStyle} ${badgeBorderColor}` : 'none',
          borderRight: badgeBorderRight ? `${badgeBorderWidth}px ${badgeBorderStyle} ${badgeBorderColor}` : 'none',
          borderRadius: badgeBorderRadius === 'none' ? '0px' : badgeBorderRadius === 'sm' ? '4px' : badgeBorderRadius === 'md' ? '8px' : '14px',
          paddingLeft: `${Math.max(6, effMarginSide * 2.8)}px`,
          paddingRight: `${Math.max(6, effMarginSide * 2.8)}px`,
          paddingBottom: `${Math.max(4, effMarginBottom * 2.2)}px`
        }}
      >
        {/* Guia Visual de Área Segura e Corte */}
        {showSafeZoneGuides && (
          <div 
            className="absolute pointer-events-none border border-dashed border-red-500/80 z-30 print:hidden transition-all"
            style={{ 
              top: `${effMarginTop}mm`,
              bottom: `${effMarginBottom}mm`,
              left: `${effMarginSide}mm`,
              right: `${effMarginSide}mm`
            }}
          >
            <span className="absolute -top-3.5 left-1 bg-red-600/90 text-[7px] text-white px-1 py-0.2 rounded font-mono font-bold tracking-tighter shadow-xs">
              Área Segura ({effMarginSide}mm)
            </span>
          </div>
        )}

        {/* Furo para presilha - Posicionamento Seguro Rebaixado */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 w-8 h-2.5 bg-slate-200/90 border border-slate-600 rounded-full z-20 shadow-xs print:border-slate-800 transition-all"
          style={{ top: `${Math.max(2, effMarginTop - 0.5)}mm` }}
          title={`Furo do Crachá (${effMarginTop}mm de margem segura da borda superior)`}
        />

        <div 
          className="text-center border-b pb-1 shrink-0 transition-all" 
          style={{ 
            borderColor: isVersoDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
            paddingTop: `${Math.max(22, effMarginTop * 3.8 + 6)}px`
          }}
        >
          <span 
            className="font-black uppercase tracking-wider block truncate transition-all"
            style={{ 
              color: isVersoDark ? '#FFFFFF' : '#1E293B',
              fontSize: `${fontSizes.versoHeader}px`
            }}
          >
            {customVersoHeader || "TERMO DE IDENTIFICAÇÃO ECLESIÁSTICA"}
          </span>
          <span 
            className="font-bold block mt-0.5 uppercase tracking-wide truncate transition-all"
            style={{ 
              color: isVersoDark ? '#38BDF8' : '#0284C7',
              fontSize: `${fontSizes.versoSubheader}px`
            }}
          >
            {customVersoSubheader || `${customRole.toUpperCase()} • CORPO ECLESIÁSTICO`}
          </span>
        </div>

        {/* Instruções de Uso com Fonte Editável */}
        <div 
          className="space-y-0.5 py-0.5 leading-tight transition-all shrink-0"
          style={{ 
            color: isVersoDark ? '#E2E8F0' : '#334155',
            fontSize: `${fontSizes.versoRules}px`
          }}
        >
          <p className="flex items-start gap-1">
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
            <span className="leading-tight">{customVersoLine1 || "Uso pessoal, intransferível e obrigatório nos cultos e eventos."}</span>
          </p>
          <p className="flex items-start gap-1">
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
            <span className="leading-tight">{customVersoLine2 || "Identifica o voluntário devidamente escalado na congregação."}</span>
          </p>
          <p className="flex items-start gap-1">
            <span className="text-emerald-500 font-bold shrink-0">✓</span>
            <span className="leading-tight">{customVersoLine3 || "Em caso de perda ou dano, avise à Secretaria da Igreja."}</span>
          </p>
        </div>

        {/* Versículo Bíblico Editável com Fonte Flexível */}
        <div 
          className="p-1 rounded text-center border shrink-0 my-0.5"
          style={{
            backgroundColor: isVersoDark ? 'rgba(255,255,255,0.08)' : '#F8FAFC',
            borderColor: isVersoDark ? 'rgba(255,255,255,0.15)' : '#E2E8F0'
          }}
        >
          <p 
            className="italic font-semibold leading-tight transition-all line-clamp-3"
            style={{ 
              color: isVersoDark ? '#F1F5F9' : '#1E293B',
              fontSize: `${fontSizes.versoVerse}px`
            }}
          >
            "{customVersoVerse || "Porque os que servirem bem como diáconos adquirirão para si uma boa posição e muita confiança na fé que há em Cristo Jesus."}"
          </p>
          <span 
            className="font-black block mt-0.5 transition-all"
            style={{ 
              color: isVersoDark ? '#F8FAFC' : '#0F172A',
              fontSize: `${fontSizes.versoVerseRef}px`
            }}
          >
            {customVersoVerseRef || "1 Timóteo 3:13"}
          </span>
        </div>

        {/* Assinatura Oficial do Responsável pela Diretoria */}
        <div className="pt-1 pb-0.5 text-center mt-auto shrink-0 flex flex-col items-center">
          {customResponsibleSignatureUrl ? (
            <div className="h-7 max-h-7 mb-0.5 flex items-center justify-center">
              <img 
                src={customResponsibleSignatureUrl} 
                alt="Assinatura" 
                className="max-h-7 w-auto max-w-[40mm] object-contain filter contrast-125"
                style={{
                  filter: isVersoDark ? 'brightness(0) invert(1)' : 'contrast(1.2)'
                }}
              />
            </div>
          ) : (
            <div className="h-2" />
          )}
          <div 
            className="w-40 sm:w-44 mx-auto border-t-2 pt-0.5"
            style={{ borderColor: isVersoDark ? '#FFFFFF' : '#0F172A' }}
          >
            <span 
              className="font-black uppercase block truncate transition-all leading-tight"
              style={{ 
                color: isVersoDark ? '#FFFFFF' : '#0F172A',
                fontSize: `${fontSizes.versoSignatureRole}px`
              }}
            >
              {customResponsibleRole || "DIRETORIA DO DIACONATO"}
            </span>
            <span 
              className="font-bold block truncate transition-all leading-tight"
              style={{ 
                color: isVersoDark ? '#CBD5E1' : '#334155',
                fontSize: `${fontSizes.versoSignatureName}px`
              }}
            >
              {customResponsibleName || "Pr. Carlito Carvalho Rodrigues"}
            </span>
          </div>
        </div>

        {/* Rodapé institucional com Fonte Flexível - NÃO CORTA AO AUMENTAR FONTE */}
        <div 
          className="text-center border-t pt-1 pb-0.5 px-0.5 shrink-0 transition-all leading-snug break-words max-w-full"
          style={{ 
            borderColor: isVersoDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)',
            color: isVersoDark ? '#94A3B8' : '#64748B',
            fontSize: `${fontSizes.versoFooter}px`,
            lineHeight: '1.25'
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
                  
                  {/* SELETOR RÁPIDO DE MODELOS DE CRACHÁS (1 CLIQUE) */}
                  <div className="space-y-2 bg-gradient-to-br from-indigo-500/10 via-primary/10 to-amber-500/10 p-3 rounded-xl border-2 border-primary/30 shadow-xs">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Seletor de Modelos de Crachás (1 Clique)
                      </Label>
                      <Badge variant="outline" className="text-[9px] bg-background font-bold text-primary border-primary/30">
                        Layouts Oficiais
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Selecione um modelo para aplicar instantaneamente o design completo (cores, cargos, bordas, fontes e regras):
                    </p>

                    {/* Grade das 6 Predefinições Solicitadas */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                      {PRIMARY_BADGE_PRESETS.map((preset) => {
                        const IconComponent = preset.icon;
                        const isSelected = selectedTemplateId === preset.id;
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleApplyTemplate(preset.id)}
                            className={`p-2 rounded-lg border text-left transition-all relative flex flex-col justify-between ${
                              isSelected
                                ? 'border-primary ring-2 ring-primary/50 bg-primary/15 font-bold shadow-xs'
                                : 'bg-background hover:bg-muted/70 border-border text-foreground'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <span 
                                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" 
                                style={{ backgroundColor: preset.color }}
                              />
                              <IconComponent className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <span className="text-[11px] font-bold leading-tight truncate">{preset.label}</span>
                            <span className="text-[9px] text-muted-foreground truncate mt-0.5">{preset.subtitle}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* SISTEMA DE MODELOS SALVOS (PRESETS & MODELOS PERSONALIZADOS) */}
                  <div className="space-y-2 bg-background p-3 rounded-xl border shadow-2xs">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <BookmarkCheck className="w-3.5 h-3.5 text-primary" />
                        Modelos Salvos & Personalizados
                      </Label>
                      <Badge variant="secondary" className="text-[9px] bg-muted font-mono border">
                        {customTemplates.length} salvo(s)
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={selectedTemplateId || ""}
                          onValueChange={(val) => handleApplyTemplate(val)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background flex-1">
                            <SelectValue placeholder="Selecione um Modelo Salvo" />
                          </SelectTrigger>
                          <SelectContent>
                            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                              Modelos Padrão do Sistema
                            </div>
                            {DEFAULT_BADGE_TEMPLATES.map((tpl) => (
                              <SelectItem key={tpl.id} value={tpl.id} className="text-xs">
                                <span className="font-semibold">{tpl.name}</span>{" "}
                                <span className="text-[10px] text-muted-foreground">({tpl.tag || tpl.category})</span>
                              </SelectItem>
                            ))}
                            {customTemplates.length > 0 && (
                              <>
                                <div className="px-2 py-1 mt-1 border-t text-[10px] font-bold text-primary uppercase tracking-wider">
                                  Meus Modelos Salvos
                                </div>
                                {customTemplates.map((tpl) => (
                                  <SelectItem key={tpl.id} value={tpl.id} className="text-xs">
                                    <span className="font-bold text-primary">★ {tpl.name}</span>{" "}
                                    <span className="text-[10px] text-muted-foreground">({tpl.tag || tpl.category})</span>
                                  </SelectItem>
                                ))}
                              </>
                            )}
                          </SelectContent>
                        </Select>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsSaveTemplateDialogOpen(true)}
                          className="h-8 px-2.5 text-xs font-semibold bg-background border-primary/40 hover:bg-primary/10 text-primary whitespace-nowrap"
                          title="Salvar a configuração atual como um novo modelo reutilizável"
                        >
                          <BookmarkPlus className="w-3.5 h-3.5 mr-1" />
                          Salvar Modelo
                        </Button>
                      </div>

                      {customTemplates.length > 0 && (
                        <div className="flex items-center justify-between text-[11px] pt-0.5">
                          <span className="text-muted-foreground">Modelos personalizados salvos no seu navegador</span>
                          <button
                            type="button"
                            onClick={() => setIsManageTemplatesDialogOpen(true)}
                            className="text-primary hover:underline font-medium text-[10px] flex items-center gap-1"
                          >
                            <FolderOpen className="w-3 h-3" /> Gerenciar Modelos
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 1. SELEÇÃO DE MODELO / ATIVIDADE DA IGREJA (PRESETS RÁPIDOS) */}
                  <div className="space-y-2 bg-background p-3 rounded-xl border shadow-2xs">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-amber-500" />
                        Outras Atividades / Ministérios
                      </Label>
                      <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-800 border-amber-300">
                        {ACTIVITY_PRESETS.length} Atividades
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Selecione uma atividade para pré-configurar temas, cargos e regras. Todos os campos continuam editáveis!
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 pt-1 max-h-40 overflow-y-auto pr-1">
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

                  {/* 2. Seletor de Voluntário & BOTÃO 'ADICIONAR FOTO' (CÂMERA, ARQUIVO E ENQUADRAMENTO) */}
                  <div className="space-y-2.5 bg-background p-3 rounded-xl border shadow-2xs">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        Voluntário & Foto do Membro
                      </Label>
                      <span className="text-[10px] text-muted-foreground font-normal">
                        Total: {volunteers.length}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-muted-foreground">Voluntário Cadastrado:</Label>
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

                    {/* CARD PRINCIPAL: BOTÃO 'ADICIONAR FOTO' & MINI PREVIEW */}
                    <div className="p-3 rounded-xl bg-muted/40 border border-primary/20 space-y-2.5">
                      <div className="flex items-center gap-3">
                        {/* Miniatura com máscara em tempo real */}
                        <div 
                          onClick={() => {
                            setActivePhotoTab('camera');
                            setIsPhotoModalOpen(true);
                          }}
                          className={`relative w-12 h-14 border-2 border-primary/50 overflow-hidden bg-background flex items-center justify-center cursor-pointer group shadow-2xs hover:border-primary transition-all shrink-0 ${
                            photoShape === 'circle' ? 'rounded-full aspect-square w-12 h-12' : 'rounded-md'
                          }`}
                          title="Clique para abrir a Câmera ou selecionar foto"
                        >
                          {customPhotoUrl || activeVolunteer?.photo ? (
                            <img 
                              src={customPhotoUrl || activeVolunteer?.photo} 
                              alt="Foto" 
                              className="w-full h-full object-cover transition-transform" 
                              style={{
                                transform: `scale(${photoZoom}) translate(${photoOffsetX}%, ${photoOffsetY}%)`,
                                transformOrigin: 'center center'
                              }}
                            />
                          ) : (
                            <User className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Camera className="w-4 h-4 text-white" />
                          </div>
                        </div>

                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-foreground">Foto do Crachá</span>
                            {(customPhotoUrl || activeVolunteer?.photo) && (
                              <Badge variant="outline" className="text-[8px] bg-emerald-50 text-emerald-800 border-emerald-300">
                                Ativa
                              </Badge>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground leading-tight">
                            Capture pela câmera do celular/webcam ou selecione um arquivo.
                          </p>
                        </div>
                      </div>

                      {/* Botão Principal: Adicionar Foto (Câmera / Arquivo) */}
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          onClick={() => {
                            setActivePhotoTab('camera');
                            setIsPhotoModalOpen(true);
                          }}
                          className="h-7 px-3 text-xs font-semibold gap-1.5 flex-1 shadow-2xs"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          Adicionar Foto
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-7 px-2 text-xs font-medium gap-1 bg-background"
                          title="Selecionar arquivo direto do dispositivo"
                        >
                          <Upload className="w-3 h-3" />
                          Arquivo
                        </Button>

                        {(customPhotoUrl || activeVolunteer?.photo) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setCustomPhotoUrl("");
                              toast.info("Foto removida do crachá");
                            }}
                            className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            title="Remover foto do crachá"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* CONTROLES INTEGRADOS: MÁSCARA, REDIMENSIONAR (ZOOM) E CENTRALIZAR */}
                      <div className="space-y-2 pt-2 border-t border-border/60">
                        {/* 1. Máscara: Circular vs Quadrada 3x4 */}
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-foreground">Máscara da Foto:</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPhotoShape('rect')}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 transition-all ${
                                photoShape === 'rect'
                                  ? 'bg-primary text-white border-primary shadow-2xs'
                                  : 'bg-background hover:bg-muted text-muted-foreground'
                              }`}
                            >
                              <Square className="w-2.5 h-2.5" /> 3×4 Retangular
                            </button>
                            <button
                              type="button"
                              onClick={() => setPhotoShape('circle')}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 transition-all ${
                                photoShape === 'circle'
                                  ? 'bg-primary text-white border-primary shadow-2xs'
                                  : 'bg-background hover:bg-muted text-muted-foreground'
                              }`}
                            >
                              <Circle className="w-2.5 h-2.5" /> Circular
                            </button>
                          </div>
                        </div>

                        {/* 2. Redimensionar (Zoom da Foto) */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-foreground">Redimensionar (Zoom):</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setPhotoZoom(prev => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10))}
                                className="w-4 h-4 rounded border bg-background flex items-center justify-center text-[10px] font-bold hover:bg-muted"
                                title="Diminuir zoom"
                              >
                                -
                              </button>
                              <span className="text-[10px] font-mono font-bold text-primary w-11 text-center">
                                {Math.round(photoZoom * 100)}%
                              </span>
                              <button
                                type="button"
                                onClick={() => setPhotoZoom(prev => Math.min(2.5, Math.round((prev + 0.1) * 10) / 10))}
                                className="w-4 h-4 rounded border bg-background flex items-center justify-center text-[10px] font-bold hover:bg-muted"
                                title="Aumentar zoom"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <input 
                            type="range"
                            min={0.5}
                            max={2.5}
                            step={0.05}
                            value={photoZoom}
                            onChange={(e) => setPhotoZoom(Number(e.target.value))}
                            className="w-full accent-primary h-1.5 cursor-pointer"
                          />
                        </div>

                        {/* 3. Centralizar / Posição da Foto */}
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-foreground">Centralizar / Posição:</span>
                            <button
                              type="button"
                              onClick={handleResetPhotoAdjustments}
                              className="text-[9px] text-primary hover:underline font-bold flex items-center gap-0.5"
                            >
                              <Crosshair className="w-2.5 h-2.5" /> Centralizar
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[9px] text-muted-foreground">
                            <div>
                              <span>Horizontal (X): {photoOffsetX}%</span>
                              <input 
                                type="range"
                                min={-50}
                                max={50}
                                step={1}
                                value={photoOffsetX}
                                onChange={(e) => setPhotoOffsetX(Number(e.target.value))}
                                className="w-full accent-primary h-1 cursor-pointer"
                              />
                            </div>
                            <div>
                              <span>Vertical (Y): {photoOffsetY}%</span>
                              <input 
                                type="range"
                                min={-50}
                                max={50}
                                step={1}
                                value={photoOffsetY}
                                onChange={(e) => setPhotoOffsetY(Number(e.target.value))}
                                className="w-full accent-primary h-1 cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
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

                  {/* 3.1 BORDAS DO CRACHÁ (SUPERIOR, INFERIOR, LATERAIS, ESPESSURA E COR) */}
                  <div className="space-y-2.5 bg-background p-3 rounded-xl border shadow-2xs">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-indigo-600" />
                        Bordas do Crachá (Bordas, Espessura e Cor)
                      </Label>
                      <Badge variant="outline" className="text-[9px] bg-indigo-50 text-indigo-800 border-indigo-300">
                        Acabamento
                      </Badge>
                    </div>

                    {/* Ativar/Desativar por Borda (Superior, Inferior, Esquerda, Direita) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground">Bordas Ativas:</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const allActive = badgeBorderTop && badgeBorderBottom && badgeBorderLeft && badgeBorderRight;
                              setBadgeBorderTop(!allActive);
                              setBadgeBorderBottom(!allActive);
                              setBadgeBorderLeft(!allActive);
                              setBadgeBorderRight(!allActive);
                            }}
                            className="text-[10px] text-primary hover:underline font-semibold"
                          >
                            {badgeBorderTop && badgeBorderBottom && badgeBorderLeft && badgeBorderRight ? "Desmarcar Todas" : "Marcar Todas"}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-1.5">
                        {[
                          { label: "Superior", active: badgeBorderTop, toggle: () => setBadgeBorderTop(!badgeBorderTop) },
                          { label: "Inferior", active: badgeBorderBottom, toggle: () => setBadgeBorderBottom(!badgeBorderBottom) },
                          { label: "Esquerda", active: badgeBorderLeft, toggle: () => setBadgeBorderLeft(!badgeBorderLeft) },
                          { label: "Direita", active: badgeBorderRight, toggle: () => setBadgeBorderRight(!badgeBorderRight) },
                        ].map((b) => (
                          <button
                            key={b.label}
                            type="button"
                            onClick={b.toggle}
                            className={`px-1.5 py-1.5 rounded-lg border text-center text-[10px] font-medium transition-all ${
                              b.active
                                ? "bg-primary text-primary-foreground border-primary font-bold shadow-2xs"
                                : "bg-muted/40 text-muted-foreground hover:bg-muted border-border"
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Espessura da Borda */}
                    <div className="space-y-1.5 p-2 rounded-lg bg-muted/30 border">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground">Espessura da Borda:</span>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-mono font-bold text-primary">{badgeBorderWidth} px</span>
                        </div>
                      </div>
                      <input 
                        type="range"
                        min={1}
                        max={6}
                        step={1}
                        value={badgeBorderWidth}
                        onChange={(e) => setBadgeBorderWidth(Number(e.target.value))}
                        className="w-full accent-primary h-1.5 cursor-pointer"
                      />
                      <div className="flex items-center justify-between gap-1 pt-0.5">
                        {[1, 2, 3, 4, 5, 6].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => setBadgeBorderWidth(w)}
                            className={`flex-1 py-0.5 rounded border text-[9px] font-medium transition-all ${
                              badgeBorderWidth === w ? "bg-primary text-white border-primary font-bold" : "bg-background hover:bg-muted"
                            }`}
                          >
                            {w}px
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cor da Borda */}
                    <div className="space-y-1.5 p-2 rounded-lg bg-muted/30 border">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground">Cor da Borda:</span>
                        <div className="flex items-center gap-1.5">
                          <div 
                            className="w-4 h-4 rounded border shadow-2xs"
                            style={{ backgroundColor: badgeBorderColor }}
                          />
                          <span className="text-[10px] font-mono text-muted-foreground">{badgeBorderColor}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { color: "#D97706", name: "Dourado" },
                          { color: "#0F172A", name: "Preto" },
                          { color: "#2563EB", name: "Azul Royal" },
                          { color: "#16A34A", name: "Verde" },
                          { color: "#831843", name: "Vinho" },
                          { color: "#475569", name: "Ardósia" },
                          { color: "#E2E8F0", name: "Prata" },
                          { color: "#FFFFFF", name: "Branco" }
                        ].map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => setBadgeBorderColor(c.color)}
                            title={c.name}
                            className={`w-6 h-6 rounded-md border transition-all ${
                              badgeBorderColor === c.color ? "ring-2 ring-primary ring-offset-1 scale-110 shadow-xs" : "hover:scale-105"
                            }`}
                            style={{ backgroundColor: c.color }}
                          />
                        ))}
                        <label className="relative flex items-center justify-center w-6 h-6 rounded-md border bg-gradient-to-tr from-rose-500 via-amber-400 to-blue-500 cursor-pointer overflow-hidden shadow-2xs hover:scale-105" title="Cor personalizada">
                          <input 
                            type="color" 
                            value={badgeBorderColor} 
                            onChange={(e) => setBadgeBorderColor(e.target.value)} 
                            className="opacity-0 absolute inset-0 cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Estilo da Borda */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border">
                      <span className="text-[11px] font-bold text-foreground">Estilo da Borda:</span>
                      <div className="flex items-center gap-1">
                        {(['solid', 'double', 'dashed'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setBadgeBorderStyle(st)}
                            className={`px-2 py-0.5 rounded border text-[10px] capitalize ${
                              badgeBorderStyle === st ? "bg-primary text-white border-primary font-bold" : "bg-background hover:bg-muted"
                            }`}
                          >
                            {st === 'solid' ? 'Sólida' : st === 'double' ? 'Dupla' : 'Tracejada'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3.2 MARGENS INTERNAS DE SEGURANÇA (PROTEÇÃO CONTRA CORTE E FURO) */}
                  <div className="space-y-2.5 bg-background p-3 rounded-xl border shadow-2xs">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Scissors className="w-3.5 h-3.5 text-rose-600" />
                        Margens Internas de Segurança (Área de Corte)
                      </Label>
                      <Badge variant="outline" className="text-[9px] bg-rose-50 text-rose-800 border-rose-300">
                        Anti-Corte
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      Ajuste as margens de respiro para garantir que textos, fotos e o QR Code nunca fiquem colados na borda ou no furo.
                    </p>

                    {/* Margem Geral */}
                    {!useIndividualMargins ? (
                      <div className="space-y-1.5 p-2 rounded-lg bg-muted/30 border">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-foreground">Margem Geral de Segurança:</span>
                          <span className="text-[11px] font-mono font-bold text-primary">{safeMarginMm} mm</span>
                        </div>
                        <input 
                          type="range"
                          min={1}
                          max={7}
                          step={0.5}
                          value={safeMarginMm}
                          onChange={(e) => setSafeMarginMm(Number(e.target.value))}
                          className="w-full accent-primary h-1.5 cursor-pointer"
                        />
                        <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                          <span>1mm (Mínima)</span>
                          <span>3.5mm (Padrão)</span>
                          <span>7mm (Ampla)</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 p-2 rounded-lg bg-muted/30 border">
                        {/* Top */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-muted-foreground">Margem Topo (Furo):</span>
                            <span className="text-[10px] font-mono font-bold text-primary">{safeMarginTopMm} mm</span>
                          </div>
                          <input 
                            type="range"
                            min={1}
                            max={8}
                            step={0.5}
                            value={safeMarginTopMm}
                            onChange={(e) => setSafeMarginTopMm(Number(e.target.value))}
                            className="w-full accent-primary h-1 cursor-pointer"
                          />
                        </div>

                        {/* Bottom */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-muted-foreground">Margem Inferior:</span>
                            <span className="text-[10px] font-mono font-bold text-primary">{safeMarginBottomMm} mm</span>
                          </div>
                          <input 
                            type="range"
                            min={1}
                            max={8}
                            step={0.5}
                            value={safeMarginBottomMm}
                            onChange={(e) => setSafeMarginBottomMm(Number(e.target.value))}
                            className="w-full accent-primary h-1 cursor-pointer"
                          />
                        </div>

                        {/* Laterals */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-muted-foreground">Margens Laterais:</span>
                            <span className="text-[10px] font-mono font-bold text-primary">{safeMarginSideMm} mm</span>
                          </div>
                          <input 
                            type="range"
                            min={1}
                            max={8}
                            step={0.5}
                            value={safeMarginSideMm}
                            onChange={(e) => setSafeMarginSideMm(Number(e.target.value))}
                            className="w-full accent-primary h-1 cursor-pointer"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-1.5">
                        <Switch 
                          checked={useIndividualMargins} 
                          onCheckedChange={setUseIndividualMargins}
                          id="indiv-margins"
                        />
                        <Label htmlFor="indiv-margins" className="text-[10px] text-muted-foreground cursor-pointer">
                          Ajuste independente por lado
                        </Label>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Switch 
                          checked={showSafeZoneGuides} 
                          onCheckedChange={setShowSafeZoneGuides}
                          id="show-guides"
                        />
                        <Label htmlFor="show-guides" className="text-[10px] text-muted-foreground cursor-pointer">
                          Guia visual
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* 4. PERSONALIZAÇÃO COMPLETA DA LOGO (CONTORNO, FUNDO, COR E TAMANHO) */}
                  <div className="space-y-2.5 bg-background p-3 rounded-xl border shadow-2xs">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Paintbrush className="w-3.5 h-3.5 text-primary" />
                        Logotipo da Igreja (Contorno, Fundo & Cor)
                      </Label>
                      <Badge variant="outline" className="text-[9px] bg-emerald-50 text-emerald-800 border-emerald-300">
                        Alta Nitidez
                      </Badge>
                    </div>

                    {/* Tamanho da Logo Ampliado (Slider + Steppers) */}
                    <div className="space-y-1.5 p-2 rounded-lg bg-muted/30 border">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground">Tamanho da Logo:</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setLogoHeightPx(prev => Math.max(24, prev - 2))}
                            className="w-5 h-5 rounded border bg-background flex items-center justify-center hover:bg-muted text-xs font-bold"
                            title="Diminuir logo"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-[11px] font-mono font-bold w-12 text-center text-primary">
                            {logoHeightPx} px
                          </span>
                          <button
                            type="button"
                            onClick={() => setLogoHeightPx(prev => Math.min(68, prev + 2))}
                            className="w-5 h-5 rounded border bg-background flex items-center justify-center hover:bg-muted text-xs font-bold"
                            title="Aumentar logo"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <input 
                        type="range"
                        min={28}
                        max={68}
                        step={1}
                        value={logoHeightPx}
                        onChange={(e) => setLogoHeightPx(Number(e.target.value))}
                        className="w-full accent-primary h-1.5 cursor-pointer"
                      />
                      <div className="grid grid-cols-4 gap-1 pt-0.5">
                        {[
                          { label: "Normal", size: 36 },
                          { label: "Grande", size: 46 },
                          { label: "Extra", size: 54 },
                          { label: "Super", size: 62 }
                        ].map((p) => (
                          <button
                            key={p.label}
                            type="button"
                            onClick={() => setLogoHeightPx(p.size)}
                            className={`p-0.5 rounded border text-[9px] font-medium transition-all ${
                              logoHeightPx === p.size ? "bg-primary text-white border-primary font-bold" : "bg-background hover:bg-muted"
                            }`}
                          >
                            {p.label} ({p.size}px)
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Contorno da Logo (Outline / Borda) */}
                    <div className="space-y-1.5 p-2 rounded-lg bg-muted/30 border">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground">Contorno da Logo (Borda):</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">{logoHasOutline ? "Ativado" : "Desativado"}</span>
                          <Switch 
                            checked={logoHasOutline} 
                            onCheckedChange={setLogoHasOutline} 
                          />
                        </div>
                      </div>

                      {logoHasOutline && (
                        <div className="space-y-1.5 pt-1 border-t border-border/60">
                          {/* Espessura do Contorno */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">Espessura do Contorno:</span>
                            <div className="grid grid-cols-3 gap-1">
                              {(['fino', 'medio', 'forte'] as const).map((w) => (
                                <button
                                  key={w}
                                  type="button"
                                  onClick={() => setLogoOutlineWidth(w)}
                                  className={`px-1.5 py-0.5 rounded border text-[9px] capitalize ${
                                    logoOutlineWidth === w ? "bg-primary text-white border-primary font-bold" : "bg-background hover:bg-muted"
                                  }`}
                                >
                                  {w === 'fino' ? '1px Fino' : w === 'medio' ? '2px Médio' : '3px Forte'}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Cor do Contorno */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">Cor do Contorno:</span>
                            <div className="flex items-center gap-1">
                              {[
                                { color: "#FFFFFF", name: "Branco" },
                                { color: "#F59E0B", name: "Ouro" },
                                { color: "#0F172A", name: "Preto" },
                                { color: "#2563EB", name: "Azul" },
                                { color: "#831843", name: "Vinho" }
                              ].map((c) => (
                                <button
                                  key={`outline-${c.color}`}
                                  type="button"
                                  onClick={() => setLogoOutlineColor(c.color)}
                                  className={`w-5 h-5 rounded-full border transition-all ${
                                    logoOutlineColor.toLowerCase() === c.color.toLowerCase() ? "ring-2 ring-primary scale-110" : "opacity-80 hover:opacity-100"
                                  }`}
                                  style={{ backgroundColor: c.color }}
                                  title={c.name}
                                />
                              ))}
                              <input 
                                type="color" 
                                value={logoOutlineColor}
                                onChange={(e) => setLogoOutlineColor(e.target.value)}
                                className="w-5 h-5 rounded border cursor-pointer ml-1"
                                title="Cor personalizada do contorno"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Fundo do Emblema da Logo (Formato e Cor para não ficar apagada) */}
                    <div className="space-y-1.5 p-2 rounded-lg bg-muted/30 border">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground">Formato do Fundo da Logo:</span>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { id: 'circle', label: 'Círculo' },
                            { id: 'rounded', label: 'Arredondado' },
                            { id: 'square', label: 'Quadrado' },
                            { id: 'transparent', label: 'Transparente' }
                          ].map((shape) => (
                            <button
                              key={shape.id}
                              type="button"
                              onClick={() => setLogoBgShape(shape.id as any)}
                              className={`px-1.5 py-0.5 rounded border text-[9px] ${
                                logoBgShape === shape.id ? "bg-primary text-white border-primary font-bold" : "bg-background hover:bg-muted"
                              }`}
                            >
                              {shape.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {logoBgShape !== 'transparent' && (
                        <div className="space-y-1.5 pt-1 border-t border-border/60">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-muted-foreground">Cor do Fundo do Emblema:</span>
                            <div className="flex items-center gap-1.5">
                              <input 
                                type="color" 
                                value={logoBgColor}
                                onChange={(e) => setLogoBgColor(e.target.value)}
                                className="w-5 h-5 rounded border cursor-pointer"
                              />
                              <Input 
                                type="text"
                                value={logoBgColor}
                                onChange={(e) => setLogoBgColor(e.target.value)}
                                className="h-5 w-16 text-[9px] font-mono uppercase p-0.5 text-center"
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {[
                              { color: "#FFFFFF", name: "Branco Puro" },
                              { color: "#FEF3C7", name: "Dourado Marfim" },
                              { color: "#E0F2FE", name: "Azul Céu" },
                              { color: "#0F172A", name: "Escuro" },
                              { color: "#F8FAFC", name: "Gelo" }
                            ].map((bg) => (
                              <button
                                key={`logobg-${bg.color}`}
                                type="button"
                                onClick={() => setLogoBgColor(bg.color)}
                                className={`px-1.5 py-0.5 rounded border text-[9px] flex items-center gap-1 ${
                                  logoBgColor.toLowerCase() === bg.color.toLowerCase() ? "ring-1 ring-primary font-bold bg-background" : "hover:bg-muted"
                                }`}
                              >
                                <span className="w-2 h-2 rounded-full border border-black/20" style={{ backgroundColor: bg.color }} />
                                {bg.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Cor e Tratamento Visual da Imagem da Logo */}
                    <div className="space-y-1.5 p-2 rounded-lg bg-muted/30 border">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground">Cor do Desenho da Logo:</span>
                        <span className="text-[9px] text-muted-foreground">Elimina o efeito apagado</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { id: "original", label: "✨ Vibrante" },
                          { id: "white", label: "Branco Puro" },
                          { id: "gold", label: "Dourado" },
                          { id: "black", label: "Preto" }
                        ].map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setLogoColorMode(m.id as any)}
                            className={`p-1 rounded border text-[9px] font-medium transition-all ${
                              logoColorMode === m.id ? "bg-primary text-white border-primary font-bold" : "bg-background hover:bg-muted"
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
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
                            className="w-5 h-5 rounded border cursor-pointer"
                          />
                          <span className="text-[9px] font-mono">{customLogoColor}</span>
                        </div>
                      </div>

                      {/* Toggle de remoção de fundo branco da imagem original */}
                      <div className="flex items-center justify-between pt-1 border-t mt-1">
                        <span className="text-[10px] font-medium text-slate-700 dark:text-slate-300">
                          Mesclar fundo branco da imagem
                        </span>
                        <Switch 
                          checked={removeLogoWhiteBg} 
                          onCheckedChange={setRemoveLogoWhiteBg} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4.1. GERENCIADOR DE TAMANHOS DE FONTE POR POSIÇÃO (TIPOGRAFIA LIVRE) */}
                  <div className="space-y-2.5 bg-background p-3 rounded-xl border shadow-2xs">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Type className="w-3.5 h-3.5 text-primary" />
                        Tamanhos de Fonte por Posição (Tipografia Livre)
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetFontSizes}
                        className="h-6 text-[10px] text-primary hover:bg-primary/10 px-2"
                        title="Restaurar tamanhos de fonte padrão"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Restaurar
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Ajuste milimétrico do tamanho de cada texto na frente e no verso do crachá.
                    </p>

                    {/* Escalonamento Rápido Geral */}
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: "Padrão", factor: 1.0 },
                        { label: "+15% Maior", factor: 1.15 },
                        { label: "+30% Amplo", factor: 1.30 },
                        { label: "Compacto", factor: 0.90 }
                      ].map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => applyGlobalFontScale(preset.factor)}
                          className="px-1.5 py-1 rounded border text-[9px] font-medium bg-muted/30 hover:bg-muted text-foreground transition-all"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>

                    {/* Abas Frente vs Verso para Ajuste Fino */}
                    <Tabs defaultValue="frente_fontes" className="w-full">
                      <TabsList className="grid grid-cols-2 h-7 w-full p-0.5 bg-muted/60">
                        <TabsTrigger value="frente_fontes" className="text-[10px] font-bold py-1">
                          Frente ({Object.keys(fontSizes).slice(0, 8).length} textos)
                        </TabsTrigger>
                        <TabsTrigger value="verso_fontes" className="text-[10px] font-bold py-1">
                          Verso ({Object.keys(fontSizes).slice(8).length} textos)
                        </TabsTrigger>
                      </TabsList>

                      {/* Textos da Frente */}
                      <TabsContent value="frente_fontes" className="space-y-1.5 pt-2">
                        {[
                          { key: 'headerTitle' as const, label: 'Tema Superior (Igreja)', def: 8.5 },
                          { key: 'headerSubtitle' as const, label: 'Subtítulo (Congregação)', def: 7 },
                          { key: 'role' as const, label: 'Faixa do Cargo / Ministério', def: 9.5 },
                          { key: 'name' as const, label: 'Nome do Voluntário', def: 10 },
                          { key: 'department' as const, label: 'Departamento / Equipe', def: 6.5 },
                          { key: 'matricula' as const, label: 'Nº Matrícula', def: 9 },
                          { key: 'matriculaLabel' as const, label: 'Rótulo "REGISTRO"', def: 7 },
                          { key: 'validade' as const, label: 'Validade / Gestão', def: 7 }
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-1 px-2 rounded bg-muted/20 border text-xs">
                            <span className="text-[10px] font-medium text-foreground truncate max-w-[140px]" title={item.label}>
                              {item.label}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateFontSize(item.key, -0.5)}
                                className="w-5 h-5 rounded border bg-background flex items-center justify-center hover:bg-muted text-xs font-bold"
                                title="Diminuir"
                              >
                                -
                              </button>
                              <Input
                                type="number"
                                step="0.5"
                                min={4}
                                max={24}
                                value={fontSizes[item.key]}
                                onChange={(e) => setExactFontSize(item.key, Number(e.target.value))}
                                className="h-5 w-12 text-[10px] font-mono text-center p-0.5"
                              />
                              <button
                                type="button"
                                onClick={() => updateFontSize(item.key, 0.5)}
                                className="w-5 h-5 rounded border bg-background flex items-center justify-center hover:bg-muted text-xs font-bold"
                                title="Aumentar"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </TabsContent>

                      {/* Textos do Verso */}
                      <TabsContent value="verso_fontes" className="space-y-1.5 pt-2">
                        {[
                          { key: 'versoHeader' as const, label: 'Título do Termo', def: 7.5 },
                          { key: 'versoSubheader' as const, label: 'Subtítulo / Vinculação', def: 7 },
                          { key: 'versoRules' as const, label: 'Instruções e Regras (3 linhas)', def: 7 },
                          { key: 'versoVerse' as const, label: 'Versículo Bíblico', def: 6.5 },
                          { key: 'versoVerseRef' as const, label: 'Referência Bíblica', def: 6.5 },
                          { key: 'versoSignatureRole' as const, label: 'Cargo da Assinatura', def: 8.5 },
                          { key: 'versoSignatureName' as const, label: 'Nome da Assinatura', def: 7.5 },
                          { key: 'versoFooter' as const, label: 'Rodapé Institucional', def: 6 }
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-1 px-2 rounded bg-muted/20 border text-xs">
                            <span className="text-[10px] font-medium text-foreground truncate max-w-[140px]" title={item.label}>
                              {item.label}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateFontSize(item.key, -0.5)}
                                className="w-5 h-5 rounded border bg-background flex items-center justify-center hover:bg-muted text-xs font-bold"
                                title="Diminuir"
                              >
                                -
                              </button>
                              <Input
                                type="number"
                                step="0.5"
                                min={4}
                                max={24}
                                value={fontSizes[item.key]}
                                onChange={(e) => setExactFontSize(item.key, Number(e.target.value))}
                                className="h-5 w-12 text-[10px] font-mono text-center p-0.5"
                              />
                              <button
                                type="button"
                                onClick={() => updateFontSize(item.key, 0.5)}
                                className="w-5 h-5 rounded border bg-background flex items-center justify-center hover:bg-muted text-xs font-bold"
                                title="Aumentar"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </TabsContent>
                    </Tabs>
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

                  {/* 6. COR DA PARTE INFERIOR (FAIXA DE REGISTRO E QR CODE) */}
                  <div className="space-y-2 bg-background p-3 rounded-xl border shadow-2xs">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-amber-600" />
                        Cor da Faixa Inferior (Registro & QR Code)
                      </Label>
                      <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-800 border-amber-300">
                        Frente do Crachá
                      </Badge>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Escolha a cor do rodapé inferior onde ficam o Nº de Registro, Validade e o QR Code oficial.
                    </p>

                    {/* Paletas Rápidas */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                      {[
                        { id: "white", name: "Branco Puro", bg: "#FFFFFF", text: "#0F172A" },
                        { id: "light_gray", name: "Cinza Claro", bg: "#F8FAFC", text: "#0F172A" },
                        { id: "gold", name: "Dourado", bg: "#FEF3C7", text: "#78350F" },
                        { id: "theme", name: "Cor do Tema", bg: currentTheme.primary, text: "#FFFFFF" },
                        { id: "badge", name: "Cor do Cargo", bg: currentTheme.badge, text: "#FFFFFF" },
                        { id: "navy", name: "Azul Marinho", bg: "#1E3A8A", text: "#FFFFFF" },
                        { id: "emerald", name: "Verde Esmeralda", bg: "#065F46", text: "#FFFFFF" },
                        { id: "dark", name: "Preto Nobre", bg: "#0F172A", text: "#FFFFFF" }
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectFooterPreset(preset.id)}
                          className={`p-1.5 rounded-lg border text-[10px] font-medium flex items-center gap-1.5 transition-all text-left truncate ${
                            footerBgColor.toLowerCase() === preset.bg.toLowerCase()
                              ? "bg-primary text-white border-primary shadow-xs font-bold"
                              : "bg-muted/30 hover:bg-muted text-foreground border-border"
                          }`}
                        >
                          <span 
                            className="w-3 h-3 rounded-full shrink-0 border border-black/20" 
                            style={{ backgroundColor: preset.bg }}
                          />
                          <span className="truncate">{preset.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Controles Livres de Cor (Fundo e Texto) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t mt-1">
                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/30 border">
                        <span className="text-[11px] font-medium text-foreground">Fundo da Faixa:</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="color" 
                            value={footerBgColor}
                            onChange={(e) => {
                              setFooterStylePreset("custom");
                              setFooterBgColor(e.target.value);
                            }}
                            className="w-6 h-6 rounded border cursor-pointer"
                            title="Escolher cor de fundo"
                          />
                          <Input 
                            type="text" 
                            value={footerBgColor} 
                            onChange={(e) => {
                              setFooterStylePreset("custom");
                              setFooterBgColor(e.target.value);
                            }}
                            className="h-6 w-20 text-[10px] font-mono uppercase p-1 text-center" 
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-1.5 rounded-lg bg-muted/30 border">
                        <span className="text-[11px] font-medium text-foreground">Texto & Dados:</span>
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="color" 
                            value={footerTextColor}
                            onChange={(e) => {
                              setFooterStylePreset("custom");
                              setFooterTextColor(e.target.value);
                            }}
                            className="w-6 h-6 rounded border cursor-pointer"
                            title="Escolher cor do texto"
                          />
                          <Input 
                            type="text" 
                            value={footerTextColor} 
                            onChange={(e) => {
                              setFooterStylePreset("custom");
                              setFooterTextColor(e.target.value);
                            }}
                            className="h-6 w-20 text-[10px] font-mono uppercase p-1 text-center" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Botão de Contraste Automático e Mini Prévia */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAutoFooterTextColor}
                        className="h-7 text-[11px] font-medium"
                      >
                        <Sparkles className="w-3 h-3 mr-1 text-amber-500" />
                        Ajustar Contraste Automático
                      </Button>

                      {/* Mini Amostra */}
                      <div 
                        className="px-2 py-1 rounded border text-[9px] font-mono font-bold flex items-center gap-2"
                        style={{ backgroundColor: footerBgColor, color: footerTextColor }}
                      >
                        <span>REG: {customMatricula}</span>
                        <span className="text-[7.5px] opacity-80">QR</span>
                      </div>
                    </div>
                  </div>

                  {/* 6.1. PERSONALIZAÇÃO AVANÇADA DO QR CODE (TAMANHO, CORES E CONTORNO) */}
                  <div className="space-y-3 bg-background p-3 rounded-xl border shadow-2xs">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <QrCode className="w-3.5 h-3.5 text-primary" />
                        Personalização do QR Code
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={resetQrCodeCustomization}
                        className="h-6 text-[10px] text-primary hover:bg-primary/10 px-2"
                        title="Restaurar tamanho e cores padrão do QR Code"
                      >
                        <RotateCcw className="w-3 h-3 mr-1" />
                        Restaurar
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground leading-tight">
                      Escolha o formato do conteúdo, aumente o tamanho e adapte o estilo para facilitar a leitura por câmeras de celular.
                    </p>

                    {/* Modo de Conteúdo do QR Code (Facilidade de Leitura) */}
                    <div className="space-y-1.5 p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center justify-between">
                        <Label className="text-[11px] font-bold text-emerald-900 dark:text-emerald-200">
                          Formato de Leitura no Celular:
                        </Label>
                        <Badge variant="outline" className="text-[9px] bg-emerald-100 text-emerald-800 font-bold border-emerald-300">
                          {qrCodePayloadMode === 'short_url' ? '25x25 (Ultra Nítido)' : qrCodePayloadMode === 'text' ? 'Texto Direto' : qrCodePayloadMode === 'vcard' ? 'Contato vCard' : 'URL Detalhada'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setQrCodePayloadMode('short_url')}
                          className={`p-1.5 rounded border text-left text-[10px] transition-all flex flex-col ${
                            qrCodePayloadMode === 'short_url'
                              ? "bg-emerald-600 text-white font-bold border-emerald-700 shadow-xs ring-1 ring-emerald-600"
                              : "bg-background hover:bg-muted text-foreground border-slate-200"
                          }`}
                        >
                          <span className="font-bold flex items-center gap-1">⚡ URL Curta (Recomendado)</span>
                          <span className={`text-[9.5px] ${qrCodePayloadMode === 'short_url' ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                            Pontos grandes! Leitura super rápida.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setQrCodePayloadMode('text')}
                          className={`p-1.5 rounded border text-left text-[10px] transition-all flex flex-col ${
                            qrCodePayloadMode === 'text'
                              ? "bg-emerald-600 text-white font-bold border-emerald-700 shadow-xs ring-1 ring-emerald-600"
                              : "bg-background hover:bg-muted text-foreground border-slate-200"
                          }`}
                        >
                          <span className="font-bold flex items-center gap-1">📝 Texto da Credencial</span>
                          <span className={`text-[9.5px] ${qrCodePayloadMode === 'text' ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                            Exibe o Nome, Cargo e Matrícula.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setQrCodePayloadMode('vcard')}
                          className={`p-1.5 rounded border text-left text-[10px] transition-all flex flex-col ${
                            qrCodePayloadMode === 'vcard'
                              ? "bg-emerald-600 text-white font-bold border-emerald-700 shadow-xs ring-1 ring-emerald-600"
                              : "bg-background hover:bg-muted text-foreground border-slate-200"
                          }`}
                        >
                          <span className="font-bold flex items-center gap-1">🪪 Cartão vCard</span>
                          <span className={`text-[9.5px] ${qrCodePayloadMode === 'vcard' ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                            Opção de salvar nos contatos.
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setQrCodePayloadMode('full_url')}
                          className={`p-1.5 rounded border text-left text-[10px] transition-all flex flex-col ${
                            qrCodePayloadMode === 'full_url'
                              ? "bg-emerald-600 text-white font-bold border-emerald-700 shadow-xs ring-1 ring-emerald-600"
                              : "bg-background hover:bg-muted text-foreground border-slate-200"
                          }`}
                        >
                          <span className="font-bold flex items-center gap-1">🌐 URL Completa</span>
                          <span className={`text-[9.5px] ${qrCodePayloadMode === 'full_url' ? 'text-emerald-100' : 'text-muted-foreground'}`}>
                            Todos os parâmetros estendidos.
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Tamanho do QR Code */}
                    <div className="space-y-2 p-2.5 rounded-lg bg-muted/40 border">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                          Tamanho do QR Code:
                          <Badge variant="outline" className="text-[10px] font-mono font-bold bg-primary/10 text-primary border-primary/20">
                            {qrCodeSizePx}px
                          </Badge>
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setQrCodeSizePx(prev => Math.max(18, prev - 2))}
                            className="w-5 h-5 rounded border bg-background flex items-center justify-center hover:bg-muted text-xs font-bold"
                            title="Diminuir tamanho do QR Code"
                          >
                            -
                          </button>
                          <input
                            type="range"
                            min={18}
                            max={48}
                            step={1}
                            value={qrCodeSizePx}
                            onChange={(e) => setQrCodeSizePx(Number(e.target.value))}
                            className="w-24 h-1.5 bg-muted-foreground/30 rounded-lg appearance-none cursor-pointer accent-primary"
                          />
                          <button
                            type="button"
                            onClick={() => setQrCodeSizePx(prev => Math.min(48, prev + 2))}
                            className="w-5 h-5 rounded border bg-background flex items-center justify-center hover:bg-muted text-xs font-bold"
                            title="Aumentar tamanho do QR Code"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Presets Rápidos de Tamanho */}
                      <div className="grid grid-cols-5 gap-1 pt-1">
                        {[
                          { label: "22px", value: 22 },
                          { label: "28px (Padrão)", value: 28 },
                          { label: "34px", value: 34 },
                          { label: "40px (Grande)", value: 40 },
                          { label: "46px (Extra)", value: 46 }
                        ].map((sz) => (
                          <button
                            key={sz.value}
                            type="button"
                            onClick={() => setQrCodeSizePx(sz.value)}
                            className={`py-1 rounded border text-[9px] font-medium transition-all ${
                              qrCodeSizePx === sz.value
                                ? "bg-primary text-white border-primary font-bold shadow-xs"
                                : "bg-background hover:bg-muted text-foreground border-border"
                            }`}
                          >
                            {sz.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cores do QR Code (Desenho e Fundo) */}
                    <div className="space-y-2 p-2.5 rounded-lg bg-muted/40 border">
                      <span className="text-[11px] font-bold text-foreground block">
                        Cores do QR Code:
                      </span>

                      {/* Cor dos Módulos (QR Code) */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-medium text-muted-foreground">Cor do Desenho (QR):</span>
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="color" 
                              value={qrCodeColor}
                              onChange={(e) => setQrCodeColor(e.target.value)}
                              className="w-5 h-5 rounded border cursor-pointer"
                              title="Escolher cor dos módulos do QR Code"
                            />
                            <Input 
                              type="text" 
                              value={qrCodeColor} 
                              onChange={(e) => setQrCodeColor(e.target.value)} 
                              className="h-5 w-18 text-[9px] font-mono uppercase p-1 text-center" 
                            />
                          </div>
                        </div>

                        {/* Paleta Rápida da Cor do QR */}
                        <div className="flex flex-wrap gap-1">
                          {[
                            { color: "#000000", name: "Preto" },
                            { color: currentTheme.primary, name: "Tema" },
                            { color: "#1E3A8A", name: "Azul" },
                            { color: "#831843", name: "Vinho" },
                            { color: "#065F46", name: "Verde" },
                            { color: "#B45309", name: "Dourado" }
                          ].map((item) => (
                            <button
                              key={`qr-col-${item.color}`}
                              type="button"
                              onClick={() => setQrCodeColor(item.color)}
                              className={`px-2 py-0.5 rounded border text-[9.5px] flex items-center gap-1 transition-all ${
                                qrCodeColor.toLowerCase() === item.color.toLowerCase()
                                  ? "ring-2 ring-primary font-bold bg-background shadow-xs"
                                  : "bg-background hover:bg-muted"
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full border border-black/20" style={{ backgroundColor: item.color }} />
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Cor de Fundo do QR Code */}
                      <div className="space-y-1.5 pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-[10.5px] font-medium text-muted-foreground">Cor do Fundo do QR:</span>
                          <div className="flex items-center gap-1.5">
                            <input 
                              type="color" 
                              value={qrCodeBgColor === "transparent" ? "#FFFFFF" : qrCodeBgColor}
                              onChange={(e) => setQrCodeBgColor(e.target.value)}
                              className="w-5 h-5 rounded border cursor-pointer"
                              title="Escolher cor de fundo do QR Code"
                            />
                            <Input 
                              type="text" 
                              value={qrCodeBgColor} 
                              onChange={(e) => setQrCodeBgColor(e.target.value)} 
                              className="h-5 w-18 text-[9px] font-mono uppercase p-1 text-center" 
                            />
                          </div>
                        </div>

                        {/* Paleta Rápida do Fundo do QR */}
                        <div className="flex flex-wrap gap-1">
                          {[
                            { color: "#FFFFFF", name: "Branco" },
                            { color: "#F8FAFC", name: "Gelo" },
                            { color: "#FEFCE8", name: "Marfim" },
                            { color: "#FEF3C7", name: "Ouro Claro" },
                            { color: footerBgColor, name: "Faixa Inferior" }
                          ].map((item, idx) => (
                            <button
                              key={`qr-bg-${idx}-${item.color}`}
                              type="button"
                              onClick={() => setQrCodeBgColor(item.color)}
                              className={`px-2 py-0.5 rounded border text-[9.5px] flex items-center gap-1 transition-all ${
                                qrCodeBgColor.toLowerCase() === item.color.toLowerCase()
                                  ? "ring-2 ring-primary font-bold bg-background shadow-xs"
                                  : "bg-background hover:bg-muted"
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full border border-black/20" style={{ backgroundColor: item.color }} />
                              {item.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Contorno / Borda do QR Code */}
                    <div className="space-y-2 p-2.5 rounded-lg bg-muted/40 border">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-bold text-foreground block">Contorno & Borda do QR Code</span>
                          <span className="text-[9.5px] text-muted-foreground block">Adiciona moldura decorativa ao QR Code</span>
                        </div>
                        <Switch 
                          checked={qrHasBorder} 
                          onCheckedChange={setQrHasBorder} 
                        />
                      </div>

                      {qrHasBorder && (
                        <div className="space-y-2 pt-2 border-t">
                          {/* Espessura do Contorno */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-muted-foreground">Espessura:</span>
                            <div className="grid grid-cols-3 gap-1">
                              {[
                                { id: "fino", label: "1px Fino" },
                                { id: "medio", label: "2px Médio" },
                                { id: "forte", label: "3px Forte" }
                              ].map((w) => (
                                <button
                                  key={w.id}
                                  type="button"
                                  onClick={() => setQrBorderWidth(w.id as any)}
                                  className={`px-2 py-0.5 rounded border text-[9px] font-medium transition-all ${
                                    qrBorderWidth === w.id ? "bg-primary text-white border-primary font-bold shadow-xs" : "bg-background hover:bg-muted"
                                  }`}
                                >
                                  {w.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Cantos do Contorno */}
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-muted-foreground">Cantos:</span>
                            <div className="grid grid-cols-4 gap-1">
                              {[
                                { id: "none", label: "Reto" },
                                { id: "sm", label: "3px" },
                                { id: "md", label: "6px" },
                                { id: "lg", label: "10px" }
                              ].map((r) => (
                                <button
                                  key={r.id}
                                  type="button"
                                  onClick={() => setQrBorderRadius(r.id as any)}
                                  className={`px-1.5 py-0.5 rounded border text-[9px] font-medium transition-all ${
                                    qrBorderRadius === r.id ? "bg-primary text-white border-primary font-bold shadow-xs" : "bg-background hover:bg-muted"
                                  }`}
                                >
                                  {r.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Cor do Contorno */}
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-medium text-muted-foreground">Cor da Borda:</span>
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="color" 
                                  value={qrBorderColor}
                                  onChange={(e) => setQrBorderColor(e.target.value)}
                                  className="w-5 h-5 rounded border cursor-pointer"
                                />
                                <Input 
                                  type="text" 
                                  value={qrBorderColor} 
                                  onChange={(e) => setQrBorderColor(e.target.value)} 
                                  className="h-5 w-18 text-[9px] font-mono uppercase p-1 text-center" 
                                />
                              </div>
                            </div>

                            {/* Paleta rápida para contorno */}
                            <div className="flex flex-wrap gap-1">
                              {[
                                { color: "#CBD5E1", name: "Cinza" },
                                { color: "#FFFFFF", name: "Branco" },
                                { color: "#000000", name: "Preto" },
                                { color: "#F59E0B", name: "Dourado" },
                                { color: currentTheme.primary, name: "Tema" },
                                { color: "#1E3A8A", name: "Azul" }
                              ].map((item) => (
                                <button
                                  key={`qr-border-${item.color}`}
                                  type="button"
                                  onClick={() => setQrBorderColor(item.color)}
                                  className={`px-2 py-0.5 rounded border text-[9.5px] flex items-center gap-1 transition-all ${
                                    qrBorderColor.toLowerCase() === item.color.toLowerCase()
                                      ? "ring-2 ring-primary font-bold bg-background shadow-xs"
                                      : "bg-background hover:bg-muted"
                                  }`}
                                >
                                  <span className="w-2 h-2 rounded-full border border-black/20" style={{ backgroundColor: item.color }} />
                                  {item.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Amostra em Tempo Real do QR Code */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border">
                      <span className="text-[10px] text-muted-foreground">Amostra do QR Code atual:</span>
                      <div 
                        className="flex items-center justify-center p-1"
                        style={{
                          backgroundColor: qrCodeBgColor,
                          border: qrHasBorder 
                            ? `${qrBorderWidth === 'fino' ? '1px' : qrBorderWidth === 'medio' ? '2px' : '3px'} solid ${qrBorderColor}` 
                            : 'none',
                          borderRadius: qrBorderRadius === 'none' ? '0px' : qrBorderRadius === 'sm' ? '3px' : qrBorderRadius === 'md' ? '6px' : '10px'
                        }}
                      >
                        <QRCodeSVG 
                          value={qrCodeText}
                          size={Math.min(32, qrCodeSizePx)}
                          fgColor={qrCodeColor}
                          bgColor={qrCodeBgColor}
                          level="L"
                          includeMargin={true}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 7. EDIÇÃO COMPLETA DE TEXTOS DA FRENTE COM AJUSTE DE FONTE INLINE */}
                  <div className="space-y-2.5 bg-background p-3 rounded-xl border shadow-2xs">
                    <div className="flex items-center justify-between border-b pb-1">
                      <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-primary" />
                        Textos da Frente do Crachá
                      </Label>
                      <span className="text-[10px] text-muted-foreground">Botões [-] [+] ajustam a fonte</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] text-muted-foreground font-semibold">Tema Superior</Label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateFontSize('headerTitle', -0.5)}
                              className="w-4 h-4 rounded border bg-muted/60 flex items-center justify-center text-[9px] font-bold hover:bg-muted"
                              title="Diminuir fonte"
                            >
                              -
                            </button>
                            <span className="text-[9px] font-mono font-bold text-primary">{fontSizes.headerTitle}px</span>
                            <button
                              type="button"
                              onClick={() => updateFontSize('headerTitle', 0.5)}
                              className="w-4 h-4 rounded border bg-muted/60 flex items-center justify-center text-[9px] font-bold hover:bg-muted"
                              title="Aumentar fonte"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <Input 
                          value={customHeaderTitle} 
                          onChange={(e) => setCustomHeaderTitle(e.target.value)} 
                          placeholder="O BRASIL PARA CRISTO"
                          className="h-8 text-xs font-bold" 
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] text-muted-foreground font-semibold">Subtítulo / Congregação</Label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateFontSize('headerSubtitle', -0.5)}
                              className="w-4 h-4 rounded border bg-muted/60 flex items-center justify-center text-[9px] font-bold hover:bg-muted"
                              title="Diminuir fonte"
                            >
                              -
                            </button>
                            <span className="text-[9px] font-mono font-bold text-primary">{fontSizes.headerSubtitle}px</span>
                            <button
                              type="button"
                              onClick={() => updateFontSize('headerSubtitle', 0.5)}
                              className="w-4 h-4 rounded border bg-muted/60 flex items-center justify-center text-[9px] font-bold hover:bg-muted"
                              title="Aumentar fonte"
                            >
                              +
                            </button>
                          </div>
                        </div>
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
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] text-muted-foreground font-semibold">Nome no Crachá</Label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateFontSize('name', -0.5)}
                              className="w-4 h-4 rounded border bg-muted/60 flex items-center justify-center text-[9px] font-bold hover:bg-muted"
                              title="Diminuir fonte"
                            >
                              -
                            </button>
                            <span className="text-[9px] font-mono font-bold text-primary">{fontSizes.name}px</span>
                            <button
                              type="button"
                              onClick={() => updateFontSize('name', 0.5)}
                              className="w-4 h-4 rounded border bg-muted/60 flex items-center justify-center text-[9px] font-bold hover:bg-muted"
                              title="Aumentar fonte"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <Input 
                          value={customName} 
                          onChange={(e) => setCustomName(e.target.value)} 
                          className="h-8 text-xs font-bold" 
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] text-muted-foreground font-semibold">Cargo / Faixa</Label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateFontSize('role', -0.5)}
                              className="w-4 h-4 rounded border bg-muted/60 flex items-center justify-center text-[9px] font-bold hover:bg-muted"
                              title="Diminuir fonte"
                            >
                              -
                            </button>
                            <span className="text-[9px] font-mono font-bold text-primary">{fontSizes.role}px</span>
                            <button
                              type="button"
                              onClick={() => updateFontSize('role', 0.5)}
                              className="w-4 h-4 rounded border bg-muted/60 flex items-center justify-center text-[9px] font-bold hover:bg-muted"
                              title="Aumentar fonte"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <Input 
                          value={customRole} 
                          onChange={(e) => setCustomRole(e.target.value)} 
                          className="h-8 text-xs font-bold text-primary" 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] text-muted-foreground font-semibold">Departamento</Label>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => updateFontSize('department', -0.5)}
                              className="w-3.5 h-3.5 rounded border bg-muted/60 flex items-center justify-center text-[8px] font-bold"
                            >
                              -
                            </button>
                            <span className="text-[8px] font-mono text-primary font-bold">{fontSizes.department}</span>
                            <button
                              type="button"
                              onClick={() => updateFontSize('department', 0.5)}
                              className="w-3.5 h-3.5 rounded border bg-muted/60 flex items-center justify-center text-[8px] font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <Input 
                          value={customDepartment} 
                          onChange={(e) => setCustomDepartment(e.target.value)} 
                          className="h-8 text-[11px]" 
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] text-muted-foreground font-semibold">Nº Matrícula</Label>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => updateFontSize('matricula', -0.5)}
                              className="w-3.5 h-3.5 rounded border bg-muted/60 flex items-center justify-center text-[8px] font-bold"
                            >
                              -
                            </button>
                            <span className="text-[8px] font-mono text-primary font-bold">{fontSizes.matricula}</span>
                            <button
                              type="button"
                              onClick={() => updateFontSize('matricula', 0.5)}
                              className="w-3.5 h-3.5 rounded border bg-muted/60 flex items-center justify-center text-[8px] font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <Input 
                          value={customMatricula} 
                          onChange={(e) => setCustomMatricula(e.target.value)} 
                          className="h-8 text-xs font-mono font-bold" 
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] text-muted-foreground font-semibold">Validade</Label>
                          <div className="flex items-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => updateFontSize('validade', -0.5)}
                              className="w-3.5 h-3.5 rounded border bg-muted/60 flex items-center justify-center text-[8px] font-bold"
                            >
                              -
                            </button>
                            <span className="text-[8px] font-mono text-primary font-bold">{fontSizes.validade}</span>
                            <button
                              type="button"
                              onClick={() => updateFontSize('validade', 0.5)}
                              className="w-3.5 h-3.5 rounded border bg-muted/60 flex items-center justify-center text-[8px] font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <Input 
                          value={customValidity} 
                          onChange={(e) => setCustomValidity(e.target.value)} 
                          className="h-8 text-xs font-semibold" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* 8. EDIÇÃO COMPLETA DE TEXTOS DO VERSO COM AJUSTE DE FONTE INLINE */}
                  <div className="space-y-2.5 bg-background p-3 rounded-xl border shadow-2xs">
                    <div className="flex items-center justify-between border-b pb-1">
                      <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                        <Sliders className="w-3.5 h-3.5 text-primary" />
                        Textos do Verso do Crachá
                      </Label>
                      <span className="text-[10px] text-muted-foreground">Botões [-] [+] ajustam a fonte</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] text-muted-foreground font-semibold">Título do Verso</Label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateFontSize('versoHeader', -0.5)}
                              className="w-4 h-4 rounded border bg-muted/60 flex items-center justify-center text-[9px] font-bold hover:bg-muted"
                            >
                              -
                            </button>
                            <span className="text-[9px] font-mono font-bold text-primary">{fontSizes.versoHeader}px</span>
                            <button
                              type="button"
                              onClick={() => updateFontSize('versoHeader', 0.5)}
                              className="w-4 h-4 rounded border bg-muted/60 flex items-center justify-center text-[9px] font-bold hover:bg-muted"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <Input 
                          value={customVersoHeader} 
                          onChange={(e) => setCustomVersoHeader(e.target.value)} 
                          placeholder="TERMO DE IDENTIFICAÇÃO ECLESIÁSTICA"
                          className="h-8 text-xs font-bold" 
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] text-muted-foreground font-semibold">Subtítulo / Vinculação</Label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => updateFontSize('versoSubheader', -0.5)}
                              className="w-4 h-4 rounded border bg-muted/60 flex items-center justify-center text-[9px] font-bold hover:bg-muted"
                            >
                              -
                            </button>
                            <span className="text-[9px] font-mono font-bold text-primary">{fontSizes.versoSubheader}px</span>
                            <button
                              type="button"
                              onClick={() => updateFontSize('versoSubheader', 0.5)}
                              className="w-4 h-4 rounded border bg-muted/60 flex items-center justify-center text-[9px] font-bold hover:bg-muted"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <Input 
                          value={customVersoSubheader} 
                          onChange={(e) => setCustomVersoSubheader(e.target.value)} 
                          placeholder="DIACONATO • CORPO ECLESIÁSTICO"
                          className="h-8 text-xs font-semibold text-blue-600" 
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-1 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] text-muted-foreground font-semibold">Instruções de Uso (3 Linhas)</Label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateFontSize('versoRules', -0.5)}
                            className="w-4 h-4 rounded border bg-muted/60 flex items-center justify-center text-[9px] font-bold hover:bg-muted"
                          >
                            -
                          </button>
                          <span className="text-[9px] font-mono font-bold text-primary">{fontSizes.versoRules}px</span>
                          <button
                            type="button"
                            onClick={() => updateFontSize('versoRules', 0.5)}
                            className="w-4 h-4 rounded border bg-muted/60 flex items-center justify-center text-[9px] font-bold hover:bg-muted"
                          >
                            +
                          </button>
                        </div>
                      </div>
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
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] text-muted-foreground font-semibold">Versículo Bíblico ou Lema</Label>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => updateFontSize('versoVerse', -0.5)}
                            className="w-4 h-4 rounded border bg-muted/60 flex items-center justify-center text-[9px] font-bold hover:bg-muted"
                          >
                            -
                          </button>
                          <span className="text-[9px] font-mono font-bold text-primary">{fontSizes.versoVerse}px</span>
                          <button
                            type="button"
                            onClick={() => updateFontSize('versoVerse', 0.5)}
                            className="w-4 h-4 rounded border bg-muted/60 flex items-center justify-center text-[9px] font-bold hover:bg-muted"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <Input 
                        value={customVersoVerse} 
                        onChange={(e) => setCustomVersoVerse(e.target.value)} 
                        placeholder="Texto bíblico inspirador..."
                        className="h-8 text-xs italic" 
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-muted-foreground">Referência:</span>
                            <span className="text-[8px] font-mono text-primary font-bold">{fontSizes.versoVerseRef}px</span>
                          </div>
                          <Input 
                            value={customVersoVerseRef} 
                            onChange={(e) => setCustomVersoVerseRef(e.target.value)} 
                            placeholder="Referência (ex: 1 Timóteo 3:13)"
                            className="h-7 text-xs font-bold" 
                          />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-muted-foreground">Rodapé:</span>
                            <span className="text-[8px] font-mono text-primary font-bold">{fontSizes.versoFooter}px</span>
                          </div>
                          <Input 
                            value={customChurchFooter} 
                            onChange={(e) => setCustomChurchFooter(e.target.value)} 
                            placeholder="Rodapé Institucional"
                            className="h-7 text-xs text-muted-foreground" 
                          />
                        </div>
                      </div>
                    </div>

                    {/* Assinatura Oficial do Verso */}
                    <div className="space-y-1 pt-1 border-t">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] text-muted-foreground font-semibold">Assinatura Oficial do Verso</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] text-muted-foreground">Cargo: <strong className="text-primary font-mono">{fontSizes.versoSignatureRole}px</strong></span>
                          <span className="text-[9px] text-muted-foreground">Nome: <strong className="text-primary font-mono">{fontSizes.versoSignatureName}px</strong></span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[9px] text-muted-foreground">Cargo da Assinatura</Label>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => updateFontSize('versoSignatureRole', -0.5)}
                                className="w-3.5 h-3.5 rounded border bg-muted/60 flex items-center justify-center text-[8px] font-bold"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => updateFontSize('versoSignatureRole', 0.5)}
                                className="w-3.5 h-3.5 rounded border bg-muted/60 flex items-center justify-center text-[8px] font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <Input 
                            value={customResponsibleRole} 
                            onChange={(e) => setCustomResponsibleRole(e.target.value)} 
                            placeholder="DIRETOR(A) DO DIACONATO" 
                            className="h-7 text-xs" 
                          />
                        </div>
                        <div className="space-y-0.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-[9px] text-muted-foreground">Nome da Assinatura</Label>
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => updateFontSize('versoSignatureName', -0.5)}
                                className="w-3.5 h-3.5 rounded border bg-muted/60 flex items-center justify-center text-[8px] font-bold"
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => updateFontSize('versoSignatureName', 0.5)}
                                className="w-3.5 h-3.5 rounded border bg-muted/60 flex items-center justify-center text-[8px] font-bold"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <Input 
                            value={customResponsibleName} 
                            onChange={(e) => setCustomResponsibleName(e.target.value)} 
                            placeholder="Nome do Pastor ou Diretor" 
                            className="h-7 text-xs font-bold" 
                          />
                        </div>
                      </div>

                      {/* Upload / Troca da Assinatura Digital do Verso Ampliada */}
                      <div className="pt-2 border-t mt-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                            Assinatura Digitalizada do Pastor / Diretor
                          </Label>
                          {customResponsibleSignatureUrl && (
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Assinatura Ativa</span>
                          )}
                        </div>

                        <input 
                          type="file" 
                          ref={signatureInputRef} 
                          onChange={handleSignatureUpload} 
                          accept="image/*" 
                          className="hidden" 
                        />

                        <div className="flex items-center gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm" 
                            onClick={() => signatureInputRef.current?.click()}
                            className="h-7 text-[11px] flex-1 font-medium"
                          >
                            <Upload className="w-3 h-3 mr-1" />
                            {customResponsibleSignatureUrl ? "Trocar Assinatura" : "Carregar Assinatura (.PNG/.JPG)"}
                          </Button>
                          {customResponsibleSignatureUrl && (
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setCustomResponsibleSignatureUrl(null)}
                              className="h-7 text-[11px] text-red-500 hover:text-red-700 px-2"
                              title="Remover imagem da assinatura"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
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
                <div className="lg:col-span-7 flex flex-col items-center justify-between p-3 sm:p-5 bg-slate-100 dark:bg-slate-900/60 rounded-xl border lg:sticky lg:top-0 lg:overflow-y-auto lg:max-h-[calc(92vh-155px)]">
                  <div className="text-center mb-2.5 w-full">
                    <div className="flex flex-wrap items-center justify-center gap-2 mb-1.5">
                      <Badge variant="outline" className="text-[10px] bg-background font-bold text-slate-800">
                        Dimensões Físicas Reais: {badgeWidthMm} mm × {badgeHeightMm} mm
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">
                        Foto Centralizada & Cores Customizadas
                      </Badge>
                    </div>

                    {/* Barra de Ferramentas de Zoom & Visão Geral sem Cortes */}
                    <div className="flex items-center justify-between bg-background/80 backdrop-blur-xs p-1.5 px-3 rounded-lg border shadow-2xs mt-1 w-full max-w-md mx-auto">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold text-muted-foreground mr-1">Zoom:</span>
                        {[100, 85, 70].map((z) => (
                          <button
                            key={z}
                            type="button"
                            onClick={() => setPreviewZoom(z)}
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                              previewZoom === z 
                                ? "bg-primary text-primary-foreground border-primary" 
                                : "bg-muted/40 hover:bg-muted text-muted-foreground"
                            }`}
                          >
                            {z}%
                          </button>
                        ))}
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsFullscreenPreviewOpen(true)}
                        className="h-6 text-[11px] font-bold text-primary border-primary/40 hover:bg-primary/10 gap-1 px-2"
                        title="Abrir visualização geral em tela cheia sem cortes"
                      >
                        <Maximize2 className="w-3 h-3" />
                        Visão Geral sem Cortes
                      </Button>
                    </div>
                  </div>

                  {/* Contêiner de Impressão e Captura de Imagem do Crachá Individual */}
                  <div className="w-full overflow-x-auto flex flex-col items-center justify-center py-2">
                    <div 
                      id="cracha-print-single"
                      className="bg-white p-3 sm:p-5 rounded-lg shadow-xl border border-slate-300 flex flex-col items-center justify-center print:m-0 print:p-0 print:shadow-none print:border-none transition-transform"
                      style={{ 
                        boxSizing: 'border-box',
                        transform: previewZoom !== 100 ? `scale(${previewZoom / 100})` : undefined,
                        transformOrigin: 'top center'
                      }}
                    >
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 print:flex-row print:gap-4">
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
                          className="hidden sm:block border-r border-dashed border-slate-400 my-auto print:block print:border-slate-600"
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

      {/* MODAL DE VISÃO GERAL EM TELA CHEIA (SEM CORTES) */}
      <Dialog open={isFullscreenPreviewOpen} onOpenChange={setIsFullscreenPreviewOpen}>
        <DialogContent className="w-[98vw] max-w-4xl max-h-[96vh] flex flex-col p-4 sm:p-6 overflow-hidden bg-slate-900/95 text-white border-slate-700">
          <DialogHeader className="border-b border-slate-800 pb-3 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                <Maximize2 className="w-4 h-4 text-amber-400" />
                Visão Geral do Crachá em Escala Real (Sem Cortes)
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Visualização 100% livre de bordas e recortes com dimensões exatas de {badgeWidthMm} × {badgeHeightMm} mm.
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Área Central com Rolagem Suave e Centralização Total */}
          <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-slate-950/70 rounded-xl my-2 border border-slate-800">
            <div className="bg-white p-6 sm:p-8 rounded-xl shadow-2xl flex flex-col sm:flex-row items-center justify-center gap-8 border border-slate-300">
              {/* Frente */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  FRENTE ({badgeWidthMm}×{badgeHeightMm}mm)
                </span>
                {renderCrachaFrente({
                  name: customName,
                  role: customRole,
                  matricula: customMatricula,
                  photo: customPhotoUrl
                })}
              </div>

              {/* Linha pontilhada de dobra */}
              <div 
                className="hidden sm:block border-r-2 border-dashed border-slate-400 my-auto"
                style={{ height: `${badgeHeightMm}mm` }}
              ></div>

              {/* Verso */}
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                  VERSO ({badgeWidthMm}×{badgeHeightMm}mm)
                </span>
                {renderCrachaVerso()}
              </div>
            </div>
          </div>

          <DialogFooter className="border-t border-slate-800 pt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <span className="text-xs text-slate-400">
              Posição do furo rebaixada (3.5mm da borda) • Proteção total contra corte de texto
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrintCrachas}
                className="h-8 text-xs font-semibold bg-white text-slate-900 hover:bg-slate-100"
              >
                <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir
              </Button>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => setIsFullscreenPreviewOpen(false)}
                className="h-8 text-xs"
              >
                Fechar Visão Geral
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: SALVAR COMO MODELO */}
      <Dialog open={isSaveTemplateDialogOpen} onOpenChange={setIsSaveTemplateDialogOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <BookmarkPlus className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Salvar Design Atual como Modelo
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Salve todas as cores, bordas, margens de segurança, tipografia e verso para aplicar rapidamente em novos membros.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3.5 py-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome do Modelo:</Label>
              <Input
                placeholder="Ex: Membro Efetivo, Obreiro Oficial, Berçário..."
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                className="h-8 text-xs"
                autoFocus
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Categoria / Perfil:</Label>
              <Select 
                value={newTemplateTag} 
                onValueChange={(val) => setNewTemplateTag(val as BadgeTemplate['tag'])}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Membro" className="text-xs">Membro Geral</SelectItem>
                  <SelectItem value="Obreiro" className="text-xs">Obreiro / Liderança</SelectItem>
                  <SelectItem value="Visitante" className="text-xs">Visitante / Convidado</SelectItem>
                  <SelectItem value="Diaconato" className="text-xs">Diaconato & Portaria</SelectItem>
                  <SelectItem value="Louvor" className="text-xs">Ministério de Louvor</SelectItem>
                  <SelectItem value="Kids" className="text-xs">Ministério Infantil / EBD / Berçário</SelectItem>
                  <SelectItem value="Jovens" className="text-xs">Juventude / Teens</SelectItem>
                  <SelectItem value="Outro" className="text-xs">Personalizado / Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Descrição / Observações (opcional):</Label>
              <Input
                placeholder="Ex: Utilizado para recepção e conferências anuais"
                value={newTemplateDesc}
                onChange={(e) => setNewTemplateDesc(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            {/* Resumo da Configuração que será salva */}
            <div className="bg-muted/40 p-2.5 rounded-lg border text-[11px] space-y-1">
              <span className="font-bold text-foreground block">Itens incluídos no modelo:</span>
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-muted-foreground text-[10px]">
                <span>• Dimensões: {badgeWidthMm}×{badgeHeightMm}mm</span>
                <span>• Tema e Cores atuais</span>
                <span>• Bordas e espessuras</span>
                <span>• Margens de segurança ({useIndividualMargins ? `${safeMarginTopMm}t/${safeMarginSideMm}l/${safeMarginBottomMm}b mm` : `${safeMarginMm}mm`})</span>
                <span>• Ajuste da Logo & QR Code</span>
                <span>• Tamanhos de todas as fontes</span>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSaveTemplateDialogOpen(false)}
              className="h-8 text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveCurrentAsTemplate}
              className="h-8 text-xs font-semibold"
            >
              <Save className="w-3.5 h-3.5 mr-1" />
              Salvar Modelo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: GERENCIAR MODELOS PERSONALIZADOS */}
      <Dialog open={isManageTemplatesDialogOpen} onOpenChange={setIsManageTemplatesDialogOpen}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-primary/10 text-primary">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="text-base font-bold text-foreground">
                    Gerenciar Meus Modelos de Crachás
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Modelos criados e salvos localmente neste computador.
                  </DialogDescription>
                </div>
              </div>
              <Badge variant="outline" className="text-xs font-mono">
                {customTemplates.length} salvo(s)
              </Badge>
            </div>
          </DialogHeader>

          <div className="space-y-2.5 py-3 max-h-[60vh] overflow-y-auto pr-1">
            {customTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-2">
                <BookmarkPlus className="w-8 h-8 mx-auto opacity-40" />
                <p className="text-xs">Nenhum modelo personalizado salvo ainda.</p>
                <p className="text-[11px] text-muted-foreground/80 max-w-xs mx-auto">
                  Ajuste o crachá do seu jeito e clique em &ldquo;Salvar Modelo&rdquo; para criar designs reutilizáveis.
                </p>
              </div>
            ) : (
              customTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-3 rounded-lg border bg-card hover:bg-muted/30 transition-all flex items-center justify-between gap-3 shadow-2xs"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-foreground truncate">{tpl.name}</span>
                      <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                        {tpl.tag || tpl.category}
                      </Badge>
                    </div>
                    {tpl.description && (
                      <p className="text-[11px] text-muted-foreground truncate">{tpl.description}</p>
                    )}
                    <span className="text-[10px] text-muted-foreground/70 block">
                      Criado em {tpl.createdAt ? new Date(tpl.createdAt).toLocaleDateString("pt-BR") : "Personalizado"} • {tpl.badgeWidthMm}×{tpl.badgeHeightMm}mm
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleApplyTemplate(tpl);
                        setIsManageTemplatesDialogOpen(false);
                      }}
                      className="h-7 px-2 text-[11px] font-semibold border-primary/40 hover:bg-primary/10 text-primary"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Aplicar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteTemplate(tpl.id)}
                      className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      title="Excluir este modelo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsManageTemplatesDialogOpen(false)}
              className="h-8 text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO: ADICIONAR E AJUSTAR FOTO DO MEMBRO (CÂMERA, ARQUIVO, MÁSCARA, ZOOM E CENTRALIZAÇÃO) */}
      <Dialog open={isPhotoModalOpen} onOpenChange={(open) => !open && handleClosePhotoModal()}>
        <DialogContent className="max-w-xl p-5 sm:p-6 overflow-hidden">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Adicionar & Ajustar Foto do Membro
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Capture uma foto em tempo real pela câmera ou selecione um arquivo, aplique máscara (circular ou 3x4) e enquadre.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Abas: Câmera, Arquivo e Ajustes */}
          <Tabs value={activePhotoTab} onValueChange={(val) => setActivePhotoTab(val as any)} className="w-full pt-2">
            <TabsList className="grid grid-cols-3 w-full h-8">
              <TabsTrigger value="camera" className="text-xs gap-1.5" onClick={() => { if (!isCameraActive) startCamera(); }}>
                <Video className="w-3.5 h-3.5" /> Câmera ao Vivo
              </TabsTrigger>
              <TabsTrigger value="upload" className="text-xs gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Selecionar Arquivo
              </TabsTrigger>
              <TabsTrigger value="adjust" className="text-xs gap-1.5">
                <Crop className="w-3.5 h-3.5" /> Ajustar & Enquadrar
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: CÂMERA AO VIVO */}
            <TabsContent value="camera" className="space-y-3 pt-3">
              <div className="relative rounded-xl overflow-hidden bg-slate-900 border border-slate-700 aspect-video sm:aspect-[4/3] flex items-center justify-center max-h-[300px]">
                {/* Elemento de Vídeo */}
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
                />

                {/* Guia visual do corte (Retângulo 3x4 ou Círculo) sobreposto ao vídeo */}
                {isCameraActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div 
                      className={`border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] transition-all ${
                        photoShape === 'circle' ? 'rounded-full w-48 h-48' : 'rounded-lg w-44 h-56'
                      }`}
                    >
                      <div className="w-full h-full border border-dashed border-white/40 flex items-center justify-center">
                        <Crosshair className="w-6 h-6 text-white/50" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Tela de Espera / Câmera Desligada */}
                {!isCameraActive && !cameraError && (
                  <div className="flex flex-col items-center justify-center text-center p-6 text-slate-300 space-y-3">
                    <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                      <Camera className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Câmera Pronta para Captura</p>
                      <p className="text-[11px] text-slate-400 max-w-xs mt-0.5">
                        Posicione o rosto do membro centralizado na tela com boa iluminação.
                      </p>
                    </div>
                    <Button 
                      type="button" 
                      onClick={() => startCamera()}
                      className="h-8 text-xs font-semibold gap-1.5 shadow-sm"
                    >
                      <Video className="w-3.5 h-3.5" />
                      Ligar Câmera
                    </Button>
                  </div>
                )}

                {/* Erro de Câmera */}
                {cameraError && (
                  <div className="p-4 text-center space-y-2 text-rose-300 bg-rose-950/60 rounded-lg max-w-sm border border-rose-800">
                    <VideoOff className="w-6 h-6 mx-auto text-rose-400" />
                    <p className="text-xs font-bold">{cameraError}</p>
                    <p className="text-[10px] text-rose-200">
                      Você pode selecionar uma foto salva do seu computador ou celular na aba ao lado.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-1">
                      <Button 
                        type="button" 
                        size="sm" 
                        variant="outline" 
                        onClick={() => startCamera()}
                        className="h-7 text-xs bg-rose-900/60 border-rose-700 text-rose-100 hover:bg-rose-900"
                      >
                        Tentar Novamente
                      </Button>
                      <Button 
                        type="button" 
                        size="sm" 
                        onClick={() => setActivePhotoTab('upload')}
                        className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        Carregar Arquivo
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Barra de Ações da Câmera */}
              {isCameraActive && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={toggleCameraFacing}
                    className="h-8 text-xs gap-1"
                    title="Alternar entre câmera frontal e traseira"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Inverter Câmera
                  </Button>

                  <Button 
                    type="button" 
                    size="sm"
                    onClick={captureCameraPhoto}
                    className="h-9 px-4 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    <Camera className="w-4 h-4" />
                    Capturar Foto Agora
                  </Button>

                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={stopCamera}
                    className="h-8 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Pausar
                  </Button>
                </div>
              )}
            </TabsContent>

            {/* ABA 2: SELECIONAR ARQUIVO */}
            <TabsContent value="upload" className="space-y-3 pt-3">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-primary/40 hover:border-primary bg-muted/20 hover:bg-muted/40 rounded-xl p-8 text-center cursor-pointer transition-all space-y-3 flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    Clique aqui para selecionar uma foto
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-0.5">
                    Formatos aceitos: JPG, PNG, WEBP ou JPEG de qualquer dimensão
                  </span>
                </div>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs font-semibold">
                  Navegar no Dispositivo
                </Button>
              </div>
            </TabsContent>

            {/* ABA 3: AJUSTAR, ENQUADRAR & MÁSCARA */}
            <TabsContent value="adjust" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                {/* Prévia do Recorte em Tempo Real */}
                <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-muted/30 rounded-xl border">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Prévia do Enquadramento
                  </span>
                  <div 
                    className={`overflow-hidden border-2 border-primary bg-background shadow-md flex items-center justify-center transition-all ${
                      photoShape === 'circle' ? 'rounded-full w-36 h-36' : 'rounded-lg w-32 h-44'
                    }`}
                  >
                    {customPhotoUrl || activeVolunteer?.photo ? (
                      <div className="w-full h-full overflow-hidden flex items-center justify-center">
                        <img 
                          src={customPhotoUrl || activeVolunteer?.photo} 
                          alt="Prévia" 
                          className="w-full h-full object-cover transition-transform"
                          style={{
                            transform: `scale(${photoZoom}) translate(${photoOffsetX}%, ${photoOffsetY}%)`,
                            transformOrigin: 'center center'
                          }}
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground text-center p-2">
                        <User className="w-10 h-10 mb-1 opacity-40" />
                        <span className="text-[9px]">Nenhuma foto carregada</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground mt-2">
                    {photoShape === 'circle' ? 'Máscara Circular' : 'Máscara 3×4 Retangular'} • {Math.round(photoZoom * 100)}%
                  </span>
                </div>

                {/* Controles de Máscara, Zoom e Centralização */}
                <div className="sm:col-span-7 space-y-3">
                  {/* Seletor de Máscara */}
                  <div className="space-y-1 bg-background p-2.5 rounded-lg border">
                    <Label className="text-[11px] font-bold text-foreground block">
                      Formato da Máscara:
                    </Label>
                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                      <Button
                        type="button"
                        size="sm"
                        variant={photoShape === 'rect' ? 'default' : 'outline'}
                        onClick={() => setPhotoShape('rect')}
                        className="h-8 text-xs font-semibold gap-1.5"
                      >
                        <Square className="w-3.5 h-3.5" />
                        Quadrada / 3×4
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={photoShape === 'circle' ? 'default' : 'outline'}
                        onClick={() => setPhotoShape('circle')}
                        className="h-8 text-xs font-semibold gap-1.5"
                      >
                        <Circle className="w-3.5 h-3.5" />
                        Circular
                      </Button>
                    </div>
                  </div>

                  {/* Redimensionar (Zoom) */}
                  <div className="space-y-1.5 bg-background p-2.5 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-foreground">
                        Redimensionar (Zoom):
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPhotoZoom(prev => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10))}
                          className="w-5 h-5 rounded border bg-muted/40 hover:bg-muted flex items-center justify-center text-xs font-bold"
                        >
                          -
                        </button>
                        <span className="text-[11px] font-mono font-bold text-primary w-12 text-center">
                          {Math.round(photoZoom * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={() => setPhotoZoom(prev => Math.min(2.5, Math.round((prev + 0.1) * 10) / 10))}
                          className="w-5 h-5 rounded border bg-muted/40 hover:bg-muted flex items-center justify-center text-xs font-bold"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <input 
                      type="range"
                      min={0.5}
                      max={2.5}
                      step={0.05}
                      value={photoZoom}
                      onChange={(e) => setPhotoZoom(Number(e.target.value))}
                      className="w-full accent-primary h-1.5 cursor-pointer"
                    />
                  </div>

                  {/* Centralizar e Ajuste de Eixos X / Y */}
                  <div className="space-y-2 bg-background p-2.5 rounded-lg border">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-bold text-foreground">
                        Centralizar & Posição:
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleResetPhotoAdjustments}
                        className="h-6 px-2 text-[10px] font-bold text-primary border-primary/40 gap-1"
                      >
                        <Crosshair className="w-3 h-3" />
                        Centralizar Foto
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-0.5 text-[10px] text-muted-foreground">
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Horizontal (X):</span>
                          <span className="font-mono font-bold text-foreground">{photoOffsetX}%</span>
                        </div>
                        <input 
                          type="range"
                          min={-50}
                          max={50}
                          step={1}
                          value={photoOffsetX}
                          onChange={(e) => setPhotoOffsetX(Number(e.target.value))}
                          className="w-full accent-primary h-1.5 cursor-pointer"
                        />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span>Vertical (Y):</span>
                          <span className="font-mono font-bold text-foreground">{photoOffsetY}%</span>
                        </div>
                        <input 
                          type="range"
                          min={-50}
                          max={50}
                          step={1}
                          value={photoOffsetY}
                          onChange={(e) => setPhotoOffsetY(Number(e.target.value))}
                          className="w-full accent-primary h-1.5 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="border-t pt-3 flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClosePhotoModal}
              className="h-8 text-xs"
            >
              Fechar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                handleClosePhotoModal();
                toast.success("Foto aplicada ao crachá!");
              }}
              className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground"
            >
              <Check className="w-3.5 h-3.5" />
              Aplicar ao Crachá
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
