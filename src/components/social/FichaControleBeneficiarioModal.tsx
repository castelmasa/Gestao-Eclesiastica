import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Phone,
  MapPin,
  Calendar,
  Package,
  HeartHandshake,
  Printer,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Home,
  Users
} from "lucide-react";
import { SocialBeneficiary, SocialAttendance, TIPO_AUXILIO_LABELS } from "@/types/social";
import { getChurchLeadershipConfig } from "@/lib/churchConfigHelper";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface FichaControleBeneficiarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiary: SocialBeneficiary | null;
  attendances: SocialAttendance[];
  onOpenNovoAtendimento?: (beneficiary: SocialBeneficiary) => void;
  branches?: any[];
}

export function FichaControleBeneficiarioModal({
  isOpen,
  onClose,
  beneficiary,
  attendances,
  onOpenNovoAtendimento,
  branches = [],
}: FichaControleBeneficiarioModalProps) {
  if (!beneficiary) return null;

  // Filtrar atendimentos desta pessoa
  const historicoPessoa = attendances
    .filter(a => a.beneficiaryId === beneficiary.id || (a.beneficiaryCpf && a.beneficiaryCpf === beneficiary.cpf))
    .sort((a, b) => new Date(b.dataEntrega).getTime() - new Date(a.dataEntrega).getTime());

  // Cálculo da regra de carência (30 dias padrão para cestas)
  const lastAttendanceDate = beneficiary.dataUltimoAtendimento || (historicoPessoa[0]?.dataEntrega);
  let diasDesdeUltimo = 999;
  let emCarencia = false;
  let diasRestantes = 0;

  if (lastAttendanceDate) {
    const diffMs = Date.now() - new Date(lastAttendanceDate).getTime();
    diasDesdeUltimo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diasDesdeUltimo < 30) {
      emCarencia = true;
      diasRestantes = 30 - diasDesdeUltimo;
    }
  }

  // Impressão da Versão Analítica (Completa)
  const handlePrintFichaAnalitica = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const leadership = getChurchLeadershipConfig(beneficiary.branchId, branches);

      // Cabeçalho Oficial
      doc.setFillColor(30, 41, 59);
      doc.rect(14, 12, 182, 20, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(leadership.church.name.toUpperCase(), 105, 20, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(226, 232, 240);
      const subHeader = `DEPARTAMENTO DE ASSISTÊNCIA E AÇÃO SOCIAL | CNPJ: ${leadership.church.cnpj}`;
      doc.text(subHeader, 105, 26, { align: "center" });

      // Título do Documento
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text("FICHA DE ATENDIMENTO E CONTROLE — VERSÃO ANALÍTICA", 105, 38, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      doc.text(`Emitido em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} | Documento Oficial de Acompanhamento`, 105, 43, { align: "center" });

      // Bloco 1: Dados do Beneficiário
      autoTable(doc, {
        startY: 47,
        head: [["DADOS PESSOAIS DO RESPONSÁVEL FAMILIAR", "INFORMAÇÃO"]],
        body: [
          ["Nome Completo:", beneficiary.nome || "-"],
          ["CPF / Documento:", beneficiary.cpf || "-"],
          ["RG:", beneficiary.rg || "-"],
          ["Data de Nascimento:", beneficiary.dataNascimento ? new Date(beneficiary.dataNascimento).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"],
          ["Telefone / WhatsApp:", beneficiary.telefone || "-"],
          ["Endereço Completo:", `${beneficiary.endereco || ""}, ${beneficiary.numero || "S/N"} - ${beneficiary.bairro || ""} (${beneficiary.cidade || ""})`],
          ["Ponto de Referência:", beneficiary.pontoReferencia || "-"],
          ["Congregação Atendente:", beneficiary.branchName || "Sede"],
          ["Status do Cadastro:", beneficiary.status === "ativo" ? "Ativo no Programa" : beneficiary.status === "em_acompanhamento" ? "Em Acompanhamento Pastoral" : "Arquivado"],
        ],
        theme: "grid",
        headStyles: { fillColor: [40, 50, 70], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 55, fontStyle: "bold", fillColor: [248, 250, 252] },
          1: { cellWidth: 127 },
        },
      });

      // Bloco 2: Composição Familiar e Situação Socioeconômica
      const afterBloco1Y = (doc as any).lastAutoTable?.finalY || 100;
      autoTable(doc, {
        startY: afterBloco1Y + 4,
        head: [["COMPOSIÇÃO FAMILIAR & VULNERABILIDADE", "DETALHAMENTO"]],
        body: [
          ["Quantidade de Membros na Casa:", `${beneficiary.quantidadeMembrosFamilia || 1} pessoa(s)`],
          ["Crianças / Menores de Idade:", `${beneficiary.quantidadeCriancas || 0} criança(s)`],
          ["Renda Familiar Estimada:", beneficiary.rendaFamiliar ? `R$ ${beneficiary.rendaFamiliar.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "Sem renda fixa comprovada"],
          ["Tipo de Moradia:", beneficiary.tipoMoradia === "propria" ? "Própria" : beneficiary.tipoMoradia === "alugada" ? "Alugada" : beneficiary.tipoMoradia === "cedida" ? "Cedida / Favor" : "Outro"],
          ["Benefícios Sociais Recebidos:", (beneficiary.beneficiosSociais && beneficiary.beneficiosSociais.length > 0) ? beneficiary.beneficiosSociais.join(", ") : "Nenhum informado"],
          ["Situação / Necessidade Principal:", beneficiary.situacaoVulnerabilidade || "Assistência alimentar e pastoral básica"],
          ["Total de Cestas Recebidas:", `${beneficiary.totalCestasRecebidas || historicoPessoa.length} entrega(s)`],
          ["Data do Último Atendimento:", lastAttendanceDate ? new Date(lastAttendanceDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Nenhum registro anterior"],
          ["Situação de Carência (Regra 30 dias):", emCarencia ? `Em carência (restam ${diasRestantes} dias para nova cesta)` : "Liberado para atendimento de cesta"],
        ],
        theme: "grid",
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 65, fontStyle: "bold", fillColor: [248, 250, 252] },
          1: { cellWidth: 117 },
        },
      });

      // Bloco 3: Histórico de Atendimentos
      const afterBloco2Y = (doc as any).lastAutoTable?.finalY || 160;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text("HISTÓRICO CRONOLÓGICO DE ATENDIMENTOS E BENEFÍCIOS ENTREGUES:", 14, afterBloco2Y + 6);

      const rowsHistorico = historicoPessoa.slice(0, 8).map((h) => [
        h.dataEntrega ? new Date(h.dataEntrega).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-",
        TIPO_AUXILIO_LABELS[h.tipoAuxilio] || h.tipoAuxilio,
        h.quantidade ? `${h.quantidade} un.` : "1 un.",
        h.responsavelEntrega || "Diaconia",
        h.motivoAtendimento || h.descricaoItens || "-",
      ]);

      if (rowsHistorico.length === 0) {
        rowsHistorico.push(["-", "Nenhum atendimento registrado até o momento", "-", "-", "-"]);
      }

      autoTable(doc, {
        startY: afterBloco2Y + 8,
        head: [["Data", "Tipo de Auxílio", "Qtd", "Responsável", "Observação / Motivo"]],
        body: rowsHistorico,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 22 },
          1: { cellWidth: 46 },
          2: { cellWidth: 16, halign: "center" },
          3: { cellWidth: 40 },
          4: { cellWidth: 58 },
        },
      });

      // Assinaturas Oficiais (Pegas do Módulo de Configurações!)
      const afterTabelaY = (doc as any).lastAutoTable?.finalY || 220;
      const sigY = Math.max(afterTabelaY + 14, 240);

      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);

      // Linha 1: Beneficiário
      doc.line(16, sigY, 68, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(beneficiary.nome.substring(0, 32), 42, sigY + 4, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text("Beneficiário(a) / Recebedor(a)", 42, sigY + 7, { align: "center" });

      // Linha 2: Secretaria / Serviço Social (Vindo de Configurações)
      doc.line(76, sigY, 128, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(leadership.secretaria.name.substring(0, 32), 102, sigY + 4, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text("Secretaria / Assistência Social", 102, sigY + 7, { align: "center" });

      // Linha 3: Pastor Titular / Presidente (Vindo de Configurações)
      doc.line(136, sigY, 188, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(leadership.pastor.name.substring(0, 32), 162, sigY + 4, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text("Pastor Dirigente / Presidente", 162, sigY + 7, { align: "center" });

      // Rodapé
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `${leadership.church.name} — Documento de Controle da Assistência Social.`,
        105,
        286,
        { align: "center" }
      );

      const safeBenName = (beneficiary?.nome || (beneficiary as any)?.name || "beneficiario").toLowerCase().replace(/\s+/g, "-");
      doc.save(`ficha-analitica-social-${safeBenName}.pdf`);
      toast.success("Ficha Analítica gerada com sucesso!");
    } catch (e) {
      console.error("Erro ao gerar PDF da ficha:", e);
      toast.error("Erro ao gerar o PDF da ficha analítica.");
    }
  };

  // Impressão da Versão Simplificada (Rápida A4)
  const handlePrintFichaSimplificada = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const leadership = getChurchLeadershipConfig(beneficiary.branchId, branches);

      // Borda decorativa A4
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.5);
      doc.rect(10, 10, 190, 277);

      // Cabeçalho Oficial
      doc.setFillColor(15, 23, 42);
      doc.rect(14, 14, 182, 18, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(leadership.church.name.toUpperCase(), 105, 21, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(203, 213, 225);
      doc.text(`AÇÃO SOCIAL & DIACONIA — COMPROVANTE DE ATENDIMENTO E ENTREGA`, 105, 27, { align: "center" });

      // Título
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text("RECIBO & FICHA SIMPLIFICADA DE CESTA BÁSICA", 105, 39, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")} | Via Oficial da Igreja`, 105, 44, { align: "center" });

      // Bloco: Identificação do Beneficiário
      autoTable(doc, {
        startY: 48,
        head: [["DADOS DO BENEFICIÁRIO / ATENDIDO", "REGISTRO"]],
        body: [
          ["Nome Completo:", beneficiary.nome || "-"],
          ["CPF / Documento:", beneficiary.cpf || "Não informado"],
          ["RG:", beneficiary.rg || "Não informado"],
          ["Telefone / WhatsApp:", beneficiary.telefone || "Não informado"],
          ["Endereço:", `${beneficiary.endereco || ""}, ${beneficiary.numero || "S/N"} - ${beneficiary.bairro || ""} (${beneficiary.cidade || ""})`],
          ["Ponto de Referência:", beneficiary.pontoReferencia || "-"],
          ["Congregação:", beneficiary.branchName || "Sede"],
        ],
        theme: "grid",
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
        styles: { fontSize: 8, cellPadding: 2.2 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: "bold", fillColor: [248, 250, 252] },
          1: { cellWidth: 132 },
        },
      });

      // Bloco: Auxílio Concedido
      const afterB1Y = (doc as any).lastAutoTable?.finalY || 105;
      autoTable(doc, {
        startY: afterB1Y + 5,
        head: [["DISCRIMINAÇÃO DO AUXÍLIO / DOAÇÃO", "DETALHES DA CONCESSÃO"]],
        body: [
          ["Tipo de Benefício:", "Cesta Básica de Alimentos"],
          ["Quantidade Concedida:", "01 Unidade"],
          ["Data da Concessão:", new Date().toLocaleDateString("pt-BR")],
          ["Finalidade / Motivo:", beneficiary.situacaoVulnerabilidade || "Assistência alimentar e amparo emergencial à família"],
          ["Total de Cestas Anteriores:", `${beneficiary.totalCestasRecebidas || historicoPessoa.length} entrega(s)`],
        ],
        theme: "grid",
        headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
        styles: { fontSize: 8, cellPadding: 2.2 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: "bold", fillColor: [248, 250, 252] },
          1: { cellWidth: 132 },
        },
      });

      // Bloco: Termo de Recebimento
      const afterB2Y = (doc as any).lastAutoTable?.finalY || 160;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.rect(14, afterB2Y + 6, 182, 28, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text("DECLARAÇÃO E TERMO DE RECEBIMENTO:", 18, afterB2Y + 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);
      const termo = `Declaro que recebi gratuitamente da ${leadership.church.name} o auxílio de alimentação acima discriminado, destinado exclusivamente à subsistência de minha família, atestando a veracidade das informações prestadas ao serviço social da igreja.`;
      doc.text(doc.splitTextToSize(termo, 174), 18, afterB2Y + 18);

      // Assinaturas
      const sigY = afterB2Y + 56;
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);

      // Assinatura 1: Beneficiário
      doc.line(20, sigY, 90, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(beneficiary.nome.substring(0, 32), 55, sigY + 4, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text("Assinatura do(a) Beneficiário(a)", 55, sigY + 7, { align: "center" });

      // Assinatura 2: Responsável / Igreja
      doc.line(120, sigY, 190, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.text(leadership.secretaria.name.substring(0, 32), 155, sigY + 4, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text("Responsável pela Entrega / Serviço Social", 155, sigY + 7, { align: "center" });

      // Rodapé
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `${leadership.church.name} — Valparaíso/SP — Documento de Controle da Assistência Social.`,
        105,
        282,
        { align: "center" }
      );

      const safeBenName = (beneficiary?.nome || (beneficiary as any)?.name || "beneficiario").toLowerCase().replace(/\s+/g, "-");
      doc.save(`ficha-simplificada-social-${safeBenName}.pdf`);
      toast.success("Ficha Simplificada gerada com sucesso!");
    } catch (e) {
      console.error("Erro ao gerar PDF da ficha simplificada:", e);
      toast.error("Erro ao gerar a ficha simplificada.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[720px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 bg-muted/30 border-b">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-rose-600" />
                <DialogTitle className="text-xl font-bold">Ficha de Controle do Beneficiário</DialogTitle>
              </div>
              <DialogDescription className="text-xs mt-1">
                Acompanhamento socioeconômico e histórico completo de atendimentos e cestas básicas.
              </DialogDescription>
            </div>
            {emCarencia ? (
              <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-semibold text-xs py-1">
                <Clock className="w-3.5 h-3.5 mr-1" />
                Em Carência ({diasRestantes} dias)
              </Badge>
            ) : (
              <Badge variant="outline" className="border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold text-xs py-1">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                Liberado para Cesta
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Cartão de Identificação Principal */}
          <div className="bg-card rounded-xl border p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {beneficiary.nome.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base leading-tight text-foreground">{beneficiary.nome}</h3>
                  <p className="text-xs text-muted-foreground">CPF: {beneficiary.cpf || "Não informado"} {beneficiary.rg ? `| RG: ${beneficiary.rg}` : ""}</p>
                </div>
              </div>
              <Badge className={
                beneficiary.status === "ativo" 
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                  : beneficiary.status === "em_acompanhamento" 
                  ? "bg-blue-600 text-white" 
                  : "bg-slate-500 text-white"
              }>
                {beneficiary.status === "ativo" ? "Ativo" : beneficiary.status === "em_acompanhamento" ? "Em Acompanhamento" : "Arquivado"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-foreground font-medium">{beneficiary.telefone || "Sem telefone"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Nascimento: <strong className="text-foreground">{beneficiary.dataNascimento ? new Date(beneficiary.dataNascimento).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"}</strong></span>
              </div>
              <div className="flex items-start gap-2 text-muted-foreground sm:col-span-2">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground">
                  {beneficiary.endereco}, {beneficiary.numero || "S/N"} - {beneficiary.bairro} ({beneficiary.cidade})
                  {beneficiary.pontoReferencia && ` - Ref: ${beneficiary.pontoReferencia}`}
                </span>
              </div>
            </div>
          </div>

          {/* Indicadores Socioeconômicos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/30 border rounded-lg p-3 text-center">
              <Users className="h-4 w-4 mx-auto text-blue-600 mb-1" />
              <div className="text-[11px] text-muted-foreground">Família</div>
              <div className="font-bold text-sm text-foreground">{beneficiary.quantidadeMembrosFamilia || 1} pessoas</div>
            </div>
            <div className="bg-muted/30 border rounded-lg p-3 text-center">
              <User className="h-4 w-4 mx-auto text-amber-600 mb-1" />
              <div className="text-[11px] text-muted-foreground">Crianças</div>
              <div className="font-bold text-sm text-foreground">{beneficiary.quantidadeCriancas || 0} menores</div>
            </div>
            <div className="bg-muted/30 border rounded-lg p-3 text-center">
              <DollarSign className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
              <div className="text-[11px] text-muted-foreground">Renda Fam.</div>
              <div className="font-bold text-sm text-foreground">
                {beneficiary.rendaFamiliar ? `R$ ${beneficiary.rendaFamiliar}` : "Sem renda"}
              </div>
            </div>
            <div className="bg-muted/30 border rounded-lg p-3 text-center">
              <Package className="h-4 w-4 mx-auto text-purple-600 mb-1" />
              <div className="text-[11px] text-muted-foreground">Cestas Entregues</div>
              <div className="font-bold text-sm text-foreground">{beneficiary.totalCestasRecebidas || historicoPessoa.length} un.</div>
            </div>
          </div>

          {/* Programas Sociais & Situação */}
          {(beneficiary.situacaoVulnerabilidade || (beneficiary.beneficiosSociais && beneficiary.beneficiosSociais.length > 0)) && (
            <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl p-3.5 text-xs space-y-1.5">
              <div className="font-semibold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-rose-600" />
                Situação & Vulnerabilidade Social:
              </div>
              <p className="text-rose-800 dark:text-rose-300">
                {beneficiary.situacaoVulnerabilidade || "Assistência alimentar e acompanhamento espiritual/pastoral."}
              </p>
              {beneficiary.beneficiosSociais && beneficiary.beneficiosSociais.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-muted-foreground text-[11px]">Programas do Governo:</span>
                  {beneficiary.beneficiosSociais.map((b, i) => (
                    <Badge key={i} variant="secondary" className="text-[10px] px-2 py-0">
                      {b}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Histórico de Entregas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <Package className="h-4 w-4 text-primary" />
                Histórico de Auxílios & Cestas Recebidas ({historicoPessoa.length})
              </h4>
              {onOpenNovoAtendimento && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10"
                  onClick={() => {
                    onClose();
                    onOpenNovoAtendimento(beneficiary);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" /> Nova Entrega
                </Button>
              )}
            </div>

            {historicoPessoa.length === 0 ? (
              <div className="border border-dashed rounded-lg p-6 text-center text-xs text-muted-foreground">
                Nenhum atendimento ou cesta registrada para este beneficiário ainda.
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden divide-y text-xs">
                {historicoPessoa.map((item) => (
                  <div key={item.id} className="p-3 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-semibold text-foreground flex items-center gap-2">
                        <span>{TIPO_AUXILIO_LABELS[item.tipoAuxilio] || item.tipoAuxilio}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                          {item.quantidade} un.
                        </Badge>
                      </div>
                      <div className="text-muted-foreground text-[11px]">
                        {item.motivoAtendimento || item.descricaoItens || "Entrega de cesta básica padrão"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Responsável: <strong className="text-foreground">{item.responsavelEntrega}</strong>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-foreground">
                        {item.dataEntrega ? new Date(item.dataEntrega).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-medium">Entregue</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-4 bg-muted/20 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <Button variant="outline" onClick={onClose} size="sm">
            Fechar
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handlePrintFichaSimplificada}
              variant="outline"
              className="border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 font-semibold text-xs"
              size="sm"
            >
              <Printer className="mr-1.5 h-3.5 w-3.5 text-slate-600" /> Ficha Simplificada
            </Button>
            <Button
              onClick={handlePrintFichaAnalitica}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs"
              size="sm"
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" /> Ficha Analítica (Completa)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
