import React from "react"
import { motion } from "motion/react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PageHeader } from "@/components/layout/PageHeader"
import { Palette, Sparkles, RotateCcw, Check, Sun, Moon, Laptop } from "lucide-react"
import { useColorTheme, ColorTheme } from "@/contexts/ColorThemeContext"
import { useTheme } from "@/contexts/ThemeContext"
import { toast } from "sonner"

export function PaletasCores() {
  const { colorTheme, setColorTheme, customColors, setCustomColors, resetCustomColors } =
    useColorTheme()
  const { theme, setTheme } = useTheme()

  const palettesList: { id: ColorTheme; name: string; color: string; desc: string }[] = [
    { id: "default", name: "Índigo Real", color: "#4f46e5", desc: "Clássico Eclesiástico Nobre" },
    { id: "ocean", name: "Azul Oceano", color: "#0284c7", desc: "Corporativo Dinâmico" },
    { id: "royal", name: "Azul Royal", color: "#1d4ed8", desc: "Institucional Firme" },
    { id: "navy", name: "Azul Marinho", color: "#1e3a8a", desc: "Profundo & Solene" },
    { id: "forest", name: "Floresta", color: "#15803d", desc: "Harmonioso & Natural" },
    { id: "emerald", name: "Esmeralda", color: "#059669", desc: "Pastoral & Esperança" },
    { id: "teal", name: "Turquesa / Teal", color: "#0d9488", desc: "Elegante & Contemporâneo" },
    { id: "bordeaux", name: "Vinho Bordô", color: "#9f1239", desc: "Litúrgico Tradicional" },
    { id: "amber", name: "Âmbar Dourado", color: "#d97706", desc: "Comemorativo & Jubiloso" },
    { id: "purple", name: "Roxo Litúrgico", color: "#7c3aed", desc: "Solene & Majestoso" },
    { id: "rose", name: "Rosa Nobre", color: "#be185d", desc: "Acolhedor & Gracioso" },
    { id: "terracotta", name: "Terracota", color: "#c2410c", desc: "Cálido & Orgânico" },
    { id: "cyan", name: "Ciano Moderno", color: "#0891b2", desc: "Tecnológico & Atual" },
    { id: "monochrome", name: "Grafite Neutro", color: "#334155", desc: "Focado & Minimalista" },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 max-w-7xl mx-auto pb-10"
    >
      <PageHeader
        title="Paletas de Cores & Aparência Visual"
        description="Personalize o contraste, as cores de destaque e a aparência individual de títulos, janelas e campos de digitação para todos os operadores do sistema."
        action={
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              resetCustomColors()
              toast.success("Cores de janelas, títulos e campos restauradas para o padrão!")
            }}
            className="bg-card text-foreground hover:bg-muted font-medium text-xs sm:text-sm h-9 px-3.5 shadow-xs"
          >
            <RotateCcw className="mr-1.5 h-4 w-4 text-muted-foreground" />
            Restaurar Padrões
          </Button>
        }
      />

      {/* 1. SELEÇÃO DE AMBIENTE / LUZ E PALETAS PRIMÁRIAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Modo de Iluminação / Luminosidade */}
        <Card className="shadow-xs border border-border/70 bg-card">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-500" />
              Luminosidade & Modo de Leitura
            </CardTitle>
            <CardDescription className="text-xs">
              Alterna o contraste de fundo geral e o tom de leitura do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            {[
              { id: "light" as const, label: "Modo Claro", icon: Sun, desc: "Padrão diurno límpido e com alto contraste" },
              { id: "dark" as const, label: "Modo Escuro (Dark)", icon: Moon, desc: "Azul profundo repousante para ambientes escuros" },
              { id: "sepia" as const, label: "Sépia Eclesiástico", icon: Sun, desc: "Tons de pergaminho suave para leitura longa" },
              { id: "midnight" as const, label: "Meia-Noite / AMOLED", icon: Moon, desc: "Preto total para máxima economia e imersão" },
              { id: "slate" as const, label: "Ardósia Executiva", icon: Laptop, desc: "Cinza azulado corporativo" },
              { id: "system" as const, label: "Sincronizar com Sistema", icon: Laptop, desc: "Acompanha o tema do Windows/Mac/Android" },
            ].map((tm) => {
              const isSelected = theme === tm.id
              const IconComp = tm.icon
              return (
                <button
                  key={tm.id}
                  type="button"
                  onClick={() => {
                    setTheme(tm.id)
                    toast.success(`Tema ${tm.label} ativado!`)
                  }}
                  className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40 font-semibold"
                      : "border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <IconComp
                      className={`h-4 w-4 shrink-0 ${
                        isSelected ? "text-primary" : "text-muted-foreground"
                      }`}
                    />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-foreground">{tm.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{tm.desc}</div>
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              )
            })}
          </CardContent>
        </Card>

        {/* Paletas de Cores de Destaque */}
        <Card className="shadow-xs border border-border/70 bg-card lg:col-span-2">
          <CardHeader className="pb-3 border-b border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Palette className="h-4 w-4 text-primary" />
                  Paleta de Cores Primária (Destaques & Acentos)
                </CardTitle>
                <CardDescription className="text-xs">
                  Selecione uma das 14 paletas de cores refinadas para botões, seletores e foco do sistema.
                </CardDescription>
              </div>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                14 Paletas
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {palettesList.map((pal) => {
                const isSelected = colorTheme === pal.id
                return (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => {
                      setColorTheme(pal.id)
                      toast.success(`Paleta ${pal.name} selecionada!`)
                    }}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/40 font-semibold"
                        : "border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span
                      className="w-6 h-6 rounded-lg flex items-center justify-center shadow-xs shrink-0 mt-0.5"
                      style={{ backgroundColor: pal.color }}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground truncate">{pal.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{pal.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. DEFINIÇÃO ESPECÍFICA DE CORES: JANELAS, TÍTULOS E CAMPOS ONDE DIGITA */}
      <Card className="shadow-xs border border-border/70 bg-card">
        <CardHeader className="pb-3 border-b border-border/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Cores Específicas por Componente
              </CardTitle>
              <CardDescription className="text-xs">
                Ajuste fino opcional: defina cores exatas para títulos, fundo das janelas (cards), campos de digitação e botões livres.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* A. Cor dos Títulos */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-3">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Cor dos Títulos (H1, H2, H3)</span>
                  {customColors.headingColor && (
                    <button
                      type="button"
                      onClick={() => setCustomColors({ headingColor: "" })}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline"
                    >
                      Resetar
                    </button>
                  )}
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Títulos das janelas e seções.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColors.headingColor || "#0f172a"}
                  onChange={(e) => setCustomColors({ headingColor: e.target.value })}
                  className="h-9 w-12 p-0.5 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <Input
                  type="text"
                  value={customColors.headingColor || ""}
                  placeholder="#0f172a ou em branco"
                  onChange={(e) => setCustomColors({ headingColor: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: "Padrão", color: "" },
                  { label: "Azul", color: "#1e3a8a" },
                  { label: "Verde", color: "#065f46" },
                  { label: "Vinho", color: "#881337" },
                  { label: "Dourado", color: "#b45309" },
                  { label: "Roxo", color: "#581c87" },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setCustomColors({ headingColor: p.color })}
                    className="px-2 py-0.5 text-[10px] rounded-md border border-border/60 hover:bg-card font-medium"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* B. Cor de Fundo da Janela (Cards) */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-3">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Fundo das Janelas (Cards)</span>
                  {customColors.cardBg && (
                    <button
                      type="button"
                      onClick={() => setCustomColors({ cardBg: "" })}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline"
                    >
                      Resetar
                    </button>
                  )}
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Fundo de painéis e tabelas.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColors.cardBg || "#ffffff"}
                  onChange={(e) => setCustomColors({ cardBg: e.target.value })}
                  className="h-9 w-12 p-0.5 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <Input
                  type="text"
                  value={customColors.cardBg || ""}
                  placeholder="#ffffff ou em branco"
                  onChange={(e) => setCustomColors({ cardBg: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: "Padrão", color: "" },
                  { label: "Branco Puro", color: "#ffffff" },
                  { label: "Gelo / Slate", color: "#f8fafc" },
                  { label: "Creme", color: "#fefdf8" },
                  { label: "Cinza Claro", color: "#f1f5f9" },
                  { label: "Dark Suave", color: "#18181b" },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setCustomColors({ cardBg: p.color })}
                    className="px-2 py-0.5 text-[10px] rounded-md border border-border/60 hover:bg-card font-medium"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* C. Cor no Campo onde Digita (Inputs) */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-3">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Campo Onde Digita</span>
                  {(customColors.inputBg || customColors.inputBorder) && (
                    <button
                      type="button"
                      onClick={() =>
                        setCustomColors({ inputBg: "", inputBorder: "", inputText: "" })
                      }
                      className="text-[10px] text-muted-foreground hover:text-foreground underline"
                    >
                      Resetar
                    </button>
                  )}
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Fundo e borda de caixas de texto.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColors.inputBg || "#ffffff"}
                  onChange={(e) => setCustomColors({ inputBg: e.target.value })}
                  className="h-9 w-12 p-0.5 rounded-lg border border-border cursor-pointer bg-transparent"
                  title="Fundo do Campo"
                />
                <Input
                  type="text"
                  value={customColors.inputBg || ""}
                  placeholder="Fundo (ex: #f8fafc)"
                  onChange={(e) => setCustomColors({ inputBg: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColors.inputBorder || "#cbd5e1"}
                  onChange={(e) => setCustomColors({ inputBorder: e.target.value })}
                  className="h-7 w-8 p-0.5 rounded-md border border-border cursor-pointer bg-transparent"
                  title="Borda do Campo"
                />
                <span className="text-[11px] text-muted-foreground">Contorno do campo</span>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: "Padrão", bg: "", border: "" },
                  { label: "Branco", bg: "#ffffff", border: "#94a3b8" },
                  { label: "Suave", bg: "#f8fafc", border: "#cbd5e1" },
                  { label: "Azulado", bg: "#f0f9ff", border: "#7dd3fc" },
                  { label: "Escuro", bg: "#09090b", border: "#27272a" },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() =>
                      setCustomColors({ inputBg: p.bg, inputBorder: p.border })
                    }
                    className="px-2 py-0.5 text-[10px] rounded-md border border-border/60 hover:bg-card font-medium"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* D. Cor Primária & Botões (Destaque Livre) */}
            <div className="p-3.5 rounded-xl border border-border/70 bg-muted/20 space-y-3">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Botões & Destaques Livres</span>
                  {customColors.primaryColor && (
                    <button
                      type="button"
                      onClick={() => setCustomColors({ primaryColor: "" })}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline"
                    >
                      Resetar
                    </button>
                  )}
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Cor exata para botões principais.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={customColors.primaryColor || "#1e3a8a"}
                  onChange={(e) => setCustomColors({ primaryColor: e.target.value })}
                  className="h-9 w-12 p-0.5 rounded-lg border border-border cursor-pointer bg-transparent"
                />
                <Input
                  type="text"
                  value={customColors.primaryColor || ""}
                  placeholder="#1e3a8a ou em branco"
                  onChange={(e) => setCustomColors({ primaryColor: e.target.value })}
                  className="h-9 text-xs font-mono"
                />
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: "Padrão", color: "" },
                  { label: "Azul Royal", color: "#1d4ed8" },
                  { label: "Esmeralda", color: "#059669" },
                  { label: "Vinho", color: "#9f1239" },
                  { label: "Dourado", color: "#d97706" },
                  { label: "Roxo", color: "#7c3aed" },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setCustomColors({ primaryColor: p.color })}
                    className="px-2 py-0.5 text-[10px] rounded-md border border-border/60 hover:bg-card font-medium"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DEMONSTRAÇÃO AO VIVO DO LAYOUT CONFIGURADO */}
          <div className="mt-4 p-5 rounded-2xl border border-border/80 bg-muted/30">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Demonstração ao Vivo do Layout Configurado
            </div>
            <div
              className="p-5 rounded-2xl border border-border transition-all shadow-sm space-y-4"
              style={{
                backgroundColor: customColors.cardBg || undefined,
              }}
            >
              <div>
                <h4
                  className="text-lg font-bold mb-1 transition-colors"
                  style={{ color: customColors.headingColor || undefined }}
                >
                  Exemplo de Título de Janela da Igreja
                </h4>
                <p className="text-xs text-muted-foreground">
                  Esta caixa reflete instantaneamente o fundo da janela/card, a cor do título e a aparência dos campos de digitação.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Campo Onde Digita (Teste ao Vivo):</Label>
                  <Input
                    placeholder="Digite aqui para testar a cor do campo..."
                    className="text-sm h-10"
                    defaultValue="Texto digitado pelo usuário para teste visual"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Botão de Destaque da Igreja:</Label>
                  <div className="flex gap-2">
                    <Button type="button" className="h-10 px-4 font-semibold text-xs sm:text-sm">
                      Botão Primário
                    </Button>
                    <Button type="button" variant="outline" className="h-10 px-4 text-xs sm:text-sm">
                      Botão Secundário
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
