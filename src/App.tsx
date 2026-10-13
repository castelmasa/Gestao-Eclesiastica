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
import { Button } from "./components/ui/button"

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
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="financeiro" element={<Financeiro />} />
        <Route path="secretaria" element={<Secretaria />} />
        <Route path="servico-social" element={<ServicoSocial />} />
        <Route path="formularios" element={<Formularios />} />
        <Route path="pastor" element={<AreaPastoral />} />
        <Route path="area-pastoral" element={<AreaPastoral />} />
        <Route path="fornecedores" element={<Fornecedores />} />
        <Route path="patrimonio" element={<Patrimonio />} />
              <Route path="paletas-cores" element={<PaletasCores />} />
        <Route path="ajuda" element={<Ajuda />} />
        <Route path="parametros" element={<Parametros />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="auditoria" element={<Auditoria />} />
          <Route path="automacoes" element={<Automacoes />} />
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
