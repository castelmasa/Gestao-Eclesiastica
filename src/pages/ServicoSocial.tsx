import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  HeartHandshake,
  Users,
  Package,
  Plus,
  Search,
  Filter,
  Printer,
  FileSpreadsheet,
  Download,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  UserCheck,
  Building2,
  Trash2,
  Edit,
  Eye,
  History,
  PackagePlus,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import {
  SocialBeneficiary,
  SocialAttendance,
  SocialInventoryMovement,
  TIPO_AUXILIO_LABELS,
  TipoAuxilioSocial
} from "@/types/social";
import { BeneficiarioModal } from "@/components/social/BeneficiarioModal";
import { AtendimentoModal } from "@/components/social/AtendimentoModal";
import { FichaControleBeneficiarioModal } from "@/components/social/FichaControleBeneficiarioModal";
import { DoacaoEstoqueModal } from "@/components/social/DoacaoEstoqueModal";
import { getChurchLeadershipConfig } from "@/lib/churchConfigHelper";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { exportToCSV, exportToXLSX } from "@/lib/exportUtils";

export function ServicoSocial() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { activeBranch, branches, activeBranchName } = useBranch();
  const [activeTab, setActiveTab] = useState("beneficiarios");

  // Dados
  const [beneficiaries, setBeneficiaries] = useState<SocialBeneficiary[]>([]);
  const [attendances, setAttendances] = useState<SocialAttendance[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<SocialInventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [searchBeneficiary, setSearchBeneficiary] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  // Modais
  const [isBeneficiarioModalOpen, setIsBeneficiarioModalOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<SocialBeneficiary | null>(null);

  const [isAtendimentoModalOpen, setIsAtendimentoModalOpen] = useState(false);
  const [targetBeneficiaryForAtendimento, setTargetBeneficiaryForAtendimento] = useState<SocialBeneficiary | null>(null);

  const [isFichaControleOpen, setIsFichaControleOpen] = useState(false);
  const [selectedFichaBeneficiary, setSelectedFichaBeneficiary] = useState<SocialBeneficiary | null>(null);

  const [isDoacaoEstoqueOpen, setIsDoacaoEstoqueOpen] = useState(false);
  const [beneficiaryToDelete, setBeneficiaryToDelete] = useState<SocialBeneficiary | null>(null);

  // Efeito de escuta em tempo real do Firestore
  useEffect(() => {
    setLoading(true);
    const unsubs: (() => void)[] = [];

    // 1. Beneficiários
    try {
      const qBen = collection(db, "social_beneficiaries");
      const unsubBen = onSnapshot(qBen, (snapshot) => {
        const list: SocialBeneficiary[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as SocialBeneficiary);
        });
        setBeneficiaries(list);
        localStorage.setItem("social_beneficiaries_cache", JSON.stringify(list));
      }, (err) => {
        console.warn("Snapshot social_beneficiaries fallback para localStorage:", err);
        const cached = localStorage.getItem("social_beneficiaries_cache");
        if (cached) setBeneficiaries(JSON.parse(cached));
      });
      unsubs.push(unsubBen);
    } catch {
      const cached = localStorage.getItem("social_beneficiaries_cache");
      if (cached) setBeneficiaries(JSON.parse(cached));
    }

    // 2. Atendimentos
    try {
      const qAtt = collection(db, "social_attendances");
      const unsubAtt = onSnapshot(qAtt, (snapshot) => {
        const list: SocialAttendance[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as SocialAttendance);
        });
        setAttendances(list);
        localStorage.setItem("social_attendances_cache", JSON.stringify(list));
      }, (err) => {
        console.warn("Snapshot social_attendances fallback:", err);
        const cached = localStorage.getItem("social_attendances_cache");
        if (cached) setAttendances(JSON.parse(cached));
      });
      unsubs.push(unsubAtt);
    } catch {
      const cached = localStorage.getItem("social_attendances_cache");
      if (cached) setAttendances(JSON.parse(cached));
    }

    // 3. Movimentações de Estoque
    try {
      const qInv = collection(db, "social_inventory");
      const unsubInv = onSnapshot(qInv, (snapshot) => {
        const list: SocialInventoryMovement[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as SocialInventoryMovement);
        });
        setInventoryMovements(list);
        localStorage.setItem("social_inventory_cache", JSON.stringify(list));
      }, (err) => {
        console.warn("Snapshot social_inventory fallback:", err);
        const cached = localStorage.getItem("social_inventory_cache");
        if (cached) setInventoryMovements(JSON.parse(cached));
      });
      unsubs.push(unsubInv);
    } catch {
      const cached = localStorage.getItem("social_inventory_cache");
      if (cached) setInventoryMovements(JSON.parse(cached));
    }

    setLoading(false);
    return () => unsubs.forEach(u => u());
  }, []);

  // Beneficiários filtrados por congregação ativa / busca
  const filteredBeneficiaries = useMemo(() => {
    return beneficiaries.filter((b) => {
      // Filtro de congregação
      if (activeBranch !== "all" && b.branchId && b.branchId !== activeBranch) {
        return false;
      }
      if (filterBranch !== "all" && b.branchId && b.branchId !== filterBranch) {
        return false;
      }
      // Filtro de status
      if (filterStatus !== "all" && b.status !== filterStatus) {
        return false;
      }
      // Busca por nome, CPF ou bairro
      if (searchBeneficiary.trim()) {
        const q = searchBeneficiary.toLowerCase();
        const nMatch = b.nome?.toLowerCase().includes(q);
        const cMatch = b.cpf?.replace(/\D/g, "").includes(q.replace(/\D/g, ""));
        const bMatch = b.bairro?.toLowerCase().includes(q);
        return nMatch || cMatch || bMatch;
      }
      return true;
    }).sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
  }, [beneficiaries, activeBranch, filterBranch, filterStatus, searchBeneficiary]);

  // Atendimentos filtrados
  const filteredAttendances = useMemo(() => {
    return attendances.filter((a) => {
      if (activeBranch !== "all" && a.branchId && a.branchId !== activeBranch) {
        return false;
      }
      if (monthFilter && a.dataEntrega && !a.dataEntrega.startsWith(monthFilter)) {
        return false;
      }
      return true;
    }).sort((a, b) => new Date(b.dataEntrega).getTime() - new Date(a.dataEntrega).getTime());
  }, [attendances, activeBranch, monthFilter]);

  // Estoque atual de cestas
  const estoqueStats = useMemo(() => {
    let entradas = 0;
    let saidas = 0;

    inventoryMovements.forEach((m) => {
      if (activeBranch !== "all" && m.branchId && m.branchId !== activeBranch) return;
      if (m.tipo === "entrada") entradas += m.quantidade;
      else if (m.tipo === "saida") saidas += m.quantidade;
    });

    // Saídas de atendimentos que abateram estoque
    const atendimentosComCesta = attendances.filter(a => {
      if (activeBranch !== "all" && a.branchId && a.branchId !== activeBranch) return false;
      return a.tipoAuxilio.includes("cesta");
    }).reduce((acc, a) => acc + (a.quantidade || 1), 0);

    const saldo = Math.max(0, entradas - atendimentosComCesta);
    return {
      entradas,
      saidas: atendimentosComCesta,
      saldo,
    };
  }, [inventoryMovements, attendances, activeBranch]);

  // Estatísticas do Mês Vigente
  const currentMonthYM = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const totalCestasEntreguesMes = useMemo(() => {
    return attendances
      .filter(a => {
        if (activeBranch !== "all" && a.branchId && a.branchId !== activeBranch) return false;
        return a.dataEntrega?.startsWith(currentMonthYM) && a.tipoAuxilio.includes("cesta");
      })
      .reduce((acc, a) => acc + (a.quantidade || 1), 0);
  }, [attendances, currentMonthYM, activeBranch]);

  // Salvar Beneficiário (Criação / Atualização)
  const handleSaveBeneficiary = async (data: Partial<SocialBeneficiary>) => {
    if (editingBeneficiary) {
      await updateDoc(doc(db, "social_beneficiaries", editingBeneficiary.id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } else {
      await addDoc(collection(db, "social_beneficiaries"), {
        ...data,
        dataCadastro: new Date().toISOString().split("T")[0],
        totalCestasRecebidas: 0,
        createdAt: serverTimestamp(),
      });
    }
  };

  // Excluir Beneficiário
  const handleExecuteDeleteBeneficiary = async () => {
    if (!beneficiaryToDelete) return;
    try {
      await deleteDoc(doc(db, "social_beneficiaries", beneficiaryToDelete.id));
      toast.success("Beneficiário removido do cadastro social.");
      setBeneficiaryToDelete(null);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao excluir beneficiário.");
    }
  };

  // Salvar Atendimento e atualizar beneficiário + estoque
  const handleSaveAtendimento = async (data: Omit<SocialAttendance, "id" | "createdAt">, abaterEstoque: boolean) => {
    // 1. Gravar Atendimento
    await addDoc(collection(db, "social_attendances"), {
      ...data,
      createdAt: serverTimestamp(),
    });

    // 2. Atualizar Beneficiário (data do último atendimento e contador)
    const benRef = doc(db, "social_beneficiaries", data.beneficiaryId);
    const ben = beneficiaries.find(b => b.id === data.beneficiaryId);
    const novoTotal = (ben?.totalCestasRecebidas || 0) + (data.tipoAuxilio.includes("cesta") ? data.quantidade : 0);

    await updateDoc(benRef, {
      dataUltimoAtendimento: data.dataEntrega,
      totalCestasRecebidas: novoTotal,
      updatedAt: serverTimestamp(),
    });

    // 3. Registrar saída no estoque de doações se marcado
    if (abaterEstoque && data.tipoAuxilio.includes("cesta")) {
      await addDoc(collection(db, "social_inventory"), {
        tipo: "saida",
        origemDestino: `Atendimento / Entrega: ${data.beneficiaryName}`,
        item: TIPO_AUXILIO_LABELS[data.tipoAuxilio] || "Cesta Básica",
        quantidade: data.quantidade,
        data: data.dataEntrega,
        branchId: data.branchId,
        branchName: data.branchName,
        responsavel: data.responsavelEntrega,
        createdAt: serverTimestamp(),
      });
    }
  };

  // Salvar Doação / Entrada no Estoque
  const handleSaveDoacao = async (data: Omit<SocialInventoryMovement, "id" | "createdAt">) => {
    await addDoc(collection(db, "social_inventory"), {
      ...data,
      createdAt: serverTimestamp(),
    });
  };

  // Exportar Relatório Consolidado Oficial (PDF em A4 com Assinaturas Oficiais da Configuração)
  const handleExportRelatorioConsolidadoPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const leadership = getChurchLeadershipConfig(activeBranch, branches);

      const [ano, mes] = monthFilter.split("-").map(Number);
      const mesesNomes = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];
      const mesExtenso = `${mesesNomes[(mes || 1) - 1]} de ${ano}`;

      // Cabeçalho Oficial
      doc.setFillColor(30, 41, 59);
      doc.rect(14, 12, 182, 22, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      doc.text(leadership.church.name.toUpperCase(), 105, 20, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(226, 232, 240);
      doc.text(`RELATÓRIO MENSAL DE AÇÃO SOCIAL & DIACONIA | ${activeBranchName.toUpperCase()}`, 105, 26, { align: "center" });
      doc.text(`Mês de Competência: ${mesExtenso} | CNPJ: ${leadership.church.cnpj}`, 105, 30, { align: "center" });

      // Resumo Estatístico do Mês
      const totalAtendimentos = filteredAttendances.length;
      const totalCestas = filteredAttendances
        .filter(a => a.tipoAuxilio.includes("cesta"))
        .reduce((acc, a) => acc + (a.quantidade || 1), 0);

      autoTable(doc, {
        startY: 38,
        head: [["INDICADOR SOCIAL", "QUANTIDADE NO MÊS"]],
        body: [
          ["Famílias / Beneficiários Cadastrados no Sistema:", `${filteredBeneficiaries.length} famílias`],
          ["Total de Atendimentos Realizados no Período:", `${totalAtendimentos} atendimento(s)`],
          ["Cestas Básicas Entregues no Mês:", `${totalCestas} cesta(s)`],
          ["Saldo Atual de Cestas em Estoque:", `${estoqueStats.saldo} cesta(s) disponíveis`],
        ],
        theme: "grid",
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
        styles: { fontSize: 8, cellPadding: 2.2 },
        columnStyles: {
          0: { cellWidth: 120, fontStyle: "bold", fillColor: [248, 250, 252] },
          1: { cellWidth: 62, halign: "center", fontStyle: "bold" },
        },
      });

      // Tabela de Entregas Realizadas no Mês
      const afterResumoY = (doc as any).lastAutoTable?.finalY || 80;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text("RELAÇÃO DE FAMÍLIAS ATENDIDAS NO PERÍODO:", 14, afterResumoY + 7);

      const rowsEntregas = filteredAttendances.map(a => [
        a.dataEntrega ? new Date(a.dataEntrega).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-",
        a.beneficiaryName,
        a.beneficiaryCpf || "-",
        TIPO_AUXILIO_LABELS[a.tipoAuxilio] || a.tipoAuxilio,
        `${a.quantidade} un.`,
        a.responsavelEntrega,
      ]);

      if (rowsEntregas.length === 0) {
        rowsEntregas.push(["-", "Nenhum atendimento registrado no mês selecionado", "-", "-", "-", "-"]);
      }

      autoTable(doc, {
        startY: afterResumoY + 9,
        head: [["Data", "Beneficiário(a)", "CPF", "Tipo de Auxílio", "Qtd", "Responsável"]],
        body: rowsEntregas,
        theme: "striped",
        headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 7.5, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 50 },
          2: { cellWidth: 28 },
          3: { cellWidth: 38 },
          4: { cellWidth: 16, halign: "center" },
          5: { cellWidth: 30 },
        },
      });

      // Assinaturas Oficiais da Liderança (Puxadas diretamente de Configurações!)
      const afterTabelaY = (doc as any).lastAutoTable?.finalY || 160;
      const sigY = Math.max(afterTabelaY + 18, 240);

      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.3);

      // Assinatura da Secretaria / Assistência Social (Configurações)
      doc.line(20, sigY, 90, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(leadership.secretaria.name, 55, sigY + 4, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("Secretaria / Departamento de Ação Social", 55, sigY + 8, { align: "center" });

      // Assinatura do Pastor Titular / Presidente (Configurações)
      doc.line(114, sigY, 184, sigY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(leadership.pastor.name, 149, sigY + 4, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("Pastor Presidente / Dirigente", 149, sigY + 8, { align: "center" });

      // Rodapé Oficial
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Documento oficial gerado pelo Sistema de Gestão Eclesiástica - ${leadership.church.name}.`,
        105,
        286,
        { align: "center" }
      );

      doc.save(`relatorio-social-${monthFilter}-${activeBranchName.toLowerCase().replace(/\s+/g, "-")}.pdf`);
      toast.success("Relatório Consolidado de Ação Social em PDF gerado com sucesso!");
    } catch (e) {
      console.error(e);
      toast.error("Erro ao gerar PDF do relatório social.");
    }
  };

  // Exportar Excel (CSV/XLSX)
  const handleExportCSV = () => {
    const dataToExport = filteredAttendances.map(a => ({
      Data: a.dataEntrega,
      Beneficiario: a.beneficiaryName,
      CPF: a.beneficiaryCpf,
      Telefone: a.beneficiaryTelefone || "-",
      Endereco: a.beneficiaryEndereco || "-",
      TipoAuxilio: TIPO_AUXILIO_LABELS[a.tipoAuxilio] || a.tipoAuxilio,
      Quantidade: a.quantidade,
      Responsavel: a.responsavelEntrega,
      Congregacao: a.branchName,
      Observacoes: a.motivoAtendimento || a.observacoes || "-"
    }));
    exportToCSV(dataToExport, `atendimentos-sociais-${monthFilter}.csv`);
  };

  const handleExportXLSX = () => {
    const dataToExport = filteredAttendances.map(a => ({
      Data: a.dataEntrega,
      Beneficiario: a.beneficiaryName,
      CPF: a.beneficiaryCpf,
      Telefone: a.beneficiaryTelefone || "-",
      Endereco: a.beneficiaryEndereco || "-",
      TipoAuxilio: TIPO_AUXILIO_LABELS[a.tipoAuxilio] || a.tipoAuxilio,
      Quantidade: a.quantidade,
      Responsavel: a.responsavelEntrega,
      Congregacao: a.branchName,
      Observacoes: a.motivoAtendimento || a.observacoes || "-"
    }));
    exportToXLSX(dataToExport, `atendimentos-sociais-${monthFilter}.xlsx`);
  };

  // Função auxiliar para calcular carência de um beneficiário específico
  const getCarenciaInfo = (beneficiary: SocialBeneficiary) => {
    const lastDate = beneficiary.dataUltimoAtendimento;
    if (!lastDate) return { emCarencia: false, diasRestantes: 0 };
    const diffMs = Date.now() - new Date(lastDate).getTime();
    const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (dias < 30) {
      return { emCarencia: true, diasRestantes: 30 - dias };
    }
    return { emCarencia: false, diasRestantes: 0 };
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Ações */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card rounded-2xl border p-5 sm:p-6 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center border border-rose-200 dark:border-rose-900/40">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">Serviço Social & Cestas Básicas</h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Atendimento a famílias carentes, controle de cestas básicas, carência e doações da igreja.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto">
          <Button
            onClick={() => navigate("/secretaria?tab=formularios&type=ficha-cesta-basica-analitica")}
            variant="outline"
            className="border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 text-xs sm:text-sm font-semibold h-9 px-3"
            title="Abrir gerador de Ficha de Cesta Básica Versão Analítica"
          >
            <FileText className="mr-1.5 h-4 w-4 text-blue-600" /> Ficha Analítica
          </Button>

          <Button
            onClick={() => navigate("/secretaria?tab=formularios&type=ficha-cesta-basica-simples")}
            variant="outline"
            className="border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 text-xs sm:text-sm font-semibold h-9 px-3"
            title="Abrir gerador de Ficha de Cesta Básica Versão Simplificada"
          >
            <Printer className="mr-1.5 h-4 w-4 text-emerald-600" /> Ficha Simples
          </Button>

          <Button
            onClick={() => setIsDoacaoEstoqueOpen(true)}
            variant="outline"
            className="border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 text-xs sm:text-sm font-semibold h-9 px-3"
          >
            <PackagePlus className="mr-1.5 h-4 w-4 text-emerald-600" /> + Entrada Estoque
          </Button>

          <Button
            onClick={() => {
              setTargetBeneficiaryForAtendimento(null);
              setIsAtendimentoModalOpen(true);
            }}
            variant="outline"
            className="border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 text-xs sm:text-sm font-semibold h-9 px-3"
          >
            <Package className="mr-1.5 h-4 w-4 text-rose-600" /> Nova Entrega
          </Button>

          <Button
            onClick={() => {
              setEditingBeneficiary(null);
              setIsBeneficiarioModalOpen(true);
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm h-9 px-3.5 shadow-2xs"
          >
            <Plus className="mr-1.5 h-4 w-4" /> Cadastrar Beneficiário
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Famílias */}
        <Card className="shadow-2xs border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Famílias Cadastradas</span>
              <div className="text-2xl font-bold text-foreground">{filteredBeneficiaries.length}</div>
              <span className="text-[11px] text-muted-foreground">Assistidas pela congregação</span>
            </div>
            <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Cestas Entregues Mês */}
        <Card className="shadow-2xs border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cestas no Mês</span>
              <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{totalCestasEntreguesMes} un.</div>
              <span className="text-[11px] text-muted-foreground">Concedidas no mês corrente</span>
            </div>
            <div className="h-11 w-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Saldo de Estoque */}
        <Card className="shadow-2xs border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estoque Disponível</span>
              <div className={`text-2xl font-bold ${estoqueStats.saldo <= 2 ? "text-amber-600" : "text-emerald-600 dark:text-emerald-400"}`}>
                {estoqueStats.saldo} un.
              </div>
              <span className="text-[11px] text-muted-foreground">
                {estoqueStats.saldo <= 2 ? "⚠️ Estoque baixo para atendimento" : "Prontas para distribuição"}
              </span>
            </div>
            <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <PackagePlus className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Atendimentos Gerais */}
        <Card className="shadow-2xs border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Histórico de Auxílios</span>
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{attendances.length}</div>
              <span className="text-[11px] text-muted-foreground">Atendimentos registrados</span>
            </div>
            <div className="h-11 w-11 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
              <HeartHandshake className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Abas Principais */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2">
          <TabsList className="bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="beneficiarios" className="text-xs sm:text-sm font-semibold gap-1.5">
              <Users className="h-4 w-4" /> Beneficiários ({filteredBeneficiaries.length})
            </TabsTrigger>
            <TabsTrigger value="atendimentos" className="text-xs sm:text-sm font-semibold gap-1.5">
              <Package className="h-4 w-4" /> Atendimentos & Entregas ({filteredAttendances.length})
            </TabsTrigger>
            <TabsTrigger value="estoque" className="text-xs sm:text-sm font-semibold gap-1.5">
              <PackagePlus className="h-4 w-4" /> Estoque de Cestas ({estoqueStats.saldo})
            </TabsTrigger>
            <TabsTrigger value="relatorios" className="text-xs sm:text-sm font-semibold gap-1.5">
              <FileText className="h-4 w-4" /> Relatórios
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ABA 1: BENEFICIÁRIOS & FAMÍLIAS */}
        <TabsContent value="beneficiarios" className="space-y-4">
          {/* Barra de Filtros */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-card p-3 rounded-xl border">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, CPF ou bairro..."
                value={searchBeneficiary}
                onChange={(e) => setSearchBeneficiary(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-xs w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="em_acompanhamento">Acompanhamento</SelectItem>
                  <SelectItem value="arquivado">Arquivado</SelectItem>
                </SelectContent>
              </Select>

              {activeBranch === "all" && (
                <Select value={filterBranch} onValueChange={setFilterBranch}>
                  <SelectTrigger className="h-9 text-xs w-[160px]">
                    <SelectValue placeholder="Congregação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Unidades</SelectItem>
                    {branches.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Tabela de Beneficiários */}
          <div className="bg-card rounded-xl border overflow-hidden shadow-2xs">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold">Beneficiário(a) / Família</TableHead>
                  <TableHead className="text-xs font-bold">Endereço & Contato</TableHead>
                  <TableHead className="text-xs font-bold text-center">Família / Crianças</TableHead>
                  <TableHead className="text-xs font-bold text-center">Status de Carência</TableHead>
                  <TableHead className="text-xs font-bold text-center">Total Cestas</TableHead>
                  <TableHead className="text-xs font-bold text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y">
                {filteredBeneficiaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Nenhum beneficiário encontrado com os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBeneficiaries.map((b) => {
                    const carencia = getCarenciaInfo(b);
                    return (
                      <TableRow key={b.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">
                          <div className="font-bold text-foreground text-sm">{b.nome}</div>
                          <div className="text-[11px] text-muted-foreground">
                            CPF: {b.cpf || "Não informado"} {b.branchName ? `| ${b.branchName}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-foreground">{b.endereco}, {b.numero || "S/N"} - {b.bairro}</div>
                          <div className="text-[11px] text-muted-foreground">{b.telefone}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-semibold text-foreground">{b.quantidadeMembrosFamilia} pessoas</span>
                          <div className="text-[10px] text-muted-foreground">({b.quantidadeCriancas} crianças)</div>
                        </TableCell>
                        <TableCell className="text-center">
                          {carencia.emCarencia ? (
                            <Badge variant="outline" className="border-amber-400 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 text-[10px]">
                              <Clock className="w-3 h-3 mr-1" />
                              Restam {carencia.diasRestantes} dias
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-400 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Liberado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold text-foreground">
                          {b.totalCestasRecebidas || 0} un.
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => {
                                setSelectedFichaBeneficiary(b);
                                setIsFichaControleOpen(true);
                              }}
                              title="Ver Ficha de Controle Individual"
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> Ficha
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                              onClick={() => {
                                setTargetBeneficiaryForAtendimento(b);
                                setIsAtendimentoModalOpen(true);
                              }}
                              title="Entregar Cesta / Auxílio"
                            >
                              <Package className="h-3.5 w-3.5 mr-1" /> Entregar
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => {
                                setEditingBeneficiary(b);
                                setIsBeneficiarioModalOpen(true);
                              }}
                              title="Editar"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => setBeneficiaryToDelete(b)}
                              title="Excluir"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ABA 2: HISTÓRICO DE ATENDIMENTOS & ENTREGAS */}
        <TabsContent value="atendimentos" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-card p-3 rounded-xl border">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold">Mês de Apuração:</span>
              <Input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className="h-9 w-40 text-xs"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleExportCSV} variant="outline" size="sm" className="h-9 text-xs">
                <Download className="h-3.5 w-3.5 mr-1" /> Exportar CSV
              </Button>
              <Button onClick={handleExportXLSX} variant="outline" size="sm" className="h-9 text-xs">
                <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Exportar Excel
              </Button>
              <Button onClick={handleExportRelatorioConsolidadoPDF} size="sm" className="bg-slate-800 text-white h-9 text-xs">
                <Printer className="h-3.5 w-3.5 mr-1" /> Relatório PDF (A4)
              </Button>
            </div>
          </div>

          <div className="bg-card rounded-xl border overflow-hidden shadow-2xs">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold">Data</TableHead>
                  <TableHead className="text-xs font-bold">Beneficiário(a)</TableHead>
                  <TableHead className="text-xs font-bold">Tipo de Auxílio</TableHead>
                  <TableHead className="text-xs font-bold text-center">Quantidade</TableHead>
                  <TableHead className="text-xs font-bold">Responsável pela Entrega</TableHead>
                  <TableHead className="text-xs font-bold">Parecer / Observação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y">
                {filteredAttendances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Nenhum atendimento registrado no mês de {monthFilter}.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAttendances.map((a) => (
                    <TableRow key={a.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-bold text-foreground">
                        {a.dataEntrega ? new Date(a.dataEntrega).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-foreground">{a.beneficiaryName}</div>
                        <div className="text-[11px] text-muted-foreground">CPF: {a.beneficiaryCpf || "-"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-medium">
                          {TIPO_AUXILIO_LABELS[a.tipoAuxilio] || a.tipoAuxilio}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-bold text-foreground">
                        {a.quantidade} un.
                      </TableCell>
                      <TableCell className="text-foreground">
                        {a.responsavelEntrega}
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-xs truncate">
                        {a.motivoAtendimento || a.descricaoItens || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ABA 3: ESTOQUE DE CESTAS */}
        <TabsContent value="estoque" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Total de Entradas (Doações)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">+{estoqueStats.entradas} un.</div>
                <p className="text-xs text-muted-foreground mt-1">Cestas doadas por campanhas e membros</p>
              </CardContent>
            </Card>

            <Card className="bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-rose-900 dark:text-rose-200">Total Distribuído</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-rose-700 dark:text-rose-300">-{estoqueStats.saidas} un.</div>
                <p className="text-xs text-muted-foreground mt-1">Entregues a famílias carentes</p>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-primary">Saldo Disponível no Estoque</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{estoqueStats.saldo} un.</div>
                <p className="text-xs text-muted-foreground mt-1">Prontas para atendimento</p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-card rounded-xl border p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                Histórico de Entradas de Doações no Estoque
              </h3>
              <Button onClick={() => setIsDoacaoEstoqueOpen(true)} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
                <Plus className="h-3 w-3 mr-1" /> Nova Entrada
              </Button>
            </div>

            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="text-xs font-bold">Data</TableHead>
                  <TableHead className="text-xs font-bold">Origem / Doador</TableHead>
                  <TableHead className="text-xs font-bold">Item</TableHead>
                  <TableHead className="text-xs font-bold text-center">Quantidade</TableHead>
                  <TableHead className="text-xs font-bold">Responsável</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="text-xs divide-y">
                {inventoryMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                      Nenhuma entrada de estoque registrada ainda.
                    </TableCell>
                  </TableRow>
                ) : (
                  inventoryMovements.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium text-foreground">
                        {m.data ? new Date(m.data).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">{m.origemDestino}</TableCell>
                      <TableCell>{m.item}</TableCell>
                      <TableCell className="text-center font-bold text-emerald-600">+{m.quantidade} un.</TableCell>
                      <TableCell className="text-muted-foreground">{m.responsavel}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ABA 4: RELATÓRIOS */}
        <TabsContent value="relatorios" className="space-y-4">
          <Card className="shadow-2xs">
            <CardHeader>
              <CardTitle className="text-lg">Emissão de Relatórios Oficiais da Ação Social</CardTitle>
              <CardDescription className="text-xs">
                Gere documentos consolidados em PDF (A4) com demonstrativo de famílias atendidas e assinaturas oficiais da Diretoria.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-muted/20 border rounded-xl">
                <div className="space-y-1">
                  <span className="text-xs font-semibold">Mês de Competência</span>
                  <Input
                    type="month"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="sm:col-span-2 flex items-end gap-2">
                  <Button
                    onClick={handleExportRelatorioConsolidadoPDF}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-semibold h-9 text-xs"
                  >
                    <Printer className="mr-1.5 h-4 w-4" /> Emitir Relatório Consolidado A4 (PDF)
                  </Button>
                  <Button onClick={handleExportXLSX} variant="outline" className="h-9 text-xs">
                    <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600" /> Planilha Excel
                  </Button>
                </div>
              </div>

              <div className="p-4 border rounded-xl bg-card space-y-2 text-xs">
                <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Assinaturas Oficiais Vinculadas
                </h4>
                <p className="text-muted-foreground text-[11px]">
                  Conforme determinado nas diretrizes da instituição, todos os relatórios emitidos colhem automaticamente os nomes e assinaturas digitais oficiais da <strong>Secretaria</strong> e do <strong>Pastor Presidente</strong> configurados no módulo de Configurações e Parâmetros.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modais de Operação */}
      <BeneficiarioModal
        isOpen={isBeneficiarioModalOpen}
        onClose={() => {
          setIsBeneficiarioModalOpen(false);
          setEditingBeneficiary(null);
        }}
        beneficiary={editingBeneficiary}
        onSave={handleSaveBeneficiary}
        branches={branches}
        activeBranch={activeBranch}
      />

      <AtendimentoModal
        isOpen={isAtendimentoModalOpen}
        onClose={() => {
          setIsAtendimentoModalOpen(false);
          setTargetBeneficiaryForAtendimento(null);
        }}
        beneficiaries={beneficiaries}
        selectedBeneficiary={targetBeneficiaryForAtendimento}
        onSave={handleSaveAtendimento}
        branches={branches}
        activeBranch={activeBranch}
      />

      <FichaControleBeneficiarioModal
        isOpen={isFichaControleOpen}
        onClose={() => {
          setIsFichaControleOpen(false);
          setSelectedFichaBeneficiary(null);
        }}
        beneficiary={selectedFichaBeneficiary}
        attendances={attendances}
        onOpenNovoAtendimento={(ben) => {
          setTargetBeneficiaryForAtendimento(ben);
          setIsAtendimentoModalOpen(true);
        }}
        branches={branches}
      />

      <DoacaoEstoqueModal
        isOpen={isDoacaoEstoqueOpen}
        onClose={() => setIsDoacaoEstoqueOpen(false)}
        onSave={handleSaveDoacao}
        branches={branches}
        activeBranch={activeBranch}
      />

      {/* Modal de Exclusão de Beneficiário */}
      <Dialog open={beneficiaryToDelete !== null} onOpenChange={(open) => !open && setBeneficiaryToDelete(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-xs">
              Tem certeza que deseja remover o cadastro de <strong>{beneficiaryToDelete?.nome}</strong>? O histórico de atendimentos continuará preservado na base de dados para auditoria.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" size="sm" onClick={() => setBeneficiaryToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleExecuteDeleteBeneficiary}>
              Sim, Remover Cadastro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
