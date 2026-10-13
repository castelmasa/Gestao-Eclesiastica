import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Keyboard } from "lucide-react"
import { Button } from "@/components/ui/button"

export function GlobalShortcuts() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.getAttribute("contenteditable") === "true"
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(true)}
        title="Atalhos (Ctrl + /)"
      >
        <Keyboard className="h-5 w-5 text-muted-foreground" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Atalhos de Teclado</DialogTitle>
            <DialogDescription>
              Use estes atalhos para navegar rapidamente pelo sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Busca Global</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘/Ctrl</span>K
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Novo Registro</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘/Ctrl</span>N
              </kbd>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Salvar (em modais)</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘/Ctrl</span>S
              </kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fechar / Cancelar</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">Esc</span>
              </kbd>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Ver Atalhos</span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘/Ctrl</span>/
              </kbd>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
