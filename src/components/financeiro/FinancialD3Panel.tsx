import React, { useState, useMemo, useRef, useEffect } from "react";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Branch } from "@/contexts/BranchContext";
import { matchesBranch } from "@/lib/branchUtils";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Scale,
  Calendar,
  Building2,
  PieChart as PieIcon,
  BarChart2,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Sparkles,
  FileText,
  FileSpreadsheet,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { exportD3FinancialReportToPdf, exportD3FinancialReportToExcel } from "@/lib/financialExportD3";

export interface D3Transaction {
  id?: string;
  amount: number;
  type: string; // "entrada" | "saida"
  date: any;
  category?: string;
  branchId?: string;
  description?: string;
  costCenter?: string;
  paymentMethod?: string;
}

interface FinancialD3PanelProps {
  transactions: D3Transaction[];
  branches?: Branch[];
  activeBranch?: string;
}

const MONTH_NAMES = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

const FULL_MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function FinancialD3Panel({
  transactions,
  branches = [],
  activeBranch: initialBranch = "all"
}: FinancialD3PanelProps) {
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>(initialBranch);
  const [chartViewMode, setChartViewMode] = useState<"grouped" | "stacked" | "balance">("grouped");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activeHoverData, setActiveHoverData] = useState<any | null>(null);

  // Sync with prop
  useEffect(() => {
    setSelectedBranch(initialBranch);
  }, [initialBranch]);

  // Extract available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach(t => {
      let d: Date | null = null;
      if (t.date?.toDate) d = t.date.toDate();
      else if (typeof t.date === "string") d = new Date(t.date);
      else if (t.date instanceof Date) d = t.date;

      if (d && !isNaN(d.getTime())) {
        years.add(String(d.getFullYear()));
      }
    });
    const arr = Array.from(years).sort((a, b) => Number(b) - Number(a));
    if (arr.length === 0) arr.push(String(new Date().getFullYear()));
    return arr;
  }, [transactions]);

  // Default to current year if available
  useEffect(() => {
    const curYear = String(new Date().getFullYear());
    if (availableYears.includes(curYear) && selectedYear === "all") {
      setSelectedYear(curYear);
    } else if (availableYears.length > 0 && selectedYear === "all") {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears]);

  // Extract categories
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    transactions.forEach(t => {
      if (t.category) cats.add(t.category);
    });
    return Array.from(cats).sort();
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Branch filter
      if (!matchesBranch({ branchId: t.branchId }, selectedBranch, branches)) return false;

      // Category filter
      if (categoryFilter !== "all" && t.category !== categoryFilter) return false;

      // Date check
      let d: Date | null = null;
      if (t.date?.toDate) d = t.date.toDate();
      else if (typeof t.date === "string") d = new Date(t.date);
      else if (t.date instanceof Date) d = t.date;

      if (!d || isNaN(d.getTime())) return false;

      // Year filter
      if (selectedYear !== "all" && String(d.getFullYear()) !== selectedYear) {
        return false;
      }

      return true;
    });
  }, [transactions, selectedBranch, categoryFilter, selectedYear]);

  // Monthly aggregated data for D3
  const monthlyData = useMemo(() => {
    // 12 months array
    const months = Array.from({ length: 12 }, (_, i) => ({
      monthIndex: i,
      monthName: MONTH_NAMES[i],
      fullMonthName: FULL_MONTH_NAMES[i],
      receitas: 0,
      despesas: 0,
      saldo: 0,
      countReceitas: 0,
      countDespesas: 0,
    }));

    filteredTransactions.forEach(t => {
      let d: Date | null = null;
      if (t.date?.toDate) d = t.date.toDate();
      else if (typeof t.date === "string") d = new Date(t.date);
      else if (t.date instanceof Date) d = t.date;

      if (d && !isNaN(d.getTime())) {
        const m = d.getMonth();
        const amt = Number(t.amount) || 0;
        if (t.type === "entrada") {
          months[m].receitas += amt;
          months[m].countReceitas += 1;
        } else if (t.type === "saida") {
          months[m].despesas += amt;
          months[m].countDespesas += 1;
        }
      }
    });

    // Calculate balance
    months.forEach(m => {
      m.saldo = m.receitas - m.despesas;
    });

    return months;
  }, [filteredTransactions]);

  // Category breakdown data for D3 Donut Chart
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { receitas: number; despesas: number }> = {};
    filteredTransactions.forEach(t => {
      const cat = t.category || "Sem Categoria";
      if (!map[cat]) map[cat] = { receitas: 0, despesas: 0 };
      const amt = Number(t.amount) || 0;
      if (t.type === "entrada") map[cat].receitas += amt;
      else if (t.type === "saida") map[cat].despesas += amt;
    });

    return Object.entries(map).map(([category, values]) => ({
      category,
      receitas: values.receitas,
      despesas: values.despesas,
      total: values.receitas + values.despesas
    })).sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  // Overall KPI metrics
  const totals = useMemo(() => {
    const totalReceitas = monthlyData.reduce((acc, m) => acc + m.receitas, 0);
    const totalDespesas = monthlyData.reduce((acc, m) => acc + m.despesas, 0);
    const saldoLiquido = totalReceitas - totalDespesas;
    const taxaPoupanca = totalReceitas > 0 ? ((saldoLiquido / totalReceitas) * 100) : 0;

    let bestMonth = monthlyData[0];
    let worstMonth = monthlyData[0];
    monthlyData.forEach(m => {
      if (m.receitas > bestMonth.receitas) bestMonth = m;
      if (m.despesas > worstMonth.despesas) worstMonth = m;
    });

    return {
      totalReceitas,
      totalDespesas,
      saldoLiquido,
      taxaPoupanca,
      bestMonth,
      worstMonth
    };
  }, [monthlyData]);

  // D3 Bar / Area Chart SVG Ref
  const mainChartSvgRef = useRef<SVGSVGElement | null>(null);
  const donutChartSvgRef = useRef<SVGSVGElement | null>(null);

  // Render D3 Main Monthly Chart
  useEffect(() => {
    if (!mainChartSvgRef.current) return;

    const svg = d3.select(mainChartSvgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    const width = 850;
    const height = 360;
    const margin = { top: 30, right: 30, bottom: 50, left: 75 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // ViewBox
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Gradients
    const defs = svg.append("defs");

    // Emerald gradient for Receitas
    const gradReceitas = defs.append("linearGradient")
      .attr("id", "d3-grad-receitas")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");
    gradReceitas.append("stop").attr("offset", "0%").attr("stop-color", "#10b981").attr("stop-opacity", 0.95);
    gradReceitas.append("stop").attr("offset", "100%").attr("stop-color", "#059669").attr("stop-opacity", 0.7);

    // Rose gradient for Despesas
    const gradDespesas = defs.append("linearGradient")
      .attr("id", "d3-grad-despesas")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");
    gradDespesas.append("stop").attr("offset", "0%").attr("stop-color", "#f43f5e").attr("stop-opacity", 0.95);
    gradDespesas.append("stop").attr("offset", "100%").attr("stop-color", "#e11d48").attr("stop-opacity", 0.7);

    // Blue gradient for Saldo area
    const gradSaldo = defs.append("linearGradient")
      .attr("id", "d3-grad-saldo")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "0%").attr("y2", "100%");
    gradSaldo.append("stop").attr("offset", "0%").attr("stop-color", "#3b82f6").attr("stop-opacity", 0.4);
    gradSaldo.append("stop").attr("offset", "100%").attr("stop-color", "#3b82f6").attr("stop-opacity", 0.0);

    // X Scale
    const x0 = d3.scaleBand()
      .domain(monthlyData.map(d => d.monthName))
      .rangeRound([0, innerWidth])
      .paddingInner(0.25);

    // Y Scale
    const maxVal = d3.max(monthlyData, d => Math.max(d.receitas, d.despesas, Math.abs(d.saldo))) || 1000;
    const yMax = maxVal * 1.15; // 15% head room

    const y = d3.scaleLinear()
      .domain([0, yMax])
      .nice()
      .rangeRound([innerHeight, 0]);

    // Grid lines
    g.append("g")
      .attr("class", "grid")
      .call(
        d3.axisLeft(y)
          .ticks(5)
          .tickSize(-innerWidth)
          .tickFormat(() => "")
      )
      .selectAll("line")
      .attr("stroke", "currentColor")
      .attr("stroke-opacity", 0.08)
      .attr("stroke-dasharray", "3,3");

    g.select(".grid .domain").remove();

    if (chartViewMode === "grouped") {
      // Grouped Bar Chart
      const keys = ["receitas", "despesas"] as const;
      const x1 = d3.scaleBand()
        .domain(keys)
        .rangeRound([0, x0.bandwidth()])
        .padding(0.08);

      const monthGroups = g.selectAll(".month-group")
        .data(monthlyData)
        .enter()
        .append("g")
        .attr("class", "month-group")
        .attr("transform", d => `translate(${x0(d.monthName)},0)`);

      // Receitas bars
      monthGroups.append("rect")
        .attr("x", x1("receitas") || 0)
        .attr("y", innerHeight)
        .attr("width", x1.bandwidth())
        .attr("height", 0)
        .attr("fill", "url(#d3-grad-receitas)")
        .attr("rx", 4)
        .attr("class", "cursor-pointer transition-all duration-200 hover:opacity-90")
        .on("mouseenter", (event, d) => setActiveHoverData({ ...d, typeHover: "Receitas", val: d.receitas }))
        .on("mouseleave", () => setActiveHoverData(null))
        .transition()
        .duration(600)
        .delay((_, i) => i * 35)
        .attr("y", d => y(d.receitas))
        .attr("height", d => innerHeight - y(d.receitas));

      // Despesas bars
      monthGroups.append("rect")
        .attr("x", x1("despesas") || 0)
        .attr("y", innerHeight)
        .attr("width", x1.bandwidth())
        .attr("height", 0)
        .attr("fill", "url(#d3-grad-despesas)")
        .attr("rx", 4)
        .attr("class", "cursor-pointer transition-all duration-200 hover:opacity-90")
        .on("mouseenter", (event, d) => setActiveHoverData({ ...d, typeHover: "Despesas", val: d.despesas }))
        .on("mouseleave", () => setActiveHoverData(null))
        .transition()
        .duration(600)
        .delay((_, i) => i * 35 + 20)
        .attr("y", d => y(d.despesas))
        .attr("height", d => innerHeight - y(d.despesas));

    } else if (chartViewMode === "stacked") {
      // Stacked Bars
      monthlyData.forEach((d, i) => {
        const groupX = x0(d.monthName) || 0;
        const bWidth = x0.bandwidth();

        // Receitas (base)
        const recH = innerHeight - y(d.receitas);
        g.append("rect")
          .attr("x", groupX)
          .attr("y", innerHeight)
          .attr("width", bWidth)
          .attr("height", 0)
          .attr("fill", "url(#d3-grad-receitas)")
          .attr("rx", 3)
          .on("mouseenter", () => setActiveHoverData({ ...d, typeHover: "Receitas", val: d.receitas }))
          .on("mouseleave", () => setActiveHoverData(null))
          .transition()
          .duration(500)
          .delay(i * 30)
          .attr("y", y(d.receitas))
          .attr("height", recH);

        // Despesas on top
        const despH = innerHeight - y(d.despesas);
        g.append("rect")
          .attr("x", groupX)
          .attr("y", innerHeight)
          .attr("width", bWidth)
          .attr("height", 0)
          .attr("fill", "url(#d3-grad-despesas)")
          .attr("rx", 3)
          .on("mouseenter", () => setActiveHoverData({ ...d, typeHover: "Despesas", val: d.despesas }))
          .on("mouseleave", () => setActiveHoverData(null))
          .transition()
          .duration(500)
          .delay(i * 30 + 15)
          .attr("y", y(d.receitas) - despH)
          .attr("height", despH);
      });

    } else if (chartViewMode === "balance") {
      // Line & Area for Saldo Líquido
      const ySaldo = d3.scaleLinear()
        .domain([
          Math.min(0, d3.min(monthlyData, d => d.saldo) || 0) * 1.2,
          Math.max(1000, d3.max(monthlyData, d => d.saldo) || 1000) * 1.2
        ])
        .nice()
        .range([innerHeight, 0]);

      // Zero axis line
      g.append("line")
        .attr("x1", 0)
        .attr("x2", innerWidth)
        .attr("y1", ySaldo(0))
        .attr("y2", ySaldo(0))
        .attr("stroke", "currentColor")
        .attr("stroke-opacity", 0.3)
        .attr("stroke-width", 1.5)
        .attr("stroke-dasharray", "4,4");

      // Area generator
      const area = d3.area<any>()
        .x(d => (x0(d.monthName) || 0) + x0.bandwidth() / 2)
        .y0(ySaldo(0))
        .y1(d => ySaldo(d.saldo))
        .curve(d3.curveMonotoneX);

      // Line generator
      const line = d3.line<any>()
        .x(d => (x0(d.monthName) || 0) + x0.bandwidth() / 2)
        .y(d => ySaldo(d.saldo))
        .curve(d3.curveMonotoneX);

      // Draw Area
      g.append("path")
        .datum(monthlyData)
        .attr("fill", "url(#d3-grad-saldo)")
        .attr("d", area);

      // Draw Line
      const path = g.append("path")
        .datum(monthlyData)
        .attr("fill", "none")
        .attr("stroke", "#3b82f6")
        .attr("stroke-width", 3)
        .attr("d", line);

      // Animate line
      const totalLength = path.node()?.getTotalLength() || 1000;
      path
        .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(800)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);

      // Dots on points
      g.selectAll(".saldo-dot")
        .data(monthlyData)
        .enter()
        .append("circle")
        .attr("class", "saldo-dot cursor-pointer transition-transform hover:scale-150")
        .attr("cx", d => (x0(d.monthName) || 0) + x0.bandwidth() / 2)
        .attr("cy", d => ySaldo(d.saldo))
        .attr("r", 5)
        .attr("fill", d => (d.saldo >= 0 ? "#10b981" : "#f43f5e"))
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2)
        .on("mouseenter", (event, d) => setActiveHoverData({ ...d, typeHover: "Saldo Líquido", val: d.saldo }))
        .on("mouseleave", () => setActiveHoverData(null));
    }

    // X Axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x0))
      .call(axisG => axisG.select(".domain").attr("stroke", "currentColor").attr("stroke-opacity", 0.2))
      .selectAll("text")
      .attr("fill", "currentColor")
      .attr("font-size", "12px")
      .attr("font-weight", "600");

    // Y Axis
    g.append("g")
      .call(
        d3.axisLeft(chartViewMode === "balance" ? y : y)
          .ticks(5)
          .tickFormat(d => `R$ ${(Number(d) / 1000).toFixed(0)}k`)
      )
      .call(axisG => axisG.select(".domain").remove())
      .selectAll("text")
      .attr("fill", "currentColor")
      .attr("font-size", "11px")
      .attr("opacity", 0.7);

  }, [monthlyData, chartViewMode]);

  // Render D3 Donut Chart for categories
  useEffect(() => {
    if (!donutChartSvgRef.current) return;
    const svg = d3.select(donutChartSvgRef.current);
    svg.selectAll("*").remove();

    const width = 280;
    const height = 280;
    const radius = Math.min(width, height) / 2 - 15;

    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const g = svg.append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    const topCategories = categoryBreakdown.slice(0, 6);
    if (topCategories.length === 0) return;

    const color = d3.scaleOrdinal<string>()
      .domain(topCategories.map(c => c.category))
      .range(["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#f43f5e", "#06b6d4"]);

    const pie = d3.pie<any>()
      .value(d => d.total)
      .sort(null);

    const arc = d3.arc<any>()
      .innerRadius(radius * 0.55)
      .outerRadius(radius * 0.95);

    const hoverArc = d3.arc<any>()
      .innerRadius(radius * 0.52)
      .outerRadius(radius * 1.02);

    const arcs = g.selectAll(".arc")
      .data(pie(topCategories))
      .enter()
      .append("g")
      .attr("class", "arc");

    arcs.append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data.category))
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2)
      .attr("class", "cursor-pointer transition-all duration-200")
      .on("mouseenter", function (event, d) {
        d3.select(this).transition().duration(150).attr("d", hoverArc);
      })
      .on("mouseleave", function () {
        d3.select(this).transition().duration(150).attr("d", arc);
      });

    // Center total text
    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "-0.2em")
      .attr("class", "text-[10px] uppercase font-bold fill-muted-foreground tracking-wider")
      .text("Movimento");

    g.append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "1.2em")
      .attr("class", "text-sm font-extrabold fill-foreground")
      .text(`R$ ${((totals.totalReceitas + totals.totalDespesas) / 1000).toFixed(1)}k`);

  }, [categoryBreakdown, totals]);

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const churchData = useMemo(() => {
    const specific = localStorage.getItem(`churchConfig_${selectedBranch}`);
    const globalSaved = localStorage.getItem("churchConfig");
    if (specific) {
      try { return JSON.parse(specific); } catch (e) {}
    }
    if (globalSaved) {
      try { return JSON.parse(globalSaved); } catch (e) {}
    }
    return {
      nome: "Igreja Evangélica Pentecostal O Brasil para Cristo",
      endereco: "Rua Bartolomeu Bueno, Nº 629",
      cidade: "Valparaíso - SP",
      cnpj: "51.105.484/0001-74",
      pastorTitular: "Pr. Samuel de Oliveira",
      tesoureiro1: "Carlos Roberto"
    };
  }, [selectedBranch]);

  const activeBranchName = useMemo(() => {
    if (selectedBranch === "all") return "Todas as Congregações";
    return branches.find(b => b.id === selectedBranch)?.name || selectedBranch;
  }, [selectedBranch, branches]);

  const handleExportPDF = async () => {
    setIsExportingPdf(true);
    try {
      toast.info("Processando gráficos D3 e gerando relatório executivo em PDF...");
      await exportD3FinancialReportToPdf({
        monthlyData,
        categoryBreakdown,
        totals,
        transactions: filteredTransactions,
        selectedYear,
        branchName: activeBranchName,
        churchInfo: churchData,
        mainChartSvg: mainChartSvgRef.current,
        donutChartSvg: donutChartSvgRef.current
      });
      toast.success("Relatório financeiro com gráficos D3 exportado em PDF com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar relatório em PDF com os gráficos D3.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportExcel = () => {
    setIsExportingExcel(true);
    try {
      toast.info("Consolidando dados D3 e gerando planilha Excel...");
      exportD3FinancialReportToExcel({
        monthlyData,
        categoryBreakdown,
        totals,
        transactions: filteredTransactions,
        selectedYear,
        branchName: activeBranchName,
        churchInfo: churchData
      });
      toast.success("Relatório financeiro D3 exportado para Excel (.xlsx) com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar Excel:", error);
      toast.error("Erro ao exportar planilha Excel.");
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ["Mes", "Receitas (R$)", "Despesas (R$)", "Saldo Liquido (R$)", "Qtd Receitas", "Qtd Despesas"];
    const rows = monthlyData.map(m => [
      m.fullMonthName,
      m.receitas.toFixed(2),
      m.despesas.toFixed(2),
      m.saldo.toFixed(2),
      m.countReceitas,
      m.countDespesas
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `painel_financeiro_d3_${selectedYear}_${selectedBranch}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card & Filters */}
      <Card className="border border-border/70 shadow-sm bg-gradient-to-r from-card to-muted/30">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-0.5 font-bold">
                  <BarChart2 className="w-3.5 h-3.5 mr-1" /> Gráficos D3.js
                </Badge>
                <span className="text-xs text-muted-foreground font-medium">• Visualização Avançada de Dados</span>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight mt-1">
                Painel Visual Financeiro D3
              </CardTitle>
              <CardDescription>
                Análise gráfica de receitas e despesas mensais com gráficos vetoriais interativos D3.js.
              </CardDescription>
            </div>

            {/* Actions / Export */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExportingPdf}
                className="h-9 gap-1.5 text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-500/20"
                title="Exportar relatório completo em PDF com as imagens dos gráficos D3 inclusas"
              >
                {isExportingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileText className="h-3.5 w-3.5" />
                )}
                {isExportingPdf ? "Gerando PDF..." : "Exportar PDF (Gráficos D3)"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportExcel}
                disabled={isExportingExcel}
                className="h-9 gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-500/20"
                title="Exportar dados analíticos e consolidados para planilha Excel multi-abas (.xlsx)"
              >
                {isExportingExcel ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                )}
                {isExportingExcel ? "Gerando Excel..." : "Exportar Excel (.xlsx)"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportCSV}
                className="h-9 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                title="Exportar dados básicos em CSV"
              >
                <Download className="h-3.5 w-3.5" />
                CSV
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Filter Controls Bar */}
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-3 p-3 bg-card rounded-xl border border-border/60">
            {/* Year selector */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Ano:</span>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Anos</SelectItem>
                  {availableYears.map(yr => (
                    <SelectItem key={yr} value={yr}>{yr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Branch selector */}
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Congregação:</span>
              <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                <SelectTrigger className="w-[180px] h-8 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Congregações</SelectItem>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground">Categoria:</span>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[170px] h-8 text-xs">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Categorias</SelectItem>
                  {availableCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chart Mode */}
            <div className="ml-auto flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/50">
              <Button
                variant={chartViewMode === "grouped" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setChartViewMode("grouped")}
              >
                Agrupado
              </Button>
              <Button
                variant={chartViewMode === "stacked" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setChartViewMode("stacked")}
              >
                Empilhado
              </Button>
              <Button
                variant={chartViewMode === "balance" ? "default" : "ghost"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setChartViewMode("balance")}
              >
                Curva de Saldo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receitas */}
        <Card className="border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Receitas Totais
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">
              R$ {totals.totalReceitas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
              Melhor mês: <span className="font-semibold text-foreground">{totals.bestMonth.fullMonthName}</span>
            </p>
          </CardContent>
        </Card>

        {/* Despesas */}
        <Card className="border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Despesas Totais
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">
              R$ {totals.totalDespesas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" />
              Maior gasto: <span className="font-semibold text-foreground">{totals.worstMonth.fullMonthName}</span>
            </p>
          </CardContent>
        </Card>

        {/* Saldo Líquido */}
        <Card className={`border ${totals.saldoLiquido >= 0 ? "border-blue-500/20 bg-blue-500/5" : "border-rose-500/20 bg-rose-500/5"}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground/80">
              Resultado Líquido
            </span>
            <div className={`p-2 rounded-xl ${totals.saldoLiquido >= 0 ? "bg-blue-500/10 text-blue-600" : "bg-rose-500/10 text-rose-600"}`}>
              <Scale className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-extrabold ${totals.saldoLiquido >= 0 ? "text-blue-700 dark:text-blue-400" : "text-rose-700 dark:text-rose-400"}`}>
              R$ {totals.saldoLiquido.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.saldoLiquido >= 0 ? "Superávit no período" : "Déficit no período"}
            </p>
          </CardContent>
        </Card>

        {/* Taxa de Eficiência */}
        <Card className="border border-border/70 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Taxa de Poupança
            </span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-foreground">
              {totals.taxaPoupanca.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Retenção líquida sobre receitas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* D3 Monthly Bar / Area Chart (Takes 2 columns) */}
        <Card className="lg:col-span-2 border border-border/70 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <span>Receitas & Despesas por Mês</span>
                <Badge variant="outline" className="text-[10px] font-normal">
                  {selectedYear === "all" ? "Todos os Anos" : `Ano Base: ${selectedYear}`}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Renderizado via motor SVG de alta precisão D3.js com escalas lineares e de banda.
              </CardDescription>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                <span className="text-muted-foreground">Receitas</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-rose-500" />
                <span className="text-muted-foreground">Despesas</span>
              </div>
              {chartViewMode === "balance" && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Saldo Líquido</span>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent>
            <div className="relative w-full overflow-hidden">
              <svg ref={mainChartSvgRef} className="w-full h-auto max-h-[380px]" />

              {/* Hover Floating Tooltip */}
              {activeHoverData && (
                <div className="absolute top-2 right-4 bg-popover/95 border border-border shadow-xl backdrop-blur-md rounded-xl p-3 text-xs pointer-events-none transition-all duration-150 animate-in fade-in">
                  <div className="font-bold text-foreground mb-1">
                    {activeHoverData.fullMonthName} ({selectedYear})
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                      <span>Receitas:</span>
                      <span className="font-mono font-bold">
                        R$ {activeHoverData.receitas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-4 text-rose-600 dark:text-rose-400">
                      <span>Despesas:</span>
                      <span className="font-mono font-bold">
                        R$ {activeHoverData.despesas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="border-t border-border/60 pt-1 mt-1 flex items-center justify-between gap-4 font-bold">
                      <span className="text-muted-foreground">Saldo:</span>
                      <span className={activeHoverData.saldo >= 0 ? "text-blue-600" : "text-rose-600"}>
                        R$ {activeHoverData.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* D3 Donut Chart & Category Breakdown (Takes 1 column) */}
        <Card className="border border-border/70 shadow-sm flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-primary" />
              <span>Distribuição por Categoria</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Composição de movimentações calculada com D3 Pie & Arc.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col items-center justify-center pt-2">
            <svg ref={donutChartSvgRef} className="w-[240px] h-[240px]" />

            {/* Category ranking list */}
            <div className="w-full mt-4 space-y-2 border-t border-border/50 pt-3">
              {categoryBreakdown.slice(0, 4).map((item, idx) => {
                const pct = totals.totalReceitas + totals.totalDespesas > 0
                  ? ((item.total / (totals.totalReceitas + totals.totalDespesas)) * 100).toFixed(1)
                  : "0";
                const colors = ["bg-emerald-500", "bg-blue-500", "bg-purple-500", "bg-amber-500"];
                return (
                  <div key={item.category} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors[idx % colors.length]}`} />
                      <span className="font-medium text-foreground truncate">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-muted-foreground text-[11px]">{pct}%</span>
                      <span className="font-semibold text-foreground">
                        R$ {item.total.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Comparative Data Table */}
      <Card className="border border-border/70 shadow-sm">
        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold">Detalhamento Mensal Consolidado</CardTitle>
            <CardDescription className="text-xs">
              Tabela de valores apurados mês a mês com indicador percentual de despesas versus receitas.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={isExportingPdf}
              className="h-8 text-xs gap-1.5 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50"
              title="Exportar esta visão e gráficos para PDF"
            >
              <FileText className="h-3.5 w-3.5" />
              PDF com Gráficos
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={isExportingExcel}
              className="h-8 text-xs gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50"
              title="Exportar esta planilha para Excel (.xlsx)"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Excel (.xlsx)
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/60 text-muted-foreground font-bold tracking-wider">
                  <tr>
                    <th className="px-5 py-3">MÊS</th>
                    <th className="px-5 py-3 text-right">RECEITAS (R$)</th>
                    <th className="px-5 py-3 text-right">DESPESAS (R$)</th>
                    <th className="px-5 py-3 text-right">SALDO LÍQUIDO</th>
                    <th className="px-5 py-3 text-center">COMPROMETIMENTO</th>
                    <th className="px-5 py-3 text-center">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {monthlyData.map(m => {
                    const despPct = m.receitas > 0 ? ((m.despesas / m.receitas) * 100).toFixed(0) : "100";
                    return (
                      <tr key={m.monthIndex} className="hover:bg-muted/30 transition-colors">
                        <td className="px-5 py-3 font-semibold text-foreground">
                          {m.fullMonthName}
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                          R$ {m.receitas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3 text-right font-mono font-medium text-rose-600 dark:text-rose-400">
                          R$ {m.despesas.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`px-5 py-3 text-right font-mono font-bold ${m.saldo >= 0 ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400"}`}>
                          R$ {m.saldo.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-3 text-center">
                          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-muted">
                            {despPct}%
                          </span>
                        </td>
                        <td className="px-5 py-3 text-center">
                          {m.saldo > 0 ? (
                            <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                              Superávit
                            </Badge>
                          ) : m.saldo < 0 ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Déficit
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Neutro
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
