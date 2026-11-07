import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Printer,
  FileText,
  Tag,
  FolderArchive,
  Layers,
  Settings2,
  Calendar,
  Building2,
  CheckCircle2,
  Lock,
  Eye,
  Sliders,
  Sparkles,
  Download,
  ImageIcon,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import {
  printDocument,
  downloadElementAsPdf,
  downloadElementAsImage,
  openElementInNewTabForPrint,
} from "@/lib/printUtils";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";
import { getChurchLeadershipConfig } from "@/lib/churchConfigHelper";
import { formatYearMonthDisplay, ClosedFinancialMonth } from "@/lib/closedMonthsHelper";

export interface FolderCoverAndLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialYearMonth?: string; // "YYYY-MM"
  branchId?: string;
  branchName?: string;
  transactions?: any[];
  closedMonths?: ClosedFinancialMonth[];
}

export type LabelPreset =
  | "lombada-larga"
  | "lombada-media"
  | "lombada-fina"
  | "frontal-grande"
  | "frontal-media"
  | "compacta"
  | "custom";

export function FolderCoverAndLabelsModal({
  isOpen,
  onClose,
  initialYearMonth,
  branchId = "all",
  branchName = "Sede Geral",
  transactions = [],
  closedMonths = [],
}: FolderCoverAndLabelsModalProps) {
  // Mês selecionado
  const now = new Date();
  const currentMonthDefault = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(initialYearMonth || currentMonthDefault);

  useEffect(() => {
    if (initialYearMonth) {
      setSelectedMonth(initialYearMonth);
    }
  }, [initialYearMonth]);

  // Aba ativa: Capa A4 ou Etiquetas
  const [activeTab, setActiveTab] = useState<"cover" | "labels">("cover");

  // Configurações da Igreja / Liderança
  const churchLeadership = useMemo(() => {
    return getChurchLeadershipConfig(branchId);
  }, [branchId]);

  const registeredLogo = useMemo(() => {
    return getRegisteredChurchLogo(branchId);
  }, [branchId]);

  // Lista de meses disponíveis a partir das transações
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonthDefault);
    const d = new Date();
    const prev = new Date(d.getFullYear(), d.getMonth() - 1, 1);
    set.add(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`);
    transactions.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.substring(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [transactions, currentMonthDefault]);

  // Cálculos contábeis do mês selecionado
  const monthMetrics = useMemo(() => {
    let anterior = 0;
    let entradas = 0;
    let saidas = 0;
    let count = 0;

    transactions.forEach((t) => {
      if (!t.date) return;
      const txMonth = t.date.substring(0, 7);
      const val = Number(t.amount || 0);
      if (txMonth === selectedMonth) {
        count++;
        if (t.type === "entrada") entradas += val;
        else if (t.type === "saida") saidas += val;
      } else if (txMonth < selectedMonth) {
        if (t.type === "entrada") anterior += val;
        else if (t.type === "saida") anterior -= val;
      }
    });

    const saldoFinal = anterior + entradas - saidas;
    return {
      saldoAnterior: anterior,
      totalEntradas: entradas,
      totalSaidas: saidas,
      saldoFinal,
      totalTransacoes: count,
    };
  }, [transactions, selectedMonth]);

  // Verifica se o mês está travado
  const lockRecord = useMemo(() => {
    return closedMonths.find(
      (m) => m.yearMonth === selectedMonth && (m.branchId === branchId || m.branchId === "all")
    );
  }, [closedMonths, selectedMonth, branchId]);

  // Campos customizáveis para a Capa da Pasta
  const [customChurchName, setCustomChurchName] = useState(
    churchLeadership.church.name || "Igreja Evangélica Pentecostal O Brasil para Cristo"
  );
  const [customBranchName, setCustomBranchName] = useState(branchName);
  const [folderNumber, setFolderNumber] = useState(`Pasta Nº ${selectedMonth.split("-")[1]}/${selectedMonth.split("-")[0]}`);
  const [archiveLocation, setArchiveLocation] = useState("Arquivo da Tesouraria Geral / Gaveta Contábil");
  const [pastorName, setPastorName] = useState(churchLeadership.pastor.name || "Carlito Carvalho Rodrigues");
  const [tesoureiroName, setTesoureiroName] = useState(churchLeadership.tesoureiro.name || "Carlos Roberto");
  const [conselhoFiscalName, setConselhoFiscalName] = useState(
    churchLeadership.conselhoFiscal.cf1.name || "Conselho Fiscal"
  );
  const [folderNotes, setFolderNotes] = useState(
    "Comprovantes originais anexados e rubricados. Prestação de contas arquivada após conferência."
  );

  // Checklist de documentos da pasta
  const [checklist, setChecklist] = useState({
    balanceteD3: true,
    recibosNotas: true,
    borderosOfertas: true,
    extratosBancarios: true,
    termoFechamento: true,
    relatorioDizimistas: false,
  });

  // Atualiza número da pasta ao mudar o mês
  useEffect(() => {
    if (selectedMonth && selectedMonth.includes("-")) {
      const [ano, mes] = selectedMonth.split("-");
      setFolderNumber(`Pasta Nº ${mes}/${ano}`);
    }
  }, [selectedMonth]);

  // Campos customizáveis para Etiquetas
  const [labelPreset, setLabelPreset] = useState<LabelPreset>("lombada-larga");
  const [customWidthMm, setCustomWidthMm] = useState<number>(50);
  const [customHeightMm, setCustomHeightMm] = useState<number>(190);
  const [labelOrientation, setLabelOrientation] = useState<"vertical" | "horizontal">("vertical");
  const [fontSizeLevel, setFontSizeLevel] = useState<"sm" | "md" | "lg" | "xl">("md");
  const [showCutBorders, setShowCutBorders] = useState<boolean>(true);
  const [showLogoOnLabel, setShowLogoOnLabel] = useState<boolean>(true);
  const [labelCopies, setLabelCopies] = useState<number>(2);

  // Aplica presets de tamanho de etiqueta
  const applyPreset = (preset: LabelPreset) => {
    setLabelPreset(preset);
    switch (preset) {
      case "lombada-larga":
        setCustomWidthMm(50);
        setCustomHeightMm(190);
        setLabelOrientation("vertical");
        setFontSizeLevel("lg");
        break;
      case "lombada-media":
        setCustomWidthMm(35);
        setCustomHeightMm(190);
        setLabelOrientation("vertical");
        setFontSizeLevel("md");
        break;
      case "lombada-fina":
        setCustomWidthMm(25);
        setCustomHeightMm(145);
        setLabelOrientation("vertical");
        setFontSizeLevel("sm");
        break;
      case "frontal-grande":
        setCustomWidthMm(120);
        setCustomHeightMm(80);
        setLabelOrientation("horizontal");
        setFontSizeLevel("lg");
        break;
      case "frontal-media":
        setCustomWidthMm(100);
        setCustomHeightMm(60);
        setLabelOrientation("horizontal");
        setFontSizeLevel("md");
        break;
      case "compacta":
        setCustomWidthMm(70);
        setCustomHeightMm(40);
        setLabelOrientation("horizontal");
        setFontSizeLevel("sm");
        break;
      case "custom":
        break;
    }
  };

  const monthLabel = formatYearMonthDisplay(selectedMonth);
  const [isGenerating, setIsGenerating] = useState(false);

  // Handler de impressão / abertura da Capa
  const handlePrintCover = async () => {
    setIsGenerating(true);
    const targetId = "printable-folder-cover-area";
    const filename = `Capa_Pasta_${selectedMonth}_${branchName.replace(/\s+/g, "_")}`;
    toast.info("Processando Capa da Pasta A4...");

    try {
      // 1. Tenta abrir a aba limpa para impressão
      const opened = openElementInNewTabForPrint(targetId, filename);
      if (!opened) {
        await downloadElementAsPdf(targetId, `${filename}.pdf`);
      }
    } catch {
      await downloadElementAsPdf(targetId, `${filename}.pdf`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCoverPdf = async () => {
    setIsGenerating(true);
    const targetId = "printable-folder-cover-area";
    const filename = `Capa_Pasta_${selectedMonth}_${branchName.replace(/\s+/g, "_")}.pdf`;
    try {
      await downloadElementAsPdf(targetId, filename);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadCoverImage = async () => {
    setIsGenerating(true);
    const targetId = "printable-folder-cover-area";
    const filename = `Capa_Pasta_${selectedMonth}.png`;
    try {
      await downloadElementAsImage(targetId, filename);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handler de impressão / abertura das Etiquetas
  const handlePrintLabels = async () => {
    setIsGenerating(true);
    const targetId = "printable-folder-labels-area";
    const filename = `Etiquetas_Lombada_${selectedMonth}`;
    toast.info("Processando Etiquetas de Pasta...");

    try {
      // 1. Tenta abrir a aba limpa para impressão
      const opened = openElementInNewTabForPrint(targetId, filename);
      if (!opened) {
        await downloadElementAsPdf(targetId, `${filename}.pdf`);
      }
    } catch {
      await downloadElementAsPdf(targetId, `${filename}.pdf`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadLabelsPdf = async () => {
    setIsGenerating(true);
    const targetId = "printable-folder-labels-area";
    const filename = `Etiquetas_Lombada_${selectedMonth}.pdf`;
    try {
      await downloadElementAsPdf(targetId, filename);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadLabelsImage = async () => {
    setIsGenerating(true);
    const targetId = "printable-folder-labels-area";
    const filename = `Etiquetas_Lombada_${selectedMonth}.png`;
    try {
      await downloadElementAsImage(targetId, filename);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-5xl max-h-[94vh] flex flex-col p-0 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* Header Superior */}
        <DialogHeader className="!m-0 p-4 sm:p-5 pb-3 border-b border-border bg-muted/20 sticky top-0 bg-background z-10 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <FolderArchive className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Capas & Etiquetas para Pastas Físicas de Fechamento</span>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-0.5">
                Gere a capa oficial A4 e etiquetas adesivas/lombadas para identificar as pastas e caixas com comprovantes físicos.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 flex items-center gap-1.5 border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Building2 className="w-3.5 h-3.5" />
                {branchName}
              </Badge>
              {lockRecord?.isLocked ? (
                <Badge className="bg-amber-500/20 text-amber-900 dark:text-amber-200 border-amber-300 py-1 text-xs font-bold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" /> Mês Fechado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-slate-600 border-slate-300 text-xs py-1">
                  Mês em Aberto
                </Badge>
              )}
            </div>
          </div>

          {/* Abas e Seletor de Mês */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border/50">
            <div className="flex items-center gap-2">
              <Button
                variant={activeTab === "cover" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("cover")}
                className="text-xs rounded-xl font-semibold"
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                Capa da Pasta (Folha A4)
              </Button>
              <Button
                variant={activeTab === "labels" ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab("labels")}
                className="text-xs rounded-xl font-semibold"
              >
                <Tag className="w-3.5 h-3.5 mr-1.5" />
                Etiquetas de Lombada & Caixa
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Mês:
              </Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="h-8 text-xs w-[170px] bg-background font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((ym) => (
                    <SelectItem key={ym} value={ym} className="text-xs">
                      {formatYearMonthDisplay(ym)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo com Grid: Configurações à Esquerda e Prévia à Direita */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-slate-50/50 dark:bg-slate-950/20">
          
          {/* Painel de Configurações (4 Colunas) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-background rounded-xl p-4 border border-border shadow-xs space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b border-border pb-2">
                <Sliders className="w-3.5 h-3.5 text-primary" />
                {activeTab === "cover" ? "Dados da Capa da Pasta" : "Ajustes de Tamanho da Etiqueta"}
              </h4>

              {activeTab === "cover" ? (
                <>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Nome da Igreja (Cabeçalho)</Label>
                    <Input
                      className="text-xs h-8"
                      value={customChurchName}
                      onChange={(e) => setCustomChurchName(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label className="text-xs">Congregação / Unidade</Label>
                    <Input
                      className="text-xs h-8"
                      value={customBranchName}
                      onChange={(e) => setCustomBranchName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Identificação da Pasta</Label>
                      <Input
                        className="text-xs h-8"
                        value={folderNumber}
                        onChange={(e) => setFolderNumber(e.target.value)}
                        placeholder="Ex: Pasta Nº 10/2026"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Local de Guarda</Label>
                      <Input
                        className="text-xs h-8"
                        value={archiveLocation}
                        onChange={(e) => setArchiveLocation(e.target.value)}
                        placeholder="Ex: Gaveta 02"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border">
                    <Label className="text-xs font-semibold block">Documentos Físicos Anexos:</Label>
                    <div className="space-y-1.5 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={checklist.balanceteD3}
                          onCheckedChange={(c) => setChecklist({ ...checklist, balanceteD3: Boolean(c) })}
                        />
                        <span>Balancete Contábil Mensal (D3)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={checklist.recibosNotas}
                          onCheckedChange={(c) => setChecklist({ ...checklist, recibosNotas: Boolean(c) })}
                        />
                        <span>Notas Fiscais e Recibos de Despesas</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={checklist.borderosOfertas}
                          onCheckedChange={(c) => setChecklist({ ...checklist, borderosOfertas: Boolean(c) })}
                        />
                        <span>Borderôs de Ofertas e Dízimos</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={checklist.extratosBancarios}
                          onCheckedChange={(c) => setChecklist({ ...checklist, extratosBancarios: Boolean(c) })}
                        />
                        <span>Extratos Bancários e Conciliação</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={checklist.termoFechamento}
                          onCheckedChange={(c) => setChecklist({ ...checklist, termoFechamento: Boolean(c) })}
                        />
                        <span>Termo de Fechamento da Tesouraria</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid gap-1.5 pt-2 border-t border-border">
                    <Label className="text-xs">Observação / Termo de Encerramento</Label>
                    <Input
                      className="text-xs h-8"
                      value={folderNotes}
                      onChange={(e) => setFolderNotes(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Pastor Titular</Label>
                      <Input
                        className="text-xs h-8"
                        value={pastorName}
                        onChange={(e) => setPastorName(e.target.value)}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">1º Tesoureiro</Label>
                      <Input
                        className="text-xs h-8"
                        value={tesoureiroName}
                        onChange={(e) => setTesoureiroName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button
                      onClick={handlePrintCover}
                      disabled={isGenerating}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-10 shadow-xs rounded-xl"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Printer className="w-4 h-4 mr-2" />
                      )}
                      Imprimir / Abrir Capa A4
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadCoverPdf}
                        disabled={isGenerating}
                        className="text-xs h-9 font-semibold border-emerald-300 text-emerald-800 hover:bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        <Download className="w-3.5 h-3.5 mr-1 text-emerald-600" /> Baixar PDF
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadCoverImage}
                        disabled={isGenerating}
                        className="text-xs h-9 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <ImageIcon className="w-3.5 h-3.5 mr-1" /> Imagem PNG
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                /* Configurações de Etiquetas */
                <>
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold">Modelos Pré-Configurados</Label>
                    <Select
                      value={labelPreset}
                      onValueChange={(val: LabelPreset) => applyPreset(val)}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lombada-larga">Lombada Larga (Pasta A-Z / Caixa) • 50x190mm</SelectItem>
                        <SelectItem value="lombada-media">Lombada Média (Fichário Estreito) • 35x190mm</SelectItem>
                        <SelectItem value="lombada-fina">Lombada Fina (Pasta Plástica) • 25x145mm</SelectItem>
                        <SelectItem value="frontal-grande">Etiqueta Frontal Caixa Box • 120x80mm</SelectItem>
                        <SelectItem value="frontal-media">Etiqueta Envelope / Pasta • 100x60mm</SelectItem>
                        <SelectItem value="compacta">Etiqueta Compacta Adesiva • 70x40mm</SelectItem>
                        <SelectItem value="custom">⚙️ Tamanho Personalizado (Livre)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Medidas em Milímetros */}
                  <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2.5 rounded-lg border border-border">
                    <div className="grid gap-1">
                      <Label className="text-[11px] font-semibold">Largura (mm)</Label>
                      <Input
                        type="number"
                        min={15}
                        max={280}
                        className="text-xs h-8 font-mono"
                        value={customWidthMm}
                        onChange={(e) => {
                          setCustomWidthMm(Number(e.target.value));
                          setLabelPreset("custom");
                        }}
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-[11px] font-semibold">Altura (mm)</Label>
                      <Input
                        type="number"
                        min={15}
                        max={280}
                        className="text-xs h-8 font-mono"
                        value={customHeightMm}
                        onChange={(e) => {
                          setCustomHeightMm(Number(e.target.value));
                          setLabelPreset("custom");
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Orientação</Label>
                      <Select
                        value={labelOrientation}
                        onValueChange={(val: any) => setLabelOrientation(val)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="vertical">Vertical (Lombada)</SelectItem>
                          <SelectItem value="horizontal">Horizontal (Frente)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs">Tamanho Fonte</Label>
                      <Select
                        value={fontSizeLevel}
                        onValueChange={(val: any) => setFontSizeLevel(val)}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sm">Pequena</SelectItem>
                          <SelectItem value="md">Média</SelectItem>
                          <SelectItem value="lg">Grande</SelectItem>
                          <SelectItem value="xl">Extra Grande</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Nº de Cópias na Folha</Label>
                      <Select
                        value={String(labelCopies)}
                        onValueChange={(val) => setLabelCopies(Number(val))}
                      >
                        <SelectTrigger className="h-8 text-xs bg-background font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Etiqueta</SelectItem>
                          <SelectItem value="2">2 Etiquetas</SelectItem>
                          <SelectItem value="3">3 Etiquetas</SelectItem>
                          <SelectItem value="4">4 Etiquetas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-1.5">
                      <Label className="text-xs">Identificação</Label>
                      <Input
                        className="text-xs h-8"
                        value={folderNumber}
                        onChange={(e) => setFolderNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-border text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={showCutBorders}
                        onCheckedChange={(c) => setShowCutBorders(Boolean(c))}
                      />
                      <span>Borda tracejada de corte (ajuda na tesoura)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={showLogoOnLabel}
                        onCheckedChange={(c) => setShowLogoOnLabel(Boolean(c))}
                      />
                      <span>Exibir Logo da Igreja na etiqueta</span>
                    </label>
                  </div>

                  <div className="space-y-2 pt-2">
                    <Button
                      onClick={handlePrintLabels}
                      disabled={isGenerating}
                      className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold h-10 shadow-xs rounded-xl"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Printer className="w-4 h-4 mr-2" />
                      )}
                      Imprimir / Abrir Etiquetas
                    </Button>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadLabelsPdf}
                        disabled={isGenerating}
                        className="text-xs h-9 font-semibold border-blue-300 text-blue-800 hover:bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300"
                      >
                        <Download className="w-3.5 h-3.5 mr-1 text-blue-600" /> Baixar PDF
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadLabelsImage}
                        disabled={isGenerating}
                        className="text-xs h-9 font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                      >
                        <ImageIcon className="w-3.5 h-3.5 mr-1" /> Imagem PNG
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Dica Rápida */}
            <div className="bg-emerald-500/10 border border-emerald-300 dark:border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-950 dark:text-emerald-200">
              <span className="font-bold flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> Dica de Arquivamento:
              </span>
              Imprima a <strong>Capa A4</strong> em papel sulfite comum ou vergê e coloque na frente da pasta. Imprima as <strong>Etiquetas</strong> em papel adesivo ou recorte e cole com fita transparente na lombada da pasta A-Z ou caixa arquivo.
            </div>
          </div>

          {/* Área de Visualização (Preview WYSIWYG) (8 Colunas) */}
          <div className="lg:col-span-8 flex flex-col items-center justify-start overflow-x-auto p-2">
            <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between pb-2 mb-2 border-b border-border text-xs text-muted-foreground gap-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold flex items-center gap-1.5 text-foreground">
                  <Eye className="w-4 h-4 text-primary" />
                  {activeTab === "cover" ? "Prévia da Capa A4" : `Prévia das Etiquetas (${customWidthMm}x${customHeightMm}mm)`}
                </span>
                <span className="text-[11px] text-muted-foreground hidden md:inline">
                  {activeTab === "cover" ? "• A4 Oficial (210 x 297mm)" : `• ${labelOrientation === 'vertical' ? 'Lombada Vertical' : 'Etiqueta Horizontal'}`}
                </span>
              </div>

              {/* Botões rápidos acima da prévia */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Button
                  size="sm"
                  variant="default"
                  onClick={activeTab === "cover" ? handlePrintCover : handlePrintLabels}
                  disabled={isGenerating}
                  className={`h-7 text-xs font-bold shadow-xs ${
                    activeTab === "cover"
                      ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                      : "bg-blue-700 hover:bg-blue-800 text-white"
                  }`}
                  title="Abre a janela de impressão do navegador ou nova aba"
                >
                  {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Printer className="w-3.5 h-3.5 mr-1" />}
                  Imprimir
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={activeTab === "cover" ? handleDownloadCoverPdf : handleDownloadLabelsPdf}
                  disabled={isGenerating}
                  className="h-7 text-xs font-semibold border-slate-300 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 text-foreground"
                  title="Baixa o documento diretamente em arquivo PDF para imprimir onde quiser"
                >
                  <Download className="w-3.5 h-3.5 mr-1 text-primary" />
                  Baixar PDF
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={activeTab === "cover" ? handleDownloadCoverImage : handleDownloadLabelsImage}
                  disabled={isGenerating}
                  className="h-7 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  title="Baixar imagem em PNG de alta resolução para enviar no WhatsApp ou gráfica"
                >
                  <ImageIcon className="w-3.5 h-3.5 mr-1" />
                  Imagem PNG
                </Button>
              </div>
            </div>

            {activeTab === "cover" ? (
              /* PREVIEW DA CAPA DA PASTA A4 */
              <div
                id="printable-folder-cover-area"
                className="w-[210mm] min-h-[297mm] bg-white text-slate-900 shadow-2xl p-[18mm] rounded-sm border border-slate-300 flex flex-col justify-between my-2 text-left select-text"
                style={{
                  fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
                  boxSizing: "border-box",
                }}
              >
                {/* Cabeçalho */}
                <div>
                  <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-5">
                    <div className="flex items-center gap-4">
                      {registeredLogo ? (
                        <img
                          src={registeredLogo}
                          alt="Brasão"
                          className="h-16 w-16 object-contain shrink-0"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-full border-2 border-slate-900 flex items-center justify-center font-bold text-lg shrink-0">
                          IEPC
                        </div>
                      )}
                      <div>
                        <h1 className="text-base font-extrabold tracking-wide uppercase leading-tight text-slate-900">
                          {customChurchName}
                        </h1>
                        <h2 className="text-xs font-semibold text-slate-700 uppercase mt-0.5">
                          {customBranchName} • CNPJ: {churchLeadership.church.cnpj}
                        </h2>
                        <p className="text-[10px] text-slate-600">
                          {churchLeadership.church.address} - {churchLeadership.church.cidade}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-3 py-1 bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider rounded-sm">
                        {folderNumber}
                      </span>
                      <div className="text-[9px] text-slate-500 mt-1">
                        Arquivo Físico Oficial
                      </div>
                    </div>
                  </div>

                  {/* Faixa Título Principal */}
                  <div className="bg-slate-100 border-2 border-slate-900 p-4 text-center rounded-sm mb-6">
                    <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-1">
                      PASTA DE PRESTAÇÃO DE CONTAS & DOCUMENTOS FÍSICOS
                    </div>
                    <div className="text-2xl font-black uppercase text-slate-950 tracking-wide">
                      {monthLabel}
                    </div>
                    <div className="text-xs font-semibold text-slate-700 mt-1">
                      Local de Guarda: <span className="font-bold text-slate-900">{archiveLocation}</span>
                    </div>
                  </div>

                  {/* Resumo Contábil do Mês */}
                  <div className="mb-6">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-2 border-b border-slate-300 pb-1 flex items-center justify-between">
                      <span>1. Demonstrativo Contábil do Fechamento</span>
                      <span className="text-[10px] font-normal text-slate-600">
                        {monthMetrics.totalTransacoes} lançamentos conferidos
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="border border-slate-400 p-2.5 rounded-sm bg-slate-50">
                        <div className="text-[9px] font-bold uppercase text-slate-600">Saldo Anterior</div>
                        <div className="text-xs font-black font-mono text-slate-900 mt-1">
                          R$ {monthMetrics.saldoAnterior.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="border border-slate-400 p-2.5 rounded-sm bg-emerald-50/70">
                        <div className="text-[9px] font-bold uppercase text-emerald-800">Total Receitas (+)</div>
                        <div className="text-xs font-black font-mono text-emerald-800 mt-1">
                          + R$ {monthMetrics.totalEntradas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="border border-slate-400 p-2.5 rounded-sm bg-rose-50/70">
                        <div className="text-[9px] font-bold uppercase text-rose-800">Total Despesas (-)</div>
                        <div className="text-xs font-black font-mono text-rose-800 mt-1">
                          - R$ {monthMetrics.totalSaidas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      <div className="border-2 border-slate-900 p-2.5 rounded-sm bg-blue-50/70">
                        <div className="text-[9px] font-bold uppercase text-blue-900">Saldo Final em Caixa</div>
                        <div className="text-xs font-black font-mono text-blue-900 mt-1">
                          R$ {monthMetrics.saldoFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Checklist dos Documentos Contidos */}
                  <div className="mb-6">
                    <div className="text-xs font-extrabold uppercase tracking-wider text-slate-900 mb-2 border-b border-slate-300 pb-1">
                      2. Relação de Documentos Físicos Arquivados Nesta Pasta
                    </div>

                    <div className="border border-slate-400 rounded-sm p-3 bg-white space-y-2 text-xs">
                      {checklist.balanceteD3 && (
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono">[ X ]</span>
                          <span><strong>Balancete Financeiro Oficial:</strong> Demonstrativo sintético e analítico impresso do mês.</span>
                        </div>
                      )}
                      {checklist.recibosNotas && (
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono">[ X ]</span>
                          <span><strong>Comprovantes de Saída / Pagamentos:</strong> Notas fiscais, recibos assinados e cupons fiscais originais.</span>
                        </div>
                      )}
                      {checklist.borderosOfertas && (
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono">[ X ]</span>
                          <span><strong>Borderôs e Envelopes de Arrecadação:</strong> Registro de dízimos, ofertas dos cultos e campanhas.</span>
                        </div>
                      )}
                      {checklist.extratosBancarios && (
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono">[ X ]</span>
                          <span><strong>Extratos Bancários Conciliados:</strong> Folhas de extrato bancário oficial com conciliação do saldo.</span>
                        </div>
                      )}
                      {checklist.termoFechamento && (
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono">[ X ]</span>
                          <span><strong>Termo de Encerramento e Trava Contábil:</strong> Registro de conferência física e aprovação de diretoria.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Observação / Visto */}
                  <div className="mb-6 p-3 bg-slate-50 border border-slate-300 rounded-sm text-xs">
                    <span className="font-bold uppercase text-[10px] text-slate-600 block mb-1">Declaração da Tesouraria:</span>
                    <p className="italic text-slate-800 leading-relaxed">
                      "{folderNotes}"
                    </p>
                  </div>
                </div>

                {/* Bloco de Assinaturas e Carimbo */}
                <div className="pt-6 border-t-2 border-slate-900">
                  <div className="grid grid-cols-3 gap-6 text-center text-xs">
                    <div>
                      <div className="border-b border-slate-900 pb-1 min-h-[35px] flex items-end justify-center font-semibold text-slate-800 text-[11px]">
                        {pastorName}
                      </div>
                      <div className="font-bold uppercase mt-1 text-[10px] text-slate-900">
                        Pastor Titular / Presidente
                      </div>
                    </div>

                    <div>
                      <div className="border-b border-slate-900 pb-1 min-h-[35px] flex items-end justify-center font-semibold text-slate-800 text-[11px]">
                        {tesoureiroName}
                      </div>
                      <div className="font-bold uppercase mt-1 text-[10px] text-slate-900">
                        1º Tesoureiro(a)
                      </div>
                    </div>

                    <div>
                      <div className="border-b border-slate-900 pb-1 min-h-[35px] flex items-end justify-center font-semibold text-slate-800 text-[11px]">
                        {conselhoFiscalName}
                      </div>
                      <div className="font-bold uppercase mt-1 text-[10px] text-slate-900">
                        Conselho Fiscal / Visto
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-6 pt-3 border-t border-slate-200">
                    <div>
                      Pasta arquivada em: {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR")}
                    </div>
                    <div className="font-semibold text-slate-700">
                      Sistema de Gestão Eclesiástica • Desenvolvido por Carlito Carvalho Rodrigues
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* PREVIEW DAS ETIQUETAS */
              <div
                id="printable-folder-labels-area"
                className="w-full bg-white p-6 rounded-sm border border-slate-300 shadow-md flex flex-wrap gap-6 items-start justify-center"
                style={{
                  fontFamily: "Arial, 'Helvetica Neue', Helvetica, sans-serif",
                }}
              >
                {Array.from({ length: labelCopies }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`bg-white text-slate-900 p-3 flex flex-col justify-between ${
                      showCutBorders ? "border-2 border-dashed border-slate-400" : "border border-slate-200"
                    }`}
                    style={{
                      width: `${customWidthMm}mm`,
                      height: `${customHeightMm}mm`,
                      boxSizing: "border-box",
                      overflow: "hidden",
                    }}
                  >
                    {/* Conteúdo da Etiqueta */}
                    <div className="flex flex-col items-center text-center h-full justify-between">
                      {/* Topo da Etiqueta */}
                      <div className="w-full">
                        {showLogoOnLabel && registeredLogo && (
                          <div className="flex justify-center mb-1">
                            <img
                              src={registeredLogo}
                              alt="Logo"
                              className="h-8 w-8 object-contain"
                            />
                          </div>
                        )}
                        <div
                          className={`font-black uppercase tracking-wider text-slate-900 leading-tight ${
                            fontSizeLevel === "xl"
                              ? "text-sm"
                              : fontSizeLevel === "lg"
                              ? "text-xs"
                              : "text-[10px]"
                          }`}
                        >
                          {customChurchName}
                        </div>
                        <div className="text-[9px] font-semibold text-slate-600 uppercase mt-0.5">
                          {customBranchName}
                        </div>
                        <div className="w-full border-b-2 border-slate-900 my-1.5" />
                      </div>

                      {/* Miolo em Destaque */}
                      <div className="w-full my-auto py-1">
                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                          FECHAMENTO FINANCEIRO
                        </div>
                        <div
                          className={`font-black uppercase text-slate-950 mt-0.5 ${
                            fontSizeLevel === "xl"
                              ? "text-base"
                              : fontSizeLevel === "lg"
                              ? "text-sm"
                              : fontSizeLevel === "md"
                              ? "text-xs"
                              : "text-[11px]"
                          }`}
                        >
                          {monthLabel}
                        </div>
                        <div className="mt-1 inline-block bg-slate-900 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-xs uppercase">
                          {folderNumber}
                        </div>
                        <div className="text-[9px] font-semibold text-slate-700 mt-1">
                          Saldo: R$ {monthMetrics.saldoFinal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </div>
                      </div>

                      {/* Rodapé da Etiqueta */}
                      <div className="w-full border-t border-slate-300 pt-1 text-[8px] text-slate-600">
                        <div className="flex justify-between items-center font-bold">
                          <span>CONFERIDO</span>
                          <span>VISTO: _________</span>
                        </div>
                        <div className="text-[7px] text-slate-400 mt-0.5">
                          {archiveLocation}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
