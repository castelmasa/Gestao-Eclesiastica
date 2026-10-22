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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  ClipboardList, 
  Printer, 
  Download, 
  Plus, 
  Trash2, 
  User, 
  Calendar, 
  HeartHandshake, 
  ShieldCheck, 
  Building2,
  CheckCircle2,
  Sparkles
} from "lucide-react"
import { toast } from "sonner"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { getRegisteredChurchLogo, drawSafeChurchReportHeader } from "@/lib/churchLogoHelper"
import { useBranch } from "@/contexts/BranchContext"

export interface VisitRecord {
  id: string
  date: string
  type: string
  responsible: string
  notes: string
  scripture?: string
  prayerRequest?: string
  nextVisitDate?: string
  status?: string
}

interface FichaVisitasAcompanhamentoModalProps {
  isOpen: boolean
  onClose: () => void
  member?: any
  members?: any[]
  churchData?: any
  onSaveRecord?: (memberId: string, record: VisitRecord) => void
}

export function FichaVisitasAcompanhamentoModal({
  isOpen,
  onClose,
  member: initialMember,
  members = [],
  churchData,
  onSaveRecord,
}: FichaVisitasAcompanhamentoModalProps) {
  const { activeBranch, activeBranchName } = useBranch()
  const printableRef = useRef<HTMLDivElement>(null)

  // Membro selecionado ou modo em branco
  const [selectedMemberId, setSelectedMemberId] = useState<string>(initialMember?.id || "manual")
  const selectedMember = useMemo(() => {
    if (selectedMemberId === "manual") return initialMember || null
    return members.find(m => m.id === selectedMemberId) || null
  }, [selectedMemberId, members, initialMember])

  // Dados do formulário para exibição / impressão
  const [nome, setNome] = useState(initialMember?.name || initialMember?.nome || "")
  const [telefone, setTelefone] = useState(initialMember?.phone || initialMember?.telefone || "")
  const [endereco, setEndereco] = useState(initialMember?.address || initialMember?.endereco || "")
  const [bairro, setBairro] = useState(initialMember?.bairro || "")
  const [cidade, setCidade] = useState(initialMember?.cidade || "Valparaíso - SP")
  const [situacao, setSituacao] = useState(initialMember?.role || "Membro Ativo")
  const [pastorResponsavel, setPastorResponsavel] = useState(churchData?.pastorTitular || churchData?.pastorPresidente || "Pr. Presidente")

  // Histórico de Visitas (combina os cadastrados no membro com novos)
  const [records, setRecords] = useState<VisitRecord[]>(() => {
    const comms: any[] = initialMember?.communications || []
    if (comms.length > 0) {
      return comms.map((c: any, idx: number) => ({
        id: c.id || String(idx),
        date: c.date || new Date().toISOString().split("T")[0],
        type: c.type || "Visita Pastoral",
        responsible: c.responsible || "Pastor",
        notes: c.notes || "",
        scripture: c.scripture || "",
        prayerRequest: c.prayerRequest || "",
        nextVisitDate: c.nextVisitDate || "",
      }))
    }
    return []
  })

  // Formulário para adicionar nova visita rapidamente
  const [showAddForm, setShowAddForm] = useState(false)
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split("T")[0])
  const [newType, setNewType] = useState("Visita Domiciliar")
  const [newResponsible, setNewResponsible] = useState(pastorResponsavel)
  const [newNotes, setNewNotes] = useState("")
  const [newScripture, setNewScripture] = useState("")
  const [newPrayer, setNewPrayer] = useState("")
  const [newNextDate, setNewNextDate] = useState("")

  // Atualizar quando mudar o membro
  const handleSelectMember = (id: string) => {
    setSelectedMemberId(id)
    if (id === "manual") {
      setNome("")
      setTelefone("")
      setEndereco("")
      setBairro("")
      setCidade("Valparaíso - SP")
      setSituacao("[ ] Membro  [ ] Visitante")
      setRecords([])
      return
    }
    const m = members.find(x => x.id === id)
    if (m) {
      setNome(m.name || m.nome || "")
      setTelefone(m.phone || m.telefone || "")
      setEndereco(m.address || m.endereco || "")
      setBairro(m.bairro || "")
      setCidade(m.cidade || "Valparaíso - SP")
      setSituacao(m.role || "Membro Ativo")

      const comms: any[] = m.communications || []
      if (comms.length > 0) {
        setRecords(comms.map((c: any, idx: number) => ({
          id: c.id || String(idx),
          date: c.date || new Date().toISOString().split("T")[0],
          type: c.type || "Visita Pastoral",
          responsible: c.responsible || "Pastor",
          notes: c.notes || "",
          scripture: c.scripture || "",
          prayerRequest: c.prayerRequest || "",
          nextVisitDate: c.nextVisitDate || "",
        })))
      } else {
        setRecords([])
      }
      toast.info(`Dados de ${m.name || m.nome} carregados na ficha de visita!`)
    }
  }

  // Adicionar novo registro de visita
  const handleAddRecord = () => {
    if (!newNotes.trim()) {
      toast.error("Por favor, informe as observações da visita.")
      return
    }

    const rec: VisitRecord = {
      id: "visita_" + Date.now(),
      date: newDate,
      type: newType,
      responsible: newResponsible || pastorResponsavel,
      notes: newNotes.trim(),
      scripture: newScripture.trim(),
      prayerRequest: newPrayer.trim(),
      nextVisitDate: newNextDate,
    }

    const updated = [rec, ...records]
    setRecords(updated)

    if (selectedMember && onSaveRecord) {
      onSaveRecord(selectedMember.id, rec)
    }

    setNewNotes("")
    setNewScripture("")
    setNewPrayer("")
    setNewNextDate("")
    setShowAddForm(false)
    toast.success("Registro de visita adicionado à ficha!")
  }

  // Remover registro
  const handleDeleteRecord = (id: string) => {
    setRecords(records.filter(r => r.id !== id))
    toast.info("Registro removido da visualização.")
  }

  // Exportar PDF oficial A4
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      const churchName = churchData?.nomeIgreja || "IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO"
      const pastorName = churchData?.pastorTitular || pastorResponsavel || "Pastor Titular"

      // Cabeçalho Oficial
      const headerResult = drawSafeChurchReportHeader(doc, {
        title: "FICHA OFICIAL DE ACOMPANHAMENTO PASTORAL & VISITAS",
        subtitle: `${churchName} | Gabinete Pastoral & Secretaria`,
        churchData,
        activeBranchId: activeBranch,
        activeBranchName: activeBranchName,
      })

      let curY = headerResult?.nextY || 46

      // Seção 1: Dados do Membro / Família
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(30, 41, 59)
      doc.text("1. IDENTIFICAÇÃO DA PESSOA / FAMÍLIA ATENDIDA", 14, curY)
      curY += 2

      autoTable(doc, {
        startY: curY,
        body: [
          [
            { content: `Nome Completo: ${nome || "___________________________________________"}`, colSpan: 2 },
            { content: `Situação / Cargo: ${situacao || "Membro"}`, colSpan: 1 },
            { content: `Telefone: ${telefone || "(__) _____-____"}`, colSpan: 1 },
          ],
          [
            { content: `Endereço: ${endereco || "___________________________________________"}`, colSpan: 2 },
            { content: `Bairro: ${bairro || "__________"}` },
            { content: `Cidade/UF: ${cidade || "__________"}` },
          ],
        ],
        theme: "grid",
        styles: { fontSize: 8.5, cellPadding: 2.2, textColor: [30, 41, 59] },
        columnStyles: {
          0: { cellWidth: 60 },
          1: { cellWidth: 45 },
          2: { cellWidth: 40 },
          3: { cellWidth: 37 },
        },
      })

      curY = (doc as any).lastAutoTable.finalY + 5

      // Seção 2: Histórico de Visitas
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(30, 41, 59)
      doc.text("2. HISTÓRICO DE VISITAS E ATENDIMENTOS MINISTRADOS", 14, curY)
      curY += 2

      const tableRows: any[] = []

      // Registros reais
      records.forEach((r, idx) => {
        tableRows.push([
          String(idx + 1),
          r.date ? new Date(r.date + "T00:00:00").toLocaleDateString("pt-BR") : "__/__/____",
          r.type || "Visita Domiciliar",
          r.responsible || pastorName,
          `${r.notes}${r.scripture ? ` (Ref: ${r.scripture})` : ""}${r.prayerRequest ? ` | Alvo: ${r.prayerRequest}` : ""}`,
          r.nextVisitDate ? new Date(r.nextVisitDate + "T00:00:00").toLocaleDateString("pt-BR") : "___/___/____",
        ])
      })

      // Linhas pautadas em branco adicionais para preenchimento manual durante visitas
      const blankRowsNeeded = Math.max(3, 6 - records.length)
      for (let i = 0; i < blankRowsNeeded; i++) {
        tableRows.push([
          String(records.length + i + 1),
          "___ / ___ / ______",
          "[ ] Domiciliar\n[ ] Gabinete",
          "",
          "",
          "___ / ___ / ______",
        ])
      }

      autoTable(doc, {
        startY: curY,
        head: [["Nº", "Data", "Modalidade", "Pastor / Ministro", "Assunto, Passagens Bíblicas & Alvos de Oração", "Próx. Retorno"]],
        body: tableRows,
        theme: "grid",
        headStyles: { fillColor: [40, 50, 65], textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold", halign: "center" },
        styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59], minCellHeight: 10, valign: "middle" },
        columnStyles: {
          0: { cellWidth: 8, halign: "center", fontStyle: "bold" },
          1: { cellWidth: 22, halign: "center" },
          2: { cellWidth: 28 },
          3: { cellWidth: 32 },
          4: { cellWidth: 70 },
          5: { cellWidth: 22, halign: "center" },
        },
        didDrawCell: (data) => {
          if (data.section === 'body') {
            const isBlankRow = data.row.index >= records.length;
            if (isBlankRow) {
              doc.setDrawColor(180, 190, 205);
              doc.setLineWidth(0.18);
              // Coluna Pastor / Ministro: linha horizontal reta limpa na base
              if (data.column.index === 3) {
                const y = data.cell.y + data.cell.height - 2.5;
                doc.line(data.cell.x + 2, y, data.cell.x + data.cell.width - 2, y);
              }
              // Coluna Assunto / Palavra: duas linhas de pauta perfeitamente retas e alinhadas
              if (data.column.index === 4) {
                const y1 = data.cell.y + data.cell.height * 0.46;
                const y2 = data.cell.y + data.cell.height * 0.86;
                doc.line(data.cell.x + 2, y1, data.cell.x + data.cell.width - 2, y1);
                doc.line(data.cell.x + 2, y2, data.cell.x + data.cell.width - 2, y2);
              }
            }
          }
        }
      })

      curY = (doc as any).lastAutoTable.finalY + 6

      // Seção 3: Diagnóstico Pastoral & Encaminhamentos
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")
      doc.text("3. ENCAMINHAMENTOS PASTORAIS & CUIDADO DA IGREJA", 14, curY)
      curY += 2

      autoTable(doc, {
        startY: curY,
        body: [
          [
            {
              content: "[ ] Aconselhamento Conjugal / Familiar    [ ] Discipulado / Batismo nas Águas    [ ] Visita aos Enfermos / Hospitalar\n[ ] Apoio Social (Cesta Básica / Diaconia)    [ ] Inclusão em Célula / Grupo Familiar    [ ] Alvo Urgente no Livro de Oração",
              styles: { fontSize: 8, cellPadding: 2.5 },
            },
          ],
        ],
        theme: "grid",
        tableWidth: 182,
      })

      curY = (doc as any).lastAutoTable.finalY + 12

      // Assinaturas alinhadas com as margens das tabelas (Largura total 182mm: 14mm a 196mm)
      const sigColW = 76
      doc.setDrawColor(80, 80, 80)
      doc.setLineWidth(0.2)
      doc.line(14, curY, 14 + sigColW, curY)
      doc.line(120, curY, 120 + sigColW, curY)

      doc.setFontSize(8)
      doc.setFont("helvetica", "bold")
      doc.setTextColor(30, 41, 59)
      doc.text(nome || "Assinatura do Membro / Familiar", 14 + sigColW / 2, curY + 4, { align: "center" })
      doc.text(pastorName, 120 + sigColW / 2, curY + 4, { align: "center" })

      doc.setFontSize(7)
      doc.setFont("helvetica", "normal")
      doc.setTextColor(100, 116, 139)
      doc.text("Pessoa ou Familiar Atendido", 14 + sigColW / 2, curY + 7.5, { align: "center" })
      doc.text("Pastor Presidente / Ministro Responsável", 120 + sigColW / 2, curY + 7.5, { align: "center" })

      // Rodapé
      doc.text(`Documento Eclesiástico Confidencial • Impresso em ${new Date().toLocaleDateString("pt-BR")}`, 14, 287)

      const safeName = (nome || "visitas").toLowerCase().replace(/[^a-z0-9]/g, "-")
      doc.save(`ficha-visitas-acompanhamento-${safeName}.pdf`)
      toast.success("Ficha de Visitas baixada em PDF com sucesso!")
    } catch (err) {
      console.error(err)
      toast.error("Erro ao gerar PDF da ficha de visitas.")
    }
  }

  // Imprimir no navegador
  const handlePrint = () => {
    toast.info("Iniciando impressão da Ficha de Visitas...")
    try {
      window.focus()
      window.print()
    } catch (e) {
      console.warn("Direct window.print fallback:", e)
    }
    handleExportPDF()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[96vw] max-w-4xl h-[86vh] max-h-[86vh] flex flex-col p-0 gap-0 overflow-hidden my-auto rounded-2xl border shadow-2xl bg-background">
        {/* Header fixo */}
        <DialogHeader className="shrink-0 p-4 pb-3 border-b bg-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shadow-xs">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                  Ficha com Histórico de Visita e Acompanhamento
                  <Badge variant="outline" className="text-[11px] font-semibold border-indigo-300 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/30">
                    Pastoral & Secretaria
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Registro completo de visitas domiciliares, aconselhamentos, alvos de oração e linhas para novas visitas.
                </DialogDescription>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs h-8 gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950"
            >
              <Plus className="w-3.5 h-3.5" />
              {showAddForm ? "Ocultar Cadastro" : "Nova Visita"}
            </Button>
          </div>
        </DialogHeader>

        {/* Conteúdo rolável */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Seletor de Membro ou Ficha em Branco */}
          <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                Selecionar Membro Cadastrado para Puxar Histórico:
              </span>
            </div>
            <div className="w-full sm:w-72">
              <Select value={selectedMemberId} onValueChange={handleSelectMember}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="Selecione um membro..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">✍️ Ficha em Branco (Uso Pastoral de Campo)</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name || m.nome} ({m.role || "Membro"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Painel para Cadastrar Nova Visita */}
          {showAddForm && (
            <div className="p-4 rounded-xl border border-indigo-300 bg-indigo-50/40 dark:bg-indigo-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Registrar Nova Visita / Acompanhamento:
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)} className="h-6 text-[10px]">
                  Cancelar
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Data da Visita</Label>
                  <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-8 text-xs bg-background" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Tipo de Visita</Label>
                  <Select value={newType} onValueChange={setNewType}>
                    <SelectTrigger className="h-8 text-xs bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Visita Domiciliar">Visita Domiciliar</SelectItem>
                      <SelectItem value="Aconselhamento Gabinete">Aconselhamento Gabinete</SelectItem>
                      <SelectItem value="Visita Hospitalar">Visita Hospitalar</SelectItem>
                      <SelectItem value="Oração no Lar">Oração no Lar</SelectItem>
                      <SelectItem value="Atendimento Familiar">Atendimento Familiar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Pastor / Obreiro Visitante</Label>
                  <Input value={newResponsible} onChange={(e) => setNewResponsible(e.target.value)} className="h-8 text-xs bg-background" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold">Assunto / Observações Pastorais *</Label>
                <Textarea 
                  value={newNotes} 
                  onChange={(e) => setNewNotes(e.target.value)} 
                  placeholder="Descreva o motivo do atendimento, aconselhamento ministrado ou situação espiritual..." 
                  className="h-16 text-xs bg-background"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Passagem Bíblica Ministrada</Label>
                  <Input value={newScripture} onChange={(e) => setNewScripture(e.target.value)} placeholder="Ex: Salmo 23, Filipenses 4:6" className="h-8 text-xs bg-background" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Próxima Visita / Retorno</Label>
                  <Input type="date" value={newNextDate} onChange={(e) => setNewNextDate(e.target.value)} className="h-8 text-xs bg-background" />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <Button size="sm" onClick={handleAddRecord} className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                  Salvar Registro de Visita
                </Button>
              </div>
            </div>
          )}

          {/* VISUALIZAÇÃO DA FOLHA OFICIAL A4 */}
          <div className="flex flex-col items-center justify-center p-2 bg-muted/40 rounded-xl">
            <div
              ref={printableRef}
              className="w-full max-w-[210mm] bg-white text-slate-900 shadow-lg p-7 rounded-lg border border-slate-300 font-sans print:shadow-none print:border-none print:m-0 print:p-0"
            >
              {/* Cabeçalho Oficial */}
              <div className="text-center border-b-2 border-slate-900 pb-3 mb-3">
                <div className="text-base font-black tracking-wide uppercase text-slate-900">
                  {churchData?.nomeIgreja || "IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO"}
                </div>
                <div className="text-[11px] font-semibold text-slate-700">
                  GABINETE PASTORAL & SECRETARIA GERAL DE MEMBROS
                </div>
                <div className="mt-1.5 inline-block px-4 py-0.5 bg-slate-100 rounded border border-slate-400 font-black text-xs uppercase tracking-wider text-slate-900">
                  FICHA OFICIAL DE ACOMPANHAMENTO PASTORAL & HISTÓRICO DE VISITAS
                </div>
              </div>

              {/* Bloco 1: Identificação */}
              <div className="mb-3.5">
                <div className="text-[10px] font-black uppercase text-slate-800 bg-slate-100 px-2 py-0.5 border border-slate-300 mb-1">
                  1. Identificação da Pessoa / Família Atendida
                </div>
                <table className="w-full text-xs border border-slate-300 border-collapse">
                  <tbody>
                    <tr className="border-b border-slate-300">
                      <td className="p-1 font-bold w-1/4 bg-slate-50">Nome Completo:</td>
                      <td className="p-1 font-semibold" colSpan={3}>
                        {nome ? (
                          <div className="w-full border-b border-slate-700 min-h-[14px] flex items-end">{nome}</div>
                        ) : (
                          <div className="w-full border-b border-slate-700 min-h-[14px]"></div>
                        )}
                      </td>
                    </tr>
                    <tr className="border-b border-slate-300">
                      <td className="p-1 font-bold bg-slate-50">Situação / Cargo:</td>
                      <td className="p-1">
                        <div className="w-full border-b border-slate-700 min-h-[14px] flex items-end">{situacao || ""}</div>
                      </td>
                      <td className="p-1 font-bold bg-slate-50">Telefone / WhatsApp:</td>
                      <td className="p-1">
                        <div className="w-full border-b border-slate-700 min-h-[14px] flex items-end">{telefone || ""}</div>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-1 font-bold bg-slate-50">Endereço Residencial:</td>
                      <td className="p-1" colSpan={3}>
                        <div className="w-full border-b border-slate-700 min-h-[14px] flex items-end">
                          {endereco ? `${endereco}${bairro ? ` - ${bairro}` : ""}${cidade ? ` - ${cidade}` : ""}` : ""}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bloco 2: Histórico de Visitas */}
              <div className="mb-3.5">
                <div className="text-[10px] font-black uppercase text-slate-800 bg-slate-100 px-2 py-0.5 border border-slate-300 mb-1 flex items-center justify-between">
                  <span>2. Histórico de Visitas e Atendimentos Pastorais</span>
                  <span className="text-[9px] font-normal text-slate-600">
                    {records.length > 0 ? `${records.length} registro(s) anexado(s)` : "Ficha para anotações manuais"}
                  </span>
                </div>

                <table className="w-full text-[10px] border border-slate-300 border-collapse">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300 font-bold text-[9px] text-slate-700 uppercase">
                      <th className="p-1 border-r border-slate-300 w-7 text-center">Nº</th>
                      <th className="p-1 border-r border-slate-300 w-20 text-center">Data</th>
                      <th className="p-1 border-r border-slate-300 w-28 text-left">Modalidade</th>
                      <th className="p-1 border-r border-slate-300 w-32 text-left">Pastor / Visitante</th>
                      <th className="p-1 border-r border-slate-300 text-left">Assunto, Palavra & Oração</th>
                      <th className="p-1 w-20 text-center">Retorno</th>
                      <th className="p-1 w-8 text-center print:hidden">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Registros Existentes */}
                    {records.map((r, idx) => (
                      <tr key={r.id || idx} className="border-b border-slate-300 hover:bg-slate-50">
                        <td className="p-1 border-r border-slate-300 text-center font-bold text-slate-600">{idx + 1}</td>
                        <td className="p-1 border-r border-slate-300 text-center whitespace-nowrap">
                          {r.date ? new Date(r.date + "T00:00:00").toLocaleDateString("pt-BR") : "__/__/____"}
                        </td>
                        <td className="p-1 border-r border-slate-300 font-medium">{r.type}</td>
                        <td className="p-1 border-r border-slate-300">{r.responsible}</td>
                        <td className="p-1 border-r border-slate-300 leading-tight">
                          <div className="font-semibold text-slate-900">{r.notes}</div>
                          {r.scripture && <div className="text-[9px] text-slate-600 italic">Passagem: {r.scripture}</div>}
                          {r.prayerRequest && <div className="text-[9px] text-indigo-700 font-medium">Alvo: {r.prayerRequest}</div>}
                        </td>
                        <td className="p-1 text-center whitespace-nowrap">
                          {r.nextVisitDate ? new Date(r.nextVisitDate + "T00:00:00").toLocaleDateString("pt-BR") : "-"}
                        </td>
                        <td className="p-1 text-center print:hidden">
                          <button
                            type="button"
                            onClick={() => handleDeleteRecord(r.id)}
                            className="text-red-500 hover:text-red-700 p-0.5"
                            title="Remover este registro"
                          >
                            <Trash2 className="w-3 h-3 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {/* Linhas pautadas em branco perfeitamente alinhadas (Conforme Anexo 2) */}
                    {Array.from({ length: Math.max(3, 6 - records.length) }).map((_, i) => (
                      <tr key={`blank-${i}`} className="border-b border-slate-300 min-h-[36px]">
                        <td className="p-1.5 border-r border-slate-300 text-center font-bold text-slate-400">
                          {records.length + i + 1}
                        </td>
                        <td className="p-1.5 border-r border-slate-300 text-center text-slate-400 font-mono text-[9px]">
                          ___ / ___ / ______
                        </td>
                        <td className="p-1.5 border-r border-slate-300 text-slate-500 text-[8.5px] leading-tight">
                          <div>[ ] Domiciliar</div>
                          <div>[ ] Gabinete</div>
                        </td>
                        <td className="p-1.5 border-r border-slate-300">
                          <div className="w-full border-b border-slate-300 min-h-[18px]"></div>
                        </td>
                        <td className="p-1.5 border-r border-slate-300">
                          <div className="space-y-1.5 py-0.5">
                            <div className="w-full border-b border-slate-300 min-h-[8px]"></div>
                            <div className="w-full border-b border-slate-300 min-h-[8px]"></div>
                          </div>
                        </td>
                        <td className="p-1.5 text-center text-slate-400 font-mono text-[9px]">
                          ___ / ___ / ______
                        </td>
                        <td className="p-1 print:hidden"></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Bloco 3: Diagnóstico e Encaminhamentos */}
              <div className="mb-3.5">
                <div className="text-[10px] font-black uppercase text-slate-800 bg-slate-100 px-2 py-0.5 border border-slate-300 mb-1">
                  3. Encaminhamentos Ministeriais & Diagnóstico Espiritual
                </div>
                <div className="border border-slate-300 p-2 text-[9px] space-y-1.5">
                  <div className="grid grid-cols-3 gap-2">
                    <div>[ ] Aconselhamento Conjugal / Família</div>
                    <div>[ ] Discipulado / Batismo nas Águas</div>
                    <div>[ ] Visitação Hospitalar / Enfermos</div>
                    <div>[ ] Ajuda Social (Cesta / Assistência)</div>
                    <div>[ ] Envolvimento em Célula / Grupo</div>
                    <div>[ ] Pedido Urgente de Oração no Altar</div>
                  </div>
                  <div className="pt-1 border-t border-slate-200 flex items-center gap-2">
                    <span className="font-bold">Observações Pastorais Reservadas:</span>
                    <div className="flex-1 border-b border-slate-600 min-h-[14px]"></div>
                  </div>
                </div>
              </div>

              {/* Bloco 4: Assinaturas */}
              <div className="pt-4 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="w-full border-b border-slate-800 min-h-[16px]"></div>
                  <div className="font-bold text-[9px] uppercase mt-1">
                    {nome || "Assinatura da Pessoa / Familiar Atendido"}
                  </div>
                  <div className="text-[7.5px] text-slate-600">Pessoa Atendida ou Representante Familiar</div>
                </div>
                <div>
                  <div className="w-full border-b border-slate-800 min-h-[16px]"></div>
                  <div className="font-bold text-[9px] uppercase mt-1">
                    {pastorResponsavel}
                  </div>
                  <div className="text-[7.5px] text-slate-600">Pastor Titular / Ministro Responsável</div>
                </div>
              </div>

              <div className="flex justify-between items-center text-[7px] text-slate-500 pt-3 mt-2 border-t border-slate-200">
                <span>Documento Eclesiástico Confidencial • Secretaria Geral & Gabinete Pastoral OBPC</span>
                <span className="font-bold uppercase px-1.5 py-0.5 border border-slate-400 bg-slate-50">
                  Via Pastoral de Acompanhamento
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer fixo e sempre visível (Anexo 3) */}
        <DialogFooter className="shrink-0 p-3 sm:p-4 border-t bg-card flex flex-col sm:flex-row items-center justify-between gap-3 z-10 shadow-xs">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Ficha padronizada A4 com histórico completo e linhas de preenchimento.</span>
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
              Imprimir Ficha (A4)
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleExportPDF}
              className="h-9 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
            >
              <Download className="h-3.5 w-3.5" />
              Salvar em PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
