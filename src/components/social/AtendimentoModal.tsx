import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Package, Printer, Check, HeartHandshake, User, Calendar } from "lucide-react";
import {
  SocialBeneficiary,
  SocialAttendance,
  TipoAuxilioSocial,
  TIPO_AUXILIO_LABELS
} from "@/types/social";
import { getChurchLeadershipConfig } from "@/lib/churchConfigHelper";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface AtendimentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiaries: SocialBeneficiary[];
  selectedBeneficiary?: SocialBeneficiary | null;
  onSave: (data: Omit<SocialAttendance, "id" | "createdAt">, abaterEstoque: boolean) => Promise<void>;
  branches?: any[];
  activeBranch?: string;
}

export function AtendimentoModal({
  isOpen,
  onClose,
  beneficiaries,
  selectedBeneficiary,
  onSave,
  branches = [],
  activeBranch,
}: AtendimentoModalProps) {
  const [beneficiaryId, setBeneficiaryId] = useState<string>("");
  const [tipoAuxilio, setTipoAuxilio] = useState<TipoAuxilioSocial>("cesta_basica_padrao");
  const [quantidade, setQuantidade] = useState<number>(1);
  const [dataEntrega, setDataEntrega] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [branchId, setBranchId] = useState<string>("sede");
  const [responsavelEntrega, setResponsavelEntrega] = useState<string>("");
  const [motivoAtendimento, setMotivoAtendimento] = useState<string>("");
  const [descricaoItens, setDescricaoItens] = useState<string>("1x Cesta de alimentos não-perecíveis padrão");
  const [abaterEstoque, setAbaterEstoque] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (selectedBeneficiary) {
      setBeneficiaryId(selectedBeneficiary.id);
      setBranchId(selectedBeneficiary.branchId || (activeBranch !== "all" ? activeBranch || "sede" : "sede"));
    } else {
      setBeneficiaryId("");
      setBranchId(activeBranch !== "all" ? activeBranch || "sede" : (branches[0]?.id || "sede"));
    }
  }, [selectedBeneficiary, activeBranch, branches]);

  const activeBen = beneficiaries.find(b => b.id === beneficiaryId) || selectedBeneficiary;

  const handlePrintRecibo = (atendimentoData: any) => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const leadership = getChurchLeadershipConfig(atendimentoData.branchId, branches);

      // Topo Institucional
      doc.setFillColor(30, 41, 59);
      doc.rect(14, 12, 182, 18, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(leadership.church.name.toUpperCase(), 105, 19, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(226, 232, 240);
      doc.text(`SERVIÇO DE ASSISTÊNCIA SOCIAL | COMPROVANTE & RECIBO DE ENTREGA`, 105, 25, { align: "center" });

      // Dados do Recibo
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("RECIBO DE ENTREGA DE BENEFÍCIO SOCIAL", 105, 38, { align: "center" });

      autoTable(doc, {
        startY: 44,
        head: [["CAMPO", "DETALHES DO ATENDIMENTO"]],
        body: [
          ["Beneficiário(a):", atendimentoData.beneficiaryName || "-"],
          ["CPF / Documento:", atendimentoData.beneficiaryCpf || "-"],
          ["Telefone / Contato:", atendimentoData.beneficiaryTelefone || "-"],
          ["Endereço:", atendimentoData.beneficiaryEndereco || "-"],
          ["Tipo de Benefício:", TIPO_AUXILIO_LABELS[atendimentoData.tipoAuxilio as TipoAuxilioSocial] || atendimentoData.tipoAuxilio],
          ["Quantidade:", `${atendimentoData.quantidade || 1} unidade(s)`],
          ["Descrição dos Itens:", atendimentoData.descricaoItens || "Cesta de alimentos"],
          ["Data da Concessão:", new Date(atendimentoData.dataEntrega).toLocaleDateString("pt-BR", { timeZone: "UTC" })],
          ["Responsável pela Entrega:", atendimentoData.responsavelEntrega || "Diaconia / Assistência Social"],
          ["Motivo / Situação Social:", atendimentoData.motivoAtendimento || "Assistência alimentar emergencial"],
        ],
        theme: "grid",
        headStyles: { fillColor: [40, 50, 70], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
        styles: { fontSize: 8, cellPadding: 2.2 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: "bold", fillColor: [248, 250, 252] },
          1: { cellWidth: 132 },
        },
      });

      // Termo de Declaração
      const afterTableY = (doc as any).lastAutoTable?.finalY || 120;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(
        "Declaro que recebi gratuitamente da instituição religiosa acima identificada o benefício assistencial especificado neste documento, destinado ao sustento e amparo familiar.",
        14,
        afterTableY + 8,
        { maxWidth: 182, align: "justify" }
      );

      // Assinaturas Oficiais (Pegas de Configurações!)
      const sigY = afterTableY + 34;

      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);

      // Assinatura do Beneficiário
      doc.line(16, sigY, 70, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(atendimentoData.beneficiaryName?.substring(0, 32) || "Beneficiário", 43, sigY + 4, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text("Assinatura do(a) Recebedor(a)", 43, sigY + 7, { align: "center" });

      // Assinatura da Secretaria / Assistência Social (De Configurações)
      doc.line(76, sigY, 130, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(leadership.secretaria.name.substring(0, 32), 103, sigY + 4, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text("Secretaria / Ação Social", 103, sigY + 7, { align: "center" });

      // Assinatura do Pastor (De Configurações)
      doc.line(136, sigY, 190, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(leadership.pastor.name.substring(0, 32), 163, sigY + 4, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text("Pastor Dirigente / Presidente", 163, sigY + 7, { align: "center" });

      // Segunda via destacável na mesma folha
      doc.setDrawColor(203, 213, 225);
      doc.setLineDashPattern([2, 2], 0);
      doc.line(14, 150, 196, 150);
      doc.setLineDashPattern([], 0);
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text("- - - - - - - - - - - - - - - - - - - - - - - - -  (CANHOTO PARA ARQUIVO DA SECRETARIA)  - - - - - - - - - - - - - - - - - - - - - - - - -", 105, 149, { align: "center" });

      // Canhoto da Secretaria
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(`COMPROVANTE DE ARQUIVAMENTO - ${leadership.church.name.toUpperCase()}`, 14, 158);

      autoTable(doc, {
        startY: 161,
        head: [["Beneficiário", "Documento", "Auxílio Entregue", "Data", "Visto da Secretaria"]],
        body: [
          [
            atendimentoData.beneficiaryName,
            atendimentoData.beneficiaryCpf,
            `${TIPO_AUXILIO_LABELS[atendimentoData.tipoAuxilio as TipoAuxilioSocial] || atendimentoData.tipoAuxilio} (${atendimentoData.quantidade} un.)`,
            new Date(atendimentoData.dataEntrega).toLocaleDateString("pt-BR", { timeZone: "UTC" }),
            leadership.secretaria.name
          ]
        ],
        theme: "grid",
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2 }
      });

      doc.save(`recibo-cesta-${atendimentoData.beneficiaryName?.toLowerCase().replace(/\s+/g, "-")}.pdf`);
      toast.success("Recibo impresso com sucesso!");
    } catch (e) {
      console.error("Erro ao gerar recibo:", e);
      toast.error("Erro ao gerar PDF do recibo.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beneficiaryId) {
      toast.error("Selecione o beneficiário que receberá o auxílio.");
      return;
    }
    const ben = beneficiaries.find(b => b.id === beneficiaryId);
    if (!ben) {
      toast.error("Beneficiário não encontrado.");
      return;
    }

    const payload = {
      beneficiaryId: ben.id,
      beneficiaryName: ben.nome,
      beneficiaryCpf: ben.cpf,
      beneficiaryTelefone: ben.telefone,
      beneficiaryEndereco: `${ben.endereco}, ${ben.numero || "S/N"} - ${ben.bairro}`,
      branchId: branchId || ben.branchId || "sede",
      branchName: branches.find(b => b.id === branchId)?.name || ben.branchName || "Sede",
      tipoAuxilio,
      descricaoItens,
      quantidade: Number(quantidade) || 1,
      dataEntrega,
      responsavelEntrega: responsavelEntrega.trim() || "Diaconia / Assistência Social",
      motivoAtendimento: motivoAtendimento.trim(),
      reciboAssinado: true,
      status: "entregue" as const
    };

    setIsSaving(true);
    try {
      await onSave(payload, abaterEstoque);
      toast.success("Atendimento registrado com sucesso!");
      handlePrintRecibo(payload);
      onClose();
    } catch (err) {
      console.error("Erro ao salvar atendimento:", err);
      toast.error("Erro ao registrar atendimento.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 bg-muted/30 border-b">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-rose-600" />
            <DialogTitle className="text-xl font-bold">Registrar Atendimento / Entrega de Auxílio</DialogTitle>
          </div>
          <DialogDescription className="text-xs mt-1">
            Lance a entrega de cesta básica, kit de higiene ou outro auxílio social para a família beneficiária.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Seleção do Beneficiário */}
          <div className="space-y-1.5">
            <Label htmlFor="beneficiarySelect" className="font-semibold text-xs">
              Beneficiário / Família Assistida *
            </Label>
            {selectedBeneficiary ? (
              <div className="p-2.5 bg-muted/40 rounded-lg border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <div>
                    <div className="font-bold text-sm text-foreground">{selectedBeneficiary.nome}</div>
                    <div className="text-[11px] text-muted-foreground">CPF: {selectedBeneficiary.cpf || "-"} | Tel: {selectedBeneficiary.telefone}</div>
                  </div>
                </div>
              </div>
            ) : (
              <Select value={beneficiaryId} onValueChange={setBeneficiaryId}>
                <SelectTrigger id="beneficiarySelect" className="h-9">
                  <SelectValue placeholder="Selecione a pessoa beneficiária..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {beneficiaries.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.nome} ({b.cpf || "Sem CPF"}) - {b.bairro}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Tipo de Auxílio e Quantidade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="tipoAuxilio" className="font-semibold text-xs">Tipo de Auxílio *</Label>
              <Select value={tipoAuxilio} onValueChange={(v) => {
                setTipoAuxilio(v as TipoAuxilioSocial);
                if (v === 'cesta_basica_padrao') setDescricaoItens("1x Cesta de alimentos não-perecíveis padrão");
                else if (v === 'cesta_emergencial') setDescricaoItens("1x Cesta básica emergencial de mantimentos rápidos");
                else if (v === 'higiene_limpeza') setDescricaoItens("1x Kit de produtos de higiene pessoal e limpeza");
                else if (v === 'leite_infantil') setDescricaoItens("Leite em pó e alimentos infantis");
              }}>
                <SelectTrigger id="tipoAuxilio" className="h-9">
                  <SelectValue placeholder="Selecione o auxílio..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPO_AUXILIO_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quantidade" className="font-semibold text-xs">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                min="1"
                max="50"
                value={quantidade}
                onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                className="h-9"
                required
              />
            </div>
          </div>

          {/* Data da Entrega e Congregação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dataEntrega" className="font-semibold text-xs">Data da Entrega *</Label>
              <Input
                id="dataEntrega"
                type="date"
                value={dataEntrega}
                onChange={(e) => setDataEntrega(e.target.value)}
                className="h-9"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branchSelect" className="font-semibold text-xs">Congregação Atendente</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger id="branchSelect" className="h-9">
                  <SelectValue placeholder="Selecione a unidade..." />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Responsável pela Entrega */}
          <div className="space-y-1.5">
            <Label htmlFor="responsavelEntrega" className="font-semibold text-xs">Responsável pela Entrega / Diácono</Label>
            <Input
              id="responsavelEntrega"
              value={responsavelEntrega}
              onChange={(e) => setResponsavelEntrega(e.target.value)}
              placeholder="Ex: Diácono Marcos / Irmã Maria (Ação Social)"
              className="h-9"
            />
          </div>

          {/* Descrição dos Itens e Motivo */}
          <div className="space-y-1.5">
            <Label htmlFor="descricaoItens" className="font-semibold text-xs">Descrição dos Itens / Conteúdo</Label>
            <Input
              id="descricaoItens"
              value={descricaoItens}
              onChange={(e) => setDescricaoItens(e.target.value)}
              placeholder="Ex: 1 Cesta com Arroz, Feijão, Óleo, Açúcar, Macarrão..."
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="motivoAtendimento" className="font-semibold text-xs">Motivo / Parecer Social do Atendimento</Label>
            <Textarea
              id="motivoAtendimento"
              value={motivoAtendimento}
              onChange={(e) => setMotivoAtendimento(e.target.value)}
              placeholder="Descreva a necessidade da família (ex: desemprego recente, necessidade de reforço alimentar para os filhos)..."
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Abater do Estoque */}
          {tipoAuxilio.includes("cesta") && (
            <div className="flex items-center space-x-2 pt-1 bg-muted/20 p-2.5 rounded-lg border">
              <Checkbox
                id="abaterEstoque"
                checked={abaterEstoque}
                onCheckedChange={(c) => setAbaterEstoque(Boolean(c))}
              />
              <Label htmlFor="abaterEstoque" className="text-xs cursor-pointer leading-tight">
                Abater <strong>{quantidade} unidade(s)</strong> automaticamente do saldo de Cestas Básicas em estoque da congregação.
              </Label>
            </div>
          )}

          <DialogFooter className="p-4 bg-muted/20 border-t flex flex-row items-center justify-between -mx-5 -mb-5">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm"
              size="sm"
            >
              <Package className="mr-1.5 h-4 w-4" />
              {isSaving ? "Gravando..." : "Registrar e Emitir Recibo"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
