import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Users,
  Calendar as CalendarIcon,
  Printer,
  Download,
  Share2,
  Plus,
  Trash2,
  Check,
  Save,
  Sparkles,
  DoorClosed,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  UserCheck,
  FileText,
  Search,
  Sliders,
  Eye,
  CheckCircle2,
  BookOpen,
  Edit,
  Briefcase,
  HelpCircle,
  X,
  ShieldCheck,
  Info,
  IdCard,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { printDocument, downloadElementAsPdf } from "@/lib/printUtils";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";
import { CrachaVoluntariosModal } from "@/components/secretaria/CrachaVoluntariosModal";

export interface EscalaPoint {
  id: string;
  name: string; // e.g. "PORTA DA FRENTE", "PORTA DO CORREDOR", "ESTACIONAMENTO"
  color: string; // hex color for column header
}

export interface EscalaRow {
  id: string;
  date: string; // YYYY-MM-DD
  formattedDate: string; // DD/MM/YYYY
  dayOfWeek: string; // Domingo, Terça-feira, etc.
  assignments: { [pointId: string]: string };
}

export interface EscalaVolunteer {
  id: string;
  name: string;
  role?: string;
  phone?: string;
}

export interface EscalaMuralRecord {
  id?: string;
  title: string;
  churchName: string;
  subTitle?: string;
  periodMonthYear: string;
  cultoName?: string;
  biblicalVerse?: string;
  points: EscalaPoint[];
  rows: EscalaRow[];
  volunteers: EscalaVolunteer[];
  cargosList?: string[];
  observations: string;
  warningNotice: string;
  responsibleRole: string;
  responsibleName: string;
  responsibleSignatureUrl?: string;
  branchId?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface EscalaMuralDiaconatoProps {
  isOpen?: boolean;
  onClose?: () => void;
  isEmbedded?: boolean;
  members?: Array<{ id?: string; name?: string; nome?: string; phone?: string; role?: string; cargo?: string }>;
  churchData?: any;
  activeBranchName?: string;
  activeBranchId?: string;
}

const DEFAULT_POINTS: EscalaPoint[] = [
  { id: "porta_frente", name: "PORTA DA FRENTE", color: "#B8682E" },
  { id: "porta_corredor", name: "PORTA DO CORREDOR", color: "#2B7BB9" }
];

const DEFAULT_OBSERVATIONS = 
  "A CHAVE SEMPRE ESTARÁ COM QUEM ESTIVER ESCALADO NA PORTA DA FRENTE\n" +
  "HAVENDO A NECESSIDADE DE TROCAR, COMUNICAR AO PASTOR CARLITO ANTES DE FAZER A TROCA OK.";

const DEFAULT_WARNING = 
  "Caso não consiga cumprir com o dia da sua escala, avisar com antecedência.";

const DEFAULT_BIBLICAL_VERSE =
  "Porque os que servirem bem como diáconos adquirirão para si uma boa posição e muita confiança na fé que há em Cristo Jesus. (1 Timóteo 3:13)";

const BIBLICAL_VERSES_PRESETS = [
  {
    label: "1 Timóteo 3:13 (Padrão)",
    verse: "Porque os que servirem bem como diáconos adquirirão para si uma boa posição e muita confiança na fé que há em Cristo Jesus. (1 Timóteo 3:13)"
  },
  {
    label: "Atos 6:3 (Homens de boa reputação)",
    verse: "Escolhei, pois, irmãos, dentre vós, sete homens de boa reputação, cheios do Espírito Santo e de sabedoria, aos quais constituamos sobre este importante negócio. (Atos 6:3)"
  },
  {
    label: "Romanos 12:7 (Ministério do serviço)",
    verse: "Se é ministério, seja em ministrar; se é ensinar, haja dedicação ao ensino; o que exorta, use esse dom em exortar; o que reparte, faça-o com liberalidade. (Romanos 12:7)"
  },
  {
    label: "Marcos 10:45 (O Filho do Homem veio para servir)",
    verse: "Pois o próprio Filho do Homem não veio para ser servido, mas para servir e dar a sua vida em resgate por muitos. (Marcos 10:45)"
  }
];

const DEFAULT_CARGOS = [
  "DIRETOR(A) DO DIACONATO",
  "RESPONSÁVEL PELO DIACONATO",
  "LÍDER DO DIACONATO",
  "COORDENADOR(A) DO DIACONATO",
  "PASTOR(A) TITULAR",
  "SECRETÁRIO(A) GERAL"
];

const INITIAL_VOLUNTEERS: EscalaVolunteer[] = [
  { id: "v1", name: "Maria Francinete", role: "Diaconisa" },
  { id: "v2", name: "Maria Angelica", role: "Diaconisa" },
  { id: "v3", name: "Celia Regina", role: "Diaconisa" },
  { id: "v4", name: "Luciano", role: "Diácono" },
  { id: "v5", name: "Israel", role: "Diácono" },
  { id: "v6", name: "Gustavo", role: "Cooperador" },
  { id: "v7", name: "Juliana", role: "Cooperadora" },
  { id: "v8", name: "Simone", role: "Cooperadora" },
  { id: "v9", name: "Ana Paula", role: "Diaconisa" },
  { id: "v10", name: "Everton", role: "Diácono" },
  { id: "v11", name: "Ariana", role: "Diaconisa" }
];

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const WEEKDAY_NAMES = [
  "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
  "Quinta-feira", "Sexta-feira", "Sábado"
];

export function EscalaMuralDiaconatoModal({
  isOpen = true,
  onClose,
  isEmbedded = false,
  members = [],
  churchData,
  activeBranchName = "2ª Congregação",
  activeBranchId = "sede"
}: EscalaMuralDiaconatoProps) {
  // Tabs: 'editor' | 'preview' | 'voluntarios' | 'historico'
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'voluntarios' | 'historico'>('editor');
  
  // History of scales loaded from Firestore / LocalStorage
  const [savedScales, setSavedScales] = useState<EscalaMuralRecord[]>([]);
  const [currentScaleId, setCurrentScaleId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [scaleToDelete, setScaleToDelete] = useState<string | null>(null);
  const [isDeletingScale, setIsDeletingScale] = useState(false);

  // Help modal state
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isCrachaModalOpen, setIsCrachaModalOpen] = useState(false);

  // Scale configuration fields
  const [title, setTitle] = useState("ESCALA DO DIACONATO");
  const [churchName, setChurchName] = useState(() => {
    return churchData?.nome || `Igreja Evang. Pentecostal O Brasil para Cristo - ${activeBranchName}`;
  });
  const [cultoName, setCultoName] = useState("");
  
  // Date picker states
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth()); // 0-indexed
  const [periodMonthYear, setPeriodMonthYear] = useState(() => `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`);

  // Points (Porta da Frente, Porta do Corredor, Estacionamento, etc.)
  const [points, setPoints] = useState<EscalaPoint[]>(DEFAULT_POINTS);
  const [newPointName, setNewPointName] = useState("");
  const [newPointColor, setNewPointColor] = useState("#2B7BB9");

  // Rows of schedule
  const [rows, setRows] = useState<EscalaRow[]>([]);

  // Roster of volunteers (with separate persistent storage)
  const [volunteers, setVolunteers] = useState<EscalaVolunteer[]>(() => {
    try {
      const saved = localStorage.getItem("church_escala_voluntarios");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_VOLUNTEERS;
  });

  // Volunteer add/edit form states
  const [newVolName, setNewVolName] = useState("");
  const [newVolRole, setNewVolRole] = useState("Diaconisa");
  const [newVolPhone, setNewVolPhone] = useState("");
  const [editingVolunteerId, setEditingVolunteerId] = useState<string | null>(null);
  const [isSavingVolunteers, setIsSavingVolunteers] = useState(false);

  // Observations, warning, verse, and responsible role & name
  const [observations, setObservations] = useState(DEFAULT_OBSERVATIONS);
  const [warningNotice, setWarningNotice] = useState(DEFAULT_WARNING);
  const [biblicalVerse, setBiblicalVerse] = useState(DEFAULT_BIBLICAL_VERSE);

  // Cadastro de Cargos para a Responsável
  const [cargosList, setCargosList] = useState<string[]>(DEFAULT_CARGOS);
  const [newCustomCargo, setNewCustomCargo] = useState("");
  const [isAddingCustomCargo, setIsAddingCustomCargo] = useState(false);

  const [responsibleRole, setResponsibleRole] = useState("DIRETOR(A) DO DIACONATO");
  const [responsibleName, setResponsibleName] = useState(() => {
    return churchData?.pastorTitular || churchData?.pastor || "Pr. Carlito Carvalho Rodrigues";
  });
  const [isTypingCustomResponsible, setIsTypingCustomResponsible] = useState(false);
  const [responsibleSignatureUrl, setResponsibleSignatureUrl] = useState<string | undefined>(() => {
    return churchData?.pastorSignatureUrl || undefined;
  });

  // Logo for Mural
  const churchLogo = getRegisteredChurchLogo(activeBranchId) || churchData?.logoDataUrl || null;

  // Manual specific date input
  const [manualDateInput, setManualDateInput] = useState("");

  // Search filter for volunteers in editor
  const [volunteerSearch, setVolunteerSearch] = useState("");

  // Zoom level for A4 preview
  const [previewZoom, setPreviewZoom] = useState<number>(100);

  // Sync Period title whenever month/year changes
  useEffect(() => {
    setPeriodMonthYear(`${MONTH_NAMES[selectedMonth]} ${selectedYear}`);
  }, [selectedMonth, selectedYear]);

  // Load volunteers from Firestore settings collection
  useEffect(() => {
    try {
      const docRef = doc(db, "settings", "escala_voluntarios");
      const unsub = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.volunteers) && data.volunteers.length > 0) {
            setVolunteers(data.volunteers);
            localStorage.setItem("church_escala_voluntarios", JSON.stringify(data.volunteers));
          }
        }
      }, (err) => {
        console.warn("Firestore escala_voluntarios snapshot error:", err);
      });
      return () => unsub();
    } catch (e) {
      console.warn("Error setting up volunteers listener:", e);
    }
  }, []);

  // Load scales from Firestore (with localStorage fallback)
  useEffect(() => {
    try {
      const colRef = collection(db, "escalaDiaconato");
      const unsub = onSnapshot(colRef, (snapshot) => {
        const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EscalaMuralRecord));
        list.sort((a, b) => ((b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
        setSavedScales(list);

        // If no scale selected and we have saved scales, load the latest
        if (!currentScaleId && list.length > 0) {
          loadScaleIntoForm(list[0]);
        }
      }, (err) => {
        console.warn("Firestore escalaDiaconato error, fallback to localStorage:", err);
        loadFromLocalStorage();
      });
      return () => unsub();
    } catch (e) {
      console.warn("Could not subscribe to escalaDiaconato:", e);
      loadFromLocalStorage();
    }
  }, []);

  const loadFromLocalStorage = () => {
    try {
      const saved = localStorage.getItem("church_escala_diaconato_mural");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSavedScales(parsed);
          if (!currentScaleId) {
            loadScaleIntoForm(parsed[0]);
          }
          return;
        }
      }
    } catch (e) {
      console.warn("Error reading localStorage escala:", e);
    }
    initializeDefaultSampleScale();
  };

  // Pre-fill with sample identical to Anexo (Outubro / Novembro)
  const initializeDefaultSampleScale = () => {
    const defaultRows: EscalaRow[] = [
      { id: "r1", date: "2026-10-06", formattedDate: "06/10/2026", dayOfWeek: "Terça-feira", assignments: { porta_frente: "Maria Francinete", porta_corredor: "Israel" } },
      { id: "r2", date: "2026-10-09", formattedDate: "09/10/2026", dayOfWeek: "Sexta-feira", assignments: { porta_frente: "Simone", porta_corredor: "Gustavo" } },
      { id: "r3", date: "2026-10-11", formattedDate: "11/10/2026", dayOfWeek: "Domingo", assignments: { porta_frente: "Celia Regina", porta_corredor: "Luciano" } },
      { id: "r4", date: "2026-10-13", formattedDate: "13/10/2026", dayOfWeek: "Terça-feira", assignments: { porta_frente: "Maria Angelica", porta_corredor: "Juliana" } },
      { id: "r5", date: "2026-10-16", formattedDate: "16/10/2026", dayOfWeek: "Sexta-feira", assignments: { porta_frente: "Maria Francinete", porta_corredor: "Luciano" } },
      { id: "r6", date: "2026-10-18", formattedDate: "18/10/2026", dayOfWeek: "Domingo", assignments: { porta_frente: "TODOS", porta_corredor: "TODOS" } },
      { id: "r7", date: "2026-10-20", formattedDate: "20/10/2026", dayOfWeek: "Terça-feira", assignments: { porta_frente: "Maria Angelica", porta_corredor: "________________________" } },
      { id: "r8", date: "2026-10-23", formattedDate: "23/10/2026", dayOfWeek: "Sexta-feira", assignments: { porta_frente: "Juliana", porta_corredor: "Celia Regina" } },
      { id: "r9", date: "2026-10-25", formattedDate: "25/10/2026", dayOfWeek: "Domingo", assignments: { porta_frente: "TODOS", porta_corredor: "TODOS" } },
      { id: "r10", date: "2026-10-27", formattedDate: "27/10/2026", dayOfWeek: "Terça-feira", assignments: { porta_frente: "Simone", porta_corredor: "Israel" } },
      { id: "r11", date: "2026-10-30", formattedDate: "30/10/2026", dayOfWeek: "Sexta-feira", assignments: { porta_frente: "Celia Regina", porta_corredor: "Maria Angelica" } }
    ];
    setRows(defaultRows);
    setSelectedYear(2026);
    setSelectedMonth(9); // Outubro
    setPeriodMonthYear("Outubro 2026");
  };

  const loadScaleIntoForm = (scale: EscalaMuralRecord) => {
    setCurrentScaleId(scale.id || null);
    setTitle(scale.title || "ESCALA DO DIACONATO");
    setChurchName(scale.churchName || churchData?.nome || "Igreja Evang. Pentecostal O Brasil para Cristo - 2ª Congregação");
    setCultoName(scale.cultoName || "");
    setPeriodMonthYear(scale.periodMonthYear || "Outubro 2026");
    setPoints(scale.points && scale.points.length > 0 ? scale.points : DEFAULT_POINTS);
    setRows(scale.rows || []);
    if (scale.volunteers && scale.volunteers.length > 0) {
      setVolunteers(scale.volunteers);
    }
    if (scale.cargosList && scale.cargosList.length > 0) {
      setCargosList(scale.cargosList);
    }
    setObservations(scale.observations !== undefined ? scale.observations : DEFAULT_OBSERVATIONS);
    setWarningNotice(scale.warningNotice !== undefined ? scale.warningNotice : DEFAULT_WARNING);
    setBiblicalVerse(scale.biblicalVerse || DEFAULT_BIBLICAL_VERSE);
    setResponsibleRole(scale.responsibleRole || "DIRETOR(A) DO DIACONATO");
    setResponsibleName(scale.responsibleName || churchData?.pastorTitular || "Pr. Carlito Carvalho Rodrigues");
    if (scale.responsibleSignatureUrl) {
      setResponsibleSignatureUrl(scale.responsibleSignatureUrl);
    }
  };

  // Helper to persist volunteers to Firestore and LocalStorage
  const persistVolunteersToStorage = async (newList: EscalaVolunteer[]) => {
    setIsSavingVolunteers(true);
    try {
      localStorage.setItem("church_escala_voluntarios", JSON.stringify(newList));
      await setDoc(doc(db, "settings", "escala_voluntarios"), {
        volunteers: newList,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.warn("Could not save volunteers to Firestore, saved to localStorage:", e);
    } finally {
      setIsSavingVolunteers(false);
    }
  };

  // Import members from church database into volunteers roster
  const handleImportChurchMembers = () => {
    if (!members || members.length === 0) {
      toast.info("Nenhum membro cadastrado na secretaria para importar.");
      return;
    }

    const existingNames = new Set(volunteers.map(v => v.name.toLowerCase().trim()));
    const newOnes: EscalaVolunteer[] = [];

    members.forEach((m, idx) => {
      const name = (m.name || m.nome || "").trim();
      if (!name) return;
      if (!existingNames.has(name.toLowerCase())) {
        newOnes.push({
          id: `m_${m.id || idx}_${Date.now()}`,
          name: name,
          role: m.role || m.cargo || "Diácono / Diaconisa",
          phone: m.phone || ""
        });
        existingNames.add(name.toLowerCase());
      }
    });

    if (newOnes.length > 0) {
      const updated = [...volunteers, ...newOnes];
      setVolunteers(updated);
      persistVolunteersToStorage(updated);
      toast.success(`${newOnes.length} voluntários importados e salvos com sucesso!`);
    } else {
      toast.info("Todos os membros da congregação já estão na lista de voluntários.");
    }
  };

  // Add or Edit custom volunteer
  const handleSaveVolunteerForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVolName.trim()) {
      toast.error("Digite o nome do voluntário ou diácono.");
      return;
    }

    if (editingVolunteerId) {
      // Editing existing volunteer
      const oldVol = volunteers.find(v => v.id === editingVolunteerId);
      const oldName = oldVol ? oldVol.name : "";
      const updatedName = newVolName.trim();

      const updated = volunteers.map(v => {
        if (v.id === editingVolunteerId) {
          return {
            ...v,
            name: updatedName,
            role: newVolRole.trim() || "Diaconato",
            phone: newVolPhone.trim()
          };
        }
        return v;
      });

      // Also propagate name update in existing rows if name changed
      if (oldName && oldName !== updatedName) {
        setRows(prevRows => prevRows.map(row => {
          const newAssignments = { ...row.assignments };
          Object.keys(newAssignments).forEach(ptId => {
            if (newAssignments[ptId] === oldName) {
              newAssignments[ptId] = updatedName;
            }
          });
          return { ...row, assignments: newAssignments };
        }));
      }

      setVolunteers(updated);
      persistVolunteersToStorage(updated);
      setEditingVolunteerId(null);
      setNewVolName("");
      setNewVolPhone("");
      toast.success(`Cadastro de "${updatedName}" alterado e gravado com sucesso!`);
    } else {
      // Adding new volunteer
      const item: EscalaVolunteer = {
        id: `v_${Date.now()}`,
        name: newVolName.trim(),
        role: newVolRole.trim() || "Diaconato",
        phone: newVolPhone.trim()
      };
      const updated = [...volunteers, item];
      setVolunteers(updated);
      persistVolunteersToStorage(updated);
      setNewVolName("");
      setNewVolPhone("");
      toast.success(`"${item.name}" cadastrado(a) e gravado no sistema!`);
    }
  };

  const handleStartEditVolunteer = (vol: EscalaVolunteer) => {
    setEditingVolunteerId(vol.id);
    setNewVolName(vol.name);
    setNewVolRole(vol.role || "Diaconisa");
    setNewVolPhone(vol.phone || "");
    toast.info(`Editando "${vol.name}". Altere os dados no formulário acima.`);
  };

  const handleCancelEditVolunteer = () => {
    setEditingVolunteerId(null);
    setNewVolName("");
    setNewVolPhone("");
    setNewVolRole("Diaconisa");
  };

  const handleRemoveVolunteer = (id: string) => {
    const volToRemove = volunteers.find(v => v.id === id);
    const updated = volunteers.filter(v => v.id !== id);
    setVolunteers(updated);
    persistVolunteersToStorage(updated);
    if (editingVolunteerId === id) {
      handleCancelEditVolunteer();
    }
    toast.success(`Voluntário "${volToRemove?.name || ''}" excluído e alterações gravadas.`);
  };

  // Add custom cargo to cargosList
  const handleAddCargo = () => {
    if (!newCustomCargo.trim()) {
      toast.error("Digite o nome do cargo para cadastrar.");
      return;
    }
    const formatted = newCustomCargo.trim().toUpperCase();
    if (cargosList.includes(formatted)) {
      toast.info("Este cargo já está cadastrado.");
      setResponsibleRole(formatted);
      setIsAddingCustomCargo(false);
      setNewCustomCargo("");
      return;
    }
    const updated = [...cargosList, formatted];
    setCargosList(updated);
    setResponsibleRole(formatted);
    setNewCustomCargo("");
    setIsAddingCustomCargo(false);
    toast.success(`Cargo "${formatted}" cadastrado e selecionado!`);
  };

  // Add a new position/point
  const handleAddPoint = () => {
    if (!newPointName.trim()) {
      toast.error("Digite o nome do ponto (ex: Estacionamento, Porta Lateral, Altar, etc.)");
      return;
    }
    const formattedName = newPointName.trim().toUpperCase();
    const slug = formattedName.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_" + Date.now().toString().slice(-4);
    
    // Choose pleasant alternating colors for new points
    const defaultColorPalette = ["#2B7BB9", "#B8682E", "#2E7D32", "#6A1B9A", "#C2185B", "#00838F"];
    const chosenColor = newPointColor || defaultColorPalette[points.length % defaultColorPalette.length];

    const newPt: EscalaPoint = {
      id: slug,
      name: formattedName,
      color: chosenColor
    };

    // Update existing rows so they have a blank line for this new point
    setRows(prevRows => prevRows.map(row => ({
      ...row,
      assignments: {
        ...row.assignments,
        [newPt.id]: "________________________"
      }
    })));

    setPoints(prev => [...prev, newPt]);
    setNewPointName("");
    toast.success(`Ponto "${newPt.name}" adicionado! Todas as linhas foram atualizadas.`);
  };

  const handleRemovePoint = (pointId: string) => {
    if (points.length <= 1) {
      toast.error("A escala deve conter ao menos 1 ponto cadastrado.");
      return;
    }
    setPoints(prev => prev.filter(p => p.id !== pointId));
    toast.info("Ponto removido da tabela.");
  };

  // Generate cult days automatically for a set of weekdays
  const handleGenerateCultDays = (targetWeekdays: number[], label: string) => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const newRows: EscalaRow[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(selectedYear, selectedMonth, day);
      const weekday = d.getDay(); // 0 is Sunday, 2 is Tuesday, etc.

      if (targetWeekdays.includes(weekday)) {
        const yyyy = selectedYear;
        const mm = String(selectedMonth + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const dateIso = `${yyyy}-${mm}-${dd}`;
        const formattedDate = `${dd}/${mm}/${yyyy}`;
        const dayOfWeek = WEEKDAY_NAMES[weekday];

        const existing = rows.find(r => r.date === dateIso);
        const assignments: { [k: string]: string } = {};

        points.forEach(pt => {
          assignments[pt.id] = existing?.assignments?.[pt.id] || "________________________";
        });

        newRows.push({
          id: `r_${dateIso}`,
          date: dateIso,
          formattedDate,
          dayOfWeek,
          assignments
        });
      }
    }

    setRows(newRows);
    toast.success(`${newRows.length} dias de culto gerados (${label})!`);
  };

  // Add a specific custom date
  const handleAddManualDate = () => {
    if (!manualDateInput) {
      toast.error("Selecione uma data no campo de calendário.");
      return;
    }

    const parts = manualDateInput.split('-');
    if (parts.length !== 3) return;

    const yyyy = parseInt(parts[0], 10);
    const mm = parseInt(parts[1], 10);
    const dd = parseInt(parts[2], 10);

    const d = new Date(yyyy, mm - 1, dd);
    const weekday = d.getDay();
    const dayOfWeek = WEEKDAY_NAMES[weekday];
    const formattedDate = `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yyyy}`;

    if (rows.some(r => r.date === manualDateInput)) {
      toast.info("Esta data já está inclusa na tabela.");
      return;
    }

    const assignments: { [k: string]: string } = {};
    points.forEach(pt => {
      assignments[pt.id] = "________________________";
    });

    const newRow: EscalaRow = {
      id: `r_${manualDateInput}`,
      date: manualDateInput,
      formattedDate,
      dayOfWeek,
      assignments
    };

    const updated = [...rows, newRow];
    updated.sort((a, b) => a.date.localeCompare(b.date));
    setRows(updated);
    setManualDateInput("");
    toast.success(`Data ${formattedDate} adicionada à escala!`);
  };

  const handleRemoveRow = (rowId: string) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
    toast.info("Dia de culto removido da escala.");
  };

  // Assign volunteer or quick value ("TODOS", "________________________")
  const handleSetAssignment = (rowId: string, pointId: string, val: string) => {
    // Check duplication check ONLY within the same day/culto (targetRow)
    if (val && val !== "________________________" && val.toUpperCase() !== "TODOS") {
      const targetRow = rows.find(r => r.id === rowId);
      if (targetRow) {
        const conflictingPoint = points.find(p => p.id !== pointId && (targetRow.assignments?.[p.id] || "").trim().toLowerCase() === val.trim().toLowerCase());
        if (conflictingPoint) {
          toast.error(`"${val}" já está escalado(a) no ponto "${conflictingPoint.name}" NESTE MESMO DIA (${targetRow.formattedDate})! Em outros dias do mês, a escalação é livre.`);
          return;
        }
      }
    }

    setRows(prev => prev.map(r => {
      if (r.id === rowId) {
        return {
          ...r,
          assignments: {
            ...r.assignments,
            [pointId]: val
          }
        };
      }
      return r;
    }));
  };

  // Save scale to Firestore & LocalStorage (Permite salvar e continuar editando)
  const handleSaveScale = async () => {
    if (rows.length === 0) {
      toast.error("Adicione ao menos um dia de culto na escala antes de salvar.");
      return;
    }

    setIsSaving(true);
    const payload: Omit<EscalaMuralRecord, "id"> = {
      title,
      churchName,
      cultoName,
      periodMonthYear,
      biblicalVerse,
      points,
      rows,
      volunteers,
      cargosList,
      observations,
      warningNotice,
      responsibleRole,
      responsibleName,
      responsibleSignatureUrl,
      branchId: activeBranchId,
      updatedAt: serverTimestamp()
    };

    try {
      if (currentScaleId) {
        // Update existing scale in database
        await updateDoc(doc(db, "escalaDiaconato", currentScaleId), payload);
        toast.success(`Escala "${periodMonthYear}" atualizada com sucesso no banco de dados!`);
      } else {
        // Create new scale in database
        const docRef = await addDoc(collection(db, "escalaDiaconato"), {
          ...payload,
          createdAt: serverTimestamp()
        });
        setCurrentScaleId(docRef.id);
        toast.success(`Nova escala "${periodMonthYear}" salva com sucesso! Você pode continuar editando.`);
      }
      // Also ensure volunteers roster is synced
      persistVolunteersToStorage(volunteers);
    } catch (err) {
      console.warn("Could not save to Firestore, saving to localStorage:", err);
      // LocalStorage fallback
      const currentList: EscalaMuralRecord[] = JSON.parse(localStorage.getItem("church_escala_diaconato_mural") || "[]");
      const recordToSave: EscalaMuralRecord = {
        id: currentScaleId || `scale_${Date.now()}`,
        ...payload
      };
      const filtered = currentList.filter(s => s.id !== recordToSave.id);
      filtered.unshift(recordToSave);
      localStorage.setItem("church_escala_diaconato_mural", JSON.stringify(filtered));
      setSavedScales(filtered);
      if (!currentScaleId) setCurrentScaleId(recordToSave.id!);
      toast.success("Escala salva com sucesso! As alterações estão gravadas.");
    } finally {
      setIsSaving(false);
    }
  };

  // Create brand new scale
  const handleNewScale = () => {
    setCurrentScaleId(null);
    setTitle("ESCALA DO DIACONATO");
    setObservations(DEFAULT_OBSERVATIONS);
    setWarningNotice(DEFAULT_WARNING);
    setBiblicalVerse(DEFAULT_BIBLICAL_VERSE);
    const nextMonth = (now.getMonth() + 1) % 12;
    const nextYear = now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear();
    setSelectedMonth(nextMonth);
    setSelectedYear(nextYear);
    setPeriodMonthYear(`${MONTH_NAMES[nextMonth]} ${nextYear}`);
    setRows([]);
    toast.info("Criando nova escala em branco. Escolha os dias de culto no calendário.");
    setActiveTab('editor');
  };

  // Preparar exclusão com diálogo seguro de confirmação (Anexo 4)
  const handleDeleteScale = (scaleId: string) => {
    setScaleToDelete(scaleId);
  };

  // Executar exclusão definitiva com atualização garantida da interface e persistência
  const confirmDeleteScale = async () => {
    if (!scaleToDelete) return;
    setIsDeletingScale(true);
    const toastId = toast.loading("Excluindo escala do mural...");
    const targetId = scaleToDelete;

    try {
      // 1. Tentar deletar do Firestore
      try {
        await deleteDoc(doc(db, "escalaDiaconato", targetId));
      } catch (e) {
        console.warn("Aviso Firestore ao excluir doc:", e);
      }

      // 2. Atualizar estado local e localStorage de forma síncrona
      setSavedScales(prev => {
        const filtered = prev.filter(s => s.id !== targetId);
        try {
          localStorage.setItem("church_escala_diaconato_mural", JSON.stringify(filtered));
        } catch (e) {
          console.warn("Erro ao salvar localStorage:", e);
        }
        return filtered;
      });

      // 3. Se a escala excluída for a que está aberta, reiniciar para nova escala
      if (currentScaleId === targetId) {
        handleNewScale();
      }

      toast.success("Escala excluída do sistema com sucesso!", { id: toastId });
    } catch (err) {
      console.error("Erro ao excluir:", err);
      setSavedScales(prev => prev.filter(s => s.id !== targetId));
      toast.success("Escala removida da listagem.", { id: toastId });
    } finally {
      setIsDeletingScale(false);
      setScaleToDelete(null);
    }
  };

  // Copy WhatsApp formatted text
  const handleCopyWhatsApp = () => {
    let msg = `⛪ *${title.toUpperCase()}*\n`;
    msg += `📍 *${churchName}*\n`;
    msg += `🗓️ *Período:* ${periodMonthYear}\n`;
    if (cultoName) msg += `📖 *Culto:* ${cultoName}\n`;
    msg += `─────────────────────────\n\n`;

    rows.forEach(r => {
      msg += `📅 *${r.formattedDate} (${r.dayOfWeek})*\n`;
      points.forEach(pt => {
        const who = r.assignments?.[pt.id] || "__________";
        msg += `  🚪 *${pt.name}:* ${who}\n`;
      });
      msg += `\n`;
    });

    if (observations) {
      msg += `📝 *OBSERVAÇÕES IMPORTANTES:*\n${observations}\n\n`;
    }
    if (warningNotice) {
      msg += `⚠️ *AVISO:* ${warningNotice}\n\n`;
    }
    if (biblicalVerse) {
      msg += `📖 *VERSÍCULO:* ${biblicalVerse}\n\n`;
    }
    msg += `✍️ *${responsibleRole}:* ${responsibleName}\n`;

    navigator.clipboard.writeText(msg);
    toast.success("Texto da escala copiado para o WhatsApp com sucesso!");
  };

  // Print A4 Mural (Always uses the permanent mounted printable container)
  const handlePrintMural = () => {
    toast.info("Preparando impressão da escala para o mural...");
    const printed = printDocument({
      elementId: "escala-mural-printable-container-permanent",
      title: `Escala_Diaconato_Mural_${periodMonthYear.replace(/\s+/g, '_')}`
    });
    if (!printed) {
      // Fallback to active tab container if needed
      printDocument({
        elementId: "escala-mural-printable-container",
        title: `Escala_Diaconato_Mural_${periodMonthYear.replace(/\s+/g, '_')}`
      });
    }
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    const toastId = toast.loading("Gerando arquivo PDF para o mural...");
    let success = await downloadElementAsPdf(
      "escala-mural-printable-container-permanent",
      `Escala_Mural_Diaconato_${periodMonthYear.replace(/\s+/g, '_')}.pdf`
    );
    if (!success) {
      success = await downloadElementAsPdf(
        "escala-mural-printable-container",
        `Escala_Mural_Diaconato_${periodMonthYear.replace(/\s+/g, '_')}.pdf`
      );
    }
    if (success) {
      toast.success("PDF da escala baixado com sucesso!", { id: toastId });
    } else {
      toast.error("Erro ao gerar PDF. Use o botão de Imprimir para salvar em PDF.", { id: toastId });
    }
  };

  // Visual calendar grid days for the selected month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(selectedYear, selectedMonth, 1).getDay();
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const cells: Array<{ day: number | null; dateIso: string | null; isCultDay: boolean }> = [];

    for (let i = 0; i < firstDayIndex; i++) {
      cells.push({ day: null, dateIso: null, isCultDay: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const yyyy = selectedYear;
      const mm = String(selectedMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateIso = `${yyyy}-${mm}-${dd}`;
      const isCultDay = rows.some(r => r.date === dateIso);
      cells.push({ day, dateIso, isCultDay });
    }

    return cells;
  }, [selectedYear, selectedMonth, rows]);

  // Toggle day when clicking calendar cell
  const handleToggleCalendarDay = (dateIso: string) => {
    const exists = rows.some(r => r.date === dateIso);
    if (exists) {
      setRows(prev => prev.filter(r => r.date !== dateIso));
      toast.info("Dia de culto removido da escala.");
    } else {
      const parts = dateIso.split('-');
      const yyyy = parseInt(parts[0], 10);
      const mm = parseInt(parts[1], 10);
      const dd = parseInt(parts[2], 10);
      const d = new Date(yyyy, mm - 1, dd);
      const weekday = d.getDay();
      const dayOfWeek = WEEKDAY_NAMES[weekday];
      const formattedDate = `${String(dd).padStart(2, '0')}/${String(mm).padStart(2, '0')}/${yyyy}`;

      const assignments: { [k: string]: string } = {};
      points.forEach(pt => {
        assignments[pt.id] = "________________________";
      });

      const newRow: EscalaRow = {
        id: `r_${dateIso}`,
        date: dateIso,
        formattedDate,
        dayOfWeek,
        assignments
      };

      const updated = [...rows, newRow];
      updated.sort((a, b) => a.date.localeCompare(b.date));
      setRows(updated);
      toast.success(`${formattedDate} (${dayOfWeek}) adicionado.`);
    }
  };

  // Filtered volunteers for search
  const filteredVolunteers = useMemo(() => {
    if (!volunteerSearch.trim()) return volunteers;
    const term = volunteerSearch.toLowerCase();
    return volunteers.filter(v => 
      v.name.toLowerCase().includes(term) || 
      (v.role && v.role.toLowerCase().includes(term))
    );
  }, [volunteers, volunteerSearch]);

  // Dynamic Column Width Calculation for the Mural Table (Anexo 5)
  // Ensures table smoothly distributes available width across any number of points
  const columnWidths = useMemo(() => {
    const dateWidthPct = 16;
    const weekdayWidthPct = 18;
    const remainingPct = 100 - dateWidthPct - weekdayWidthPct; // 66%
    const pointWidthPct = points.length > 0 ? (remainingPct / points.length) : remainingPct;
    return {
      date: `${dateWidthPct}%`,
      weekday: `${weekdayWidthPct}%`,
      point: `${pointWidthPct}%`
    };
  }, [points.length]);

  // ==========================================
  // RENDER: DOCUMENTO OFICIAL PARA MURAL (A4)
  // Atende Anexos 1, 2, 3, 4, 5 e 6
  // ==========================================
  const renderOfficialMuralSheet = (containerId = "escala-mural-printable-container") => {
    return (
      <div 
        id={containerId}
        className="bg-white text-slate-900 mx-auto p-8 rounded-sm shadow-xl border border-slate-300 font-sans print:shadow-none print:border-none print:m-0 print:p-6 flex flex-col justify-between"
        style={{
          width: '210mm',
          minHeight: '297mm',
          boxSizing: 'border-box',
          backgroundColor: '#ffffff',
          color: '#0f172a'
        }}
      >
        <div>
          {/* Cabeçalho Oficial (Sem legenda de desenvolvedor e sem culto de oração conforme solicitado no Anexo 3) */}
          <div className="flex items-center justify-between pb-4 border-b-2 border-slate-900 mb-4 relative">
            {/* Logo da Igreja na Esquerda */}
            <div className="w-28 h-20 flex items-center justify-start shrink-0">
              {churchLogo ? (
                <img src={churchLogo} alt="Logo Igreja" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="border border-slate-300 rounded p-1.5 flex flex-col items-center justify-center bg-slate-50 text-[10px] text-center font-bold text-slate-700 w-24 h-16">
                  <span className="text-emerald-700 font-black text-xs">OBPC</span>
                  <span className="text-[8px] leading-tight mt-0.5">O Brasil para Cristo</span>
                </div>
              )}
            </div>

            {/* Título Centralizado com Congregação (Sem ícone ⛪ conforme solicitado) */}
            <div className="flex-1 text-center px-4">
              <h1 className="text-xl sm:text-2xl font-black tracking-wide text-slate-950 uppercase text-center">
                {title}
              </h1>
              <p className="text-sm font-bold text-slate-800 mt-1">
                {churchName}
              </p>
              <p className="text-base font-black text-slate-950 mt-1">
                {periodMonthYear}
              </p>
            </div>

            {/* Espaço à direita equilibrado com o logo da esquerda */}
            <div className="w-28 shrink-0">
              {cultoName ? (
                <span className="text-[10px] font-bold text-slate-800 block text-right uppercase">
                  {cultoName}
                </span>
              ) : null}
            </div>
          </div>

          {/* Tabela de Escala Oficial com Layout Fixo e Ajuste Automático a Cada Novo Ponto (Anexo 5) */}
          <div className="w-full border-2 border-slate-900 rounded-none overflow-hidden mb-5">
            <table className="w-full border-collapse text-xs table-fixed">
              <thead>
                <tr className="border-b-2 border-slate-900">
                  <th 
                    className="py-2.5 px-2 font-black text-white text-center uppercase tracking-wider border-r border-slate-800 text-[11px]" 
                    style={{ backgroundColor: '#2B7BB9', width: columnWidths.date }}
                  >
                    <span className="inline-flex items-center gap-1 justify-center">
                      <span>📅</span> DATA
                    </span>
                  </th>
                  <th 
                    className="py-2.5 px-2 font-black text-white text-center uppercase tracking-wider border-r border-slate-800 text-[11px]" 
                    style={{ backgroundColor: '#2B7BB9', width: columnWidths.weekday }}
                  >
                    <span className="inline-flex items-center gap-1 justify-center">
                      <span>🗓️</span> DIA DA SEMANA
                    </span>
                  </th>
                  {points.map((pt, idx) => (
                    <th 
                      key={pt.id} 
                      className={`py-2.5 px-2 font-black text-white text-center uppercase tracking-wider text-[11px] truncate ${idx < points.length - 1 ? 'border-r border-slate-800' : ''}`}
                      style={{ 
                        backgroundColor: pt.color || (idx === 0 ? '#B8682E' : '#2B7BB9'),
                        width: columnWidths.point 
                      }}
                      title={pt.name}
                    >
                      <span className="inline-flex items-center gap-1 justify-center truncate">
                        <span>🚪</span> {pt.name}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={2 + points.length} className="text-center py-8 text-slate-500 font-medium italic">
                      Nenhum dia de culto configurado para esta escala. Utilize a aba "Editor & Dias de Culto" para adicionar.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, rowIdx) => (
                    <tr 
                      key={r.id || rowIdx} 
                      className="border-b border-slate-700 hover:bg-slate-50/80 transition-colors"
                    >
                      {/* DATA */}
                      <td className="py-2 px-2 text-center font-bold text-slate-950 border-r border-slate-700 text-xs whitespace-nowrap">
                        {r.formattedDate}
                      </td>

                      {/* DIA DA SEMANA */}
                      <td className="py-2 px-2 text-center font-semibold text-slate-900 border-r border-slate-700 text-xs truncate">
                        {r.dayOfWeek}
                      </td>

                      {/* PONTOS CADASTRADOS (SE AJUSTA AUTOMATICAMENTE AO INSERIR NOVO PONTO) */}
                      {points.map((pt, ptIdx) => {
                        const assigned = r.assignments?.[pt.id] || "________________________";
                        const isBlankLine = assigned.startsWith("___");
                        const isAll = assigned.trim().toUpperCase() === "TODOS";

                        return (
                          <td 
                            key={pt.id} 
                            className={`py-2 px-2 text-center text-xs font-semibold truncate ${ptIdx < points.length - 1 ? 'border-r border-slate-700' : ''}`}
                          >
                            {isBlankLine ? (
                              <span className="text-slate-400 select-none block tracking-widest text-[10px] truncate">
                                ________________________
                              </span>
                            ) : (
                              <span className={`block truncate ${isAll ? 'font-black text-blue-900 uppercase' : 'font-bold text-slate-950'}`}>
                                {assigned}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Seção 1: Observações Importantes */}
          {observations && (
            <div className="w-full border-2 border-slate-900 p-3 mb-3 bg-white">
              <div className="text-center font-black text-slate-950 text-xs uppercase tracking-wider mb-1.5 flex items-center justify-center gap-1.5">
                <span>📝</span> OBSERVAÇÕES IMPORTANTES
              </div>
              <div className="border border-slate-300 rounded p-2 bg-slate-50/60 text-center">
                <p className="text-[11px] font-bold text-slate-800 uppercase tracking-wide leading-relaxed whitespace-pre-line">
                  {observations}
                </p>
              </div>
            </div>
          )}

          {/* Seção 2: Mensagem de Alerta */}
          {warningNotice && (
            <div className="w-full border-2 border-slate-900 p-3 mb-3 bg-white">
              <p className="text-xs font-bold text-slate-900 leading-normal flex items-center gap-2">
                <span className="text-amber-600 text-sm">⚠️</span>
                <span><strong>IMPORTANTE:</strong> {warningNotice}</span>
              </p>
            </div>
          )}

          {/* Seção 3: Versículo Bíblico do Diaconato (Solicitado no Anexo 6) */}
          {biblicalVerse && (
            <div className="w-full text-center my-3 px-4">
              <p className="text-xs italic font-semibold text-slate-700 leading-relaxed max-w-2xl mx-auto">
                "{biblicalVerse}"
              </p>
            </div>
          )}

          {/* Seção 4: Espaço de Assinatura da Responsável com Amplo Espaço em Branco para Assinar (Anexo 3) */}
          <div className="pt-4 pb-2 flex flex-col items-center justify-center">
            {/* Espaço em branco amplo para assinar com caneta */}
            <div className="h-24 flex items-center justify-center relative w-80">
              {responsibleSignatureUrl ? (
                <img 
                  src={responsibleSignatureUrl} 
                  alt="Assinatura" 
                  className="h-16 object-contain" 
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300 select-none">
                  <span className="text-[10px] tracking-wider uppercase font-medium">
                    (Espaço para assinatura manual)
                  </span>
                </div>
              )}
            </div>

            {/* Linha Oficial de Assinatura */}
            <div className="w-80 border-t-2 border-slate-900 pt-1.5 text-center">
              <p className="text-xs font-black text-slate-900 uppercase tracking-widest">
                {responsibleRole}
              </p>
              <p className="text-sm font-black text-slate-950 mt-1">
                {responsibleName}
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé institucional posicionado bem lá embaixo no rodapé da folha (Anexo 3) */}
        <div className="mt-auto pt-6 border-t border-dashed border-slate-400 flex items-center justify-between text-[10px] font-semibold text-slate-600">
          <span>Sistema de Gestão Eclesiástica • Módulo Secretaria</span>
          <span className="font-bold text-slate-800">Afixar no mural de avisos da igreja</span>
          <span>Gerado em {new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    );
  };

  // Main UI shell
  const content = (
    <div className="flex flex-col h-full space-y-4">
      {/* Container Permanente para Impressão e PDF (Garante que nunca dê erro de "Documento não encontrado") */}
      <div 
        style={{ 
          position: 'fixed', 
          left: '-12000px', 
          top: 0, 
          width: '210mm', 
          opacity: 0, 
          pointerEvents: 'none',
          zIndex: -1 
        }}
        aria-hidden="true"
      >
        {renderOfficialMuralSheet("escala-mural-printable-container-permanent")}
      </div>

      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-lg">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">
                  Escala do Diaconato & Voluntários (Mural)
                </h2>
                {currentScaleId ? (
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Gravada / Em Edição
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-[11px]">
                    Nova Escala
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Cadastro de cultos, pontos de portaria e geração da escala para afixar no mural da igreja.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Ajuda, WhatsApp, PDF, Imprimir, Salvar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsHelpModalOpen(true)}
            className="text-xs font-semibold text-primary hover:bg-primary/10"
            title="Ver instruções e novidades das escalas"
          >
            <HelpCircle className="w-4 h-4 mr-1 text-primary" /> Ajuda & Novidades
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyWhatsApp}
            className="text-xs font-medium border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <Share2 className="w-3.5 h-3.5 mr-1 text-emerald-600" /> WhatsApp
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadPdf}
            className="text-xs font-medium border-blue-500/40 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-blue-600" /> Baixar PDF
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handlePrintMural}
            className="text-xs font-semibold border-slate-300 hover:border-primary text-foreground shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1 text-primary" /> Imprimir A4
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSaveScale}
            disabled={isSaving}
            className="text-xs font-bold bg-primary text-primary-foreground shadow-xs hover:shadow-md"
          >
            {isSaving ? (
              <>Salvando...</>
            ) : (
              <><Save className="w-3.5 h-3.5 mr-1" /> Salvar Escala</>
            )}
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-muted/70 p-1">
          <TabsTrigger value="editor" className="text-xs font-semibold flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            Editor & Dias de Culto
          </TabsTrigger>
          <TabsTrigger value="voluntarios" className="text-xs font-semibold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Tabela de Voluntários ({volunteers.length})
          </TabsTrigger>
          <TabsTrigger value="preview" className="text-xs font-semibold flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-primary" />
            Visualizar Escala (Mural A4)
          </TabsTrigger>
          <TabsTrigger value="historico" className="text-xs font-semibold flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Histórico ({savedScales.length})
          </TabsTrigger>
        </TabsList>

        {/* ============================================================== */}
        {/* ABA 1: EDITOR & DIAS DE CULTO                                  */}
        {/* ============================================================== */}
        <TabsContent value="editor" className="space-y-4 pt-2">
          {/* Card: Cabeçalho & Parâmetros da Escala */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-muted/20 p-4 rounded-xl border">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Título Principal da Escala</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: ESCALA DO DIACONATO"
                className="h-8 text-xs font-bold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Mês e Ano (Período)</Label>
              <Input
                value={periodMonthYear}
                onChange={(e) => setPeriodMonthYear(e.target.value)}
                placeholder="Ex: Outubro 2026"
                className="h-8 text-xs font-semibold"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome da Igreja / Congregação</Label>
              <Input
                value={churchName}
                onChange={(e) => setChurchName(e.target.value)}
                placeholder="Nome da congregação"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Card: Cadastro de Pontos onde os Diáconos estarão posicionados */}
          <div className="bg-muted/20 p-4 rounded-xl border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
              <div>
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <DoorClosed className="w-4 h-4 text-amber-600" />
                  Cadastro de Pontos / Posições dos Diáconos e Diaconisas
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Adicione ou remova posições da escala (ex: Porta da Frente, Porta do Corredor, Estacionamento, Altar).
                </p>
              </div>

              {/* Add new point input */}
              <div className="flex items-center gap-1.5">
                <Input
                  value={newPointName}
                  onChange={(e) => setNewPointName(e.target.value)}
                  placeholder="Nome do novo ponto (ex: Estacionamento)"
                  className="h-8 text-xs w-56"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddPoint(); }}
                />
                <Button size="sm" onClick={handleAddPoint} className="h-8 text-xs font-semibold">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Ponto
                </Button>
              </div>
            </div>

            {/* List of active points */}
            <div className="flex items-center gap-2 flex-wrap">
              {points.map((pt) => (
                <div 
                  key={pt.id} 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-background shadow-2xs text-xs font-bold"
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: pt.color }}></span>
                  <span>{pt.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemovePoint(pt.id)}
                    className="text-muted-foreground hover:text-red-500 ml-1 p-0.5 rounded transition-colors"
                    title="Remover ponto da escala"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Card: Calendário para escolher os dias de culto & Presets automáticos */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Coluna 1: Calendário Interativo Visual */}
            <div className="bg-muted/20 p-4 rounded-xl border space-y-3 lg:col-span-1">
              <div className="flex items-center justify-between border-b pb-2">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  Calendário de Cultos
                </Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      if (selectedMonth === 0) {
                        setSelectedMonth(11);
                        setSelectedYear(prev => prev - 1);
                      } else {
                        setSelectedMonth(prev => prev - 1);
                      }
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs font-bold min-w-[100px] text-center">
                    {MONTH_NAMES[selectedMonth].slice(0, 3)} / {selectedYear}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => {
                      if (selectedMonth === 11) {
                        setSelectedMonth(0);
                        setSelectedYear(prev => prev + 1);
                      } else {
                        setSelectedMonth(prev => prev + 1);
                      }
                    }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Month Calendar Grid */}
              <div className="space-y-1">
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground pb-1">
                  <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((c, i) => {
                    if (c.day === null) {
                      return <div key={`empty_${i}`} className="h-7 w-full"></div>;
                    }
                    return (
                      <button
                        key={c.dateIso}
                        type="button"
                        onClick={() => c.dateIso && handleToggleCalendarDay(c.dateIso)}
                        className={`h-7 w-full rounded text-[11px] font-bold transition-all flex items-center justify-center ${
                          c.isCultDay 
                            ? 'bg-primary text-primary-foreground shadow-xs' 
                            : 'hover:bg-muted text-foreground'
                        }`}
                        title={c.isCultDay ? "Clique para remover dia de culto" : "Clique para incluir na escala"}
                      >
                        {c.day}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground text-center pt-1">
                  Clique no dia para ativar/desativar o culto na escala.
                </p>
              </div>

              {/* Presets de preenchimento em 1 clique */}
              <div className="space-y-1.5 pt-2 border-t">
                <Label className="text-[11px] font-semibold text-muted-foreground">Preenchimento Rápido do Mês:</Label>
                <div className="grid grid-cols-1 gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] font-medium justify-start text-left border-primary/30 hover:bg-primary/5"
                    onClick={() => handleGenerateCultDays([0, 2, 5], "Domingos, Terças e Sextas")}
                  >
                    <Sparkles className="w-3 h-3 mr-1.5 text-primary" />
                    Domingos, Terças e Sextas (Padrão)
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] font-medium justify-start text-left"
                    onClick={() => handleGenerateCultDays([0, 3], "Domingos e Quartas")}
                  >
                    <Check className="w-3 h-3 mr-1.5" />
                    Domingos e Quartas-feiras
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] font-medium justify-start text-left"
                    onClick={() => handleGenerateCultDays([0], "Apenas Domingos")}
                  >
                    <Check className="w-3 h-3 mr-1.5" />
                    Apenas Domingos
                  </Button>
                </div>
              </div>

              {/* Inclusão Manual de Data Específica */}
              <div className="space-y-1.5 pt-2 border-t">
                <Label className="text-[11px] font-semibold text-muted-foreground">Adicionar Data Específica (Vigília, etc):</Label>
                <div className="flex gap-1.5">
                  <Input
                    type="date"
                    value={manualDateInput}
                    onChange={(e) => setManualDateInput(e.target.value)}
                    className="h-7 text-xs flex-1"
                  />
                  <Button size="sm" onClick={handleAddManualDate} className="h-7 text-xs px-2.5">
                    Adicionar
                  </Button>
                </div>
              </div>
            </div>

            {/* Coluna 2 e 3: Tabela de Atribuição de Voluntários por Culto - Com Bloqueio de Duplicidade (Anexo 2) */}
            <div className="bg-muted/20 p-4 rounded-xl border space-y-3 lg:col-span-2 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b pb-2 mb-3">
                  <div>
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-emerald-600" />
                      Atribuição de Diáconos por Dia de Culto ({rows.length} cultos no mês)
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Cada ponto possui sua coluna alinhada. Voluntários podem ser escalados em vários dias do mês livremente (bloqueio de duplicidade restrito apenas ao mesmo dia).
                    </p>
                  </div>
                  {rows.length > 0 && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setRows([]);
                        toast.success("Dias de culto limpos da escala.");
                      }}
                      className="text-red-500 hover:text-red-700 h-7 text-xs"
                    >
                      Limpar Dias
                    </Button>
                  )}
                </div>

                {/* Banner de esclarecimento da regra de escalação */}
                <div className="flex items-center gap-2 text-[11px] bg-blue-50/90 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800/40 mb-3">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong>Regra de Escalação:</strong> O voluntário pode trabalhar em <strong>vários dias diferentes do mês</strong> (ex: domingos, terças e sextas). O bloqueio de duplicidade impede apenas que a mesma pessoa seja selecionada em dois pontos no <strong>mesmo culto/dia</strong>.
                  </span>
                </div>

                {rows.length === 0 ? (
                  <div className="text-center py-10 border border-dashed rounded-lg bg-background p-4 space-y-2">
                    <CalendarIcon className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                    <p className="text-xs font-medium text-muted-foreground">
                      Nenhum dia de culto selecionado. Use o calendário à esquerda ou clique em 
                      <strong> "Domingos, Terças e Sextas"</strong> para gerar automaticamente.
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg bg-background overflow-hidden">
                    <div className="max-h-[380px] overflow-x-auto overflow-y-auto">
                      <table className="w-full text-xs border-collapse">
                        <thead className="bg-muted/70 sticky top-0 z-10 border-b">
                          <tr>
                            <th className="py-2 px-3 text-left font-bold text-muted-foreground min-w-[120px] whitespace-nowrap">
                              Dia do Culto
                            </th>
                            {points.map((pt) => (
                              <th 
                                key={pt.id} 
                                className="py-2 px-3 text-left font-bold text-muted-foreground min-w-[210px] whitespace-nowrap"
                              >
                                <span className="inline-flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: pt.color }}></span>
                                  {pt.name}
                                </span>
                              </th>
                            ))}
                            <th className="py-2 px-2 text-center font-bold text-muted-foreground w-10">
                              Ação
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {rows.map((row) => (
                            <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                              {/* Data e Dia da Semana */}
                              <td className="py-2 px-3 align-middle whitespace-nowrap">
                                <span className="font-bold text-xs text-foreground block">{row.formattedDate}</span>
                                <span className="text-[10px] text-muted-foreground uppercase">{row.dayOfWeek}</span>
                              </td>

                              {/* Colunas dos Pontos com Prevenção de Duplicidade no Mesmo Dia (Anexo 2) */}
                              {points.map((pt) => {
                                const val = row.assignments?.[pt.id] || "________________________";

                                // Voluntários já escalados em OUTRO ponto neste mesmo culto/dia
                                const assignedOtherPointsMap: { [name: string]: string } = {};
                                points
                                  .filter(p => p.id !== pt.id)
                                  .forEach(p => {
                                    const otherName = (row.assignments?.[p.id] || "").trim();
                                    if (otherName && otherName !== "________________________" && otherName.toUpperCase() !== "TODOS") {
                                      assignedOtherPointsMap[otherName.toLowerCase()] = p.name;
                                    }
                                  });

                                return (
                                  <td key={pt.id} className="py-1.5 px-3 align-middle">
                                    <div className="flex items-center gap-1">
                                      <Select 
                                        value={val} 
                                        onValueChange={(newVal) => handleSetAssignment(row.id, pt.id, newVal)}
                                      >
                                        <SelectTrigger className="h-7 text-xs bg-background w-full">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="max-h-60">
                                          <SelectItem value="________________________">-- Deixar em Branco (Linha) --</SelectItem>
                                          <SelectItem value="TODOS">👥 TODOS</SelectItem>
                                          {volunteers.map((v) => {
                                            const otherPointName = assignedOtherPointsMap[v.name.toLowerCase().trim()];
                                            const isBlocked = !!otherPointName;

                                            return (
                                              <SelectItem 
                                                key={v.id} 
                                                value={v.name}
                                                disabled={isBlocked}
                                                className={isBlocked ? "opacity-50 text-muted-foreground" : ""}
                                              >
                                                {v.name} {v.role ? `(${v.role})` : ''} 
                                                {isBlocked ? ` (Já em ${otherPointName})` : ''}
                                              </SelectItem>
                                            );
                                          })}
                                        </SelectContent>
                                      </Select>

                                      <button
                                        type="button"
                                        onClick={() => handleSetAssignment(row.id, pt.id, "TODOS")}
                                        className="px-1.5 py-1 text-[10px] font-bold rounded border hover:bg-muted transition-colors text-blue-600 shrink-0"
                                        title="Definir 'TODOS' neste ponto"
                                      >
                                        Todos
                                      </button>
                                    </div>
                                  </td>
                                );
                              })}

                              {/* Remover Dia */}
                              <td className="py-1.5 px-2 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveRow(row.id)}
                                  className="text-muted-foreground hover:text-red-500 p-1 rounded transition-colors"
                                  title="Excluir este dia"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Botão de Atalho para ver a Prévia A4 */}
              <div className="pt-2 flex justify-end">
                <Button 
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className="bg-primary text-primary-foreground text-xs font-semibold"
                >
                  <Eye className="w-3.5 h-3.5 mr-1.5" />
                  Ver Escala Pronta para o Mural (A4)
                </Button>
              </div>
            </div>
          </div>

          {/* Card: Campo de Observações Livres, Alerta, Versículo e Assinatura com Cadastro de Cargos (Anexo 6) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border">
            {/* Observações e Versículo Bíblico */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>📝</span> Campo de Observações Importantes (Livre para Digitação)
                </Label>
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Ex: A CHAVE SEMPRE ESTARÁ COM QUEM ESTIVER ESCALADO NA PORTA DA FRENTE..."
                  rows={3}
                  className="text-xs bg-background leading-relaxed"
                />
              </div>

              {/* Versículo Bíblico para Diáconos (Solicitado no Anexo 6) */}
              <div className="space-y-1.5 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    Versículo Bíblico do Diaconato (Antes da Assinatura)
                  </Label>
                  <Select onValueChange={(val) => setBiblicalVerse(val)}>
                    <SelectTrigger className="h-6 text-[10px] w-48">
                      <SelectValue placeholder="Escolher versículo..." />
                    </SelectTrigger>
                    <SelectContent>
                      {BIBLICAL_VERSES_PRESETS.map((p, idx) => (
                        <SelectItem key={idx} value={p.verse} className="text-xs">
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Textarea
                  value={biblicalVerse}
                  onChange={(e) => setBiblicalVerse(e.target.value)}
                  placeholder="Digite o versículo bíblico referente ao diaconato..."
                  rows={2}
                  className="text-xs bg-background italic"
                />
              </div>
            </div>

            {/* Alerta, Cargo da Responsável e Nome da Responsável */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span>⚠️</span> Mensagem de Alerta / Antecedência
                </Label>
                <Input
                  value={warningNotice}
                  onChange={(e) => setWarningNotice(e.target.value)}
                  placeholder="Ex: Caso não consiga cumprir com o dia da sua escala, avisar com antecedência."
                  className="h-8 text-xs bg-background"
                />
              </div>

              {/* Cadastro de Cargos & Seleção do Nome da Responsável a partir dos Voluntários Cadastrados */}
              <div className="space-y-3 pt-2 border-t">
                {/* Cargo da Responsável com Opção de Cadastro de Novos Cargos */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1 text-foreground">
                      <Briefcase className="w-3.5 h-3.5 text-primary" />
                      Cargo da Responsável
                    </Label>
                    {!isAddingCustomCargo && (
                      <button
                        type="button"
                        onClick={() => setIsAddingCustomCargo(true)}
                        className="text-[10px] text-primary hover:underline font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Cadastrar Novo Cargo
                      </button>
                    )}
                  </div>

                  {isAddingCustomCargo ? (
                    <div className="flex items-center gap-1.5 p-2 rounded-lg bg-background border border-primary/40">
                      <Input
                        value={newCustomCargo}
                        onChange={(e) => setNewCustomCargo(e.target.value)}
                        placeholder="Nome do cargo (ex: DIRETOR DE DIÁCONOS)"
                        className="h-7 text-xs flex-1 uppercase"
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddCargo(); }}
                      />
                      <Button size="sm" onClick={handleAddCargo} className="h-7 text-xs px-2.5">
                        Salvar
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => { setIsAddingCustomCargo(false); setNewCustomCargo(""); }}
                        className="h-7 text-xs px-2"
                      >
                        Cancelar
                      </Button>
                    </div>
                  ) : (
                    <Select value={responsibleRole} onValueChange={(val) => setResponsibleRole(val)}>
                      <SelectTrigger className="h-8 text-xs bg-background font-semibold">
                        <SelectValue placeholder="Selecione o cargo da responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {cargosList.map((cargo) => (
                          <SelectItem key={cargo} value={cargo} className="text-xs font-medium">
                            {cargo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Nome da Responsável: Traz a lista de voluntários/diáconos cadastrados (Solicitado pelo usuário) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1 text-foreground">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Nome da Responsável (Lista de Diáconos / Voluntários)
                    </Label>
                    <button
                      type="button"
                      onClick={() => setIsTypingCustomResponsible(!isTypingCustomResponsible)}
                      className="text-[10px] text-primary hover:underline font-semibold"
                    >
                      {isTypingCustomResponsible ? "Escolher da Lista" : "Digitar Nome Manualmente"}
                    </button>
                  </div>

                  {isTypingCustomResponsible ? (
                    <Input
                      value={responsibleName}
                      onChange={(e) => setResponsibleName(e.target.value)}
                      placeholder="Digite o nome completo da responsável"
                      className="h-8 text-xs bg-background font-bold"
                    />
                  ) : (
                    <Select 
                      value={responsibleName} 
                      onValueChange={(val) => setResponsibleName(val)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background font-bold">
                        <SelectValue placeholder="Selecione o diácono ou responsável..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        {churchData?.pastorTitular && (
                          <SelectItem value={churchData.pastorTitular} className="text-xs font-bold text-primary">
                            ⭐ {churchData.pastorTitular} (Pastor Titular)
                          </SelectItem>
                        )}
                        <SelectItem value="Pr. Carlito Carvalho Rodrigues" className="text-xs font-bold">
                          ⭐ Pr. Carlito Carvalho Rodrigues (Pastor)
                        </SelectItem>
                        {volunteers.map((vol) => (
                          <SelectItem key={vol.id} value={vol.name} className="text-xs">
                            👤 {vol.name} {vol.role ? `(${vol.role})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="text-[10px] text-muted-foreground">
                    O nome selecionado aparecerá na linha de assinatura oficial no mural.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 2: TABELA DE CADASTRO DE VOLUNTÁRIOS (Altera, Exclui e Grava) */}
        {/* ============================================================== */}
        <TabsContent value="voluntarios" className="space-y-4 pt-2">
          <div className="bg-muted/20 p-4 rounded-xl border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
              <div>
                <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-primary" />
                  Tabela de Cadastro de Voluntários & Diaconato ({volunteers.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Cadastre, altere, exclua e grave os voluntários. As alterações são persistidas no sistema e sincronizadas com a escala.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCrachaModalOpen(true)}
                  className="text-xs font-semibold border-indigo-500/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
                >
                  <IdCard className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                  Emitir Crachás de Voluntários
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    persistVolunteersToStorage(volunteers);
                    toast.success("Todos os voluntários foram gravados com sucesso!");
                  }}
                  disabled={isSavingVolunteers}
                  className="text-xs font-semibold border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                >
                  <Save className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                  Gravar Voluntários
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleImportChurchMembers}
                  className="text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10"
                >
                  <Users className="w-3.5 h-3.5 mr-1.5" />
                  Importar da Secretaria
                </Button>
              </div>
            </div>

            {/* Form de Adicionar ou Editar Voluntário */}
            <form onSubmit={handleSaveVolunteerForm} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-3 rounded-lg bg-background border">
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs font-semibold">
                  {editingVolunteerId ? "Alterar Nome do Voluntário *" : "Nome Completo do Voluntário / Diácono *"}
                </Label>
                <Input
                  value={newVolName}
                  onChange={(e) => setNewVolName(e.target.value)}
                  placeholder="Ex: Maria Francinete"
                  className="h-8 text-xs font-medium"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Função / Ministério</Label>
                <Input
                  value={newVolRole}
                  onChange={(e) => setNewVolRole(e.target.value)}
                  placeholder="Ex: Diaconisa, Cooperador, Diácono"
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <div className="flex items-center gap-1.5">
                  <Button type="submit" size="sm" className="h-8 text-xs font-semibold flex-1">
                    {editingVolunteerId ? (
                      <><Check className="w-3.5 h-3.5 mr-1" /> Salvar Alteração</>
                    ) : (
                      <><Plus className="w-3.5 h-3.5 mr-1" /> Gravar Voluntário</>
                    )}
                  </Button>
                  {editingVolunteerId && (
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleCancelEditVolunteer}
                      className="h-8 text-xs px-2 text-muted-foreground"
                      title="Cancelar edição"
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </form>

            {/* Busca & Lista de Voluntários */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 max-w-sm">
                <Search className="w-4 h-4 text-muted-foreground" />
                <Input
                  value={volunteerSearch}
                  onChange={(e) => setVolunteerSearch(e.target.value)}
                  placeholder="Filtrar voluntários por nome..."
                  className="h-8 text-xs"
                />
              </div>

              <div className="border rounded-lg overflow-hidden bg-background">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 border-b">
                    <tr>
                      <th className="py-2 px-3 text-left font-bold text-muted-foreground w-12">#</th>
                      <th className="py-2 px-3 text-left font-bold text-muted-foreground">Nome do Voluntário</th>
                      <th className="py-2 px-3 text-left font-bold text-muted-foreground">Cargo / Ministério</th>
                      <th className="py-2 px-3 text-right font-bold text-muted-foreground w-28">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredVolunteers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-muted-foreground italic">
                          Nenhum voluntário encontrado.
                        </td>
                      </tr>
                    ) : (
                      filteredVolunteers.map((vol, idx) => (
                        <tr key={vol.id || idx} className={`hover:bg-muted/30 ${editingVolunteerId === vol.id ? 'bg-primary/5 font-semibold' : ''}`}>
                          <td className="py-2 px-3 text-muted-foreground">{idx + 1}</td>
                          <td className="py-2 px-3 font-semibold text-foreground">
                            {vol.name}
                            {editingVolunteerId === vol.id && (
                              <Badge variant="outline" className="ml-2 text-[10px] text-primary border-primary/40 bg-primary/10">
                                Em Edição
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {vol.role || "Diaconato"}
                            </Badge>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsCrachaModalOpen(true);
                                }}
                                className="text-muted-foreground hover:text-indigo-600 p-1 rounded transition-colors"
                                title="Emitir crachá deste voluntário"
                              >
                                <IdCard className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEditVolunteer(vol)}
                                className="text-muted-foreground hover:text-primary p-1 rounded transition-colors"
                                title="Editar dados deste voluntário"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveVolunteer(vol.id)}
                                className="text-muted-foreground hover:text-red-500 p-1 rounded transition-colors"
                                title="Excluir este voluntário"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 3: VISUALIZAR ESCALA (MURAL A4)                            */}
        {/* ============================================================== */}
        <TabsContent value="preview" className="space-y-4 pt-2">
          {/* Zoom & Direct Print Bar */}
          <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-muted/40 border">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span>Zoom da Folha A4:</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs px-2"
                onClick={() => setPreviewZoom(prev => Math.max(50, prev - 10))}
              >
                -
              </Button>
              <span className="font-bold text-foreground min-w-[40px] text-center">{previewZoom}%</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-xs px-2"
                onClick={() => setPreviewZoom(prev => Math.min(130, prev + 10))}
              >
                +
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setPreviewZoom(100)}
              >
                100%
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                type="button"
                variant="outline" 
                size="sm" 
                onClick={handleCopyWhatsApp}
                className="h-8 text-xs font-medium text-emerald-700 dark:text-emerald-400 border-emerald-500/40"
              >
                <Share2 className="w-3.5 h-3.5 mr-1" /> WhatsApp
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadPdf}
                className="h-8 text-xs font-medium text-blue-700 dark:text-blue-400 border-blue-500/40"
              >
                <Download className="w-3.5 h-3.5 mr-1" /> Baixar PDF
              </Button>
              <Button 
                type="button" 
                size="sm"
                onClick={handlePrintMural}
                className="h-8 text-xs font-bold bg-primary text-primary-foreground shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir A4 para Mural
              </Button>
            </div>
          </div>

          {/* Área de Visualização e Impressão da Folha A4 com Zoom */}
          <div className="flex justify-center bg-slate-200/60 dark:bg-slate-900/60 p-4 sm:p-8 rounded-xl overflow-x-auto min-h-[600px]">
            <div 
              style={{ 
                transform: `scale(${previewZoom / 100})`, 
                transformOrigin: 'top center',
                transition: 'transform 0.15s ease-out'
              }}
            >
              {renderOfficialMuralSheet("escala-mural-printable-container")}
            </div>
          </div>
        </TabsContent>

        {/* ============================================================== */}
        {/* ABA 4: HISTÓRICO DE ESCALAS                                    */}
        {/* Permite recuperar para edição conforme solicitado no Anexo 1   */}
        {/* ============================================================== */}
        <TabsContent value="historico" className="space-y-4 pt-2">
          <div className="bg-muted/20 p-4 rounded-xl border space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">Escalas Gravadas no Sistema</h3>
                <p className="text-xs text-muted-foreground">Recupere qualquer escala gravada para editar, atualizar ou imprimir.</p>
              </div>
              <Button size="sm" onClick={handleNewScale} className="text-xs font-semibold">
                <Plus className="w-3.5 h-3.5 mr-1" /> Nova Escala
              </Button>
            </div>

            {savedScales.length === 0 ? (
              <div className="text-center py-10 border border-dashed rounded-lg bg-background">
                <FileText className="w-8 h-8 text-muted-foreground mx-auto opacity-50 mb-1" />
                <p className="text-xs text-muted-foreground">Nenhuma escala gravada ainda. Clique em "Salvar Escala" para gravar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savedScales.map((s) => (
                  <Card key={s.id} className={`border transition-all ${currentScaleId === s.id ? 'border-primary shadow-sm bg-primary/5' : 'hover:border-primary/50'}`}>
                    <CardHeader className="p-3 pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm font-bold">{s.title || "ESCALA DO DIACONATO"}</CardTitle>
                          <CardDescription className="text-xs font-semibold text-primary mt-0.5">
                            {s.periodMonthYear} • {s.rows?.length || 0} cultos • {s.points?.length || 2} pontos
                          </CardDescription>
                        </div>
                        {currentScaleId === s.id && (
                          <Badge variant="default" className="text-[10px]">Em Edição</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 flex flex-col gap-2 border-t mt-2">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Responsável: <strong>{s.responsibleName}</strong></span>
                        <span>{s.responsibleRole}</span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 pt-1">
                        <Button
                          variant="default"
                          size="sm"
                          className="h-7 text-xs font-semibold"
                          onClick={() => {
                            loadScaleIntoForm(s);
                            setActiveTab('editor');
                            toast.success(`Escala "${s.periodMonthYear}" carregada no editor para você modificar!`);
                          }}
                        >
                          <Edit className="w-3 h-3 mr-1" /> Editar Escala
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            loadScaleIntoForm(s);
                            setActiveTab('preview');
                            toast.success(`Visualizando escala "${s.periodMonthYear}"`);
                          }}
                        >
                          <Eye className="w-3 h-3 mr-1" /> Visualizar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-red-500 hover:text-red-700"
                          onClick={() => s.id && handleDeleteScale(s.id)}
                          title="Excluir escala"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Ajuda & Novidades (Solicitado pelo Usuário) */}
      <Dialog open={isHelpModalOpen} onOpenChange={setIsHelpModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
              <HelpCircle className="w-5 h-5 text-primary" />
              Guia de Uso & Novidades da Escala do Mural
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Conheça as funcionalidades implementadas e como obter o melhor resultado no mural da igreja.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div className="p-3 rounded-lg border bg-muted/40 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Users className="w-4 h-4 text-primary" />
                1. Cadastro, Edição e Gravação de Voluntários (Persistência)
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Na aba <strong>"Tabela de Voluntários"</strong>, você pode <strong>cadastrar novos nomes</strong>, clicar no ícone de lápis para <strong>alterar</strong> qualquer dado existente, <strong>excluir</strong> com a lixeira, ou clicar em <strong>"Gravar Voluntários"</strong>. Todos os voluntários são salvos permanentemente no banco de dados e sincronizados.
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/40 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                2. Prevenção de Duplicidade (Mesmo Culto)
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Ao selecionar um voluntário em um ponto (ex: <em>Porta da Frente</em>), esse mesmo nome fica automaticamente <strong>desabilitado</strong> nos demais pontos daquele mesmo culto, indicando onde a pessoa já está escalada. Isso impede que a mesma pessoa seja escalada em dois lugares no mesmo dia.
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/40 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <DoorClosed className="w-4 h-4 text-amber-600" />
                3. Cadastro de Pontos e Ajuste Automático da Tabela A4
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Você pode criar pontos personalizados (ex: <em>Porta Lateral, Estacionamento, Altar</em>). A tabela de digitação mantém colunas perfeitamente alinhadas e o relatório para mural (A4) redistribui as larguras automaticamente sem quebrar ou desalinhamento.
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/40 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Briefcase className="w-4 h-4 text-indigo-600" />
                4. Cadastro de Cargos & Espaço Amplo para Assinatura
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Crie novos cargos para a responsável pelo diaconato pelo botão <em>"+ Cadastrar Novo Cargo"</em>. O campo da responsável traz a lista direta de voluntários cadastrados para escolha rápida. O documento para mural possui um espaço em branco amplo e adequado para a assinatura manual com caneta.
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/40 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <BookOpen className="w-4 h-4 text-purple-600" />
                5. Versículo Bíblico do Diaconato
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Antes da assinatura, é exibido um versículo bíblico clássico do ministério diaconal (com presets de <em>1 Timóteo 3:13, Atos 6:3, Romanos 12:7 e Marcos 10:45</em> ou digitação livre).
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/40 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Printer className="w-4 h-4 text-blue-600" />
                6. Impressão A4 Direta, PDF e Envio WhatsApp
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Os botões de <strong>"Imprimir A4"</strong> e <strong>"Baixar PDF"</strong> podem ser clicados a partir de qualquer aba do editor com execução instantânea e o rodapé institucional fica posicionado exatamente na base inferior da folha para afixar no mural da igreja.
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/40 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <IdCard className="w-4 h-4 text-indigo-600" />
                7. Emissão de Crachás para Voluntários, Diáconos e Diaconisas
              </div>
              <p className="text-muted-foreground leading-relaxed">
                Gere crachás oficiais para identificação no uniforme, com foto 3x4 (ou brasão personalizado), QR Code de verificação, regras no verso e linhas de recorte, tanto em modelo individual quanto em grade de folha A4.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setIsHelpModalOpen(false)}>
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação Segura de Exclusão de Escala (Anexo 4) */}
      <Dialog open={!!scaleToDelete} onOpenChange={(open) => !open && setScaleToDelete(null)}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Excluir Escala do Diaconato
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Esta ação removerá a escala do banco de dados e do histórico.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 text-xs text-slate-600 dark:text-slate-400">
            Tem certeza de que deseja remover esta escala gravada? Ela deixará de aparecer no histórico e na listagem de escalas da igreja.
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setScaleToDelete(null)}
              disabled={isDeletingScale}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={confirmDeleteScale}
              disabled={isDeletingScale}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {isDeletingScale ? "Excluindo..." : "Sim, Excluir Escala"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Emissão de Crachás para Voluntários, Diáconos e Diaconisas */}
      <CrachaVoluntariosModal
        isOpen={isCrachaModalOpen}
        onClose={() => setIsCrachaModalOpen(false)}
        volunteers={volunteers}
        churchData={churchData}
        activeBranchName={activeBranchName}
        activeBranchId={activeBranchId}
        responsibleRole={responsibleRole}
        responsibleName={responsibleName}
      />
    </div>
  );

  // If embedded in a tab in Secretaria.tsx, render directly
  if (isEmbedded) {
    return content;
  }

  // Otherwise render inside Dialog
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && onClose) onClose(); }}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>Escala do Diaconato & Voluntários para Mural</DialogTitle>
          <DialogDescription>
            Geração de escala para o mural oficial da igreja.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {content}
        </div>

        <DialogFooter className="border-t pt-2 shrink-0 flex items-center justify-between sm:justify-between">
          <span className="text-xs text-muted-foreground">
            Escala formatada para folha A4 vertical (Mural de Avisos da Igreja).
          </span>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
