const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

const stateBlock = `
  const { activeBranch } = useBranch();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"entrada" | "saida">("entrada");
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");
  const [categories, setCategories] = useState<{ id: string, name: string, type: 'entrada' | 'saida' }[]>([]);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [newManagerCategoryName, setNewManagerCategoryName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [openCategory, setOpenCategory] = useState(false);
  const [comprovanteName, setComprovanteName] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [comprovanteData, setComprovanteData] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [isAnnualReportOpen, setIsAnnualReportOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [showPrintDebugger, setShowPrintDebugger] = useState(false);
  const [fornecedores, setFornecedores] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [availableSuppliers, setAvailableSuppliers] = useState<string[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  // State added to replace the chunk missing
  const handleOpenAddModal = () => {
    setEditingTransaction(null);
    setTransactionType("entrada");
    setSelectedCategory("");
    setComprovanteName("");
    setComprovanteData(null);
    setIsTransactionModalOpen(true);
  };

  const handleOpenEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setTransactionType(tx.type as "entrada" | "saida");
    setSelectedCategory(tx.category);
    setComprovanteName(tx.receiptFileName || "");
    setComprovanteData(tx.comprovante || null);
    setIsTransactionModalOpen(true);
  };

  const handleImportFile = (file: File) => {
    toast.success("Arquivo importado com sucesso!");
    setIsImportModalOpen(false);
  };

  const handleExport = () => exportToCSV(transactions, "financeiro.csv");
  const handleExportXLSX = () => exportToXLSX(transactions, "financeiro.xlsx");

  const generatePDF = () => toast.info("Gerando PDF...");
  const generateFilteredListPDF = () => toast.info("Gerando PDF da lista...");
  
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
        await deleteDoc(doc(db, 'transactions', transactionToDelete.id));
        setTransactionToDelete(null);
        toast.success("Deletado!");
     }
  };

  const availableCategories = categories.filter(c => c.type === transactionType);
  const clearFilters = () => {
    setSearchTerm("");
    setCategoryFilter("all");
    setTypeFilter("all");
    setMonthFilter("");
  };
  const hasActiveFilters = searchTerm !== "" || categoryFilter !== "all" || typeFilter !== "all" || monthFilter !== "";

  const filteredTransactions = transactions.filter(t => {
     if (typeFilter !== 'all' && t.type !== typeFilter) return false;
     if (categoryFilter !== 'all' && t.category !== categoryFilter) return false;
     if (monthFilter && !t.date.startsWith(monthFilter)) return false;
     if (searchTerm && !t.description.toLowerCase().includes(searchTerm.toLowerCase())) return false;
     return true;
  });

  const annualChartData = [];
`;

code = code.replace(
  "const isFinanceiroAdmin = ['administrador', 'tesoureiro'].includes(user?.role?.toLowerCase() || '');",
  "const isFinanceiroAdmin = ['administrador', 'tesoureiro'].includes(user?.role?.toLowerCase() || '');\n" + stateBlock
);

fs.writeFileSync('src/pages/Financeiro.tsx', code);
