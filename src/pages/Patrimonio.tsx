import { motion } from "motion/react";
import React, { useState, useRef, useEffect, useMemo } from "react";
import { 
  collection, 
  onSnapshot, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { printDocument } from "@/lib/printUtils";
import { PrintDebugger } from "@/components/PrintDebugger";
import { getRegisteredChurchLogo, drawChurchLogoInPdf, drawSafeChurchReportHeader } from "@/lib/churchLogoHelper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Plus, 
  Search, 
  FileText, 
  Download, 
  QrCode, 
  Printer, 
  Activity, 
  Building2, 
  Edit, 
  Trash2, 
  Wrench, 
  ShieldAlert, 
  Tag, 
  Calendar, 
  DollarSign, 
  CheckCircle,
  FileCheck,
  Package,
  Layers,
  Sparkles,
  Info,
  Upload,
  Image as ImageIcon,
  Eye,
  X,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { logAction } from "@/lib/audit";
import { useAuth } from "@/contexts/AuthContext";
import { useBranch } from "@/contexts/BranchContext";
import { matchesBranch } from "@/lib/branchUtils";
import { TablePagination } from "@/components/ui/table-pagination";
import { logCriticalError } from "@/lib/errorLogger";
import { executeDbOperation } from "@/lib/firebaseHelper";
import { validateForm } from "@/lib/validation";
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer 
} from "recharts";
import { Html5QrcodeScanner } from "html5-qrcode";

export interface Asset {
  id: string;
  tag: string;
  name: string;
  category: string;
  location: string;
  branchId: string;
  value: number;
  status: "Em uso" | "Manutenção" | "Emprestado" | "Doado" | "Vendido" | "Baixado";
  specs?: string;
  notes?: string;
  purchaseDate?: string;
  depreciationRate?: number;
  lastMaintenance?: string;
  borrowedTo?: string;
  fileName?: string;
  scannedDocs?: string[];
  imageUrl?: string;
  invoiceDocumentUrl?: string;
  invoiceDocumentName?: string;
  invoiceNumber?: string;
  supplierName?: string;
  acquisitionType?: "Compra" | "Doação" | "Transferência" | "Outros";
  acquisitionDate?: string;
  acquisitionValue?: number;
  createdAt?: any;
  updatedAt?: any;
}

const initialAssets: Asset[] = [
  { 
    id: "PAT-001", 
    tag: "EQP-001", 
    name: "Mesa de Som Yamaha MG16XU", 
    category: "Áudio e Vídeo", 
    location: "Templo Principal", 
    branchId: "sede", 
    value: 3500.00, 
    status: "Em uso", 
    specs: "16 canais, processador de efeitos SPX", 
    notes: "Adquirida para o sistema principal de som", 
    purchaseDate: "2023-01-15", 
    depreciationRate: 10, 
    lastMaintenance: "2024-05-10" 
  },
  { 
    id: "PAT-002", 
    tag: "EQP-002", 
    name: "Projetor Epson PowerLite Full HD", 
    category: "Áudio e Vídeo", 
    location: "Templo Principal", 
    branchId: "sede", 
    value: 4200.00, 
    status: "Em uso", 
    specs: "4000 lumens, entrada HDMI", 
    notes: "Instalado no teto da nave central", 
    purchaseDate: "2022-11-20", 
    depreciationRate: 15, 
    lastMaintenance: "2024-02-18" 
  },
  { 
    id: "PAT-003", 
    tag: "MOB-001", 
    name: "Cadeiras Plásticas Estofadas (Lote 50 un)", 
    category: "Mobiliário", 
    location: "Salão Social", 
    branchId: "sede", 
    value: 2500.00, 
    status: "Em uso", 
    specs: "Polipropileno reforçado, cor azul", 
    notes: "Lote 1 para eventos e reuniões", 
    purchaseDate: "2024-02-01", 
    depreciationRate: 5, 
    lastMaintenance: "" 
  },
  { 
    id: "PAT-004", 
    tag: "INF-001", 
    name: "Notebook Dell Inspiron 15 Core i5", 
    category: "Informática", 
    location: "Secretaria", 
    branchId: "sede", 
    value: 3200.00, 
    status: "Manutenção", 
    specs: "Core i5 11ª Ger, 16GB RAM, 512GB SSD", 
    notes: "Enviado para troca de bateria e limpeza", 
    purchaseDate: "2021-08-05", 
    depreciationRate: 20, 
    lastMaintenance: "2025-01-12" 
  },
  { 
    id: "PAT-005", 
    tag: "MUS-001", 
    name: "Teclado Roland XPS-30", 
    category: "Instrumentos Musicais", 
    location: "Altar Principal", 
    branchId: "sede", 
    value: 5800.00, 
    status: "Em uso", 
    specs: "Sintetizador 61 teclas, sons de piano acústico", 
    notes: "Utilizado pelo ministério de louvor", 
    purchaseDate: "2023-06-10", 
    depreciationRate: 10, 
    lastMaintenance: "" 
  }
];

const PREDEFINED_CATEGORIES = [
  "Áudio e Vídeo",
  "Mobiliário",
  "Informática",
  "Instrumentos Musicais",
  "Eletrodomésticos",
  "Segurança e Redes",
  "Veículos",
  "Outros"
];

function QrScanner({ onResult }: { onResult: (text: string) => void }) {
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    try {
      scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 } }, false);
      scanner.render(
        (text) => {
          scanner?.clear().catch(() => {});
          onResult(text);
        },
        () => {
          // ignore scan frame errors
        }
      );
    } catch (e) {
      console.warn("Scanner init error:", e);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(() => {});
      }
    };
  }, [onResult]);

  return <div id="qr-reader" className="w-full overflow-hidden rounded-lg"></div>;
}

export function Patrimonio() {
  const { activeBranch, branches, activeBranchName } = useBranch();
  const { user } = useAuth();

  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("all");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginationMode, setPaginationMode] = useState<"pagination" | "infinite">("pagination");

  // Modals & form states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [showPrintDebugger, setShowPrintDebugger] = useState(false);

  // Editing / Selection states
  const [editingItem, setEditingItem] = useState<Asset | null>(null);
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
  const [selectedAssetForLabel, setSelectedAssetForLabel] = useState<Asset | null>(null);

  // Form Controlled States
  const [formTag, setFormTag] = useState("");
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("Áudio e Vídeo");
  const [formLocation, setFormLocation] = useState("");
  const [formBranchId, setFormBranchId] = useState("sede");
  const [formValue, setFormValue] = useState("");
  const [formStatus, setFormStatus] = useState<Asset["status"]>("Em uso");
  const [formPurchaseDate, setFormPurchaseDate] = useState("");
  const [formDepreciationRate, setFormDepreciationRate] = useState("10");
  const [formLastMaintenance, setFormLastMaintenance] = useState("");
  const [formBorrowedTo, setFormBorrowedTo] = useState("");
  const [formSpecs, setFormSpecs] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formInvoiceDocumentUrl, setFormInvoiceDocumentUrl] = useState("");
  const [formInvoiceDocumentName, setFormInvoiceDocumentName] = useState("");
  const [formInvoiceNumber, setFormInvoiceNumber] = useState("");
  const [formSupplierName, setFormSupplierName] = useState("");
  const [formAcquisitionType, setFormAcquisitionType] = useState<"Compra" | "Doação" | "Transferência" | "Outros">("Compra");
  const [formAcquisitionDate, setFormAcquisitionDate] = useState("");
  const [formAcquisitionValue, setFormAcquisitionValue] = useState("");
  const [previewDocAsset, setPreviewDocAsset] = useState<Asset | null>(null);
  const [previewDocModalOpen, setPreviewDocModalOpen] = useState(false);
  const [previewImageModalUrl, setPreviewImageModalUrl] = useState<string | null>(null);

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormImageUrl(reader.result as string);
      toast.success("Foto carregada com sucesso!");
    };
    reader.readAsDataURL(file);
  };

  const handleInvoiceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("O arquivo deve ter no máximo 5MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFormInvoiceDocumentUrl(reader.result as string);
      setFormInvoiceDocumentName(file.name);
      toast.success(`Documento anexado: ${file.name}`);
    };
    reader.readAsDataURL(file);
  };

  const printRef = useRef<HTMLDivElement>(null);

  // Church config for headers & reports
  const [churchData, setChurchData] = useState<any>(() => {
    const saved = localStorage.getItem("churchConfig");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      nome: "Igreja Local",
      endereco: "Rua Principal, 123",
      cidade: "São Paulo/SP",
      cnpj: "00.000.000/0001-00",
      phone: "(11) 98765-4321"
    };
  });

  const activeBranchObj = useMemo(() => {
    return branches.find((b: any) => b.id === activeBranch);
  }, [branches, activeBranch]);

  const displayChurchName = activeBranchObj?.name || (activeBranch !== 'all' ? activeBranchName : (churchData?.nome || "Igreja"));
  const displayChurchAddress = activeBranchObj?.address 
    ? activeBranchObj.address 
    : (activeBranchObj?.cidade ? `${activeBranchObj.bairro || ""} - ${activeBranchObj.cidade}/${activeBranchObj.uf || ""}` : (churchData?.endereco ? `${churchData.endereco} - ${churchData.cidade || ""}` : ""));
  const displayCnpj = activeBranchObj?.cnpj || churchData?.cnpj || "";
  const displayPhone = activeBranchObj?.phone || churchData?.phone || "";

  // Listen to Firestore Assets
  useEffect(() => {
    setIsLoading(true);
    const assetsRef = collection(db, "assets");

    const unsubscribe = onSnapshot(
      assetsRef,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Asset[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              tag: data.tag || "",
              name: data.name || "",
              category: data.category || "Geral",
              location: data.location || "Sede",
              branchId: data.branchId || "sede",
              value: Number(data.value) || 0,
              status: (data.status as Asset["status"]) || "Em uso",
              specs: data.specs || "",
              notes: data.notes || "",
              purchaseDate: data.purchaseDate || "",
              depreciationRate: Number(data.depreciationRate) || 0,
              lastMaintenance: data.lastMaintenance || "",
              borrowedTo: data.borrowedTo || "",
              fileName: data.fileName || "",
              scannedDocs: data.scannedDocs || [],
              imageUrl: data.imageUrl || "",
              invoiceDocumentUrl: data.invoiceDocumentUrl || "",
              invoiceDocumentName: data.invoiceDocumentName || "",
              invoiceNumber: data.invoiceNumber || "",
              supplierName: data.supplierName || "",
              acquisitionType: data.acquisitionType || "Compra",
              acquisitionDate: data.acquisitionDate || data.purchaseDate || "",
              acquisitionValue: Number(data.acquisitionValue) || Number(data.value) || 0,
              createdAt: data.createdAt
            };
          });
          setAssets(loaded);
          localStorage.setItem("churchAssets", JSON.stringify(loaded));
        } else {
          // If empty in Firestore, check localStorage or use initialAssets
          const savedAssets = localStorage.getItem("churchAssets");
          if (savedAssets) {
            try {
              setAssets(JSON.parse(savedAssets));
            } catch (e) {
              setAssets(initialAssets);
            }
          } else {
            setAssets(initialAssets);
          }
        }
        setIsLoading(false);
      },
      (error) => {
        console.warn("Firestore assets read error, using offline cache:", error);
        logCriticalError({
          error: error.message,
          source: "database",
          severity: "warning",
          context: { module: "Patrimônio", action: "Leitura de Ativos", user: user?.name || "Sistema" }
        });
        const savedAssets = localStorage.getItem("churchAssets");
        if (savedAssets) {
          try {
            setAssets(JSON.parse(savedAssets));
          } catch (e) {
            setAssets(initialAssets);
          }
        } else {
          setAssets(initialAssets);
        }
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Branch & Search filtering
  const branchAssets = useMemo(() => {
    return assets.filter(a => matchesBranch(a, activeBranch, branches));
  }, [assets, activeBranch, branches]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>(PREDEFINED_CATEGORIES);
    assets.forEach(a => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set);
  }, [assets]);

  const filteredAssets = useMemo(() => {
    return branchAssets.filter(a => {
      const matchSearch = 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.id && a.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.location && a.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.category && a.category.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchCategory = selectedCategoryFilter === "all" || a.category === selectedCategoryFilter;
      const matchStatus = selectedStatusFilter === "all" || a.status === selectedStatusFilter;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [branchAssets, searchTerm, selectedCategoryFilter, selectedStatusFilter]);

  // Pagination calculation
  const totalItems = filteredAssets.length;
  const paginatedAssets = useMemo(() => {
    if (paginationMode === "infinite") {
      return filteredAssets.slice(0, currentPage * pageSize);
    }
    const start = (currentPage - 1) * pageSize;
    return filteredAssets.slice(start, start + pageSize);
  }, [filteredAssets, currentPage, pageSize, paginationMode]);

  const hasMore = paginatedAssets.length < filteredAssets.length;

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategoryFilter, selectedStatusFilter, activeBranch]);

  // Totals & Analytics
  const totalValue = useMemo(() => {
    return branchAssets.reduce((acc, curr) => acc + (Number(curr.value) || 0), 0);
  }, [branchAssets]);

  const maintenanceCount = useMemo(() => {
    return branchAssets.filter(a => a.status === 'Manutenção').length;
  }, [branchAssets]);

  const borrowedCount = useMemo(() => {
    return branchAssets.filter(a => a.status === 'Emprestado').length;
  }, [branchAssets]);

  const inUseCount = useMemo(() => {
    return branchAssets.filter(a => a.status === 'Em uso').length;
  }, [branchAssets]);

  // Chart data
  const assetDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    branchAssets.forEach(a => {
      const cat = a.category || "Outros";
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [branchAssets]);

  const statusDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    branchAssets.forEach(a => {
      const st = a.status || "Em uso";
      counts[st] = (counts[st] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [branchAssets]);

  const CHART_COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b', '#14b8a6'];

  // Open Form Modals
  const handleOpenAddModal = () => {
    setEditingItem(null);
    const nextNum = assets.length + 1;
    setFormTag(`EQP-${String(nextNum).padStart(3, '0')}`);
    setFormName("");
    setFormCategory("Áudio e Vídeo");
    setFormLocation("Templo Principal");
    setFormBranchId(activeBranch !== 'all' ? activeBranch : (branches[0]?.id || "sede"));
    setFormValue("");
    setFormStatus("Em uso");
    setFormPurchaseDate(new Date().toISOString().split('T')[0]);
    setFormDepreciationRate("10");
    setFormLastMaintenance("");
    setFormBorrowedTo("");
    setFormSpecs("");
    setFormNotes("");
    setFormImageUrl("");
    setFormInvoiceDocumentUrl("");
    setFormInvoiceDocumentName("");
    setFormInvoiceNumber("");
    setFormSupplierName("");
    setFormAcquisitionType("Compra");
    setFormAcquisitionDate(new Date().toISOString().split("T")[0]);
    setFormAcquisitionValue("");
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (asset: Asset) => {
    setEditingItem(asset);
    setFormTag(asset.tag);
    setFormName(asset.name);
    setFormCategory(asset.category || "Áudio e Vídeo");
    setFormLocation(asset.location || "Templo Principal");
    setFormBranchId(asset.branchId || (activeBranch !== 'all' ? activeBranch : (branches[0]?.id || "sede")));
    setFormValue(asset.value ? asset.value.toFixed(2) : "0.00");
    setFormStatus(asset.status || "Em uso");
    setFormPurchaseDate(asset.purchaseDate || "");
    setFormDepreciationRate(asset.depreciationRate ? String(asset.depreciationRate) : "10");
    setFormLastMaintenance(asset.lastMaintenance || "");
    setFormBorrowedTo(asset.borrowedTo || "");
    setFormSpecs(asset.specs || "");
    setFormNotes(asset.notes || "");
    setFormImageUrl(asset.imageUrl || "");
    setFormInvoiceDocumentUrl(asset.invoiceDocumentUrl || "");
    setFormInvoiceDocumentName(asset.invoiceDocumentName || "");
    setFormInvoiceNumber(asset.invoiceNumber || "");
    setFormSupplierName(asset.supplierName || "");
    setFormAcquisitionType(asset.acquisitionType || "Compra");
    setFormAcquisitionDate(asset.acquisitionDate || asset.purchaseDate || "");
    setFormAcquisitionValue(asset.acquisitionValue ? asset.acquisitionValue.toFixed(2) : (asset.value ? asset.value.toFixed(2) : ""));
    setIsAddModalOpen(true);
  };

  // Save Asset (Create or Update)
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanTag = formTag.trim().toUpperCase();
    const cleanName = formName.trim();
    const parsedValue = parseFloat(formValue.replace(',', '.')) || 0;

    const isValid = validateForm([
      { field: 'Etiqueta / Tag', value: cleanTag, required: true },
      { field: 'Descrição do Bem', value: cleanName, required: true },
      { field: 'Valor Estimado', value: parsedValue, required: true }
    ]);

    if (!isValid) return;

    const assetData = {
      tag: cleanTag,
      name: cleanName,
      category: formCategory.trim() || "Geral",
      location: formLocation.trim() || "Templo Principal",
      branchId: formBranchId || (activeBranch !== 'all' ? activeBranch : (branches[0]?.id || "sede")),
      value: parsedValue,
      status: formStatus,
      purchaseDate: formPurchaseDate || "",
      depreciationRate: parseFloat(formDepreciationRate) || 0,
      lastMaintenance: formLastMaintenance || "",
      borrowedTo: formStatus === 'Emprestado' ? formBorrowedTo.trim() : "",
      specs: formSpecs.trim(),
      notes: formNotes.trim(),
      imageUrl: formImageUrl || "",
      invoiceDocumentUrl: formInvoiceDocumentUrl || "",
      invoiceDocumentName: formInvoiceDocumentName || "",
      invoiceNumber: formInvoiceNumber.trim(),
      supplierName: formSupplierName.trim(),
      acquisitionType: formAcquisitionType,
      acquisitionDate: formAcquisitionDate || formPurchaseDate || "",
      acquisitionValue: parseFloat(formAcquisitionValue.replace(",", ".")) || parsedValue || 0,
      updatedAt: serverTimestamp(),
      updatedBy: user?.name || "Usuário"
    };

    const actionName = editingItem ? "Edição de Patrimônio" : "Criação de Patrimônio";
    const details = editingItem 
      ? `Bem atualizado: ${assetData.name} (${assetData.tag})` 
      : `Novo bem cadastrado: ${assetData.name} (${assetData.tag}) - R$ ${assetData.value.toFixed(2)}`;

    const operation = async () => {
      if (editingItem && editingItem.id) {
        await updateDoc(doc(db, "assets", editingItem.id), assetData);
      } else {
        await addDoc(collection(db, "assets"), {
          ...assetData,
          createdAt: serverTimestamp()
        });
      }
    };

    const res = await executeDbOperation({
      operation,
      actionName,
      successMessage: editingItem ? "Bem patrimonial atualizado com sucesso!" : "Novo bem patrimonial cadastrado com sucesso!",
      userName: user?.name || "Desconhecido"
    });

    if (res.success) {
      setIsAddModalOpen(false);
      setEditingItem(null);
    } else {
      logCriticalError({
        error: res.error,
        source: "database",
        severity: "error",
        context: { module: "Patrimônio", action: actionName, user: user?.name || "Desconhecido" }
      });
      // Fallback: update local state & localStorage to prevent blocking the user
      if (editingItem) {
        const updated = assets.map(a => a.id === editingItem.id ? { ...a, ...assetData, id: editingItem.id } : a);
        setAssets(updated);
        localStorage.setItem("churchAssets", JSON.stringify(updated));
      } else {
        const newLocalAsset: Asset = {
          ...assetData,
          id: `PAT-${String(assets.length + 1).padStart(3, '0')}`
        };
        const updated = [newLocalAsset, ...assets];
        setAssets(updated);
        localStorage.setItem("churchAssets", JSON.stringify(updated));
      }
      setIsAddModalOpen(false);
      setEditingItem(null);
      toast.success("Salvo com sucesso no armazenamento local!");
    }
  };

  // Delete Asset
  const handleDeleteAsset = async () => {
    if (!assetToDelete) return;

    const actionName = "Exclusão de Patrimônio";
    const details = `Bem excluído do inventário: ${assetToDelete.name} (${assetToDelete.tag})`;

    const operation = async () => {
      await deleteDoc(doc(db, "assets", assetToDelete.id));
    };

    const res = await executeDbOperation({
      operation,
      actionName,
      successMessage: "Bem patrimonial excluído com sucesso!",
      userName: user?.name || "Desconhecido"
    });

    if (res.success) {
      setIsDeleteDialogOpen(false);
      setAssetToDelete(null);
    } else {
      logCriticalError({
        error: res.error,
        source: "database",
        severity: "error",
        context: { module: "Patrimônio", action: actionName, user: user?.name || "Desconhecido" }
      });
      const updated = assets.filter(a => a.id !== assetToDelete.id);
      setAssets(updated);
      localStorage.setItem("churchAssets", JSON.stringify(updated));
      setIsDeleteDialogOpen(false);
      setAssetToDelete(null);
      toast.success("Removido com sucesso no inventário!");
    }
  };

  // Quick Status Change (e.g. Manutenção, Em uso, Baixado)
  const handleQuickStatusChange = async (asset: Asset, newStatus: Asset["status"]) => {
    try {
      await updateDoc(doc(db, "assets", asset.id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      logAction("Alteração de Status", `Status de ${asset.name} alterado para ${newStatus}`, user?.name || "Sistema");
      toast.success(`Status alterado para "${newStatus}"!`);
    } catch (e: any) {
      const updated = assets.map(a => a.id === asset.id ? { ...a, status: newStatus } : a);
      setAssets(updated);
      localStorage.setItem("churchAssets", JSON.stringify(updated));
      toast.success(`Status alterado para "${newStatus}"!`);
    }
  };

  // Label Printing
  const handleOpenLabelModal = (asset: Asset) => {
    setSelectedAssetForLabel(asset);
    setIsLabelModalOpen(true);
  };

  const handlePrintLabel = () => {
    const success = printDocument(
      () => {},
      () => setIsLabelModalOpen(false)
    );
    if (!success) setShowPrintDebugger(true);
  };

  const handleDownloadLabelPDF = () => {
    if (!selectedAssetForLabel) return;
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [80, 50] // Thermal label 80x50mm
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(displayChurchName, 40, 7, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("CONTROLE PATRIMONIAL", 40, 11, { align: "center" });
    doc.line(5, 13, 75, 13);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(selectedAssetForLabel.tag, 40, 20, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const splitName = doc.splitTextToSize(selectedAssetForLabel.name, 70);
    doc.text(splitName, 40, 25, { align: "center" });

    doc.setFontSize(7);
    doc.text(`Local: ${selectedAssetForLabel.location || "Sede"} | Cat: ${selectedAssetForLabel.category}`, 40, 33, { align: "center" });
    doc.text(`ID: ${selectedAssetForLabel.id} | Congregação: ${activeBranchName}`, 40, 38, { align: "center" });

    doc.setFontSize(6);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 40, 44, { align: "center" });

    doc.save(`etiqueta_${selectedAssetForLabel.tag.toLowerCase()}.pdf`);
    toast.success("Etiqueta PDF baixada com sucesso!");
  };

  // Reports Generation (jsPDF + autoTable)
  const handleGenerateReport = (type: string) => {
    const doc = new jsPDF();

    const headerRes = drawSafeChurchReportHeader(doc, {
      title: `RELATÓRIO DE PATRIMÔNIO: ${type.toUpperCase()}`,
      subtitle: `Data de Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} | Operador: ${user?.name || "Administrador"} | Congregação: ${activeBranchName}`,
      churchData: {
        nome: displayChurchName,
        endereco: displayChurchAddress,
        cnpj: displayCnpj
      },
      activeBranchId: activeBranch,
      activeBranchName: activeBranchName,
      leftMargin: 14,
      rightMargin: 14,
      topY: 10
    });

    let dataToPrint = branchAssets;
    if (type === "Bens em Manutenção") {
      dataToPrint = branchAssets.filter(a => a.status === "Manutenção");
    } else if (type === "Bens Emprestados") {
      dataToPrint = branchAssets.filter(a => a.status === "Emprestado");
    }

    let headRow: string[][] = [];
    let tableData: any[][] = [];

    if (type === "Inventário Detalhado") {
      headRow = [['Etiqueta', 'Descrição do Bem', 'Categoria', 'Data Compra', 'Deprec. %', 'Status', 'Valor Original', 'Valor Residual']];
      let sumOriginal = 0;
      let sumResidual = 0;

      tableData = dataToPrint.map(a => {
        sumOriginal += a.value || 0;
        // Calculate estimated residual value based on years since purchase
        let residual = a.value || 0;
        if (a.purchaseDate && a.depreciationRate) {
          const years = Math.max(0, (new Date().getFullYear() - new Date(a.purchaseDate).getFullYear()));
          const totalDeprecPercent = Math.min(100, years * a.depreciationRate);
          residual = (a.value * (100 - totalDeprecPercent)) / 100;
        }
        sumResidual += residual;

        return [
          a.tag,
          a.name,
          a.category,
          a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "-",
          `${a.depreciationRate || 0}%`,
          a.status,
          `R$ ${(a.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `R$ ${residual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ];
      });

      tableData.push([
        "TOTAL",
        `${dataToPrint.length} itens`,
        "",
        "",
        "",
        "",
        `R$ ${sumOriginal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
        `R$ ${sumResidual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]);
    } else {
      headRow = [['Etiqueta', 'Descrição do Bem', 'Categoria', 'Localização', 'Status', 'Valor (R$)']];
      let sumValue = 0;

      tableData = dataToPrint.map(a => {
        sumValue += a.value || 0;
        return [
          a.tag,
          a.name,
          a.category,
          a.location,
          a.status,
          `R$ ${(a.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ];
      });

      tableData.push([
        "TOTAL",
        `${dataToPrint.length} itens cadastrados`,
        "",
        "",
        "",
        `R$ ${sumValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
      ]);
    }

    autoTable(doc, {
      startY: headerRes.nextY,
      head: headRow,
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2.5
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      }
    });

    // Signatures
    const pageWidth = doc.internal.pageSize.getWidth();
    const finalY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 25 : 200;
    if (finalY < 260) {
      doc.line(20, finalY, 80, finalY);
      doc.text("Responsável pelo Patrimônio", 50, finalY + 5, { align: "center" });

      doc.line(pageWidth - 80, finalY, pageWidth - 20, finalY);
      doc.text("Pastor / Presidente da Igreja", pageWidth - 50, finalY + 5, { align: "center" });
    }

    doc.save(`relatorio_patrimonio_${type.toLowerCase().replace(/ /g, '_')}.pdf`);
    toast.success(`Relatório "${type}" emitido com sucesso!`);
    setIsReportModalOpen(false);
  };

  // Termo de Cautela / Empréstimo de Equipamento
  const handleGenerateTermoCautela = (asset: Asset) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(displayChurchName, pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("TERMO DE RESPONSABILIDADE E CAUTELA DE EQUIPAMENTO", pageWidth / 2, 26, { align: "center" });
    doc.line(14, 30, pageWidth - 14, 30);

    doc.setFontSize(10);
    const textBody = `Pelo presente instrumento particular de cautela e comodato temporário, a igreja cede para uso estritamente eclesiástico e institucional o bem patrimonial abaixo descrito:

• Código / Etiqueta: ${asset.tag} (ID: ${asset.id})
• Descrição do Bem: ${asset.name}
• Categoria / Marca / Modelo: ${asset.category}
• Especificações / Acessórios: ${asset.specs || "Conforme estado de conservação original"}
• Valor Contábil Estimado: R$ ${(asset.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
• Local de Origem / Filial: ${asset.location} (${activeBranchName})
• Responsável / Comodatário: ${asset.borrowedTo || "_________________________________________"}
• Data de Saída: ${new Date().toLocaleDateString('pt-BR')}
• Previsão de Devolução: ____ / ____ / ________

O comodatário declara ter recebido o equipamento em perfeitas condições de uso e funcionamento, comprometendo-se a:
1. Zelar pela guarda, conservação e integridade do bem;
2. Utilizá-lo exclusivamente para as finalidades do ministério da igreja;
3. Comunicar imediatamente qualquer avaria, defeito ou sinistro;
4. Restituir o bem na data aprazada nas mesmas condições em que o recebeu.`;

    const splitText = doc.splitTextToSize(textBody, pageWidth - 28);
    doc.text(splitText, 14, 40);

    const signY = 220;
    doc.line(20, signY, 85, signY);
    doc.text("Responsável pelo Patrimônio", 52, signY + 5, { align: "center" });

    doc.line(pageWidth - 85, signY, pageWidth - 20, signY);
    doc.text("Assinatura do Recebedor", pageWidth - 52, signY + 5, { align: "center" });

    doc.save(`termo_cautela_${asset.tag.toLowerCase()}.pdf`);
    toast.success("Termo de cautela emitido com sucesso!");
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Patrimônio</h2>
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-primary/30 bg-primary/5 text-primary flex items-center gap-1.5 font-medium">
              <Building2 className="w-3.5 h-3.5" />
              {activeBranchName}
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Controle integrado de bens tangíveis, tombamento, etiquetas com QR Code e inventário patrimonial.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsReportModalOpen(true)}
            className="shadow-xs"
          >
            <FileText className="mr-2 h-4 w-4 text-primary" /> Relatórios
          </Button>

          <Button 
            variant="outline" 
            onClick={() => setIsScannerOpen(true)}
            className="shadow-xs"
          >
            <QrCode className="mr-2 h-4 w-4" /> Ler QR Code
          </Button>

          <Button 
            onClick={handleOpenAddModal}
            className="shadow-xs bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="mr-2 h-4 w-4" /> Novo Bem
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-xs border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Valor Total do Patrimônio
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              R$ {totalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {branchAssets.length} bens cadastrados na filial ativa
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Bens em Atividade
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{inUseCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Operando regularmente no templo
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Em Manutenção
            </CardTitle>
            <Wrench className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{maintenanceCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Requerem conserto ou assistência técnica
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Empréstimos / Cautela
            </CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{borrowedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cedidos temporariamente a departamentos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="inventario" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <TabsList className="bg-muted/70">
            <TabsTrigger value="inventario" className="gap-2">
              <Package className="w-4 h-4" /> Inventário
            </TabsTrigger>
            <TabsTrigger value="analises" className="gap-2">
              <Layers className="w-4 h-4" /> Distribuição & Análises
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-2">
              <Calendar className="w-4 h-4" /> Linha do Tempo
            </TabsTrigger>
          </TabsList>
        </div>

        {/* TAB 1: Inventário */}
        <TabsContent value="inventario" className="space-y-4 mt-0">
          <Card className="shadow-xs border-border/80">
            <CardHeader className="p-4 sm:p-6 pb-2">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por tag, nome, local ou categoria..."
                    className="pl-9 h-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select value={selectedCategoryFilter} onValueChange={setSelectedCategoryFilter}>
                    <SelectTrigger className="w-[160px] h-9">
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Categorias</SelectItem>
                      {uniqueCategories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
                    <SelectTrigger className="w-[150px] h-9">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="Em uso">Em uso</SelectItem>
                      <SelectItem value="Manutenção">Manutenção</SelectItem>
                      <SelectItem value="Emprestado">Emprestado</SelectItem>
                      <SelectItem value="Doado">Doado</SelectItem>
                      <SelectItem value="Vendido">Vendido</SelectItem>
                      <SelectItem value="Baixado">Baixado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead className="w-[110px]">Tombamento</TableHead>
                      <TableHead>Descrição do Bem</TableHead>
                      <TableHead className="hidden md:table-cell">Categoria</TableHead>
                      <TableHead className="hidden sm:table-cell">Localização</TableHead>
                      <TableHead className="hidden lg:table-cell">Valor (R$)</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAssets.length > 0 ? (
                      paginatedAssets.map((asset) => (
                        <TableRow key={asset.id} className="hover:bg-muted/40 transition-colors">
                          <TableCell className="font-semibold font-mono text-xs text-foreground">
                            {asset.tag}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {asset.imageUrl ? (
                                <img 
                                  src={asset.imageUrl} 
                                  alt={asset.name} 
                                  onClick={() => setPreviewImageModalUrl(asset.imageUrl!)}
                                  className="w-10 h-10 object-cover rounded-md border border-border shadow-2xs cursor-pointer hover:opacity-80 transition-opacity shrink-0" 
                                  title="Clique para ampliar a foto"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-md bg-muted/60 border border-border/60 flex items-center justify-center text-muted-foreground shrink-0">
                                  <Package className="w-5 h-5 opacity-40" />
                                </div>
                              )}
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-foreground truncate">{asset.name}</span>
                                {(asset.invoiceNumber || asset.supplierName) && (
                                  <span className="text-[11px] text-muted-foreground truncate">
                                    {asset.invoiceNumber ? `NF: ${asset.invoiceNumber}` : ""}
                                    {asset.invoiceNumber && asset.supplierName ? " • " : ""}
                                    {asset.supplierName ? `${asset.supplierName}` : ""}
                                  </span>
                                )}
                                {asset.borrowedTo && asset.status === 'Emprestado' && (
                                  <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                    Cautela com: {asset.borrowedTo}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-xs">
                            {asset.category}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">
                            {asset.location}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell font-medium text-foreground text-xs">
                            R$ {(asset.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              asset.status === 'Em uso' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' :
                              asset.status === 'Manutenção' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' :
                              asset.status === 'Emprestado' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' :
                              ['Doado', 'Vendido', 'Baixado'].includes(asset.status) ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                              'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400'
                            }`}>
                              {asset.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Etiqueta com QR Code"
                                onClick={() => handleOpenLabelModal(asset)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              >
                                <QrCode className="h-4 w-4" />
                              </Button>

                              {asset.invoiceDocumentUrl && (
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  title={`Ver Documento Fiscal: ${asset.invoiceDocumentName || "Comprovante"}`}
                                  onClick={() => {
                                    setPreviewDocAsset(asset);
                                    setPreviewDocModalOpen(true);
                                  }}
                                  className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              )}

                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Termo de Cautela / Empréstimo"
                                onClick={() => handleGenerateTermoCautela(asset)}
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                              >
                                <FileCheck className="h-4 w-4" />
                              </Button>

                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Editar Bem"
                                onClick={() => handleOpenEditModal(asset)}
                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>

                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Excluir Bem"
                                onClick={() => {
                                  setAssetToDelete(asset);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="h-8 w-8 text-muted-foreground hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                          Nenhum bem patrimonial encontrado com os filtros aplicados.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {filteredAssets.length > 0 && (
                <div className="p-4 border-t border-border/80">
                  <TablePagination
                    currentPage={currentPage}
                    pageSize={pageSize}
                    totalItems={totalItems}
                    onPageChange={setCurrentPage}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setCurrentPage(1);
                    }}
                    pageSizeOptions={[10, 25, 50, 100]}
                    mode={paginationMode}
                    onModeChange={setPaginationMode}
                    hasMore={hasMore}
                    onLoadMore={() => setCurrentPage(p => p + 1)}
                    itemName="bens"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Distribuição & Gráficos */}
        <TabsContent value="analises" className="space-y-4 mt-0">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="shadow-xs border-border/80">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Quantidade por Categoria</CardTitle>
                <CardDescription>Distribuição dos bens patrimoniais</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                {assetDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {assetDistribution.map((entry, index) => (
                          <Cell key={`cat-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: number) => [`${val} itens`, "Total"]} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    Nenhum dado cadastrado para exibir gráficos.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-xs border-border/80">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Status de Conservação</CardTitle>
                <CardDescription>Bens em uso vs manutenção vs empréstimo</CardDescription>
              </CardHeader>
              <CardContent className="h-[280px]">
                {statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {statusDistribution.map((entry, index) => (
                          <Cell key={`st-${index}`} fill={CHART_COLORS[(index + 2) % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(val: number) => [`${val} itens`, "Total"]} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    Nenhum dado cadastrado para exibir gráficos.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 3: Linha do Tempo / Histórico de Aquisições */}
        <TabsContent value="timeline" className="mt-0">
          <Card className="shadow-xs border-border/80">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Histórico de Aquisições e Baixas</CardTitle>
              <CardDescription>Cronologia dos bens patrimoniais conforme data de compra</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative border-l border-muted ml-3 space-y-6 pb-4">
                {branchAssets
                  .filter(a => a.purchaseDate)
                  .sort((a, b) => new Date(b.purchaseDate || "").getTime() - new Date(a.purchaseDate || "").getTime())
                  .map((asset, index) => {
                    const isEntrada = !['Baixado', 'Doado', 'Vendido'].includes(asset.status);
                    return (
                      <div key={asset.id || index} className="relative pl-6">
                        <span className={`absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-8 ring-background ${
                          isEntrada 
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' 
                            : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                        }`}>
                          <Activity className="h-3 w-3" />
                        </span>
                        <div className="flex flex-col flex-1 gap-1">
                          <div className="text-xs text-muted-foreground font-mono">
                            {new Date(asset.purchaseDate || "").toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                          </div>
                          <h4 className="text-sm font-semibold text-foreground">
                            {isEntrada ? 'Aquisição / Entrada de Bem' : 'Baixa / Desincorporação'}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{asset.name}</span> (Tag: {asset.tag}) - {asset.category} | Local: {asset.location}
                          </p>
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            Valor: R$ {(asset.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    );
                  })}

                {branchAssets.filter(a => a.purchaseDate).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum bem com data de compra informada para gerar o histórico.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: Novo Bem / Edição */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Bem Patrimonial" : "Novo Bem Patrimonial"}</DialogTitle>
            <DialogDescription>
              {editingItem 
                ? "Altere os dados cadastrais e o status do bem no inventário." 
                : "Cadastre um novo equipamento, instrumento ou mobiliário com código de tombamento."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveAsset} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="tag">Etiqueta de Tombamento *</Label>
                <Input 
                  id="tag" 
                  value={formTag} 
                  onChange={(e) => setFormTag(e.target.value.toUpperCase())}
                  placeholder="Ex: EQP-001" 
                  required 
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="name">Descrição do Bem *</Label>
                <Input 
                  id="name" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ex: Mesa de Som Yamaha MG16XU" 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="category">Categoria</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {PREDEFINED_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="location">Localização / Sala</Label>
                <Input 
                  id="location" 
                  value={formLocation} 
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Ex: Templo Principal, Secretaria" 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="purchaseDate">Data de Aquisição</Label>
                <Input 
                  id="purchaseDate" 
                  type="date" 
                  value={formPurchaseDate} 
                  onChange={(e) => setFormPurchaseDate(e.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="depreciationRate">Depreciação (%/ano)</Label>
                <Input 
                  id="depreciationRate" 
                  type="number" 
                  step="0.5" 
                  value={formDepreciationRate} 
                  onChange={(e) => setFormDepreciationRate(e.target.value)}
                  placeholder="10" 
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="lastMaintenance">Últ. Manutenção</Label>
                <Input 
                  id="lastMaintenance" 
                  type="date" 
                  value={formLastMaintenance} 
                  onChange={(e) => setFormLastMaintenance(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="value">Valor Estimado (R$) *</Label>
                <Input 
                  id="value" 
                  type="text" 
                  value={formValue} 
                  placeholder="0.00" 
                  required 
                  onChange={(e) => setFormValue(e.target.value.replace(/[^0-9.,]/g, ''))}
                  onBlur={(e) => {
                    const num = parseFloat(e.target.value.replace(',', '.'));
                    if (!isNaN(num)) setFormValue(num.toFixed(2));
                  }}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="branchId">Igreja / Congregação</Label>
                <Select value={formBranchId} onValueChange={setFormBranchId}>
                  <SelectTrigger id="branchId">
                    <SelectValue placeholder="Selecione a congregação" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches && branches.length > 0 ? (
                      branches.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="sede">Sede Principal</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="status">Status do Bem</Label>
                <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em uso">Em uso</SelectItem>
                    <SelectItem value="Manutenção">Manutenção</SelectItem>
                    <SelectItem value="Emprestado">Emprestado</SelectItem>
                    <SelectItem value="Doado">Doado</SelectItem>
                    <SelectItem value="Vendido">Vendido</SelectItem>
                    <SelectItem value="Baixado">Baixado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formStatus === "Emprestado" && (
              <div className="grid gap-1.5 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40">
                <Label htmlFor="borrowedTo" className="text-blue-900 dark:text-blue-200 font-medium">
                  Cautela / Responsável pelo Empréstimo
                </Label>
                <Input 
                  id="borrowedTo" 
                  value={formBorrowedTo} 
                  onChange={(e) => setFormBorrowedTo(e.target.value)}
                  placeholder="Nome do irmão, obreiro ou departamento responsável" 
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="specs">Especificação Técnica / Acessórios</Label>
              <Textarea 
                id="specs" 
                value={formSpecs}
                onChange={(e) => setFormSpecs(e.target.value)}
                placeholder="Ex: Cor preta, acompanha cabos, número de série..."
                rows={2}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="notes">Observações Gerais</Label>
              <Textarea 
                id="notes" 
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                placeholder="Notas de aquisição, garantia ou histórico..."
                rows={2}
              />
            </div>

            {/* Foto do Bem Patrimonial */}
            <div className="border-t pt-3 space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> Foto do Bem Patrimonial
              </Label>
              <div className="flex items-center gap-4">
                {formImageUrl ? (
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group shrink-0">
                    <img src={formImageUrl} alt="Pré-visualização" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setFormImageUrl("")}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-80 hover:opacity-100 transition-opacity"
                      title="Remover foto"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center text-muted-foreground gap-1 shrink-0 bg-muted/20">
                    <ImageIcon className="w-6 h-6 opacity-40" />
                    <span className="text-[9px]">Sem foto</span>
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <Input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageFileChange} 
                    className="text-xs cursor-pointer" 
                  />
                  <p className="text-[11px] text-muted-foreground">Formatos JPG, PNG ou WebP até 2MB.</p>
                </div>
              </div>
            </div>

            {/* Dados de Aquisição & Documento Fiscal (Anexo 6) */}
            <div className="border-t pt-3 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5" /> Dados de Aquisição & Documento Fiscal
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="acquisitionType" className="text-xs font-semibold">Tipo de Aquisição</Label>
                  <Select value={formAcquisitionType} onValueChange={(val: any) => setFormAcquisitionType(val)}>
                    <SelectTrigger id="acquisitionType">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Compra">Compra Direta</SelectItem>
                      <SelectItem value="Doação">Doação</SelectItem>
                      <SelectItem value="Transferência">Transferência entre Congregações</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invoiceNumber" className="text-xs font-semibold">Nº da Nota Fiscal / Cupom / Recibo</Label>
                  <Input 
                    id="invoiceNumber"
                    value={formInvoiceNumber}
                    onChange={(e) => setFormInvoiceNumber(e.target.value)}
                    placeholder="Ex: NF-e 004.819"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="supplierName" className="text-xs font-semibold">Fornecedor / Doador</Label>
                  <Input 
                    id="supplierName"
                    value={formSupplierName}
                    onChange={(e) => setFormSupplierName(e.target.value)}
                    placeholder="Ex: Comercial Som & Luz LTDA"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="acquisitionValue" className="text-xs font-semibold">Valor de Aquisição (R$)</Label>
                  <Input 
                    id="acquisitionValue"
                    value={formAcquisitionValue}
                    onChange={(e) => setFormAcquisitionValue(e.target.value.replace(/[^0-9.,]/g, ""))}
                    placeholder="Ex: 3500.00"
                  />
                </div>
              </div>

              {/* Upload do Documento Fiscal */}
              <div className="p-3 bg-muted/20 border border-border/70 rounded-xl space-y-2">
                <Label className="text-xs font-semibold">Anexar Comprovante / Nota Fiscal (PDF ou Imagem)</Label>
                {formInvoiceDocumentUrl ? (
                  <div className="flex items-center justify-between p-2 bg-background border rounded-lg">
                    <div className="flex items-center gap-2 text-xs truncate">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="font-medium truncate">{formInvoiceDocumentName || "Comprovante_Anexado"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const w = window.open("");
                          w?.document.write(`<iframe src="${formInvoiceDocumentUrl}" style="width:100%;height:100vh;border:none;"></iframe>`);
                        }}
                        className="h-7 px-2 text-xs text-primary"
                      >
                        Visualizar
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFormInvoiceDocumentUrl("");
                          setFormInvoiceDocumentName("");
                        }}
                        className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input 
                      type="file" 
                      accept="application/pdf,image/*" 
                      onChange={handleInvoiceFileChange}
                      className="text-xs cursor-pointer"
                    />
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground">Documentos comprobatórios da compra ou doação arquivados na ficha patrimonial.</p>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingItem ? "Salvar Alterações" : "Cadastrar Bem"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Opções de Relatórios */}
      <Dialog open={isReportModalOpen} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Relatórios Oficiais de Patrimônio</DialogTitle>
            <DialogDescription>
              Selecione o modelo de relatório documental em PDF para emissão.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-3">
            <Button 
              variant="outline" 
              className="justify-start text-left h-auto py-3 px-4 hover:border-primary/50" 
              onClick={() => handleGenerateReport("Inventário Completo")}
            >
              <Download className="mr-3 h-5 w-5 text-primary shrink-0" />
              <div>
                <div className="font-semibold text-sm">Inventário Geral Consolidado</div>
                <div className="text-xs text-muted-foreground">Lista completa com valores, local e estado de conservação</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="justify-start text-left h-auto py-3 px-4 hover:border-primary/50" 
              onClick={() => handleGenerateReport("Inventário Detalhado")}
            >
              <Download className="mr-3 h-5 w-5 text-emerald-600 shrink-0" />
              <div>
                <div className="font-semibold text-sm">Inventário Contábil & Depreciação</div>
                <div className="text-xs text-muted-foreground">Cálculo de depreciação acumulada e valor residual</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="justify-start text-left h-auto py-3 px-4 hover:border-primary/50" 
              onClick={() => handleGenerateReport("Bens em Manutenção")}
            >
              <Download className="mr-3 h-5 w-5 text-amber-500 shrink-0" />
              <div>
                <div className="font-semibold text-sm">Bens em Manutenção Técnica</div>
                <div className="text-xs text-muted-foreground">Equipamentos em conserto ou aguardando reparo</div>
              </div>
            </Button>

            <Button 
              variant="outline" 
              className="justify-start text-left h-auto py-3 px-4 hover:border-primary/50" 
              onClick={() => handleGenerateReport("Bens Emprestados")}
            >
              <Download className="mr-3 h-5 w-5 text-blue-500 shrink-0" />
              <div>
                <div className="font-semibold text-sm">Bens em Cautela e Empréstimo</div>
                <div className="text-xs text-muted-foreground">Itens cedidos temporariamente a departamentos</div>
              </div>
            </Button>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsReportModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Etiqueta Patrimonial com QR Code */}
      <Dialog open={isLabelModalOpen} onOpenChange={setIsLabelModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Etiqueta Patrimonial de Tombamento</DialogTitle>
            <DialogDescription>
              Etiqueta de alta resolução com QR Code para afixação e identificação rápida.
            </DialogDescription>
          </DialogHeader>

          {selectedAssetForLabel && (
            <div className="flex flex-col items-center justify-center py-4">
              <style>{`
                @media print {
                  body * { visibility: hidden; }
                  #printable-label, #printable-label * { visibility: visible; }
                  #printable-label { 
                    position: absolute; 
                    left: 0; 
                    top: 0; 
                    margin: 0; 
                    padding: 0; 
                    border: none; 
                  }
                }
              `}</style>
              <div 
                id="printable-label"
                ref={printRef} 
                className="border-2 border-slate-900/30 p-5 rounded-xl flex flex-col items-center bg-white text-slate-900 w-[290px] shadow-sm"
              >
                <div className="text-center w-full border-b border-slate-200 pb-2 mb-3">
                  <h3 className="font-bold text-sm leading-tight uppercase tracking-wider">{displayChurchName}</h3>
                  <p className="text-[10px] text-slate-500 font-medium">CONTROLE DE TOMBAMENTO PATRIMONIAL</p>
                </div>

                <div className="bg-white p-2 border border-slate-100 rounded-lg shadow-2xs mb-3">
                  <QRCodeSVG 
                    value={JSON.stringify({ 
                      id: selectedAssetForLabel.id, 
                      tag: selectedAssetForLabel.tag,
                      name: selectedAssetForLabel.name,
                      branchId: selectedAssetForLabel.branchId 
                    })} 
                    size={110} 
                    level="M"
                  />
                </div>

                <div className="text-center w-full">
                  <div className="font-black text-xl font-mono tracking-widest text-slate-900 bg-slate-100 py-1 rounded">
                    {selectedAssetForLabel.tag}
                  </div>
                  <p className="text-xs font-semibold mt-2 line-clamp-2 text-slate-800">
                    {selectedAssetForLabel.name}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Local: {selectedAssetForLabel.location} • {activeBranchName}
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleDownloadLabelPDF}>
              <Download className="mr-2 h-4 w-4" /> Baixar PDF
            </Button>
            <Button className="w-full sm:w-auto" onClick={handlePrintLabel}>
              <Printer className="mr-2 h-4 w-4" /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Confirmação de Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" /> Excluir Bem Patrimonial
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o item{" "}
              <strong className="text-foreground">{assetToDelete?.name} ({assetToDelete?.tag})</strong> do inventário?
              Esta ação será auditada no sistema.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteAsset}>
              Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: QR Code Scanner */}
      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Ler QR Code do Patrimônio</DialogTitle>
            <DialogDescription>
              Aponte a câmera para a etiqueta do equipamento para abrir o cadastro.
            </DialogDescription>
          </DialogHeader>

          {isScannerOpen && (
            <div className="py-2">
              <QrScanner 
                onResult={(text) => {
                  setIsScannerOpen(false);
                  let matchedAsset = null;
                  try {
                    const parsed = JSON.parse(text);
                    if (parsed.tag) {
                      matchedAsset = assets.find(a => a.tag === parsed.tag || a.id === parsed.id);
                    }
                  } catch (e) {
                    matchedAsset = assets.find(a => a.tag.toUpperCase() === text.trim().toUpperCase() || a.id === text.trim());
                  }

                  if (matchedAsset) {
                    toast.success(`Bem localizado: ${matchedAsset.name}`);
                    handleOpenEditModal(matchedAsset);
                  } else {
                    toast.error(`Código "${text}" não encontrado no inventário.`);
                  }
                }} 
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScannerOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PrintDebugger 
        isOpen={showPrintDebugger} 
        onClose={() => setShowPrintDebugger(false)} 
        onForcePrint={() => window.print()} 
      />
    </motion.div>
  );
}
