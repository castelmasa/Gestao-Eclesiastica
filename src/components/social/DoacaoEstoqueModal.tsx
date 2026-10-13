import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PackagePlus, Plus } from "lucide-react";
import { SocialInventoryMovement } from "@/types/social";
import { toast } from "sonner";

interface DoacaoEstoqueModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<SocialInventoryMovement, "id" | "createdAt">) => Promise<void>;
  branches?: any[];
  activeBranch?: string;
}

export function DoacaoEstoqueModal({
  isOpen,
  onClose,
  onSave,
  branches = [],
  activeBranch,
}: DoacaoEstoqueModalProps) {
  const [origemDestino, setOrigemDestino] = useState("Campanha do Quilo / Doação de Membros");
  const [item, setItem] = useState("Cesta Básica Completa");
  const [quantidade, setQuantidade] = useState<number>(5);
  const [data, setData] = useState(() => new Date().toISOString().split("T")[0]);
  const [branchId, setBranchId] = useState(() => activeBranch !== "all" ? activeBranch || "sede" : (branches[0]?.id || "sede"));
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!origemDestino.trim()) {
      toast.error("Informe a origem ou nome do doador.");
      return;
    }
    if (quantidade <= 0) {
      toast.error("A quantidade deve ser maior que zero.");
      return;
    }

    const payload = {
      tipo: "entrada" as const,
      origemDestino: origemDestino.trim(),
      item,
      quantidade: Number(quantidade),
      data,
      branchId,
      branchName: branches.find(b => b.id === branchId)?.name || "Sede",
      responsavel: responsavel.trim() || "Diaconia / Secretaria",
      observacoes: observacoes.trim(),
    };

    setIsSaving(true);
    try {
      await onSave(payload);
      toast.success(`${quantidade} cesta(s) adicionada(s) ao estoque com sucesso!`);
      onClose();
    } catch (err) {
      console.error("Erro ao registrar doação:", err);
      toast.error("Erro ao registrar entrada no estoque.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-emerald-600" />
            <DialogTitle>Entrada de Cestas / Doação</DialogTitle>
          </div>
          <DialogDescription className="text-xs">
            Registre a chegada de novas cestas básicas ou arrecadações no estoque social da igreja.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="space-y-1">
            <Label htmlFor="origemDestino" className="text-xs font-semibold">Origem da Doação / Doador *</Label>
            <Input
              id="origemDestino"
              value={origemDestino}
              onChange={(e) => setOrigemDestino(e.target.value)}
              placeholder="Ex: Campanha do Quilo, Doação do Culto, Compras da Igreja"
              required
              className="h-9"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="itemNome" className="text-xs font-semibold">Tipo de Item</Label>
              <Select value={item} onValueChange={setItem}>
                <SelectTrigger id="itemNome" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cesta Básica Completa">Cesta Básica Completa</SelectItem>
                  <SelectItem value="Cesta Básica Simples">Cesta Básica Simples</SelectItem>
                  <SelectItem value="Kit de Limpeza & Higiene">Kit de Limpeza & Higiene</SelectItem>
                  <SelectItem value="Alimentos Diversos (Quilos)">Alimentos Diversos (Quilos)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="quantidade" className="text-xs font-semibold">Quantidade Recebida *</Label>
              <Input
                id="quantidade"
                type="number"
                min="1"
                max="500"
                value={quantidade}
                onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                required
                className="h-9 font-bold text-emerald-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="dataDoacao" className="text-xs font-semibold">Data da Entrada *</Label>
              <Input
                id="dataDoacao"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
                className="h-9"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="branchDoacao" className="text-xs font-semibold">Congregação</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger id="branchDoacao" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="responsavelReceb" className="text-xs font-semibold">Responsável pelo Recebimento</Label>
            <Input
              id="responsavelReceb"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Ex: Diácono José / Equipe da Ação Social"
              className="h-9"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              size="sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {isSaving ? "Adicionando..." : "Confirmar Entrada no Estoque"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
