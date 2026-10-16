import React, { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { 
  HelpCircle, 
  LayoutDashboard, 
  Wallet, 
  Users, 
  Building2, 
  Settings, 
  Sliders, 
  LogOut, 
  CalendarDays, 
  Moon, 
  Sun, 
  Eye, 
  FileText,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Palette,
  HeartHandshake,
  ShieldCheck,
  Printer
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext"
import { Button } from "@/components/ui/button"
import { ChurchLogo } from "@/components/ChurchLogo"

const allNavigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard, module: "public", section: "Principal" },
  { name: "Gestor de Eventos", href: "/agenda", icon: CalendarDays, module: "public", section: "Principal" },
  { name: "Área Pastoral", href: "/pastor", icon: ShieldCheck, module: "pastoral", section: "Gestão" },
  { name: "Secretaria", href: "/secretaria", icon: Users, module: "secretaria", section: "Gestão" },
  { name: "Serviço Social", href: "/servico-social", icon: HeartHandshake, module: "social", section: "Gestão" },
  { name: "Financeiro", href: "/financeiro", icon: Wallet, module: "financeiro", section: "Gestão" },
  { name: "Patrimônio", href: "/patrimonio", icon: Building2, module: "patrimonio", section: "Gestão" },
  { name: "Fornecedores", href: "/fornecedores", icon: Building2, module: "financeiro", section: "Gestão" },
  { name: "Paletas & Cores", href: "/paletas-cores", icon: Palette, module: "public", section: "Sistema" },
  { name: "Parâmetros", href: "/parametros", icon: Sliders, module: "parametros", section: "Sistema" },
  { name: "Configurações", href: "/configuracoes", icon: Settings, module: "configuracoes", section: "Sistema" },
  { name: "Auditoria", href: "/auditoria", icon: FileText, module: "configuracoes", section: "Sistema" },
  { name: "Automações", href: "/automacoes", icon: Settings, module: "configuracoes", section: "Sistema" },
  { name: "Ajuda", href: "/ajuda", icon: HelpCircle, module: "public", section: "Sistema" },
]

export function Sidebar() {
  const location = useLocation()
  const { user, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const isAdmin = user?.role?.toLowerCase() === 'administrador'
  const isDev = Boolean(
    user?.isDeveloper ||
    user?.role?.toLowerCase() === 'desenvolvedor' ||
    user?.role?.toLowerCase() === 'developer'
  )
  const isDark = theme === "dark" || theme === "midnight" || theme === "slate" || (theme === "system" && document.documentElement.classList.contains("dark"))
  const [isHighContrast, setIsHighContrast] = useState(() => document.documentElement.classList.contains("theme-high-contrast"))
  
  // Estado de encolhimento da barra lateral com o mouse
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem("ui_sidebar_collapsed") === "true"
  })

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem("ui_sidebar_collapsed", String(next))
      window.dispatchEvent(new Event("ui_sidebar_toggle"))
      return next
    })
  }

  useEffect(() => {
    const handleToggle = () => {
      setIsCollapsed(localStorage.getItem("ui_sidebar_collapsed") === "true")
    }
    window.addEventListener("ui_sidebar_toggle", handleToggle)
    return () => window.removeEventListener("ui_sidebar_toggle", handleToggle)
  }, [])

  useEffect(() => {
    if (isHighContrast) {
      document.documentElement.classList.add("theme-high-contrast")
      localStorage.setItem("high-contrast", "true")
    } else {
      document.documentElement.classList.remove("theme-high-contrast")
      localStorage.setItem("high-contrast", "false")
    }
  }, [isHighContrast])

  const toggleTheme = () => setTheme(isDark ? "light" : "dark")
  const toggleHighContrast = () => setIsHighContrast(prev => !prev)

  // Permissões: Todos os módulos comuns são acessíveis a todos os usuários
  // Apenas Configurações, Auditoria e Automações são restritos à administração e segurança
  const navigation = allNavigation.filter(item => {
    if (item.module === 'configuracoes') {
      return isAdmin || isDev || Boolean(user?.permissions?.configuracoes?.view);
    }

    if (item.module === 'pastoral') {
      const roleLower = (user?.role || '').toLowerCase();
      const isPastor = roleLower.includes('pastor') || roleLower.includes('presbítero') || roleLower.includes('presbitero');
      return isAdmin || isDev || isPastor || Boolean(user?.permissions?.pastoral?.view);
    }
    
    // Todos os itens comuns (Dashboard, Agenda, Secretaria, Financeiro, Patrimônio, Fornecedores, Paletas & Cores, Parâmetros, Ajuda)
    // são liberados por padrão para qualquer usuário
    if (user?.permissions) {
      const modulePerms = (user.permissions as any)[item.module];
      if (modulePerms && modulePerms.view === false) {
        return false;
      }
    }
    
    return true;
  });

  return (
    <div 
      className={cn(
        "flex z-10 flex-col border-r border-border bg-card shadow-sm h-screen transition-all duration-200 select-none",
        isCollapsed ? "w-[72px]" : "w-72"
      )}
    >
      {/* Top Header com Botão de Encolher/Expandir */}
      <div className={cn(
        "flex h-16 shrink-0 items-center border-b border-border/50",
        isCollapsed ? "justify-center px-2" : "justify-between px-5"
      )}>
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="h-9 w-9 shrink-0 flex items-center justify-center p-0.5 rounded-lg bg-white/95 dark:bg-slate-800 shadow-sm ring-1 ring-border/80">
            <ChurchLogo className="h-8 w-8" />
          </div>
          {!isCollapsed && (
            <h1 className="text-[16px] font-semibold tracking-tight text-foreground truncate">
              Gestão Eclesiástica
            </h1>
          )}
        </div>

        {/* Botão de Encolher / Expandir com o Mouse */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapse}
          className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
          title={isCollapsed ? "Expandir barra lateral" : "Encolher barra lateral"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {/* Lista de Navegação */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        <nav className={cn("space-y-4", isCollapsed ? "px-2" : "px-3")}>
          {["Principal", "Gestão", "Sistema"].map((sec) => {
            const items = navigation.filter(n => (n as any).section === sec);
            if (items.length === 0) return null;
            return (
              <div key={sec} className="space-y-1">
                {!isCollapsed ? (
                  <div className="px-3 pb-1 text-[11px] font-bold tracking-wider uppercase text-muted-foreground/70">
                    {sec === "Principal" ? "Visão Geral" : sec === "Gestão" ? "Gestão Eclesiástica" : "Sistema & Apoio"}
                  </div>
                ) : (
                  <div className="my-1 border-t border-border/40 mx-2" />
                )}
                {items.map((item) => {
                  const currentFull = location.pathname + location.search;
                  const isActive = item.href.includes("?")
                    ? currentFull === item.href
                    : location.pathname === item.href && (!location.search || item.href !== "/configuracoes");
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      title={isCollapsed ? item.name : undefined}
                      className={cn(
                        "group relative flex items-center rounded-xl py-2 text-[14px] font-medium transition-all duration-150 ease-in-out",
                        isCollapsed ? "justify-center px-0 h-10 w-10 mx-auto" : "px-3",
                        isActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      )}
                    >
                      {isActive && !isCollapsed && (
                        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary-foreground/90" />
                      )}
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] flex-shrink-0 transition-colors",
                          !isCollapsed && "mr-3",
                          isActive ? "text-primary-foreground" : "text-muted-foreground/80 group-hover:text-foreground"
                        )}
                        strokeWidth={isActive ? 2.3 : 1.9}
                      />
                      {!isCollapsed && <span className="truncate">{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </div>

      {/* Footer do Usuário */}
      <div className={cn("mt-auto", isCollapsed ? "p-2" : "p-4")}>
        <div className={cn(
          "rounded-2xl border border-border/50 bg-muted/30 shadow-sm transition-all hover:bg-muted/50",
          isCollapsed ? "p-1.5 flex flex-col items-center gap-1.5" : "p-3"
        )}>
          {!isCollapsed ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center min-w-0 gap-3">
                <div className="h-9 w-9 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold ring-1 ring-primary/20">
                  {user?.name?.substring(0, 2).toUpperCase() || 'US'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-foreground truncate leading-tight">{user?.name || 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">{user?.role || 'Administrador'}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={toggleHighContrast} className={`h-8 w-8 rounded-full ${isHighContrast ? 'text-primary' : 'text-muted-foreground'} hover:text-foreground hover:bg-muted`} title="Alto Contraste">
                  <Eye className="h-[18px] w-[18px]" strokeWidth={2} />
                </Button>
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted" title={isDark ? "Modo Claro" : "Modo Escuro"}>
                  {isDark ? <Sun className="h-[18px] w-[18px]" strokeWidth={2} /> : <Moon className="h-[18px] w-[18px]" strokeWidth={2} />}
                </Button>
                <Button variant="ghost" size="icon" onClick={logout} className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Sair">
                  <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold ring-1 ring-primary/20" title={user?.name || 'Usuário'}>
                {user?.name?.substring(0, 2).toUpperCase() || 'US'}
              </div>
              <Button variant="ghost" size="icon" onClick={logout} className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10" title="Sair do Sistema">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
