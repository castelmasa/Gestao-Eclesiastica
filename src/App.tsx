import { TooltipProvider } from "@/components/ui/tooltip"
import React from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "sonner"
import { Layout } from "./components/layout/Layout"
import { Dashboard } from "./pages/Dashboard"
import { Agenda } from "./pages/Agenda"
import { Financeiro } from "./pages/Financeiro"
import { Secretaria } from "./pages/Secretaria"
import { Fornecedores } from "./pages/Fornecedores"
import { Patrimonio } from "./pages/Patrimonio"
import { Configuracoes } from "./pages/Configuracoes"
import { Auditoria } from "./pages/Auditoria"
import { Automacoes } from "./pages/Automacoes"
import { Parametros } from "./pages/Parametros"
import { Ajuda } from "./pages/Ajuda"
import { PaletasCores } from "./pages/PaletasCores"
import { Login } from "./pages/Login"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import { BranchProvider } from "./contexts/BranchContext"
import { ThemeProvider } from "./contexts/ThemeContext"
import { ColorThemeProvider } from "./contexts/ColorThemeContext"
import { ServicoSocial } from "./pages/ServicoSocial"
import { Formularios } from "./pages/Formularios"
import { AreaPastoral } from "./pages/AreaPastoral"
import { AutoBackupRunner } from "./components/AutoBackupRunner"
import { ValidarCrachaPublico } from "./pages/ValidarCrachaPublico"
import { Button } from "./components/ui/button"
import { AccessDeniedScreen } from "./components/common/AccessDeniedScreen"

function LicenseExpiredScreen() {
  const { user, logout } = useAuth();
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-red-500/5 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="max-w-md w-full bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-2xl p-8 text-center space-y-6">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Acesso Bloqueado</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          O acesso deste usuário está temporariamente suspenso ({user?.email}).
          Entre em contato com o administrador da igreja para liberação do acesso.
        </p>
        <div className="pt-2 flex flex-col gap-2">
          <Button 
            onClick={() => window.location.reload()} 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          >
            Verificar Permissão / Atualizar
          </Button>
          <Button onClick={logout} variant="outline" className="w-full">
            Sair da Conta
          </Button>
        </div>
      </div>
    </div>
  );
}

function RestrictedRoute({ 
  children, 
  module,
  moduleName
}: { 
  children: React.ReactNode; 
  module: 'configuracoes' | 'pastoral' | 'financeiro' | 'secretaria' | 'social' | 'patrimonio' | 'parametros';
  moduleName: string;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'administrador';
  const isDev = Boolean(
    user?.isDeveloper ||
    user?.role?.toLowerCase() === 'desenvolvedor' ||
    user?.role?.toLowerCase() === 'developer'
  );
  const isNovoUsuario = Boolean(
    !isAdmin && !isDev && (
      (user?.role || '').toLowerCase().includes('novo') ||
      (user?.role || '').toLowerCase().includes('visitante') ||
      (user?.status === 'trial' && (!user?.permissions || Object.values(user.permissions).every((p: any) => !p?.view)))
    )
  );

  let hasAccess = false;
  if (isAdmin || isDev) {
    hasAccess = true;
  } else if (isNovoUsuario) {
    hasAccess = false;
  } else if (module === 'configuracoes') {
    hasAccess = Boolean(user?.permissions?.configuracoes?.view);
  } else if (module === 'pastoral') {
    const roleLower = (user?.role || '').toLowerCase();
    const isPastor = roleLower.includes('pastor') || roleLower.includes('presbítero') || roleLower.includes('presbitero');
    hasAccess = isPastor || Boolean(user?.permissions?.pastoral?.view);
  } else {
    const perm = (user?.permissions as any)?.[module];
    hasAccess = perm ? perm.view !== false : true;
  }

  if (!hasAccess) {
    return <AccessDeniedScreen moduleName={moduleName} isNovoUsuario={isNovoUsuario} userRole={user?.role} />;
  }

  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  const isManancial = (user.email || '').toLowerCase().trim() === 'manancial7067@gmail.com';
  if (!isManancial && user.status === 'blocked') {
    return <LicenseExpiredScreen />;
  }
  return (
    <>
      <AutoBackupRunner />
      {children}
    </>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/validar-cracha" element={<ValidarCrachaPublico />} />
      <Route path="/validar/cracha" element={<ValidarCrachaPublico />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="financeiro" element={<RestrictedRoute module="financeiro" moduleName="Financeiro"><Financeiro /></RestrictedRoute>} />
        <Route path="secretaria" element={<RestrictedRoute module="secretaria" moduleName="Secretaria"><Secretaria /></RestrictedRoute>} />
        <Route path="servico-social" element={<RestrictedRoute module="social" moduleName="Serviço Social"><ServicoSocial /></RestrictedRoute>} />
        <Route path="formularios" element={<Navigate to="/secretaria?tab=formularios" replace />} />
        <Route path="pastor" element={<RestrictedRoute module="pastoral" moduleName="Área Pastoral"><AreaPastoral /></RestrictedRoute>} />
        <Route path="area-pastoral" element={<RestrictedRoute module="pastoral" moduleName="Área Pastoral"><AreaPastoral /></RestrictedRoute>} />
        <Route path="fornecedores" element={<RestrictedRoute module="financeiro" moduleName="Fornecedores"><Fornecedores /></RestrictedRoute>} />
        <Route path="patrimonio" element={<RestrictedRoute module="patrimonio" moduleName="Patrimônio"><Patrimonio /></RestrictedRoute>} />
        <Route path="paletas-cores" element={<PaletasCores />} />
        <Route path="ajuda" element={<Ajuda />} />
        <Route path="parametros" element={<RestrictedRoute module="parametros" moduleName="Parâmetros"><Parametros /></RestrictedRoute>} />
        <Route path="configuracoes" element={<RestrictedRoute module="configuracoes" moduleName="Configurações"><Configuracoes /></RestrictedRoute>} />
        <Route path="auditoria" element={<RestrictedRoute module="configuracoes" moduleName="Auditoria"><Auditoria /></RestrictedRoute>} />
        <Route path="automacoes" element={<RestrictedRoute module="configuracoes" moduleName="Automações"><Automacoes /></RestrictedRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ColorThemeProvider>
      <TooltipProvider>
      <AuthProvider>
        <BranchProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </BranchProvider>
      </AuthProvider>
    </TooltipProvider>
    </ColorThemeProvider>
    </ThemeProvider>
  )
}
