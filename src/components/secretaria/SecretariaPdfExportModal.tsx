import React, { useState, useMemo } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Printer,
  FileDown,
  Building2,
  Users,
  Filter,
  Eye,
  CheckCircle2,
  Calendar,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { toast } from "sonner"

interface SecretariaPdfExportModalProps {
  isOpen: boolean
  onClose: () => void
  members: any[]
  branches: any[]
  activeBranch: string
  activeBranchName: string
  churchData?: any
  userName?: string
}

export function SecretariaPdfExportModal({
  isOpen,
  onClose,
  members,
  branches,
  activeBranch,
  activeBranchName,
  churchData,
  userName = "Administrador",
}: SecretariaPdfExportModalProps) {
  // Configurações do Relatório
  const [reportTitle, setReportTitle] = useState("RELATÓRIO GERAL DE MEMBROS E CONGREGADOS")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterBaptism, setFilterBaptism] = useState<string>("all")
  const [filterRole, setFilterRole] = useState<string>("all")
  const [selectedBranch, setSelectedBranch] = useState<string>(activeBranch || "all")
  const [includeStats, setIncludeStats] = useState<boolean>(true)
  const [includeSignatures, setIncludeSignatures] = useState<boolean>(true)
  const [paperOrientation, setPaperOrientation] = useState<"portrait" | "landscape">("portrait")

  // Colunas selecionadas para exibição
  const [columns, setColumns] = useState({
    seq: true,
    name: true,
    cargo: true,
    phone: true,
    birthDate: true,
    batismoAguas: true,
    status: true,
    congregação: true,
    endereco: false,
    cpf: false,
  })

  // Lista filtrada para exportação
  const exportMembers = useMemo(() => {
    return members.filter((m) => {
      // Filtro de status
      if (filterStatus !== "all") {
        const s = (m.status || "Ativo").toLowerCase()
        if (filterStatus === "ativo" && s !== "ativo") return false
        if (filterStatus === "inativo" && s !== "inativo") return false
        if (filterStatus === "disciplina" && s !== "disciplina") return false
      }

      // Filtro de batismo
      if (filterBaptism !== "all") {
        const isBatizado = m.batizadoAguas || m.dataBatismoAguas || m.dataBatismo
        if (filterBaptism === "batizado" && !isBatizado) return false
        if (filterBaptism === "nao_batizado" && isBatizado) return false
      }

      // Filtro de cargo
      if (filterRole !== "all") {
        const c = (m.cargo || m.role || "Membro").toLowerCase()
        if (!c.includes(filterRole.toLowerCase())) return false
      }

      // Filtro de congregação
      if (selectedBranch !== "all") {
        const memberBranch = m.branchId || m.branch || "sede"
        if (memberBranch !== selectedBranch) return false
      }

      return true
    })
  }, [members, filterStatus, filterBaptism, filterRole, selectedBranch])

  // Estatísticas calculadas
  const stats = useMemo(() => {
    const total = exportMembers.length
    const ativos = exportMembers.filter((m) => (m.status || "Ativo").toLowerCase() === "ativo").length
    const inativos = total - ativos
    const batizados = exportMembers.filter((m) => m.batizadoAguas || m.dataBatismoAguas || m.dataBatismo).length
    const homens = exportMembers.filter((m) => (m.sexo || "").toLowerCase().startsWith("m")).length
    const mulheres = exportMembers.filter((m) => (m.sexo || "").toLowerCase().startsWith("f")).length

    return { total, ativos, inativos, batizados, homens, mulheres }
  }, [exportMembers])

  const churchName = churchData?.razaoSocial || churchData?.nome || "IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO"
  const churchSubtitle = churchData?.sigla || "2ª CONGREGAÇÃO DE VALPARAÍSO - SP | SECRETARIA GERAL"
  const churchAddress = churchData?.endereco || "Rua Bartolomeu Bueno, 629 - Valparaíso - SP"
  const churchCnpj = churchData?.cnpj || "43.832.227/0001-44"
  const pastorName = churchData?.pastorTitular || "Pr. Titular"
  const secretarioName = churchData?.secretario1 || churchData?.secretario || "1º Secretário(a)"

  // 1. GERAÇÃO DIRETA DE PDF VIA JSPDF + AUTOTABLE
  const handleDownloadPDF = () => {
    try {
      if (exportMembers.length === 0) {
        toast.error("Nenhum membro encontrado com os filtros selecionados.")
        return
      }

      const doc = new jsPDF({
        orientation: paperOrientation,
        unit: "mm",
        format: "a4",
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()

      // Header Timbre
      doc.setFillColor(30, 41, 59) // Slate escuro elegante
      doc.rect(14, 12, pageWidth - 28, 22, "F")

      doc.setTextColor(255, 255, 255)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(12)
      doc.text(churchName.toUpperCase(), pageWidth / 2, 19, { align: "center" })

      doc.setFont("helvetica", "normal")
      doc.setFontSize(8.5)
      doc.text(`${churchSubtitle} • CNPJ: ${churchCnpj}`, pageWidth / 2, 25, { align: "center" })
      doc.text(churchAddress, pageWidth / 2, 30, { align: "center" })

      // Título do Relatório
      doc.setTextColor(15, 23, 42)
      doc.setFont("helvetica", "bold")
      doc.setFontSize(13)
      doc.text(reportTitle.toUpperCase(), 14, 42)

      // Metadados da Emissão
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      const dataEmissao = new Date().toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
      doc.text(`Emitido em: ${dataEmissao} | Responsável: ${userName} | Congregação: ${activeBranchName}`, 14, 47)

      let startTableY = 52

      // Bloco de Estatísticas Resumidas
      if (includeStats) {
        doc.setFillColor(241, 245, 249)
        doc.roundedRect(14, 50, pageWidth - 28, 14, 2, 2, "F")

        doc.setFont("helvetica", "bold")
        doc.setFontSize(8.5)
        doc.setTextColor(15, 23, 42)

        const statText = `Total: ${stats.total} registros   |   Ativos: ${stats.ativos}   |   Inativos: ${stats.inativos}   |   Batizados: ${stats.batizados}   |   Homens: ${stats.homens}   |   Mulheres: ${stats.mulheres}`
        doc.text(statText, pageWidth / 2, 58.5, { align: "center" })
        startTableY = 68
      }

      // Preparação das Colunas para AutoTable
      const tableHeaders: string[] = []
      if (columns.seq) tableHeaders.push("Nº")
      if (columns.name) tableHeaders.push("Nome Completo")
      if (columns.cargo) tableHeaders.push("Cargo / Função")
      if (columns.phone) tableHeaders.push("Telefone")
      if (columns.birthDate) tableHeaders.push("Nascimento")
      if (columns.batismoAguas) tableHeaders.push("Batismo")
      if (columns.status) tableHeaders.push("Status")
      if (columns.congregação) tableHeaders.push("Congregação")
      if (columns.cpf) tableHeaders.push("CPF")

      const tableRows = exportMembers.map((m, idx) => {
        const row: string[] = []
        if (columns.seq) row.push(String(idx + 1).padStart(3, "0"))
        if (columns.name) row.push(m.name || m.nome || "-")
        if (columns.cargo) row.push(m.cargo || m.role || "Membro")
        if (columns.phone) row.push(m.phone || m.telefone || "-")
        if (columns.birthDate) row.push(m.dataNascimento || m.birthDate || "-")
        if (columns.batismoAguas) {
          const bat = m.batizadoAguas ? "Sim" : m.dataBatismoAguas ? "Sim" : "Não"
          row.push(bat)
        }
        if (columns.status) row.push(m.status || "Ativo")
        if (columns.congregação) {
          const b = branches.find((br) => br.id === (m.branchId || m.branch))
          row.push(b ? b.name : "Sede")
        }
        if (columns.cpf) row.push(m.cpf || "-")
        return row
      })

      autoTable(doc, {
        startY: startTableY,
        head: [tableHeaders],
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          halign: "left",
        },
        bodyStyles: {
          fontSize: 7.5,
          textColor: [30, 41, 59],
          cellPadding: 2,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252],
        },
        margin: { left: 14, right: 14, bottom: includeSignatures ? 38 : 18 },
        didDrawPage: (data) => {
          // Rodapé numerado
          doc.setFontSize(7.5)
          doc.setTextColor(148, 163, 184)
          const pageStr = `Página ${data.pageNumber} de ${doc.getNumberOfPages()}`
          doc.text(pageStr, pageWidth - 14, pageHeight - 8, { align: "right" })
          doc.text(
            `${churchName} • Secretaria Geral • Sistema Oficial de Gestão`,
            14,
            pageHeight - 8
          )
        },
      })

      // Assinaturas no final do documento (se selecionado)
      if (includeSignatures) {
        let finalY = (doc as any).lastAutoTable.finalY + 16

        // Se não houver espaço suficiente para as assinaturas, adiciona nova página
        if (finalY + 25 > pageHeight) {
          doc.addPage()
          finalY = 30
        }

        const signWidth = (pageWidth - 48) / 2

        // Linha 1: 1º Secretário
        doc.setDrawColor(71, 85, 105)
        doc.setLineWidth(0.4)
        doc.line(18, finalY, 18 + signWidth, finalY)

        doc.setFont("helvetica", "bold")
        doc.setFontSize(8.5)
        doc.setTextColor(15, 23, 42)
        doc.text(secretarioName, 18 + signWidth / 2, finalY + 4.5, { align: "center" })

        doc.setFont("helvetica", "normal")
        doc.setFontSize(7.5)
        doc.setTextColor(100, 116, 139)
        doc.text("1º Secretário(a) - Secretaria Geral", 18 + signWidth / 2, finalY + 8.5, { align: "center" })

        // Linha 2: Pastor Titular
        const pastorX = pageWidth - 18 - signWidth
        doc.line(pastorX, finalY, pastorX + signWidth, finalY)

        doc.setFont("helvetica", "bold")
        doc.setFontSize(8.5)
        doc.setTextColor(15, 23, 42)
        doc.text(pastorName, pastorX + signWidth / 2, finalY + 4.5, { align: "center" })

        doc.setFont("helvetica", "normal")
        doc.setFontSize(7.5)
        doc.setTextColor(100, 116, 139)
        doc.text("Pastor Titular / Presidente", pastorX + signWidth / 2, finalY + 8.5, { align: "center" })
      }

      const fileName = `Relatorio_Secretaria_${new Date().toISOString().slice(0, 10)}.pdf`
      doc.save(fileName)
      toast.success("Relatório da Secretaria exportado em PDF com sucesso!")
    } catch (err: any) {
      console.error("Erro ao gerar PDF da Secretaria:", err)
      toast.error("Erro ao gerar PDF: " + (err.message || "Tente novamente."))
    }
  }

  // 2. IMPRESSÃO NATIVA OTIMIZADA (VIA BROWSER COM PREVIEW EXATO + AUTO DOWNLOAD PDF)
  const handlePrint = () => {
    toast.info("Processando impressão do relatório...")
    try {
      window.focus()
      window.print()
    } catch (e) {
      console.warn("Direct window.print failed:", e)
    }
    // Sempre gera e baixa o PDF oficial garantindo que a ação seja executada mesmo em sandbox/iframe
    handleDownloadPDF()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0">
        {/* Painel de Configurações - Oculto na Impressão */}
        <div className="p-6 space-y-5 print:hidden">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <FileDown className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-foreground">
                  Exportar Dados da Secretaria em PDF
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Gere relatórios completos, listagens oficiais e fichas em formato PDF otimizado para impressão A4.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Filtros e Parâmetros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 p-4 rounded-xl border border-border/70 bg-muted/20">
            <div className="space-y-1.5 md:col-span-3">
              <Label className="text-xs font-semibold text-foreground">Título do Relatório</Label>
              <Input
                value={reportTitle}
                onChange={(e) => setReportTitle(e.target.value)}
                placeholder="Ex: RELATÓRIO GERAL DE MEMBROS"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Filtrar por Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="ativo">Apenas Ativos</SelectItem>
                  <SelectItem value="inativo">Apenas Inativos</SelectItem>
                  <SelectItem value="disciplina">Em Disciplina</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Batismo nas Águas</Label>
              <Select value={filterBaptism} onValueChange={setFilterBaptism}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos (Batizados e Não)</SelectItem>
                  <SelectItem value="batizado">Apenas Batizados</SelectItem>
                  <SelectItem value="nao_batizado">Não Batizados (Candidatos)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Congregação / Filial</Label>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Congregações</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-muted-foreground">Orientação do Papel</Label>
              <Select value={paperOrientation} onValueChange={(v: any) => setPaperOrientation(v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="portrait">📄 Retrato (Vertical - A4)</SelectItem>
                  <SelectItem value="landscape">📃 Paisagem (Horizontal - A4)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 pt-4 md:col-span-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeStats"
                  checked={includeStats}
                  onCheckedChange={(c) => setIncludeStats(!!c)}
                />
                <label htmlFor="includeStats" className="text-xs font-medium cursor-pointer">
                  Incluir Resumo Estatístico no Cabeçalho
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeSignatures"
                  checked={includeSignatures}
                  onCheckedChange={(c) => setIncludeSignatures(!!c)}
                />
                <label htmlFor="includeSignatures" className="text-xs font-medium cursor-pointer">
                  Incluir Linhas de Assinatura Pastoral
                </label>
              </div>
            </div>
          </div>

          {/* Seleção de Colunas */}
          <div className="space-y-2 p-3.5 rounded-xl border border-border/70 bg-card">
            <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Campos e Colunas a Incluir na Tabela</span>
              <span className="text-[10px] text-muted-foreground">
                {exportMembers.length} membro(s) selecionado(s)
              </span>
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {[
                { key: "seq", label: "Nº Sequencial" },
                { key: "name", label: "Nome do Membro" },
                { key: "cargo", label: "Cargo / Função" },
                { key: "phone", label: "Telefone / WhatsApp" },
                { key: "birthDate", label: "Data de Nascimento" },
                { key: "batismoAguas", label: "Batismo nas Águas" },
                { key: "status", label: "Status (Ativo/Inat.)" },
                { key: "congregação", label: "Congregação / Filial" },
                { key: "cpf", label: "CPF" },
              ].map((col) => (
                <div key={col.key} className="flex items-center space-x-1.5">
                  <Checkbox
                    id={`col-${col.key}`}
                    checked={(columns as any)[col.key]}
                    onCheckedChange={(c) =>
                      setColumns((prev) => ({ ...prev, [col.key]: !!c }))
                    }
                  />
                  <label htmlFor={`col-${col.key}`} className="text-xs cursor-pointer">
                    {col.label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Banner de Prévia das Estatísticas */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900 border">
              <span className="text-[10px] text-muted-foreground block">Total</span>
              <strong className="text-sm font-bold text-foreground">{stats.total}</strong>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200">
              <span className="text-[10px] text-emerald-600 block">Ativos</span>
              <strong className="text-sm font-bold text-emerald-700">{stats.ativos}</strong>
            </div>
            <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200">
              <span className="text-[10px] text-red-600 block">Inativos</span>
              <strong className="text-sm font-bold text-red-700">{stats.inativos}</strong>
            </div>
            <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200">
              <span className="text-[10px] text-sky-600 block">Batizados</span>
              <strong className="text-sm font-bold text-sky-700">{stats.batizados}</strong>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200">
              <span className="text-[10px] text-blue-600 block">Homens</span>
              <strong className="text-sm font-bold text-blue-700">{stats.homens}</strong>
            </div>
            <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200">
              <span className="text-[10px] text-purple-600 block">Mulheres</span>
              <strong className="text-sm font-bold text-purple-700">{stats.mulheres}</strong>
            </div>
          </div>
        </div>

        {/* ÁREA DE PRÉ-VISUALIZAÇÃO FORMATADA (LAYOUT OTIMIZADO PARA IMPRESSÃO A4) */}
        <div className="border-t border-border bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 overflow-auto">
          <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center justify-between print:hidden">
            <span>Pré-visualização do Relatório (Layout Oficial de Impressão)</span>
            <span className="text-[10px] font-normal text-muted-foreground">
              Formato A4 • {paperOrientation === "portrait" ? "Retrato" : "Paisagem"}
            </span>
          </div>

          <div
            id="printable-secretaria-report"
            className="bg-white text-black p-6 sm:p-8 rounded-lg shadow-sm border border-slate-300 max-w-full mx-auto text-[11px] font-sans print:shadow-none print:border-none print:p-0"
            style={{ minHeight: "260mm" }}
          >
            {/* Cabeçalho Oficial */}
            <div className="border-b-2 border-slate-900 pb-3 mb-4">
              <div className="flex items-center justify-between gap-4">
                <div className="w-16 h-16 border border-slate-300 rounded flex items-center justify-center p-1 bg-slate-50 shrink-0">
                  {churchData?.logoDataUrl ? (
                    <img
                      src={churchData.logoDataUrl}
                      alt="Logo"
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <Building2 className="h-8 w-8 text-slate-700" />
                  )}
                </div>

                <div className="flex-1 text-center">
                  <h1 className="font-extrabold text-sm uppercase tracking-wide text-slate-900">
                    {churchName}
                  </h1>
                  <p className="text-[10px] text-slate-700 font-semibold uppercase mt-0.5">
                    {churchSubtitle}
                  </p>
                  <p className="text-[9px] text-slate-600">
                    {churchAddress} • CNPJ: {churchCnpj}
                  </p>
                </div>

                <div className="text-right shrink-0 text-[9px] text-slate-600 space-y-0.5">
                  <div className="font-bold text-slate-900 uppercase">Secretaria Geral</div>
                  <div>Doc. Oficial nº {new Date().getFullYear()}</div>
                  <div className="font-mono text-[8.5px]">
                    {new Date().toLocaleDateString("pt-BR")}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200 text-center">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  {reportTitle}
                </h2>
                <p className="text-[9px] text-slate-500 mt-0.5">
                  Filtro aplicado: {selectedBranch === "all" ? "Todas as Congregações" : activeBranchName} • Status: {filterStatus}
                </p>
              </div>
            </div>

            {/* Banner de Estatísticas na Impressão */}
            {includeStats && (
              <div className="mb-4 p-2 bg-slate-50 border border-slate-300 rounded text-[9.5px] font-semibold text-slate-800 flex justify-around text-center">
                <div>Total: <strong>{stats.total}</strong></div>
                <div>Ativos: <strong>{stats.ativos}</strong></div>
                <div>Inativos: <strong>{stats.inativos}</strong></div>
                <div>Batizados: <strong>{stats.batizados}</strong></div>
                <div>Homens: <strong>{stats.homens}</strong></div>
                <div>Mulheres: <strong>{stats.mulheres}</strong></div>
              </div>
            )}

            {/* Tabela de Membros */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-slate-300 text-[10px]">
                <thead>
                  <tr className="bg-slate-200 text-slate-900 font-bold border-b border-slate-400">
                    {columns.seq && <th className="p-1.5 border border-slate-300 text-center w-8">Nº</th>}
                    {columns.name && <th className="p-1.5 border border-slate-300 text-left">Nome Completo</th>}
                    {columns.cargo && <th className="p-1.5 border border-slate-300 text-left">Cargo / Função</th>}
                    {columns.phone && <th className="p-1.5 border border-slate-300 text-left">Telefone / WhatsApp</th>}
                    {columns.birthDate && <th className="p-1.5 border border-slate-300 text-center">Nascimento</th>}
                    {columns.batismoAguas && <th className="p-1.5 border border-slate-300 text-center">Batismo</th>}
                    {columns.status && <th className="p-1.5 border border-slate-300 text-center">Status</th>}
                    {columns.congregação && <th className="p-1.5 border border-slate-300 text-left">Congregação</th>}
                    {columns.cpf && <th className="p-1.5 border border-slate-300 text-left">CPF</th>}
                  </tr>
                </thead>
                <tbody>
                  {exportMembers.length > 0 ? (
                    exportMembers.map((m, idx) => (
                      <tr
                        key={m.id || idx}
                        className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                      >
                        {columns.seq && (
                          <td className="p-1 border border-slate-300 text-center font-mono font-medium">
                            {String(idx + 1).padStart(3, "0")}
                          </td>
                        )}
                        {columns.name && (
                          <td className="p-1 border border-slate-300 font-medium">
                            {m.name || m.nome || "-"}
                          </td>
                        )}
                        {columns.cargo && (
                          <td className="p-1 border border-slate-300 uppercase text-[9px]">
                            {m.cargo || m.role || "Membro"}
                          </td>
                        )}
                        {columns.phone && (
                          <td className="p-1 border border-slate-300 font-mono text-[9px]">
                            {m.phone || m.telefone || "-"}
                          </td>
                        )}
                        {columns.birthDate && (
                          <td className="p-1 border border-slate-300 text-center">
                            {m.dataNascimento || m.birthDate || "-"}
                          </td>
                        )}
                        {columns.batismoAguas && (
                          <td className="p-1 border border-slate-300 text-center">
                            {m.batizadoAguas || m.dataBatismoAguas || m.dataBatismo ? "Sim" : "Não"}
                          </td>
                        )}
                        {columns.status && (
                          <td className="p-1 border border-slate-300 text-center">
                            <span
                              className={`px-1 rounded text-[8.5px] font-bold ${
                                (m.status || "Ativo").toLowerCase() === "ativo"
                                  ? "text-emerald-700"
                                  : "text-red-700"
                              }`}
                            >
                              {m.status || "Ativo"}
                            </span>
                          </td>
                        )}
                        {columns.congregação && (
                          <td className="p-1 border border-slate-300 text-[9px]">
                            {branches.find((b) => b.id === (m.branchId || m.branch))?.name || "Sede"}
                          </td>
                        )}
                        {columns.cpf && (
                          <td className="p-1 border border-slate-300 font-mono text-[8.5px]">
                            {m.cpf || "-"}
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={10}
                        className="p-6 text-center text-slate-500 border border-slate-300 italic"
                      >
                        Nenhum registro encontrado para os critérios selecionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Linhas de Assinatura */}
            {includeSignatures && (
              <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center">
                <div>
                  <div className="w-56 mx-auto border-t border-slate-800 pt-1 font-bold text-[10px] uppercase">
                    {secretarioName}
                  </div>
                  <span className="text-[8.5px] text-slate-600 block">
                    1º Secretário(a) • Secretaria Geral
                  </span>
                </div>

                <div>
                  <div className="w-56 mx-auto border-t border-slate-800 pt-1 font-bold text-[10px] uppercase">
                    {pastorName}
                  </div>
                  <span className="text-[8.5px] text-slate-600 block">
                    Pastor Titular / Presidente
                  </span>
                </div>
              </div>
            )}

            {/* Rodapé da Página */}
            <div className="mt-8 pt-2 border-t border-slate-200 flex items-center justify-between text-[8px] text-slate-500">
              <span>
                Documento emitido eletronicamente via Sistema Eclesiástico OBPC em{" "}
                {new Date().toLocaleDateString("pt-BR")}
              </span>
              <span>Página 1 de 1</span>
            </div>
          </div>
        </div>

        {/* Rodapé de Ações - Oculto na Impressão */}
        <DialogFooter className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 print:hidden bg-card">
          <div className="text-xs text-muted-foreground flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Layout configurado para impressão sem cortes ou distorções.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 sm:flex-none">
              Fechar
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handlePrint}
              className="flex-1 sm:flex-none border-border"
            >
              <Printer className="h-4 w-4 mr-1.5 text-blue-600" />
              Imprimir Direto (Ctrl+P)
            </Button>

            <Button
              type="button"
              onClick={handleDownloadPDF}
              className="flex-1 sm:flex-none bg-primary text-primary-foreground font-semibold"
            >
              <FileDown className="h-4 w-4 mr-1.5" />
              Baixar Arquivo PDF (.pdf)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
