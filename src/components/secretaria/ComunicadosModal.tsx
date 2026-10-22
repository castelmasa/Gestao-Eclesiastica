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
  FileText,
  Search
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
  const [selectedPresetId, setSelectedPresetId] = useState<string>("ceia")
  const [presetCategory, setPresetCategory] = useState<string>("todos")
  const [presetSearch, setPresetSearch] = useState<string>("")

  // CALENDÁRIO PARA DATA / HORÁRIO DO EVENTO (Solicitado no Anexo 5)
  const [showCalendarPicker, setShowCalendarPicker] = useState(false)
  const [calendarDate, setCalendarDate] = useState(() => new Date().toISOString().split("T")[0])
  const [calendarTime, setCalendarTime] = useState("19:00")

  const handleApplyCalendarDateTime = (dateStr?: string, timeStr?: string) => {
    const d = dateStr || calendarDate
    const t = timeStr !== undefined ? timeStr : calendarTime
    if (!d) return
    const [year, month, day] = d.split("-")
    const dateObj = new Date(Number(year), Number(month) - 1, Number(day))
    const weekdays = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"]
    const weekdayName = weekdays[dateObj.getDay()]
    const formatted = `${weekdayName}, ${day}/${month}/${year}${t ? ` às ${t}` : ""}`
    setNoticeEventDate(formatted)
  }

  const handleQuickCalendarOption = (option: 'hoje' | 'amanha' | 'domingo_manha' | 'domingo_noite' | 'terca' | 'sexta') => {
    const today = new Date()
    const target = new Date()
    let time = "19:30"

    if (option === 'hoje') {
      time = "19:30"
    } else if (option === 'amanha') {
      target.setDate(today.getDate() + 1)
      time = "19:30"
    } else if (option === 'domingo_manha') {
      const daysUntilSunday = (7 - today.getDay()) % 7 || 7
      target.setDate(today.getDate() + daysUntilSunday)
      time = "09:00"
    } else if (option === 'domingo_noite') {
      const daysUntilSunday = (7 - today.getDay()) % 7 || 7
      target.setDate(today.getDate() + daysUntilSunday)
      time = "19:00"
    } else if (option === 'terca') {
      const daysUntilTue = (2 - today.getDay() + 7) % 7 || 7
      target.setDate(today.getDate() + daysUntilTue)
      time = "19:30"
    } else if (option === 'sexta') {
      const daysUntilFri = (5 - today.getDay() + 7) % 7 || 7
      target.setDate(today.getDate() + daysUntilFri)
      time = "20:00"
    }

    const iso = target.toISOString().split("T")[0]
    setCalendarDate(iso)
    setCalendarTime(time)
    handleApplyCalendarDateTime(iso, time)
    toast.success(`Data preenchida pelo calendário!`)
  }

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

  // Pre-made church templates organizados por categoria (Conforme Anexo 2)
  const presets = [
    // 1. Cultos & Celebrações
    {
      id: "ceia",
      label: "🍷 Culto de Santa Ceia",
      category: "cultos",
      categoryLabel: "Cultos Especiais",
      subject: "Celebração da Santa Ceia do Senhor",
      defaultDate: "Domingo às 19h00",
      body: `A Paz do Senhor, amados irmãos da ${churchName}! 🍷🍞\n\nNeste próximo domingo, celebraremos a Santa Ceia do Senhor Jesus Cristo, um momento solene de comunhão, memória do sacrifício na cruz e renovação da nossa aliança com Deus.\n\n"Fazei isto em memória de mim." (1 Coríntios 11:24)\n\nConvidamos você e toda a sua família para estarem conosco. Venha com o coração aberto para adorar e receber a bênção do Senhor!`,
    },
    {
      id: "missoes",
      label: "🌍 Culto de Missões",
      category: "cultos",
      categoryLabel: "Cultos Especiais",
      subject: "Grande Culto de Missões e Evangelismo",
      defaultDate: "Domingo às 19h00",
      body: `A Paz do Senhor, amados irmãos da ${churchName}! 🌍📖\n\nConvidamos toda a igreja e comunidade para o nosso Culto Especial de Missões. Será uma noite de clamor pelos missionários nos campos, conscientização da Grande Comissão e testemunhos do agir sobrenatural de Deus alcançando vidas.\n\n"Ide por todo o mundo, pregai o evangelho a toda criatura." (Marcos 16:15)\n\nTraga sua oferta missionária e venha interceder pelas nações conosco!`,
    },
    {
      id: "jovens",
      label: "⚡ Culto dos Jovens",
      category: "cultos",
      categoryLabel: "Cultos Especiais",
      subject: "Culto dos Jovens - Juventude com Propósito",
      defaultDate: "Sábado às 19h30",
      body: `A Paz do Senhor, juventude forte e abençoada! ⚡🔥\n\nConvocamos todos os jovens e adolescentes da ${churchName} para o nosso Culto dos Jovens. Será uma noite memorável de louvor contagiante, adoração genuína e ministração da Palavra de Deus para impactar a nossa geração.\n\n"Ninguém despreze a tua mocidade; mas sê o exemplo dos fiéis, na palavra, no trato, no amor, no espírito, na fé, na pureza." (1 Timóteo 4:12)\n\nConvide seus amigos da escola, faculdade e bairro. Esperamos por você!`,
    },
    {
      id: "criancas",
      label: "🎈 Culto das Crianças",
      category: "cultos",
      categoryLabel: "Cultos Especiais",
      subject: "Grande Culto das Crianças",
      defaultDate: "Domingo às 18h30",
      body: `A Paz do Senhor, amada igreja e família! 🎈👶\n\nConvidamos todas as crianças, pais e familiares para o nosso animado Culto das Crianças. Teremos louvores infantis, apresentações dos pequeninos, teatrinho bíblico e uma palavra de amor e fé diretamente ao coração dos nossos filhos!\n\n"Deixai vir a mim as criancinhas e não as impeçais, porque das tais é o Reino de Deus." (Lucas 18:16)\n\nTraga seus filhos para este culto lindo e acolhedor!`,
    },
    {
      id: "culto-espaco-kids",
      label: "🧸 Culto Espaço Kids",
      category: "cultos",
      categoryLabel: "Cultos Especiais",
      subject: "Culto Festivo no Espaço Kids",
      defaultDate: "Domingo às 09h00",
      body: `A Paz do Senhor, amada comunidade e pais! 🧸🌟\n\nÉ com grande alegria que convidamos todas as crianças para o nosso Culto Festivo no Espaço Kids da ${churchName}! Uma programação especial estruturada para ensinar as Sagradas Escrituras com amor, dinamismo, histórias bíblicas e alegria.\n\n"Instrui o menino no caminho em que deve andar, e, até quando envelhecer, não se desviará dele." (Provérbios 22:6)\n\nTraga suas crianças para vivenciarem a presença de Deus desde cedo!`,
    },
    {
      id: "varoes",
      label: "🛡️ Culto dos Varões",
      category: "cultos",
      categoryLabel: "Cultos Especiais",
      subject: "Culto dos Varões - Homens de Honra e Oração",
      defaultDate: "Quinta-feira às 19h30",
      body: `A Paz do Senhor, valorosos varões e irmãos da ${churchName}! 🛡️⚔️\n\nConvocamos todos os homens da igreja para o nosso Culto do Ministério de Varões. Um tempo oportuno para oração pelos lares, sacerdócio da família e fortalecimento espiritual mútuo sob a luz da Bíblia.\n\n"Sede vigilantes, permanecei firmes na fé, portai-vos varonilmente, sede fortes." (1 Coríntios 16:13)\n\nSua presença é fundamental para compor este exército de intercessores!`,
    },

    // 2. Departamentos & Grupos
    {
      id: "mulheres",
      label: "🌸 Encontro de Mulheres",
      category: "departamentos",
      categoryLabel: "Departamentos & Grupos",
      subject: "Encontro do Ministério de Mulheres",
      defaultDate: "Sábado às 16h00",
      body: `A Paz do Senhor, queridas irmãs e amigas da ${churchName}! 🌸👑\n\nConvidamos todas as mulheres para um Encontro Especial de edificação, cura interior, louvor e comunhão. Será uma tarde enriquecedora de ministração bíblica, testemunhos e um fraterno chá da comunhão.\n\n"Mulher virtuosa, quem a achará? O seu valor muito excede o de finas joias." (Provérbios 31:10)\n\nVenha ser renovada na presença do Senhor e traga uma amiga com você!`,
    },
    {
      id: "espaco-kids",
      label: "🎨 Espaço Kids",
      category: "departamentos",
      categoryLabel: "Departamentos & Grupos",
      subject: "Atividades do Espaço Kids e Apoio aos Pais",
      defaultDate: "Aos Domingos nos Cultos",
      body: `A Paz do Senhor, prezados pais e responsáveis da ${churchName}! 🎨🖍️\n\nLembramos que o Espaço Kids está com equipe de monitoras preparadas para receber suas crianças durante todos os nossos cultos oficiais. Um ambiente seguro, limpo e com material bíblico adaptado para a idade do seu filho.\n\n"Grandes serão a paz e a instrução dos teus filhos." (Isaías 54:13)\n\nDeixe seu pequeno em boas mãos enquanto você cultua e adora a Deus em paz!`,
    },
    {
      id: "confraternizacao",
      label: "🎉 Confraternização",
      category: "departamentos",
      categoryLabel: "Departamentos & Grupos",
      subject: "Grande Confraternização da Família da Igreja",
      defaultDate: "Sábado a partir das 11h00",
      body: `A Paz do Senhor, família da fé da ${churchName}! 🎉🍲\n\nChegou a hora de celebrarmos a nossa Confraternização Geral da Igreja! Um dia reservado para a comunhão fraterna, alegria cristã, dinâmicas de integração, almoço comunitário e louvor a Deus por sua bondade.\n\n"Oh! Quão bom e quão suave é que os irmãos vivam em união!" (Salmos 133:1)\n\nTraga sua família e participe com o coração cheio de júbilo!`,
    },

    // 3. Ensino & Batismo
    {
      id: "curso-batismo",
      label: "📖 Curso de Batismo nas Águas",
      category: "ensino",
      categoryLabel: "Ensino & Batismo",
      subject: "Inscrições Abertas: Curso de Batismo nas Águas",
      defaultDate: "Domingos às 09h00",
      body: `A Paz do Senhor, irmãos e novos convertidos da ${churchName}! 📖💧\n\nA secretaria e a liderança pastoral informam que estão abertas as inscrições para o Curso Preparatório de Batismo nas Águas. As aulas ensinam os pilares fundamentais da doutrina bíblica e preparam os candidatos para este ato solene de obediência.\n\n"Quem crer e for batizado será salvo." (Marcos 16:16)\n\nProcure a liderança ou a secretaria para confirmar sua participação e receber o material!`,
    },
    {
      id: "discipulado",
      label: "🌱 Discipulado",
      category: "ensino",
      categoryLabel: "Ensino & Batismo",
      subject: "Encontros de Discipulado Cristão e Crescimento Espiritual",
      defaultDate: "Quartas-feiras às 19h30",
      body: `A Paz do Senhor, queridos irmãos da ${churchName}! 🌱✝️\n\nConvidamos você para integrar as novas turmas de Discipulado Cristão. Venha fortalecer a sua fé, aprender o caráter de Cristo e entender como caminhar firme nos ensinamentos do Evangelho no dia a dia.\n\n"Antes, crescei na graça e no conhecimento de nosso Senhor e Salvador Jesus Cristo." (2 Pedro 3:18)\n\nVenha crescer espiritualmente conosco!`,
    },
    {
      id: "batismo-aguas",
      label: "🌊 Batismo nas Águas",
      category: "ensino",
      categoryLabel: "Ensino & Batismo",
      subject: "Celebração do Batismo nas Águas da Igreja",
      defaultDate: "Domingo às 10h00",
      body: `A Paz do Senhor, amada igreja da ${churchName}! 🌊🕊️\n\nCom imenso júbilo no Espírito Santo, convidamos todos os irmãos, familiares e amigos para a Solenidade de Batismo nas Águas. Venha celebrar a vitória de vidas que publicamente confessarão Jesus Cristo como seu único Salvador!\n\n"Fomos sepultados com ele pelo batismo na morte, para que, como Cristo ressuscitou dentre os mortos, assim andemos nós também em novidade de vida." (Romanos 6:4)\n\nContamos com sua oração e presença festiva!`,
    },

    // 4. Oração & Espiritualidade
    {
      id: "vigilia",
      label: "🔥 Vigília & Oração",
      category: "oracao",
      categoryLabel: "Oração & Espiritualidade",
      subject: "Vigília de Oração e Clamor da Igreja",
      defaultDate: "Sexta-feira às 23h00",
      body: `A Paz do Senhor, família da fé! 🔥🙌\n\nConvidamos toda a igreja para a nossa abençoada Vigília de Oração. Será uma noite de busca intensa pela presença do Espírito Santo, intercessão pelas famílias, cura e libertação.\n\nTraga seus pedidos de oração e venha buscar a face de Deus conosco!\n\n"Clama a mim, e responder-te-ei, e anunciar-te-ei coisas grandes e firmes que não sabes." (Jeremias 33:3)`,
    },
    {
      id: "virgilia",
      label: "🕯️ Virgília",
      category: "oracao",
      categoryLabel: "Oração & Espiritualidade",
      subject: "Grande Virgília de Clamor, Oração e Avivamento",
      defaultDate: "Sexta-feira a partir das 23h00",
      body: `A Paz do Senhor, povo de Deus da ${churchName}! 🕯️🕊️\n\nConvocamos toda a igreja para a nossa Grande Virgília de Oração e Avivamento. Venha romper a madrugada em intercessão, buscando poder do alto, quebra de cadeias e renovo espiritual sobre as nossas vidas e lares.\n\n"E perto da meia-noite, Paulo e Silas oravam e cantavam hinos a Deus, e os outros presos os escutavam." (Atos 16:25)\n\nDeus tem uma resposta para o seu clamor na vigília!`,
    },
    {
      id: "consagracao",
      label: "🙏 Consagração e Jejum",
      category: "oracao",
      categoryLabel: "Oração & Espiritualidade",
      subject: "Manhã de Consagração e Jejum Congregacional",
      defaultDate: "Sábado das 08h00 às 11h00",
      body: `A Paz do Senhor, amados irmãos da ${churchName}! 🙏🍞\n\nConvidamos toda a igreja para a nossa Manhã de Consagração e Jejum. Um tempo separado para buscarmos a Deus em oração, santificar nossos pensamentos e nos humilhar diante do Todo-Poderoso.\n\n"Santificai um jejum, convocai uma assembleia solene... e clamai ao Senhor." (Joel 1:14)\n\nVenha consagrar o seu coração e colher os frutos da oração respondida!`,
    },

    // 5. Liderança & Reuniões
    {
      id: "reuniao-lideranca",
      label: "👔 Reunião com a Liderança",
      category: "lideranca",
      categoryLabel: "Liderança & Ministério",
      subject: "Convocação: Reunião Geral com a Liderança",
      defaultDate: "Segunda-feira às 20h00",
      body: `A Paz do Senhor, prezados líderes e coordenadores da ${churchName}! 👔📋\n\nA liderança pastoral convoca todos os coordenadores de ministérios, departamentos e diretores para uma Reunião Geral de Liderança. Pautas: avaliação ministerial, alinhamento das escalas e planejamento estratégico dos eventos.\n\n"Onde não há conselho os projetos saem vãos, mas na multidão de conselheiros se confirmam." (Provérbios 15:22)\n\nContamos com a pontualidade e o zelo de cada obreiro convocado!`,
    },
    {
      id: "reuniao-louvor",
      label: "🎵 Reunião como o Ministério de Louvor",
      category: "lideranca",
      categoryLabel: "Liderança & Ministério",
      subject: "Reunião de Alinhamento: Ministério de Louvor e Músicos",
      defaultDate: "Sábado às 17h00",
      body: `A Paz do Senhor, amados levitas, músicos e equipe de som da ${churchName}! 🎵🎸🎤\n\nConvocamos todo o Ministério de Louvor para nossa reunião de alinhamento espiritual, organização de escalas de cultos, ensaios e planejamento técnico. Vamos juntos buscar aperfeiçoamento e consagração diante do altar.\n\n"Cantai-lhe um cântico novo; tocai bem e com júbilo." (Salmos 33:3)\n\nSua presença é essencial para o bom andamento dos louvores na casa do Senhor!`,
    },
    {
      id: "reuniao-diaconos",
      label: "🤝 Reunião com os Diáconos, Diaconisas e Cooperadores",
      category: "lideranca",
      categoryLabel: "Liderança & Ministério",
      subject: "Reunião de Alinhamento: Diáconos, Diaconisas e Cooperadores",
      defaultDate: "Sábado às 18h00",
      body: `A Paz do Senhor, estimados diáconos, diaconisas e cooperadores da ${churchName}! 🤝⛪\n\nConvocamos todo o corpo de apoio e serviço eclesiástico para a nossa reunião de alinhamento dos serviços aos cultos, recepção calorosa de membros e visitantes, apoio à mesa da Santa Ceia e zelo pelo templo.\n\n"Porque os que servirem bem como diáconos adquirirão para si uma boa posição e muita confiança na fé que há em Cristo Jesus." (1 Timóteo 3:13)\n\nPedimos o compromisso e a pontualidade de todos!`,
    },
    {
      id: "reuniao",
      label: "📋 Reunião / Assembleia Geral",
      category: "lideranca",
      categoryLabel: "Liderança & Ministério",
      subject: "Convocação para Assembleia Administrativa da Igreja",
      defaultDate: "Domingo às 17h00",
      body: `A Paz do Senhor, prezados membros e liderança da ${churchName}! 📋⛪\n\nA diretoria e a secretaria da igreja convocam todos os membros e obreiros para a nossa Reunião Geral de Prestação de Contas, Planejamento e Avisos Importantes.\n\nA sua presença e participação é muito importante para a boa condução da obra do Senhor!\n\nContamos com todos. Que Deus abençoe!`,
    },

    // 6. Ações Comunitárias e Livre
    {
      id: "social",
      label: "🤝 Ação Social & Mutirão",
      category: "geral",
      categoryLabel: "Comunidade & Outros",
      subject: "Mutirão Comunitário e Ação Solidária da Igreja",
      defaultDate: "Sábado às 08h00",
      body: `A Paz do Senhor, queridos irmãos! 🤝❤️\n\nNossa igreja realizará uma ação especial de arrecadação de alimentos e roupas para famílias em situação de vulnerabilidade e manutenção da nossa casa de oração.\n\nVocê pode contribuir com alimentos não perecíveis ou participando voluntariamente no dia. Toda ajuda é bem-vinda!\n\n"Servi uns aos outros pelo amor." (Gálatas 5:13)`,
    },
    {
      id: "livre",
      label: "✍️ Comunicado em Branco",
      category: "geral",
      categoryLabel: "Comunidade & Outros",
      subject: "Comunicado Oficial da Secretaria",
      defaultDate: "",
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

  const filteredPresets = useMemo(() => {
    return presets.filter(p => {
      const matchesCategory = presetCategory === "todos" || p.category === presetCategory
      const matchesSearch = !presetSearch.trim() || 
        p.label.toLowerCase().includes(presetSearch.toLowerCase()) || 
        p.subject.toLowerCase().includes(presetSearch.toLowerCase()) ||
        p.categoryLabel.toLowerCase().includes(presetSearch.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [presets, presetCategory, presetSearch])

  const handleApplyPreset = (preset: typeof presets[0]) => {
    setSelectedPresetId(preset.id)
    setNoticeSubject(preset.subject)
    setNoticeBody(preset.body)
    if (preset.defaultDate) {
      setNoticeEventDate(preset.defaultDate)
    }
    toast.success(`Modelo "${preset.label}" carregado com sucesso!`, { duration: 2000 })
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

            {/* Modelos Rápidos de Avisos (Conforme Anexo 2: Bem organizadinho e elegante) */}
            <div className="space-y-2.5 p-3 rounded-xl border bg-slate-50/70 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Modelos Rápidos de Avisos & Comunicados ({presets.length} opções):
                </Label>
                
                {/* Campo de Busca Rápida de Modelo */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={presetSearch}
                    onChange={(e) => setPresetSearch(e.target.value)}
                    placeholder="Filtrar por nome ou assunto..."
                    className="h-7 text-xs pl-8 pr-2 bg-background border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>

              {/* Filtros por Categoria em Pílulas elegantes */}
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { id: "todos", label: "🌟 Todos", count: presets.length },
                  { id: "cultos", label: "⛪ Cultos Especiais", count: presets.filter(p => p.category === "cultos").length },
                  { id: "departamentos", label: "👥 Departamentos", count: presets.filter(p => p.category === "departamentos").length },
                  { id: "ensino", label: "📖 Ensino & Batismo", count: presets.filter(p => p.category === "ensino").length },
                  { id: "oracao", label: "🔥 Oração & Jejum", count: presets.filter(p => p.category === "oracao").length },
                  { id: "lideranca", label: "📋 Liderança & Reuniões", count: presets.filter(p => p.category === "lideranca").length },
                  { id: "geral", label: "🤝 Comunidade & Livre", count: presets.filter(p => p.category === "geral").length },
                ].map((cat) => (
                  <Button
                    key={cat.id}
                    type="button"
                    size="sm"
                    variant={presetCategory === cat.id ? "default" : "outline"}
                    onClick={() => setPresetCategory(cat.id)}
                    className={`h-6 text-[11px] px-2.5 rounded-full font-medium transition-all ${
                      presetCategory === cat.id
                        ? "shadow-sm"
                        : "border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat.label} ({cat.count})
                  </Button>
                ))}
              </div>

              {/* Grid elegante e rolável com os cards de modelos */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-[160px] overflow-y-auto pr-1">
                {filteredPresets.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className={`text-left p-2 rounded-lg border text-xs transition-all flex flex-col justify-between h-[56px] ${
                        isSelected
                          ? "bg-primary/10 border-primary text-primary font-semibold ring-1 ring-primary/40 shadow-xs"
                          : "bg-background border-slate-200 dark:border-slate-800 hover:border-primary/50 hover:bg-slate-100/70 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full gap-1">
                        <span className="font-semibold truncate text-[11px]">{preset.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-0.5 truncate w-full">
                        <span className="truncate">{preset.categoryLabel}</span>
                        {preset.defaultDate && (
                          <span className="shrink-0 text-[9px] opacity-75 hidden sm:inline">📅</span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {filteredPresets.length === 0 && (
                  <div className="col-span-full py-4 text-center text-xs text-muted-foreground">
                    Nenhum modelo encontrado para "{presetSearch}".
                  </div>
                )}
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="noticeEventDate" className="text-xs font-semibold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Data / Horário do Evento
                  </Label>
                  <Button
                    type="button"
                    variant={showCalendarPicker ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowCalendarPicker(!showCalendarPicker)}
                    className="h-5 text-[10px] px-2 font-medium"
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    {showCalendarPicker ? "Fechar" : "📅 Calendário"}
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="noticeEventDate"
                    value={noticeEventDate}
                    onChange={(e) => setNoticeEventDate(e.target.value)}
                    placeholder="Ex: Domingo às 19h00 ou escolha no calendário"
                    className="text-sm pr-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCalendarPicker(!showCalendarPicker)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                    title="Abrir calendário para escolher data e horário"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                </div>

                {/* PAINEL INTERATIVO DE CALENDÁRIO */}
                {showCalendarPicker && (
                  <div className="p-3 bg-muted/50 border border-primary/40 rounded-xl space-y-2 mt-2 shadow-sm animate-in fade-in-50">
                    <div className="flex items-center justify-between border-b pb-1">
                      <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                        <span>🗓️</span> Escolha a Data no Calendário
                      </span>
                      <span className="text-[9px] text-muted-foreground">Formatação automática</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Data</Label>
                        <Input
                          type="date"
                          value={calendarDate}
                          onChange={(e) => {
                            setCalendarDate(e.target.value)
                            handleApplyCalendarDateTime(e.target.value, calendarTime)
                          }}
                          className="h-7 text-xs bg-background"
                        />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px] text-muted-foreground">Horário</Label>
                        <Input
                          type="time"
                          value={calendarTime}
                          onChange={(e) => {
                            setCalendarTime(e.target.value)
                            handleApplyCalendarDateTime(calendarDate, e.target.value)
                          }}
                          className="h-7 text-xs bg-background"
                        />
                      </div>
                    </div>

                    {/* Atalhos rápidos de cultos */}
                    <div className="pt-1 border-t space-y-1">
                      <span className="text-[9px] font-semibold text-muted-foreground block">Atalhos de Cultos:</span>
                      <div className="flex flex-wrap gap-1">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleQuickCalendarOption('domingo_noite')}
                          className="h-5 text-[9px] px-1.5"
                        >
                          ⛪ Próx. Domingo (19h)
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleQuickCalendarOption('domingo_manha')}
                          className="h-5 text-[9px] px-1.5"
                        >
                          ☀️ Domingo Manhã (09h)
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleQuickCalendarOption('terca')}
                          className="h-5 text-[9px] px-1.5"
                        >
                          📖 Terça (19h30)
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleQuickCalendarOption('sexta')}
                          className="h-5 text-[9px] px-1.5"
                        >
                          🔥 Sexta (20h)
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
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
