import React from "react";
import { Button } from "@/components/ui/button";
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  ArrowDownCircle, 
  Layers, 
  ListFilter 
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  mode?: "pagination" | "infinite";
  onModeChange?: (mode: "pagination" | "infinite") => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  className?: string;
  itemName?: string;
}

export function TablePagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  mode = "pagination",
  onModeChange,
  onLoadMore,
  hasMore = false,
  className = "",
  itemName = "itens",
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  // Range of page buttons to show
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 pb-2 px-2 text-xs text-muted-foreground border-t border-border/50 ${className}`}
    >
      {/* Left: Info and Items per page */}
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div className="font-medium text-foreground">
          {totalItems === 0 ? (
            <span>Nenhum registro</span>
          ) : mode === "infinite" ? (
            <span>
              Exibindo <strong>1 - {endItem}</strong> de <strong>{totalItems}</strong> {itemName}
            </span>
          ) : (
            <span>
              Exibindo <strong>{startItem} - {endItem}</strong> de <strong>{totalItems}</strong> {itemName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="hidden sm:inline">Exibir:</span>
          <Select
            value={String(pageSize)}
            onValueChange={(val) => onPageSizeChange(Number(val))}
          >
            <SelectTrigger className="h-7 w-[72px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)} className="text-xs">
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {onModeChange && (
          <div className="flex items-center border rounded-md p-0.5 bg-muted/40">
            <button
              type="button"
              onClick={() => onModeChange("pagination")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                mode === "pagination"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Modo Paginação Clássica"
            >
              <ListFilter className="w-3 h-3" />
              Páginas
            </button>
            <button
              type="button"
              onClick={() => onModeChange("infinite")}
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors ${
                mode === "infinite"
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              title="Modo Rolagem / Carregamento Contínuo"
            >
              <Layers className="w-3 h-3" />
              Contínuo
            </button>
          </div>
        )}
      </div>

      {/* Right: Controls */}
      {mode === "infinite" ? (
        <div className="flex items-center gap-2">
          {hasMore && onLoadMore && (
            <Button
              variant="outline"
              size="sm"
              onClick={onLoadMore}
              className="h-8 text-xs gap-1.5 border-dashed"
            >
              <ArrowDownCircle className="w-3.5 h-3.5 text-primary" />
              Carregar Mais ({Math.min(pageSize, totalItems - endItem)} restantes)
            </Button>
          )}
          {!hasMore && totalItems > 0 && (
            <span className="text-[11px] text-muted-foreground italic">
              Todos os {totalItems} registros foram carregados
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            title="Primeira página"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            title="Página anterior"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <div className="flex items-center gap-1 mx-1">
            {getPageNumbers().map((p, idx) =>
              p === "..." ? (
                <span key={`dots-${idx}`} className="px-1 text-muted-foreground">
                  ...
                </span>
              ) : (
                <Button
                  key={`page-${p}`}
                  variant={currentPage === p ? "default" : "outline"}
                  size="icon"
                  className={`h-7 w-7 text-xs ${
                    currentPage === p ? "font-bold" : ""
                  }`}
                  onClick={() => onPageChange(Number(p))}
                >
                  {p}
                </Button>
              )
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            title="Próxima página"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            title="Última página"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
