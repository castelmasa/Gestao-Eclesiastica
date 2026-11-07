import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { toast } from 'sonner';

export interface AiUsageLogItem {
  id: string;
  date: string;
  action: string;
  cost: number;
  userName: string;
  userRole?: string;
}

export interface ChurchAiCredits {
  churchId: string;
  totalMonthlyLimit: number; // Padrão: 100 créditos gratuitos por mês
  usedCredits: number;
  bonusCredits: number;
  currentMonth: string; // Ex: "2026-11"
  lastUsedAt?: string;
  lastAction?: string;
  history: AiUsageLogItem[];
}

interface AiCreditsContextType {
  credits: ChurchAiCredits;
  remainingCredits: number;
  isLoading: boolean;
  canUseAi: (cost?: number) => boolean;
  consumeCredit: (actionDescription: string, cost?: number) => Promise<{ success: boolean; remaining: number; message?: string }>;
  addBonusCredits: (amount: number, reason: string) => Promise<void>;
  isCreditsModalOpen: boolean;
  setIsCreditsModalOpen: (open: boolean) => void;
  openCreditsModal: () => void;
}

const DEFAULT_MONTHLY_LIMIT = 100;

function getCurrentMonthKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

const defaultCreditsState: ChurchAiCredits = {
  churchId: 'sede',
  totalMonthlyLimit: DEFAULT_MONTHLY_LIMIT,
  usedCredits: 0,
  bonusCredits: 0,
  currentMonth: getCurrentMonthKey(),
  history: []
};

const AiCreditsContext = createContext<AiCreditsContextType | undefined>(undefined);

export function AiCreditsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { activeBranch } = useBranch();
  
  // Define o identificador da igreja para o Firestore
  const targetChurchId = useMemo(() => {
    if (activeBranch && activeBranch !== 'all') {
      return activeBranch.replace(/[\/\s]/g, '_');
    }
    return 'sede';
  }, [activeBranch]);

  const [credits, setCredits] = useState<ChurchAiCredits>(() => {
    // Tenta restaurar do cache local para resposta ultra-rápida
    try {
      const cached = localStorage.getItem(`church_ai_credits_${targetChurchId}`);
      if (cached) return JSON.parse(cached);
    } catch {}
    return { ...defaultCreditsState, churchId: targetChurchId };
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);

  // Sincronização em Tempo Real com Firestore
  useEffect(() => {
    if (!targetChurchId) return;

    const docRef = doc(db, 'church_ai_credits', targetChurchId);
    const unsubscribe = onSnapshot(
      docRef,
      async (snap) => {
        const monthKey = getCurrentMonthKey();
        if (snap.exists()) {
          const data = snap.data() as Partial<ChurchAiCredits>;
          
          // Verifica se o mês virou para renovar a franquia mensal automaticamente
          if (data.currentMonth && data.currentMonth !== monthKey) {
            const renewedData: Partial<ChurchAiCredits> = {
              currentMonth: monthKey,
              usedCredits: 0,
              history: data.history || []
            };
            try {
              await updateDoc(docRef, renewedData);
            } catch (e) {
              console.warn("Erro ao atualizar renovação mensal no Firestore:", e);
            }
            const updated = {
              churchId: targetChurchId,
              totalMonthlyLimit: data.totalMonthlyLimit ?? DEFAULT_MONTHLY_LIMIT,
              usedCredits: 0,
              bonusCredits: data.bonusCredits ?? 0,
              currentMonth: monthKey,
              lastUsedAt: data.lastUsedAt,
              lastAction: data.lastAction,
              history: data.history || []
            };
            setCredits(updated);
            localStorage.setItem(`church_ai_credits_${targetChurchId}`, JSON.stringify(updated));
          } else {
            const updated: ChurchAiCredits = {
              churchId: targetChurchId,
              totalMonthlyLimit: data.totalMonthlyLimit ?? DEFAULT_MONTHLY_LIMIT,
              usedCredits: data.usedCredits ?? 0,
              bonusCredits: data.bonusCredits ?? 0,
              currentMonth: data.currentMonth || monthKey,
              lastUsedAt: data.lastUsedAt,
              lastAction: data.lastAction,
              history: data.history || []
            };
            setCredits(updated);
            localStorage.setItem(`church_ai_credits_${targetChurchId}`, JSON.stringify(updated));
          }
        } else {
          // Documento inicial ainda não existe no Firestore: inicializar
          const initialRecord: ChurchAiCredits = {
            churchId: targetChurchId,
            totalMonthlyLimit: DEFAULT_MONTHLY_LIMIT,
            usedCredits: 0,
            bonusCredits: 0,
            currentMonth: monthKey,
            history: []
          };
          try {
            await setDoc(docRef, initialRecord, { merge: true });
          } catch (e) {
            console.warn("Erro ao inicializar créditos de IA no Firestore:", e);
          }
          setCredits(initialRecord);
          localStorage.setItem(`church_ai_credits_${targetChurchId}`, JSON.stringify(initialRecord));
        }
        setIsLoading(false);
      },
      (err) => {
        console.warn("Falha ao escutar créditos no Firestore (mantendo local):", err);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [targetChurchId]);

  // Cálculo de Créditos Restantes
  const remainingCredits = useMemo(() => {
    const totalAvailable = (credits.totalMonthlyLimit || DEFAULT_MONTHLY_LIMIT) + (credits.bonusCredits || 0);
    const balance = totalAvailable - (credits.usedCredits || 0);
    return Math.max(0, balance);
  }, [credits]);

  const canUseAi = useCallback((cost = 1): boolean => {
    return remainingCredits >= cost;
  }, [remainingCredits]);

  // Consumir Crédito de IA e Gravar Auditoria no Firestore
  const consumeCredit = useCallback(
    async (actionDescription: string, cost = 1): Promise<{ success: boolean; remaining: number; message?: string }> => {
      if (remainingCredits < cost) {
        setIsCreditsModalOpen(true);
        return {
          success: false,
          remaining: remainingCredits,
          message: "Seus créditos de IA deste mês se esgotaram. Adquira uma recarga ou faça upgrade do plano."
        };
      }

      const newUsed = (credits.usedCredits || 0) + cost;
      const now = new Date().toISOString();
      const newLogItem: AiUsageLogItem = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date: now,
        action: actionDescription,
        cost,
        userName: user?.name || user?.email || "Usuário da Igreja",
        userRole: user?.role || "Membro/Liderança"
      };

      const updatedHistory = [newLogItem, ...(credits.history || [])].slice(0, 50); // manter os últimos 50 registros

      const updatedState: ChurchAiCredits = {
        ...credits,
        usedCredits: newUsed,
        lastUsedAt: now,
        lastAction: actionDescription,
        history: updatedHistory
      };

      // Atualização otimista imediata na UI
      setCredits(updatedState);
      localStorage.setItem(`church_ai_credits_${targetChurchId}`, JSON.stringify(updatedState));

      // Persistir no Firestore
      try {
        const cleanPayload = JSON.parse(JSON.stringify(updatedState));
        const docRef = doc(db, 'church_ai_credits', targetChurchId);
        await setDoc(docRef, cleanPayload, { merge: true });
      } catch (err) {
        console.warn("Aviso: Falha ao salvar crédito consumido no Firestore:", err);
      }

      const newRemaining = Math.max(0, (credits.totalMonthlyLimit + credits.bonusCredits) - newUsed);
      return {
        success: true,
        remaining: newRemaining
      };
    },
    [credits, remainingCredits, targetChurchId, user]
  );

  // Adicionar Créditos Bônus / Recarga
  const addBonusCredits = useCallback(
    async (amount: number, reason: string): Promise<void> => {
      const newBonus = (credits.bonusCredits || 0) + amount;
      const now = new Date().toISOString();
      const bonusLog: AiUsageLogItem = {
        id: `bonus_${Date.now()}`,
        date: now,
        action: `Recarga de Créditos (+${amount}): ${reason}`,
        cost: 0,
        userName: user?.name || "Administrador",
        userRole: user?.role || "Admin"
      };

      const updatedHistory = [bonusLog, ...(credits.history || [])].slice(0, 50);

      const updatedState: ChurchAiCredits = {
        ...credits,
        bonusCredits: newBonus,
        history: updatedHistory
      };

      setCredits(updatedState);
      localStorage.setItem(`church_ai_credits_${targetChurchId}`, JSON.stringify(updatedState));

      try {
        const cleanPayload = JSON.parse(JSON.stringify(updatedState));
        const docRef = doc(db, 'church_ai_credits', targetChurchId);
        await setDoc(docRef, cleanPayload, { merge: true });
        toast.success(`+${amount} créditos de IA adicionados com sucesso!`);
      } catch (err: any) {
        console.warn("Aviso ao registrar recarga no Firestore:", err);
        // Garante experiência fluida com armazenamento local
        toast.success(`+${amount} créditos adicionados com sucesso na igreja!`);
      }
    },
    [credits, targetChurchId, user]
  );

  const openCreditsModal = () => setIsCreditsModalOpen(true);

  return (
    <AiCreditsContext.Provider
      value={{
        credits,
        remainingCredits,
        isLoading,
        canUseAi,
        consumeCredit,
        addBonusCredits,
        isCreditsModalOpen,
        setIsCreditsModalOpen,
        openCreditsModal
      }}
    >
      {children}
    </AiCreditsContext.Provider>
  );
}

export function useAiCredits() {
  const context = useContext(AiCreditsContext);
  if (!context) {
    throw new Error('useAiCredits deve ser usado dentro de um AiCreditsProvider');
  }
  return context;
}
