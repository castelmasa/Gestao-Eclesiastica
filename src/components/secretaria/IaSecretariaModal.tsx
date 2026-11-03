import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Sparkles,
  FileText,
  ScrollText,
  UserCheck,
  Copy,
  Printer,
  Download,
  Loader2,
  Check,
  Building2,
  Calendar,
  Award,
  BookOpen
} from "lucide-react";
import { toast } from "sonner";
import { printDocument, downloadElementAsPdf } from "@/lib/printUtils";
import { useBranch } from "@/contexts/BranchContext";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";

interface IaSecretariaModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: any[];
  activeBranchName?: string;
  churchData?: any;
}

export function IaSecretariaModal({
  isOpen,
  onClose,
  members,
  activeBranchName = "Templo Sede",
  churchData,
}: IaSecretariaModalProps) {
  const { activeBranch, activeBranchName: branchCtxName, branches } = useBranch();
  const currentBranchName = activeBranchName || branchCtxName || "Congregação Sede";

  // Carrega parâmetros consolidados da congregação ativa / sede
  const resolvedConfig = React.useMemo(() => {
    let conf = { ...churchData };
    try {
      const globalRaw = localStorage.getItem("churchConfig");
      if (globalRaw) conf = { ...conf, ...JSON.parse(globalRaw) };

      const bId = activeBranch && activeBranch !== "all" ? activeBranch : null;
      if (bId && bId !== "sede") {
        const branchKey = `churchConfig_${bId}`;
        const branchRaw = localStorage.getItem(branchKey);
        if (branchRaw) {
          conf = { ...conf, ...JSON.parse(branchRaw) };
        }
        const bObj = branches?.find((b: any) => b.id === bId);
        if (bObj) {
          if (bObj.name) conf.nomeCongregacao = bObj.name;
          if (bObj.pastor && !conf.pastorTitular) conf.pastorTitular = bObj.pastor;
          if (bObj.address && !conf.endereco) conf.endereco = bObj.address;
          if (bObj.cnpj && !conf.cnpj) conf.cnpj = bObj.cnpj;
        }
      }
    } catch (e) {
      console.warn("Erro ao ler parâmetros:", e);
    }
    return conf;
  }, [churchData, activeBranch, branches]);

  const churchLogo = React.useMemo(() => {
    return getRegisteredChurchLogo(activeBranch) || resolvedConfig?.logoDataUrl || "";
  }, [activeBranch, resolvedConfig]);

  const currentFullDate = React.useMemo(() => {
    const now = new Date();
    const months = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];
    return `${String(now.getDate()).padStart(2, '0')} de ${months[now.getMonth()]} de ${now.getFullYear()}`;
  }, []);

  const [activeTab, setActiveTab] = useState<"carta" | "ata" | "analise" | "resumo">("carta");
  const [isLoading, setIsLoading] = useState(false);

  // 1. Carta state
  const [tipoCarta, setTipoCarta] = useState("Carta de Recomendação Eclesiástica");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [membroNomeManual, setMembroNomeManual] = useState("");
  const [destinoIgreja, setDestinoIgreja] = useState("");
  const [cidadeDestino, setCidadeDestino] = useState("");
  const [motivoCarta, setMotivoCarta] = useState("Mudança de endereço residencial e trabalho");
  const [cartaGerada, setCartaGerada] = useState<any>(null);

  // 2. Ata state
  const [tituloAta, setTituloAta] = useState("Ata da Assembleia Geral Ordinária de Membros");
  const [dataAta, setDataAta] = useState(() => new Date().toLocaleDateString("pt-BR"));
  const [horarioAta, setHorarioAta] = useState("19:30h");
  const [localAta, setLocalAta] = useState(activeBranchName);
  const [presidenteAta, setPresidenteAta] = useState(() => resolvedConfig?.pastorTitular || "Pr. Samuel de Oliveira");
  const [secretarioAta, setSecretarioAta] = useState(() => resolvedConfig?.secretario1 || "Secretaria Geral");
  const [pautaAta, setPautaAta] = useState("1) Leitura e aprovação do balancete financeiro; 2) Relatório das atividades dos departamentos; 3) Consagração de novos obreiros.");
  const [deliberacoesAta, setDeliberacoesAta] = useState("As contas foram aprovadas por unanimidade pelo plenário de membros conforme parecer da comissão fiscal.");
  const [ataGerada, setAtaGerada] = useState<any>(null);

  // Sincroniza assinaturas com parâmetros
  React.useEffect(() => {
    if (resolvedConfig?.pastorTitular) setPresidenteAta(resolvedConfig.pastorTitular);
    if (resolvedConfig?.secretario1) setSecretarioAta(resolvedConfig.secretario1);
  }, [resolvedConfig]);

  // 3. Análise de Membro state
  const [analiseMemberId, setAnaliseMemberId] = useState("");
  const [analiseGerada, setAnaliseGerada] = useState<any>(null);

  // 4. Resumo Ministerial state
  const [resumoGerado, setResumoGerado] = useState<any>(null);

  const [copied, setCopied] = useState(false);

  const defaultDenominacao = "Igreja Evangélica Pentecostal O Brasil para Cristo";
  const churchName = React.useMemo(() => {
    const raw = (resolvedConfig?.nome || "").trim();
    const branch = (currentBranchName || "").trim();
    if (!raw || raw.toLowerCase() === branch.toLowerCase()) {
      return defaultDenominacao;
    }
    return raw;
  }, [resolvedConfig, currentBranchName]);

  const formatErrorMessage = (err: any): string => {
    if (!err) return "Erro inesperado ao processar solicitação de IA.";
    const raw = typeof err === "string" ? err : (err?.message || JSON.stringify(err));
    if (
      raw.includes("503") ||
      raw.includes("high demand") ||
      raw.includes("UNAVAILABLE") ||
      raw.includes("temporarily unavailable")
    ) {
      return "Os servidores de inteligência artificial do Google estão com alta demanda temporária. Por favor, tente novamente em alguns segundos.";
    }
    if (raw.includes("429") || raw.includes("RESOURCE_EXHAUSTED")) {
      return "Muitas requisições simultâneas de IA. Por favor, aguarde alguns instantes e tente novamente.";
    }
    if (raw.includes("404") || raw.includes("NOT_FOUND")) {
      return "Modelo de IA em atualização. Por favor, tente novamente.";
    }
    if (
      raw.includes("<!doctype") ||
      raw.includes("<!DOCTYPE") ||
      raw.includes("Unexpected token '<'") ||
      raw.includes("is not valid JSON") ||
      raw.includes("SyntaxError")
    ) {
      return "Conexão temporariamente instável com o serviço de IA. Por favor, tente novamente em alguns segundos.";
    }
    try {
      const match = raw.match(/\{[\s\S]*"error"[\s\S]*\}/);
      if (match) {
        const p = JSON.parse(match[0]);
        if (p.error?.message) {
          const msg = p.error.message;
          if (msg.includes("503") || msg.includes("high demand") || msg.includes("UNAVAILABLE")) {
            return "Os servidores de inteligência artificial do Google estão com alta demanda temporária. Por favor, tente novamente em alguns segundos.";
          }
          if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
            return "Muitas requisições simultâneas de IA. Por favor, aguarde alguns instantes e tente novamente.";
          }
          return msg;
        }
      }
    } catch {}
    return raw;
  };

  // Helper de requisição segura para o backend de IA da Secretaria
  const safeFetchSecretaria = async (payloadObj: any) => {
    const res = await fetch("/api/gemini/secretaria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadObj)
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      if (text.includes("<!doctype") || text.includes("<!DOCTYPE") || text.includes("<html")) {
        throw new Error("O servidor de IA está se reconectando. Por favor, tente novamente em alguns instantes.");
      }
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          data = JSON.parse(match[0]);
        } catch {}
      }
    }

    if (!res.ok || !data) {
      const errMsg = data?.error || (data?.message) || `Erro no processamento (${res.status})`;
      throw new Error(errMsg);
    }

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  };

  // Cabeçalho oficial timbrado com logo e dados da igreja selecionada no sistema (sem duplicações)
  const renderOfficialHeader = (docSubtitle?: string) => {
    const defaultDenominacaoUpper = "IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO";
    const rawNome = (resolvedConfig?.nome || "").trim();
    const rawBranch = (currentBranchName || resolvedConfig?.nomeCongregacao || "").trim();

    let denomLine = defaultDenominacaoUpper;
    let branchLine = rawBranch;

    if (rawNome && rawNome.toLowerCase() !== rawBranch.toLowerCase()) {
      if (rawNome.toLowerCase().includes("igreja") || rawNome.toLowerCase().includes("brasil para cristo")) {
        denomLine = rawNome.toUpperCase();
      }
    }

    if (branchLine && denomLine.toLowerCase().includes(branchLine.toLowerCase())) {
      denomLine = denomLine
        .replace(new RegExp(`\\s*-\\s*${branchLine}`, 'gi'), '')
        .replace(new RegExp(`\\s*–\\s*${branchLine}`, 'gi'), '')
        .trim();
      if (!denomLine) denomLine = defaultDenominacaoUpper;
    }

    const showBranchLine = branchLine &&
      branchLine.toLowerCase() !== denomLine.toLowerCase() &&
      branchLine.toLowerCase() !== "sede" &&
      branchLine.toLowerCase() !== "templo sede" &&
      branchLine.toLowerCase() !== "all";

    return (
      <div className="border-b-2 border-slate-900 pb-3 mb-6 shrink-0 print:mb-4">
        <div className="flex items-center gap-4">
          {churchLogo ? (
            <img
              src={churchLogo}
              alt="Logo da Igreja"
              className="h-16 w-16 sm:h-20 sm:w-20 object-contain shrink-0"
            />
          ) : (
            <div className="h-16 w-16 border border-dashed border-slate-400 rounded flex items-center justify-center text-[10px] text-slate-400 shrink-0 font-sans">
              LOGO
            </div>
          )}
          <div className="flex-1 text-center font-sans">
            <h2 className="text-sm sm:text-base font-black tracking-wider uppercase text-slate-900 leading-tight">
              {denomLine}
            </h2>
            {showBranchLine && (
              <h3 className="text-xs sm:text-sm font-bold text-slate-700 tracking-wide uppercase mt-0.5">
                {branchLine.toUpperCase()}
              </h3>
            )}
            <p className="text-[10px] sm:text-[11px] text-slate-600 mt-1 leading-snug">
              {resolvedConfig.endereco || "Rua Bartolomeu Bueno, nº 629 - Bairro Santa Casa"}
              {resolvedConfig.cidade ? ` - ${resolvedConfig.cidade}` : " - Valparaíso - SP"}
              {resolvedConfig.cnpj ? ` | CNPJ: ${resolvedConfig.cnpj}` : ""}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Rodapé oficial com a data do documento e assinaturas copiadas do módulo de parâmetros
  const renderOfficialSignatures = (options?: {
    sig1Name?: string;
    sig1Role?: string;
    sig1Img?: string;
    sig2Name?: string;
    sig2Role?: string;
    sig2Img?: string;
    customDate?: string;
  }) => {
    const pastor = options?.sig1Name || resolvedConfig.pastorTitular || "Pr. Samuel de Oliveira";
    const pastorRole = options?.sig1Role || "Pastor Titular / Presidente";
    const pastorSig = options?.sig1Img !== undefined ? options.sig1Img : resolvedConfig.pastorSignatureUrl;

    const secretario = options?.sig2Name || resolvedConfig.secretario1 || "Secretaria Geral";
    const secretarioRole = options?.sig2Role || "1º Secretário(a)";
    const secretarioSig = options?.sig2Img !== undefined ? options.sig2Img : (resolvedConfig.secretario1SignatureUrl || resolvedConfig.secretarySignatureUrl);

    const city = resolvedConfig.cidade || "Valparaíso - SP";
    const dateStr = options?.customDate || currentFullDate;

    return (
      <div className="mt-8 pt-4 shrink-0 print:mt-6">
        {/* DATA DO DOCUMENTO ANTES DAS ASSINATURAS */}
        <div className="text-right font-sans text-xs sm:text-sm text-slate-800 mb-8 font-medium">
          {city}, {dateStr}
        </div>

        {/* ASSINATURAS DO MÓDULO DE PARÂMETROS */}
        <div className="grid grid-cols-2 gap-8 text-center font-sans text-xs pt-2">
          <div className="flex flex-col items-center">
            {pastorSig ? (
              <img
                src={pastorSig}
                alt="Assinatura Pastor"
                className="h-12 max-w-[180px] object-contain mb-1"
              />
            ) : (
              <div className="h-12"></div>
            )}
            <div className="border-t-2 border-slate-900 w-52 mb-1.5"></div>
            <p className="font-bold uppercase text-slate-900 text-xs">{pastor}</p>
            <p className="text-slate-600 text-[11px]">{pastorRole}</p>
          </div>

          <div className="flex flex-col items-center">
            {secretarioSig ? (
              <img
                src={secretarioSig}
                alt="Assinatura Secretaria"
                className="h-12 max-w-[180px] object-contain mb-1"
              />
            ) : (
              <div className="h-12"></div>
            )}
            <div className="border-t-2 border-slate-900 w-52 mb-1.5"></div>
            <p className="font-bold uppercase text-slate-900 text-xs">{secretario}</p>
            <p className="text-slate-600 text-[11px]">{secretarioRole}</p>
          </div>
        </div>
      </div>
    );
  };

  // Gerar Carta com IA
  const handleGerarCarta = async () => {
    let membroObj = members.find(m => String(m.id) === selectedMemberId);
    const nomeFinal = membroObj ? (membroObj.nome || membroObj.name) : membroNomeManual.trim();

    if (!nomeFinal) {
      toast.error("Selecione um membro cadastrado ou informe o nome manualmente.");
      return;
    }

    setIsLoading(true);
    setCartaGerada(null);
    try {
      const data = await safeFetchSecretaria({
        type: "carta",
        churchName,
        branchName: currentBranchName,
        payload: {
          tipoCarta,
          membroNome: nomeFinal,
          cargo: membroObj?.cargo || membroObj?.role || "Membro em Plena Comunhão",
          membroDesde: membroObj?.membroDesde || "Data regular de admissão",
          dataBatismo: membroObj?.dataBatismo || membroObj?.baptismDate || "Regularmente batizado(a)",
          destinoIgreja,
          cidadeDestino,
          motivo: motivoCarta,
          pastorName: resolvedConfig?.pastorTitular || churchData?.pastorTitular || "Pr. Samuel de Oliveira"
        }
      });
      setCartaGerada(data);
      toast.success("Carta eclesiástica redigida com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Gerar Ata com IA
  const handleGerarAta = async () => {
    setIsLoading(true);
    setAtaGerada(null);
    try {
      const data = await safeFetchSecretaria({
        type: "ata",
        churchName,
        branchName: currentBranchName,
        payload: {
          titulo: tituloAta,
          dataReuniao: dataAta,
          horario: horarioAta,
          local: localAta,
          presidente: presidenteAta,
          secretario: secretarioAta,
          pauta: pautaAta,
          deliberacoes: deliberacoesAta,
          presencas: "Membros comungantes em número estatutário regular"
        }
      });
      setAtaGerada(data);
      toast.success("Ata formal de assembleia redigida com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Analisar Perfil do Membro
  const handleAnalisarMembro = async () => {
    const membroObj = members.find(m => String(m.id) === analiseMemberId);
    if (!membroObj) {
      toast.error("Selecione um membro para análise pastoral.");
      return;
    }

    setIsLoading(true);
    setAnaliseGerada(null);
    try {
      const data = await safeFetchSecretaria({
        type: "analise_membro",
        churchName,
        branchName: currentBranchName,
        payload: { membro: membroObj }
      });
      setAnaliseGerada(data);
      toast.success("Perfil eclesiástico analisado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Gerar Resumo Executivo
  const handleGerarResumo = async () => {
    setIsLoading(true);
    setResumoGerado(null);
    try {
      const totalMembros = members.length;
      const ativos = members.filter(m => (m.status || "").toLowerCase() === "ativo").length;
      const batizados = members.filter(m => !!(m.dataBatismo || m.baptismDate)).length;
      const currentMonth = new Date().getMonth() + 1;
      const aniversariantesMes = members.filter(m => {
        const d = m.dataNascimento || m.birthDate;
        if (!d) return false;
        const parts = d.split(/[-/]/);
        if (parts.length >= 2) {
          const mNum = parseInt(parts[1], 10);
          return mNum === currentMonth;
        }
        return false;
      }).length;

      const cargosCount: Record<string, number> = {};
      members.forEach(m => {
        const c = m.cargo || m.role || "Membro";
        cargosCount[c] = (cargosCount[c] || 0) + 1;
      });

      const data = await safeFetchSecretaria({
        type: "resumo",
        churchName,
        branchName: currentBranchName,
        payload: {
          totalMembros,
          ativos,
          batizados,
          cargos: cargosCount,
          aniversariantesMes
        }
      });
      setResumoGerado(data);
      toast.success("Resumo ministerial gerado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error(formatErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado para a área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[94vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="border-b pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-500/10 text-purple-700 dark:text-purple-300 rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  Assistente IA da Secretaria Eclesiástica
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 text-[10px]">
                    Gemini 3.8 Flash
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Redação de cartas pastorais, atas de assembleias, análise ministerial de membros e resumos oficiais.
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid grid-cols-4 w-full h-10 p-1 mb-3 shrink-0">
            <TabsTrigger value="carta" className="text-xs font-semibold flex items-center gap-1.5">
              <ScrollText className="w-3.5 h-3.5" /> Cartas & Recomendações
            </TabsTrigger>
            <TabsTrigger value="ata" className="text-xs font-semibold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" /> Atas de Assembleia
            </TabsTrigger>
            <TabsTrigger value="analise" className="text-xs font-semibold flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" /> Análise de Membro
            </TabsTrigger>
            <TabsTrigger value="resumo" className="text-xs font-semibold flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5" /> Resumo Ministerial
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: CARTAS & RECOMENDAÇÕES */}
          <TabsContent value="carta" className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-3 rounded-xl border">
              <div>
                <Label className="text-xs font-semibold">Tipo de Carta Eclesiástica</Label>
                <select
                  value={tipoCarta}
                  onChange={(e) => setTipoCarta(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs mt-1"
                >
                  <option value="Carta de Recomendação Eclesiástica">Carta de Recomendação Eclesiástica</option>
                  <option value="Carta de Transferência Definitiva de Membro">Carta de Transferência Definitiva</option>
                  <option value="Carta de Apresentação e Boas-Vindas Pastoral">Carta de Apresentação Pastoral</option>
                  <option value="Certidão Negativa de Disciplina Eclesiástica">Declaração de Comunhão & Idoneidade</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Vincular Membro Cadastrado</Label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => {
                    setSelectedMemberId(e.target.value);
                    const m = members.find(x => String(x.id) === e.target.value);
                    if (m) setMembroNomeManual(m.nome || m.name);
                  }}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs mt-1"
                >
                  <option value="">-- Escolha um membro ou digite abaixo --</option>
                  {members.map(m => (
                    <option key={m.id} value={String(m.id)}>
                      {m.nome || m.name} ({m.cargo || m.role || "Membro"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Nome Completo do Membro</Label>
                <Input
                  value={membroNomeManual}
                  onChange={(e) => setMembroNomeManual(e.target.value)}
                  placeholder="Nome completo..."
                  className="h-9 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Igreja / Cidade de Destino</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <Input
                    value={destinoIgreja}
                    onChange={(e) => setDestinoIgreja(e.target.value)}
                    placeholder="Igreja / Congregação coirmã"
                    className="h-9 text-xs"
                  />
                  <Input
                    value={cidadeDestino}
                    onChange={(e) => setCidadeDestino(e.target.value)}
                    placeholder="Cidade - UF"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs font-semibold">Motivo / Informações Adicionais</Label>
                <Input
                  value={motivoCarta}
                  onChange={(e) => setMotivoCarta(e.target.value)}
                  placeholder="Ex: Mudança de residência a trabalho, transferindo residência para outra cidade..."
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleGerarCarta}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-9"
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                Redigir Carta Oficial com IA
              </Button>
            </div>

            {cartaGerada && (
              <div className="mt-4 border rounded-xl p-4 bg-muted/10 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" /> Carta Eclesiástica Pronta
                    </h3>
                    <p className="text-xs text-muted-foreground">Padrão Oficial A4 Retrato para Impressão e Arquivamento</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(cartaGerada.corpo)}
                      className="h-8 text-xs"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
                      Copiar Texto
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadElementAsPdf("preview-carta-ia", `${cartaGerada.titulo || 'carta_eclesiastica'}.pdf`)}
                      className="h-8 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> Baixar PDF (A4)
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => printDocument({ elementId: "preview-carta-ia", title: cartaGerada.titulo, orientation: 'portrait' })}
                      className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir A4
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[70vh] p-2 bg-slate-100/60 dark:bg-slate-900/60 rounded-xl">
                  <div
                    id="preview-carta-ia"
                    className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white text-slate-900 border p-8 sm:p-12 shadow-md rounded-md flex flex-col justify-between font-serif text-xs sm:text-sm leading-relaxed"
                  >
                    <div>
                      {renderOfficialHeader()}

                      <div className="text-center my-4 font-sans">
                        <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 underline decoration-slate-400 decoration-1 underline-offset-4">
                          {cartaGerada.titulo}
                        </h3>
                        {cartaGerada.assunto && (
                          <p className="text-xs text-slate-600 italic mt-1 font-serif">
                            {cartaGerada.assunto}
                          </p>
                        )}
                      </div>

                      <div className="text-justify whitespace-pre-line text-slate-800 leading-relaxed font-serif indent-6 space-y-3 pt-2">
                        {cartaGerada.corpo}
                      </div>

                      {cartaGerada.versiculoChave && (
                        <div className="mt-8 pt-4 border-t border-slate-200 italic text-slate-600 text-xs text-center font-serif">
                          "{cartaGerada.versiculoChave}"
                        </div>
                      )}
                    </div>

                    {renderOfficialSignatures()}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 2: ATAS DE ASSEMBLEIA */}
          <TabsContent value="ata" className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-3 rounded-xl border text-xs">
              <div>
                <Label className="text-xs font-semibold">Título da Assembleia / Reunião</Label>
                <Input
                  value={tituloAta}
                  onChange={(e) => setTituloAta(e.target.value)}
                  className="h-9 text-xs mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-semibold">Data</Label>
                  <Input
                    value={dataAta}
                    onChange={(e) => setDataAta(e.target.value)}
                    className="h-9 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Horário</Label>
                  <Input
                    value={horarioAta}
                    onChange={(e) => setHorarioAta(e.target.value)}
                    className="h-9 text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Presidente da Mesa</Label>
                <Input
                  value={presidenteAta}
                  onChange={(e) => setPresidenteAta(e.target.value)}
                  className="h-9 text-xs mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Secretário(a) Encarregado(a)</Label>
                <Input
                  value={secretarioAta}
                  onChange={(e) => setSecretarioAta(e.target.value)}
                  className="h-9 text-xs mt-1"
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs font-semibold">Pauta / Tópicos Tratados</Label>
                <Textarea
                  value={pautaAta}
                  onChange={(e) => setPautaAta(e.target.value)}
                  rows={2}
                  className="text-xs mt-1"
                  placeholder="Liste os assuntos da reunião..."
                />
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs font-semibold">Deliberações, Decisões e Votações</Label>
                <Textarea
                  value={deliberacoesAta}
                  onChange={(e) => setDeliberacoesAta(e.target.value)}
                  rows={2}
                  className="text-xs mt-1"
                  placeholder="Descreva o que foi aprovado..."
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleGerarAta}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-9"
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                Gerar Ata Formal com IA
              </Button>
            </div>

            {ataGerada && (
              <div className="mt-4 border rounded-xl p-4 bg-muted/10 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-600" /> Ata Formal Redigida com Sucesso
                    </h3>
                    <p className="text-xs text-muted-foreground">Padrão Oficial A4 Retrato para Livro de Atas</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(ataGerada.textoCompleto)}
                      className="h-8 text-xs"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Ata
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadElementAsPdf("preview-ata-ia", `${ataGerada.titulo || 'ata_assembleia'}.pdf`)}
                      className="h-8 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> Baixar PDF (A4)
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => printDocument({ elementId: "preview-ata-ia", title: ataGerada.titulo, orientation: 'portrait' })}
                      className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir A4
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[70vh] p-2 bg-slate-100/60 dark:bg-slate-900/60 rounded-xl">
                  <div
                    id="preview-ata-ia"
                    className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white text-slate-900 border p-8 sm:p-12 shadow-md rounded-md flex flex-col justify-between font-serif text-xs sm:text-sm leading-relaxed"
                  >
                    <div>
                      {renderOfficialHeader()}

                      <div className="text-center my-4 font-sans">
                        <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 underline decoration-slate-400 decoration-1 underline-offset-4">
                          {ataGerada.titulo}
                        </h3>
                        {ataGerada.numeroAta && (
                          <p className="text-xs font-semibold text-slate-600 mt-1 font-sans">
                            {ataGerada.numeroAta}
                          </p>
                        )}
                      </div>

                      <div className="text-justify whitespace-pre-line text-slate-800 leading-relaxed font-serif indent-6 space-y-3 pt-2">
                        {ataGerada.textoCompleto}
                      </div>
                    </div>

                    {renderOfficialSignatures({
                      sig1Name: presidenteAta || resolvedConfig.pastorTitular,
                      sig1Role: "Presidente da Assembleia",
                      sig1Img: resolvedConfig.pastorSignatureUrl,
                      sig2Name: secretarioAta || resolvedConfig.secretario1,
                      sig2Role: "Secretário(a) da Assembleia",
                      sig2Img: resolvedConfig.secretario1SignatureUrl || resolvedConfig.secretarySignatureUrl,
                      customDate: dataAta || currentFullDate
                    })}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 3: ANÁLISE DE MEMBRO */}
          <TabsContent value="analise" className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="flex items-center gap-3 bg-muted/30 p-3 rounded-xl border">
              <div className="flex-1">
                <Label className="text-xs font-semibold">Selecione o Membro para Diagnóstico Pastoral</Label>
                <select
                  value={analiseMemberId}
                  onChange={(e) => setAnaliseMemberId(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs mt-1"
                >
                  <option value="">-- Selecione um membro da lista --</option>
                  {members.map(m => (
                    <option key={m.id} value={String(m.id)}>
                      {m.nome || m.name} ({m.cargo || m.role || "Membro"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-5">
                <Button
                  onClick={handleAnalisarMembro}
                  disabled={isLoading || !analiseMemberId}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-9 shrink-0"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                  Gerar Insights Pastorais
                </Button>
              </div>
            </div>

            {analiseGerada && (
              <div className="mt-4 border rounded-xl p-4 bg-muted/10 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Parecer Pastoral & Diagnóstico Eclesiástico</h3>
                    <p className="text-xs text-muted-foreground">Avaliação de perfil eclesiástico e vocacional</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(analiseGerada.resumoPerfil || "")}
                      className="h-8 text-xs"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Parecer
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadElementAsPdf("preview-analise-ia", "parecer_pastoral_membro.pdf")}
                      className="h-8 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> Baixar PDF (A4)
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => printDocument({ elementId: "preview-analise-ia", title: "Parecer Pastoral", orientation: 'portrait' })}
                      className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir A4
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[70vh] p-2 bg-slate-100/60 dark:bg-slate-900/60 rounded-xl">
                  <div
                    id="preview-analise-ia"
                    className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white text-slate-900 border p-8 sm:p-12 shadow-md rounded-md flex flex-col justify-between font-serif text-xs sm:text-sm leading-relaxed"
                  >
                    <div>
                      {renderOfficialHeader()}

                      <div className="text-center my-4 font-sans">
                        <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 underline decoration-slate-400 decoration-1 underline-offset-4">
                          PARECER PASTORAL & DIAGNÓSTICO ECLESIÁSTICO
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 font-serif">
                          Avaliação de Aptidão Ministerial e Acompanhamento Pastoral
                        </p>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                          <h4 className="font-bold font-sans text-xs uppercase text-slate-800 mb-1">
                            Diagnóstico do Perfil
                          </h4>
                          <p className="text-slate-700 leading-relaxed font-serif text-justify">
                            {analiseGerada.resumoPerfil}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-lg font-sans">
                            <h5 className="font-bold text-emerald-900 text-xs mb-2 flex items-center gap-1.5 uppercase">
                              <Award className="w-4 h-4 text-emerald-700" /> Ministérios Mais Adequados
                            </h5>
                            <ul className="list-disc list-inside space-y-1 text-slate-800 text-xs font-serif">
                              {analiseGerada.ministeriosSugeridos?.map((m: string, idx: number) => (
                                <li key={idx}><strong>{m}</strong></li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-lg font-sans">
                            <h5 className="font-bold text-amber-900 text-xs mb-2 flex items-center gap-1.5 uppercase">
                              <UserCheck className="w-4 h-4 text-amber-700" /> Cuidado & Acompanhamento
                            </h5>
                            <ul className="list-disc list-inside space-y-1 text-slate-800 text-xs font-serif">
                              {analiseGerada.pontosAtencaoPastoral?.map((p: string, idx: number) => (
                                <li key={idx}>{p}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {analiseGerada.versiculoIncentivo && (
                          <div className="mt-6 pt-4 border-t border-slate-200 italic text-slate-600 text-xs text-center font-serif">
                            "{analiseGerada.versiculoIncentivo}"
                          </div>
                        )}
                      </div>
                    </div>

                    {renderOfficialSignatures()}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* TAB 4: RESUMO MINISTERIAL */}
          <TabsContent value="resumo" className="flex-1 overflow-y-auto space-y-4 pr-1">
            <div className="flex items-center justify-between bg-muted/30 p-3 rounded-xl border">
              <div>
                <h4 className="font-bold text-xs">Relatório Ministerial Sintético do Mês</h4>
                <p className="text-[11px] text-muted-foreground">Consolidação de membros, batismos, aniversariantes e vitalidade congregacional.</p>
              </div>
              <Button
                onClick={handleGerarResumo}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-9"
              >
                {isLoading ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1.5" />}
                Consolidar Relatório com IA
              </Button>
            </div>

            {resumoGerado && (
              <div className="mt-4 border rounded-xl p-4 bg-muted/10 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <h3 className="font-bold text-sm text-foreground">Relatório Ministerial da Secretaria</h3>
                    <p className="text-xs text-muted-foreground">Consolidação mensal oficial</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(resumoGerado.diagnosticoGeral || "")}
                      className="h-8 text-xs"
                    >
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copiar Resumo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadElementAsPdf("preview-resumo-ia", "relatorio_ministerial_secretaria.pdf")}
                      className="h-8 text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" /> Baixar PDF (A4)
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => printDocument({ elementId: "preview-resumo-ia", title: "Relatório Ministerial", orientation: 'portrait' })}
                      className="h-8 text-xs bg-slate-900 text-white hover:bg-slate-800"
                    >
                      <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir A4
                    </Button>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[70vh] p-2 bg-slate-100/60 dark:bg-slate-900/60 rounded-xl">
                  <div
                    id="preview-resumo-ia"
                    className="w-full max-w-[210mm] min-h-[297mm] mx-auto bg-white text-slate-900 border p-8 sm:p-12 shadow-md rounded-md flex flex-col justify-between font-serif text-xs sm:text-sm leading-relaxed"
                  >
                    <div>
                      {renderOfficialHeader()}

                      <div className="text-center my-4 font-sans">
                        <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-900 underline decoration-slate-400 decoration-1 underline-offset-4">
                          RELATÓRIO MINISTERIAL CONSOLIDADO
                        </h3>
                        <p className="text-xs text-slate-600 mt-1 font-serif">
                          Membresia, Atividades e Metas Estratégicas da Secretaria Eclesiástica
                        </p>
                      </div>

                      <div className="space-y-4 pt-2">
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
                          <h4 className="font-bold font-sans text-xs uppercase text-slate-800 mb-1">
                            Panorama da Membresia
                          </h4>
                          <p className="text-slate-700 leading-relaxed font-serif text-justify">
                            {resumoGerado.diagnosticoGeral}
                          </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-lg font-sans">
                            <h5 className="font-bold text-blue-900 text-xs mb-2 uppercase">
                              Destaques Positivos do Período
                            </h5>
                            <ul className="list-disc list-inside space-y-1 text-slate-800 text-xs font-serif">
                              {resumoGerado.destaquesPositivos?.map((d: string, idx: number) => (
                                <li key={idx}>{d}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-lg font-sans">
                            <h5 className="font-bold text-purple-900 text-xs mb-2 uppercase">
                              Metas Estratégicas da Secretaria
                            </h5>
                            <ul className="list-disc list-inside space-y-1 text-slate-800 text-xs font-serif">
                              {resumoGerado.metasSecretaria?.map((m: string, idx: number) => (
                                <li key={idx}>{m}</li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {resumoGerado.mensagemLideranca && (
                          <div className="mt-4 p-4 bg-slate-50 border-l-4 border-purple-500 rounded text-slate-800 italic text-xs leading-relaxed font-serif">
                            "{resumoGerado.mensagemLideranca}"
                          </div>
                        )}
                      </div>
                    </div>

                    {renderOfficialSignatures()}
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
