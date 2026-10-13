import React, { useState, useMemo, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Mail,
  MessageCircle,
  Copy,
  ExternalLink,
  Users,
  Send,
  Sparkles,
  Check,
  Calendar,
  AlertCircle,
  History,
  Info,
  CheckCircle2,
  Share2,
  Megaphone,
  Radio,
  FileText
} from "lucide-react"
import { toast } from "sonner"
import { logAction } from "@/lib/audit"
import emailjs from "@emailjs/browser"

export interface ComunicadoHistoryItem {
  id: string
  date: string
  title: string
  content: string
  targetAudience: string
  channels: {
    email: boolean
    whatsapp: boolean
    mural: boolean
  }
  recipientCount: number
}

interface ComunicadosModalProps {
  isOpen: boolean
  onClose: () => void
  members: any[]
  churchName?: string
  currentMuralNotice?: string
  onUpdateMuralNotice?: (newNotice: string) => void
}

export function ComunicadosModal({
  isOpen,
  onClose,
  members = [],
  churchName = "Igreja O Brasil para Cristo - 2ª Congregação",
  currentMuralNotice,
  onUpdateMuralNotice,
}: ComunicadosModalProps) {
  const [activeTab, setActiveTab] = useState<"novo" | "historico" | "como-funciona">("novo")
  const [targetAudience, setTargetAudience] = useState<string>("todos")
  const [selectedDepartment, setSelectedDepartment] = useState<string>("todos")
  const [selectedRole, setSelectedRole] = useState<string>("todos")
  const [noticeSubject, setNoticeSubject] = useState("Culto Especial e Santa Ceia do Senhor")
  const [noticeEventDate, setNoticeEventDate] = useState("")
  const [noticeBody, setNoticeBody] = useState("")
  const [publishOnMural, setPublishOnMural] = useState(true)
  const [copiedEmails, setCopiedEmails] = useState(false)
  const [copiedWhatsApp, setCopiedWhatsApp] = useState(false)
  const [isSendingEmailJs, setIsSendingEmailJs] = useState(false)

  // Load history from localStorage
  const [history, setHistory] = useState<ComunicadoHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem("church_comunicados_history")
      if (saved) return JSON.parse(saved)
    } catch {}
    return [
      {
        id: "com-1",
        date: new Date().toLocaleDateString("pt-BR") + " 10:00",
        title: "Culto de Santa Ceia e Adoração",
        content: `A Paz do Senhor, amada igreja! Convidamos todos os irmãos para o nosso Santo Culto de Santa Ceia neste domingo. Venha em comunhão com a família adorar a Deus!`,
        targetAudience: "Todos os Membros Ativos",
        channels: { email: true, whatsapp: true, mural: true },
        recipientCount: 24,
      },
    ]
  })

  // Pre-made church templates
  const presets = [
    {
      id: "ceia",
      label: "🍷 Culto de Santa Ceia",
      subject: "Celebração da Santa Ceia do Senhor",
      body: `A Paz do Senhor, amados irmãos da ${churchName}! 🍷🍞\n\nNeste próximo domingo, celebraremos a Santa Ceia do Senhor Jesus Cristo, um momento solene de comunhão, memória do sacrifício na cruz e renovação da nossa aliança com Deus.\n\n"Fazei isto em memória de mim." (1 Coríntios 11:24)\n\nConvidamos você e toda a sua família para estarem conosco. Venha com o coração aberto para adorar e receber a bênção do Senhor!`,
    },
    {
      id: "vigilia",
      label: "🔥 Vigília & Oração",
      subject: "Vigília de Oração e Clamor da Igreja",
      body: `A Paz do Senhor, família da fé! 🔥🙌\n\nConvidamos toda a igreja para a nossa abençoada Vigília de Oração. Será uma noite de busca intensa pela presença do Espírito Santo, intercessão pelas famílias, cura e libertação.\n\nTraga seus pedidos de oração e venha buscar a face de Deus conosco!\n\n"Clama a mim, e responder-te-ei, e anunciar-te-ei coisas grandes e firmes que não sabes." (Jeremias 33:3)`,
    },
    {
      id: "reuniao",
      label: "📋 Reunião / Assembleia",
      subject: "Convocação para Reunião Administrativa da Igreja",
      body: `A Paz do Senhor, prezados membros e liderança da ${churchName}! 📋⛪\n\nA diretoria e a secretaria da igreja convocam todos os membros e obreiros para a nossa Reunião Geral de Prestação de Contas, Planejamento e Avisos Importantes.\n\nA sua presença e participação é muito importante para a boa condução da obra do Senhor!\n\nContamos com todos. Que Deus abençoe!`,
    },
    {
      id: "social",
      label: "🤝 Ação Social & Mutirão",
      subject: "Mutirão Comunitário e Ação Solidária da Igreja",
      body: `A Paz do Senhor, queridos irmãos! 🤝❤️\n\nNossa igreja realizará uma ação especial de arrecadação de alimentos e roupas para famílias em situação de vulnerabilidade e manutenção da nossa casa de oração.\n\nVocê pode contribuir com alimentos não perecíveis ou participando voluntariamente no dia. Toda ajuda é bem-vinda!\n\n"Servi uns aos outros pelo amor." (Gálatas 5:13)`,
    },
    {
      id: "livre",
      label: "✍️ Comunicado em Branco",
      subject: "Comunicado Oficial da Secretaria",
      body: `A Paz do Senhor, amados irmãos da ${churchName}!\n\n[Escreva aqui o comunicado da igreja com as orientações necessárias...]\n\nAtenciosamente,\nSecretaria e Pastorado da Igreja`,
    },
  ]

  // Filter members according to selected audience
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      // Must be active unless user selected all
      if (m.status && m.status !== "Ativo") return false

      if (targetAudience === "lideranca") {
        const role = (m.role || "").toLowerCase()
        return (
          role.includes("pastor") ||
          role.includes("líder") ||
          role.includes("lider") ||
          role.includes("diácono") ||
          role.includes("diacono") ||
          role.includes("presbítero") ||
          role.includes("presbitero") ||
          role.includes("cooperador") ||
          role.includes("secretário") ||
          role.includes("tesoureiro")
        )
      }

      if (targetAudience === "aniversariantes") {
        if (!m.dataNascimento) return false
        const parts = m.dataNascimento.split("/")
        if (parts.length === 3) {
          return parseInt(parts[1], 10) === new Date().getMonth() + 1
        }
        return false
      }

      return true
    })
  }, [members, targetAudience])

  // Extract valid email addresses
  const validEmails = useMemo(() => {
    return filteredMembers
      .map((m) => (m.email || "").trim())
      .filter((e) => e && e.includes("@") && e.includes("."))
  }, [filteredMembers])

  // Extract valid phone numbers
  const validPhones = useMemo(() => {
    return filteredMembers
      .map((m) => {
        const clean = (m.phone || "").replace(/\D/g, "")
        return clean.length >= 10 ? (clean.startsWith("55") ? clean : `55${clean}`) : null
      })
      .filter(Boolean) as string[]
  }, [filteredMembers])

  // Set default body on mount if empty
  useEffect(() => {
    if (!noticeBody && isOpen) {
      setNoticeBody(presets[0].body)
      setNoticeSubject(presets[0].subject)
    }
  }, [isOpen])

  const handleApplyPreset = (preset: typeof presets[0]) => {
    setNoticeSubject(preset.subject)
    setNoticeBody(preset.body)
  }

  // Generate full text formatted for WhatsApp
  const fullWhatsAppMessage = useMemo(() => {
    const header = `📢 *COMUNICADO OFICIAL*\n⛪ *${churchName.toUpperCase()}*\n━━━━━━━━━━━━━━━━━━━━\n`
    const dateLine = noticeEventDate ? `📅 *Data/Horário:* ${noticeEventDate}\n\n` : ""
    const subjectLine = `📌 *Assunto:* ${noticeSubject}\n\n`
    const footer = `\n━━━━━━━━━━━━━━━━━━━━\n_Secretaria Eclesiástica & Liderança Pastoral_`
    return `${header}${subjectLine}${dateLine}${noticeBody}${footer}`
  }, [churchName, noticeSubject, noticeEventDate, noticeBody])

  // Handle Copy Emails
  const handleCopyEmails = () => {
    if (validEmails.length === 0) {
      toast.error("Nenhum membro ativo possui e-mail cadastrado neste grupo.")
      return
    }
    navigator.clipboard.writeText(validEmails.join(", "))
    setCopiedEmails(true)
    toast.success(`${validEmails.length} e-mails copiados para a área de transferência!`, {
      description: "Pronto para colar no campo CCO (Bcc) do seu Gmail ou Outlook.",
    })
    setTimeout(() => setCopiedEmails(false), 2500)
    logAction("Copiar Lista E-mails Comunicado", `${validEmails.length} e-mails`, "Secretaria")
  }

  // Handle Copy WhatsApp formatted text
  const handleCopyWhatsAppText = () => {
    navigator.clipboard.writeText(fullWhatsAppMessage)
    setCopiedWhatsApp(true)
    toast.success("Mensagem formatada copiada com sucesso!", {
      description: "Pronta para colar em listas de transmissão ou grupos do WhatsApp da igreja.",
    })
    setTimeout(() => setCopiedWhatsApp(false), 2500)
    logAction("Copiar Comunicado WhatsApp", noticeSubject, "Secretaria")
  }

  // Open Direct Email client with CCO (BCC)
  const handleOpenEmailClient = () => {
    if (validEmails.length === 0) {
      toast.error("Nenhum membro ativo possui e-mail cadastrado neste público.")
      return
    }

    const subject = encodeURIComponent(`${noticeSubject} - ${churchName}`)
    const body = encodeURIComponent(
      `${noticeBody}\n\n${noticeEventDate ? `Data informada: ${noticeEventDate}\n\n` : ""}Atenciosamente,\nSecretaria da ${churchName}`
    )
    
    // We put all emails in bcc to protect personal data (LGPD compliant)
    const bccList = validEmails.join(",")
    const mailtoUrl = `mailto:?bcc=${encodeURIComponent(bccList)}&subject=${subject}&body=${body}`

    // If string length is small enough, mailto works directly
    if (mailtoUrl.length < 2000) {
      window.location.href = mailtoUrl
    } else {
      // If there are too many emails for a single mailto URI, open Gmail Web compose directly
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&bcc=${encodeURIComponent(bccList)}&su=${subject}&body=${body}`
      window.open(gmailUrl, "_blank")
    }

    toast.success(`Abrindo cliente de e-mail com ${validEmails.length} destinatários em CCO!`, {
      description: "Todos os e-mails foram adicionados em cópia oculta para segurança e privacidade.",
    })

    saveToHistory({ email: true, whatsapp: false, mural: publishOnMural })
  }

  // Handle send via EmailJS if configured
  const handleSendViaEmailJs = async () => {
    let emailConfig: any = null
    try {
      const saved = localStorage.getItem("emailJsConfig")
      if (saved) emailConfig = JSON.parse(saved)
    } catch {}

    if (!emailConfig?.serviceId || !emailConfig?.templateId || !emailConfig?.publicKey) {
      toast.info("EmailJS não configurado. Usando modo Mala Direta via Gmail / Outlook!", {
        description: "Abrindo seu cliente de e-mail padrão com a mensagem pronta.",
      })
      handleOpenEmailClient()
      return
    }

    setIsSendingEmailJs(true)
    try {
      // Dispatches the announcement notice
      await emailjs.send(
        emailConfig.serviceId,
        emailConfig.templateId,
        {
          to_email: validEmails[0] || "membros@igreja.com",
          to_name: "Irmãos e Membros da Igreja",
          from_name: churchName,
          subject: noticeSubject,
          message: noticeBody,
          data_aviso: noticeEventDate || new Date().toLocaleDateString("pt-BR"),
          bcc_list: validEmails.join(", "),
        },
        emailConfig.publicKey
      )

      toast.success("Comunicado enviado com sucesso via EmailJS!", {
        description: `Disparo registrado para a lista de membros.`,
      })

      saveToHistory({ email: true, whatsapp: false, mural: publishOnMural })
    } catch (err: any) {
      console.warn("Aviso ao disparar via EmailJS:", err)
      toast.warning("Houve uma oscilação no EmailJS. Alternando para envio seguro via Gmail...", {
        description: err?.text || err?.message,
      })
      handleOpenEmailClient()
    } finally {
      setIsSendingEmailJs(false)
    }
  }

  // Handle open WhatsApp to send broadcast
  const handleOpenWhatsAppBroadcast = () => {
    // We open WhatsApp Web or Desktop with the prefilled message
    const encoded = encodeURIComponent(fullWhatsAppMessage)
    
    // Check if user prefers Desktop App or Web
    const pref = localStorage.getItem("whatsappPreferredMode") || "app"
    if (pref === "app") {
      window.location.href = `whatsapp://send?text=${encoded}`
      toast.success("Abrindo aplicativo do WhatsApp com o comunicado pronto!", {
        description: "Selecione a Lista de Transmissão ou os grupos da igreja para disparar.",
      })
    } else {
      window.open(`https://web.whatsapp.com/send?text=${encoded}`, "_blank")
      toast.success("Abrindo WhatsApp Web com o comunicado pronto!", {
        description: "Basta selecionar o grupo ou lista de transmissão da igreja.",
      })
    }

    saveToHistory({ email: false, whatsapp: true, mural: publishOnMural })
  }

  // Save dispatch event to history and optionally update Mural
  const saveToHistory = (channels: { email: boolean; whatsapp: boolean; mural: boolean }) => {
    // 1. Update Mural on Dashboard if checked
    if (publishOnMural) {
      try {
        const formattedMuralText = `📢 [${noticeSubject.toUpperCase()}]: ${noticeBody.replace(/\n/g, " ").substring(0, 160)}...`
        if (onUpdateMuralNotice) {
          onUpdateMuralNotice(formattedMuralText)
        } else {
          // Fallback to update churchConfig in localStorage
          const savedConfig = localStorage.getItem("churchConfig")
          const parsed = savedConfig ? JSON.parse(savedConfig) : {}
          parsed.mensagemAvisos = formattedMuralText
          localStorage.setItem("churchConfig", JSON.stringify(parsed))
        }
        toast.info("Aviso atualizado e fixado no Mural do Dashboard da Igreja!")
      } catch (e) {
        console.error("Erro ao atualizar mural:", e)
      }
    }

    // 2. Add to history
    const newItem: ComunicadoHistoryItem = {
      id: "com-" + Date.now(),
      date: new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      title: noticeSubject,
      content: noticeBody,
      targetAudience:
        targetAudience === "todos"
          ? "Todos os Membros Ativos"
          : targetAudience === "lideranca"
          ? "Liderança & Obreiros"
          : targetAudience === "aniversariantes"
          ? "Aniversariantes do Mês"
          : "Público Personalizado",
      channels,
      recipientCount: filteredMembers.length,
    }

    const updated = [newItem, ...history]
    setHistory(updated)
    try {
      localStorage.setItem("church_comunicados_history", JSON.stringify(updated.slice(0, 30)))
    } catch {}

    logAction("Disparo Comunicado Geral", `${noticeSubject} para ${filteredMembers.length} pessoas`, "Secretaria")
  }

  const handleReuseHistory = (item: ComunicadoHistoryItem) => {
    setNoticeSubject(item.title)
    setNoticeBody(item.content)
    setActiveTab("novo")
    toast.success("Conteúdo do comunicado carregado no editor!")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Central de Comunicados & Avisos à Comunidade
              </DialogTitle>
              <DialogDescription className="text-xs">
                Dispare avisos da igreja por E-mail (Mala Direta / EmailJS), WhatsApp e fixe no Mural do Dashboard.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid grid-cols-3 w-full mb-3">
            <TabsTrigger value="novo" className="text-xs font-semibold flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5" />
              Novo Comunicado
            </TabsTrigger>
            <TabsTrigger value="historico" className="text-xs font-semibold flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Histórico ({history.length})
            </TabsTrigger>
            <TabsTrigger value="como-funciona" className="text-xs font-semibold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              Como Funciona
            </TabsTrigger>
          </TabsList>

          {/* ABA 1: NOVO COMUNICADO */}
          <TabsContent value="novo" className="space-y-4">
            {/* Seletor de Público e Contadores */}
            <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/60 space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div>
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    Público-Alvo dos Membros:
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Escolha quem deve receber o comunicado da igreja.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={targetAudience === "todos" ? "default" : "outline"}
                    onClick={() => setTargetAudience("todos")}
                    className="text-xs h-7 px-2.5"
                  >
                    Todos os Membros
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={targetAudience === "lideranca" ? "default" : "outline"}
                    onClick={() => setTargetAudience("lideranca")}
                    className="text-xs h-7 px-2.5"
                  >
                    Liderança & Obreiros
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={targetAudience === "aniversariantes" ? "default" : "outline"}
                    onClick={() => setTargetAudience("aniversariantes")}
                    className="text-xs h-7 px-2.5"
                  >
                    Aniversariantes
                  </Button>
                </div>
              </div>

              {/* Contadores em tempo real */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t text-center">
                <div className="bg-background p-2 rounded-md border shadow-2xs">
                  <div className="text-xs text-muted-foreground">Membros Ativos</div>
                  <div className="text-base font-bold text-foreground">
                    {filteredMembers.length}
                  </div>
                </div>
                <div className="bg-background p-2 rounded-md border shadow-2xs">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Mail className="w-3 h-3 text-blue-500" />
                    Com E-mail
                  </div>
                  <div className="text-base font-bold text-blue-600 dark:text-blue-400">
                    {validEmails.length}
                  </div>
                </div>
                <div className="bg-background p-2 rounded-md border shadow-2xs">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <MessageCircle className="w-3 h-3 text-emerald-500" />
                    Com WhatsApp
                  </div>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                    {validPhones.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Modelos Prontos da Igreja */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Modelos Rápidos de Avisos (clique para preencher):
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <Button
                    key={preset.id}
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleApplyPreset(preset)}
                    className="text-xs h-7 px-2 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Campos do Formulário */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <Label htmlFor="noticeSubject" className="text-xs font-semibold">
                  Título / Assunto do Comunicado *
                </Label>
                <Input
                  id="noticeSubject"
                  value={noticeSubject}
                  onChange={(e) => setNoticeSubject(e.target.value)}
                  placeholder="Ex: Culto de Santa Ceia e Adoração"
                  className="text-sm font-medium"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="noticeEventDate" className="text-xs font-semibold">
                  Data / Horário do Evento (Opcional)
                </Label>
                <Input
                  id="noticeEventDate"
                  value={noticeEventDate}
                  onChange={(e) => setNoticeEventDate(e.target.value)}
                  placeholder="Ex: Domingo às 19h00"
                  className="text-sm"
                />
              </div>
            </div>

            {/* Corpo da Mensagem */}
            <div className="space-y-1.5">
              <Label htmlFor="noticeBody" className="text-xs font-semibold">
                Mensagem do Comunicado *
              </Label>
              <Textarea
                id="noticeBody"
                value={noticeBody}
                onChange={(e) => setNoticeBody(e.target.value)}
                rows={6}
                className="font-sans text-sm leading-relaxed bg-background"
                placeholder="Escreva as informações detalhadas para a igreja..."
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>{noticeBody.length} caracteres</span>
                <span>Assinatura oficial: {churchName}</span>
              </div>
            </div>

            {/* Toggle de Mural do Dashboard */}
            <div className="flex items-center justify-between p-3 rounded-lg border bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40">
              <div className="space-y-0.5">
                <div className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  Fixar no Mural de Avisos do Dashboard da Igreja
                </div>
                <div className="text-[11px] text-amber-700/80 dark:text-amber-400">
                  Exibe este aviso em destaque no topo da tela inicial para todos os usuários do sistema.
                </div>
              </div>
              <Switch checked={publishOnMural} onCheckedChange={setPublishOnMural} />
            </div>

            {/* Ações de Disparo por Canal */}
            <div className="space-y-2 pt-1 border-t">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Selecione o Canal de Disparo:
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* BLOCO EMAIL */}
                <div className="p-3 rounded-lg border bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-blue-600" />
                      Canal E-mail ({validEmails.length} válidos)
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-blue-100 text-blue-800 border-blue-300">
                      Privacidade CCO (LGPD)
                    </Badge>
                  </div>
                  <p className="text-[11px] text-blue-700/80 dark:text-blue-300 leading-tight">
                    Abre seu Gmail/Outlook com todos os membros adicionados em <strong>cópia oculta (BCC)</strong> para manter a privacidade dos fiéis.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleOpenEmailClient}
                      disabled={validEmails.length === 0}
                      className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white flex-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      Abrir Mala Direta no Gmail / Outlook
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopyEmails}
                      disabled={validEmails.length === 0}
                      className="text-xs h-8"
                      title="Copiar lista de e-mails para colar onde quiser"
                    >
                      {copiedEmails ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* BLOCO WHATSAPP */}
                <div className="p-3 rounded-lg border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                      Canal WhatsApp ({validPhones.length} membros)
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-800 border-emerald-300">
                      Transmissão & Grupos
                    </Badge>
                  </div>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300 leading-tight">
                    Gera a mensagem com formatação rica (negrito, emojis e assinatura oficial) pronta para listas e grupos.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleOpenWhatsAppBroadcast}
                      className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white flex-1"
                    >
                      <Share2 className="w-3.5 h-3.5 mr-1" />
                      Abrir WhatsApp com Texto Pronto
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleCopyWhatsAppText}
                      className="text-xs h-8"
                      title="Copiar texto formatado do comunicado"
                    >
                      {copiedWhatsApp ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          Copiar Texto
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ABA 2: HISTÓRICO */}
          <TabsContent value="historico" className="space-y-3">
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum comunicado registrado no histórico até o momento.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-lg border bg-card hover:bg-slate-50/60 dark:hover:bg-slate-900/60 transition-colors space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm text-foreground">{item.title}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {item.date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {item.targetAudience} ({item.recipientCount} pessoas)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {item.channels.email && (
                          <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300">
                            E-mail
                          </Badge>
                        )}
                        {item.channels.whatsapp && (
                          <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                            WhatsApp
                          </Badge>
                        )}
                        {item.channels.mural && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">
                            Mural
                          </Badge>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground line-clamp-2 bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">
                      {item.content}
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleReuseHistory(item)}
                        className="text-xs h-7 text-primary hover:bg-primary/10"
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        Reutilizar Este Texto
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ABA 3: COMO FUNCIONA (EXPLICAÇÃO COMPLETA) */}
          <TabsContent value="como-funciona" className="space-y-3.5">
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/60 dark:bg-blue-950/20 space-y-3 text-xs">
              <div className="font-bold text-sm text-blue-900 dark:text-blue-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                Guia Completo: Como funciona o envio de e-mails, avisos e comunicados
              </div>

              <div className="space-y-3 text-slate-700 dark:text-slate-300 leading-relaxed">
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                    1. Envio de E-mails em Massa (Mala Direta & Privacidade LGPD):
                  </h4>
                  <p className="mt-1 text-[11px]">
                    Ao clicar no botão <strong>"Abrir Mala Direta no Gmail / Outlook"</strong>, o sistema coleta automaticamente o e-mail de todos os membros ativos selecionados e os coloca no campo <strong>CCO (Cópia Oculta / BCC)</strong>. Isso garante que nenhum membro tenha acesso ao e-mail dos outros irmãos, respeitando a privacidade e a Lei Geral de Proteção de Dados (LGPD). O assunto e o corpo da mensagem já aparecem digitados, bastando clicar em enviar!
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                    2. Envio pelo WhatsApp (Listas de Transmissão e Grupos):
                  </h4>
                  <p className="mt-1 text-[11px]">
                    Por diretrizes oficiais da Meta/WhatsApp, mensagens para dezenas de pessoas devem ser disparadas via <strong>Lista de Transmissão</strong> ou nos <strong>Grupos Oficiais da Igreja</strong>. Ao clicar em <strong>"Copiar Texto Formatado"</strong> ou <strong>"Abrir WhatsApp com Texto Pronto"</strong>, o comunicado é preparado com formatação em negrito, emojis bíblicos e o rodapé oficial da Igreja O Brasil para Cristo (2ª Congregação).
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                    3. Mensagens Individuais por Membro (Boas-Vindas e Aniversários):
                  </h4>
                  <p className="mt-1 text-[11px]">
                    Na tabela de membros da Secretaria, ao clicar no ícone verde de WhatsApp de qualquer irmão, abre-se uma tela com modelos dinâmicos que adaptam a mensagem automaticamente (Boas-Vindas à congregação, Felicitações de Aniversário com bênção pastoral de Números 6:24, Lembretes de Culto ou Mensagem Livre). Você pode enviar diretamente para o WhatsApp App do computador/celular sem precisar abrir abas extras no navegador!
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-1.5">
                    4. Mural de Avisos do Painel (Dashboard):
                  </h4>
                  <p className="mt-1 text-[11px]">
                    Ativando a opção <strong>"Fixar no Mural de Avisos da Igreja"</strong>, o sistema atualiza em tempo real o aviso no topo da tela principal, garantindo que pastores, secretários e líderes vejam a notificação assim que entrarem no sistema.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between pt-2 border-t">
          <span className="text-[11px] text-muted-foreground">
            {filteredMembers.length} membros ativos no filtro atual
          </span>
          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
