import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-md hover:bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition"
      >
        <Download className="w-4 h-4" />
        <span className="hidden md:inline">Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-md hover:bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition"
        >
          <Download className="w-4 h-4" />
          <span className="hidden md:inline">Instalar (iOS)</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-background p-6 shadow-xl border border-border">
              <h3 className="text-lg font-semibold text-foreground">Instalar no iPhone / iPad</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                1. Toque no botão <strong>Compartilhar</strong> no Safari.<br />
                2. Role para baixo e toque em <strong>Adicionar à Tela de Início</strong>.
              </p>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-primary text-primary-foreground py-2 text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
