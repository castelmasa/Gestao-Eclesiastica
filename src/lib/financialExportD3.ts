import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getRegisteredChurchLogo, drawChurchLogoInPdf } from "@/lib/churchLogoHelper";

export interface D3ExportMonthlyItem {
  monthIndex: number;
  monthName: string;
  fullMonthName: string;
  receitas: number;
  despesas: number;
  saldo: number;
  countReceitas?: number;
  countDespesas?: number;
}

export interface D3ExportCategoryItem {
  category: string;
  receitas: number;
  despesas: number;
  total: number;
}

export interface D3ExportTotals {
  totalReceitas: number;
  totalDespesas: number;
  saldoLiquido: number;
  taxaPoupanca: number;
  bestMonth?: { fullMonthName: string; receitas: number };
  worstMonth?: { fullMonthName: string; despesas: number };
}

export interface D3ExportTransaction {
  id?: string;
  date: any;
  type: string;
  category?: string;
  description?: string;
  amount: number;
  supplier?: string;
  status?: string;
  paymentMethod?: string;
  branchName?: string;
}

export interface D3ExportOptions {
  monthlyData: D3ExportMonthlyItem[];
  categoryBreakdown: D3ExportCategoryItem[];
  totals: D3ExportTotals;
  transactions: D3ExportTransaction[];
  selectedYear: string;
  branchName: string;
  churchInfo?: {
    nome?: string;
    endereco?: string;
    cidade?: string;
    cnpj?: string;
    pastorTitular?: string;
    tesoureiro1?: string;
    logoDataUrl?: string;
  };
  mainChartSvg?: SVGSVGElement | null;
  donutChartSvg?: SVGSVGElement | null;
}

/**
 * Converte um elemento SVGSVGElement em PNG Base64 Data URL utilizando Canvas HTML5.
 */
async function svgToPngDataUrl(svgElement: SVGSVGElement): Promise<string | null> {
  return new Promise((resolve) => {
    try {
      // Clona o SVG para não afetar o DOM atual
      const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
      
      // Garante atributos de largura e altura
      const bbox = svgElement.getBoundingClientRect();
      const width = bbox.width > 0 ? bbox.width : 850;
      const height = bbox.height > 0 ? bbox.height : 360;

      clonedSvg.setAttribute("width", String(width));
      clonedSvg.setAttribute("height", String(height));
      clonedSvg.style.backgroundColor = "#ffffff";

      // Adiciona estilo de fundo branco
      const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      bgRect.setAttribute("width", "100%");
      bgRect.setAttribute("height", "100%");
      bgRect.setAttribute("fill", "#ffffff");
      clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);

      const svgString = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const urlApi = window.URL || (window as any).webkitURL;
      const blobURL = urlApi.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        try {
          const scale = 2; // Alta resolução (2x Retina)
          const canvas = document.createElement("canvas");
          canvas.width = width * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            urlApi.revokeObjectURL(blobURL);
            resolve(canvas.toDataURL("image/png"));
          } else {
            urlApi.revokeObjectURL(blobURL);
            resolve(null);
          }
        } catch {
          urlApi.revokeObjectURL(blobURL);
          resolve(null);
        }
      };
      img.onerror = () => {
        urlApi.revokeObjectURL(blobURL);
        resolve(null);
      };
      img.src = blobURL;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Exporta os dados consolidados do painel D3 para uma planilha Excel multi-abas (.xlsx)
 */
export function exportD3FinancialReportToExcel(options: D3ExportOptions) {
  const {
    monthlyData,
    categoryBreakdown,
    totals,
    transactions,
    selectedYear,
    branchName,
    churchInfo
  } = options;

  const workbook = XLSX.utils.book_new();

  // 1. Aba: Resumo Executivo
  const resumoData = [
    ["RELATÓRIO FINANCEIRO CONSOLIDADO - PAINEL GRÁFICO D3"],
    ["Igreja:", churchInfo?.nome || "Igreja Local"],
    ["Endereço:", churchInfo?.endereco || "-"],
    ["Cidade:", churchInfo?.cidade || "-"],
    ["CNPJ:", churchInfo?.cnpj || "-"],
    ["Congregação:", branchName],
    ["Ano Base:", selectedYear === "all" ? "Todos os Anos" : selectedYear],
    ["Data de Emissão:", new Date().toLocaleDateString("pt-BR") + " " + new Date().toLocaleTimeString("pt-BR")],
    [],
    ["INDICADORES PRINCIPAIS DO PERÍODO"],
    ["Métrica", "Valor Consolidado", "Observações"],
    ["Receitas Totais", totals.totalReceitas, "Soma de todas as entradas no período"],
    ["Despesas Totais", totals.totalDespesas, "Soma de todas as saídas no período"],
    ["Saldo Líquido", totals.saldoLiquido, totals.saldoLiquido >= 0 ? "Superávit Financeiro" : "Déficit Financeiro"],
    ["Taxa de Poupança / Retenção", `${totals.taxaPoupanca.toFixed(1)}%`, "Percentual de receita poupado"],
    ["Melhor Mês (Maior Receita)", totals.bestMonth ? `${totals.bestMonth.fullMonthName}` : "-", totals.bestMonth ? totals.bestMonth.receitas : 0],
    ["Mês Crítico (Maior Despesa)", totals.worstMonth ? `${totals.worstMonth.fullMonthName}` : "-", totals.worstMonth ? totals.worstMonth.despesas : 0],
  ];
  const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
  wsResumo["!cols"] = [{ wch: 32 }, { wch: 25 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(workbook, wsResumo, "Resumo Executivo");

  // 2. Aba: Evolução Mensal (D3)
  const monthlyHeaders = [
    "Mês",
    "Receitas (R$)",
    "Despesas (R$)",
    "Saldo Líquido (R$)",
    "Comprometimento (%)",
    "Status de Equilíbrio",
    "Nº Lançamentos Entradas",
    "Nº Lançamentos Saídas"
  ];
  const monthlyRows = monthlyData.map((m) => {
    const despPct = m.receitas > 0 ? ((m.despesas / m.receitas) * 100).toFixed(1) + "%" : (m.despesas > 0 ? "100.0%" : "0.0%");
    const status = m.saldo > 0 ? "Superávit" : m.saldo < 0 ? "Déficit" : "Equilibrado";
    return [
      m.fullMonthName,
      m.receitas,
      m.despesas,
      m.saldo,
      despPct,
      status,
      m.countReceitas || 0,
      m.countDespesas || 0
    ];
  });
  // Linha de total
  monthlyRows.push([
    "TOTAL ANUAL",
    totals.totalReceitas,
    totals.totalDespesas,
    totals.saldoLiquido,
    totals.totalReceitas > 0 ? ((totals.totalDespesas / totals.totalReceitas) * 100).toFixed(1) + "%" : "0.0%",
    totals.saldoLiquido >= 0 ? "Superávit Anual" : "Déficit Anual",
    monthlyData.reduce((acc, m) => acc + (m.countReceitas || 0), 0),
    monthlyData.reduce((acc, m) => acc + (m.countDespesas || 0), 0)
  ]);

  const wsMonthly = XLSX.utils.aoa_to_sheet([
    [`EVOLUÇÃO MENSAL DAS RECEITAS E DESPESAS (DADOS GRÁFICOS D3) - ANO ${selectedYear}`],
    [],
    monthlyHeaders,
    ...monthlyRows
  ]);
  wsMonthly["!cols"] = [
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
    { wch: 22 },
    { wch: 22 },
    { wch: 24 },
    { wch: 22 }
  ];
  XLSX.utils.book_append_sheet(workbook, wsMonthly, "Evolucao Mensal D3");

  // 3. Aba: Categorias (D3 Donut)
  const catHeaders = [
    "Categoria",
    "Receitas (R$)",
    "Despesas (R$)",
    "Movimentação Total (R$)",
    "Participação (%)"
  ];
  const grandTotal = totals.totalReceitas + totals.totalDespesas;
  const catRows = categoryBreakdown.map((c) => {
    const pct = grandTotal > 0 ? ((c.total / grandTotal) * 100).toFixed(1) + "%" : "0.0%";
    return [c.category, c.receitas, c.despesas, c.total, pct];
  });
  const wsCat = XLSX.utils.aoa_to_sheet([
    ["DISTRIBUIÇÃO DE MOVIMENTAÇÕES POR CATEGORIA (GRÁFICO DONUT D3)"],
    [],
    catHeaders,
    ...catRows
  ]);
  wsCat["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 18 }, { wch: 24 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, wsCat, "Categorias D3");

  // 4. Aba: Lançamentos Detalhados do Período
  if (transactions && transactions.length > 0) {
    const txHeaders = ["Data", "Tipo", "Categoria", "Descrição", "Valor (R$)", "Fornecedor / Favorecido", "Status", "Congregação"];
    const txRows = transactions.map((t) => {
      let dateStr = "-";
      if (t.date?.toDate) dateStr = t.date.toDate().toLocaleDateString("pt-BR");
      else if (typeof t.date === "string") {
        const d = new Date(t.date);
        dateStr = !isNaN(d.getTime()) ? d.toLocaleDateString("pt-BR") : t.date;
      }
      return [
        dateStr,
        t.type === "entrada" ? "Entrada" : "Saída",
        t.category || "Geral",
        t.description || "-",
        t.amount,
        t.supplier || "-",
        t.status || "Liquidado",
        t.branchName || branchName
      ];
    });

    const wsTx = XLSX.utils.aoa_to_sheet([
      ["TRANSAÇÕES FILTRADAS NO RELATÓRIO"],
      [],
      txHeaders,
      ...txRows
    ]);
    wsTx["!cols"] = [
      { wch: 14 },
      { wch: 12 },
      { wch: 22 },
      { wch: 38 },
      { wch: 16 },
      { wch: 26 },
      { wch: 14 },
      { wch: 22 }
    ];
    XLSX.utils.book_append_sheet(workbook, wsTx, "Lancamentos Detalhados");
  }

  // Gera o buffer e salva o arquivo
  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8"
  });
  const cleanBranch = branchName.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `Relatorio_Financeiro_D3_${selectedYear}_${cleanBranch}.xlsx`;
  saveAs(blob, fileName);
}

/**
 * Exporta o relatório financeiro completo para PDF de alta fidelidade visual,
 * incorporando as capturas gráficas vetorizadas D3 (Evolução Mensal e Distribuição Donut).
 */
export async function exportD3FinancialReportToPdf(options: D3ExportOptions): Promise<void> {
  const {
    monthlyData,
    categoryBreakdown,
    totals,
    selectedYear,
    branchName,
    churchInfo,
    mainChartSvg,
    donutChartSvg
  } = options;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  // Renderiza imagens dos gráficos D3
  let mainChartImgData: string | null = null;
  let donutChartImgData: string | null = null;

  if (mainChartSvg) {
    mainChartImgData = await svgToPngDataUrl(mainChartSvg);
  }
  if (donutChartSvg) {
    donutChartImgData = await svgToPngDataUrl(donutChartSvg);
  }

  // ================= PÁGINA 1: CABEÇALHO, KPIS E GRÁFICOS D3 =================
  let y = 14;

  // Faixa superior institucional
  doc.setFillColor(15, 23, 42); // Slate 900
  doc.rect(margin, y, pageWidth - 2 * margin, 24, "F");

  const churchLogo = churchInfo?.logoDataUrl || getRegisteredChurchLogo();
  let headerTextX = margin + 6;
  if (churchLogo) {
    const added = drawChurchLogoInPdf(doc, churchLogo, margin + 2, y + 2, 20, 20);
    if (added) {
      headerTextX = margin + 26;
    }
  }

  doc.setFont("helvetica", "bold");
  let d3HeaderSize = 12.5;
  doc.setFontSize(d3HeaderSize);
  const maxD3HeaderW = pageWidth - margin - 4 - headerTextX;
  const d3ChurchTitle = (churchInfo?.nome || "IGREJA EVANGÉLICA - SISTEMA DE GESTÃO").toUpperCase();
  while (doc.getTextWidth(d3ChurchTitle) > maxD3HeaderW && d3HeaderSize > 8.5) {
    d3HeaderSize -= 0.5;
    doc.setFontSize(d3HeaderSize);
  }
  doc.setTextColor(255, 255, 255);
  doc.text(
    d3ChurchTitle,
    headerTextX,
    y + 9,
    { maxWidth: maxD3HeaderW }
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // Slate 300
  const subInfo = [
    `Congregação: ${branchName}`,
    `Exercício: ${selectedYear === "all" ? "Todos os Anos" : selectedYear}`,
    `CNPJ: ${churchInfo?.cnpj || "51.105.484/0001-74"}`,
    `Emitido em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
  ].join("  •  ");
  doc.text(subInfo, headerTextX, y + 17, { maxWidth: maxD3HeaderW });

  y += 30;

  // Título do Relatório
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("PAINEL FINANCEIRO DE RECEITAS E DESPESAS (D3.JS)", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    "Demonstrativo analítico anual com métricas de desempenho orçamentário e gráficos de alta resolução.",
    margin,
    y + 5
  );

  y += 12;

  // 4 Cards de Métricas (KPIs)
  const cardWidth = (pageWidth - 2 * margin - 9) / 4;
  const cardHeight = 18;

  // Card 1: Receitas
  doc.setFillColor(240, 253, 244); // Green 50
  doc.setDrawColor(187, 247, 208); // Green 200
  doc.roundedRect(margin, y, cardWidth, cardHeight, 2, 2, "FD");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 101, 52); // Green 800
  doc.text("RECEITAS TOTAIS", margin + 3, y + 5);
  doc.setFontSize(10.5);
  doc.text(
    `R$ ${totals.totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    margin + 3,
    y + 11
  );
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(21, 128, 61);
  doc.text(`Melhor: ${totals.bestMonth?.fullMonthName || "-"}`, margin + 3, y + 15);

  // Card 2: Despesas
  const xCard2 = margin + cardWidth + 3;
  doc.setFillColor(254, 242, 242); // Red 50
  doc.setDrawColor(254, 202, 202); // Red 200
  doc.roundedRect(xCard2, y, cardWidth, cardHeight, 2, 2, "FD");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(153, 27, 27); // Red 800
  doc.text("DESPESAS TOTAIS", xCard2 + 3, y + 5);
  doc.setFontSize(10.5);
  doc.text(
    `R$ ${totals.totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    xCard2 + 3,
    y + 11
  );
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(185, 28, 28);
  doc.text(`Pico: ${totals.worstMonth?.fullMonthName || "-"}`, xCard2 + 3, y + 15);

  // Card 3: Saldo Líquido
  const xCard3 = xCard2 + cardWidth + 3;
  const isPositive = totals.saldoLiquido >= 0;
  doc.setFillColor(isPositive ? 239 : 254, isPositive ? 246 : 242, isPositive ? 255 : 242);
  doc.setDrawColor(isPositive ? 191 : 254, isPositive ? 219 : 202, isPositive ? 254 : 202);
  doc.roundedRect(xCard3, y, cardWidth, cardHeight, 2, 2, "FD");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(isPositive ? 30 : 153, isPositive ? 64 : 27, isPositive ? 175 : 27);
  doc.text("SALDO LÍQUIDO", xCard3 + 3, y + 5);
  doc.setFontSize(10.5);
  doc.text(
    `R$ ${totals.saldoLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    xCard3 + 3,
    y + 11
  );
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(isPositive ? "Superávit do Período" : "Déficit do Período", xCard3 + 3, y + 15);

  // Card 4: Taxa de Poupança
  const xCard4 = xCard3 + cardWidth + 3;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(xCard4, y, cardWidth, cardHeight, 2, 2, "FD");
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(51, 65, 85);
  doc.text("TAXA DE POUPANÇA", xCard4 + 3, y + 5);
  doc.setFontSize(10.5);
  doc.text(`${totals.taxaPoupanca.toFixed(1)}%`, xCard4 + 3, y + 11);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Retenção s/ Receitas", xCard4 + 3, y + 15);

  y += cardHeight + 8;

  // Gráfico D3 Principal (Evolução Mensal Receitas vs Despesas)
  if (mainChartImgData) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text("1. GRÁFICO DE FLUXO MENSAL D3 (RECEITAS X DESPESAS)", margin, y);

    y += 3;
    const chartImgW = pageWidth - 2 * margin;
    const chartImgH = 68;
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, chartImgW, chartImgH, 2, 2, "D");
    doc.addImage(mainChartImgData, "PNG", margin + 1, y + 1, chartImgW - 2, chartImgH - 2);

    y += chartImgH + 6;
  }

  // Gráfico D3 Secundário (Donut de Categorias) e Resumo de Ranking
  if (donutChartImgData) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text("2. DISTRIBUIÇÃO POR CATEGORIA (GRÁFICO D3 DONUT)", margin, y);

    y += 3;
    const donutW = 65;
    const donutH = 65;
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, donutW, donutH, 2, 2, "D");
    doc.addImage(donutChartImgData, "PNG", margin + 2, y + 2, donutW - 4, donutH - 4);

    // Mini Tabela ao lado do gráfico de pizza
    const sideTableX = margin + donutW + 4;
    const sideTableW = pageWidth - margin - sideTableX;
    const topCats = categoryBreakdown.slice(0, 6);
    const sideRows = topCats.map((c) => {
      const grand = totals.totalReceitas + totals.totalDespesas;
      const pct = grand > 0 ? ((c.total / grand) * 100).toFixed(1) + "%" : "0%";
      return [c.category, `R$ ${c.total.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`, pct];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: sideTableX, right: margin },
      tableWidth: sideTableW,
      head: [["Categoria", "Total", "%"]],
      body: sideRows,
      theme: "grid",
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontSize: 7.5,
        fontStyle: "bold",
        cellPadding: 2
      },
      styles: {
        fontSize: 7,
        cellPadding: 2
      },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { halign: "right", fontStyle: "bold" },
        2: { halign: "center" }
      }
    });

    y += donutH + 6;
  }

  // Rodapé da Página 1
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Relatório Financeiro D3 | Página 1 de 2 | Emitido via Sistema de Gestão de Igrejas`,
    margin,
    pageHeight - 8
  );

  // ================= PÁGINA 2: TABELA MENSAL CONSOLIDADA E ASSINATURAS =================
  doc.addPage();
  let yP2 = 14;

  // Mini Header na página 2
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text("3. DETALHAMENTO MENSAL COMPARATIVO E EQUILÍBRIO FISCAL", margin, yP2);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Apuração mês a mês correspondente aos dados visualizados no painel D3 (${selectedYear === "all" ? "Todos os Anos" : `Ano ${selectedYear}`})`,
    margin,
    yP2 + 4.5
  );

  yP2 += 9;

  // Tabela Mensal Consolidada
  const tableRows = monthlyData.map((m) => {
    const despPct = m.receitas > 0 ? ((m.despesas / m.receitas) * 100).toFixed(0) + "%" : "-";
    const status = m.saldo > 0 ? "Superávit" : m.saldo < 0 ? "Déficit" : "Equilibrado";
    return [
      m.fullMonthName,
      `R$ ${m.receitas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `R$ ${m.despesas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      `R$ ${m.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      despPct,
      status
    ];
  });

  // Linha de total consolidado
  tableRows.push([
    "TOTAL DO EXERCÍCIO",
    `R$ ${totals.totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `R$ ${totals.totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `R$ ${totals.saldoLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    totals.totalReceitas > 0 ? ((totals.totalDespesas / totals.totalReceitas) * 100).toFixed(0) + "%" : "-",
    totals.saldoLiquido >= 0 ? "Superávit Anual" : "Déficit Anual"
  ]);

  autoTable(doc, {
    startY: yP2,
    margin: { left: margin, right: margin },
    head: [["Mês", "Receitas (R$)", "Despesas (R$)", "Saldo Líquido", "Comprometimento", "Status"]],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: 3
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5
    },
    columnStyles: {
      0: { fontStyle: "bold" },
      1: { halign: "right", textColor: [22, 101, 52] }, // Verde
      2: { halign: "right", textColor: [185, 28, 28] }, // Vermelho
      3: { halign: "right", fontStyle: "bold" },
      4: { halign: "center" },
      5: { halign: "center", fontStyle: "bold" }
    },
    didParseCell: (data) => {
      // Destaque na linha de total
      if (data.row.index === tableRows.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [241, 245, 249];
      }
    }
  });

  const finalTableY = (doc as any).lastAutoTable?.finalY || 160;
  yP2 = finalTableY + 12;

  // Quadro de Conclusão Financeira
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, yP2, pageWidth - 2 * margin, 24, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text("PARECER CONCLUSIVO DA ADMINISTRAÇÃO FINANCEIRA:", margin + 4, yP2 + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  const statusParecer = totals.saldoLiquido >= 0
    ? `As finanças no exercício de ${selectedYear} apresentaram resultado SUPERAVITÁRIO de R$ ${totals.saldoLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}, com taxa de retenção/poupança de ${totals.taxaPoupanca.toFixed(1)}%. Todas as contas e obrigações foram devidamente quitadas e registradas.`
    : `O exercício de ${selectedYear} encerrou com saldo DEFICITÁRIO de R$ ${totals.saldoLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}. Recomenda-se a contenção de gastos não essenciais e reavaliação dos centros de custo para o próximo período fiscal.`;
  doc.text(doc.splitTextToSize(statusParecer, pageWidth - 2 * margin - 8), margin + 4, yP2 + 13);

  yP2 += 36;

  // Assinaturas Oficiais
  const sigWidth = 72;
  const sigX1 = margin + 12;
  const sigX2 = pageWidth - margin - sigWidth - 12;

  doc.setDrawColor(100, 116, 139);
  doc.line(sigX1, yP2, sigX1 + sigWidth, yP2);
  doc.line(sigX2, yP2, sigX2 + sigWidth, yP2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(churchInfo?.pastorTitular || "Pastor Presidente / Titular", sigX1 + sigWidth / 2, yP2 + 5, { align: "center" });
  doc.text(churchInfo?.tesoureiro1 || "Tesoureiro Responsável", sigX2 + sigWidth / 2, yP2 + 5, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text("Liderança Eclesiástica", sigX1 + sigWidth / 2, yP2 + 9, { align: "center" });
  doc.text("Diretoria Financeira", sigX2 + sigWidth / 2, yP2 + 9, { align: "center" });

  // Rodapé da Página 2
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `Relatório Financeiro D3 | Página 2 de 2 | Emitido via Sistema de Gestão de Igrejas`,
    margin,
    pageHeight - 8
  );

  const cleanBranch = branchName.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `Relatorio_Financeiro_D3_${selectedYear}_${cleanBranch}.pdf`;
  doc.save(fileName);
}
