import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  BookOpen,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Printer,
  Share2,
  DollarSign,
  GraduationCap,
  Sparkles,
  Book,
  UserCheck,
  Percent,
  Search,
  Save,
  MessageCircle,
  Award,
  ChevronRight,
  UserPlus,
  Download,
  Edit,
  Phone,
  Building2,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

export interface EbdTeacher {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  role?: string;
  classId?: string;
}

export interface EbdStudent {
  id: string;
  name: string;
  memberId?: string;
  present: boolean;
  hasBible: boolean;
  hasMagazine: boolean;
}

export interface EbdClass {
  id: string;
  name: string;
  ageGroup: string;
  teacher: string;
  teacherId?: string;
  assistantTeacher?: string;
  room?: string;
  students: { id: string; name: string }[];
}

export interface EbdLessonRecord {
  id: string;
  classId: string;
  className: string;
  date: string;
  lessonTitle: string;
  lessonNumber: string;
  teacher: string;
  students: EbdStudent[];
  visitorsCount: number;
  offeringAmount: number;
  notes?: string;
  updatedAt: string;
}

interface EbdManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: any[];
  activeBranchName?: string;
  churchData?: any;
}

const DEFAULT_TEACHERS: EbdTeacher[] = [
  { id: "tch_1", name: "Tia Débora & Tia Sarah", phone: "(18) 99765-4321", role: "Líder Infantil" },
  { id: "tch_2", name: "Prof. Marcos Paulo", phone: "(18) 99876-5432", role: "Professor Juniores" },
  { id: "tch_3", name: "Prof. Thiago Ferreira", phone: "(18) 99654-3210", role: "Professor Adolescentes" },
  { id: "tch_4", name: "Diác. Rafael Moreira", phone: "(18) 99123-4567", role: "Líder de Jovens" },
  { id: "tch_5", name: "Pb. Antônio de Pádua", phone: "(18) 99234-5678", role: "Presbítero e Teólogo" },
  { id: "tch_6", name: "Ev. Paulo Silas", phone: "(18) 99345-6789", role: "Evangelista e Discipulador" },
];

const DEFAULT_CLASSES: EbdClass[] = [
  {
    id: "cls_criancas",
    name: "Crianças (Cordeirinhos de Cristo)",
    ageGroup: "0 a 8 anos",
    teacher: "Tia Débora & Tia Sarah",
    room: "Sala Infantil 01",
    students: [
      { id: "st_1", name: "Davi Lucas Silva" },
      { id: "st_2", name: "Ester Rodrigues Souza" },
      { id: "st_3", name: "Samuel Santos" },
      { id: "st_4", name: "Rebeca Oliveira" },
    ]
  },
  {
    id: "cls_juniores",
    name: "Juniores (Herdeiros da Promessa)",
    ageGroup: "9 a 11 anos",
    teacher: "Prof. Marcos Paulo",
    room: "Sala 02",
    students: [
      { id: "st_5", name: "Matheus Carvalho" },
      { id: "st_6", name: "Isabela Martins" },
      { id: "st_7", name: "Gabriel Henrique" },
    ]
  },
  {
    id: "cls_adolescentes",
    name: "Adolescentes (Geração Eleita)",
    ageGroup: "12 a 17 anos",
    teacher: "Prof. Thiago Ferreira",
    room: "Sala 03",
    students: [
      { id: "st_8", name: "Lucas Gabriel Costa" },
      { id: "st_9", name: "Ana Beatriz Lima" },
      { id: "st_10", name: "Felipe Augusto" },
      { id: "st_11", name: "Juliana Mendes" },
    ]
  },
  {
    id: "cls_jovens",
    name: "Jovens (Conectados na Fé)",
    ageGroup: "18 a 30 anos",
    teacher: "Diác. Rafael Moreira",
    room: "Anfiteatro Menor",
    students: [
      { id: "st_12", name: "Guilherme Santos" },
      { id: "st_13", name: "Larissa Menezes" },
      { id: "st_14", name: "Bruno Vinícius" },
    ]
  },
  {
    id: "cls_adultos",
    name: "Adultos & Família (Vida Cristã)",
    ageGroup: "Adultos",
    teacher: "Pb. Antônio de Pádua",
    room: "Nave Principal / Salão Nobre",
    students: [
      { id: "st_15", name: "Carlos Eduardo da Silva" },
      { id: "st_16", name: "Maria Aparecida Silva" },
      { id: "st_17", name: "João Batista Pereira" },
      { id: "st_18", name: "Ana Lúcia Barbosa" },
      { id: "st_19", name: "José Roberto de Menezes" },
    ]
  },
  {
    id: "cls_discipulado",
    name: "Discipulado (Novos Convertidos)",
    ageGroup: "Todas as idades",
    teacher: "Ev. Paulo Silas",
    room: "Sala Pastoral",
    students: [
      { id: "st_20", name: "Fernando Ribeiro" },
      { id: "st_21", name: "Cláudia Cristina" },
    ]
  }
];

export function EbdManagerModal({
  isOpen,
  onClose,
  members,
  activeBranchName = "Sede",
  churchData
}: EbdManagerModalProps) {
  const [activeTab, setActiveTab] = useState<"chamada" | "relatorio" | "classes">("chamada");
  const [classesSubTab, setClassesSubTab] = useState<"classes" | "professores">("classes");

  // Classes cadastradas
  const [classes, setClasses] = useState<EbdClass[]>(() => {
    try {
      const saved = localStorage.getItem("church_ebd_classes");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_CLASSES;
  });

  // Professores cadastrados
  const [teachers, setTeachers] = useState<EbdTeacher[]>(() => {
    try {
      const saved = localStorage.getItem("church_ebd_teachers");
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_TEACHERS;
  });

  // Histórico de aulas registradas
  const [lessonRecords, setLessonRecords] = useState<EbdLessonRecord[]>(() => {
    try {
      const saved = localStorage.getItem("church_ebd_records");
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Estado da chamada do dia
  const [selectedClassId, setSelectedClassId] = useState<string>(() => classes[0]?.id || "cls_adultos");
  const [lessonDate, setLessonDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [lessonTitle, setLessonTitle] = useState("A Fidelidade Cristã no Cotidiano");
  const [lessonNumber, setLessonNumber] = useState("08");
  const [visitorsCount, setVisitorsCount] = useState<number>(1);
  const [offeringAmount, setOfferingAmount] = useState<string>("45.50");
  const [lessonNotes, setLessonNotes] = useState("");
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Lista de presença da classe selecionada
  const activeClass = useMemo(() => {
    return classes.find(c => c.id === selectedClassId) || classes[0];
  }, [classes, selectedClassId]);

  const [currentStudents, setCurrentStudents] = useState<EbdStudent[]>([]);

  // Carrega ou inicializa a chamada ao mudar classe ou data
  useEffect(() => {
    if (!activeClass) return;

    const existing = lessonRecords.find(
      r => r.classId === activeClass.id && r.date === lessonDate
    );

    if (existing) {
      setCurrentStudents(existing.students);
      setLessonTitle(existing.lessonTitle || "");
      setLessonNumber(existing.lessonNumber || "");
      setVisitorsCount(existing.visitorsCount || 0);
      setOfferingAmount(existing.offeringAmount?.toString() || "0.00");
      setLessonNotes(existing.notes || "");
    } else {
      setCurrentStudents(
        (activeClass.students || []).map(s => ({
          id: s.id,
          name: s.name,
          present: true,
          hasBible: true,
          hasMagazine: true,
        }))
      );
    }
  }, [activeClass, lessonDate, lessonRecords]);

  // Busca rápida de membros para adicionar como aluno
  const [memberSearchTerm, setMemberSearchTerm] = useState("");
  const [showMemberSearch, setShowMemberSearch] = useState(false);
  const [customStudentName, setCustomStudentName] = useState("");

  // Totais e Métricas da chamada atual
  const stats = useMemo(() => {
    const totalEnrolled = currentStudents.length;
    const presentCount = currentStudents.filter(s => s.present).length;
    const absentCount = totalEnrolled - presentCount;
    const biblesCount = currentStudents.filter(s => s.present && s.hasBible).length;
    const magazinesCount = currentStudents.filter(s => s.present && s.hasMagazine).length;
    const attendancePercent = totalEnrolled > 0 ? Math.round((presentCount / totalEnrolled) * 100) : 0;
    const parsedOffering = parseFloat(offeringAmount.replace(",", ".")) || 0;
    const totalPeople = presentCount + visitorsCount;

    return {
      totalEnrolled,
      presentCount,
      absentCount,
      biblesCount,
      magazinesCount,
      attendancePercent,
      visitorsCount,
      parsedOffering,
      totalPeople
    };
  }, [currentStudents, visitorsCount, offeringAmount]);

  const togglePresent = (id: string) => {
    setCurrentStudents(prev =>
      prev.map(s => (s.id === id ? { ...s, present: !s.present } : s))
    );
  };

  const toggleBible = (id: string) => {
    setCurrentStudents(prev =>
      prev.map(s => (s.id === id ? { ...s, hasBible: !s.hasBible } : s))
    );
  };

  const toggleMagazine = (id: string) => {
    setCurrentStudents(prev =>
      prev.map(s => (s.id === id ? { ...s, hasMagazine: !s.hasMagazine } : s))
    );
  };

  const markAll = (status: boolean) => {
    setCurrentStudents(prev =>
      prev.map(s => ({ ...s, present: status, hasBible: status, hasMagazine: status }))
    );
  };

  const handleAddStudent = (name: string, memberId?: string) => {
    if (!name.trim()) return;
    const newStudent = {
      id: `st_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim()
    };

    const updatedClasses = classes.map(c => {
      if (c.id === activeClass.id) {
        return {
          ...c,
          students: [...c.students, newStudent]
        };
      }
      return c;
    });

    setClasses(updatedClasses);
    localStorage.setItem("church_ebd_classes", JSON.stringify(updatedClasses));

    setCurrentStudents(prev => [
      ...prev,
      {
        ...newStudent,
        memberId,
        present: true,
        hasBible: true,
        hasMagazine: true
      }
    ]);

    setCustomStudentName("");
    setMemberSearchTerm("");
    setShowMemberSearch(false);
    toast.success(`${name} adicionado(a) à classe!`);
  };

  const handleRemoveStudent = (studentId: string) => {
    const updatedStudents = currentStudents.filter(s => s.id !== studentId);
    setCurrentStudents(updatedStudents);

    const updatedClasses = classes.map(c => {
      if (c.id === activeClass.id) {
        return {
          ...c,
          students: c.students.filter(s => s.id !== studentId)
        };
      }
      return c;
    });
    setClasses(updatedClasses);
    localStorage.setItem("church_ebd_classes", JSON.stringify(updatedClasses));
    toast.info("Aluno removido da classe.");
  };

  const handleSaveLesson = () => {
    const record: EbdLessonRecord = {
      id: `${activeClass.id}_${lessonDate}`,
      classId: activeClass.id,
      className: activeClass.name,
      date: lessonDate,
      lessonTitle: lessonTitle.trim(),
      lessonNumber: lessonNumber.trim(),
      teacher: activeClass.teacher,
      students: currentStudents,
      visitorsCount,
      offeringAmount: parseFloat(offeringAmount.replace(",", ".")) || 0,
      notes: lessonNotes.trim(),
      updatedAt: new Date().toISOString()
    };

    const existingIndex = lessonRecords.findIndex(
      r => r.classId === activeClass.id && r.date === lessonDate
    );

    let updated: EbdLessonRecord[];
    if (existingIndex >= 0) {
      updated = [...lessonRecords];
      updated[existingIndex] = record;
    } else {
      updated = [record, ...lessonRecords];
    }

    setLessonRecords(updated);
    localStorage.setItem("church_ebd_records", JSON.stringify(updated));
    toast.success("Chamada da EBD gravada com sucesso!");
  };

  const handleShareWhatsApp = () => {
    const formattedDate = lessonDate.split("-").reverse().join("/");
    const message = `*RELATÓRIO DA ESCOLA BÍBLICA DOMINICAL (EBD)*
🏛 *Igreja:* ${churchData?.nome || "O Brasil para Cristo - Sede"} (${activeBranchName})
📅 *Data:* ${formattedDate}
📚 *Classe:* ${activeClass.name}
👨‍🏫 *Professor:* ${activeClass.teacher}
📖 *Lição:* Nº ${lessonNumber} - "${lessonTitle}"

📊 *RESUMO DA CLASSE:*
• Matriculados: ${stats.totalEnrolled}
• Presentes: ${stats.presentCount} (${stats.attendancePercent}% assiduidade)
• Ausentes: ${stats.absentCount}
• Visitantes: ${stats.visitorsCount}
• Total Geral de Pessoas: ${stats.totalPeople}
• Bíblias: ${stats.biblesCount}
• Revistas: ${stats.magazinesCount}
💰 *Oferta da Classe:* R$ ${stats.parsedOffering.toFixed(2)}

${lessonNotes ? `📝 *Observações:* ${lessonNotes}` : ""}
_Enviado pelo Sistema de Gestão Eclesiástica_`;

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, "_blank");
  };

  // ESTADOS PARA CADASTRO / EDIÇÃO DE CLASSES
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classFormName, setClassFormName] = useState("");
  const [classFormAge, setClassFormAge] = useState("");
  const [classFormTeacher, setClassFormTeacher] = useState("");
  const [classFormRoom, setClassFormRoom] = useState("");

  const handleStartEditClass = (cls: EbdClass) => {
    setEditingClassId(cls.id);
    setClassFormName(cls.name);
    setClassFormAge(cls.ageGroup);
    setClassFormTeacher(cls.teacher);
    setClassFormRoom(cls.room || "");
    setClassesSubTab("classes");
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!classFormName.trim()) {
      toast.error("Informe o nome da classe.");
      return;
    }

    if (editingClassId) {
      // Edição de classe existente
      const updated = classes.map(c => {
        if (c.id === editingClassId) {
          return {
            ...c,
            name: classFormName.trim(),
            ageGroup: classFormAge.trim() || "Geral",
            teacher: classFormTeacher.trim() || "A definir",
            room: classFormRoom.trim() || "Sala da Igreja"
          };
        }
        return c;
      });
      setClasses(updated);
      localStorage.setItem("church_ebd_classes", JSON.stringify(updated));
      toast.success("Classe atualizada com sucesso!");
      setEditingClassId(null);
    } else {
      // Criação de nova classe
      const newCls: EbdClass = {
        id: `cls_${Date.now()}`,
        name: classFormName.trim(),
        ageGroup: classFormAge.trim() || "Geral",
        teacher: classFormTeacher.trim() || "A definir",
        room: classFormRoom.trim() || "Sala da Igreja",
        students: []
      };
      const updated = [...classes, newCls];
      setClasses(updated);
      localStorage.setItem("church_ebd_classes", JSON.stringify(updated));
      setSelectedClassId(newCls.id);
      toast.success(`Classe "${newCls.name}" criada com sucesso!`);
    }

    setClassFormName("");
    setClassFormAge("");
    setClassFormTeacher("");
    setClassFormRoom("");
  };

  // ESTADOS PARA CADASTRO / EDIÇÃO DE PROFESSORES
  const [editingTeacherId, setEditingTeacherId] = useState<string | null>(null);
  const [teacherFormName, setTeacherFormName] = useState("");
  const [teacherFormPhone, setTeacherFormPhone] = useState("");
  const [teacherFormRole, setTeacherFormRole] = useState("Professor(a) EBD");
  const [teacherFormMemberId, setTeacherFormMemberId] = useState("");

  const handleSaveTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherFormName.trim()) {
      toast.error("Informe o nome do professor.");
      return;
    }

    if (editingTeacherId) {
      const updated = teachers.map(t => {
        if (t.id === editingTeacherId) {
          return {
            ...t,
            name: teacherFormName.trim(),
            phone: teacherFormPhone.trim(),
            role: teacherFormRole.trim()
          };
        }
        return t;
      });
      setTeachers(updated);
      localStorage.setItem("church_ebd_teachers", JSON.stringify(updated));
      toast.success("Professor(a) atualizado(a)!");
      setEditingTeacherId(null);
    } else {
      const newTch: EbdTeacher = {
        id: `tch_${Date.now()}`,
        name: teacherFormName.trim(),
        phone: teacherFormPhone.trim(),
        role: teacherFormRole.trim()
      };
      const updated = [...teachers, newTch];
      setTeachers(updated);
      localStorage.setItem("church_ebd_teachers", JSON.stringify(updated));
      toast.success(`Professor(a) "${newTch.name}" cadastrado(a)!`);
    }

    setTeacherFormName("");
    setTeacherFormPhone("");
    setTeacherFormRole("Professor(a) EBD");
    setTeacherFormMemberId("");
  };

  // Referência da Folha de Impressão
  const printReportRef = useRef<HTMLDivElement>(null);

  // IMPRESSÃO A4 CONFIÁVEL
  const handlePrintDominicalReport = () => {
    const el = printReportRef.current;
    if (!el) {
      toast.error("Relatório não localizado.");
      return;
    }

    try {
      const iframeId = "__ebd_print_iframe__";
      let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = iframeId;
        iframe.style.position = "fixed";
        iframe.style.top = "-9999px";
        iframe.style.left = "-9999px";
        iframe.style.width = "210mm";
        iframe.style.height = "297mm";
        iframe.style.border = "none";
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Relatorio_EBD_${lessonDate}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 8mm !important;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                margin: 0;
                padding: 4mm;
                background: #ffffff;
                color: #0f172a;
                font-family: Arial, Helvetica, sans-serif;
              }
            </style>
          </head>
          <body>
            ${el.innerHTML}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
          toast.success("Diálogo de impressão aberto!");
        } catch {
          window.print();
        }
      }, 350);
    } catch (e) {
      console.warn("Print error, downloading PDF fallback:", e);
      handleDownloadReportPdf();
    }
  };

  // BAIXAR PDF A4 DIRETO
  const handleDownloadReportPdf = async () => {
    const el = printReportRef.current;
    if (!el) return;

    setIsExportingPdf(true);
    const toastId = toast.loading("Gerando PDF do Relatório Dominical...");

    try {
      const imgData = await toPng(el, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const imgHeight = (el.offsetHeight * imgWidth) / el.offsetWidth;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, Math.min(297, imgHeight));
      pdf.save(`Relatorio_EBD_${activeBranchName}_${lessonDate}.pdf`);
      toast.success("PDF baixado com sucesso!", { id: toastId });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Falha ao gerar PDF.", { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Consolidação de todas as classes para a data selecionada no Relatório Geral
  const generalReportData = useMemo(() => {
    return classes.map(c => {
      const record = lessonRecords.find(r => r.classId === c.id && r.date === lessonDate);
      if (record) {
        const enrolled = record.students.length;
        const present = record.students.filter(s => s.present).length;
        const bibles = record.students.filter(s => s.present && s.hasBible).length;
        const magazines = record.students.filter(s => s.present && s.hasMagazine).length;
        return {
          id: c.id,
          name: c.name,
          teacher: record.teacher || c.teacher,
          enrolled,
          present,
          percent: enrolled > 0 ? Math.round((present / enrolled) * 100) : 0,
          visitors: record.visitorsCount || 0,
          bibles,
          magazines,
          offering: record.offeringAmount || 0,
          recorded: true
        };
      }
      return {
        id: c.id,
        name: c.name,
        teacher: c.teacher,
        enrolled: c.students.length,
        present: 0,
        percent: 0,
        visitors: 0,
        bibles: 0,
        magazines: 0,
        offering: 0,
        recorded: false
      };
    });
  }, [classes, lessonRecords, lessonDate]);

  const generalTotals = useMemo(() => {
    return generalReportData.reduce(
      (acc, curr) => ({
        enrolled: acc.enrolled + curr.enrolled,
        present: acc.present + curr.present,
        visitors: acc.visitors + curr.visitors,
        bibles: acc.bibles + curr.bibles,
        magazines: acc.magazines + curr.magazines,
        offering: acc.offering + curr.offering
      }),
      { enrolled: 0, present: 0, visitors: 0, bibles: 0, magazines: 0, offering: 0 }
    );
  }, [generalReportData]);

  const generalAttendancePercent = generalTotals.enrolled > 0
    ? Math.round((generalTotals.present / generalTotals.enrolled) * 100)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-emerald-900/40">
        {/* Cabeçalho Premium com Ícone e Cores da EBD */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 p-6 text-white border-b border-emerald-700/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/10 backdrop-blur-md rounded-xl ring-1 ring-white/20 shadow-inner">
                <BookOpen className="w-7 h-7 text-emerald-300" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  Escola Bíblica Dominical (EBD)
                  <Badge className="bg-emerald-500/30 text-emerald-200 border-emerald-400/40 text-xs">
                    MÓDULO OFICIAL
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-emerald-100/90 text-sm mt-0.5">
                  Chamada rápida mobile de professores, controle de assiduidade, Bíblias, revistas e ofertas de classe.
                </DialogDescription>
              </div>
            </div>

            {/* Ações rápidas no cabeçalho */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareWhatsApp}
                className="bg-emerald-700/60 hover:bg-emerald-700 text-white border-emerald-500/40 gap-1.5 shadow-sm"
              >
                <Share2 className="w-4 h-4 text-emerald-200" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
              <Button
                size="sm"
                onClick={handleSaveLesson}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold gap-1.5 shadow-sm"
              >
                <Save className="w-4 h-4" />
                Salvar Aula
              </Button>
            </div>
          </div>

          {/* Seletor de Tabs */}
          <div className="mt-5 flex gap-2">
            <Tabs
              value={activeTab}
              onValueChange={v => setActiveTab(v as any)}
              className="w-full"
            >
              <TabsList className="bg-black/30 p-1 border border-white/10 text-emerald-200">
                <TabsTrigger
                  value="chamada"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium text-xs sm:text-sm gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  Chamada da Classe
                </TabsTrigger>
                <TabsTrigger
                  value="relatorio"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium text-xs sm:text-sm gap-1.5"
                >
                  <Award className="w-4 h-4" />
                  Relatório Dominical & Geral
                </TabsTrigger>
                <TabsTrigger
                  value="classes"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white font-medium text-xs sm:text-sm gap-1.5"
                >
                  <GraduationCap className="w-4 h-4" />
                  Classes & Professores
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {/* Conteúdo das Abas */}
        <div className="p-6 bg-slate-50 dark:bg-slate-950">
          {/* TAB 1: CHAMADA RÁPIDA */}
          {activeTab === "chamada" && (
            <div className="space-y-6">
              {/* Barra de Filtros e Seleção da Aula */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                {/* 1. Selecionar Classe */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Classe da EBD:
                  </Label>
                  <select
                    value={selectedClassId}
                    onChange={e => setSelectedClassId(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-sm font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    {classes.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.ageGroup})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Data da Aula */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Data da Aula (Domingo):
                  </Label>
                  <Input
                    type="date"
                    value={lessonDate}
                    onChange={e => setLessonDate(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* 3. Número e Lição */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Lição nº:
                  </Label>
                  <Input
                    value={lessonNumber}
                    onChange={e => setLessonNumber(e.target.value)}
                    placeholder="Ex: 08"
                    className="h-9 text-sm font-bold"
                  />
                </div>

                {/* 4. Professor Responsável */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                    Professor(a) Titular:
                  </Label>
                  <Input
                    value={activeClass.teacher}
                    readOnly
                    className="h-9 text-sm bg-slate-100 dark:bg-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Tema da Lição e Indicadores Rápidos da Classe */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                  <div className="md:col-span-2 space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Título / Tema da Revista:
                    </Label>
                    <Input
                      value={lessonTitle}
                      onChange={e => setLessonTitle(e.target.value)}
                      placeholder="Ex: A Fidelidade Cristã no Cotidiano"
                      className="text-sm font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Oferta da Classe (R$):
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">R$</span>
                      <Input
                        value={offeringAmount}
                        onChange={e => setOfferingAmount(e.target.value)}
                        placeholder="0.00"
                        className="pl-9 font-bold text-emerald-600 dark:text-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Painel de Indicadores em Cartões Coloridos */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-2.5 rounded-lg text-center">
                    <div className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">PRESENTES</div>
                    <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                      {stats.presentCount} <span className="text-xs font-normal text-emerald-600">/ {stats.totalEnrolled}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 p-2.5 rounded-lg text-center">
                    <div className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">ASSIDUIDADE</div>
                    <div className="text-xl font-black text-blue-700 dark:text-blue-400">
                      {stats.attendancePercent}%
                    </div>
                  </div>

                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-2.5 rounded-lg text-center">
                    <div className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">BÍBLIAS</div>
                    <div className="text-xl font-black text-amber-700 dark:text-amber-400">
                      {stats.biblesCount}
                    </div>
                  </div>

                  <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 p-2.5 rounded-lg text-center">
                    <div className="text-[11px] font-semibold text-purple-800 dark:text-purple-300">REVISTAS</div>
                    <div className="text-xl font-black text-purple-700 dark:text-purple-400">
                      {stats.magazinesCount}
                    </div>
                  </div>

                  <div className="bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800/60 p-2.5 rounded-lg text-center">
                    <div className="text-[11px] font-semibold text-pink-800 dark:text-pink-300">VISITANTES</div>
                    <div className="flex items-center justify-center gap-2 mt-0.5">
                      <button
                        type="button"
                        onClick={() => setVisitorsCount(v => Math.max(0, v - 1))}
                        className="w-5 h-5 rounded bg-pink-200 dark:bg-pink-900/60 text-pink-800 dark:text-pink-200 text-xs font-bold flex items-center justify-center"
                      >
                        -
                      </button>
                      <span className="text-lg font-black text-pink-700 dark:text-pink-400">
                        {visitorsCount}
                      </span>
                      <button
                        type="button"
                        onClick={() => setVisitorsCount(v => v + 1)}
                        className="w-5 h-5 rounded bg-pink-200 dark:bg-pink-900/60 text-pink-800 dark:text-pink-200 text-xs font-bold flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 p-2.5 rounded-lg text-center">
                    <div className="text-[11px] font-semibold text-teal-800 dark:text-teal-300">TOTAL NA SALA</div>
                    <div className="text-xl font-black text-teal-700 dark:text-teal-400">
                      {stats.totalPeople}
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de Ação Rápida de Chamada */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => markAll(true)}
                    className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                    Todos Presentes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => markAll(false)}
                    className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <XCircle className="w-3.5 h-3.5 mr-1 text-rose-500" />
                    Limpar Chamada
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setShowMemberSearch(!showMemberSearch)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Matricular Aluno
                  </Button>
                </div>
              </div>

              {/* Painel para adicionar novo aluno / membro */}
              {showMemberSearch && (
                <div className="bg-emerald-50/70 dark:bg-emerald-950/30 p-4 rounded-xl border border-emerald-300 dark:border-emerald-800/60 space-y-3">
                  <div className="font-semibold text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <span>Adicionar Aluno na Classe: {activeClass.name}</span>
                    <button
                      onClick={() => setShowMemberSearch(false)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      ✕ Fechar
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">
                        Selecionar do Rol de Membros da Igreja:
                      </Label>
                      <Input
                        placeholder="Buscar por nome ou CPF..."
                        value={memberSearchTerm}
                        onChange={e => setMemberSearchTerm(e.target.value)}
                        className="h-8 text-xs bg-white dark:bg-slate-900"
                      />
                      {memberSearchTerm.length >= 2 && (
                        <div className="max-h-36 overflow-y-auto bg-white dark:bg-slate-900 border rounded-md p-1 divide-y shadow-xs">
                          {members
                            .filter(m =>
                              (m.name || m.nome || "").toLowerCase().includes(memberSearchTerm.toLowerCase())
                            )
                            .slice(0, 6)
                            .map(m => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => handleAddStudent(m.name || m.nome, m.id)}
                                className="w-full text-left px-2 py-1.5 text-xs hover:bg-emerald-50 dark:hover:bg-slate-800 rounded flex justify-between items-center"
                              >
                                <span className="font-medium text-slate-800 dark:text-slate-200">
                                  {m.name || m.nome}
                                </span>
                                <Badge variant="outline" className="text-[10px]">
                                  {m.role || "Membro"}
                                </Badge>
                              </button>
                            ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs text-slate-600 dark:text-slate-400">
                        Ou digitar nome do aluno/visitante avulso:
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Nome completo do aluno..."
                          value={customStudentName}
                          onChange={e => setCustomStudentName(e.target.value)}
                          className="h-8 text-xs bg-white dark:bg-slate-900"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => handleAddStudent(customStudentName)}
                          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-xs text-white"
                        >
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Lista de Chamada em Cartões Responsivos para Celular / Tablet */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
                  Alunos Matriculados ({currentStudents.length})
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {currentStudents.map((student, idx) => (
                    <div
                      key={student.id}
                      className={`p-3.5 rounded-xl border transition-all duration-200 ${
                        student.present
                          ? "bg-white dark:bg-slate-900 border-emerald-300/80 dark:border-emerald-800/80 shadow-xs ring-1 ring-emerald-500/10"
                          : "bg-slate-100/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="truncate">
                            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate block">
                              {student.name}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {student.present ? "Presente" : "Ausente"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveStudent(student.id)}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                          title="Remover aluno da classe"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Controles de 1 Toque */}
                      <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => togglePresent(student.id)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                            student.present
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                              : "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-200"
                          }`}
                        >
                          {student.present ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Presente
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3.5 h-3.5" />
                              Falta
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={!student.present}
                          onClick={() => toggleBible(student.id)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            !student.present
                              ? "bg-slate-200/50 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                              : student.hasBible
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300/60"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          <Book className="w-3.5 h-3.5 text-amber-600" />
                          Bíblia: {student.hasBible && student.present ? "Sim" : "Não"}
                        </button>

                        <button
                          type="button"
                          disabled={!student.present}
                          onClick={() => toggleMagazine(student.id)}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                            !student.present
                              ? "bg-slate-200/50 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                              : student.hasMagazine
                              ? "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300/60"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200"
                          }`}
                        >
                          <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                          Revista: {student.hasMagazine && student.present ? "Sim" : "Não"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observações da Aula */}
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                  Observações Pastorais / Necessidades da Classe:
                </Label>
                <textarea
                  value={lessonNotes}
                  onChange={e => setLessonNotes(e.target.value)}
                  placeholder="Ex: Novos visitantes se interessaram pelo batismo. Necessidade de mais 2 revistas..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: RELATÓRIO DOMINICAL E CONSOLIDADO */}
          {activeTab === "relatorio" && (
            <div className="space-y-6">
              {/* Controles do Relatório */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      Data da Aula para Relatório:
                    </Label>
                    <Input
                      type="date"
                      value={lessonDate}
                      onChange={e => setLessonDate(e.target.value)}
                      className="h-9 text-sm mt-1"
                    />
                  </div>
                  <div className="mt-5">
                    <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-300">
                      {classes.length} Classes Registradas
                    </Badge>
                  </div>
                </div>

                {/* BOTÕES DE IMPRESSÃO E DOWNLOAD DE PDF */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDownloadReportPdf}
                    disabled={isExportingPdf}
                    className="border-emerald-600 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-semibold gap-1.5 shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    Baixar PDF (A4)
                  </Button>
                  <Button
                    onClick={handlePrintDominicalReport}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold gap-1.5 shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir Relatório A4
                  </Button>
                </div>
              </div>

              {/* Visão de Tabela Consolidada na Tela */}
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200">
                    Quadro Geral de Frequência e Ofertas da EBD ({lessonDate.split("-").reverse().join("/")})
                  </h3>
                  <Badge className="bg-emerald-600 text-white font-bold">
                    Assiduidade Geral: {generalAttendancePercent}%
                  </Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border-b">
                      <tr>
                        <th className="p-3">Classe</th>
                        <th className="p-3">Professor(a)</th>
                        <th className="p-3 text-center">Matriculados</th>
                        <th className="p-3 text-center">Presentes</th>
                        <th className="p-3 text-center">% Assiduidade</th>
                        <th className="p-3 text-center">Visitantes</th>
                        <th className="p-3 text-center">Bíblias</th>
                        <th className="p-3 text-center">Revistas</th>
                        <th className="p-3 text-right">Oferta (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {generalReportData.map(cls => (
                        <tr key={cls.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                          <td className="p-3 font-semibold text-slate-900 dark:text-slate-100">
                            {cls.name}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400">
                            {cls.teacher}
                          </td>
                          <td className="p-3 text-center font-medium">{cls.enrolled}</td>
                          <td className="p-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                            {cls.present}
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant="outline"
                              className={
                                cls.percent >= 70
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  : "bg-amber-50 text-amber-700 border-amber-300"
                              }
                            >
                              {cls.percent}%
                            </Badge>
                          </td>
                          <td className="p-3 text-center text-pink-600 font-semibold">
                            {cls.visitors}
                          </td>
                          <td className="p-3 text-center font-medium">{cls.bibles}</td>
                          <td className="p-3 text-center font-medium">{cls.magazines}</td>
                          <td className="p-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                            R$ {cls.offering.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
                      <tr>
                        <td colSpan={2} className="p-3 uppercase">
                          Totais Gerais da Escola Dominical:
                        </td>
                        <td className="p-3 text-center">{generalTotals.enrolled}</td>
                        <td className="p-3 text-center text-emerald-700 dark:text-emerald-400">
                          {generalTotals.present}
                        </td>
                        <td className="p-3 text-center">
                          <Badge className="bg-emerald-700 text-white">
                            {generalAttendancePercent}%
                          </Badge>
                        </td>
                        <td className="p-3 text-center text-pink-700">{generalTotals.visitors}</td>
                        <td className="p-3 text-center">{generalTotals.bibles}</td>
                        <td className="p-3 text-center">{generalTotals.magazines}</td>
                        <td className="p-3 text-right text-emerald-700 dark:text-emerald-400 text-sm">
                          R$ {generalTotals.offering.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: GERENCIAR CLASSES E PROFESSORES */}
          {activeTab === "classes" && (
            <div className="space-y-6">
              {/* Alternador de Sub-Aba: Classes ou Professores */}
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={classesSubTab === "classes" ? "default" : "outline"}
                    onClick={() => setClassesSubTab("classes")}
                    className={classesSubTab === "classes" ? "bg-emerald-700 text-white" : ""}
                  >
                    <GraduationCap className="w-4 h-4 mr-1.5" />
                    Classes da EBD ({classes.length})
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={classesSubTab === "professores" ? "default" : "outline"}
                    onClick={() => setClassesSubTab("professores")}
                    className={classesSubTab === "professores" ? "bg-emerald-700 text-white" : ""}
                  >
                    <Users className="w-4 h-4 mr-1.5" />
                    Professores Cadastrados ({teachers.length})
                  </Button>
                </div>

                <Badge variant="outline" className="text-xs text-emerald-700 bg-emerald-50">
                  {classesSubTab === "classes" ? "Gestão das Turmas & Faixas Etárias" : "Corpo Docente da EBD"}
                </Badge>
              </div>

              {/* SUB-ABA 1: CLASSES */}
              {classesSubTab === "classes" && (
                <div className="space-y-6">
                  {/* Formulário de Criação / Edição de Classe */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-emerald-600" />
                        {editingClassId ? "Editar Classe da Escola Bíblica" : "Cadastrar Nova Classe da Escola Bíblica"}
                      </span>
                      {editingClassId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingClassId(null);
                            setClassFormName("");
                            setClassFormAge("");
                            setClassFormTeacher("");
                            setClassFormRoom("");
                          }}
                          className="text-xs text-slate-500 hover:text-slate-800"
                        >
                          Cancelar Edição ✕
                        </button>
                      )}
                    </h3>

                    <form onSubmit={handleSaveClass} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome da Classe:</Label>
                        <Input
                          value={classFormName}
                          onChange={e => setClassFormName(e.target.value)}
                          placeholder="Ex: Discipulado Intensivo"
                          className="h-8 text-xs font-medium"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Faixa Etária / Público:</Label>
                        <Input
                          value={classFormAge}
                          onChange={e => setClassFormAge(e.target.value)}
                          placeholder="Ex: 18 a 35 anos"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Professor(a) Titular:</Label>
                        <select
                          value={classFormTeacher}
                          onChange={e => setClassFormTeacher(e.target.value)}
                          className="w-full h-8 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
                        >
                          <option value="">Selecione da lista de professores...</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.name}>
                              {t.name} ({t.role || "Professor"})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Sala / Local:</Label>
                        <div className="flex gap-2">
                          <Input
                            value={classFormRoom}
                            onChange={e => setClassFormRoom(e.target.value)}
                            placeholder="Ex: Sala 04"
                            className="h-8 text-xs"
                          />
                          <Button type="submit" size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                            {editingClassId ? "Salvar" : "Cadastrar"}
                          </Button>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Lista de Classes Atuais */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {classes.map(cls => (
                      <div
                        key={cls.id}
                        className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {cls.name}
                            </h4>
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {cls.ageGroup}
                            </Badge>
                          </div>

                          <div className="mt-2.5 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                            <p>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">Professor:</span> {cls.teacher}
                            </p>
                            {cls.room && (
                              <p>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">Sala:</span> {cls.room}
                              </p>
                            )}
                            <p>
                              <span className="font-semibold text-slate-800 dark:text-slate-200">Matriculados:</span> {cls.students.length} alunos
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedClassId(cls.id);
                                setActiveTab("chamada");
                              }}
                              className="h-7 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                            >
                              Chamada
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleStartEditClass(cls)}
                              className="h-7 text-xs text-slate-700 hover:text-emerald-700 p-1"
                              title="Editar turma e professor"
                            >
                              <Edit className="w-3.5 h-3.5 mr-1" />
                              Editar
                            </Button>
                          </div>

                          {classes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Deseja realmente remover a classe ${cls.name}?`)) {
                                  const updated = classes.filter(c => c.id !== cls.id);
                                  setClasses(updated);
                                  localStorage.setItem("church_ebd_classes", JSON.stringify(updated));
                                  toast.info("Classe removida.");
                                }
                              }}
                              className="text-xs text-rose-500 hover:underline"
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-ABA 2: PROFESSORES */}
              {classesSubTab === "professores" && (
                <div className="space-y-6">
                  {/* Formulário de Cadastro / Edição de Professor */}
                  <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 mb-3 flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-600" />
                        {editingTeacherId ? "Editar Professor(a) da EBD" : "Cadastrar Novo Professor(a) da EBD"}
                      </span>
                      {editingTeacherId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTeacherId(null);
                            setTeacherFormName("");
                            setTeacherFormPhone("");
                            setTeacherFormRole("Professor(a) EBD");
                          }}
                          className="text-xs text-slate-500 hover:text-slate-800"
                        >
                          Cancelar Edição ✕
                        </button>
                      )}
                    </h3>

                    <form onSubmit={handleSaveTeacher} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Nome Completo do Professor:</Label>
                        <Input
                          value={teacherFormName}
                          onChange={e => setTeacherFormName(e.target.value)}
                          placeholder="Ex: Prof. José Carlos"
                          className="h-8 text-xs font-medium"
                          required
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Telefone / WhatsApp:</Label>
                        <Input
                          value={teacherFormPhone}
                          onChange={e => setTeacherFormPhone(e.target.value)}
                          placeholder="(00) 00000-0000"
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Cargo / Função na Igreja:</Label>
                        <div className="flex gap-2">
                          <Input
                            value={teacherFormRole}
                            onChange={e => setTeacherFormRole(e.target.value)}
                            placeholder="Ex: Professor(a) / Diácono"
                            className="h-8 text-xs"
                          />
                          <Button type="submit" size="sm" className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
                            {editingTeacherId ? "Salvar" : "Cadastrar"}
                          </Button>
                        </div>
                      </div>
                    </form>

                    {/* Atalho para puxar professor do Rol de Membros */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Puxar do cadastro de membros:</span>
                      <select
                        onChange={(e) => {
                          const mem = members.find(m => m.id === e.target.value);
                          if (mem) {
                            setTeacherFormName(mem.name || mem.nome || "");
                            setTeacherFormPhone(mem.phone || "");
                            setTeacherFormRole(mem.role || "Professor(a) EBD");
                          }
                        }}
                        className="text-xs border rounded p-1 max-w-xs bg-slate-50 dark:bg-slate-900"
                      >
                        <option value="">Selecione um membro cadastrado...</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name || m.nome} ({m.role || "Membro"})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Grid de Professores Cadastrados */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {teachers.map(tch => (
                      <div
                        key={tch.id}
                        className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                              {tch.name}
                            </h4>
                            <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50">
                              {tch.role || "Professor EBD"}
                            </Badge>
                          </div>

                          <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                            {tch.phone && (
                              <p className="flex items-center gap-1.5">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                {tch.phone}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTeacherId(tch.id);
                              setTeacherFormName(tch.name);
                              setTeacherFormPhone(tch.phone || "");
                              setTeacherFormRole(tch.role || "Professor(a) EBD");
                            }}
                            className="text-xs text-emerald-700 hover:underline flex items-center gap-1 font-semibold"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            Editar
                          </button>

                          {teachers.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Remover professor ${tch.name}?`)) {
                                  const updated = teachers.filter(t => t.id !== tch.id);
                                  setTeachers(updated);
                                  localStorage.setItem("church_ebd_teachers", JSON.stringify(updated));
                                  toast.info("Professor removido.");
                                }
                              }}
                              className="text-xs text-rose-500 hover:underline"
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RECIPIENTE DE IMPRESSÃO PROFISSIONAL A4 (RENDERIZADO FIXO OFFSCREEN PARA TOTAL CAPTURA) */}
        <div
          style={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            width: "210mm",
            minHeight: "297mm",
            backgroundColor: "#ffffff",
            color: "#0f172a",
            zIndex: -100,
            visibility: "visible",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          <div ref={printReportRef} id="ebd-dominical-report-area" style={{ width: "210mm", padding: "12mm 10mm", backgroundColor: "#ffffff" }}>
            {/* Cabeçalho Oficial */}
            <div style={{ textAlign: "center", borderBottom: "2px solid #065f46", paddingBottom: "6px", marginBottom: "12px" }}>
              <h1 style={{ fontSize: "16px", fontWeight: "900", textTransform: "uppercase", margin: 0, color: "#065f46" }}>
                {churchData?.nome || "IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO"}
              </h1>
              <div style={{ fontSize: "9.5px", color: "#475569", marginTop: "3px" }}>
                {churchData?.endereco || "Rua Bartolomeu Bueno, 629 - Valparaíso/SP"} | CNPJ: {churchData?.cnpj || "51.105.484/0001-74"}
              </div>
              <div style={{ marginTop: "6px", display: "inline-block", backgroundColor: "#065f46", color: "#ffffff", padding: "3px 12px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px", borderRadius: "3px" }}>
                RELATÓRIO GERAL DA ESCOLA BÍBLICA DOMINICAL (EBD)
              </div>
              <div style={{ fontSize: "10px", fontWeight: "bold", marginTop: "4px", color: "#0f172a" }}>
                Data da Aula: {lessonDate.split("-").reverse().join("/")} • Congregação: {activeBranchName}
              </div>
            </div>

            {/* Tabela Impressa */}
            <table style={{ width: "100%", fontSize: "9px", borderCollapse: "collapse", border: "1px solid #cbd5e1", marginBottom: "16px" }}>
              <thead>
                <tr style={{ backgroundColor: "#f1f5f9", textAlign: "left" }}>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px" }}>Classe / Faixa Etária</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px" }}>Professor(a)</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px", textAlign: "center" }}>Matrícula</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px", textAlign: "center" }}>Presenças</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px", textAlign: "center" }}>% Assid.</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px", textAlign: "center" }}>Visitantes</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px", textAlign: "center" }}>Bíblias</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px", textAlign: "center" }}>Revistas</th>
                  <th style={{ border: "1px solid #cbd5e1", padding: "6px", textAlign: "right" }}>Ofertas R$</th>
                </tr>
              </thead>
              <tbody>
                {generalReportData.map(cls => (
                  <tr key={cls.id}>
                    <td style={{ border: "1px solid #cbd5e1", padding: "6px", fontWeight: "bold" }}>{cls.name}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "6px" }}>{cls.teacher}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "6px", textAlign: "center" }}>{cls.enrolled}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "6px", textAlign: "center", fontWeight: "bold", color: "#065f46" }}>{cls.present}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "6px", textAlign: "center" }}>{cls.percent}%</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "6px", textAlign: "center" }}>{cls.visitors}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "6px", textAlign: "center" }}>{cls.bibles}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "6px", textAlign: "center" }}>{cls.magazines}</td>
                    <td style={{ border: "1px solid #cbd5e1", padding: "6px", textAlign: "right", fontWeight: "bold" }}>R$ {cls.offering.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: "#f8fafc", fontWeight: "bold", borderTop: "2px solid #065f46" }}>
                  <td colSpan={2} style={{ border: "1px solid #cbd5e1", padding: "7px", textTransform: "uppercase" }}>TOTAL GERAL:</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "7px", textAlign: "center" }}>{generalTotals.enrolled}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "7px", textAlign: "center", color: "#065f46" }}>{generalTotals.present}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "7px", textAlign: "center" }}>{generalAttendancePercent}%</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "7px", textAlign: "center" }}>{generalTotals.visitors}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "7px", textAlign: "center" }}>{generalTotals.bibles}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "7px", textAlign: "center" }}>{generalTotals.magazines}</td>
                  <td style={{ border: "1px solid #cbd5e1", padding: "7px", textAlign: "right", color: "#065f46", fontSize: "11px" }}>R$ {generalTotals.offering.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>

            {/* Assinaturas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24mm", marginTop: "24mm", textAlign: "center", fontSize: "10px" }}>
              <div>
                <div style={{ borderTop: "1px solid #334155", paddingTop: "5px", fontWeight: "bold" }}>
                  Superintendente da EBD
                </div>
                <div style={{ fontSize: "8.5px", color: "#64748b" }}>Direção de Ensino Dominical</div>
              </div>
              <div>
                <div style={{ borderTop: "1px solid #334155", paddingTop: "5px", fontWeight: "bold" }}>
                  Pastor Titular / Presidente
                </div>
                <div style={{ fontSize: "8.5px", color: "#64748b" }}>Visto Pastoral Eclesiástico</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
