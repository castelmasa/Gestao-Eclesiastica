import React, { useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Printer, Calendar, FileText, CheckCircle2, Shield, User, Building2 } from "lucide-react";
import { printDocument } from "@/lib/printUtils";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";

interface Member {
  id?: string;
  name: string;
  cpf?: string;
  rg?: string;
  phone?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  role?: string;
  dataBatismo?: string;
}

interface DeclaracaoContribuicaoIrpfModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: Member[];
  selectedMember?: Member | null;
  churchName?: string;
}

const MONTHS_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

// Helper to convert number to currency string in pt-BR
function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);
}

export function DeclaracaoContribuicaoIrpfModal({
  isOpen,
  onClose,
  members,
  selectedMember: initialMember,
  churchName = "Igreja Evangélica Manancial",
}: DeclaracaoContribuicaoIrpfModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(initialMember?.id || "");
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear() - 1));
  const printRef = useRef<HTMLDivElement>(null);

  // Sync if initialMember changes
  React.useEffect(() => {
    if (initialMember?.id) {
      setSelectedMemberId(initialMember.id);
    } else if (members.length > 0 && !selectedMemberId) {
      setSelectedMemberId(members[0].id || "");
    }
  }, [initialMember, members]);

  const activeMember = useMemo(() => {
    return members.find(m => m.id === selectedMemberId) || initialMember || members[0] || null;
  }, [members, selectedMemberId, initialMember]);

  const churchLogo = getRegisteredChurchLogo();
  const churchCNPJ = localStorage.getItem("church_cnpj") || "50.123.456/0001-89";
  const churchAddress = localStorage.getItem("church_address") || "Rua Principal, 1000 - Centro";
  const churchCity = localStorage.getItem("church_city") || "Valparaíso - SP";
  const pastorName = localStorage.getItem("pastor_name") || "Pr. Presidente da Igreja";
  const tesoureiroName = localStorage.getItem("tesoureiro_name") || "1º Tesoureiro Geral";

  // Load transactions linked to this member for the year
  const contributionsByMonth = useMemo(() => {
    const months = Array(12).fill(0);
    if (!activeMember) return { months, total: 0 };

    const saved = localStorage.getItem("churchTransactions");
    let transactions: any[] = [];
    if (saved) {
      try { transactions = JSON.parse(saved); } catch (e) {}
    }

    const yearNum = parseInt(selectedYear, 10);
    let total = 0;

    transactions.forEach(t => {
      if (!t.date) return;
      const tDate = new Date(t.date);
      if (isNaN(tDate.getTime())) return;
      if (tDate.getFullYear() !== yearNum) return;

      const isMatch = (t.memberId && t.memberId === activeMember.id) ||
        (t.description && t.description.toLowerCase().includes(activeMember.name.toLowerCase()));

      if (isMatch && (t.type === "entrada" || t.type === "income")) {
        const amt = Number(t.amount) || 0;
        months[tDate.getMonth()] += amt;
        total += amt;
      }
    });

    return { months, total };
  }, [activeMember, selectedYear]);

  const handlePrint = () => {
    printDocument({
      elementId: "declaracao-irpf-print-area",
      title: `Declaracao_IRPF_${activeMember?.name || "Membro"}_${selectedYear}`,
      orientation: "portrait",
    });
  };

  const todayStr = new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] flex flex-col p-0 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        <DialogHeader className="!m-0 !mx-0 !mt-0 !mb-0 p-5 sm:p-6 pb-4 border-b border-border bg-muted/20 sticky top-0 bg-background z-10 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Declaração Anual de Contribuições (IRPF)
              </DialogTitle>
              <DialogDescription className="text-sm">
                Comprovante oficial de dízimos e ofertas para declaração de imposto de renda da pessoa física.
              </DialogDescription>
            </div>
            <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs font-semibold">
              <Printer className="w-4 h-4 mr-2" /> Imprimir Declaração
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Selecionar Membro:</label>
              <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Escolha o membro" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {members.map(m => (
                    <SelectItem key={m.id || m.name} value={m.id || m.name} className="text-xs">
                      {m.name} {m.cpf ? `(CPF: ${m.cpf})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-32">
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Ano-Calendário:</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {["2023", "2024", "2025", "2026"].map(y => (
                    <SelectItem key={y} value={y} className="text-xs">
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        {/* Printable Area */}
        <div className="p-6 sm:p-8 space-y-6 bg-white text-slate-900 flex-1 overflow-y-auto print-page" id="declaracao-irpf-print-area" ref={printRef}>
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {churchLogo ? (
                <img src={churchLogo} alt="Logo da Igreja" className="w-16 h-16 object-contain" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl">
                  IM
                </div>
              )}
              <div>
                <h1 className="text-base font-black uppercase text-slate-900 tracking-tight">{churchName}</h1>
                <p className="text-xs text-slate-600">{churchAddress}</p>
                <p className="text-xs text-slate-500">CNPJ: {churchCNPJ}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Documento Fiscal Eclesiástico</span>
              <p className="text-xs font-black text-slate-900">ANO-CALENDÁRIO: {selectedYear}</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center py-2">
            <h2 className="text-base font-black tracking-wide uppercase border-y border-slate-300 py-1.5 inline-block px-8">
              DECLARAÇÃO DE CONTRIBUIÇÕES ECLESIÁSTICAS (DÍZIMOS E OFERTAS)
            </h2>
          </div>

          {/* Body Text */}
          <div className="text-xs text-slate-800 leading-relaxed text-justify space-y-3">
            <p>
              Declaramos para os devidos fins de comprovação e instrução junto à Secretaria da Receita Federal do Brasil, referente à Declaração de Ajuste Anual do Imposto de Renda Pessoa Física, que o(a) contribuinte abaixo qualificado efetuou contribuições voluntárias (dízimos e ofertas) no ano-calendário de <strong>{selectedYear}</strong>:
            </p>

            <div className="p-3 rounded-lg border border-slate-300 bg-slate-50/70 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500 font-semibold block text-[11px]">NOME COMPLETO:</span>
                <span className="font-bold text-slate-900">{activeMember?.name || "Não informado"}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[11px]">CPF:</span>
                <span className="font-bold text-slate-900">{activeMember?.cpf || "Não cadastrado"}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[11px]">RG:</span>
                <span className="font-medium text-slate-800">{activeMember?.rg || "Não cadastrado"}</span>
              </div>
              <div>
                <span className="text-slate-500 font-semibold block text-[11px]">CONDIÇÃO:</span>
                <span className="font-medium text-slate-800">Membro Comungante</span>
              </div>
            </div>
          </div>

          {/* Monthly Breakdown Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              Demonstrativo Mensal das Contribuições no Exercício de {selectedYear}
            </h3>
            <Table className="border border-slate-300 text-xs">
              <TableHeader>
                <TableRow className="bg-slate-100">
                  <TableHead className="py-1.5 text-slate-800 font-bold">Mês de Referência</TableHead>
                  <TableHead className="py-1.5 text-right text-slate-800 font-bold">Valor Contribuído (R$)</TableHead>
                  <TableHead className="py-1.5 text-slate-800 font-bold">Mês de Referência</TableHead>
                  <TableHead className="py-1.5 text-right text-slate-800 font-bold">Valor Contribuído (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i} className="hover:bg-slate-50">
                    <TableCell className="py-1.5 font-medium">{MONTHS_NAMES[i]}</TableCell>
                    <TableCell className="py-1.5 text-right font-semibold">
                      {formatCurrency(contributionsByMonth.months[i])}
                    </TableCell>
                    <TableCell className="py-1.5 font-medium">{MONTHS_NAMES[i + 6]}</TableCell>
                    <TableCell className="py-1.5 text-right font-semibold">
                      {formatCurrency(contributionsByMonth.months[i + 6])}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-slate-100 font-black border-t-2 border-slate-900 text-xs">
                  <TableCell colSpan={3} className="py-2 uppercase">TOTAL ANUAL CONTRIBUÍDO NO ANO DE {selectedYear}:</TableCell>
                  <TableCell className="py-2 text-right text-emerald-800 text-sm">
                    {formatCurrency(contributionsByMonth.total)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Legal Note */}
          <div className="text-[11px] text-slate-600 leading-relaxed text-justify border-l-2 border-slate-400 pl-3 italic">
            "Ressaltamos que os valores acima referem-se estritamente a doações espontâneas e dízimos efetuados para a manutenção do templo, atividades confessionais e eclesiásticas da entidade, sem qualquer contraprestação direta de bens, serviços ou vantagens materiais."
          </div>

          {/* Signatures */}
          <div className="pt-8 space-y-8">
            <p className="text-right text-xs text-slate-600">
              {churchCity}, {todayStr}.
            </p>

            <div className="grid grid-cols-2 gap-8 text-center text-xs">
              <div className="flex flex-col items-center">
                <div className="w-56 border-b border-slate-800 mb-1"></div>
                <span className="font-bold text-slate-900">{pastorName}</span>
                <span className="text-slate-500 text-[11px]">Pastor Presidente / Dirigente</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-56 border-b border-slate-800 mb-1"></div>
                <span className="font-bold text-slate-900">{tesoureiroName}</span>
                <span className="text-slate-500 text-[11px]">1º Tesoureiro Geral</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="!m-0 !mx-0 !mb-0 !mt-auto p-4 border-t border-border bg-muted/20 flex flex-row justify-end items-center gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} className="rounded-xl px-5 h-10 font-semibold">
            Fechar
          </Button>
          <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-5 h-10 font-semibold shadow-xs">
            <Printer className="w-4 h-4 mr-2" /> Imprimir Declaração
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
