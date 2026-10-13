import React, { createContext, useContext, useEffect, useState } from "react"

export type ColorTheme = 
  | "default" 
  | "ocean" 
  | "royal"
  | "navy" 
  | "forest" 
  | "emerald" 
  | "teal"
  | "bordeaux" 
  | "amber" 
  | "purple" 
  | "rose"
  | "terracotta"
  | "cyan" 
  | "monochrome"

export interface CustomElementColors {
  headingColor?: string
  cardBg?: string
  inputBg?: string
  inputBorder?: string
  inputText?: string
  primaryColor?: string
  headerBg?: string
  sidebarBg?: string
}

type ColorThemeProviderState = {
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
  customColors: CustomElementColors
  setCustomColors: (colors: CustomElementColors) => void
  resetCustomColors: () => void
}

const initialCustomColors: CustomElementColors = {
  headingColor: "",
  cardBg: "",
  inputBg: "",
  inputBorder: "",
  inputText: "",
  primaryColor: "",
  headerBg: "",
  sidebarBg: "",
}

const initialState: ColorThemeProviderState = {
  colorTheme: "default",
  setColorTheme: () => null,
  customColors: initialCustomColors,
  setCustomColors: () => null,
  resetCustomColors: () => null,
}

const ColorThemeProviderContext = createContext<ColorThemeProviderState>(initialState)

export function ColorThemeProvider({
  children,
  defaultTheme = "default",
  storageKey = "ui-color-theme",
  customColorsKey = "ui-custom-element-colors",
}: {
  children: React.ReactNode
  defaultTheme?: ColorTheme
  storageKey?: string
  customColorsKey?: string
}) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(
    () => (localStorage.getItem(storageKey) as ColorTheme) || defaultTheme
  )

  const [customColors, setCustomColorsState] = useState<CustomElementColors>(() => {
    try {
      const saved = localStorage.getItem(customColorsKey)
      return saved ? JSON.parse(saved) : initialCustomColors
    } catch {
      return initialCustomColors
    }
  })

  // Aplica classe de paleta primária
  useEffect(() => {
    const root = window.document.documentElement
    const allPalettes = [
      "theme-color-default",
      "theme-color-ocean",
      "theme-color-royal",
      "theme-color-navy",
      "theme-color-forest",
      "theme-color-emerald",
      "theme-color-teal",
      "theme-color-bordeaux",
      "theme-color-amber",
      "theme-color-purple",
      "theme-color-rose",
      "theme-color-terracotta",
      "theme-color-cyan",
      "theme-color-monochrome"
    ]
    root.classList.remove(...allPalettes)
    root.classList.add(`theme-color-${colorTheme}`)
  }, [colorTheme])

  // Aplica variáveis CSS para cores personalizadas de títulos, janelas/cards, campos e destaques
  useEffect(() => {
    const root = window.document.documentElement

    if (customColors.primaryColor) {
      root.style.setProperty("--primary", customColors.primaryColor)
      root.style.setProperty("--ring", customColors.primaryColor)
      root.style.setProperty("--sidebar-primary", customColors.primaryColor)
    } else {
      root.style.removeProperty("--primary")
      root.style.removeProperty("--ring")
      root.style.removeProperty("--sidebar-primary")
    }

    if (customColors.headingColor) {
      root.style.setProperty("--user-heading-color", customColors.headingColor)
    } else {
      root.style.removeProperty("--user-heading-color")
    }

    if (customColors.cardBg) {
      root.style.setProperty("--user-card-bg", customColors.cardBg)
    } else {
      root.style.removeProperty("--user-card-bg")
    }

    if (customColors.inputBg) {
      root.style.setProperty("--user-input-bg", customColors.inputBg)
    } else {
      root.style.removeProperty("--user-input-bg")
    }

    if (customColors.inputBorder) {
      root.style.setProperty("--user-input-border", customColors.inputBorder)
    } else {
      root.style.removeProperty("--user-input-border")
    }

    if (customColors.inputText) {
      root.style.setProperty("--user-input-text", customColors.inputText)
    } else {
      root.style.removeProperty("--user-input-text")
    }

    if (customColors.headerBg) {
      root.style.setProperty("--user-header-bg", customColors.headerBg)
    } else {
      root.style.removeProperty("--user-header-bg")
    }

    if (customColors.sidebarBg) {
      root.style.setProperty("--sidebar", customColors.sidebarBg)
    } else {
      root.style.removeProperty("--sidebar")
    }
  }, [customColors])

  const setColorTheme = (theme: ColorTheme) => {
    localStorage.setItem(storageKey, theme)
    setColorThemeState(theme)
  }

  const setCustomColors = (newColors: CustomElementColors) => {
    const merged = { ...customColors, ...newColors }
    localStorage.setItem(customColorsKey, JSON.stringify(merged))
    setCustomColorsState(merged)
  }

  const resetCustomColors = () => {
    localStorage.removeItem(customColorsKey)
    setCustomColorsState(initialCustomColors)
  }

  const value = {
    colorTheme,
    setColorTheme,
    customColors,
    setCustomColors,
    resetCustomColors,
  }

  return (
    <ColorThemeProviderContext.Provider value={value}>
      {children}
    </ColorThemeProviderContext.Provider>
  )
}

export const useColorTheme = () => {
  const context = useContext(ColorThemeProviderContext)
  if (context === undefined)
    throw new Error("useColorTheme must be used within a ColorThemeProvider")
  return context
}
