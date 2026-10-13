import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { executeDbOperation } from '@/lib/firebaseHelper';
import { useAuth } from '@/contexts/AuthContext';
import { getBranchDisplayName } from '@/lib/branchUtils';

export interface Branch {
  id: string;
  name: string;
  type: 'sede' | 'filial';
  address?: string;
  cnpj?: string;
  pastor?: string;
  phone?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
}

interface BranchContextType {
  activeBranch: string;
  setActiveBranch: (branch: string) => void;
  branches: Branch[];
  activeBranchObj?: Branch;
  activeBranchName: string;
  canChangeBranch: boolean;
  userRestrictedBranch?: string;
  addBranch: (branch: Omit<Branch, 'id'>) => Promise<void>;
  updateBranch: (id: string, branch: Partial<Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  const [activeBranch, setActiveBranchState] = useState(() => {
    return localStorage.getItem('churchActiveBranch') || 'all';
  });
  
  const [branches, setBranches] = useState<Branch[]>([
    { id: 'sede', name: 'Igreja Evangélica Pentecostal O Brasil para Cristo', type: 'sede', address: 'Rua Bartolomeu Bueno, Nº 629 - Santa Casa - Valparaiso - SP' }
  ]);

  // Checar se o usuário logado possui restrição a uma filial específica
  const isRestricted = useMemo(() => {
    if (!user) return false;
    if (user.role === 'Administrador') return false;
    return !!(user.branch && user.branch !== 'all');
  }, [user]);

  const userRestrictedBranch = isRestricted ? user?.branch : undefined;

  // Se o usuário tiver filial restrita, forçar a seleção da congregação dele
  useEffect(() => {
    if (isRestricted && user?.branch && activeBranch !== user.branch) {
      setActiveBranchState(user.branch);
      localStorage.setItem('churchActiveBranch', user.branch);
    }
  }, [isRestricted, user?.branch, activeBranch]);

  const setActiveBranch = (newBranch: string) => {
    if (isRestricted && user?.branch && newBranch !== user.branch) {
      toast.warning("Seu usuário tem acesso restrito à sua congregação designada.");
      return;
    }
    setActiveBranchState(newBranch);
    localStorage.setItem('churchActiveBranch', newBranch);
  };

  useEffect(() => {
    const savedLocal = localStorage.getItem('churchBranches');
    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBranches(parsed);
        }
      } catch (e) {}
    }

    const unsubscribe = onSnapshot(collection(db, "branches"), (snapshot) => {
      const data: Branch[] = [];
      let hasSede = false;
      snapshot.forEach(doc => {
        const branchData = doc.data() as Branch;
        let addr = branchData.address;
        if (branchData.type === 'sede' && (!addr || addr.includes('Geraldi'))) {
          addr = 'Rua Bartolomeu Bueno, Nº 629 - Santa Casa - Valparaiso - SP';
        }
        if (branchData.type === 'sede') hasSede = true;
        data.push({ ...branchData, address: addr, id: doc.id });
      });
      
      // Se não houver sede no banco, manter uma padrão na lista
      if (!hasSede && data.length === 0) {
         const defaultList: Branch[] = [{ id: 'sede', name: 'Igreja Evangélica Pentecostal O Brasil para Cristo', type: 'sede', address: 'Rua Bartolomeu Bueno, Nº 629 - Santa Casa - Valparaiso - SP' }];
         setBranches(defaultList);
         localStorage.setItem('churchBranches', JSON.stringify(defaultList));
      } else {
         // Sort to put Sede first
         data.sort((a, b) => {
           if (a.type === 'sede') return -1;
           if (b.type === 'sede') return 1;
           return a.name.localeCompare(b.name);
         });
         setBranches(data);
         localStorage.setItem('churchBranches', JSON.stringify(data));
      }
    }, (error) => {
      console.warn("Branches listener error, using cache:", error);
    });

    return () => unsubscribe();
  }, []);

  const activeBranchObj = useMemo(() => {
    if (activeBranch === 'all') return undefined;
    return branches.find(b => b.id === activeBranch);
  }, [branches, activeBranch]);

  const activeBranchName = useMemo(() => {
    return getBranchDisplayName(activeBranch, branches);
  }, [activeBranch, branches]);

  const addBranch = async (branchData: Omit<Branch, 'id'>) => {
    const res = await executeDbOperation({
      operation: async () => addDoc(collection(db, 'branches'), branchData),
      actionName: "Criação de Congregação",
      successMessage: "Congregação adicionada com sucesso!",
      userName: user?.name || "Administrador"
    });
    if (!res.success) {
      const newId = `branch-${Date.now()}`;
      const newBranch = { ...branchData, id: newId };
      const updated = [...branches, newBranch];
      setBranches(updated);
      localStorage.setItem('churchBranches', JSON.stringify(updated));
      toast.success("Congregação salva localmente com sucesso!");
    }
  };

  const updateBranch = async (id: string, branchData: Partial<Branch>) => {
    const res = await executeDbOperation({
      operation: async () => setDoc(doc(db, 'branches', id), branchData, { merge: true }),
      actionName: "Edição de Congregação",
      successMessage: "Congregação atualizada!",
      userName: user?.name || "Administrador"
    });
    if (!res.success) {
      const updated = branches.map(b => b.id === id ? { ...b, ...branchData } : b);
      setBranches(updated);
      localStorage.setItem('churchBranches', JSON.stringify(updated));
      toast.success("Congregação atualizada localmente!");
    }
  };

  const deleteBranch = async (id: string) => {
    const res = await executeDbOperation({
      operation: async () => deleteDoc(doc(db, 'branches', id)),
      actionName: "Exclusão de Congregação",
      successMessage: "Congregação excluída!",
      userName: user?.name || "Administrador"
    });
    if (!res.success) {
      const updated = branches.filter(b => b.id !== id);
      setBranches(updated);
      localStorage.setItem('churchBranches', JSON.stringify(updated));
      toast.success("Congregação excluída localmente!");
    }
    
    if (activeBranch === id) {
      setActiveBranch('all');
    }
  };

  return (
    <BranchContext.Provider value={{ 
      activeBranch, 
      setActiveBranch, 
      branches, 
      activeBranchObj,
      activeBranchName,
      canChangeBranch: !isRestricted,
      userRestrictedBranch,
      addBranch, 
      updateBranch, 
      deleteBranch 
    }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (context === undefined) {
    throw new Error('useBranch must be used within a BranchProvider');
  }
  return context;
}
