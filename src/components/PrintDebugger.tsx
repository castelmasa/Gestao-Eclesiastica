import React from 'react';
import { AlertTriangle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PrintDebugger({ isOpen, onClose, onForcePrint }: { isOpen: boolean, onClose: () => void, onForcePrint: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
       <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6 space-y-4 border border-amber-200">
          <div className="flex items-center gap-3 text-amber-600">
             <AlertTriangle className="h-8 w-8" />
             <h2 className="text-xl font-bold text-slate-900">Impressão Bloqueada</h2>
          </div>
          <p className="text-sm text-slate-600">
            O navegador impediu a abertura da janela de impressão. Isso pode acontecer devido a bloqueadores de pop-up, foco da janela, ou tempo de renderização muito longo.
          </p>
          <div className="bg-slate-50 border p-3 rounded text-xs text-slate-700 font-mono space-y-1">
             <p className="text-green-600">✓ Dados injetados com sucesso</p>
             <p className="text-green-600">✓ Elementos de UI ocultados (.print:hidden)</p>
             <p className="text-red-600">❌ window.print() ignorado pelo browser</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
             <Button variant="outline" onClick={onClose}>Cancelar</Button>
             <Button onClick={() => { onForcePrint(); onClose(); }} className="bg-amber-600 hover:bg-amber-700 text-white">
                <Printer className="mr-2 w-4 h-4" /> Forçar Impressão Direta
             </Button>
          </div>
       </div>
    </div>
  )
}
