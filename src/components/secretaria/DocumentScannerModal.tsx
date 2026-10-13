import React, { useRef, useState, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Camera, RefreshCw, Check, X, RotateCw, Sparkles, Upload, FileText, User, Receipt, FolderCheck, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { collection, setDoc, doc, serverTimestamp } from "firebase/firestore"

export interface ScannedSecretariaFile {
  id: string
  title: string
  category: "membro" | "financeiro" | "secretaria" | "outro"
  subCategory?: string
  memberId?: string
  memberName?: string
  date: string
  fileDataUrl: string
  notes?: string
  createdAt?: any
}

interface DocumentScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onFileSaved: (file: ScannedSecretariaFile) => void
  membersList?: Array<{ id: string; name: string; cpf?: string }>
}

export function DocumentScannerModal({
  isOpen,
  onClose,
  onFileSaved,
  membersList = []
}: DocumentScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stream, setStream] = useState<MediaStream | null>(null)
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment")
  const [cameraError, setCameraError] = useState<string | null>(null)

  // Captured image state
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [filterMode, setFilterMode] = useState<"original" | "high_contrast" | "black_white">("original")
  const [rotationDegrees, setRotationDegrees] = useState(0)

  // Document metadata
  const [docCategory, setDocCategory] = useState<"membro" | "financeiro" | "secretaria" | "outro">("membro")
  const [docSubCategory, setDocSubCategory] = useState("RG / Documento Pessoal")
  const [docTitle, setDocTitle] = useState("")
  const [docDate, setDocDate] = useState(() => new Date().toISOString().split("T")[0])
  const [selectedMemberId, setSelectedMemberId] = useState("none")
  const [docNotes, setDocNotes] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  // Start camera
  const startCamera = useCallback(async (facing: "environment" | "user" = cameraFacing) => {
    setCameraError(null)
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      })

      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
        await videoRef.current.play()
        setIsCameraActive(true)
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err)
      setCameraError(
        "Acesso à câmera não disponível neste dispositivo ou bloqueado pelo navegador. Você pode usar o botão 'Carregar Arquivo / Foto' abaixo."
      )
      setIsCameraActive(false)
    }
  }, [cameraFacing, stream])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    setIsCameraActive(false)
  }, [stream])

  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera(cameraFacing)
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [isOpen, capturedImage])

  // Switch camera (front / back)
  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment"
    setCameraFacing(nextFacing)
    startCamera(nextFacing)
  }

  // Snap photo
  const capturePhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9)
      setCapturedImage(dataUrl)
      stopCamera()
      
      // Auto-set title if empty
      if (!docTitle) {
        setDocTitle(`${docSubCategory} - ${new Date().toLocaleDateString("pt-BR")}`)
      }
    }
  }

  // File upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setCapturedImage(dataUrl)
      stopCamera()
      if (!docTitle) {
        const cleanName = file.name.replace(/\.[^/.]+$/, "")
        setDocTitle(cleanName)
      }
    }
    reader.readAsDataURL(file)
  }

  // Rotate photo 90 deg
  const rotatePhoto = () => {
    if (!capturedImage) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.height
      canvas.height = img.width
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.translate(canvas.width / 2, canvas.height / 2)
        ctx.rotate((90 * Math.PI) / 180)
        ctx.drawImage(img, -img.width / 2, -img.height / 2)
        setCapturedImage(canvas.toDataURL("image/jpeg", 0.9))
      }
    }
    img.src = capturedImage
    setRotationDegrees(prev => (prev + 90) % 360)
  }

  // Apply visual contrast filter for document scanning
  const applyScannerFilter = (mode: "original" | "high_contrast" | "black_white") => {
    setFilterMode(mode)
    if (!capturedImage) return

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      if (!ctx) return

      ctx.drawImage(img, 0, 0)
      if (mode === "original") {
        return
      }

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imgData.data

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        // Luminance
        const gray = 0.299 * r + 0.587 * g + 0.114 * b

        if (mode === "black_white") {
          // Sharp threshold for document text
          const v = gray > 128 ? 255 : 0
          data[i] = v
          data[i + 1] = v
          data[i + 2] = v
        } else if (mode === "high_contrast") {
          // Boost contrast
          const factor = (259 * (64 + 255)) / (255 * (259 - 64))
          const adjusted = factor * (gray - 128) + 128
          const clamped = Math.max(0, Math.min(255, adjusted))
          data[i] = clamped
          data[i + 1] = clamped
          data[i + 2] = clamped
        }
      }

      ctx.putImageData(imgData, 0, 0)
      setCapturedImage(canvas.toDataURL("image/jpeg", 0.9))
    }
    img.src = capturedImage
  }

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null)
    setFilterMode("original")
    setRotationDegrees(0)
    startCamera(cameraFacing)
  }

  // Save to Secretaria Files
  const handleSaveDocument = async () => {
    if (!capturedImage) {
      toast.error("Por favor, capture ou carregue a foto do documento.")
      return
    }

    const titleToSave = docTitle.trim() || `${docSubCategory} - ${new Date().toLocaleDateString("pt-BR")}`
    const memberObj = selectedMemberId && selectedMemberId !== "none" ? membersList.find(m => m.id === selectedMemberId) : undefined

    setIsSaving(true)
    try {
      const fileId = `doc_${Date.now()}`
      const newFile: ScannedSecretariaFile = {
        id: fileId,
        title: titleToSave,
        category: docCategory,
        subCategory: docSubCategory,
        memberId: (selectedMemberId && selectedMemberId !== "none") ? selectedMemberId : undefined,
        memberName: memberObj?.name || undefined,
        date: docDate,
        fileDataUrl: capturedImage,
        notes: docNotes.trim() || undefined,
        createdAt: new Date().toISOString()
      }

      // Save locally first for instant persistence
      try {
        const stored = JSON.parse(localStorage.getItem("church_secretaria_files") || "[]")
        stored.unshift(newFile)
        localStorage.setItem("church_secretaria_files", JSON.stringify(stored.slice(0, 100)))
      } catch (localErr) {
        console.warn("Local storage write error:", localErr)
      }

      // Save to Firestore
      try {
        await setDoc(doc(db, "secretaria_files", newFile.id), {
          id: newFile.id,
          title: newFile.title,
          category: newFile.category,
          subCategory: newFile.subCategory,
          memberId: newFile.memberId || null,
          memberName: newFile.memberName || null,
          date: newFile.date,
          fileDataUrl: newFile.fileDataUrl,
          notes: newFile.notes || null,
          createdAt: serverTimestamp()
        })
      } catch (fbErr) {
        console.warn("Firestore sync warning (stored locally):", fbErr)
      }

      toast.success("Documento digitalizado e salvo com sucesso na Pasta da Secretaria!")
      onFileSaved(newFile)
      onClose()
    } catch (err: any) {
      console.error("Save document error:", err)
      toast.error("Erro ao salvar o documento: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        stopCamera()
        onClose()
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-900 text-white">
        <DialogHeader className="p-4 bg-slate-950 border-b border-slate-800 shrink-0 flex flex-row items-center justify-between">
          <div>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-white">
              <Camera className="w-5 h-5 text-blue-400" /> Digitalizador de Documentos com Câmera
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Fotografe documentos de membros ou comprovantes financeiros para arquivamento digital na secretaria.
            </DialogDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col md:flex-row gap-4">
          {/* Left Side: Camera view or Photo Preview */}
          <div className="flex-1 flex flex-col items-center justify-center bg-black rounded-xl overflow-hidden relative min-h-[320px] max-h-[500px]">
            {!capturedImage ? (
              <>
                {isCameraActive ? (
                  <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-contain max-h-[460px]"
                    />
                    
                    {/* Document Guideline Overlay */}
                    <div className="absolute inset-6 border-2 border-dashed border-emerald-400/80 rounded-xl pointer-events-none flex flex-col justify-between p-3">
                      <div className="flex justify-between text-[11px] font-bold text-emerald-400 bg-black/60 px-2 py-0.5 rounded self-center">
                        Enquadre o documento ou comprovante nesta área
                      </div>
                      <div className="text-[10px] text-emerald-300 bg-black/60 px-2 py-0.5 rounded self-center">
                        Mantenha o celular estável com boa iluminação
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 max-w-sm">
                    <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
                    <p className="text-sm font-medium text-slate-200">
                      {cameraError || "Aguardando inicialização da câmera..."}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      Você pode conceder permissão no navegador ou selecionar uma foto diretamente do seu aparelho.
                    </p>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" onClick={() => startCamera()} variant="outline" className="text-white border-slate-700">
                        <RefreshCw className="w-4 h-4 mr-1.5" /> Tentar Câmera Novamente
                      </Button>
                      <Button size="sm" onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Upload className="w-4 h-4 mr-1.5" /> Enviar Arquivo
                      </Button>
                    </div>
                  </div>
                )}

                {/* Camera Action Bar */}
                {isCameraActive && (
                  <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4 z-10">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={toggleCameraFacing} 
                      className="bg-black/60 border-slate-700 text-white hover:bg-black/80"
                      title="Alternar Câmera Frontal / Traseira"
                    >
                      <RefreshCw className="w-4 h-4 mr-1" /> Girar Câmera
                    </Button>

                    <Button 
                      onClick={capturePhoto} 
                      className="bg-white text-black hover:bg-slate-200 font-bold px-6 py-5 rounded-full shadow-lg text-base"
                    >
                      <Camera className="w-5 h-5 mr-2" /> Fotografar
                    </Button>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => fileInputRef.current?.click()} 
                      className="bg-black/60 border-slate-700 text-white hover:bg-black/80"
                    >
                      <Upload className="w-4 h-4 mr-1" /> Galeria
                    </Button>
                  </div>
                )}
              </>
            ) : (
              /* Photo Preview with Enhancement Tools */
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                <img 
                  src={capturedImage} 
                  alt="Documento Capturado" 
                  className="w-full h-full object-contain max-h-[440px] rounded"
                />

                {/* Edit Controls Toolbar */}
                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-2 px-3 flex-wrap bg-black/70 py-2 rounded-b-xl">
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleRetake}
                    className="h-8 text-xs font-semibold"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refazer Foto
                  </Button>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={rotatePhoto}
                    className="h-8 text-xs bg-black/60 border-slate-700 text-white hover:bg-slate-800"
                  >
                    <RotateCw className="w-3.5 h-3.5 mr-1" /> Girar 90°
                  </Button>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => applyScannerFilter("high_contrast")}
                    className={`h-8 text-xs border-slate-700 text-white hover:bg-slate-800 ${filterMode === "high_contrast" ? "bg-blue-600" : "bg-black/60"}`}
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1 text-yellow-400" /> Mais Contraste
                  </Button>

                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => applyScannerFilter("black_white")}
                    className={`h-8 text-xs border-slate-700 text-white hover:bg-slate-800 ${filterMode === "black_white" ? "bg-blue-600" : "bg-black/60"}`}
                  >
                    P&B Xerox
                  </Button>
                </div>
              </div>
            )}

            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*,.pdf" 
              className="hidden" 
              onChange={handleFileUpload} 
            />
          </div>

          {/* Right Side: Metadata & Destination Folder */}
          <div className="w-full md:w-80 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <FolderCheck className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Pasta de Arquivos da Secretaria
                </span>
              </div>

              {/* Category Selector */}
              <div>
                <Label className="text-xs text-slate-300 font-semibold">Tipo de Arquivo</Label>
                <Select value={docCategory} onValueChange={(val: any) => {
                  setDocCategory(val)
                  if (val === "membro") setDocSubCategory("RG / Documento Pessoal")
                  else if (val === "financeiro") setDocSubCategory("Comprovante de Pagamento")
                  else setDocSubCategory("Ofício / Certidão")
                }}>
                  <SelectTrigger className="h-9 bg-slate-900 border-slate-700 text-white text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    <SelectItem value="membro">Documento de Membro</SelectItem>
                    <SelectItem value="financeiro">Comprovante Financeiro</SelectItem>
                    <SelectItem value="secretaria">Secretaria / Documentos Gerais</SelectItem>
                    <SelectItem value="outro">Outro Arquivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* SubCategory */}
              <div>
                <Label className="text-xs text-slate-300 font-semibold">Subcategoria</Label>
                <Select value={docSubCategory} onValueChange={setDocSubCategory}>
                  <SelectTrigger className="h-9 bg-slate-900 border-slate-700 text-white text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-800 text-white">
                    {docCategory === "membro" ? (
                      <>
                        <SelectItem value="RG / Documento Pessoal">RG / CPF / CNH</SelectItem>
                        <SelectItem value="Certidão de Casamento/Nascimento">Certidão de Casamento/Nasc.</SelectItem>
                        <SelectItem value="Ficha de Batismo">Ficha de Batismo</SelectItem>
                        <SelectItem value="Foto 3x4 de Perfil">Foto 3x4 / Perfil</SelectItem>
                        <SelectItem value="Carta de Mudança / Recomendação">Carta de Mudança</SelectItem>
                      </>
                    ) : docCategory === "financeiro" ? (
                      <>
                        <SelectItem value="Comprovante de Pagamento">Comprovante de Pagamento</SelectItem>
                        <SelectItem value="Comprovante Pix">Comprovante Pix</SelectItem>
                        <SelectItem value="Nota Fiscal">Nota Fiscal / Cupom</SelectItem>
                        <SelectItem value="Recibo Assinado">Recibo Assinado</SelectItem>
                        <SelectItem value="Contrato de Prestação">Contrato de Prestação</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="Ata de Reunião">Ata de Reunião</SelectItem>
                        <SelectItem value="Ofício Eclesiástico">Ofício Eclesiástico</SelectItem>
                        <SelectItem value="Certificado">Certificado</SelectItem>
                        <SelectItem value="Outro Documento">Outro Documento</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Member Link (Optional) */}
              {docCategory === "membro" && (
                <div>
                  <Label className="text-xs text-slate-300 font-semibold flex items-center justify-between">
                    <span>Membro Vinculado</span>
                    <span className="text-[10px] text-slate-400 font-normal">Opcional</span>
                  </Label>
                  <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                    <SelectTrigger className="h-9 bg-slate-900 border-slate-700 text-white text-xs mt-1">
                      <SelectValue placeholder="Selecione o membro..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-48">
                      <SelectItem value="none">Nenhum (Geral)</SelectItem>
                      {membersList.filter(m => m && m.id).map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name} {m.cpf ? `(${m.cpf})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Title */}
              <div>
                <Label className="text-xs text-slate-300 font-semibold">Título / Identificação</Label>
                <Input 
                  value={docTitle} 
                  onChange={e => setDocTitle(e.target.value)} 
                  placeholder="Ex: RG - Pr. João Silva" 
                  className="h-9 bg-slate-900 border-slate-700 text-white text-xs mt-1"
                />
              </div>

              {/* Date */}
              <div>
                <Label className="text-xs text-slate-300 font-semibold">Data do Documento</Label>
                <Input 
                  type="date" 
                  value={docDate} 
                  onChange={e => setDocDate(e.target.value)} 
                  className="h-9 bg-slate-900 border-slate-700 text-white text-xs mt-1"
                />
              </div>

              {/* Notes */}
              <div>
                <Label className="text-xs text-slate-300 font-semibold">Observações (Opcional)</Label>
                <Textarea 
                  value={docNotes} 
                  onChange={e => setDocNotes(e.target.value)} 
                  placeholder="Ex: Documento conferido e autenticado." 
                  className="bg-slate-900 border-slate-700 text-white text-xs mt-1 resize-none h-16"
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 border-t border-slate-800">
              <Button 
                onClick={handleSaveDocument} 
                disabled={!capturedImage || isSaving}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-10 shadow-md"
              >
                <Check className="w-4 h-4 mr-2" />
                {isSaving ? "Salvando Arquivo..." : "Salvar na Secretaria"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
