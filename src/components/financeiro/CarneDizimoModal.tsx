import React, { useState, useMemo, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { QRCodeSVG } from "qrcode.react";
import { generatePixPayload, validateAndDetectPixKey } from "@/lib/pixHelper";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";
import {
  Printer,
  Copy,
  Check,
  QrCode,
  Calendar,
  User,
  Share2,
  DollarSign,
  Download,
  FileText,
  Sparkles,
  Building2,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  XCircle,
  Wallet
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";

interface CarneDizimoModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: any[];
  churchData?: any;
  activeBranchName?: string;
  activeBranchId?: string;
}

const MONTHS_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export function CarneDizimoModal({
  isOpen,
  onClose,
  members,
  churchData,
  activeBranchName = "Sede",
  activeBranchId,
}: CarneDizimoModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [targetYear, setTargetYear] = useState<number>(new Date().getFullYear());
  const [periodType, setPeriodType] = useState<"anual" | "semestre1" | "semestre2">("semestre2");

  // Opção de Adicionar ou Não o QR Code e a Chave Pix
  const [includePix, setIncludePix] = useState<boolean>(true);

  // Chave Pix da Igreja configurada
  const [pixKeyInput, setPixKeyInput] = useState<string>(() => {
    return churchData?.pixKey || churchData?.cnpj || "51.105.484/0001-74";
  });
  const [suggestedValue, setSuggestedValue] = useState<string>("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);
  const registeredLogo = useMemo(() => getRegisteredChurchLogo(activeBranchId || "all"), [activeBranchId]);

  // Conferência em tempo real se a chave Pix existe / formato DICT e instituição correspondente
  const pixValidation = useMemo(() => {
    return validateAndDetectPixKey(pixKeyInput, churchData?.cnpj);
  }, [pixKeyInput, churchData]);

  // Membro Selecionado
  const selectedMember = useMemo(() => {
    if (selectedMemberId === "all") return null;
    return members.find((m) => m.id === selectedMemberId) || null;
  }, [selectedMemberId, members]);

  // Lista de meses filtrados
  const activeMonths = useMemo(() => {
    if (periodType === "semestre1") {
      return MONTHS_NAMES.slice(0, 6).map((name, idx) => ({ monthName: name, monthNumber: idx + 1 }));
    }
    if (periodType === "semestre2") {
      return MONTHS_NAMES.slice(6, 12).map((name, idx) => ({ monthName: name, monthNumber: idx + 7 }));
    }
    return MONTHS_NAMES.map((name, idx) => ({ monthName: name, monthNumber: idx + 1 }));
  }, [periodType]);

  // Gera dados de cada lâmina do carnê/envelope
  const carneItems = useMemo(() => {
    const churchName = churchData?.nome || "Igreja Evangélica Pentecostal O Brasil para Cristo";
    const churchCity = churchData?.cidade || "Valparaíso - SP";
    const churchCnpj = churchData?.cnpj || "51.105.484/0001-74";
    const numericAmount = parseFloat(suggestedValue.replace(/\D/g, "")) / 100 || undefined;

    const targetMembers = selectedMember ? [selectedMember] : members.slice(0, 4);

    return targetMembers.flatMap((mem) => {
      const memberCode = mem.matricula || mem.id?.slice(0, 8).toUpperCase() || "MB-001";
      const cleanTxId = `DZ${memberCode.replace(/[^a-zA-Z0-9]/g, "")}`;

      return activeMonths.map((m) => {
        let pixPayload = "";
        if (includePix && pixValidation.isValid) {
          pixPayload = generatePixPayload({
            pixKey: pixKeyInput,
            merchantName: churchName.slice(0, 25),
            merchantCity: churchCity.slice(0, 15),
            amount: numericAmount,
            txId: cleanTxId,
            description: `DIZIMO ${m.monthName.toUpperCase()}/${targetYear}`,
          });
        }

        return {
          member: mem,
          memberCode,
          monthName: m.monthName,
          monthNumber: m.monthNumber,
          year: targetYear,
          churchName,
          churchCity,
          churchCnpj,
          pixPayload,
          suggestedAmount: numericAmount,
          txId: cleanTxId,
        };
      });
    });
  }, [selectedMember, members, activeMonths, targetYear, pixKeyInput, suggestedValue, churchData, includePix, pixValidation.isValid]);

  const handleCopyPix = (payload: string, id: string) => {
    if (!payload) return;
    navigator.clipboard.writeText(payload);
    setCopiedCode(id);
    toast.success("Código Pix Copia e Cola copiado com sucesso!");
    setTimeout(() => setCopiedCode(null), 2500);
  };

  // Método de Impressão Direto sem bloqueio por Dialog
  const handlePrintCarne = () => {
    const printArea = printAreaRef.current;
    if (!printArea) {
      toast.error("Área de impressão não encontrada.");
      return;
    }

    try {
      const iframeId = "__carne_print_iframe__";
      let iframe = document.getElementById(iframeId) as HTMLIFrameElement | null;
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = iframeId;
        iframe.style.position = "fixed";
        iframe.style.top = "-9999px";
        iframe.style.left = "-9999px";
        iframe.style.width = "210mm";
        iframe.style.height = "297mm";
        iframe.style.border = "none";
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      doc.open();
      doc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Carne_Dizimo_${targetYear}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 6mm !important;
              }
              * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              body {
                margin: 0;
                padding: 4mm;
                background: #ffffff;
                color: #0f172a;
                font-family: Arial, Helvetica, sans-serif;
              }
            </style>
          </head>
          <body>
            ${printArea.innerHTML}
          </body>
        </html>
      `);
      doc.close();

      setTimeout(() => {
        try {
          iframe?.contentWindow?.focus();
          iframe?.contentWindow?.print();
          toast.success("Diálogo de impressão aberto com sucesso!");
        } catch {
          window.print();
        }
      }, 350);
    } catch (e) {
      console.warn("Print error, downloading PDF fallback:", e);
      handleDownloadPdf();
    }
  };

  // Método de Baixar PDF A4 Oficial
  const handleDownloadPdf = async () => {
    const printArea = printAreaRef.current;
    if (!printArea) return;

    setIsExportingPdf(true);
    const toastId = toast.loading("Gerando arquivo PDF do Carnê de Dízimos...");

    try {
      const imgData = await toPng(printArea, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210;
      const imgHeight = (printArea.offsetHeight * imgWidth) / printArea.offsetWidth;

      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, Math.min(297, imgHeight));
      pdf.save(`Carne_Dizimos_${selectedMember ? selectedMember.name.replace(/\s+/g, "_") : "Igreja"}_${targetYear}.pdf`);
      toast.success("PDF do Carnê baixado com sucesso!", { id: toastId });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Falha ao gerar PDF. Tente imprimir diretamente.", { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] sm:max-w-[940px] max-h-[92vh] flex flex-col p-4 sm:p-6 overflow-hidden rounded-2xl border-emerald-900/50">
        <DialogHeader className="border-b pb-3 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600/15 text-emerald-700 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  Carnê & Envelope Digital de Dízimos
                  <Badge className="bg-emerald-600 text-white font-semibold text-[10px]">
                    {includePix ? "PIX CONCILIADO" : "TRADICIONAL"}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Gere carnês semestrais/anuais com controle individual de dízimos e conciliação bancária.
                </DialogDescription>
              </div>
            </div>

            {/* Botões de Ação de Impressão e PDF */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="border-emerald-600 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950 font-semibold gap-1.5 shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Baixar</span> PDF (A4)
              </Button>
              <Button
                size="sm"
                onClick={handlePrintCarne}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm"
              >
                <Printer className="w-4 h-4" />
                Imprimir Carnê (A4)
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Corpo com Configurações e Visualização das Lâminas */}
        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Card de Configurações do Carnê */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Membro */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Selecionar Membro:
                </Label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950">
                    <SelectValue placeholder="Selecione um membro" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="all">Primeiros 4 Membros (Amostra)</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name || m.nome} ({m.role || "Membro"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Período */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Período / Formato:
                </Label>
                <Select value={periodType} onValueChange={(v: any) => setPeriodType(v)}>
                  <SelectTrigger className="h-9 text-xs bg-white dark:bg-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="anual">Ano Completo (12 Meses)</SelectItem>
                    <SelectItem value="semestre1">1º Semestre (Jan a Jun)</SelectItem>
                    <SelectItem value="semestre2">2º Semestre (Jul a Dez)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ano */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Ano de Exercício:
                </Label>
                <Input
                  type="number"
                  value={targetYear}
                  onChange={(e) => setTargetYear(Number(e.target.value) || new Date().getFullYear())}
                  className="h-9 text-xs font-bold bg-white dark:bg-slate-950"
                />
              </div>

              {/* Valor Sugerido Opcional */}
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Valor Sugerido (R$):
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">R$</span>
                  <Input
                    placeholder="Livre preenchimento"
                    value={suggestedValue}
                    onChange={(e) => setSuggestedValue(e.target.value)}
                    className="h-9 text-xs pl-8 bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
            </div>

            {/* SEÇÃO PIX: OPÇÃO DE ATIVAR/DESATIVAR E CONFERÊNCIA COM BANCO */}
            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-950 p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Switch
                    id="include-pix-switch"
                    checked={includePix}
                    onCheckedChange={setIncludePix}
                  />
                  <div>
                    <Label htmlFor="include-pix-switch" className="text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                      Incluir Chave Pix e QR Code no Carnê
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      {includePix
                        ? "O carnê exibirá QR Code individual com identificador (TXID) para conciliação bancária automática."
                        : "Modo Tradicional ativado: talões com campos para preenchimento manual e canhoto da tesouraria."}
                    </p>
                  </div>
                </div>

                {includePix && (
                  <div className="flex-1 max-w-sm space-y-1">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Chave Pix da Igreja:
                    </Label>
                    <Input
                      value={pixKeyInput}
                      onChange={(e) => setPixKeyInput(e.target.value)}
                      placeholder="CNPJ, CPF, E-mail, Celular ou EVP"
                      className={`h-8 text-xs font-mono bg-white dark:bg-slate-900 ${
                        pixValidation.isValid
                          ? "border-emerald-500 text-emerald-800 dark:text-emerald-300"
                          : "border-rose-400 text-rose-700"
                      }`}
                    />
                  </div>
                )}
              </div>

              {/* Status de Validação da Chave Pix e Reconhecimento Bancário */}
              {includePix && (
                <div className={`p-3 rounded-lg text-xs flex items-center justify-between gap-2 transition-all ${
                  pixValidation.isValid
                    ? "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/80 text-emerald-900 dark:text-emerald-200"
                    : "bg-rose-50 dark:bg-rose-950/40 border border-rose-300/80 text-rose-900 dark:text-rose-200"
                }`}>
                  <div className="flex items-center gap-2">
                    {pixValidation.isValid ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold mr-1">
                        {pixValidation.isValid ? "✓ Chave Pix Válida & Conferida:" : "Atenção:"}
                      </span>
                      <span>{pixValidation.message}</span>
                      {pixValidation.isValid && pixValidation.bankName && (
                        <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5">
                          Instituição: {pixValidation.bankName} • Tipo: {pixValidation.typeLabel}
                        </div>
                      )}
                    </div>
                  </div>

                  <Badge
                    variant="outline"
                    className={
                      pixValidation.isValid
                        ? "bg-emerald-100 text-emerald-800 border-emerald-400 font-bold shrink-0 text-[10px]"
                        : "bg-rose-100 text-rose-800 border-rose-400 font-bold shrink-0 text-[10px]"
                    }
                  >
                    {pixValidation.isValid ? "QR CODE ATIVO" : "QR CODE BLOQUEADO"}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Grid de Visualização das Lâminas do Carnê na Tela */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground px-1">
              <span>Visualização das Lâminas do Carnê ({carneItems.length} talões):</span>
              <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                {includePix && pixValidation.isValid ? "Com Pix Copia e Cola & QR Code" : "Talões Tradicionais"}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {carneItems.map((item) => {
                const uniqueId = `${item.member.id}_${item.monthNumber}`;
                const isCopied = copiedCode === uniqueId;

                return (
                  <div
                    key={uniqueId}
                    className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-all hover:border-emerald-400/60"
                  >
                    <div>
                      {/* Topo do Talão */}
                      <div className="flex items-start justify-between border-b pb-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          {registeredLogo ? (
                            <img src={registeredLogo} alt="Logo" className="w-6 h-6 object-contain" />
                          ) : (
                            <Building2 className="w-5 h-5 text-emerald-600" />
                          )}
                          <div>
                            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-tight">
                              {activeBranchName || item.churchName}
                            </h4>
                            <span className="text-[10px] text-muted-foreground">
                              CNPJ: {item.churchCnpj} • {item.churchCity}
                            </span>
                          </div>
                        </div>

                        <Badge className="bg-emerald-600 text-white font-extrabold text-[10px] uppercase">
                          {item.monthName} / {item.year}
                        </Badge>
                      </div>

                      {/* Dados do Membro e QR Code Pix */}
                      <div className="grid grid-cols-3 gap-2.5 items-center my-2">
                        <div className="col-span-2 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block">
                            Membro Contribuinte:
                          </span>
                          <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 block leading-tight">
                            {item.member.name}
                          </span>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-0.5">
                            <span>Matrícula: <strong className="text-slate-800 dark:text-slate-200">{item.memberCode}</strong></span>
                            <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                              {item.member.role || "Membro"}
                            </Badge>
                          </div>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-400 italic pt-1">
                            "Trazei todos os dízimos à casa do tesouro..." - Ml 3:10
                          </p>
                        </div>

                        {/* QR Code Pix (Se ativado e válido) ou Selo Tradicional */}
                        <div className="flex flex-col items-center justify-center p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                          {includePix && pixValidation.isValid ? (
                            <>
                              <QRCodeSVG value={item.pixPayload} size={64} level="M" />
                              <span className="text-[8px] font-bold text-emerald-700 dark:text-emerald-400 mt-1 uppercase">
                                PIX CONCILIADO
                              </span>
                            </>
                          ) : (
                            <div className="text-center py-2 px-1">
                              <Wallet className="w-8 h-8 text-emerald-600 mx-auto opacity-80" />
                              <span className="text-[9px] font-black text-slate-800 dark:text-slate-200 block mt-1 uppercase">
                                TALÃO
                              </span>
                              <span className="text-[8px] text-slate-500">TRADICIONAL</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Rodapé do Talão com Botões Copiar Pix e WhatsApp */}
                    <div className="border-t pt-2.5 mt-2 flex items-center justify-between gap-2">
                      <div className="text-[10px] text-muted-foreground truncate">
                        {includePix && pixValidation.isValid ? (
                          <span>ID: <strong className="font-mono text-slate-700 dark:text-slate-300">{item.txId}</strong></span>
                        ) : (
                          <span>Visto da Tesouraria: ______________</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {includePix && pixValidation.isValid && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopyPix(item.pixPayload, uniqueId)}
                            className="h-7 text-[11px] gap-1 px-2 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                          >
                            {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            {isCopied ? "Copiado!" : "Copiar Pix"}
                          </Button>
                        )}

                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            let msg = "";
                            if (includePix && pixValidation.isValid) {
                              msg = `🕊️ *CARNÊ DE DÍZIMOS E OFERTAS - ${item.monthName.toUpperCase()}/${item.year}*
🏛 *Igreja:* ${item.churchName}
👤 *Membro:* ${item.member.name} (Matrícula: ${item.memberCode})
🔑 *Chave Pix:* ${pixKeyInput}
🔒 *Identificador TXID:* ${item.txId}

*Código Pix Copia e Cola:*
\`\`\`${item.pixPayload}\`\`\`

_"Cada um contribua segundo propôs no seu coração; não com tristeza, ou por necessidade; porque Deus ama ao que dá com alegria." - 2 Co 9:7_`;
                            } else {
                              msg = `🕊️ *CARNÊ DE DÍZIMOS E OFERTAS - ${item.monthName.toUpperCase()}/${item.year}*
🏛 *Igreja:* ${item.churchName}
👤 *Membro:* ${item.member.name} (Matrícula: ${item.memberCode})
Lembrete de fidelidade e gratidão na casa do Senhor. Que Deus abençoe grandemente!`;
                            }
                            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, "_blank");
                          }}
                          className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white gap-1 px-2"
                        >
                          <Share2 className="w-3 h-3" />
                          WhatsApp
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CONTAINER DE IMPRESSÃO PROFISSIONAL A4 (RENDERIZADO FIXO OFFSCREEN PARA PERFEITA CAPTURA E IMPRESSÃO) */}
        <div
          style={{
            position: "fixed",
            left: "-9999px",
            top: 0,
            width: "210mm",
            minHeight: "297mm",
            backgroundColor: "#ffffff",
            color: "#0f172a",
            zIndex: -100,
            visibility: "visible",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          <div ref={printAreaRef} id="carne-dizimo-print-area" style={{ width: "210mm", padding: "10mm", backgroundColor: "#ffffff" }}>
            <div style={{ textAlign: "center", borderBottom: "2px solid #065f46", paddingBottom: "6px", marginBottom: "10px" }}>
              <h2 style={{ fontSize: "15px", fontWeight: "900", textTransform: "uppercase", margin: 0, color: "#065f46" }}>
                {churchData?.nome || "Igreja Evangélica Pentecostal O Brasil para Cristo"}
              </h2>
              <div style={{ fontSize: "9.5px", color: "#475569", marginTop: "2px" }}>
                CARNÊ OFICIAL DE DÍZIMOS E OFERTAS • EXERCÍCIO {targetYear} • {activeBranchName} • CNPJ: {churchData?.cnpj || "51.105.484/0001-74"}
              </div>
            </div>

            {/* Grid 2 colunas com linhas de corte pontilhadas */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8mm" }}>
              {carneItems.map((item) => (
                <div
                  key={`print_${item.member.id}_${item.monthNumber}`}
                  style={{
                    border: "1.5px dashed #065f46",
                    borderRadius: "8px",
                    padding: "10px",
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "58mm",
                    backgroundColor: "#fcfdfd",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #cbd5e1", paddingBottom: "4px" }}>
                    <div style={{ fontSize: "9px", fontWeight: "bold", textTransform: "uppercase", color: "#065f46" }}>
                      {item.churchName}
                    </div>
                    <div style={{ fontSize: "9px", fontWeight: "900", color: "#ffffff", backgroundColor: "#065f46", padding: "2px 8px", borderRadius: "3px" }}>
                      {item.monthName} / {item.year}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", margin: "6px 0" }}>
                    <div style={{ flex: 1, fontSize: "9px" }}>
                      <div style={{ color: "#64748b", fontSize: "7.5px", textTransform: "uppercase" }}>Membro:</div>
                      <div style={{ fontWeight: "900", fontSize: "11px", color: "#0f172a" }}>{item.member.name}</div>
                      <div style={{ fontSize: "8px", color: "#475569", marginTop: "2px" }}>
                        Matrícula: <strong>{item.memberCode}</strong> {includePix && pixValidation.isValid ? `• Ref: ${item.txId}` : ""}
                      </div>
                      <div style={{ fontSize: "7.5px", color: "#065f46", fontStyle: "italic", marginTop: "4px" }}>
                        "Deus ama ao que dá com alegria." - 2 Co 9:7
                      </div>
                    </div>

                    <div style={{ textAlign: "center", border: "1px solid #065f46", padding: "4px", borderRadius: "6px", backgroundColor: "#ffffff" }}>
                      {includePix && pixValidation.isValid ? (
                        <>
                          <QRCodeSVG value={item.pixPayload} size={58} level="M" />
                          <div style={{ fontSize: "6.5px", fontWeight: "bold", marginTop: "2px", color: "#065f46" }}>
                            PIX CONCILIADO
                          </div>
                        </>
                      ) : (
                        <div style={{ width: "58px", height: "58px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#f0fdf4" }}>
                          <span style={{ fontSize: "8px", fontWeight: "bold", color: "#065f46" }}>TALÃO</span>
                          <span style={{ fontSize: "7px", color: "#64748b" }}>OFICIAL</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ borderTop: "1px dashed #cbd5e1", paddingTop: "5px", display: "flex", justifyContent: "space-between", fontSize: "7.5px", color: "#475569" }}>
                    <div>{includePix && pixValidation.isValid ? `Chave Pix: ${pixKeyInput}` : "Canhoto da Tesouraria"}</div>
                    <div>Data: ____/____/{item.year} • Valor R$: ___________</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-emerald-600" />
            {includePix
              ? "Chaves Pix válidas geram QR Code com identificação individual (TXID) para conciliação no extrato bancário."
              : "Modo Tradicional: talões com linhas de corte pontilhadas para preenchimento manual e visto pastoral."}
          </span>
          <Button variant="outline" onClick={onClose} className="text-xs">
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
