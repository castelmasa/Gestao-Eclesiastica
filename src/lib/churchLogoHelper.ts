/**
 * Utilitário central para recuperação e renderização do Logo Oficial da Igreja,
 * cabeçalhos timbrados seguros com contenção de margem e assinaturas para relatórios (jsPDF).
 */
import type { jsPDF } from "jspdf"

export function getRegisteredChurchLogo(activeBranchId?: string): string | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null

    // 1. Tenta da congregação ativa se não for sede/all
    if (activeBranchId && activeBranchId !== "sede" && activeBranchId !== "all") {
      const branchRaw = localStorage.getItem(`churchConfig_${activeBranchId}`)
      if (branchRaw) {
        try {
          const parsed = JSON.parse(branchRaw)
          if (parsed.logoDataUrl && typeof parsed.logoDataUrl === "string" && parsed.logoDataUrl.startsWith("data:image")) {
            return parsed.logoDataUrl
          }
        } catch {}
      }
    }

    // 2. Tenta da configuração global da Igreja (Sede)
    const globalRaw = localStorage.getItem("churchConfig")
    if (globalRaw) {
      try {
        const parsed = JSON.parse(globalRaw)
        if (parsed.logoDataUrl && typeof parsed.logoDataUrl === "string" && parsed.logoDataUrl.startsWith("data:image")) {
          return parsed.logoDataUrl
        }
      } catch {}
    }

    // 3. Tenta do banco de logos personalizados armazenados
    const logosRaw = localStorage.getItem("churchLogos")
    if (logosRaw) {
      try {
        const parsed = JSON.parse(logosRaw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          const active = parsed.find((l: any) => l.active) || parsed[0]
          if (active?.dataUrl && typeof active.dataUrl === "string" && active.dataUrl.startsWith("data:image")) {
            return active.dataUrl
          }
        }
      } catch {}
    }

    // 4. Fallback para chave isolada
    const directLogo = localStorage.getItem("churchLogoDataUrl")
    if (directLogo && directLogo.startsWith("data:image")) {
      return directLogo
    }
  } catch (err) {
    console.warn("Erro ao buscar logo da igreja:", err)
  }
  return null
}

/**
 * Insere com segurança o logotipo da igreja em um documento jsPDF.
 * Retorna true se a imagem foi adicionada com sucesso.
 */
export function drawChurchLogoInPdf(
  doc: jsPDF,
  logoUrl: string | null | undefined,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  if (!logoUrl || typeof logoUrl !== "string" || !logoUrl.startsWith("data:image")) {
    return false
  }

  try {
    let format = "PNG"
    if (logoUrl.startsWith("data:image/jpeg") || logoUrl.startsWith("data:image/jpg")) {
      format = "JPEG"
    } else if (logoUrl.startsWith("data:image/webp")) {
      format = "WEBP"
    }

    doc.addImage(logoUrl, format, x, y, width, height, undefined, "FAST")
    return true
  } catch (err) {
    console.warn("Aviso ao desenhar logo da igreja no PDF:", err)
    return false
  }
}

export interface ChurchReportHeaderOptions {
  title: string
  subtitle?: string
  churchData?: any
  activeBranchId?: string
  activeBranchName?: string
  leftMargin?: number
  rightMargin?: number
  topY?: number
}

/**
 * Desenha o cabeçalho oficial institucional em jsPDF com reajuste automático
 * de tamanho de fonte e quebra de linhas, GARANTINDO que o nome da igreja e
 * os dados NUNCA ultrapassem a margem direita da folha A4 (Anexo 1).
 */
export function drawSafeChurchReportHeader(
  doc: jsPDF,
  options: ChurchReportHeaderOptions
): { nextY: number; lineY: number } {
  const leftMargin = options.leftMargin ?? 14
  const rightMargin = options.rightMargin ?? 14
  const topY = options.topY ?? 10
  const pageWidth = doc.internal.pageSize.getWidth() // 210mm
  const maxRightX = pageWidth - rightMargin // 196mm

  const rawChurchName = options.churchData?.nome || "IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO"
  const branchLabel = options.activeBranchName || "Sede"
  const address = options.churchData?.endereco
    ? `${options.churchData.endereco} - ${options.churchData?.cidade || "Valparaíso - SP"}`
    : "Valparaíso - SP"
  const cnpj = options.churchData?.cnpj ? `CNPJ: ${options.churchData.cnpj}` : ""

  const logoUrl = options.churchData?.logoDataUrl || getRegisteredChurchLogo(options.activeBranchId)
  let textX = leftMargin

  // Desenha logo se disponível
  if (logoUrl) {
    const logoW = 20
    const logoH = 18
    const added = drawChurchLogoInPdf(doc, logoUrl, leftMargin, topY, logoW, logoH)
    if (added) {
      textX = leftMargin + logoW + 4 // 38mm
    }
  }

  const maxTextWidth = maxRightX - textX // ~158mm

  // 1ª Linha: Nome limpo da igreja + congregação
  let cleanChurchName = rawChurchName.replace(/\s*-\s*(2ª|1ª|\d+ª)?\s*congrega[çc][ãa]o/gi, "").trim()
  let mainHeader = cleanChurchName.toUpperCase()
  if (branchLabel && branchLabel !== "Sede" && branchLabel !== "all") {
    mainHeader = `${mainHeader} - ${branchLabel.toUpperCase()}`
  }

  // Ajuste inteligente da fonte para não ultrapassar a margem à direita
  doc.setFont("helvetica", "bold")
  let headerFontSize = 11.5
  doc.setFontSize(headerFontSize)
  while (doc.getTextWidth(mainHeader) > maxTextWidth && headerFontSize > 8) {
    headerFontSize -= 0.5
    doc.setFontSize(headerFontSize)
  }

  doc.setTextColor(0, 0, 0)
  if (doc.getTextWidth(mainHeader) > maxTextWidth) {
    // Se ainda for muito longo mesmo em 8pt, quebra em linhas elegantes
    const lines = doc.splitTextToSize(mainHeader, maxTextWidth)
    doc.text(lines, textX, topY + 4, { lineHeightFactor: 1.15 })
  } else {
    doc.text(mainHeader, textX, topY + 4.5)
  }

  // 2ª Linha: Endereço e CNPJ
  const addressLine = `${address}${cnpj ? ` | ${cnpj}` : ""}`
  doc.setFont("helvetica", "normal")
  let subFontSize = 8
  doc.setFontSize(subFontSize)
  while (doc.getTextWidth(addressLine) > maxTextWidth && subFontSize > 6.5) {
    subFontSize -= 0.5
    doc.setFontSize(subFontSize)
  }
  doc.setTextColor(60, 60, 60)
  if (doc.getTextWidth(addressLine) > maxTextWidth) {
    const addressLines = doc.splitTextToSize(addressLine, maxTextWidth)
    doc.text(addressLines, textX, topY + 10.5, { lineHeightFactor: 1.15 })
  } else {
    doc.text(addressLine, textX, topY + 10.5)
  }

  // Linhas divisórias timbradas A4 (preto sólido + cinza sutil)
  const lineY = logoUrl ? topY + 20 : topY + 16
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.6)
  doc.line(leftMargin, lineY, maxRightX, lineY)

  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.2)
  doc.line(leftMargin, lineY + 1, maxRightX, lineY + 1)

  // Título e Subtítulo do Relatório
  let currentY = lineY + 7
  doc.setFont("helvetica", "bold")
  doc.setFontSize(11)
  doc.setTextColor(0, 0, 0)
  doc.text(options.title, leftMargin, currentY, { maxWidth: pageWidth - 2 * leftMargin })

  if (options.subtitle) {
    currentY += 5
    doc.setFont("helvetica", "normal")
    doc.setFontSize(8.5)
    doc.setTextColor(60, 60, 60)
    doc.text(options.subtitle, leftMargin, currentY, { maxWidth: pageWidth - 2 * leftMargin })
  }

  return {
    nextY: currentY + 6,
    lineY: lineY
  }
}

/**
 * Desenha o bloco padrão e elegante de assinaturas do Pastor e do Tesoureiro
 * no rodapé do relatório financeiro impresso/PDF, com linhas de assinatura
 * proporcionais e declaração formal de conformidade contábil.
 */
export function drawFinancialReportSignatures(
  doc: jsPDF,
  churchConfig?: any,
  preferredY?: number
): number {
  const pageHeight = doc.internal.pageSize.getHeight() // 297mm A4
  const footerMargin = 22
  const signatureHeight = 32

  let y = preferredY || (pageHeight - signatureHeight - footerMargin)

  // Se o y ultrapassar o espaço disponível na página atual, salta para nova página
  if (y + signatureHeight > pageHeight - footerMargin) {
    doc.addPage()
    y = 35
  }

  const pastorName = churchConfig?.pastorTitular || "Pastor Presidente / Titular"
  const tesoureiroName = churchConfig?.tesoureiro1 || "1º Tesoureiro(a) Geral"

  // Declaração de idoneidade
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(70, 70, 70)
  doc.text(
    "Declaro para os devidos fins que as informações acima conferem com os livros e comprovantes arquivados na secretaria/tesouraria.",
    105,
    y - 2,
    { maxWidth: 175, align: "center" }
  )

  // Coordenadas das assinaturas
  const leftStart = 20
  const leftEnd = 95
  const leftCenter = (leftStart + leftEnd) / 2

  const rightStart = 115
  const rightEnd = 190
  const rightCenter = (rightStart + rightEnd) / 2

  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.4)

  // Assinatura do Pastor
  doc.line(leftStart, y + 14, leftEnd, y + 14)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text(pastorName.toUpperCase(), leftCenter, y + 19, { align: "center", maxWidth: 75 })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(80, 80, 80)
  doc.text("Pastor Presidente / Titular", leftCenter, y + 23, { align: "center" })

  // Assinatura do Tesoureiro
  doc.line(rightStart, y + 14, rightEnd, y + 14)
  doc.setFont("helvetica", "bold")
  doc.setFontSize(9)
  doc.setTextColor(0, 0, 0)
  doc.text(tesoureiroName.toUpperCase(), rightCenter, y + 19, { align: "center", maxWidth: 75 })
  doc.setFont("helvetica", "normal")
  doc.setFontSize(7.5)
  doc.setTextColor(80, 80, 80)
  doc.text("1º Tesoureiro(a) Geral", rightCenter, y + 23, { align: "center" })

  return y + signatureHeight
}
