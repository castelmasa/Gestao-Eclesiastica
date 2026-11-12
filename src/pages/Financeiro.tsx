import { exportToCSV, exportToXLSX } from "@/lib/exportUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { motion } from "motion/react";
import React, { useState, useMemo, useEffect, useRef } from "react"
import { printDocument } from "@/lib/printUtils"
import { PrintDebugger } from "@/components/PrintDebugger"
import { getRegisteredChurchLogo, drawChurchLogoInPdf, drawSafeChurchReportHeader, drawFinancialReportSignatures } from "@/lib/churchLogoHelper"

import { useLocation } from "react-router-dom"
import { useBranch } from "@/contexts/BranchContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import * as XLSX from "xlsx"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip as TooltipUITooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Plus, Search, Download, Eye, FilterX, Check, ChevronsUpDown, FileText, X, Settings, Trash2, Printer, Activity, Info, RefreshCw, Paperclip, ExternalLink, Leaf, CloudUpload, Building2, Calendar, AlertTriangle, BarChart2, FileSpreadsheet, Sparkles, Camera, Loader2, Lock, Unlock, ShieldCheck, ShieldAlert, FolderArchive, Tag, Calculator, QrCode } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { validateForm } from "@/lib/validation"
import { executeDbOperation } from "@/lib/firebaseHelper"
import { normalizeUTF8 } from "@/lib/unicodeUtils"
import { matchesBranch, isSedeBranch } from "@/lib/branchUtils"
import { logAction } from "@/lib/audit"
import { useAuditFinanceiro } from "@/hooks/useAuditFinanceiro"
import { AttachmentViewerModal } from "@/components/AttachmentViewerModal"
import { FinancialEcoPrintModal } from "@/components/financeiro/FinancialEcoPrintModal"
import { FinancialRechartsPanel } from "@/components/financeiro/FinancialRechartsPanel"
import { FinancialD3Panel } from "@/components/financeiro/FinancialD3Panel"
import { FinancialCalculatorModal } from "@/components/financeiro/FinancialCalculatorModal"
import { CarneDizimoModal } from "@/components/financeiro/CarneDizimoModal"
import { CloudBackupAndExportModal } from "@/components/financeiro/CloudBackupAndExportModal"
import { BalanceteMensalModal } from "@/components/financeiro/BalanceteMensalModal"
import { ClosedMonthManagerModal } from "@/components/financeiro/ClosedMonthManagerModal"
import { FolderCoverAndLabelsModal } from "@/components/financeiro/FolderCoverAndLabelsModal"
import { BankReconciliationModal } from "@/components/financeiro/BankReconciliationModal"
import { subscribeToClosedMonths, isMonthLockedHelper, getClosedMonthRecord, ClosedFinancialMonth, formatYearMonthDisplay } from "@/lib/closedMonthsHelper"
import { useAuth } from "@/contexts/AuthContext"
import { useAiCredits } from "@/contexts/AiCreditsContext"
import { AiCreditsBadge } from "@/components/common/AiCreditsBadge"
import { db } from "@/lib/firebase"
import { TablePagination } from "@/components/ui/table-pagination"
import { logCriticalError } from "@/lib/errorLogger"
import { collection, getDocs, doc, setDoc, query, where, orderBy, addDoc, serverTimestamp, onSnapshot, limit, updateDoc, deleteDoc } from "firebase/firestore"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, LineChart, Line, Tooltip as RechartsTooltip } from "recharts"
import { cpf as cpfValidator, cnpj as cnpjValidator } from "cpf-cnpj-validator"

type Transaction = {
  id: string;
  date: string;
  documentNumber: string;
  description: string;
  category: string;
  type: string;
  amount: number;
  memberId?: string;
  costCenter?: string;
  branchId?: string;
  supplier?: string;
  status?: 'Pago' | 'Pendente';
  dueDate?: string;
  historico?: string;
  comprovante?: string;
  receiptFileName?: string;
  paymentMethod?: string;
  supplierId?: string;
};

const initialTransactions: Transaction[] = [];

export function parseCurrencyInput(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = String(val).trim().replace(/[^\d.,]/g, '');
  if (!str) return 0;
  if (str.includes(',')) {
    str = str.replace(/\./g, '').replace(',', '.');
  } else if ((str.match(/\./g) || []).length > 1) {
    str = str.replace(/\./g, '');
  } else if (str.includes('.')) {
    const parts = str.split('.');
    if (parts[1].length === 3 && parts[0].length >= 1 && parts[0].length <= 3) {
      str = parts[0] + parts[1];
    }
  }
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function Financeiro() {
  const { user } = useAuth();
  const { canUseAi, consumeCredit, openCreditsModal } = useAiCredits();
  const isFinanceiroAdmin = ['administrador', 'tesoureiro'].includes(user?.role?.toLowerCase() || '');
  const canAddTransaction = isFinanceiroAdmin || user?.permissions?.financeiro?.add !== false;

  const { activeBranch, branches, activeBranchName } = useBranch();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Filtra transações estritamente pela congregação ativa / consolidado
  const branchTransactions = useMemo(() => {
    return transactions.filter(t => matchesBranch(t, activeBranch, branches));
  }, [transactions, activeBranch, branches]);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"entrada" | "saida">("entrada");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");
  const [activeMainTab, setActiveMainTab] = useState("transacoes");
  const [categories, setCategories] = useState<any[]>([]);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [newManagerCategoryName, setNewManagerCategoryName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [openCategory, setOpenCategory] = useState(false);
  const [comprovanteName, setComprovanteName] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [comprovanteData, setComprovanteData] = useState<string | null>(null);
  const [viewingAttachment, setViewingAttachment] = useState<{ url: string; fileName?: string } | null>(null);

  // Estados para itens e cadastro rápido de categorias e itens (Entrada e Saída)
  const [items, setItems] = useState<any[]>([]);
  const [isQuickCategoryOpen, setIsQuickCategoryOpen] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState("");
  const [isQuickItemOpen, setIsQuickItemOpen] = useState(false);
  const [quickItemName, setQuickItemName] = useState("");
  const [quickItemCategory, setQuickItemCategory] = useState("");
  const [selectedItemName, setSelectedItemName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");

  // Hook centralizado de auditoria com persistência Firestore e localStorage
  const {
    financialAuditLogs,
    logCriticalDeletion,
    logCriticalUpdate,
    logFinancialCreation
  } = useAuditFinanceiro();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isAnnualReportOpen, setIsAnnualReportOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isEcoPrintOpen, setIsEcoPrintOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isBalanceteModalOpen, setIsBalanceteModalOpen] = useState(false);
  const [showPrintDebugger, setShowPrintDebugger] = useState(false);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<string[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  const [chartCategoryFilter, setChartCategoryFilter] = useState("all");
  const [chartCostCenterFilter, setChartCostCenterFilter] = useState("all");

  const [closedMonths, setClosedMonths] = useState<ClosedFinancialMonth[]>([]);
  const [isLockManagerOpen, setIsLockManagerOpen] = useState(false);
  const [isFolderCoverModalOpen, setIsFolderCoverModalOpen] = useState(false);
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isCarneModalOpen, setIsCarneModalOpen] = useState(false);

  useEffect(() => {
    const unsub = subscribeToClosedMonths((months) => {
      setClosedMonths(months);
    });
    return () => unsub();
  }, []);

  const now = new Date();
  const currentMonthDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [reportStartMonth, setReportStartMonth] = useState<string>(currentMonthDefault);
  const [reportEndMonth, setReportEndMonth] = useState<string>(currentMonthDefault);
  const [reportSortOrder, setReportSortOrder] = useState<"nome-asc" | "nome-desc" | "data-asc" | "data-desc" | "valor-desc" | "valor-asc">("data-asc");
  
  const [churchData, setChurchData] = useState<any>(() => {
    const key = activeBranch && activeBranch !== 'all' && activeBranch !== 'sede' 
      ? `churchConfig_${activeBranch}` 
      : 'churchConfig';
    const specific = localStorage.getItem(key);
    const globalSaved = localStorage.getItem('churchConfig');
    if (specific) {
      try { return JSON.parse(specific); } catch (e) {}
    }
    if (globalSaved) {
      try { return JSON.parse(globalSaved); } catch (e) {}
    }
    return { 
      nome: "Igreja Evangélica Pentecostal O Brasil para Cristo", 
      endereco: "Rua Bartolomeu Bueno, Nº 629", 
      cidade: "Valparaiso - SP", 
      cnpj: "51.105.484/0001-74", 
      phone: "(18) 0000-0000", 
      pastorTitular: "Pr. Samuel de Oliveira",
      tesoureiro1: "Carlos Roberto",
      logoDataUrl: "" 
    };
  });

  useEffect(() => {
    const loadConfig = () => {
      const key = activeBranch && activeBranch !== 'all' && activeBranch !== 'sede' 
        ? `churchConfig_${activeBranch}` 
        : 'churchConfig';
      const specific = localStorage.getItem(key);
      const globalSaved = localStorage.getItem('churchConfig');
      const branchObj = branches.find(b => b.id === activeBranch);
      
      let base: any = {
        nome: "Igreja Evangélica Pentecostal O Brasil para Cristo",
        endereco: "Rua Bartolomeu Bueno, Nº 629",
        cidade: "Valparaiso - SP",
        cnpj: "51.105.484/0001-74",
        pastorTitular: "Pr. Samuel de Oliveira",
        tesoureiro1: "Carlos Roberto"
      };

      if (globalSaved) {
        try { base = { ...base, ...JSON.parse(globalSaved) }; } catch (e) {}
      }
      if (specific) {
        try { 
          setChurchData({ ...base, ...JSON.parse(specific) }); 
          return;
        } catch (e) {}
      }
      if (branchObj && branchObj.type !== 'sede') {
        setChurchData({
          ...base,
          nome: branchObj.name ? `${base.nome} - ${branchObj.name}` : base.nome,
          cnpj: branchObj.cnpj || base.cnpj,
          endereco: branchObj.address || base.endereco,
          cidade: branchObj.cidade || base.cidade,
          pastorTitular: branchObj.pastor || base.pastorTitular
        });
      } else {
        setChurchData(base);
      }
    };

    loadConfig();
    window.addEventListener("churchConfigUpdated", loadConfig);
    window.addEventListener("storage", loadConfig);
    return () => {
      window.removeEventListener("churchConfigUpdated", loadConfig);
      window.removeEventListener("storage", loadConfig);
    };
  }, [activeBranch, branches]);

  const [selectedBranch, setSelectedBranch] = useState<string>("sede");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("none");
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>("Geral");
  const [selectedMemberId, setSelectedMemberId] = useState<string>("none");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("Pix");
  const [selectedStatus, setSelectedStatus] = useState<"Pago" | "Pendente">("Pago");

  const [transactionOpDate, setTransactionOpDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [transactionDueDate, setTransactionDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const opDateInputRef = useRef<HTMLInputElement>(null);
  const dueDateInputRef = useRef<HTMLInputElement>(null);
  const startMonthInputRef = useRef<HTMLInputElement>(null);
  const endMonthInputRef = useRef<HTMLInputElement>(null);
  const tableMonthInputRef = useRef<HTMLInputElement>(null);

  // Estados e referências para IA de Preenchimento Rápido no Financeiro (sem lentidão)
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const scanFileInputRef = useRef<HTMLInputElement>(null);

  // Redimensionamento leve da imagem client-side para resposta ultra-rápida na API
  const resizeImageForFastOcr = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1000;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.75));
        };
        img.onerror = () => resolve(e.target?.result as string);
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleScanReceiptWithAI = async (file: File) => {
    if (!file) return;

    if (!canUseAi(1)) {
      openCreditsModal();
      toast.warning("Seus créditos de IA deste mês se esgotaram. Recarregue para escanear novos comprovantes.", { id: "receipt-ocr" });
      if (scanFileInputRef.current) scanFileInputRef.current.value = "";
      return;
    }

    setIsScanningReceipt(true);
    toast.loading("Lendo comprovante com IA e preenchendo automaticamente...", { id: "receipt-ocr" });
    try {
      const compressedDataUrl = await resizeImageForFastOcr(file);
      
      const res = await fetch("/api/gemini/receipt-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: compressedDataUrl,
          mimeType: "image/jpeg"
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Erro ao escanear documento");
      }

      const ocrData = await res.json();
      
      // Auto-preenche os dados com agilidade
      if (ocrData.type === "saida" || ocrData.type === "entrada") {
        setTransactionType(ocrData.type);
      }
      
      if (ocrData.amount && typeof ocrData.amount === "number") {
        setFormAmount(ocrData.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      }
      
      if (ocrData.date) {
        setTransactionOpDate(ocrData.date);
        setTransactionDueDate(ocrData.date);
      }
      
      if (ocrData.description) {
        setFormDescription(ocrData.description);
      }
      
      if (ocrData.documentNumber) {
        const docInput = document.getElementById("documentNumber") as HTMLInputElement;
        if (docInput) docInput.value = ocrData.documentNumber;
      }
      
      if (ocrData.paymentMethod) {
        const pm = ocrData.paymentMethod.toLowerCase();
        if (pm.includes("pix")) setSelectedPaymentMethod("Pix");
        else if (pm.includes("dinheiro")) setSelectedPaymentMethod("Dinheiro");
        else if (pm.includes("boleto")) setSelectedPaymentMethod("Boleto");
        else if (pm.includes("cartão") || pm.includes("cartao")) setSelectedPaymentMethod("Cartão");
        else if (pm.includes("transf") || pm.includes("ted")) setSelectedPaymentMethod("TED/DOC");
      }

      // Se encontrou fornecedor
      if (ocrData.supplier) {
        const matched = fornecedores.find((f: any) => 
          f.name?.toLowerCase().includes(ocrData.supplier.toLowerCase()) || 
          ocrData.supplier.toLowerCase().includes(f.name?.toLowerCase())
        );
        if (matched) {
          setSelectedSupplierId(matched.id);
        }
      }

      // Categoria inteligente
      if (ocrData.category) {
        const catMatch = availableCategories.find(c => 
          c.name.toLowerCase().includes(ocrData.category.toLowerCase()) ||
          ocrData.category.toLowerCase().includes(c.name.toLowerCase())
        );
        if (catMatch) {
          setSelectedCategory(catMatch.name);
        } else {
          setSelectedCategory(ocrData.category);
        }
      }

      // Já anexa o comprovante automaticamente no formulário
      setComprovanteName(file.name);
      setComprovanteData(compressedDataUrl);

      // Consome 1 crédito e grava auditoria no Firestore
      await consumeCredit("Leitura de Recibo / Comprovante (OCR)", 1);

      toast.success("Documento lido e formulário preenchido com sucesso! (1 crédito de IA)", { id: "receipt-ocr" });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Não foi possível escanear o documento.", { id: "receipt-ocr" });
    } finally {
      setIsScanningReceipt(false);
      if (scanFileInputRef.current) scanFileInputRef.current.value = "";
    }
  };

  // Sugestão de categoria contábil eclesiástica em tempo real na digitação da descrição
  const suggestedCategory = useMemo(() => {
    if (!formDescription) return null;
    const desc = formDescription.toLowerCase();
    if (desc.includes("luz") || desc.includes("energia") || desc.includes("copel") || desc.includes("cpfl") || desc.includes("enel") || desc.includes("cemig") || desc.includes("eletro")) return "Energia Elétrica";
    if (desc.includes("água") || desc.includes("agua") || desc.includes("sabesp") || desc.includes("sanepar") || desc.includes("copasa") || desc.includes("esgoto")) return "Água e Esgoto";
    if (desc.includes("limpeza") || desc.includes("detergente") || desc.includes("papel higiênico") || desc.includes("sabão") || desc.includes("cloro")) return "Limpeza e Conservação";
    if (desc.includes("gasolina") || desc.includes("combustível") || desc.includes("combustivel") || desc.includes("etanol") || desc.includes("diesel") || desc.includes("posto")) return "Combustível";
    if (desc.includes("dízimo") || desc.includes("dizimo")) return "Dízimos";
    if (desc.includes("oferta") || desc.includes("missões") || desc.includes("missoes") || desc.includes("missionário") || desc.includes("missionario")) return "Missões e Evangelismo";
    if (desc.includes("reforma") || desc.includes("manutenção") || desc.includes("manutencao") || desc.includes("pintura") || desc.includes("pedreiro")) return "Manutenção do Templo";
    if (desc.includes("som") || desc.includes("microfone") || desc.includes("cabo") || desc.includes("caixa") || desc.includes("instrumento") || desc.includes("teclado")) return "Equipamentos de Som";
    if (desc.includes("ceia") || desc.includes("pão") || desc.includes("uva") || desc.includes("suco") || desc.includes("lanche") || desc.includes("confraternização")) return "Alimentação e Eventos";
    return null;
  }, [formDescription]);

  const isDateInCurrentMonthYear = (dateStr: string) => {
    if (!dateStr) return false;
    const parts = dateStr.split('-');
    if (parts.length < 2) return false;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const current = new Date();
    return y === current.getFullYear() && m === current.getMonth();
  };

  const getCurrentMonthName = () => {
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const current = new Date();
    return `${monthNames[current.getMonth()]} de ${current.getFullYear()}`;
  };



  useEffect(() => {
    const unsubs = [];
    
    const isSede = isSedeBranch(activeBranch, branches);
    const shouldFilterBranch = activeBranch && activeBranch !== 'all' && !isSede;

    // Transactions
    const txQuery = shouldFilterBranch
      ? query(collection(db, 'transactions'), where('branchId', '==', activeBranch))
      : collection(db, 'transactions');

    unsubs.push(onSnapshot(txQuery, (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setTransactions(data);
    }, (error) => {
      console.warn("Financeiro transactions listener error, using cache:", error);
      const saved = localStorage.getItem("churchTransactions");
      if (saved) {
        try { setTransactions(JSON.parse(saved)); } catch (e) {}
      }
    }));

    // Categories
    unsubs.push(onSnapshot(collection(db, 'categories'), (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setCategories(data);
    }, (error) => {
      console.warn("Financeiro categories listener error, using cache:", error);
      const saved = localStorage.getItem("churchCategories");
      if (saved) {
        try { setCategories(JSON.parse(saved)); } catch (e) {}
      }
    }));

    // Itens (Entrada e Saída)
    unsubs.push(onSnapshot(collection(db, 'items'), (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setItems(data);
    }, (error) => {
      console.warn("Financeiro items listener error, using cache:", error);
      const saved = localStorage.getItem("churchFinanceItems");
      if (saved) {
        try { setItems(JSON.parse(saved)); } catch (e) {}
      }
    }));

    // Members
    const memQuery = shouldFilterBranch
      ? query(collection(db, 'members'), where('branchId', '==', activeBranch))
      : collection(db, 'members');

    unsubs.push(onSnapshot(memQuery, (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setMembers(data);
    }, (error) => {
      console.warn("Financeiro members listener error, using cache:", error);
      const saved = localStorage.getItem("churchMembers");
      if (saved) {
        try { setMembers(JSON.parse(saved)); } catch (e) {}
      }
    }));

    // Fornecedores
    unsubs.push(onSnapshot(collection(db, 'fornecedores'), (snap) => {
      const data = [];
      snap.forEach(doc => {
        const docData = doc.data();
        data.push(docData);
        if (docData.name) {
          setAvailableSuppliers(prev => Array.from(new Set([...prev, docData.name])));
        }
      });
      setFornecedores(data);
    }, (error) => {
      console.warn("Financeiro fornecedores listener error:", error);
    }));

    return () => unsubs.forEach(unsub => unsub());
  }, [activeBranch, branches]);

  const handleOpenAddModal = () => {
    if (isCurrentMonthLocked) {
      toast.warning(`Atenção: O mês de ${formatYearMonthDisplay(activeSummaryMonth)} está FECHADO e TRAVADO. Se você for lançar uma movimentação referente a outro mês em aberto, continue normalmente alterando a data.`);
    }
    setEditingTransaction(null);
    setTransactionType("entrada");
    setSelectedCategory("");
    setFormDescription("");
    setSelectedItemName("");
    setSelectedBranch(activeBranch !== 'all' ? activeBranch : (branches[0]?.id || "sede"));
    setSelectedSupplierId("none");
    setSelectedCostCenter("Geral");
    setSelectedMemberId("none");
    setSelectedPaymentMethod("Pix");
    setSelectedStatus("Pago");
    setTransactionOpDate(new Date().toISOString().split('T')[0]);
    setTransactionDueDate(new Date().toISOString().split('T')[0]);
    setComprovanteName("");
    setComprovanteData(null);
    setFormAmount("");
    setIsTransactionModalOpen(true);
  };

  const handleOpenEditModal = (tx: Transaction) => {
    const isTxMonthLocked = isMonthLockedHelper(closedMonths, tx.date, tx.branchId);
    if (isTxMonthLocked) {
      toast.error(`Edição bloqueada: Esta movimentação pertence ao mês de ${formatYearMonthDisplay(tx.date)}, que está FECHADO e TRAVADO. Destrave o mês para permitir alterações.`);
      return;
    }
    setEditingTransaction(tx);
    setTransactionType(tx.type as "entrada" | "saida");
    setSelectedCategory(tx.category || "");
    setFormDescription(tx.description || "");
    setSelectedItemName("");
    setSelectedBranch(tx.branchId || (activeBranch !== 'all' ? activeBranch : (branches[0]?.id || "sede")));
    setSelectedSupplierId(tx.supplierId || "none");
    setSelectedCostCenter(tx.costCenter || "Geral");
    setSelectedMemberId(tx.memberId || "none");
    setSelectedPaymentMethod(tx.paymentMethod || "Pix");
    setSelectedStatus((tx.status as "Pago" | "Pendente") || "Pago");
    setTransactionOpDate(tx.date || new Date().toISOString().split('T')[0]);
    setTransactionDueDate(tx.dueDate || tx.date || new Date().toISOString().split('T')[0]);
    setFormAmount(tx.amount !== undefined ? tx.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
    setComprovanteName(tx.receiptFileName || "");
    setComprovanteData(tx.comprovante || null);
    setIsTransactionModalOpen(true);
  };



  const handleImportFile = (file: File) => {
    toast.success("Arquivo importado com sucesso!");
    setIsImportModalOpen(false);
  };

  const handleExport = () => exportToCSV(filteredTransactions, "financeiro.csv");
  const handleExportXLSX = () => exportToXLSX(filteredTransactions, "financeiro.xlsx");

  const generateFilteredListPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const branchLabel = activeBranchName;
      
      drawStandardLetterHeader(
        doc,
        `RELATÓRIO FINANCEIRO - MOVIMENTAÇÕES`,
        `Congregação: ${branchLabel} | Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`
      );
      
      let totEntradas = 0;
      let totSaidas = 0;

      const bodyData = filteredTransactions.map(t => {
        const isEntrada = t.type === 'entrada';
        if (isEntrada) totEntradas += t.amount;
        else totSaidas += t.amount;
        
        const dataFormatada = t.date ? new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-';
        const valorFormatado = (isEntrada ? '+ R$ ' : '- R$ ') + t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        return [
          dataFormatada,
          t.documentNumber || "-",
          t.supplier ? `${t.description} (${t.supplier})` : (t.description || "-"),
          isEntrada ? 'Entrada' : 'Saída',
          valorFormatado
        ];
      });

      const tableStartY = (churchData?.logoDataUrl || getRegisteredChurchLogo(activeBranch)) ? 46 : 40;
      autoTable(doc, {
        startY: tableStartY,
        head: [['Data', 'Nº Doc', 'Descrição / Origem', 'Tipo', 'Valor (R$)']],
        body: bodyData,
        theme: 'striped',
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
        styles: { fontSize: 8.5 },
        columnStyles: {
          0: { cellWidth: 26 },
          1: { cellWidth: 26 },
          2: { cellWidth: 84 },
          3: { cellWidth: 24 },
          4: { halign: 'right', fontStyle: 'bold', cellWidth: 32 }
        }
      });

      const catMap: Record<string, { total: number; count: number; type: string }> = {};
      filteredTransactions.forEach(t => {
        const cat = t.category || "Sem Categoria";
        if (!catMap[cat]) catMap[cat] = { total: 0, count: 0, type: t.type };
        catMap[cat].total += t.amount;
        catMap[cat].count += 1;
      });

      const categoryRows = Object.entries(catMap)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([catName, data]) => [
          catName,
          data.type === 'entrada' ? 'Entrada' : 'Saída',
          data.count.toString(),
          `R$ ${data.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]);

      const afterTableY = (doc as any).lastAutoTable?.finalY || 140;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("SOMATÓRIA POR TIPO DE CATEGORIA:", 14, afterTableY + 7);

      autoTable(doc, {
        startY: afterTableY + 9,
        head: [['Categoria', 'Tipo', 'Qtd Lançamentos', 'Subtotal (R$)']],
        body: categoryRows,
        theme: 'grid',
        headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 85 },
          1: { cellWidth: 30, halign: 'center' },
          2: { cellWidth: 35, halign: 'center' },
          3: { cellWidth: 42, halign: 'right', fontStyle: 'bold' }
        }
      });

      const finalY = (doc as any).lastAutoTable?.finalY || 180;
      const saldo = totEntradas - totSaidas;

      autoTable(doc, {
        startY: finalY + 6,
        head: [['Total Entradas', 'Total Saídas', 'Saldo do Período']],
        body: [[
          `+ R$ ${totEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `- R$ ${totSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `R$ ${saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]],
        theme: 'plain',
        headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
        styles: { fontSize: 9, fontStyle: 'bold', halign: 'center' }
      });

      const summaryEndY = (doc as any).lastAutoTable?.finalY || 190;
      const targetBranchId = activeBranch !== 'all' ? activeBranch : 'sede';
      const freshChurchConfig = getResolvedBranchChurchConfig(targetBranchId);
      drawFinancialReportSignatures(doc, freshChurchConfig, summaryEndY + 8);
      drawStandardLetterFooter(doc, new Date().toLocaleDateString('pt-BR'));

      doc.save(`extrato-financeiro-${activeBranchName.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success("PDF da lista exportado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF.");
    }
  };

  const getReportMonthRange = () => {
    const now = new Date();
    const defaultYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const sMonth = reportStartMonth || defaultYM;
    const eMonth = reportEndMonth || sMonth;
    
    const startDate = `${sMonth}-01`;
    const [eYear, eM] = eMonth.split('-').map(Number);
    const lastDay = new Date(eYear, eM, 0).getDate();
    const endDate = `${eMonth}-${String(lastDay).padStart(2, '0')}`;

    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    
    const [sYearNum, sMonthNum] = sMonth.split('-').map(Number);
    const [eYearNum, eMonthNum] = eMonth.split('-').map(Number);
    
    const sMonthName = `${monthNames[sMonthNum - 1] || sMonthNum}/${sYearNum}`;
    const eMonthName = `${monthNames[eMonthNum - 1] || eMonthNum}/${eYearNum}`;
    
    const monthLabel = sMonth === eMonth ? sMonthName : `${sMonthName} a ${eMonthName}`;

    // Mês anterior relativo ao início
    const prevDate = new Date(sYearNum, sMonthNum - 2, 1);
    const prevMonthName = `${monthNames[prevDate.getMonth()]}/${prevDate.getFullYear()}`;

    // Próximo mês relativo ao término
    const nextDate = new Date(eYearNum, eMonthNum, 1);
    const nextMonthName = `${monthNames[nextDate.getMonth()]}/${nextDate.getFullYear()}`;

    return {
      startDate,
      endDate,
      sMonth,
      eMonth,
      monthLabel,
      prevMonthName,
      nextMonthName,
      currentPeriodName: monthLabel
    };
  };

  const formatMonthDisplay = (ym: string) => {
    if (!ym) return "Selecionar mês";
    const [y, m] = ym.split('-').map(Number);
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${months[(m || 1) - 1]} de ${y}`;
  };

  const getClosingDateFormatted = () => {
    const { eMonth } = getReportMonthRange();
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    const [eYear, eM] = eMonth.split('-').map(Number);
    const lastDay = new Date(eYear, eM, 0).getDate();
    return `${String(lastDay).padStart(2, '0')} de ${monthNames[eM - 1]} de ${eYear}`;
  };

  // Recupera com precisão os parâmetros e assinaturas específicos da igreja/congregação selecionada
  const getResolvedBranchChurchConfig = (branchId?: string) => {
    let resolved = { ...churchData };
    try {
      const globalRaw = localStorage.getItem("churchConfig");
      if (globalRaw) resolved = { ...resolved, ...JSON.parse(globalRaw) };

      const bId = branchId && branchId !== "all" ? branchId : (activeBranch !== "all" ? activeBranch : null);
      if (bId && bId !== "sede") {
        const branchKey = `churchConfig_${bId}`;
        const branchRaw = localStorage.getItem(branchKey);
        if (branchRaw) {
          resolved = { ...resolved, ...JSON.parse(branchRaw) };
        }

        const branchObj = branches.find(b => b.id === bId);
        if (branchObj) {
          if (branchObj.pastor && !resolved.pastorTitular) resolved.pastorTitular = branchObj.pastor;
          if (branchObj.name) resolved.nomeCongregacao = branchObj.name;
          if (branchObj.address && !resolved.endereco) resolved.endereco = branchObj.address;
          if (branchObj.cnpj && !resolved.cnpj) resolved.cnpj = branchObj.cnpj;
        }
      }
    } catch (e) {
      console.warn("Erro ao carregar parâmetros da congregação:", e);
    }
    return resolved;
  };

  const drawStandardLetterHeader = (
    doc: jsPDF,
    title: string,
    subtitle: string,
    branchIdOverride?: string
  ) => {
    const targetBranchId = branchIdOverride || activeBranch;
    const branchObj = branches.find(b => b.id === targetBranchId);
    const bName = branchObj ? branchObj.name : activeBranchName;
    const config = getResolvedBranchChurchConfig(targetBranchId);

    return drawSafeChurchReportHeader(doc, {
      title,
      subtitle,
      churchData: config,
      activeBranchId: targetBranchId,
      activeBranchName: bName,
      leftMargin: 14,
      rightMargin: 14,
      topY: 10
    });
  };

  const drawStandardLetterFooter = (
    doc: jsPDF,
    closingDateStr: string
  ) => {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(14, 283, 196, 283);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(70, 70, 70);
      doc.text(`Valparaiso-SP, ${closingDateStr}`, 14, 288);
      doc.text(`Página ${i} de ${pageCount}`, 196, 288, { align: "right" });
    }
  };

  const sortReportTransactions = (items: any[]) => {
    return [...items].sort((a, b) => {
      const memberA = members.find((m: any) => m.id === a.memberId)?.name || a.description || "";
      const memberB = members.find((m: any) => m.id === b.memberId)?.name || b.description || "";
      
      if (reportSortOrder === "nome-asc") {
        const cmp = memberA.localeCompare(memberB, 'pt-BR', { sensitivity: 'base' });
        return cmp !== 0 ? cmp : (a.date || "").localeCompare(b.date || "");
      }
      if (reportSortOrder === "nome-desc") {
        const cmp = memberB.localeCompare(memberA, 'pt-BR', { sensitivity: 'base' });
        return cmp !== 0 ? cmp : (b.date || "").localeCompare(a.date || "");
      }
      if (reportSortOrder === "valor-desc") {
        return (b.amount || 0) - (a.amount || 0);
      }
      if (reportSortOrder === "valor-asc") {
        return (a.amount || 0) - (b.amount || 0);
      }
      if (reportSortOrder === "data-desc") {
        return (b.date || "").localeCompare(a.date || "");
      }
      return (a.date || "").localeCompare(b.date || "");
    });
  };

  const generatePDF = (reportType: "Entradas" | "Saídas" | "Dizimistas" | "Ausentes") => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const targetBranchId = activeBranch !== 'all' ? activeBranch : 'sede';
      const branchObj = branches.find(b => b.id === targetBranchId);
      const branchLabel = branchObj?.name || activeBranchName;
      const { startDate, endDate, monthLabel } = getReportMonthRange();
      const closingDateStr = getClosingDateFormatted();

      drawStandardLetterHeader(
        doc,
        `RELATÓRIO OFICIAL DE ${reportType.toUpperCase()}`,
        `Mês de Apuração: ${monthLabel} | Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        targetBranchId
      );

      let list = branchTransactions.filter(t => {
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        return true;
      });

      list = sortReportTransactions(list);

      const tableStartY = (churchData?.logoDataUrl || getRegisteredChurchLogo(activeBranch)) ? 48 : 42;

      if (reportType === "Entradas") {
        list = list.filter(t => t.type === 'entrada');
        let total = 0;
        const rows = list.map(t => {
          total += t.amount;

          // Oculta nomes de dizimistas do relatório oficial geral de entradas
          const isTithe = ((t.category?.toLowerCase() || '').includes('dízimo') || 
                           (t.category?.toLowerCase() || '').includes('dizimo') || 
                           Boolean(t.memberId));
          const isMemberName = members.some(
            (m: any) => m.name && m.name.trim().toLowerCase() === (t.description || '').trim().toLowerCase()
          );

          let displayDesc = t.description || 'Entrada';
          if (isTithe || isMemberName) {
            displayDesc = t.category || 'Dízimo';
          }

          const docNum = t.documentNumber && t.documentNumber !== '-' ? t.documentNumber : 'S/N';

          return [
            t.date ? new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
            docNum,
            displayDesc,
            `R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          ];
        });
        autoTable(doc, {
          startY: tableStartY,
          head: [['Data', 'Nº Doc', 'Descrição da Entrada', 'Valor (R$)']],
          body: rows,
          foot: [
            [
              {
                content: `TOTAL GERAL DE ENTRADAS (${list.length} ${list.length === 1 ? 'lançamento' : 'lançamentos'}):`,
                colSpan: 3,
                styles: { halign: 'right', fontStyle: 'bold', fontSize: 9, textColor: [15, 23, 42] }
              },
              {
                content: `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                styles: { halign: 'right', fontStyle: 'bold', fontSize: 9.5, textColor: [15, 23, 42] }
              }
            ]
          ],
          theme: 'striped',
          headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          footStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            lineWidth: { top: 0.6, bottom: 0.6 },
            lineColor: [50, 50, 50]
          },
          styles: { fontSize: 8.5, cellPadding: 2.5 },
          columnStyles: {
            0: { cellWidth: 28 },
            1: { cellWidth: 28 },
            2: { cellWidth: 96 },
            3: { halign: 'right', fontStyle: 'bold', cellWidth: 30 }
          }
        });

        const finalY = (doc as any).lastAutoTable?.finalY || 100;
        // Traço de fechamento da tabela conectando as margens de 14mm a 196mm
        doc.setDrawColor(50, 50, 50);
        doc.setLineWidth(0.5);
        doc.line(14, finalY, 196, finalY);
      } else if (reportType === "Saídas") {
        list = list.filter(t => t.type === 'saida');
        let total = 0;
        // Colunas Categoria e Status removidas conforme Anexo 4
        const rows = list.map(t => {
          total += t.amount;
          return [
            t.date ? new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
            t.documentNumber && t.documentNumber !== '-' ? t.documentNumber : 'S/N',
            t.supplier ? `${t.supplier} - ${t.description || ''}` : (t.description || '-'),
            `R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          ];
        });
        autoTable(doc, {
          startY: tableStartY,
          head: [['Data', 'Nº Doc', 'Fornecedor / Descrição', 'Valor (R$)']],
          body: rows,
          foot: [
            [
              {
                content: `TOTAL GERAL DE SAÍDAS (${list.length} ${list.length === 1 ? 'lançamento' : 'lançamentos'}):`,
                colSpan: 3,
                styles: { halign: 'right', fontStyle: 'bold', fontSize: 9, textColor: [15, 23, 42] }
              },
              {
                content: `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                styles: { halign: 'right', fontStyle: 'bold', fontSize: 9.5, textColor: [15, 23, 42] }
              }
            ]
          ],
          theme: 'striped',
          headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          footStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            lineWidth: { top: 0.6, bottom: 0.6 },
            lineColor: [50, 50, 50]
          },
          styles: { fontSize: 8.5, cellPadding: 2.5 },
          columnStyles: {
            0: { cellWidth: 28 },
            1: { cellWidth: 28 },
            2: { cellWidth: 96 },
            3: { halign: 'right', fontStyle: 'bold', cellWidth: 30 }
          }
        });

        const finalY = (doc as any).lastAutoTable?.finalY || 100;
        // Traço de fechamento da tabela conectando as margens de 14mm a 196mm
        doc.setDrawColor(50, 50, 50);
        doc.setLineWidth(0.5);
        doc.line(14, finalY, 196, finalY);
      } else if (reportType === "Dizimistas") {
        list = list.filter(t => t.type === 'entrada' && ((t.category?.toLowerCase() || '').includes('dízimo') || (t.category?.toLowerCase() || '').includes('dizimo')));
        let total = 0;
        const rows = list.map(t => {
          total += t.amount;
          const memberObj = members.find((m: any) => m.id === t.memberId);
          const nomeDizimista = memberObj?.name || t.description;
          return [
            t.date ? new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
            nomeDizimista,
            `R$ ${t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          ];
        });
        autoTable(doc, {
          startY: tableStartY,
          head: [['Data', 'Membro / Contribuinte', 'Valor (R$)']],
          body: rows,
          foot: [
            [
              {
                content: `TOTAL DE DÍZIMOS (${list.length} ${list.length === 1 ? 'contribuição' : 'contribuições'}):`,
                colSpan: 2,
                styles: { halign: 'right', fontStyle: 'bold', fontSize: 9, textColor: [15, 23, 42] }
              },
              {
                content: `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                styles: { halign: 'right', fontStyle: 'bold', fontSize: 9.5, textColor: [15, 23, 42] }
              }
            ]
          ],
          theme: 'striped',
          headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          footStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            lineWidth: { top: 0.6, bottom: 0.6 },
            lineColor: [50, 50, 50]
          },
          styles: { fontSize: 8.5, cellPadding: 2.5 },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 112 },
            2: { halign: 'right', fontStyle: 'bold', cellWidth: 40 }
          }
        });
        const finalY = (doc as any).lastAutoTable?.finalY || 100;
        doc.setDrawColor(50, 50, 50);
        doc.setLineWidth(0.5);
        doc.line(14, finalY, 196, finalY);
      } else if (reportType === "Ausentes") {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        const cutoffDate = ninetyDaysAgo.toISOString().split('T')[0];

        const recentTithers = new Set(
          branchTransactions
            .filter(t => t.type === 'entrada' && t.date >= cutoffDate && ((t.category?.toLowerCase() || '').includes('dízimo') || (t.category?.toLowerCase() || '').includes('dizimo')))
            .map(t => t.memberId || t.description.toLowerCase())
        );

        const ausentes = members.filter((m: any) => {
          if (m.status && m.status !== 'ativo' && m.status !== 'Ativo') return false;
          return !recentTithers.has(m.id) && !recentTithers.has(m.name?.toLowerCase());
        });

        if (reportSortOrder === "nome-desc") {
          ausentes.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        } else {
          ausentes.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        }

        const rows = ausentes.map((m: any) => [
          m.name || "Sem Nome",
          m.phone || "-",
          m.role || "Membro",
          m.status || "Ativo"
        ]);

        autoTable(doc, {
          startY: tableStartY,
          head: [['Nome do Membro', 'Contato / Telefone', 'Cargo Eclesiástico', 'Status']],
          body: rows,
          foot: [
            [
              {
                content: `TOTAL DE MEMBROS AUSENTES: ${ausentes.length}`,
                colSpan: 4,
                styles: { halign: 'right', fontStyle: 'bold', fontSize: 9, textColor: [15, 23, 42] }
              }
            ]
          ],
          theme: 'striped',
          headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          footStyles: {
            fillColor: [241, 245, 249],
            textColor: [15, 23, 42],
            fontStyle: 'bold',
            lineWidth: { top: 0.6, bottom: 0.6 },
            lineColor: [50, 50, 50]
          },
          styles: { fontSize: 8.5, cellPadding: 2.5 }
        });
        const finalY = (doc as any).lastAutoTable?.finalY || 100;
        doc.setDrawColor(50, 50, 50);
        doc.setLineWidth(0.5);
        doc.line(14, finalY, 196, finalY);
      }

      const lastReportTableY = (doc as any).lastAutoTable?.finalY || 140;

      // Recupera parâmetros atualizados da igreja / congregação
      const freshChurchConfig = getResolvedBranchChurchConfig(targetBranchId);
      const cidadeIgreja = freshChurchConfig?.cidade || "Valparaíso - SP";

      let signaturesStartY = lastReportTableY + 8;

      // Legenda oficial com apenas UMA data de fechamento por extenso antes das assinaturas
      if (reportType === "Saídas" || reportType === "Entradas") {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);

        // Apenas UMA data do fechamento referente ao mês
        doc.text(`Data do Fechamento: ${closingDateStr}`, 14, lastReportTableY + 7);

        signaturesStartY = lastReportTableY + 14;
      }

      drawFinancialReportSignatures(doc, freshChurchConfig, signaturesStartY, {
        closingDate: closingDateStr,
        city: cidadeIgreja
      });
      drawStandardLetterFooter(doc, closingDateStr);
      doc.save(`relatorio-${reportType.toLowerCase()}-${branchLabel.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success(`Relatório de ${reportType} gerado com sucesso!`);
    } catch (err) {
      console.error(err);
      toast.error(`Erro ao gerar relatório de ${reportType}.`);
    }
  };

  const generateFechamentoPDF = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const targetBranchId = activeBranch !== 'all' ? activeBranch : 'sede';
      const branchObj = branches.find(b => b.id === targetBranchId);
      const branchLabel = branchObj?.name || activeBranchName;
      const { startDate, endDate, monthLabel, prevMonthName, nextMonthName, currentPeriodName } = getReportMonthRange();
      const closingDateStr = getClosingDateFormatted();

      drawStandardLetterHeader(
        doc,
        `BALANÇO & FECHAMENTO FINANCEIRO OFICIAL`,
        `Mês de Apuração: ${monthLabel} | Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        targetBranchId
      );

      // Saldo do mês anterior: todas as movimentações antes do início do período de apuração
      const saldoAnterior = branchTransactions
        .filter(t => t.date && t.date < startDate)
        .reduce((acc, t) => t.type === 'entrada' ? acc + t.amount : acc - t.amount, 0);

      const list = branchTransactions.filter(t => {
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        return true;
      });

      let recTotal = 0;
      let despTotal = 0;

      list.forEach(t => {
        if (t.type === 'entrada') {
          recTotal += t.amount;
        } else {
          despTotal += t.amount;
        }
      });

      // Saldo a transportar para o próximo mês
      const saldoTransportar = saldoAnterior + recTotal - despTotal;

      const fechamentoStartY = (churchData?.logoDataUrl || getRegisteredChurchLogo(activeBranch)) ? 48 : 42;

      autoTable(doc, {
        startY: fechamentoStartY,
        head: [['Resumo do Fechamento', 'Valor Consolidado (R$)']],
        body: [
          [`Saldo do mês anterior (${prevMonthName})`, `${saldoAnterior >= 0 ? '+' : ''} R$ ${saldoAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
          [`Entradas do mês (${currentPeriodName})`, `+ R$ ${recTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
          [`Saídas do mês (${currentPeriodName})`, `- R$ ${despTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
          [`Saldo a transportar para o mês (${nextMonthName})`, `R$ ${saldoTransportar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 10 },
        styles: { fontSize: 10, fontStyle: 'bold', cellPadding: 4 },
        columnStyles: {
          0: { cellWidth: 122 },
          1: { halign: 'right', fontStyle: 'bold', cellWidth: 60 }
        }
      });

      // Conforme Anexo 4: NÃO exibir lançamentos no final após o total do fechamento!
      const currentY = (doc as any).lastAutoTable?.finalY || 80;

      // Recupera parâmetros atualizados da igreja / congregação
      const freshChurchConfig = getResolvedBranchChurchConfig(targetBranchId);

      // Espaço para assinaturas dos responsáveis conforme os parâmetros do sistema
      drawFinancialReportSignatures(doc, freshChurchConfig, currentY + 14);

      // Rodapé oficial padronizado em A4
      drawStandardLetterFooter(doc, closingDateStr);

      doc.save(`fechamento-financeiro-${branchLabel.toLowerCase().replace(/\s+/g, '-')}.pdf`);
      toast.success("Relatório de Fechamento em A4 gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar Relatório de Fechamento.");
    }
  };
  
  const handleAddCategoryFromManager = async (type: 'entrada' | 'saida') => {
    if (!newManagerCategoryName) return;
    try {
      await addDoc(collection(db, 'categories'), { name: newManagerCategoryName, type });
      toast.success("Categoria adicionada!");
      setNewManagerCategoryName("");
    } catch(e) {
       toast.error("Erro");
    }
  };

  const handleDeleteCategory = async (id: string) => {
     try {
       await deleteDoc(doc(db, 'categories', id));
       toast.success("Categoria deletada!");
     } catch(e) {
       toast.error("Erro");
     }
  };

  const executeDeleteTransaction = async () => {
     if(transactionToDelete) {
        if (isMonthLockedHelper(closedMonths, transactionToDelete.date, transactionToDelete.branchId)) {
          toast.error(`Exclusão não permitida: A movimentação pertence ao mês de ${formatYearMonthDisplay(transactionToDelete.date)}, que está FECHADO e TRAVADO. Destrave o mês para realizar alterações.`);
          setTransactionToDelete(null);
          return;
        }
        try {
          await logCriticalDeletion(transactionToDelete);
          await deleteDoc(doc(db, 'transactions', transactionToDelete.id));
          setTransactionToDelete(null);
          toast.success("Transação excluída e registrada na auditoria com sucesso!");
        } catch (err: any) {
          logCriticalError({
            error: err,
            source: "database",
            severity: "critical",
            message: "Erro ao excluir transação: " + (err.message || String(err)),
            context: { transactionId: transactionToDelete.id }
          });
          toast.error("Erro ao excluir transação.");
        }
     }
  };

  
  const defaultCategories = [
    { id: 'def-1', name: 'Dízimo', type: 'entrada' },
    { id: 'def-2', name: 'Oferta', type: 'entrada' },
    { id: 'def-3', name: 'Doação', type: 'entrada' },
    { id: 'def-4', name: 'Água', type: 'saida' },
    { id: 'def-5', name: 'Luz', type: 'saida' },
    { id: 'def-6', name: 'Internet', type: 'saida' },
    { id: 'def-7', name: 'Aluguel', type: 'saida' },
    { id: 'def-8', name: 'Manutenção', type: 'saida' },
    { id: 'def-9', name: 'Missões', type: 'saida' },
    { id: 'def-10', name: 'Ministério Louvor', type: 'saida' },
    { id: 'def-11', name: 'Ministério Infantil', type: 'saida' },
    { id: 'def-12', name: 'Salário/Prebenda', type: 'saida' },
    { id: 'def-13', name: 'Material de Limpeza', type: 'saida' }
  ];

  const defaultItems = [
    { id: 'def-item-1', name: 'Dízimo de Membro', category: 'Dízimo', type: 'entrada' },
    { id: 'def-item-2', name: 'Oferta do Culto de Domingo', category: 'Oferta', type: 'entrada' },
    { id: 'def-item-3', name: 'Oferta de Missões', category: 'Oferta', type: 'entrada' },
    { id: 'def-item-4', name: 'Doação para Obras / Reforma', category: 'Doação', type: 'entrada' },
    { id: 'def-item-5', name: 'Campanha de Construção', category: 'Doação', type: 'entrada' },
    { id: 'def-item-6', name: 'Conta de Luz / Energia', category: 'Luz', type: 'saida' },
    { id: 'def-item-7', name: 'Conta de Água e Saneamento', category: 'Água', type: 'saida' },
    { id: 'def-item-8', name: 'Internet Banda Larga', category: 'Internet', type: 'saida' },
    { id: 'def-item-9', name: 'Aluguel do Imóvel do Templo', category: 'Aluguel', type: 'saida' },
    { id: 'def-item-10', name: 'Prebenda Pastoral / Sustento', category: 'Salário/Prebenda', type: 'saida' },
    { id: 'def-item-11', name: 'Material de Limpeza e Higiene', category: 'Material de Limpeza', type: 'saida' },
    { id: 'def-item-12', name: 'Material do Ministério Infantil', category: 'Ministério Infantil', type: 'saida' },
    { id: 'def-item-13', name: 'Manutenção Predial / Hidráulica', category: 'Manutenção', type: 'saida' },
    { id: 'def-item-14', name: 'Repasse para Missões', category: 'Missões', type: 'saida' },
    { id: 'def-item-15', name: 'Aparelhagem e Cabos de Som', category: 'Ministério Louvor', type: 'saida' }
  ];

  const availableCategories = useMemo(() => {
    // Merge defaults with DB categories, preferring DB categories if names conflict
    const dbNames = new Set(categories.map(c => (c?.name || "").toLowerCase()));
    const filteredDefaults = defaultCategories.filter(c => !dbNames.has((c?.name || "").toLowerCase()));
    return [...filteredDefaults, ...categories].sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
  }, [categories]);

  const availableItems = useMemo(() => {
    const dbNames = new Set(items.map((i: any) => (i?.name || "").toLowerCase()));
    const filteredDefaults = defaultItems.filter(i => !dbNames.has((i?.name || "").toLowerCase()));
    return [...filteredDefaults, ...items].sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
  }, [items]);

  const handleQuickAddCategory = async () => {
    const trimmed = quickCategoryName.trim();
    if (!trimmed) {
      toast.error("Informe o nome da categoria.");
      return;
    }
    try {
      await addDoc(collection(db, 'categories'), {
        name: trimmed,
        type: transactionType,
        createdAt: serverTimestamp()
      });
      setSelectedCategory(trimmed);
      setQuickCategoryName("");
      setIsQuickCategoryOpen(false);
      toast.success(`Categoria "${trimmed}" cadastrada com sucesso!`);
    } catch (e: any) {
      const newCat = { id: `cat-${Date.now()}`, name: trimmed, type: transactionType };
      setCategories(prev => [...prev, newCat]);
      setSelectedCategory(trimmed);
      setQuickCategoryName("");
      setIsQuickCategoryOpen(false);
      toast.success(`Categoria "${trimmed}" cadastrada localmente!`);
    }
  };

  const handleQuickAddItem = async () => {
    const trimmed = quickItemName.trim();
    if (!trimmed) {
      toast.error("Informe o nome do item.");
      return;
    }
    const cat = quickItemCategory || selectedCategory || (transactionType === 'entrada' ? 'Oferta' : 'Manutenção');
    try {
      await addDoc(collection(db, 'items'), {
        name: trimmed,
        category: cat,
        type: transactionType,
        createdAt: serverTimestamp()
      });
      setFormDescription(trimmed);
      setSelectedCategory(cat);
      setQuickItemName("");
      setQuickItemCategory("");
      setIsQuickItemOpen(false);
      toast.success(`Item "${trimmed}" cadastrado com sucesso!`);
    } catch (e: any) {
      const newItem = { id: `item-${Date.now()}`, name: trimmed, category: cat, type: transactionType };
      setItems(prev => [...prev, newItem]);
      setFormDescription(trimmed);
      setSelectedCategory(cat);
      setQuickItemName("");
      setQuickItemCategory("");
      setIsQuickItemOpen(false);
      toast.success(`Item "${trimmed}" cadastrado localmente!`);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setTypeFilter("all");
    setMonthFilter("");
  };
  const hasActiveFilters = searchTerm !== "" || categoryFilter !== "all" || typeFilter !== "all" || monthFilter !== "";

  const filteredTransactions = useMemo(() => {
    return branchTransactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
      if (monthFilter && !t.date.startsWith(monthFilter)) return false;
      if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [branchTransactions, typeFilter, categoryFilter, monthFilter, searchTerm]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [paginationMode, setPaginationMode] = useState<"pagination" | "infinite">("pagination");

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, typeFilter, monthFilter, activeBranch]);

  const paginatedTransactions = useMemo(() => {
    if (paginationMode === "infinite") {
      return filteredTransactions.slice(0, currentPage * pageSize);
    }
    return filteredTransactions.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredTransactions, currentPage, pageSize, paginationMode]);

  const hasMore = currentPage * pageSize < filteredTransactions.length;

  const annualChartData = useMemo(() => {
    const currentYear = new Date().getFullYear().toString();
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const monthStats = months.map(m => ({ name: m, Receitas: 0, Despesas: 0, Saldo: 0 }));

    branchTransactions.forEach(t => {
      if (t.date && t.date.startsWith(currentYear)) {
        const mIdx = parseInt(t.date.substring(5, 7), 10) - 1;
        if (mIdx >= 0 && mIdx < 12) {
          if (t.type === 'entrada') monthStats[mIdx].Receitas += t.amount;
          if (t.type === 'saida') monthStats[mIdx].Despesas += t.amount;
          monthStats[mIdx].Saldo = monthStats[mIdx].Receitas - monthStats[mIdx].Despesas;
        }
      }
    });

    return monthStats;
  }, [branchTransactions]);




  useEffect(() => {
    const handleSaveShortcut = () => {
      if (isTransactionModalOpen) {
        const form = document.getElementById('transactionForm');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    };
    window.addEventListener('app:save-record', handleSaveShortcut);
    return () => window.removeEventListener('app:save-record', handleSaveShortcut);
  }, [isTransactionModalOpen]);

  const handleSaveTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    if (!selectedCategory) {
      toast.error("Por favor, selecione uma categoria.")
      return
    }

    const docCpfCnpj = formData.get("documentCpfCnpj") as string;
    const rawDesc = (formData.get("description") as string) || formDescription;
    const rawAmount = (formData.get("amount") as string) || formAmount;
    const opDate = (formData.get("date") as string) || transactionOpDate || new Date().toISOString().split('T')[0];

    const isValid = validateForm([
      { field: 'Descrição', value: rawDesc, required: true },
      { field: 'Valor', value: rawAmount, required: true },
      { field: 'Data', value: opDate, required: true },
      { 
        field: 'CPF/CNPJ do Fornecedor', 
        value: docCpfCnpj, 
        required: false,
        custom: (val) => {
          if (transactionType !== 'saida') return true;
          const cleanVal = String(val).replace(/\D/g, "");
          if (cleanVal.length === 0) return true;
          if (cleanVal.length > 11) return cnpjValidator.isValid(cleanVal);
          return cpfValidator.isValid(cleanVal);
        },
        message: "CPF ou CNPJ do fornecedor inválido."
      }
    ]);

    if (!isValid) return;

    if (!isDateInCurrentMonthYear(opDate)) {
      toast.info(`Movimentação registrada com data de competência: ${opDate}`);
    }

    // Resolve supplier
    const supObj = fornecedores.find((f: any) => f.id === selectedSupplierId);
    const supplierName = supObj ? supObj.name : ((formData.get("supplier") as string) || "");

    const parsedAmount = Math.abs(parseCurrencyInput(rawAmount));
    if (parsedAmount <= 0) {
      toast.error("Por favor, informe um valor financeiro válido maior que zero.");
      return;
    }

    const isDizimo = transactionType === 'entrada' && ((selectedCategory?.toLowerCase() || '').includes('dízimo') || (selectedCategory?.toLowerCase() || '').includes('dizimo'));

    const resolvedBranch = selectedBranch || (activeBranch !== 'all' ? activeBranch : (branches[0]?.id || 'sede'));
    const opDueDate = (formData.get("dueDate") as string) || transactionDueDate || opDate;

    // Trava de segurança: Bloqueia inserção ou edição se o mês estiver fechado
    if (isMonthLockedHelper(closedMonths, opDate, resolvedBranch)) {
      toast.error(`Operação não permitida: A data informada (${opDate}) pertence ao mês de ${formatYearMonthDisplay(opDate)}, que está FECHADO e TRAVADO. Destrave o mês se for necessária uma retificação.`);
      return;
    }

    if (editingTransaction && isMonthLockedHelper(closedMonths, editingTransaction.date, editingTransaction.branchId)) {
      toast.error(`Operação não permitida: A data original desta movimentação (${editingTransaction.date}) pertence ao mês de ${formatYearMonthDisplay(editingTransaction.date)}, que está FECHADO e TRAVADO.`);
      return;
    }

    const txData: any = {
      date: opDate,
      receiptFileName: comprovanteName || null,
      comprovante: comprovanteData || null,
      documentNumber: (formData.get("documentNumber") as string) || "-",
      historico: (formData.get("historico") as string) || "",
      supplier: transactionType === 'saida' ? supplierName : "",
      supplierId: transactionType === 'saida' && selectedSupplierId !== 'none' ? selectedSupplierId : "",
      documentCpfCnpj: transactionType === 'saida' ? (docCpfCnpj || (supObj?.cnpjCpf || "")) : "",
      description: normalizeUTF8(rawDesc),
      type: transactionType,
      category: selectedCategory,
      branchId: resolvedBranch,
      status: selectedStatus,
      dueDate: opDueDate,
      amount: parsedAmount,
      costCenter: transactionType === 'saida' ? selectedCostCenter : "",
      paymentMethod: selectedPaymentMethod,
      userId: user?.id || user?.email || "sistema"
    };

    if (txData.supplier && !availableSuppliers.includes(txData.supplier)) {
      setAvailableSuppliers(prev => [...prev, txData.supplier]);
    }
    
    if (isDizimo) {
      txData.memberId = (selectedMemberId && selectedMemberId !== 'none') ? selectedMemberId : ((formData.get("memberId") as string) || "");
      if (txData.memberId === 'none') txData.memberId = "";
      const file = formData.get("receiptFile") as File;
      if (file && file.size > 0) {
        txData.receiptFileName = file.name;
      } else if (editingTransaction?.receiptFileName) {
        txData.receiptFileName = editingTransaction.receiptFileName;
      }
    }

    const actionName = editingTransaction ? "Edição Financeira" : "Criação Financeira";
    
    const operation = async () => {
       if (editingTransaction) {
         await logCriticalUpdate(editingTransaction, { ...txData, id: editingTransaction.id });
         await updateDoc(doc(db, "transactions", editingTransaction.id), txData);
       } else {
         await logFinancialCreation(txData);
         await addDoc(collection(db, "transactions"), { ...txData, createdAt: serverTimestamp() });
       }
    };
    
    const res = await executeDbOperation({
       operation,
       actionName,
       successMessage: editingTransaction ? "Transação atualizada com sucesso!" : "Transação adicionada com sucesso!",
       userName: user?.name || "Desconhecido"
    });

    if (res.success) {
      // Automação: Nova Transação
      if (!editingTransaction) {
          window.dispatchEvent(new CustomEvent('app:tx-added', { detail: txData }));
          
          // Automação: Limite de Orçamento
          // Simulando um limite de 1000 para qualquer categoria, ou buscando configuração.
          // Para esta demo, dispararemos se for saída > 1000
          if (txData.type === 'saida' && txData.amount > 1000) {
              window.dispatchEvent(new CustomEvent('app:budget-exceeded', { 
                  detail: { ...txData, name: `Despesa Alta (${txData.category})`, desc: `A despesa de R$ ${txData.amount} excedeu o limite de segurança.` }
              }));
          }

          // Automação: Novo Dizimista
          if (isDizimo && txData.memberId) {
             // Verificar se é o primeiro dízimo deste membro
             const previousTithes = transactions.filter(t => t.memberId === txData.memberId && t.type === 'entrada' && ((t.category?.toLowerCase() || '').includes('dízimo') || (t.category?.toLowerCase() || '').includes('dizimo')));
             if (previousTithes.length === 0) {
                 window.dispatchEvent(new CustomEvent('app:new-tither', {
                     detail: { ...txData, name: `Novo Dizimista: ${txData.memberId}`, desc: 'Primeiro dízimo registrado no sistema.' }
                 }));
             }
          }
      }

      setIsTransactionModalOpen(false)
      setSelectedCategory("")
      setEditingTransaction(null)
    }
  }

  const activeSummaryMonth = monthFilter || currentMonthDefault;
  const isCurrentMonthLocked = isMonthLockedHelper(closedMonths, activeSummaryMonth, activeBranch);
  const currentLockRecord = getClosedMonthRecord(closedMonths, activeSummaryMonth, activeBranch);
  const [sumYear, sumMonth] = activeSummaryMonth.split('-').map(Number);
  const ptMonthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const summaryCurrentMonthName = `${ptMonthNames[sumMonth - 1] || sumMonth}/${sumYear}`;
  const sumPrevDate = new Date(sumYear, sumMonth - 2, 1);
  const summaryPrevMonthName = `${ptMonthNames[sumPrevDate.getMonth()]}/${sumPrevDate.getFullYear()}`;
  const sumNextDate = new Date(sumYear, sumMonth, 1);
  const summaryNextMonthName = `${ptMonthNames[sumNextDate.getMonth()]}/${sumNextDate.getFullYear()}`;

  const { totalEntradas, totalSaidas, saldoAnterior, saldoAtual } = useMemo(() => {
    let entradas = 0;
    let saidas = 0;
    let anterior = 0;
    const refMonth = monthFilter || currentMonthDefault;

    branchTransactions.forEach(t => {
      if (!t.date) return;
      const txMonth = t.date.substring(0, 7);
      if (txMonth === refMonth) {
        if (t.type === 'entrada') entradas += t.amount;
        else if (t.type === 'saida') saidas += t.amount;
      } else if (txMonth < refMonth) {
        if (t.type === 'entrada') anterior += t.amount;
        else if (t.type === 'saida') anterior -= t.amount;
      }
    });
    const roundVal = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
    const roundedEntradas = roundVal(entradas);
    const roundedSaidas = roundVal(saidas);
    const roundedAnterior = roundVal(anterior);
    const roundedAtual = roundVal(roundedAnterior + roundedEntradas - roundedSaidas);

    return { 
      totalEntradas: roundedEntradas, 
      totalSaidas: roundedSaidas, 
      saldoAnterior: roundedAnterior,
      saldoAtual: roundedAtual
    };
  }, [branchTransactions, monthFilter, currentMonthDefault]);


  const isDizimo = transactionType === 'entrada' && ((selectedCategory?.toLowerCase() || '').includes('dízimo') || (selectedCategory?.toLowerCase() || '').includes('dizimo'));

  const chartData = useMemo(() => {
    const monthlyData: Record<string, any> = {}
    
    branchTransactions.forEach(t => {
      const month = t.date.substring(0, 7) // "YYYY-MM"
      if (!monthlyData[month]) {
        monthlyData[month] = { name: month, dizimos: 0, ofertas: 0, saidas: 0 }
      }
      if (t.type === 'entrada') {
        const cat = t.category?.toLowerCase() || '';
        if (cat.includes('dízimo') || cat.includes('dizimo')) {
          monthlyData[month].dizimos += t.amount
        } else {
          monthlyData[month].ofertas += t.amount
        }
      } else {
        // Filter out based on chart filters
        const passCategory = chartCategoryFilter === 'all' || t.category === chartCategoryFilter;
        const passCostCenter = chartCostCenterFilter === 'all' || t.costCenter === chartCostCenterFilter;
        if (passCategory && passCostCenter) {
          monthlyData[month].saidas += t.amount
        }
      }
    })
    
    // Sort chronologically and format month names
    return Object.values(monthlyData)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(d => {
         const [y, m] = d.name.split('-');
         const date = new Date(Number(y), Number(m) - 1);
         const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
         return {
            ...d,
            name: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${y.slice(2)}`
         }
      })
  }, [branchTransactions, chartCategoryFilter, chartCostCenterFilter])

  const location = useLocation()

  useEffect(() => {
    if (location.state?.openNewTransaction) {
      handleOpenAddModal();
      window.history.replaceState({}, document.title);
    }
  }, [location]);


  return (
    <motion.div 
      id="printable-standard"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      
      <div className="hidden print:block text-center mb-6 border-b pb-4 w-full">
        {(churchData?.logoDataUrl || getRegisteredChurchLogo(activeBranch)) && (
            <img src={churchData?.logoDataUrl || getRegisteredChurchLogo(activeBranch) || ""} alt="Logo" className="h-16 mx-auto mb-2 object-contain" />
        )}
        <h1 className="text-2xl font-bold uppercase">{churchData?.nome || "Relatório Financeiro"}</h1>
        <p className="text-sm text-slate-500">
           {churchData?.endereco ? churchData.endereco + " - " : ""}
           {churchData?.cidade || ""} 
           {churchData?.cnpj ? " | CNPJ: " + churchData.cnpj : ""}
        </p>
        <p className="text-sm font-semibold mt-2">Gerado em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}</p>
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">

        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Controle Financeiro</h2>
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-primary/30 bg-primary/5 text-primary flex items-center gap-1.5 font-medium">
              <Building2 className="w-3.5 h-3.5" />
              {activeBranchName}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">Gerencie entradas, saídas e relatórios.</p>
        </div>
        <div className="flex gap-2 print:hidden flex-wrap">
          <Button 
            variant="outline"
            onClick={() => setIsLockManagerOpen(true)}
            className={isCurrentMonthLocked 
              ? "border-amber-400 bg-amber-500/15 text-amber-900 dark:text-amber-200 hover:bg-amber-500/25 font-bold shadow-xs" 
              : "border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-semibold"}
            title="Travar ou destravar o mês contábil para evitar alterações nos balanços"
          >
            {isCurrentMonthLocked ? (
              <>
                <Lock className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span>Mês Fechado & Travado</span>
              </>
            ) : (
              <>
                <ShieldCheck className="mr-2 h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Travar Mês ({summaryCurrentMonthName})</span>
              </>
            )}
          </Button>

          <Button 
            variant="outline"
            onClick={() => setIsFolderCoverModalOpen(true)}
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold"
            title="Gerar capa oficial A4 e etiquetas de lombada para pastas e caixas de documentos físicos"
          >
            <FolderArchive className="mr-2 h-4 w-4 text-emerald-600" /> Capas & Etiquetas
          </Button>

          <Button 
            onClick={() => setIsEcoPrintOpen(true)}
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-xs"
          >
            <Printer className="mr-2 h-4 w-4 text-emerald-300" /> Layout de Impressão (Oficial A4)
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setIsBackupModalOpen(true)}
            className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-300 font-medium"
          >
            <CloudUpload className="mr-2 h-4 w-4 text-blue-600" /> Exportar / Backup
          </Button>
          <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><FileText className="mr-2 h-4 w-4" /> Relatórios</Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[680px] max-h-[88vh] overflow-y-auto p-5 sm:p-6 overflow-x-hidden rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-lg sm:text-xl font-bold">Opções de Relatório</DialogTitle>
                <DialogDescription>
                  Selecione o período e o tipo de relatório que deseja gerar em formato oficial.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
                 <div className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reportStartMonth" className="text-xs font-semibold">Mês Inicial</Label>
                      <span className="text-[10px] text-muted-foreground truncate">{formatMonthDisplay(reportStartMonth)}</span>
                    </div>
                    <div className="relative flex items-center">
                      <Input 
                        ref={startMonthInputRef}
                        id="reportStartMonth" 
                        type="month" 
                        value={reportStartMonth} 
                        onChange={e => setReportStartMonth(e.target.value)} 
                        onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}
                        className="w-full pr-9 bg-background cursor-pointer font-medium text-xs h-9"
                        title="Clique para abrir o calendário"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          try {
                            startMonthInputRef.current?.showPicker();
                          } catch {
                            startMonthInputRef.current?.focus();
                          }
                        }}
                        title="Abrir calendário"
                      >
                        <Calendar className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                 </div>

                 <div className="grid gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="reportEndMonth" className="text-xs font-semibold">Mês Final</Label>
                      <span className="text-[10px] text-muted-foreground truncate">{formatMonthDisplay(reportEndMonth)}</span>
                    </div>
                    <div className="relative flex items-center">
                      <Input 
                        ref={endMonthInputRef}
                        id="reportEndMonth" 
                        type="month" 
                        value={reportEndMonth} 
                        onChange={e => setReportEndMonth(e.target.value)} 
                        onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}
                        className="w-full pr-9 bg-background cursor-pointer font-medium text-xs h-9"
                        title="Clique para abrir o calendário"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          try {
                            endMonthInputRef.current?.showPicker();
                          } catch {
                            endMonthInputRef.current?.focus();
                          }
                        }}
                        title="Abrir calendário"
                      >
                        <Calendar className="h-4 w-4 text-primary" />
                      </Button>
                    </div>
                 </div>
              </div>

              <div className="grid gap-1.5 pb-2">
                 <Label className="text-xs font-semibold">Ordem de Impressão (Dizimistas / Relatórios)</Label>
                 <Select value={reportSortOrder} onValueChange={(val: any) => setReportSortOrder(val)}>
                   <SelectTrigger className="text-xs h-9 bg-background">
                     <SelectValue placeholder="Selecione a ordem..." />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="nome-asc">Alfabética (A - Z por Nome)</SelectItem>
                     <SelectItem value="nome-desc">Alfabética (Z - A por Nome)</SelectItem>
                     <SelectItem value="data-asc">Data (Mais antiga para mais recente)</SelectItem>
                     <SelectItem value="data-desc">Data (Mais recente para mais antiga)</SelectItem>
                     <SelectItem value="valor-desc">Maior Valor (Decrescente)</SelectItem>
                     <SelectItem value="valor-asc">Menor Valor (Crescente)</SelectItem>
                   </SelectContent>
                 </Select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 py-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal text-xs sm:text-sm font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" 
                  onClick={() => { setIsReportModalOpen(false); setIsBalanceteModalOpen(true); }}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> 
                  <span>Balancete para Assembleia</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal text-xs sm:text-sm font-semibold text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200" 
                  onClick={() => { setIsReportModalOpen(false); setIsBackupModalOpen(true); }}
                >
                  <CloudUpload className="mr-2 h-4 w-4 shrink-0 text-blue-600" /> 
                  <span>Exportação & Backup em Nuvem</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal text-xs sm:text-sm font-semibold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300 dark:border-emerald-800" 
                  onClick={() => { setIsReportModalOpen(false); setIsEcoPrintOpen(true); }}
                >
                  <Leaf className="mr-2 h-4 w-4 shrink-0 text-emerald-600" /> 
                  <span>Relatório Econômico (Tinta/Papel)</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal text-xs sm:text-sm font-semibold bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" 
                  onClick={() => { setIsReportModalOpen(false); setIsFolderCoverModalOpen(true); }}
                >
                  <FolderArchive className="mr-2 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> 
                  <span>Capas & Etiquetas para Pastas Físicas</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal text-xs sm:text-sm font-medium" 
                  onClick={generateFechamentoPDF}
                >
                  <FileText className="mr-2 h-4 w-4 shrink-0 text-slate-700 dark:text-slate-300" /> 
                  <span>Relatório de Fechamento (PDF)</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal text-xs sm:text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200" 
                  onClick={() => generatePDF("Entradas")}
                >
                  <FileText className="mr-2 h-4 w-4 shrink-0 text-emerald-600" /> 
                  <span>Relatório de Entradas (PDF)</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal text-xs sm:text-sm font-medium text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200" 
                  onClick={() => generatePDF("Saídas")}
                >
                  <FileText className="mr-2 h-4 w-4 shrink-0 text-rose-600" /> 
                  <span>Relatório de Saídas (PDF)</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal text-xs sm:text-sm font-medium text-blue-700 hover:text-blue-800 hover:bg-blue-50 border-blue-200" 
                  onClick={() => generatePDF("Dizimistas")}
                >
                  <FileText className="mr-2 h-4 w-4 shrink-0 text-blue-600" /> 
                  <span>Relatório de Dizimistas (PDF)</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal text-xs sm:text-sm font-medium text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200" 
                  onClick={() => generatePDF("Ausentes")}
                >
                  <FileText className="mr-2 h-4 w-4 shrink-0 text-amber-600" /> 
                  <span>Membros s/ Contribuição (3 meses)</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal text-xs sm:text-sm font-medium text-indigo-700 hover:text-indigo-800 hover:bg-indigo-50 border-indigo-200" 
                  onClick={() => { setIsReportModalOpen(false); setIsAnnualReportOpen(true); }}
                >
                  <FileText className="mr-2 h-4 w-4 shrink-0 text-indigo-600" /> 
                  <span>Relatório Financeiro Anual (Gráfico)</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal text-xs sm:text-sm font-medium" 
                  onClick={generateFilteredListPDF}
                >
                  <FileText className="mr-2 h-4 w-4 shrink-0 text-slate-600" /> 
                  <span>Exportar Lista Atual (PDF)</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal text-xs sm:text-sm font-medium" 
                  onClick={handleExport}
                >
                  <Download className="mr-2 h-4 w-4 shrink-0 text-slate-600" /> 
                  <span>Exportar Dados em CSV (.csv)</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal text-xs sm:text-sm font-medium" 
                  onClick={handleExportXLSX}
                >
                  <Download className="mr-2 h-4 w-4 shrink-0 text-emerald-600" /> 
                  <span>Exportar Planilha Excel (.xlsx)</span>
                </Button>

                <div className="col-span-1 sm:col-span-2 pt-3 border-t mt-1 flex flex-col sm:flex-row gap-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 justify-start text-left h-auto py-2.5 px-3 whitespace-normal text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200" 
                    onClick={() => { 
                      setIsReportModalOpen(false); 
                      setActiveMainTab("d3-painel"); 
                      toast.info("Acessando o Painel D3: clique em 'Exportar PDF (Gráficos D3)' no topo do painel.");
                    }}
                  >
                    <BarChart2 className="mr-2 h-4 w-4 shrink-0 text-rose-600" /> 
                    <span>Exportar Gráficos D3 (PDF)</span>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="flex-1 justify-start text-left h-auto py-2.5 px-3 whitespace-normal text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200" 
                    onClick={() => { 
                      setIsReportModalOpen(false); 
                      setActiveMainTab("d3-painel"); 
                      toast.info("Acessando o Painel D3: clique em 'Exportar Excel (.xlsx)' para baixar a planilha consolidada.");
                    }}
                  >
                    <FileSpreadsheet className="mr-2 h-4 w-4 shrink-0 text-emerald-600" /> 
                    <span>Exportar Consolidado D3 (.xlsx)</span>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAnnualReportOpen} onOpenChange={setIsAnnualReportOpen}>
            <DialogContent className="sm:max-w-[700px]">
              <DialogHeader>
                <DialogTitle>Relatório Financeiro Anual ({new Date().getFullYear()})</DialogTitle>
                <DialogDescription>
                  Visão geral de superávit e déficit ao longo dos meses.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={annualChartData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis 
                       tickFormatter={(value) => `R$ ${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value}`}
                    />
                    <RechartsTooltip 
                       formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="Receitas" stroke="#10b981" activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="Despesas" stroke="#ef4444" />
                    <Line type="monotone" dataKey="Saldo" stroke="#3b82f6" strokeDasharray="5 5" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </DialogContent>
          </Dialog>

          
          <Button 
            variant="outline" 
            className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 font-semibold" 
            onClick={() => setIsReconciliationModalOpen(true)}
            title="Importe extratos OFX, Excel ou CSV e cruze automaticamente com o caixa da igreja"
          >
            <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600" /> Conciliação Bancária (OFX)
          </Button>

          {/* Botão Carnê e Envelope Digital de Dízimos */}
          <Button
            variant="outline"
            onClick={() => setIsCarneModalOpen(true)}
            className="border-emerald-400 text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 font-bold shadow-xs"
            title="Gerar carnê semestral ou anual com chave Pix estática individual por membro"
          >
            <QrCode className="mr-1.5 h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Carnê / Envelope Pix
          </Button>

          {/* Botão da Calculadora Financeira Eclesiástica */}
          <Button
            variant="outline"
            onClick={() => setIsCalculatorOpen(true)}
            className="border-purple-300 text-purple-800 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 font-semibold shadow-xs"
            title="Abrir Calculadora Eclesiástica rápida (Dízimos, Ofertas, Divisões e Contas)"
          >
            <Calculator className="mr-1.5 h-4 w-4 text-purple-600 dark:text-purple-400" /> Calculadora
          </Button>

          {/* Modal Reutilizável de Visualização de Anexos (Imagem / PDF) com Portal Dialog */}
          <AttachmentViewerModal
            isOpen={!!viewingAttachment}
            onClose={() => setViewingAttachment(null)}
            attachment={viewingAttachment}
          />

          {/* Modal do Carnê / Envelope Digital de Dízimos Pix */}
          <CarneDizimoModal
            isOpen={isCarneModalOpen}
            onClose={() => setIsCarneModalOpen(false)}
            members={members}
            churchData={churchData}
            activeBranchName={activeBranchName}
            activeBranchId={activeBranch}
          />

          {/* Modal de Calculadora Financeira Eclesiástica */}
          <FinancialCalculatorModal
            isOpen={isCalculatorOpen}
            onClose={() => setIsCalculatorOpen(false)}
            onApplyValue={(val) => {
              setFormAmount(val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            }}
          />

          {/* Modal de Impressão Econômica de Relatórios Financeiros */}
          <FinancialEcoPrintModal
            isOpen={isEcoPrintOpen}
            onClose={() => setIsEcoPrintOpen(false)}
            transactions={branchTransactions}
            activeBranchName={activeBranchName}
          />

          <Dialog open={isTransactionModalOpen} onOpenChange={setIsTransactionModalOpen}>
            <DialogTrigger asChild>
              {canAddTransaction && <Button onClick={handleOpenAddModal}><Plus className="mr-2 h-4 w-4" /> Nova Transação</Button>}
            </DialogTrigger>
            <DialogContent className="w-[95vw] sm:max-w-[560px] max-h-[92vh] flex flex-col p-3.5 sm:p-6 overflow-x-hidden">
              <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle>{editingTransaction ? "Editar Transação" : "Nova Transação"}</DialogTitle>
                </div>
                <DialogDescription className="text-xs sm:text-sm">
                  {editingTransaction ? "Altere os dados da movimentação financeira." : "Adicione uma nova entrada ou saída ao caixa da igreja."}
                </DialogDescription>
              </DialogHeader>
              <form id="transactionForm" onSubmit={handleSaveTransaction} className="flex flex-col flex-1 overflow-hidden">
                <div className="grid gap-3.5 py-2 max-h-[68vh] overflow-y-auto px-0.5">
                  
                  {/* Cartão de Preenchimento Rápido com IA (Sem lentidão) */}
                  <div className="bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-200 dark:border-purple-900/50 rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-purple-600 text-white rounded-lg shrink-0 shadow-xs">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                          Preenchimento Automático com IA
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300">
                            Super Rápido
                          </Badge>
                        </div>
                        <p className="text-[11px] text-purple-800/80 dark:text-purple-300/80">
                          Escaneie comprovante, PIX, nota ou cupom para preencher valores e datas sem digitar.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <AiCreditsBadge />
                      <input
                        ref={scanFileInputRef}
                        type="file"
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleScanReceiptWithAI(f);
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={isScanningReceipt}
                        onClick={() => scanFileInputRef.current?.click()}
                        className="w-full sm:w-auto h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-xs"
                      >
                        {isScanningReceipt ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            Lendo...
                          </>
                        ) : (
                          <>
                            <Camera className="h-3.5 w-3.5 mr-1.5" />
                            Escanear Comprovante
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Item pré-cadastrado e Descrição */}
                  <div className="space-y-2 bg-muted/20 p-2.5 rounded-lg border border-border/60">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="itemSelect" className="text-xs font-semibold">
                        Item de {transactionType === 'entrada' ? 'Entrada' : 'Saída'} (Pré-Cadastrado)
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-primary font-semibold hover:bg-primary/10"
                        onClick={() => {
                          setQuickItemName("");
                          setQuickItemCategory(selectedCategory || "");
                          setIsQuickItemOpen(true);
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Novo Item
                      </Button>
                    </div>

                    <Select
                      value={selectedItemName}
                      onValueChange={(val) => {
                        setSelectedItemName(val);
                        setFormDescription(val);
                        const itm = availableItems.find(i => i.name === val);
                        if (itm?.category) {
                          setSelectedCategory(itm.category);
                        }
                      }}
                    >
                      <SelectTrigger id="itemSelect" className="bg-background">
                        <SelectValue placeholder="Selecione um item rápido ou digite abaixo..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {availableItems
                          .filter(i => Boolean(i?.name && String(i.name).trim() !== "") && (i.type?.toLowerCase() === transactionType || !i.type))
                          .map(i => (
                            <SelectItem key={i.id || i.name} value={String(i.name)}>
                              {i.name} ({i.category || 'Geral'})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>

                    <div className="grid gap-1.5 pt-1">
                      <Label htmlFor="description" className="text-xs font-semibold">Descrição / Detalhes *</Label>
                      <Input 
                        id="description" 
                        name="description" 
                        value={formDescription} 
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="Ex: Dízimo - João Silva / Pagamento Conta de Luz" 
                        required 
                        className="bg-background"
                      />
                      <p className="text-[11px] text-muted-foreground">Nome da pessoa, serviço ou título identificador.</p>
                      {suggestedCategory && selectedCategory !== suggestedCategory && (
                        <div className="flex items-center justify-between text-xs text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/30 px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-900/40 mt-1">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                            <span>Sugestão inteligente de categoria: <strong>{suggestedCategory}</strong></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedCategory(suggestedCategory)}
                            className="text-xs font-bold text-purple-700 dark:text-purple-300 underline hover:text-purple-900 ml-2"
                          >
                            Usar Categoria
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Valor e Data */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="amount">Valor (R$)</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsCalculatorOpen(true)}
                          className="h-5 px-1.5 text-xs text-purple-600 dark:text-purple-400 font-semibold hover:bg-purple-50 dark:hover:bg-purple-950/40 flex items-center gap-1"
                          title="Abrir Calculadora Eclesiástica"
                        >
                          <Calculator className="w-3 h-3" />
                          <span>Calculadora</span>
                        </Button>
                      </div>
                      <Input 
                        id="amount" 
                        name="amount" 
                        type="text" 
                        value={formAmount}
                        placeholder="0,00" 
                        required 
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.,]/g, '');
                          setFormAmount(val);
                        }}
                        onBlur={() => {
                          if (formAmount) {
                            const parsed = parseCurrencyInput(formAmount);
                            if (!isNaN(parsed) && parsed > 0) {
                              setFormAmount(parsed.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                            }
                          }
                        }}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="date">Data da Operação</Label>
                        <span className="text-[10px] text-muted-foreground">Mês: {getCurrentMonthName()}</span>
                      </div>
                      <div className="relative flex items-center">
                        <Input 
                          ref={opDateInputRef}
                          id="date" 
                          name="date" 
                          type="date" 
                          value={transactionOpDate}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTransactionOpDate(val);
                            if (val && !isDateInCurrentMonthYear(val)) {
                              toast.info(`Competência da operação: ${val}.`);
                            }
                          }}
                          onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}
                          required 
                          className="pr-10 bg-background cursor-pointer"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            try {
                              opDateInputRef.current?.showPicker();
                            } catch {
                              opDateInputRef.current?.focus();
                            }
                          }}
                          title="Abrir calendário para escolher a data"
                        >
                          <Calendar className="h-4 w-4 text-primary" />
                        </Button>
                      </div>
                      {transactionOpDate && isMonthLockedHelper(closedMonths, transactionOpDate, selectedBranch || activeBranch) ? (
                        <div className="rounded-lg bg-amber-500/15 border border-amber-300 dark:border-amber-800 p-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2 mt-1">
                          <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Mês Travado:</span> A competência ({formatYearMonthDisplay(transactionOpDate.substring(0, 7))}) está fechada e bloqueada para novas movimentações. Destrave o mês nas opções financeiras caso necessite lançar.
                          </div>
                        </div>
                      ) : transactionOpDate && !isDateInCurrentMonthYear(transactionOpDate) ? (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                          Competência retroativa/futura ({transactionOpDate}). O lançamento será registrado normalmente.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Igreja / Congregação */}
                  <div className="grid gap-1.5">
                    <Label htmlFor="branchId" className="flex items-center gap-1">
                      Igreja / Congregação
                      <TooltipUITooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          Indica em qual congregação este recurso foi movimentado.
                        </TooltipContent>
                      </TooltipUITooltip>
                    </Label>
                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                      <SelectTrigger id="branchId">
                        <SelectValue placeholder="Selecione a congregação" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Tipo e Categoria com Nova Categoria */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="type">Tipo</Label>
                      <Select name="type" value={transactionType} onValueChange={(val) => setTransactionType(val as "entrada" | "saida")} >
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entrada">Entrada (Receita)</SelectItem>
                          <SelectItem value="saida">Saída (Despesa)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="category">Categoria *</Label>
                        <div className="flex items-center gap-1">
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 px-1.5 text-xs text-primary font-semibold hover:bg-primary/10" 
                            onClick={() => {
                              setQuickCategoryName("");
                              setIsQuickCategoryOpen(true);
                            }}
                            title="Cadastrar Nova Categoria"
                          >
                            <Plus className="h-3 w-3 mr-1" /> Nova Categoria
                          </Button>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-5 px-1 text-xs text-muted-foreground hover:text-foreground" 
                            onClick={() => setIsCategoryManagerOpen(true)}
                            title="Gerenciar Categorias"
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <Select 
                        value={selectedCategory} 
                        onValueChange={setSelectedCategory} 
                      >
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Selecione a categoria..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.filter(c => c.type?.toLowerCase() === transactionType || !c.type).map(c => (
                            <SelectItem key={c.id || c.name} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Campos condicionais de Entrada */}
                  {transactionType === 'entrada' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                          <Label htmlFor="documentNumber" className="flex items-center gap-1">
                            Nº Documento / Recibo
                            <TooltipUITooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Número do recibo, comprovante ou identificador de depósito.
                              </TooltipContent>
                            </TooltipUITooltip>
                          </Label>
                          <Input id="documentNumber" name="documentNumber" defaultValue={editingTransaction?.documentNumber !== "-" ? editingTransaction?.documentNumber : ""} placeholder="Ex: REC-001" />
                        </div>

                        <div className="grid gap-1.5">
                          <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                          <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                            <SelectTrigger id="paymentMethod">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pix">Pix</SelectItem>
                              <SelectItem value="Dinheiro">Dinheiro (Espécie)</SelectItem>
                              <SelectItem value="Transferência">Transferência Bancária</SelectItem>
                              <SelectItem value="Cartão">Cartão Débito/Crédito</SelectItem>
                              <SelectItem value="Cheque">Cheque</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Se for Dízimo, permitir vincular membro */}
                      {(selectedCategory.toLowerCase().includes('dízimo') || selectedCategory.toLowerCase().includes('dizimo')) && (
                        <div className="grid gap-1.5 bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                          <Label htmlFor="memberId" className="text-emerald-800 dark:text-emerald-300 font-medium text-xs">
                            Membro Dizimista (Opcional - para controle de fidelidade)
                          </Label>
                          <Select value={selectedMemberId || "none"} onValueChange={setSelectedMemberId}>
                            <SelectTrigger id="memberId" className="bg-white dark:bg-slate-900">
                              <SelectValue placeholder="Selecione o membro dizimista..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum / Visitante</SelectItem>
                              {members.map((m: any) => (
                                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </>
                  )}

                  {/* Campos condicionais de Saída */}
                  {transactionType === 'saida' && (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                          <Label htmlFor="supplierId">Fornecedor / Beneficiário</Label>
                          <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                            <SelectTrigger id="supplierId">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Nenhum / Não Cadastrado</SelectItem>
                              {fornecedores.map((f: any) => (
                                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-1.5">
                          <Label htmlFor="documentNumber" className="flex items-center gap-1">
                            Nº Nota Fiscal / Doc
                            <TooltipUITooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent>
                                Número da NF, Cupom Fiscal ou Recibo emitido.
                              </TooltipContent>
                            </TooltipUITooltip>
                          </Label>
                          <Input id="documentNumber" name="documentNumber" defaultValue={editingTransaction?.documentNumber !== "-" ? editingTransaction?.documentNumber : ""} placeholder="Ex: NF-12345" />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                          <Label htmlFor="costCenter">Centro de Custo</Label>
                          <Select value={selectedCostCenter} onValueChange={setSelectedCostCenter}>
                            <SelectTrigger id="costCenter">
                              <SelectValue placeholder="Centro de Custo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Geral">Geral</SelectItem>
                              <SelectItem value="Templo / Manutenção">Templo / Manutenção</SelectItem>
                              <SelectItem value="Culto / Louvor">Culto / Louvor</SelectItem>
                              <SelectItem value="Missões / Evangelismo">Missões / Evangelismo</SelectItem>
                              <SelectItem value="Ministério Infantil">Ministério Infantil</SelectItem>
                              <SelectItem value="Secretaria / Adm">Secretaria / Administrativo</SelectItem>
                              <SelectItem value="Ação Social">Ação Social</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-1.5">
                          <Label htmlFor="paymentMethod">Forma de Pagamento</Label>
                          <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                            <SelectTrigger id="paymentMethod">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pix">Pix</SelectItem>
                              <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                              <SelectItem value="TED/DOC">TED/DOC</SelectItem>
                              <SelectItem value="Boleto">Boleto Bancário</SelectItem>
                              <SelectItem value="Cartão">Cartão</SelectItem>
                              <SelectItem value="Cheque">Cheque</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor="historico">Histórico / Detalhamento</Label>
                        <Input id="historico" name="historico" defaultValue={editingTransaction?.historico} placeholder="Ex: Pagamento referente a material de limpeza para o retiro de jovens" />
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor="receiptFile">Comprovante de Pagamento (Anexo)</Label>
                        {comprovanteName && (
                          <div className="text-xs text-emerald-600 mb-1 flex items-center justify-between bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded">
                            <span className="truncate max-w-[280px] font-medium">{comprovanteName}</span>
                            <button type="button" className="text-red-500 hover:text-red-600 font-semibold text-xs ml-2" onClick={() => { setComprovanteData(null); setComprovanteName(null); }}>Remover</button>
                          </div>
                        )}
                        <Input 
                          id="receiptFile" 
                          name="receiptFile" 
                          type="file" 
                          accept="image/*,.pdf" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setComprovanteName(file.name);
                              setUploadProgress(0);
                              
                              let progress = 0;
                              const interval = setInterval(() => {
                                progress += 25;
                                if (progress <= 100) setUploadProgress(progress);
                              }, 150);

                              const reader = new FileReader();
                              reader.onloadend = () => {
                                clearInterval(interval);
                                setUploadProgress(100);
                                setTimeout(() => {
                                  setComprovanteData(reader.result as string);
                                  setUploadProgress(null);
                                  toast.success("Documento anexado com sucesso!");
                                }, 300);
                              };
                              setTimeout(() => reader.readAsDataURL(file), 200);
                            }
                          }}
                        />
                      
                        {uploadProgress !== null && (
                          <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                            <div className="bg-primary h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Status e Vencimento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                    <div className="grid gap-1.5">
                      <Label htmlFor="status">Status da Liquidação</Label>
                      <Select value={selectedStatus} onValueChange={(val: any) => setSelectedStatus(val)}>
                        <SelectTrigger id="status">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pago">Liquidado / Pago</SelectItem>
                          <SelectItem value="Pendente">Pendente / A Pagar ou Receber</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="dueDate">Vencimento Programado</Label>
                      <div className="relative flex items-center">
                        <Input 
                          ref={dueDateInputRef}
                          id="dueDate" 
                          name="dueDate" 
                          type="date" 
                          value={transactionDueDate} 
                          onChange={e => setTransactionDueDate(e.target.value)}
                          onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}
                          className="pr-10 bg-background cursor-pointer"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            try {
                              dueDateInputRef.current?.showPicker();
                            } catch {
                              dueDateInputRef.current?.focus();
                            }
                          }}
                          title="Abrir calendário para escolher vencimento"
                        >
                          <Calendar className="h-4 w-4 text-primary" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter className="mt-2 pt-2 border-t flex flex-row justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsTransactionModalOpen(false)}>Cancelar</Button>
                  <Button 
                    type="submit"
                    disabled={isMonthLockedHelper(closedMonths, transactionOpDate, selectedBranch || activeBranch)}
                    className={isMonthLockedHelper(closedMonths, transactionOpDate, selectedBranch || activeBranch) ? "bg-amber-700/80 hover:bg-amber-700 cursor-not-allowed text-white" : ""}
                    title={isMonthLockedHelper(closedMonths, transactionOpDate, selectedBranch || activeBranch) ? "Mês fechado e travado contra alterações" : undefined}
                  >
                    {isMonthLockedHelper(closedMonths, transactionOpDate, selectedBranch || activeBranch) ? (
                      <span className="flex items-center gap-1.5">
                        <Lock className="w-4 h-4" /> Mês Travado (Bloqueado)
                      </span>
                    ) : (
                      editingTransaction ? "Salvar Alterações" : "Salvar Transação"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Modal Rápido: Cadastrar Nova Categoria */}
          <Dialog open={isQuickCategoryOpen} onOpenChange={setIsQuickCategoryOpen}>
            <DialogContent className="w-[95vw] sm:max-w-[420px] p-4 sm:p-6 overflow-x-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Nova Categoria de {transactionType === 'entrada' ? 'Entrada' : 'Saída'}
                </DialogTitle>
                <DialogDescription>
                  Adicione uma nova categoria personalizada para classificar suas movimentações.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="quickCategoryInput">Nome da Categoria *</Label>
                  <Input 
                    id="quickCategoryInput" 
                    value={quickCategoryName} 
                    onChange={(e) => setQuickCategoryName(e.target.value)} 
                    placeholder="Ex: Oferta Especial, Reforma do Templo, Eventos" 
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleQuickAddCategory();
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsQuickCategoryOpen(false)}>Cancelar</Button>
                <Button type="button" onClick={handleQuickAddCategory}>Cadastrar Categoria</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal Rápido: Cadastrar Novo Item */}
          <Dialog open={isQuickItemOpen} onOpenChange={setIsQuickItemOpen}>
            <DialogContent className="w-[95vw] sm:max-w-[440px] p-4 sm:p-6 overflow-x-hidden">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Novo Item de {transactionType === 'entrada' ? 'Entrada' : 'Saída'}
                </DialogTitle>
                <DialogDescription>
                  Cadastre um item frequente com sua categoria pré-definida para agilizar os lançamentos.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3 py-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="quickItemInput">Nome do Item *</Label>
                  <Input 
                    id="quickItemInput" 
                    value={quickItemName} 
                    onChange={(e) => setQuickItemName(e.target.value)} 
                    placeholder="Ex: Água Mineral 20L, Dízimo Culto Domingo, Suco de Ceia" 
                    autoFocus
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="quickItemCategorySelect">Categoria do Item</Label>
                  <Select 
                    value={quickItemCategory || selectedCategory} 
                    onValueChange={setQuickItemCategory}
                  >
                    <SelectTrigger id="quickItemCategorySelect">
                      <SelectValue placeholder="Selecione a categoria..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.filter(c => c.type?.toLowerCase() === transactionType || !c.type).map(c => (
                        <SelectItem key={c.id || c.name} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsQuickItemOpen(false)}>Cancelar</Button>
                <Button type="button" onClick={handleQuickAddItem}>Cadastrar Item</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isCategoryManagerOpen} onOpenChange={setIsCategoryManagerOpen}>
            <DialogContent className="w-[95vw] sm:max-w-[440px] p-4 sm:p-6 overflow-x-hidden">
              <DialogHeader>
                <DialogTitle>Gerenciar Categorias</DialogTitle>
                <DialogDescription>
                  Adicione ou remova categorias de transações.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="Nova categoria..." 
                    value={newManagerCategoryName}
                    onChange={(e) => setNewManagerCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCategoryFromManager("entrada");
                      }
                    }}
                  />
                  <Button type="button" onClick={() => handleAddCategoryFromManager("entrada")}>Adicionar</Button>
                </div>
                <div className="border rounded-md max-h-[300px] overflow-y-auto">
                  <div className="overflow-x-auto w-full"><Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Nome da Categoria</TableHead>
                        <TableHead className="text-right print:hidden">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableCategories.map((c) => (
                        <TableRow key={c.id || c.name}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {c.name}
                              {c.type === 'entrada' ? <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Entrada</Badge> : (c.type === 'saida' ? <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">Saída</Badge> : null)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteCategory(c.id || c.name)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {availableCategories.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={2} className="text-center text-slate-500">Nenhuma categoria cadastrada.</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table></div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 print:hidden">
        <Card className="bg-slate-50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-slate-700 dark:text-slate-400 uppercase tracking-wide">
              Saldo do mês anterior ({summaryPrevMonthName})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-200">
              R$ {saldoAnterior.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Acumulado até {summaryPrevMonthName}</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">
              Entradas do mês ({summaryCurrentMonthName})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              + R$ {totalEntradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-1">Total arrecadado no período</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-50/40 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/40 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-rose-800 dark:text-rose-400 uppercase tracking-wide">
              Saídas do mês ({summaryCurrentMonthName})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              - R$ {totalSaidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-rose-700/80 dark:text-rose-400/80 mt-1">Total despesas e pagamentos</p>
          </CardContent>
        </Card>
        <Card className={saldoAtual >= 0 ? "bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50 shadow-xs" : "bg-red-50/40 dark:bg-red-950/20 border-red-200 dark:border-red-900/50 shadow-xs"}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-semibold text-blue-900 dark:text-blue-300 uppercase tracking-wide">
              Saldo a transportar para o mês ({summaryNextMonthName})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${saldoAtual >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-400'}`}>
              R$ {saldoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Saldo líquido final transportado</p>
          </CardContent>
        </Card>
      </div>


      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="w-full space-y-6">
        <TabsList className="print:hidden">
          <TabsTrigger value="transacoes">Transações Recentes</TabsTrigger>
          <TabsTrigger value="balancete" className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold" onClick={() => setIsBalanceteModalOpen(true)}>
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Balancete para Assembleia
          </TabsTrigger>
          <TabsTrigger value="d3-painel" className="flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-primary" />
            Painel Visual D3
          </TabsTrigger>
          <TabsTrigger value="relatorios">Gráficos & Análise (Recharts)</TabsTrigger>
        </TabsList>
        <TabsContent value="transacoes" className="space-y-6">
        <Card>
        <CardHeader>
          <CardTitle>Transações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="relative w-full lg:max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type="search"
                  placeholder="Buscar transações..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap w-full lg:w-auto gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Todos os Tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="entrada">Entradas</SelectItem>
                    <SelectItem value="saida">Saídas</SelectItem>
                  </SelectContent>
                </Select>

                <Popover open={openCategory} onOpenChange={setOpenCategory}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCategory}
                      className="w-full sm:w-[200px] justify-between font-normal"
                    >
                      {categoryFilter === "all"
                        ? "Todas as Categorias"
                        : categories.find((c) => c.name === categoryFilter)?.name}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar categoria..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setCategoryFilter("all")
                              setOpenCategory(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                categoryFilter === "all" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Todas as Categorias
                          </CommandItem>
                          {categories.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={(currentValue) => {
                                setCategoryFilter(currentValue === categoryFilter ? "all" : c.name)
                                setOpenCategory(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  categoryFilter === c.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {c.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <div className="relative flex items-center w-full sm:w-[160px]">
                  <Input
                    ref={tableMonthInputRef}
                    type="month"
                    className="w-full pr-8 cursor-pointer bg-background"
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}
                    title="Mês de Referência"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      try {
                        tableMonthInputRef.current?.showPicker();
                      } catch {
                        tableMonthInputRef.current?.focus();
                      }
                    }}
                    title="Escolher mês no calendário"
                  >
                    <Calendar className="h-4 w-4 text-primary" />
                  </Button>
                </div>

                {/* Indicador e Controle de Trava do Mês */}
                {isCurrentMonthLocked ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Badge className="bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 py-1.5 px-3 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                      <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      Mês Travado
                    </Badge>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLockManagerOpen(true)}
                      className="h-9 text-xs border-amber-300 text-amber-900 dark:text-amber-200 hover:bg-amber-50 font-bold"
                      title="Destravar este mês para edições ou novos lançamentos"
                    >
                      <Unlock className="w-3.5 h-3.5 mr-1 text-amber-600" /> Destravar
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLockManagerOpen(true)}
                    className="h-9 text-xs border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 font-semibold shrink-0"
                    title="Travar este mês quando tudo estiver fechado para não permitir alterações"
                  >
                    <Lock className="w-3.5 h-3.5 mr-1 text-slate-600 dark:text-slate-400" /> Travar Mês
                  </Button>
                )}

                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    onClick={clearFilters}
                    className="px-3"
                    title="Limpar filtros"
                  >
                    <FilterX className="h-4 w-4 mr-2" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Banner de Aviso de Mês Travado */}
          {isCurrentMonthLocked && (
            <div className="mx-6 mb-4 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-l-4 border-amber-500 border-y border-r border-amber-200 dark:border-amber-900/60 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500/20 text-amber-700 dark:text-amber-300 rounded-xl shrink-0">
                  <Lock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                    Mês Contábil Fechado e Travado • {summaryCurrentMonthName}
                    <Badge className="bg-amber-600 text-white text-[10px] font-bold">Alterações Bloqueadas</Badge>
                  </h4>
                  <p className="text-xs text-amber-900/80 dark:text-amber-300/80 mt-0.5">
                    Travado por <strong>{currentLockRecord?.lockedBy || "Administrador"}</strong> em{" "}
                    {currentLockRecord?.lockedAt ? new Date(currentLockRecord.lockedAt).toLocaleString("pt-BR") : "fechamento"}.
                    Lançamentos, edições e exclusões estão desabilitados para manter a fidelidade contábil.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsLockManagerOpen(true)}
                className="border-amber-300 text-amber-900 dark:text-amber-200 hover:bg-amber-100 text-xs shrink-0 font-bold"
              >
                <Unlock className="w-3.5 h-3.5 mr-1 text-amber-600" /> Destravar Mês
              </Button>
            </div>
          )}
          <div className="overflow-x-auto w-full">
            <style>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 10mm;
                }
                body * {
                  visibility: hidden;
                }
                #printable-standard, #printable-standard * {
                  visibility: visible;
                }
                #printable-standard {
                  position: absolute;
                  left: 0;
                  top: 0;
                  width: 100% !important;
                  margin: 0 !important;
                  padding: 0 !important;
                  background: white !important;
                }
                .financial-print-table {
                  width: 100% !important;
                  max-width: 190mm !important;
                  table-layout: fixed !important;
                  border-collapse: collapse !important;
                  margin-top: 8px !important;
                  font-size: 8.5pt !important;
                }
                .financial-print-table th,
                .financial-print-table td {
                  border: 1px solid #333 !important;
                  padding: 4px 6px !important;
                  line-height: 1.25 !important;
                  color: #000 !important;
                  vertical-align: middle !important;
                }
                .financial-print-table th {
                  background-color: #f1f5f9 !important;
                  font-weight: 700 !important;
                  text-transform: uppercase !important;
                }
                /* Larguras fixas e otimizadas para as colunas de data, cheque, nome, banco e valor */
                .col-print-data {
                  width: 22mm !important;
                  min-width: 22mm !important;
                  max-width: 22mm !important;
                  text-align: center !important;
                  white-space: nowrap !important;
                }
                .col-print-cheque {
                  width: 28mm !important;
                  min-width: 28mm !important;
                  max-width: 28mm !important;
                  word-break: break-all !important;
                }
                .col-print-nome {
                  width: 110mm !important;
                  min-width: 110mm !important;
                  max-width: 110mm !important;
                  word-break: break-word !important;
                }
                .col-print-banco {
                  display: none !important;
                }
                .col-print-valor {
                  width: 30mm !important;
                  min-width: 30mm !important;
                  max-width: 30mm !important;
                  text-align: right !important;
                  white-space: nowrap !important;
                }
              }
            `}</style>
            <Table className="financial-print-table">
            <TableHeader>
              <TableRow>
                <TableHead className="col-print-data font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Data</TableHead>
                <TableHead className="col-print-cheque font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Nº Cheque / Doc</TableHead>
                <TableHead className="col-print-nome font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50 w-[300px]">Nome / Descrição</TableHead>
                <TableHead className="col-print-banco font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Banco / Categoria</TableHead>
                <TableHead className="print:hidden font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50 w-[60px] text-center"><Paperclip className="h-4 w-4 mx-auto text-slate-500" /></TableHead>
                <TableHead className="col-print-valor text-right font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50 min-w-[120px]">Valor (R$)</TableHead>
                <TableHead className="text-right print:hidden font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="col-print-data">{new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                    <TableCell className="col-print-cheque font-mono text-xs">{t.documentNumber || "-"}</TableCell>
                    <TableCell className="col-print-nome font-medium">
                      {t.description}
                      {t.supplier && <span className="block text-xs text-slate-500 font-normal">{t.supplier}</span>}
                    </TableCell>
                    <TableCell className="col-print-banco">
                      {t.costCenter ? `${t.category} (${t.costCenter})` : t.category}
                      {t.type === 'saida' && t.status === 'Pendente' && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 print:hidden">Pendente</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center print:hidden">
                      {(t.comprovante || t.receiptFileName) ? (
                         <Button 
                           variant="ghost" 
                           className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 h-8" 
                           onClick={() => {
                             if (t.comprovante) {
                               setViewingAttachment({
                                 url: t.comprovante,
                                 fileName: t.receiptFileName || "Comprovante"
                               });
                             } else {
                               toast.error("O arquivo original não está gravado no banco de dados.");
                             }
                           }} 
                           title={t.receiptFileName ? `Visualizar: ${t.receiptFileName}` : "Visualizar Anexo"}
                         >
                           <Paperclip className="h-4 w-4" />
                         </Button>
                      ) : (
                         <span className="text-slate-300">-</span>
                      )}
                    </TableCell>
                    <TableCell className={`col-print-valor text-right font-semibold ${t.type === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                      {t.type === 'entrada' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right print:hidden">
                      {isMonthLockedHelper(closedMonths, t.date, t.branchId) ? (
                        <div className="flex justify-end items-center gap-1.5">
                          <Badge 
                            variant="outline" 
                            className="text-[11px] text-amber-800 dark:text-amber-200 bg-amber-500/10 border-amber-300 dark:border-amber-700 flex items-center gap-1 py-0.5 px-2 font-medium"
                            title="Mês contábil fechado e travado. Alterações e exclusões estão bloqueadas."
                          >
                            <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Travado
                          </Badge>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                            onClick={() => setIsLockManagerOpen(true)}
                            title="Ver detalhes da trava do mês"
                          >
                            Ver
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(t)}>Editar</Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setTransactionToDelete(t)}>Excluir</Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma transação encontrada com os filtros atuais.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table></div>

          {/* Somatória por Tipo de Categoria visível na impressão física direta (Anexo 3) */}
          <div className="hidden print:block mt-6 pt-4 border-t-2 border-black avoid-page-break">
            <h3 className="font-bold text-xs uppercase mb-2">Demonstrativo / Somatória por Categoria</h3>
            <table className="w-full text-[9px] border-collapse border border-black">
              <thead>
                <tr className="border-b border-black bg-gray-100">
                  <th className="border border-black p-1 text-left">Categoria</th>
                  <th className="border border-black p-1 text-center w-[20mm]">Tipo</th>
                  <th className="border border-black p-1 text-center w-[25mm]">Qtd Lançamentos</th>
                  <th className="border border-black p-1 text-right w-[35mm]">Subtotal (R$)</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(
                  filteredTransactions.reduce((acc: any, t) => {
                    const cat = t.category || "Sem Categoria";
                    if (!acc[cat]) acc[cat] = { total: 0, count: 0, type: t.type };
                    acc[cat].total += Number(t.amount || 0);
                    acc[cat].count += 1;
                    return acc;
                  }, {})
                ).map(([cat, info]: any) => (
                  <tr key={cat} className="border-b border-black">
                    <td className="border border-black p-1 font-medium">{cat}</td>
                    <td className="border border-black p-1 text-center">{info.type === 'entrada' ? 'Entrada' : 'Saída'}</td>
                    <td className="border border-black p-1 text-center">{info.count}</td>
                    <td className="border border-black p-1 text-right font-bold font-mono">
                      R$ {info.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredTransactions.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 25, 50, 100]}
              mode={paginationMode}
              onModeChange={setPaginationMode}
              hasMore={hasMore}
              onLoadMore={() => setCurrentPage((p) => p + 1)}
              itemName="transações"
              className="print:hidden"
            />
          )}
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Histórico de Auditoria & Alterações</span>
            <span className="text-xs font-normal text-muted-foreground">Monitoramento em tempo real</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto w-full"><Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Data / Hora</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Ação / Nível</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Detalhes da Operação</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Usuário</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(financialAuditLogs.length > 0 ? financialAuditLogs : auditLogs.filter(log => log.action?.includes('Financeira')))
                .slice(0, 10)
                .map(log => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
                      {log.createdAt?.toDate ? log.createdAt.toDate().toLocaleString('pt-BR') : new Date(log.date || log.timestamp || Date.now()).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                        log.action?.includes('Exclusão') ? 'bg-red-50 text-red-700 ring-red-600/20' :
                        log.action?.includes('Edição') || log.action?.includes('Alteração') ? 'bg-amber-50 text-amber-700 ring-amber-600/20' :
                        'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                      }`}>
                        {log.severity === 'critical' && <span className="mr-1 font-bold text-red-600">●</span>}
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[340px] truncate text-xs" title={log.details}>
                      {log.details}
                    </TableCell>
                    <TableCell className="text-xs font-medium">{log.user}</TableCell>
                  </TableRow>
                ))}
              {(financialAuditLogs.length === 0 && auditLogs.filter(log => log.action?.includes('Financeira')).length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="h-16 text-center text-slate-500">
                    Nenhuma alteração financeira registrada até o momento.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table></div>
        </CardContent>
      </Card>
        </TabsContent>
        <TabsContent value="d3-painel" className="space-y-6">
          <FinancialD3Panel
            transactions={transactions}
            branches={branches}
            activeBranch={activeBranch}
          />
        </TabsContent>
        <TabsContent value="relatorios" className="space-y-6">
          <FinancialRechartsPanel
            transactions={transactions}
            branches={branches}
            activeBranch={activeBranch}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
          />
        </TabsContent>
      </Tabs>
      <Dialog open={transactionToDelete !== null} onOpenChange={(open) => !open && setTransactionToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setTransactionToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={executeDeleteTransaction}>Sim, Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    
      <CloudBackupAndExportModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        currentUser={user}
      />

      <BalanceteMensalModal
        isOpen={isBalanceteModalOpen}
        onClose={() => setIsBalanceteModalOpen(false)}
        transactions={transactions}
        churchName={churchData?.nome || "Igreja Evangélica Pentecostal O Brasil para Cristo"}
        activeBranchName={activeBranchName}
      />

      {/* Modal de Gestão de Fechamento e Trava de Mês Contábil */}
      <ClosedMonthManagerModal
        isOpen={isLockManagerOpen}
        onClose={() => setIsLockManagerOpen(false)}
        yearMonth={activeSummaryMonth}
        branchId={activeBranch}
        branchName={activeBranchName}
        transactions={branchTransactions}
        totalEntradas={totalEntradas}
        totalSaidas={totalSaidas}
        saldoAnterior={saldoAnterior}
        saldoAtual={saldoAtual}
        totalTransacoes={branchTransactions.filter(t => t.date && t.date.substring(0, 7) === activeSummaryMonth).length}
        userName={user?.name || user?.email || "Administrador / Tesouraria"}
        userEmail={user?.email || ""}
        currentLockRecord={currentLockRecord}
        allClosedMonths={closedMonths}
        onOpenFolderCovers={(ym) => {
          setIsLockManagerOpen(false);
          setIsFolderCoverModalOpen(true);
        }}
      />

      {/* Modal de Capas Oficiais A4 e Etiquetas para Pastas e Caixas Físicas */}
      <FolderCoverAndLabelsModal
        isOpen={isFolderCoverModalOpen}
        onClose={() => setIsFolderCoverModalOpen(false)}
        initialYearMonth={activeSummaryMonth}
        branchId={activeBranch}
        branchName={activeBranchName}
        transactions={branchTransactions}
        closedMonths={closedMonths}
      />

      {/* Modal de Conciliação Bancária Inteligente (OFX / Excel / CSV) */}
      <BankReconciliationModal
        isOpen={isReconciliationModalOpen}
        onClose={() => setIsReconciliationModalOpen(false)}
        branchId={activeBranch}
        branchName={activeBranchName}
        churchTransactions={branchTransactions}
        onAddTransaction={async (newTxData) => {
          try {
            await addDoc(collection(db, "transactions"), {
              ...newTxData,
              createdAt: serverTimestamp(),
            });
            toast.success("Lançamento adicionado ao caixa!");
          } catch (err) {
            console.warn("Erro ao gravar no Firestore, salvando localmente:", err);
            const newTx = { id: `local_${Date.now()}`, ...newTxData };
            const updated = [newTx, ...transactions];
            setTransactions(updated);
            localStorage.setItem("churchTransactions", JSON.stringify(updated));
          }
        }}
      />


      <div className="hidden print:block mt-8 pt-4 border-t text-center text-sm text-slate-500">
        <p>Documento gerado automaticamente pelo Sistema de Gestão de Igrejas.</p>
        <p>Página de Relatório Financeiro Consolidado</p>
      </div>
      <PrintDebugger isOpen={showPrintDebugger} onClose={() => setShowPrintDebugger(false)} onForcePrint={() => { window.open("", "_blank")?.document.write("Pressione Ctrl+P (ou Cmd+P) para imprimir esta página.<br><br>Verifique se os bloqueadores de pop-up estão desativados."); toast.info("Tente imprimir usando o atalho de teclado na nova aba."); }} />
    </motion.div>

  )
}
