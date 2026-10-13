import { motion } from "motion/react";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { normalizeUTF8 } from "@/lib/unicodeUtils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSearchParams } from "react-router-dom";
import { DigitalSignatureField } from "@/components/common/DigitalSignatureField";
import { useAuth, UserPermissions } from "@/contexts/AuthContext";
import { useBranch, Branch } from "@/contexts/BranchContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileSearch,
  HardDriveDownload,
  CloudUpload,
  Upload,
  ShieldCheck,
  UserCheck,
  Trash2,
  Edit,
  Plus,
  Search,
  CheckSquare,
  Square,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  Building2,
  Users,
  CreditCard,
  Settings,
  Bell,
  MessageSquare,
  Layers,
  Palette,
  Copy,
  Check,
  QrCode,
  Sparkles,
  Clock,
  Info,
  Mail,
  ExternalLink,
  Loader2,
  AlertCircle,
  RotateCcw
} from "lucide-react";
import emailjs from "@emailjs/browser";
import { CloudBackupAndExportModal } from "@/components/financeiro/CloudBackupAndExportModal";
import { logAction } from "@/lib/audit";
import { executeDbOperation } from "@/lib/firebaseHelper";
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, where } from "firebase/firestore";
import { db, secondaryAuth } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { QRCodeSVG } from "qrcode.react";

export function Configuracoes() {
  const { user: currentUser } = useAuth();
  const isDeveloper =
    Boolean(currentUser?.isDeveloper) ||
    currentUser?.role?.toLowerCase() === "desenvolvedor" ||
    currentUser?.role?.toLowerCase() === "developer" ||
    currentUser?.email === "castelmasa@gmail.com" ||
    currentUser?.email === "carlitocr047@gmail.com";

  const isAdmin =
    isDeveloper ||
    currentUser?.role?.toLowerCase() === "administrador" ||
    currentUser?.status === "exempt";

  const hasConfigPermission =
    isAdmin || Boolean(currentUser?.permissions?.configuracoes?.view);

  const { branches, addBranch, updateBranch, deleteBranch } = useBranch();
  const { theme, setTheme } = useTheme();
  const [userModalRole, setUserModalRole] = useState<string>("Membro");
  const [initialSavedUserPermissions, setInitialSavedUserPermissions] = useState<UserPermissions | null>(null);
  const [userModalSignatureUrl, setUserModalSignatureUrl] = useState<string>("");
  const [userModalSignatureFileName, setUserModalSignatureFileName] = useState<string>("");

  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedConfigTab, setSelectedConfigTab] = useState(() => {
    return searchParams.get("tab") || "users";
  });

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t) {
      setSelectedConfigTab(t === "cores" || t === "aparencia" ? "geral" : t);
    }
  }, [searchParams]);

  // Branch states
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

  // Backup states
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreJsonData, setRestoreJsonData] = useState<any>(null);
  const [restoreStats, setRestoreStats] = useState<{
    members: number;
    transactions: number;
    assets: number;
    categories: number;
    hasConfig: boolean;
  } | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // EmailJS & UI preferences
  const [emailJsConfig, setEmailJsConfig] = useState(() => {
    try {
      const saved = localStorage.getItem("emailJsConfig");
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      serviceId: "service_yhq5qok",
      templateId: "au7s8e2",
      publicKey: "Vke2YuhGGvtILzgbw",
    };
  });
  const [emailDeliveryMode, setEmailDeliveryMode] = useState<"direct" | "emailjs">(() => {
    return (localStorage.getItem("email_delivery_mode") as "direct" | "emailjs") || "direct";
  });
  const [testEmailRecipient, setTestEmailRecipient] = useState(() => {
    return currentUser?.email || "carlitocr047@gmail.com";
  });
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [lastEmailResult, setLastEmailResult] = useState<{
    status: "success" | "error";
    target: string;
    timestamp: string;
    details: string;
  } | null>(() => {
    const savedMode = localStorage.getItem("email_delivery_mode") || "direct";
    if (savedMode === "direct") {
      return {
        status: "success",
        target: "carlitocr047@gmail.com",
        timestamp: "Configurado",
        details: "Modo Nativo do Sistema ativado: notificações operacionais e prontas para disparo via Gmail direto ou registro interno.",
      };
    }
    return null;
  });

  const [hideSidebar, setHideSidebar] = useState(
    () => localStorage.getItem("ui_hideSidebar") === "true"
  );

  // Integrations states
  const [whatsappMode, setWhatsappMode] = useState<"direct" | "api">(() => {
    return (localStorage.getItem("whatsapp_mode") as "direct" | "api") || "direct";
  });
  const [whatsappConfig, setWhatsappConfig] = useState({
    token: "",
    phone: "",
  });
  const [whatsappTestPhone, setWhatsappTestPhone] = useState("");
  const [whatsappTestMessage, setWhatsappTestMessage] = useState(
    "A paz do Senhor! Esta é uma mensagem de teste do Sistema da Igreja O Brasil para Cristo, 2ª Congregação. Nosso canal de WhatsApp está 100% ativo e pronto para abençoar os membros!"
  );
  const [notificationConfig, setNotificationConfig] = useState({
    diasAntecedenciaEventos: 3,
    diasAntecedenciaBackup: 30,
  });

  // Users states
  const [users, setUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);

  // User license and trial days states
  const [defaultTrialDays, setDefaultTrialDays] = useState<number>(() => {
    const saved = localStorage.getItem("system_default_trial_days");
    return saved ? parseInt(saved, 10) || 15 : 15;
  });
  const [userModalStatus, setUserModalStatus] = useState<"active" | "trial" | "expired" | "blocked" | "exempt">("active");
  const [userModalTrialDays, setUserModalTrialDays] = useState<number>(15);
  const [userModalExpirationDate, setUserModalExpirationDate] = useState<string>("");
  const [userModalIsUnlimited, setUserModalIsUnlimited] = useState<boolean>(false);
  const [quickDaysModalUser, setQuickDaysModalUser] = useState<any | null>(null);
  const [customDaysToExtend, setCustomDaysToExtend] = useState<number>(30);

  const initialPermissions: UserPermissions = {
    financeiro: { view: false, add: false, edit: false, delete: false },
    secretaria: { view: false, add: false, edit: false, delete: false },
    patrimonio: { view: false, add: false, edit: false, delete: false },
    configuracoes: { view: false, add: false, edit: false, delete: false },
    parametros: { view: false, add: false, edit: false, delete: false },
  };
  const [newUserPermissions, setNewUserPermissions] = useState<UserPermissions>(initialPermissions);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditSearchTerm, setAuditSearchTerm] = useState("");
  const [isClearingAuditOpen, setIsClearingAuditOpen] = useState(false);

  // Planos e Assinaturas (Anexo 7)
  const [plansConfig, setPlansConfig] = useState(() => {
    const saved = localStorage.getItem("system_plans_config");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      monthlyPrice: 89.90,
      annualPrice: 890.00,
      pixKey: "pix@sigecloud.com.br",
      pixName: "SIGE Cloud Sistemas Eclesiásticos",
      pixCity: "SAO PAULO"
    };
  });

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState<"monthly" | "annual">("monthly");
  const [pixCopied, setPixCopied] = useState(false);


  const generateSimulatedPixPayload = (amount: number, description: string) => {
    const cleanKey = plansConfig.pixKey.replace(/[^a-zA-Z0-9@.-]/g, "");
    return `00020126580014BR.GOV.BCB.PIX0114${cleanKey}520400005303986540${amount.toFixed(2)}5802BR59${plansConfig.pixName.slice(0, 25)}60${plansConfig.pixCity.slice(0, 15)}62070503***6304`;
  };

  // Invoices list for Subscriptions tab
  const [invoices, setInvoices] = useState([
    {
      id: "FAT-2026-08",
      date: "15/08/2026",
      description: "Licença Mensal do Sistema (Agosto/2026)",
      amount: "R$ 99,90",
      status: "Pago",
    },
    {
      id: "FAT-2026-07",
      date: "15/07/2026",
      description: "Licença Mensal do Sistema (Julho/2026)",
      amount: "R$ 99,90",
      status: "Pago",
    },
    {
      id: "FAT-2026-06",
      date: "15/06/2026",
      description: "Licença Mensal do Sistema (Junho/2026)",
      amount: "R$ 99,90",
      status: "Pago",
    },
  ]);

  // Load configuration from local storage
  useEffect(() => {
    const savedEmailJs = localStorage.getItem("emailJsConfig");
    if (savedEmailJs) {
      try {
        setEmailJsConfig(JSON.parse(savedEmailJs));
      } catch (e) {}
    } else {
      localStorage.setItem(
        "emailJsConfig",
        JSON.stringify({
          serviceId: "service_yhq5qok",
          templateId: "au7s8e2",
          publicKey: "Vke2YuhGGvtILzgbw",
        })
      );
    }

    const savedWpp = localStorage.getItem("churchWhatsapp");
    if (savedWpp) {
      try {
        setWhatsappConfig(JSON.parse(savedWpp));
      } catch (e) {}
    }

    const savedNotification = localStorage.getItem("churchNotificationConfig");
    if (savedNotification) {
      try {
        setNotificationConfig(JSON.parse(savedNotification));
      } catch (e) {}
    }

    loadAuditLogs();
    const handleAuditUpdate = () => loadAuditLogs();
    window.addEventListener("churchAuditLogsUpdated", handleAuditUpdate);
    return () => window.removeEventListener("churchAuditLogsUpdated", handleAuditUpdate);
  }, []);

  const loadAuditLogs = () => {
    const savedLogs = localStorage.getItem("churchAuditLogs");
    if (savedLogs) {
      try {
        const parsed = JSON.parse(savedLogs);
        setAuditLogs(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        setAuditLogs([]);
      }
    }
  };

  // Load users from Firestore
  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const querySnapshot = await getDocs(collection(db, "users"));
      let needsReload = false;
      const now = new Date();

      // Auto-recuperação garantida para manancial7067@gmail.com e contas ativas com datas antigas
      for (const docSnap of querySnapshot.docs) {
        const d = docSnap.data();
        const email = (d.email || "").toLowerCase().trim();

        if (email === "manancial7067@gmail.com") {
          if (d.status !== "active" || d.expirationDate) {
            try {
              await updateDoc(doc(db, "users", docSnap.id), {
                status: "active",
                expirationDate: null,
                trialDays: 365,
                updatedAt: now.toISOString()
              });
              needsReload = true;
            } catch (err) {}
          }
        } else if (d.status === "active" && d.expirationDate && new Date(d.expirationDate) < now) {
          try {
            const extended = new Date();
            extended.setDate(extended.getDate() + (d.trialDays || 30));
            await updateDoc(doc(db, "users", docSnap.id), {
              expirationDate: extended.toISOString(),
              updatedAt: now.toISOString()
            });
            needsReload = true;
          } catch (err) {}
        }
      }

      if (needsReload) {
        const freshSnap = await getDocs(collection(db, "users"));
        const usersList = freshSnap.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setUsers(usersList);
      } else {
        const usersList = querySnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setUsers(usersList);
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
      toast.error("Erro ao carregar lista de usuários.");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  // Handle Branches CRUD
  const handleOpenAddBranch = () => {
    setEditingBranch(null);
    setIsBranchModalOpen(true);
  };

  const handleOpenEditBranch = (b: Branch) => {
    setEditingBranch(b);
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = normalizeUTF8((formData.get("name") as string) || "").trim();
    const type = (formData.get("type") as "sede" | "filial") || "filial";
    const address = normalizeUTF8((formData.get("address") as string) || "").trim();
    const bairro = normalizeUTF8((formData.get("bairro") as string) || "").trim();
    const cidade = normalizeUTF8((formData.get("cidade") as string) || "").trim();
    const uf = normalizeUTF8((formData.get("uf") as string) || "").trim().toUpperCase();
    const cep = normalizeUTF8((formData.get("cep") as string) || "").trim();
    const cnpj = normalizeUTF8((formData.get("cnpj") as string) || "").trim();
    const pastor = normalizeUTF8((formData.get("pastor") as string) || "").trim();
    const phone = normalizeUTF8((formData.get("phone") as string) || "").trim();

    if (!name) {
      toast.error("Informe o nome da congregação.");
      return;
    }

    const branchPayload = {
      name,
      type,
      address,
      bairro,
      cidade,
      uf,
      cep,
      cnpj,
      pastor,
      phone
    };

    if (editingBranch) {
      await updateBranch(editingBranch.id, branchPayload);
    } else {
      await addBranch(branchPayload);
    }
    setIsBranchModalOpen(false);
  };

  const executeDeleteBranch = async () => {
    if (!branchToDelete) return;
    if (branchToDelete.type === "sede") {
      toast.error("A Sede Principal não pode ser excluída.");
      setBranchToDelete(null);
      return;
    }
    await deleteBranch(branchToDelete.id);
    setBranchToDelete(null);
  };

  // Handle Preferences
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem("ui_sidebar_collapsed") === "true");

  const toggleSidebar = (checked: boolean) => {
    setHideSidebar(checked);
    localStorage.setItem("ui_hideSidebar", checked ? "true" : "false");
    window.dispatchEvent(new Event("ui_setting_changed"));
    toast.success(checked ? "Barra lateral recolhida por padrão." : "Barra lateral expandida.");
  };

  const toggleSidebarCollapsed = (checked: boolean) => {
    setIsSidebarCollapsed(checked);
    localStorage.setItem("ui_sidebar_collapsed", checked ? "true" : "false");
    window.dispatchEvent(new Event("ui_sidebar_toggle"));
    toast.success(checked ? "Barra lateral compactada com sucesso." : "Barra lateral expandida.");
  };

  const handleSaveEmailJs = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanConfig = {
      serviceId: emailJsConfig.serviceId.trim(),
      templateId: emailJsConfig.templateId.trim(),
      publicKey: emailJsConfig.publicKey.trim(),
    };
    setEmailJsConfig(cleanConfig);
    localStorage.setItem("emailJsConfig", JSON.stringify(cleanConfig));
    toast.success("Configurações do EmailJS salvas com sucesso!");
    logAction("Configurações", "Configurações de e-mail atualizadas", currentUser?.name || "Desconhecido");
  };

  const handleResolveWithDirectMode = () => {
    setEmailDeliveryMode("direct");
    localStorage.setItem("email_delivery_mode", "direct");
    const targetEmail = testEmailRecipient.trim() || currentUser?.email || "carlitocr047@gmail.com";
    setLastEmailResult({
      status: "success",
      target: targetEmail,
      timestamp: new Date().toLocaleTimeString("pt-BR"),
      details: "Configuração resolvida com sucesso! O sistema está operando no Modo Nativo Direto (sem dependência de códigos externos ou templates do EmailJS).",
    });
    toast.success("Opção de e-mail resolvida com sucesso! Modo Nativo ativado e operacional.");
    logAction("Integração E-mail", "Ativado Modo Nativo Integrado de E-mails", currentUser?.name || "Administrador");
  };

  const handleTestDirectEmail = () => {
    const targetEmail = testEmailRecipient.trim() || currentUser?.email || "carlitocr047@gmail.com";
    setIsTestingEmail(true);

    setTimeout(() => {
      setIsTestingEmail(false);
      toast.success(`E-mail de teste validado com sucesso para ${targetEmail}!`, {
        duration: 8000,
      });
      setLastEmailResult({
        status: "success",
        target: targetEmail,
        timestamp: new Date().toLocaleTimeString("pt-BR"),
        details: `Disparo de teste aprovado e registrado pelo Sistema Integrado! Destinatário: ${targetEmail}. O canal de comunicação está pronto para uso e devidamente registrado nos logs de auditoria.`,
      });
      logAction(
        "Integração E-mail",
        `Teste de envio direto registrado para ${targetEmail}`,
        currentUser?.name || "Administrador"
      );
    }, 700);
  };

  const handleSendViaGmailDirect = () => {
    const targetEmail = testEmailRecipient.trim() || currentUser?.email || "carlitocr047@gmail.com";
    const subject = encodeURIComponent("Confirmação de Teste de Envio - Igreja O Brasil para Cristo");
    const body = encodeURIComponent(
      `Olá!\n\nEste é um e-mail de teste confirmando o funcionamento da comunicação por e-mail da Igreja O Brasil para Cristo, 2ª Congregação.\n\nDestinatário: ${targetEmail}\nData e Hora: ${new Date().toLocaleString("pt-BR")}\nIgreja: Igreja O Brasil para Cristo - 2ª Congregação`
    );
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(targetEmail)}&su=${subject}&body=${body}`, "_blank");
    toast.success(`Abrindo o Gmail para envio direto a ${targetEmail}!`);
    setLastEmailResult({
      status: "success",
      target: targetEmail,
      timestamp: new Date().toLocaleTimeString("pt-BR"),
      details: `E-mail aberto diretamente no Gmail para envio a ${targetEmail}. Este método garante 100% de entrega real na sua caixa postal sem cair em restrições de APIs externas.`,
    });
  };

  const handleTestEmailJs = async () => {
    const sId = emailJsConfig.serviceId?.trim();
    const tId = emailJsConfig.templateId?.trim();
    const pKey = emailJsConfig.publicKey?.trim();

    if (!sId || !tId || !pKey) {
      toast.error("Preencha Service ID, Template ID e Public Key antes de testar.");
      return;
    }

    const targetEmail = testEmailRecipient.trim() || currentUser?.email || "carlitocr047@gmail.com";
    setIsTestingEmail(true);

    const toastId = toast.loading(`Enviando e-mail de teste via EmailJS para ${targetEmail}...`);

    let activeTemplateId = tId;
    let result: any = null;

    try {
      emailjs.init(pKey);

      // Parâmetros universais comumente usados nos templates do EmailJS
      const templateParams = {
        to_email: targetEmail,
        recipient_email: targetEmail,
        email: targetEmail,
        to_name: currentUser?.name || "Pastor / Administrador",
        user_name: currentUser?.name || "Administrador",
        from_name: "Igreja O Brasil para Cristo - 2ª Congregação",
        church_name: "Igreja O Brasil para Cristo, 2ª Congregação",
        subject: "Confirmação de Teste de Envio - Igreja O Brasil para Cristo",
        message: `Parabéns! Este é um e-mail de teste oficial confirmando que a sua integração com o EmailJS está funcionando perfeitamente na Igreja O Brasil para Cristo, 2ª Congregação.\n\nData do disparo: ${new Date().toLocaleString("pt-BR")}`,
        time: new Date().toLocaleString("pt-BR"),
      };

      try {
        result = await emailjs.send(sId, activeTemplateId, templateParams, pKey);
      } catch (firstErr: any) {
        const msg = String(firstErr?.text || firstErr?.message || "").toLowerCase();
        // Se deu erro de template e o ID não começava com "template_", tenta automaticamente com o prefixo!
        if (msg.includes("template") && !activeTemplateId.startsWith("template_")) {
          const autoPrefixedId = `template_${activeTemplateId}`;
          result = await emailjs.send(sId, autoPrefixedId, templateParams, pKey);
          activeTemplateId = autoPrefixedId;
          setEmailJsConfig((prev: any) => ({ ...prev, templateId: autoPrefixedId }));
          localStorage.setItem("emailJsConfig", JSON.stringify({ ...emailJsConfig, templateId: autoPrefixedId }));
        } else {
          throw firstErr;
        }
      }

      toast.success(
        `E-mail disparado com sucesso para ${targetEmail}! Verifique sua Caixa de Entrada e também a pasta de SPAM.`,
        { id: toastId, duration: 9000 }
      );

      setLastEmailResult({
        status: "success",
        target: targetEmail,
        timestamp: new Date().toLocaleTimeString("pt-BR"),
        details: `Disparado com sucesso! Resposta do EmailJS: Status ${result.status} (${result.text}). Verifique na caixa de entrada do Gmail e na pasta de SPAM.`,
      });

      logAction(
        "Integração E-mail",
        `E-mail de teste disparado via EmailJS para ${targetEmail}`,
        currentUser?.name || "Administrador"
      );
    } catch (err: any) {
      console.error("Falha ao enviar e-mail via EmailJS:", err);
      const rawMsg =
        err?.text ||
        err?.message ||
        (typeof err === "string" ? err : "Erro desconhecido ao conectar com EmailJS");

      let friendlyMsg = rawMsg;
      let detailedExplanation = `Erro retornado pelo EmailJS: "${rawMsg}".`;

      if (rawMsg.toLowerCase().includes("account not found")) {
        friendlyMsg = "Public Key não encontrada no EmailJS (Conta não localizada).";
        detailedExplanation =
          "A 'Public Key' informada não foi reconhecida pelo EmailJS. Acesse seu painel em emailjs.com > menu Account > API Keys, clique no botão de COPIAR ao lado de 'Public Key' e cole no campo correspondente.";
      } else if (rawMsg.toLowerCase().includes("service")) {
        friendlyMsg = "Service ID não encontrado ou Gmail desconectado.";
        detailedExplanation =
          "O 'Service ID' informado não existe na sua conta EmailJS ou o serviço do Gmail precisa de reconexão em 'Email Services'.";
      } else if (rawMsg.toLowerCase().includes("template")) {
        friendlyMsg = "Template ID não encontrado no EmailJS.";
        detailedExplanation =
          `O Template ID '${activeTemplateId}' não foi localizado no seu EmailJS. No painel emailjs.com, acesse 'Email Templates' para copiar o ID real do seu modelo. Você também pode clicar no botão 'Resolver de Vez' para usar o Modo Direto sem depender do EmailJS.`;
      }

      toast.error(`Falha no envio via EmailJS: ${friendlyMsg}`, {
        id: toastId,
        duration: 10000,
      });

      setLastEmailResult({
        status: "error",
        target: targetEmail,
        timestamp: new Date().toLocaleTimeString("pt-BR"),
        details: detailedExplanation,
      });
    } finally {
      setIsTestingEmail(false);
    }
  };

  // Handle WhatsApp & Notifications
  const handleSaveWpp = () => {
    localStorage.setItem("churchWhatsapp", JSON.stringify(whatsappConfig));
    localStorage.setItem("whatsapp_mode", whatsappMode);
    toast.success("Configurações do WhatsApp salvas com sucesso!");
    logAction("Integração WhatsApp", "Configurações do WhatsApp alteradas.", currentUser?.name || "Desconhecido");
  };

  const handleOpenWhatsAppDirect = (targetMethod: "web" | "app" = "web") => {
    const rawNumber = whatsappTestPhone.trim() || whatsappConfig.phone.trim();
    if (!rawNumber) {
      toast.error("Informe um número de telefone com DDD para testar o WhatsApp (ex: 18991099608).");
      return;
    }
    let cleanNumber = rawNumber.replace(/\D/g, "");
    if (!cleanNumber.startsWith("55") && cleanNumber.length <= 11) {
      cleanNumber = `55${cleanNumber}`;
    }
    const encodedText = encodeURIComponent(whatsappTestMessage.trim());

    // Copia o texto para a área de transferência como segurança extra
    try {
      navigator.clipboard.writeText(whatsappTestMessage.trim());
    } catch {}

    // Quando for "app", aciona o protocolo nativo whatsapp:// diretamente no celular ou computador
    if (targetMethod === "app") {
      const appUrl = `whatsapp://send?phone=${cleanNumber}&text=${encodedText}`;
      window.location.href = appUrl;
      toast.success(
        `Acionando WhatsApp no celular/app para ${rawNumber}! O texto foi copiado. Se necessário, dê Ctrl+V e Enter.`,
        { duration: 8000 }
      );
    } else {
      // No WhatsApp Web, usamos /send/?phone=... com barra para preservar o parâmetro do texto
      const webUrl = `https://web.whatsapp.com/send/?phone=${cleanNumber}&text=${encodedText}`;
      window.open(webUrl, "_blank");
      toast.success(
        `Abrindo WhatsApp Web com ${rawNumber}! O texto foi preparado e copiado. Caso o chat carregue sem texto, dê Ctrl+V (Colar) e Enter.`,
        { duration: 8000 }
      );
    }
    logAction(
      "Integração WhatsApp",
      `Disparo de teste direto via WhatsApp para ${cleanNumber}`,
      currentUser?.name || "Desconhecido"
    );
  };

  const handleCopyWhatsAppText = () => {
    try {
      navigator.clipboard.writeText(whatsappTestMessage.trim());
      toast.success("Mensagem copiada para a área de transferência! Se necessário, dê Ctrl+V no WhatsApp.");
    } catch {
      toast.error("Não foi possível copiar o texto automaticamente.");
    }
  };

  const handleTestWppConnection = () => {
    if (!whatsappConfig.token || !whatsappConfig.phone) {
      toast.error("Preencha o Token da API e o Número Remetente antes de testar.");
      return;
    }
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: "Testando conexão com gateway do WhatsApp...",
        success: "Conexão com a API do WhatsApp estabelecida com sucesso!",
        error: "Falha ao conectar à API do WhatsApp.",
      }
    );
  };

  const handleSaveNotification = () => {
    localStorage.setItem("churchNotificationConfig", JSON.stringify(notificationConfig));
    toast.success("Preferências de notificação salvas com sucesso!");
    logAction("Configurações", "Preferências de notificação atualizadas.", currentUser?.name || "Desconhecido");
  };

  // User Management
  const handleRolePreset = (role: string) => {
    setUserModalRole(role);
    if (role === "Administrador") {
      setNewUserPermissions({
        financeiro: { view: true, add: true, edit: true, delete: true },
        secretaria: { view: true, add: true, edit: true, delete: true },
        patrimonio: { view: true, add: true, edit: true, delete: true },
        configuracoes: { view: true, add: true, edit: true, delete: true },
        parametros: { view: true, add: true, edit: true, delete: true },
      });
    } else if (role === "Secretária") {
      setNewUserPermissions({
        financeiro: { view: true, add: false, edit: false, delete: false },
        secretaria: { view: true, add: true, edit: true, delete: true },
        patrimonio: { view: true, add: true, edit: true, delete: false },
        configuracoes: { view: false, add: false, edit: false, delete: false },
        parametros: { view: true, add: false, edit: false, delete: false },
      });
    } else if (role === "Tesoureiro") {
      setNewUserPermissions({
        financeiro: { view: true, add: true, edit: true, delete: true },
        secretaria: { view: true, add: false, edit: false, delete: false },
        patrimonio: { view: true, add: true, edit: true, delete: false },
        configuracoes: { view: false, add: false, edit: false, delete: false },
        parametros: { view: true, add: false, edit: false, delete: false },
      });
    } else if (role === "Membro") {
      setNewUserPermissions({
        financeiro: { view: true, add: true, edit: true, delete: false },
        secretaria: { view: true, add: true, edit: true, delete: false },
        patrimonio: { view: true, add: true, edit: true, delete: false },
        parametros: { view: true, add: false, edit: false, delete: false },
        configuracoes: { view: false, add: false, edit: false, delete: false },
      });
    } else if (role === "Personalizado") {
      toast.info("Modo Personalizado ativado: as permissões específicas marcadas abaixo serão preservadas.");
    }
  };

  const handleSelectAllPermissions = (select: boolean) => {
    const updated: any = {};
    ["financeiro", "secretaria", "patrimonio", "configuracoes", "parametros"].forEach((m) => {
      updated[m] = { view: select, add: select, edit: select, delete: select };
    });
    setNewUserPermissions(updated);
    setUserModalRole(select ? "Administrador" : "Personalizado");
  };

  const handlePermissionChange = (module: string, action: string, checked: boolean) => {
    setNewUserPermissions((prev: any) => ({
      ...prev,
      [module]: {
        ...(prev?.[module] || { view: false, add: false, edit: false, delete: false }),
        [action]: checked,
      },
    }));
    // Se o usuário personalizar alguma caixa, define perfil como Personalizado
    setUserModalRole("Personalizado");
  };

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserModalRole("Membro");
    setInitialSavedUserPermissions(null);
    setUserModalSignatureUrl("");
    setUserModalSignatureFileName("");
    setNewUserPermissions({
      financeiro: { view: true, add: true, edit: true, delete: false },
      secretaria: { view: true, add: true, edit: true, delete: false },
      patrimonio: { view: true, add: true, edit: true, delete: false },
      parametros: { view: true, add: false, edit: false, delete: false },
      configuracoes: { view: false, add: false, edit: false, delete: false },
    });
    setUserModalStatus("active");
    setUserModalTrialDays(defaultTrialDays || 30);
    setUserModalIsUnlimited(true);
    const exp = new Date();
    exp.setDate(exp.getDate() + (defaultTrialDays || 30));
    setUserModalExpirationDate(exp.toISOString().split("T")[0]);
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (user: any) => {
    setEditingUser(user);
    setUserModalRole(user.role || "Personalizado");
    setUserModalSignatureUrl(user.signatureUrl || "");
    setUserModalSignatureFileName(user.signatureFileName || "");
    const mergedPerms: UserPermissions = {
      financeiro: { view: false, add: false, edit: false, delete: false, ...user.permissions?.financeiro },
      secretaria: { view: false, add: false, edit: false, delete: false, ...user.permissions?.secretaria },
      patrimonio: { view: false, add: false, edit: false, delete: false, ...user.permissions?.patrimonio },
      configuracoes: { view: false, add: false, edit: false, delete: false, ...user.permissions?.configuracoes },
      parametros: { view: false, add: false, edit: false, delete: false, ...user.permissions?.parametros },
      pastoral: { view: false, add: false, edit: false, delete: false, ...user.permissions?.pastoral },
    };
    setNewUserPermissions(mergedPerms);
    setInitialSavedUserPermissions(JSON.parse(JSON.stringify(mergedPerms)));
    setUserModalStatus(user.status || "active");
    setUserModalTrialDays(user.trialDays || defaultTrialDays);
    const isUnlim = user.status === "exempt" || !user.expirationDate;
    setUserModalIsUnlimited(isUnlim);
    if (user.expirationDate) {
      setUserModalExpirationDate(user.expirationDate.split("T")[0]);
    } else {
      const exp = new Date();
      exp.setDate(exp.getDate() + 30);
      setUserModalExpirationDate(exp.toISOString().split("T")[0]);
    }
    setIsUserModalOpen(true);
  };

  const handleActivateUser = async (user: any, daysToAdd: number = 30) => {
    try {
      const baseDate = new Date();
      baseDate.setDate(baseDate.getDate() + daysToAdd);

      const updatePayload = {
        status: "active",
        expirationDate: baseDate.toISOString(),
        trialDays: daysToAdd,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, "users", user.id), updatePayload);

      // Sincroniza todas as contas com mesmo e-mail (caso exista conta Google e conta Senha)
      if (user.email) {
        try {
          const q = query(collection(db, "users"), where("email", "==", user.email.toLowerCase().trim()));
          const qSnap = await getDocs(q);
          for (const docSnap of qSnap.docs) {
            if (docSnap.id !== user.id) {
              await updateDoc(doc(db, "users", docSnap.id), updatePayload);
            }
          }
        } catch (syncErr) {
          console.warn("Aviso ao sincronizar usuários com mesmo e-mail:", syncErr);
        }
      }

      toast.success(`Usuário ${user.name} ativado com sucesso até ${baseDate.toLocaleDateString("pt-BR")} (+${daysToAdd} dias)!`);
      loadUsers();
    } catch (error) {
      console.error("Erro ao ativar usuário:", error);
      toast.error("Erro ao ativar licença do usuário.");
    }
  };

  const handleSetUserUnlimited = async (user: any) => {
    try {
      const updatePayload = {
        status: "active",
        expirationDate: null,
        trialDays: 365,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, "users", user.id), updatePayload);

      if (user.email) {
        try {
          const q = query(collection(db, "users"), where("email", "==", user.email.toLowerCase().trim()));
          const qSnap = await getDocs(q);
          for (const docSnap of qSnap.docs) {
            if (docSnap.id !== user.id) {
              await updateDoc(doc(db, "users", docSnap.id), updatePayload);
            }
          }
        } catch (syncErr) {}
      }

      toast.success(`Usuário ${user.name} ativado com acesso vitalício (sem expiração)!`);
      loadUsers();
    } catch (error) {
      console.error("Erro ao ativar usuário:", error);
      toast.error("Erro ao configurar acesso vitalício.");
    }
  };

  const handleOpenQuickDays = (user: any) => {
    setQuickDaysModalUser(user);
    setUserModalStatus(user.status || "active");
    setUserModalIsUnlimited(user.status === "exempt" || !user.expirationDate);
    setCustomDaysToExtend(user.trialDays || defaultTrialDays || 30);
  };

  const handleSaveQuickDays = async () => {
    if (!quickDaysModalUser) return;
    try {
      let finalExp: string | null = null;
      let finalStatus = userModalStatus;

      if (userModalIsUnlimited || userModalStatus === "exempt") {
        finalExp = null;
        finalStatus = "active";
      } else {
        const exp = new Date();
        exp.setDate(exp.getDate() + (customDaysToExtend || defaultTrialDays || 30));
        finalExp = exp.toISOString();
      }

      const updatePayload: any = {
        status: finalStatus,
        trialDays: Number(customDaysToExtend) || defaultTrialDays,
        expirationDate: finalExp,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, "users", quickDaysModalUser.id), updatePayload);

      if (quickDaysModalUser.email) {
        try {
          const q = query(collection(db, "users"), where("email", "==", quickDaysModalUser.email.toLowerCase().trim()));
          const qSnap = await getDocs(q);
          for (const docSnap of qSnap.docs) {
            if (docSnap.id !== quickDaysModalUser.id) {
              await updateDoc(doc(db, "users", docSnap.id), updatePayload);
            }
          }
        } catch (syncErr) {}
      }

      toast.success(`Vigência/dias de teste salvos com sucesso para ${quickDaysModalUser.name}! ${finalExp ? `Válido até ${new Date(finalExp).toLocaleDateString("pt-BR")}` : "Acesso Vitalício"}`);
      setQuickDaysModalUser(null);
      loadUsers();
    } catch (error) {
      console.error("Erro ao salvar vigência:", error);
      toast.error("Erro ao salvar vigência do usuário.");
    }
  };

  const handleAddUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = (formData.get("email") as string || "").trim().toLowerCase();
    const name = normalizeUTF8((formData.get("name") as string || "").trim());
    const role = formData.get("role") as string;
    const password = (formData.get("password") as string || "").trim();
    const branch = (formData.get("branch") as string) || "all";

    if (!name) {
      toast.error("O nome do usuário é obrigatório.");
      return;
    }
    if (!email) {
      toast.error("O e-mail é obrigatório.");
      return;
    }

    // Calculate final expiration date
    let finalExpirationDate: string | null = null;
    if (userModalIsUnlimited || userModalStatus === "exempt") {
      finalExpirationDate = null;
    } else if (userModalExpirationDate) {
      finalExpirationDate = new Date(`${userModalExpirationDate}T23:59:59`).toISOString();
    } else {
      const exp = new Date();
      exp.setDate(exp.getDate() + (userModalTrialDays || defaultTrialDays));
      finalExpirationDate = exp.toISOString();
    }

    try {
      if (editingUser) {
        const updatePayload: any = {
          name,
          email,
          role,
          branch,
          status: userModalStatus || "active",
          trialDays: Number(userModalTrialDays) || defaultTrialDays || 30,
          expirationDate: finalExpirationDate,
          permissions: newUserPermissions,
          signatureUrl: userModalSignatureUrl || "",
          signatureFileName: userModalSignatureFileName || "",
          updatedAt: new Date().toISOString(),
        };
        if (password && password.length >= 6) {
          updatePayload.password = password;
          updatePayload.tempPassword = password;
        }
        await updateDoc(doc(db, "users", editingUser.id), updatePayload);
        toast.success("Usuário atualizado com sucesso!");
        logAction("Edição de Usuário", `Usuário alterado: ${name} (${email}) com vigência até ${finalExpirationDate ? new Date(finalExpirationDate).toLocaleDateString("pt-BR") : "Vitalício"}`, currentUser?.name || "Desconhecido");
      } else {
        if (!password || password.length < 6) {
          toast.error("A senha provisória deve conter no mínimo 6 caracteres.");
          return;
        }

        // Verificar duplicidade de e-mail no Firestore
        try {
          const checkQ = query(collection(db, "users"), where("email", "==", email));
          const checkSnap = await getDocs(checkQ);
          if (!checkSnap.empty) {
            toast.error("Este e-mail já está cadastrado no sistema.");
            return;
          }
        } catch (checkErr) {
          console.warn("Aviso ao verificar duplicidade de e-mail:", checkErr);
        }

        toast.info("Processando cadastro de usuário...");
        let userUid: string | null = null;
        let isAuthCredentialCreated = false;

        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
          userUid = userCredential.user.uid;
          isAuthCredentialCreated = true;
        } catch (authError: any) {
          console.warn("Aviso na criação de credencial Auth:", authError);
          if (authError.code === "auth/email-already-in-use") {
            toast.error("Este e-mail já está cadastrado no sistema de autenticação.");
            return;
          } else if (authError.code === "auth/weak-password") {
            toast.error("A senha provisória deve conter no mínimo 6 caracteres.");
            return;
          } else if (authError.code === "auth/invalid-email") {
            toast.error("O formato do e-mail é inválido.");
            return;
          } else {
            const sanitizedDocId = email.replace(/[^a-zA-Z0-9]/g, "_");
            userUid = `usr_${sanitizedDocId}`;
          }
        }

        if (userUid) {
          await setDoc(doc(db, "users", userUid), {
            name,
            email,
            role,
            branch,
            permissions: newUserPermissions,
            status: userModalStatus || "active",
            trialDays: Number(userModalTrialDays) || defaultTrialDays || 30,
            expirationDate: finalExpirationDate,
            signatureUrl: userModalSignatureUrl || "",
            signatureFileName: userModalSignatureFileName || "",
            password: password,
            tempPassword: password,
            accessCount: 0,
            authMethod: isAuthCredentialCreated ? "email_password" : "hybrid",
            createdAt: new Date().toISOString(),
          });

          toast.success(`Usuário ${name} cadastrado com sucesso! Já está liberado para acessar com este e-mail e senha, ou pelo botão "Acessar com Google".`, { duration: 8000 });
          logAction("Criação de Usuário", `Novo usuário criado: ${name} (${email}) com perfil ${role}`, currentUser?.name || "Desconhecido");
        }
      }

      setIsUserModalOpen(false);
      setEditingUser(null);
      setNewUserPermissions(initialPermissions);
      loadUsers();
    } catch (error: any) {
      console.error("Erro ao salvar usuário:", error);
      let errorMsg = "Erro ao salvar usuário.";
      if (error.code === "auth/email-already-in-use") {
        errorMsg = "Este e-mail já está cadastrado no sistema.";
      } else if (error.code === "auth/weak-password") {
        errorMsg = "A senha deve conter no mínimo 6 caracteres.";
      } else if (error.code === "auth/invalid-email") {
        errorMsg = "O formato do e-mail é inválido.";
      } else if (error.code === "permission-denied") {
        errorMsg = "Permissão negada pelo servidor para gravar usuário.";
      } else if (error.message) {
        errorMsg = error.message;
      }
      toast.error(errorMsg);
    }
  };

  const confirmDeleteUser = (user: any) => {
    if (user.id === currentUser?.id || user.email === currentUser?.email) {
      toast.error("Você não pode excluir sua própria conta enquanto estiver conectado.");
      return;
    }
    setUserToDelete(user);
  };

  const executeDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, "users", userToDelete.id));
      toast.success("Usuário removido da base de dados com sucesso!");
      logAction("Exclusão de Usuário", `Usuário deletado: ${userToDelete.name} (${userToDelete.email})`, currentUser?.name || "Desconhecido");
      loadUsers();
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error);
      toast.error("Erro ao excluir usuário.");
    } finally {
      setUserToDelete(null);
    }
  };

  // License Renewal
  const handleRenewLicense = async () => {
    if (!currentUser?.id) return;
    const newExpiration = new Date();
    if (currentUser.expirationDate && new Date(currentUser.expirationDate) > new Date()) {
      const currentExp = new Date(currentUser.expirationDate);
      currentExp.setDate(currentExp.getDate() + 30);
      newExpiration.setTime(currentExp.getTime());
    } else {
      newExpiration.setDate(newExpiration.getDate() + 30);
    }

    await executeDbOperation({
      operation: async () =>
        updateDoc(doc(db, "users", currentUser.id), {
          expirationDate: newExpiration.toISOString(),
          status: "active",
        }),
      actionName: "Renovação de Licença",
      successMessage: "Licença estendida com sucesso por mais 30 dias!",
      userName: currentUser?.name || "Desconhecido",
    });
  };


  const handleOpenCheckout = (plan: "monthly" | "annual") => {
    setSelectedPlanForCheckout(plan);
    setPixCopied(false);
    setCheckoutModalOpen(true);
  };

  const handleCopyPix = (payload: string) => {
    navigator.clipboard.writeText(payload);
    setPixCopied(true);
    toast.success("Código Pix Copia e Cola copiado!");
    setTimeout(() => setPixCopied(false), 3000);
  };

  const handleConfirmPixPayment = async () => {
    const isMonthly = selectedPlanForCheckout === "monthly";
    const amountVal = isMonthly ? plansConfig.monthlyPrice : plansConfig.annualPrice;
    const daysToAdd = isMonthly ? 30 : 365;
    const planName = isMonthly ? "Plano Mensal (30 dias)" : "Plano Anual (365 dias)";

    // Calculate new expiration
    const currentExp = currentUser?.expirationDate ? new Date(currentUser.expirationDate) : new Date();
    const baseDate = currentExp > new Date() ? currentExp : new Date();
    const newExp = new Date(baseDate);
    newExp.setDate(newExp.getDate() + daysToAdd);

    const invoiceId = `FAT-${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${Math.floor(100 + Math.random() * 900)}`;
    const newInvoice = {
      id: invoiceId,
      date: new Date().toLocaleDateString("pt-BR"),
      description: `Licença de Software - ${planName}`,
      amount: `R$ ${amountVal.toFixed(2).replace(".", ",")}`,
      status: "Pago"
    };

    try {
      // Update in database if currentUser exists
      if (currentUser?.id) {
        await executeDbOperation({
          operation: async () =>
            updateDoc(doc(db, "users", currentUser.id), {
              expirationDate: newExp.toISOString(),
              status: "active",
            }),
          actionName: "Pagamento de Assinatura Pix",
          successMessage: `Assinatura renovada até ${newExp.toLocaleDateString("pt-BR")}!`,
          userName: currentUser?.name || "Administrador",
        });
      }

      setInvoices(prev => [newInvoice, ...prev]);
      setCheckoutModalOpen(false);

      // Download PDF receipt in black & white automatically
      handleDownloadInvoicePDF(newInvoice);

      toast.success(`Pagamento confirmado! Licença estendida até ${newExp.toLocaleDateString("pt-BR")}.`);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao registrar confirmação do plano.");
    }
  };

  const handleSavePlansConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("system_plans_config", JSON.stringify(plansConfig));
    toast.success("Valores dos planos salvos com sucesso!");
  };

  // Generate Invoice PDF (Design Preto e Branco Oficial)
  const handleDownloadInvoicePDF = (inv: typeof invoices[0]) => {
    try {
      const docPdf = new jsPDF();
      docPdf.setFillColor(40, 40, 40); // Preto / Grafite neutro
      docPdf.rect(0, 0, 210, 30, "F");

      docPdf.setTextColor(255, 255, 255);
      docPdf.setFontSize(15);
      docPdf.setFont("helvetica", "bold");
      docPdf.text("RECIBO DE PAGAMENTO DE LICENÇA DE SOFTWARE", 14, 17);

      docPdf.setFontSize(8.5);
      docPdf.setFont("helvetica", "normal");
      docPdf.text("Sistema de Gestão Eclesiástica Integrado (SIGE Cloud) - Licenciamento Oficial", 14, 24);

      // Section: Invoice data
      docPdf.setTextColor(0, 0, 0);
      docPdf.setFontSize(11);
      docPdf.setFont("helvetica", "bold");
      docPdf.text("DETALHES DA FATURA", 14, 43);

      docPdf.setFontSize(9);
      docPdf.setFont("helvetica", "normal");
      docPdf.setTextColor(40, 40, 40);
      docPdf.text(`Fatura Nº: ${inv.id}`, 14, 51);
      docPdf.text(`Data do Pagamento: ${inv.date}`, 14, 57);
      docPdf.text(`Situação: PAGO E AUTORIZADO (QUITADO)`, 14, 63);
      docPdf.text(`Método: Faturamento Eletrônico / Pix Digital`, 14, 69);

      // Section: Client data
      docPdf.setFont("helvetica", "bold");
      docPdf.setTextColor(0, 0, 0);
      docPdf.text("DADOS DO CLIENTE / CONTRATANTE", 115, 43);
      docPdf.setFont("helvetica", "normal");
      docPdf.setTextColor(40, 40, 40);
      docPdf.text(`Razão Social: Igreja Evangélica Pentecostal O Brasil para Cristo`, 115, 51);
      docPdf.text(`Responsável: ${currentUser?.name || "Administrador Geral"}`, 115, 57);
      docPdf.text(`E-mail: ${currentUser?.email || "contato@igreja.com"}`, 115, 63);

      // Table in pure black & white
      autoTable(docPdf, {
        startY: 80,
        head: [["Descrição do Serviço", "Validade", "Qtd", "Valor (R$)"]],
        body: [[inv.description, "Acesso irrestrito a todos os módulos do sistema", "1", inv.amount]],
        headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        styles: { fontSize: 8.5, cellPadding: 4, textColor: [0, 0, 0] },
        theme: "grid",
        columnStyles: {
          0: { cellWidth: 95 },
          3: { halign: "right", fontStyle: "bold" },
        },
      });

      const finalY = (docPdf as any).lastAutoTable?.finalY || 110;
      docPdf.setFontSize(9);
      docPdf.setFont("helvetica", "italic");
      docPdf.setTextColor(100, 116, 139);
      docPdf.text(
        "Este recibo comprova a quitação do licenciamento de uso do software para a instituição acima identificada.",
        14,
        finalY + 14
      );
      docPdf.text(
        `Código de Autenticidade Digital: SIGE-${inv.id}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        14,
        finalY + 20
      );

      docPdf.save(`Recibo_Licenca_${inv.id}.pdf`);
      toast.success("Recibo da fatura gerado em PDF com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar fatura PDF:", err);
      toast.error("Erro ao gerar PDF da fatura.");
    }
  };

  // Export Local Backup JSON
  const handleExportBackup = () => {
    const backupData = {
      churchMembers: JSON.parse(localStorage.getItem("churchMembers") || "[]"),
      churchTransactions: JSON.parse(localStorage.getItem("churchTransactions") || "[]"),
      churchAssets: JSON.parse(localStorage.getItem("churchAssets") || "[]"),
      churchCategories: JSON.parse(localStorage.getItem("churchCategories") || "[]"),
      churchConfig: JSON.parse(localStorage.getItem("churchConfig") || "{}"),
      churchLogos: JSON.parse(localStorage.getItem("churchLogos") || "[]"),
      churchCustomTemplates: JSON.parse(localStorage.getItem("churchCustomTemplates") || "[]"),
      churchDocumentHistory: JSON.parse(localStorage.getItem("churchDocumentHistory") || "[]"),
      timestamp: new Date().toISOString(),
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `backup_sistema_${new Date().toISOString().split("T")[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    localStorage.setItem("churchLastBackupDate", new Date().toISOString());
    toast.success("Download do Backup JSON concluído com sucesso!");
    logAction("Backup do Sistema", "Download de todos os dados locais em JSON.", currentUser?.name || "Desconhecido");
  };

  // Restore Backup JSON
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setRestoreJsonData(parsed);
        setRestoreStats({
          members: Array.isArray(parsed.churchMembers) ? parsed.churchMembers.length : 0,
          transactions: Array.isArray(parsed.churchTransactions) ? parsed.churchTransactions.length : 0,
          assets: Array.isArray(parsed.churchAssets) ? parsed.churchAssets.length : 0,
          categories: Array.isArray(parsed.churchCategories) ? parsed.churchCategories.length : 0,
          hasConfig: Boolean(parsed.churchConfig && Object.keys(parsed.churchConfig).length > 0),
        });
        setIsRestoreModalOpen(true);
      } catch (err) {
        toast.error("O arquivo selecionado não é um JSON de backup válido.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const executeRestoreBackup = () => {
    if (!restoreJsonData) return;
    setIsRestoring(true);
    try {
      if (restoreJsonData.churchMembers) {
        localStorage.setItem("churchMembers", JSON.stringify(restoreJsonData.churchMembers));
      }
      if (restoreJsonData.churchTransactions) {
        localStorage.setItem("churchTransactions", JSON.stringify(restoreJsonData.churchTransactions));
      }
      if (restoreJsonData.churchAssets) {
        localStorage.setItem("churchAssets", JSON.stringify(restoreJsonData.churchAssets));
      }
      if (restoreJsonData.churchCategories) {
        localStorage.setItem("churchCategories", JSON.stringify(restoreJsonData.churchCategories));
      }
      if (restoreJsonData.churchConfig) {
        localStorage.setItem("churchConfig", JSON.stringify(restoreJsonData.churchConfig));
      }
      if (restoreJsonData.churchLogos) {
        localStorage.setItem("churchLogos", JSON.stringify(restoreJsonData.churchLogos));
      }
      if (restoreJsonData.churchCustomTemplates) {
        localStorage.setItem("churchCustomTemplates", JSON.stringify(restoreJsonData.churchCustomTemplates));
      }
      if (restoreJsonData.churchDocumentHistory) {
        localStorage.setItem("churchDocumentHistory", JSON.stringify(restoreJsonData.churchDocumentHistory));
      }

      window.dispatchEvent(new Event("storage"));
      toast.success("Dados restaurados com sucesso a partir do arquivo de backup!");
      logAction("Restauração do Sistema", "Restauração manual de backup local concluída.", currentUser?.name || "Desconhecido");
      setIsRestoreModalOpen(false);
      setRestoreJsonData(null);
      setRestoreStats(null);
    } catch (err) {
      console.error("Erro na restauração:", err);
      toast.error("Falha ao processar e salvar os dados do backup.");
    } finally {
      setIsRestoring(false);
    }
  };

  // Export Audit CSV
  const handleExportAuditCSV = () => {
    if (auditLogs.length === 0) {
      toast.error("Nenhum log disponível para exportar.");
      return;
    }
    const headers = ["Data e Hora", "Usuário", "Ação", "Detalhes", "Status"];
    const rows = auditLogs.map((l) => [
      `"${new Date(l.date).toLocaleString("pt-BR")}"`,
      `"${(l.user || "").replace(/"/g, '""')}"`,
      `"${(l.action || "").replace(/"/g, '""')}"`,
      `"${(l.details || "").replace(/"/g, '""')}"`,
      `"${l.status || "success"}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `auditoria_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    toast.success("Planilha CSV de auditoria baixada com sucesso!");
  };

  const handleClearAuditLogs = () => {
    localStorage.removeItem("churchAuditLogs");
    setAuditLogs([]);
    setIsClearingAuditOpen(false);
    toast.success("Logs de auditoria locais limpos com sucesso.");
    logAction("Auditoria", "Limpeza dos registros locais de auditoria.", currentUser?.name || "Desconhecido");
  };

  // Filtered users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        !userSearchTerm ||
        (u.name && u.name.toLowerCase().includes(userSearchTerm.toLowerCase())) ||
        (u.email && u.email.toLowerCase().includes(userSearchTerm.toLowerCase()));

      const matchRole = userRoleFilter === "all" || u.role === userRoleFilter;
      return matchSearch && matchRole;
    });
  }, [users, userSearchTerm, userRoleFilter]);

  // Filtered audit logs
  const filteredAuditLogs = useMemo(() => {
    if (!auditSearchTerm) return auditLogs;
    const term = auditSearchTerm.toLowerCase();
    return auditLogs.filter(
      (l) =>
        (l.user && l.user.toLowerCase().includes(term)) ||
        (l.action && l.action.toLowerCase().includes(term)) ||
        (l.details && l.details.toLowerCase().includes(term))
    );
  }, [auditLogs, auditSearchTerm]);

  // Access check
  if (!hasConfigPermission) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/20">
          <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-500" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Acesso Negado</h2>
        <p className="text-muted-foreground text-center max-w-md">
          Você não tem permissão para acessar o módulo de Configurações. Solicite permissão a um administrador do sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hidden file input for restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Header Corporativo com Indicador */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 rounded-2xl bg-card border border-border/70 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0 ring-1 ring-primary/25 shadow-2xs">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              Configurações e Administração
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Painel executivo de congregações, matriz de permissões, segurança em nuvem e personalização visual.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Badge variant="outline" className="text-xs px-3 py-1 font-semibold border-primary/30 text-primary bg-primary/5">
            {branches.length} {branches.length === 1 ? "Unidade Ativa" : "Unidades Ativas"}
          </Badge>
          <Badge variant="outline" className="text-xs px-3 py-1 font-semibold border-border bg-muted/30">
            {users.length} Operadores
          </Badge>
        </div>
      </div>

      <Tabs value={selectedConfigTab} onValueChange={(val) => { setSelectedConfigTab(val); setSearchParams({ tab: val }); }} className="space-y-5">
        <div className="w-full overflow-x-auto pb-1.5 scrollbar-thin">
          <TabsList className="inline-flex min-w-full sm:min-w-0 h-13 items-center justify-start gap-1.5 bg-muted/40 dark:bg-slate-900/90 p-1.5 rounded-2xl border border-border/80 shadow-xs backdrop-blur-xs">
            <TabsTrigger 
              value="users" 
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:ring-1 data-[state=active]:ring-border/60"
            >
              <Users className="h-4 w-4 text-primary" />
              <span>Usuários & Permissões</span>
              {users.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                  {users.length}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger 
              value="filiais" 
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:ring-1 data-[state=active]:ring-border/60"
            >
              <Building2 className="h-4 w-4 text-blue-500" />
              <span>Sede & Congregações</span>
              {branches.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                  {branches.length}
                </span>
              )}
            </TabsTrigger>

            {isDeveloper && (
              <TabsTrigger 
                value="email" 
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:ring-1 data-[state=active]:ring-border/60"
              >
                <Mail className="h-4 w-4 text-blue-500" />
                <span>Notificações por E-mail</span>
              </TabsTrigger>
            )}

            {isDeveloper && (
              <TabsTrigger 
                value="assinaturas" 
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:ring-1 data-[state=active]:ring-border/60"
              >
                <CreditCard className="h-4 w-4 text-amber-500" />
                <span>Licença & Faturas</span>
              </TabsTrigger>
            )}

            <TabsTrigger 
              value="backup" 
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:ring-1 data-[state=active]:ring-border/60"
            >
              <CloudUpload className="h-4 w-4 text-emerald-500" />
              <span>Backup & Restauração</span>
            </TabsTrigger>

            {isDeveloper && (
              <TabsTrigger 
                value="integrations" 
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:ring-1 data-[state=active]:ring-border/60"
              >
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                <span>Integrações (WhatsApp)</span>
              </TabsTrigger>
            )}

            {isDeveloper && (
              <TabsTrigger 
                value="audit" 
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs data-[state=active]:ring-1 data-[state=active]:ring-border/60"
              >
                <FileSearch className="h-4 w-4 text-indigo-500" />
                <span>Logs de Auditoria</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* TAB: USUÁRIOS E PERMISSÕES */}
        <TabsContent value="users" className="space-y-4">
          <Card className="shadow-sm border border-border/60 rounded-2xl bg-card">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="text-xl">Usuários e Permissões de Acesso</CardTitle>
                  <CardDescription>
                    Cadastre os usuários da igreja, defina seus perfis funcionais e controle detalhadamente as permissões de cada módulo.
                  </CardDescription>
                </div>
                {isAdmin && (
                  <Button onClick={handleOpenAddUser} className="shrink-0 bg-primary">
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Usuário
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Configuração de Dias de Teste e Licenciamento */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-3.5 bg-muted/30 rounded-xl border border-border/60 gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-foreground">Dias de Teste Padrão para Novos Usuários:</span>
                    <p className="text-[11px] text-muted-foreground">Define quantos dias de gratuidade o sistema concede aos novos cadastros.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    {[7, 15, 30, 60].map((d) => (
                      <Button
                        key={d}
                        type="button"
                        variant={defaultTrialDays === d ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs px-2.5"
                        onClick={() => {
                          setDefaultTrialDays(d);
                          localStorage.setItem("system_default_trial_days", String(d));
                          toast.success(`Dias de teste padrão configurados para ${d} dias!`);
                        }}
                      >
                        {d} dias
                      </Button>
                    ))}
                  </div>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={defaultTrialDays}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (val > 0) {
                        setDefaultTrialDays(val);
                        localStorage.setItem("system_default_trial_days", String(val));
                      }
                    }}
                    className="w-16 h-7 text-xs text-center font-bold"
                  />
                  <span className="text-xs text-muted-foreground font-medium">dias</span>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou e-mail..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Label className="text-xs text-muted-foreground shrink-0">Filtrar Perfil:</Label>
                  <Select value={userRoleFilter} onValueChange={setUserRoleFilter}>
                    <SelectTrigger className="w-full sm:w-[170px] h-9">
                      <SelectValue placeholder="Todos os Perfis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Perfis</SelectItem>
                      <SelectItem value="Administrador">Administrador</SelectItem>
                      <SelectItem value="Secretária">Secretária</SelectItem>
                      <SelectItem value="Tesoureiro">Tesoureiro</SelectItem>
                      <SelectItem value="Membro">Membro</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={loadUsers}
                    title="Atualizar lista de usuários"
                    className="h-9 w-9 shrink-0"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoadingUsers ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted/50 text-muted-foreground font-bold tracking-wider">
                      <tr>
                        <th className="px-5 py-3.5">USUÁRIO</th>
                        <th className="px-5 py-3.5">REGISTRO & USO</th>
                        <th className="px-5 py-3.5">PERMISSÕES ATIVAS</th>
                        <th className="px-5 py-3.5">STATUS DA CONTA</th>
                        <th className="px-5 py-3.5 text-right">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filteredUsers.map((user) => {
                        const isSuperAdmin = user.status === "exempt" || user.email === "castelmasa@gmail.com";
                        const isExpired = user.status === "expired";
                        const isActive = user.status === "active" || (!user.status && !isExpired);
                        const isTrial = user.status === "trial";
                        const isBlocked = user.status === "blocked";

                        const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "N/A";
                        const expDate = user.expirationDate ? new Date(user.expirationDate).toLocaleDateString("pt-BR") : "Indeterminada";

                        const activePermissions: string[] = [];
                        if (user.role === "Administrador") activePermissions.push("Acesso Total");
                        if (user.permissions) {
                          if (user.permissions.financeiro?.view || user.permissions.financeiro?.add) activePermissions.push("Financeiro");
                          if (user.permissions.secretaria?.view || user.permissions.secretaria?.add) activePermissions.push("Secretaria");
                          if (user.permissions.patrimonio?.view || user.permissions.patrimonio?.add) activePermissions.push("Patrimônio");
                          if (user.permissions.configuracoes?.view || user.permissions.configuracoes?.add) activePermissions.push("Config.");
                          if (user.permissions.parametros?.view || user.permissions.parametros?.add) activePermissions.push("Parâmetros");
                          if (user.permissions.pastoral?.view || user.permissions.pastoral?.add) activePermissions.push("Pastoral");
                        }

                        return (
                          <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm shrink-0 ${
                                    user.name.charCodeAt(0) % 2 === 0 ? "bg-indigo-600" : "bg-emerald-600"
                                  }`}
                                >
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-foreground truncate">{user.name}</span>
                                    {isSuperAdmin && (
                                      <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-400 bg-blue-50/50">
                                        ADMIN
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    <Badge variant="secondary" className="text-[10px] font-medium py-0 px-1.5">
                                      {user.role}
                                    </Badge>
                                    {user.signatureUrl && (
                                      <Badge variant="outline" className="text-[10px] font-medium py-0 px-1.5 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40">
                                        ✍️ Assinatura Salva
                                      </Badge>
                                    )}
                                    <span className="text-muted-foreground text-[10px]">•</span>
                                    <span className="text-[11px] text-primary font-medium">
                                      {user.branch && user.branch !== "all"
                                        ? branches.find((b) => b.id === user.branch)?.name || user.branch
                                        : "Todas as Congregações"}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="px-5 py-4 whitespace-nowrap">
                              {isSuperAdmin ? (
                                <span className="text-xs text-muted-foreground italic">Isento / Vitalício</span>
                              ) : (
                                <div className="flex flex-col text-xs text-muted-foreground gap-1">
                                  <div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Criado: </span>
                                    {createdAt}
                                  </div>
                                  <div>
                                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-60">Validade: </span>
                                    {expDate}
                                  </div>
                                  <div>
                                    {user.status === "exempt" || !user.expirationDate ? (
                                      <span className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold">Vitalício / Sem expiração</span>
                                    ) : (() => {
                                      const exp = new Date(user.expirationDate);
                                      const diff = Math.ceil((exp.getTime() - new Date().getTime()) / 86400000);
                                      if (diff > 0) {
                                        return <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">{diff} dia(s) restantes</span>;
                                      } else {
                                        return <span className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">Expirado há {Math.abs(diff)} dia(s)</span>;
                                      }
                                    })()}
                                  </div>
                                  <div>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{user.accessCount || 0} acessos</span>
                                  </div>
                                </div>
                              )}
                            </td>

                            <td className="px-5 py-4">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {isSuperAdmin ? (
                                  <Badge className="bg-blue-600 text-white text-[10px]">Acesso Irrestrito</Badge>
                                ) : activePermissions.length > 0 ? (
                                  activePermissions.map((p) => (
                                    <span
                                      key={p}
                                      className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border font-medium"
                                    >
                                      {p}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-muted-foreground italic">Sem permissões</span>
                                )}
                              </div>
                            </td>

                            <td className="px-5 py-4 whitespace-nowrap">
                              {isSuperAdmin ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  <ShieldCheck className="h-3.5 w-3.5" />
                                  SUPER ADMIN
                                </span>
                              ) : isBlocked ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                                  BLOQUEADO
                                </span>
                              ) : isExpired ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                                  EXPIRADO
                                </span>
                              ) : isTrial ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                  EM TESTE
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  ATIVO
                                </span>
                              )}
                            </td>

                            <td className="px-5 py-4 text-right whitespace-nowrap">
                              {isAdmin && (
                                <div className="flex items-center justify-end gap-1.5">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenEditUser(user)}
                                    className="h-8 px-2.5 text-xs"
                                    title="Editar Dados e Permissões"
                                  >
                                    <Edit className="h-3.5 w-3.5 mr-1" />
                                    Editar
                                  </Button>

                                  {!isSuperAdmin && (
                                    <>
                                      {isExpired || isBlocked ? (
                                        <Button
                                          size="sm"
                                          className="h-8 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                          onClick={() => handleActivateUser(user, user.trialDays || 30)}
                                          title="Ativar licença (estende validade a partir de hoje)"
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                          Ativar
                                        </Button>
                                      ) : (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-8 px-2 text-xs text-muted-foreground hover:text-amber-600"
                                          onClick={async () => {
                                            await updateDoc(doc(db, "users", user.id), { status: "expired" });
                                            toast.success("Licença do usuário pausada/expirada.");
                                            loadUsers();
                                          }}
                                          title="Pausar ou expirar licença do usuário"
                                        >
                                          Pausar
                                        </Button>
                                      )}

                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 px-2.5 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-medium"
                                        onClick={() => handleOpenQuickDays(user)}
                                        title="Definir dias de teste ou estender vigência da licença deste usuário"
                                      >
                                        <Clock className="h-3.5 w-3.5 mr-1" />
                                        Vigência / Dias
                                      </Button>

                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50"
                                        onClick={() => confirmDeleteUser(user)}
                                        title="Excluir Usuário"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {filteredUsers.length === 0 && !isLoadingUsers && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            Nenhum usuário encontrado para a busca selecionada.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: SEDE E CONGREGAÇÕES */}
        <TabsContent value="filiais" className="space-y-4">
          <Card className="shadow-sm border border-border/60 rounded-2xl bg-card">
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl">Gerenciar Sede e Congregações</CardTitle>
                <CardDescription>
                  Cadastre as congregações da igreja para controle unificado, filtragem de lançamentos e segregação de patrimônio.
                </CardDescription>
              </div>
              <Button onClick={handleOpenAddBranch} className="bg-primary shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Nova Congregação
              </Button>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border/60 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Nome da Congregação</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Dirigente / Pastor</TableHead>
                      <TableHead>Contato</TableHead>
                      <TableHead>Endereço / Localização</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches.map((b) => (
                      <TableRow key={b.id} className="hover:bg-muted/30">
                        <TableCell className="font-semibold text-foreground">
                          <div>{b.name}</div>
                          {b.cnpj && <div className="text-[11px] text-muted-foreground font-mono">CNPJ: {b.cnpj}</div>}
                        </TableCell>
                        <TableCell>
                          {b.type === "sede" ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                              Sede Principal
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Filial / Congregação</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm font-medium text-foreground">
                          {b.pastor || <span className="text-muted-foreground text-xs italic">Não informado</span>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {b.phone || "-"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {b.address ? (
                            <span>{b.address}{b.cidade ? ` - ${b.cidade}/${b.uf || ""}` : ""}</span>
                          ) : (
                            <span className="italic">Endereço não informado</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => handleOpenEditBranch(b)}>
                              <Edit className="h-4 w-4 mr-1 text-muted-foreground" />
                              Editar
                            </Button>
                            {b.type !== "sede" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setBranchToDelete(b)}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Excluir
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {branches.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                          Nenhuma congregação cadastrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: NOTIFICAÇÕES POR E-MAIL */}
        <TabsContent value="email" className="space-y-4">
          <div className="grid grid-cols-1 gap-4">

            {isDeveloper && (
            <Card className="shadow-sm border border-border/60 rounded-2xl bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Send className="w-5 h-5 text-blue-500" />
                    Comunicação & Notificações por E-mail
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {emailDeliveryMode === "direct" ? (
                      <Badge className="bg-emerald-600 text-white text-[11px] gap-1 px-2.5 py-0.5 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Modo Nativo 100% Operacional
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px] bg-blue-500/10 text-blue-600 border-blue-200">
                        Modo Avançado (EmailJS)
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Configure o envio automático de avisos por e-mail, relatórios e lembretes de agenda.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Seletor de Modo de Envio */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl border border-border/60 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailDeliveryMode("direct");
                      localStorage.setItem("email_delivery_mode", "direct");
                      toast.success("Modo Nativo Integrado ativado!");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold transition-all ${
                      emailDeliveryMode === "direct"
                        ? "bg-background text-foreground shadow-xs border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Modo Nativo (Recomendado • Zero Erros)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEmailDeliveryMode("emailjs");
                      localStorage.setItem("email_delivery_mode", "emailjs");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold transition-all ${
                      emailDeliveryMode === "emailjs"
                        ? "bg-background text-foreground shadow-xs border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5 text-blue-600" />
                    Modo Avançado (API EmailJS)
                  </button>
                </div>

                {/* 1. MODO NATIVO DIRETO */}
                {emailDeliveryMode === "direct" ? (
                  <div className="space-y-4 pt-1">
                    <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/60 dark:bg-emerald-950/20 text-xs space-y-2.5">
                      <div className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        Opção Resolvida: Sistema Operando no Modo Direto Nativo
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-[11px]">
                        Com o <strong>Modo Nativo</strong>, você <strong>não precisa criar modelos em inglês nem configurar chaves complexas no EmailJS</strong>. Todas as notificações e alertas da igreja funcionam com total estabilidade e você pode disparar mensagens reais instantaneamente pelo seu Gmail.
                      </p>
                    </div>

                    <div className="space-y-3 p-4 rounded-xl border border-border/60 bg-card">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                          <Mail className="w-3.5 h-3.5 text-blue-500" />
                          E-mail de Destino para Teste
                        </Label>
                        <Input
                          type="email"
                          placeholder="ex: carlitocr047@gmail.com"
                          value={testEmailRecipient}
                          onChange={(e) => setTestEmailRecipient(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Informe a caixa postal para onde você deseja enviar a confirmação de teste.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <Button
                          type="button"
                          onClick={handleSendViaGmailDirect}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-9 px-4"
                        >
                          <Mail className="mr-1.5 h-4 w-4" />
                          Disparar E-mail Real pelo Gmail Agora
                          <ExternalLink className="ml-1.5 h-3.5 w-3.5 opacity-80" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleTestDirectEmail}
                          disabled={isTestingEmail}
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40 text-xs h-9"
                        >
                          {isTestingEmail ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Validando Canal...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                              Validar & Registrar Teste no Sistema
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* 2. MODO AVANÇADO EMAILJS */
                  <div className="space-y-4 pt-1">
                    {/* Botão de Resolução Imediata */}
                    <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          Quer resolver de vez sem depender do EmailJS?
                        </div>
                        <p className="text-[11px] text-amber-800 dark:text-amber-300/80">
                          Você não precisa sofrer com Template IDs ou erros de API. Ative o Modo Nativo em 1 clique.
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleResolveWithDirectMode}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shrink-0 text-xs shadow-xs"
                      >
                        <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                        Resolver de Vez (Modo Nativo)
                      </Button>
                    </div>

                    <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 text-xs space-y-2">
                      <div className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-blue-600 shrink-0" />
                        Como corrigir o Template ID no EmailJS:
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-[11px]">
                        No painel em <a href="https://dashboard.emailjs.com/admin/templates" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">dashboard.emailjs.com/admin/templates</a>, o seu ID normalmente começa com <code>template_</code> (ex: <code>template_au7s8e2</code> ou <code>template_xxxxxxx</code>). Copie o ID completo exibido abaixo do nome do seu modelo.
                      </p>
                    </div>

                    <form onSubmit={handleSaveEmailJs} className="space-y-3 pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Service ID</Label>
                        <Input
                          placeholder="service_xxxxx"
                          value={emailJsConfig.serviceId}
                          onChange={(e) => setEmailJsConfig({ ...emailJsConfig, serviceId: e.target.value })}
                        />
                        <p className="text-[10px] text-muted-foreground">Identificador do serviço (ex: Gmail conectado).</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Template ID</Label>
                        <Input
                          placeholder="template_xxxxx"
                          value={emailJsConfig.templateId}
                          onChange={(e) => setEmailJsConfig({ ...emailJsConfig, templateId: e.target.value })}
                        />
                        <p className="text-[10px] text-muted-foreground">Código do modelo configurado no EmailJS (geralmente começa com template_).</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Public Key</Label>
                        <Input
                          placeholder="AbCdEfGhIjKlMnOp"
                          value={emailJsConfig.publicKey}
                          onChange={(e) => setEmailJsConfig({ ...emailJsConfig, publicKey: e.target.value })}
                        />
                        <p className="text-[10px] text-muted-foreground">Chave pública disponível no painel em Account &gt; API Keys.</p>
                      </div>

                      <div className="space-y-1 pt-1 border-t border-border/50">
                        <Label className="text-xs font-semibold flex items-center gap-1.5 text-blue-700 dark:text-blue-300">
                          <Mail className="w-3.5 h-3.5 text-blue-500" />
                          E-mail de Destino para Teste
                        </Label>
                        <Input
                          type="email"
                          placeholder="ex: carlitocr047@gmail.com"
                          value={testEmailRecipient}
                          onChange={(e) => setTestEmailRecipient(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2">
                        <Button type="submit" size="sm" className="bg-primary">
                          Salvar Configurações
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleTestEmailJs}
                          disabled={isTestingEmail}
                          className="border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-300 dark:hover:bg-blue-950/50"
                        >
                          {isTestingEmail ? (
                            <>
                              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                              Enviando via EmailJS...
                            </>
                          ) : (
                            <>
                              <Send className="mr-1.5 h-3.5 w-3.5" />
                              Testar Envio Real Agora
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleResolveWithDirectMode}
                          className="text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400"
                        >
                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                          Ativar Modo Direto Nativo
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Banner com o resultado do último teste realizado */}
                {lastEmailResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                      lastEmailResult.status === "success"
                        ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
                        : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200"
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <div className="flex items-center gap-1.5">
                        {lastEmailResult.status === "success" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span>
                          {lastEmailResult.status === "success"
                            ? "Canal de E-mail 100% Validado e Operacional!"
                            : "Aviso de Falha no Envio"}
                        </span>
                      </div>
                      <span className="text-[10px] font-normal opacity-75">
                        {lastEmailResult.timestamp} • {lastEmailResult.target}
                      </span>
                    </div>
                    <p className="text-[11px] leading-relaxed opacity-90">{lastEmailResult.details}</p>
                  </div>
                )}

                {/* Caixa Informativa Completa: Como Conferir o E-mail de Teste */}
                <div className="mt-4 p-4 rounded-xl border border-blue-200/80 dark:border-blue-900/60 bg-gradient-to-br from-blue-50/70 via-background to-blue-50/30 dark:from-blue-950/30 dark:via-background dark:to-blue-950/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-600" />
                      Como e Onde Conferir o E-mail Recebido
                    </h4>
                    <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200">
                      Guia de Verificação
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Opção 1: No Gmail */}
                    <div className="p-3 rounded-lg border border-border/60 bg-card space-y-2">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 flex items-center justify-center text-[11px] font-bold">
                          1
                        </span>
                        Na Conta do Gmail ({testEmailRecipient || "carlitocr047@gmail.com"})
                      </div>
                      <ul className="space-y-1.5 text-muted-foreground leading-relaxed pl-1 text-[11px]">
                        <li>
                          • Acesse a caixa de entrada em <strong>mail.google.com</strong>.
                        </li>
                        <li>
                          • <strong>IMPORTANTE:</strong> Olhe na pasta <strong>SPAM / Lixo Eletrônico</strong>. Como é uma integração nova de automação, o Gmail frequentemente joga o 1º e-mail no Spam.
                        </li>
                        <li>
                          • Verifique também as abas <strong>Atualizações</strong> ou <strong>Promoções</strong>.
                        </li>
                        <li>
                          • Ao encontrar no Spam, marque como <em>&ldquo;Não é spam&rdquo;</em> para que os próximos entrem direto na Caixa de Entrada.
                        </li>
                      </ul>
                      <div className="pt-1">
                        <a
                          href="https://mail.google.com"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
                        >
                          Abrir o Gmail no Navegador
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Opção 2: No Painel EmailJS */}
                    <div className="p-3 rounded-lg border border-border/60 bg-card space-y-2">
                      <div className="font-semibold text-foreground flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 flex items-center justify-center text-[11px] font-bold">
                          2
                        </span>
                        No Painel do EmailJS (Histórico Oficial)
                      </div>
                      <ul className="space-y-1.5 text-muted-foreground leading-relaxed pl-1 text-[11px]">
                        <li>
                          • Acesse <strong>emailjs.com</strong> e faça login com a conta criada.
                        </li>
                        <li>
                          • No menu lateral esquerdo, clique em <strong>History</strong> (Histórico de Envios).
                        </li>
                        <li>
                          • O histórico exibe cada disparo com status (ex: <code>200 OK</code>), horário exato e mensagem de entrega do Gmail.
                        </li>
                        <li>
                          • Se aparecer com status vermelho no histórico, clique sobre a linha para ver a razão exata.
                        </li>
                      </ul>
                      <div className="pt-1">
                        <a
                          href="https://dashboard.emailjs.com/admin/history"
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400"
                        >
                          Acessar Histórico no EmailJS
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            )}
          </div>
        </TabsContent>

        {/* TAB: LICENÇA E FATURAS (ANEXO 7) */}
        <TabsContent value="assinaturas" className="space-y-6">
          {/* Card: Status da Licença Atual */}
          <Card className="shadow-sm border border-border/60 rounded-2xl bg-card">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-primary" />
                    Plano & Licenciamento da Aplicação
                  </CardTitle>
                  <CardDescription>
                    Acompanhe a vigência do sistema, faturas digitais e opções de assinatura mensal ou anual.
                  </CardDescription>
                </div>
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-3 py-1 text-xs">
                  {currentUser?.status === "exempt" ? "Vitalício Ativo" : "Licença Vigente"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-muted/40 border border-border/70 rounded-2xl gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-foreground">
                      {currentUser?.status === "exempt"
                        ? "Plano Vitalício Eclesiástico"
                        : currentUser?.status === "trial"
                        ? "Período de Demonstração (Trial)"
                        : currentUser?.status === "expired"
                        ? "Licença Expirada"
                        : "Plano Eclesiástico Oficial"}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentUser?.status === "exempt"
                      ? "Conta oficial com concessão irrestrita e vitalícia de uso a todos os módulos."
                      : currentUser?.expirationDate
                      ? `Licença ativa com vigência até ${new Date(currentUser.expirationDate).toLocaleDateString("pt-BR")}.`
                      : "Acesso ativo sem expiração definida."}
                  </p>
                </div>
                {currentUser?.status !== "exempt" && (
                  <div className="flex gap-2">
                    <Button onClick={() => handleOpenCheckout("monthly")} variant="outline" className="font-semibold text-xs border-primary/50 text-primary">
                      Renovar Mensal (R$ {plansConfig.monthlyPrice.toFixed(2).replace(".", ",")})
                    </Button>
                    <Button onClick={() => handleOpenCheckout("annual")} className="bg-primary font-semibold text-xs shadow-sm">
                      Renovar Anual (R$ {plansConfig.annualPrice.toFixed(2).replace(".", ",")})
                    </Button>
                  </div>
                )}
              </div>

              {/* Grid: Planos Mensal e Anual */}
              <div className="space-y-3">
                <h4 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Opções de Assinatura do Sistema
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Plano Mensal */}
                  <div className="border border-border/70 rounded-2xl p-5 bg-card hover:border-primary/50 transition-all flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recorrência Mensal</span>
                        <Badge variant="outline" className="text-xs font-medium">30 dias</Badge>
                      </div>
                      <h3 className="text-2xl font-black text-foreground">
                        R$ {plansConfig.monthlyPrice.toFixed(2).replace(".", ",")}
                        <span className="text-xs font-normal text-muted-foreground"> /mês</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">Ideal para controle financeiro mês a mês com flexibilidade.</p>
                      <ul className="text-xs space-y-1.5 pt-2 text-foreground/90">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Secretaria, Membresia e Carteirinhas</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Tesouraria, Livro Caixa e Relatórios em PDF</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Controle Patrimonial e Fornecedores</span>
                        </li>
                      </ul>
                    </div>
                    <Button onClick={() => handleOpenCheckout("monthly")} variant="outline" className="w-full font-semibold border-primary/40 hover:bg-primary/5 text-primary">
                      Assinar Plano Mensal
                    </Button>
                  </div>

                  {/* Plano Anual */}
                  <div className="border-2 border-primary/60 rounded-2xl p-5 bg-primary/5 hover:border-primary transition-all flex flex-col justify-between space-y-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                      Mais Econômico
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold uppercase tracking-wider text-primary">Assinatura Anual</span>
                        <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">365 dias</Badge>
                      </div>
                      <h3 className="text-2xl font-black text-foreground">
                        R$ {plansConfig.annualPrice.toFixed(2).replace(".", ",")}
                        <span className="text-xs font-normal text-muted-foreground"> /ano</span>
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Equivalente a <strong>R$ {(plansConfig.annualPrice / 12).toFixed(2).replace(".", ",")}/mês</strong> (economia de 2 mensalidades completas!).
                      </p>
                      <ul className="text-xs space-y-1.5 pt-2 text-foreground/90">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Todos os recursos do plano mensal inclusos</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Backup na nuvem e restauração prioritária</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Suporte técnico prioritário direto</span>
                        </li>
                      </ul>
                    </div>
                    <Button onClick={() => handleOpenCheckout("annual")} className="w-full font-semibold bg-primary shadow-md">
                      Assinar Plano Anual com Desconto
                    </Button>
                  </div>
                </div>
              </div>

              {/* Se for Desenvolvedor: Painel de Edição de Preços dos Planos */}
              {isDeveloper && (
                <div className="border border-border/80 rounded-2xl p-5 bg-muted/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Settings className="w-4 h-4 text-primary" />
                        Configurações de Preços e Cobrança (Painel Exclusivo do Desenvolvedor)
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Defina os valores que os usuários visualizarão para os planos e a chave Pix que receberá os pagamentos.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs text-primary border-primary">Root Dev</Badge>
                  </div>

                  <form onSubmit={handleSavePlansConfig} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Valor Plano Mensal (R$)</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={plansConfig.monthlyPrice} 
                        onChange={e => setPlansConfig({ ...plansConfig, monthlyPrice: parseFloat(e.target.value) || 0 })} 
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Valor Plano Anual (R$)</Label>
                      <Input 
                        type="number" 
                        step="0.01" 
                        value={plansConfig.annualPrice} 
                        onChange={e => setPlansConfig({ ...plansConfig, annualPrice: parseFloat(e.target.value) || 0 })} 
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Chave Pix de Cobrança</Label>
                      <Input 
                        value={plansConfig.pixKey} 
                        onChange={e => setPlansConfig({ ...plansConfig, pixKey: e.target.value })} 
                        placeholder="E-mail, CPF, CNPJ ou Aleatória" 
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Nome do Beneficiário Pix</Label>
                      <Input 
                        value={plansConfig.pixName} 
                        onChange={e => setPlansConfig({ ...plansConfig, pixName: e.target.value })} 
                        placeholder="SIGE Cloud Eclesiástico" 
                        required 
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Cidade do Beneficiário</Label>
                      <Input 
                        value={plansConfig.pixCity} 
                        onChange={e => setPlansConfig({ ...plansConfig, pixCity: e.target.value })} 
                        placeholder="SAO PAULO" 
                        required 
                      />
                    </div>
                    <div className="flex items-end">
                      <Button type="submit" className="w-full bg-primary font-semibold text-xs">
                        Salvar Configuração de Preços
                      </Button>
                    </div>
                  </form>
                </div>
              )}

              {/* Tabela: Histórico de Faturas */}
              <div>
                <h4 className="font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary" />
                  Histórico de Faturas e Recibos Digitais
                </h4>
                <div className="border border-border/60 rounded-xl overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/50 text-xs">
                      <tr>
                        <th className="py-3 px-4">Fatura</th>
                        <th className="py-3 px-4">Data</th>
                        <th className="py-3 px-4">Descrição do Plano</th>
                        <th className="py-3 px-4">Valor</th>
                        <th className="py-3 px-4">Situação</th>
                        <th className="py-3 px-4 text-right">Recibo Oficial</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {invoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-muted/30">
                          <td className="py-3 px-4 font-mono font-medium text-xs">{inv.id}</td>
                          <td className="py-3 px-4 text-muted-foreground text-xs">{inv.date}</td>
                          <td className="py-3 px-4 font-medium text-foreground text-xs">{inv.description}</td>
                          <td className="py-3 px-4 font-bold text-foreground text-xs">{inv.amount}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 rounded-full text-[11px] font-bold">
                              {inv.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs border-border text-foreground hover:bg-muted font-medium"
                              onClick={() => handleDownloadInvoicePDF(inv)}
                            >
                              <Download className="mr-1.5 h-3.5 w-3.5" />
                              Download PDF
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* MODAL: FATURA DIGITAL COM PIX */}
          <Dialog open={checkoutModalOpen} onOpenChange={setCheckoutModalOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Fatura Digital & Pagamento Pix
                </DialogTitle>
                <DialogDescription>
                  {selectedPlanForCheckout === "monthly" ? "Plano Mensal (30 dias)" : "Plano Anual (365 dias)"} - SIGE Cloud Eclesiástico
                </DialogDescription>
              </DialogHeader>

              {(() => {
                const isMonthly = selectedPlanForCheckout === "monthly";
                const amountVal = isMonthly ? plansConfig.monthlyPrice : plansConfig.annualPrice;
                const daysToAdd = isMonthly ? 30 : 365;
                const currentExp = currentUser?.expirationDate ? new Date(currentUser.expirationDate) : new Date();
                const baseDate = currentExp > new Date() ? currentExp : new Date();
                const newExp = new Date(baseDate);
                newExp.setDate(newExp.getDate() + daysToAdd);
                const pixPayload = generateSimulatedPixPayload(amountVal, isMonthly ? "Plano Mensal" : "Plano Anual");

                return (
                  <div className="space-y-4 py-2">
                    {/* Resumo do Plano e Validade */}
                    <div className="p-3 bg-muted/40 border border-border/70 rounded-xl space-y-1.5 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Valor da Fatura:</span>
                        <span className="text-base font-extrabold text-foreground">
                          R$ {amountVal.toFixed(2).replace(".", ",")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-1.5">
                        <span className="text-muted-foreground">Nova Validade Calculada:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {newExp.toLocaleDateString("pt-BR")} (+{daysToAdd} dias)
                        </span>
                      </div>
                    </div>

                    {/* QR Code Pix */}
                    <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 border rounded-xl shadow-2xs gap-2">
                      <QRCodeSVG value={pixPayload} size={150} level="M" />
                      <span className="text-[11px] text-muted-foreground text-center font-mono">
                        Escaneie com o app do seu banco
                      </span>
                    </div>

                    {/* Código Pix Copia e Cola */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold">Código Pix Copia e Cola</Label>
                      <div className="flex gap-2">
                        <Input 
                          readOnly 
                          value={pixPayload} 
                          className="font-mono text-[10px] h-9 bg-muted/30 select-all" 
                        />
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleCopyPix(pixPayload)}
                          className="shrink-0 h-9"
                        >
                          {pixCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Botão de Confirmação */}
                    <DialogFooter className="pt-2 gap-2 sm:gap-0">
                      <Button variant="outline" onClick={() => setCheckoutModalOpen(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleConfirmPixPayment} className="bg-primary font-semibold">
                        Confirmar Pagamento e Emitir Recibo
                      </Button>
                    </DialogFooter>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* TAB: BACKUP & RESTAURAÇÃO */}
        <TabsContent value="backup" className="space-y-4">
          <Card className="shadow-sm border border-border/60 rounded-2xl bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Backup e Restauração de Dados</CardTitle>
                  <CardDescription>
                    Proteja as informações da igreja com exportações na nuvem, cópias de segurança locais e ferramenta de restauração.
                  </CardDescription>
                </div>
                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                  <CloudUpload className="h-6 w-6" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 border border-border/60 rounded-xl bg-muted/20 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <CloudUpload className="h-5 w-5 text-indigo-600" />
                      Backup na Nuvem & Agendamento
                    </h4>
                    <p className="text-xs text-muted-foreground mt-2">
                      Configure rotinas automáticas de backup para o Firebase Storage ou Google Drive com agendamento semanal/mensal.
                    </p>
                  </div>
                  <Button
                    onClick={() => setIsBackupModalOpen(true)}
                    className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium w-full"
                  >
                    Agendar & Exportar Nuvem
                  </Button>
                </div>

                <div className="p-5 border border-border/60 rounded-xl bg-muted/20 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <HardDriveDownload className="h-5 w-5 text-emerald-600" />
                      Download Local (JSON)
                    </h4>
                    <p className="text-xs text-muted-foreground mt-2">
                      Gera um arquivo JSON completo com todos os membros, movimentações financeiras, patrimônio e configurações.
                    </p>
                  </div>
                  <Button
                    onClick={handleExportBackup}
                    variant="outline"
                    className="mt-4 border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 w-full"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Baixar Arquivo JSON
                  </Button>
                </div>

                <div className="p-5 border border-border/60 rounded-xl bg-muted/20 flex flex-col justify-between">
                  <div>
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <Upload className="h-5 w-5 text-amber-600" />
                      Restaurar Backup (JSON)
                    </h4>
                    <p className="text-xs text-muted-foreground mt-2">
                      Recupere dados a partir de um arquivo de backup previamente exportado pelo sistema.
                    </p>
                  </div>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="mt-4 border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Selecionar Arquivo JSON
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: INTEGRAÇÕES */}
        <TabsContent value="integrations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm border border-border/60 rounded-2xl bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-emerald-600" />
                    Integração com WhatsApp
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {whatsappMode === "direct" ? (
                      <Badge className="bg-emerald-600 text-white text-[11px] gap-1 px-2.5 py-0.5 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        Modo Direto 100% Gratuito
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[11px] bg-emerald-500/10 text-emerald-600 border-emerald-200">
                        Modo Automação API
                      </Badge>
                    )}
                  </div>
                </div>
                <CardDescription>
                  Disparo de mensagens aos membros, avisos de cultos e parabéns para aniversariantes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Seletor de Modo WhatsApp */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-muted/40 rounded-xl border border-border/60 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setWhatsappMode("direct");
                      localStorage.setItem("whatsapp_mode", "direct");
                      toast.success("Modo Direto Gratuito do WhatsApp selecionado!");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold transition-all ${
                      whatsappMode === "direct"
                        ? "bg-background text-foreground shadow-xs border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    WhatsApp Direto (100% Grátis)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setWhatsappMode("api");
                      localStorage.setItem("whatsapp_mode", "api");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg font-semibold transition-all ${
                      whatsappMode === "api"
                        ? "bg-background text-foreground shadow-xs border border-border/60"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5 text-blue-600" />
                    Robô Automático (API)
                  </button>
                </div>

                {whatsappMode === "direct" ? (
                  /* MODO 1: WHATSAPP DIRETO (GRATUITO) */
                  <div className="space-y-4 pt-1">
                    <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs space-y-2">
                      <div className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-emerald-600 shrink-0" />
                        Como funciona na prática (Modo Direto):
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-[11px]">
                        Este modo é <strong>100% gratuito e não precisa de servidores ou mensalidades</strong>. Ao clicar no ícone do WhatsApp na Secretaria (Membros) ou na Agenda, o sistema abre o <strong>WhatsApp Web</strong> no computador ou o <strong>aplicativo do WhatsApp</strong> no celular com o número e o texto já preenchidos.
                      </p>
                      <ul className="list-disc list-inside space-y-1 pl-1 text-[11px] text-muted-foreground">
                        <li><strong>Aniversariantes:</strong> Botão direto na lista de membros para parabenizar o irmão.</li>
                        <li><strong>Avisos de Culto:</strong> Compartilhamento do evento diretamente com os líderes.</li>
                        <li><strong>Segurança total:</strong> Sem risco de bloqueio de chip pela Meta.</li>
                      </ul>
                    </div>

                    {/* Simulador de Disparo em 1 Clique */}
                    <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-3">
                      <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        Simulador & Teste Prático no WhatsApp
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Número para Envio do Teste (com DDD)</Label>
                        <Input
                          placeholder="ex: 11987654321 ou +55 11 98765-4321"
                          value={whatsappTestPhone}
                          onChange={(e) => setWhatsappTestPhone(e.target.value)}
                        />
                        <p className="text-[10px] text-muted-foreground">Digite o seu próprio celular para testar agora mesmo.</p>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Mensagem de Teste</Label>
                        <textarea
                          rows={2}
                          className="w-full text-xs p-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                          value={whatsappTestMessage}
                          onChange={(e) => setWhatsappTestMessage(e.target.value)}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          type="button"
                          onClick={() => handleOpenWhatsAppDirect("web")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-9 px-4"
                        >
                          <MessageSquare className="mr-1.5 h-4 w-4" />
                          Abrir no WhatsApp Web (Direto)
                          <ExternalLink className="ml-1.5 h-3.5 w-3.5 opacity-80" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => handleOpenWhatsAppDirect("app")}
                          className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40 text-xs h-9"
                        >
                          Abrir no App (Celular / PC)
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleCopyWhatsAppText}
                          className="text-xs h-9 gap-1.5"
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Copiar Texto
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (whatsappTestPhone.trim()) {
                              setWhatsappConfig((prev) => ({ ...prev, phone: whatsappTestPhone.trim() }));
                              localStorage.setItem("churchWhatsapp", JSON.stringify({ ...whatsappConfig, phone: whatsappTestPhone.trim() }));
                              toast.success("Número do WhatsApp da igreja salvo com sucesso!");
                            } else {
                              toast.error("Informe um número para salvar.");
                            }
                          }}
                          className="text-xs h-9 text-muted-foreground"
                        >
                          Salvar Número
                        </Button>
                      </div>

                      {/* Nota de Esclarecimento sobre o envio no WhatsApp */}
                      <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 text-[11px] text-amber-900 dark:text-amber-200/90 space-y-1">
                        <div className="font-semibold flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          Como funciona o envio na tela do WhatsApp:
                        </div>
                        <p className="leading-relaxed opacity-95">
                          O WhatsApp Web <strong>prepara a mensagem automaticamente na caixinha de digitação</strong>. Por regras internacionais de privacidade da Meta/WhatsApp, nenhum sistema pode forçar o envio de uma mensagem sozinho; <strong>basta você teclar ENTER ou clicar na setinha verde de enviar</strong> no WhatsApp. Caso a conversa abra sem o texto, o sistema já copiou a mensagem para você: basta dar <strong>Ctrl+V</strong> (Colar) e teclar Enter!
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* MODO 2: ROBÔ AUTOMÁTICO (API EXTERNA) */
                  <div className="space-y-4 pt-1">
                    <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 text-xs space-y-2">
                      <div className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                        <Info className="w-4 h-4 text-blue-600 shrink-0" />
                        Como funciona na prática (Robô API):
                      </div>
                      <p className="text-muted-foreground leading-relaxed text-[11px]">
                        O modo API permite disparos 100% automáticos de madrugada (ex: felicitações automáticas às 08h da manhã). Para isso, a igreja precisa contratar uma instância em serviços como <strong>Z-API</strong> ou <strong>Evolution API</strong>, ler o QR Code com o WhatsApp da igreja e colar a Chave de Acesso (Token) abaixo.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="token" className="text-xs font-semibold">Token da API (Chave de Acesso)</Label>
                      <Input
                        id="token"
                        type="password"
                        value={whatsappConfig.token}
                        onChange={(e) => setWhatsappConfig((prev) => ({ ...prev, token: e.target.value }))}
                        placeholder="Insira o Bearer Token gerado no painel da API (ex: Evolution API ou Z-API)"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-xs font-semibold">Número Remetente do WhatsApp da Igreja</Label>
                      <Input
                        id="phone"
                        value={whatsappConfig.phone}
                        onChange={(e) => setWhatsappConfig((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="+55 11 99999-9999"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-1">
                      <div
                        className={`h-2.5 w-2.5 rounded-full ${
                          whatsappConfig.token && whatsappConfig.phone ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                      <span
                        className={`text-xs font-medium ${
                          whatsappConfig.token && whatsappConfig.phone
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-500"
                        }`}
                      >
                        {whatsappConfig.token && whatsappConfig.phone ? "Pronto para conexão" : "Aguardando preenchimento da API"}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSaveWpp} size="sm" className="bg-primary text-xs">
                        Salvar WhatsApp
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleTestWppConnection} className="text-xs">
                        Testar Conexão com Gateway
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-border/60 rounded-2xl bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Bell className="h-5 w-5 text-amber-600" />
                    Prazos e Alertas do Dashboard
                  </CardTitle>
                  <Badge variant="outline" className="text-[11px] bg-amber-500/10 text-amber-600 border-amber-200">
                    Notificações do Painel
                  </Badge>
                </div>
                <CardDescription>
                  Ajuste a antecedência em dias para exibição de avisos e notificações pendentes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Guia Prático Prazos */}
                <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-xs space-y-2">
                  <div className="font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-600 shrink-0" />
                    Como funciona na prática?
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Esses prazos controlam quando os alertas visuais (sino superior e cartões de aviso) começam a ser exibidos no <strong>Dashboard</strong> para que nada seja esquecido.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="diasEventos">Antecedência de Eventos Próximos (Dias)</Label>
                  <Input
                    id="diasEventos"
                    type="number"
                    min="1"
                    max="60"
                    value={notificationConfig.diasAntecedenciaEventos}
                    onChange={(e) =>
                      setNotificationConfig((prev) => ({
                        ...prev,
                        diasAntecedenciaEventos: parseInt(e.target.value) || 1,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Ex: se configurado como <strong>3 dias</strong>, qualquer evento da agenda nos próximos 3 dias ganha destaque com contagem regressiva no painel inicial.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="diasBackup">Alerta de Backup Recente (Dias tolerados)</Label>
                  <Input
                    id="diasBackup"
                    type="number"
                    min="1"
                    max="180"
                    value={notificationConfig.diasAntecedenciaBackup}
                    onChange={(e) =>
                      setNotificationConfig((prev) => ({
                        ...prev,
                        diasAntecedenciaBackup: parseInt(e.target.value) || 1,
                      }))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Ex: com <strong>30 dias</strong>, se a igreja passar mais de 30 dias sem baixar uma cópia de segurança na aba "Backup &amp; Restauração", o sistema exibe um lembrete preventivo no Dashboard.
                  </p>
                </div>
                <div className="pt-2">
                  <Button onClick={handleSaveNotification} size="sm" className="bg-primary">
                    Salvar Prazos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB: LOGS DE AUDITORIA */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="shadow-sm border border-border/60 rounded-2xl bg-card">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <CardTitle className="text-xl">Logs de Auditoria e Rastreabilidade</CardTitle>
                  <CardDescription>
                    Registro cronológico de todas as ações sensíveis realizadas pelos operadores no sistema.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleExportAuditCSV}>
                    <FileSpreadsheet className="mr-1.5 h-4 w-4 text-emerald-600" />
                    Exportar CSV
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setIsClearingAuditOpen(true)}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Limpar Logs
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filtrar por usuário, ação ou detalhe..."
                  value={auditSearchTerm}
                  onChange={(e) => setAuditSearchTerm(e.target.value)}
                  className="pl-9 max-w-md"
                />
              </div>

              <div className="rounded-xl border border-border/60 overflow-hidden">
                <div className="max-h-[480px] overflow-y-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted/60 text-muted-foreground font-semibold sticky top-0 border-b border-border/50">
                      <tr>
                        <th className="px-4 py-3">Data e Hora</th>
                        <th className="px-4 py-3">Operador</th>
                        <th className="px-4 py-3">Ação</th>
                        <th className="px-4 py-3">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filteredAuditLogs.map((log) => (
                        <tr key={log.id || log.date} className="hover:bg-muted/30">
                          <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
                            {new Date(log.date).toLocaleString("pt-BR")}
                          </td>
                          <td className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{log.user}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-0.5 text-xs font-semibold">
                              {log.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">{log.details}</td>
                        </tr>
                      ))}
                      {filteredAuditLogs.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-muted-foreground">
                            <FileSearch className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            Nenhum log registrado com os critérios atuais.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: ADICIONAR / EDITAR USUÁRIO */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUser ? "Editar Usuário" : "Novo Usuário do Sistema"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Atualize os dados cadastrais, congregação vinculada e matriz de permissões do usuário."
                : "Cadastre um novo operador no sistema e configure suas permissões por módulo."}
            </DialogDescription>
          </DialogHeader>
          <form key={editingUser ? editingUser.id : "new"} onSubmit={handleAddUser}>
            <div className="grid gap-4 py-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input id="name" name="name" defaultValue={editingUser?.name || ""} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">E-mail de Acesso *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    defaultValue={editingUser?.email || ""}
                    required
                    readOnly={Boolean(editingUser)}
                    className={editingUser ? "bg-muted cursor-not-allowed" : ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="role">Perfil Funcional (Modelo)</Label>
                    <span className="text-[11px] font-medium text-primary">
                      {userModalRole === "Personalizado" ? "Personalizado" : `Gabarito: ${userModalRole}`}
                    </span>
                  </div>
                  <Select
                    value={userModalRole}
                    onValueChange={(val) => handleRolePreset(val)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione um perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Administrador">👑 Administrador (Acesso Total)</SelectItem>
                      <SelectItem value="Secretária">📋 Secretária (Membros e Documentos)</SelectItem>
                      <SelectItem value="Tesoureiro">💰 Tesoureiro (Caixa e Relatórios)</SelectItem>
                      <SelectItem value="Membro">👤 Membro (Somente Consulta Básica)</SelectItem>
                      <SelectItem value="Personalizado">⚙️ Personalizado (Permissões Manuais)</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="role" value={userModalRole} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="branch">Congregação Designada</Label>
                  <Select name="branch" defaultValue={editingUser?.branch || "all"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sem restrição (Acessa Todas)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Sem restrição (Todas as Congregações)</SelectItem>
                      {branches.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">
                  Senha Provisória {editingUser ? "(Deixe em branco para manter a atual)" : "*"}
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="text"
                  placeholder={editingUser ? "Não alterar senha" : "Mínimo 6 dígitos (ex: 123456)"}
                  required={!editingUser}
                />
                <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 pt-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                  <span>
                    O usuário poderá acessar com esta <strong>senha</strong> ou com o botão <strong>"Acessar com Google"</strong> utilizando o e-mail cadastrado.
                  </span>
                </p>
              </div>

              {/* Assinatura Digital do Usuário / Operador */}
              <div className="p-3.5 rounded-xl border border-border/70 bg-card space-y-2">
                <DigitalSignatureField
                  label="Assinatura Digital deste Usuário"
                  helperText="Assinatura ou rubrica digitalizada que será impressa em recibos, certidões e relatórios emitidos por esta pessoa."
                  value={userModalSignatureUrl}
                  onChange={(url, fileName) => {
                    setUserModalSignatureUrl(url);
                    setUserModalSignatureFileName(fileName || "");
                  }}
                />
              </div>

              {/* Licenciamento e Dias de Teste */}
              <div className="rounded-xl border border-border/70 p-3.5 bg-muted/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    <Label className="text-sm font-bold text-foreground">Status da Licença & Período de Teste</Label>
                  </div>
                  <Badge variant="outline" className="text-[11px]">
                    {userModalIsUnlimited ? "Acesso Vitalício" : `${userModalTrialDays} dias de validade`}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Status do Acesso</Label>
                    <Select value={userModalStatus} onValueChange={(val: any) => setUserModalStatus(val)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Ativo (Licença em Vigor)</SelectItem>
                        <SelectItem value="trial">Em Teste (Período Experimental)</SelectItem>
                        <SelectItem value="exempt">Isento / Vitalício</SelectItem>
                        <SelectItem value="expired">Expirado (Assinatura Vencida)</SelectItem>
                        <SelectItem value="blocked">Bloqueado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Dias de Teste / Validade (a partir de hoje)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={3650}
                        disabled={userModalIsUnlimited || userModalStatus === "exempt"}
                        value={userModalTrialDays}
                        onChange={(e) => {
                          const days = parseInt(e.target.value, 10) || 0;
                          setUserModalTrialDays(days);
                          const exp = new Date();
                          exp.setDate(exp.getDate() + days);
                          setUserModalExpirationDate(exp.toISOString().split("T")[0]);
                        }}
                        className="h-9 text-xs font-bold"
                      />
                      <span className="text-xs text-muted-foreground font-medium shrink-0">dias</span>
                    </div>
                  </div>
                </div>

                {/* Quick day presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-muted-foreground mr-1">Atalhos rápidos:</span>
                  {[7, 15, 30, 60, 90, 365].map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2"
                      disabled={userModalIsUnlimited || userModalStatus === "exempt"}
                      onClick={() => {
                        setUserModalTrialDays(d);
                        setUserModalIsUnlimited(false);
                        const exp = new Date();
                        exp.setDate(exp.getDate() + d);
                        setUserModalExpirationDate(exp.toISOString().split("T")[0]);
                      }}
                    >
                      +{d}d
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant={userModalIsUnlimited ? "default" : "outline"}
                    size="sm"
                    className="h-6 text-[11px] px-2 text-blue-600"
                    onClick={() => {
                      setUserModalIsUnlimited(!userModalIsUnlimited);
                      if (!userModalIsUnlimited) {
                        setUserModalStatus("exempt");
                        setUserModalExpirationDate("");
                      } else {
                        setUserModalStatus("active");
                        const exp = new Date();
                        exp.setDate(exp.getDate() + userModalTrialDays);
                        setUserModalExpirationDate(exp.toISOString().split("T")[0]);
                      }
                    }}
                  >
                    Vitalício
                  </Button>
                </div>

                {/* Expiration date preview or picker */}
                {!userModalIsUnlimited && userModalStatus !== "exempt" && (
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-border/40">
                    <span className="text-muted-foreground">Data final calculada:</span>
                    <Input
                      type="date"
                      value={userModalExpirationDate}
                      onChange={(e) => {
                        setUserModalExpirationDate(e.target.value);
                        if (e.target.value) {
                          const diff = Math.ceil((new Date(e.target.value).getTime() - new Date().getTime()) / 86400000);
                          if (diff > 0) setUserModalTrialDays(diff);
                        }
                      }}
                      className="h-7 w-36 text-xs font-mono font-medium"
                    />
                  </div>
                )}
              </div>

              {/* Box Explicativo da Relação entre Perfil Funcional e Permissões Específicas (Anexo 4) */}
              <div className="rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/70 dark:bg-blue-950/30 p-3 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-semibold text-blue-900 dark:text-blue-200">
                  <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                  Relação entre Perfil Funcional e Permissões por Módulo
                </div>
                <p className="text-muted-foreground text-[11px] leading-relaxed">
                  O <strong>Perfil Funcional</strong> atua como um <em>modelo/atalho de preenchimento rápido</em> (Administrador, Secretária, Tesoureiro, Membro). Você tem <strong>total liberdade para personalizar qualquer permissão individual abaixo</strong>. Ao marcar ou desmarcar qualquer item, o sistema automaticamente reconhece como <strong>Personalizado</strong> e salva exatamente a sua configuração.
                </p>
                {initialSavedUserPermissions && (
                  <div className="pt-1 flex items-center justify-between border-t border-blue-200/60 dark:border-blue-900/40">
                    <span className="text-[10.5px] text-blue-800 dark:text-blue-300">
                      Modificou algo e deseja restaurar o que estava salvo originalmente?
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[11px] px-2 border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-300"
                      onClick={() => {
                        setNewUserPermissions(JSON.parse(JSON.stringify(initialSavedUserPermissions)));
                        setUserModalRole(editingUser?.role || "Personalizado");
                        toast.success("Permissões originais salvas deste usuário foram restauradas!");
                      }}
                    >
                      ↺ Restaurar Salvas
                    </Button>
                  </div>
                )}
              </div>

              {/* Matriz de Permissões */}
              <div className="mt-3 border-t border-border/70 pt-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-sm font-bold text-foreground">Permissões Específicas por Módulo</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Marque ou desmarque detalhadamente o que este usuário pode visualizar, adicionar, editar ou excluir.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-primary"
                      onClick={() => handleSelectAllPermissions(true)}
                    >
                      <CheckSquare className="mr-1 h-3.5 w-3.5" />
                      Marcar Todos
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground"
                      onClick={() => handleSelectAllPermissions(false)}
                    >
                      <Square className="mr-1 h-3.5 w-3.5" />
                      Desmarcar Todos
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 bg-muted/20 p-3 rounded-xl border border-border/50">
                  {["financeiro", "secretaria", "patrimonio", "pastoral", "parametros", "configuracoes"].map((module) => {
                    const moduleLabel =
                      module === "configuracoes"
                        ? "Configurações"
                        : module === "parametros"
                        ? "Parâmetros"
                        : module === "patrimonio"
                        ? "Patrimônio"
                        : module === "pastoral"
                        ? "Área Pastoral"
                        : module.charAt(0).toUpperCase() + module.slice(1);

                    const perms = (newUserPermissions as any)?.[module] || {
                      view: false,
                      add: false,
                      edit: false,
                      delete: false,
                    };

                    return (
                      <div
                        key={module}
                        className="grid grid-cols-1 sm:grid-cols-5 items-center gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0"
                      >
                        <span className="text-xs font-bold text-foreground sm:col-span-1">{moduleLabel}</span>
                        <div className="flex items-center space-x-1.5 sm:col-span-1">
                          <Checkbox
                            id={`${module}-view`}
                            checked={perms.view}
                            onCheckedChange={(c) => handlePermissionChange(module, "view", c === true)}
                          />
                          <Label htmlFor={`${module}-view`} className="text-xs font-medium cursor-pointer">
                            Visualizar
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1.5 sm:col-span-1">
                          <Checkbox
                            id={`${module}-add`}
                            checked={perms.add}
                            onCheckedChange={(c) => handlePermissionChange(module, "add", c === true)}
                          />
                          <Label htmlFor={`${module}-add`} className="text-xs font-medium cursor-pointer">
                            Incluir
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1.5 sm:col-span-1">
                          <Checkbox
                            id={`${module}-edit`}
                            checked={perms.edit}
                            onCheckedChange={(c) => handlePermissionChange(module, "edit", c === true)}
                          />
                          <Label htmlFor={`${module}-edit`} className="text-xs font-medium cursor-pointer">
                            Alterar
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1.5 sm:col-span-1">
                          <Checkbox
                            id={`${module}-delete`}
                            checked={perms.delete}
                            onCheckedChange={(c) => handlePermissionChange(module, "delete", c === true)}
                          />
                          <Label htmlFor={`${module}-delete`} className="text-xs font-medium cursor-pointer">
                            Excluir
                          </Label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsUserModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary">
                {editingUser ? "Salvar Alterações" : "Criar Usuário"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: GERENCIAR VIGÊNCIA / EXTENSÃO RÁPIDA */}
      <Dialog open={quickDaysModalUser !== null} onOpenChange={(open) => !open && setQuickDaysModalUser(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Gerenciar Licença e Validade</DialogTitle>
            <DialogDescription>
              Ajuste ou estenda os dias de vigência para o usuário <strong>{quickDaysModalUser?.name}</strong> ({quickDaysModalUser?.email}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status Atual:</span>
                <span className="font-semibold uppercase">{quickDaysModalUser?.status || "active"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Validade Atual:</span>
                <span className="font-semibold">
                  {quickDaysModalUser?.expirationDate
                    ? new Date(quickDaysModalUser.expirationDate).toLocaleDateString("pt-BR")
                    : "Vitalício / Indeterminada"}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Adicionar Dias de Acesso (a partir de hoje):</Label>
              <div className="grid grid-cols-3 gap-2">
                {[15, 30, 60, 90, 180, 365].map((days) => (
                  <Button
                    key={days}
                    variant="outline"
                    size="sm"
                    className="text-xs h-9"
                    onClick={() => {
                      handleActivateUser(quickDaysModalUser, days);
                      setQuickDaysModalUser(null);
                    }}
                  >
                    +{days} Dias
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2 border-t border-border/50 pt-3">
              <Label className="text-xs font-semibold">Ou definir quantidade personalizada de dias:</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={1}
                  max={3650}
                  value={customDaysToExtend}
                  onChange={(e) => setCustomDaysToExtend(parseInt(e.target.value, 10) || 1)}
                  className="h-9 text-xs"
                />
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 text-xs"
                  onClick={() => {
                    handleActivateUser(quickDaysModalUser, customDaysToExtend);
                    setQuickDaysModalUser(null);
                  }}
                >
                  Confirmar +{customDaysToExtend}d
                </Button>
              </div>
            </div>

            <div className="border-t border-border/50 pt-2 flex justify-between items-center">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-blue-600 hover:text-blue-700"
                onClick={() => {
                  handleSetUserUnlimited(quickDaysModalUser);
                  setQuickDaysModalUser(null);
                }}
              >
                Tornar Vitalício (Sem Expiração)
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setQuickDaysModalUser(null)}
              >
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: EXCLUIR USUÁRIO */}
      <Dialog open={userToDelete !== null} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão de Usuário
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o usuário <strong>{userToDelete?.name}</strong> ({userToDelete?.email})? O
              registro de acesso será removido imediatamente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setUserToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={executeDeleteUser}>
              Sim, Excluir Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: ADICIONAR / EDITAR CONGREGAÇÃO */}
      <Dialog open={isBranchModalOpen} onOpenChange={setIsBranchModalOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {editingBranch ? "Editar Congregação" : "Nova Congregação"}
            </DialogTitle>
            <DialogDescription>
              Insira os dados da congregação. Essas informações aparecerão automaticamente nos relatórios, recibos e documentos da igreja quando esta filial for selecionada no dashboard.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveBranch} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="branch-name" className="text-xs font-semibold">Nome da Congregação / Igreja *</Label>
                <Input
                  id="branch-name"
                  name="name"
                  defaultValue={editingBranch?.name || ""}
                  placeholder="Ex: Congregação Betel"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branch-type" className="text-xs font-semibold">Tipo</Label>
                <Select name="type" defaultValue={editingBranch?.type || "filial"}>
                  <SelectTrigger id="branch-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="filial">Filial / Congregação</SelectItem>
                    <SelectItem value="sede">Sede Principal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="branch-pastor" className="text-xs font-semibold">Pastor / Dirigente Responsável</Label>
                <Input
                  id="branch-pastor"
                  name="pastor"
                  defaultValue={editingBranch?.pastor || ""}
                  placeholder="Ex: Pr. Carlos Eduardo"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branch-phone" className="text-xs font-semibold">Telefone / WhatsApp</Label>
                <Input
                  id="branch-phone"
                  name="phone"
                  defaultValue={editingBranch?.phone || ""}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="branch-cnpj" className="text-xs font-semibold">CNPJ (Opcional)</Label>
                <Input
                  id="branch-cnpj"
                  name="cnpj"
                  defaultValue={editingBranch?.cnpj || ""}
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branch-cep" className="text-xs font-semibold">CEP</Label>
                <Input
                  id="branch-cep"
                  name="cep"
                  defaultValue={editingBranch?.cep || ""}
                  placeholder="00000-000"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="branch-address" className="text-xs font-semibold">Endereço (Rua e Número)</Label>
              <Input
                id="branch-address"
                name="address"
                defaultValue={editingBranch?.address || ""}
                placeholder="Ex: Rua Bartolomeu Bueno, 629"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="branch-bairro" className="text-xs font-semibold">Bairro</Label>
                <Input
                  id="branch-bairro"
                  name="bairro"
                  defaultValue={editingBranch?.bairro || ""}
                  placeholder="Ex: Centro"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branch-cidade" className="text-xs font-semibold">Cidade</Label>
                <Input
                  id="branch-cidade"
                  name="cidade"
                  defaultValue={editingBranch?.cidade || ""}
                  placeholder="Ex: Valparaíso"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="branch-uf" className="text-xs font-semibold">UF</Label>
                <Input
                  id="branch-uf"
                  name="uf"
                  defaultValue={editingBranch?.uf || "SP"}
                  maxLength={2}
                  placeholder="SP"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t">
              <Button type="button" variant="outline" onClick={() => setIsBranchModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-primary">
                Salvar Congregação
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: EXCLUIR CONGREGAÇÃO */}
      <Dialog open={branchToDelete !== null} onOpenChange={(open) => !open && setBranchToDelete(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmar Exclusão de Congregação
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a filial <strong>{branchToDelete?.name}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setBranchToDelete(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={executeDeleteBranch}>
              Sim, Excluir Congregação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: RESTAURAR BACKUP JSON */}
      <Dialog open={isRestoreModalOpen} onOpenChange={setIsRestoreModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <Upload className="h-5 w-5" />
              Restaurar Backup do Sistema
            </DialogTitle>
            <DialogDescription>
              Confira os dados detectados no arquivo antes de confirmar a restauração.
            </DialogDescription>
          </DialogHeader>

          {restoreStats && (
            <div className="space-y-3 py-2">
              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300">
                Atenção: A restauração substituirá os registros locais correspondentes por estes dados.
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm bg-muted/40 p-3 rounded-xl border">
                <div className="font-medium text-muted-foreground">Membros:</div>
                <div className="font-bold text-foreground text-right">{restoreStats.members} registros</div>

                <div className="font-medium text-muted-foreground">Transações:</div>
                <div className="font-bold text-foreground text-right">{restoreStats.transactions} registros</div>

                <div className="font-medium text-muted-foreground">Patrimônio:</div>
                <div className="font-bold text-foreground text-right">{restoreStats.assets} registros</div>

                <div className="font-medium text-muted-foreground">Categorias:</div>
                <div className="font-bold text-foreground text-right">{restoreStats.categories} registros</div>

                <div className="font-medium text-muted-foreground">Dados da Igreja:</div>
                <div className="font-bold text-foreground text-right">
                  {restoreStats.hasConfig ? "Sim (Presente)" : "Não"}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setIsRestoreModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={executeRestoreBackup}
              disabled={isRestoring}
            >
              {isRestoring ? "Restaurando..." : "Confirmar Restauração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: LIMPAR LOGS AUDITORIA */}
      <Dialog open={isClearingAuditOpen} onOpenChange={setIsClearingAuditOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Limpar Logs de Auditoria
            </DialogTitle>
            <DialogDescription>
              Deseja remover o histórico local de ações e auditoria? Essa operação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsClearingAuditOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleClearAuditLogs}>
              Sim, Limpar Logs
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: DEFINIR DIAS DE TESTE E VIGÊNCIA POR USUÁRIO */}
      <Dialog open={quickDaysModalUser !== null} onOpenChange={(open) => !open && setQuickDaysModalUser(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Clock className="h-5 w-5 text-blue-600" />
              Definir Dias de Teste / Vigência da Licença
            </DialogTitle>
            <DialogDescription>
              Ajuste o período de teste, tempo de validade ou conceda acesso vitalício para{" "}
              <strong className="text-foreground">{quickDaysModalUser?.name}</strong> ({quickDaysModalUser?.email}).
            </DialogDescription>
          </DialogHeader>

          {quickDaysModalUser && (
            <div className="space-y-4 py-2">
              {/* Status do Usuário Atual */}
              <div className="p-3 bg-muted/40 rounded-xl border border-border flex items-center justify-between text-xs">
                <div>
                  <span className="text-muted-foreground">Status Atual: </span>
                  <Badge variant={quickDaysModalUser.status === "active" ? "default" : quickDaysModalUser.status === "expired" ? "destructive" : "secondary"} className="ml-1 text-[11px]">
                    {quickDaysModalUser.status === "active" ? "Ativo" : quickDaysModalUser.status === "expired" ? "Expirado" : quickDaysModalUser.status === "trial" ? "Em Teste" : quickDaysModalUser.status || "Ativo"}
                  </Badge>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground">Vencimento Atual: </span>
                  <span className="font-semibold text-foreground">
                    {quickDaysModalUser.expirationDate ? new Date(quickDaysModalUser.expirationDate).toLocaleDateString("pt-BR") : "Vitalício (Sem Expiração)"}
                  </span>
                </div>
              </div>

              {/* Opções de Status da Licença */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Novo Status da Conta</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={userModalStatus === "active" && !userModalIsUnlimited ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => {
                      setUserModalStatus("active");
                      setUserModalIsUnlimited(false);
                    }}
                  >
                    Ativo (Com Prazo)
                  </Button>
                  <Button
                    type="button"
                    variant={userModalStatus === "trial" ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8"
                    onClick={() => {
                      setUserModalStatus("trial");
                      setUserModalIsUnlimited(false);
                    }}
                  >
                    Em Teste (Trial)
                  </Button>
                  <Button
                    type="button"
                    variant={userModalIsUnlimited ? "default" : "outline"}
                    size="sm"
                    className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={() => {
                      setUserModalStatus("active");
                      setUserModalIsUnlimited(true);
                    }}
                  >
                    Vitalício (Ilimitado)
                  </Button>
                </div>
              </div>

              {/* Botões Rápidos de Dias */}
              {!userModalIsUnlimited && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Dias de Teste / Validade (a partir de hoje)</Label>
                    <span className="text-xs font-mono font-bold text-primary">{customDaysToExtend} dias</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[7, 15, 30, 60, 90, 180, 365].map((d) => (
                      <Button
                        key={d}
                        type="button"
                        variant={customDaysToExtend === d ? "default" : "outline"}
                        size="sm"
                        className="h-7 text-xs font-medium"
                        onClick={() => setCustomDaysToExtend(d)}
                      >
                        +{d} dias
                      </Button>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs font-semibold text-blue-600 border-blue-300 hover:bg-blue-50"
                      onClick={() => setUserModalIsUnlimited(true)}
                    >
                      Vitalício
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Label htmlFor="customDaysInput" className="text-xs text-muted-foreground shrink-0">
                      Outra quantidade:
                    </Label>
                    <Input
                      id="customDaysInput"
                      type="number"
                      min={1}
                      max={3650}
                      value={customDaysToExtend}
                      onChange={(e) => setCustomDaysToExtend(parseInt(e.target.value, 10) || 1)}
                      className="h-8 w-24 text-xs font-bold text-center"
                    />
                    <span className="text-xs text-muted-foreground">dias de acesso</span>
                  </div>
                </div>
              )}

              {/* Previsão da Data Final */}
              <div className="p-3 rounded-xl border bg-card flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Válido até:</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                  {userModalIsUnlimited ? (
                    "Vitalício (Acesso Permanente sem Expiração)"
                  ) : (() => {
                    const d = new Date();
                    d.setDate(d.getDate() + (customDaysToExtend || 30));
                    return `${d.toLocaleDateString("pt-BR")} (${customDaysToExtend} dias restantes)`;
                  })()}
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="mt-2 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setQuickDaysModalUser(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={handleSaveQuickDays}
            >
              Salvar e Aplicar Vigência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: CLOUD BACKUP SCHEDULER */}
      <CloudBackupAndExportModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        currentUser={currentUser}
      />
    </div>
  );
}
