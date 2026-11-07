export interface CarteirinhaThemeConfig {
  themeId: string;
  name: string;
  fromColor: string;
  viaColor: string;
  toColor: string;
  accentColor: string;
  borderColor: string;
  textColor: string;
  tagBg: string;
  tagText: string;
  bgTexture: "brasao" | "ondas" | "geometria" | "liso";
  photoShape: "rounded" | "circle";
  badgeLabel: string;
  showPastor: boolean;
  showDates: boolean;
  showLogo: boolean;
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

export const DEFAULT_CARD_THEME: CarteirinhaThemeConfig = PRESET_THEMES["verde-esmeralda"];

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
