import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useAiCredits } from '@/contexts/AiCreditsContext';

interface AiCreditsBadgeProps {
  className?: string;
  showLabel?: boolean;
}

export function AiCreditsBadge({ className = "", showLabel = true }: AiCreditsBadgeProps) {
  const { remainingCredits, openCreditsModal } = useAiCredits();

  const isLow = remainingCredits <= 10;
  const isZero = remainingCredits === 0;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={openCreditsModal}
      className={`h-8 px-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs ${
        isZero
          ? "border-red-500/50 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20"
          : isLow
          ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
          : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
      } ${className}`}
      title="Clique para ver o saldo e histórico de créditos de IA da igreja"
    >
      <Sparkles className={`w-3.5 h-3.5 ${isZero ? "text-red-500" : isLow ? "text-amber-500" : "text-emerald-500 animate-pulse"}`} />
      <span>{remainingCredits}</span>
      {showLabel && <span className="hidden sm:inline font-medium text-[11px] opacity-90">créditos IA</span>}
    </Button>
  );
}
