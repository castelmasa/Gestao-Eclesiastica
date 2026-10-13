import React, { useState, useEffect } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  MessageCircle,
  Copy,
  ExternalLink,
  Smartphone,
  Laptop,
  Mail,
  Sparkles,
  Heart,
  Church,
  Bell,
  Edit3,
  Check,
  Send,
  User,
  Phone
} from "lucide-react"
import { toast } from "sonner"
import { logAction } from "@/lib/audit"

export type MessageTemplateType = "welcome" | "birthday" | "reminder" | "notice" | "custom"

interface MemberWhatsAppMessageModalProps {
  isOpen: boolean
  onClose: () => void
  member: {
    id?: string | number
    name: string
    phone?: string
    email?: string
    role?: string
    status?: string
    dataNascimento?: string
  } | null
  defaultTemplate?: MessageTemplateType
  churchName?: string
}

export function MemberWhatsAppMessageModal({
  isOpen,
  onClose,
  member,
  defaultTemplate = "welcome",
  churchName = "Igreja O Brasil para Cristo - 2ª Congregação",
}: MemberWhatsAppMessageModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplateType>(defaultTemplate)
  const [customSubject, setCustomSubject] = useState("")
  const [messageText, setMessageText] = useState("")
  const [copied, setCopied] = useState(false)
  const [preferredApp, setPreferredApp] = useState<"app" | "web">(() => {
    return (localStorage.getItem("whatsappPreferredMode") as "app" | "web") || "app"
  })

  // Format the recipient phone
  const cleanPhone = member?.phone ? member.phone.replace(/\D/g, "") : ""
  const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone

  // Generate dynamic message content based on template
  const generateTemplateText = (tpl: MessageTemplateType, memberName: string, chName: string) => {
    const firstName = memberName.split(" ")[0] || "irmão(ã)"
    switch (tpl) {
      case "welcome":
        return `A Paz do Senhor, irmão(ã) ${memberName}! 👋🕊️\n\nÉ com imensa alegria e de coração aberto que lhe damos as boas-vindas à ${chName}!\n\nQue este seja um lugar abençoado de crescimento espiritual, acolhimento, oração e comunhão para você e toda a sua família.\n\nSempre que precisar de oração, apoio pastoral ou informações sobre nossos cultos e ministérios, nossa liderança e a secretaria da igreja estão à sua inteira disposição.\n\n"Em tudo dai graças, porque esta é a vontade de Deus em Cristo Jesus para convosco." (1 Tessalonicenses 5:18)\n\nSeja muito bem-vindo(a) à família da fé! ⛪❤️`

      case "birthday":
        return `A Paz do Senhor, querido(a) ${memberName}! 🎉🎂🎈\n\nEm nome de toda a liderança, ministérios e irmãos da ${chName}, queremos lhe desejar um abençoado e radiante Feliz Aniversário!\n\nCelebramos a sua vida e oramos para que o Senhor Deus derrame ricas bênçãos sobre seus passos, renovando sua saúde, sabedoria, alegria e sonhos neste novo ciclo de vida.\n\n"O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e tenha misericórdia de ti; o Senhor sobre ti levante o seu rosto e te dê a paz." (Números 6:24-26)\n\nParabéns pelo seu dia tão especial! Parabéns! 🎁✨`

      case "reminder":
        return `A Paz do Senhor, amado(a) ${memberName}! ⛪🙌\n\nPassamos para lembrar com muito carinho dos nossos próximos cultos e atividades na ${chName}.\n\nA sua presença e da sua família é fundamental para juntos adorarmos e engrandecermos ao Senhor Jesus. Venha celebrar conosco e receber uma palavra abençoada!\n\n"Alegrei-me quando me disseram: Vamos à casa do Senhor." (Salmos 122:1)\n\nEsperamos por você!`

      case "notice":
        return `A Paz do Senhor, irmão(ã) ${memberName}! 📢📋\n\nA secretaria e a liderança pastoral da ${chName} trazem este comunicado oficial importante para o seu conhecimento:\n\n[Digite aqui os detalhes do aviso ou evento]\n\nContamos com a sua atenção e apoio. Em caso de dúvidas, estamos à disposição!\n\nAtenciosamente,\nSecretaria da Igreja`

      case "custom":
      default:
        return `A Paz do Senhor, irmão(ã) ${memberName}!\n\n`
    }
  }

  // Update text when modal opens, member changes, or template changes
  useEffect(() => {
    if (member && isOpen) {
      setSelectedTemplate(defaultTemplate)
      setMessageText(generateTemplateText(defaultTemplate, member.name, churchName))
    }
  }, [member, isOpen, defaultTemplate, churchName])

  const handleSelectTemplate = (tpl: MessageTemplateType) => {
    setSelectedTemplate(tpl)
    if (member) {
      setMessageText(generateTemplateText(tpl, member.name, churchName))
    }
  }

  const handleCopy = () => {
    if (!messageText) return
    navigator.clipboard.writeText(messageText)
    setCopied(true)
    toast.success("Mensagem copiada com sucesso! Pronta para colar no WhatsApp.")
    setTimeout(() => setCopied(false), 2500)
    logAction("Copiar Mensagem WhatsApp Membro", `Mensagem para ${member?.name}`, "Secretaria")
  }

  const handleSendViaDesktopApp = async () => {
    if (!cleanPhone) {
      toast.error("Este membro não possui telefone válido cadastrado.")
      return
    }

    localStorage.setItem("whatsappPreferredMode", "app")
    setPreferredApp("app")

    // 1. ALWAYS auto-copy message to clipboard so user has it immediately ready
    try {
      await navigator.clipboard.writeText(messageText)
      setCopied(true)
    } catch (e) {
      console.warn("Clipboard copy fallback", e)
    }

    const encoded = encodeURIComponent(messageText)
    const appUrl = `whatsapp://send?phone=${fullPhone}&text=${encoded}`

    window.location.href = appUrl

    toast.success(`Acionando aplicativo do WhatsApp para ${member?.name}!`, {
      description: "Mensagem copiada para a área de transferência! Se abrir a conversa sem o texto, tecle Ctrl+V (Colar) e Enter.",
      duration: 8000,
    })

    logAction("Envio WhatsApp App", `Mensagem para ${member?.name} (${fullPhone})`, "Secretaria")
  }

  const handleSendViaWhatsAppWeb = async () => {
    if (!cleanPhone) {
      toast.error("Este membro não possui telefone válido cadastrado.")
      return
    }

    localStorage.setItem("whatsappPreferredMode", "web")
    setPreferredApp("web")

    // 1. ALWAYS auto-copy message to clipboard so user has it immediately ready
    try {
      await navigator.clipboard.writeText(messageText)
      setCopied(true)
    } catch (e) {
      console.warn("Clipboard copy fallback", e)
    }

    const encoded = encodeURIComponent(messageText)
    // WhatsApp Web requires trailing slash /send/?phone=... to reliably populate message
    const webUrl = `https://web.whatsapp.com/send/?phone=${fullPhone}&text=${encoded}`
    window.open(webUrl, "_blank", "noopener,noreferrer")

    toast.success(`Abrindo WhatsApp Web para ${member?.name}!`, {
      description: "Mensagem copiada automaticamente! Caso a conversa abra sem o texto na caixinha, dê Ctrl+V (Colar) e Enter!",
      duration: 9000,
    })
    logAction("Envio WhatsApp Web", `Mensagem para ${member?.name} (${fullPhone})`, "Secretaria")
  }

  const handleSendViaUniversalLink = async () => {
    if (!cleanPhone) {
      toast.error("Este membro não possui telefone válido cadastrado.")
      return
    }

    try {
      await navigator.clipboard.writeText(messageText)
      setCopied(true)
    } catch (e) {}

    const encoded = encodeURIComponent(messageText)
    const universalUrl = `https://api.whatsapp.com/send?phone=${fullPhone}&text=${encoded}`
    window.open(universalUrl, "_blank", "noopener,noreferrer")

    toast.success(`Abrindo Link Oficial WhatsApp para ${member?.name}!`, {
      description: "Mensagem copiada! Se necessário, dê Ctrl+V na conversa.",
      duration: 7000,
    })
    logAction("Envio WhatsApp Universal", `Mensagem para ${member?.name} (${fullPhone})`, "Secretaria")
  }

  const handleSendViaEmail = () => {
    if (!member?.email) {
      toast.error("Este membro não possui e-mail cadastrado.")
      return
    }

    const subject = encodeURIComponent(
      selectedTemplate === "birthday"
        ? `Feliz Aniversário! - ${churchName}`
        : selectedTemplate === "welcome"
        ? `Boas-Vindas à ${churchName}`
        : selectedTemplate === "reminder"
        ? `Lembrete Especial - ${churchName}`
        : `Comunicado Pastoral - ${churchName}`
    )
    const body = encodeURIComponent(messageText)

    window.location.href = `mailto:${member.email}?subject=${subject}&body=${body}`
    toast.success(`Abrindo cliente de e-mail para ${member.email}`)
    logAction("Envio E-mail Membro", `Mensagem para ${member?.name} (${member.email})`, "Secretaria")
  }

  const handleInsertTag = (tag: string) => {
    let tagValue = ""
    if (tag === "{nome}") tagValue = member?.name || "irmão(ã)"
    else if (tag === "{primeiro_nome}") tagValue = member?.name?.split(" ")[0] || "irmão(ã)"
    else if (tag === "{igreja}") tagValue = churchName
    else if (tag === "{cargo}") tagValue = member?.role || "Membro"

    setMessageText((prev) => prev + " " + tagValue)
  }

  if (!member) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Enviar Mensagem para {member.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Adapte e envie mensagens personalizadas de boas-vindas, aniversário ou avisos pelo WhatsApp ou E-mail.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card com Dados do Membro */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border bg-slate-50 dark:bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold flex items-center justify-center text-sm border border-emerald-300 dark:border-emerald-800">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-sm flex items-center gap-2">
                  {member.name}
                  {member.role && (
                    <Badge variant="outline" className="text-[10px] font-medium py-0 h-4">
                      {member.role}
                    </Badge>
                  )}
                  {member.status && (
                    <Badge
                      className={`text-[10px] font-medium py-0 h-4 ${
                        member.status === "Ativo"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {member.status}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-600" />
                    {member.phone || "Sem telefone"}
                  </span>
                  {member.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3 text-blue-600" />
                      {member.email}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {!cleanPhone && (
              <Badge variant="destructive" className="text-xs">
                ⚠️ Membro sem telefone cadastrado
              </Badge>
            )}
          </div>

          {/* Seleção do Tipo de Mensagem (Adaptação Automática) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Selecione o Assunto da Mensagem (adapta o texto automaticamente):
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={selectedTemplate === "welcome" ? "default" : "outline"}
                onClick={() => handleSelectTemplate("welcome")}
                className={`text-xs h-9 justify-start px-2.5 font-medium ${
                  selectedTemplate === "welcome"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : ""
                }`}
              >
                <Heart className="w-3.5 h-3.5 mr-1.5 text-pink-500" />
                Boas-Vindas
              </Button>

              <Button
                type="button"
                size="sm"
                variant={selectedTemplate === "birthday" ? "default" : "outline"}
                onClick={() => handleSelectTemplate("birthday")}
                className={`text-xs h-9 justify-start px-2.5 font-medium ${
                  selectedTemplate === "birthday"
                    ? "bg-pink-600 hover:bg-pink-700 text-white"
                    : ""
                }`}
              >
                🎂 Parabéns
              </Button>

              <Button
                type="button"
                size="sm"
                variant={selectedTemplate === "reminder" ? "default" : "outline"}
                onClick={() => handleSelectTemplate("reminder")}
                className={`text-xs h-9 justify-start px-2.5 font-medium ${
                  selectedTemplate === "reminder"
                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                    : ""
                }`}
              >
                <Church className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                Lembrete Culto
              </Button>

              <Button
                type="button"
                size="sm"
                variant={selectedTemplate === "notice" ? "default" : "outline"}
                onClick={() => handleSelectTemplate("notice")}
                className={`text-xs h-9 justify-start px-2.5 font-medium ${
                  selectedTemplate === "notice"
                    ? "bg-amber-600 hover:bg-amber-700 text-white"
                    : ""
                }`}
              >
                <Bell className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                Aviso Geral
              </Button>

              <Button
                type="button"
                size="sm"
                variant={selectedTemplate === "custom" ? "default" : "outline"}
                onClick={() => handleSelectTemplate("custom")}
                className={`text-xs h-9 justify-start px-2.5 font-medium ${
                  selectedTemplate === "custom"
                    ? "bg-slate-700 hover:bg-slate-800 text-white"
                    : ""
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                Livre / Outro
              </Button>
            </div>
          </div>

          {/* Editor e Pré-visualização da Mensagem */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="whatsappMessageBody" className="text-xs font-semibold">
                Texto da Mensagem (você pode editar livremente antes de enviar):
              </Label>
              <div className="flex items-center gap-1">
                <span className="text-[11px] text-muted-foreground mr-1">Inserir:</span>
                <button
                  type="button"
                  onClick={() => handleInsertTag("{nome}")}
                  className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-mono text-primary transition-colors"
                  title="Inserir nome completo do membro"
                >
                  Nome
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag("{primeiro_nome}")}
                  className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-mono text-primary transition-colors"
                  title="Inserir primeiro nome"
                >
                  1º Nome
                </button>
                <button
                  type="button"
                  onClick={() => handleInsertTag("{igreja}")}
                  className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-mono text-primary transition-colors"
                  title="Inserir nome da igreja"
                >
                  Igreja
                </button>
              </div>
            </div>

            <Textarea
              id="whatsappMessageBody"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={8}
              className="font-sans text-sm leading-relaxed resize-y bg-background"
              placeholder="Digite sua mensagem para o membro..."
            />

            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-0.5">
              <span>{messageText.length} caracteres</span>
              <span>Dica: Use *texto* para negrito e _texto_ para itálico no WhatsApp.</span>
            </div>
          </div>

          {/* Alerta e Instrução de Disparo */}
          <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50/80 dark:border-emerald-800 dark:bg-emerald-950/30 text-xs space-y-1.5">
            <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              Envio Inteligente com Cópia Automática:
            </div>
            <p className="text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
              Ao clicar em qualquer um dos botões abaixo, <strong>a mensagem é copiada automaticamente para sua memória</strong> e enviada para o WhatsApp. Caso a tela do WhatsApp carregue sem o texto na caixinha, <strong>basta pressionar Ctrl+V (Colar) e Enter</strong>!
            </p>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t">
          {/* Botões secundários: Copiar e E-mail */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="text-xs h-9"
              title="Copiar mensagem para colar onde quiser"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 mr-1.5" />
                  Copiar Mensagem
                </>
              )}
            </Button>

            {member.email && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSendViaEmail}
                className="text-xs h-9 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950"
                title="Enviar esta mesma mensagem por E-mail"
              >
                <Mail className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                Enviar por E-mail
              </Button>
            )}
          </div>

          {/* Botões de Ação do WhatsApp */}
          <div className="flex flex-wrap items-center gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendViaWhatsAppWeb}
              disabled={!cleanPhone}
              className="text-xs h-9 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Abrir no navegador do computador via WhatsApp Web com a mensagem preenchida"
            >
              <Laptop className="w-3.5 h-3.5 mr-1.5 text-slate-600 dark:text-slate-400" />
              WhatsApp Web
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSendViaUniversalLink}
              disabled={!cleanPhone}
              className="text-xs h-9 border-emerald-300 text-emerald-800 dark:text-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950"
              title="Abrir link oficial wa.me para conectar diretamente ao contato"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Link Direto (wa.me)
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSendViaDesktopApp}
              disabled={!cleanPhone}
              className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs px-3"
              title="Aciona diretamente o aplicativo do WhatsApp no Celular ou o aplicativo de Computador com o texto pronto"
            >
              <Smartphone className="w-4 h-4 mr-1.5" />
              Acionar Celular / App
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
