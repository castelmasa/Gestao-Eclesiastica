import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Sparkles, 
  Zap, 
  History, 
  MessageCircle, 
  ShieldCheck, 
  Calendar, 
  CheckCircle2, 
  PlusCircle, 
  Building2,
  FileText,
  Camera,
  HeartHandshake
} from 'lucide-react';
import { useAiCredits } from '@/contexts/AiCreditsContext';
import { useBranch } from '@/contexts/BranchContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function AiCreditsModal() {
  const { 
    credits, 
    remainingCredits, 
    isCreditsModalOpen, 
    setIsCreditsModalOpen, 
    addBonusCredits 
  } = useAiCredits();
  
  const { activeBranchName } = useBranch();
  const { user } = useAuth();
  const isAdmin = user?.role === 'Administrador' || user?.role === 'Pastor Titular';

  const [bonusAmount, setBonusAmount] = useState<number>(50);
  const [isAdding, setIsAdding] = useState(false);

  const totalPool = (credits.totalMonthlyLimit || 100) + (credits.bonusCredits || 0);
  const used = credits.usedCredits || 0;
  const percentageUsed = Math.min(100, Math.round((used / Math.max(1, totalPool)) * 100));

  // Próxima data de renovação: 1º dia do próximo mês
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const formattedNextRenewal = nextMonth.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const handleQuickRecharge = async () => {
    setIsAdding(true);
    try {
      await addBonusCredits(bonusAmount, `Recarga manual autorizada por ${user?.name || 'Administrador'}`);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={isCreditsModalOpen} onOpenChange={setIsCreditsModalOpen}>
      <DialogContent className="max-w-xl p-0 overflow-hidden bg-card border-border shadow-2xl rounded-2xl">
        {/* Cabeçalho Tecnológico com Gradiente */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 p-6 text-white relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <Badge variant="outline" className="border-white/30 text-white bg-white/10 backdrop-blur-md text-xs font-bold">
                Gestão Eclesiástica IA
              </Badge>
            </div>
            <span className="text-xs text-white/80 flex items-center gap-1 font-medium">
              <Building2 className="w-3.5 h-3.5" />
              {activeBranchName || "Igreja Local"}
            </span>
          </div>

          <DialogTitle className="text-2xl font-black tracking-tight text-white">
            Créditos de Inteligência Artificial
          </DialogTitle>
          <DialogDescription className="text-white/80 text-xs mt-1">
            Controle de franquia mensal e leitura inteligente de recibos, cartas e atas pastorais.
          </DialogDescription>

          {/* Card Flutuante de Saldo */}
          <div className="mt-5 grid grid-cols-3 gap-3 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20 text-center">
            <div>
              <p className="text-[11px] text-white/70 uppercase tracking-wider font-semibold">Restantes</p>
              <p className="text-2xl font-black text-white">{remainingCredits}</p>
            </div>
            <div className="border-x border-white/20">
              <p className="text-[11px] text-white/70 uppercase tracking-wider font-semibold">Usados no Mês</p>
              <p className="text-2xl font-black text-amber-200">{used}</p>
            </div>
            <div>
              <p className="text-[11px] text-white/70 uppercase tracking-wider font-semibold">Franquia Total</p>
              <p className="text-2xl font-black text-white/90">{totalPool}</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
          {/* Barra de Progresso do Consumo */}
          <div className="space-y-2 bg-muted/40 p-4 rounded-xl border border-border/60">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                Uso da Franquia de {credits.currentMonth}
              </span>
              <span className="font-bold text-muted-foreground">{percentageUsed}% consumido</span>
            </div>
            <Progress value={percentageUsed} className="h-2.5 bg-muted rounded-full" />
            <div className="flex justify-between text-[11px] text-muted-foreground pt-1">
              <span>0</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Renovação automática em: <strong>{formattedNextRenewal}</strong>
              </span>
              <span>{totalPool} créditos</span>
            </div>
          </div>

          {/* O que gasta 1 crédito? */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Recursos Disponíveis com 1 Crédito de IA:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background border border-border/80">
                <Camera className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-foreground">Leitura de Recibo (OCR)</strong>
                  <span className="text-[11px] text-muted-foreground">Digitalização instantânea de cupom e PIX no financeiro.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background border border-border/80">
                <FileText className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-foreground">Cartas Eclesiásticas</strong>
                  <span className="text-[11px] text-muted-foreground">Redação solene de recomendação, convite e atas.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background border border-border/80">
                <HeartHandshake className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-foreground">Mensagem de Aniversário</strong>
                  <span className="text-[11px] text-muted-foreground">Parabéns pastoral personalizado no WhatsApp do membro.</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-background border border-border/80">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block text-foreground">Auditoria & Sugestões</strong>
                  <span className="text-[11px] text-muted-foreground">Classificação contábil automática e análise do mês.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Histórico Recente de Uso */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-muted-foreground" />
                Últimas Utilizações
              </h4>
              <span className="text-[11px] text-muted-foreground">Gravado no Firestore</span>
            </div>

            {credits.history && credits.history.length > 0 ? (
              <div className="border border-border/80 rounded-xl divide-y divide-border/60 max-h-44 overflow-y-auto bg-background">
                {credits.history.slice(0, 10).map((item) => (
                  <div key={item.id} className="p-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground">{item.action}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Por: {item.userName} • {(() => {
                          try {
                            const d = new Date(item.date);
                            return isNaN(d.getTime()) ? item.date : d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
                          } catch {
                            return item.date || 'Data recente';
                          }
                        })()}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      -{item.cost || 1} crédito
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border border-dashed rounded-xl text-center text-xs text-muted-foreground">
                Nenhum crédito foi consumido neste mês ainda. Franquia 100% disponível!
              </div>
            )}
          </div>

          {/* Painel do Administrador para Recarga de Teste / Bônus */}
          {isAdmin && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  Painel de Recarga / Bônus Administrativo
                </span>
                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold">Exclusivo Admin</span>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setBonusAmount(25)}
                  className={`text-xs h-7 ${bonusAmount === 25 ? 'bg-emerald-600 text-white' : ''}`}
                >
                  +25
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setBonusAmount(50)}
                  className={`text-xs h-7 ${bonusAmount === 50 ? 'bg-emerald-600 text-white' : ''}`}
                >
                  +50
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setBonusAmount(100)}
                  className={`text-xs h-7 ${bonusAmount === 100 ? 'bg-emerald-600 text-white' : ''}`}
                >
                  +100
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleQuickRecharge}
                  disabled={isAdding}
                  className="ml-auto text-xs h-7 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  {isAdding ? "Adicionando..." : `Injetar +${bonusAmount} Créditos`}
                </Button>
              </div>
            </div>
          )}

          {/* Informações Oficiais e Suporte Técnico */}
          <div className="p-3.5 bg-muted/60 rounded-xl border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground flex items-center justify-center sm:justify-start gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                Gestão Eclesiástica • Sistema de Administração e Inteligência
              </p>
              <p className="text-[11px] text-muted-foreground">
                Desenvolvido por <strong>Carlito Carvalho Rodrigues</strong> • Suporte Oficial e Atendimento.
              </p>
            </div>
            <a
              href="https://wa.me/5518991099608?text=Ol%C3%A1%20Carlito%2C%20estou%20usando%20o%20sistema%20de%20Gest%C3%A3o%20Eclesi%C3%A1stica%20e%20gostaria%20de%20tirar%20uma%20d%C3%BAvida."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp: (18) 99109-9608
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
