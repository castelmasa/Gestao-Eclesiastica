import React from "react";
import { useBranch } from "@/contexts/BranchContext";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger } from "@/components/ui/select";
import { Building2, Check, ChevronDown, Globe, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export function ChurchBranchSelector() {
  const {
    activeBranch,
    setActiveBranch,
    branches,
    canChangeBranch,
    activeBranchName,
    activeBranchObj
  } = useBranch();

  const handleBranchChange = (newBranchId: string) => {
    setActiveBranch(newBranchId);
    if (newBranchId === "all") {
      toast.info("Visualização consolidada: Todas as Filiais ativada");
    } else {
      const selected = branches.find(b => b.id === newBranchId);
      const name = selected ? selected.name : "Congregação";
      toast.success(`Igreja selecionada: ${name}`);
    }
  };

  // Se o usuário não tem permissão de alternar congregação (usuário comum atribuído a uma filial)
  if (!canChangeBranch) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 dark:bg-muted/40 border border-border/80 rounded-xl text-xs font-medium text-foreground shadow-2xs transition-all hover:bg-muted/80"
        title="Igreja atribuída ao seu perfil de acesso"
      >
        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary shrink-0">
          <Building2 className="w-3.5 h-3.5" />
        </div>
        <div className="flex flex-col text-left min-w-0">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider leading-none">Igreja Designada</span>
          <span className="font-semibold text-xs text-foreground truncate max-w-[140px] sm:max-w-[200px]">
            {activeBranchName}
          </span>
        </div>
        <div className="flex items-center gap-1 pl-1 text-muted-foreground/70" title="Acesso restrito à congregação atribuída">
          <Lock className="w-3 h-3" />
        </div>
      </div>
    );
  }

  const sedeBranches = branches.filter(b => b.type === "sede");
  const filialBranches = branches.filter(b => b.type !== "sede");

  return (
    <div className="relative flex items-center">
      <Select value={activeBranch} onValueChange={handleBranchChange}>
        <SelectTrigger 
          className="h-9 sm:h-10 min-w-[130px] sm:min-w-[200px] md:min-w-[240px] max-w-[280px] bg-background/90 hover:bg-background border-border/80 hover:border-primary/50 text-xs sm:text-sm font-medium rounded-xl shadow-xs transition-all px-2.5 sm:px-3"
          aria-label="Seletor de Igreja e Filiais"
        >
          <div className="flex items-center gap-1.5 sm:gap-2 truncate text-left w-full mr-1">
            <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-lg bg-primary/10 text-primary shrink-0">
              {activeBranch === "all" ? (
                <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
              ) : (
                <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
              )}
            </div>

            <div className="flex flex-col min-w-0 truncate">
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider leading-none hidden sm:block">
                {activeBranch === "all" ? "Filtro Geral" : (activeBranchObj?.type === "sede" ? "Sede / Matriz" : "Congregação")}
              </span>
              <span className="font-semibold text-xs sm:text-sm text-foreground truncate">
                {activeBranchName}
              </span>
            </div>
          </div>
        </SelectTrigger>

        <SelectContent align="end" className="w-[300px] sm:w-[340px] p-2 rounded-xl shadow-xl">
          <div className="px-2 py-1.5 mb-1 bg-muted/40 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground">Alternar Congregação</span>
              <Badge variant="outline" className="text-[10px] font-normal py-0 px-1.5 h-4">
                Multi-Igrejas
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Selecione a igreja para filtrar relatórios, caixa e secretaria.
            </p>
          </div>

          <SelectItem value="all" className="rounded-lg py-2 cursor-pointer font-medium">
            <div className="flex items-center justify-between w-full gap-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-xs text-foreground">Todas as Filiais</span>
                  <span className="text-[10px] text-muted-foreground">Visão consolidada do ministério</span>
                </div>
              </div>
              <Badge className="bg-primary/15 text-primary hover:bg-primary/20 text-[10px] border-none font-semibold">
                Consolidado
              </Badge>
            </div>
          </SelectItem>

          <SelectSeparator className="my-1.5" />

          {sedeBranches.length > 0 && (
            <SelectGroup>
              <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                Templo Sede
              </SelectLabel>
              {sedeBranches.map(b => (
                <SelectItem key={b.id} value={b.id} className="rounded-lg py-1.5 cursor-pointer">
                  <div className="flex items-center justify-between w-full gap-2">
                    <div className="flex items-center gap-2 truncate">
                      <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div className="flex flex-col text-left truncate">
                        <span className="text-xs font-semibold text-foreground truncate">{b.name}</span>
                        {b.address && (
                          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{b.address}</span>
                        )}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px] shrink-0 font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                      Sede
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          )}

          {filialBranches.length > 0 && (
            <>
              <SelectSeparator className="my-1.5" />
              <SelectGroup>
                <SelectLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                  Filiais & Congregações ({filialBranches.length})
                </SelectLabel>
                {filialBranches.map(b => (
                  <SelectItem key={b.id} value={b.id} className="rounded-lg py-1.5 cursor-pointer">
                    <div className="flex items-center justify-between w-full gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="flex flex-col text-left truncate">
                          <span className="text-xs font-semibold text-foreground truncate">{b.name}</span>
                          {b.address && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{b.address}</span>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
                        Filial
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectGroup>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
