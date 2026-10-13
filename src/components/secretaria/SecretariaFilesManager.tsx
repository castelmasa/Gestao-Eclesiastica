import React, { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog"
import {
  Camera,
  Folder,
  Search,
  FileText,
  Image as ImageIcon,
  Eye,
  Download,
  Trash2,
  Printer,
  User,
  Receipt,
  Sparkles,
  Filter,
  Plus,
  AlertTriangle,
  Loader2,
  Calendar,
  X
} from "lucide-react"
import { ScannedSecretariaFile } from "./DocumentScannerModal"
import { AttachmentViewerModal } from "@/components/AttachmentViewerModal"
import { toast } from "sonner"
import { db } from "@/lib/firebase"
import { doc, deleteDoc, collection, getDocs, query } from "firebase/firestore"

interface SecretariaFilesManagerProps {
  files: ScannedSecretariaFile[]
  onOpenScanner: () => void
  onDeleteFile: (fileId: string, fileData?: { title?: string; date?: string }) => void
}

export function SecretariaFilesManager({
  files,
  onOpenScanner,
  onDeleteFile
}: SecretariaFilesManagerProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  
  // Viewer modal state
  const [selectedFileForView, setSelectedFileForView] = useState<{ url: string; title: string } | null>(null)

  // Custom Delete Modal state (replaces window.confirm to work 100% reliably in iframes)
  const [fileToDelete, setFileToDelete] = useState<ScannedSecretariaFile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredFiles = useMemo(() => {
    return files.filter(f => {
      if (categoryFilter !== "all" && f.category !== categoryFilter) return false
      if (searchTerm) {
        const term = searchTerm.toLowerCase().trim()
        const matchTitle = (f.title || "").toLowerCase().includes(term)
        const matchMember = (f.memberName || "").toLowerCase().includes(term)
        const matchSub = (f.subCategory || "").toLowerCase().includes(term)
        const matchNotes = (f.notes || "").toLowerCase().includes(term)
        return matchTitle || matchMember || matchSub || matchNotes
      }
      return true
    })
  }, [files, categoryFilter, searchTerm])

  // Download do arquivo com conversão de Base64 para Blob
  const handleDownload = (file: ScannedSecretariaFile) => {
    try {
      const sanitizedName = (file.title || "documento_secretaria")
        .replace(/[^a-zA-Z0-9_ -]/g, "")
        .trim()
        .replace(/\s+/g, "_") || "documento_secretaria"
      const fileName = `${sanitizedName}.jpg`

      if (file.fileDataUrl.startsWith("data:")) {
        const parts = file.fileDataUrl.split(",")
        const mimeMatch = parts[0].match(/:(.*?);/)
        const mime = mimeMatch ? mimeMatch[1] : "image/jpeg"
        const bstr = atob(parts[1])
        let n = bstr.length
        const u8arr = new Uint8Array(n)
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n)
        }
        const blob = new Blob([u8arr], { type: mime })
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = blobUrl
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500)
      } else {
        const link = document.createElement("a")
        link.href = file.fileDataUrl
        link.download = fileName
        link.target = "_blank"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
      toast.success("Download do documento iniciado!")
    } catch (e) {
      console.error("Erro no download:", e)
      toast.error("Não foi possível baixar o arquivo. Tente visualizar e salvar manualmente.")
    }
  }

  // Impressão segura através de iframe oculto (sem bloqueador de popup)
  const handlePrintDocument = (file: ScannedSecretariaFile) => {
    try {
      const existingIframe = document.getElementById("secretaria-print-iframe")
      if (existingIframe) {
        existingIframe.remove()
      }

      const printIframe = document.createElement("iframe")
      printIframe.id = "secretaria-print-iframe"
      printIframe.style.position = "fixed"
      printIframe.style.right = "0"
      printIframe.style.bottom = "0"
      printIframe.style.width = "0"
      printIframe.style.height = "0"
      printIframe.style.border = "0"
      printIframe.style.opacity = "0"
      printIframe.style.pointerEvents = "none"

      document.body.appendChild(printIframe)

      const docObj = printIframe.contentDocument || printIframe.contentWindow?.document
      if (!docObj) {
        toast.error("Não foi possível abrir o documento para impressão.")
        return
      }

      const formattedDate = file.date 
        ? new Date(file.date + "T12:00:00").toLocaleDateString("pt-BR") 
        : new Date().toLocaleDateString("pt-BR")

      docObj.open()
      docObj.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>${file.title}</title>
            <style>
              @page { margin: 15mm; size: auto; }
              body { margin: 0; padding: 15px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; }
              .header { border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 16px; }
              .header h2 { margin: 0; font-size: 15px; color: #1e3a8a; text-transform: uppercase; letter-spacing: 0.5px; }
              .header .meta { margin: 6px 0 0 0; font-size: 12px; color: #374151; line-height: 1.5; }
              .img-box { text-align: center; margin: 10px 0; }
              img { max-width: 100%; max-height: 82vh; object-fit: contain; border-radius: 4px; border: 1px solid #e5e7eb; }
              .footer { margin-top: 20px; font-size: 10px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 8px; text-align: center; }
              @media print {
                body { padding: 0; }
                img { max-height: 88vh; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO</h2>
              <div class="meta">
                <strong>Documento:</strong> ${file.title} &nbsp;|&nbsp; 
                <strong>Tipo:</strong> ${file.subCategory || file.category} &nbsp;|&nbsp; 
                <strong>Data de Registro:</strong> ${formattedDate}
                ${file.memberName ? `<br/><strong>Membro Vinculado:</strong> ${file.memberName}` : ""}
                ${file.notes ? `<br/><strong>Observações:</strong> ${file.notes}` : ""}
              </div>
            </div>
            <div class="img-box">
              <img id="printable-image" src="${file.fileDataUrl}" alt="${file.title}" />
            </div>
            <div class="footer">
              Arquivo Digital da Secretaria Eclesiástica • Impresso em ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}
            </div>
          </body>
        </html>
      `)
      docObj.close()

      const imgEl = docObj.getElementById("printable-image") as HTMLImageElement
      const triggerPrint = () => {
        try {
          printIframe.contentWindow?.focus()
          printIframe.contentWindow?.print()
        } catch (printErr) {
          console.warn("Print execute warning:", printErr)
        }
      }

      if (imgEl) {
        if (imgEl.complete) {
          setTimeout(triggerPrint, 250)
        } else {
          imgEl.onload = () => setTimeout(triggerPrint, 250)
          imgEl.onerror = () => triggerPrint()
        }
      } else {
        setTimeout(triggerPrint, 250)
      }
    } catch (e: any) {
      console.error("Print document failed:", e)
      toast.error("Erro ao preparar impressão do documento.")
    }
  }

  // Exclusão definitiva confirmada pelo usuário
  const confirmDelete = async () => {
    if (!fileToDelete) return
    setIsDeleting(true)
    const target = fileToDelete

    try {
      // 1. Notifica o componente pai para atualizar o estado local imediatamente
      onDeleteFile(target.id, { title: target.title, date: target.date })

      // 2. Limpa também diretamente no localStorage
      try {
        const storedRaw = localStorage.getItem("church_secretaria_files")
        if (storedRaw) {
          const parsed = JSON.parse(storedRaw)
          const remaining = parsed.filter((f: any) => {
            if (f.id === target.id) return false
            if (f.title === target.title && f.date === target.date) return false
            return true
          })
          localStorage.setItem("church_secretaria_files", JSON.stringify(remaining))
        }
      } catch (lsErr) {
        console.warn("LocalStorage clear warning:", lsErr)
      }

      // 3. Exclui do Firestore na coleção 'secretaria_files'
      try {
        // Exclusão direta por ID do documento
        await deleteDoc(doc(db, "secretaria_files", target.id))

        // Varredura por segurança caso tenha sido salvo com ID gerado automaticamente
        const snap = await getDocs(query(collection(db, "secretaria_files")))
        for (const d of snap.docs) {
          const data = d.data()
          if (
            d.id === target.id ||
            data.id === target.id ||
            (data.title === target.title && data.date === target.date)
          ) {
            await deleteDoc(d.ref)
          }
        }
      } catch (fbErr) {
        console.warn("Firestore delete warning (document removed locally):", fbErr)
      }

      toast.success(`Documento "${target.title}" excluído com sucesso!`)
      setFileToDelete(null)
    } catch (err: any) {
      console.error("Erro ao excluir arquivo:", err)
      toast.error("Erro ao excluir o documento: " + (err.message || "Tente novamente."))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Top Banner & Ações */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
              <Folder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Pasta de Arquivos Digitais da Secretaria
            </CardTitle>
            <CardDescription className="text-xs">
              Armazenamento de fotos de documentos de membros (RG, Certidões) e comprovantes financeiros digitalizados via câmera.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={onOpenScanner}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs text-xs sm:text-sm"
            >
              <Camera className="w-4 h-4 mr-2" />
              Digitalizar com Câmera
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0 border-t border-border/40">
          {/* Barra de Filtros e Busca */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mt-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, membro ou tipo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-9 text-xs w-full sm:w-[220px]">
                  <SelectValue placeholder="Filtrar por Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias ({files.length})</SelectItem>
                  <SelectItem value="membro">Documentos de Membros</SelectItem>
                  <SelectItem value="financeiro">Comprovantes Financeiros</SelectItem>
                  <SelectItem value="secretaria">Secretaria & Atas</SelectItem>
                  <SelectItem value="outro">Outros Arquivos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid de Documentos */}
      {filteredFiles.length === 0 ? (
        <Card className="border-dashed border-2 p-8 text-center bg-muted/20">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
              <Camera className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-foreground text-sm">
              Nenhum documento encontrado
            </h3>
            <p className="text-xs text-muted-foreground">
              {searchTerm || categoryFilter !== "all" 
                ? "Nenhum arquivo corresponde aos filtros de busca aplicados." 
                : "A pasta de arquivos digitais ainda não possui documentos salvos. Use a câmera para digitalizar fotos de documentos agora mesmo."}
            </p>
            <Button onClick={onOpenScanner} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white mt-2">
              <Camera className="w-4 h-4 mr-1.5" /> Digitalizar Primeiro Documento
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map(file => {
            const isMembro = file.category === "membro"
            const isFinanceiro = file.category === "financeiro"

            return (
              <Card key={file.id} className="overflow-hidden border-border/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group bg-card">
                <div>
                  {/* Thumbnail com Ação de Abrir Visualizador */}
                  <div 
                    onClick={() => setSelectedFileForView({ url: file.fileDataUrl, title: file.title })}
                    className="relative h-44 bg-slate-950 flex items-center justify-center cursor-pointer overflow-hidden border-b border-border/60"
                  >
                    <img 
                      src={file.fileDataUrl} 
                      alt={file.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button size="sm" variant="secondary" className="h-8 text-xs font-semibold bg-white/90 text-black hover:bg-white">
                        <Eye className="w-3.5 h-3.5 mr-1" /> Ver Tela Cheia
                      </Button>
                    </div>

                    {/* Badge de Categoria */}
                    <div className="absolute top-2 left-2 pointer-events-none">
                      <Badge className={`text-[10px] font-bold shadow-xs ${
                        isMembro 
                          ? "bg-purple-600 hover:bg-purple-600 text-white" 
                          : isFinanceiro 
                          ? "bg-emerald-600 hover:bg-emerald-600 text-white" 
                          : "bg-blue-600 hover:bg-blue-600 text-white"
                      }`}>
                        {file.subCategory || (isMembro ? "Membro" : isFinanceiro ? "Financeiro" : "Arquivo")}
                      </Badge>
                    </div>
                  </div>

                  {/* Informações do Arquivo */}
                  <div className="p-3 space-y-1.5">
                    <h4 className="font-bold text-xs text-foreground truncate" title={file.title}>
                      {file.title}
                    </h4>

                    {file.memberName && (
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                        <User className="w-3 h-3 text-purple-500 shrink-0" />
                        <span className="truncate">{file.memberName}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                      <span>{file.date ? new Date(file.date + "T12:00:00").toLocaleDateString("pt-BR") : "Sem data"}</span>
                      {file.notes && (
                        <span className="italic truncate max-w-[120px]" title={file.notes}>
                          "{file.notes}"
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Botões de Ação na Base do Card */}
                <div className="p-2 bg-muted/30 border-t border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setSelectedFileForView({ url: file.fileDataUrl, title: file.title })}
                      title="Visualizar em Tela Cheia"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDownload(file)}
                      title="Baixar Imagem"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handlePrintDocument(file)}
                      title="Imprimir Documento"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setFileToDelete(file)}
                    title="Excluir Documento"
                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Interativo de Confirmação de Exclusão (100% livre de bloqueios de iframe) */}
      <Dialog open={!!fileToDelete} onOpenChange={(open) => !open && !isDeleting && setFileToDelete(null)}>
        <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden border-border bg-background shadow-2xl">
          <div className="p-5 pb-4">
            <div className="flex items-center gap-3 text-red-600 mb-3">
              <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-950/50">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Excluir Documento Digital
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Esta ação não poderá ser desfeita.
                </DialogDescription>
              </div>
            </div>

            {fileToDelete && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/60 my-2">
                <img 
                  src={fileToDelete.fileDataUrl} 
                  alt={fileToDelete.title} 
                  className="w-12 h-12 object-cover rounded-md border shrink-0 bg-slate-900"
                />
                <div className="overflow-hidden text-xs space-y-0.5">
                  <p className="font-semibold text-foreground truncate">{fileToDelete.title}</p>
                  <p className="text-muted-foreground text-[11px] truncate">
                    {fileToDelete.subCategory || fileToDelete.category}
                  </p>
                  {fileToDelete.memberName && (
                    <p className="text-purple-600 dark:text-purple-400 text-[11px] truncate font-medium">
                      {fileToDelete.memberName}
                    </p>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Tem certeza que deseja excluir permanentemente este documento da Pasta de Arquivos da Secretaria?
            </p>
          </div>

          <DialogFooter className="p-3 bg-muted/30 border-t border-border/50 flex flex-row items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDeleting}
              onClick={() => setFileToDelete(null)}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={isDeleting}
              onClick={confirmDelete}
              className="text-xs h-8 bg-red-600 hover:bg-red-700 text-white gap-1.5 shadow-xs"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  Sim, Excluir Documento
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização em Tela Cheia */}
      {selectedFileForView && (
        <AttachmentViewerModal
          isOpen={!!selectedFileForView}
          onClose={() => setSelectedFileForView(null)}
          attachment={{
            url: selectedFileForView.url,
            title: selectedFileForView.title,
            fileName: selectedFileForView.title
          }}
        />
      )}
    </div>
  )
}
