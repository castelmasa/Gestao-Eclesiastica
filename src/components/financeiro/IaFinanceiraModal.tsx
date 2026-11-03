import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Camera,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Printer,
  Share2,
  TrendingUp,
  DollarSign,
  Building,
  Calendar,
  Save,
  Lightbulb,
  FileCheck,
  RotateCcw,
  Receipt,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { drawSafeChurchReportHeader, drawFinancialReportSignatures, getRegisteredChurchLogo } from "@/lib/churchLogoHelper";

interface Transaction {
  id?: string;
  date: string;
  documentNumber: string;
  description: string;
  category: string;
  type: string;
  amount: number;
  branchId?: string;
  supplier?: string;
  status?: "Pago" | "Pendente";
  dueDate?: string;
  paymentMethod?: string;
  comprovante?: string;
  receiptFileName?: string;
  [key: string]: any;
}

interface IaFinanceiraModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  activeBranchName: string;
  activeBranchId: string;
  categories: any[];
  onApplyToNewTransaction?: (data: Partial<Transaction>) => void;
}

export function IaFinanceiraModal({
  isOpen,
  onClose,
  transactions,
  activeBranchName,
  activeBranchId,
  categories,
  onApplyToNewTransaction,
}: IaFinanceiraModalProps) {
  const [activeTab, setActiveTab] = useState<"ocr" | "parecer" | "consultoria">("ocr");

  // --- TAB 1: OCR / Reconhecimento de Comprovantes ---
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>("");
  const [isAnalyzingOcr, setIsAnalyzingOcr] = useState(false);
  const [ocrResult, setOcrResult] = useState<Partial<Transaction> | null>(null);
  const [ocrConfidence, setOcrConfidence] = useState<string>("");
  const [ocrNotes, setOcrNotes] = useState<string>("");
  const [isSavingOcrTx, setIsSavingOcrTx] = useState(false);

  // --- TAB 2: Parecer da Tesouraria para Assembleia ---
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [parecerPeriod, setParecerPeriod] = useState<string>(currentMonthStr);
  const [isGeneratingParecer, setIsGeneratingParecer] = useState(false);
  const [generatedParecer, setGeneratedParecer] = useState<string>("");
  const [responsibleName, setResponsibleName] = useState<string>("Tesouraria Geral");

  // --- TAB 3: Diagnóstico & Economia Inteligente ---
  const [isAnalyzingFinance, setIsAnalyzingFinance] = useState(false);
  const [financeDiagnosis, setFinanceDiagnosis] = useState<{
    analiseGeral?: string;
    sugestoesCorte?: string[];
    metasArrecadacao?: string[];
  } | null>(null);

  // Handler para Upload de Imagem de Comprovante
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida (PNG, JPG, WEBP).");
      return;
    }

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setOcrResult(null);
    };
    reader.readAsDataURL(file);
  };

  // Chama Gemini 3.8 Flash para OCR de Comprovante via server-side
  const handleAnalyzeReceipt = async () => {
    if (!selectedImage) {
      toast.error("Selecione ou tire a foto de um comprovante primeiro.");
      return;
    }

    try {
      setIsAnalyzingOcr(true);
      const res = await fetch("/api/gemini/receipt-ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: selectedImage,
          mimeType: "image/jpeg",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erro ${res.status} ao processar comprovante`);
      }

      const data = await res.json();

      setOcrResult({
        type: data.type || "saida",
        amount: Number(data.amount) || 0,
        date: data.date || new Date().toISOString().split("T")[0],
        supplier: data.supplier || "",
        category: data.category || "Outros",
        description: data.description || "Pagamento / Comprovante",
        paymentMethod: data.paymentMethod || "Pix",
        documentNumber: data.documentNumber || "",
        status: (data.status as "Pago" | "Pendente") || "Pago",
        branchId: activeBranchId !== "all" ? activeBranchId : "sede",
        comprovante: selectedImage,
        receiptFileName: imageFileName || "comprovante_ia.jpg",
      });

      setOcrConfidence(data.confidence || "alta");
      setOcrNotes(data.observacoes || "");
      toast.success("Comprovante auditado e identificado com sucesso pela IA!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Falha ao analisar comprovante com IA.");
    } finally {
      setIsAnalyzingOcr(false);
    }
  };

  // Salva transação identificada diretamente no Firestore
  const handleSaveOcrDirectly = async () => {
    if (!ocrResult || !ocrResult.amount || !ocrResult.description) {
      toast.error("Preencha ao menos a descrição e o valor antes de salvar.");
      return;
    }

    try {
      setIsSavingOcrTx(true);
      const txPayload = {
        type: ocrResult.type || "saida",
        amount: Number(ocrResult.amount) || 0,
        date: ocrResult.date || new Date().toISOString().split("T")[0],
        supplier: ocrResult.supplier || "",
        category: ocrResult.category || "Despesas Gerais",
        description: ocrResult.description,
        paymentMethod: ocrResult.paymentMethod || "Pix",
        documentNumber: ocrResult.documentNumber || "",
        status: ocrResult.status || "Pago",
        branchId: activeBranchId !== "all" ? activeBranchId : "sede",
        costCenter: "Geral",
        comprovante: selectedImage || "",
        receiptFileName: imageFileName || "comprovante_ia.jpg",
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "transactions"), txPayload);

      // Disparar evento para componentes ouvintes sincronizarem
      window.dispatchEvent(new CustomEvent("app:tx-added", { detail: txPayload }));

      toast.success("Lançamento salvo com sucesso no Livro Caixa!");
      setOcrResult(null);
      setSelectedImage(null);
      setImageFileName("");
    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao salvar lançamento no banco de dados.");
    } finally {
      setIsSavingOcrTx(false);
    }
  };

  // Transfere os dados para o formulário padrão de Nova Transação do Financeiro
  const handleOpenInStandardForm = () => {
    if (!ocrResult) return;
    if (onApplyToNewTransaction) {
      onApplyToNewTransaction(ocrResult);
      onClose();
    }
  };

  // Gera Parecer da Tesouraria para Assembleia
  const handleGenerateParecer = async () => {
    try {
      setIsGeneratingParecer(true);

      // Filtrar dados do período
      const periodTxs = transactions.filter((t) => {
        if (!t.date) return false;
        return t.date.startsWith(parecerPeriod);
      });

      let totalEntradas = 0;
      let totalSaidas = 0;
      const catMap: Record<string, number> = {};

      periodTxs.forEach((t) => {
        if (t.type === "entrada") totalEntradas += t.amount;
        else {
          totalSaidas += t.amount;
          const cat = t.category || "Geral";
          catMap[cat] = (catMap[cat] || 0) + t.amount;
        }
      });

      // Saldo acumulado total até o período
      const saldoAtual = transactions.reduce((acc, t) => {
        return t.type === "entrada" ? acc + t.amount : acc - t.amount;
      }, 0);

      const topCategories = Object.entries(catMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([cat, val]) => `${cat}: R$ ${val.toFixed(2)}`);

      const res = await fetch("/api/gemini/finance-parecer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: parecerPeriod,
          churchName: "Igreja Evangélica Pentecostal O Brasil Para Cristo",
          branchName: activeBranchName,
          responsibleName,
          summary: {
            totalEntradas,
            totalSaidas,
            saldoPeriodo: totalEntradas - totalSaidas,
            saldoAtual,
            topCategories,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao gerar parecer.");
      }

      const data = await res.json();
      setGeneratedParecer(data.parecer || "");
      toast.success("Parecer da Tesouraria elaborado com sucesso!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao gerar parecer.");
    } finally {
      setIsGeneratingParecer(false);
    }
  };

  // Copia o parecer gerado
  const handleCopyParecer = () => {
    if (!generatedParecer) return;
    navigator.clipboard.writeText(generatedParecer);
    toast.success("Parecer copiado para a área de transferência!");
  };

  // Baixa o Parecer em PDF Timbrado A4
  const handleDownloadParecerPdf = () => {
    if (!generatedParecer) return;

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const churchData = {
        razaoSocial: "Igreja Evangélica Pentecostal O Brasil Para Cristo",
        nomeFantasia: activeBranchName,
        logoDataUrl: getRegisteredChurchLogo(activeBranchId),
      };

      drawSafeChurchReportHeader(doc, {
        churchData,
        title: "PARECER EXECUTIVO DA TESOURARIA - ASSEMBLEIA GERAL",
        subtitle: `Período de Apuração: ${parecerPeriod} | Emitido em: ${new Date().toLocaleDateString("pt-BR")}`
      });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 41, 59);

      const splitText = doc.splitTextToSize(generatedParecer, 180);
      doc.text(splitText, 15, 52);

      const finalY = Math.min(240, 52 + splitText.length * 5 + 10);
      drawFinancialReportSignatures(doc, churchData, finalY);

      doc.save(`parecer-tesouraria-${parecerPeriod}.pdf`);
      toast.success("PDF do Parecer gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar PDF do Parecer.");
    }
  };

  // Compartilha no WhatsApp
  const handleShareWhatsapp = () => {
    if (!generatedParecer) return;
    const textEncoded = encodeURIComponent(
      `*🏛️ PARECER FINANCEIRO DA TESOURARIA - ${activeBranchName}*\n\n${generatedParecer}`
    );
    window.open(`https://api.whatsapp.com/send?text=${textEncoded}`, "_blank");
  };

  // Executa o Diagnóstico Financeiro
  const handleRunDiagnosis = async () => {
    try {
      setIsAnalyzingFinance(true);

      // Agrupa últimos 6 a 12 meses
      const monthMap: Record<string, { entradas: number; saidas: number }> = {};
      transactions.forEach((t) => {
        if (!t.date) return;
        const ym = t.date.substring(0, 7);
        if (!monthMap[ym]) monthMap[ym] = { entradas: 0, saidas: 0 };
        if (t.type === "entrada") monthMap[ym].entradas += t.amount;
        else monthMap[ym].saidas += t.amount;
      });

      const res = await fetch("/api/gemini/finance-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          last12Months: monthMap,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao consultar IA.");
      }

      const data = await res.json();
      setFinanceDiagnosis(data);
      toast.success("Diagnóstico financeiro concluído com sucesso!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Falha ao gerar diagnóstico.");
    } finally {
      setIsAnalyzingFinance(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] sm:max-w-[850px] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="pb-2 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  IA Financeira Eclesiástica
                  <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                    Gemini 3.8 Flash
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
                  Automação inteligente de tesouraria: Leitura de comprovantes, pareceres para assembleia e auditoria.
                </DialogDescription>
              </div>
            </div>
            <Badge variant="secondary" className="hidden sm:inline-flex text-xs">
              <Building className="w-3 h-3 mr-1" />
              {activeBranchName}
            </Badge>
          </div>
        </DialogHeader>

        {/* Abas Principais */}
        <Tabs
          value={activeTab}
          onValueChange={(v: any) => setActiveTab(v)}
          className="flex-1 flex flex-col overflow-hidden pt-2"
        >
          <TabsList className="grid grid-cols-3 mb-3 bg-muted/60 p-1">
            <TabsTrigger value="ocr" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span className="hidden xs:inline">1. Leitor de</span> Comprovante
            </TabsTrigger>
            <TabsTrigger value="parecer" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <FileCheck className="w-4 h-4 text-blue-600" />
              <span className="hidden xs:inline">2. Parecer</span> Assembleia
            </TabsTrigger>
            <TabsTrigger value="consultoria" className="flex items-center gap-1.5 text-xs sm:text-sm font-medium">
              <Lightbulb className="w-4 h-4 text-amber-600" />
              <span className="hidden xs:inline">3. Diagnóstico &</span> Economia
            </TabsTrigger>
          </TabsList>

          {/* ========================================================================= */}
          {/* TAB 1: OCR / Reconhecimento de Comprovantes com Lançamento Automático */}
          {/* ========================================================================= */}
          <TabsContent value="ocr" className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Painel Esquerdo: Upload & Imagem */}
              <div className="md:col-span-5 flex flex-col gap-3">
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:bg-muted/30 transition-colors flex flex-col items-center justify-center min-h-[220px]">
                  {selectedImage ? (
                    <div className="relative w-full flex flex-col items-center">
                      <img
                        src={selectedImage}
                        alt="Comprovante"
                        className="max-h-56 object-contain rounded-lg shadow-sm border border-border"
                      />
                      <p className="text-xs text-muted-foreground mt-2 truncate max-w-[200px]">{imageFileName}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedImage(null);
                          setOcrResult(null);
                          setImageFileName("");
                        }}
                        className="text-xs text-rose-600 hover:text-rose-700 mt-1 h-7"
                      >
                        <RotateCcw className="w-3.5 h-3.5 mr-1" /> Trocar Foto
                      </Button>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center p-4 w-full h-full">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                        <Camera className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        Fotografar ou Selecionar Arquivo
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Cupom Fiscal, Recibo, PIX ou Nota Fiscal (PNG, JPG)
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageFileChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <Button
                  onClick={handleAnalyzeReceipt}
                  disabled={!selectedImage || isAnalyzingOcr}
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold shadow-sm"
                >
                  {isAnalyzingOcr ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Auditando com IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Auditar & Extrair Dados
                    </>
                  )}
                </Button>
              </div>

              {/* Painel Direito: Dados Extraídos & Edição Rápida */}
              <div className="md:col-span-7 flex flex-col">
                {isAnalyzingOcr ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/20 rounded-xl border border-border/60 text-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                    <h4 className="text-sm font-semibold">Gemini 3.8 Flash analisando documento</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                      Identificando valores, fornecedor, CNPJ, data de emissão e sugerindo a categoria contábil eclesiástica...
                    </p>
                  </div>
                ) : ocrResult ? (
                  <div className="bg-card border border-border rounded-xl p-4 space-y-3.5 shadow-xs flex-1">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                          Dados Extraídos com Sucesso
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[11px] capitalize">
                        Confiança: {ocrConfidence || "Alta"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <Label className="text-xs">Tipo de Lançamento</Label>
                        <Select
                          value={ocrResult.type || "saida"}
                          onValueChange={(v) => setOcrResult((prev) => ({ ...prev, type: v }))}
                        >
                          <SelectTrigger className="h-8 text-xs mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="saida">Saída (Despesa / Pagamento)</SelectItem>
                            <SelectItem value="entrada">Entrada (Dízimo / Oferta)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label className="text-xs font-semibold">Valor (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={ocrResult.amount ?? ""}
                          onChange={(e) =>
                            setOcrResult((prev) => ({
                              ...prev,
                              amount: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="h-8 text-xs font-bold text-emerald-600 mt-1"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <Label className="text-xs">Data da Operação</Label>
                        <Input
                          type="date"
                          value={ocrResult.date || ""}
                          onChange={(e) =>
                            setOcrResult((prev) => ({ ...prev, date: e.target.value }))
                          }
                          className="h-8 text-xs mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Forma de Pagamento</Label>
                        <Select
                          value={ocrResult.paymentMethod || "Pix"}
                          onValueChange={(v) =>
                            setOcrResult((prev) => ({ ...prev, paymentMethod: v }))
                          }
                        >
                          <SelectTrigger className="h-8 text-xs mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pix">Pix</SelectItem>
                            <SelectItem value="Cartão de Débito">Cartão de Débito</SelectItem>
                            <SelectItem value="Cartão de Crédito">Cartão de Crédito</SelectItem>
                            <SelectItem value="Boleto">Boleto</SelectItem>
                            <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                            <SelectItem value="Transferência">Transferência</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Fornecedor / Favorecido / Membro</Label>
                      <Input
                        value={ocrResult.supplier || ""}
                        onChange={(e) =>
                          setOcrResult((prev) => ({ ...prev, supplier: e.target.value }))
                        }
                        placeholder="Ex: Companhia de Energia, Posto de Gasolina, etc."
                        className="h-8 text-xs mt-1"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <Label className="text-xs">Categoria Eclesiástica</Label>
                        <Input
                          value={ocrResult.category || ""}
                          onChange={(e) =>
                            setOcrResult((prev) => ({ ...prev, category: e.target.value }))
                          }
                          placeholder="Ex: Manutenção, Água & Luz, Missões"
                          className="h-8 text-xs mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-xs">Nº do Documento / Autenticação</Label>
                        <Input
                          value={ocrResult.documentNumber || ""}
                          onChange={(e) =>
                            setOcrResult((prev) => ({ ...prev, documentNumber: e.target.value }))
                          }
                          placeholder="Ex: NF 123456 ou ID Pix"
                          className="h-8 text-xs mt-1"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs">Descrição do Lançamento</Label>
                      <Input
                        value={ocrResult.description || ""}
                        onChange={(e) =>
                          setOcrResult((prev) => ({ ...prev, description: e.target.value }))
                        }
                        className="h-8 text-xs mt-1"
                      />
                    </div>

                    {ocrNotes && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 text-[11px] text-amber-800 dark:text-amber-300">
                        <strong>Nota da IA:</strong> {ocrNotes}
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t mt-2">
                      <Button
                        type="button"
                        onClick={handleSaveOcrDirectly}
                        disabled={isSavingOcrTx}
                        className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white text-xs h-9 font-semibold"
                      >
                        {isSavingOcrTx ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        ) : (
                          <Save className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Salvar no Caixa Agora
                      </Button>
                      {onApplyToNewTransaction && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleOpenInStandardForm}
                          className="text-xs h-9"
                        >
                          Revisar no Formulário Completo
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/10 rounded-xl border border-dashed border-border/80 text-center">
                    <Receipt className="w-10 h-10 text-muted-foreground/50 mb-3" />
                    <h4 className="text-sm font-medium text-foreground">Aguardando Comprovante</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      Envie uma imagem de recibo ou cupom à esquerda e clique em <b>Auditar & Extrair Dados</b> para preenchimento com IA.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 2: Parecer Oficial para Assembleia e Reunião de Membros */}
          {/* ========================================================================= */}
          <TabsContent value="parecer" className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-4 space-y-3 bg-muted/20 p-3.5 rounded-xl border border-border">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Configurações do Parecer
                </h4>

                <div>
                  <Label className="text-xs">Mês de Apuração</Label>
                  <Input
                    type="month"
                    value={parecerPeriod}
                    onChange={(e) => setParecerPeriod(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs">Nome do Relator / Tesoureiro</Label>
                  <Input
                    value={responsibleName}
                    onChange={(e) => setResponsibleName(e.target.value)}
                    placeholder="Ex: Presb. João da Silva (Tesouraria)"
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div className="bg-card p-3 rounded-lg border border-border/60 text-xs space-y-1.5">
                  <div className="font-semibold text-foreground">Escopo do Relatório:</div>
                  <div className="text-muted-foreground">
                    • Saudação Bíblica & Mordomia Cristã
                  </div>
                  <div className="text-muted-foreground">
                    • Resumo Consolidado de Entradas & Despesas
                  </div>
                  <div className="text-muted-foreground">
                    • Parecer Técnico do Conselho Fiscal
                  </div>
                  <div className="text-muted-foreground">
                    • Recomendação de Aprovação das Contas
                  </div>
                </div>

                <Button
                  onClick={handleGenerateParecer}
                  disabled={isGeneratingParecer}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 shadow-xs"
                >
                  {isGeneratingParecer ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                      Redigindo Parecer com IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-2" />
                      Elaborar Parecer Solene
                    </>
                  )}
                </Button>
              </div>

              <div className="md:col-span-8 flex flex-col">
                {isGeneratingParecer ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/20 rounded-xl border border-border text-center min-h-[300px]">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
                    <h4 className="text-sm font-semibold">Gemini 3.8 Flash redigindo documento</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      Calculando métricas financeiras, inserindo passagens canônicas de transparência e redigindo o parecer para leitura em assembleia...
                    </p>
                  </div>
                ) : generatedParecer ? (
                  <div className="flex-1 flex flex-col bg-card border border-border rounded-xl p-4 shadow-xs">
                    <div className="flex items-center justify-between border-b pb-2 mb-3">
                      <span className="text-xs font-bold text-foreground">
                        Texto Oficial para Assembleia / Ata
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyParecer}
                          className="h-7 text-xs px-2.5"
                          title="Copiar texto"
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" /> Copiar
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleShareWhatsapp}
                          className="h-7 text-xs px-2.5 text-emerald-700 border-emerald-200"
                          title="Enviar no WhatsApp"
                        >
                          <Share2 className="w-3.5 h-3.5 mr-1" /> WhatsApp
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleDownloadParecerPdf}
                          className="h-7 text-xs px-2.5 bg-blue-700 hover:bg-blue-800 text-white"
                          title="Baixar PDF Timbrado"
                        >
                          <Download className="w-3.5 h-3.5 mr-1" /> PDF A4
                        </Button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto max-h-[360px] p-3 bg-muted/20 rounded-lg border text-xs leading-relaxed font-sans whitespace-pre-wrap text-foreground">
                      {generatedParecer}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 bg-muted/10 rounded-xl border border-dashed border-border text-center min-h-[300px]">
                    <FileText className="w-10 h-10 text-muted-foreground/50 mb-3" />
                    <h4 className="text-sm font-medium text-foreground">Nenhum Parecer Gerado</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                      Escolha o mês de apuração e clique no botão à esquerda para gerar o parecer eclesiástico formal.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* ========================================================================= */}
          {/* TAB 3: Diagnóstico Financeiro & Consultoria de Economia */}
          {/* ========================================================================= */}
          <TabsContent value="consultoria" className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  Auditoria de Custos & Otimização do Caixa
                </h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A IA analisa o histórico de lançamentos dos últimos 12 meses, detecta despesas excessivas e sugere metas de economia e captação.
                </p>
              </div>
              <Button
                onClick={handleRunDiagnosis}
                disabled={isAnalyzingFinance}
                className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-9 shrink-0 ml-3"
              >
                {isAnalyzingFinance ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Gerar Diagnóstico
                  </>
                )}
              </Button>
            </div>

            {isAnalyzingFinance ? (
              <div className="flex flex-col items-center justify-center p-12 bg-muted/20 rounded-xl border border-border text-center">
                <Loader2 className="w-10 h-10 text-amber-600 animate-spin mb-3" />
                <h4 className="text-sm font-semibold">Cruzando dados de entradas e saídas</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Detectando sazonalidade de arrecadação, desvios e oportunidades de redução de contas fixas...
                </p>
              </div>
            ) : financeDiagnosis ? (
              <div className="space-y-4">
                {financeDiagnosis.analiseGeral && (
                  <div className="p-3.5 rounded-xl bg-card border border-border shadow-xs">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                      Visão Geral da Saúde Financeira
                    </h5>
                    <p className="text-xs text-foreground leading-relaxed">
                      {financeDiagnosis.analiseGeral}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Sugestões de Cortes */}
                  <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-rose-800 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      Sugestões de Redução & Economia
                    </h5>
                    <ul className="space-y-2 text-xs text-foreground">
                      {financeDiagnosis.sugestoesCorte?.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      )) || <li className="text-muted-foreground">Nenhuma sugestão encontrada.</li>}
                    </ul>
                  </div>

                  {/* Metas de Arrecadação */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5" />
                      Metas & Campanhas Estratégicas
                    </h5>
                    <ul className="space-y-2 text-xs text-foreground">
                      {financeDiagnosis.metasArrecadacao?.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      )) || <li className="text-muted-foreground">Nenhuma meta gerada.</li>}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-12 bg-muted/10 rounded-xl border border-dashed border-border text-center">
                <TrendingUp className="w-10 h-10 text-muted-foreground/50 mb-3" />
                <h4 className="text-sm font-medium text-foreground">Ainda não há análise realizada</h4>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                  Clique no botão <b>Gerar Diagnóstico</b> acima para receber recomendações e conselhos financeiros sob medida para a sua congregação.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
