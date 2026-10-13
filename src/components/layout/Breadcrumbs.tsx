import { useLocation, Link } from "react-router-dom"
import { ChevronRight, Home } from "lucide-react"

export function Breadcrumbs() {
  const location = useLocation()
  const paths = location.pathname.split('/').filter(p => p)

  if (paths.length === 0) return null

  const routeNames: Record<string, string> = {
    'agenda': 'Agenda',
    'financeiro': 'Financeiro',
    'secretaria': 'Secretaria',
    'fornecedores': 'Fornecedores',
    'patrimonio': 'Patrimônio',
    'configuracoes': 'Configurações',
    'auditoria': 'Auditoria',
    'automacoes': 'Automações',
    'parametros': 'Parâmetros',
    'ajuda': 'Ajuda',
  }

  return (
    <nav className="flex mb-4 items-center space-x-1 text-sm text-muted-foreground print:hidden">
      <Link to="/" className="hover:text-foreground flex items-center transition-colors">
        <Home className="w-4 h-4" />
      </Link>
      {paths.map((path, index) => {
        const isLast = index === paths.length - 1
        const to = "/" + paths.slice(0, index + 1).join('/')
        const name = routeNames[path] || path

        return (
          <div key={path} className="flex items-center space-x-1">
            <ChevronRight className="w-4 h-4" />
            {isLast ? (
              <span className="font-medium text-foreground capitalize">{name}</span>
            ) : (
              <Link to={to} className="hover:text-foreground transition-colors capitalize">
                {name}
              </Link>
            )}
          </div>
        )
      })}
    </nav>
  )
}
