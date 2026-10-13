import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink, Image as ImageIcon, ZoomIn, ZoomOut, AlertCircle, X } from "lucide-react";

export interface AttachmentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachment: {
    url: string;
    fileName?: string;
    title?: string;
  } | null;
}

export function AttachmentViewerModal({ isOpen, onClose, attachment }: AttachmentViewerModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isPdfLoading, setIsPdfLoading] = useState(true);

  const url = attachment?.url || "";
  const fileName = attachment?.fileName || "Comprovante / Anexo";
  const title = attachment?.title || fileName;

  const isPdf =
    url.startsWith("data:application/pdf") ||
    fileName.toLowerCase().endsWith(".pdf") ||
    url.includes("application/pdf");

  const isImage =
    url.startsWith("data:image/") ||
    /\.(jpg|jpeg|png|webp|gif|bmp|svg)($|\?)/i.test(fileName) ||
    /\.(jpg|jpeg|png|webp|gif|bmp|svg)($|\?)/i.test(url);

  // Manipulação de Blob para evitar bloqueios do navegador com Data URLs
  useEffect(() => {
    if (!url) {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        setBlobUrl(null);
      }
      return;
    }

    setIsPdfLoading(true);
    setIsZoomed(false);

    if (isPdf && url.startsWith("data:")) {
      try {
        const parts = url.split(",");
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : "application/pdf";
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const createdBlobUrl = URL.createObjectURL(blob);
        setBlobUrl(createdBlobUrl);
      } catch (err) {
        console.error("Erro ao converter PDF data URL em Blob:", err);
        setBlobUrl(url);
      }
    } else {
      setBlobUrl(url);
    }

    return () => {
      if (blobUrl && blobUrl.startsWith("blob:")) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [url, isPdf, fileName]);

  const activeSrc = blobUrl || url;

  const handleOpenInNewTab = () => {
    if (activeSrc) {
      window.open(activeSrc, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = () => {
    if (!activeSrc) return;
    const a = document.createElement("a");
    a.href = activeSrc;
    a.download = fileName || "anexo";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[850px] w-[94vw] max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl rounded-xl border border-border bg-background">
        {/* Header com Nome do Arquivo e Ações */}
        <DialogHeader className="p-4 border-b bg-muted/30 flex flex-row items-center justify-between space-y-0 shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden pr-2">
            {isPdf ? (
              <div className="p-2 rounded-md bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 shrink-0">
                <FileText className="h-5 w-5" />
              </div>
            ) : (
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shrink-0">
                <ImageIcon className="h-5 w-5" />
              </div>
            )}
            <div className="overflow-hidden">
              <DialogTitle className="text-sm font-semibold truncate leading-snug">
                {title}
              </DialogTitle>
              <p className="text-xs text-muted-foreground truncate">
                {isPdf ? "Documento PDF" : isImage ? "Imagem" : "Arquivo anexado"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isImage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => setIsZoomed(!isZoomed)}
                title={isZoomed ? "Ajustar à tela" : "Ampliar imagem"}
              >
                {isZoomed ? <ZoomOut className="h-4 w-4 mr-1" /> : <ZoomIn className="h-4 w-4 mr-1" />}
                {isZoomed ? "Reduzir" : "Ampliar"}
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs text-primary"
              onClick={handleOpenInNewTab}
              title="Abrir em Nova Aba"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              Nova Aba
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2.5 text-xs"
              onClick={handleDownload}
              title="Baixar Arquivo"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Baixar
            </Button>
          </div>
        </DialogHeader>

        {/* Corpo do Visualizador */}
        <div className="relative flex-1 min-h-[400px] max-h-[72vh] overflow-auto bg-slate-950/5 dark:bg-slate-950/40 flex items-center justify-center p-3">
          {!activeSrc ? (
            <div className="text-center p-8 text-muted-foreground flex flex-col items-center">
              <AlertCircle className="h-10 w-10 mb-2 text-amber-500 opacity-80" />
              <p className="font-medium text-sm">Arquivo ou comprovante não disponível.</p>
            </div>
          ) : isPdf ? (
            <div className="w-full h-[65vh] relative flex flex-col rounded-lg overflow-hidden border bg-white">
              <object
                data={activeSrc}
                type="application/pdf"
                className="w-full h-full"
                onLoad={() => setIsPdfLoading(false)}
              >
                {/* Fallback caso o navegador não renderize o PDF internamente */}
                <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-slate-50 text-slate-800">
                  <FileText className="h-16 w-16 text-red-500 mb-3" />
                  <h4 className="font-bold text-base mb-1">Visualização de PDF</h4>
                  <p className="text-xs text-slate-600 max-w-sm mb-4">
                    O seu navegador bloqueou a incorporação direta deste PDF. Clique abaixo para abri-lo ou baixá-lo:
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={handleOpenInNewTab} size="sm">
                      <ExternalLink className="mr-2 h-4 w-4" /> Abrir PDF
                    </Button>
                    <Button variant="outline" onClick={handleDownload} size="sm">
                      <Download className="mr-2 h-4 w-4" /> Baixar
                    </Button>
                  </div>
                </div>
              </object>
            </div>
          ) : isImage ? (
            <div className="w-full h-full flex items-center justify-center overflow-auto p-2">
              <img
                src={activeSrc}
                alt={fileName}
                className={`transition-all duration-200 rounded-md shadow-sm ${
                  isZoomed
                    ? "max-w-none cursor-zoom-out"
                    : "max-h-[66vh] max-w-full object-contain cursor-zoom-in"
                }`}
                onClick={() => setIsZoomed(!isZoomed)}
              />
            </div>
          ) : (
            <div className="text-center p-8 text-muted-foreground flex flex-col items-center">
              <FileText className="h-12 w-12 mb-3 text-primary opacity-70" />
              <p className="font-medium text-sm mb-1">{fileName}</p>
              <p className="text-xs text-muted-foreground mb-4">
                Formato de arquivo disponível para download ou visualização externa.
              </p>
              <Button onClick={handleOpenInNewTab} size="sm">
                <ExternalLink className="mr-2 h-4 w-4" /> Abrir Arquivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
