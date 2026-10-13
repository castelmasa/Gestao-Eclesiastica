import React, { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  FileText,
  Download,
  Search,
  Filter,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Award,
  Crown,
  Medal,
  ChevronRight,
  Eye,
  RefreshCw,
  Printer,
  FileSpreadsheet,
  Building2,
  CheckCircle2,
  PieChart as PieChartIcon
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { getRegisteredChurchLogo, drawChurchLogoInPdf } from "@/lib/churchLogoHelper";
import { exportToCSV } from "@/lib/exportUtils";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { useBranch } from "@/contexts/BranchContext";
import { useAuth } from "@/contexts/AuthContext";
import { matchesBranch } from "@/lib/branchUtils";

interface Transaction {
  id: string;
  description: string;
  category: string;
  type: string; // 'entrada' | 'saida'
  amount: number;
  date: string;
  memberId?: string;
  memberName?: string;
  branchId?: string;
  paymentMethod?: string;
  status?: string;
  documentNumber?: string;
}

interface Member {
  id: string | number;
  name: string;
  cpf?: string;
  phone?: string;
  email?: string;
  role?: string;
  status?: string;
  branchId?: string;
}

interface ContributorStat {
  memberId: string;
  memberName: string;
  role: string;
  status: string;
  cpf?: string;
  phone?: string;
  totalTithes: number;
  tithesCount: number;
  totalOfferings: number;
  offeringsCount: number;
  totalAmount: number;
  transactionsCount: number;
  lastDate: string;
  lastCategory: string;
  monthsActive: number;
  percentageOfTotal: number;
  transactions: Transaction[];
}

export function RelatorioDizimistasOfertantes() {
  const { user } = useAuth();
  const { activeBranch, branches } = useBranch();

  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [periodPreset, setPeriodPreset] = useState<string>("this_year");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "tithes" | "offerings">("all");
  const [filterBranch, setFilterBranch] = useState<string>("all");
  const [filterMemberStatus, setFilterMemberStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"totalDesc" | "tithesDesc" | "offeringsDesc" | "countDesc" | "nameAsc">("totalDesc");

  // Selected contributor for detail modal
  const [selectedContributor, setSelectedContributor] = useState<ContributorStat | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Compute preset dates
  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (periodPreset === "this_month") {
      const firstDay = new Date(currentYear, currentMonth, 1).toISOString().split("T")[0];
      const lastDay = new Date(currentYear, currentMonth + 1, 0).toISOString().split("T")[0];
      setStartDate(firstDay);
      setEndDate(lastDay);
    } else if (periodPreset === "last_3_months") {
      const threeMonthsAgo = new Date(currentYear, currentMonth - 2, 1).toISOString().split("T")[0];
      const today = now.toISOString().split("T")[0];
      setStartDate(threeMonthsAgo);
      setEndDate(today);
    } else if (periodPreset === "last_6_months") {
      const sixMonthsAgo = new Date(currentYear, currentMonth - 5, 1).toISOString().split("T")[0];
      const today = now.toISOString().split("T")[0];
      setStartDate(sixMonthsAgo);
      setEndDate(today);
    } else if (periodPreset === "this_year") {
      setStartDate(`${currentYear}-01-01`);
      setEndDate(`${currentYear}-12-31`);
    } else if (periodPreset === "last_year") {
      setStartDate(`${currentYear - 1}-01-01`);
      setEndDate(`${currentYear - 1}-12-31`);
    } else if (periodPreset === "all_time") {
      setStartDate("");
      setEndDate("");
    }
  }, [periodPreset]);

  // Load data from Firestore and LocalStorage
  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Members
      let loadedMembers: Member[] = [];
      try {
        const memSnap = await getDocs(collection(db, "members"));
        memSnap.forEach((doc) => {
          const d = doc.data();
          loadedMembers.push({
            id: doc.id,
            name: d.name || d.nome || "Membro",
            cpf: d.cpf,
            phone: d.phone || d.telefone,
            email: d.email,
            role: d.role || d.cargo || "Membro",
            status: d.status || "Ativo",
            branchId: d.branchId
          });
        });
      } catch (e) {
        console.warn("Firestore members query fallback to localStorage", e);
      }

      if (loadedMembers.length === 0) {
        const localMem = localStorage.getItem("churchMembers");
        if (localMem) {
          loadedMembers = JSON.parse(localMem).map((m: any) => ({
            id: m.id,
            name: m.name || m.nome || "Membro",
            cpf: m.cpf,
            phone: m.phone || m.telefone,
            email: m.email,
            role: m.role || m.cargo || "Membro",
            status: m.status || "Ativo",
            branchId: m.branchId
          }));
        }
      }
      setMembers(loadedMembers);

      // 2. Transactions
      let loadedTxs: Transaction[] = [];
      try {
        const txSnap = await getDocs(collection(db, "transactions"));
        txSnap.forEach((doc) => {
          const d = doc.data();
          loadedTxs.push({
            id: doc.id,
            description: d.description || "",
            category: d.category || "Geral",
            type: d.type || "entrada",
            amount: Number(d.amount) || 0,
            date: d.date || "",
            memberId: d.memberId ? String(d.memberId) : undefined,
            memberName: d.memberName,
            branchId: d.branchId,
            paymentMethod: d.paymentMethod,
            status: d.status,
            documentNumber: d.documentNumber
          });
        });
      } catch (e) {
        console.warn("Firestore transactions query fallback to localStorage", e);
      }

      if (loadedTxs.length === 0) {
        const localTxs = localStorage.getItem("churchTransactions");
        if (localTxs) {
          loadedTxs = JSON.parse(localTxs).map((t: any) => ({
            id: t.id,
            description: t.description || "",
            category: t.category || "Geral",
            type: t.type || "entrada",
            amount: Number(t.amount) || 0,
            date: t.date || "",
            memberId: t.memberId ? String(t.memberId) : undefined,
            memberName: t.memberName,
            branchId: t.branchId,
            paymentMethod: t.paymentMethod,
            status: t.status,
            documentNumber: t.documentNumber
          }));
        }
      }
      setTransactions(loadedTxs);
    } catch (err) {
      console.error("Erro ao carregar dados para o relatório:", err);
      toast.error("Não foi possível sincronizar os dados financeiros.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Map of memberId -> Member
  const memberMap = useMemo(() => {
    const map = new Map<string, Member>();
    members.forEach((m) => {
      map.set(String(m.id), m);
    });
    return map;
  }, [members]);

  // Determine if a transaction is Tithe or Offering
  const isTitheCategory = (cat: string) => {
    const c = (cat || "").toLowerCase();
    return c.includes("dízimo") || c.includes("dizimo");
  };

  const isOfferingCategory = (cat: string) => {
    const c = (cat || "").toLowerCase();
    return c.includes("oferta") || c.includes("missões") || c.includes("missoes") || c.includes("campanha");
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Must be revenue (entrada)
      if (t.type !== "entrada") return false;

      // Filter by category type
      const isTithe = isTitheCategory(t.category);
      const isOffering = isOfferingCategory(t.category);

      if (filterType === "tithes" && !isTithe) return false;
      if (filterType === "offerings" && !isOffering) return false;
      if (filterType === "all" && !isTithe && !isOffering) {
        // Also consider transactions linked to members even if generic category
        if (!t.memberId && !t.memberName) return false;
      }

      // Filter by date
      if (startDate && t.date && t.date < startDate) return false;
      if (endDate && t.date && t.date > endDate) return false;

      // Filter by branch
      const branchToMatch = filterBranch !== "all" ? filterBranch : activeBranch;
      if (!matchesBranch(t, branchToMatch, branches)) {
        return false;
      }

      return true;
    });
  }, [transactions, filterType, startDate, endDate, filterBranch, activeBranch, branches]);

  // Aggregate statistics per contributor
  const contributorStats = useMemo(() => {
    const map = new Map<string, ContributorStat>();

    filteredTransactions.forEach((tx) => {
      // Identifier: memberId or memberName or fallback to description
      let key = tx.memberId || "";
      let name = "";
      let memberObj: Member | undefined;

      if (key && memberMap.has(key)) {
        memberObj = memberMap.get(key);
        name = memberObj?.name || "";
      }

      if (!name && tx.memberName) {
        name = tx.memberName;
        key = `name_${name.toLowerCase()}`;
      }

      // If still no name, check if member name is mentioned in description (e.g. "Dízimo - João Silva")
      if (!name && tx.description) {
        const parts = tx.description.split(/[-–:]/);
        if (parts.length > 1) {
          const possibleName = parts[parts.length - 1].trim();
          // check if matches any member
          const matched = members.find((m) => m.name.toLowerCase() === possibleName.toLowerCase());
          if (matched) {
            name = matched.name;
            key = String(matched.id);
            memberObj = matched;
          }
        }
      }

      // Fallback
      if (!name) {
        name = tx.description || "Contribuinte Anônimo / Caixa Geral";
        key = `desc_${name.toLowerCase()}`;
      }

      // Filter by member status if requested
      if (filterMemberStatus !== "all" && memberObj) {
        if (memberObj.status !== filterMemberStatus) return;
      }

      const isTithe = isTitheCategory(tx.category);
      const isOffering = isOfferingCategory(tx.category) || !isTithe;

      const current = map.get(key) || {
        memberId: key,
        memberName: name,
        role: memberObj?.role || "Membro / Contribuinte",
        status: memberObj?.status || "Ativo",
        cpf: memberObj?.cpf || "",
        phone: memberObj?.phone || "",
        totalTithes: 0,
        tithesCount: 0,
        totalOfferings: 0,
        offeringsCount: 0,
        totalAmount: 0,
        transactionsCount: 0,
        lastDate: "",
        lastCategory: "",
        monthsActive: 0,
        percentageOfTotal: 0,
        transactions: []
      };

      if (isTithe) {
        current.totalTithes += tx.amount;
        current.tithesCount += 1;
      } else {
        current.totalOfferings += tx.amount;
        current.offeringsCount += 1;
      }

      current.totalAmount += tx.amount;
      current.transactionsCount += 1;
      current.transactions.push(tx);

      if (!current.lastDate || tx.date > current.lastDate) {
        current.lastDate = tx.date;
        current.lastCategory = tx.category;
      }

      map.set(key, current);
    });

    // Calculate months active and percentages
    const totalGlobal = Array.from(map.values()).reduce((acc, c) => acc + c.totalAmount, 0);

    const list = Array.from(map.values()).map((c) => {
      // Unique months
      const uniqueMonths = new Set(
        c.transactions
          .filter((t) => t.date)
          .map((t) => t.date.substring(0, 7)) // YYYY-MM
      );
      c.monthsActive = uniqueMonths.size;
      c.percentageOfTotal = totalGlobal > 0 ? (c.totalAmount / totalGlobal) * 100 : 0;
      return c;
    });

    // Apply search filter
    const cleanSearch = searchTerm.toLowerCase().trim();
    const searchFiltered = cleanSearch
      ? list.filter(
          (c) =>
            c.memberName.toLowerCase().includes(cleanSearch) ||
            (c.cpf && c.cpf.includes(cleanSearch)) ||
            (c.role && c.role.toLowerCase().includes(cleanSearch))
        )
      : list;

    // Sort
    return searchFiltered.sort((a, b) => {
      if (sortBy === "totalDesc") return b.totalAmount - a.totalAmount;
      if (sortBy === "tithesDesc") return b.totalTithes - a.totalTithes;
      if (sortBy === "offeringsDesc") return b.totalOfferings - a.totalOfferings;
      if (sortBy === "countDesc") return b.transactionsCount - a.transactionsCount;
      if (sortBy === "nameAsc") return a.memberName.localeCompare(b.memberName);
      return 0;
    });
  }, [filteredTransactions, memberMap, members, filterMemberStatus, searchTerm, sortBy]);

  // Overall Totals
  const totals = useMemo(() => {
    let grandTotal = 0;
    let tithesTotal = 0;
    let offeringsTotal = 0;
    let totalCount = 0;

    contributorStats.forEach((c) => {
      grandTotal += c.totalAmount;
      tithesTotal += c.totalTithes;
      offeringsTotal += c.totalOfferings;
      totalCount += c.transactionsCount;
    });

    const uniqueContributors = contributorStats.length;
    const averagePerContributor = uniqueContributors > 0 ? grandTotal / uniqueContributors : 0;

    return {
      grandTotal,
      tithesTotal,
      offeringsTotal,
      totalCount,
      uniqueContributors,
      averagePerContributor
    };
  }, [contributorStats]);

  // Export to PDF
  const exportToPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const churchName = localStorage.getItem("churchName") || "Igreja Evangélica";
      const branchName =
        filterBranch !== "all"
          ? branches.find((b) => b.id === filterBranch)?.name || filterBranch
          : activeBranch !== "all"
          ? branches.find((b) => b.id === activeBranch)?.name || "Filial Ativa"
          : "Todas as Congregações";

      // 1. Header with styling
      doc.setFillColor(30, 41, 59); // Slate-800
      doc.rect(0, 0, 210, 32, "F");

      const churchLogo = getRegisteredChurchLogo(filterBranch !== 'all' ? filterBranch : activeBranch);
      let textX = 14;
      if (churchLogo) {
        const added = drawChurchLogoInPdf(doc, churchLogo, 14, 5, 22, 22);
        if (added) textX = 40;
      }

      doc.setTextColor(255, 255, 255);
      const maxHeaderW = 196 - textX;
      let titleSize = 13;
      doc.setFontSize(titleSize);
      while (doc.getTextWidth(churchName.toUpperCase()) > maxHeaderW && titleSize > 8.5) {
        titleSize -= 0.5;
        doc.setFontSize(titleSize);
      }
      doc.setFont("helvetica", "bold");
      doc.text(churchName.toUpperCase(), textX, 13, { maxWidth: maxHeaderW });

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("SECRETARIA GERAL & TESOURARIA • RELATÓRIO EXECUTIVO DE CONTRIBUIÇÕES", textX, 20);

      doc.setFontSize(7.5);
      doc.setTextColor(203, 213, 225);
      const generatedAt = new Date().toLocaleString("pt-BR");
      doc.text(`Filial: ${branchName} | Emitido em: ${generatedAt} por: ${user?.name || "Administração"}`, textX, 26);

      // 2. Report Meta Banner
      doc.setFillColor(241, 245, 249); // Slate-100
      doc.rect(14, 36, 182, 22, "F");
      doc.setDrawColor(203, 213, 225);
      doc.rect(14, 36, 182, 22, "S");

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      const periodLabel =
        periodPreset === "this_month"
          ? "Mês Atual"
          : periodPreset === "this_year"
          ? "Ano Vigente"
          : startDate && endDate
          ? `${startDate} a ${endDate}`
          : "Todo o Histórico";

      doc.text("RANKING AVANÇADO DE DIZIMISTAS E OFERTANTES", 18, 43);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        `Período Analisado: ${periodLabel} | Filtro: ${
          filterType === "all" ? "Dízimos e Ofertas" : filterType === "tithes" ? "Apenas Dízimos" : "Apenas Ofertas"
        }`,
        18,
        48
      );
      doc.text(
        `Total Arrecadado: ${totals.grandTotal.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        })} | Contribuintes Ativos: ${totals.uniqueContributors} | Média: ${totals.averagePerContributor.toLocaleString(
          "pt-BR",
          { style: "currency", currency: "BRL" }
        )}`,
        18,
        54
      );

      // 3. Confidential Notice
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(185, 28, 28); // red-700
      doc.text(
        "CONFIDENCIAL: Documento de controle interno eclesiástico. Protegido sob sigilo pastoral e estatutário.",
        14,
        62
      );

      // 4. Data Table
      const tableRows = contributorStats.map((c, index) => {
        return [
          `#${index + 1}`,
          c.memberName,
          c.role,
          c.cpf ? c.cpf : "-",
          c.tithesCount.toString(),
          c.totalTithes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
          c.totalOfferings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
          c.totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
          `${c.percentageOfTotal.toFixed(1)}%`,
          c.lastDate ? new Date(c.lastDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"
        ];
      });

      autoTable(doc, {
        startY: 65,
        head: [
          [
            "Pos",
            "Nome do Contribuinte",
            "Cargo",
            "CPF",
            "Qtd",
            "Dízimos (R$)",
            "Ofertas (R$)",
            "Total Geral (R$)",
            "Part.",
            "Última Contrib."
          ]
        ],
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: "bold",
          halign: "left"
        },
        bodyStyles: {
          fontSize: 7,
          cellPadding: 2
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center", fontStyle: "bold" },
          1: { cellWidth: 42, fontStyle: "bold" },
          2: { cellWidth: 20 },
          3: { cellWidth: 22 },
          4: { cellWidth: 10, halign: "center" },
          5: { cellWidth: 22, halign: "right" },
          6: { cellWidth: 22, halign: "right" },
          7: { cellWidth: 25, halign: "right", fontStyle: "bold" },
          8: { cellWidth: 12, halign: "center" },
          9: { cellWidth: 17, halign: "center" }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        margin: { left: 14, right: 14 },
        didDrawPage: (data) => {
          // Footer
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Página ${data.pageNumber} de ${pageCount} • Sistema de Gestão Eclesiástica`,
            14,
            doc.internal.pageSize.height - 8
          );
        }
      });

      // 5. Signatures on the last page
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      const pageHeight = doc.internal.pageSize.height;

      let sigY = finalY;
      if (sigY + 30 > pageHeight) {
        doc.addPage();
        sigY = 40;
      }

      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.5);

      // Line 1: Pastor
      doc.line(20, sigY + 12, 90, sigY + 12);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("Pastor Presidente / Titular", 35, sigY + 16);

      // Line 2: Tesoureiro
      doc.line(120, sigY + 12, 190, sigY + 12);
      doc.text("Tesoureiro(a) / Secretaria Geral", 132, sigY + 16);

      doc.save(`relatorio_dizimistas_ofertantes_${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("Relatório de Dizimistas e Ofertantes exportado com sucesso em PDF!");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao gerar PDF.");
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    try {
      const data = contributorStats.map((c, i) => ({
        Ranking: i + 1,
        Nome: c.memberName,
        Cargo: c.role,
        Status: c.status,
        CPF: c.cpf || "",
        Telefone: c.phone || "",
        "Qtd Dízimos": c.tithesCount,
        "Total Dízimos (R$)": c.totalTithes,
        "Qtd Ofertas": c.offeringsCount,
        "Total Ofertas (R$)": c.totalOfferings,
        "Total Geral (R$)": c.totalAmount,
        "Participação (%)": Number(c.percentageOfTotal.toFixed(2)),
        "Meses Contribuindo": c.monthsActive,
        "Última Contribuição": c.lastDate || ""
      }));

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Dizimistas e Ofertantes");
      XLSX.writeFile(workbook, `ranking_dizimistas_ofertantes_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Planilha Excel exportada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao exportar Excel.");
    }
  };

  // Individual Contributor Statement PDF
  const exportIndividualStatementPDF = (c: ContributorStat) => {
    try {
      const doc = new jsPDF();
      const churchName = localStorage.getItem("churchName") || "Igreja Evangélica";

      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, 210, 28, "F");

      const churchLogo = getRegisteredChurchLogo();
      let textX = 14;
      if (churchLogo) {
        const added = drawChurchLogoInPdf(doc, churchLogo, 14, 4, 20, 20);
        if (added) textX = 38;
      }

      doc.setTextColor(255, 255, 255);
      const maxIndHeaderW = 196 - textX;
      let indTitleSize = 13;
      doc.setFontSize(indTitleSize);
      while (doc.getTextWidth(churchName.toUpperCase()) > maxIndHeaderW && indTitleSize > 8.5) {
        indTitleSize -= 0.5;
        doc.setFontSize(indTitleSize);
      }
      doc.setFont("helvetica", "bold");
      doc.text(churchName.toUpperCase(), textX, 13, { maxWidth: maxIndHeaderW });

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text("COMPROVANTE / EXTRATO INDIVIDUAL DE CONTRIBUIÇÕES ECLESIÁSTICAS", textX, 20);

      // Contributor Box
      doc.setFillColor(248, 250, 252);
      doc.rect(14, 34, 182, 26, "F");
      doc.setDrawColor(226, 232, 240);
      doc.rect(14, 34, 182, 26, "S");

      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.text(`Membro: ${c.memberName.toUpperCase()}`, 18, 42);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text(`Cargo: ${c.role} | CPF: ${c.cpf || "Não informado"} | Status: ${c.status}`, 18, 48);
      doc.text(
        `Total Dízimos: ${c.totalTithes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (${c.tithesCount}x) | Total Ofertas: ${c.totalOfferings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} (${c.offeringsCount}x)`,
        18,
        54
      );

      const rows = c.transactions
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
        .map((t) => [
          t.date ? new Date(t.date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-",
          t.category || "Geral",
          t.description || "Contribuição",
          t.paymentMethod || "Não informado",
          t.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
        ]);

      autoTable(doc, {
        startY: 65,
        head: [["Data", "Categoria", "Descrição / Finalidade", "Forma de Pagto", "Valor (R$)"]],
        body: rows,
        theme: "striped",
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 8,
          halign: "left"
        },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 35 },
          2: { cellWidth: 65 },
          3: { cellWidth: 30 },
          4: { cellWidth: 27, halign: "right", fontStyle: "bold" }
        },
        margin: { left: 14, right: 14 }
      });

      const finalY = (doc as any).lastAutoTable.finalY + 15;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text(
        `TOTAL ACUMULADO NO PERÍODO: ${c.totalAmount.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL"
        })}`,
        14,
        finalY
      );

      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(100, 116, 139);
      doc.text(
        "\"Cada um dê conforme determinou em seu coração, não com pesar ou por obrigação, pois Deus ama quem dá com alegria.\" (2 Coríntios 9:7)",
        14,
        finalY + 10
      );

      doc.save(`extrato_contribuicoes_${c.memberName.replace(/\s+/g, "_")}.pdf`);
      toast.success("Extrato individual gerado com sucesso em PDF!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar extrato individual.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="border-border/60 shadow-sm bg-gradient-to-r from-card via-card to-muted/20">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Award className="w-5 h-5" />
                </div>
                <CardTitle className="text-xl font-bold tracking-tight">
                  Relatório Avançado: Dizimistas & Ofertantes
                </CardTitle>
              </div>
              <CardDescription className="mt-1">
                Acompanhe a fidelidade, constância e o ranking dos membros mais ativos nas contribuições da igreja.
              </CardDescription>
            </div>

            {/* Actions: Export PDF & Excel */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={isLoading}
                className="gap-1.5 text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                disabled={contributorStats.length === 0}
                className="gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                Exportar Excel
              </Button>
              <Button
                size="sm"
                onClick={exportToPDF}
                disabled={contributorStats.length === 0}
                className="gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-50 dark:hover:bg-slate-200 dark:text-slate-900 shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" />
                Exportar Relatório PDF
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Filters Bar */}
        <CardContent className="pt-0 border-t border-border/40">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-4">
            {/* 1. Period Preset */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Período
              </label>
              <Select value={periodPreset} onValueChange={setPeriodPreset}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">Este Mês</SelectItem>
                  <SelectItem value="last_3_months">Últimos 3 Meses</SelectItem>
                  <SelectItem value="last_6_months">Últimos 6 Meses</SelectItem>
                  <SelectItem value="this_year">Este Ano (2026)</SelectItem>
                  <SelectItem value="last_year">Ano Anterior (2025)</SelectItem>
                  <SelectItem value="all_time">Todo o Histórico</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 2. Type */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                Tipo de Contribuição
              </label>
              <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Dízimos e Ofertas (Tudo)</SelectItem>
                  <SelectItem value="tithes">Apenas Dízimos</SelectItem>
                  <SelectItem value="offerings">Apenas Ofertas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 3. Branch Filter */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                Congregação / Filial
              </label>
              <Select value={filterBranch} onValueChange={setFilterBranch}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Todas Filiais" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Filiais</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 4. Sort By */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" />
                Ordenar Por
              </label>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="totalDesc">Maior Total Acumulado (R$)</SelectItem>
                  <SelectItem value="tithesDesc">Maior Valor em Dízimos</SelectItem>
                  <SelectItem value="offeringsDesc">Maior Valor em Ofertas</SelectItem>
                  <SelectItem value="countDesc">Mais Contribuições (Qtd)</SelectItem>
                  <SelectItem value="nameAsc">Nome do Membro (A-Z)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 5. Search Contributor */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Search className="w-3.5 h-3.5" />
                Buscar Contribuinte
              </label>
              <Input
                placeholder="Filtrar por nome ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Custom Date Inputs if 'custom' is selected */}
          {periodPreset === "custom" && (
            <div className="flex items-center gap-3 pt-3 border-t border-border/30 mt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">De:</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Até:</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 text-xs w-36"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-border/60 bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Arrecadado</p>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                {totals.grandTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              <span className="text-[11px] text-muted-foreground">no período selecionado</span>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total em Dízimos</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1">
                {totals.tithesTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              <span className="text-[11px] text-muted-foreground">
                {totals.grandTotal > 0
                  ? `${((totals.tithesTotal / totals.grandTotal) * 100).toFixed(1)}% do total`
                  : "0%"}
              </span>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total em Ofertas</p>
              <p className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                {totals.offeringsTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              <span className="text-[11px] text-muted-foreground">
                {totals.grandTotal > 0
                  ? `${((totals.offeringsTotal / totals.grandTotal) * 100).toFixed(1)}% do total`
                  : "0%"}
              </span>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Contribuintes Únicos</p>
              <p className="text-xl font-bold text-foreground mt-1">{totals.uniqueContributors}</p>
              <span className="text-[11px] text-muted-foreground">
                {totals.totalCount} lançamentos efetuados
              </span>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
              <Users className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Média por Contribuinte</p>
              <p className="text-xl font-bold text-foreground mt-1">
                {totals.averagePerContributor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </p>
              <span className="text-[11px] text-muted-foreground">ticket médio no período</span>
            </div>
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <PieChartIcon className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Ranking Table */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <span>Ranking dos Dizimistas e Ofertantes Mais Ativos</span>
                <Badge variant="secondary" className="font-normal text-xs">
                  {contributorStats.length} contribuintes
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Clique em qualquer membro para ver o extrato discriminado com comprovantes e datas.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-muted/40 text-xs">
                  <TableHead className="w-12 text-center font-bold">#</TableHead>
                  <TableHead className="min-w-[220px]">Nome do Contribuinte</TableHead>
                  <TableHead className="text-center">Lançamentos</TableHead>
                  <TableHead className="text-right">Dízimos (R$)</TableHead>
                  <TableHead className="text-right">Ofertas (R$)</TableHead>
                  <TableHead className="text-right font-bold">Total Geral (R$)</TableHead>
                  <TableHead className="text-center">Part. (%)</TableHead>
                  <TableHead className="text-center">Constância</TableHead>
                  <TableHead className="text-center">Última Contribuição</TableHead>
                  <TableHead className="w-14 text-center">Extrato</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {contributorStats.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-12 text-center text-muted-foreground text-sm">
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                          <span>Carregando dados financeiros da igreja...</span>
                        </div>
                      ) : (
                        "Nenhuma contribuição de dízimo ou oferta encontrada no período selecionado."
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  contributorStats.map((c, index) => {
                    const isTop1 = index === 0;
                    const isTop2 = index === 1;
                    const isTop3 = index === 2;

                    return (
                      <TableRow
                        key={c.memberId}
                        className="hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => {
                          setSelectedContributor(c);
                          setIsDetailModalOpen(true);
                        }}
                      >
                        {/* Rank Badge */}
                        <TableCell className="text-center font-bold">
                          {isTop1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white shadow-xs text-xs font-bold">
                              1
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-400 text-white shadow-xs text-xs font-bold">
                              2
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white shadow-xs text-xs font-bold">
                              3
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">#{index + 1}</span>
                          )}
                        </TableCell>

                        {/* Name & Role */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-xs shrink-0">
                              {c.memberName.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-medium text-sm text-foreground truncate flex items-center gap-1.5">
                                <span>{c.memberName}</span>
                                {isTop1 && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {c.role} {c.cpf ? `• CPF: ${c.cpf}` : ""}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Count */}
                        <TableCell className="text-center text-xs">
                          <Badge variant="outline" className="font-normal text-xs">
                            {c.transactionsCount}x
                          </Badge>
                        </TableCell>

                        {/* Tithes */}
                        <TableCell className="text-right text-xs font-medium text-blue-600 dark:text-blue-400">
                          {c.totalTithes > 0 ? (
                            <span>
                              {c.totalTithes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              <span className="text-[10px] text-muted-foreground ml-1">({c.tithesCount})</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Offerings */}
                        <TableCell className="text-right text-xs font-medium text-purple-600 dark:text-purple-400">
                          {c.totalOfferings > 0 ? (
                            <span>
                              {c.totalOfferings.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              <span className="text-[10px] text-muted-foreground ml-1">({c.offeringsCount})</span>
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>

                        {/* Total Grand */}
                        <TableCell className="text-right text-sm font-bold text-emerald-600 dark:text-emerald-400">
                          {c.totalAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </TableCell>

                        {/* Percentage */}
                        <TableCell className="text-center text-xs text-muted-foreground">
                          <Badge variant="secondary" className="text-[11px] font-medium">
                            {c.percentageOfTotal.toFixed(1)}%
                          </Badge>
                        </TableCell>

                        {/* Consistency / Months active */}
                        <TableCell className="text-center text-xs">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              c.monthsActive >= 3
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400"
                                : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-400"
                            }`}
                          >
                            {c.monthsActive} {c.monthsActive === 1 ? "mês" : "meses"}
                          </Badge>
                        </TableCell>

                        {/* Last date */}
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {c.lastDate ? new Date(c.lastDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"}
                        </TableCell>

                        {/* View Action */}
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedContributor(c);
                              setIsDetailModalOpen(true);
                            }}
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal for Contributor */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-3xl">
          {selectedContributor && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {selectedContributor.memberName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <DialogTitle className="text-lg font-bold">
                        {selectedContributor.memberName}
                      </DialogTitle>
                      <DialogDescription className="text-xs">
                        {selectedContributor.role} • {selectedContributor.status}
                        {selectedContributor.cpf ? ` • CPF: ${selectedContributor.cpf}` : ""}
                      </DialogDescription>
                    </div>
                  </div>
                </div>
              </DialogHeader>

              {/* Contributor Quick KPIs */}
              <div className="grid grid-cols-3 gap-3 py-2">
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[11px] text-muted-foreground">Total em Dízimos</span>
                  <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                    {selectedContributor.totalTithes.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    })}
                  </p>
                  <span className="text-[10px] text-muted-foreground">{selectedContributor.tithesCount} lançamentos</span>
                </div>

                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <span className="text-[11px] text-muted-foreground">Total em Ofertas</span>
                  <p className="text-base font-bold text-purple-600 dark:text-purple-400 mt-0.5">
                    {selectedContributor.totalOfferings.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    })}
                  </p>
                  <span className="text-[10px] text-muted-foreground">{selectedContributor.offeringsCount} lançamentos</span>
                </div>

                <div className="p-3 rounded-lg border border-border/60 bg-emerald-500/10 border-emerald-500/20">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Total Geral Acumulado</span>
                  <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {selectedContributor.totalAmount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    })}
                  </p>
                  <span className="text-[10px] text-muted-foreground">{selectedContributor.percentageOfTotal.toFixed(2)}% do arrecadado</span>
                </div>
              </div>

              {/* Transactions List */}
              <div className="space-y-2 mt-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Histórico Individual de Contribuições ({selectedContributor.transactions.length})
                </h4>
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs bg-muted/40">
                        <TableHead>Data</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Forma de Pagto</TableHead>
                        <TableHead className="text-right">Valor (R$)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedContributor.transactions
                        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                        .map((t) => {
                          const isTithe = isTitheCategory(t.category);
                          return (
                            <TableRow key={t.id} className="text-xs">
                              <TableCell className="text-muted-foreground">
                                {t.date ? new Date(t.date).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    isTithe
                                      ? "text-blue-600 border-blue-200 bg-blue-50/50 dark:bg-blue-950/40"
                                      : "text-purple-600 border-purple-200 bg-purple-50/50 dark:bg-purple-950/40"
                                  }`}
                                >
                                  {t.category || "Geral"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium text-foreground">{t.description}</TableCell>
                              <TableCell className="text-muted-foreground">{t.paymentMethod || "Não informado"}</TableCell>
                              <TableCell className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                                {t.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <DialogFooter className="flex items-center justify-between sm:justify-between w-full pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportIndividualStatementPDF(selectedContributor)}
                  className="gap-2 text-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Imprimir Extrato Individual (PDF)
                </Button>
                <Button size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
