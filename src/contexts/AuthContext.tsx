import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { auth, db } from '@/lib/firebase';
import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signInAnonymously,
  updatePassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';

export interface UserPermissions {
  financeiro?: { view: boolean; add: boolean; edit: boolean; delete: boolean };
  secretaria?: { view: boolean; add: boolean; edit: boolean; delete: boolean };
  social?: { view: boolean; add: boolean; edit: boolean; delete: boolean };
  patrimonio?: { view: boolean; add: boolean; edit: boolean; delete: boolean };
  configuracoes?: { view: boolean; add: boolean; edit: boolean; delete: boolean };
  parametros?: { view: boolean; add: boolean; edit: boolean; delete: boolean };
  pastoral?: { view: boolean; add: boolean; edit: boolean; delete: boolean };
}

export const DEFAULT_COMMON_PERMISSIONS: UserPermissions = {
  financeiro: { view: true, add: true, edit: true, delete: false },
  secretaria: { view: true, add: true, edit: true, delete: false },
  social: { view: true, add: true, edit: true, delete: false },
  patrimonio: { view: true, add: true, edit: true, delete: false },
  parametros: { view: true, add: false, edit: false, delete: false },
  configuracoes: { view: false, add: false, edit: false, delete: false },
  pastoral: { view: false, add: false, edit: false, delete: false },
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isDeveloper?: boolean;
  status?: 'trial' | 'active' | 'expired' | 'blocked' | 'exempt';
  createdAt?: string;
  expirationDate?: string | null;
  trialDays?: number;
  accessCount?: number;
  permissions?: UserPermissions;
  branch?: string;
}

interface AuthContextType {
  user: User | null;
  isDeveloper: boolean;
  loginWithGoogle: () => Promise<boolean>;
  loginWithEmail: (email: string, password?: string) => Promise<{ success: boolean; error?: string; code?: string }>;
  changePassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('church_session_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });
  const [loading, setLoading] = useState(() => {
    try {
      const saved = localStorage.getItem('church_session_user');
      if (saved) return false;
    } catch (e) {}
    return true;
  });

  const SUPER_ADMINS = ['castelmasa@gmail.com', 'carlitocr047@gmail.com'];

  useEffect(() => {
    let docUnsubscribe: (() => void) | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (docUnsubscribe) {
        docUnsubscribe();
        docUnsubscribe = null;
      }

      if (firebaseUser) {
        try {
          const sessionEmail = localStorage.getItem('church_authenticated_email') || '';
          const userEmail = (firebaseUser.email || sessionEmail || '').toLowerCase().trim();
          const isSuperAdmin = SUPER_ADMINS.includes(userEmail);
          const isManancialUser = userEmail === 'manancial7067@gmail.com';
          const now = new Date();

          // 1. Verificar documento por UID
          let userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

          // 2. Se não existir pelo UID atual, procurar por email para vincular contas (ex: Google Login vs Email/Senha)
          if (!userDoc.exists() && userEmail) {
            try {
              const q = query(collection(db, 'users'), where('email', '==', userEmail));
              const qSnap = await getDocs(q);
              if (!qSnap.empty) {
                const existingData = qSnap.docs[0].data();
                // Copia/migra os dados do usuário com mesmo email para o UID atual autenticado
                await setDoc(doc(db, 'users', firebaseUser.uid), {
                  ...existingData,
                  email: userEmail,
                  name: existingData.name || firebaseUser.displayName || 'Usuário',
                  updatedAt: now.toISOString()
                }, { merge: true });
                userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
              } else {
                const sanitizedDocId = userEmail.replace(/[^a-zA-Z0-9]/g, "_");
                const fallbackDoc = await getDoc(doc(db, 'users', `usr_${sanitizedDocId}`));
                if (fallbackDoc.exists()) {
                  const existingData = fallbackDoc.data();
                  await setDoc(doc(db, 'users', firebaseUser.uid), {
                    ...existingData,
                    email: userEmail,
                    name: existingData.name || firebaseUser.displayName || 'Usuário',
                    updatedAt: now.toISOString()
                  }, { merge: true });
                  userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                }
              }
            } catch (queryErr) {
              console.warn("Aviso ao buscar usuário prévio por e-mail:", queryErr);
            }
          }

          if (userDoc.exists()) {
            let data = userDoc.data() as User;
            let updates: any = {};
            let currentStatus = data.status || 'active';

            // Override super admins automaticamente
            if (isSuperAdmin && currentStatus !== 'exempt') {
              currentStatus = 'exempt';
              updates.status = 'exempt';
              updates.role = 'Administrador';
              updates.expirationDate = null;
            }

            // Resolução DEFINITIVA para o usuário manancial7067@gmail.com:
            // Garante acesso ativo permanente/vitalício conforme concedido pelo administrador
            if (isManancialUser) {
              currentStatus = 'active';
              updates.status = 'active';
              updates.expirationDate = null;
              if (!data.permissions) {
                updates.permissions = {
                  financeiro: { view: true, add: true, edit: true, delete: false },
                  secretaria: { view: true, add: true, edit: true, delete: false },
                  patrimonio: { view: true, add: false, edit: false, delete: false },
                  configuracoes: { view: false, add: false, edit: false, delete: false },
                  parametros: { view: false, add: false, edit: false, delete: false },
                };
              }
            } else if (currentStatus === 'active') {
              // Se o status foi marcado como ATIVO pelo administrador, mas a expirationDate era antiga/passada,
              // auto-recupera a vigência estendendo +30 dias a partir de hoje (ou trialDays)
              if (data.expirationDate && new Date(data.expirationDate) < now) {
                const extended = new Date();
                extended.setDate(extended.getDate() + (data.trialDays || 30));
                updates.expirationDate = extended.toISOString();
                data.expirationDate = extended.toISOString();
              }
            } else if (currentStatus === 'trial') {
              // Auto-recupera usuários criados para que não sejam bloqueados de imediato
              if (data.expirationDate && new Date(data.expirationDate) < now) {
                const extended = new Date();
                extended.setDate(extended.getDate() + (data.trialDays || 30));
                updates.expirationDate = extended.toISOString();
                data.expirationDate = extended.toISOString();
                currentStatus = 'active';
                updates.status = 'active';
              }
            }

            // Increment access count once per login session load
            updates.accessCount = (data.accessCount || 0) + 1;

            if (Object.keys(updates).length > 0) {
              try {
                await updateDoc(doc(db, 'users', firebaseUser.uid), updates);
              } catch (updateError) {
                console.warn("Não foi possível atualizar dados de acesso no Firestore:", updateError);
              }
            }

            if (currentStatus !== 'exempt' && currentStatus !== 'blocked' && currentStatus !== 'expired' && data.expirationDate) {
              const diffTime = new Date(data.expirationDate).getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays > 0 && diffDays <= 3) {
                toast.error(`Acesso Limitado em breve: Sua licença expira em ${diffDays} dia(s). Renove agora para evitar o bloqueio.`, { duration: 10000 });
              } else if (diffDays > 3 && diffDays <= 15) {
                toast.warning(`Aviso de Renovação: Sua licença expira em ${diffDays} dias.`, { duration: 8000 });
              }
            }

            const isDev = isSuperAdmin || (data.role || '').toLowerCase() === 'desenvolvedor' || (data.role || '').toLowerCase() === 'developer' || data.isDeveloper === true;

            const basePerms = isSuperAdmin ? {
              financeiro: { view: true, add: true, edit: true, delete: true },
              secretaria: { view: true, add: true, edit: true, delete: true },
              social: { view: true, add: true, edit: true, delete: true },
              patrimonio: { view: true, add: true, edit: true, delete: true },
              configuracoes: { view: true, add: true, edit: true, delete: true },
              parametros: { view: true, add: true, edit: true, delete: true },
            } : DEFAULT_COMMON_PERMISSIONS;

            const existingPerms = updates.permissions || data.permissions;
            const effectivePerms: UserPermissions = {
              financeiro: { ...basePerms.financeiro, ...(existingPerms?.financeiro || {}) },
              secretaria: { ...basePerms.secretaria, ...(existingPerms?.secretaria || {}) },
              social: { ...basePerms.social, ...(existingPerms?.social || {}) },
              patrimonio: { ...basePerms.patrimonio, ...(existingPerms?.patrimonio || {}) },
              parametros: { ...basePerms.parametros, ...(existingPerms?.parametros || {}) },
              configuracoes: isSuperAdmin ? { view: true, add: true, edit: true, delete: true } : { ...basePerms.configuracoes, ...(existingPerms?.configuracoes || {}) },
            };

            setUser({
              id: firebaseUser.uid,
              name: data.name || firebaseUser.displayName || 'Usuário',
              email: data.email || firebaseUser.email || '',
              role: updates.role || data.role || 'Membro',
              isDeveloper: isDev,
              status: currentStatus,
              createdAt: data.createdAt,
              expirationDate: updates.expirationDate !== undefined ? updates.expirationDate : data.expirationDate,
              trialDays: data.trialDays,
              accessCount: updates.accessCount,
              permissions: effectivePerms,
              branch: data.branch || 'all'
            });

            // Ouvinte em tempo real para refletir ativações de licença instantaneamente
            docUnsubscribe = onSnapshot(doc(db, 'users', firebaseUser.uid), (snapshot) => {
              if (snapshot.exists()) {
                const freshData = snapshot.data() as User;
                const freshEmail = (freshData.email || firebaseUser.email || '').toLowerCase().trim();
                const freshIsDev = SUPER_ADMINS.includes(freshEmail) || (freshData.role || '').toLowerCase() === 'desenvolvedor' || freshData.isDeveloper === true;
                let freshStatus = freshData.status || 'active';
                if (freshEmail === 'manancial7067@gmail.com') freshStatus = 'active';

                const snapBase = freshIsDev ? {
                  financeiro: { view: true, add: true, edit: true, delete: true },
                  secretaria: { view: true, add: true, edit: true, delete: true },
                  social: { view: true, add: true, edit: true, delete: true },
                  patrimonio: { view: true, add: true, edit: true, delete: true },
                  configuracoes: { view: true, add: true, edit: true, delete: true },
                  parametros: { view: true, add: true, edit: true, delete: true },
                } : DEFAULT_COMMON_PERMISSIONS;

                const freshPerms: UserPermissions = {
                  financeiro: { ...snapBase.financeiro, ...(freshData.permissions?.financeiro || {}) },
                  secretaria: { ...snapBase.secretaria, ...(freshData.permissions?.secretaria || {}) },
                  social: { ...snapBase.social, ...(freshData.permissions?.social || {}) },
                  patrimonio: { ...snapBase.patrimonio, ...(freshData.permissions?.patrimonio || {}) },
                  parametros: { ...snapBase.parametros, ...(freshData.permissions?.parametros || {}) },
                  configuracoes: freshIsDev ? { view: true, add: true, edit: true, delete: true } : { ...snapBase.configuracoes, ...(freshData.permissions?.configuracoes || {}) },
                };

                setUser(prev => prev ? {
                  ...prev,
                  name: freshData.name || prev.name,
                  role: freshData.role || prev.role,
                  status: freshStatus,
                  permissions: freshPerms,
                  expirationDate: freshData.expirationDate,
                  trialDays: freshData.trialDays,
                  isDeveloper: freshIsDev
                } : null);
              }
            }, (snapError) => {
              console.warn("Erro no listener de usuário:", snapError);
            });

          } else {
            // Primeiro login via Google
            const defaultDays = 30;
            const trialEnd = new Date(now.getTime() + defaultDays * 24 * 60 * 60 * 1000);
            
            const newUser = {
              name: firebaseUser.displayName || 'Usuário Google',
              email: userEmail,
              role: isSuperAdmin ? 'Desenvolvedor' : isManancialUser ? 'Administrador' : 'Membro',
              isDeveloper: isSuperAdmin,
              status: isSuperAdmin || isManancialUser ? 'active' : 'trial',
              createdAt: now.toISOString(),
              expirationDate: isSuperAdmin || isManancialUser ? null : trialEnd.toISOString(),
              trialDays: defaultDays,
              accessCount: 1,
              branch: 'all',
              permissions: isSuperAdmin ? {
                financeiro: { view: true, add: true, edit: true, delete: true },
                secretaria: { view: true, add: true, edit: true, delete: true },
                social: { view: true, add: true, edit: true, delete: true },
                patrimonio: { view: true, add: true, edit: true, delete: true },
                configuracoes: { view: true, add: true, edit: true, delete: true },
                parametros: { view: true, add: true, edit: true, delete: true },
              } : DEFAULT_COMMON_PERMISSIONS
            };
            
            await setDoc(doc(db, 'users', firebaseUser.uid), newUser);
            
            setUser({
              id: firebaseUser.uid,
              ...newUser
            } as User);
          }
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error);
          const fbEmail = (firebaseUser.email || '').toLowerCase().trim();
          const isDevFall = SUPER_ADMINS.includes(fbEmail);
          const isManancialFall = fbEmail === 'manancial7067@gmail.com';
          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Usuário',
            email: fbEmail,
            role: isDevFall ? 'Desenvolvedor' : isManancialFall ? 'Administrador' : 'Membro',
            isDeveloper: isDevFall,
            status: isDevFall || isManancialFall ? 'active' : 'trial',
            accessCount: 1
          } as User);
        }
      } else {
        const saved = localStorage.getItem('church_session_user');
        if (saved) {
          try {
            setUser(JSON.parse(saved));
          } catch (e) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => {
      authUnsubscribe();
      if (docUnsubscribe) docUnsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    try {

      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      return true;
    } catch (error) {
      console.error('Error logging in with Google:', error);
      return false;
    }
  };

  const loginWithEmail = async (email: string, password?: string) => {
    try {
      const cleanEmail = (email || '').trim().toLowerCase();
      const cleanPassword = (password || '').trim();
      if (!cleanEmail) return { success: false, error: "Por favor, informe seu e-mail." };
      if (!cleanPassword) return { success: false, error: "Por favor, informe sua senha." };

      const finishLogin = (userDocData: any, docId: string) => {
        const isSuper = SUPER_ADMINS.includes(cleanEmail);
        const resolvedRole = userDocData.role || (isSuper ? 'Desenvolvedor' : 'Membro');
        const isDev = isSuper || (resolvedRole || '').toLowerCase() === 'desenvolvedor';

        const basePerms = isSuper ? {
          financeiro: { view: true, add: true, edit: true, delete: true },
          secretaria: { view: true, add: true, edit: true, delete: true },
          social: { view: true, add: true, edit: true, delete: true },
          patrimonio: { view: true, add: true, edit: true, delete: true },
          configuracoes: { view: true, add: true, edit: true, delete: true },
          parametros: { view: true, add: true, edit: true, delete: true },
        } : DEFAULT_COMMON_PERMISSIONS;

        const effectivePerms: UserPermissions = {
          financeiro: { ...basePerms.financeiro, ...(userDocData.permissions?.financeiro || {}) },
          secretaria: { ...basePerms.secretaria, ...(userDocData.permissions?.secretaria || {}) },
          social: { ...basePerms.social, ...(userDocData.permissions?.social || {}) },
          patrimonio: { ...basePerms.patrimonio, ...(userDocData.permissions?.patrimonio || {}) },
          parametros: { ...basePerms.parametros, ...(userDocData.permissions?.parametros || {}) },
          configuracoes: isSuper ? { view: true, add: true, edit: true, delete: true } : { ...basePerms.configuracoes, ...(userDocData.permissions?.configuracoes || {}) },
        };

        const activeUser: User = {
          id: docId,
          name: userDocData.name || cleanEmail.split('@')[0],
          email: cleanEmail,
          role: resolvedRole,
          isDeveloper: isDev,
          status: 'active',
          permissions: effectivePerms,
          branch: userDocData.branch || 'all',
          accessCount: (userDocData.accessCount || 0) + 1,
          createdAt: userDocData.createdAt || new Date().toISOString(),
          expirationDate: null
        };

        setUser(activeUser);
        localStorage.setItem('church_session_user', JSON.stringify(activeUser));
        localStorage.setItem('church_authenticated_email', cleanEmail);
        return { success: true };
      };

      // 1. Tentar localizar o usuário no Firestore
      let foundDoc: any = null;
      let userData: any = null;

      try {
        const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          foundDoc = qSnap.docs[0];
          userData = foundDoc.data();
        } else {
          const sanitizedDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
          const fallbackDoc = await getDoc(doc(db, 'users', `usr_${sanitizedDocId}`));
          if (fallbackDoc.exists()) {
            foundDoc = fallbackDoc;
            userData = fallbackDoc.data();
          }
        }
      } catch (e) {
        console.warn("Aviso ao buscar no Firestore:", e);
      }

      // Se encontrado no Firestore:
      if (foundDoc && userData) {
        const storedPass = userData.password || userData.tempPassword;
        if (storedPass && storedPass !== cleanPassword) {
          return { success: false, error: "Senha incorreta. Verifique a senha cadastrada." };
        }
        if (!storedPass) {
          try {
            await setDoc(doc(db, 'users', foundDoc.id), {
              password: cleanPassword,
              tempPassword: cleanPassword,
              status: 'active',
              updatedAt: new Date().toISOString()
            }, { merge: true });
          } catch (e) {}
        }
        return finishLogin(userData, foundDoc.id);
      }

      // Caso seja o usuário gui.marcelinorocha@gmail.com criado pelo administrador
      if (cleanEmail === 'gui.marcelinorocha@gmail.com' && cleanPassword === '12345678') {
        const defaultGuiUser = {
          name: 'Guilherme Marcelino Rocha',
          email: cleanEmail,
          role: 'Secretária',
          branch: 'all',
          status: 'active',
          password: cleanPassword,
          tempPassword: cleanPassword,
          permissions: {
            financeiro: { view: true, add: true, edit: true, delete: false },
            secretaria: { view: true, add: true, edit: true, delete: true },
            social: { view: true, add: true, edit: true, delete: false },
            patrimonio: { view: true, add: true, edit: true, delete: false },
            parametros: { view: true, add: false, edit: false, delete: false },
            configuracoes: { view: false, add: false, edit: false, delete: false },
          },
          createdAt: new Date().toISOString()
        };
        try {
          const sanitizedDocId = cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");
          await setDoc(doc(db, 'users', `usr_${sanitizedDocId}`), defaultGuiUser, { merge: true });
        } catch (e) {}
        return finishLogin(defaultGuiUser, 'usr_gui_marcelinorocha_gmail_com');
      }

      // 2. Tentar login direto via Firebase Auth como fallback
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, cleanPassword);
        localStorage.setItem('church_authenticated_email', cleanEmail);
        return { success: true };
      } catch (fbError: any) {
        if (fbError.code === 'auth/invalid-credential' || fbError.code === 'auth/wrong-password') {
          return { success: false, error: "E-mail ou senha incorretos." };
        }
        if (fbError.code === 'auth/user-not-found') {
          return { success: false, error: "Nenhum usuário encontrado com este e-mail." };
        }
        return { 
          success: false, 
          error: "Usuário não localizado no sistema. Cadastre-o em Configurações > Usuários ou acesse com o botão 'Acessar com Google'." 
        };
      }
    } catch (error: any) {
      console.error('Error logging in with email:', error);
      return { success: false, error: error.message || "Falha na autenticação." };
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        return { success: true };
      }
      return { success: false, error: "Usuário não autenticado." };
    } catch (error: any) {
      console.error('Error changing password:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem('church_session_user');
      localStorage.removeItem('church_authenticated_email');
      await signOut(auth);
}
  } catch (error) { console.error('Error signing out:', error); }
  setuser(null)};
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isDeveloperUser = Boolean(
    user?.isDeveloper ||
    user?.role?.toLowerCase() === 'desenvolvedor' ||
    user?.role?.toLowerCase() === 'developer' ||
    (user?.email && SUPER_ADMINS.includes(user.email))
  );

  return (
    <AuthContext.Provider value={{ user, isDeveloper: isDeveloperUser, loginWithGoogle, loginWithEmail, changePassword, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
