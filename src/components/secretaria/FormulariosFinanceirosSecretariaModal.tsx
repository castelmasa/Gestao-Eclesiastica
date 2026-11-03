import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Printer,
  Download,
  TrendingUp,
  TrendingDown,
  UserCheck,
  Calculator,
  Calendar,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { printDocument, downloadElementAsPdf } from "@/lib/printUtils";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";
import { getChurchLeadershipConfig } from "@/lib/churchConfigHelper";
import { useBranch } from "@/contexts/BranchContext";

interface FormulariosFinanceirosSecretariaModalProps {
  isOpen: boolean;
  onClose: () => void;
  churchData?: any;
  activeBranchName?: string;
  activeBranchId?: string;
}

export function FormulariosFinanceirosSecretariaModal({
  isOpen,
  onClose,
  churchData,
  activeBranchName = "2ª Congregação",
  activeBranchId = "sede",
}: FormulariosFinanceirosSecretariaModalProps) {
  const { branches, userRestrictedBranch } = useBranch();
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    userRestrictedBranch || activeBranchId || "sede"
  );
  const [activeTab, setActiveTab] = useState<'entradas' | 'saidas' | 'dizimista' | 'fechamento'>('entradas');

  // Nomes para os formulários
  const [mesAnoReferencia, setMesAnoReferencia] = useState<string>(() => {
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const now = new Date();
    return `${months[now.getMonth()]} / ${now.getFullYear()}`;
  });

  // Carrega institucional e liderança com base na congregação selecionada
  const leadership = useMemo(() => {
    return getChurchLeadershipConfig(selectedBranchId, branches);
  }, [selectedBranchId, branches]);

  // Logotipo prioritário dos parâmetros da igreja
  const churchLogo = useMemo(() => {
    return (
      getRegisteredChurchLogo(selectedBranchId) ||
      leadership.church.logoUrl ||
      churchData?.logoDataUrl ||
      churchData?.logoUrl ||
      null
    );
  }, [selectedBranchId, leadership.church.logoUrl, churchData]);

  const churchName = leadership.church.name || churchData?.nome || `IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO`;
  const churchAddress = `${leadership.church.address || churchData?.endereco || "Rua Bartolomeu Bueno, nº 629"}${leadership.church.bairro ? ` - ${leadership.church.bairro}` : ''} - ${leadership.church.cidade || "Valparaíso/SP"}`;
  const churchCnpj = leadership.church.cnpj || churchData?.cnpj || "51.105.484/0001-74";

  const nomeTesoureiro = leadership.tesoureiro.name || "Carlos Roberto";
  const tesoureiroSignature = leadership.tesoureiro.signatureUrl;

  const nomePastor = leadership.pastor.name || "Pr. Samuel de Oliveira";
  const pastorSignature = leadership.pastor.signatureUrl;

  const cf1Name = leadership.conselhoFiscal?.cf1?.name || "";
  const cf1Signature = leadership.conselhoFiscal?.cf1?.signatureUrl || "";
  const cf2Name = leadership.conselhoFiscal?.cf2?.name || "";
  const cf2Signature = leadership.conselhoFiscal?.cf2?.signatureUrl || "";
  const cf3Name = leadership.conselhoFiscal?.cf3?.name || "";
  const cf3Signature = leadership.conselhoFiscal?.cf3?.signatureUrl || "";

  const handlePrintForm = () => {
    printDocument({
      elementId: `formulario-financeiro-print-${activeTab}`,
      title: `Formulario_${activeTab.toUpperCase()}_${selectedBranchId}`,
    });
  };

  const handleDownloadPdf = async () => {
    const toastId = toast.loading("Gerando PDF do Formulário Financeiro...");
    const success = await downloadElementAsPdf(
      `formulario-financeiro-print-${activeTab}`,
      `Formulario_${activeTab.toUpperCase()}_${selectedBranchId}.pdf`
    );
    if (success) {
      toast.success("PDF baixado com sucesso!", { id: toastId });
    } else {
      toast.error("Erro ao gerar PDF. Utilize o botão Imprimir.", { id: toastId });
    }
  };

  // Render do Logotipo Oficial sem cortes nem badges pretas improvisadas
  // Render do Logotipo Oficial sem cortes nem badges pretas improvisadas
  const renderOfficialLogo = () => {
    const effectiveLogo = churchLogo || getRegisteredChurchLogo(selectedBranchId);
    return (
      <img
        src={effectiveLogo}
        alt="Logotipo Oficial da Igreja"
        className="h-14 max-w-[48mm] object-contain block"
        crossOrigin="anonymous"
      />
    );
  };

  // Render das Assinaturas Oficiais (Pastor, Tesoureiro e Conselho Fiscal)
  const renderSignaturesBlock = (isFechamento = false) => {
    return (
      <div className="pt-6 border-t-2 border-slate-900 mt-auto">
        <div className="grid grid-cols-2 gap-10 text-center mb-4">
          {/* Tesoureiro */}
          <div>
            <div className="h-12 flex items-end justify-center mb-1">
              {tesoureiroSignature ? (
                <img
                  src={tesoureiroSignature}
                  alt="Assinatura Tesoureiro"
                  className="max-h-12 object-contain"
                  crossOrigin="anonymous"
                />
              ) : null}
            </div>
            <div className="border-t-2 border-slate-900 w-64 mx-auto pt-1">
              <p className="text-xs font-black uppercase text-slate-950">{nomeTesoureiro}</p>
              <p className="text-[10px] text-slate-600 font-bold">1º Tesoureiro(a) / Conferente</p>
            </div>
          </div>

          {/* Pastor */}
          <div>
            <div className="h-12 flex items-end justify-center mb-1">
              {pastorSignature ? (
                <img
                  src={pastorSignature}
                  alt="Assinatura Pastor"
                  className="max-h-12 object-contain"
                  crossOrigin="anonymous"
                />
              ) : null}
            </div>
            <div className="border-t-2 border-slate-900 w-64 mx-auto pt-1">
              <p className="text-xs font-black uppercase text-slate-950">{nomePastor}</p>
              <p className="text-[10px] text-slate-600 font-bold">Pastor Titular / Presidente</p>
            </div>
          </div>
        </div>

        {/* Se for Fechamento de Caixa, adiciona o Conselho Fiscal */}
        {isFechamento && (
          <div className="pt-3 border-t border-dashed border-slate-400">
            <p className="text-[10px] font-black uppercase text-center tracking-widest text-slate-700 mb-3">
              COMISSÃO DE EXAME DE CONTAS / CONSELHO FISCAL
            </p>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="h-10 flex items-end justify-center mb-1">
                  {cf1Signature ? (
                    <img
                      src={cf1Signature}
                      alt="Assinatura CF1"
                      className="max-h-10 object-contain"
                      crossOrigin="anonymous"
                    />
                  ) : null}
                </div>
                <div className="border-t-2 border-slate-900 w-44 mx-auto pt-1">
                  <p className="text-[11px] font-black uppercase text-slate-950 truncate">
                    {cf1Name || "1º Conselheiro(a) Fiscal"}
                  </p>
                  <p className="text-[9px] text-slate-600 font-bold">Relator / 1º Membro</p>
                </div>
              </div>

              <div>
                <div className="h-10 flex items-end justify-center mb-1">
                  {cf2Signature ? (
                    <img
                      src={cf2Signature}
                      alt="Assinatura CF2"
                      className="max-h-10 object-contain"
                      crossOrigin="anonymous"
                    />
                  ) : null}
                </div>
                <div className="border-t-2 border-slate-900 w-44 mx-auto pt-1">
                  <p className="text-[11px] font-black uppercase text-slate-950 truncate">
                    {cf2Name || "2º Conselheiro(a) Fiscal"}
                  </p>
                  <p className="text-[9px] text-slate-600 font-bold">2º Membro</p>
                </div>
              </div>

              <div>
                <div className="h-10 flex items-end justify-center mb-1">
                  {cf3Signature ? (
                    <img
                      src={cf3Signature}
                      alt="Assinatura CF3"
                      className="max-h-10 object-contain"
                      crossOrigin="anonymous"
                    />
                  ) : null}
                </div>
                <div className="border-t-2 border-slate-900 w-44 mx-auto pt-1">
                  <p className="text-[11px] font-black uppercase text-slate-950 truncate">
                    {cf3Name || "3º Conselheiro(a) Fiscal"}
                  </p>
                  <p className="text-[9px] text-slate-600 font-bold">3º Membro</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="border-b pb-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  Formulários Financeiros da Secretaria (Impressão em Branco)
                  <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">
                    A4 Retrato
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Modelos padronizados com o logo e liderança oficial da igreja para preenchimento manual da Tesouraria e Secretaria.
                </DialogDescription>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Seletor de Congregação */}
              <div className="flex items-center gap-1.5 bg-muted/60 px-2 py-1 rounded-md border text-xs">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-semibold text-[11px]">Igreja:</span>
                <Select
                  value={selectedBranchId}
                  onValueChange={setSelectedBranchId}
                  disabled={!!userRestrictedBranch}
                >
                  <SelectTrigger className="h-7 text-xs font-semibold w-40 bg-background">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sede">Sede Central</SelectItem>
                    {branches
                      .filter((b) => b.id !== "sede")
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mês/Ano */}
              <div className="flex items-center gap-1.5 bg-muted/60 px-2 py-1 rounded-md border text-xs">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-semibold text-[11px]">Mês/Ano:</span>
                <input
                  type="text"
                  value={mesAnoReferencia}
                  onChange={(e) => setMesAnoReferencia(e.target.value)}
                  className="bg-background border rounded px-1.5 py-0.5 text-xs font-bold w-28 text-center"
                  placeholder="Mês / Ano"
                />
              </div>

              <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="h-8 text-xs">
                <Download className="w-3.5 h-3.5 mr-1" /> PDF A4
              </Button>
              <Button size="sm" onClick={handlePrintForm} className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white">
                <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir Formulário
              </Button>
            </div>
          </div>

          {/* Abas dos 4 Formulários Financeiros */}
          <div className="flex items-center gap-2 mt-3 pt-2 border-t overflow-x-auto">
            <Button
              variant={activeTab === 'entradas' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('entradas')}
              className="h-7 text-xs font-medium"
            >
              <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              1. Entradas (Anexo 1)
            </Button>

            <Button
              variant={activeTab === 'saidas' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('saidas')}
              className="h-7 text-xs font-medium"
            >
              <TrendingDown className="w-3.5 h-3.5 mr-1 text-rose-600" />
              2. Saídas (Anexo 2)
            </Button>

            <Button
              variant={activeTab === 'dizimista' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('dizimista')}
              className="h-7 text-xs font-medium"
            >
              <UserCheck className="w-3.5 h-3.5 mr-1 text-blue-600" />
              3. Ficha de Dizimistas (Anexo 3)
            </Button>

            <Button
              variant={activeTab === 'fechamento' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('fechamento')}
              className="h-7 text-xs font-medium"
            >
              <Calculator className="w-3.5 h-3.5 mr-1 text-amber-600" />
              4. Fechamento do Caixa (Anexo 4)
            </Button>
          </div>
        </DialogHeader>

        {/* Corpo Visual de Prévia e Impressão A4 Retrato */}
        <div className="flex-1 overflow-y-auto p-3 bg-slate-100 dark:bg-slate-950 rounded-xl border flex justify-center">

          {/* ========================================================================= */}
          {/* ANEXO 1: FORMULÁRIO DE ENTRADAS                                          */}
          {/* ========================================================================= */}
          {activeTab === 'entradas' && (
            <div
              id="formulario-financeiro-print-entradas"
              className="bg-white text-slate-950 p-8 w-[210mm] min-h-[297mm] mx-auto shadow-xl border border-slate-300 font-sans print:shadow-none print:border-none print:p-0 flex flex-col justify-between box-sizing-border"
            >
              <div>
                {/* Cabeçalho Oficial */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
                  <div className="flex items-center gap-4">
                    {renderOfficialLogo()}
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-tight text-slate-950 leading-tight">
                        {churchName}
                      </h2>
                      <p className="text-[11px] text-slate-600 leading-tight mt-0.5">{churchAddress}</p>
                      <p className="text-[10px] text-slate-500 font-mono leading-tight">CNPJ: {churchCnpj}</p>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mt-1 block">
                        SECRETARIA & TESOURARIA ECLESIÁSTICA
                      </span>
                    </div>
                  </div>

                  <div className="text-right border-l pl-4 border-slate-300 shrink-0">
                    <h3 className="text-base font-black uppercase text-emerald-800">
                      FORMULÁRIO DE ENTRADAS
                    </h3>
                    <p className="text-xs font-bold text-slate-800">Mês/Ano: {mesAnoReferencia}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Emissão para Preenchimento Manual</p>
                  </div>
                </div>

                {/* ANEXO 1: Tabela de Entradas (DATA | DESCRIÇÃO | DÍZIMOS | OFERTAS | TOTAL) */}
                <table className="w-full border-collapse border-2 border-slate-900 text-xs mb-3">
                  <thead>
                    <tr className="bg-slate-200 border-b-2 border-slate-900 text-slate-950 uppercase text-[10.5px] font-black">
                      <th className="border border-slate-900 p-2.5 text-center w-24">Data</th>
                      <th className="border border-slate-900 p-2.5 text-left">Descrição da Entrada / Origem</th>
                      <th className="border border-slate-900 p-2.5 text-right w-28">Dízimos (R$)</th>
                      <th className="border border-slate-900 p-2.5 text-right w-28">Ofertas (R$)</th>
                      <th className="border border-slate-900 p-2.5 text-right w-28">Total (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 18 }).map((_, idx) => (
                      <tr key={idx} className="border-b border-slate-400 h-9">
                        <td className="border border-slate-900 p-2 text-center"></td>
                        <td className="border border-slate-900 p-2 text-left"></td>
                        <td className="border border-slate-900 p-2 text-right"></td>
                        <td className="border border-slate-900 p-2 text-right"></td>
                        <td className="border border-slate-900 p-2 text-right"></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-200 border-t-2 border-slate-900 font-black text-xs">
                      <td colSpan={2} className="border border-slate-900 p-2.5 text-right uppercase">
                        TOTALIZADOR GERAL DO RELATÓRIO:
                      </td>
                      <td className="border border-slate-900 p-2.5 text-right font-mono font-black text-slate-900">
                        R$ _________
                      </td>
                      <td className="border border-slate-900 p-2.5 text-right font-mono font-black text-slate-900">
                        R$ _________
                      </td>
                      <td className="border border-slate-900 p-2.5 text-right font-mono font-black text-emerald-900 text-sm">
                        R$ _________
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Assinaturas Oficiais */}
              {renderSignaturesBlock(false)}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ANEXO 2: FORMULÁRIO DE SAÍDAS                                            */}
          {/* ========================================================================= */}
          {activeTab === 'saidas' && (
            <div
              id="formulario-financeiro-print-saidas"
              className="bg-white text-slate-950 p-8 w-[210mm] min-h-[297mm] mx-auto shadow-xl border border-slate-300 font-sans print:shadow-none print:border-none print:p-0 flex flex-col justify-between box-sizing-border"
            >
              <div>
                {/* Cabeçalho Oficial */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
                  <div className="flex items-center gap-4">
                    {renderOfficialLogo()}
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-tight text-slate-950 leading-tight">
                        {churchName}
                      </h2>
                      <p className="text-[11px] text-slate-600 leading-tight mt-0.5">{churchAddress}</p>
                      <p className="text-[10px] text-slate-500 font-mono leading-tight">CNPJ: {churchCnpj}</p>
                      <span className="text-[10px] font-bold text-rose-800 uppercase tracking-widest mt-1 block">
                        COMPROVANTE DE SAÍDAS & DESPESAS
                      </span>
                    </div>
                  </div>

                  <div className="text-right border-l pl-4 border-slate-300 shrink-0">
                    <h3 className="text-base font-black uppercase text-rose-800">
                      FORMULÁRIO DE SAÍDAS
                    </h3>
                    <p className="text-xs font-bold text-slate-800">Mês/Ano: {mesAnoReferencia}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Emissão para Preenchimento Manual</p>
                  </div>
                </div>

                {/* ANEXO 2: Tabela de Saídas (DATA | FAVORECIDO/FORNECEDOR | NRO DOCTO | VALOR | VALOR TOTAL) */}
                <table className="w-full border-collapse border-2 border-slate-900 text-xs mb-4">
                  <thead>
                    <tr className="bg-slate-200 border-b-2 border-slate-900 text-slate-950 uppercase text-[10.5px] font-black">
                      <th className="border border-slate-900 p-2.5 text-center w-24">Data</th>
                      <th className="border border-slate-900 p-2.5 text-left">Favorecido / Fornecedor</th>
                      <th className="border border-slate-900 p-2.5 text-center w-32">Nº Docto</th>
                      <th className="border border-slate-900 p-2.5 text-right w-28">Valor (R$)</th>
                      <th className="border border-slate-900 p-2.5 text-right w-32">Valor Total (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 19 }).map((_, idx) => (
                      <tr key={idx} className="border-b border-slate-400 h-9">
                        <td className="border border-slate-900 p-2 text-center"></td>
                        <td className="border border-slate-900 p-2 text-left"></td>
                        <td className="border border-slate-900 p-2 text-center font-mono"></td>
                        <td className="border border-slate-900 p-2 text-right"></td>
                        <td className="border border-slate-900 p-2 text-right"></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-200 border-t-2 border-slate-900 font-black text-xs">
                      <td colSpan={3} className="border border-slate-900 p-2.5 text-right uppercase">
                        SOMATÓRIO TOTAL DAS SAÍDAS / DESPESAS:
                      </td>
                      <td className="border border-slate-900 p-2.5 text-right font-mono font-black text-rose-900">
                        R$ _________
                      </td>
                      <td className="border border-slate-900 p-2.5 text-right font-mono font-black text-rose-900 text-sm">
                        R$ _________
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Assinaturas Oficiais */}
              {renderSignaturesBlock(false)}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ANEXO 3: FICHA DE DIZIMISTAS                                              */}
          {/* ========================================================================= */}
          {activeTab === 'dizimista' && (
            <div
              id="formulario-financeiro-print-dizimista"
              className="bg-white text-slate-950 p-8 w-[210mm] min-h-[297mm] mx-auto shadow-xl border border-slate-300 font-sans print:shadow-none print:border-none print:p-0 flex flex-col justify-between box-sizing-border"
            >
              <div>
                {/* Cabeçalho Oficial */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
                  <div className="flex items-center gap-4">
                    {renderOfficialLogo()}
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-tight text-slate-950 leading-tight">
                        {churchName}
                      </h2>
                      <p className="text-[11px] text-slate-600 leading-tight mt-0.5">{churchAddress}</p>
                      <p className="text-[10px] text-slate-500 font-mono leading-tight">CNPJ: {churchCnpj}</p>
                      <span className="text-[10px] font-bold text-blue-800 uppercase tracking-widest mt-1 block">
                        FICHA & LISTA DE DIZIMISTAS
                      </span>
                    </div>
                  </div>

                  <div className="text-right border-l pl-4 border-slate-300 shrink-0">
                    <h3 className="text-base font-black uppercase text-blue-800">
                      FICHA DE DIZIMISTAS
                    </h3>
                    <p className="text-xs font-bold text-slate-800">Mês/Ano: {mesAnoReferencia}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Registro de Fidelidade Eclesiástica</p>
                  </div>
                </div>

                {/* ANEXO 3: Tabela de Dizimistas (DATA | NOME DO DIZIMISTA | VALOR) */}
                <table className="w-full border-collapse border-2 border-slate-900 text-xs mb-4">
                  <thead>
                    <tr className="bg-slate-200 border-b-2 border-slate-900 text-slate-950 uppercase text-[11px] font-black">
                      <th className="border border-slate-900 p-2.5 text-center w-28">Data</th>
                      <th className="border border-slate-900 p-2.5 text-center">Nome do Dizimista</th>
                      <th className="border border-slate-900 p-2.5 text-center w-44">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 20 }).map((_, idx) => (
                      <tr key={idx} className="border-b border-slate-400 h-9">
                        <td className="border border-slate-900 p-2 text-center"></td>
                        <td className="border border-slate-900 p-2 text-left"></td>
                        <td className="border border-slate-900 p-2 text-right"></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-200 border-t-2 border-slate-900 font-black text-xs">
                      <td colSpan={2} className="border border-slate-900 p-2.5 text-right uppercase">
                        TOTALIZADOR DE DÍZIMOS REGISTRADOS:
                      </td>
                      <td className="border border-slate-900 p-2.5 text-right font-mono font-black text-blue-900 text-sm">
                        R$ ____________
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Assinaturas Oficiais */}
              {renderSignaturesBlock(false)}
            </div>
          )}

          {/* ========================================================================= */}
          {/* ANEXO 4: FECHAMENTO DE CAIXA                                              */}
          {/* ========================================================================= */}
          {activeTab === 'fechamento' && (
            <div
              id="formulario-financeiro-print-fechamento"
              className="bg-white text-slate-950 p-8 w-[210mm] min-h-[297mm] mx-auto shadow-xl border border-slate-300 font-sans print:shadow-none print:border-none print:p-0 flex flex-col justify-between box-sizing-border"
            >
              <div>
                {/* Cabeçalho Oficial */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-6">
                  <div className="flex items-center gap-4">
                    {renderOfficialLogo()}
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-tight text-slate-950 leading-tight">
                        {churchName}
                      </h2>
                      <p className="text-[11px] text-slate-600 leading-tight mt-0.5">{churchAddress}</p>
                      <p className="text-[10px] text-slate-500 font-mono leading-tight">CNPJ: {churchCnpj}</p>
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mt-1 block">
                        DEMONSTRATIVO DE BALANCETE & FECHAMENTO DO CAIXA
                      </span>
                    </div>
                  </div>

                  <div className="text-right border-l pl-4 border-slate-300 shrink-0">
                    <h3 className="text-base font-black uppercase text-amber-800">
                      FECHAMENTO DO CAIXA
                    </h3>
                    <p className="text-xs font-bold text-slate-800">Mês/Ano: {mesAnoReferencia}</p>
                    <p className="text-[10px] text-slate-500 font-mono">Demonstrativo Contábil Oficial</p>
                  </div>
                </div>

                {/* ANEXO 4: Tabela de Fechamento do Caixa com as 4 linhas especificadas */}
                <table className="w-full border-collapse border-2 border-slate-900 text-xs mb-8">
                  <thead>
                    <tr className="bg-slate-200 border-b-2 border-slate-900 text-slate-950 uppercase text-[11px] font-black">
                      <th className="border border-slate-900 p-3 text-left">Especificação da Conta / Movimentação</th>
                      <th className="border border-slate-900 p-3 text-right w-56">Valor em Reais (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b-2 border-slate-900 h-14 bg-slate-50">
                      <td className="border border-slate-900 p-3.5 font-black text-sm uppercase text-slate-900">
                        1. SALDO DO MÊS ANTERIOR
                      </td>
                      <td className="border border-slate-900 p-3.5 text-right font-mono font-black text-base text-slate-900">
                        R$ _________________
                      </td>
                    </tr>

                    <tr className="border-b-2 border-slate-900 h-14 bg-emerald-50/50">
                      <td className="border border-slate-900 p-3.5 font-black text-sm uppercase text-emerald-900">
                        2. ENTRADAS DO MÊS (DÍZIMOS & OFERTAS)
                      </td>
                      <td className="border border-slate-900 p-3.5 text-right font-mono font-black text-base text-emerald-900">
                        R$ _________________
                      </td>
                    </tr>

                    <tr className="border-b-2 border-slate-900 h-14 bg-rose-50/50">
                      <td className="border border-slate-900 p-3.5 font-black text-sm uppercase text-rose-900">
                        3. SAÍDAS DO MÊS (DESPESAS & PAGAMENTOS)
                      </td>
                      <td className="border border-slate-900 p-3.5 text-right font-mono font-black text-base text-rose-900">
                        R$ _________________
                      </td>
                    </tr>

                    <tr className="bg-white text-slate-950 font-black text-base h-16 border-2 border-slate-900">
                      <td className="border border-slate-900 p-4 uppercase tracking-wider text-slate-950 font-black">
                        4. SALDO QUE PASSA PARA O PRÓXIMO MÊS:
                      </td>
                      <td className="border border-slate-900 p-4 text-right font-mono text-slate-950 font-black text-lg">
                        R$ _________________
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Assinaturas Oficiais com Conselho Fiscal */}
              {renderSignaturesBlock(true)}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
