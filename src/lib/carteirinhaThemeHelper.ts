export interface CarteirinhaThemeConfig {
  themeId: string;
  name: string;
  fromColor: string;
  viaColor: string;
  toColor: string;
  accentColor: string;
  borderColor: string;
  borderWidth?: number; // 1 | 2 | 3 | 4 | 5 (largura da borda / contorno)
  textColor: string;
  tagBg: string;
  tagText: string;
  bgTexture: "brasao" | "ondas" | "geometria" | "liso";
  photoShape: "rounded" | "circle";
  badgeLabel: string;
  showPastor: boolean;
  showDates: boolean;
  showLogo: boolean;
  watermarkMode?: "parametros" | "brasao" | "upload"; // Origem da marca d'água central de fundo
  watermarkHarmony?: "accent" | "white" | "blend" | "original"; // Harmonia visual da marca d'água com a cor da credencial
  customWatermarkUrl?: string; // Upload da imagem/logo de fundo
  showConstituicaoVerso?: boolean; // Fundo oficial da Constituição / Bandeira do Brasil no verso
  isObreiroAltar?: boolean; // Checagem de obreiro do altar vs membro
  validadeOverride?: string; // Validade personalizada
}

/**
 * Checagem automática se o cargo do membro corresponde à função de Obreiro do Altar
 */
export function isObreiroAltarRole(role?: string): boolean {
  if (!role) return false;
  const r = role.toLowerCase().trim();
  return (
    r.includes("pastor") ||
    r.includes("pastora") ||
    r.includes("presbítero") ||
    r.includes("presbitero") ||
    r.includes("evangelista") ||
    r.includes("missionário") ||
    r.includes("missionaria") ||
    r.includes("missionária") ||
    r.includes("diácono") ||
    r.includes("diacono") ||
    r.includes("diaconisa") ||
    r.includes("obreiro") ||
    r.includes("ministro") ||
    r.includes("bispo") ||
    r.includes("cooperador")
  );
}

/**
 * Calcula a data de validade formatada com base na configuração de parâmetros
 */
export function calculateValidityText(validitySetting?: string): string {
  const setting = (validitySetting || "").trim();
  if (setting && setting.includes("/")) {
    return setting;
  }
  const currentYear = new Date().getFullYear();
  if (setting.toLowerCase().includes("1 ano") || setting === "1") {
    return `31/12/${currentYear + 1}`;
  }
  if (setting.toLowerCase().includes("2 anos") || setting === "2") {
    return `31/12/${currentYear + 2}`;
  }
  if (setting.toLowerCase().includes("3 anos") || setting === "3") {
    return `31/12/${currentYear + 3}`;
  }
  if (setting.toLowerCase().includes("4 anos") || setting === "4") {
    return `31/12/${currentYear + 4}`;
  }
  if (setting.toLowerCase().includes("5 anos") || setting === "5") {
    return `31/12/${currentYear + 5}`;
  }
  if (setting.toLowerCase().includes("indeterminad") || setting.toLowerCase().includes("sem validade")) {
    return "INDETERMINADA";
  }
  return `31/12/${currentYear + 2}`;
}

export const PRESET_THEMES: Record<string, CarteirinhaThemeConfig> = {
  "verde-esmeralda": {
    themeId: "verde-esmeralda",
    name: "Verde Esmeralda Oficial (Padrão)",
    fromColor: "#064e3b",
    viaColor: "#065f46",
    toColor: "#022c22",
    accentColor: "#fbbf24",
    borderColor: "#10b981",
    textColor: "#ffffff",
    tagBg: "rgba(16, 185, 129, 0.25)",
    tagText: "#a7f3d0",
    bgTexture: "brasao",
    photoShape: "rounded",
    badgeLabel: "OFICIAL",
    showPastor: true,
    showDates: true,
    showLogo: true,
  },
  "azul-pentecostal": {
    themeId: "azul-pentecostal",
    name: "Azul Real Pentecostal",
    fromColor: "#1e1b4b",
    viaColor: "#1e3a8a",
    toColor: "#0f172a",
    accentColor: "#facc15",
    borderColor: "#3b82f6",
    textColor: "#ffffff",
    tagBg: "rgba(59, 130, 246, 0.25)",
    tagText: "#bfdbfe",
    bgTexture: "ondas",
    photoShape: "rounded",
    badgeLabel: "CREDENCIAL",
    showPastor: true,
    showDates: true,
    showLogo: true,
  },
  "ouro-nobre": {
    themeId: "ouro-nobre",
    name: "Ouro Nobre & Preto Premium",
    fromColor: "#1c1917",
    viaColor: "#292524",
    toColor: "#09090b",
    accentColor: "#f59e0b",
    borderColor: "#eab308",
    textColor: "#ffffff",
    tagBg: "rgba(234, 179, 8, 0.25)",
    tagText: "#fef08a",
    bgTexture: "brasao",
    photoShape: "rounded",
    badgeLabel: "OFICIAL",
    showPastor: true,
    showDates: true,
    showLogo: true,
  },
  "vinho-sacerdotal": {
    themeId: "vinho-sacerdotal",
    name: "Vinho / Bordô Sacerdotal",
    fromColor: "#450a0a",
    viaColor: "#7f1d1d",
    toColor: "#310707",
    accentColor: "#fde047",
    borderColor: "#ef4444",
    textColor: "#ffffff",
    tagBg: "rgba(239, 68, 68, 0.25)",
    tagText: "#fecaca",
    bgTexture: "ondas",
    photoShape: "rounded",
    badgeLabel: "MINISTERIAL",
    showPastor: true,
    showDates: true,
    showLogo: true,
  },
  "roxo-celestial": {
    themeId: "roxo-celestial",
    name: "Roxo Celestial & Realeza",
    fromColor: "#2e1065",
    viaColor: "#4c1d95",
    toColor: "#1e1b4b",
    accentColor: "#facc15",
    borderColor: "#8b5cf6",
    textColor: "#ffffff",
    tagBg: "rgba(139, 92, 246, 0.25)",
    tagText: "#ddd6fe",
    bgTexture: "geometria",
    photoShape: "rounded",
    badgeLabel: "CREDENCIAL",
    showPastor: true,
    showDates: true,
    showLogo: true,
  },
  "black-titanium": {
    themeId: "black-titanium",
    name: "Preto Ônix / Black Titanium",
    fromColor: "#09090b",
    viaColor: "#18181b",
    toColor: "#030712",
    accentColor: "#38bdf8",
    borderColor: "#71717a",
    textColor: "#ffffff",
    tagBg: "rgba(255, 255, 255, 0.15)",
    tagText: "#f4f4f5",
    bgTexture: "geometria",
    photoShape: "rounded",
    badgeLabel: "OFICIAL",
    showPastor: true,
    showDates: true,
    showLogo: true,
  },
};

export const DEFAULT_CARD_THEME: CarteirinhaThemeConfig = {
  ...PRESET_THEMES["verde-esmeralda"],
  borderWidth: 2,
  showConstituicaoVerso: true,
  watermarkMode: "parametros",
  watermarkHarmony: "accent",
};

export function getSavedCardTheme(): CarteirinhaThemeConfig {
  try {
    const saved = localStorage.getItem("church_carteirinha_theme");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.fromColor) {
        return { ...DEFAULT_CARD_THEME, ...parsed };
      }
    }
  } catch {}
  return DEFAULT_CARD_THEME;
}

export function saveCardTheme(theme: CarteirinhaThemeConfig): void {
  try {
    localStorage.setItem("church_carteirinha_theme", JSON.stringify(theme));
  } catch (e) {
    console.warn("Erro ao salvar tema da carteirinha:", e);
  }
}
