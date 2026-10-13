import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { PenTool, Upload, Trash2, Check, RefreshCw, Eye } from "lucide-react"
import { toast } from "sonner"

interface DigitalSignatureFieldProps {
  label: string
  helperText?: string
  value?: string // Data URL base64
  onChange: (dataUrl: string, fileName?: string) => void
  disabled?: boolean
}

export function DigitalSignatureField({
  label,
  helperText = "Insira a assinatura escaneada ou desenhe diretamente na tela.",
  value,
  onChange,
  disabled = false
}: DigitalSignatureFieldProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Canvas drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasDrawn, setHasDrawn] = useState(false)
  const [penColor, setPenColor] = useState("#000000") // Preto ou Azul Caneta
  const [penWidth, setPenWidth] = useState(2.5)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione um arquivo de imagem (PNG, JPG ou WebP).")
      return
    }

    if (file.size > 3 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 3MB.")
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const result = event.target?.result as string
      onChange(result, file.name)
      toast.success("Assinatura digital carregada com sucesso!")
    }
    reader.readAsDataURL(file)
  }

  // Canvas drawing functions
  const openDrawModal = () => {
    setIsModalOpen(true)
    setHasDrawn(false)
  }

  useEffect(() => {
    if (isModalOpen) {
      setTimeout(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        
        // Ajusta escala de alta resolução Retina
        const rect = canvas.getBoundingClientRect()
        canvas.width = rect.width * 2
        canvas.height = rect.height * 2
        ctx.scale(2, 2)
        ctx.lineCap = "round"
        ctx.lineJoin = "round"
        ctx.strokeStyle = penColor
        ctx.lineWidth = penWidth

        // Se já tiver uma assinatura em tela, renderiza para edição se for base64
        if (value && value.startsWith("data:image")) {
          const img = new Image()
          img.onload = () => {
            ctx.drawImage(img, 10, 10, rect.width - 20, rect.height - 20)
            setHasDrawn(true)
          }
          img.src = value
        }
      }, 100)
    }
  }, [isModalOpen, penColor, penWidth])

  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }
    const rect = canvas.getBoundingClientRect()
    
    let clientX = 0
    let clientY = 0

    if ("touches" in e) {
      clientX = e.touches[0].clientX
      clientY = e.touches[0].clientY
    } else {
      clientX = e.clientX
      clientY = e.clientY
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCanvasCoords(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setHasDrawn(true)
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const { x, y } = getCanvasCoords(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (!isDrawing) return
    setIsDrawing(false)
  }

  const clearCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasDrawn(false)
  }

  const saveCanvasSignature = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    if (!hasDrawn) {
      toast.error("Por favor, faça a assinatura antes de salvar.")
      return
    }

    const dataUrl = canvas.toDataURL("image/png")
    onChange(dataUrl, `assinatura_digital_${Date.now()}.png`)
    setIsModalOpen(false)
    toast.success("Assinatura salva com sucesso!")
  }

  return (
    <div className="space-y-2 pt-2 border-t border-border/40">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <PenTool className="h-3.5 w-3.5 text-primary" />
          {label}
        </Label>
        {value && (
          <span className="text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
            <Check className="h-3 w-3" /> Assinatura Cadastrada
          </span>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">{helperText}</p>

      {/* Input hidden file */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        disabled={disabled}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Preview Box */}
        <div className="relative w-44 h-18 bg-white dark:bg-slate-950 rounded-xl border border-border/80 flex items-center justify-center overflow-hidden p-2 shadow-2xs group">
          {value ? (
            <>
              <img
                src={value}
                alt={label}
                className="max-h-full max-w-full object-contain filter contrast-125 dark:brightness-110"
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 backdrop-blur-2xs">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 text-[11px] px-2"
                  onClick={openDrawModal}
                  disabled={disabled}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="h-7 text-[11px] px-2"
                  onClick={() => {
                    onChange("", "")
                    toast.info("Assinatura removida.")
                  }}
                  disabled={disabled}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center px-2">
              <span className="text-[11px] font-medium text-muted-foreground italic">
                Nenhuma assinatura
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openDrawModal}
            disabled={disabled}
            className="h-8 text-xs font-medium border-primary/30 text-primary hover:bg-primary/5"
          >
            <PenTool className="h-3.5 w-3.5 mr-1.5" />
            Desenhar Assinatura na Tela
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="h-8 text-xs font-medium"
          >
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Enviar Imagem / Visto
          </Button>

          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange("", "")
                toast.info("Assinatura removida.")
              }}
              disabled={disabled}
              className="h-8 text-xs text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Remover
            </Button>
          )}
        </div>
      </div>

      {/* Modal Interativo para Desenhar Assinatura com Dedo / Mouse / Caneta Touch */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <PenTool className="h-4 w-4 text-primary" />
              Desenhar Assinatura Digital: {label}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Utilize o mouse, touchpad ou o dedo em telas touch para assinar dentro do quadro abaixo.
            </p>
          </DialogHeader>

          <div className="space-y-3">
            {/* Opções de Caneta */}
            <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground font-medium">Cor da Caneta:</span>
                <button
                  type="button"
                  onClick={() => setPenColor("#000000")}
                  className={`w-6 h-6 rounded-full bg-black border-2 ${penColor === "#000000" ? "border-primary ring-2 ring-primary/30" : "border-transparent"}`}
                  title="Preto Cartorial"
                />
                <button
                  type="button"
                  onClick={() => setPenColor("#1e3a8a")}
                  className={`w-6 h-6 rounded-full bg-blue-900 border-2 ${penColor === "#1e3a8a" ? "border-primary ring-2 ring-primary/30" : "border-transparent"}`}
                  title="Azul Caneta"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">Espessura:</span>
                {[1.8, 2.5, 3.5].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setPenWidth(w)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${penWidth === w ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted"}`}
                  >
                    {w === 1.8 ? "Fina" : w === 2.5 ? "Média" : "Grossa"}
                  </button>
                ))}
              </div>
            </div>

            {/* Canvas Interativo */}
            <div className="relative border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-950 overflow-hidden shadow-inner">
              <canvas
                ref={canvasRef}
                className="w-full h-44 cursor-crosshair touch-none block"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              <div className="absolute bottom-2 left-4 right-4 border-b border-slate-300 dark:border-slate-700 pointer-events-none text-center">
                <span className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold select-none">
                  Linha de Assinatura
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearCanvas}
              className="text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              Limpar Quadro
            </Button>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={saveCanvasSignature}
                className="text-xs bg-primary text-primary-foreground font-semibold"
              >
                <Check className="h-3.5 w-3.5 mr-1.5" />
                Salvar Assinatura
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
