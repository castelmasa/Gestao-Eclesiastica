import React, { useState, useMemo, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Droplet, 
  Printer, 
  Download, 
  Save, 
  UserCheck, 
  ShieldCheck, 
  Calendar, 
  User, 
  Phone, 
  MapPin, 
  FileText,
  AlertCircle,
  Sparkles
} from "lucide-react"
import { toast } from "sonner"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { getRegisteredChurchLogo, drawSafeChurchReportHeader } from "@/lib/churchLogoHelper"
import { useBranch } from "@/contexts/BranchContext"

export interface CandidatoBatismo {
  id: string
  // Dados Pessoais
  nome: string
  dataNascimento: string
  idade?: number
  isMenorDeIdade: boolean
  cpf: string
  rg: string
  telefone: string
  email?: string
  endereco: string
  bairro?: string
  cidade?: string
  estado?: string
  estadoCivil: string
  nomeMae?: string
  nomePai?: string
  
  // Dados Espirituais
  dataConversao: string
  nomeDiscipulador: string
  turmaDiscipulado?: string
  testemunho?: string
  
  // Autorização dos Pais (se menor)
  autorizacaoPais: boolean
  nomeResponsavel?: string
  parentescoResponsavel?: string
  documentoResponsavel?: string
  dataAutorizacao?: string
  
  // Dados do Ato Batismal
  dataPrevistaBatismo: string
  localBatismo: string
  pastorOficiante: string
  livroBatismo?: string
  folhaBatismo?: string
  parecerPastoral?: "Apto" | "Em Preparo" | "Pendente"
  observacoes?: string
  
  // Metadados
  criadoEm: string
  branchId?: string
}

interface FichaCandidatoBatismoModalProps {
  isOpen: boolean
  onClose: () => void
  members?: any[]
  churchData?: any
  onCandidateSaved?: (candidate: CandidatoBatismo) => void
  initialMember?: any
}

export function FichaCandidatoBatismoModal({
  isOpen,
  onClose,
  members = [],
  churchData,
  onCandidateSaved,
  initialMember,
}: FichaCandidatoBatismoModalProps) {
  const { activeBranch, activeBranchName } = useBranch()
  const printableRef = useRef<HTMLDivElement>(null)

  // Estado do Candidato
  const [selectedMemberId, setSelectedMemberId] = useState<string>(initialMember?.id || "manual")
  const [nome, setNome] = useState(initialMember?.name || initialMember?.nome || "")
  const [dataNascimento, setDataNascimento] = useState(initialMember?.dataNascimento || initialMember?.birthDate || "")
  const [isMenorDeIdade, setIsMenorDeIdade] = useState(false)
  const [cpf, setCpf] = useState(initialMember?.cpf || "")
  const [rg, setRg] = useState(initialMember?.rg || "")
  const [telefone, setTelefone] = useState(initialMember?.phone || initialMember?.telefone || "")
  const [email, setEmail] = useState(initialMember?.email || "")
  const [endereco, setEndereco] = useState(initialMember?.address || initialMember?.endereco || "")
  const [bairro, setBairro] = useState(initialMember?.bairro || "")
  const [cidade, setCidade] = useState(initialMember?.cidade || "")
  const [estado, setEstado] = useState(initialMember?.estado || "SP")
  const [estadoCivil, setEstadoCivil] = useState(initialMember?.maritalStatus || initialMember?.estadoCivil || "Solteiro(a)")
  const [nomeMae, setNomeMae] = useState(initialMember?.nomeMae || "")
  const [nomePai, setNomePai] = useState(initialMember?.nomePai || "")

  // Dados Espirituais
  const [dataConversao, setDataConversao] = useState("")
  const [nomeDiscipulador, setNomeDiscipulador] = useState("")
  const [turmaDiscipulado, setTurmaDiscipulado] = useState("Turma de Batismo 2026")
  const [testemunho, setTestemunho] = useState("")

  // Autorização dos Pais
  const [autorizacaoPais, setAutorizacaoPais] = useState(false)
  const [nomeResponsavel, setNomeResponsavel] = useState("")
  const [parentescoResponsavel, setParentescoResponsavel] = useState("Mãe")
  const [documentoResponsavel, setDocumentoResponsavel] = useState("")

  // Dados do Batismo
  const [dataPrevistaBatismo, setDataPrevistaBatismo] = useState("")
  const [localBatismo, setLocalBatismo] = useState("Tanque Batismal - Templo Sede")
  const [pastorOficiante, setPastorOficiante] = useState(churchData?.pastorTitular || "Pr. Presidente")
  const [livroBatismo, setLivroBatismo] = useState("")
  const [folhaBatismo, setFolhaBatismo] = useState("")
  const [parecerPastoral, setParecerPastoral] = useState<"Apto" | "Em Preparo" | "Pendente">("Apto")
  const [observacoes, setObservacoes] = useState("")

  // Modo de visualização: Formulário de preenchimento ou Prévia Oficial A4
  const [viewMode, setViewMode] = useState<"form" | "preview">("form")

  // Calcular idade automaticamente ao alterar data de nascimento
  const idadeCalculada = useMemo(() => {
    if (!dataNascimento) return null
    const birth = new Date(dataNascimento)
    if (isNaN(birth.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return age
  }, [dataNascimento])

  // Atualizar isMenorDeIdade automaticamente se dataNascimento for preenchida
  const handleDataNascimentoChange = (val: string) => {
    setDataNascimento(val)
    if (!val) return
    const birth = new Date(val)
    if (!isNaN(birth.getTime())) {
      const today = new Date()
      let age = today.getFullYear() - birth.getFullYear()
      const m = today.getMonth() - birth.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--
      }
      if (age < 18) {
        setIsMenorDeIdade(true)
      } else {
        setIsMenorDeIdade(false)
      }
    }
  }

  // Preenchimento com base em membro selecionado
  const handleSelectMember = (id: string) => {
    setSelectedMemberId(id)
    if (id === "manual") return
    const m = members.find((x) => x.id === id)
    if (m) {
      setNome(m.nome || m.name || "")
      const bDate = m.birthDate || m.dataNascimento || ""
      setDataNascimento(bDate)
      handleDataNascimentoChange(bDate)
      setCpf(m.cpf || "")
      setRg(m.rg || "")
      setTelefone(m.phone || m.telefone || "")
      setEmail(m.email || "")
      setEndereco(m.address || m.endereco || "")
      setBairro(m.bairro || "")
      setCidade(m.cidade || "")
      setEstado(m.estado || "SP")
      setEstadoCivil(m.maritalStatus || m.estadoCivil || "Solteiro(a)")
      setNomeMae(m.nomeMae || "")
      setNomePai(m.nomePai || "")
      toast.info(`Dados de ${m.nome || m.name} carregados para a ficha!`)
    }
  }

  // Salvar Ficha de Candidato no sistema
  const handleSave = () => {
    if (!nome.trim()) {
      toast.error("Por favor, informe o nome completo do candidato.")
      return
    }
    if (!dataConversao) {
      toast.error("Por favor, preencha a data de conversão.")
      return
    }
    if (!nomeDiscipulador.trim()) {
      toast.error("Por favor, informe o nome do discipulador responsável.")
      return
    }
    if (isMenorDeIdade && !autorizacaoPais) {
      toast.error("Candidato menor de 18 anos exige confirmação de autorização dos pais/responsáveis.")
      return
    }

    const candidato: CandidatoBatismo = {
      id: "batismo_" + Date.now(),
      nome,
      dataNascimento,
      idade: idadeCalculada ?? undefined,
      isMenorDeIdade,
      cpf,
      rg,
      telefone,
      email,
      endereco,
      bairro,
      cidade,
      estado,
      estadoCivil,
      nomeMae,
      nomePai,
      dataConversao,
      nomeDiscipulador,
      turmaDiscipulado,
      testemunho,
      autorizacaoPais,
      nomeResponsavel: isMenorDeIdade ? nomeResponsavel : undefined,
      parentescoResponsavel: isMenorDeIdade ? parentescoResponsavel : undefined,
      documentoResponsavel: isMenorDeIdade ? documentoResponsavel : undefined,
      dataAutorizacao: isMenorDeIdade ? new Date().toISOString().split("T")[0] : undefined,
      dataPrevistaBatismo,
      localBatismo,
      pastorOficiante,
      livroBatismo,
      folhaBatismo,
      parecerPastoral,
      observacoes,
      criadoEm: new Date().toISOString(),
      branchId: activeBranch !== "all" ? activeBranch : "sede",
    }

    try {
      const existing = JSON.parse(localStorage.getItem("church_candidatos_batismo") || "[]")
      existing.unshift(candidato)
      localStorage.setItem("church_candidatos_batismo", JSON.stringify(existing))

      if (onCandidateSaved) {
        onCandidateSaved(candidato)
      }

      toast.success("Ficha do candidato ao batismo salva com sucesso na Secretaria!")
      setViewMode("preview")
    } catch (e) {
      console.error(e)
      toast.error("Erro ao salvar candidato ao batismo.")
    }
  }

  // Exportar Ficha Oficial para PDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const churchName = churchData?.nomeIgreja || "IGREJA EVANGÉLICA"
      const pastorName = churchData?.pastorTitular || pastorOficiante || "Pastor Presidente"

      // Cabeçalho Oficial
      const headerResult = drawSafeChurchReportHeader(doc, {
        title: "FICHA OFICIAL DE CANDIDATO AO BATISMO NAS ÁGUAS",
        subtitle: `${churchName} | Secretaria Geral & Discipulado`,
        churchData,
        activeBranchId: activeBranch,
        activeBranchName: activeBranchName,
      })

      let curY = headerResult?.nextY || 46

      // Seção 1: Dados do Candidato
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(30, 41, 59)
      doc.text("1. DADOS PESSOAIS DO CANDIDATO", 14, curY)
      curY += 2

      autoTable(doc, {
        startY: curY,
        body: [
          [
            { content: `Nome Completo: ${nome || "_________________________________________"}`, colSpan: 2 },
            { content: `Nascimento: ${dataNascimento ? new Date(dataNascimento).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "__/__/____"} (${idadeCalculada !== null ? `${idadeCalculada} anos` : "___"})`, colSpan: 1 },
            { content: `Menor de Idade: ${isMenorDeIdade ? "SIM [X]" : "NÃO [ ]"}`, colSpan: 1 }
          ],
          [
            { content: `CPF: ${cpf || "___.___.___-__"}` },
            { content: `RG: ${rg || "__________"}` },
            { content: `Estado Civil: ${estadoCivil}` },
            { content: `Telefone: ${telefone || "(__) _____-____"}` }
          ],
          [
            { content: `Endereço: ${endereco || "________________________"}`, colSpan: 2 },
            { content: `Bairro: ${bairro || "__________"}` },
            { content: `Cidade/UF: ${cidade ? `${cidade}/${estado}` : "__________"}` }
          ],
          [
            { content: `Filiação (Mãe): ${nomeMae || "___________________________________"}`, colSpan: 2 },
            { content: `Filiação (Pai): ${nomePai || "___________________________________"}`, colSpan: 2 }
          ]
        ],
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 45 },
          2: { cellWidth: 45 },
          3: { cellWidth: 42 }
        }
      })

      curY = (doc as any).lastAutoTable.finalY + 6

      // Seção 2: Dados Espirituais e Discipulado
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text("2. DADOS ESPIRITUAIS E DISCIPULADO BÍBLICO", 14, curY)
      curY += 2

      autoTable(doc, {
        startY: curY,
        body: [
          [
            { content: `Data de Conversão à Fé: ${dataConversao ? new Date(dataConversao).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "__/__/____"}` },
            { content: `Discipulador(a) Responsável: ${nomeDiscipulador || "________________________"}` },
            { content: `Turma / Período: ${turmaDiscipulado || "__________"}` }
          ],
          [
            { 
              content: `Declaração de Fé / Testemunho:\n${testemunho || "Declaro publicamente ter aceito ao Senhor Jesus Cristo como único e suficiente Salvador da minha vida, desejando cumprir a ordenança bíblica do Santo Batismo nas Águas em testemunho da minha nova vida e fé."}`, 
              colSpan: 3 
            }
          ]
        ],
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [30, 41, 59] }
      })

      curY = (doc as any).lastAutoTable.finalY + 6

      // Seção 3: Autorização de Menor (se aplicável)
      if (isMenorDeIdade || autorizacaoPais) {
        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(180, 20, 20)
        doc.text("3. TERMO DE AUTORIZAÇÃO DOS PAIS / RESPONSÁVEIS (MENOR DE IDADE)", 14, curY)
        curY += 2

        autoTable(doc, {
          startY: curY,
          body: [
            [
              { content: `Responsável Legal: ${nomeResponsavel || "______________________________________"}` },
              { content: `Grau de Parentesco: ${parentescoResponsavel || "Pai / Mãe"}` },
              { content: `Doc. Identidade: ${documentoResponsavel || "________________"}` }
            ],
            [
              {
                content: `TERMO DE CONSENTIMENTO:\nEu, acima qualificado(a), na qualidade de responsável legal pelo(a) menor ${nome || "mencionado(a)"}, AUTORIZO EXPRESSAMENTE a sua preparação, participação nos estudos de discipulado e a realização do BATISMO NAS ÁGUAS, ciente de suas implicações espirituais e doutrinárias.`,
                colSpan: 3
              }
            ]
          ],
          theme: "grid",
          styles: { fontSize: 8, cellPadding: 2, textColor: [30, 41, 59] }
        })

        curY = (doc as any).lastAutoTable.finalY + 6
      }

      // Seção 4: Dados da Celebração do Batismo & Parecer
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(30, 41, 59)
      doc.text("4. DADOS DO ATO BATISMAL & REGISTRO ECLESIÁSTICO", 14, curY)
      curY += 2

      autoTable(doc, {
        startY: curY,
        body: [
          [
            { content: `Data Prevista: ${dataPrevistaBatismo ? new Date(dataPrevistaBatismo).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "__/__/____"}` },
            { content: `Local: ${localBatismo || "Tanque Batismal"}` },
            { content: `Parecer: [ ${parecerPastoral === "Apto" ? "X" : " "} ] APTO   [ ${parecerPastoral === "Em Preparo" ? "X" : " "} ] EM PREPARO` }
          ],
          [
            { content: `Pastor Oficiante: ${pastorOficiante || pastorName}`, colSpan: 2 },
            { content: `Livro nº: ${livroBatismo || "___"} | Folha: ${folhaBatismo || "___"}` }
          ]
        ],
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 2, textColor: [30, 41, 59] }
      })

      curY = (doc as any).lastAutoTable.finalY + 16

      // Campo de Assinaturas
      if (curY > 235) {
        doc.addPage()
        curY = 30
      }

      doc.setFontSize(8)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(50, 50, 50)

      if (isMenorDeIdade) {
        // 3 colunas de assinaturas
        const colW = 56
        const yLine = curY + 12
        // Candidato
        doc.line(14, yLine, 14 + colW, yLine)
        doc.text("Assinatura do Candidato", 14 + colW / 2, yLine + 4, { align: "center" })
        // Responsável
        doc.line(76, yLine, 76 + colW, yLine)
        doc.text("Assinatura do Pai/Responsável", 76 + colW / 2, yLine + 4, { align: "center" })
        // Pastor
        doc.line(138, yLine, 138 + colW, yLine)
        doc.text("Pastor / Discipulador", 138 + colW / 2, yLine + 4, { align: "center" })
      } else {
        // 2 colunas
        const colW = 80
        const yLine = curY + 14
        doc.line(18, yLine, 18 + colW, yLine)
        doc.text("Assinatura do(a) Candidato(a)", 18 + colW / 2, yLine + 4, { align: "center" })

        doc.line(112, yLine, 112 + colW, yLine)
        doc.text("Visto Pastoral / Discipulador", 112 + colW / 2, yLine + 4, { align: "center" })
      }

      // Rodapé Oficial
      doc.setFontSize(7.5)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(110, 110, 110)
      doc.text(`Documento Eclesiástico Oficial | Emitido em ${new Date().toLocaleDateString("pt-BR")}`, 14, 288)

      const safeName = (nome || "candidato").toLowerCase().replace(/[^a-z0-9]/g, "-")
      doc.save(`ficha-candidato-batismo-${safeName}.pdf`)
      toast.success("PDF da Ficha de Batismo baixado com sucesso!")
    } catch (err) {
      console.error(err)
      toast.error("Erro ao gerar PDF da ficha.")
    }
  }

  // Imprimir documento formatado diretamente no navegador com garantia de PDF
  const handlePrint = () => {
    toast.info("Processando impressão da Ficha de Batismo...")
    try {
      window.focus()
      window.print()
    } catch (e) {
      console.warn("Direct window.print failed:", e)
    }
    handleExportPDF()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold shadow-xs">
                <Droplet className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  Ficha de Candidato ao Batismo nas Águas
                  <Badge variant="outline" className="text-[11px] font-semibold border-sky-300 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/30">
                    Secretaria & Discipulado
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Preenchimento cadastral completo, acompanhamento de discipulado bíblico e autorização para menores.
                </DialogDescription>
              </div>
            </div>

            {/* Alternador de abas Form / Preview */}
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setViewMode("form")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "form"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Formulário
              </button>
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === "preview"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Visualizar Ficha A4
              </button>
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {viewMode === "form" ? (
            <div className="space-y-6">
              {/* Seleção rápida de membro existente */}
              <div className="p-3.5 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span className="text-xs font-semibold text-sky-900 dark:text-sky-200">
                    Vincular a Membro ou Novo Convertido Já Cadastrado:
                  </span>
                </div>
                <div className="w-full sm:w-72">
                  <Select value={selectedMemberId} onValueChange={handleSelectMember}>
                    <SelectTrigger className="h-8 text-xs bg-background">
                      <SelectValue placeholder="Selecione um membro cadastrado..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">✍️ Preenchimento Manual / Novo Candidato</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.nome || m.name} ({m.role || "Membro"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* SEÇÃO 1: DADOS PESSOAIS */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground border-b pb-1.5">
                  <User className="h-4 w-4 text-primary" />
                  1. Dados Pessoais do Candidato
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs font-semibold">Nome Completo *</Label>
                    <Input
                      placeholder="Nome completo do candidato"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Data de Nascimento</Label>
                      {idadeCalculada !== null && (
                        <span className={`text-[10px] font-bold ${isMenorDeIdade ? "text-amber-600" : "text-muted-foreground"}`}>
                          {idadeCalculada} anos {isMenorDeIdade && "(Menor)"}
                        </span>
                      )}
                    </div>
                    <Input
                      type="date"
                      value={dataNascimento}
                      onChange={(e) => handleDataNascimentoChange(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">CPF</Label>
                    <Input
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => setCpf(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">RG</Label>
                    <Input
                      placeholder="Número do RG"
                      value={rg}
                      onChange={(e) => setRg(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Estado Civil</Label>
                    <Select value={estadoCivil} onValueChange={setEstadoCivil}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Solteiro(a)">Solteiro(a)</SelectItem>
                        <SelectItem value="Casado(a)">Casado(a)</SelectItem>
                        <SelectItem value="Divorciado(a)">Divorciado(a)</SelectItem>
                        <SelectItem value="Viúvo(a)">Viúvo(a)</SelectItem>
                        <SelectItem value="União Estável">União Estável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
                    <Input
                      placeholder="(00) 00000-0000"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">E-mail</Label>
                    <Input
                      type="email"
                      placeholder="candidato@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Filiação (Mãe)</Label>
                    <Input
                      placeholder="Nome da mãe"
                      value={nomeMae}
                      onChange={(e) => setNomeMae(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Filiação (Pai)</Label>
                    <Input
                      placeholder="Nome do pai"
                      value={nomePai}
                      onChange={(e) => setNomePai(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs font-semibold">Endereço Residencial</Label>
                    <Input
                      placeholder="Rua, número, complemento"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Bairro e Cidade</Label>
                    <Input
                      placeholder="Ex: Centro - São Paulo/SP"
                      value={cidade ? `${bairro ? `${bairro}, ` : ""}${cidade}` : ""}
                      onChange={(e) => {
                        const val = e.target.value
                        setCidade(val)
                      }}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: DADOS ESPIRITUAIS E DISCIPULADO */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground border-b pb-1.5">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  2. Dados Espirituais & Discipulado
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Data de Conversão *</Label>
                    <Input
                      type="date"
                      value={dataConversao}
                      onChange={(e) => setDataConversao(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">Quando aceitou a Jesus ou se reconciliou.</p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Nome do Discipulador(a) *</Label>
                    <Input
                      placeholder="Líder ou discipulador responsável"
                      value={nomeDiscipulador}
                      onChange={(e) => setNomeDiscipulador(e.target.value)}
                      className="h-9 text-xs"
                      required
                    />
                    <p className="text-[10px] text-muted-foreground">Ministrador do curso de batismo.</p>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Turma / Período</Label>
                    <Input
                      placeholder="Ex: Turma 1 - 2026"
                      value={turmaDiscipulado}
                      onChange={(e) => setTurmaDiscipulado(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-xs font-semibold">Declaração de Fé / Testemunho Breve</Label>
                    <Textarea
                      placeholder="Declaração do candidato expressando sua decisão pessoal de seguir a Cristo..."
                      value={testemunho}
                      onChange={(e) => setTestemunho(e.target.value)}
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* SEÇÃO 3: AUTORIZAÇÃO DOS PAIS (SE MENOR DE IDADE) */}
              <div className="space-y-3 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/15">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-amber-900 dark:text-amber-300">
                    <ShieldCheck className="h-4 w-4 text-amber-600" />
                    3. Autorização dos Pais ou Responsáveis Legais (Candidato Menor de Idade)
                  </h3>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="chkMenor"
                      checked={isMenorDeIdade}
                      onCheckedChange={(checked) => setIsMenorDeIdade(Boolean(checked))}
                    />
                    <Label htmlFor="chkMenor" className="text-xs font-semibold text-amber-900 dark:text-amber-200 cursor-pointer">
                      Candidato Menor de Idade (&lt; 18 anos)
                    </Label>
                  </div>
                </div>

                <p className="text-xs text-amber-800 dark:text-amber-300/80">
                  Para candidatos com menos de 18 anos, é obrigatório registrar a autorização expressa dos pais ou representantes legais conforme o Estatuto da Igreja e legislação vigente.
                </p>

                {isMenorDeIdade && (
                  <div className="pt-2 space-y-3 border-t border-amber-200/80 dark:border-amber-900/40">
                    <div className="flex items-start gap-2.5 p-2 rounded-lg bg-amber-100/60 dark:bg-amber-950/40">
                      <Checkbox
                        id="chkAutorizacao"
                        checked={autorizacaoPais}
                        onCheckedChange={(checked) => setAutorizacaoPais(Boolean(checked))}
                        className="mt-0.5"
                      />
                      <Label htmlFor="chkAutorizacao" className="text-xs font-bold text-amber-950 dark:text-amber-100 cursor-pointer leading-relaxed">
                        Declaro que os pais/responsáveis legais autorizaram expressamente a participação nos estudos bíblicos preparatórios e o Batismo nas Águas.
                      </Label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1 sm:col-span-1">
                        <Label className="text-xs font-semibold">Nome do Responsável Legal</Label>
                        <Input
                          placeholder="Nome do pai, mãe ou tutor"
                          value={nomeResponsavel}
                          onChange={(e) => setNomeResponsavel(e.target.value)}
                          className="h-9 text-xs bg-background"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Grau de Parentesco</Label>
                        <Select value={parentescoResponsavel} onValueChange={setParentescoResponsavel}>
                          <SelectTrigger className="h-9 text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mãe">Mãe</SelectItem>
                            <SelectItem value="Pai">Pai</SelectItem>
                            <SelectItem value="Tutor Legal">Tutor Legal / Guardião</SelectItem>
                            <SelectItem value="Avô/Avó">Avô / Avó</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">CPF ou RG do Responsável</Label>
                        <Input
                          placeholder="Documento do responsável"
                          value={documentoResponsavel}
                          onChange={(e) => setDocumentoResponsavel(e.target.value)}
                          className="h-9 text-xs bg-background"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SEÇÃO 4: DADOS DO ATO BATISMAL */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold flex items-center gap-2 text-foreground border-b pb-1.5">
                  <Droplet className="h-4 w-4 text-sky-600" />
                  4. Dados do Ato Batismal & Registro Eclesiástico
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Data Prevista do Batismo</Label>
                    <Input
                      type="date"
                      value={dataPrevistaBatismo}
                      onChange={(e) => setDataPrevistaBatismo(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Local / Tanque Batismal</Label>
                    <Input
                      placeholder="Templo Sede / Chácara"
                      value={localBatismo}
                      onChange={(e) => setLocalBatismo(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Pastor Celebrante</Label>
                    <Input
                      placeholder="Pr. Celebrante"
                      value={pastorOficiante}
                      onChange={(e) => setPastorOficiante(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Parecer Pastoral</Label>
                    <Select value={parecerPastoral} onValueChange={(val: any) => setParecerPastoral(val)}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Apto">✓ Apto para o Batismo</SelectItem>
                        <SelectItem value="Em Preparo">⏳ Em Discipulado / Preparo</SelectItem>
                        <SelectItem value="Pendente">⚠️ Pendente / Acompanhamento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Livro de Batismos nº</Label>
                    <Input
                      placeholder="Ex: 01"
                      value={livroBatismo}
                      onChange={(e) => setLivroBatismo(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Folha / Registro nº</Label>
                    <Input
                      placeholder="Ex: 14"
                      value={folhaBatismo}
                      onChange={(e) => setFolhaBatismo(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs font-semibold">Observações Complementares</Label>
                    <Input
                      placeholder="Anotações internas da secretaria ou testemunho"
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* VISUALIZAÇÃO IMPRESSA / PRÉVIA A4 */
            <div className="flex flex-col items-center justify-center p-2 bg-muted/40 rounded-xl">
              <div
                ref={printableRef}
                className="w-full max-w-[210mm] bg-white text-slate-900 shadow-lg p-8 rounded-lg border border-slate-300 font-sans print:shadow-none print:border-none print:m-0 print:p-0"
              >
                {/* Cabeçalho */}
                <div className="text-center border-b-2 border-slate-800 pb-3 mb-4">
                  <div className="text-lg font-black tracking-wide uppercase text-slate-900">
                    {churchData?.nomeIgreja || "IGREJA EVANGÉLICA"}
                  </div>
                  <div className="text-xs font-semibold text-slate-700">
                    SECRETARIA GERAL & MINISTÉRIO DE DISCIPULADO
                  </div>
                  <div className="mt-2 inline-block px-4 py-1 bg-slate-100 rounded border border-slate-400 font-bold text-xs uppercase tracking-wider text-slate-900">
                    FICHA OFICIAL DE CANDIDATO AO BATISMO NAS ÁGUAS
                  </div>
                </div>

                {/* 1. Dados Pessoais */}
                <div className="mb-4">
                  <div className="text-[11px] font-black uppercase text-slate-800 bg-slate-100 px-2 py-0.5 border border-slate-300 mb-1.5">
                    1. Dados Pessoais do Candidato
                  </div>
                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="p-1.5 font-bold w-1/4 bg-slate-50">Nome Completo:</td>
                        <td className="p-1.5 font-semibold" colSpan={3}>{nome || "___________________________________________"}</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-1.5 font-bold bg-slate-50">Nascimento:</td>
                        <td className="p-1.5">{dataNascimento ? new Date(dataNascimento).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "___/___/______"} {idadeCalculada !== null && `(${idadeCalculada} anos)`}</td>
                        <td className="p-1.5 font-bold bg-slate-50">Menor de Idade:</td>
                        <td className="p-1.5">{isMenorDeIdade ? "SIM [X]" : "NÃO [ ]"}</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-1.5 font-bold bg-slate-50">CPF / RG:</td>
                        <td className="p-1.5">{cpf || "___.___.___-__"} / {rg || "________"}</td>
                        <td className="p-1.5 font-bold bg-slate-50">Estado Civil:</td>
                        <td className="p-1.5">{estadoCivil}</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-1.5 font-bold bg-slate-50">Telefone / E-mail:</td>
                        <td className="p-1.5" colSpan={3}>{telefone || "(__) _____-____"} | {email || "-"}</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-1.5 font-bold bg-slate-50">Endereço Residencial:</td>
                        <td className="p-1.5" colSpan={3}>{endereco || "________________________"} - {cidade || "Cidade"}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold bg-slate-50">Filiação:</td>
                        <td className="p-1.5" colSpan={3}>
                          Mãe: {nomeMae || "________________________"} | Pai: {nomePai || "________________________"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 2. Dados Espirituais */}
                <div className="mb-4">
                  <div className="text-[11px] font-black uppercase text-slate-800 bg-slate-100 px-2 py-0.5 border border-slate-300 mb-1.5">
                    2. Discipulado Bíblico & Testemunho de Fé
                  </div>
                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="p-1.5 font-bold w-1/4 bg-slate-50">Data de Conversão:</td>
                        <td className="p-1.5">{dataConversao ? new Date(dataConversao).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "___/___/______"}</td>
                        <td className="p-1.5 font-bold bg-slate-50">Discipulador(a):</td>
                        <td className="p-1.5">{nomeDiscipulador || "________________________"}</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-1.5 font-bold bg-slate-50">Classe / Período:</td>
                        <td className="p-1.5" colSpan={3}>{turmaDiscipulado}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold bg-slate-50 align-top">Testemunho / Fé:</td>
                        <td className="p-1.5 leading-relaxed" colSpan={3}>
                          {testemunho || "Declaro publicamente minha fé no Senhor Jesus Cristo como único Salvador e Senhor da minha vida. Reconheço o batismo bíblico por imersão como confissão pública e obediência à ordenança do Evangelho."}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 3. Termo de Autorização (Menor) */}
                {(isMenorDeIdade || autorizacaoPais) && (
                  <div className="mb-4">
                    <div className="text-[11px] font-black uppercase text-red-900 bg-red-50 px-2 py-0.5 border border-red-300 mb-1.5">
                      3. Termo de Autorização dos Pais / Responsáveis Legais (Menor de 18 Anos)
                    </div>
                    <div className="p-2.5 border border-red-300 bg-red-50/30 rounded text-xs space-y-1.5 leading-relaxed">
                      <p>
                        Eu, <strong>{nomeResponsavel || "___________________________________________"}</strong>, portador(a) do documento <strong>{documentoResponsavel || "_________________"}</strong>, na qualidade de <strong>{parentescoResponsavel || "Pai/Mãe/Responsável"}</strong> do(a) candidato(a) menor <strong>{nome || "_________________________"}</strong>, autorizo de livre e espontânea vontade sua participação nos estudos e a realização do seu BATISMO NAS ÁGUAS.
                      </p>
                      <div className="pt-4 flex justify-between items-center text-[10px]">
                        <span>Data: {new Date().toLocaleDateString("pt-BR")}</span>
                        <div className="text-center">
                          <div className="w-56 border-t border-slate-700 pt-1">Assinatura do Pai / Mãe / Responsável Legal</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. Ato Batismal */}
                <div className="mb-5">
                  <div className="text-[11px] font-black uppercase text-slate-800 bg-slate-100 px-2 py-0.5 border border-slate-300 mb-1.5">
                    4. Registro Eclesiástico do Batismo
                  </div>
                  <table className="w-full text-xs border border-slate-300 border-collapse">
                    <tbody>
                      <tr className="border-b border-slate-300">
                        <td className="p-1.5 font-bold w-1/4 bg-slate-50">Data do Batismo:</td>
                        <td className="p-1.5">{dataPrevistaBatismo ? new Date(dataPrevistaBatismo).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "___/___/______"}</td>
                        <td className="p-1.5 font-bold bg-slate-50">Local / Tanque:</td>
                        <td className="p-1.5">{localBatismo}</td>
                      </tr>
                      <tr className="border-b border-slate-300">
                        <td className="p-1.5 font-bold bg-slate-50">Pastor Oficiante:</td>
                        <td className="p-1.5">{pastorOficiante}</td>
                        <td className="p-1.5 font-bold bg-slate-50">Parecer Pastoral:</td>
                        <td className="p-1.5 font-bold">{parecerPastoral}</td>
                      </tr>
                      <tr>
                        <td className="p-1.5 font-bold bg-slate-50">Livro de Batismos:</td>
                        <td className="p-1.5" colSpan={3}>Livro nº: {livroBatismo || "___"} | Folha: {folhaBatismo || "___"}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Assinaturas */}
                <div className="pt-6 grid grid-cols-2 gap-8 text-center text-xs">
                  <div>
                    <div className="border-t border-slate-800 pt-1 font-bold">
                      {nome || "Assinatura do(a) Candidato(a)"}
                    </div>
                    <div className="text-[10px] text-slate-600">Candidato ao Batismo</div>
                  </div>
                  <div>
                    <div className="border-t border-slate-800 pt-1 font-bold">
                      {pastorOficiante || churchData?.pastorTitular || "Pastor Presidente"}
                    </div>
                    <div className="text-[10px] text-slate-600">Pastor Celebrante / Visto da Secretaria</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer com botões de ação */}
        <DialogFooter className="p-4 border-t bg-card flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            {isMenorDeIdade ? (
              <span className="text-amber-600 font-semibold flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                Candidato menor de idade: Termo de autorização ativo
              </span>
            ) : (
              <span>Candidato maior de 18 anos</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" onClick={onClose} className="h-9 text-xs">
              Fechar
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="h-9 text-xs gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir Ficha
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="h-9 text-xs gap-1.5 text-sky-700 dark:text-sky-300 border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
            >
              <Download className="h-3.5 w-3.5" />
              Baixar PDF
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              className="h-9 text-xs gap-1.5 bg-primary text-primary-foreground font-semibold"
            >
              <Save className="h-3.5 w-3.5" />
              Salvar na Secretaria
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
