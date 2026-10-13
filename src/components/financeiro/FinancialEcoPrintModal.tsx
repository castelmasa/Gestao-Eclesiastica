import React, { useState, useMemo, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Printer, Download, EyeOff, Eye } from "lucide-react"
import { toast } from "sonner"
import { getRegisteredChurchLogo, drawChurchLogoInPdf, drawSafeChurchReportHeader, drawFinancialReportSignatures } from "@/lib/churchLogoHelper"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { printDocument } from "@/lib/printUtils"

interface Transaction {
  id: string
  date: string
  documentNumber?: string
  description: string
  category: string
  type: string
  amount: number
  supplier?: string
  status?: string
  costCenter?: string
}

interface FinancialEcoPrintModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: Transaction[]
  activeBranchName?: string
  initialFilterType?: "all" | "entrada" | "saida"
}

export function FinancialEcoPrintModal({
  isOpen,
  onClose,
  transactions,
  activeBranchName = "Todas as Unidades",
  initialFilterType = "all"
}: FinancialEcoPrintModalProps) {
  // Print settings
  const [filterType, setFilterType] = useState<"all" | "entrada" | "saida">(initialFilterType)
  const [reportFormat, setReportFormat] = useState<"analitico" | "sintetico">("analitico")
  const [showSignatures, setShowSignatures] = useState(true)

  useEffect(() => {
    if (isOpen && initialFilterType) {
      setFilterType(initialFilterType)
    }
  }, [isOpen, initialFilterType])

  // Church config e logo oficial cadastrado
  const [churchConfig, setChurchConfig] = useState<any>(() => {
    try {
      const activeBranch = localStorage.getItem("activeBranch")
      if (activeBranch && activeBranch !== "all" && activeBranch !== "sede") {
        const branchSaved = localStorage.getItem(`churchConfig_${activeBranch}`)
        if (branchSaved) return JSON.parse(branchSaved)
      }
      const globalSaved = localStorage.getItem("churchConfig")
      if (globalSaved) return JSON.parse(globalSaved)
    } catch {}
    return {
      nome: "Igreja Evangélica Pentecostal O Brasil para Cristo",
      endereco: "Rua Bartolomeu Bueno, Nº 629 - Santa Casa",
      cidade: "Valparaíso - SP",
      cnpj: "51.105.484/0001-74",
      pastorTitular: "Pr. Samuel de Oliveira",
      tesoureiro1: "Carlos Roberto"
    }
  })

  const [churchLogo, setChurchLogo] = useState<string | null>(null)

  useEffect(() => {
    const updateLogo = () => {
      const logo = getRegisteredChurchLogo()
      setChurchLogo(logo)

      try {
        const globalSaved = localStorage.getItem("churchConfig")
        if (globalSaved) setChurchConfig(JSON.parse(globalSaved))
      } catch {}
    }
    updateLogo()
    window.addEventListener("churchConfigUpdated", updateLogo)
    window.addEventListener("storage", updateLogo)
    return () => {
      window.removeEventListener("churchConfigUpdated", updateLogo)
      window.removeEventListener("storage", updateLogo)
    }
  }, [isOpen])
  
  // Date range filters (default to current month)
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0]
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0]
  
  const [startDate, setStartDate] = useState(firstDay)
  const [endDate, setEndDate] = useState(lastDay)
  const [periodPreset, setPeriodPreset] = useState("current_month")

  const handlePeriodChange = (val: string) => {
    setPeriodPreset(val)
    const cur = new Date()
    if (val === "current_month") {
      setStartDate(new Date(cur.getFullYear(), cur.getMonth(), 1).toISOString().split("T")[0])
      setEndDate(new Date(cur.getFullYear(), cur.getMonth() + 1, 0).toISOString().split("T")[0])
    } else if (val === "prev_month") {
      setStartDate(new Date(cur.getFullYear(), cur.getMonth() - 1, 1).toISOString().split("T")[0])
      setEndDate(new Date(cur.getFullYear(), cur.getMonth(), 0).toISOString().split("T")[0])
    } else if (val === "year") {
      setStartDate(`${cur.getFullYear()}-01-01`)
      setEndDate(`${cur.getFullYear()}-12-31`)
    } else if (val === "all") {
      setStartDate("")
      setEndDate("")
    }
  }

  // Filtered transactions
  const filteredList = useMemo(() => {
    return transactions.filter(t => {
      // Type
      if (filterType !== "all" && t.type !== filterType) return false
      
      // Date range
      if (t.date) {
        const itemDate = t.date.split("T")[0]
        if (startDate && itemDate < startDate) return false
        if (endDate && itemDate > endDate) return false
      }
      return true
    }).sort((a, b) => (a.date || "").localeCompare(b.date || ""))
  }, [transactions, filterType, startDate, endDate])

  // Totals calculations
  const totals = useMemo(() => {
    let entradas = 0
    let saidas = 0
    filteredList.forEach(t => {
      const val = Number(t.amount) || 0
      if (t.type === "entrada" || t.type === "income") entradas += val
      else saidas += val
    })
    return {
      entradas,
      saidas,
      saldo: entradas - saidas,
      count: filteredList.length
    }
  }, [filteredList])

  // Category grouping for synthetic report and bottom summary
  const categorySummary = useMemo(() => {
    const map: Record<string, { category: string; type: string; total: number; count: number }> = {}
    filteredList.forEach(t => {
      const cat = t.category || "Sem Categoria"
      const type = t.type
      const key = `${type}_${cat}`
      if (!map[key]) {
        map[key] = { category: cat, type, total: 0, count: 0 }
      }
      map[key].total += Number(t.amount) || 0
      map[key].count += 1
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [filteredList])

  const monthLabel = useMemo(() => {
    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ]
    if (!startDate && !endDate) return "Geral"
    if (startDate && endDate) {
      const [sy, sm] = startDate.split('-').map(Number)
      const [ey, em] = endDate.split('-').map(Number)
      const sStr = `${monthNames[sm - 1] || sm}/${sy}`
      const eStr = `${monthNames[em - 1] || em}/${ey}`
      return sStr === eStr ? sStr : `${sStr} a ${eStr}`
    }
    if (startDate) {
      const [sy, sm] = startDate.split('-').map(Number)
      return `${monthNames[sm - 1] || sm}/${sy}`
    }
    return "Geral"
  }, [startDate, endDate])

  const handlePrint = () => {
    toast.info("Processando impressão do relatório financeiro...")
    try {
      printDocument(undefined, undefined, 'financial-eco-print-area')
    } catch {
      window.print()
    }
    handleDownloadPdf()
  }

  const handleDownloadPdf = () => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const typeLabel = filterType === 'entrada' ? 'DE ENTRADAS' : filterType === 'saida' ? 'DE SAÍDAS' : 'CONSOLIDADO';
      const headerRes = drawSafeChurchReportHeader(doc, {
        title: `RELATÓRIO FINANCEIRO ${typeLabel} - ${activeBranchName.toUpperCase()}`,
        subtitle: `Mês de Apuração: ${monthLabel} | Formato: ${reportFormat === 'analitico' ? 'Analítico' : 'Sintético'} | Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
        churchData: churchConfig,
        activeBranchName: activeBranchName,
        leftMargin: 14,
        rightMargin: 14,
        topY: 10
      });

      const tableStartY = headerRes.nextY;

      if (reportFormat === "analitico") {
        // Colunas categoria e status removidas da tabela principal (Anexo 4)
        const bodyRows = filteredList.map(t => {
          const isEntrada = t.type === 'entrada' || t.type === 'income'
          return [
            t.date ? new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-',
            t.documentNumber && t.documentNumber !== '-' ? t.documentNumber : 'S/N',
            isEntrada ? 'ENTRADA' : 'SAÍDA',
            t.supplier ? `${t.description} (${t.supplier})` : (t.description || '-'),
            (isEntrada ? '+ ' : '- ') + (Number(t.amount) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
          ]
        })

        autoTable(doc, {
          startY: tableStartY,
          head: [['Data', 'Nº Doc', 'Tipo', 'Descrição / Histórico / Fornecedor', 'Valor (R$)']],
          body: bodyRows,
          theme: 'grid',
          headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
          styles: { fontSize: 8, cellPadding: 2.5 },
          columnStyles: {
            0: { cellWidth: 26 },
            1: { cellWidth: 26 },
            2: { cellWidth: 24 },
            3: { cellWidth: 76 },
            4: { halign: 'right', fontStyle: 'bold', cellWidth: 30 }
          }
        })

        // Somatória por Tipo de Categoria ao final do relatório (Anexo 3)
        const lastY = (doc as any).lastAutoTable?.finalY || 100
        doc.setFontSize(9.5)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(30, 41, 59)
        doc.text("SOMATÓRIA POR TIPO DE CATEGORIA:", 14, lastY + 7)

        autoTable(doc, {
          startY: lastY + 9,
          head: [['Categoria', 'Tipo', 'Qtd Lançamentos', 'Participação (%)', 'Subtotal (R$)']],
          body: categorySummary.map(cat => {
            const isEntrada = cat.type === 'entrada' || cat.type === 'income'
            const baseTotal = isEntrada ? totals.entradas : totals.saidas
            const pct = baseTotal > 0 ? ((cat.total / baseTotal) * 100).toFixed(1) : "0.0"
            return [
              cat.category,
              isEntrada ? 'ENTRADA' : 'SAÍDA',
              cat.count.toString(),
              `${pct}%`,
              `R$ ${cat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            ]
          }),
          theme: 'grid',
          headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
          styles: { fontSize: 7.5, cellPadding: 2 },
          columnStyles: {
            0: { cellWidth: 68 },
            1: { cellWidth: 26, halign: 'center' },
            2: { cellWidth: 28, halign: 'center' },
            3: { cellWidth: 30, halign: 'center' },
            4: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
          }
        })
      } else {
        const bodyRows = categorySummary.map(cat => [
          cat.type === 'entrada' ? 'ENTRADA' : 'SAÍDA',
          cat.category,
          cat.count.toString(),
          `R$ ${cat.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ])

        autoTable(doc, {
          startY: tableStartY,
          head: [['Tipo', 'Categoria', 'Qtd', 'Subtotal (R$)']],
          body: bodyRows,
          theme: 'grid',
          headStyles: { fillColor: [40, 40, 40], textColor: [255, 255, 255] },
          styles: { fontSize: 8.5 },
          columnStyles: { 3: { halign: 'right', fontStyle: 'bold' } }
        })
      }

      const lastSummaryY = (doc as any).lastAutoTable?.finalY || 140
      autoTable(doc, {
        startY: lastSummaryY + 5,
        head: [['Total Entradas', 'Total Saídas', 'Saldo Operacional Líquido']],
        body: [[
          `+ R$ ${totals.entradas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `- R$ ${totals.saidas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          `R$ ${totals.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]],
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 9, fontStyle: 'bold', halign: 'center' }
      })

      if (showSignatures) {
        const finalPdfY = (doc as any).lastAutoTable?.finalY || 160;
        drawFinancialReportSignatures(doc, churchConfig, finalPdfY + 12);
      }

      doc.save(`relatorio-financeiro-${activeBranchName.toLowerCase().replace(/\s+/g, '-')}.pdf`)
      toast.success("Relatório baixado em PDF com sucesso!")
    } catch (err) {
      console.error(err)
      toast.error("Erro ao gerar PDF.")
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-slate-50 dark:bg-slate-950">
        <DialogHeader className="p-4 bg-white dark:bg-slate-900 border-b shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-foreground">
              <Printer className="w-5 h-5 text-primary" /> Layout de Impressão & Relatório Financeiro Oficial
            </DialogTitle>
            <DialogDescription className="text-xs">
              Visualização fiel em folha A4 com logotipo oficial, somatória separada por categoria e diagramação para impressão e PDF.
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={onClose}>
              Fechar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDownloadPdf}
              className="border-primary/40 text-primary hover:bg-primary/5"
            >
              <Download className="w-4 h-4 mr-1.5" /> Baixar PDF
            </Button>
            <Button size="sm" onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">
              <Printer className="w-4 h-4 mr-1.5" /> Imprimir Relatório (Ctrl+P)
            </Button>
          </div>
        </DialogHeader>

        {/* Filter controls bar (hidden in print) */}
        <div className="p-3 bg-slate-100 dark:bg-slate-900/60 border-b text-xs flex flex-wrap items-center gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-semibold">Período:</Label>
            <Select value={periodPreset} onValueChange={handlePeriodChange}>
              <SelectTrigger className="h-8 text-xs w-[130px] bg-white dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current_month">Mês Atual</SelectItem>
                <SelectItem value="prev_month">Mês Anterior</SelectItem>
                <SelectItem value="year">Ano Atual</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
                <SelectItem value="all">Todo Histórico</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Label className="text-xs">De:</Label>
            <Input 
              type="date" 
              className="h-8 text-xs w-[125px] bg-white dark:bg-slate-800" 
              value={startDate} 
              onChange={e => { setStartDate(e.target.value); setPeriodPreset("custom") }} 
            />
            <Label className="text-xs ml-1">Até:</Label>
            <Input 
              type="date" 
              className="h-8 text-xs w-[125px] bg-white dark:bg-slate-800" 
              value={endDate} 
              onChange={e => { setEndDate(e.target.value); setPeriodPreset("custom") }} 
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-semibold">Tipo:</Label>
            <Select value={filterType} onValueChange={(val: any) => setFilterType(val)}>
              <SelectTrigger className="h-8 text-xs w-[120px] bg-white dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="entrada">Apenas Entradas</SelectItem>
                <SelectItem value="saida">Apenas Saídas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <Label className="text-xs font-semibold">Modelo:</Label>
            <Select value={reportFormat} onValueChange={(val: any) => setReportFormat(val)}>
              <SelectTrigger className="h-8 text-xs w-[120px] bg-white dark:bg-slate-800">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="analitico">Analítico (Detalhado)</SelectItem>
                <SelectItem value="sintetico">Sintético (Por Categoria)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs text-slate-700 dark:text-slate-300"
              onClick={() => setShowSignatures(!showSignatures)}
            >
              {showSignatures ? <Eye className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <EyeOff className="w-3.5 h-3.5 mr-1" />}
              {showSignatures ? "Assinaturas Ativas" : "Sem Assinaturas"}
            </Button>
          </div>
        </div>

        {/* Printable Paper Canvas (White Background, Black Text, Monochromatic Crisp Layout) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200 dark:bg-slate-900/50 flex justify-center">
          <div 
            id="financial-eco-print-area" 
            className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black p-[12mm_15mm] shadow-lg print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none text-xs leading-normal font-sans"
            style={{ color: "#000", backgroundColor: "#fff" }}
          >
            {/* Header Oficial da Igreja Conforme Anexo 1 e Anexo 2 */}
            <div className="border-b-2 border-black pb-2 mb-3">
              <div className="flex items-center justify-between gap-4">
                {churchLogo ? (
                  <img 
                    src={churchLogo} 
                    alt="Logo da Igreja" 
                    className="h-16 max-w-[45mm] object-contain shrink-0" 
                  />
                ) : (
                  <div className="w-14 h-14 border border-dashed border-gray-400 flex items-center justify-center text-[9px] font-bold text-gray-400 shrink-0">
                    LOGO
                  </div>
                )}
                <div className="flex-1 text-center min-w-0 px-2">
                  <h1 className="font-extrabold text-[13px] sm:text-[14px] tracking-tight uppercase leading-snug break-words max-w-[135mm] mx-auto">
                    {churchConfig?.nome || "IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO"}
                  </h1>
                  <p className="text-[9.5px] font-bold tracking-tight uppercase mt-0.5 break-words max-w-[135mm] mx-auto">
                    {churchConfig?.endereco || "RUA BARTOLOMEU BUENO, Nº 629 - SANTA CASA - VALPARAISO - SP"} {churchConfig?.cnpj ? `| CNPJ: ${churchConfig.cnpj}` : ""}
                  </p>
                  <div className="mt-1.5 inline-block border border-black px-4 py-0.5 font-bold uppercase text-[10.5px] bg-gray-100 print:bg-transparent">
                    RELATÓRIO FINANCEIRO {filterType === "entrada" ? "DE ENTRADAS" : filterType === "saida" ? "DE SAÍDAS" : "CONSOLIDADO"} {reportFormat === "analitico" ? "(ANALÍTICO DETALHADO)" : "(SINTÉTICO)"}
                  </div>
                </div>
                {churchLogo ? (
                  <img 
                    src={churchLogo} 
                    alt="" 
                    className="h-16 max-w-[45mm] object-contain shrink-0 opacity-0 pointer-events-none" 
                    aria-hidden="true"
                  />
                ) : (
                  <div className="w-14 h-14 opacity-0 shrink-0 pointer-events-none" aria-hidden="true" />
                )}
              </div>
            </div>

            {/* Metadados do Relatório */}
            <div className="flex justify-between items-center border border-black p-1.5 mb-3 bg-gray-50 print:bg-transparent text-[9.5px]">
              <div>
                <span className="font-bold">Mês de Apuração: </span>
                <span>{monthLabel}</span>
              </div>
              <div>
                <span className="font-bold">Congregação / Unidade: </span>
                <span>{activeBranchName}</span>
              </div>
              <div>
                <span className="font-bold">Emissão: </span>
                <span>{new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            </div>

            {/* Resumo Consolidado */}
            <div className="grid grid-cols-4 gap-2 border border-black p-2 mb-3 text-center">
              <div className="border-r border-black pr-2">
                <div className="text-[8.5px] uppercase font-bold text-gray-700">Total de Entradas</div>
                <div className="text-[13px] font-black mt-0.5">
                  R$ {totals.entradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="border-r border-black pr-2">
                <div className="text-[8.5px] uppercase font-bold text-gray-700">Total de Saídas</div>
                <div className="text-[13px] font-black mt-0.5">
                  R$ {totals.saidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="border-r border-black pr-2">
                <div className="text-[8.5px] uppercase font-bold text-gray-700">Saldo Líquido</div>
                <div className="text-[13px] font-black mt-0.5">
                  R$ {totals.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-[8.5px] uppercase font-bold text-gray-700">Lançamentos</div>
                <div className="text-[13px] font-black mt-0.5">{totals.count}</div>
              </div>
            </div>

            {/* Conteúdo: Tabela Analítica (Sem coluna Categoria e sem coluna Status - Anexo 4) */}
            {reportFormat === "analitico" ? (
              <div className="mb-4">
                <table className="w-full border-collapse border border-black text-[9px]">
                  <thead>
                    <tr className="border-b-2 border-black bg-gray-100 print:bg-transparent font-bold">
                      <th className="border border-black p-1 text-center w-[20mm]">Data</th>
                      <th className="border border-black p-1 text-center w-[18mm]">Nº Doc</th>
                      <th className="border border-black p-1 text-center w-[14mm]">Tipo</th>
                      <th className="border border-black p-1 text-left">Descrição / Histórico / Fornecedor</th>
                      <th className="border border-black p-1 text-right w-[28mm]">Valor (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="border border-black p-4 text-center text-gray-500 font-medium">
                          Nenhuma movimentação registrada no período selecionado.
                        </td>
                      </tr>
                    ) : (
                      filteredList.map((t, idx) => {
                        const isEntrada = t.type === "entrada" || t.type === "income"
                        return (
                          <tr key={t.id || idx} className="border-b border-black">
                            <td className="border border-black p-1 text-center font-mono">
                              {t.date ? new Date(t.date + "T12:00:00").toLocaleDateString("pt-BR") : "-"}
                            </td>
                            <td className="border border-black p-1 text-center font-mono text-[8.5px]">
                              {t.documentNumber && t.documentNumber !== '-' ? t.documentNumber : 'S/N'}
                            </td>
                            <td className="border border-black p-1 text-center font-bold">
                              {isEntrada ? "ENT" : "SAI"}
                            </td>
                            <td className="border border-black p-1 truncate max-w-[85mm]">
                              <span className="font-medium">{t.description || "Sem descrição"}</span>
                              {t.supplier && <span className="text-gray-600 block text-[8px]">{t.supplier}</span>}
                            </td>
                            <td className="border border-black p-1 text-right font-mono font-bold">
                              {isEntrada ? "+" : "-"} R$ {Number(t.amount || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-black font-extrabold bg-gray-100 print:bg-transparent">
                      <td colSpan={4} className="border border-black p-1.5 text-right uppercase text-[9.5px]">
                        {filterType === "entrada" ? "Total Geral de Entradas:" : filterType === "saida" ? "Total Geral de Saídas:" : "Saldo Final do Período:"}
                      </td>
                      <td className="border border-black p-1.5 text-right font-mono text-[10.5px]">
                        R$ {(filterType === "entrada" ? totals.entradas : filterType === "saida" ? totals.saidas : totals.saldo).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              /* Conteúdo: Tabela Sintética por Categorias */
              <div className="mb-4">
                <table className="w-full border-collapse border border-black text-[9.5px]">
                  <thead>
                    <tr className="border-b-2 border-black bg-gray-100 print:bg-transparent font-bold">
                      <th className="border border-black p-1 text-center w-[15mm]">Tipo</th>
                      <th className="border border-black p-1 text-left">Categoria</th>
                      <th className="border border-black p-1 text-center w-[20mm]">Lançamentos</th>
                      <th className="border border-black p-1 text-right w-[28mm]">Participação</th>
                      <th className="border border-black p-1 text-right w-[32mm]">Total (R$)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorySummary.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="border border-black p-4 text-center text-gray-500 font-medium">
                          Nenhuma movimentação registrada no período selecionado.
                        </td>
                      </tr>
                    ) : (
                      categorySummary.map((cat, idx) => {
                        const isEntrada = cat.type === "entrada" || cat.type === "income"
                        const baseTotal = isEntrada ? totals.entradas : totals.saidas
                        const pct = baseTotal > 0 ? ((cat.total / baseTotal) * 100).toFixed(1) : "0.0"
                        return (
                          <tr key={idx} className="border-b border-black">
                            <td className="border border-black p-1 text-center font-bold">
                              {isEntrada ? "ENT" : "SAI"}
                            </td>
                            <td className="border border-black p-1 font-medium">{cat.category}</td>
                            <td className="border border-black p-1 text-center">{cat.count}</td>
                            <td className="border border-black p-1 text-right">{pct}%</td>
                            <td className="border border-black p-1 text-right font-mono font-bold">
                              R$ {cat.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-black font-extrabold bg-gray-100 print:bg-transparent">
                      <td colSpan={4} className="border border-black p-1.5 text-right uppercase text-[9.5px]">
                        Saldo Operacional Líquido:
                      </td>
                      <td className="border border-black p-1.5 text-right font-mono text-[10.5px]">
                        R$ {totals.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Somatória por Tipo de Categoria ao Final do Relatório (Conforme Requisito Anexo 3) */}
            <div className="mb-4 mt-3 avoid-page-break">
              <div className="border border-black bg-gray-100 print:bg-transparent p-1 px-2 font-bold uppercase text-[9.5px] tracking-wide mb-1 flex items-center justify-between">
                <span>Demonstrativo / Somatória por Tipo de Categoria {filterType === "entrada" ? "(Entradas)" : filterType === "saida" ? "(Saídas)" : ""}</span>
                <span className="text-[8.5px] font-normal lowercase text-gray-700 print:text-black">({categorySummary.length} categorias)</span>
              </div>
              <table className="w-full border-collapse border border-black text-[9px]">
                <thead>
                  <tr className="border-b border-black bg-gray-50 print:bg-transparent font-bold">
                    <th className="border border-black p-1 text-left">Categoria</th>
                    <th className="border border-black p-1 text-center w-[20mm]">Tipo</th>
                    <th className="border border-black p-1 text-center w-[24mm]">Qtd Lançamentos</th>
                    <th className="border border-black p-1 text-right w-[28mm]">Participação (%)</th>
                    <th className="border border-black p-1 text-right w-[32mm]">Subtotal (R$)</th>
                  </tr>
                </thead>
                <tbody>
                  {categorySummary.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="border border-black p-2 text-center text-gray-500">
                        Nenhuma categoria encontrada no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    categorySummary.map((cat, idx) => {
                      const isEntrada = cat.type === "entrada" || cat.type === "income"
                      const baseTotal = isEntrada ? totals.entradas : totals.saidas
                      const pct = baseTotal > 0 ? ((cat.total / baseTotal) * 100).toFixed(1) : "0.0"
                      return (
                        <tr key={idx} className="border-b border-black">
                          <td className="border border-black p-1 font-medium">{cat.category}</td>
                          <td className="border border-black p-1 text-center font-bold">{isEntrada ? "ENTRADA" : "SAÍDA"}</td>
                          <td className="border border-black p-1 text-center">{cat.count}</td>
                          <td className="border border-black p-1 text-right">{pct}%</td>
                          <td className="border border-black p-1 text-right font-mono font-bold">
                            R$ {cat.total.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Linhas de Assinatura */}
            {showSignatures && (
              <div className="mt-8 pt-6 border-t border-dashed border-black avoid-page-break">
                <div className="text-center text-[9px] mb-6 font-semibold">
                  Declaro que as informações acima conferem com os livros e comprovantes fiscais arquivados na secretaria da igreja.
                </div>
                <div className="flex justify-between items-end px-8 text-center text-[9px]">
                  <div className="w-[60mm]">
                    <div className="border-b border-black h-8 mb-1"></div>
                    <div className="font-bold uppercase">{churchConfig?.pastorTitular || "Pastor Presidente / Titular"}</div>
                    <div className="text-[8px] text-gray-600">Visto da Liderança</div>
                  </div>
                  <div className="w-[60mm]">
                    <div className="border-b border-black h-8 mb-1"></div>
                    <div className="font-bold uppercase">{churchConfig?.tesoureiro1 || "1º Tesoureiro(a) Geral"}</div>
                    <div className="text-[8px] text-gray-600">Responsável Financeiro</div>
                  </div>
                </div>
              </div>
            )}

            {/* Rodapé Econômico */}
            <div className="mt-6 text-center text-[8px] text-gray-500 border-t border-black/30 pt-1">
              Documento emitido eletronicamente pelo Sistema de Gestão Eclesiástica • Validação interna OBPC
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
