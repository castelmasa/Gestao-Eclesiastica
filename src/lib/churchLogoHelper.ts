/**
 * Utilitário central para recuperação e renderização do Logo Oficial da Igreja,
 * cabeçalhos timbrados seguros com contenção de margem e assinaturas para relatórios (jsPDF).
 */
import type { jsPDF } from "jspdf"

export const DEFAULT_OFFICIAL_CHURCH_LOGO = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80"><circle cx="36" cy="40" r="32" fill="%230f172a"/><path d="M22 40 L 50 24 L 38 56 Z" fill="%23ffffff"/><text x="76" y="28" font-family="sans-serif" font-size="12" font-weight="bold" fill="%230f172a">Igreja</text><text x="76" y="46" font-family="sans-serif" font-size="15" font-weight="900" fill="%230f172a">Brasil</text><text x="76" y="66" font-family="sans-serif" font-size="18" font-weight="900" fill="%23b91c1c">CRISTO</text></svg>`;

export function getRegisteredChurchLogo(activeBranchId?: string): string {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return DEFAULT_OFFICIAL_CHURCH_LOGO;
    }

    // 1. Tenta da congregação ativa se informada
    if (activeBranchId && activeBranchId !== "sede" && activeBranchId !== "all") {
      const branchRaw = localStorage.getItem(`churchConfig_${activeBranchId}`);
      if (branchRaw) {
        try {
          const parsed = JSON.parse(branchRaw);
          const logo = parsed.logoDataUrl || parsed.logoUrl || parsed.logo;
          if (logo && typeof logo === "string" && logo.trim().length > 0) {
            return logo;
          }
        } catch {}
      }
    }

    // 2. Tenta da configuração global da Igreja (Sede)
    const globalRaw = localStorage.getItem("churchConfig");
    if (globalRaw) {
      try {
        const parsed = JSON.parse(globalRaw);
        const logo = parsed.logoDataUrl || parsed.logoUrl || parsed.logo;
        if (logo && typeof logo === "string" && logo.trim().length > 0) {
          return logo;
        }
      } catch {}
    }

    // 3. Tenta chaves diretas salvas
    const directLogo =
      localStorage.getItem("churchLogoDataUrl") ||
      localStorage.getItem("church_logo") ||
      localStorage.getItem("churchLogo");
    if (directLogo && typeof directLogo === "string" && directLogo.trim().length > 0) {
      return directLogo;
    }

    // 4. Varre qualquer outra congregação cadastrada que tenha logo salvo
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("churchConfig_")) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const p = JSON.parse(raw);
            const l = p.logoDataUrl || p.logoUrl || p.logo;
            if (l && typeof l === "string" && l.trim().length > 0) {
              return l;
            }
          }
        } catch {}
      }
    }

    // 5. Tenta do banco de logos personalizados armazenados
    const logosRaw = localStorage.getItem("churchLogos");
    if (logosRaw) {
      try {
        const parsed = JSON.parse(logosRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const active = parsed.find((l: any) => l.active) || parsed[0];
          if (active?.dataUrl && typeof active.dataUrl === "string" && active.dataUrl.trim().length > 0) {
            return active.dataUrl;
          }
        }
      } catch {}
    }
  } catch (err) {
    console.warn("Erro ao buscar logo da igreja:", err);
  }

  // Fallback institucional oficial garantido
  return DEFAULT_OFFICIAL_CHURCH_LOGO;
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
  const effective = logoUrl || getRegisteredChurchLogo();
  if (!effective || typeof effective !== "string") {
    return false;
  }

  try {
    if (effective.startsWith("data:image/png") || effective.startsWith("data:image/jpeg") || effective.startsWith("data:image/jpg") || effective.startsWith("data:image/webp")) {
      let format = "PNG";
      if (effective.startsWith("data:image/jpeg") || effective.startsWith("data:image/jpg")) {
        format = "JPEG";
      } else if (effective.startsWith("data:image/webp")) {
        format = "WEBP";
      }
      doc.addImage(effective, format, x, y, width, height, undefined, "FAST");
      return true;
    }
  } catch (err) {
    console.warn("Aviso ao desenhar logo da igreja no PDF:", err);
  }
  return false;
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
/**
 * Insere imagem de assinatura digital com segurança no PDF
 */
function drawDigitalSignatureInPdf(
  doc: jsPDF,
  dataUrl: string | undefined | null,
  centerX: number,
  lineY: number,
  maxWidth = 36,
  maxHeight = 12
): boolean {
  if (!dataUrl || typeof dataUrl !== "string" || !dataUrl.startsWith("data:image")) {
    return false
  }
  try {
    let format = "PNG"
    if (dataUrl.startsWith("data:image/jpeg") || dataUrl.startsWith("data:image/jpg")) {
      format = "JPEG"
    } else if (dataUrl.startsWith("data:image/webp")) {
      format = "WEBP"
    }
    const x = centerX - (maxWidth / 2)
    const y = lineY - maxHeight - 1
    doc.addImage(dataUrl, format, x, y, maxWidth, maxHeight, undefined, "FAST")
    return true
  } catch (err) {
    console.warn("Aviso ao desenhar assinatura digital no PDF:", err)
    return false
  }
}

/**
 * Desenha o bloco oficial de assinaturas dos responsáveis (Pastor, Tesoureiro(a), etc.)
 * de acordo com os parâmetros do sistema (Parametros.tsx / churchConfig).
 * Suporta assinaturas digitais quando cadastradas e 2 ou 3 signatários.
 */
export function drawFinancialReportSignatures(
  doc: jsPDF,
  churchConfig?: any,
  preferredY?: number,
  options?: {
    closingDate?: string
    city?: string
  }
): number {
  const pageHeight = doc.internal.pageSize.getHeight() // 297mm A4
  const footerLimit = 274 // Limite seguro antes da linha do rodapé (283mm)

  // Monta a lista de responsáveis conforme os parâmetros do sistema
  interface Signatory {
    name: string
    cargo: string
    signatureUrl?: string
  }

  const signatories: Signatory[] = []

  // 1. Pastor Titular / Presidente
  const pastorName =
    churchConfig?.pastorTitular?.trim() ||
    churchConfig?.pastorName?.trim() ||
    churchConfig?.pastor?.trim() ||
    "Pr. Samuel de Oliveira"
  const pastorSig =
    churchConfig?.pastorSignatureUrl ||
    churchConfig?.pastorSignature ||
    ""
  signatories.push({
    name: pastorName,
    cargo: "Pastor Presidente / Titular",
    signatureUrl: pastorSig
  })

  // 2. 1º Tesoureiro(a)
  const tesoureiroName =
    churchConfig?.tesoureiro1?.trim() ||
    churchConfig?.tesoureiro?.trim() ||
    churchConfig?.tesoureiroName?.trim() ||
    "Carlos Roberto"
  const tesoureiroSig =
    churchConfig?.tesoureiro1SignatureUrl ||
    churchConfig?.tesoureiroSignatureUrl ||
    churchConfig?.tesoureiroSignature ||
    ""
  signatories.push({
    name: tesoureiroName,
    cargo: "1º Tesoureiro(a) Geral",
    signatureUrl: tesoureiroSig
  })

  // 3. 2º Tesoureiro(a) ou Secretária (se configurados nos parâmetros)
  if (churchConfig?.tesoureiro2 && churchConfig.tesoureiro2.trim()) {
    signatories.push({
      name: churchConfig.tesoureiro2.trim(),
      cargo: "2º Tesoureiro(a)",
      signatureUrl: churchConfig?.tesoureiro2SignatureUrl
    })
  } else if (churchConfig?.secretario1 && churchConfig.secretario1.trim()) {
    signatories.push({
      name: churchConfig.secretario1.trim(),
      cargo: "1º Secretário(a)",
      signatureUrl: churchConfig?.secretario1SignatureUrl || churchConfig?.secretarySignatureUrl
    })
  }

  const hasAnyDigitalSig = signatories.some(s => s.signatureUrl && s.signatureUrl.startsWith("data:image"))
  const signatureBlockHeight = hasAnyDigitalSig ? 30 : 25

  let y = preferredY || (footerLimit - signatureBlockHeight)

  // Se o y ultrapassar o espaço disponível na página atual, salta para nova página
  if (y + signatureBlockHeight > footerLimit) {
    doc.addPage()
    y = 35
  }

  // Declaração formal de idoneidade
  doc.setFont("helvetica", "normal")
  doc.setFontSize(8)
  doc.setTextColor(70, 70, 70)
  doc.text(
    "Declaro para os devidos fins que as informações acima conferem com os livros e comprovantes arquivados na secretaria/tesouraria.",
    105,
    y,
    { maxWidth: 180, align: "center" }
  )

  const lineY = y + (hasAnyDigitalSig ? 15 : 12)
  doc.setDrawColor(0, 0, 0)
  doc.setLineWidth(0.4)

  if (signatories.length === 2) {
    const slots = [
      { start: 20, end: 95, center: 57.5, maxW: 75 },
      { start: 115, end: 190, center: 152.5, maxW: 75 }
    ]

    signatories.forEach((sig, idx) => {
      const slot = slots[idx]
      if (sig.signatureUrl) {
        drawDigitalSignatureInPdf(doc, sig.signatureUrl, slot.center, lineY, 40, 12)
      }
      doc.line(slot.start, lineY, slot.end, lineY)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(8.5)
      doc.setTextColor(0, 0, 0)
      doc.text(sig.name.toUpperCase(), slot.center, lineY + 4.5, { align: "center", maxWidth: slot.maxW })

      doc.setFont("helvetica", "normal")
      doc.setFontSize(7.5)
      doc.setTextColor(80, 80, 80)
      doc.text(sig.cargo, slot.center, lineY + 8.5, { align: "center", maxWidth: slot.maxW })
    })
  } else {
    // 3 Signatários
    const slots = [
      { start: 14, end: 68, center: 41, maxW: 54 },
      { start: 76, end: 130, center: 103, maxW: 54 },
      { start: 138, end: 192, center: 165, maxW: 54 }
    ]

    signatories.slice(0, 3).forEach((sig, idx) => {
      const slot = slots[idx]
      if (sig.signatureUrl) {
        drawDigitalSignatureInPdf(doc, sig.signatureUrl, slot.center, lineY, 32, 11)
      }
      doc.line(slot.start, lineY, slot.end, lineY)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(8)
      doc.setTextColor(0, 0, 0)
      doc.text(sig.name.toUpperCase(), slot.center, lineY + 4.5, { align: "center", maxWidth: slot.maxW })

      doc.setFont("helvetica", "normal")
      doc.setFontSize(7)
      doc.setTextColor(80, 80, 80)
      doc.text(sig.cargo, slot.center, lineY + 8.5, { align: "center", maxWidth: slot.maxW })
    })
  }

  return lineY + 12
}
