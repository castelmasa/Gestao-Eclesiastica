import React, { Component, ErrorInfo, ReactNode } from "react";
import { logCriticalError } from "@/lib/errorLogger";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Home, ShieldAlert } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorId: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log critical exception to Firestore
    logCriticalError({
      error,
      source: "component_crash",
      severity: "critical",
      componentStack: errorInfo.componentStack || undefined,
      context: {
        location: window.location.pathname,
      },
    }).then((id) => {
      if (id) {
        this.setState({ errorId: id });
      }
    });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6 bg-background">
          <div className="max-w-xl w-full p-6 border border-destructive/30 rounded-xl bg-destructive/5 text-foreground shadow-lg space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-destructive/10 text-destructive shrink-0">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-destructive">
                  Ocorreu uma falha inesperada na interface
                </h2>
                <p className="text-sm text-muted-foreground">
                  Esta falha foi gravada automaticamente no banco de dados para análise da administração.
                </p>
                {this.state.errorId && (
                  <p className="text-xs font-mono text-muted-foreground mt-1">
                    ID do Registro: <span className="font-semibold text-foreground">{this.state.errorId}</span>
                  </p>
                )}
              </div>
            </div>

            {this.state.error && (
              <div className="p-3 rounded-md bg-muted/60 border text-xs font-mono overflow-auto max-h-36 text-destructive-foreground">
                <p className="font-semibold text-destructive">{this.state.error.name}: {this.state.error.message}</p>
                {this.state.error.stack && (
                  <pre className="mt-2 text-[10px] text-muted-foreground whitespace-pre-wrap">
                    {this.state.error.stack.split("\n").slice(0, 5).join("\n")}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={this.handleReset}>
                Tentar Restaurar
              </Button>
              <Button variant="secondary" size="sm" onClick={this.handleGoHome} className="gap-1.5">
                <Home className="w-4 h-4" />
                Ir ao Início
              </Button>
              <Button variant="default" size="sm" onClick={this.handleReload} className="gap-1.5">
                <RefreshCw className="w-4 h-4" />
                Recarregar Página
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
