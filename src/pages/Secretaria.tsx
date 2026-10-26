import { collection, onSnapshot, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, query, where } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { exportToCSV, exportToXLSX } from "@/lib/exportUtils";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import React, { useState, useEffect, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { useLocation, useNavigate } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import * as XLSX from "xlsx"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Plus, Search, Printer, Mail, FileText, Edit, Trash2, MessageCircle, Download, Contact, Info, Sparkles, Camera, Folder, Bell, Award, Building2, QrCode, FolderClock, CheckCircle2, Image as ImageIcon, FilePlus2, Layers, Eye, RefreshCw, Check, User, Droplet, HeartHandshake, CalendarDays, Baby, Barcode, ClipboardList, Users, IdCard, Mic, Brush, Music } from "lucide-react"
import { BarcodeGenerator, generateBarcodeDataUrl } from "@/components/common/BarcodeGenerator"
import { QRCodeSVG } from "qrcode.react"
import QRCode from "qrcode"
import { CheckinKidsModal } from "@/components/secretaria/CheckinKidsModal"
import { RelatorioSemanalCelulaModal } from "@/components/secretaria/RelatorioSemanalCelulaModal"
import { DeclaracaoContribuicaoIrpfModal } from "@/components/secretaria/DeclaracaoContribuicaoIrpfModal"
import { RelatorioDizimistasOfertantes } from "@/components/secretaria/RelatorioDizimistasOfertantes"
import { TablePagination } from "@/components/ui/table-pagination"
import { logCriticalError } from "@/lib/errorLogger"
import { toast } from "sonner"
import { validateForm } from "@/lib/validation"
import { executeDbOperation } from "@/lib/firebaseHelper"
import { normalizeUTF8 } from "@/lib/unicodeUtils"
import { isValidCPFOrCNPJ, formatCPF } from "@/lib/validators"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { logAction } from "@/lib/audit"
import JSZip from 'jszip'
import { toPng as htmlToImage } from 'html-to-image'
import { saveAs } from 'file-saver'
import { cpf as cpfValidator } from 'cpf-cnpj-validator'
import { useAuth } from "@/contexts/AuthContext"
import { useBranch } from "@/contexts/BranchContext"
import { matchesBranch as matchesSystemBranch, isSedeBranch } from "@/lib/branchUtils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CameraCapture } from "@/components/CameraCapture"
import { SecretariaAlertsBanner } from "@/components/secretaria/SecretariaAlertsBanner"
import { DocumentScannerModal, ScannedSecretariaFile } from "@/components/secretaria/DocumentScannerModal"
import { VCardQrContactScannerModal } from "@/components/secretaria/VCardQrContactScannerModal"
import { SecretariaFilesManager } from "@/components/secretaria/SecretariaFilesManager"
import { MemberWhatsAppMessageModal, MessageTemplateType } from "@/components/secretaria/MemberWhatsAppMessageModal"
import { ComunicadosModal } from "@/components/secretaria/ComunicadosModal"
import { FichaMembroPrintable, FichaMembroData } from "@/components/secretaria/FichaMembroPrintable"
import { SecretariaPdfExportModal } from "@/components/secretaria/SecretariaPdfExportModal"
import { FichaVisitasAcompanhamentoModal } from "@/components/secretaria/FichaVisitasAcompanhamentoModal"
import { EscalaMuralDiaconatoModal } from "@/components/secretaria/EscalaMuralDiaconatoModal"
import { EscalaDirigentesModal } from "@/components/secretaria/EscalaDirigentesModal"
import { EscalaLimpezaModal } from "@/components/secretaria/EscalaLimpezaModal"
import { EscalaMusicosModal } from "@/components/secretaria/EscalaMusicosModal"
import { CrachaVoluntariosModal } from "@/components/secretaria/CrachaVoluntariosModal"
import { FormulariosFinanceirosSecretariaModal } from "@/components/secretaria/FormulariosFinanceirosSecretariaModal"
import { DigitalSignatureField } from "@/components/common/DigitalSignatureField"
import { printDocument, downloadElementAsPdf } from "@/lib/printUtils"
import { getRegisteredChurchLogo, drawChurchLogoInPdf, drawSafeChurchReportHeader } from "@/lib/churchLogoHelper"
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts'
import { motion } from "motion/react"
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { Formularios } from "./Formularios"

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png", iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png", shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png" });


export const DEFAULT_MEMBER_TEST_DATA = {
  id: "mem_oficial_01",
  name: "Carlos Eduardo da Silva",
  email: "carlos.silva@obpc.com.br",
  phone: "(11) 98765-4321",
  role: "Pastor Auxiliar",
  status: "Ativo",
  rg: "12.345.678-9",
  cpf: "123.456.789-00",
  filiacao: "José Silva e Maria Silva",
  pai: "José Silva",
  mae: "Maria Silva",
  naturalidade: "São Paulo/SP",
  sexo: "Masculino",
  dataNascimento: "15/04/1985",
  estadoCivil: "Casado(a)",
  dataBatismo: "20/10/2000",
  membroDesde: "10/01/2010",
  validade: "31/12/2026",
  endereco: "Rua Bartolomeu Bueno, 629",
  bairro: "Santa Casa",
  cidade: "Valparaíso",
  cep: "16880-000",
  branchId: "sede",
  tags: ["Pastoral", "Pregador", "Conselho"]
};

const initialMembers: any[] = [];

export function Secretaria() {
  const { user } = useAuth()
  const isSecretariaAdmin = ['administrador', 'secretária', 'secretaria'].includes(user?.role?.toLowerCase() || '');
  const { activeBranch, branches, activeBranchName, canChangeBranch, activeBranchObj } = useBranch();
  const isUserFromSede = (activeBranch === 'sede' || activeBranch === 'all' || activeBranchObj?.type === 'sede') && canChangeBranch;
  
  const hasAccess = user?.permissions?.secretaria?.view !== false;

  const [members, setMembers] = useState<any[]>(() => {
    const saved = localStorage.getItem("churchMembers");
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [DEFAULT_MEMBER_TEST_DATA];
      }
    }
    try {
      localStorage.setItem("churchMembers", JSON.stringify([DEFAULT_MEMBER_TEST_DATA]));
    } catch {}
    return [DEFAULT_MEMBER_TEST_DATA];
  });

  const [transactions, setTransactions] = useState<any[]>([]);
  const [secretariaFiles, setSecretariaFiles] = useState<ScannedSecretariaFile[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("church_secretaria_files") || "[]");
    } catch {
      return [];
    }
  });
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isVCardQrModalOpen, setIsVCardQrModalOpen] = useState(false);
  const [isKidsModalOpen, setIsKidsModalOpen] = useState(false);
  const [isCelulaModalOpen, setIsCelulaModalOpen] = useState(false);
  const [isIrpfModalOpen, setIsIrpfModalOpen] = useState(false);
  const [isFormulariosFinanceirosModalOpen, setIsFormulariosFinanceirosModalOpen] = useState(false);
  const [selectedIrpfMember, setSelectedIrpfMember] = useState<any>(null);

  useEffect(() => {
    const isSede = isSedeBranch(activeBranch, branches);
    const shouldFilterBranch = activeBranch && activeBranch !== 'all' && !isSede;

    // Consulta ao Firestore filtrada por branchId quando selecionada congregação específica
    const membersQuery = shouldFilterBranch
      ? query(collection(db, "members"), where("branchId", "==", activeBranch))
      : collection(db, "members");

    const unsubscribeMembers = onSnapshot(membersQuery, (snapshot) => {
      const fetchedMembers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (fetchedMembers.length > 0) {
        setMembers(fetchedMembers);
        localStorage.setItem("churchMembers", JSON.stringify(fetchedMembers));
      } else {
        const saved = localStorage.getItem("churchMembers");
        if (saved !== null) {
          try {
            setMembers(JSON.parse(saved));
          } catch {
            setMembers([DEFAULT_MEMBER_TEST_DATA]);
          }
        } else {
          setMembers([DEFAULT_MEMBER_TEST_DATA]);
          localStorage.setItem("churchMembers", JSON.stringify([DEFAULT_MEMBER_TEST_DATA]));
        }
      }
    }, (err) => {
      console.warn("Secretaria members listener error, using cache:", err);
      const saved = localStorage.getItem("churchMembers");
      if (saved !== null) {
        try { setMembers(JSON.parse(saved)); } catch (e) {}
      } else {
        setMembers([DEFAULT_MEMBER_TEST_DATA]);
      }
    });

    const unsubscribeTransactions = onSnapshot(collection(db, "transactions"), (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.warn("Secretaria transactions listener error, using cache:", err);
      const saved = localStorage.getItem("churchTransactions");
      if (saved) {
        try { setTransactions(JSON.parse(saved)); } catch (e) {}
      }
    });

    const unsubscribeFiles = onSnapshot(collection(db, "secretaria_files"), (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ScannedSecretariaFile[];
      setSecretariaFiles(fetched);
      localStorage.setItem("church_secretaria_files", JSON.stringify(fetched));
    }, (err) => {
      console.warn("Firestore secretaria_files error:", err);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeTransactions();
      unsubscribeFiles();
    };
  }, [activeBranch, branches]);

  const handleFileSaved = (newFile: ScannedSecretariaFile) => {
    setSecretariaFiles(prev => [newFile, ...prev.filter(f => f.id !== newFile.id)]);
  };

  const handleDeleteSecretariaFile = (fileId: string, fileData?: { title?: string; date?: string }) => {
    setSecretariaFiles(prev => {
      const updated = prev.filter(f => {
        if (f.id === fileId) return false;
        if (fileData?.title && f.title === fileData.title && (!fileData?.date || f.date === fileData.date)) return false;
        return true;
      });
      localStorage.setItem("church_secretaria_files", JSON.stringify(updated));
      return updated;
    });
  };
  const location = useLocation()

  const [activeTab, setActiveTab] = useState<string>(() => {
    const params = new URLSearchParams(location.search);
    return params.get("tab") || location.state?.activeTab || "membros";
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get("tab");
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    } else if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location]);

  useEffect(() => {
    if (location.state?.openNewMember) {
      setEditingMember(null);
      setIsMemberModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  
  const [searchTerm, setSearchTerm] = useState("")
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const [filterRole, setFilterRole] = useState("all")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterTag, setFilterTag] = useState("all")
  const [filterBaptism, setFilterBaptism] = useState("all")
  const [filterAgeGroup, setFilterAgeGroup] = useState("all")
  const [branchFilter, setBranchFilter] = useState("all")
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false)
  const [isMemberWhatsAppModalOpen, setIsMemberWhatsAppModalOpen] = useState(false)
  const [whatsAppMemberTarget, setWhatsAppMemberTarget] = useState<any>(null)
  const [whatsAppDefaultTemplate, setWhatsAppDefaultTemplate] = useState<MessageTemplateType>("welcome")
  const [isComunicadosModalOpen, setIsComunicadosModalOpen] = useState(false)
  const [isFichaMembroModalOpen, setIsFichaMembroModalOpen] = useState(false)
  const [fichaMemberTarget, setFichaMemberTarget] = useState<any>(null)
  const [customFichaSeq, setCustomFichaSeq] = useState("")
  const [isPdfExportModalOpen, setIsPdfExportModalOpen] = useState(false)
  const [isVisitasModalOpen, setIsVisitasModalOpen] = useState(false)
  const [visitasMemberTarget, setVisitasMemberTarget] = useState<any>(null)
  const [isEscalaMuralModalOpen, setIsEscalaMuralModalOpen] = useState(false)
  const [isEscalaDirigentesModalOpen, setIsEscalaDirigentesModalOpen] = useState(false)
  const [isEscalaLimpezaModalOpen, setIsEscalaLimpezaModalOpen] = useState(false)
  const [isEscalaMusicosModalOpen, setIsEscalaMusicosModalOpen] = useState(false)
  const [isCrachaVoluntariosModalOpen, setIsCrachaVoluntariosModalOpen] = useState(false)
  const [memberSignatureUrl, setMemberSignatureUrl] = useState("")
  const [memberSignatureFileName, setMemberSignatureFileName] = useState("")

  // Lista de Voluntários para Emissão de Crachás
  const secretariaVolunteersList = useMemo(() => {
    try {
      const saved = localStorage.getItem("church_escala_voluntarios");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return (members || []).map((m: any, idx: number) => ({
      id: m.id || `m_${idx}`,
      name: m.name || m.nome || "Voluntário",
      role: m.role || m.cargo || "Diaconato",
      phone: m.phone || ""
    }));
  }, [members]);

  // Estados para Registro e Histórico Pastoral de Visitas e Contatos
  const [memberCommunications, setMemberCommunications] = useState<any[]>([])
  const [newCommDate, setNewCommDate] = useState(() => new Date().toISOString().split('T')[0])
  const [newCommType, setNewCommType] = useState("Visita Pastoral")
  const [newCommResponsible, setNewCommResponsible] = useState("")
  const [newCommNotes, setNewCommNotes] = useState("")
  const [isSavingComm, setIsSavingComm] = useState(false)

  useEffect(() => {
    if (location.state && location.state.filterStatus) {
      setFilterStatus(location.state.filterStatus)
    }
    if (location.state && location.state.memberIdToOpen) {
      const mem = members.find((m: any) => m.id === location.state.memberIdToOpen);
      if (mem) {
        handleOpenEditModal(mem);
        // Clean state so it doesn't reopen on every render
        window.history.replaceState({}, document.title)
      }
    }
  }, [location])
  const [editingMember, setEditingMember] = useState<any>(null)
  const [memberBranch, setMemberBranch] = useState<string>("sede")
  const [memberStatus, setMemberStatus] = useState<string>("Ativo")
  const [memberSexo, setMemberSexo] = useState<string>("Masculino")
  const [memberCivil, setMemberCivil] = useState<string>("Solteiro(a)")

  const normalizeCivilStatus = (val?: string) => {
    if (!val) return "Solteiro(a)";
    const lower = val.toLowerCase().trim();
    if (lower.startsWith("solteir")) return "Solteiro(a)";
    if (lower.startsWith("casad")) return "Casado(a)";
    if (lower.includes("uni") || lower.includes("est")) return "União Estável";
    if (lower.startsWith("divor")) return "Divorciado(a)";
    if (lower.startsWith("separ")) return "Separado(a)";
    if (lower.startsWith("viu") || lower.startsWith("viú")) return "Viúvo(a)";
    return val;
  };

  // Lista cadastrada de Cargos e Funções Eclesiásticas
  const DEFAULT_CHURCH_ROLES = useMemo(() => [
    "Membro",
    "Pastor Presidente",
    "Pastor Titular",
    "Pastor Auxiliar",
    "Pastora",
    "Evangelista",
    "Presbítero",
    "Diácono",
    "Diaconisa",
    "Missionário",
    "Missionária",
    "Obreiro",
    "Obreira",
    "Cooperador",
    "Cooperadora",
    "Líder de Louvor",
    "Líder de Jovens",
    "Líder de Crianças",
    "Líder de Mulheres",
    "Líder de Homens",
    "Líder de Missões",
    "Músico / Instrumentista",
    "Regente",
    "Professor(a) EBD",
    "Tesoureiro(a)",
    "Secretário(a)",
    "Porteiro / Recepção",
    "Zelador(a)"
  ], [])

  const [registeredRoles, setRegisteredRoles] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("churchRoles");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      "Membro",
      "Pastor Presidente",
      "Pastor Titular",
      "Pastor Auxiliar",
      "Pastora",
      "Evangelista",
      "Presbítero",
      "Diácono",
      "Diaconisa",
      "Missionário",
      "Missionária",
      "Obreiro",
      "Obreira",
      "Cooperador",
      "Cooperadora",
      "Líder de Louvor",
      "Líder de Jovens",
      "Líder de Crianças",
      "Líder de Mulheres",
      "Líder de Homens",
      "Líder de Missões",
      "Músico / Instrumentista",
      "Regente",
      "Professor(a) EBD",
      "Tesoureiro(a)",
      "Secretário(a)",
      "Porteiro / Recepção",
      "Zelador(a)"
    ];
  })
  const [memberRole, setMemberRole] = useState<string>("Membro")
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false)
  const [newRoleName, setNewRoleName] = useState("")
  
  // Calculate ages for pie chart
  const ageGroups = React.useMemo(() => {
    let g0_12 = 0, g13_18 = 0, g19_35 = 0, g36_50 = 0, g51_plus = 0;
    
    members.filter((m: any) => m.status === 'Ativo').forEach((m: any) => {
        if (!m.dataNascimento) return;
        const parts = m.dataNascimento.split('/');
        if (parts.length !== 3) return;
        const [day, month, year] = parts;
        const birthDate = new Date(Number(year), Number(month) - 1, Number(day));
        if (isNaN(birthDate.getTime())) return;
        
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const mDiff = today.getMonth() - birthDate.getMonth();
        if (mDiff < 0 || (mDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        if (age <= 12) g0_12++;
        else if (age <= 18) g13_18++;
        else if (age <= 35) g19_35++;
        else if (age <= 50) g36_50++;
        else g51_plus++;
    });
    
    return [
        { name: '0 a 12 anos', value: g0_12, color: '#10b981' },
        { name: '13 a 18 anos', value: g13_18, color: '#3b82f6' },
        { name: '19 a 35 anos', value: g19_35, color: '#8b5cf6' },
        { name: '36 a 50 anos', value: g36_50, color: '#f59e0b' },
        { name: '51+ anos', value: g51_plus, color: '#ef4444' },
    ].filter(g => g.value > 0);
  }, [members]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [scannedDocs, setScannedDocs] = useState<string[]>([])
  const [memberToDelete, setMemberToDelete] = useState<any>(null)
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false)
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false)

  // Print Modal States
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false)
  const [isNewsletterModalOpen, setIsNewsletterModalOpen] = useState(false)
  const [newsletterHtml, setNewsletterHtml] = useState("")
  const [loadingNewsletter, setLoadingNewsletter] = useState(false)
  
  const generateNewsletter = async () => {
    setIsNewsletterModalOpen(true);
    setLoadingNewsletter(true);
    setNewsletterHtml("");
    
    try {
      // Get birthdays of current month
      const currentMonth = new Date().getMonth();
      const birthdays = members.filter(m => m.birthDate && new Date(m.birthDate).getMonth() === currentMonth).map(m => ({ nome: m.name, dataNascimento: m.birthDate }));
      
      // Get events
      const savedEvents = localStorage.getItem('churchEvents');
      let events = [];
      if (savedEvents) {
         events = JSON.parse(savedEvents);
      }
      // Filter next 7 days events
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      
      const upcomingEvents = events.filter((e: any) => {
         if (!e.date) return false;
         const d = new Date(e.date);
         return d >= today && d <= nextWeek;
      }).map((e: any) => ({ titulo: e.title, data: e.date, hora: e.time, local: e.location || 'Sede' }));
      
      const res = await fetch('/api/gemini/generate-newsletter', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ events: upcomingEvents, birthdays })
      });
      
      if (!res.ok) throw new Error("Erro ao gerar newsletter");
      const data = await res.json();
      setNewsletterHtml(data.html);
    } catch (e: any) {
      toast.error(e.message || "Falha ao gerar");
    } finally {
      setLoadingNewsletter(false);
    }
  };
  const [docType, setDocType] = useState('carta-aniversario')
  const [docName, setDocName] = useState('')
  const [docDate, setDocDate] = useState('')
  const [docExtras, setDocExtras] = useState('')
  const [docLogo, setDocLogo] = useState<string | null>(null)
  const [docPastor, setDocPastor] = useState('')
  const [docParent, setDocParent] = useState('')
  const [docSubject, setDocSubject] = useState('FELIZ ANIVERSÁRIO')
  const [docContent, setDocContent] = useState(`Prezado(a) {NOME_MEMBRO},É com grande alegria que celebramos o seu aniversário neste dia especial. Agradecemos a Deus pela sua vida e por fazer parte da nossa congregação.Que o Senhor te abençoe e te guarde, faça resplandecer o Seu rosto sobre ti e te dê a paz."Ensina-nos a contar os nossos dias, de tal maneira que alcancemos corações sábios." - Salmos 90:12Com carinho e orações,`)
  const prevDocName = React.useRef(docName)

  const [docSignature, setDocSignature] = useState('')

  const [documentHistory, setDocumentHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem("churchDocumentHistory")
    return saved ? JSON.parse(saved) : []
  })

  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null)

  const [docTemplateId, setDocTemplateId] = useState('nenhum')
  const [docsTab, setDocsTab] = useState<'gerar' | 'aprovacoes' | 'visualizar' | 'modelos' | 'historico' | 'logos'>('gerar')
  const [selectedMemberDoc, setSelectedMemberDoc] = useState<any>(null)
  const [docMemberPhoto, setDocMemberPhoto] = useState<string | null>(null)
  const [customTemplates, setCustomTemplates] = useState<any[]>(() => {
    const saved = localStorage.getItem("churchCustomTemplates")
    return saved ? JSON.parse(saved) : []
  })
  
  const [churchLogos, setChurchLogos] = useState<any[]>(() => {
    const saved = localStorage.getItem("churchLogos")
    return saved ? JSON.parse(saved) : []
  })
  const [selectedLogoId, setSelectedLogoId] = useState<string>('')
  const [editingLogo, setEditingLogo] = useState<any>(null)
  const [logoToDelete, setLogoToDelete] = useState<any>(null)
  const [editingTemplate, setEditingTemplate] = useState<any>(null)
  const [templateToDelete, setTemplateToDelete] = useState<any>(null)
  const [printTab, setPrintTab] = useState<'cards' | 'list' | 'irpf'>('cards')
  const [reportType, setReportType] = useState('ativos')
  const [reportMonth, setReportMonth] = useState((new Date().getMonth() + 1).toString().padStart(2, '0'))
  const [reportRole, setReportRole] = useState('all')
  const [cardSelection, setCardSelection] = useState<'all' | 'single' | 'range' | 'selected'>('all')
  const [selectedMemberId, setSelectedMemberId] = useState<string>("")
  const [temporaryPreviewMember, setTemporaryPreviewMember] = useState<any>(null)
  const [startMemberId, setStartMemberId] = useState<string>("")
  const [endMemberId, setEndMemberId] = useState<string>("")
  const [cardColorFront, setCardColorFront] = useState<string>("#ffffff")
  const [cardColorBack, setCardColorBack] = useState<string>("#ffffff")
  const [cardTextColorFront, setCardTextColorFront] = useState<string>("#0f172a")
  const [cardTextColorBack, setCardTextColorBack] = useState<string>("#0f172a")
  const [showBarcodeOnCard, setShowBarcodeOnCard] = useState<boolean>(true)
  const [cardCodeType, setCardCodeType] = useState<'qrcode' | 'barcode'>('qrcode')
  const [barcodeCardPosition, setBarcodeCardPosition] = useState<'back' | 'front' | 'both'>('back')
  const [barcodeFormat, setBarcodeFormat] = useState<'cpf' | 'matricula'>('cpf')

  const getMemberBarcodeValue = (m: any) => {
    if (!m) return "00000000000";
    if (barcodeFormat === 'cpf' && m.cpf) {
      const clean = String(m.cpf).replace(/\D/g, "");
      if (clean.length > 0) return clean;
    }
    const rawId = m.id || m.numeroFicha || "1";
    const numOnly = String(rawId).replace(/\D/g, "") || "1";
    return `MEM${numOnly.padStart(6, "0")}`;
  };

  const getMemberBarcodeDisplayText = (m: any) => {
    if (!m) return "000.000.000-00";
    if (barcodeFormat === 'cpf' && m.cpf) {
      return `CPF ${m.cpf}`;
    }
    const rawId = m.id || m.numeroFicha || "1";
    const numOnly = String(rawId).replace(/\D/g, "") || "1";
    return `MAT: ${numOnly.padStart(6, "0")}`;
  };

  const getMemberQrPayload = (m: any) => {
    if (!m) return "OBPC - MEMBRO";
    const name = m.name || m.nome || "Membro";
    const role = m.role || m.cargo || "Membro";
    const id = m.id || m.numeroFicha || "1";
    return `OBPC | ${name} | ${role} | REG: ${id}`;
  };
  
  // Event Presence List Modal State
  const [isEventPresenceModalOpen, setIsEventPresenceModalOpen] = useState(false)
  const [eventName, setEventName] = useState("")
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0])
  const [eventListType, setEventListType] = useState<'ativos' | 'em_branco'>('ativos')
  const [eventBlankLinesCount, setEventBlankLinesCount] = useState<number>(30)
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [frontFields, setFrontFields] = useState({ name: true, role: true, cpf: true, rg: false, photo: true })
  const [backFields, setBackFields] = useState({ phone: true, address: true, filiacao: false, signatures: true })

    
  // Get unique roles and tags for the filters
  const uniqueRoles = Array.from(new Set(members.map(m => m.role?.trim()).filter(Boolean)));
  const allTags = members.reduce((acc, m) => {
    if (m.tags && Array.isArray(m.tags)) {
      m.tags.forEach(t => {
        if (typeof t === 'string' && t.trim()) {
          acc.add(t.trim());
        }
      });
    }
    return acc;
  }, new Set<string>());
  const uniqueTags = Array.from(allTags);

  const branchMembers = useMemo(() => {
    return members.filter(m => matchesSystemBranch(m, activeBranch, branches));
  }, [members, activeBranch, branches]);

  const filteredMembers = branchMembers.filter(m => {
    const term = searchTerm.toLowerCase();
    const cleanSearchTerm = searchTerm.replace(/\D/g, "");
    const cleanCpf = m.cpf ? m.cpf.replace(/\D/g, "") : "";
    
    const matchesSearch = (m.name && m.name.toLowerCase().includes(term)) ||
           (m.email && m.email.toLowerCase().includes(term)) ||
           (m.role && m.role.toLowerCase().includes(term)) ||
           (m.cpf && m.cpf.includes(searchTerm)) ||
           (cleanSearchTerm && cleanCpf.includes(cleanSearchTerm));
           
    const matchesRole = filterRole === "all" || m.role === filterRole;
    const matchesStatus = filterStatus === "all" || m.status === filterStatus;
    const matchesBranch = branchFilter === "all" || m.branchId === branchFilter;
    const matchesTag = filterTag === "all" || (m.tags && m.tags.includes(filterTag));
    
    let matchesBaptism = true;
    if (filterBaptism !== "all") {
       const isBaptized = !!m.dataBatismo && m.dataBatismo.trim() !== "";
       if (filterBaptism === "batizados") matchesBaptism = isBaptized;
       if (filterBaptism === "nao_batizados") matchesBaptism = !isBaptized;
    }
    
    let matchesAge = true;
    if (filterAgeGroup !== "all") {
       let age = -1;
       if (m.dataNascimento) {
          const parts = m.dataNascimento.split(/[-/]/);
          if (parts.length === 3) {
             const p1 = parts[0]; const p2 = parts[1]; const p3 = parts[2];
             let year = p1.length === 4 ? p1 : p3;
             let month = p2;
             let day = p1.length === 4 ? p3 : p1;
             const birthDate = new Date(Number(year), Number(month) - 1, Number(day));
             if (!isNaN(birthDate.getTime())) {
                const today = new Date();
                age = today.getFullYear() - birthDate.getFullYear();
                const mDiff = today.getMonth() - birthDate.getMonth();
                if (mDiff < 0 || (mDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
             }
          }
       }
       
       if (age === -1) {
           matchesAge = false;
       } else if (filterAgeGroup === "0-12") matchesAge = age <= 12;
       else if (filterAgeGroup === "13-18") matchesAge = age >= 13 && age <= 18;
       else if (filterAgeGroup === "19-35") matchesAge = age >= 19 && age <= 35;
       else if (filterAgeGroup === "36-50") matchesAge = age >= 36 && age <= 50;
       else if (filterAgeGroup === "51+") matchesAge = age >= 51;
    }

    return matchesSearch && matchesRole && matchesStatus && matchesTag && matchesBranch && matchesBaptism && matchesAge;
  });

  // Pagination state for members listing
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginationMode, setPaginationMode] = useState<"pagination" | "infinite">("pagination");

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterRole, filterStatus, filterTag, filterBaptism, filterAgeGroup, branchFilter, activeBranch]);

  const paginatedMembers = useMemo(() => {
    if (paginationMode === "infinite") {
      return filteredMembers.slice(0, currentPage * pageSize);
    }
    return filteredMembers.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [filteredMembers, currentPage, pageSize, paginationMode]);

  const hasMoreMembers = currentPage * pageSize < filteredMembers.length;

  const [churchData, setChurchData] = useState<any>(null)


  const formatFullDatePTBR = (d?: string) => {
    try {
      const dateObj = d ? new Date(d + "T00:00:00") : new Date();
      if (isNaN(dateObj.getTime())) return new Date().toLocaleDateString('pt-BR');
      const day = dateObj.getDate();
      const months = [
        "janeiro", "fevereiro", "março", "abril", "maio", "junho",
        "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
      ];
      return `${day} de ${months[dateObj.getMonth()]} de ${dateObj.getFullYear()}`;
    } catch (e) {
      return new Date().toLocaleDateString('pt-BR');
    }
  };

  React.useEffect(() => {
    const savedData = localStorage.getItem("churchConfig")
    if (savedData) {
      setChurchData(JSON.parse(savedData))
    }
  }, [])

  useEffect(() => {
    const handleNewRecord = () => {
      handleOpenAddModal();
    };
    window.addEventListener('app:new-record', handleNewRecord);
    return () => window.removeEventListener('app:new-record', handleNewRecord);
  }, []);

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
          <svg className="w-10 h-10 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Acesso Negado</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Você não tem permissão para acessar o módulo de Secretaria.
        </p>
      </div>
    )
  }

  const previewMember = temporaryPreviewMember || (cardSelection === 'single' && selectedMemberId 
    ? members.find(m => m.id.toString() === selectedMemberId) 
    : (filteredMembers[0] || members[0] || null));

  const generateActiveMembersEventListPDF = (customEventName?: string, customDate?: string, type: 'ativos' | 'em_branco' = eventListType, blankCount: number = eventBlankLinesCount) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const evName = (customEventName || eventName).trim() || "EVENTO / REUNIÃO GERAL";
    const evDate = customDate || eventDate || new Date().toISOString().split('T')[0];
    const formattedDate = evDate.includes('-') ? evDate.split('-').reverse().join('/') : evDate;
    
    drawSecretariaLetterHeader(
      doc,
      `LISTA DE PRESENÇA - ${evName.toUpperCase()}`,
      `Data do Evento: ${formattedDate} | Tipo: ${type === 'ativos' ? 'Membros Cadastrados Ativos' : 'Lista para Preenchimento Manual'}`
    );

    if (type === 'ativos') {
      const activeMembers = branchMembers.filter(m => m.status === "Ativo" || m.status === "ativo");
      activeMembers.sort((a, b) => a.name.localeCompare(b.name));

      const tableData = activeMembers.map((m, index) => [
        index + 1,
        m.name,
        m.role || "Membro",
        m.phone || "-",
        "" // Coluna para assinatura presencial
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['#', 'Nome do Membro', 'Cargo / Função', 'Telefone', 'Assinatura / Rubrica']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 65 },
          2: { cellWidth: 35 },
          3: { cellWidth: 30 },
          4: { cellWidth: 42 }
        }
      });
    } else {
      // Lista em branco com linhas para preenchimento manual no dia
      const count = Math.max(10, Math.min(100, blankCount || 30));
      const tableData: any[] = [];
      for (let i = 1; i <= count; i++) {
        tableData.push([i, "", "", ""]);
      }

      autoTable(doc, {
        startY: 40,
        head: [['#', 'Nome Completo (Legível)', 'Telefone / WhatsApp', 'Assinatura']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, minCellHeight: 8, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 80 },
          2: { cellWidth: 42 },
          3: { cellWidth: 50 }
        }
      });
    }

    drawSecretariaLetterFooter(doc);
    doc.save(`lista_presenca_${evName.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.pdf`);
    toast.success("Lista de presença em PDF gerada com sucesso!");
    setIsEventPresenceModalOpen(false);
  };

  const generateMemberListCSV = () => {
    if (filteredMembers.length === 0) {
      toast.error("Nenhum membro para exportar.");
      return;
    }
    
    // Create CSV header
    const headers = ["Nome", "Cargo", "Status", "Telefone", "E-mail", "CPF", "Data de Nascimento", "Data de Batismo", "Endereço"];
    
    // Create CSV rows
    const rows = filteredMembers.map(m => {
      return [
        `"${m.name || ''}"`,
        `"${m.role || ''}"`,
        `"${m.status || ''}"`,
        `"${m.phone || ''}"`,
        `"${m.email || ''}"`,
        `"${m.cpf || ''}"`,
        `"${m.dataNascimento || ''}"`,
        `"${m.dataBatismo || ''}"`,
        `"${m.endereco || ''}"`
      ].join(",");
    });
    
    const csvContent = [headers.join(","), ...rows].join("");
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Membros_Igreja_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success("Arquivo CSV gerado com sucesso!");
    logAction("Exportação", "Lista de membros exportada em CSV", user?.name || "Desconhecido");
  };

  const drawSecretariaLetterHeader = (
    doc: jsPDF,
    title: string,
    subtitle: string
  ) => {
    return drawSafeChurchReportHeader(doc, {
      title,
      subtitle,
      churchData,
      activeBranchId: activeBranch,
      activeBranchName: activeBranchName,
      leftMargin: 14,
      rightMargin: 14,
      topY: 10
    });
  };

  const drawSecretariaLetterFooter = (
    doc: jsPDF
  ) => {
    const pageCount = doc.getNumberOfPages();
    const todayFormatted = new Date().toLocaleDateString('pt-BR');
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.line(14, 283, 196, 283);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(60, 60, 60);
      doc.text(`Valparaiso-SP, ${todayFormatted}`, 14, 288);
      doc.text(`Página ${i} de ${pageCount}`, 196, 288, { align: "right" });
    }
  };
  
  const generateCustomReportPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const title = reportType === 'ativos' ? "RELATÓRIO DE MEMBROS ATIVOS" : "RELATÓRIO DE ANIVERSARIANTES DO MÊS";
    
    drawSecretariaLetterHeader(
      doc,
      title,
      `Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    );

    let data = members;
    if (reportType === 'ativos') {
        data = data.filter(m => m.status === 'Ativo');
    } else if (reportType === 'aniversariantes') {
        data = data.filter(m => {
           if (!m.dataNascimento) return false;
           const parts = m.dataNascimento.split(/[-/]/);
           let month = parts[1];
           return month === reportMonth;
        });
    }

    if (reportRole !== 'all') {
       data = data.filter(m => m.role.toLowerCase() === reportRole.toLowerCase());
    }

    let head = [['Nome', 'Função', 'Telefone', 'E-mail']];
    let body = data.map(m => [m.name, m.role, m.phone, m.email || '-']);
    
    if (reportType === 'aniversariantes') {
        head = [['Nome', 'Dia', 'Função', 'Telefone']];
        body = data.map(m => {
            const parts = m.dataNascimento.split(/[-/]/);
            const day = m.dataNascimento.includes('/') ? parts[0] : parts[2];
            return [m.name, day, m.role, m.phone];
        });
        body.sort((a, b) => parseInt(a[1]) - parseInt(b[1]));
    }

    autoTable(doc, {
      startY: 40,
      head: head,
      body: body,
      theme: 'striped',
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 2.5 }
    });

    drawSecretariaLetterFooter(doc);
    doc.save(`${title.toLowerCase().replace(/ /g, '_')}.pdf`);
    toast.success("Relatório gerado com sucesso!");
  };

  const generateMemberListPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    
    drawSecretariaLetterHeader(
      doc,
      "LISTA GERAL DE MEMBROS CADASTRADOS",
      `Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    );

    const tableData = filteredMembers.map(m => [
      m.name,
      m.role,
      m.status,
      m.phone
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Nome', 'Função / Cargo', 'Status', 'Telefone']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 2.5 }
    });

    drawSecretariaLetterFooter(doc);
    doc.save("lista_membros.pdf");
    toast.success("Lista de membros gerada com sucesso!");
  };

  const generateBirthdaysPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const currentMonth = new Date().getMonth() + 1;
    
    drawSecretariaLetterHeader(
      doc,
      `ANIVERSARIANTES DO MÊS (${currentMonth.toString().padStart(2, '0')})`,
      `Emitido em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
    );
    
    const birthdayMembers = members.filter(m => {
      const bDate = m.dataNascimento || m.birthDate;
      if (!bDate) return false;
      if (bDate.includes('/')) {
        const parts = bDate.split('/');
        return parts.length >= 2 && parseInt(parts[1], 10) === currentMonth;
      }
      if (bDate.includes('-')) {
        const parts = bDate.split('-');
        return parts.length >= 2 && parseInt(parts[1], 10) === currentMonth;
      }
      return false;
    }).sort((a, b) => {
      const getDay = (m: any) => {
        const d = m.dataNascimento || m.birthDate || "";
        if (d.includes('/')) return parseInt(d.split('/')[0], 10) || 0;
        if (d.includes('-')) return parseInt(d.split('-')[2], 10) || 0;
        return 0;
      };
      return getDay(a) - getDay(b);
    });

    const tableData = birthdayMembers.map(m => {
      const bDate = m.dataNascimento || m.birthDate || "";
      let dayMonth = "";
      if (bDate.includes('/')) dayMonth = bDate.substring(0, 5);
      else if (bDate.includes('-')) {
        const [y, mo, d] = bDate.split('-');
        dayMonth = `${(d || "").slice(0, 2)}/${mo}`;
      }
      return [
        dayMonth || "N/A",
        m.name || m.nome || "Membro",
        m.phone || m.telefone || "Não informado"
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [['Dia/Mês', 'Nome', 'Telefone']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
      styles: { fontSize: 8.5, cellPadding: 2.5 }
    });

    drawSecretariaLetterFooter(doc);
    doc.save("aniversariantes_mes.pdf");
    toast.success("Relatório de aniversariantes gerado com sucesso!");
  };

  const generateCardsPDF = async (onlyPreview: boolean | React.MouseEvent = false) => {
    const doc = new jsPDF('portrait', 'mm', 'a4')
    
    const loadImageDimensions = (src: string): Promise<{w: number, h: number}> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({ w: img.width, h: img.height });
            img.onerror = () => resolve({ w: 0, h: 0 });
            img.src = src;
        });
    };
    
    let membersToPrint = filteredMembers;
    if (onlyPreview === true && previewMember) {
        membersToPrint = [previewMember]
    } else if (cardSelection === 'single' && selectedMemberId) {
        membersToPrint = members.filter((m: any) => m.id.toString() === selectedMemberId)
    } else if (cardSelection === 'selected') {
        membersToPrint = members.filter((m: any) => selectedMemberIds.includes(m.id.toString()))
    } else if (cardSelection === 'range' && startMemberId && endMemberId) {
        const startIndex = members.findIndex((m: any) => m.id.toString() === startMemberId)
        const endIndex = members.findIndex((m: any) => m.id.toString() === endMemberId)
        if (startIndex !== -1 && endIndex !== -1) {
            const min = Math.min(startIndex, endIndex)
            const max = Math.max(startIndex, endIndex)
            membersToPrint = members.slice(min, max + 1)
        }
    }

    if (membersToPrint.length === 0) {
        toast.error("Nenhum membro selecionado para impressão.")
        return
    }

    const startX = 15;
    const startY = 15;
    const cardW = 90;
    const cardH = 60;
    let currentY = startY;
    let cardsOnPage = 0;

    const drawRoundedBox = (doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, bgColor: string) => {
        // Draw the elegant thin box
        doc.setDrawColor(140)
        doc.setLineWidth(0.15)
        doc.roundedRect(x, y, w, h, 1.5, 1.5)
        
        // Label with background matching the card to "break" the top border softly
        doc.setFontSize(5.5)
        doc.setFont("helvetica", "bold")
        const textWidth = doc.getTextWidth(label)
        doc.setFillColor(bgColor)
        doc.rect(x + 1.5, y - 1.2, textWidth + 1, 2.4, 'F')
        doc.setTextColor(80)
        doc.text(label, x + 2, y + 0.5)
        doc.setTextColor(0)
        
        // Draw value inside bottom-left
        let val = value || "";
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        if (doc.getTextWidth(val) > w - 3) doc.setFontSize(7);
        if (doc.getTextWidth(val) > w - 3) doc.setFontSize(6);
        if (doc.getTextWidth(val) > w - 3) doc.setFontSize(5.5);
        if (doc.getTextWidth(val) > w - 3) doc.setFontSize(4.5);
        // Truncate if still too long
        while (doc.getTextWidth(val) > w - 3 && val.length > 0) {
            val = val.substring(0, val.length - 1);
        }
        doc.text(val, x + 1.5, y + h - 1.5)
    }

    for (const member of membersToPrint) {
        if (cardsOnPage === 4) {
            doc.addPage()
            currentY = startY
            cardsOnPage = 0
        }

        // Draw Cut Lines (dashed)
        doc.setDrawColor(200)
        doc.setLineDashPattern([2, 2], 0)
        if (cardsOnPage === 0) {
            doc.line(0, currentY, 210, currentY) // Top line
        }
        doc.line(0, currentY + cardH, 210, currentY + cardH) // Bottom line
        
        if (cardsOnPage === 0) {
            // Vertical lines for the whole columns (4 cards tall = 240mm)
            doc.line(startX, startY, startX, startY + 240)
            doc.line(startX + cardW, startY, startX + cardW, startY + 240) // Fold line
            doc.line(startX + 2 * cardW, startY, startX + 2 * cardW, startY + 240) 
        }
        doc.setLineDashPattern([], 0)

        // --- FRONT ---
        let xFront = startX;
        doc.setFillColor(cardColorFront)
        // Main card background
        doc.roundedRect(xFront, currentY, cardW * 2, cardH, 3, 3, 'F')
        
        // Outer elegant border (Full width for both front and back)
        doc.setDrawColor(120)
        doc.setLineWidth(0.4)
        doc.roundedRect(xFront, currentY, cardW * 2, cardH, 3, 3) 
        
        // Inner elegant border
        doc.setDrawColor(200)
        doc.setLineWidth(0.15)
        doc.roundedRect(xFront + 1.5, currentY + 1.5, cardW - 3, cardH - 3, 2, 2)

        // Header
        let textStartX = xFront + 5;
        let textWidth = cardW - 10;
        let textCenter = xFront + cardW / 2;

        if (churchData?.logoDataUrl) {
            try {
                doc.addImage(churchData.logoDataUrl, 'PNG', xFront + 4, currentY + 4, 18, 12)
                textStartX = xFront + 24;
                textWidth = cardW - 28;
                textCenter = textStartX + textWidth / 2;
            } catch (e) {
                console.error("Error adding logo", e)
            }
        }
        
        // Church Name (auto-scaling and splitting)
        const rawName = churchData?.nome?.toUpperCase() || "IGREJA O BRASIL PARA CRISTO";
        let mainName = rawName;
        let subName = "";
        
        if (rawName.includes(" - ")) {
            const parts = rawName.split(" - ");
            mainName = parts[0];
            subName = parts.slice(1).join(" - ");
        } else if (rawName.includes("-")) {
            const parts = rawName.split("-");
            mainName = parts[0].trim();
            subName = parts.slice(1).join("-").trim();
        }

        let nameSize = 10;
        doc.setFontSize(nameSize);
        doc.setFont("helvetica", "bold");
        while (doc.getTextWidth(mainName) > textWidth && nameSize > 5) {
            nameSize -= 0.5;
            doc.setFontSize(nameSize);
        }
        
        let yBaseName = subName ? 5 : 6.5;
        doc.text(mainName, textCenter, currentY + yBaseName, { align: 'center' });
        
        let yAddressBase = 9.5;
        if (subName) {
            let subSize = nameSize - 1.5;
            if (subSize < 5) subSize = 5;
            doc.setFontSize(subSize);
            doc.setTextColor(15, 60, 110); // Elegant dark blue
            doc.text(subName, textCenter, currentY + yBaseName + 3, { align: 'center' });
            doc.setTextColor(0);
            yAddressBase = 11;
        }
        
        // Address
        doc.setFontSize(5)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(80)
        doc.text(`${churchData?.endereco || "RUA BARTOLOMEU BUENO, Nº 629"} - ${churchData?.bairro || "BAIRRO SANTA CASA"}`, textCenter, currentY + yAddressBase, { align: 'center' })
        doc.text(`CEP ${churchData?.cep || "16880-00-SP"} - ${churchData?.cidade || "VALPARAISO - SP"}`, textCenter, currentY + yAddressBase + 2, { align: 'center' })
        doc.setTextColor(0)

        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text("CARTÃO DE MEMBRO", xFront + cardW/2, currentY + (subName ? 18.5 : 18), { align: 'center' })

        // Photo
        doc.setDrawColor(150)
        doc.setLineWidth(0.15);
        doc.roundedRect(xFront + 4.5, currentY + 22, 18, 26, 1.5, 1.5)
        if (member.photoUrl) {
            try {
                // Determine format
                let format = 'JPEG';
                if (member.photoUrl.startsWith('data:image/png')) format = 'PNG';
                else if (member.photoUrl.startsWith('data:image/webp')) format = 'WEBP';
                
                // Keep aspect ratio by fitting inside 17.6 x 25.6
                const dims = await loadImageDimensions(member.photoUrl);
                if (dims.w > 0 && dims.h > 0) {
                    const boxW = 17.6;
                    const boxH = 25.6;
                    const ratioX = boxW / dims.w;
                    const ratioY = boxH / dims.h;
                    const ratio = Math.min(ratioX, ratioY);
                    
                    const finalW = dims.w * ratio;
                    const finalH = dims.h * ratio;
                    
                    const offsetX = (boxW - finalW) / 2;
                    const offsetY = (boxH - finalH) / 2;
                    
                    doc.addImage(member.photoUrl, format, xFront + 4.7 + offsetX, currentY + 22.2 + offsetY, finalW, finalH);
                } else {
                    doc.addImage(member.photoUrl, format, xFront + 4.7, currentY + 22.2, 17.6, 25.6);
                }
            } catch (e) {
                console.error("Error drawing photo", e)
                doc.setFontSize(6)
                doc.setFont("helvetica", "normal")
                doc.text("Foto", xFront + 9.5, currentY + 36)
            }
        } else {
            doc.setFontSize(6)
            doc.setFont("helvetica", "normal")
            doc.text("Foto", xFront + 9.5, currentY + 36)
        }

        // Fields
        let fieldX = xFront + 24.5;
        let fieldY = currentY + 25;
        
        drawRoundedBox(doc, fieldX, fieldY, 61, 6, "Nome", member.name, cardColorFront)
        fieldY += 9
        
        drawRoundedBox(doc, fieldX, fieldY, 34, 6, "Cargo", member.role, cardColorFront)
        drawRoundedBox(doc, fieldX + 37, fieldY, 24, 6, "Expedida em", new Date().toLocaleDateString('pt-BR'), cardColorFront)
        fieldY += 9

        drawRoundedBox(doc, fieldX, fieldY, 61, 6, "Cidade", `${member.cidade || ""} - ${member.naturalidade?.split('/')[1] || "SP"}`, cardColorFront)

        if (showBarcodeOnCard && (barcodeCardPosition === 'front' || barcodeCardPosition === 'both')) {
          try {
            const bVal = getMemberBarcodeValue(member);
            const bText = getMemberBarcodeDisplayText(member);
            const bDataUrl = generateBarcodeDataUrl(bVal, {
              width: 1.0,
              height: 14,
              fontSize: 6,
              displayValue: true,
              text: bText
            });
            if (bDataUrl) {
              doc.setFillColor(255, 255, 255);
              doc.setDrawColor(210);
              doc.setLineWidth(0.1);
              doc.roundedRect(fieldX, currentY + 50.5, 61, 6.5, 1, 1, 'FD');
              doc.addImage(bDataUrl, 'PNG', fieldX + 3, currentY + 50.8, 55, 5.9, undefined, 'FAST');
            }
          } catch (e) {}
        }

        // --- BACK ---
        let xBack = startX + cardW;
        // Background and outer border already drawn by the front card logic to ensure perfect fold
        doc.setDrawColor(200);
        doc.setLineWidth(0.15);
        doc.roundedRect(xBack + 1.5, currentY + 1.5, cardW - 3, cardH - 3, 2, 2);
        
        let bY = currentY + 5;
        let bX = xBack + 6;
        
        drawRoundedBox(doc, bX, bY, 57, 5.5, "Pai", member.pai || "", cardColorBack)
        drawRoundedBox(doc, bX + 60, bY, 18, 5.5, "Validade", member.validade || "", cardColorBack)
        bY += 8.5

        drawRoundedBox(doc, bX, bY, 57, 5.5, "Mãe", member.mae || "", cardColorBack)
        drawRoundedBox(doc, bX + 60, bY, 18, 5.5, "Data do Batismo", member.dataBatismo || "", cardColorBack)
        bY += 8.5

        drawRoundedBox(doc, bX, bY, 36, 5.5, "Naturalidade", member.naturalidade || "", cardColorBack)
        drawRoundedBox(doc, bX + 39, bY, 18, 5.5, "Sexo", member.sexo || "", cardColorBack)
        drawRoundedBox(doc, bX + 60, bY, 18, 5.5, "Membro desde", member.membroDesde || "", cardColorBack)
        bY += 8.5

        drawRoundedBox(doc, bX, bY, 36, 5.5, "Data de Nascimento", member.dataNascimento || "", cardColorBack)
        drawRoundedBox(doc, bX + 39, bY, 39, 5.5, "Estado Civil", member.estadoCivil || "", cardColorBack)
        bY += 8.5

        drawRoundedBox(doc, bX, bY, 36, 5.5, "Nº CPF", member.cpf || "", cardColorBack)
        drawRoundedBox(doc, bX + 39, bY, 39, 5.5, "Nº RG", member.rg || "", cardColorBack)

        // QR Code ou Código de Barras no Verso do Cartão
        if (showBarcodeOnCard && (barcodeCardPosition === 'back' || barcodeCardPosition === 'both')) {
          if (cardCodeType === 'qrcode') {
            try {
              const qrVal = getMemberQrPayload(member);
              const qrDataUrl = await QRCode.toDataURL(qrVal, {
                margin: 2,
                width: 140,
                color: { dark: '#000000', light: '#ffffff' }
              });
              if (qrDataUrl) {
                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(180);
                doc.setLineWidth(0.1);
                // Quadrado perfeitamente centralizado entre as duas assinaturas, sem sobrepor!
                doc.roundedRect(bX + 32.5, currentY + 38.5, 13, 13, 1, 1, 'FD');
                doc.addImage(qrDataUrl, 'PNG', bX + 33, currentY + 39, 12, 12, undefined, 'FAST');
                doc.setFontSize(4);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(80);
                doc.text("VALIDAÇÃO", bX + 39, currentY + 53, { align: 'center' });
                doc.setTextColor(cardTextColorBack);
              }
            } catch (e) {
              console.warn("Error drawing QR code in PDF:", e);
            }
          } else {
            try {
              const bVal = getMemberBarcodeValue(member);
              const bText = getMemberBarcodeDisplayText(member);
              const bDataUrl = generateBarcodeDataUrl(bVal, {
                width: 1.0,
                height: 12,
                fontSize: 6,
                displayValue: true,
                text: bText
              });
              if (bDataUrl) {
                doc.setFillColor(255, 255, 255);
                doc.setDrawColor(200);
                doc.setLineWidth(0.1);
                doc.roundedRect(bX + 10, currentY + 41, 58, 5, 0.5, 0.5, 'FD');
                doc.addImage(bDataUrl, 'PNG', bX + 11, currentY + 41.2, 56, 4.6, undefined, 'FAST');
              }
            } catch (e) {
              console.warn("Error drawing barcode in PDF:", e);
            }
          }
        }

        // Signatures (Perfeitamente dimensionadas e alinhadas dos dois lados)
        doc.setDrawColor(100);
        doc.setLineWidth(0.1);
        
        let sigY = currentY + 51;
        // Assinatura do Membro (lado esquerdo: largura 30mm)
        doc.line(bX + 1.5, sigY - 2.5, bX + 31, sigY - 2.5);
        doc.setFontSize(5.5);
        doc.setFont("helvetica", "bold");
        let memName = member.name || '';
        let mFontSize = 5.5;
        doc.setFontSize(mFontSize);
        while (doc.getTextWidth(memName) > 28 && mFontSize > 3) {
            mFontSize -= 0.5;
            doc.setFontSize(mFontSize);
        }
        
        if (churchData?.secretarySignatureUrl) {
            try {
                doc.addImage(churchData.secretarySignatureUrl, 'PNG', bX + 3.5, sigY - 10, 24, 7, undefined, 'FAST');
            } catch(e) {}
        }
        
        doc.text(memName, bX + 16.25, sigY, { align: 'center' });
        doc.setFontSize(4.5);
        doc.text("MEMBRO", bX + 16.25, sigY + 2.5, { align: 'center' });

        // Assinatura do Pastor (lado direito: largura 30mm)
        doc.line(bX + 47, sigY - 2.5, bX + 76.5, sigY - 2.5);
        doc.setFont("helvetica", "bold");
        
        let pastorName = churchData?.pastorTitular || 'Pastor Responsável';
        let pFontSize = 5.5;
        doc.setFontSize(pFontSize);
        while (doc.getTextWidth(pastorName) > 28 && pFontSize > 3) {
            pFontSize -= 0.5;
            doc.setFontSize(pFontSize);
        }
        if (churchData?.pastorSignatureUrl) {
            try {
                doc.addImage(churchData.pastorSignatureUrl, 'PNG', bX + 49, sigY - 10, 24, 7, undefined, 'FAST');
            } catch(e) {}
        }
        doc.text(pastorName, bX + 61.75, sigY, { align: 'center' });
        
        doc.setFontSize(4.5);
        doc.text("PASTOR LOCAL", bX + 61.75, sigY + 2.5, { align: 'center' });

        currentY += cardH;
        cardsOnPage++;
    }

    doc.save("carteirinhas.pdf")
    toast.success("Carteirinhas geradas com sucesso!")
    setIsPrintModalOpen(false)
  }

  const generateCardsPNG = async (onlyPreview: boolean | React.MouseEvent = false) => {
    let membersToExport = filteredMembers;
    if (onlyPreview === true && previewMember) {
        membersToExport = [previewMember]
    } else if (cardSelection === 'single' && selectedMemberId) {
        membersToExport = members.filter((m: any) => m.id.toString() === selectedMemberId)
    } else if (cardSelection === 'selected') {
        membersToExport = members.filter((m: any) => selectedMemberIds.includes(m.id.toString()))
    } else if (cardSelection === 'range' && startMemberId && endMemberId) {
        const startIndex = members.findIndex((m: any) => m.id.toString() === startMemberId)
        const endIndex = members.findIndex((m: any) => m.id.toString() === endMemberId)
        if (startIndex !== -1 && endIndex !== -1) {
            const min = Math.min(startIndex, endIndex)
            const max = Math.max(startIndex, endIndex)
            membersToExport = members.slice(min, max + 1)
        }
    }

    if (membersToExport.length === 0) {
        toast.error("Nenhum membro selecionado para exportação.")
        return
    }

    toast.info("Gerando imagens, por favor aguarde...");
    
    // We will find the preview DOM elements and clone/render them
    // For batch export, it's complex since we only show one preview at a time.
    // So we will quickly swap the previewMember, render, and put back.
    const originalPreview = temporaryPreviewMember;
    const zip = new JSZip();
    
    try {
        for (const m of membersToExport) {
            setTemporaryPreviewMember(m);
            // Wait for render
            await new Promise(r => setTimeout(r, 100));
            
            const frontEl = document.getElementById('card-preview-front');
            const backEl = document.getElementById('card-preview-back');
            
            if (frontEl && backEl) {
                const frontDataUrl = await htmlToImage(frontEl, { quality: 1.0, pixelRatio: 3 });
                const backDataUrl = await htmlToImage(backEl, { quality: 1.0, pixelRatio: 3 });
                
                const safeName = m.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                if (membersToExport.length === 1) {
                    saveAs(frontDataUrl, `carteirinha_frente_${safeName}.png`);
                    saveAs(backDataUrl, `carteirinha_verso_${safeName}.png`);
                    toast.success("Carteirinha exportada em PNG!");
                    setTemporaryPreviewMember(originalPreview);
                    return;
                } else {
                    zip.file(`${safeName}_frente.png`, frontDataUrl.split(',')[1], {base64: true});
                    zip.file(`${safeName}_verso.png`, backDataUrl.split(',')[1], {base64: true});
                }
            }
        }
        
        if (membersToExport.length > 1) {
            const content = await zip.generateAsync({type:"blob"});
            saveAs(content, "carteirinhas.zip");
            toast.success("Arquivo ZIP com as carteirinhas gerado com sucesso!");
        }
    } catch (e) {
        console.error(e);
        toast.error("Erro ao gerar imagens PNG.");
    } finally {
        setTemporaryPreviewMember(originalPreview);
    }
  }

  const handleDocTypeChange = (type: string) => {
    setDocType(type);
    
    if (type.startsWith('custom_')) {
        const tId = type.replace('custom_', '');
        const template = customTemplates.find(t => t.id === tId);
        if (template) {
            setDocSubject(template.subject || template.name);
            setDocContent(template.content || "");
            if (template.backgroundImage) {
                setDocTemplateId(template.id);
            }
        }
        return;
    }

    const defaults: any = {
      "declaracao-batismo": { subj: "DECLARAÇÃO DE BATISMO NAS ÁGUAS", cont: `Declaramos para os devidos fins que o(a) irmão(ã) {NOME_MEMBRO}, portador(a) do documento {DOCUMENTO}, desceu às águas batismais nesta congregação no dia {DATA_BATISMO}, estando em plena comunhão com nossa comunidade cristã e sem restrições em nosso rol de membros.\n\nPor ser verdade, firmamos a presente declaração.` },
      "carta-aniversario": { subj: "FELIZ ANIVERSÁRIO", cont: `Prezado(a) {NOME_MEMBRO},É com grande alegria que celebramos o seu aniversário neste dia especial. Agradecemos a Deus pela sua vida e por fazer parte da nossa congregação.Que o Senhor te abençoe e te guarde, faça resplandecer o Seu rosto sobre ti e te dê a paz."Ensina-nos a contar os nossos dias, de tal maneira que alcancemos corações sábios." - Salmos 90:12Com carinho e orações,` },
      "carta-despedida": { subj: "CARTA DE TRANSFERÊNCIA", cont: `Oramos pela vida do(a) irmão(ã) {NOME_MEMBRO}, que esteve congregando conosco e agora segue para uma nova jornada. Agradecemos a Deus pelo tempo de dedicação e amor investidos em nossa comunidade. Recomendamos este(a) irmão(ã) à comunhão da igreja para a qual se transfere.Que a graça do Senhor Jesus Cristo continue o abençoando abundantemente.` },
      "carta-recebimento": { subj: "CARTA DE RECEBIMENTO", cont: `É com muita alegria que recebemos em nossa congregação o(a) irmão(ã) {NOME_MEMBRO}.Bem-vindo(a) à nossa família em Cristo! Cremos que Deus tem um propósito na sua chegada e esperamos que seja um tempo de crescimento, comunhão e serviço no Reino de Deus.Estaremos orando por sua integração e por tudo que o Senhor fará através de sua vida.` },
      "carta-recomendacao": { subj: "CARTA DE RECOMENDAÇÃO", cont: `A paz do Senhor Jesus Cristo!Recomendamos à comunhão dos santos desta amada Igreja o(a) irmão(ã) {NOME_MEMBRO}.Declaramos que o mesmo encontra-se em plena comunhão com nossa congregação, tendo uma conduta cristã irrepreensível e digna de um servo de Deus.Por favor, receba-o(a) com a devida acolhida em Cristo.` },
      "cert-batismo": { subj: "CERTIFICADO DE BATISMO", cont: `Em obediência à ordem de nosso Senhor Jesus Cristo, foi batizado(a)nas águas, declarando publicamente a sua fé no Evangelho.` },
      "cert-apresentacao": { subj: "APRESENTAÇÃO DE CRIANÇA", cont: `Foi apresentada ao Senhor no Templo, recebendo as orações daIgreja, a fim de que cresça na graça e no conhecimento de Jesus.` },
      "cert-discipulado": { subj: "CERTIFICADO DE DISCIPULADO", cont: `Concluiu com êxito o curso de discipulado básico da nossa igreja, estando apto(a) para os próximos passos na sua jornada de fé.` },
      "cert-visitante": { subj: "LEMBRANÇA DE VISITANTE", cont: `Agradecemos a sua visita e esperamos que você tenha se sentido abençoado(a) em nosso meio. Volte sempre!` },
      "form-portaria": { subj: "FORMULÁRIO DE PORTARIA", cont: `` },
      "convites": { subj: "CONVITE ESPECIAL", cont: `Gostaríamos de ter você conosco em nosso próximo evento.` },
      "ata-reuniao": { subj: "ATA DE REUNIÃO", cont: `Aos {DATA_ATUAL}, reuniram-se os membros da diretoria e ministério para deliberar sobre os seguintes assuntos:1. 2. 3. Nada mais havendo a tratar, a reunião foi encerrada com uma oração, sendo lavrada a presente ata, que após lida e aprovada, será assinada por todos os presentes.` }
    };
    
    if (defaults[type]) {
      setDocSubject(defaults[type].subj);
      setDocContent(defaults[type].cont);
    }
  };

  const resolveTags = (text: string) => {
    let result = text || "";
    const member = selectedMemberDoc || members.find((m: any) => (m.name === docName || m.nome === docName));
    const today = new Date().toLocaleDateString('pt-BR');
    const memberName = docName || (member ? (member.name || member.nome) : "");
    const displayMemberName = memberName.trim() ? memberName : "________________________________________";
    
    result = result.replace(/{DATA_ATUAL}|\[DATA_ATUAL\]/g, today);
    result = result.replace(/{NOME_MEMBRO}|\[NOME_MEMBRO\]|\[MEMBRO\]/g, displayMemberName);
    const memberDoc = member ? (member.cpf || member.rg || "") : "";
    const memberBatismo = member ? (member.dataBatismo || member.baptismDate || "") : "";
    result = result.replace(/{DOCUMENTO}|\[DOCUMENTO\]/g, memberDoc || "____________________");
    result = result.replace(/{DATA_BATISMO}|\[DATA_BATISMO\]/g, memberBatismo || "____/____/________");
    
    if (member) {
        result = result.replace(/{CARGO_IGREJA}|\[CARGO\]/g, member.role || member.cargo || "Membro");
        
        // Conditional Tags
        result = result.replace(/\{SAUDACAO:\s*'([^']+)'\s*\/\s*'([^']+)'\}/g, (match, masc, fem) => {
            return (member.sexo?.toLowerCase() === 'feminino' || member.sexo?.toLowerCase() === 'f') ? fem : masc;
        });

        result = result.replace(/\{SE_CASADO:\s*'([^']+)'\}/g, (match, textIfMarried) => {
            return member.estadoCivil?.toLowerCase().includes('casad') ? textIfMarried : "";
        });
    } else {
        result = result.replace(/{CARGO_IGREJA}|\[CARGO\]/g, "");
        result = result.replace(/\{SAUDACAO:\s*'([^']+)'\s*\/\s*'([^']+)'\}/g, "$1(a)");
        result = result.replace(/\{SE_CASADO:\s*'([^']+)'\}/g, "");
    }
    return result;
  }

  const resetDocForm = () => {
    setDocName("");
    setDocSubject("CARTA DE RECOMENDAÇÃO");
    setDocContent(`A paz do Senhor Jesus Cristo!\n\nRecomendamos à comunhão dos santos desta amada Igreja o(a) irmão(ã) {NOME_MEMBRO}.\n\nDeclaramos que o mesmo encontra-se em plena comunhão com nossa congregação, tendo uma conduta cristã irrepreensível e digna de um servo de Deus.\n\nPor favor, receba-o(a) com a devida acolhida em Cristo.`);
    setDocExtras("");
    setDocDate("");
    setDocPastor("");
    setDocParent("");
    setDocSignature("");
    setSelectedMemberDoc(null);
    setDocMemberPhoto(null);
    setDocTemplateId("nenhum");
  };

  const handleSaveToPendingFolder = () => {
    if (!docSubject.trim() && !docName.trim()) {
      toast.error("Preencha ao menos o assunto ou o nome do membro.");
      return;
    }
    const newDoc = {
      id: Date.now().toString(),
      type: docType,
      name: docName || "Geral",
      date: new Date().toISOString(),
      subject: docSubject || "CARTA OFICIAL",
      content: resolveTags(docContent),
      rawContent: docContent,
      templateId: docTemplateId,
      pastor: docPastor,
      parent: docParent,
      signature: docSignature,
      extras: docExtras,
      docDate: docDate,
      memberPhoto: docMemberPhoto || selectedMemberDoc?.photoUrl || null,
      status: 'pendente'
    };
    const updatedHistory = [newDoc, ...documentHistory];
    setDocumentHistory(updatedHistory);
    localStorage.setItem("churchDocumentHistory", JSON.stringify(updatedHistory));
    resetDocForm();
    setDocsTab('aprovacoes');
    toast.success("Documento guardado com sucesso na Pasta de Aprovações!");
  };

  const generateDocumentPDF = (previewOnly = false, preventDownload = false, targetDoc?: any) => {
    const doc = new jsPDF("p", "mm", "a4");

    const currentType = targetDoc?.type || docType;
    const currentSubject = targetDoc?.subject || docSubject || "CARTA DE RECOMENDAÇÃO";
    const currentName = targetDoc?.name || docName || "";
    const currentContent = targetDoc?.rawContent || targetDoc?.content || docContent;
    const currentDate = targetDoc?.docDate || docDate || "";
    const currentPastor = targetDoc?.pastor || docPastor || "";
    const currentParent = targetDoc?.parent || docParent || "";
    const currentSignature = targetDoc?.signature || docSignature || "";
    const currentExtras = targetDoc?.extras || docExtras || "";
    const currentTemplateId = targetDoc?.templateId || docTemplateId;
    const currentPhoto = targetDoc?.memberPhoto || docMemberPhoto || selectedMemberDoc?.photoUrl || null;

    const isLetter = currentType.startsWith("carta-") || currentType.startsWith("ata-") || currentSubject.toUpperCase().includes("CARTA") || currentSubject.toUpperCase().includes("ATA");

    const churchName = activeBranchObj?.name || churchData?.nome || "IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO";
    const churchAddress = activeBranchObj?.address || churchData?.endereco || "Rua Bartolomeu Bueno, nº 629 - Bairro Santa Casa";
    const churchCity = activeBranchObj?.cidade || churchData?.cidade || "Valparaíso";
    const churchUF = activeBranchObj?.uf || churchData?.uf || "SP";
    const churchCnpj = activeBranchObj?.cnpj || churchData?.cnpj || "51.105.484/0001-74";
    const churchPastor = activeBranchObj?.pastor || churchData?.pastorPresidente || churchData?.pastorTitular || churchData?.pastor || "Pr. Titular / Presidente";

    const activeLogo = churchLogos.find(l => l.id === selectedLogoId);
    const logoDataUrl = activeLogo ? activeLogo.dataUrl : (churchData?.logoDataUrl || docLogo || null);

    if (isLetter) {
        // Layout de Carta Elegante (A4 Retrato)
        if (currentTemplateId && currentTemplateId !== 'nenhum') {
            const template = customTemplates.find(t => t.id === currentTemplateId);
            if (template && template.backgroundImage) {
                try {
                    doc.addImage(template.backgroundImage, "PNG", 0, 0, 210, 297);
                } catch (e) {}
            }
        }

        // Cabeçalho Oficial da Igreja
        const hasHeaderLogo = !!logoDataUrl;
        if (hasHeaderLogo) {
            try {
                doc.addImage(logoDataUrl, "PNG", 20, 14, 22, 22);
            } catch (e) {
                try {
                    doc.addImage(logoDataUrl, "JPEG", 20, 14, 22, 22);
                } catch (err) {}
            }
            doc.setFont("times", "bold");
            let headSize = 13;
            doc.setFontSize(headSize);
            while (doc.getTextWidth(churchName.toUpperCase()) > 140 && headSize > 8.5) {
                headSize -= 0.5;
                doc.setFontSize(headSize);
            }
            doc.setTextColor(15, 23, 42);
            doc.text(churchName.toUpperCase(), 46, 20, { maxWidth: 140 });

            doc.setFont("times", "normal");
            doc.setFontSize(8.5);
            doc.setTextColor(60, 60, 60);
            doc.text("Convenção das Igrejas Evangélicas Pentecostais O Brasil Para Cristo", 46, 25, { maxWidth: 140 });

            doc.setFontSize(8);
            doc.setTextColor(90, 90, 90);
            doc.text(`${churchAddress} • ${churchCity}/${churchUF} • CNPJ: ${churchCnpj}`, 46, 30, { maxWidth: 140 });
        } else {
            doc.setFont("times", "bold");
            let headSize = 14;
            doc.setFontSize(headSize);
            while (doc.getTextWidth(churchName.toUpperCase()) > 175 && headSize > 9) {
                headSize -= 0.5;
                doc.setFontSize(headSize);
            }
            doc.setTextColor(15, 23, 42);
            doc.text(churchName.toUpperCase(), 105, 20, { align: "center", maxWidth: 175 });

            doc.setFont("times", "normal");
            doc.setFontSize(9);
            doc.setTextColor(60, 60, 60);
            doc.text("Convenção das Igrejas Evangélicas Pentecostais O Brasil Para Cristo", 105, 25, { align: "center", maxWidth: 175 });

            doc.setFontSize(8.5);
            doc.setTextColor(90, 90, 90);
            doc.text(`${churchAddress} • ${churchCity}/${churchUF} • CNPJ: ${churchCnpj}`, 105, 30, { align: "center", maxWidth: 175 });
        }

        // Linha divisória sutil do cabeçalho
        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.6);
        doc.line(20, 38, 190, 38);
        doc.setLineWidth(0.2);
        doc.line(20, 39.5, 190, 39.5);

        // Foto 3x4 (posicionada abaixo do cabeçalho à esquerda com borda, caso exista)
        const hasPhoto = !!currentPhoto;
        if (hasPhoto) {
            const photoX = 20;
            const photoY = 46;
            const photoW = 30;
            const photoH = 40;

            doc.setDrawColor(60, 70, 80);
            doc.setLineWidth(0.4);
            doc.rect(photoX, photoY, photoW, photoH);

            try {
                doc.addImage(currentPhoto, "JPEG", photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1);
            } catch (e) {
                try {
                    doc.addImage(currentPhoto, "PNG", photoX + 0.5, photoY + 0.5, photoW - 1, photoH - 1);
                } catch (err) {}
            }

            doc.setFont("times", "italic");
            doc.setFontSize(7.5);
            doc.setTextColor(100);
            doc.text("Foto 3x4", photoX + photoW / 2, photoY + photoH + 4, { align: "center" });
        }

        // Título e identificação do documento
        const titleX = hasPhoto ? 115 : 105;
        const titleY = hasPhoto ? 56 : 52;
        doc.setFont("times", "bold");
        doc.setFontSize(16);
        doc.setTextColor(15, 23, 42);
        doc.text(currentSubject.toUpperCase(), titleX, titleY, { align: "center" });

        doc.setLineWidth(0.4);
        doc.setDrawColor(140, 140, 140);
        doc.line(titleX - 45, titleY + 3.5, titleX + 45, titleY + 3.5);

        doc.setFont("times", "italic");
        doc.setFontSize(9.5);
        doc.setTextColor(100);
        doc.text("Documento Oficial Pastoral", titleX, titleY + 9, { align: "center" });

        // Corpo da carta com fonte Times New Roman elegante
        doc.setFont("times", "normal");
        doc.setFontSize(12);
        doc.setTextColor(25, 25, 25);

        let textBody = resolveTags(currentContent);
        const paragraphs = textBody.split('\n').filter(p => p.trim().length > 0);
        let cursorY = hasPhoto ? 96 : 76;

        paragraphs.forEach((paragraph) => {
            const splitP = doc.splitTextToSize(paragraph.trim(), 170);
            doc.text(splitP, 20, cursorY, { maxWidth: 170, lineHeightFactor: 1.45 });
            cursorY += (splitP.length * 6.5) + 4;
        });

        if (currentExtras) {
            cursorY += 2;
            doc.setFont("times", "italic");
            doc.setFontSize(10.5);
            doc.setTextColor(70, 70, 70);
            const splitExtras = doc.splitTextToSize(`Observações: ${currentExtras}`, 170);
            doc.text(splitExtras, 20, cursorY);
            cursorY += (splitExtras.length * 5.5) + 4;
        }

        // Cidade e Data por extenso
        const dateY = Math.max(cursorY + 12, 222);
        doc.setFont("times", "normal");
        doc.setFontSize(11);
        doc.setTextColor(30, 30, 30);
        const dateStr = `${churchCity} - ${churchUF}, ${formatFullDatePTBR(currentDate)}.`;
        doc.text(dateStr, 190, dateY, { align: "right" });

        // Linha e Assinatura Pastoral
        const sigY = Math.max(dateY + 22, 250);
        doc.setFont("times", "italic");
        doc.setFontSize(10.5);
        doc.setTextColor(60, 60, 60);
        doc.text("Fraternalmente em Cristo Jesus,", 105, sigY - 11, { align: "center" });

        doc.setDrawColor(40, 40, 40);
        doc.setLineWidth(0.4);
        doc.line(55, sigY, 155, sigY);

        doc.setFont("times", "bold");
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(currentSignature || currentPastor || churchPastor, 105, sigY + 5, { align: "center" });

        doc.setFont("times", "normal");
        doc.setFontSize(9);
        doc.setTextColor(70, 70, 70);
        doc.text(churchName, 105, sigY + 9.5, { align: "center" });

        doc.setFont("times", "italic");
        doc.setFontSize(8.5);
        doc.setTextColor(100, 100, 100);
        doc.text("Pastor Titular / Responsável", 105, sigY + 13.5, { align: "center" });

    } else if (currentType === "cert-batismo" || currentType === "cert-apresentacao") {
        if (currentTemplateId && currentTemplateId !== 'nenhum') {
            const template = customTemplates.find(t => t.id === currentTemplateId);
            if (template && template.backgroundImage) {
                try {
                    doc.addImage(template.backgroundImage, "PNG", 0, 0, 210, 297);
                } catch (e) {}
            }
        } else {
            doc.setDrawColor(0, 51, 102);
            doc.setLineWidth(5);
            doc.rect(5, 5, 200, 287);
            doc.setLineWidth(0.5);
            doc.rect(12, 12, 186, 273);
        }

        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, "PNG", 90, 15, 30, 30);
            } catch (e) {
                try {
                    doc.addImage(logoDataUrl, "JPEG", 90, 15, 30, 30);
                } catch (err) {}
            }
        }

        doc.setFont("helvetica");
        doc.setFontSize(30);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 51, 102);
        doc.text(currentSubject || "CERTIFICADO", 105, 60, { align: "center" });

        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.setFont("helvetica", "italic");
        doc.text(currentType === "cert-batismo" ? "Certificamos que" : "Certificamos que a criança", 105, 90, { align: "center" });

        doc.setFontSize(26);
        doc.setFont("helvetica", "bold");
        doc.text(currentName || (currentType === "cert-batismo" ? "Nome do Membro" : "Nome da Criança"), 105, 120, { align: "center" });

        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        let textoExtra = resolveTags(currentContent);
        if (currentDate) {
            const formattedDate = new Date(currentDate + "T00:00:00").toLocaleDateString('pt-BR');
            textoExtra += ` Realizado no dia ${formattedDate}.`;
        }
        const splitTexto = doc.splitTextToSize(textoExtra, 160);
        doc.text(splitTexto, 105, 140, { align: "center" });

        if (currentExtras) {
            doc.setFontSize(12);
            const splitExtras = doc.splitTextToSize(currentExtras, 160);
            doc.text(splitExtras, 105, 175, { align: "center" });
        }

        doc.setLineWidth(0.5);
        doc.line(30, 240, 90, 240);
        doc.line(120, 240, 180, 240);

        doc.setFontSize(12);
        if (currentType === "cert-apresentacao") {
            doc.text(currentParent || "Pais / Responsáveis", 60, 245, { align: "center" });
        } else {
            doc.text(currentSignature || currentPastor || churchPastor, 60, 245, { align: "center" });
        }
        doc.text(currentType === "cert-batismo" ? "Secretário(a)" : (currentSignature || currentPastor || churchPastor), 150, 245, { align: "center" });

    } else {
        if (currentTemplateId && currentTemplateId !== 'nenhum') {
            const template = customTemplates.find(t => t.id === currentTemplateId);
            if (template && template.backgroundImage) {
                try {
                    doc.addImage(template.backgroundImage, "PNG", 0, 0, 210, 297);
                } catch (e) {}
            }
        } else {
            doc.setDrawColor(0, 51, 102);
            doc.setLineWidth(5);
            doc.rect(5, 5, 200, 287);
            doc.setLineWidth(0.5);
            doc.rect(12, 12, 186, 273);
        }

        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, "PNG", 90, 15, 30, 30);
            } catch (e) {}
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(24);
        doc.setTextColor(0, 51, 102);
        doc.text(currentSubject || currentType.toUpperCase().replace("-", " "), 105, 60, { align: "center" });

        doc.setFontSize(20);
        doc.setTextColor(0);
        doc.text(currentName, 105, 100, { align: "center" });

        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");

        let textoExtra = resolveTags(currentContent);
        if (currentDate) {
            const formattedDate = new Date(currentDate + "T00:00:00").toLocaleDateString('pt-BR');
            textoExtra += ` Data: ${formattedDate}.`;
        }
        const splitTexto = doc.splitTextToSize(textoExtra, 160);
        doc.text(splitTexto, 105, 120, { align: "center" });

        if (currentExtras) {
            doc.setFontSize(12);
            const splitExtras = doc.splitTextToSize(currentExtras, 160);
            doc.text(splitExtras, 105, 150, { align: "center" });
        }

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text(currentSignature || currentPastor || churchPastor || "A Direção da Igreja", 105, 245, { align: "center" });
    }

    if (previewOnly) {
        return doc.output('bloburl');
    }

    if (!preventDownload) {
        doc.save(`Carta_${currentName ? currentName.replace(/\s+/g, '_') : 'Oficial'}.pdf`);
    }

    if (!targetDoc) {
        const newDoc = {
            id: Date.now().toString(),
            type: currentType,
            name: currentName || "Geral",
            date: new Date().toISOString(),
            subject: currentSubject,
            content: resolveTags(currentContent),
            rawContent: currentContent,
            templateId: currentTemplateId,
            pastor: currentPastor,
            parent: currentParent,
            signature: currentSignature,
            extras: currentExtras,
            docDate: currentDate,
            memberPhoto: currentPhoto,
            status: preventDownload ? 'pendente' : 'aprovado'
        };
        const updatedHistory = [newDoc, ...documentHistory];
        setDocumentHistory(updatedHistory);
        localStorage.setItem("churchDocumentHistory", JSON.stringify(updatedHistory));
        window.dispatchEvent(new CustomEvent('app:doc-issued', { detail: { name: newDoc.type } }));
    }

    if (!preventDownload) {
        toast.success("Documento gerado com sucesso!");
        logAction("Emissão de Documento", `Documento emitido: ${currentName || 'Geral'} (${currentType})`, user?.name || "Desconhecido");
        resetDocForm();
    }
  };

  const handleEditPendingDoc = (docItem: any) => {
    setDocType(docItem.type || 'carta-recomendacao');
    setDocName(docItem.name || "");
    setDocSubject(docItem.subject || "");
    setDocContent(docItem.rawContent || docItem.content || "");
    setDocTemplateId(docItem.templateId || "nenhum");
    setDocPastor(docItem.pastor || "");
    setDocParent(docItem.parent || "");
    setDocSignature(docItem.signature || "");
    setDocExtras(docItem.extras || "");
    setDocDate(docItem.docDate || "");
    setDocMemberPhoto(docItem.memberPhoto || null);
    
    // Remove este rascunho da fila para edição
    const remaining = documentHistory.filter((d: any) => d.id !== docItem.id);
    setDocumentHistory(remaining);
    localStorage.setItem("churchDocumentHistory", JSON.stringify(remaining));
    setDocsTab('gerar');
    toast.info("Documento carregado no formulário para edição.");
  };

  const handleDeleteDocHistory = (id: string) => {
    const updated = documentHistory.filter((d: any) => d.id !== id);
    setDocumentHistory(updated);
    localStorage.setItem("churchDocumentHistory", JSON.stringify(updated));
    toast.success("Item excluído com sucesso.");
  };

  const handleApproveDocument = (id: string, autoDownload: boolean = true) => {
    const docItem = documentHistory.find((doc: any) => doc.id === id);
    if (!docItem) return;

    if (autoDownload) {
      generateDocumentPDF(false, false, { ...docItem, status: 'aprovado' });
    }

    const updated = documentHistory.map((doc: any) => 
        doc.id === id ? { ...doc, status: 'aprovado' } : doc
    );
    setDocumentHistory(updated);
    localStorage.setItem("churchDocumentHistory", JSON.stringify(updated));
    toast.success("Documento aprovado e emitido!");
  };

  const handleEmailDocument = (docItem: any) => {
    toast.info(`Iniciando envio por e-mail para ${docItem.name || 'destinatário'}...`);
    const subject = encodeURIComponent(`Documento Oficial - ${docItem.subject || 'Carta Pastoral'} - ${docItem.name || ''}`);
    const body = encodeURIComponent(`Prezado(a) ${docItem.name || 'Irmão(ã)'},\n\nSegue a via do documento oficial emitido pela Secretaria Eclesiástica.\n\nAssunto: ${docItem.subject || ''}\nData: ${docItem.date || new Date().toLocaleDateString('pt-BR')}\n\nAtenciosamente,\nSecretaria da Igreja`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  React.useEffect(() => {
    if (docsTab === 'visualizar') {
      const url = generateDocumentPDF(true);
      setPdfPreviewUrl(url ? url.toString() : "");
    }
  }, [docsTab, docName, docContent, docTemplateId, docLogo, selectedLogoId, docSubject, docType, docExtras, docDate, docPastor, docParent, docSignature]);

  const handleSendNotice = () => {
    setIsComunicadosModalOpen(true)
  }

  const handleSaveTemplate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const category = formData.get("category") as string || "geral"
    const subject = formData.get("subject") as string || ""
    const content = formData.get("content") as string || ""
    
    let base64Image = editingTemplate?.backgroundImage || null
    const fileInput = document.getElementById('templateImage') as HTMLInputElement
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0]
      base64Image = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
    }

    let updatedTemplates;
    if (editingTemplate && editingTemplate.id) {
      updatedTemplates = customTemplates.map(t => 
        t.id === editingTemplate.id ? { ...t, name, category, subject, content, backgroundImage: base64Image } : t
      )
      toast.success("Modelo atualizado com sucesso!")
    } else {
      const newTemplate = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        category,
        subject,
        content,
        backgroundImage: base64Image
      }
      updatedTemplates = [...customTemplates, newTemplate]
      toast.success("Modelo salvo com sucesso!")
    }

    setCustomTemplates(updatedTemplates)
    localStorage.setItem("churchCustomTemplates", JSON.stringify(updatedTemplates))
    setEditingTemplate(null)
  }

  const executeDeleteTemplate = () => {
    if (templateToDelete) {
      const updated = customTemplates.filter(t => t.id !== templateToDelete.id)
      setCustomTemplates(updated)
      if (docTemplateId === templateToDelete.id) setDocTemplateId('nenhum')
      if (docType === `custom_${templateToDelete.id}`) setDocType('carta-aniversario')
      localStorage.setItem("churchCustomTemplates", JSON.stringify(updated))
      setTemplateToDelete(null)
      toast.success("Modelo excluído com sucesso.")
    }
  }

  const handleSaveLogo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    
    let base64Image = editingLogo?.dataUrl || null
    const fileInput = document.getElementById('logoImage') as HTMLInputElement
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0]
      base64Image = await new Promise((resolve) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.readAsDataURL(file)
      })
    }

    if (!base64Image) {
      toast.error("Por favor, faça upload de uma imagem.")
      return
    }

    let updatedLogos;
    if (editingLogo && editingLogo.id) {
      updatedLogos = churchLogos.map(l => 
        l.id === editingLogo.id ? { ...l, name, dataUrl: base64Image } : l
      )
      toast.success("Logo atualizada com sucesso!")
    } else {
      const newLogo = {
        id: Math.random().toString(36).substr(2, 9),
        name,
        dataUrl: base64Image
      }
      updatedLogos = [...churchLogos, newLogo]
      toast.success("Logo salva com sucesso!")
    }

    setChurchLogos(updatedLogos)
    localStorage.setItem("churchLogos", JSON.stringify(updatedLogos))
    setEditingLogo(null)
  }

  const executeDeleteLogo = (logo: any) => {
    const updated = churchLogos.filter(l => l.id !== logo.id)
    setChurchLogos(updated)
    if (selectedLogoId === logo.id) setSelectedLogoId('')
    localStorage.setItem("churchLogos", JSON.stringify(updated))
    toast.success("Logo excluída.")
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleNew = () => handleOpenAddModal();
    const handleSave = () => {
        if (isMemberModalOpen) {
            const form = document.getElementById('memberForm') as HTMLFormElement;
            if (form) form.requestSubmit();
        }
    };
    window.addEventListener('app:new-record', handleNew);
    window.addEventListener('app:save-record', handleSave);
    return () => {
        window.removeEventListener('app:new-record', handleNew);
        window.removeEventListener('app:save-record', handleSave);
    };
  }, [isMemberModalOpen]);

  const handleOpenAddModal = () => {
    setEditingMember(null)
    setPhotoPreview(null)
    setScannedDocs([])
    setMemberBranch(activeBranch !== 'all' ? activeBranch : (branches[0]?.id || "sede"))
    setMemberStatus("Ativo")
    setMemberSexo("Masculino")
    setMemberCivil("Solteiro(a)")
    setMemberRole("Membro")
    setMemberCommunications([])
    setNewCommNotes("")
    setNewCommDate(new Date().toISOString().split('T')[0])
    setNewCommType("Visita Pastoral")
    setNewCommResponsible("")
    setMemberSignatureUrl("")
    setMemberSignatureFileName("")
    setIsMemberModalOpen(true)
  }

  const handleOpenFullFormWithContact = (contact: any) => {
    const bId = contact.branchId || (activeBranch !== 'all' ? activeBranch : 'sede');
    setEditingMember({
      name: contact.name || "",
      phone: contact.phone || "",
      email: contact.email || "",
      dataNascimento: contact.birthDate || "",
      endereco: contact.address || "",
      bairro: contact.bairro || "",
      cidade: contact.cidade || "",
      cep: contact.cep || "",
      role: contact.role || "Membro",
      branchId: bId,
      status: "Ativo"
    });
    setMemberBranch(bId);
    setMemberStatus("Ativo");
    setMemberSexo("Masculino");
    setMemberCivil("Solteiro(a)");
    setMemberRole(contact.role || "Membro");
    setPhotoPreview(null);
    setScannedDocs([]);
    setMemberCommunications([]);
    setNewCommNotes("");
    setMemberSignatureUrl("");
    setMemberSignatureFileName("");
    setIsMemberModalOpen(true);
  }

  const handleOpenEditModal = (member: any) => {
    setEditingMember(member)
    setPhotoPreview(member.photoUrl || null)
    setScannedDocs(member.scannedDocs || [])
    setMemberBranch(member.branchId || (activeBranch !== 'all' ? activeBranch : (branches[0]?.id || "sede")))
    setMemberStatus(member.status || "Ativo")
    setMemberSexo(member.sexo || "Masculino")
    setMemberCivil(normalizeCivilStatus(member.estadoCivil))
    setMemberRole(member.role || "Membro")
    setMemberCommunications(member.communications || [])
    setNewCommNotes("")
    setNewCommDate(new Date().toISOString().split('T')[0])
    setNewCommType("Visita Pastoral")
    setNewCommResponsible("")
    setMemberSignatureUrl(member.signatureUrl || "")
    setMemberSignatureFileName(member.signatureFileName || "")
    setIsMemberModalOpen(true)
  }

  // Abertura e cálculo elegante do número sequencial da Ficha de Membro
  const handleOpenFicha = (member: any) => {
    if (!member) return;
    setFichaMemberTarget(member);
    const sorted = [...members].sort((a: any, b: any) => (a.name || "").localeCompare(b.name || ""));
    const memberIdx = sorted.findIndex((x: any) => x.id === member.id);
    const calculatedSeq = memberIdx >= 0
      ? String(memberIdx + 1).padStart(4, "0")
      : (member.numeroFicha ? String(member.numeroFicha).padStart(4, "0") : "0001");
    setCustomFichaSeq(calculatedSeq);
    setIsFichaMembroModalOpen(true);
  };

  // Impressão da Ficha de Cadastro com fallback
  const handlePrintFicha = () => {
    toast.info("Iniciando impressão da Ficha Oficial...");
    const ok = printDocument(undefined, undefined, 'printable-ficha-membro');
    if (!ok) {
      toast.warning("Impressão direta não suportada nesta tela. Baixando PDF oficial...");
      handleDownloadFichaPdf();
    } else {
      toast.success("Ficha enviada para impressão!");
    }
  };

  // Download direto em PDF de alta qualidade da Ficha
  const handleDownloadFichaPdf = async () => {
    const toastId = toast.loading("Gerando arquivo PDF da Ficha de Cadastro...");
    const memberName = fichaMemberTarget?.name || fichaMemberTarget?.nome || "Membro";
    const safeName = memberName.replace(/[^a-zA-Z0-9]/g, "_");
    const seq = customFichaSeq || "0001";
    const success = await downloadElementAsPdf("printable-ficha-membro", `Ficha_Membro_${seq}_${safeName}.pdf`);
    toast.dismiss(toastId);
    if (success) {
      toast.success("Ficha de Membro baixada em PDF com sucesso!");
    } else {
      toast.error("Erro ao gerar PDF da ficha. Tente a opção Imprimir.");
    }
  };

  // Salvar registro de visita / comunicação pastoral com persistência imediata no Firestore
  const handleAddCommunicationRecord = async () => {
    if (!newCommNotes.trim()) {
      toast.error("Por favor, preencha as observações do registro pastoral.");
      return;
    }

    const newComm = {
      id: Date.now().toString(),
      date: newCommDate || new Date().toISOString().split('T')[0],
      type: newCommType || "Visita Pastoral",
      responsible: newCommResponsible.trim() || user?.name || "Pastor / Secretaria",
      notes: newCommNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    const updatedComms = [newComm, ...(memberCommunications || [])];
    setMemberCommunications(updatedComms);

    if (editingMember && editingMember.id && typeof editingMember.id === 'string' && !editingMember.id.startsWith('temp_')) {
      setIsSavingComm(true);
      try {
        await updateDoc(doc(db, "members", editingMember.id), {
          communications: updatedComms,
        });
        setMembers((prev: any) => {
          const next = prev.map((m: any) => m.id === editingMember.id ? { ...m, communications: updatedComms } : m);
          localStorage.setItem("churchMembers", JSON.stringify(next));
          return next;
        });
        setEditingMember((prev: any) => ({ ...prev, communications: updatedComms }));
        toast.success("Registro de visita/contato salvo com sucesso no histórico!");
      } catch (err) {
        console.warn("Firestore update error, saving to local state:", err);
        setMembers((prev: any) => {
          const next = prev.map((m: any) => m.id === editingMember.id ? { ...m, communications: updatedComms } : m);
          localStorage.setItem("churchMembers", JSON.stringify(next));
          return next;
        });
        setEditingMember((prev: any) => ({ ...prev, communications: updatedComms }));
        toast.success("Registro salvo no histórico!");
      } finally {
        setIsSavingComm(false);
      }
    } else {
      toast.success("Registro adicionado à ficha deste novo membro!");
    }

    setNewCommNotes("");
  };

  const handleDeleteCommunicationRecord = async (commId: string) => {
    const updatedComms = (memberCommunications || []).filter((c: any) => c.id !== commId);
    setMemberCommunications(updatedComms);

    if (editingMember && editingMember.id && typeof editingMember.id === 'string' && !editingMember.id.startsWith('temp_')) {
      try {
        await updateDoc(doc(db, "members", editingMember.id), {
          communications: updatedComms,
        });
        setMembers((prev: any) => {
          const next = prev.map((m: any) => m.id === editingMember.id ? { ...m, communications: updatedComms } : m);
          localStorage.setItem("churchMembers", JSON.stringify(next));
          return next;
        });
        setEditingMember((prev: any) => ({ ...prev, communications: updatedComms }));
        toast.success("Registro removido do histórico.");
      } catch (err) {
        console.warn("Erro ao remover registro:", err);
      }
    }
  };


  const [isUploading, setIsUploading] = useState(false);

  const handleUploadDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      toast.error("Usuário não autenticado para upload.");
      return;
    }

    try {
      setIsUploading(true);
      const storageRef = ref(storage, `docs/${Date.now()}_${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      uploadTask.on('state_changed', 
        (snapshot) => {
          // Progress can be tracked here if needed
        }, 
        (error) => {
          console.error("Upload error:", error);
          toast.error("Erro ao fazer upload do documento.");
          setIsUploading(false);
        }, 
        async () => {
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setScannedDocs(prev => [...prev, downloadURL]);
          toast.success("Documento anexado com sucesso!");
          setIsUploading(false);
        }
      );
    } catch (error) {
      console.error(error);
      toast.error("Erro ao anexar documento.");
      setIsUploading(false);
    }
  };

  const executeDeleteMember = async () => {
    if (memberToDelete) {
      const memObj = members.find((m: any) => m.id === memberToDelete.id) || memberToDelete;
      const targetId = memberToDelete.id;

      // Update state and local storage immediately
      const updatedMembers = members.filter((m: any) => m.id !== targetId);
      setMembers(updatedMembers);
      localStorage.setItem("churchMembers", JSON.stringify(updatedMembers));
      setSelectedMemberIds(prev => prev.filter(id => id !== targetId.toString()));

      if (typeof targetId === 'string' && targetId.length > 5) {
        try {
          await deleteDoc(doc(db, "members", targetId));
        } catch (e: any) {
          console.warn("Firestore deleteDoc error, maintaining local deletion:", e);
        }
      }
      toast.success("Membro excluído com sucesso!");
      logAction("Exclusão de Membro", `Membro deletado: ${memObj?.name || "Membro"}`, user?.name || "Desconhecido");
      setMemberToDelete(null);
    }
  };

  const executeBulkDeleteMembers = async () => {
    if (selectedMemberIds.length === 0) return;
    const idsToDelete = new Set(selectedMemberIds);
    const updatedMembers = members.filter((m: any) => !idsToDelete.has(m.id.toString()));
    setMembers(updatedMembers);
    localStorage.setItem("churchMembers", JSON.stringify(updatedMembers));

    for (const id of selectedMemberIds) {
      if (typeof id === 'string' && id.length > 5) {
        try {
          await deleteDoc(doc(db, "members", id));
        } catch (e) {
          console.warn("Firestore bulk delete error for id:", id, e);
        }
      }
    }

    const count = idsToDelete.size;
    setSelectedMemberIds([]);
    setIsBulkDeleteModalOpen(false);
    toast.success(`${count} membro(s) excluído(s) com sucesso!`);
    logAction("Exclusão em Massa de Membros", `${count} membros excluídos`, user?.name || "Desconhecido");
  };

  const executeClearAllMembers = async () => {
    const totalCount = members.length;
    for (const m of members) {
      if (typeof m.id === 'string' && m.id.length > 5) {
        try {
          await deleteDoc(doc(db, "members", m.id));
        } catch (e) {
          console.warn("Firestore clear error:", e);
        }
      }
    }
    setMembers([]);
    localStorage.setItem("churchMembers", "[]");
    setSelectedMemberIds([]);
    setIsClearAllModalOpen(false);
    toast.success("Todos os dados de membros foram apagados com sucesso!");
    logAction("Limpeza Total de Membros", `Todos os ${totalCount} membros foram apagados`, user?.name || "Desconhecido");
  };

  const handleSeedSampleMembers = () => {
    const sample = [
      {
        id: "mem_" + Date.now().toString(),
        name: "Carlos Eduardo da Silva",
        email: "carlos.silva@obpc.com.br",
        phone: "(11) 98765-4321",
        role: "Pastor Auxiliar",
        status: "Ativo",
        rg: "12.345.678-9",
        cpf: "123.456.789-00",
        filiacao: "José Silva e Maria Silva",
        pai: "José Silva",
        mae: "Maria Silva",
        naturalidade: "São Paulo/SP",
        sexo: "Masculino",
        dataNascimento: "15/04/1985",
        estadoCivil: "Casado(a)",
        dataBatismo: "20/10/2000",
        membroDesde: "10/01/2010",
        validade: "31/12/2026",
        endereco: "Rua Bartolomeu Bueno, 629",
        bairro: "Santa Casa",
        cidade: "Valparaíso",
        cep: "16880-000",
        branchId: "sede",
        tags: ["Pastoral", "Pregador"]
      }
    ];
    setMembers(sample);
    localStorage.setItem("churchMembers", JSON.stringify(sample));
    toast.success("Membro exemplo carregado!");
  };

  const parseBRDateForInput = (dateString: string) => {
    if (!dateString) return "";
    if (dateString.includes("/")) {
      const [d, m, y] = dateString.split("/");
      return `${y}-${m}-${d}`;
    }
    return dateString;
  };

  const formatToBRDate = (dateString: string) => {
    if (!dateString) return "";
    if (dateString.includes("-")) {
      const [y, m, d] = dateString.split("-");
      return `${d}/${m}/${y}`;
    }
    return dateString;
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    value = formatCPF(value);
    e.target.value = value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 10) {
      value = value.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    } else if (value.length > 6) {
      value = value.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    } else if (value.length > 2) {
      value = value.replace(/(\d{2})(\d{0,5})/, "($1) $2");
    }
    e.target.value = value;
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 8) value = value.slice(0, 8);
    value = value.replace(/(\d{5})(\d)/, "$1-$2");
    e.target.value = value;
  };

  const validateCpf = (cpfStr: string) => {
    return isValidCPFOrCNPJ(cpfStr);
  };

  const handleSaveMember = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    
    const isValid = validateForm([
      { field: 'Nome Completo', value: formData.get("name"), required: true },
      { field: 'Cargo', value: formData.get("role"), required: true },
      { field: 'CPF', value: formData.get("cpf"), type: 'cpf', required: false, custom: (val) => val ? validateCpf(val as string) : true, message: "CPF inválido. Verifique o número digitado." }
    ]);
    
    if (!isValid) return;

    const cpf = formData.get("cpf") as string;

    const memberData = {
      branchId: memberBranch || (activeBranch !== 'all' ? activeBranch : (branches[0]?.id || "sede")),
      name: (formData.get("name") as string)?.trim() || "",
      email: (formData.get("email") as string)?.trim() || "",
      phone: (formData.get("phone") as string)?.trim() || "",
      role: (formData.get("role") as string)?.trim() || "Membro",
      status: memberStatus || "Ativo",
      rg: (formData.get("rg") as string)?.trim() || "",
      cpf: cpf || "",
      filiacao: (formData.get("filiacao") as string)?.trim() || "",
      pai: (formData.get("pai") as string)?.trim() || "",
      mae: (formData.get("mae") as string)?.trim() || "",
      naturalidade: (formData.get("naturalidade") as string)?.trim() || "",
      sexo: memberSexo || "Masculino",
      dataNascimento: formatToBRDate(formData.get("dataNascimento") as string),
      estadoCivil: memberCivil || "Solteiro(a)",
      dataBatismo: formatToBRDate(formData.get("dataBatismo") as string),
      membroDesde: formatToBRDate(formData.get("membroDesde") as string),
      validade: formatToBRDate(formData.get("validade") as string),
      endereco: (formData.get("endereco") as string)?.trim() || "",
      bairro: (formData.get("bairro") as string)?.trim() || "",
      cidade: (formData.get("cidade") as string)?.trim() || "",
      cep: (formData.get("cep") as string)?.trim() || "",
      photoUrl: photoPreview || editingMember?.photoUrl || "",
      scannedDocs: scannedDocs,
      tags: (formData.get("tags") as string || "").split(",").map(t => t.trim()).filter(Boolean),
      communications: memberCommunications || editingMember?.communications || [],
      signatureUrl: memberSignatureUrl || editingMember?.signatureUrl || "",
      signatureFileName: memberSignatureFileName || editingMember?.signatureFileName || "",
    }

    const actionName = editingMember ? "Edição de Membro" : "Criação de Membro";
    const details = editingMember ? `Cadastro alterado: ${memberData.name}` : `Novo membro cadastrado: ${memberData.name}`;
    
    const operation = async () => {
       if (editingMember) {
          const targetId = editingMember.id;
          if (typeof targetId === 'string' && targetId.length > 5) {
             try {
                await updateDoc(doc(db, "members", targetId), memberData);
             } catch (err) {
                console.warn("Firestore updateDoc error, saving locally:", err);
             }
          }
          const updated = members.map((m: any) => m.id === targetId ? { ...m, ...memberData, id: targetId } : m);
          setMembers(updated);
          localStorage.setItem("churchMembers", JSON.stringify(updated));
       } else {
          let newId = "mem_" + Date.now().toString();
          try {
             const docRef = await addDoc(collection(db, "members"), { ...memberData, createdAt: serverTimestamp() });
             newId = docRef.id;
          } catch (err) {
             console.warn("Firestore addDoc error, saving locally:", err);
          }
          const newMember = { id: newId, ...memberData };
          const updated = [newMember, ...members];
          setMembers(updated);
          localStorage.setItem("churchMembers", JSON.stringify(updated));
       }
    };

    const res = await executeDbOperation({
       operation,
       actionName,
       successMessage: editingMember ? "Membro atualizado com sucesso!" : "Membro cadastrado com sucesso!",
       userName: user?.name || "Desconhecido"
    });

    if (res.success) {
      setIsMemberModalOpen(false)
      setEditingMember(null)
    } else {
      logCriticalError({
        error: res.error,
        source: "database",
        severity: "critical",
        message: `Falha ao salvar membro: ${actionName}`,
        context: { memberData, editingId: editingMember?.id }
      });
    }
  }

  return (
    <TooltipProvider>
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">Secretaria</h2>
              <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-primary/30 bg-primary/5 text-primary flex items-center gap-1.5 font-medium">
                <Building2 className="w-3.5 h-3.5" />
                {activeBranchName}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">Gestão completa de membros, certificações e ferramentas de comunicação.</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-3 sm:mt-0">
            <Button 
              onClick={() => setIsVCardQrModalOpen(true)} 
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs text-xs sm:text-sm h-9 sm:h-10 px-3.5" 
            >
              <QrCode className="mr-1.5 h-4 w-4" /> Importar QR / VCard
            </Button>
            <Button 
              onClick={() => setIsScannerOpen(true)} 
              variant="outline"
              className="border-border text-foreground hover:bg-muted font-medium shadow-xs text-xs sm:text-sm h-9 sm:h-10 px-3.5" 
            >
              <Camera className="mr-1.5 h-4 w-4 text-blue-600" /> Digitalizar Doc
            </Button>
            <Button 
              onClick={() => setIsPdfExportModalOpen(true)} 
              variant="outline"
              className="border-primary/40 text-primary hover:bg-primary/10 font-semibold shadow-xs text-xs sm:text-sm h-9 sm:h-10 px-3.5" 
            >
              <Printer className="mr-1.5 h-4 w-4 text-primary" /> Exportar PDF / Imprimir
            </Button>
            <Button onClick={handleOpenAddModal} className="bg-primary text-primary-foreground shadow-xs hover:shadow-md transition-all font-semibold text-xs sm:text-sm h-9 sm:h-10 px-4">
              <Plus className="mr-1.5 h-4 w-4" /> Novo Membro
            </Button>
          </div>
        </div> {/* CLOSE HEADER DIV */}

        {/* Dashboard Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Membros Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{branchMembers.filter(m => m.status === 'Ativo').length}</div>
              <p className="text-xs text-muted-foreground mt-1">Total na congregação</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Novos Inscritos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {branchMembers.filter(m => {
                  if (!m.membroDesde) return false;
                  const parts = m.membroDesde.split('/');
                  if (parts.length === 3) {
                     return parseInt(parts[1], 10) === new Date().getMonth() + 1 && parseInt(parts[2], 10) === new Date().getFullYear();
                  }
                  return false;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Neste mês</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Batizados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{branchMembers.filter(m => !!m.dataBatismo).length}</div>
              <p className="text-xs text-muted-foreground mt-1">Total histórico</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Aniversariantes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">
                {branchMembers.filter(m => {
                  if (!m.dataNascimento) return false;
                  const parts = m.dataNascimento.split('/');
                  if (parts.length === 3) {
                     return parseInt(parts[1], 10) === new Date().getMonth() + 1;
                  }
                  return false;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Neste mês</p>
            </CardContent>
          </Card>
        </div>

        {/* Aniversariantes List */}
        <Card className="mt-4">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" /> Aniversariantes do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4">
              {branchMembers.filter(m => {
                if (!m.dataNascimento) return false;
                const parts = m.dataNascimento.split('/');
                if (parts.length === 3) return parseInt(parts[1], 10) === new Date().getMonth() + 1;
                return false;
              }).sort((a, b) => parseInt(a.dataNascimento.split('/')[0], 10) - parseInt(b.dataNascimento.split('/')[0], 10))
                .map(m => (
                <div key={m.id} className="flex flex-col items-start border rounded-lg p-3 bg-slate-50 dark:bg-slate-900/50 min-w-[200px] flex-1">
                  <div className="font-semibold text-sm text-foreground">{m.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-between w-full mt-1">
                    <span>{m.dataNascimento.substring(0, 5)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs px-2 text-pink-600 hover:text-pink-700 hover:bg-pink-50 dark:hover:bg-pink-950 font-medium"
                      onClick={() => {
                        setWhatsAppMemberTarget(m);
                        setWhatsAppDefaultTemplate("birthday");
                        setIsMemberWhatsAppModalOpen(true);
                      }}
                    >
                      Mensagem
                    </Button>
                  </div>
                </div>
              ))}
              {branchMembers.filter(m => {
                if (!m.dataNascimento) return false;
                const parts = m.dataNascimento.split('/');
                if (parts.length === 3) return parseInt(parts[1], 10) === new Date().getMonth() + 1;
                return false;
              }).length === 0 && <span className="text-sm text-muted-foreground">Nenhum aniversariante este mês.</span>}
            </div>
          </CardContent>
        </Card>

        {/* FRAME 1: DOCUMENTOS, COMUNICADOS & RELATÓRIOS OFICIAIS */}
        <Card className="mt-4">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Documentos, Comunicados & Relatórios Oficiais
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Emissão de cartas pastorais, certificados solenes, carteirinhas de membros e comunicados institucionais.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 w-full">
              <Dialog open={isDocsModalOpen} onOpenChange={setIsDocsModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-auto flex-col items-start p-4 gap-2 border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5 transition-all text-left w-full shadow-sm">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Documentos</div>
                  <div className="text-xs text-muted-foreground font-normal">Cartas e certificados</div>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-6">
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <div className="bg-primary/10 text-primary p-2 rounded-lg">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-xl">Emissão de Documentos e Cartas Pastorais</DialogTitle>
                    <DialogDescription>
                      Emissão timbrada oficial em A4 retrato, certificados solenes e pasta de aprovações.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {/* Menus realçados com estilo profissional e harmônico */}
              <div className="flex items-center gap-1.5 p-1 bg-muted/60 dark:bg-muted/30 rounded-lg border border-border/60 overflow-x-auto mb-2">
                <button 
                  type="button"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                    docsTab === 'gerar' 
                      ? 'bg-primary text-primary-foreground shadow-xs' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                  }`}
                  onClick={() => setDocsTab('gerar')}
                >
                  <FilePlus2 className="w-3.5 h-3.5" />
                  Nova Carta / Documento
                </button>

                <button 
                  type="button"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                    docsTab === 'aprovacoes' 
                      ? 'bg-amber-600 text-white shadow-xs' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                  }`}
                  onClick={() => setDocsTab('aprovacoes')}
                >
                  <FolderClock className="w-3.5 h-3.5" />
                  Pasta p/ Aprovação
                  {documentHistory.filter((d: any) => d.status === 'pendente').length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      docsTab === 'aprovacoes' ? 'bg-white text-amber-700' : 'bg-amber-500/20 text-amber-600'
                    }`}>
                      {documentHistory.filter((d: any) => d.status === 'pendente').length}
                    </span>
                  )}
                </button>

                <button 
                  type="button"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                    docsTab === 'visualizar' 
                      ? 'bg-primary text-primary-foreground shadow-xs' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                  }`}
                  onClick={() => {
                    const url = generateDocumentPDF(true);
                    setPdfPreviewUrl(url ? url.toString() : "");
                    setDocsTab('visualizar');
                  }}
                >
                  <Eye className="w-3.5 h-3.5" />
                  Visualização A4
                </button>

                <button 
                  type="button"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                    docsTab === 'historico' 
                      ? 'bg-primary text-primary-foreground shadow-xs' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                  }`}
                  onClick={() => setDocsTab('historico')}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Histórico Emitido
                  {documentHistory.filter((d: any) => !d.status || d.status === 'aprovado').length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/20 text-primary font-bold">
                      {documentHistory.filter((d: any) => !d.status || d.status === 'aprovado').length}
                    </span>
                  )}
                </button>

                <button 
                  type="button"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                    docsTab === 'modelos' 
                      ? 'bg-primary text-primary-foreground shadow-xs' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                  }`}
                  onClick={() => setDocsTab('modelos')}
                >
                  <Layers className="w-3.5 h-3.5" />
                  Modelos de Fundo
                </button>

                <button 
                  type="button"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap ${
                    docsTab === 'logos' 
                      ? 'bg-primary text-primary-foreground shadow-xs' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
                  }`}
                  onClick={() => setDocsTab('logos')}
                >
                  <ImageIcon className="w-3.5 h-3.5" />
                  Logos
                </button>
              </div>

              {docsTab === 'gerar' && (
                <>
                  <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Coluna Esquerda: Membro, Foto 3x4, Dados Oficiais */}
                      <div className="space-y-3 bg-muted/20 p-3.5 rounded-lg border">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold">1. Selecionar Membro Cadastrado</Label>
                            {selectedMemberDoc && (
                              <button 
                                type="button" 
                                onClick={() => {
                                  setSelectedMemberDoc(null);
                                  setDocName("");
                                  setDocMemberPhoto(null);
                                }}
                                className="text-[10px] text-muted-foreground hover:text-red-500 underline"
                              >
                                Limpar seleção
                              </button>
                            )}
                          </div>
                          <Select 
                            value={selectedMemberDoc?.id ? selectedMemberDoc.id.toString() : "__none__"} 
                            onValueChange={(val) => {
                              if (val === "__none__" || !val) {
                                setSelectedMemberDoc(null);
                                setDocName("");
                                setDocMemberPhoto(null);
                                return;
                              }
                              const m = members.find((x: any) => (x.id || "").toString() === val);
                              if (m) {
                                setSelectedMemberDoc(m);
                                const chosenName = m.name || m.nome || "";
                                setDocName(chosenName);
                                setDocMemberPhoto(m.photoUrl || null);
                                if (chosenName) {
                                  setDocContent(prev => {
                                    if (prev.includes("{NOME_MEMBRO}")) {
                                      return prev.replace(/\{NOME_MEMBRO\}|\[NOME_MEMBRO\]/g, chosenName);
                                    }
                                    return prev;
                                  });
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="bg-background">
                              <SelectValue placeholder="Selecione um membro para preencher..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                              <SelectItem value="__none__">-- Deixar em branco (Preenchimento Manual) --</SelectItem>
                              {members.map((m: any) => {
                                const memName = m.name || m.nome || "Membro";
                                return (
                                  <SelectItem key={m.id || Math.random().toString()} value={(m.id || "").toString()}>
                                    {memName} {m.role ? `(${m.role})` : ''} {m.cpf ? `• CPF: ${m.cpf}` : ''}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Foto 3x4 com moldura elegante para carta oficial */}
                        <div className="p-3 bg-background rounded-md border flex items-center gap-3">
                          <div className="w-16 h-20 border-2 border-slate-300 dark:border-slate-700 rounded overflow-hidden flex flex-col items-center justify-center bg-muted/40 shrink-0 shadow-xs relative">
                            {docMemberPhoto ? (
                              <img src={docMemberPhoto} alt="Foto 3x4" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center p-1 text-muted-foreground flex flex-col items-center">
                                <User className="w-5 h-5 mb-0.5 opacity-40" />
                                <span className="text-[9px] font-medium leading-none">Foto 3x4</span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 text-xs flex-1">
                            <p className="font-semibold text-foreground">Foto 3x4 do Membro (Carta Oficial)</p>
                            <p className="text-[11px] text-muted-foreground">Posicionada abaixo do cabeçalho à esquerda com borda, conforme solicitação.</p>
                            <div className="flex gap-2 pt-1">
                              <label className="cursor-pointer inline-flex items-center px-2 py-1 rounded bg-secondary hover:bg-secondary/80 text-[11px] font-medium transition-colors">
                                {docMemberPhoto ? "Trocar Foto" : "Inserir Foto"}
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  className="hidden" 
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      const reader = new FileReader();
                                      reader.onloadend = () => {
                                        setDocMemberPhoto(reader.result as string);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }} 
                                />
                              </label>
                              {docMemberPhoto && (
                                <button 
                                  type="button" 
                                  className="text-red-500 hover:text-red-700 text-[11px] font-medium"
                                  onClick={() => setDocMemberPhoto(null)}
                                >
                                  Remover
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Nome Destinatário / Solicitante</Label>
                          <Input 
                            value={docName} 
                            onChange={(e) => setDocName(e.target.value)} 
                            placeholder="Ex: João da Silva (ou deixe vazio para preencher à mão)" 
                            className="bg-background"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            {docName.trim() 
                              ? `Nome preenchido: "${docName}"` 
                              : "Deixando em branco, a impressão incluirá linha contínua para preenchimento manual."}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Tipo de Documento</Label>
                            <Select value={docType} onValueChange={handleDocTypeChange}>
                              <SelectTrigger className="bg-background"><SelectValue placeholder="Tipo" /></SelectTrigger>
                              <SelectContent>
                                <optgroup label="Cartas Oficiais">
                                  <SelectItem value="carta-recomendacao">Carta de Recomendação</SelectItem>
                                  <SelectItem value="carta-despedida">Carta de Transferência / Despedida</SelectItem>
                                  <SelectItem value="carta-recebimento">Carta de Recebimento</SelectItem>
                                  <SelectItem value="carta-aniversario">Carta de Aniversário</SelectItem>
                                  <SelectItem value="ata-reuniao">Ata de Reunião</SelectItem>
                                </optgroup>
                                <optgroup label="Declarações e Certificados">
                                  <SelectItem value="declaracao-batismo">Declaração de Batismo nas Águas</SelectItem>
                                  <SelectItem value="cert-batismo">Certificado de Batismo</SelectItem>
                                  <SelectItem value="cert-apresentacao">Apresentação de Criança</SelectItem>
                                  <SelectItem value="cert-discipulado">Certificado de Discipulado</SelectItem>
                                  <SelectItem value="cert-visitante">Lembrança de Visitante</SelectItem>
                                </optgroup>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Data da Emissão</Label>
                            <Input 
                              type="date" 
                              value={docDate} 
                              onChange={(e) => setDocDate(e.target.value)} 
                              className="bg-background text-xs"
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Pastor Titular / Assinatura</Label>
                          <Input 
                            value={docSignature || docPastor} 
                            onChange={(e) => {
                              setDocSignature(e.target.value);
                              setDocPastor(e.target.value);
                            }} 
                            placeholder={`Ex: ${activeBranchObj?.pastor || churchData?.pastorPresidente || "Pr. Titular"}`} 
                            className="bg-background"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold">Logo da Igreja</Label>
                          <Select value={selectedLogoId} onValueChange={setSelectedLogoId}>
                            <SelectTrigger className="bg-background"><SelectValue placeholder="Logo oficial do cabeçalho" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem logo</SelectItem>
                              {churchLogos.map((l: any) => (
                                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Coluna Direita: Conteúdo da Carta, Assunto, Observações */}
                      <div className="space-y-3 bg-muted/20 p-3.5 rounded-lg border flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Assunto / Título do Documento</Label>
                            <Input 
                              value={docSubject} 
                              onChange={(e) => setDocSubject(e.target.value)} 
                              placeholder="Ex: CARTA DE RECOMENDAÇÃO" 
                              className="bg-background font-semibold"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-xs font-semibold">Corpo da Carta / Conteúdo</Label>
                              <span className="text-[10px] text-muted-foreground">Times New Roman • A4 Retrato</span>
                            </div>
                            <Textarea 
                              value={docContent} 
                              onChange={(e) => setDocContent(e.target.value)} 
                              placeholder="Texto oficial da carta..." 
                              rows={8} 
                              className="bg-background font-serif text-sm leading-relaxed"
                            />
                            <p className="text-[11px] text-muted-foreground">
                              Variáveis dinâmicas: <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{"{NOME_MEMBRO}"}</code>, <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{"{CARGO_IGREJA}"}</code>, <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{"{DATA_ATUAL}"}</code>
                            </p>
                          </div>

                          <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Observações / Detalhes de Rodapé (Opcional)</Label>
                            <Input 
                              value={docExtras} 
                              onChange={(e) => setDocExtras(e.target.value)} 
                              placeholder="Ex: Válida por 60 dias a contar desta data." 
                              className="bg-background"
                            />
                          </div>
                        </div>

                        <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
                          <span>Igreja selecionada: <strong>{activeBranchObj?.name || churchData?.nome || "Sede"}</strong></span>
                          <span>{activeBranchObj?.cidade || "Valparaíso"} - {activeBranchObj?.uf || "SP"}</span>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Rodapé com botões de Salvar na Pasta para Aprovação e Emitir Oficialmente */}
                  <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between w-full pt-3 border-t mt-2">
                    <Button 
                      type="button" 
                      variant="outline" 
                      className="border-amber-400 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-semibold"
                      onClick={handleSaveToPendingFolder}
                    >
                      <FolderClock className="w-4 h-4 mr-2 text-amber-600" />
                      Salvar na Pasta p/ Aprovação
                    </Button>

                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          const url = generateDocumentPDF(true);
                          setPdfPreviewUrl(url ? url.toString() : "");
                          setDocsTab('visualizar');
                        }}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizar Impressão
                      </Button>

                      <Button 
                        type="button"
                        className="bg-primary text-primary-foreground font-semibold shadow-xs hover:shadow-md"
                        onClick={() => generateDocumentPDF(false, false)}
                      >
                        <Printer className="w-4 h-4 mr-2" />
                        Emitir Carta Oficial (A4)
                      </Button>
                    </div>
                  </DialogFooter>
                </>
              )}

              {/* Aba da Pasta de Aprovações (Anexo 6) */}
              {docsTab === 'aprovacoes' && (
                <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <FolderClock className="w-4 h-4 text-amber-600" />
                        Pasta de Documentos Aguardando Aprovação
                      </h4>
                      <p className="text-amber-700 dark:text-amber-400 text-[11px] mt-0.5">
                        Documentos guardados como rascunho para conferência prévia da liderança pastoral antes da expedição e assinatura final.
                      </p>
                    </div>
                    <Button 
                      type="button" 
                      size="sm" 
                      variant="outline" 
                      className="text-xs border-amber-400 text-amber-800 dark:text-amber-300 hover:bg-amber-100/50"
                      onClick={() => setDocsTab('gerar')}
                    >
                      <FilePlus2 className="w-3.5 h-3.5 mr-1" /> Criar Novo Rascunho
                    </Button>
                  </div>

                  {documentHistory.filter((d: any) => d.status === 'pendente').length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-lg flex flex-col items-center justify-center">
                      <FolderClock className="w-10 h-10 text-muted-foreground/40 mb-2" />
                      <p className="font-medium">Nenhum documento pendente de aprovação nesta pasta.</p>
                      <p className="text-xs text-muted-foreground mt-1">Ao preparar uma carta ou certificado, clique em "Salvar na Pasta p/ Aprovação".</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {documentHistory.filter((d: any) => d.status === 'pendente').map((docItem: any) => (
                        <div key={docItem.id} className="p-3.5 border rounded-lg shadow-xs bg-card hover:border-amber-400 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            {docItem.memberPhoto ? (
                              <div className="w-10 h-13 border rounded overflow-hidden shrink-0 shadow-xs">
                                <img src={docItem.memberPhoto} alt="3x4" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-10 h-13 bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/50 rounded flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                            )}

                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-foreground">{docItem.subject || "Documento Oficial"}</span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 font-semibold border border-amber-300/60">
                                  Pendente de Aprovação
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground font-medium">Destinatário: <span className="text-foreground">{docItem.name}</span></p>
                              <p className="text-[11px] text-muted-foreground line-clamp-1 italic">"{docItem.content?.slice(0, 95)}..."</p>
                              <p className="text-[10px] text-muted-foreground">Guardado em: {new Date(docItem.date).toLocaleString('pt-BR')}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                            <Button 
                              size="sm" 
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                              onClick={() => handleApproveDocument(docItem.id, true)}
                            >
                              <Check className="w-3.5 h-3.5 mr-1" />
                              Aprovar & Emitir (A4)
                            </Button>

                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs"
                              onClick={() => {
                                const url = generateDocumentPDF(true, false, docItem);
                                setPdfPreviewUrl(url ? url.toString() : "");
                                setDocsTab('visualizar');
                              }}
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              Prévia
                            </Button>

                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-xs"
                              onClick={() => handleEditPendingDoc(docItem)}
                            >
                              <Edit className="w-3.5 h-3.5 mr-1" />
                              Editar
                            </Button>

                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs px-2"
                              onClick={() => handleDeleteDocHistory(docItem.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Aba de Visualização A4 */}
              {docsTab === 'visualizar' && (
                <div className="flex flex-col space-y-3 flex-1 min-h-[500px]">
                  <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border">
                    <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-primary" /> Prévia da Carta / Documento em Alta Definição (A4)
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => setDocsTab('gerar')}
                      >
                        <Edit className="w-3.5 h-3.5 mr-1" /> Voltar ao Editor
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="bg-primary text-primary-foreground font-semibold text-xs shadow-xs"
                        onClick={() => generateDocumentPDF(false, false)}
                      >
                        <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir / Baixar PDF Oficial
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center p-2 bg-muted/30 overflow-hidden flex-1 min-h-[460px] rounded-lg border">
                    {pdfPreviewUrl ? (
                      <iframe src={`${pdfPreviewUrl}#toolbar=0&navpanes=0&scrollbar=0`} className="w-full h-full min-h-[460px] border-0 rounded" title="PDF Preview" />
                    ) : (
                      <div className="text-muted-foreground text-sm flex flex-col items-center gap-2">
                        <FileText className="w-8 h-8 opacity-40" />
                        <span>Nenhuma prévia disponível. Gere ou selecione um documento.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Aba de Histórico de Emitidos */}
              {docsTab === 'historico' && (
                <div className="space-y-4 py-2 flex-1 overflow-y-auto pr-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">Histórico de Documentos Aprovados e Emitidos</h3>
                    <span className="text-xs text-muted-foreground">{documentHistory.filter((d: any) => !d.status || d.status === 'aprovado').length} documento(s)</span>
                  </div>

                  {documentHistory.filter((d: any) => !d.status || d.status === 'aprovado').length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-lg">
                      Nenhum documento emitido oficialmente ainda.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {documentHistory.filter((d: any) => !d.status || d.status === 'aprovado').map((docItem: any) => (
                        <div key={docItem.id} className="p-3 border rounded-lg shadow-xs space-y-2 text-sm bg-card hover:border-primary/40 transition-colors">
                          <div className="flex justify-between items-center gap-3">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-sm flex items-center gap-2">
                                {docItem.subject || docItem.name}
                                <span className="text-[10px] px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
                                  Oficial / Aprovado
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground">Membro: <strong className="text-foreground">{docItem.name}</strong></p>
                              <p className="text-[11px] text-muted-foreground">Data de Emissão: {new Date(docItem.date).toLocaleString('pt-BR')}</p>
                            </div>

                            <div className="flex gap-2 flex-wrap justify-end">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs"
                                onClick={() => generateDocumentPDF(false, false, docItem)}
                              >
                                <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir 2ª Via
                              </Button>

                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs" 
                                onClick={() => handleEmailDocument(docItem)}
                              >
                                <Mail className="w-3.5 h-3.5 mr-1" /> E-mail
                              </Button>

                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs px-2"
                                onClick={() => handleDeleteDocHistory(docItem.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

          {docsTab === 'modelos' && (
            <div className="space-y-4 py-2">
              {editingTemplate ? (
                <form onSubmit={handleSaveTemplate} className="space-y-4 border rounded-md p-4 bg-muted/20">
                  <h3 className="font-semibold">{editingTemplate.id ? 'Editar Modelo' : 'Novo Modelo'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome do Modelo</Label>
                        <Input id="name" name="name" defaultValue={editingTemplate.name} placeholder="Ex: Certificado Elegante"  />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Categoria</Label>
                        <Select name="category" defaultValue={editingTemplate.category || 'geral'}>
                          <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="geral">Geral</SelectItem>
                            <SelectItem value="carta">Carta</SelectItem>
                            <SelectItem value="certificado">Certificado</SelectItem>
                            <SelectItem value="declaracao">Declaração</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Assunto Padrão</Label>
                    <Input id="subject" name="subject" defaultValue={editingTemplate.subject} placeholder="Ex: CARTA DE APRESENTAÇÃO" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="content">Conteúdo Padrão</Label>
                    <Textarea id="content" name="content" defaultValue={editingTemplate.content} placeholder="Corpo do texto usando {NOME_MEMBRO}..." rows={4} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="templateImage">Arte de Fundo (A4 Recomendado, Opcional)</Label>
                    <Input id="templateImage" type="file" accept="image/png, image/jpeg" />
                    {editingTemplate.backgroundImage && <p className="text-xs text-muted-foreground mt-1">Já possui imagem. Envie outra apenas se quiser alterar.</p>}
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="ghost" onClick={() => setEditingTemplate(null)}>Cancelar</Button>
                    <Button type="submit">Salvar Modelo</Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-slate-500">Faça upload de suas artes (PNG/JPG) para usar como fundo de certificados.</p>
                    <Button size="sm" onClick={() => setEditingTemplate({ id: '', name: '', backgroundImage: null })}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
                  </div>
                  {customTemplates.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-md">
                      Nenhum modelo personalizado cadastrado.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {customTemplates.map((t: any) => (
                        <div key={t.id} className="flex justify-between items-center p-3 border rounded-md shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-8 bg-slate-200 rounded border overflow-hidden">
                              {t.backgroundImage ? (
                                  <img src={t.backgroundImage} alt="thumb" className="w-full h-full object-cover" />
                              ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-slate-100 text-xs text-slate-400">TXT</div>
                              )}
                            </div>
                            <div>
                                <span className="font-medium text-sm block">{t.name}</span>
                                <span className="text-xs text-muted-foreground uppercase">{t.category || 'GERAL'}</span>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(t)}>Editar</Button>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setTemplateToDelete(t)}>Excluir</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {docsTab === 'logos' && (
            <div className="space-y-4 py-2">
              {editingLogo ? (
                <form onSubmit={handleSaveLogo} className="space-y-4 border rounded-md p-4 bg-muted/20">
                  <h3 className="font-semibold">{editingLogo.id ? 'Editar Logo' : 'Nova Logo'}</h3>
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome / Título da Logo</Label>
                    <Input id="name" name="name" defaultValue={editingLogo.name} placeholder="Ex: Logo Sede Branca"  />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logoImage">Arquivo da Logo (PNG/JPG)</Label>
                    <Input id="logoImage" type="file" accept="image/png, image/jpeg" />
                    {editingLogo.dataUrl && <p className="text-xs text-muted-foreground mt-1">Já possui imagem. Envie outra apenas se quiser alterar.</p>}
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button type="button" variant="ghost" onClick={() => setEditingLogo(null)}>Cancelar</Button>
                    <Button type="submit">Salvar Logo</Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-sm text-slate-500">Gerencie diferentes logotipos da igreja para inserir nos cabeçalhos.</p>
                    <Button size="sm" onClick={() => setEditingLogo({ id: '', name: '', dataUrl: null })}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
                  </div>
                  {churchLogos.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground text-sm border border-dashed rounded-md">
                      Nenhuma logo cadastrada.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {churchLogos.map((l: any) => (
                        <div key={l.id} className="flex flex-col p-2 border rounded-md shadow-sm items-center bg-card relative">
                          <div className="h-16 w-full flex items-center justify-center p-1 mb-2 bg-slate-50 rounded">
                            {l.dataUrl && <img src={l.dataUrl} alt={l.name} className="max-w-full max-h-full object-contain" />}
                          </div>
                          <span className="font-medium text-xs text-center w-full truncate mb-2">{l.name}</span>
                          <div className="flex gap-1 w-full justify-between">
                            <Button variant="outline" size="sm" className="h-7 text-xs w-full" onClick={() => setEditingLogo(l)}>Editar</Button>
                            <Button variant="outline" size="sm" className="h-7 text-xs w-full text-red-500 hover:text-red-600" onClick={() => executeDeleteLogo(l)}>Excluir</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

        </DialogContent>
      </Dialog>

          <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-auto flex-col items-start p-4 gap-2 border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5 transition-all text-left w-full shadow-sm">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Relatórios</div>
                  <div className="text-xs text-muted-foreground font-normal">Fichas e carteirinhas</div>
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[96vw] max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
              <DialogHeader>
                <DialogTitle>Impressão e Relatórios</DialogTitle>
                <DialogDescription>Gere relatórios de membros ou imprima carteirinhas personalizadas.</DialogDescription>
              </DialogHeader>
              
              <div className="flex space-x-4 border-b mb-4">
                <button 
                  className={`pb-2 text-sm font-medium ${printTab === 'list' ? 'border-b-2 border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'text-slate-500'}`}
                  onClick={() => setPrintTab('list')}
                >
                  Lista de Membros
                </button>
                <button 
                  className={`pb-2 text-sm font-medium ${printTab === 'cards' ? 'border-b-2 border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'text-slate-500'}`}
                  onClick={() => setPrintTab('cards')}
                >
                  Carteirinhas
                </button>
                <button 
                  className={`pb-2 text-sm font-medium ${printTab === 'irpf' ? 'border-b-2 border-slate-900 text-slate-900 dark:border-white dark:text-white' : 'text-slate-500'}`}
                  onClick={() => {
                    setIsPrintModalOpen(false);
                    setIsIrpfModalOpen(true);
                  }}
                >
                  Declaração IRPF
                </button>
              </div>

              
              {printTab === 'list' && (
                <div className="space-y-6 py-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                        <Label>Tipo de Relatório</Label>
                        <Select value={reportType} onValueChange={setReportType}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ativos">Membros Ativos</SelectItem>
                            <SelectItem value="aniversariantes">Aniversariantes do Mês</SelectItem>
                          </SelectContent>
                        </Select>
                    </div>
                    {reportType === 'aniversariantes' && (
                        <div className="grid gap-2">
                            <Label>Mês</Label>
                            <Select value={reportMonth} onValueChange={setReportMonth}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="01">Janeiro</SelectItem>
                                <SelectItem value="02">Fevereiro</SelectItem>
                                <SelectItem value="03">Março</SelectItem>
                                <SelectItem value="04">Abril</SelectItem>
                                <SelectItem value="05">Maio</SelectItem>
                                <SelectItem value="06">Junho</SelectItem>
                                <SelectItem value="07">Julho</SelectItem>
                                <SelectItem value="08">Agosto</SelectItem>
                                <SelectItem value="09">Setembro</SelectItem>
                                <SelectItem value="10">Outubro</SelectItem>
                                <SelectItem value="11">Novembro</SelectItem>
                                <SelectItem value="12">Dezembro</SelectItem>
                              </SelectContent>
                            </Select>
                        </div>
                    )}
                    <div className="grid gap-2">
                        <Label>Departamento / Cargo (Opcional)</Label>
                        <Select value={reportRole} onValueChange={setReportRole}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os Departamentos</SelectItem>
                            {Array.from(new Set(members.map((m: any) => m.role))).filter(Boolean).map(role => (
                                <SelectItem key={role as string} value={role as string}>{role as string}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={generateCustomReportPDF}>Gerar Relatório em PDF</Button>
                  </div>
                  
                  <div className="border-t pt-4 mt-4 space-y-4">
                    <p className="text-sm font-semibold text-slate-700">Relatório Padrão (Exibe apenas os filtros ativos na tela)</p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={generateMemberListPDF}>Lista Atual em PDF</Button>
                        <Button variant="outline" onClick={generateMemberListCSV}>Lista Atual em Excel (.xlsx)</Button>
                    </div>
                  </div>
                </div>
              )}


              {printTab === 'cards' && (
                <div className="space-y-6 py-2">
                  {/* Card Preview */}
                  <div className="flex flex-col items-center gap-4 mb-4 pt-2 border-b pb-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full px-2 mb-2 gap-2">
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Visualização Online da Carteirinha</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => generateCardsPNG(true)}>
                          <Download className="w-3.5 h-3.5 mr-1.5" /> Baixar PNG
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => generateCardsPDF(true)}>
                          <Download className="w-3.5 h-3.5 mr-1.5" /> Baixar PDF
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-col lg:flex-row items-center justify-center gap-6 p-2 w-full overflow-x-auto">
                      {/* Front */}
                      <div id="card-preview-front"
                        className="border shadow-md relative text-[8px] font-sans overflow-hidden rounded-md transition-colors"
                        style={{ 
                          width: '90mm', 
                          height: '60mm', 
                          backgroundColor: cardColorFront,
                          color: cardTextColorFront,
                          borderColor: cardTextColorFront + '33'
                        }}
                      >
                        <div className="flex p-2 items-center">
                           <div className="w-16 h-10 flex items-center justify-center overflow-hidden">
                              {churchData?.logoDataUrl ? (
                                  <img src={churchData.logoDataUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                              ) : (
                                  <span className="text-[6px] opacity-60">LOGO</span>
                              )}
                           </div>
                           <div className="flex flex-col items-center flex-1 px-1">
                             <h1 className="font-[900] text-[10px] leading-tight text-center whitespace-nowrap overflow-hidden text-ellipsis w-[60mm]">
                                {(churchData?.nome || "IGREJA O BRASIL PARA CRISTO").toUpperCase()}
                             </h1>
                             <p className="text-[5.5px] font-bold leading-tight text-center mt-0.5 opacity-80">
                                {churchData?.endereco || "RUA BARTOLOMEU BUENO, Nº 629"} - {churchData?.bairro || "BAIRRO SANTA CASA"}
                             </p>
                             <p className="text-[5.5px] font-bold leading-tight text-center opacity-80">
                                CEP {churchData?.cep || "16880-000"} - {churchData?.cidade || "VALPARAÍSO - SP"}
                             </p>
                           </div>
                        </div>
                        <h2 className="text-center font-black tracking-wider text-[13px] mt-0.5 mb-1.5 uppercase">CARTÃO DE MEMBRO</h2>
                        
                        <div className="px-2 flex gap-2">
                           {/* Photo */}
                           <div 
                             className="w-[18mm] h-[26mm] border rounded flex items-center justify-center bg-white/90 overflow-hidden shrink-0 shadow-2xs"
                             style={{ borderColor: cardTextColorFront + '55' }}
                           >
                              {previewMember?.photoUrl ? (
                                <img src={previewMember.photoUrl} alt="Foto" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-slate-400 text-[6px]">Foto 3x4</span>
                              )}
                           </div>
                           
                           {/* Fields */}
                           <div className="flex-1 flex flex-col gap-[2.5mm]">
                              <div 
                                className="relative border rounded h-[6mm] px-1 pt-[1.5mm]"
                                style={{ borderColor: cardTextColorFront + '55' }}
                              >
                                 <span className="absolute -top-[1.6mm] left-1 text-[5px] font-extrabold px-0.5" style={{ backgroundColor: cardColorFront, color: cardTextColorFront }}>Nome do Membro</span>
                                 <span className="font-extrabold text-[8.5px] truncate block pt-[0.2mm]">{previewMember?.name || "Nome não cadastrado"}</span>
                              </div>
                              <div className="flex gap-2">
                                  <div 
                                    className="relative border rounded h-[6mm] px-1 pt-[1.5mm] flex-[1.4]"
                                    style={{ borderColor: cardTextColorFront + '55' }}
                                  >
                                     <span className="absolute -top-[1.6mm] left-1 text-[5px] font-extrabold px-0.5" style={{ backgroundColor: cardColorFront, color: cardTextColorFront }}>Cargo / Função</span>
                                     <span className="font-bold text-[8px] truncate block pt-[0.2mm]">{previewMember?.role || "Membro"}</span>
                                  </div>
                                  <div 
                                    className="relative border rounded h-[6mm] px-1 pt-[1.5mm] flex-[1]"
                                    style={{ borderColor: cardTextColorFront + '55' }}
                                  >
                                     <span className="absolute -top-[1.6mm] left-1 text-[5px] font-extrabold px-0.5" style={{ backgroundColor: cardColorFront, color: cardTextColorFront }}>Expedição</span>
                                     <span className="font-bold text-[8px] truncate block pt-[0.2mm]">{new Date().toLocaleDateString('pt-BR')}</span>
                                  </div>
                              </div>
                              <div 
                                className="relative border rounded h-[6mm] px-1 pt-[1.5mm]"
                                style={{ borderColor: cardTextColorFront + '55' }}
                              >
                                 <span className="absolute -top-[1.6mm] left-1 text-[5px] font-extrabold px-0.5" style={{ backgroundColor: cardColorFront, color: cardTextColorFront }}>Cidade / UF</span>
                                 <span className="font-bold text-[8px] truncate block pt-[0.2mm]">{previewMember?.cidade || churchData?.cidade || "Valparaíso"} - {previewMember?.naturalidade?.split('/')[1] || "SP"}</span>
                              </div>
                           </div>
                        </div>

                        {/* Barcode Frontal (se habilitado) */}
                        {showBarcodeOnCard && (barcodeCardPosition === 'front' || barcodeCardPosition === 'both') && (
                          <div className="mt-1 mx-2 flex items-center justify-center bg-white/95 rounded border border-slate-300 py-0.5 px-2 shadow-2xs">
                            <BarcodeGenerator
                              value={getMemberBarcodeValue(previewMember)}
                              text={getMemberBarcodeDisplayText(previewMember)}
                              width={0.95}
                              height={12}
                              fontSize={6}
                              displayValue={true}
                              lineColor="#000000"
                            />
                          </div>
                        )}
                      </div>

                      {/* Back */}
                      <div 
                        className="border shadow-md relative text-[8px] font-sans flex flex-col p-2 overflow-hidden rounded-md transition-colors"
                        style={{ 
                          width: '90mm', 
                          height: '60mm', 
                          backgroundColor: cardColorBack,
                          color: cardTextColorBack,
                          borderColor: cardTextColorBack + '33'
                        }}
                      >
                        <div className="flex flex-col gap-[2.5mm] flex-1">
                           <div className="flex gap-2">
                              <div 
                                className="relative border rounded h-[5.5mm] px-1 pt-[1.2mm] flex-[3]"
                                style={{ borderColor: cardTextColorBack + '55' }}
                              >
                                 <span className="absolute -top-[1.5mm] left-0.5 text-[5px] font-bold px-0.5" style={{ backgroundColor: cardColorBack, color: cardTextColorBack }}>Filiação (Pai)</span>
                                 <span className="font-bold text-[8px] truncate block">{previewMember?.pai || "-"}</span>
                              </div>
                              <div 
                                className="relative border rounded h-[5.5mm] px-1 pt-[1.2mm] flex-[1.2]"
                                style={{ borderColor: cardTextColorBack + '55' }}
                              >
                                 {(() => {
                                     const isIrregular = previewMember?.validade && new Date(previewMember.validade.split('/').reverse().join('-')) < new Date();
                                     return (
                                        <>
                                            <span className="absolute -top-[1.5mm] left-0.5 text-[5px] font-bold px-0.5" style={{ backgroundColor: isIrregular ? '#fef2f2' : cardColorBack, color: isIrregular ? '#dc2626' : cardTextColorBack }}>Validade {isIrregular && '(Vencida)'}</span>
                                            <span className={`font-bold text-[8px] truncate block ${isIrregular ? 'text-red-600' : ''}`}>{previewMember?.validade || "Indeterminada"}</span>
                                        </>
                                     )
                                 })()}
                              </div>
                           </div>
                           
                           <div className="flex gap-2">
                              <div 
                                className="relative border rounded h-[5.5mm] px-1 pt-[1.2mm] flex-[3]"
                                style={{ borderColor: cardTextColorBack + '55' }}
                              >
                                 <span className="absolute -top-[1.5mm] left-0.5 text-[5px] font-bold px-0.5" style={{ backgroundColor: cardColorBack, color: cardTextColorBack }}>Filiação (Mãe)</span>
                                 <span className="font-bold text-[8px] truncate block">{previewMember?.mae || "-"}</span>
                              </div>
                              <div 
                                className="relative border rounded h-[5.5mm] px-1 pt-[1.2mm] flex-[1.2]"
                                style={{ borderColor: cardTextColorBack + '55' }}
                              >
                                 <span className="absolute -top-[1.5mm] left-0.5 text-[5px] font-bold px-0.5" style={{ backgroundColor: cardColorBack, color: cardTextColorBack }}>Data do Batismo</span>
                                 <span className="font-bold text-[8px] truncate block">{previewMember?.dataBatismo || "-"}</span>
                              </div>
                           </div>

                           <div className="flex gap-2">
                              <div 
                                className="relative border rounded h-[5.5mm] px-1 pt-[1.2mm] flex-[1.5]"
                                style={{ borderColor: cardTextColorBack + '55' }}
                              >
                                 <span className="absolute -top-[1.5mm] left-0.5 text-[5px] font-bold px-0.5" style={{ backgroundColor: cardColorBack, color: cardTextColorBack }}>Naturalidade</span>
                                 <span className="font-bold text-[8px] truncate block">{previewMember?.naturalidade || "-"}</span>
                              </div>
                              <div 
                                className="relative border rounded h-[5.5mm] px-1 pt-[1.2mm] flex-[1]"
                                style={{ borderColor: cardTextColorBack + '55' }}
                              >
                                 <span className="absolute -top-[1.5mm] left-0.5 text-[5px] font-bold px-0.5" style={{ backgroundColor: cardColorBack, color: cardTextColorBack }}>Sexo</span>
                                 <span className="font-bold text-[8px] truncate block">{previewMember?.sexo || "-"}</span>
                              </div>
                              <div 
                                className="relative border rounded h-[5.5mm] px-1 pt-[1.2mm] flex-[1]"
                                style={{ borderColor: cardTextColorBack + '55' }}
                              >
                                 <span className="absolute -top-[1.5mm] left-0.5 text-[5px] font-bold px-0.5" style={{ backgroundColor: cardColorBack, color: cardTextColorBack }}>Membro desde</span>
                                 <span className="font-bold text-[8px] truncate block">{previewMember?.membroDesde || "-"}</span>
                              </div>
                           </div>

                           <div className="flex gap-2">
                              <div 
                                className="relative border rounded h-[5.5mm] px-1 pt-[1.2mm] flex-[1.5]"
                                style={{ borderColor: cardTextColorBack + '55' }}
                              >
                                 <span className="absolute -top-[1.5mm] left-0.5 text-[5px] font-bold px-0.5" style={{ backgroundColor: cardColorBack, color: cardTextColorBack }}>Data Nasc.</span>
                                 <span className="font-bold text-[8px] truncate block">{previewMember?.dataNascimento || "-"}</span>
                              </div>
                              <div 
                                className="relative border rounded h-[5.5mm] px-1 pt-[1.2mm] flex-[1.5]"
                                style={{ borderColor: cardTextColorBack + '55' }}
                              >
                                 <span className="absolute -top-[1.5mm] left-0.5 text-[5px] font-bold px-0.5" style={{ backgroundColor: cardColorBack, color: cardTextColorBack }}>Estado Civil</span>
                                 <span className="font-bold text-[8px] truncate block">{previewMember?.estadoCivil || "-"}</span>
                              </div>
                              <div className="flex-[0.2]"></div>
                           </div>
                           <div className="flex gap-2">
                              <div 
                                className="relative border rounded h-[5.5mm] px-1 pt-[1.2mm] flex-[1.5]"
                                style={{ borderColor: cardTextColorBack + '55' }}
                              >
                                 <span className="absolute -top-[1.5mm] left-0.5 text-[5px] font-bold px-0.5" style={{ backgroundColor: cardColorBack, color: cardTextColorBack }}>Nº CPF</span>
                                 <span className="font-bold text-[8px] truncate block">{previewMember?.cpf || "-"}</span>
                              </div>
                              <div 
                                className="relative border rounded h-[5.5mm] px-1 pt-[1.2mm] flex-[1.5]"
                                style={{ borderColor: cardTextColorBack + '55' }}
                              >
                                 <span className="absolute -top-[1.5mm] left-0.5 text-[5px] font-bold px-0.5" style={{ backgroundColor: cardColorBack, color: cardTextColorBack }}>Nº RG</span>
                                 <span className="font-bold text-[8px] truncate block">{previewMember?.rg || "-"}</span>
                              </div>
                              <div className="flex-[0.2]"></div>
                           </div>
                        </div>

                        {/* Código de Barras Tradicional (Apenas se configurado como barcode) */}
                        {showBarcodeOnCard && cardCodeType === 'barcode' && (barcodeCardPosition === 'back' || barcodeCardPosition === 'both') && (
                          <div className="my-0.5 mx-2 flex items-center justify-center bg-white/95 rounded border border-slate-300 py-0.5 px-2 shadow-2xs">
                            <BarcodeGenerator
                              value={getMemberBarcodeValue(previewMember)}
                              text={getMemberBarcodeDisplayText(previewMember)}
                              width={0.9}
                              height={10}
                              fontSize={6}
                              displayValue={true}
                              lineColor="#000000"
                            />
                          </div>
                        )}
                        
                        {/* Seção de Assinaturas e QR Code de Validação Centralizado */}
                        <div className="flex mt-1 mb-0.5 px-2.5 gap-2 justify-between h-[12mm] items-end relative">
                            {/* Assinatura do Membro */}
                            <div className="flex-1 flex flex-col items-center relative">
                                {churchData?.secretarySignatureUrl && (
                                    <img src={churchData.secretarySignatureUrl} className="absolute bottom-2 h-[7mm] object-contain opacity-80" alt="Assinatura" />
                                )}
                                <div className="w-full border-b z-10" style={{ borderColor: cardTextColorBack + '77' }}></div>
                                <span 
                                  className="font-bold mt-0.5 w-full text-center truncate block"
                                  style={{ fontSize: (previewMember?.name || "").length > 20 ? '4.5px' : '5.5px' }}
                                >
                                  {previewMember?.name || "Membro"}
                                </span>
                                <span className="text-[5px] opacity-75">MEMBRO</span>
                            </div>

                            {/* QR Code de Validação no Centro (Perfeito, sem cortes ou sobreposições) */}
                            {showBarcodeOnCard && cardCodeType === 'qrcode' && (
                              <div className="shrink-0 flex flex-col items-center justify-center p-0.5 bg-white rounded border border-slate-300 shadow-2xs">
                                <QRCodeSVG 
                                  value={getMemberQrPayload(previewMember)} 
                                  size={34} 
                                  level="M" 
                                  includeMargin={true}
                                />
                                <span className="text-[4px] font-bold text-slate-700 mt-0.5 leading-none">VALIDAÇÃO</span>
                              </div>
                            )}

                            {/* Assinatura do Pastor */}
                            <div className="flex-1 flex flex-col items-center relative">
                                {churchData?.pastorSignatureUrl && (
                                    <img src={churchData.pastorSignatureUrl} className="absolute bottom-2 h-[7mm] object-contain opacity-80" alt="Assinatura Pastor" />
                                )}
                                <div className="w-full border-b z-10" style={{ borderColor: cardTextColorBack + '77' }}></div>
                                <span 
                                  className="font-bold mt-0.5 w-full text-center truncate block"
                                  style={{ fontSize: (churchData?.pastorTitular || "Pastor Responsável").length > 20 ? '4.5px' : '5.5px' }}
                                >
                                  {churchData?.pastorTitular || "Pastor Responsável"}
                                </span>
                                <span className="text-[5px] opacity-75">PASTOR LOCAL</span>
                            </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seleção de Membros */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Seleção de Membros</h4>
                    <Select value={cardSelection} onValueChange={(v: any) => setCardSelection(v)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os membros (filtrados)</SelectItem>
                        <SelectItem value="single">Membro Específico</SelectItem>
                        <SelectItem value="range">Intervalo de Membros</SelectItem>
                        <SelectItem value="selected">Membros Selecionados (Lista)</SelectItem>
                      </SelectContent>
                    </Select>

                    {cardSelection === 'single' && (
                      <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o membro..." />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((m: any) => (
                            <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {cardSelection === 'range' && (
                      <div className="flex gap-4 items-center">
                        <div className="flex-1">
                          <Label className="text-xs text-slate-500">De:</Label>
                          <Select value={startMemberId} onValueChange={setStartMemberId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Membro inicial..." />
                            </SelectTrigger>
                            <SelectContent>
                              {members.map((m: any) => (
                                <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <Label className="text-xs text-slate-500">Até:</Label>
                          <Select value={endMemberId} onValueChange={setEndMemberId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Membro final..." />
                            </SelectTrigger>
                            <SelectContent>
                              {members.map((m: any) => (
                                <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Layout and Colors */}
                  <div className="space-y-4 pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-foreground">Layout e Cores da Carteirinha</h4>
                      <span className="text-xs text-muted-foreground">Personalize fundo e cor da fonte para máxima legibilidade</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Cores Frente */}
                      <div className="p-3 bg-muted/20 border border-border/70 rounded-xl space-y-3">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wide block border-b pb-1">Frente do Cartão</span>
                        
                        <div className="space-y-1.5">
                          <Label className="text-xs">Cor de Fundo (Frente)</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={cardColorFront} onChange={(e) => setCardColorFront(e.target.value)} className="w-10 h-8 p-1 cursor-pointer" />
                            <Input type="text" value={cardColorFront} onChange={(e) => setCardColorFront(e.target.value)} className="flex-1 font-mono uppercase text-xs h-8" />
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {["#ffffff", "#f8fafc", "#fef3c7", "#d9f99d", "#bae6fd", "#c7d2fe", "#1e293b", "#0f172a"].map(c => (
                              <div key={`cf-${c}`} onClick={() => setCardColorFront(c)} className="w-5 h-5 rounded border shadow-2xs cursor-pointer hover:scale-110 transition-transform" style={{backgroundColor: c}} title={c} />
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <Label className="text-xs font-semibold text-primary">Cor da Fonte / Letra (Frente)</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={cardTextColorFront} onChange={(e) => setCardTextColorFront(e.target.value)} className="w-10 h-8 p-1 cursor-pointer" />
                            <Input type="text" value={cardTextColorFront} onChange={(e) => setCardTextColorFront(e.target.value)} className="flex-1 font-mono uppercase text-xs h-8" />
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {[
                              { c: "#000000", label: "Preto" },
                              { c: "#1e293b", label: "Grafite" },
                              { c: "#ffffff", label: "Branco" },
                              { c: "#b45309", label: "Dourado" },
                              { c: "#1e3a8a", label: "Azul" },
                              { c: "#881337", label: "Bordô" }
                            ].map(({ c, label }) => (
                              <button 
                                key={`ctf-${c}`} 
                                type="button"
                                onClick={() => setCardTextColorFront(c)} 
                                className="px-2 py-0.5 rounded text-[10px] font-bold border transition-all"
                                style={{ backgroundColor: c, color: ['#ffffff', '#d9f99d', '#bae6fd'].includes(c) ? '#000' : '#fff' }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Cores Verso */}
                      <div className="p-3 bg-muted/20 border border-border/70 rounded-xl space-y-3">
                        <span className="text-xs font-bold text-foreground uppercase tracking-wide block border-b pb-1">Verso do Cartão</span>
                        
                        <div className="space-y-1.5">
                          <Label className="text-xs">Cor de Fundo (Verso)</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={cardColorBack} onChange={(e) => setCardColorBack(e.target.value)} className="w-10 h-8 p-1 cursor-pointer" />
                            <Input type="text" value={cardColorBack} onChange={(e) => setCardColorBack(e.target.value)} className="flex-1 font-mono uppercase text-xs h-8" />
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {["#ffffff", "#f8fafc", "#fef3c7", "#d9f99d", "#bae6fd", "#c7d2fe", "#1e293b", "#0f172a"].map(c => (
                              <div key={`cb-${c}`} onClick={() => setCardColorBack(c)} className="w-5 h-5 rounded border shadow-2xs cursor-pointer hover:scale-110 transition-transform" style={{backgroundColor: c}} title={c} />
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <Label className="text-xs font-semibold text-primary">Cor da Fonte / Letra (Verso)</Label>
                          <div className="flex gap-2">
                            <Input type="color" value={cardTextColorBack} onChange={(e) => setCardTextColorBack(e.target.value)} className="w-10 h-8 p-1 cursor-pointer" />
                            <Input type="text" value={cardTextColorBack} onChange={(e) => setCardTextColorBack(e.target.value)} className="flex-1 font-mono uppercase text-xs h-8" />
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {[
                              { c: "#000000", label: "Preto" },
                              { c: "#1e293b", label: "Grafite" },
                              { c: "#ffffff", label: "Branco" },
                              { c: "#b45309", label: "Dourado" },
                              { c: "#1e3a8a", label: "Azul" },
                              { c: "#881337", label: "Bordô" }
                            ].map(({ c, label }) => (
                              <button 
                                key={`ctb-${c}`} 
                                type="button"
                                onClick={() => setCardTextColorBack(c)} 
                                className="px-2 py-0.5 rounded text-[10px] font-bold border transition-all"
                                style={{ backgroundColor: c, color: ['#ffffff', '#d9f99d', '#bae6fd'].includes(c) ? '#000' : '#fff' }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Configuração do Código de Validação Oficial (QR Code / Barra) */}
                    <div className="p-3 bg-muted/20 border border-border/70 rounded-xl space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <QrCode className="w-4 h-4 text-emerald-600" />
                          <span className="text-xs font-bold text-foreground uppercase tracking-wide">Código de Validação Digital (QR Code / Barra)</span>
                        </div>
                        <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={showBarcodeOnCard}
                            onChange={(e) => setShowBarcodeOnCard(e.target.checked)}
                            className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                          />
                          <span>Exibir no Cartão</span>
                        </label>
                      </div>

                      {showBarcodeOnCard && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                          <div className="space-y-1">
                            <Label className="text-xs">Tipo de Código</Label>
                            <Select value={cardCodeType} onValueChange={(v: any) => setCardCodeType(v)}>
                              <SelectTrigger className="h-8 text-xs bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="qrcode">📱 QR Code (Recomendado)</SelectItem>
                                <SelectItem value="barcode">📊 Código de Barras (CODE128)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Posicionamento</Label>
                            <Select value={barcodeCardPosition} onValueChange={(v: any) => setBarcodeCardPosition(v)}>
                              <SelectTrigger className="h-8 text-xs bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="back">Verso (Central entre Assinaturas)</SelectItem>
                                <SelectItem value="front">Frente (Abaixo dos Dados)</SelectItem>
                                <SelectItem value="both">Ambos (Frente e Verso)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Identificador</Label>
                            <Select value={barcodeFormat} onValueChange={(v: any) => setBarcodeFormat(v)}>
                              <SelectTrigger className="h-8 text-xs bg-background">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="cpf">CPF do Membro (Padrão)</SelectItem>
                                <SelectItem value="matricula">Matrícula (MEM-000001)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4"><Button variant="outline" className="flex-1" onClick={() => generateCardsPNG(false)}>Exportar PNGs (ZIP)</Button><Button className="flex-1" onClick={() => generateCardsPDF(false)}>Gerar PDF</Button></div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          <Button variant="outline" onClick={handleSendNotice} className="h-auto flex-col items-start p-4 gap-2 border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5 transition-all text-left w-full shadow-sm">
            <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg text-amber-600 dark:text-amber-400">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">Comunicados</div>
              <div className="text-xs text-muted-foreground font-normal">Enviar e-mails/avisos</div>
            </div>
          </Button>
          
          <Button variant="outline" onClick={() => setIsEventPresenceModalOpen(true)} className="h-auto flex-col items-start p-4 gap-2 border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5 transition-all text-left w-full shadow-sm">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">Gestor de Eventos</div>
              <div className="text-xs text-muted-foreground font-normal">Listas de presença</div>
            </div>
          </Button>

          <Button variant="outline" onClick={() => setIsRoleDialogOpen(true)} className="h-auto flex-col items-start p-4 gap-2 border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-primary/5 transition-all text-left w-full shadow-sm">
            <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold text-sm">Cargos & Funções</div>
              <div className="text-xs text-muted-foreground font-normal">Gerenciar eclesiásticos</div>
            </div>
          </Button>
            </div>
          </CardContent>
        </Card>

        {/* FRAME 2: GESTÃO DE ESCALAS, MURAL DO TEMPLO & CRACHÁS */}
        <Card className="mt-4 overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="text-lg flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-amber-600" />
              Escalas da Igreja, Mural do Templo & Identificação
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              Escalas dos ministérios da congregação, publicação no mural oficial e confecção de crachás para obreiros e voluntários.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 overflow-hidden">
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 sm:gap-3 w-full">
              {/* 1. Escala do Mural */}
              <Button 
                variant="outline" 
                onClick={() => setIsEscalaMuralModalOpen(true)} 
                className="h-auto flex-col items-start p-3.5 gap-1.5 border-slate-200 dark:border-slate-800 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left w-full overflow-hidden shadow-xs"
              >
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-lg text-amber-700 dark:text-amber-400 shrink-0">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <div className="w-full overflow-hidden">
                  <div className="font-semibold text-sm truncate w-full">Escala do Mural</div>
                  <div className="text-xs text-muted-foreground font-normal truncate w-full">Diaconato & voluntários</div>
                </div>
              </Button>

              {/* 2. Escala Dirigentes */}
              <Button 
                variant="outline" 
                onClick={() => setIsEscalaDirigentesModalOpen(true)} 
                className="h-auto flex-col items-start p-3.5 gap-1.5 border-slate-200 dark:border-slate-800 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all text-left w-full overflow-hidden shadow-xs"
              >
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-700 dark:text-blue-400 shrink-0">
                  <Mic className="h-5 w-5" />
                </div>
                <div className="w-full overflow-hidden">
                  <div className="font-semibold text-sm truncate w-full">Escala Dirigentes</div>
                  <div className="text-xs text-muted-foreground font-normal truncate w-full">Dirigentes e pregadores</div>
                </div>
              </Button>

              {/* 3. Escala de Músicos */}
              <Button 
                variant="outline" 
                onClick={() => setIsEscalaMusicosModalOpen(true)} 
                className="h-auto flex-col items-start p-3.5 gap-1.5 border-slate-200 dark:border-slate-800 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left w-full overflow-hidden shadow-xs"
              >
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-700 dark:text-purple-400 shrink-0">
                  <Music className="h-5 w-5" />
                </div>
                <div className="w-full overflow-hidden">
                  <div className="font-semibold text-sm truncate w-full">Escala de Músicos</div>
                  <div className="text-xs text-muted-foreground font-normal truncate w-full">Louvor e instrumentistas</div>
                </div>
              </Button>

              {/* 4. Escala de Limpeza */}
              <Button 
                variant="outline" 
                onClick={() => setIsEscalaLimpezaModalOpen(true)} 
                className="h-auto flex-col items-start p-3.5 gap-1.5 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left w-full overflow-hidden shadow-xs"
              >
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-700 dark:text-emerald-400 shrink-0">
                  <Brush className="h-5 w-5" />
                </div>
                <div className="w-full overflow-hidden">
                  <div className="font-semibold text-sm truncate w-full">Escala de Limpeza</div>
                  <div className="text-xs text-muted-foreground font-normal truncate w-full">Zeladoria e conservação</div>
                </div>
              </Button>

              {/* 5. Crachás e Credenciais Oficiais */}
              <Button 
                variant="outline" 
                onClick={() => setIsCrachaVoluntariosModalOpen(true)} 
                className="h-auto flex-col items-start p-3.5 gap-1.5 border-slate-200 dark:border-slate-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all text-left w-full overflow-hidden shadow-xs"
              >
                <div className="bg-indigo-100 dark:bg-indigo-900/30 p-2 rounded-lg text-indigo-700 dark:text-indigo-400 shrink-0">
                  <IdCard className="h-5 w-5" />
                </div>
                <div className="w-full overflow-hidden">
                  <div className="font-semibold text-sm truncate w-full">Crachás Oficiais</div>
                  <div className="text-xs text-muted-foreground font-normal truncate w-full">Diaconato, Kids & Eventos</div>
                </div>
              </Button>

              {/* 6. Formulários Financeiros da Secretaria (Entradas, Saídas, Dizimista, Fechamento) */}
              <Button 
                variant="outline" 
                onClick={() => setIsFormulariosFinanceirosModalOpen(true)} 
                className="h-auto flex-col items-start p-3.5 gap-1.5 border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left w-full overflow-hidden shadow-xs"
              >
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-lg text-emerald-700 dark:text-emerald-400 shrink-0">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="w-full overflow-hidden">
                  <div className="font-semibold text-sm truncate w-full">Formulários Financeiros</div>
                  <div className="text-xs text-muted-foreground font-normal truncate w-full">Entradas, Saídas & Caixa</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Lista de Presença para Eventos */}
        <Dialog open={isEventPresenceModalOpen} onOpenChange={setIsEventPresenceModalOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-purple-600" />
                Emitir Lista de Presença de Eventos
              </DialogTitle>
              <DialogDescription>
                Gere a lista oficial timbrada em preto e branco para reuniões, cultos solenes e eventos.
              </DialogDescription>
            </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="evNameInput" className="font-semibold text-sm">Nome do Evento / Reunião *</Label>
                  <Input 
                    id="evNameInput"
                    value={eventName}
                    onChange={(e) => setEventName(e.target.value)}
                    placeholder="Ex: Culto de Santa Ceia / Encontro de Casais / Vigília"
                    autoFocus
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="evDateInput" className="font-semibold text-sm">Data do Evento</Label>
                  <div className="relative flex items-center">
                    <Input 
                      id="evDateInput"
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      onClick={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}
                      className="cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label className="font-semibold text-sm">Opção da Lista</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      onClick={() => setEventListType('ativos')}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        eventListType === 'ativos' 
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/30' 
                          : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="font-semibold text-xs text-foreground">Membros Ativos</div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Lista com membros cadastrados ativos e espaço para assinatura.</p>
                    </div>

                    <div 
                      onClick={() => setEventListType('em_branco')}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        eventListType === 'em_branco' 
                          ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/30' 
                          : 'border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="font-semibold text-xs text-foreground">Lista em Branco</div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Linhas numeradas em branco para preencher manualmente.</p>
                    </div>
                  </div>
                </div>

                {eventListType === 'em_branco' && (
                  <div className="grid gap-1.5 bg-muted/30 p-3 rounded-lg border border-border/60">
                    <Label htmlFor="linesCountInput" className="text-xs font-semibold">Quantidade de Linhas para Assinatura</Label>
                    <Select value={eventBlankLinesCount.toString()} onValueChange={(val) => setEventBlankLinesCount(Number(val))}>
                      <SelectTrigger id="linesCountInput">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="20">20 Linhas (1 Página compacta)</SelectItem>
                        <SelectItem value="30">30 Linhas (1 Página completa)</SelectItem>
                        <SelectItem value="50">50 Linhas (2 Páginas)</SelectItem>
                        <SelectItem value="75">75 Linhas (3 Páginas)</SelectItem>
                        <SelectItem value="100">100 Linhas (Caderno de Presença)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEventPresenceModalOpen(false)}>Cancelar</Button>
                <Button 
                  onClick={() => generateActiveMembersEventListPDF(eventName, eventDate, eventListType, eventBlankLinesCount)}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-semibold"
                >
                  <Download className="w-4 h-4 mr-2" /> Gerar Lista em PDF
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Dialog open={isMemberModalOpen} onOpenChange={setIsMemberModalOpen}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle>{editingMember ? "Editar Membro" : "Novo Membro"}</DialogTitle>
                  {editingMember && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 border-indigo-300 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-50"
                        onClick={() => {
                          setVisitasMemberTarget(editingMember);
                          setIsVisitasModalOpen(true);
                        }}
                      >
                        <ClipboardList className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                        Histórico de Visitas (A4)
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 border-amber-300 text-amber-800 dark:text-amber-200 hover:bg-amber-50"
                        onClick={() => handleOpenFicha(editingMember)}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        Ficha de Membro (A4)
                      </Button>
                    </div>
                  )}
                </div>
                <DialogDescription>
                  {editingMember ? "Altere os dados do membro." : "Preencha os dados completos para cadastrar um novo membro."}
                </DialogDescription>
              </DialogHeader>
              <form id="memberForm" onSubmit={handleSaveMember}>
                <p className="text-xs text-muted-foreground mb-4 px-2">Preencha os dados com atenção. Os campos com asterisco são obrigatórios para emissão de documentos.</p>
                <div className="grid gap-6 py-4">
                  
                  {/* Dados Pessoais */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-500 border-b pb-2">Dados Pessoais</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                <div className="grid gap-2">
                  
                  <Label htmlFor="branchId" className="flex items-center gap-1">
                     Igreja / Filial
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                           Define qual congregação o membro frequenta.
                        </TooltipContent>
                     </Tooltip>
                  </Label>

                  <Select 
                    value={memberBranch} 
                    onValueChange={setMemberBranch}
                    disabled={!isUserFromSede}
                  >
                    <SelectTrigger className={!isUserFromSede ? "bg-muted/70 cursor-not-allowed opacity-90" : ""}>
                      <SelectValue placeholder="Selecione a congregação" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches && branches.length > 0 ? (
                        branches.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name} {b.type === 'sede' ? '(Sede)' : ''}
                          </SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="sede">Sede Principal</SelectItem>
                          <SelectItem value="filial_1">Filial 1 (Centro)</SelectItem>
                          <SelectItem value="filial_2">Filial 2 (Bairro)</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                  {!isUserFromSede && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      🔒 Vinculado à sua congregação designada. Somente a Igreja Sede tem permissão para cadastrar membros em outras filiais.
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="name">Nome Completo</Label>
                        <Input id="name" name="name" defaultValue={editingMember?.name} placeholder="Ex: João Silva" required />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="sexo">Sexo</Label>
                        <Select value={memberSexo} onValueChange={setMemberSexo}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Masculino">Masculino</SelectItem>
                            <SelectItem value="Feminino">Feminino</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                        <Input id="dataNascimento" name="dataNascimento" type="date" defaultValue={parseBRDateForInput(editingMember?.dataNascimento)} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="naturalidade">Naturalidade</Label>
                        <Input id="naturalidade" name="naturalidade" defaultValue={editingMember?.naturalidade} placeholder="Ex: São Paulo/SP" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="estadoCivil">Estado Civil</Label>
                        <Select value={memberCivil} onValueChange={setMemberCivil}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                            <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                            <SelectItem value="União Estável">União Estável</SelectItem>
                            <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                            <SelectItem value="Separado(a)">Separado(a)</SelectItem>
                            <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="pai">Nome do Pai</Label>
                        <Input id="pai" name="pai" defaultValue={editingMember?.pai} placeholder="Nome do Pai" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="mae">Nome da Mãe</Label>
                        <Input id="mae" name="mae" defaultValue={editingMember?.mae} placeholder="Nome da Mãe" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="rg">RG</Label>
                        <Input id="rg" name="rg" defaultValue={editingMember?.rg} placeholder="00.000.000-0" />
                      </div>
                      <div className="grid gap-2">
                        
                  <Label htmlFor="cpf" className="flex items-center gap-1">
                     CPF
                     <Tooltip>
                        <TooltipTrigger asChild>
                           <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                           Documento usado para validações fiscais e emissões de recibos de contribuição.
                        </TooltipContent>
                     </Tooltip>
                  </Label>

                        <Input id="cpf" name="cpf" defaultValue={editingMember?.cpf} placeholder="000.000.000-00" onChange={handleCpfChange}  />
                      </div>
                    </div>
                  </div>

                  {/* Contato e Endereço */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-500 border-b pb-2">Contato e Endereço</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input id="email" name="email" type="email" defaultValue={editingMember?.email} placeholder="joao@email.com" />
                      </div>
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="phone">Telefone / WhatsApp</Label>
                          {editingMember && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-5 px-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-medium hover:bg-emerald-50 dark:hover:bg-emerald-950"
                              onClick={() => {
                                setWhatsAppMemberTarget(editingMember);
                                setWhatsAppDefaultTemplate("welcome");
                                setIsMemberWhatsAppModalOpen(true);
                              }}
                            >
                              <MessageCircle className="w-3 h-3 mr-1" /> Enviar Mensagem
                            </Button>
                          )}
                        </div>
                        <Input id="phone" name="phone" defaultValue={editingMember?.phone} placeholder="(00) 00000-0000" onChange={handlePhoneChange}  />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="grid gap-2 md:col-span-3">
                        <Label htmlFor="endereco">Endereço (Rua, Número, Complemento)</Label>
                        <Input id="endereco" name="endereco" defaultValue={editingMember?.endereco} placeholder="Rua das Flores, 123" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cep">CEP</Label>
                        <Input id="cep" name="cep" defaultValue={editingMember?.cep} placeholder="00000-000" onChange={handleCepChange} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="bairro">Bairro</Label>
                        <Input id="bairro" name="bairro" defaultValue={editingMember?.bairro} placeholder="Centro" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="cidade">Cidade</Label>
                        <Input id="cidade" name="cidade" defaultValue={editingMember?.cidade} placeholder="São Paulo" />
                      </div>
                    </div>
                  </div>

                  {/* Eclesiástico e Foto */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-500 border-b pb-2">Dados Eclesiásticos e Foto</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="role">Cargo / Função</Label>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs text-primary font-semibold hover:bg-primary/10"
                            onClick={() => setIsRoleDialogOpen(true)}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Cadastrar Cargo
                          </Button>
                        </div>
                        <Select 
                          value={memberRole} 
                          onValueChange={(val) => {
                            if (val === "__new__") {
                              setIsRoleDialogOpen(true);
                            } else {
                              setMemberRole(val);
                            }
                          }}
                        >
                          <SelectTrigger id="role-select">
                            <SelectValue placeholder="Selecione o cargo ou função..." />
                          </SelectTrigger>
                          <SelectContent className="max-h-64">
                            <SelectItem value="__new__" className="text-primary font-bold bg-primary/5 cursor-pointer">
                              + Cadastrar Novo Cargo/Função...
                            </SelectItem>
                            {registeredRoles.map((r: string) => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <input type="hidden" name="role" value={memberRole} />
                      </div>
                      <div className="grid gap-2">
                                              <div className="grid gap-2">
                        <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                        <Input id="tags" name="tags" defaultValue={editingMember?.tags ? editingMember.tags.join(", ") : ""} placeholder="Ex: Músico, Obreiro, Voluntário" />
                      </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={memberStatus} onValueChange={setMemberStatus}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Ativo">Ativo</SelectItem>
                            <SelectItem value="Inativo">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="dataBatismo">Data do Batismo</Label>
                        <Input id="dataBatismo" name="dataBatismo" type="date" defaultValue={parseBRDateForInput(editingMember?.dataBatismo)} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="membroDesde">Membro Desde</Label>
                        <Input id="membroDesde" name="membroDesde" type="date" defaultValue={parseBRDateForInput(editingMember?.membroDesde)} />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="validade">Validade (Carteirinha)</Label>
                        <Input id="validade" name="validade" type="date" defaultValue={parseBRDateForInput(editingMember?.validade)} />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="photo">Foto (Para Carteirinha)</Label>
                      {photoPreview && (
                        <div className="mt-2 mb-2">
                          <img src={photoPreview} alt="Preview da Foto" className="w-24 h-24 object-cover rounded-md border border-border shadow-sm" />
                        </div>
                      )}
                      
                      {isCameraOpen ? (
                        <CameraCapture 
                          onCapture={(dataUrl) => {
                            setPhotoPreview(dataUrl);
                            setIsCameraOpen(false);
                          }}
                          onCancel={() => setIsCameraOpen(false)}
                        />
                      ) : (
                        <div className="flex gap-2 items-center">
                          <Input 
                            id="photo" 
                            name="photo" 
                            type="file" 
                            accept="image/*" 
                            className="flex-1"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setPhotoPreview(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              } else {
                                setPhotoPreview(editingMember?.photoUrl || null);
                              }
                            }}
                          />
                          <Button type="button" variant="outline" onClick={() => setIsCameraOpen(true)}>
                            Tirar Foto
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                </div>


                {/* ASSINATURA DIGITAL DO MEMBRO / CONVERTIDO */}
                <div className="space-y-3 pt-4 border-t">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Assinatura Digital do Membro
                  </h3>
                  <DigitalSignatureField
                    label="Assinatura Digitalizada do Membro"
                    helperText="Carregue ou desenhe a assinatura para inclusão automática em fichas cadastrais, batismo e certificados."
                    value={memberSignatureUrl}
                    onChange={(url, name) => {
                      setMemberSignatureUrl(url)
                      setMemberSignatureFileName(name || "")
                    }}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsMemberModalOpen(false)}>Cancelar</Button>
                  <Button type="submit">{editingMember ? "Salvar Alterações" : "Salvar Membro"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Modal para Cadastrar / Gerenciar Cargos e Funções Eclesiásticas */}
          <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
            <DialogContent className="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  Cadastrar Cargo / Função
                </DialogTitle>
                <DialogDescription>
                  Cadastre novos cargos e funções eclesiásticas para selecionar no cadastro de membros e documentos.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="newRoleInput">Nome do Novo Cargo / Função</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="newRoleInput" 
                      placeholder="Ex: Ministro de Louvor, Diácono Auxiliar..." 
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const trimmed = newRoleName.trim();
                          if (!trimmed) {
                            toast.error("Digite o nome do cargo.");
                            return;
                          }
                          if (registeredRoles.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
                            toast.error("Este cargo já está cadastrado.");
                            return;
                          }
                          const updated = [...registeredRoles, trimmed];
                          setRegisteredRoles(updated);
                          localStorage.setItem("churchRoles", JSON.stringify(updated));
                          setMemberRole(trimmed);
                          setNewRoleName("");
                          setIsRoleDialogOpen(false);
                          toast.success(`Cargo "${trimmed}" cadastrado e selecionado!`);
                        }
                      }}
                    />
                    <Button 
                      type="button" 
                      onClick={() => {
                        const trimmed = newRoleName.trim();
                        if (!trimmed) {
                          toast.error("Digite o nome do cargo.");
                          return;
                        }
                        if (registeredRoles.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
                          toast.error("Este cargo já está cadastrado.");
                          return;
                        }
                        const updated = [...registeredRoles, trimmed];
                        setRegisteredRoles(updated);
                        localStorage.setItem("churchRoles", JSON.stringify(updated));
                        setMemberRole(trimmed);
                        setNewRoleName("");
                        setIsRoleDialogOpen(false);
                        toast.success(`Cargo "${trimmed}" cadastrado e selecionado!`);
                      }}
                    >
                      Adicionar
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs text-muted-foreground font-semibold">Cargos Cadastrados no Sistema ({registeredRoles.length})</Label>
                  <div className="max-h-[220px] overflow-y-auto space-y-1 pr-1 rounded-md border p-2 bg-muted/20">
                    {registeredRoles.map((roleItem) => {
                      const isDefault = DEFAULT_CHURCH_ROLES.includes(roleItem);
                      return (
                        <div key={roleItem} className="flex items-center justify-between text-xs py-1 px-2 rounded hover:bg-muted/60 transition-colors">
                          <span className="font-medium text-foreground">{roleItem}</span>
                          <div className="flex items-center gap-1.5">
                            {isDefault ? (
                              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Padrão</span>
                            ) : (
                              <button 
                                type="button" 
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 rounded"
                                title="Excluir cargo customizado"
                                onClick={() => {
                                  const updated = registeredRoles.filter(r => r !== roleItem);
                                  setRegisteredRoles(updated);
                                  localStorage.setItem("churchRoles", JSON.stringify(updated));
                                  if (memberRole === roleItem) setMemberRole("Membro");
                                  toast.info(`Cargo "${roleItem}" removido.`);
                                }}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Fechar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
      </div>

      {/* Central de Notificações da Secretaria: Aniversariantes do Mês & Vencimentos Pendentes */}
      <SecretariaAlertsBanner
        members={members}
        transactions={transactions}
        onOpenMember={(memberId) => {
          const m = members.find(mem => mem.id === memberId);
          if (m) {
            handleOpenEditModal(m);
          }
        }}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="membros">Membros</TabsTrigger>
          <TabsTrigger value="kids" className="flex items-center gap-1.5 font-medium text-pink-600 dark:text-pink-400" onClick={() => setIsKidsModalOpen(true)}>
            <Baby className="w-4 h-4" />
            Check-in Kids
          </TabsTrigger>
          <TabsTrigger value="celulas" className="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400" onClick={() => setIsCelulaModalOpen(true)}>
            <HeartHandshake className="w-4 h-4" />
            Células & Relatórios
          </TabsTrigger>
          <TabsTrigger value="arquivos" className="flex items-center gap-1.5">
            <Folder className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Pasta de Arquivos
          </TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios Gerais</TabsTrigger>
          <TabsTrigger value="relatorios_avancados" className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
            <Award className="w-4 h-4" />
            Dizimistas & Ofertantes
          </TabsTrigger>
          <TabsTrigger value="mapa">Mapa de Membros</TabsTrigger>
          <TabsTrigger value="formularios" className="flex items-center gap-1.5 font-semibold text-primary">
            <Printer className="w-4 h-4" />
            Formulários
          </TabsTrigger>
          <TabsTrigger value="escala_mural" className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400">
            <ClipboardList className="w-4 h-4" />
            Escala do Mural
          </TabsTrigger>
        </TabsList>

        <TabsContent value="escala_mural" className="space-y-6">
          <EscalaMuralDiaconatoModal
            isEmbedded={true}
            members={members}
            churchData={churchData}
            activeBranchName={activeBranchName}
            activeBranchId={activeBranch}
          />
        </TabsContent>

        <TabsContent value="arquivos" className="space-y-6">
          <SecretariaFilesManager
            files={secretariaFiles}
            onOpenScanner={() => setIsScannerOpen(true)}
            onDeleteFile={handleDeleteSecretariaFile}
          />
        </TabsContent>

        <TabsContent value="membros" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Membros Cadastrados</CardTitle>
            </CardHeader>
        <CardContent>
          {/* Barra de Busca e Filtros Inteligentes (Layout espaçoso e sem sobreposição) */}
          <div className="space-y-3 mb-5">
            {/* Linha 1: Campo de Busca Principal + Botões de Ação em Lote */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  type="search"
                  placeholder="Buscar por nome, e-mail, telefone, CPF... (Ctrl+K)"
                  className="pl-9 pr-8 h-10 w-full rounded-xl bg-background border-border/80"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2.5 top-2.5 text-xs text-muted-foreground hover:text-foreground p-0.5"
                    title="Limpar busca"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                {selectedMemberIds.length > 0 && (
                  <>
                    <Button 
                      variant="secondary"
                      size="sm"
                      className="h-9 text-xs font-medium rounded-xl"
                      onClick={() => {
                        setPrintTab('cards');
                        setCardSelection('selected');
                        setIsPrintModalOpen(true);
                      }}
                    >
                      <Printer className="w-4 h-4 mr-1.5" />
                      Imprimir ({selectedMemberIds.length})
                    </Button>
                    <Button 
                      variant="destructive"
                      size="sm"
                      className="h-9 text-xs font-medium rounded-xl"
                      onClick={() => setIsBulkDeleteModalOpen(true)}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Excluir ({selectedMemberIds.length})
                    </Button>
                  </>
                )}
                {members.length > 0 && selectedMemberIds.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 border-red-200 dark:border-red-900 rounded-xl"
                    onClick={() => setIsClearAllModalOpen(true)}
                    title="Apagar todos os dados de membros"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    Apagar Todos
                  </Button>
                )}
              </div>
            </div>

            {/* Linha 2: Grade de Filtros Organizada e Responsiva (Sem aperto nem sobreposição) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 w-full">
              {/* Filtro 1: Cargo */}
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-full h-9 text-xs rounded-lg bg-background">
                  <SelectValue placeholder="Cargo / Função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Cargos</SelectItem>
                  {uniqueRoles.map((role: any) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro 2: Status */}
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full h-9 text-xs rounded-lg bg-background">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro 3: Congregação */}
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-full h-9 text-xs rounded-lg bg-background">
                  <SelectValue placeholder="Congregação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Filiais</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro 4: Ministério / Tag */}
              <Select value={filterTag} onValueChange={setFilterTag}>
                <SelectTrigger className="w-full h-9 text-xs rounded-lg bg-background">
                  <SelectValue placeholder="Ministério / Tag" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Ministérios</SelectItem>
                  {uniqueTags.filter(t => t && String(t).trim()).map((tag: any) => (
                    <SelectItem key={tag} value={String(tag)}>{tag}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Filtro 5: Status de Batismo */}
              <Select value={filterBaptism} onValueChange={setFilterBaptism}>
                <SelectTrigger className="w-full h-9 text-xs rounded-lg bg-background">
                  <SelectValue placeholder="Batismo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos (Batismo)</SelectItem>
                  <SelectItem value="batizados">Batizados</SelectItem>
                  <SelectItem value="nao_batizados">Não Batizados</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro 6: Faixa Etária */}
              <Select value={filterAgeGroup} onValueChange={setFilterAgeGroup}>
                <SelectTrigger className="w-full h-9 text-xs rounded-lg bg-background">
                  <SelectValue placeholder="Faixa Etária" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Idades</SelectItem>
                  <SelectItem value="0-12">0 a 12 anos</SelectItem>
                  <SelectItem value="13-18">13 a 18 anos</SelectItem>
                  <SelectItem value="19-35">19 a 35 anos</SelectItem>
                  <SelectItem value="36-50">36 a 50 anos</SelectItem>
                  <SelectItem value="51+">51+ anos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="overflow-x-auto w-full"><Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[48px] pl-4">
                  <Checkbox 
                    checked={
                      paginatedMembers.length > 0 &&
                      paginatedMembers.every((m) => selectedMemberIds.includes(m.id.toString()))
                    }
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const newIds = new Set(selectedMemberIds);
                        paginatedMembers.forEach((m) => newIds.add(m.id.toString()));
                        setSelectedMemberIds(Array.from(newIds));
                      } else {
                        const currentIds = new Set(paginatedMembers.map((m) => m.id.toString()));
                        setSelectedMemberIds(selectedMemberIds.filter((id) => !currentIds.has(id)));
                      }
                    }}
                    title="Selecionar todos da página"
                  />
                </TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Nome</TableHead>
                <TableHead className="hidden md:table-cell font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Documento (CPF)</TableHead>
                <TableHead className="hidden sm:table-cell font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Contato</TableHead>
                <TableHead className="hidden lg:table-cell font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Cargo</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Status</TableHead>
                <TableHead className="text-right sticky right-0 bg-card z-10 w-[120px] font-semibold text-slate-600 uppercase tracking-wider text-[11px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedMembers.length > 0 ? (
                paginatedMembers.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="pl-4">
                      <Checkbox 
                        checked={selectedMemberIds.includes(m.id.toString())}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedMemberIds(prev => [...prev, m.id.toString()])
                          } else {
                            setSelectedMemberIds(prev => prev.filter(id => id !== m.id.toString()))
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {m.photoUrl ? (
                           <img src={m.photoUrl} alt={m.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" />
                        ) : (
                           <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                             <span className="text-slate-500 font-medium text-sm">{m.name.charAt(0).toUpperCase()}</span>
                           </div>
                        )}
                        <div>
                          <div>{m.name}</div>
                          <div className="text-xs text-slate-500 font-normal">{m.cidade} - {m.bairro}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-500 hidden md:table-cell">{m.cpf}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div className="text-sm">{m.phone}</div>
                      <div className="text-xs text-slate-500">{m.email}</div>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="font-medium">{m.role}</div>
                      {m.tags && m.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.tags.map((t: string, i: number) => (
                            <span key={i} className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'}`}>
                        {m.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right sticky right-0 bg-card z-10">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                          title="Enviar Mensagem via WhatsApp ou E-mail (Boas-Vindas, Aniversário, Avisos)"
                          onClick={() => {
                            setWhatsAppMemberTarget(m);
                            setWhatsAppDefaultTemplate("welcome");
                            setIsMemberWhatsAppModalOpen(true);
                          }}
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-700 hover:text-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950"
                          title="Visualizar e Imprimir Ficha de Cadastro Oficial (A4)"
                          onClick={() => handleOpenFicha(m)}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                          title="Imprimir Ficha com Histórico de Visita e Acompanhamento Pastoral (A4)"
                          onClick={() => {
                            setVisitasMemberTarget(m);
                            setIsVisitasModalOpen(true);
                          }}
                        >
                          <ClipboardList className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950" title="Editar Membro" onClick={() => handleOpenEditModal(m)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950" title="Excluir Membro" onClick={() => setMemberToDelete(m)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-slate-500 dark:text-slate-400">
                    Nenhum membro encontrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table></div>

          {filteredMembers.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredMembers.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 20, 50, 100]}
              mode={paginationMode}
              onModeChange={setPaginationMode}
              hasMore={hasMoreMembers}
              onLoadMore={() => setCurrentPage((p) => p + 1)}
              itemName="membros"
            />
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="relatorios" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-card gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Relatório Avançado de Dizimistas e Ofertantes</h3>
                <p className="text-xs text-muted-foreground">Consulte o ranking de contribuições, fidelidade por período e emita relatórios oficiais em PDF.</p>
              </div>
            </div>
            <Button size="sm" onClick={() => setActiveTab("relatorios_avancados")} className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 text-xs gap-1.5 shadow-xs">
              <Award className="w-3.5 h-3.5" />
              Acessar Relatório Avançado
            </Button>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Membros Ativos por Faixa Etária</CardTitle>
              </CardHeader>
              <CardContent>
                {ageGroups.length > 0 ? (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={ageGroups}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {ageGroups.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip 
                           formatter={(value: number, name: string) => [`${value} membros`, name]}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-slate-500">
                    Nenhum dado com data de nascimento cadastrada.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exportar Relatórios</CardTitle>
                <CardDescription>Gere documentos em PDF com base na base atual.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" onClick={generateBirthdaysPDF} className="w-full justify-start h-auto p-4 gap-4">
                  <FileText className="w-6 h-6 text-primary" />
                  <div className="text-left">
                     <div className="font-semibold text-slate-700">Aniversariantes do Mês</div>
                     <div className="text-xs text-muted-foreground font-normal">Lista de membros que fazem aniversário neste mês.</div>
                  </div>
                </Button>
                <Button variant="outline" onClick={() => generateActiveMembersEventListPDF()} className="w-full justify-start h-auto p-4 gap-4">
                  <FileText className="w-6 h-6 text-emerald-500" />
                  <div className="text-left">
                     <div className="font-semibold text-slate-700">Membros Ativos (Lista de Presença)</div>
                     <div className="text-xs text-muted-foreground font-normal">Lista de membros ativos com espaço para assinatura.</div>
                  </div>
                </Button>
                <Button variant="outline" onClick={generateMemberListPDF} className="w-full justify-start h-auto p-4 gap-4">
                  <FileText className="w-6 h-6 text-blue-500" />
                  <div className="text-left">
                     <div className="font-semibold text-slate-700">Lista Completa (Filtro Atual)</div>
                     <div className="text-xs text-muted-foreground font-normal">Gera uma lista com base nos filtros da tela de membros.</div>
                  </div>
                </Button>
                
                <div className="flex gap-4 w-full pt-4 border-t">
                  <Button variant="outline" className="flex-1 justify-center h-auto p-4 gap-2 text-green-600 hover:text-green-700 hover:bg-green-50" onClick={() => {
                    const data = filteredMembers.map(m => ({
                      Nome: m.name,
                      CPF: m.cpf,
                      Papel: m.role,
                      Status: m.status,
                      Email: m.email,
                      Telefone: m.phone,
                      Gênero: m.gender,
                      Nascimento: m.birthDate ? new Date(m.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "",
                      DataBatismo: m.baptismDate ? new Date(m.baptismDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "",
                      Endereço: m.address
                    }));
                    exportToCSV(data, `relatorio_secretaria_${new Date().getTime()}`);
                  }}>
                    <Download className="w-5 h-5" />
                    Exportar CSV
                  </Button>
                  <Button variant="outline" className="flex-1 justify-center h-auto p-4 gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => {
                    const data = filteredMembers.map(m => ({
                      Nome: m.name,
                      CPF: m.cpf,
                      Papel: m.role,
                      Status: m.status,
                      Email: m.email,
                      Telefone: m.phone,
                      Gênero: m.gender,
                      Nascimento: m.birthDate ? new Date(m.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "",
                      DataBatismo: m.baptismDate ? new Date(m.baptismDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : "",
                      Endereço: m.address
                    }));
                    exportToXLSX(data, `relatorio_secretaria_${new Date().getTime()}`);
                  }}>
                    <Download className="w-5 h-5" />
                    Exportar Excel
                  </Button>
                  <Button 
                    className="flex-1 justify-center h-auto p-4 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-xs" 
                    onClick={() => setIsPdfExportModalOpen(true)}
                  >
                    <Printer className="w-5 h-5" />
                    Exportar PDF / Imprimir Relatório
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
      </TabsContent>
      <TabsContent value="relatorios_avancados" className="space-y-6">
        <RelatorioDizimistasOfertantes />
      </TabsContent>
      <TabsContent value="formularios">
        <Formularios />
      </TabsContent>
      </Tabs>

      <Dialog open={memberToDelete !== null} onOpenChange={(open) => !open && setMemberToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este membro? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setMemberToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={executeDeleteMember}>Sim, Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateToDelete !== null} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este modelo?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setTemplateToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={executeDeleteTemplate}>Sim, Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Digitalização de Documentos e Comprovantes com a Câmera */}
      <DocumentScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onFileSaved={handleFileSaved}
        membersList={branchMembers.map(m => ({ id: m.id, name: m.nome || m.name || "Membro", cpf: m.cpf }))}
      />

      {/* Modal de Leitura de Contatos via QR Code e Arquivos VCard */}
      <VCardQrContactScannerModal
        isOpen={isVCardQrModalOpen}
        onClose={() => setIsVCardQrModalOpen(false)}
        onOpenFullForm={handleOpenFullFormWithContact}
        onMemberAdded={() => toast.success("Lista de membros atualizada")}
      />

      {/* Modal Inteligente de Envio e Adaptação de Mensagens no WhatsApp */}
      <MemberWhatsAppMessageModal
        isOpen={isMemberWhatsAppModalOpen}
        onClose={() => setIsMemberWhatsAppModalOpen(false)}
        member={whatsAppMemberTarget}
        defaultTemplate={whatsAppDefaultTemplate}
        churchName={localStorage.getItem("church_name") || "Igreja Evangélica Manancial"}
      />

      {/* Check-in Seguro de Crianças • Ministério Kids */}
      <CheckinKidsModal
        isOpen={isKidsModalOpen}
        onClose={() => setIsKidsModalOpen(false)}
        churchName={localStorage.getItem("church_name") || "Igreja Evangélica Manancial"}
        activeBranchName={activeBranchName}
      />

      {/* Gestão de Células & Relatórios Semanais */}
      <RelatorioSemanalCelulaModal
        isOpen={isCelulaModalOpen}
        onClose={() => setIsCelulaModalOpen(false)}
        churchName={localStorage.getItem("church_name") || "Igreja Evangélica Manancial"}
        activeBranchName={activeBranchName}
      />

      {/* Declaração Anual de Contribuição para IRPF */}
      <DeclaracaoContribuicaoIrpfModal
        isOpen={isIrpfModalOpen}
        onClose={() => {
          setIsIrpfModalOpen(false);
          setSelectedIrpfMember(null);
        }}
        members={branchMembers}
        selectedMember={selectedIrpfMember}
        churchName={localStorage.getItem("church_name") || "Igreja Evangélica Manancial"}
      />

      {/* Central de Comunicados, Avisos à Comunidade e Mala Direta */}
      <ComunicadosModal
        isOpen={isComunicadosModalOpen}
        onClose={() => setIsComunicadosModalOpen(false)}
        members={branchMembers}
        churchName="Igreja O Brasil para Cristo - 2ª Congregação"
      />

      {/* Modal de Visualização e Impressão da Ficha de Cadastro de Membro */}
      <Dialog open={isFichaMembroModalOpen} onOpenChange={setIsFichaMembroModalOpen}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto print:p-0 print:border-none">
          <DialogHeader className="print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-600" />
                <div>
                  <DialogTitle className="text-base font-bold">Ficha Oficial de Cadastro de Membros (A4)</DialogTitle>
                  <DialogDescription className="text-xs">
                    Ficha padronizada da Igreja O Brasil para Cristo (2ª Congregação) com número sequencial e foto 3x4 ajustada.
                  </DialogDescription>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-muted/60 px-2 py-1 rounded border text-xs">
                  <span className="font-semibold text-muted-foreground">Nº Sequencial:</span>
                  <Input
                    type="text"
                    value={customFichaSeq}
                    onChange={(e) => setCustomFichaSeq(e.target.value)}
                    placeholder="0001"
                    className="h-7 w-20 text-xs font-mono font-bold text-center bg-background"
                    title="Altere o número sequencial oficial da ficha se desejar"
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadFichaPdf}
                  className="h-8 text-xs border-amber-300 text-amber-800 dark:text-amber-200 hover:bg-amber-50"
                  title="Salvar arquivo PDF da ficha oficial no computador"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  Baixar PDF
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={handlePrintFicha}
                  className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-xs"
                  title="Imprimir ficha diretamente em papel A4"
                >
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Imprimir Ficha (A4)
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="flex justify-center p-2 sm:p-4 bg-slate-100 dark:bg-slate-900 rounded-lg overflow-auto">
            <FichaMembroPrintable
              memberData={
                fichaMemberTarget
                  ? {
                      numeroFicha: customFichaSeq || "0001",
                      nome: fichaMemberTarget.nome || fichaMemberTarget.name || "",
                      endereco: fichaMemberTarget.endereco || fichaMemberTarget.address || "",
                      cidade: fichaMemberTarget.cidade || "Valparaíso - SP",
                      bairro: fichaMemberTarget.bairro || "",
                      cep: fichaMemberTarget.cep || "16880-000",
                      telefone: fichaMemberTarget.phone || fichaMemberTarget.telefone || "",
                      email: fichaMemberTarget.email || "",
                      naturalidade: fichaMemberTarget.naturalidade || "",
                      estadoCivil: fichaMemberTarget.estadoCivil || "",
                      dataNascimento: fichaMemberTarget.dataNascimento || fichaMemberTarget.birthDate || "",
                      cpf: fichaMemberTarget.cpf || "",
                      rg: fichaMemberTarget.rg || "",
                      sexo: fichaMemberTarget.sexo || "",
                      pai: fichaMemberTarget.pai || "",
                      mae: fichaMemberTarget.mae || "",
                      membroDesde: fichaMemberTarget.membroDesde || "",
                      dataBatismo: fichaMemberTarget.dataBatismo || fichaMemberTarget.baptismDate || "",
                      validade: fichaMemberTarget.validade || "31/12/2026",
                      cargo: fichaMemberTarget.role || fichaMemberTarget.cargo || "MEMBRO",
                      expedida: new Date().toLocaleDateString("pt-BR"),
                      fotoUrl: fichaMemberTarget.photoUrl || fichaMemberTarget.foto || fichaMemberTarget.photo || (editingMember?.id === fichaMemberTarget?.id ? photoPreview : "") || "",
                      signatureUrl: fichaMemberTarget.signatureUrl || "",
                    }
                  : null
              }
              churchName="IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO"
              churchSubtitle="2ª CONGREGAÇÃO DE VALPARAÍSO - SP | SECRETARIA GERAL"
              churchAddress="Rua Bartolomeu Bueno, nº 629 - Bairro Santa Casa"
              churchCityZip="Valparaíso - SP | CEP: 16880-000"
              churchCnpj="CNPJ: 43.832.227/0001-44"
              logoUrl={churchData?.logoDataUrl}
            />
          </div>

          <DialogFooter className="print:hidden flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={() => setIsFichaMembroModalOpen(false)}>
              Fechar
            </Button>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDownloadFichaPdf}
                className="h-8 text-xs border-amber-300 text-amber-800 dark:text-amber-200 hover:bg-amber-50"
              >
                <Download className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Baixar em PDF
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handlePrintFicha}
                className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              >
                <Printer className="w-3.5 h-3.5 mr-1" />
                Imprimir Ficha Oficial (A4)
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exportação Completa da Secretaria em PDF */}
      <SecretariaPdfExportModal
        isOpen={isPdfExportModalOpen}
        onClose={() => setIsPdfExportModalOpen(false)}
        members={members}
        branches={branches}
        activeBranch={activeBranch}
        activeBranchName={activeBranchName}
        churchData={churchData}
        userName={user?.name || "Administrador"}
      />

      {/* Modal de Ficha com Histórico de Visitas e Acompanhamento Pastoral */}
      <FichaVisitasAcompanhamentoModal
        isOpen={isVisitasModalOpen}
        onClose={() => {
          setIsVisitasModalOpen(false)
          setVisitasMemberTarget(null)
        }}
        member={visitasMemberTarget}
        members={members}
        churchData={churchData}
        onSaveRecord={(mId, rec) => {
          const targetMem = members.find((m: any) => m.id === mId)
          if (targetMem) {
            const updated = [rec, ...(targetMem.communications || [])]
            updateDoc(doc(db, "members", mId), { communications: updated }).catch(console.error)
          }
        }}
      />

      {/* Modal de Escala do Diaconato & Voluntários para Mural (Anexo 4) */}
      <EscalaMuralDiaconatoModal
        isOpen={isEscalaMuralModalOpen}
        onClose={() => setIsEscalaMuralModalOpen(false)}
        members={members}
        churchData={churchData}
        activeBranchName={activeBranchName}
        activeBranchId={activeBranch}
      />

      {/* Modal de Emissão de Crachás para Voluntários, Diáconos e Diaconisas */}
      <CrachaVoluntariosModal
        isOpen={isCrachaVoluntariosModalOpen}
        onClose={() => setIsCrachaVoluntariosModalOpen(false)}
        volunteers={secretariaVolunteersList}
        churchData={churchData}
        activeBranchName={activeBranchName}
        activeBranchId={activeBranch}
      />

      {/* Modal de Escala de Dirigentes de Culto & Pregadores */}
      <EscalaDirigentesModal
        isOpen={isEscalaDirigentesModalOpen}
        onClose={() => setIsEscalaDirigentesModalOpen(false)}
        members={members}
        churchData={churchData}
        activeBranchName={activeBranchName}
        activeBranchId={activeBranch}
      />

      {/* Modal de Escala de Limpeza & Conservação do Templo */}
      <EscalaLimpezaModal
        isOpen={isEscalaLimpezaModalOpen}
        onClose={() => setIsEscalaLimpezaModalOpen(false)}
        members={members}
        churchData={churchData}
        activeBranchName={activeBranchName}
        activeBranchId={activeBranch}
      />

      {/* Modal de Escala de Músicos & Louvor */}
      <EscalaMusicosModal
        isOpen={isEscalaMusicosModalOpen}
        onClose={() => setIsEscalaMusicosModalOpen(false)}
        members={members}
        churchData={churchData}
        activeBranchName={activeBranchName}
        activeBranchId={activeBranch}
      />

      {/* Modal de Formulários Financeiros da Secretaria (Entradas, Saídas, Dizimista, Fechamento) */}
      <FormulariosFinanceirosSecretariaModal
        isOpen={isFormulariosFinanceirosModalOpen}
        onClose={() => setIsFormulariosFinanceirosModalOpen(false)}
        churchData={churchData}
        activeBranchName={activeBranchName}
        activeBranchId={activeBranch}
      />
    </motion.div>
    </TooltipProvider>
  )
}
