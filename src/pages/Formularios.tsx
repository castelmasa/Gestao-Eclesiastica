import { motion } from "motion/react";
import React, { useState, useEffect, useMemo } from "react"
import { printDocument, downloadElementAsPdf } from "@/lib/printUtils"
import { PrintDebugger } from "@/components/PrintDebugger"
import { cn } from "@/lib/utils"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Printer, 
  FileText, 
  Plus, 
  Save, 
  Trash2, 
  Search, 
  Check, 
  History, 
  User, 
  Loader2, 
  AlertTriangle, 
  Building2, 
  HeartHandshake, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Download,
  Eye,
  CheckCircle2
} from "lucide-react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { useBranch } from "@/contexts/BranchContext"
import { logAction } from "@/lib/audit"
import { RichTextEditor } from "@/components/common/RichTextEditor"
import { valorPorExtenso } from "@/lib/extenso"
import { FichaMembroPrintable, FichaMembroData } from "@/components/secretaria/FichaMembroPrintable"
import { getChurchLeadershipConfig } from "@/lib/churchConfigHelper"
import { db } from "@/lib/firebase"
import { collection, onSnapshot } from "firebase/firestore"
import { DEFAULT_MEMBER_TEST_DATA } from "./Secretaria"

export function Formularios() {
  const { user } = useAuth()
  const { activeBranch, branches } = useBranch()
  const [formType, setFormType] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const t = p.get("type") || p.get("tipo");
      if (t) return t;
    } catch {}
    return "relatorio-culto";
  })
  const [churchData, setChurchData] = useState<any>({})
  // Conforme Anexo 3: No campo informar o último número de impresso, deixa sempre zero para informar a quantidade
  const [sequenceNumber, setSequenceNumber] = useState<number>(0)
  const [printCopies, setPrintCopies] = useState<number>(1)
  const [imprimirSegundaVia, setImprimirSegundaVia] = useState<boolean>(true)
  const [members, setMembers] = useState<any[]>([])

  // Solicitante Manual / Declarações Dinâmicas
  const [solicitanteModo, setSolicitanteModo] = useState<'membro' | 'manual'>('membro')
  const [solicitanteManualNome, setSolicitanteManualNome] = useState<string>('')
  const [solicitanteManualDoc, setSolicitanteManualDoc] = useState<string>('')
  const [solicitanteManualBatismo, setSolicitanteManualBatismo] = useState<string>('')
  
  // Leadership & Configurações da Igreja
  const leadership = useMemo(() => getChurchLeadershipConfig(activeBranch, branches), [activeBranch, branches]);
  
  // Zoom & Alinhamento na Tela
  const [previewZoom, setPreviewZoom] = useState<number>(0.85)

  // Cesta Básica & Serviço Social State (Versão Analítica e Versão Simples)
  const [cestaVersao, setCestaVersao] = useState<'analitica' | 'simples'>(() => {
    try {
      const p = new URLSearchParams(window.location.search);
      const t = p.get("type") || p.get("tipo");
      if (t === 'ficha-cesta-basica-simples') return 'simples';
    } catch {}
    return 'analitica';
  })
  const [cestaModo, setCestaModo] = useState<'em_branco' | 'preenchido'>('em_branco')
  const [cestaTipoAuxilio, setCestaTipoAuxilio] = useState<string>('cesta_basica_padrao')
  const [cestaQtd, setCestaQtd] = useState<string>('1')
  const [cestaData, setCestaData] = useState<string>(() => new Date().toLocaleDateString('pt-BR'))
  const [cestaMotivo, setCestaMotivo] = useState<string>('')
  const [cestaResponsavelEntrega, setCestaResponsavelEntrega] = useState<string>('')
  const [cestaRendaFamiliar, setCestaRendaFamiliar] = useState<string>('')
  const [cestaTipoMoradia, setCestaTipoMoradia] = useState<string>('Alugada')
  const [cestaQtdMembros, setCestaQtdMembros] = useState<string>('4')
  const [cestaQtdCriancas, setCestaQtdCriancas] = useState<string>('2')
  const [cestaBeneficios, setCestaBeneficios] = useState<string>('Bolsa Família')
  const [cestaPontoReferencia, setCestaPontoReferencia] = useState<string>('')
  const [cestaIsMembro, setCestaIsMembro] = useState<string>('Sim')
  const [cestaDataNasc, setCestaDataNasc] = useState<string>('')
  const [cestaParecerSocial, setCestaParecerSocial] = useState<string>('')

  // Auto-fill state
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMember, setSelectedMember] = useState<any>(null)

  // Recibo State (para dados preenchidos nos recibos ou talão manual em branco para o tesoureiro)
  const [reciboModo, setReciboModo] = useState<'preenchido' | 'branco'>('preenchido')
  const [reciboValor, setReciboValor] = useState("")
  const [reciboExtenso, setReciboExtenso] = useState("")
  const [reciboReferente, setReciboReferente] = useState("Oferta de auxílio fraterno")
  const [reciboCongregacao, setReciboCongregacao] = useState("")
  const [reciboPagador, setReciboPagador] = useState("")
  const [reciboBeneficiarioNome, setReciboBeneficiarioNome] = useState("")
  const [reciboBeneficiarioCpf, setReciboBeneficiarioCpf] = useState("")
  const [reciboRecebiDe, setReciboRecebiDe] = useState("Igreja Evangélica Pentecostal O Brasil Para Cristo")
  const [reciboData, setReciboData] = useState(() => new Date().toLocaleDateString('pt-BR'))
  const [reciboTesoureiro, setReciboTesoureiro] = useState("")

  // Batismo State (Ficha de Candidato ao Batismo nas Águas)
  const [batismoDataPrevista, setBatismoDataPrevista] = useState("")
  const [batismoInstrutor, setBatismoInstrutor] = useState("")
  const [batismoLocal, setBatismoLocal] = useState("Templo Sede / Tanque Batismal")
  const [batismoPastor, setBatismoPastor] = useState("")
  const [batismoLivro, setBatismoLivro] = useState("")
  const [batismoFolha, setBatismoFolha] = useState("")

  // Apresentação de Criança State
  const [apresentacaoNomeCrianca, setApresentacaoNomeCrianca] = useState("")
  const [apresentacaoDataNasc, setApresentacaoDataNasc] = useState("")
  const [apresentacaoPai, setApresentacaoPai] = useState("")
  const [apresentacaoMae, setApresentacaoMae] = useState("")
  const [apresentacaoPadrinhos, setApresentacaoPadrinhos] = useState("")
  const [apresentacaoDataCulto, setApresentacaoDataCulto] = useState("")
  const [apresentacaoPastor, setApresentacaoPastor] = useState("")
  const [apresentacaoCertidao, setApresentacaoCertidao] = useState("")

  // Reconciliação / Novos Convertidos State
  const [reconciliacaoTipo, setReconciliacaoTipo] = useState<string>("reconciliacao")
  const [reconciliacaoDiscipulador, setReconciliacaoDiscipulador] = useState("")
  const [reconciliacaoData, setReconciliacaoData] = useState("")
  const [reconciliacaoObservacoes, setReconciliacaoObservacoes] = useState("")

  // Casamento Religioso State
  const [casamentoNoivo, setCasamentoNoivo] = useState("")
  const [casamentoNoiva, setCasamentoNoiva] = useState("")
  const [casamentoDataHora, setCasamentoDataHora] = useState("")
  const [casamentoLocal, setCasamentoLocal] = useState("Templo Sede")
  const [casamentoTestemunhas, setCasamentoTestemunhas] = useState("")
  const [casamentoPastor, setCasamentoPastor] = useState("")

  // Igreja / Congregação Selecionada no Dashboard / Header
  const activeBranchObj = useMemo(() => {
    if (!activeBranch || activeBranch === 'all') return undefined;
    return branches.find(b => b.id === activeBranch);
  }, [branches, activeBranch]);

  const sedeBranch = useMemo(() => {
    return branches.find(b => b.type === 'sede');
  }, [branches]);

  const defaultSedeName = "IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO";
  const defaultSedeAddress = "RUA BARTOLOMEU BUENO, Nº 629 - SANTA CASA - VALPARAISO - SP";

  const displayChurchName = useMemo(() => {
    if (activeBranchObj && activeBranchObj.name) {
      return activeBranchObj.name.toUpperCase();
    }
    if (sedeBranch && sedeBranch.name) {
      return sedeBranch.name.toUpperCase();
    }
    if (churchData.nome) {
      return churchData.nome.toUpperCase();
    }
    return defaultSedeName;
  }, [activeBranchObj, sedeBranch, churchData.nome]);

  const displayChurchAddress = useMemo(() => {
    if (activeBranchObj && activeBranchObj.address) {
      let addr = activeBranchObj.address;
      if (activeBranchObj.bairro && !addr.includes(activeBranchObj.bairro)) {
        addr += ` - ${activeBranchObj.bairro}`;
      }
      if (activeBranchObj.cidade && !addr.includes(activeBranchObj.cidade)) {
        addr += ` - ${activeBranchObj.cidade}/${activeBranchObj.uf || 'SP'}`;
      }
      return addr.toUpperCase();
    }
    if (sedeBranch && sedeBranch.address) {
      return sedeBranch.address.toUpperCase();
    }
    if (churchData.endereco) {
      const parts = [
        churchData.endereco,
        churchData.bairro,
        churchData.cidade ? `${churchData.cidade}${churchData.uf ? ` - ${churchData.uf}` : ''}` : ''
      ].filter(Boolean);
      if (parts.length > 0) return parts.join(" - ").toUpperCase();
    }
    return defaultSedeAddress;
  }, [activeBranchObj, sedeBranch, churchData]);

  const displayCnpj = activeBranchObj?.cnpj || (churchData.cnpj && churchData.cnpj !== "00.000.000/0001-00" 
    ? churchData.cnpj 
    : "51.105.484/0001-74");

  // Templates state
  const [templates, setTemplates] = useState<any[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [isEditingTemplate, setIsEditingTemplate] = useState(false)
  const [currentTemplateTitle, setCurrentTemplateTitle] = useState("")
  const [currentTemplateContent, setCurrentTemplateContent] = useState("")
  const [dynamicPrintContent, setDynamicPrintContent] = useState("")
  const [isReadyToPrint, setIsReadyToPrint] = useState(false)
  const [showPrintDebugger, setShowPrintDebugger] = useState(false)
  const [missingDataError, setMissingDataError] = useState("")

  // Logs state
  const [logs, setLogs] = useState<any[]>([])
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewType, setPreviewType] = useState<'standard' | 'dynamic' | null>(null)


  useEffect(() => {
    const savedConfig = localStorage.getItem("churchConfig")
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig)
      setChurchData(parsed)
    }
    
    const savedMembers = localStorage.getItem("churchMembers")
    const savedSocial = localStorage.getItem("social_beneficiaries_cache")
    let allList: any[] = []
    if (savedMembers) {
      try {
        allList = [...JSON.parse(savedMembers)]
      } catch {}
    }
    if (allList.length === 0) {
      allList = [DEFAULT_MEMBER_TEST_DATA]
    }
    if (savedSocial) {
      try {
        const parsedSocial = JSON.parse(savedSocial)
        parsedSocial.forEach((b: any) => {
          if (!allList.some((m: any) => m.id === b.id || (m.cpf && m.cpf === b.cpf))) {
            allList.push({ ...b, isSocialBeneficiary: true })
          }
        })
      } catch {}
    }
    setMembers(allList)

    let unsub: (() => void) | undefined
    try {
      unsub = onSnapshot(collection(db, "members"), (snapshot) => {
        if (!snapshot.empty) {
          const remoteList: any[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
          setMembers(prev => {
            const map = new Map()
            remoteList.forEach((m: any) => map.set(m.id || m.cpf || m.name, m))
            prev.forEach((m: any) => {
              const k = m.id || m.cpf || m.name
              if (!map.has(k)) map.set(k, m)
            })
            return Array.from(map.values())
          })
        }
      }, (err) => {
        console.warn("Firestore onSnapshot in Formularios:", err)
      })
    } catch {}

    const defaults = [
      {
        id: "temp_1",
        title: "Carta de Transferência",
        content: "<p>Declaramos para os devidos fins que o(a) irmão(ã) <strong>[NOME_MEMBRO]</strong>, portador(a) do RG/CPF <strong>[DOCUMENTO]</strong>, membro desta igreja desde <strong>[DATA_BATISMO]</strong>, está sendo transferido(a) para outra congregação, estando em plena comunhão e sem restrições em nosso rol de membros.</p><p><br></p><p>Rogamos as mais ricas bênçãos do Senhor sobre a sua caminhada cristã e ministerial.</p><p><br></p><p>Por ser verdade, firmamos o presente documento.</p>"
      },
      {
        id: "temp_2",
        title: "Declaração de Batismo",
        content: "<p>Declaramos para os devidos fins e a quem interessar possa que o(a) irmão(ã) <strong>[NOME_MEMBRO]</strong>, portador(a) do documento <strong>[DOCUMENTO]</strong>, desceu às águas batismais no dia <strong>[DATA_BATISMO]</strong> em nossa congregação, em solene ato de pública confissão de fé no Senhor Jesus Cristo, conforme os preceitos bíblicos e o estatuto eclesiástico da Igreja Evangélica Pentecostal O Brasil Para Cristo.</p><p><br></p><p>Estando, portanto, plenamente apto(a) a desfrutar de toda a comunhão do corpo de Cristo e dos santos sacramentos da igreja.</p><p><br></p><p>Por ser a expressão da verdade, expedimos e firmamos a presente declaração.</p>"
      }
    ]

    const savedTemplates = localStorage.getItem("churchTemplates")
    if (savedTemplates) {
      try {
        const parsed = JSON.parse(savedTemplates)
        const enhanced = parsed.map((t: any) => {
          if (t.id === 'temp_2' && (!t.content || t.content.includes('Valparaíso, <strong>[DATA_ATUAL]</strong>'))) {
            return { ...t, content: defaults[1].content }
          }
          return t
        })
        setTemplates(enhanced)
      } catch {
        setTemplates(defaults)
      }
    } else {
      setTemplates(defaults)
      localStorage.setItem("churchTemplates", JSON.stringify(defaults))
    }

    const savedLogs = localStorage.getItem("churchFormLogs")
    if (savedLogs) setLogs(JSON.parse(savedLogs))

    return () => {
      if (unsub) unsub()
    }
  }, [])

  const safeSearch = (searchTerm || "").toLowerCase().trim();
  const filteredMembers = (members || []).filter(m => {
    if (!m) return false;
    const mName = (m.nome || m.name || "").toLowerCase();
    const mCpf = String(m.cpf || "");
    return mName.includes(safeSearch) || (safeSearch !== "" && mCpf.includes(safeSearch));
  }).slice(0, 25)

  const handleSelectMember = (m: any | null) => {
    if (!m) {
      setSelectedMember(null)
      setSearchTerm("")
      setReciboPagador("")
      setReciboBeneficiarioNome("")
      setReciboBeneficiarioCpf("")
      return
    }
    setSelectedMember(m)
    const mName = m.nome || m.name || ""
    setSearchTerm(mName)
    setReciboPagador(mName)
    setReciboBeneficiarioNome(mName)
    setReciboBeneficiarioCpf(m.cpf || m.rg || "")
    if (m.rendaFamiliar) setCestaRendaFamiliar(String(m.rendaFamiliar))
    if (m.tipoMoradia) setCestaTipoMoradia(m.tipoMoradia === 'propria' ? 'Propria' : m.tipoMoradia === 'alugada' ? 'Alugada' : 'Cedida')
    if (m.quantidadeMembrosFamilia) setCestaQtdMembros(String(m.quantidadeMembrosFamilia))
    if (m.quantidadeCriancas) setCestaQtdCriancas(String(m.quantidadeCriancas))
    if (m.beneficiosSociais) setCestaBeneficios(Array.isArray(m.beneficiosSociais) ? m.beneficiosSociais.join(', ') : String(m.beneficiosSociais))
    if (m.pontoReferencia) setCestaPontoReferencia(m.pontoReferencia)
    if (m.situacaoVulnerabilidade) setCestaMotivo(m.situacaoVulnerabilidade)
    if (m.dataNascimento) {
      try {
        setCestaDataNasc(new Date(m.dataNascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }))
      } catch {}
    }
    setCestaModo('preenchido')
  }

  const handleValorChange = (val: string) => {
    setReciboValor(val)
    const extenso = valorPorExtenso(val)
    if (extenso) {
      setReciboExtenso(extenso)
    }
  }

  const logPrint = async (documentName: string, memberName: string = "N/A", copies: number = 1) => {
    const newLog = {
      id: Date.now().toString(),
      document: documentName,
      member: memberName,
      date: new Date().toISOString(),
      user: user?.name || "Sistema"
    }
    const updatedLogs = [newLog, ...logs]
    setLogs(updatedLogs)
    localStorage.setItem("churchFormLogs", JSON.stringify(updatedLogs))
    
    // Also send to global audit
    await logAction("Impressão de Formulário", `Documento: ${documentName} | Membro: ${memberName} | Cópias: ${copies}`, user?.name || "Sistema");
  }

  const getDocumentTitle = () => {
    if (formType === 'relatorio-culto') return 'Relatório de Culto Financeiro';
    if (formType === 'ficha-membro') return 'Ficha de Cadastro de Membros';
    if (formType === 'ficha-batismo') return 'Ficha de Candidato ao Batismo nas Águas';
    if (formType === 'ficha-apresentacao') return 'Ficha de Apresentação de Crianças';
    if (formType === 'ficha-reconciliacao') return 'Ficha de Reconciliação e Novos Convertidos';
    if (formType === 'ficha-casamento') return 'Requerimento de Casamento Religioso';
    if (formType === 'ficha-visitante') return 'Ficha de Visitante e Acolhimento';
    if (formType === 'ficha-cesta-basica-analitica' || (formType === 'ficha-cesta-basica' && cestaVersao === 'analitica')) {
      return 'Ficha Analítica de Atendimento - Cesta Básica';
    }
    if (formType === 'ficha-cesta-basica-simples' || (formType === 'ficha-cesta-basica' && cestaVersao === 'simples')) {
      return 'Ficha Simplificada de Atendimento - Cesta Básica';
    }
    if (formType === 'recibo') return 'Recibo Padrão';
    return 'Formulário Oficial';
  };

  const handlePrintStandard = () => {
    setMissingDataError("")
    setIsReadyToPrint(false)
    setPreviewType('standard')
    setIsPreviewOpen(true)
    setTimeout(() => setIsReadyToPrint(true), 600)
  }
  
  const confirmPrintStandard = () => {
    const docName = getDocumentTitle();
    const memberName = selectedMember ? (selectedMember.nome || selectedMember.name) : 'N/A';

    logPrint(docName, memberName, printCopies);

    toast.info("Abrindo caixa de seleção de impressora...");
    
    // Conforme Anexo 3: No campo informar o último número de impresso, deixa sempre zero para informar a quantidade
    setSequenceNumber(0);

    printDocument(
      undefined,
      () => {
        setIsPreviewOpen(false);
      },
      'printable-standard'
    );
  };

  const handleDownloadStandardPDF = async () => {
    const docName = getDocumentTitle();
    logPrint(
      `${docName} (Download PDF)`,
      selectedMember ? (selectedMember.nome || selectedMember.name) : 'N/A',
      1
    );
    const fileName = `${docName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
    await downloadElementAsPdf('printable-standard', fileName);
  };


  const prepareDynamicContent = (template: any) => {
    // Obter dados do membro ou do preenchimento manual/em branco
    let memberName = "";
    let memberDoc = "";
    let memberBatismo = "";
    let memberCargo = "Membro";

    if (solicitanteModo === 'membro' && selectedMember) {
      memberName = selectedMember.nome || selectedMember.name || "";
      memberDoc = selectedMember.cpf || selectedMember.rg || "";
      memberBatismo = selectedMember.dataBatismo || selectedMember.baptismDate || "";
      memberCargo = selectedMember.role || selectedMember.cargo || "Membro";
    } else if (solicitanteModo === 'manual') {
      memberName = solicitanteManualNome.trim();
      memberDoc = solicitanteManualDoc.trim();
      memberBatismo = solicitanteManualBatismo.trim();
    } // Se solicitanteModo === 'branco', mantêm-se vazios para gerar linhas de preenchimento

    const displayNome = memberName || "________________________________________";
    const displayDoc = memberDoc || "____________________";
    const displayBatismo = memberBatismo || "____/____/________";

    let content = template.content || "";
    content = content.replace(/\[NOME_MEMBRO\]|\{NOME_MEMBRO\}|\[NOME_SOLICITANTE\]|\{NOME_SOLICITANTE\}|\[MEMBRO\]|\{MEMBRO\}/g, displayNome);
    content = content.replace(/\[DOCUMENTO\]|\{DOCUMENTO\}/g, displayDoc);
    content = content.replace(/\[DATA_BATISMO\]|\{DATA_BATISMO\}/g, displayBatismo);
    
    const today = new Date().toLocaleDateString('pt-BR');
    content = content.replace(/\[DATA_ATUAL\]|\{DATA_ATUAL\}/g, today);
    content = content.replace(/\[CARGO\]|\{CARGO\}/g, memberCargo);
    content = content.replace(/\[CIDADE_ESTADO\]|\{CIDADE_ESTADO\}|\[CIDADE\]|\{CIDADE\}/g, leadership.church.cidade || "Valparaíso de Goiás - GO");
    content = content.replace(/\[IGREJA\]|\{IGREJA\}/g, displayChurchName);

    setDynamicPrintContent(content);
    return content;
  };

  const handlePrintDynamic = () => {
    if (!selectedTemplateId) {
      toast.error("Selecione um modelo primeiro.");
      return;
    }
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;
    
    setMissingDataError("");
    setIsReadyToPrint(false);
    prepareDynamicContent(template);
    setPreviewType('dynamic');
    setIsPreviewOpen(true);
    setTimeout(() => setIsReadyToPrint(true), 400);
  };

  const handleDownloadDynamicPDF = async () => {
    if (!selectedTemplateId) {
      toast.error("Selecione um modelo primeiro.");
      return;
    }
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    prepareDynamicContent(template);
    const memberName = (solicitanteModo === 'membro' && selectedMember)
      ? (selectedMember.nome || selectedMember.name)
      : (solicitanteModo === 'manual' ? solicitanteManualNome : 'Em Branco');

    logPrint(`Documento Dinâmico: ${template.title} (Download PDF)`, memberName);
    toast.info("Gerando arquivo PDF do documento...");
    
    // Pequeno delay para garantir que o DOM atualizou com o conteúdo dinâmico
    setTimeout(async () => {
      const fileName = `${(template?.title || 'documento').toLowerCase().replace(/[^a-z0-9]/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
      await downloadElementAsPdf('printable-dynamic', fileName);
    }, 250);
  };
  
  const confirmPrintDynamic = () => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (!template) return;

    prepareDynamicContent(template);
    const memberName = solicitanteModo === 'membro' && selectedMember
      ? (selectedMember.nome || selectedMember.name)
      : (solicitanteModo === 'manual' ? solicitanteManualNome : 'Em Branco');

    logPrint(`Documento Dinâmico: ${template.title}`, memberName);
    
    toast.info("Abrindo caixa de seleção de impressora...");
    
    // Conforme Anexo 3: No campo informar o último número de impresso, deixa sempre zero para informar a quantidade
    setSequenceNumber(0);

    printDocument(
      undefined,
      () => setIsPreviewOpen(false),
      'printable-dynamic'
    );
  };

  const saveTemplate = () => {
    if (!currentTemplateTitle) {
      toast.error("O modelo precisa de um título.")
      return
    }
    
    let updatedTemplates = [...templates]
    
    if (selectedTemplateId && isEditingTemplate) {
      updatedTemplates = updatedTemplates.map(t => 
        t.id === selectedTemplateId 
          ? { ...t, title: currentTemplateTitle, content: currentTemplateContent } 
          : t
      )
      toast.success("Modelo atualizado com sucesso!")
    } else {
      const newTemp = {
        id: "temp_" + Date.now(),
        title: currentTemplateTitle,
        content: currentTemplateContent
      }
      updatedTemplates.push(newTemp)
      setSelectedTemplateId(newTemp.id)
      toast.success("Modelo criado com sucesso!")
    }
    
    setTemplates(updatedTemplates)
    localStorage.setItem("churchTemplates", JSON.stringify(updatedTemplates))
    setIsEditingTemplate(false)
  }

  const deleteTemplate = () => {
    if(!selectedTemplateId) return
    const updated = templates.filter(t => t.id !== selectedTemplateId)
    setTemplates(updated)
    localStorage.setItem("churchTemplates", JSON.stringify(updated))
    setSelectedTemplateId("")
    setCurrentTemplateTitle("")
    setCurrentTemplateContent("")
    setIsEditingTemplate(false)
    toast.success("Modelo excluído.")
  }

  const renderRelatorioCulto = () => {
    return (
      <div id="printable-standard">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-standard, #printable-standard * { visibility: visible; }
            #printable-standard { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: transparent; }
            @page { size: A4 portrait; margin: 0; }
            ::-webkit-scrollbar { display: none; }
            .print-page { page-break-after: always; height: 297mm; max-height: 297mm; box-sizing: border-box; overflow: hidden; }
          }
        `}</style>
        
        {Array.from({ length: printCopies }).flatMap((_, copyIdx) => {
          const currentSeq = sequenceNumber + 1 + copyIdx;
          const viasToPrint = imprimirSegundaVia ? [0, 1] : [0];
          return viasToPrint.map((viaIdx) => {
            const isSecondVia = viaIdx === 1;
            return (
          <div key={`${copyIdx}-${viaIdx}`} className={`w-[210mm] max-w-[210mm] min-h-[297mm] bg-white p-[8mm] mx-auto text-[10px] font-sans print:block print-page relative box-border mb-6 print:mb-0 ${isSecondVia ? 'text-neutral-600 opacity-75 print:opacity-75 via-talao-carbono' : 'text-black'}`}>
            
            <div className={`border-2 flex flex-col relative z-10 ${isSecondVia ? 'border-neutral-500' : 'border-black'}`}>
               {isSecondVia && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 font-bold text-[10px] border border-neutral-500 text-neutral-500">[ 2ª VIA - CARBONO / ARQUIVO ]</div>}
            {/* Header */}
            <div className="flex border-b-2 border-black h-[22mm]">
              <div className="w-[25mm] border-r-2 border-black flex items-center justify-center p-1">
                {churchData.logoDataUrl ? (
                  <img src={churchData.logoDataUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                ) : (
                  <div className="text-center font-bold text-[8px] leading-tight">LOGO<br/>AQUI</div>
                )}
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center p-2">
                <h1 className="font-bold text-[13.5px] leading-tight uppercase w-full">{displayChurchName}</h1>
                <p className="text-[8.5px] uppercase mt-1 leading-tight font-semibold">{displayChurchAddress} | CNPJ: {displayCnpj}</p>
                <div className="border border-black bg-gray-200 font-bold px-4 py-0.5 mt-2 text-[12px] uppercase">
                  RELATÓRIO DE CULTO - ESTATÍSTICO/FINANCEIRO
                </div>
              </div>
              <div className="w-[34mm] border-l-2 border-black flex flex-col items-center justify-center font-bold tracking-widest leading-none py-1 bg-white">
                <span className="text-[17px] font-black tracking-wider text-black">OBPC</span>
                <span className="text-red-600 font-black text-[20px] leading-tight">Nº</span>
                <span className="text-red-600 font-black text-[22px] leading-tight tracking-wider">{String(currentSeq).padStart(5, '0')}</span>
              </div>
            </div>

          {/* Row 1 */}
          <div className="flex border-b border-black min-h-[7.5mm]">
            <div className="flex-1 border-r border-black p-1 relative">
              <span className="absolute top-0.5 left-1 font-bold text-[8px]">Igreja / Congregação (Cidade/Bairro)</span>
              <div className="mt-2.5 ml-1 text-[10px] font-semibold">{activeBranchObj && activeBranchObj.id !== 'all' ? activeBranchObj.name : ""}</div>
            </div>
            <div className="w-[30mm] p-1 relative">
              <span className="absolute top-0.5 left-1 font-bold text-[8px]">Data</span>
              <div className="mt-2.5 ml-1 text-[10px]"></div>
            </div>
          </div>

          {/* Row 2 */}
          <div className="flex border-b border-black min-h-[7.5mm]">
            <div className="flex-1 border-r border-black p-1 relative">
              <span className="absolute top-0.5 left-1 font-bold text-[8px]">Pastor ou Responsável pela Igreja / Congregação</span>
              <div className="mt-2 ml-1 text-[10px] font-semibold">{leadership.pastor.name}</div>
            </div>
            <div className="w-[30mm] p-1 relative">
              <span className="absolute top-0.5 left-1 font-bold text-[8px]">RM</span>
            </div>
          </div>

          {/* Row 3 */}
          <div className="flex border-b border-black min-h-[7.5mm]">
            <div className="flex-1 border-r border-black p-1 relative">
              <span className="absolute top-0.5 left-1 font-bold text-[8px]">Tipo de Culto realizado</span>
            </div>
            <div className="w-[90mm] p-1 relative">
              <span className="absolute top-0.5 left-1 font-bold text-[8px]">Pregador(a)</span>
            </div>
          </div>

          {/* Row 4 - Checkboxes & Stats */}
          <div className="flex border-b border-black">
            <div className="flex-1 flex flex-col justify-between">
               <div className="text-center font-bold text-[8.5px] py-1 border-b border-black uppercase tracking-wide bg-gray-50/60">
                 Dia da Semana (Marque com um "X")
               </div>
               <div className="grid grid-cols-7 w-full h-full items-center justify-items-center py-2 px-1">
                 {['SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO', 'DOMINGO'].map((dia) => (
                   <div key={dia} className="flex flex-col items-center justify-center gap-1.5 w-full text-center">
                     <div className="border-[1.5px] border-black w-[11.5mm] h-[8mm] bg-white rounded-none mx-auto"></div>
                     <span className="text-[6px] font-black uppercase tracking-tight text-center leading-none">{dia}</span>
                   </div>
                 ))}
               </div>
            </div>
            <div className="w-[20mm] border-l border-r border-black relative">
               <span className="absolute top-1 left-1 font-bold text-[8px] uppercase">Horário</span>
            </div>
            <div className="w-[70mm] grid grid-cols-2">
               <div className="border-r border-b border-black p-1 flex justify-between items-center text-[8px] font-bold"><span className="leading-none">Testemunho Cura</span><div className="w-10 h-4 border border-black inline-block ml-1"></div></div>
               <div className="border-b border-black p-1 flex justify-between items-center text-[8px] font-bold"><span className="leading-none">Conversões</span><div className="w-10 h-4 border border-black inline-block ml-1"></div></div>
               <div className="border-r border-b border-black p-1 flex justify-between items-center text-[8px] font-bold"><span className="leading-none">Batismo / Esp. Santo</span><div className="w-10 h-4 border border-black inline-block ml-1"></div></div>
               <div className="border-b border-black p-1 flex justify-between items-center text-[8px] font-bold"><span className="leading-none">Visitantes</span><div className="w-10 h-4 border border-black inline-block ml-1"></div></div>
               <div className="border-r border-black p-1 flex justify-between items-center text-[8px] font-bold"><span className="leading-none">Crianças Apresent.</span><div className="w-10 h-4 border border-black inline-block ml-1"></div></div>
               <div className="p-1 flex justify-between items-center text-[8px] font-bold bg-gray-100"><span className="leading-none">TOTAL PRESENTES</span><div className="w-10 h-4 border border-black inline-block ml-1"></div></div>
            </div>
          </div>

          {/* Row 5 */}
          <div className="flex border-b border-black min-h-[5.5mm]">
            <div className="w-[120mm] border-r border-black p-1 font-bold text-[8px] text-right flex items-center justify-end">Diácon(os) (isas) em serviço </div>
            <div className="flex-1"></div>
          </div>
          
          {/* Row 6 */}
          <div className="flex border-b-2 border-black min-h-[5.5mm] bg-gray-50">
            <div className="w-[120mm] border-r border-black p-1 font-bold text-[8px] text-center flex items-center justify-center">PASTORES / PRESBÍTEROS / MISS. / EVANGELISTAS PRESENTES</div>
            <div className="flex-1 p-1 font-bold text-[8px] text-center flex items-center justify-center">VISITAS ESPECIAIS</div>
          </div>
          <div className="flex border-b-2 border-black min-h-[7mm]">
             <div className="w-[120mm] border-r border-black"></div>
             <div className="flex-1"></div>
          </div>

          {/* Demonstrativo de Arrecadacoes */}
          <div className="text-center font-bold text-[9.5px] py-0.5 border-b-2 border-black bg-gray-100 uppercase tracking-wide">DEMONSTRATIVO DE ARRECADAÇÕES</div>
          <div className="grid grid-cols-3">
             <div className="flex border-b border-r border-black h-[5.5mm] items-center">
                <div className="w-6 border-r border-black text-center font-bold text-[8px] h-full flex items-center justify-center shrink-0">01</div>
                <div className="flex-1 flex justify-between items-center px-1 font-bold text-[8.5px]"><span>Dízimos</span></div>
                <div className="w-[20mm] border-l border-black h-full shrink-0"></div>
             </div>
             <div className="flex border-b border-r border-black h-[5.5mm] items-center">
                <div className="w-6 border-r border-black text-center font-bold text-[8px] h-full flex items-center justify-center shrink-0">03</div>
                <div className="flex-1 flex justify-between items-center px-1 font-bold text-[8.5px]"><span>Ofertas Especiais</span></div>
                <div className="w-[20mm] border-l border-black h-full shrink-0"></div>
             </div>
             <div className="flex border-b border-black h-[5.5mm] items-center">
                <div className="w-6 border-r border-black text-center font-bold text-[8px] h-full flex items-center justify-center shrink-0">05</div>
                <div className="flex-1 flex justify-between items-center px-1 font-bold text-[8.5px]"><span>Ofertas de Missões</span></div>
                <div className="w-[20mm] border-l border-black bg-gray-100 h-full shrink-0"></div>
             </div>
             <div className="flex border-b border-r border-black h-[5.5mm] items-center">
                <div className="w-6 border-r border-black text-center font-bold text-[8px] h-full flex items-center justify-center shrink-0">02</div>
                <div className="flex-1 flex justify-between items-center px-1 font-bold text-[8.5px]"><span>Ofertas Gerais</span></div>
                <div className="w-[20mm] border-l border-black h-full shrink-0"></div>
             </div>
             <div className="flex border-b border-r border-black h-[5.5mm] items-center">
                <div className="w-6 border-r border-black text-center font-bold text-[8px] h-full flex items-center justify-center shrink-0">04</div>
                <div className="flex-1 flex justify-between items-center px-1 font-bold text-[8.5px]"><span>Ofertas Proj. Neemias</span></div>
                <div className="w-[20mm] border-l border-black bg-gray-100 h-full shrink-0"></div>
             </div>
             <div className="flex border-b border-black h-[5.5mm] items-center">
                <div className="w-6 border-r border-black text-center font-bold text-[8px] h-full flex items-center justify-center shrink-0">06</div>
                <div className="flex-1 flex justify-between items-center px-1 font-bold text-[8.5px]"><span>Outras Entradas</span></div>
                <div className="w-[20mm] border-l border-black h-full shrink-0"></div>
             </div>
          </div>
          <div className="flex border-b-2 border-black h-[5.5mm] bg-gray-100 items-center">
             <div className="flex-1 text-right pr-2 font-bold text-[8.5px] flex items-center justify-end uppercase">
                TOTAL DE ARRECADAÇÕES (não soma Ofertas Missões e Projeto Neemias) 
             </div>
             <div className="w-[20mm] border-l border-black bg-white h-full shrink-0"></div>
          </div>

          {/* Relação dos Dizimistas */}
          <div className="text-center font-bold text-[9.5px] py-0.5 border-b-2 border-black bg-gray-100 uppercase tracking-wide">RELAÇÃO DOS DIZIMISTAS DO CULTO</div>
          <div className="flex border-b border-black font-bold text-[8.5px] text-center bg-gray-50 h-[5.5mm] items-center">
             <div className="w-7 border-r border-black py-0.5 shrink-0">ÍTEM</div>
             <div className="flex-1 border-r border-black py-0.5 text-left pl-2">NOME DOS DIZIMISTAS</div>
             <div className="w-[26mm] border-r border-black py-0.5 shrink-0">Nº CHEQUE</div>
             <div className="w-[26mm] border-r border-black py-0.5 shrink-0">BANCO</div>
             <div className="w-[32mm] py-0.5 shrink-0">VALOR</div>
          </div>
          
          {[...Array(20)].map((_, i) => (
             <div key={i} className="flex border-b border-black h-[5.8mm] items-center">
               <div className="w-7 border-r border-black text-center font-bold text-[8px] h-full flex items-center justify-center shrink-0">{String(i+1).padStart(2, '0')}</div>
               <div className="flex-1 border-r border-black px-2 text-[9px] h-full flex items-center truncate font-medium">{i === 0 && selectedMember ? selectedMember.nome : ""}</div>
               <div className="w-[26mm] border-r border-black h-full shrink-0"></div>
               <div className="w-[26mm] border-r border-black h-full shrink-0"></div>
               <div className="w-[32mm] h-full shrink-0"></div>
             </div>
          ))}

          {/* Assinaturas Diáconos */}
          <div className="flex border-b border-black bg-gray-100 h-[5mm] items-center">
             <div className="w-1/2 border-r border-black font-bold text-center py-0.5 text-[8.5px] uppercase">NOMES DOS DIÁCON(OS)(ISAS) RESPONSÁVEIS</div>
             <div className="w-1/2 font-bold text-center py-0.5 text-[8.5px] uppercase">ASSINATURAS</div>
          </div>
          {[...Array(2)].map((_, i) => (
             <div key={i} className="flex border-b border-black h-[7.5mm]">
               <div className="w-1/2 border-r border-black h-full"></div>
               <div className="w-1/2 h-full"></div>
             </div>
          ))}

          {/* Destino da Arrecadação */}
          <div className="text-center font-bold text-[9.5px] py-0.5 border-b border-black bg-gray-100 uppercase tracking-wide">DESTINO DA ARRECADAÇÃO</div>
          
          <div className="flex border-b border-black h-[8.5mm]">
             <div className="w-1/2 border-r border-black p-1 relative">
               <span className="absolute top-0.5 left-1 font-bold text-[7.5px] text-gray-700">Nome Tesoureiro ou Responsável</span>
               <div className="mt-2.5 ml-1 text-[9px] font-semibold">{leadership.tesoureiro.name}</div>
             </div>
             <div className="w-1/2 p-1 relative flex items-center justify-center">
               <span className="absolute top-0.5 left-1 font-bold text-[7.5px] text-gray-700">Assinatura</span>
               {leadership.tesoureiro.signatureUrl ? (
                 <img src={leadership.tesoureiro.signatureUrl} alt="" className="h-6 object-contain" />
               ) : (
                 <span className="text-[8px] text-gray-400 mt-2">______________________________________</span>
               )}
             </div>
          </div>

          <div className="flex h-[16mm]">
             <div className="w-1/2 flex flex-col border-r-2 border-black">
                <div className="h-[8mm] border-b border-black text-center font-bold text-[11px] flex items-center justify-center bg-gray-50">
                   CAIXA LOCAL
                </div>
                <div className="h-[8mm] relative p-1">
                   <span className="absolute top-0.5 left-1 font-bold text-[7.5px] text-gray-700">Valor</span>
                </div>
             </div>
             
             <div className="w-1/2 flex">
                <div className="w-[25mm] border-r border-black flex items-center justify-center text-center font-bold text-[7.5px] leading-tight p-0.5 bg-gray-50 shrink-0">
                   CONTA<br/>CORRENTE<br/>DA IGREJA
                </div>
                <div className="flex-1 flex flex-col">
                   <div className="flex h-[8mm] border-b border-black">
                      <div className="flex-1 border-r border-black p-1 relative">
                         <span className="absolute top-0.5 left-1 font-bold text-[7px] text-gray-600">Banco</span>
                      </div>
                      <div className="w-[16mm] border-r border-black p-1 relative shrink-0">
                         <span className="absolute top-0.5 left-1 font-bold text-[7px] text-gray-600">Agência</span>
                      </div>
                      <div className="w-[26mm] p-1 relative shrink-0">
                         <span className="absolute top-0.5 left-1 font-bold text-[7px] text-gray-600">Valor</span>
                      </div>
                   </div>
                   <div className="flex h-[8mm]">
                      <div className="flex-1 border-r border-black p-1 relative">
                         <span className="absolute top-0.5 left-1 font-bold text-[7px] text-gray-600">Banco</span>
                      </div>
                      <div className="w-[16mm] border-r border-black p-1 relative shrink-0">
                         <span className="absolute top-0.5 left-1 font-bold text-[7px] text-gray-600">Agência</span>
                      </div>
                      <div className="w-[26mm] p-1 relative shrink-0">
                         <span className="absolute top-0.5 left-1 font-bold text-[7px] text-gray-600">Valor</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>

        </div>
        <div className="text-[8px] font-bold mt-2 flex items-center justify-between px-2 pt-1 border-t border-black/20 text-gray-600">
           <span>{viaIdx === 0 ? "1ª Via Tesouraria / Sede" : "2ª Via Arquivo Congregação"}</span>
           <span className={`px-2 py-0.5 border rounded font-bold text-[8.5px] uppercase ${isSecondVia ? 'border-neutral-500 bg-neutral-100 text-neutral-600' : 'border-black bg-slate-100 text-black'}`}>
             {isSecondVia ? "2ª via" : "1ª via"}
           </span>
        </div>
      </div>
      );
      });
      })}
    </div>
    );
  }

  const renderRecibo = () => {
    const isReciboBranco = reciboModo === 'branco';
    const beneficiarioNome = isReciboBranco ? "" : (reciboBeneficiarioNome || reciboPagador || "");
    const beneficiarioCpf = isReciboBranco ? "" : (reciboBeneficiarioCpf || (selectedMember?.cpf || ""));
    const valorDisplay = isReciboBranco || !reciboValor ? "" : `R$ ${reciboValor}`;
    const extensoDisplay = isReciboBranco || !reciboExtenso ? "" : `(${reciboExtenso})`;
    const referenteDisplay = isReciboBranco ? "" : (reciboReferente || "");
    const pagadorDisplay = isReciboBranco ? "" : (reciboRecebiDe || "Igreja Evangélica Pentecostal O Brasil Para Cristo");
    const dataDisplay = isReciboBranco ? "" : (reciboData || new Date().toLocaleDateString('pt-BR'));

    return (
      <div id="printable-standard" className="text-black font-sans print:block">
        <style>{`
          @media print {
            body * { visibility: hidden !important; }
            #printable-standard, #printable-standard * { visibility: visible !important; }
            #printable-standard {
              position: absolute !important;
              left: 0 !important;
              right: 0 !important;
              top: 0 !important;
              width: 210mm !important;
              margin: 0 auto !important;
              padding: 0 !important;
              background: white !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: flex-start !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              size: A4 portrait;
              margin: 0;
            }
            ::-webkit-scrollbar { display: none; }
            .recibo-page {
              page-break-after: always;
              break-after: page;
              height: 297mm !important;
              max-height: 297mm !important;
              width: 210mm !important;
              box-sizing: border-box !important;
              padding: 12mm 10mm !important;
              margin: 0 auto !important;
              display: flex !important;
              flex-direction: column !important;
              justify-content: space-between !important;
              align-items: center !important;
              overflow: hidden !important;
            }
          }
        `}</style>
        
        <div className="flex flex-col gap-8 print:gap-0 items-center justify-center w-full">
           {Array.from({ length: printCopies }).flatMap((_, copyIdx) => {
             // 2 recibos por página conforme especificação
             const baseSeq = sequenceNumber + (copyIdx * 2);
             const vias = imprimirSegundaVia ? [0, 1] : [0];
             return vias.map((pageViaIdx) => {
               const isSecondVia = pageViaIdx === 1;

               // Estilização diferenciada para 2ª via (carbono / talão)
               const borderThickClass = isSecondVia ? 'border-2 border-neutral-400' : 'border-2 border-black';
               const borderInnerClass = isSecondVia ? 'border-2 border-neutral-400' : 'border-2 border-black';
               const textMainClass = isSecondVia ? 'text-neutral-600' : 'text-black';
               const textMutedClass = isSecondVia ? 'text-neutral-500' : 'text-gray-700';
               const bgHeaderClass = isSecondVia ? 'bg-neutral-100/60' : 'bg-gray-100';
               const lineClass = isSecondVia ? 'border-neutral-400' : 'border-black';
               const numberClass = isSecondVia ? 'text-red-400 font-bold' : 'text-red-600 font-black';

               return (
                <div 
                  key={`copy-${copyIdx}-page-${pageViaIdx}`} 
                  className={`recibo-page w-[210mm] h-[297mm] max-h-[297mm] bg-white p-[12mm_10mm] mx-auto box-border flex flex-col justify-between items-center overflow-hidden relative shadow-md mb-8 print:mb-0 print:shadow-none ${
                    isSecondVia ? 'text-neutral-600 print:opacity-75 via-talao-carbono' : 'text-black'
                  }`}
                >
                  {[0, 1].map((viaIdx) => {
                    const receiptSeq = baseSeq + viaIdx + 1;

                    return (
                    <React.Fragment key={`${copyIdx}-${pageViaIdx}-${viaIdx}`}>
                      {/* Recibo com dimensão exata de 12cm (120mm) de altura por 19cm (190mm) de largura */}
                      <div 
                        className={`rounded-2xl p-[3.5mm_4.5mm] flex flex-col justify-between relative overflow-visible h-[120mm] max-h-[120mm] w-[190mm] max-w-[190mm] box-border ${borderThickClass} ${
                          isSecondVia ? 'bg-neutral-50/40 text-neutral-600' : 'bg-white text-black'
                        }`}
                        style={{ height: '120mm', width: '190mm' }}
                      >
                        {/* Marcas de recorte nos quatro cantos do recibo para acabamento profissional */}
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-t-2 border-l-2 border-neutral-800 pointer-events-none select-none opacity-80" />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-t-2 border-r-2 border-neutral-800 pointer-events-none select-none opacity-80" />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-b-2 border-l-2 border-neutral-800 pointer-events-none select-none opacity-80" />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-b-2 border-r-2 border-neutral-800 pointer-events-none select-none opacity-80" />

                        {/* Header Recibo Oficial */}
                        <div className="flex justify-between items-center gap-3">
                           {/* Logo OBPC à esquerda */}
                           <div className={`w-[28mm] h-[21mm] ${borderInnerClass} rounded-2xl flex items-center justify-center p-1.5 bg-white shrink-0 ${isSecondVia ? 'opacity-70 grayscale' : ''}`}>
                             {churchData.logoDataUrl ? (
                                <img src={churchData.logoDataUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                             ) : (
                                <div className="text-center font-bold text-[10px] leading-tight">IGREJA<br/>OBPC</div>
                             )}
                           </div>

                           {/* Dados Centrais da Congregação / Igreja */}
                           <div className="flex-1 text-center px-2">
                              <h2 className={`font-bold text-[14px] uppercase leading-tight tracking-tight ${textMainClass}`}>
                                {reciboCongregacao || displayChurchName}
                              </h2>
                              <p className={`text-[9.5px] uppercase font-bold mt-1 leading-none ${textMutedClass}`}>CNPJ: {displayCnpj}</p>
                              <p className={`text-[8.5px] uppercase font-bold leading-tight mt-1 ${textMutedClass}`}>{displayChurchAddress}</p>
                           </div>

                           {/* Bloco à direita: RECIBO 1ª VIA e Nº */}
                           <div className="flex flex-col gap-1 w-[46mm] shrink-0">
                              <div className={`${borderInnerClass} rounded-2xl h-[10.5mm] flex items-center justify-between px-3 text-center font-black tracking-widest ${bgHeaderClass}`}>
                                 <span className={`text-[16px] font-black leading-none ${textMainClass}`}>RECIBO</span>
                                 <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full border ${
                                   isSecondVia 
                                     ? 'bg-neutral-200 border-neutral-400 text-neutral-700' 
                                     : 'bg-black border-black text-white'
                                 }`}>
                                   {isSecondVia ? '2ª VIA' : '1ª VIA'}
                                 </span>
                              </div>
                              <div className={`${borderInnerClass} rounded-2xl h-[10mm] flex flex-col items-center justify-center font-bold tracking-widest leading-none bg-white`}>
                                 <div className="flex items-center gap-1.5 leading-none mb-0.5">
                                   <span className={`text-[9.5px] font-bold tracking-wider ${textMutedClass}`}>OBPC</span>
                                   {isSecondVia && <span className="text-[7.5px] font-bold text-neutral-500 uppercase">(CARBONO)</span>}
                                 </div>
                                 <span className={`${numberClass} text-[16px] leading-tight tracking-normal`}>Nº {String(receiptSeq).padStart(5, '0')}</span>
                              </div>
                           </div>
                        </div>

                        {/* Body Recibo com legendas e campos em formato CÁPSULAS / PILLS proporcionais aos 12cm */}
                        <div className="flex flex-col gap-[2mm] my-1">
                           {/* Row 1: Igreja / Congregação */}
                           <div className="flex gap-2 items-center h-[7.5mm]">
                              <div className={`${borderInnerClass} rounded-full px-2 w-[52mm] text-center font-bold text-[9px] uppercase whitespace-nowrap ${bgHeaderClass} ${textMainClass} h-full flex items-center justify-center shrink-0`}>
                                 IGREJA / CONGREGAÇÃO
                              </div>
                              <div className={`${borderInnerClass} rounded-full flex-1 h-full px-4 flex items-center font-semibold text-[10.5px] truncate ${textMainClass}`}>
                                 {reciboCongregacao || displayChurchName}
                              </div>
                           </div>

                           {/* Row 2: Valor - R$ */}
                           <div className="flex gap-2 items-center h-[7.5mm]">
                              <div className={`${borderInnerClass} rounded-full px-2 w-[52mm] text-center font-bold text-[9px] uppercase ${bgHeaderClass} ${textMainClass} h-full flex items-center justify-center shrink-0`}>
                                 VALOR - R$
                              </div>
                              <div className={`${borderInnerClass} rounded-full flex-1 h-full px-4 flex items-center font-bold text-[12px] ${textMainClass}`}>
                                 {valorDisplay}
                              </div>
                           </div>

                           {/* Row 3: Valor por Extenso */}
                           <div className="flex gap-2 items-center h-[7.5mm]">
                              <div className={`${borderInnerClass} rounded-full px-2 w-[52mm] text-center font-bold text-[9px] uppercase ${bgHeaderClass} ${textMainClass} h-full flex items-center justify-center shrink-0`}>
                                 VALOR POR EXTENSO
                              </div>
                              <div className={`${borderInnerClass} rounded-full flex-1 h-full px-4 flex items-center font-semibold text-[10px] truncate ${textMainClass}`}>
                                 {extensoDisplay}
                              </div>
                           </div>

                           {/* Row 4: Recebi(emos) de */}
                           <div className="flex gap-2 items-center h-[7.5mm]">
                              <div className={`${borderInnerClass} rounded-full px-2 w-[52mm] text-center font-bold text-[9px] uppercase whitespace-nowrap ${bgHeaderClass} ${textMainClass} h-full flex items-center justify-center shrink-0`}>
                                 RECEBI(EMOS) DE
                              </div>
                              <div className={`${borderInnerClass} rounded-full flex-1 h-full px-4 flex items-center font-bold text-[10.5px] truncate ${textMainClass}`}>
                                 {pagadorDisplay}
                              </div>
                           </div>

                           {/* Row 5: REFERENTE: */}
                           <div className="flex gap-2 items-center h-[7.5mm]">
                              <div className={`${borderInnerClass} rounded-full px-2 w-[52mm] text-center font-bold text-[9px] uppercase tracking-wide ${bgHeaderClass} ${textMainClass} h-full flex items-center justify-center shrink-0`}>
                                 REFERENTE:
                              </div>
                              <div className={`${borderInnerClass} rounded-full flex-1 h-full px-4 flex items-center font-medium text-[10.5px] truncate ${textMainClass}`}>
                                 {referenteDisplay}
                              </div>
                           </div>

                           {/* Row 6: Beneficiário / Favorecido */}
                           <div className="flex gap-2 items-center h-[7.5mm]">
                              <div className={`${borderInnerClass} rounded-full px-2 w-[52mm] text-center font-bold text-[8.5px] uppercase tracking-tight ${bgHeaderClass} ${textMainClass} h-full flex items-center justify-center shrink-0`}>
                                 BENEFICIÁRIO / FAVORECIDO
                              </div>
                              <div className={`${borderInnerClass} rounded-full flex-1 h-full px-4 flex items-center font-semibold text-[10.5px] truncate ${textMainClass}`}>
                                 {beneficiarioNome ? `${beneficiarioNome}${beneficiarioCpf ? ` — CPF: ${beneficiarioCpf}` : ''}` : ""}
                              </div>
                           </div>
                        </div>

                        {/* Footer Recibo com assinaturas harmônicas e espaçadas */}
                        <div className={`flex flex-col gap-1 mt-1 ${textMainClass}`}>
                           <div className="flex items-center px-1">
                              <span className="text-[9px] font-medium leading-tight">
                                a importância acima citada. Pela clareza firmo(amos) o presente recibo.
                              </span>
                           </div>

                           {/* Três colunas de assinaturas: Beneficiário, Data e Tesoureiro */}
                           <div className="flex justify-between items-end px-2 text-[8.5px] font-bold mt-1">
                              {/* 1. Assinatura da Pessoa Beneficiada */}
                              <div className="flex flex-col items-center w-[58mm]">
                                 <div className={`w-full border-b ${lineClass} h-4 text-center text-[9px] font-bold truncate mb-0.5`}>
                                    {isReciboBranco ? "" : (beneficiarioNome || "")}
                                 </div>
                                 <span className="text-[8px] font-bold uppercase truncate max-w-full">
                                    {isReciboBranco || !beneficiarioNome ? "ASSINATURA DO(A) BENEFICIÁRIO(A)" : beneficiarioNome}
                                 </span>
                                 <span className="text-[7.5px] text-neutral-600 font-bold leading-none mt-0.5">
                                    {isReciboBranco ? "CPF: ______________________" : (beneficiarioCpf ? `CPF: ${beneficiarioCpf}` : "Beneficiário(a) / Recebedor(a)")}
                                 </span>
                              </div>

                              {/* 2. Data do Recibo */}
                              <div className="flex flex-col items-center w-[28mm]">
                                 <div className={`w-full border-b ${lineClass} h-4 text-center text-[9px] font-semibold mb-0.5`}>
                                    {dataDisplay}
                                 </div>
                                 <span className="text-[8px] font-bold uppercase">Data</span>
                              </div>

                              {/* 3. Tesoureiro ou Responsável da Igreja */}
                              <div className="flex flex-col items-center w-[58mm]">
                                 <div className={`w-full border-b ${lineClass} min-h-[16px] text-center text-[9px] font-medium truncate mb-0.5 flex flex-col items-center justify-end`}>
                                    {!isReciboBranco && leadership.tesoureiro.signatureUrl && (
                                       <img src={leadership.tesoureiro.signatureUrl} alt="" className="h-5 object-contain" />
                                    )}
                                    <span className="font-bold text-[9px]">
                                      {isReciboBranco ? "" : (reciboTesoureiro || leadership.tesoureiro.name || "Tesoureiro")}
                                    </span>
                                 </div>
                                 <span className="text-[8px] font-bold uppercase">Tesoureiro(a) / Responsável</span>
                                 <span className="text-[7.5px] text-neutral-500 font-semibold leading-none mt-0.5">Igreja O Brasil Para Cristo</span>
                              </div>
                           </div>
                        </div>
                      </div>

                      {/* Linha Pontilhada de Recorte central entre os 2 recibos da folha */}
                      {viaIdx === 0 && (
                        <div className="h-[7mm] w-[190mm] flex items-center justify-center relative my-0 select-none print:flex">
                          <div className={`w-full border-b-2 border-dashed ${isSecondVia ? 'border-neutral-300' : 'border-gray-400'}`}></div>
                          <div className={`absolute bg-white px-3 text-[8.5px] font-bold tracking-wider uppercase flex items-center gap-1.5 ${isSecondVia ? 'text-neutral-400' : 'text-gray-500'}`}>
                            <span>✂</span>
                            <span>Corte Aqui</span>
                            <span>✂</span>
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                    )})}
                </div>
               );
             });
           })}
        </div>
      </div>
    );
  };

  const renderFichaMembro = () => {
    const fichaData: FichaMembroData = {
      numeroFicha: selectedMember?.numeroFicha || String(sequenceNumber + 1).padStart(4, "0"),
      nome: selectedMember?.nome || selectedMember?.name || "",
      endereco: selectedMember?.endereco || selectedMember?.address || "",
      cidade: selectedMember?.cidade || "Valparaíso - SP",
      bairro: selectedMember?.bairro || "",
      cep: selectedMember?.cep || "16880-000",
      telefone: selectedMember?.phone || selectedMember?.telefone || "",
      email: selectedMember?.email || "",
      naturalidade: selectedMember?.naturalidade || "",
      estadoCivil: selectedMember?.estadoCivil || "",
      dataNascimento: selectedMember?.dataNascimento || selectedMember?.birthDate || "",
      cpf: selectedMember?.cpf || "",
      rg: selectedMember?.rg || "",
      sexo: selectedMember?.sexo || "",
      pai: selectedMember?.pai || "",
      mae: selectedMember?.mae || "",
      membroDesde: selectedMember?.membroDesde || "",
      dataBatismo: selectedMember?.dataBatismo || selectedMember?.baptismDate || "",
      validade: selectedMember?.validade || "31/12/2026",
      cargo: selectedMember?.role || selectedMember?.cargo || (selectedMember ? "MEMBRO" : ""),
      expedida: new Date().toLocaleDateString("pt-BR"),
      fotoUrl: selectedMember?.photoUrl || selectedMember?.foto || selectedMember?.photo || ""
    };

    return (
      <div id="printable-standard">
        {Array.from({ length: printCopies }).flatMap((_, copyIdx) => {
          // Conforme Anexo 5: 1 via única oficial para ficha de membros
          const vias = [0];
          return vias.map((viaIdx) => (
            <div key={`${copyIdx}-${viaIdx}`} className="print-page mb-6 print:mb-0">
              <FichaMembroPrintable
                memberData={fichaData}
                churchName={displayChurchName}
                churchSubtitle={`${activeBranchObj?.name || 'CONGREGAÇÃO'} | SECRETARIA GERAL`}
                churchAddress={displayChurchAddress}
                churchCityZip={`${leadership.church.cidade} | CEP: ${leadership.church.cep}`}
                churchCnpj={displayCnpj}
                logoUrl={churchData?.logoDataUrl || leadership.church.logoUrl}
                pastorName={leadership.pastor.name}
                secretariaName={leadership.secretaria.name}
                pastorSignatureUrl={leadership.pastor.signatureUrl}
                secretariaSignatureUrl={leadership.secretaria.signatureUrl}
                viaLabel={viaIdx === 0 ? "1ª via" : "2ª via"}
                isSecondVia={viaIdx === 1}
              />
            </div>
          ));
        })}
      </div>
    );
  }

  const renderFichaBatismo = () => {
    // Conforme Anexo 4: Na ficha de batismo deixar todos os campos em branco
    const candidateName = "";
    const candidateCpf = "";
    const candidateRg = "";
    const candidateNasc = "";
    const candidateNat = "";
    const candidateCivil = "";
    const candidateProfissao = "";
    const candidateTel = "";
    const candidateEmail = "";
    const candidateEnd = "";
    const candidateBairro = "";
    const candidateCidade = "";
    const candidateCep = "";
    const candidatePai = "";
    const candidateMae = "";
    const candidateConjuge = "";
    const pastorName = batismoPastor || churchData?.pastorTitular || "Pr. Presidente";

    return (
      <div id="printable-standard">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-standard, #printable-standard * { visibility: visible; }
            #printable-standard { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: transparent; }
            @page { size: A4 portrait; margin: 0; }
            ::-webkit-scrollbar { display: none; }
            .print-page { page-break-after: always; height: 297mm; max-height: 297mm; box-sizing: border-box; overflow: hidden; }
          }
        `}</style>

        {Array.from({ length: printCopies }).flatMap((_, copyIdx) => {
          const currentSeq = sequenceNumber + 1 + copyIdx;
          // Conforme Anexo 5: Na ficha de batismo deixar somente UMA via única
          const vias = [0];
          return vias.map((viaIdx) => {
            const isSecondVia = false;
            return (
            <div
              key={`${copyIdx}-${viaIdx}`}
              className="w-[210mm] max-w-[210mm] min-h-[297mm] bg-white p-[7mm] mx-auto text-[9.5px] font-sans print:block print-page relative box-border mb-6 print:mb-0 text-black"
            >
              {isSecondVia && (
                <div className="text-right text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1 print:block">
                  [ 2ª VIA - CARBONO / ARQUIVO ]
                </div>
              )}
              <div className={`border-2 flex flex-col relative z-10 p-2.5 space-y-2 ${isSecondVia ? 'border-neutral-500' : 'border-black'}`}>
                {/* Header */}
                <div className="flex border-b-2 border-black pb-2">
                  <div className="w-[24mm] h-[22mm] border-r border-black flex items-center justify-center p-1 pr-2">
                    {churchData.logoDataUrl ? (
                      <img src={churchData.logoDataUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="text-center font-bold text-[8px] leading-tight">LOGO<br/>DA IGREJA</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                    <h1 className="font-bold text-[13px] leading-tight uppercase w-full">{displayChurchName}</h1>
                    <p className="text-[8px] uppercase mt-0.5 leading-tight font-semibold">{displayChurchAddress} | CNPJ: {displayCnpj}</p>
                    <div className="border border-black bg-gray-200 font-black px-3 py-0.5 mt-1 text-[11px] uppercase tracking-wide">
                      FICHA DE INSCRIÇÃO E CADASTRO - CANDIDATO AO BATISMO NAS ÁGUAS
                    </div>
                  </div>
                  <div className="w-[32mm] border-l border-black flex flex-col items-center justify-center font-bold leading-none py-1 bg-white pl-2">
                    <span className="text-[14px] font-black tracking-wider text-black">OBPC</span>
                    <span className="text-red-600 font-bold text-[12px] mt-1">BATISMO Nº</span>
                    <span className="text-red-600 font-black text-[18px] tracking-wider mt-0.5">{String(currentSeq).padStart(5, '0')}</span>
                  </div>
                </div>

                {/* Bloco 1: Identificação do Candidato */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                    1. Identificação do(a) Candidato(a)
                  </div>
                  <div className="border border-black text-[9px]">
                    <div className="flex border-b border-black">
                      <div className="flex-[3] p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Nome Completo do(a) Candidato(a):</span>
                        <div className="font-semibold text-[10px] min-h-[14px]">________________________________________________________</div>
                      </div>
                      <div className="flex-1 p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Data de Nascimento:</span>
                        <div className="min-h-[14px]">____/____/________</div>
                      </div>
                      <div className="w-[24mm] p-1">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Sexo:</span>
                        <div>[ ] Masculino  [ ] Feminino</div>
                      </div>
                    </div>

                    <div className="flex border-b border-black">
                      <div className="flex-1 p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Naturalidade / UF:</span>
                        <div className="min-h-[14px]">_____________________</div>
                      </div>
                      <div className="flex-1 p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Estado Civil:</span>
                        <div className="min-h-[14px]">[ ] Solteiro(a)  [ ] Casado(a)  [ ] Viúvo(a)  [ ] Divorciado(a)</div>
                      </div>
                      <div className="flex-1 p-1">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Profissão / Ocupação:</span>
                        <div className="min-h-[14px]">_____________________</div>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex-1 p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">RG / Órgão Emissor:</span>
                        <div className="min-h-[14px]">_____________________</div>
                      </div>
                      <div className="flex-1 p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">CPF:</span>
                        <div className="min-h-[14px] font-mono">_____._____._____-__</div>
                      </div>
                      <div className="flex-1 p-1">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Celular / WhatsApp:</span>
                        <div className="min-h-[14px]">(____) ____________</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloco 2: Filiação, Família e Endereço */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                    2. Filiação, Família e Endereço Residencial
                  </div>
                  <div className="border border-black text-[9px]">
                    <div className="flex border-b border-black">
                      <div className="flex-1 p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Nome do Pai:</span>
                        <div className="min-h-[14px]">___________________________________________</div>
                      </div>
                      <div className="flex-1 p-1">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Nome da Mãe:</span>
                        <div className="min-h-[14px]">___________________________________________</div>
                      </div>
                    </div>

                    <div className="flex border-b border-black">
                      <div className="flex-[2] p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Nome do Cônjuge (se casado):</span>
                        <div className="min-h-[14px]">___________________________________________</div>
                      </div>
                      <div className="flex-1 p-1">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Cônjuge é evangélico(a)?</span>
                        <div>[ ] Sim   [ ] Não   [ ] Congrega conosco</div>
                      </div>
                    </div>

                    <div className="flex border-b border-black">
                      <div className="flex-[3] p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Endereço Residencial (Rua / Av., Nº, Apto):</span>
                        <div className="min-h-[14px]">________________________________________________________</div>
                      </div>
                      <div className="flex-1 p-1">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Bairro:</span>
                        <div className="min-h-[14px]">_____________________</div>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex-1 p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Cidade / UF:</span>
                        <div className="min-h-[14px]">_____________________</div>
                      </div>
                      <div className="w-[30mm] p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">CEP:</span>
                        <div className="min-h-[14px]">________-___</div>
                      </div>
                      <div className="flex-1 p-1">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">E-mail:</span>
                        <div className="min-h-[14px] truncate">_____________________________________</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloco 3: Trajetória Espiritual e Discipulado */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                    3. Trajetória Cristã, Discipulado e Ministérios
                  </div>
                  <div className="border border-black p-1.5 space-y-1.5 text-[9px]">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="font-bold text-[8px] uppercase">Data da Decisão por Cristo (Aceitou Jesus em):</span>
                        <div className="mt-0.5">____/____/________ (Igreja: _____________________)</div>
                      </div>
                      <div>
                        <span className="font-bold text-[8px] uppercase">Concluiu o Curso de Discipulado / Pré-Batismo?</span>
                        <div className="mt-0.5">[ ] Sim   [ ] Não   (Instrutor: ___________________)</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-gray-300 pt-1">
                      <div>
                        <span className="font-bold text-[8px] uppercase">Já foi batizado nas águas por imersão antes?</span>
                        <div className="mt-0.5">[ ] Não (1ª vez)   [ ] Sim (Denominação: _____________________)</div>
                      </div>
                      <div>
                        <span className="font-bold text-[8px] uppercase">Batismo no Espírito Santo (com dom de línguas)?</span>
                        <div className="mt-0.5">[ ] Sim   [ ] Não   [ ] Em busca do revestimento de poder</div>
                      </div>
                    </div>

                    <div className="border-t border-gray-300 pt-1">
                      <span className="font-bold text-[8px] uppercase block mb-0.5">Ministérios em que tem chamado e deseja cooperar na igreja:</span>
                      <div className="grid grid-cols-4 gap-1 text-[8.5px]">
                        <div>[ ] Louvor / Música</div>
                        <div>[ ] Ministério Infantil / EBD</div>
                        <div>[ ] Diaconia / Portaria</div>
                        <div>[ ] Recepção / Acolhimento</div>
                        <div>[ ] Jovens / Adolescentes</div>
                        <div>[ ] Evangelismo / Missões</div>
                        <div>[ ] Mídia / Sonoplastia</div>
                        <div>[ ] Outro: ______________</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloco 4: Termo de Confissão de Fé e Compromisso */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                    4. Termo de Confissão de Fé e Compromisso Bíblico do Candidato
                  </div>
                  <div className="border border-black p-2 text-justify text-[8.5px] leading-relaxed space-y-1.5">
                    <p>
                      <em>"Aquele que crer e for batizado será salvo" (Marcos 16:16).</em> Tendo recebido ao Senhor Jesus Cristo como meu único e suficiente Salvador, professo publicamente minha fé e solicito o santo Batismo nas Águas em nome do Pai, do Filho e do Espírito Santo.
                    </p>
                    <p>
                      Comprometo-me, com o auxílio de Deus, a manter um testemunho digno do Evangelho, frequentar assiduamente os cultos, contribuir com dízimos e ofertas para a manutenção da obra do Senhor e zelar pela paz, união e disciplina desta igreja, submetendo-me com amor à autoridade pastoral e aos preceitos da Palavra de Deus.
                    </p>
                    <div className="pt-3 flex justify-between items-end">
                      <div className="text-[9px]">
                        ________________________, ______ de ___________________ de 20____.
                      </div>
                      <div className="text-center w-[75mm]">
                        <div className="border-b border-black w-full min-h-[14px]"></div>
                        <span className="text-[8px] uppercase font-bold block mt-0.5">Assinatura do(a) Candidato(a)</span>
                        <span className="text-[7px] text-gray-600 block">(ou do Responsável Legal caso menor de 18 anos)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloco 5: Parecer Pastoral e Registro Eclesiástico */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                    5. Parecer Pastoral e Registro Eclesiástico
                  </div>
                  <div className="border border-black p-2 space-y-2 text-[8.5px]">
                    <div className="flex justify-between items-center border-b border-black pb-1.5">
                      <div>
                        <span className="font-bold uppercase mr-2">Parecer da Liderança:</span>
                        <span>[ ] Aprovado / Apto ao Batismo</span>
                        <span className="ml-4">[ ] Em Acompanhamento</span>
                        <span className="ml-4">[ ] Adiado</span>
                      </div>
                      <div>
                        <span className="font-bold uppercase">Data do Batismo: </span>
                        <span>____/____/________</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[8.5px]">
                      <div>
                        <span className="font-bold uppercase">Local / Tanque Batismal: </span>
                        <span>___________________________________________</span>
                      </div>
                      <div>
                        <span className="font-bold uppercase">Livro de Batismo nº: </span>
                        <span>_____ | Folha: _____</span>
                      </div>
                    </div>

                    <div className="pt-5 grid grid-cols-2 gap-8 text-center">
                      <div>
                        <div className="border-b border-black min-h-[16px] flex items-end justify-center pb-0.5">
                        </div>
                        <span className="font-bold text-[8.5px] uppercase block mt-0.5">Assinatura do Pastor / Oficiante</span>
                        <span className="text-[7.5px] text-gray-600 block">Pastor Presidente / Oficiante</span>
                      </div>
                      <div>
                        <div className="border-b border-black min-h-[16px] flex items-end justify-center pb-0.5">
                        </div>
                        <span className="font-bold text-[8.5px] uppercase block mt-0.5">Secretaria Eclesiástica / Discipulado</span>
                        <span className="text-[7.5px] text-gray-600 block">Visto da Secretaria Eclesiástica</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rodapé com legenda de via */}
                <div className="flex justify-between items-center text-[8px] text-gray-500 font-medium pt-1 border-t border-gray-300">
                  <span>Secretaria Geral • Ficha Oficial de Inscrição para Batismo nas Águas</span>
                  <span className={`px-2 py-0.5 border rounded font-bold text-[8.5px] uppercase ${isSecondVia ? 'border-neutral-500 bg-neutral-100 text-neutral-600' : 'border-black bg-slate-100 text-black'}`}>
                    {isSecondVia ? '2ª via' : '1ª via'}
                  </span>
                </div>
              </div>
            </div>
          );
        });
        })}
      </div>
    );
  };

  const renderFichaApresentacao = () => {
    const criancaNome = apresentacaoNomeCrianca || "___________________________________________";
    const paiNome = apresentacaoPai || selectedMember?.pai || selectedMember?.nome || "___________________________________________";
    const maeNome = apresentacaoMae || selectedMember?.mae || "___________________________________________";
    const padrinhos = apresentacaoPadrinhos || "___________________________________________";
    const pastorName = apresentacaoPastor || churchData?.pastorTitular || "Pr. Presidente";
    const dataCulto = apresentacaoDataCulto || new Date().toLocaleDateString("pt-BR");

    return (
      <div id="printable-standard">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-standard, #printable-standard * { visibility: visible; }
            #printable-standard { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: transparent; }
            @page { size: A4 portrait; margin: 0; }
            ::-webkit-scrollbar { display: none; }
            .print-page { page-break-after: always; height: 297mm; max-height: 297mm; box-sizing: border-box; overflow: hidden; }
          }
        `}</style>

        {Array.from({ length: printCopies }).flatMap((_, copyIdx) => {
          const currentSeq = sequenceNumber + 1 + copyIdx;
          // Conforme Anexo 5: 1 via única oficial
          const vias = [0];
          return vias.map((viaIdx) => {
            const isSecondVia = false;
            return (
            <div
              key={`${copyIdx}-${viaIdx}`}
              className={`w-[210mm] max-w-[210mm] min-h-[297mm] bg-white p-[8mm] mx-auto text-[10px] font-sans print:block print-page relative box-border mb-6 print:mb-0 ${isSecondVia ? 'text-neutral-600 opacity-75 print:opacity-75 via-talao-carbono' : 'text-black'}`}
            >
              {isSecondVia && (
                <div className="text-right text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1 print:block">
                  [ 2ª VIA - CARBONO / ARQUIVO ]
                </div>
              )}
              <div className={`border-2 flex flex-col relative z-10 p-3 space-y-3 ${isSecondVia ? 'border-neutral-500' : 'border-black'}`}>
                {/* Header */}
                <div className="flex border-b-2 border-black pb-2">
                  <div className="w-[24mm] h-[22mm] border-r border-black flex items-center justify-center p-1 pr-2">
                    {churchData.logoDataUrl ? (
                      <img src={churchData.logoDataUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="text-center font-bold text-[8px] leading-tight">LOGO<br/>DA IGREJA</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                    <h1 className="font-bold text-[13.5px] leading-tight uppercase w-full">{displayChurchName}</h1>
                    <p className="text-[8px] uppercase mt-0.5 leading-tight font-semibold">{displayChurchAddress} | CNPJ: {displayCnpj}</p>
                    <div className="border border-black bg-gray-200 font-black px-3 py-0.5 mt-1 text-[11px] uppercase tracking-wide">
                      TERMO DE APRESENTAÇÃO E DEDICAÇÃO DE CRIANÇA AO SENHOR
                    </div>
                  </div>
                  <div className="w-[32mm] border-l border-black flex flex-col items-center justify-center font-bold leading-none py-1 bg-white pl-2">
                    <span className="text-[14px] font-black tracking-wider text-black">OBPC</span>
                    <span className="text-red-600 font-bold text-[11px] mt-1">DEDICAÇÃO Nº</span>
                    <span className="text-red-600 font-black text-[18px] tracking-wider mt-0.5">{String(currentSeq).padStart(5, '0')}</span>
                  </div>
                </div>

                {/* Versículo de Bênção */}
                <div className="p-2 border border-black bg-gray-50/70 text-center italic text-[9px] leading-relaxed">
                  "Ensina a criança no caminho em que deve andar, e até quando envelhecer não se desviará dele." (Provérbios 22:6)<br/>
                  "E, cumprindo-se os dias da purificação, o levaram a Jerusalém, para o apresentarem ao Senhor." (Lucas 2:22)
                </div>

                {/* 1. Dados da Criança */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                    1. Dados da Criança
                  </div>
                  <div className="border border-black text-[9px]">
                    <div className="flex border-b border-black">
                      <div className="flex-[3] p-1.5 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Nome Completo da Criança:</span>
                        <div className="font-semibold text-[10.5px] min-h-[16px]">{criancaNome}</div>
                      </div>
                      <div className="flex-1 p-1.5 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Data de Nascimento:</span>
                        <div className="min-h-[16px]">{apresentacaoDataNasc || "____/____/________"}</div>
                      </div>
                      <div className="w-[20mm] p-1.5">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Sexo:</span>
                        <div>[ ] Masc  [ ] Fem</div>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex-[2] p-1.5 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Certidão de Nascimento (Termo / Livro / Folha):</span>
                        <div className="min-h-[16px]">{apresentacaoCertidao || "Termo: _________ | Livro: _____ | Folha: _____"}</div>
                      </div>
                      <div className="flex-1 p-1.5">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Cartório de Registro Civil:</span>
                        <div className="min-h-[16px]">_______________________________</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Pais e Família */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                    2. Pais e Padrinhos de Consagração
                  </div>
                  <div className="border border-black text-[9px]">
                    <div className="flex border-b border-black">
                      <div className="flex-1 p-1.5 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Nome Completo do Pai:</span>
                        <div className="min-h-[16px] font-medium">{paiNome}</div>
                      </div>
                      <div className="flex-1 p-1.5">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Nome Completo da Mãe:</span>
                        <div className="min-h-[16px] font-medium">{maeNome}</div>
                      </div>
                    </div>

                    <div className="flex border-b border-black">
                      <div className="flex-[2] p-1.5 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Endereço da Família:</span>
                        <div className="min-h-[16px]">{selectedMember?.endereco || "________________________________________________________"}</div>
                      </div>
                      <div className="flex-1 p-1.5">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Celular / WhatsApp dos Pais:</span>
                        <div className="min-h-[16px]">{selectedMember?.telefone || "(____) ____________"}</div>
                      </div>
                    </div>

                    <div className="p-1.5">
                      <span className="font-bold block text-[7.5px] uppercase text-gray-700">Padrinhos / Testemunhas de Consagração:</span>
                      <div className="min-h-[16px] font-medium">{padrinhos}</div>
                    </div>
                  </div>
                </div>

                {/* 3. Termo de Dedicação Pastoral */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                    3. Termo de Consagração e Dedicação
                  </div>
                  <div className="border border-black p-2.5 text-justify text-[9px] leading-relaxed space-y-2">
                    <p>
                      Certificamos perante a Igreja de Deus e esta congregação que a criança supramencionada foi solenemente <strong>apresentada aos pés do Senhor Jesus Cristo</strong> em culto público, recebendo oração intercessória com imposição de mãos da liderança pastoral para proteção divina, sabedoria e graça ao longo de sua vida.
                    </p>
                    <p>
                      Os pais assumiram voluntariamente perante o altar o compromisso sagrado de instruí-la nos caminhos do Evangelho, nas Sagradas Escrituras e na comunhão dos santos.
                    </p>
                    <div className="pt-2 text-[9px] font-semibold text-right">
                      {churchData?.cidade || "Valparaíso - SP"}, em culto oficial do dia {dataCulto}.
                    </div>
                  </div>
                </div>

                {/* Assinaturas */}
                <div className="pt-6 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="border-b border-black min-h-[16px]"></div>
                    <span className="font-bold text-[8.5px] uppercase block mt-1">Assinatura do Pai</span>
                  </div>
                  <div>
                    <div className="border-b border-black min-h-[16px]"></div>
                    <span className="font-bold text-[8.5px] uppercase block mt-1">Assinatura da Mãe</span>
                  </div>
                  <div>
                    <div className="border-b border-black min-h-[16px] flex items-end justify-center pb-0.5">
                      {churchData.pastorSignatureUrl && (
                        <img src={churchData.pastorSignatureUrl} alt="" className="h-6 object-contain" />
                      )}
                    </div>
                    <span className="font-bold text-[8.5px] uppercase block mt-1">{pastorName}</span>
                    <span className="text-[7.5px] text-gray-600 block">Pastor Presidente / Celebrante</span>
                  </div>
                </div>

                {/* Rodapé com legenda de via */}
                <div className="flex justify-between items-center text-[8px] text-gray-500 font-medium pt-1 border-t border-gray-300">
                  <span>Secretaria Geral • Ficha Oficial de Apresentação e Dedicação de Crianças</span>
                  <span className={`px-2 py-0.5 border rounded font-bold text-[8.5px] uppercase ${isSecondVia ? 'border-neutral-500 bg-neutral-100 text-neutral-600' : 'border-black bg-slate-100 text-black'}`}>
                    {isSecondVia ? '2ª via' : '1ª via'}
                  </span>
                </div>
              </div>
            </div>
          );
        });
        })}
      </div>
    );
  };

  const renderFichaReconciliacao = () => {
    const brotherName = selectedMember?.nome || selectedMember?.name || "___________________________________________";
    const brotherTel = selectedMember?.telefone || selectedMember?.phone || "(____) ____________";
    const brotherEnd = selectedMember?.endereco || "___________________________________________";
    const discipulador = reconciliacaoDiscipulador || "___________________________________________";
    const pastorName = churchData?.pastorTitular || "Pr. Presidente";
    const dataDecisao = reconciliacaoData || new Date().toLocaleDateString("pt-BR");

    return (
      <div id="printable-standard">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-standard, #printable-standard * { visibility: visible; }
            #printable-standard { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: transparent; }
            @page { size: A4 portrait; margin: 0; }
            ::-webkit-scrollbar { display: none; }
            .print-page { page-break-after: always; height: 297mm; max-height: 297mm; box-sizing: border-box; overflow: hidden; }
          }
        `}</style>

        {Array.from({ length: printCopies }).flatMap((_, copyIdx) => {
          const currentSeq = sequenceNumber + 1 + copyIdx;
          // Conforme Anexo 5: 1 via única oficial
          const vias = [0];
          return vias.map((viaIdx) => {
            const isSecondVia = false;
            return (
            <div
              key={`${copyIdx}-${viaIdx}`}
              className={`w-[210mm] max-w-[210mm] min-h-[297mm] bg-white p-[8mm] mx-auto text-[10px] font-sans print:block print-page relative box-border mb-6 print:mb-0 ${isSecondVia ? 'text-neutral-600 opacity-75 print:opacity-75 via-talao-carbono' : 'text-black'}`}
            >
              {isSecondVia && (
                <div className="text-right text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1 print:block">
                  [ 2ª VIA - CARBONO / ARQUIVO ]
                </div>
              )}
              <div className={`border-2 flex flex-col relative z-10 p-3 space-y-3 ${isSecondVia ? 'border-neutral-500' : 'border-black'}`}>
                {/* Header */}
                <div className="flex border-b-2 border-black pb-2">
                  <div className="w-[24mm] h-[22mm] border-r border-black flex items-center justify-center p-1 pr-2">
                    {churchData.logoDataUrl ? (
                      <img src={churchData.logoDataUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="text-center font-bold text-[8px] leading-tight">LOGO<br/>DA IGREJA</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                    <h1 className="font-bold text-[13.5px] leading-tight uppercase w-full">{displayChurchName}</h1>
                    <p className="text-[8px] uppercase mt-0.5 leading-tight font-semibold">{displayChurchAddress} | CNPJ: {displayCnpj}</p>
                    <div className="border border-black bg-gray-200 font-black px-3 py-0.5 mt-1 text-[11px] uppercase tracking-wide">
                      FICHA DE ACOLHIMENTO, DECISÃO E RECONCILIAÇÃO COM CRISTO
                    </div>
                  </div>
                  <div className="w-[32mm] border-l border-black flex flex-col items-center justify-center font-bold leading-none py-1 bg-white pl-2">
                    <span className="text-[14px] font-black tracking-wider text-black">OBPC</span>
                    <span className="text-red-600 font-bold text-[11px] mt-1">ACOLHIMENTO</span>
                    <span className="text-red-600 font-black text-[18px] tracking-wider mt-0.5">{String(currentSeq).padStart(5, '0')}</span>
                  </div>
                </div>

                {/* Versículo */}
                <div className="p-2 border border-black bg-gray-50/70 text-center italic text-[9px] leading-relaxed">
                  "Porque este meu filho estava morto e reviveu; tinha-se perdido e foi achado." (Lucas 15:24)<br/>
                  "Se alguém está em Cristo, nova criatura é; as coisas velhas já passaram; eis que tudo se fez novo." (2 Coríntios 5:17)
                </div>

                {/* 1. Tipo de Decisão */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                    1. Motivo do Registro / Tipo de Decisão
                  </div>
                  <div className="border border-black p-2 grid grid-cols-3 gap-2 text-[9.5px]">
                    <div className="flex items-center gap-1.5">
                      <span>{reconciliacaoTipo === "decisao" ? "☒" : "☐"}</span>
                      <span className="font-semibold">Primeira Decisão (Aceitou Jesus)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>{reconciliacaoTipo === "reconciliacao" ? "☒" : "☐"}</span>
                      <span className="font-semibold">Reconciliação com o Senhor</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>{reconciliacaoTipo === "transferencia" ? "☒" : "☐"}</span>
                      <span className="font-semibold">Vindo de outra Denominação</span>
                    </div>
                  </div>
                </div>

                {/* 2. Identificação do Irmão */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                    2. Identificação do(a) Irmão(ã)
                  </div>
                  <div className="border border-black text-[9px]">
                    <div className="flex border-b border-black">
                      <div className="flex-[3] p-1.5 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Nome Completo:</span>
                        <div className="font-semibold text-[10.5px] min-h-[16px]">{brotherName}</div>
                      </div>
                      <div className="flex-1 p-1.5">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Data de Nascimento:</span>
                        <div className="min-h-[16px]">{selectedMember?.dataNascimento || "____/____/________"}</div>
                      </div>
                    </div>

                    <div className="flex border-b border-black">
                      <div className="flex-[2] p-1.5 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Endereço Residencial:</span>
                        <div className="min-h-[16px]">{brotherEnd}</div>
                      </div>
                      <div className="flex-1 p-1.5">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Celular / WhatsApp:</span>
                        <div className="min-h-[16px]">{brotherTel}</div>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex-1 p-1.5 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Data da Decisão / Culto:</span>
                        <div className="min-h-[16px]">{dataDecisao}</div>
                      </div>
                      <div className="flex-1 p-1.5">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Já é batizado nas águas?</span>
                        <div>[ ] Sim   [ ] Não (Deseja Batizar)</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Acompanhamento & Discipulado */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                    3. Acompanhamento Pastoral e Discipulado
                  </div>
                  <div className="border border-black p-2 space-y-2 text-[9px]">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="font-bold block text-[8px] uppercase text-gray-700">Discipulador(a) Designado(a):</span>
                        <div className="min-h-[16px] font-medium">{discipulador}</div>
                      </div>
                      <div>
                        <span className="font-bold block text-[8px] uppercase text-gray-700">Necessidade de Visitação Pastoral:</span>
                        <div>[ ] Urgente   [ ] Esta semana   [ ] Já acompanhado</div>
                      </div>
                    </div>
                    <div className="border-t border-gray-300 pt-1.5">
                      <span className="font-bold block text-[8px] uppercase text-gray-700">Pedidos de Oração e Observações:</span>
                      <div className="min-h-[30px] text-gray-700 leading-normal">
                        {reconciliacaoObservacoes || "___________________________________________________________________________________________________________________________________"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assinaturas */}
                <div className="pt-8 grid grid-cols-2 gap-12 text-center">
                  <div>
                    <div className="border-b border-black min-h-[16px]"></div>
                    <span className="font-bold text-[8.5px] uppercase block mt-1">Assinatura do(a) Irmão(ã)</span>
                  </div>
                  <div>
                    <div className="border-b border-black min-h-[16px] flex items-end justify-center pb-0.5">
                      {churchData.pastorSignatureUrl && (
                        <img src={churchData.pastorSignatureUrl} alt="" className="h-6 object-contain" />
                      )}
                    </div>
                    <span className="font-bold text-[8.5px] uppercase block mt-1">{pastorName}</span>
                    <span className="text-[7.5px] text-gray-600 block">Pastor Presidente / Acolhedor</span>
                  </div>
                </div>

                {/* Rodapé com legenda de via */}
                <div className="flex justify-between items-center text-[8px] text-gray-500 font-medium pt-1 border-t border-gray-300">
                  <span>Secretaria Geral • Ficha Oficial de Reconciliação & Novos Convertidos</span>
                  <span className={`px-2 py-0.5 border rounded font-bold text-[8.5px] uppercase ${isSecondVia ? 'border-neutral-500 bg-neutral-100 text-neutral-600' : 'border-black bg-slate-100 text-black'}`}>
                    {isSecondVia ? '2ª via' : '1ª via'}
                  </span>
                </div>
              </div>
            </div>
          );
        });
        })}
      </div>
    );
  };

  const renderFichaCasamento = () => {
    const noivoNome = casamentoNoivo || "___________________________________________";
    const noivaNome = casamentoNoiva || "___________________________________________";
    const pastorName = casamentoPastor || churchData?.pastorTitular || "Pr. Presidente";
    const dataHora = casamentoDataHora || "____/____/________ às ____:____ hs";
    const local = casamentoLocal || "Templo Sede";
    const testemunhas = casamentoTestemunhas || "___________________________________________";

    return (
      <div id="printable-standard">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-standard, #printable-standard * { visibility: visible; }
            #printable-standard { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: transparent; }
            @page { size: A4 portrait; margin: 0; }
            ::-webkit-scrollbar { display: none; }
            .print-page { page-break-after: always; height: 297mm; max-height: 297mm; box-sizing: border-box; overflow: hidden; }
          }
        `}</style>

        {Array.from({ length: printCopies }).flatMap((_, copyIdx) => {
          const currentSeq = sequenceNumber + 1 + copyIdx;
          // Conforme Anexo 5: 1 via única oficial
          const vias = [0];
          return vias.map((viaIdx) => {
            const isSecondVia = false;
            return (
            <div
              key={`${copyIdx}-${viaIdx}`}
              className={`w-[210mm] max-w-[210mm] min-h-[297mm] bg-white p-[8mm] mx-auto text-[10px] font-sans print:block print-page relative box-border mb-6 print:mb-0 ${isSecondVia ? 'text-neutral-600 opacity-75 print:opacity-75 via-talao-carbono' : 'text-black'}`}
            >
              {isSecondVia && (
                <div className="text-right text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1 print:block">
                  [ 2ª VIA - CARBONO / ARQUIVO ]
                </div>
              )}
              <div className={`border-2 flex flex-col relative z-10 p-3 space-y-2.5 ${isSecondVia ? 'border-neutral-500' : 'border-black'}`}>
                {/* Header */}
                <div className="flex border-b-2 border-black pb-2">
                  <div className="w-[24mm] h-[22mm] border-r border-black flex items-center justify-center p-1 pr-2">
                    {churchData.logoDataUrl ? (
                      <img src={churchData.logoDataUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="text-center font-bold text-[8px] leading-tight">LOGO<br/>DA IGREJA</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                    <h1 className="font-bold text-[13.5px] leading-tight uppercase w-full">{displayChurchName}</h1>
                    <p className="text-[8px] uppercase mt-0.5 leading-tight font-semibold">{displayChurchAddress} | CNPJ: {displayCnpj}</p>
                    <div className="border border-black bg-gray-200 font-black px-3 py-0.5 mt-1 text-[11px] uppercase tracking-wide">
                      REQUERIMENTO DE CERIMÔNIA E REGISTRO DE CASAMENTO RELIGIOSO
                    </div>
                  </div>
                  <div className="w-[32mm] border-l border-black flex flex-col items-center justify-center font-bold leading-none py-1 bg-white pl-2">
                    <span className="text-[14px] font-black tracking-wider text-black">OBPC</span>
                    <span className="text-red-600 font-bold text-[11px] mt-1">MATRIMÔNIO</span>
                    <span className="text-red-600 font-black text-[18px] tracking-wider mt-0.5">{String(currentSeq).padStart(5, '0')}</span>
                  </div>
                </div>

                {/* Versículo */}
                <div className="p-2 border border-black bg-gray-50/70 text-center italic text-[9px] leading-relaxed">
                  "Assim não são mais dois, mas uma só carne. Portanto, o que Deus ajuntou não o separe o homem." (Mateus 19:6)<br/>
                  "As muitas águas não podem apagar este amor, nem os rios afogá-lo." (Cantares 8:7)
                </div>

                {/* 1. Dados do Noivo */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                    1. Dados do Noivo
                  </div>
                  <div className="border border-black text-[9px]">
                    <div className="flex border-b border-black">
                      <div className="flex-[3] p-1.5 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Nome Completo do Noivo:</span>
                        <div className="font-semibold text-[10px] min-h-[16px]">{noivoNome}</div>
                      </div>
                      <div className="flex-1 p-1.5 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Data de Nasc.:</span>
                        <div className="min-h-[16px]">____/____/________</div>
                      </div>
                      <div className="flex-1 p-1.5">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Estado Civil:</span>
                        <div>[ ] Solteiro  [ ] Viúvo</div>
                      </div>
                    </div>
                    <div className="flex border-b border-black">
                      <div className="flex-1 p-1.5 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">RG / CPF:</span>
                        <div className="min-h-[16px]">___________________________</div>
                      </div>
                      <div className="flex-1 p-1.5">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Membro Batizado?</span>
                        <div>[ ] Sim   [ ] Não   (Igreja: _____________________)</div>
                      </div>
                    </div>
                    <div className="p-1.5">
                      <span className="font-bold block text-[7.5px] uppercase text-gray-700">Filiação (Pai e Mãe do Noivo):</span>
                      <div className="min-h-[16px]">_____________________________________________________________________________</div>
                    </div>
                  </div>
                </div>

                {/* 2. Dados da Noiva */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                    2. Dados da Noiva
                  </div>
                  <div className="border border-black text-[9px]">
                    <div className="flex border-b border-black">
                      <div className="flex-[3] p-1.5 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Nome Completo da Noiva:</span>
                        <div className="font-semibold text-[10px] min-h-[16px]">{noivaNome}</div>
                      </div>
                      <div className="flex-1 p-1.5 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Data de Nasc.:</span>
                        <div className="min-h-[16px]">____/____/________</div>
                      </div>
                      <div className="flex-1 p-1.5">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Estado Civil:</span>
                        <div>[ ] Solteira  [ ] Viúva</div>
                      </div>
                    </div>
                    <div className="flex border-b border-black">
                      <div className="flex-1 p-1.5 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">RG / CPF:</span>
                        <div className="min-h-[16px]">___________________________</div>
                      </div>
                      <div className="flex-1 p-1.5">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Membro Batizada?</span>
                        <div>[ ] Sim   [ ] Não   (Igreja: _____________________)</div>
                      </div>
                    </div>
                    <div className="p-1.5">
                      <span className="font-bold block text-[7.5px] uppercase text-gray-700">Filiação (Pai e Mãe da Noiva):</span>
                      <div className="min-h-[16px]">_____________________________________________________________________________</div>
                    </div>
                  </div>
                </div>

                {/* 3. Dados da Cerimônia */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                    3. Detalhes da Cerimônia Religiosa
                  </div>
                  <div className="border border-black p-2 space-y-1.5 text-[9px]">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Data e Horário Pretendidos:</span>
                        <div className="font-semibold min-h-[16px]">{dataHora}</div>
                      </div>
                      <div>
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Local da Celebração:</span>
                        <div className="min-h-[16px]">{local}</div>
                      </div>
                    </div>
                    <div className="border-t border-gray-300 pt-1">
                      <span className="font-bold block text-[7.5px] uppercase text-gray-700">Testemunhas e Padrinhos Oficiais:</span>
                      <div className="min-h-[16px]">{testemunhas}</div>
                    </div>
                  </div>
                </div>

                {/* Assinaturas */}
                <div className="pt-6 grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="border-b border-black min-h-[16px]"></div>
                    <span className="font-bold text-[8.5px] uppercase block mt-1">Assinatura do Noivo</span>
                  </div>
                  <div>
                    <div className="border-b border-black min-h-[16px]"></div>
                    <span className="font-bold text-[8.5px] uppercase block mt-1">Assinatura da Noiva</span>
                  </div>
                  <div>
                    <div className="border-b border-black min-h-[16px] flex items-end justify-center pb-0.5">
                      {churchData.pastorSignatureUrl && (
                        <img src={churchData.pastorSignatureUrl} alt="" className="h-6 object-contain" />
                      )}
                    </div>
                    <span className="font-bold text-[8.5px] uppercase block mt-1">{pastorName}</span>
                    <span className="text-[7.5px] text-gray-600 block">Pastor Presidente / Celebrante</span>
                  </div>
                </div>

                {/* Rodapé com legenda de via */}
                <div className="flex justify-between items-center text-[8px] text-gray-500 font-medium pt-1 border-t border-gray-300">
                  <span>Secretaria Geral • Requerimento Oficial de Casamento Religioso com Efeito Civil</span>
                  <span className={`px-2 py-0.5 border rounded font-bold text-[8.5px] uppercase ${isSecondVia ? 'border-neutral-500 bg-neutral-100 text-neutral-600' : 'border-black bg-slate-100 text-black'}`}>
                    {isSecondVia ? '2ª via' : '1ª via'}
                  </span>
                </div>
              </div>
            </div>
          );
        });
        })}
      </div>
    );
  };

  const renderFichaVisitante = () => {
    const isEmBranco = !selectedMember;
    const vNome = isEmBranco ? "" : (selectedMember?.nome || selectedMember?.name || "");
    const vTel = isEmBranco ? "" : (selectedMember?.telefone || selectedMember?.phone || "");
    const vEnd = isEmBranco ? "" : (selectedMember?.endereco || selectedMember?.address || "");
    const vBairro = isEmBranco ? "" : (selectedMember?.bairro || "");
    const vCidade = isEmBranco ? "" : (selectedMember?.cidade || leadership.church.cidade || "");
    const vNasc = isEmBranco ? "" : (selectedMember?.dataNascimento || "");

    return (
      <div id="printable-standard">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-standard, #printable-standard * { visibility: visible; }
            #printable-standard { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: transparent; }
            @page { size: A4 portrait; margin: 0; }
            ::-webkit-scrollbar { display: none; }
            .print-page { page-break-after: always; height: 297mm; max-height: 297mm; box-sizing: border-box; overflow: hidden; }
          }
        `}</style>

        {Array.from({ length: printCopies }).flatMap((_, copyIdx) => {
          const currentSeq = sequenceNumber + 1 + copyIdx;
          // Conforme Anexo 5: 1 via única oficial para ficha de visitante
          const vias = [0];
          return vias.map((viaIdx) => {
            return (
              <div
                key={`${copyIdx}-${viaIdx}`}
                className="w-[210mm] max-w-[210mm] min-h-[297mm] bg-white p-[8mm] mx-auto text-[9.5px] font-sans print:block print-page relative box-border mb-6 print:mb-0 text-black flex flex-col justify-between"
              >
                <div className="border-2 border-black flex flex-col relative z-10 p-3 space-y-2.5">
                  {/* Header Oficial */}
                  <div className="flex border-b-2 border-black pb-2">
                    <div className="w-[24mm] h-[22mm] border-r border-black flex items-center justify-center p-1 pr-2 shrink-0">
                      {churchData.logoDataUrl || leadership.church.logoUrl ? (
                        <img src={churchData.logoDataUrl || leadership.church.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                      ) : (
                        <div className="text-center font-bold text-[8px] leading-tight">LOGO<br/>DA IGREJA</div>
                      )}
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center text-center px-2">
                      <h1 className="font-bold text-[13px] leading-tight uppercase w-full">{displayChurchName}</h1>
                      <p className="text-[8px] uppercase mt-0.5 leading-tight font-semibold">
                        {displayChurchAddress} | CNPJ: {displayCnpj}
                      </p>
                      <div className="border border-black bg-gray-200 font-black px-3 py-0.5 mt-1 text-[11px] uppercase tracking-wide">
                        FICHA DE VISITANTE & ACOLHIMENTO CRISTÃO
                      </div>
                    </div>
                    <div className="w-[32mm] border-l border-black flex flex-col items-center justify-center font-bold leading-none py-1 bg-white pl-2 shrink-0">
                      <span className="text-[13px] font-black tracking-wider text-black">OBPC</span>
                      <span className="text-red-600 font-bold text-[11px] mt-1">VISITANTE Nº</span>
                      <span className="text-red-600 font-black text-[17px] tracking-wider mt-0.5">{String(currentSeq).padStart(5, '0')}</span>
                    </div>
                  </div>

                  <div className="text-center text-[8.5px] italic text-gray-700 border-b border-gray-300 pb-1">
                    "Alegrei-me quando me disseram: Vamos à Casa do Senhor!" (Salmo 122:1) • É uma alegria imensa receber você e sua família em nossa igreja!
                  </div>

                  {/* Bloco 1: Dados Pessoais do Visitante */}
                  <div>
                    <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                      1. Identificação do(a) Visitante
                    </div>
                    <div className="border border-black text-[9px]">
                      <div className="flex border-b border-black">
                        <div className="flex-[3] p-1 border-r border-black">
                          <span className="font-bold block text-[7.5px] uppercase text-gray-700">Nome Completo do(a) Visitante:</span>
                          <div className="font-semibold text-[10px] min-h-[14px]">{vNome || "________________________________________________________"}</div>
                        </div>
                        <div className="flex-1 p-1 border-r border-black">
                          <span className="font-bold block text-[7.5px] uppercase text-gray-700">Data da Visita:</span>
                          <div className="min-h-[14px]">____/____/________</div>
                        </div>
                        <div className="w-[25mm] p-1">
                          <span className="font-bold block text-[7.5px] uppercase text-gray-700">Sexo:</span>
                          <div>[ ] Masc  [ ] Fem</div>
                        </div>
                      </div>

                      <div className="flex border-b border-black">
                        <div className="flex-1 p-1 border-r border-black">
                          <span className="font-bold block text-[7.5px] uppercase text-gray-700">Data de Nascimento:</span>
                          <div className="min-h-[14px]">{vNasc || "____/____/________"}</div>
                        </div>
                        <div className="flex-1 p-1 border-r border-black">
                          <span className="font-bold block text-[7.5px] uppercase text-gray-700">Estado Civil:</span>
                          <div>[ ] Solteiro(a)  [ ] Casado(a)  [ ] Outro</div>
                        </div>
                        <div className="flex-1 p-1">
                          <span className="font-bold block text-[7.5px] uppercase text-gray-700">Profissão / Ocupação:</span>
                          <div className="min-h-[14px]">_____________________</div>
                        </div>
                      </div>

                      <div className="flex">
                        <div className="flex-1 p-1 border-r border-black">
                          <span className="font-bold block text-[7.5px] uppercase text-gray-700">Celular / WhatsApp (com DDD):</span>
                          <div className="min-h-[14px] font-semibold">{vTel || "(____) ____________"}</div>
                        </div>
                        <div className="flex-1 p-1">
                          <span className="font-bold block text-[7.5px] uppercase text-gray-700">E-mail para Contato:</span>
                          <div className="min-h-[14px]">__________________________________________</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 2: Endereço Residencial */}
                  <div>
                    <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                      2. Endereço e Localização Residencial
                    </div>
                    <div className="border border-black text-[9px]">
                      <div className="flex border-b border-black">
                        <div className="flex-[3] p-1 border-r border-black">
                          <span className="font-bold block text-[7.5px] uppercase text-gray-700">Endereço (Rua / Av., Nº, Apto):</span>
                          <div className="min-h-[14px]">{vEnd || "________________________________________________________"}</div>
                        </div>
                        <div className="flex-1 p-1">
                          <span className="font-bold block text-[7.5px] uppercase text-gray-700">Bairro:</span>
                          <div className="min-h-[14px]">{vBairro || "_____________________"}</div>
                        </div>
                      </div>
                      <div className="flex">
                        <div className="flex-1 p-1 border-r border-black">
                          <span className="font-bold block text-[7.5px] uppercase text-gray-700">Cidade / UF:</span>
                          <div className="min-h-[14px]">{vCidade || "_____________________"}</div>
                        </div>
                        <div className="w-[30mm] p-1 border-r border-black">
                          <span className="font-bold block text-[7.5px] uppercase text-gray-700">CEP:</span>
                          <div className="min-h-[14px]">________-___</div>
                        </div>
                        <div className="flex-1 p-1">
                          <span className="font-bold block text-[7.5px] uppercase text-gray-700">Ponto de Referência:</span>
                          <div className="min-h-[14px]">___________________________</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 3: Perfil Religioso & Como Conheceu a Igreja */}
                  <div>
                    <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                      3. Vida Cristã & Como Conheceu Nossa Igreja
                    </div>
                    <div className="border border-black p-1.5 space-y-1.5 text-[9px]">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-bold text-[8px] uppercase">Você já é evangélico(a)?</span>
                          <div className="mt-0.5">[ ] Sim   [ ] Não</div>
                        </div>
                        <div>
                          <span className="font-bold text-[8px] uppercase">Qual igreja / denominação frequenta?</span>
                          <div className="mt-0.5">__________________________________________</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 border-t border-gray-300 pt-1">
                        <div>
                          <span className="font-bold text-[8px] uppercase">É a sua primeira vez em nossa congregação?</span>
                          <div className="mt-0.5">[ ] Sim, 1ª vez   [ ] Não, já estive aqui antes</div>
                        </div>
                        <div>
                          <span className="font-bold text-[8px] uppercase">Veio a convite de quem?</span>
                          <div className="mt-0.5">__________________________________________</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 4: Decisão de Fé, Intercessão e Visitação */}
                  <div>
                    <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                      4. Decisão de Fé, Pedidos de Oração e Cuidado Pastoral
                    </div>
                    <div className="border border-black p-2 space-y-2 text-[9px]">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                        <span className="font-bold uppercase text-[8px]">Decisão Espiritual Hoje:</span>
                        <span>[ ] Aceitou Jesus hoje</span>
                        <span>[ ] Reconciliação com Cristo</span>
                        <span>[ ] Já serve a Jesus</span>
                        <span>[ ] Deseja oração</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-300 pt-1">
                        <span className="font-bold uppercase text-[8px]">Deseja receber uma visita pastoral em sua casa?</span>
                        <span>[ ] Sim, com alegria</span>
                        <span>[ ] Não no momento</span>
                        <span className="ml-3">Melhor dia/horário: _____________________</span>
                      </div>

                      <div className="border-t border-gray-300 pt-1">
                        <span className="font-bold uppercase text-[8px] block mb-0.5">Motivo Especial de Oração / Agradecimento a Deus:</span>
                        <div className="space-y-1.5 pt-0.5">
                          <div className="border-b border-dashed border-gray-400 h-3"></div>
                          <div className="border-b border-dashed border-gray-400 h-3"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bloco 5: Acolhimento & Secretaria de Integração */}
                  <div>
                    <div className="bg-gray-100 font-bold text-[9px] uppercase px-1.5 py-0.5 border border-black mb-1">
                      5. Acolhimento, Recepção & Integração Pastoral
                    </div>
                    <div className="border border-black p-2 text-[8.5px] space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="font-bold uppercase block text-[7.5px] text-gray-700">Recepcionista / Acolhedor(a) que atendeu:</span>
                          <div className="border-b border-black min-h-[14px]"></div>
                        </div>
                        <div>
                          <span className="font-bold uppercase block text-[7.5px] text-gray-700">Pastor Responsável / Ministro:</span>
                          <div className="border-b border-black min-h-[14px]">
                            {leadership.pastor.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center border-t border-gray-300 pt-1 text-[8px]">
                        <span>Primeiro contato via WhatsApp enviado em: ____/____/________ por: _____________________</span>
                        <span>Status: [ ] Contatado  [ ] Visita Realizada</span>
                      </div>
                    </div>
                  </div>

                  {/* Rodapé */}
                  <div className="flex justify-between items-center text-[8px] text-gray-500 font-medium pt-1 border-t border-gray-300">
                    <span>Secretaria Geral • Departamento de Acolhimento e Integração de Vidas</span>
                    <span className="px-2 py-0.5 border rounded font-bold text-[8.5px] uppercase border-black bg-slate-100 text-black">
                      Via Única Oficial
                    </span>
                  </div>
                </div>
              </div>
            );
          });
        })}
      </div>
    );
  };

  const renderFichaCestaBasicaAnalitica = () => {
    const isEmBranco = cestaModo === 'em_branco';
    const bNome = isEmBranco ? "" : (selectedMember?.nome || selectedMember?.name || "");
    const bCpf = isEmBranco ? "" : (selectedMember?.cpf || "");
    const bRg = isEmBranco ? "" : (selectedMember?.rg || "");
    const bDataNasc = isEmBranco ? "" : (selectedMember?.dataNascimento ? new Date(selectedMember.dataNascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : cestaDataNasc);
    const bTel = isEmBranco ? "" : (selectedMember?.telefone || selectedMember?.phone || "");
    const bEnd = isEmBranco ? "" : (selectedMember?.endereco || selectedMember?.address || "");
    const bBairro = isEmBranco ? "" : (selectedMember?.bairro || "");
    const bCidade = isEmBranco ? "" : (selectedMember?.cidade || leadership.church.cidade);
    const bPontoRef = isEmBranco ? "" : (selectedMember?.pontoReferencia || cestaPontoReferencia);
    const bData = isEmBranco ? "____/____/202____" : (cestaData || new Date().toLocaleDateString('pt-BR'));
    const bQtd = isEmBranco ? "____" : cestaQtd;
    const bMotivo = isEmBranco ? "" : (cestaMotivo || selectedMember?.situacaoVulnerabilidade || "");
    const bRenda = isEmBranco ? "" : (cestaRendaFamiliar || (selectedMember?.rendaFamiliar ? `R$ ${selectedMember.rendaFamiliar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ""));
    const bMoradia = isEmBranco ? "" : (cestaTipoMoradia || (selectedMember?.tipoMoradia ? (selectedMember.tipoMoradia === 'propria' ? 'Própria' : selectedMember.tipoMoradia === 'alugada' ? 'Alugada' : 'Cedida') : 'Alugada'));
    const bMembros = isEmBranco ? "" : (cestaQtdMembros || String(selectedMember?.quantidadeMembrosFamilia || ''));
    const bCriancas = isEmBranco ? "" : (cestaQtdCriancas || String(selectedMember?.quantidadeCriancas || ''));
    const bBeneficios = isEmBranco ? "" : (cestaBeneficios || (selectedMember?.beneficiosSociais?.join(', ') || ''));

    return (
      <div id="printable-standard">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-standard, #printable-standard * { visibility: visible; }
            #printable-standard { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: transparent; }
            @page { size: A4 portrait; margin: 0; }
            ::-webkit-scrollbar { display: none; }
            .print-page { page-break-after: always; min-height: 297mm; box-sizing: border-box; }
          }
        `}</style>

        {Array.from({ length: printCopies }).flatMap((_, copyIdx) => {
          const currentSeq = sequenceNumber + 1 + copyIdx;
          // Conforme Anexo 5: 1 via única oficial
          const vias = [0];
          return vias.map((viaIdx) => {
            const isSecondVia = false;
            return (
            <div
              key={`${copyIdx}-${viaIdx}`}
              className={`w-[210mm] max-w-[210mm] min-h-[297mm] bg-white p-[7mm] mx-auto text-[9.5px] font-sans print:block print-page relative box-border mb-6 print:mb-0 ${isSecondVia ? 'text-neutral-600 opacity-75 print:opacity-75 via-talao-carbono' : 'text-black'}`}
            >
              {isSecondVia && (
                <div className="text-right text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1 print:block">
                  [ 2ª VIA - CARBONO / ARQUIVO ]
                </div>
              )}
              <div className={`border-2 flex flex-col relative z-10 p-3.5 space-y-2.5 ${isSecondVia ? 'border-neutral-500' : 'border-black'}`}>
                {/* Cabeçalho Oficial */}
                <div className="flex border-b-2 border-black pb-2.5">
                  <div className="w-[24mm] h-[22mm] border-r-2 border-black flex items-center justify-center p-1 pr-2.5 shrink-0">
                    {churchData.logoDataUrl || leadership.church.logoUrl ? (
                      <img src={churchData.logoDataUrl || leadership.church.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="text-center font-bold text-[8.5px] leading-tight">OBPC<br/>SOCIAL</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-2.5">
                    <h1 className="font-bold text-[13px] leading-tight uppercase w-full">{displayChurchName}</h1>
                    <p className="text-[8px] uppercase mt-0.5 leading-tight font-semibold">{displayChurchAddress} | CNPJ: {displayCnpj}</p>
                    <div className="border-2 border-black bg-gray-100 font-black px-3 py-0.5 mt-1 text-[10.5px] uppercase tracking-wide">
                      FICHA ANALÍTICA DE ATENDIMENTO SOCIAL E CESTA BÁSICA
                    </div>
                  </div>
                  <div className="w-[32mm] border-l-2 border-black flex flex-col items-center justify-center font-bold leading-none py-1 bg-white pl-2 shrink-0">
                    <span className="text-[12px] font-black tracking-wider text-black">AÇÃO SOCIAL</span>
                    <span className="text-rose-600 font-bold text-[10px] mt-1">FICHA ANALÍTICA Nº</span>
                    <span className="text-rose-600 font-black text-[17px] tracking-wider mt-0.5">{String(currentSeq).padStart(5, '0')}</span>
                  </div>
                </div>

                {/* Sub-header */}
                <div className="flex items-center justify-between text-[8px] text-gray-600 border-b border-black pb-1">
                  <span>DEPARTAMENTO DE ASSISTÊNCIA E PROMOÇÃO SOCIAL — DIAGNÓSTICO SOCIOECONÔMICO</span>
                  <span>{isEmBranco ? "MODELO COMPLETO PARA CADASTRAMENTO E TRIAGEM" : "PRONTUÁRIO REGISTRADO NO SISTEMA"}</span>
                </div>

                {/* 1. Dados Pessoais do(a) Responsável Familiar */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-2 py-0.5 border border-black mb-1">
                    1. Dados do(a) Responsável Familiar / Beneficiário(a)
                  </div>
                  <div className="border border-black text-[9px]">
                    <div className="flex border-b border-black">
                      <div className="flex-[3] p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Nome Completo:</span>
                        <div className="font-semibold text-[10px] min-h-[14px] flex items-center">
                          {bNome || (isEmBranco ? "................................................................................................................................" : "Não informado")}
                        </div>
                      </div>
                      <div className="flex-1 p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">CPF:</span>
                        <div className="font-medium text-[9px] min-h-[14px] flex items-center">
                          {bCpf || (isEmBranco ? "___.___.___-__" : "Não informado")}
                        </div>
                      </div>
                      <div className="flex-1 p-1">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">RG:</span>
                        <div className="font-medium text-[9px] min-h-[14px] flex items-center">
                          {bRg || (isEmBranco ? "......................" : "Não informado")}
                        </div>
                      </div>
                    </div>

                    <div className="flex border-b border-black">
                      <div className="flex-1 p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Data de Nascimento:</span>
                        <div className="font-medium text-[9px] min-h-[14px] flex items-center">
                          {bDataNasc || (isEmBranco ? "____/____/________" : "Não informada")}
                        </div>
                      </div>
                      <div className="flex-1 p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Telefone / WhatsApp:</span>
                        <div className="font-medium text-[9px] min-h-[14px] flex items-center">
                          {bTel || (isEmBranco ? "(_____) _____________" : "Não informado")}
                        </div>
                      </div>
                      <div className="flex-1 p-1">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Congregação Atendente:</span>
                        <div className="font-medium text-[9px] min-h-[14px] flex items-center">
                          {activeBranchObj?.name || "Templo Sede"}
                        </div>
                      </div>
                    </div>

                    <div className="flex border-b border-black">
                      <div className="flex-[3] p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Endereço Residencial:</span>
                        <div className="font-medium text-[9px] min-h-[14px] flex items-center">
                          {bEnd || (isEmBranco ? "................................................................................................................................" : "Não informado")}
                        </div>
                      </div>
                      <div className="flex-[1.5] p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Bairro:</span>
                        <div className="font-medium text-[9px] min-h-[14px] flex items-center">
                          {bBairro || (isEmBranco ? "............................" : "Não informado")}
                        </div>
                      </div>
                      <div className="flex-1 p-1">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Cidade / UF:</span>
                        <div className="font-medium text-[9px] min-h-[14px] flex items-center">
                          {bCidade || (isEmBranco ? "............................" : "Não informado")}
                        </div>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex-[3] p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Ponto de Referência:</span>
                        <div className="font-medium text-[9px] min-h-[14px] flex items-center">
                          {bPontoRef || (isEmBranco ? "................................................................................................................................" : "Próximo à congregação")}
                        </div>
                      </div>
                      <div className="flex-1 p-1">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">É Membro / Frequentador?</span>
                        <div className="font-medium text-[9px] min-h-[14px] flex items-center">
                          {isEmBranco ? "[ ] Sim  [ ] Não" : (cestaIsMembro || "Sim")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Composição Familiar & Situação Socioeconômica */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-2 py-0.5 border border-black mb-1">
                    2. Composição Familiar & Avaliação Socioeconômica
                  </div>
                  <div className="border border-black text-[9px]">
                    <div className="grid grid-cols-4 border-b border-black">
                      <div className="p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Qtd. Membros na Casa:</span>
                        <div className="font-semibold text-[9px] min-h-[14px] flex items-center">
                          {bMembros ? `${bMembros} pessoa(s)` : (isEmBranco ? "____ pessoa(s)" : "1 pessoa")}
                        </div>
                      </div>
                      <div className="p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Qtd. Crianças / Menores:</span>
                        <div className="font-semibold text-[9px] min-h-[14px] flex items-center">
                          {bCriancas ? `${bCriancas} criança(s)` : (isEmBranco ? "____ criança(s)" : "0")}
                        </div>
                      </div>
                      <div className="p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Renda Familiar Mensal:</span>
                        <div className="font-semibold text-[9px] min-h-[14px] flex items-center">
                          {bRenda || (isEmBranco ? "R$ ...................." : "Sem renda fixa")}
                        </div>
                      </div>
                      <div className="p-1">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Tipo de Moradia:</span>
                        <div className="font-semibold text-[9px] min-h-[14px] flex items-center">
                          {isEmBranco ? "[ ] Própria  [ ] Alugada  [ ] Cedida" : (bMoradia || "Alugada")}
                        </div>
                      </div>
                    </div>

                    <div className="flex border-b border-black">
                      <div className="flex-1 p-1 border-r border-black">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Benefícios Sociais Recebidos:</span>
                        <div className="font-medium text-[9px] min-h-[14px] flex items-center">
                          {bBeneficios || (isEmBranco ? "[ ] Bolsa Família  [ ] BPC/LOAS  [ ] Auxílio Gás  [ ] Nenhum" : "Nenhum informado")}
                        </div>
                      </div>
                      <div className="flex-1 p-1">
                        <span className="font-bold block text-[7.5px] uppercase text-gray-700">Grau de Vulnerabilidade:</span>
                        <div className="font-medium text-[9px] min-h-[14px] flex items-center">
                          {isEmBranco ? "[ ] Alta  [ ] Média  [ ] Baixa (Emergencial)" : "Assistência Nutricional Prioritária"}
                        </div>
                      </div>
                    </div>

                    <div className="p-1">
                      <span className="font-bold block text-[7.5px] uppercase text-gray-700">Diagnóstico Social / Necessidade Principal:</span>
                      <div className="min-h-[14px] text-[8.5px] text-gray-800">
                        {bMotivo || (isEmBranco ? "........................................................................................................................................................................................................" : "Suporte alimentar e pastoral à família.")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Concessão Atual do Benefício */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-2 py-0.5 border border-black mb-1">
                    3. Concessão Atual & Parecer da Assistência Social
                  </div>
                  <div className="border border-black p-2 text-[8.5px] space-y-1.5">
                    <div className="flex justify-between items-center border-b border-black pb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-[8px]">Tipo de Auxílio:</span>
                        <span className="mr-1">{cestaTipoAuxilio === 'cesta_basica_padrao' ? '[X]' : '[ ]'} Cesta Padrão</span>
                        <span className="mr-1">{cestaTipoAuxilio === 'cesta_emergencial' ? '[X]' : '[ ]'} Cesta Emergencial</span>
                        <span className="mr-1">{cestaTipoAuxilio === 'higiene_limpeza' ? '[X]' : '[ ]'} Kit Higiene</span>
                        <span>[ ] Outro</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="font-bold uppercase text-[8px]">Qtd: </span>
                          <span className="font-bold">{bQtd} un.</span>
                        </div>
                        <div>
                          <span className="font-bold uppercase text-[8px]">Data da Entrega: </span>
                          <span className="font-bold">{bData}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[8px]">
                      <div>
                        <span className="font-bold uppercase mr-1">Responsável pela Entrega / Diaconia: </span>
                        <span className="font-medium">{cestaResponsavelEntrega || leadership.secretaria.name}</span>
                      </div>
                      <div>
                        <span className="font-bold uppercase mr-1">Carência de Retorno: </span>
                        <span className="font-semibold text-gray-800">30 dias padrão</span>
                      </div>
                    </div>

                    <div>
                      <span className="font-bold block text-[7.5px] uppercase text-gray-700">Parecer Social e Observações Pastorais:</span>
                      <div className="min-h-[14px] text-[8.5px] text-gray-800">
                        {cestaParecerSocial || (isEmBranco ? "........................................................................................................................................................................................................" : "Atendimento deferido em conformidade com as diretrizes sociais da igreja.")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Controle de Concessões Mensais e Histórico de Retiradas */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-2 py-0.5 border border-black mb-1">
                    4. Controle de Concessões & Histórico de Retiradas (Acompanhamento)
                  </div>
                  <table className="w-full border-collapse border border-black text-[8px]">
                    <thead>
                      <tr className="bg-gray-100 border-b border-black font-bold text-center">
                        <th className="border-r border-black p-0.5 w-[8mm]">Nº</th>
                        <th className="border-r border-black p-0.5 w-[22mm]">Data Entrega</th>
                        <th className="border-r border-black p-0.5 w-[38mm]">Tipo de Benefício</th>
                        <th className="border-r border-black p-0.5 w-[14mm]">Qtd</th>
                        <th className="border-r border-black p-0.5 w-[35mm]">Entregador(a) / Diaconia</th>
                        <th className="border-r border-black p-0.5">Assinatura do Recebedor</th>
                        <th className="p-0.5 w-[18mm]">Visto Social</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[1, 2, 3, 4, 5].map((rowIdx) => {
                        const isCurrentRow = rowIdx === 1 && !isEmBranco;
                        return (
                          <tr key={rowIdx} className="border-b border-black min-h-[18px]">
                            <td className="border-r border-black p-1 text-center font-bold">{rowIdx}</td>
                            <td className="border-r border-black p-1 text-center">
                              {isCurrentRow ? bData : (isEmBranco ? "____/____/____" : "____/____/____")}
                            </td>
                            <td className="border-r border-black p-1">
                              {isCurrentRow ? (cestaTipoAuxilio === 'cesta_basica_padrao' ? 'Cesta Básica Padrão' : cestaTipoAuxilio === 'cesta_emergencial' ? 'Cesta Emergencial' : 'Kit Higiene') : ""}
                            </td>
                            <td className="border-r border-black p-1 text-center font-bold">
                              {isCurrentRow ? `${bQtd} un.` : ""}
                            </td>
                            <td className="border-r border-black p-1">
                              {isCurrentRow ? (cestaResponsavelEntrega || leadership.secretaria.name) : ""}
                            </td>
                            <td className="border-r border-black p-1">
                              {isCurrentRow ? <div className="border-b border-dotted border-gray-400 min-h-[14px]"></div> : ""}
                            </td>
                            <td className="p-1 text-center">
                              {isCurrentRow ? "VISTO OK" : ""}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 5. Termo de Responsabilidade & Declaração de Veracidade */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-2 py-0.5 border border-black mb-1">
                    5. Termo de Responsabilidade & Declaração de Recebimento Gratuito
                  </div>
                  <div className="border border-black p-2 text-[8px] text-justify leading-relaxed bg-gray-50/60">
                    <p>
                      Declaro sob as penas da lei que as informações socioeconômicas prestadas são a expressão da verdade e que recebi a título gratuito desta congregação religiosa o auxílio alimentar acima descrito, destinado exclusivamente ao sustento e nutrição dos membros de minha família.
                    </p>
                    <div className="pt-1.5 text-right font-medium text-[8px]">
                      {leadership.church.cidade}, {bData === "____/____/202____" ? "______ de ___________________ de 202____" : bData}.
                    </div>
                  </div>
                </div>

                {/* 6. Assinaturas Oficiais */}
                <div className="pt-1">
                  <div className="bg-gray-100 font-bold text-[9px] uppercase px-2 py-0.5 border border-black mb-1">
                    6. Assinaturas e Homologação
                  </div>
                  <div className="border border-black p-2 pt-5">
                    <div className="grid grid-cols-3 gap-5 text-center">
                      {/* Assinatura do Beneficiário */}
                      <div className="flex flex-col justify-end">
                        <div className="border-b border-black min-h-[20px]"></div>
                        <span className="font-bold text-[8.5px] uppercase block mt-1 truncate">
                          {bNome || "Assinatura do(a) Beneficiário(a)"}
                        </span>
                        <span className="text-[7px] text-gray-600 block">Responsável Familiar / Recebedor(a)</span>
                      </div>

                      {/* Secretaria / Ação Social */}
                      <div className="flex flex-col justify-end">
                        <div className="border-b border-black min-h-[20px] flex items-end justify-center pb-0.5">
                          {leadership.secretaria.signatureUrl && (
                            <img src={leadership.secretaria.signatureUrl} alt="" className="h-6 object-contain" />
                          )}
                        </div>
                        <span className="font-bold text-[8.5px] uppercase block mt-1 truncate">{leadership.secretaria.name}</span>
                        <span className="text-[7px] text-gray-600 block">Secretária / Assistência Social</span>
                      </div>

                      {/* Pastor Dirigente / Presidente */}
                      <div className="flex flex-col justify-end">
                        <div className="border-b border-black min-h-[20px] flex items-end justify-center pb-0.5">
                          {leadership.pastor.signatureUrl && (
                            <img src={leadership.pastor.signatureUrl} alt="" className="h-6 object-contain" />
                          )}
                        </div>
                        <span className="font-bold text-[8.5px] uppercase block mt-1 truncate">{leadership.pastor.name}</span>
                        <span className="text-[7px] text-gray-600 block">Pastor Presidente / Dirigente</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rodapé */}
                <div className="text-[7px] text-gray-500 flex justify-between items-center pt-1 border-t border-gray-300">
                  <span>Prontuário de Atendimento e Ação Social — {leadership.church.name}</span>
                  <span>Documento de Controle Interno — Confidencial</span>
                  <span className={`px-2 py-0.5 border rounded font-bold text-[8px] uppercase ${isSecondVia ? 'border-neutral-500 bg-neutral-100 text-neutral-600' : 'border-black bg-slate-100 text-black'}`}>
                    {isSecondVia ? '2ª via' : '1ª via'}
                  </span>
                </div>
              </div>
            </div>
          );
        });
        })}
      </div>
    );
  };

  const renderFichaCestaBasicaSimplificada = () => {
    const isEmBranco = cestaModo === 'em_branco';
    const bNome = isEmBranco ? "" : (selectedMember?.nome || selectedMember?.name || "");
    const bCpf = isEmBranco ? "" : (selectedMember?.cpf || "");
    const bRg = isEmBranco ? "" : (selectedMember?.rg || "");
    const bTel = isEmBranco ? "" : (selectedMember?.telefone || selectedMember?.phone || "");
    const bEnd = isEmBranco ? "" : (selectedMember?.endereco || selectedMember?.address || "");
    const bBairro = isEmBranco ? "" : (selectedMember?.bairro || "");
    const bCidade = isEmBranco ? "" : (selectedMember?.cidade || leadership.church.cidade);
    const bData = isEmBranco ? "____/____/202____" : (cestaData || new Date().toLocaleDateString('pt-BR'));
    const bQtd = isEmBranco ? "____" : cestaQtd;
    const bMotivo = isEmBranco ? "" : cestaMotivo;

    return (
      <div id="printable-standard">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-standard, #printable-standard * { visibility: visible; }
            #printable-standard { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: transparent; }
            @page { size: A4 portrait; margin: 0; }
            ::-webkit-scrollbar { display: none; }
            .print-page { page-break-after: always; height: 297mm; max-height: 297mm; box-sizing: border-box; overflow: hidden; }
          }
        `}</style>

        {Array.from({ length: printCopies }).flatMap((_, copyIdx) => {
          const currentSeq = sequenceNumber + 1 + copyIdx;
          // Conforme Anexo 5: 1 via única oficial
          const vias = [0];
          return vias.map((viaIdx) => {
            const isSecondVia = false;
            return (
            <div
              key={`${copyIdx}-${viaIdx}`}
              className={`w-[210mm] max-w-[210mm] min-h-[297mm] bg-white p-[9mm] mx-auto text-[10px] font-sans print:block print-page relative box-border mb-6 print:mb-0 ${isSecondVia ? 'text-neutral-600 opacity-75 print:opacity-75 via-talao-carbono' : 'text-black'}`}
            >
              {isSecondVia && (
                <div className="text-right text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1 print:block">
                  [ 2ª VIA - CARBONO / ARQUIVO ]
                </div>
              )}
              <div className={`border-2 flex flex-col relative z-10 p-4 space-y-4 ${isSecondVia ? 'border-neutral-500' : 'border-black'}`}>
                {/* Cabeçalho Oficial */}
                <div className="flex border-b-2 border-black pb-3">
                  <div className="w-[26mm] h-[24mm] border-r-2 border-black flex items-center justify-center p-1 pr-3 shrink-0">
                    {churchData.logoDataUrl || leadership.church.logoUrl ? (
                      <img src={churchData.logoDataUrl || leadership.church.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <div className="text-center font-bold text-[9px] leading-tight">OBPC<br/>SOCIAL</div>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center text-center px-3">
                    <h1 className="font-bold text-[14px] leading-tight uppercase w-full">{displayChurchName}</h1>
                    <p className="text-[8.5px] uppercase mt-0.5 leading-tight font-semibold">{displayChurchAddress} | CNPJ: {displayCnpj}</p>
                    <div className="border-2 border-black bg-gray-100 font-black px-4 py-1 mt-1.5 text-[11px] uppercase tracking-wide">
                      FICHA SIMPLIFICADA DE ATENDIMENTO & CESTA BÁSICA
                    </div>
                  </div>
                  <div className="w-[34mm] border-l-2 border-black flex flex-col items-center justify-center font-bold leading-none py-1 bg-white pl-2 shrink-0">
                    <span className="text-[14px] font-black tracking-wider text-black">AÇÃO SOCIAL</span>
                    <span className="text-rose-600 font-bold text-[11px] mt-1.5">FICHA Nº</span>
                    <span className="text-rose-600 font-black text-[19px] tracking-wider mt-0.5">{String(currentSeq).padStart(5, '0')}</span>
                  </div>
                </div>

                {/* Sub-header */}
                <div className="flex items-center justify-between text-[8.5px] text-gray-600 border-b border-black pb-1">
                  <span>DEPARTAMENTO DE ASSISTÊNCIA E PROMOÇÃO SOCIAL</span>
                  <span>{isEmBranco ? "MODELO PADRÃO EM BRANCO PARA PREENCHIMENTO MANUAL" : "VIA PREENCHIDA NO SISTEMA"}</span>
                </div>

                {/* 1. Identificação do Beneficiário */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9.5px] uppercase px-2 py-1 border border-black mb-1.5">
                    1. Dados do(a) Beneficiário(a) / Recebedor(a)
                  </div>
                  <div className="border border-black text-[9.5px]">
                    <div className="flex border-b border-black">
                      <div className="flex-[3] p-1.5 border-r border-black">
                        <span className="font-bold block text-[8px] uppercase text-gray-700">Nome Completo:</span>
                        <div className="font-semibold text-[10.5px] min-h-[16px] flex items-center">
                          {bNome || (isEmBranco ? "................................................................................................................................" : "Não informado")}
                        </div>
                      </div>
                      <div className="flex-1 p-1.5">
                        <span className="font-bold block text-[8px] uppercase text-gray-700">CPF:</span>
                        <div className="font-medium text-[9.5px] min-h-[16px] flex items-center">
                          {bCpf || (isEmBranco ? "___.___.___-__" : "Não informado")}
                        </div>
                      </div>
                    </div>

                    <div className="flex border-b border-black">
                      <div className="flex-1 p-1.5 border-r border-black">
                        <span className="font-bold block text-[8px] uppercase text-gray-700">RG:</span>
                        <div className="font-medium text-[9.5px] min-h-[16px] flex items-center">
                          {bRg || (isEmBranco ? "......................................" : "Não informado")}
                        </div>
                      </div>
                      <div className="flex-1 p-1.5 border-r border-black">
                        <span className="font-bold block text-[8px] uppercase text-gray-700">Telefone / WhatsApp:</span>
                        <div className="font-medium text-[9.5px] min-h-[16px] flex items-center">
                          {bTel || (isEmBranco ? "(_____) _____________" : "Não informado")}
                        </div>
                      </div>
                      <div className="flex-1 p-1.5">
                        <span className="font-bold block text-[8px] uppercase text-gray-700">Congregação Atendente:</span>
                        <div className="font-medium text-[9.5px] min-h-[16px] flex items-center">
                          {activeBranchObj?.name || "Templo Sede"}
                        </div>
                      </div>
                    </div>

                    <div className="flex">
                      <div className="flex-[3] p-1.5 border-r border-black">
                        <span className="font-bold block text-[8px] uppercase text-gray-700">Endereço Residencial Completo:</span>
                        <div className="font-medium text-[9.5px] min-h-[16px] flex items-center">
                          {bEnd || (isEmBranco ? "................................................................................................................................" : "Não informado")}
                        </div>
                      </div>
                      <div className="flex-[1.5] p-1.5 border-r border-black">
                        <span className="font-bold block text-[8px] uppercase text-gray-700">Bairro:</span>
                        <div className="font-medium text-[9.5px] min-h-[16px] flex items-center">
                          {bBairro || (isEmBranco ? "......................................" : "Não informado")}
                        </div>
                      </div>
                      <div className="flex-1 p-1.5">
                        <span className="font-bold block text-[8px] uppercase text-gray-700">Cidade / UF:</span>
                        <div className="font-medium text-[9.5px] min-h-[16px] flex items-center">
                          {bCidade || (isEmBranco ? "......................................" : "Não informado")}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Especificação do Auxílio Entregue */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9.5px] uppercase px-2 py-1 border border-black mb-1.5">
                    2. Discriminação do Auxílio Entregue
                  </div>
                  <div className="border border-black p-2.5 text-[9px] space-y-2.5">
                    <div className="flex justify-between items-center border-b border-black pb-2">
                      <div className="flex items-center gap-3">
                        <span className="font-bold uppercase text-[8.5px]">Tipo de Benefício:</span>
                        <span className="mr-2">{cestaTipoAuxilio === 'cesta_basica_padrao' ? '[X]' : '[ ]'} Cesta Básica Padrão</span>
                        <span className="mr-2">{cestaTipoAuxilio === 'cesta_emergencial' ? '[X]' : '[ ]'} Cesta Emergencial</span>
                        <span className="mr-2">{cestaTipoAuxilio === 'higiene_limpeza' ? '[X]' : '[ ]'} Kit Higiene</span>
                        <span>[ ] Outro</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div>
                          <span className="font-bold uppercase text-[8.5px]">Qtd: </span>
                          <span className="font-bold">{bQtd} un.</span>
                        </div>
                        <div>
                          <span className="font-bold uppercase text-[8.5px]">Data: </span>
                          <span className="font-bold">{bData}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold uppercase text-[8px] mr-1.5">Responsável pela Entrega / Diaconia: </span>
                        <span className="font-medium">{cestaResponsavelEntrega || leadership.secretaria.name}</span>
                      </div>
                      <div>
                        <span className="font-bold uppercase text-[8px] mr-1.5">Carência de Retorno: </span>
                        <span className="text-[8px] font-semibold text-gray-700">30 dias padrão</span>
                      </div>
                    </div>

                    <div>
                      <span className="font-bold block text-[8px] uppercase text-gray-700">Observações / Motivo do Atendimento:</span>
                      <div className="min-h-[18px] text-[9px] text-gray-800">
                        {bMotivo || (isEmBranco ? "........................................................................................................................................................................................................" : "Atendimento social e fornecimento de cesta de alimentos.")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Termo de Recebimento Simples */}
                <div>
                  <div className="bg-gray-100 font-bold text-[9.5px] uppercase px-2 py-1 border border-black mb-1.5">
                    3. Declaração de Recebimento
                  </div>
                  <div className="border border-black p-3 text-[9px] text-justify leading-relaxed bg-gray-50/60">
                    <p>
                      Declaro para todos os fins que recebi gratuitamente desta congregação o benefício de alimentação/auxílio social acima descrito, destinado ao sustento e nutrição da minha família, sendo verdadeiras todas as informações prestadas à secretaria social.
                    </p>
                    <div className="pt-2.5 text-right font-medium text-[8.5px]">
                      {leadership.church.cidade}, {bData === "____/____/202____" ? "______ de ___________________ de 202____" : bData}.
                    </div>
                  </div>
                </div>

                {/* 4. Assinaturas Oficiais */}
                <div className="pt-2">
                  <div className="bg-gray-100 font-bold text-[9.5px] uppercase px-2 py-1 border border-black mb-1.5">
                    4. Assinaturas e Homologação
                  </div>
                  <div className="border border-black p-3 pt-6">
                    <div className="grid grid-cols-3 gap-6 text-center">
                      {/* Assinatura do Beneficiário */}
                      <div className="flex flex-col justify-end">
                        <div className="border-b border-black min-h-[22px]"></div>
                        <span className="font-bold text-[9px] uppercase block mt-1.5 truncate">
                          {bNome || "Assinatura do(a) Recebedor(a)"}
                        </span>
                        <span className="text-[7.5px] text-gray-600 block">Beneficiário(a) / Responsável</span>
                      </div>

                      {/* Secretaria / Ação Social */}
                      <div className="flex flex-col justify-end">
                        <div className="border-b border-black min-h-[22px] flex items-end justify-center pb-0.5">
                          {leadership.secretaria.signatureUrl && (
                            <img src={leadership.secretaria.signatureUrl} alt="" className="h-7 object-contain" />
                          )}
                        </div>
                        <span className="font-bold text-[9px] uppercase block mt-1.5 truncate">{leadership.secretaria.name}</span>
                        <span className="text-[7.5px] text-gray-600 block">Secretária / Assistência Social</span>
                      </div>

                      {/* Pastor Dirigente / Presidente */}
                      <div className="flex flex-col justify-end">
                        <div className="border-b border-black min-h-[22px] flex items-end justify-center pb-0.5">
                          {leadership.pastor.signatureUrl && (
                            <img src={leadership.pastor.signatureUrl} alt="" className="h-7 object-contain" />
                          )}
                        </div>
                        <span className="font-bold text-[9px] uppercase block mt-1.5 truncate">{leadership.pastor.name}</span>
                        <span className="text-[7.5px] text-gray-600 block">Pastor Presidente / Dirigente</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rodapé */}
                <div className="text-[7.5px] text-gray-500 flex justify-between items-center pt-2 border-t border-gray-300">
                  <span>Comprovante de Atendimento Social - Departamento de Assistência da Igreja</span>
                  <span>{leadership.church.name}</span>
                  <span className={`px-2 py-0.5 border rounded font-bold text-[8px] uppercase ${isSecondVia ? 'border-neutral-500 bg-neutral-100 text-neutral-600' : 'border-black bg-slate-100 text-black'}`}>
                    {isSecondVia ? '2ª via' : '1ª via'}
                  </span>
                </div>
              </div>
            </div>
          );
        });
        })}
      </div>
    );
  };

  const renderFichaCestaBasica = () => {
    if (formType === 'ficha-cesta-basica-simples' || cestaVersao === 'simples') {
      return renderFichaCestaBasicaSimplificada();
    }
    return renderFichaCestaBasicaAnalitica();
  };


  const renderDynamicDocument = () => {
    // Conforme Anexo 5: 1 via única oficial para declarações, certidões e modelos dinâmicos
    const vias = [0];
    const template = templates.find(t => t.id === selectedTemplateId);
    const docTitle = template?.title || currentTemplateTitle || "DECLARAÇÃO DE BATISMO";

    return (
      <div id="printable-dynamic" className="w-[210mm] mx-auto font-serif print:block">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            #printable-dynamic, #printable-dynamic * { visibility: visible; }
            #printable-dynamic { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: white; }
            @page { size: A4 portrait; margin: 0; }
            ::-webkit-scrollbar { display: none; }
            .dynamic-page { page-break-after: always; min-height: 297mm; height: 297mm; max-height: 297mm; box-sizing: border-box; }
          }
        `}</style>
        
        {vias.map((viaIdx) => {
          const isSecondVia = viaIdx === 1;
          return (
            <div 
              key={viaIdx} 
              className={`dynamic-page w-[210mm] min-h-[297mm] h-[297mm] max-h-[297mm] bg-white p-[14mm] mx-auto flex flex-col justify-between mb-8 print:mb-0 relative box-border ${
                isSecondVia ? 'text-neutral-600 print:opacity-75 via-talao-carbono' : 'text-black'
              }`}
            >
              {isSecondVia && (
                <div className="absolute top-4 right-8 text-[9px] font-bold text-neutral-400 uppercase tracking-widest">
                  [ 2ª VIA - CARBONO / ARQUIVO ]
                </div>
              )}

              {/* Moldura Clássica e Elegante de Documento Oficial / Certidão Eclesiástica */}
              <div className="h-full border-[3px] border-double border-neutral-900 p-8 sm:p-10 flex flex-col justify-between relative bg-white shadow-xs">
                {/* Filete interno sutil */}
                <div className="absolute top-1.5 left-1.5 right-1.5 bottom-1.5 border border-neutral-300 pointer-events-none" />

                <div>
                  {/* Cabeçalho da Igreja */}
                  <div className="flex items-center justify-center gap-6 border-b-2 border-neutral-800 pb-5 mb-5 text-center">
                     {churchData.logoDataUrl ? (
                       <img src={churchData.logoDataUrl} alt="Logo" className="h-16 object-contain" />
                     ) : (
                       <div className="w-14 h-14 rounded-full border border-neutral-400 flex items-center justify-center font-serif text-[11px] font-bold text-neutral-700 bg-neutral-50 shrink-0">
                         OBPC
                       </div>
                     )}
                     <div className="text-center">
                       <h1 className="text-lg font-serif font-black uppercase leading-tight text-neutral-900 tracking-wide">
                         {displayChurchName}
                       </h1>
                       <p className="text-[11px] font-serif font-medium text-neutral-700 mt-0.5">{displayChurchAddress}</p>
                       <p className="text-[10px] font-serif text-neutral-500">CNPJ: {displayCnpj}</p>
                     </div>
                  </div>

                  {/* TÍTULO PRINCIPAL DO DOCUMENTO (Conforme Anexo 2: Declaração de Batismo ou Modelo Criado) */}
                  <div className="my-6 text-center">
                    <div className="inline-block relative">
                      <h2 className="text-2xl sm:text-3xl font-serif font-black uppercase tracking-[0.25em] text-neutral-900 border-b-2 border-neutral-900 pb-2.5 px-8">
                        {docTitle}
                      </h2>
                      <div className="w-20 h-0.5 bg-neutral-400 mx-auto mt-1" />
                    </div>
                  </div>

                  {/* Conteúdo Dinâmico com Tipografia Refinada e Justificada */}
                  <div 
                    className="text-[15px] leading-[2.2] text-justify space-y-4 font-serif text-neutral-900 px-4 pt-1"
                    dangerouslySetInnerHTML={{ __html: dynamicPrintContent }} 
                  />
                </div>

                {/* Bloco de Cidade/Data e Assinaturas Oficiais */}
                <div>
                  <div className="text-right text-[13px] font-serif text-neutral-800 mb-8 px-4">
                    {leadership.church.cidade || "Valparaíso de Goiás - GO"}, {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}.
                  </div>

                  <div className="grid grid-cols-2 gap-8 px-6 pt-3">
                    <div className="flex flex-col items-center text-center">
                      <div className="w-full border-b border-neutral-800 min-h-[32px] flex items-end justify-center pb-1">
                        {(leadership.pastor.signatureUrl || churchData.pastorSignatureUrl) && (
                          <img src={leadership.pastor.signatureUrl || churchData.pastorSignatureUrl} alt="" className="h-10 object-contain" />
                        )}
                      </div>
                      <span className="font-serif font-bold text-[12px] uppercase mt-1">
                        {leadership.pastor.name || "Pastor Presidente"}
                      </span>
                      <span className="text-[10px] font-serif text-neutral-600">Pastor Titular / Presidente</span>
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <div className="w-full border-b border-neutral-800 min-h-[32px] flex items-end justify-center pb-1">
                        {leadership.secretaria.signatureUrl && (
                          <img src={leadership.secretaria.signatureUrl} alt="" className="h-10 object-contain" />
                        )}
                      </div>
                      <span className="font-serif font-bold text-[12px] uppercase mt-1">
                        {leadership.secretaria.name || "Secretaria Geral"}
                      </span>
                      <span className="text-[10px] font-serif text-neutral-600">Secretaria Eclesiástica</span>
                    </div>
                  </div>

                  {/* Rodapé Oficial com Legenda da Via */}
                  <div className="pt-3 border-t border-neutral-300 flex justify-between items-center text-[9px] font-serif text-neutral-500 mt-6 px-2">
                    <span>{displayChurchName} • Documento Eclesiástico Oficial</span>
                    <span className={`px-2.5 py-0.5 border rounded font-bold text-[9px] uppercase ${isSecondVia ? 'border-neutral-400 bg-neutral-100 text-neutral-600' : 'border-neutral-900 bg-neutral-100 text-neutral-900'}`}>
                      {isSecondVia ? '2ª via (Arquivo / Secretaria)' : '1ª via (Original)'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Formulários e Documentos</h1>
          <p className="text-muted-foreground">Emissão de blocos padronizados e cartas/declarações dinâmicas.</p>
        </div>
      </div>

      <Tabs defaultValue="padroes" className="print:hidden space-y-6">
        <TabsList className="bg-muted/80 p-1.5 rounded-xl border border-border inline-flex h-auto gap-2 shadow-xs">
          <TabsTrigger 
            value="padroes"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
          >
            <Printer className="w-4 h-4" />
            <span>Formulários Padrão</span>
          </TabsTrigger>
          <TabsTrigger 
            value="dinamicos"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
          >
            <FileText className="w-4 h-4" />
            <span>Documentos & Declarações</span>
          </TabsTrigger>
          <TabsTrigger 
            value="logs"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-muted-foreground hover:text-foreground"
          >
            <History className="w-4 h-4" />
            <span>Logs de Emissão</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="padroes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurar Impressão Padrão</CardTitle>
              <CardDescription>Escolha o formulário e opcionalmente um membro para preenchimento automático.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Indicador de Igreja / Congregação Selecionada */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border text-xs mb-6">
                <Building2 className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">Igreja Selecionada (Dashboard/Topo):</span>
                    <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-2 py-0.5 rounded">
                      {activeBranchObj && activeBranchObj.id !== 'all' ? 'Congregação / Filial' : 'Sede Principal'}
                    </span>
                  </div>
                  <p className="font-bold text-foreground mt-0.5">{displayChurchName}</p>
                  <p className="text-muted-foreground">{displayChurchAddress}</p>
                </div>
              </div>

              <div className="space-y-6 mb-6">
                {/* Linha 1: Tipo de Formulário (PRIMEIRO) e Vincular a um Membro / Beneficiário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Tipo de Formulário</Label>
                    <Select 
                      value={formType} 
                      onValueChange={(val) => {
                        setFormType(val);
                        if (val === 'ficha-cesta-basica-analitica') setCestaVersao('analitica');
                        if (val === 'ficha-cesta-basica-simples') setCestaVersao('simples');
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecione o modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relatorio-culto">Relatório de Culto Financeiro (A4)</SelectItem>
                        <SelectItem value="recibo">Recibo Padrão (2 por página - 12cm x 19cm)</SelectItem>
                        <SelectItem value="ficha-membro">Ficha de Cadastro de Membros (Oficial A4)</SelectItem>
                        <SelectItem value="ficha-cesta-basica-analitica">🧺 Ficha Cesta Básica — Versão Analítica (Completa A4)</SelectItem>
                        <SelectItem value="ficha-cesta-basica-simples">📝 Ficha Cesta Básica — Versão Simplificada (Rápida A4)</SelectItem>
                        <SelectItem value="ficha-batismo">💧 Ficha de Candidato ao Batismo nas Águas (A4)</SelectItem>
                        <SelectItem value="ficha-apresentacao">👶 Ficha de Apresentação e Dedicação de Crianças (A4)</SelectItem>
                        <SelectItem value="ficha-reconciliacao">🕊️ Ficha de Reconciliação & Novos Convertidos (A4)</SelectItem>
                        <SelectItem value="ficha-casamento">💍 Requerimento de Casamento Religioso (A4)</SelectItem>
                        <SelectItem value="ficha-visitante">🤝 Ficha de Visitante & Boas-Vindas (Oficial A4)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="font-semibold text-sm">Vincular a um Membro / Beneficiário</Label>
                      {selectedMember && (
                        <button
                          type="button"
                          onClick={() => handleSelectMember(null)}
                          className="text-[11px] text-muted-foreground hover:text-red-500 underline"
                        >
                          Limpar (Deixar em Branco)
                        </button>
                      )}
                    </div>
                    {/* Seleção direta via Dropdown */}
                    <Select
                      value={selectedMember?.id ? String(selectedMember.id) : "__blank__"}
                      onValueChange={(val) => {
                        if (val === "__blank__") {
                          handleSelectMember(null);
                        } else {
                          const m = members.find(x => String(x.id) === val);
                          if (m) handleSelectMember(m);
                        }
                      }}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecione um membro cadastrado ou deixe em branco..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-60">
                        <SelectItem value="__blank__">-- Deixar em branco (Preenchimento Manual) --</SelectItem>
                        {members.map(m => (
                          <SelectItem key={m.id || Math.random().toString()} value={String(m.id)}>
                            {m.nome || m.name} {m.cargo || m.role ? `(${m.cargo || m.role})` : ''} {m.cpf ? `• CPF: ${m.cpf}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Campo de pesquisa opcional para filtro rápido */}
                    <div className="relative mt-2">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="search" 
                        placeholder="Ou busque por nome ou CPF..." 
                        className="pl-8 h-9 text-xs" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                      {searchTerm && !selectedMember && (
                        <div className="absolute z-30 left-0 right-0 top-full bg-popover border rounded-md shadow-xl mt-1 p-2 max-h-60 overflow-auto text-popover-foreground">
                          {filteredMembers.length > 0 ? (
                            filteredMembers.map(m => (
                              <div 
                                key={m.id} 
                                className="p-2 hover:bg-muted cursor-pointer rounded flex justify-between items-center text-xs"
                                onClick={() => handleSelectMember(m)}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className="font-medium text-foreground">{m.nome || m.name}</span>
                                  {m.isSocialBeneficiary && (
                                    <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.2 rounded font-semibold">
                                      Ação Social
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted-foreground">{m.cpf || "Sem CPF"}</span>
                              </div>
                            ))
                          ) : (
                            <div className="p-2 text-xs text-muted-foreground">Nenhum membro ou beneficiário encontrado.</div>
                          )}
                        </div>
                      )}
                    </div>

                    {selectedMember && (
                      <div className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded-md border border-emerald-200 dark:border-emerald-900 mt-1">
                        <Check className="h-4 w-4 mr-1.5 shrink-0" />
                        <span className="flex-1 truncate">
                          Membro vinculado: <strong>{selectedMember.nome || selectedMember.name}</strong> ({selectedMember.cargo || selectedMember.role || "Membro"}) {selectedMember.cpf ? `• CPF: ${selectedMember.cpf}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Linha 2: Último Número Impresso (Inicia com 0) e Quantidade de Cópias */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Informe o ultimo Numero impresso</Label>
                    <Input 
                      type="number" 
                      value={sequenceNumber} 
                      onChange={(e) => setSequenceNumber(parseInt(e.target.value) || 0)}
                      min={0}
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground">O próximo impresso começará a partir deste número + 1 (Inicia com 0 conforme padrão).</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-sm">Quantidade de Cópias</Label>
                    <Input 
                      type="number" 
                      value={printCopies} 
                      onChange={(e) => setPrintCopies(parseInt(e.target.value) || 1)}
                      min={1}
                      max={10}
                      className="h-10"
                    />
                    <p className="text-xs text-muted-foreground">Quantidade de cópias a serem geradas.</p>
                  </div>
                </div>

                {/* Linha 3: Opção 'Imprimir também 2ª via ?' (Exclusivo para Recibo e Relatório de Culto conforme Anexo 5) */}
                {(formType === 'recibo' || formType === 'relatorio-culto') ? (
                  <div className="p-4 rounded-xl border border-border/80 bg-muted/30 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="imprimir-2a-via" className="font-bold text-sm text-foreground cursor-pointer">
                          Imprimir também 2ª via ?
                        </Label>
                        {imprimirSegundaVia && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">
                            1ª e 2ª Via Ativas
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Se selecionado, o formulário gerará a <strong>1ª via (original)</strong> e a <strong>2ª via (carbono)</strong>.
                      </p>
                    </div>
                    <Checkbox 
                      id="imprimir-2a-via"
                      checked={imprimirSegundaVia}
                      onCheckedChange={(val) => setImprimirSegundaVia(!!val)}
                      className="h-5 w-5 data-[state=checked]:bg-primary"
                    />
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border border-muted bg-muted/20 flex items-center gap-2.5 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Conforme padrão oficial da igreja (Anexo 5), este documento é gerado estritamente em <strong>via única oficial</strong>.</span>
                  </div>
                )}
              </div>

              {/* Painel de Preenchimento do Recibo (Conforme Anexo 4) */}
              {formType === 'recibo' && (
                <div className="mt-6 pt-5 border-t border-dashed space-y-5 bg-slate-50 dark:bg-slate-900/40 p-5 rounded-xl border">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                    <div>
                      <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                        <FileText className="h-4 w-4" /> Configuração do Recibo Oficial (2 por folha A4 • 12cm x 19cm)
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Escolha entre preencher os dados no sistema ou emitir o bloco em branco para o tesoureiro.
                      </p>
                    </div>

                    {/* Seletor de Modo: Preenchido no Sistema VS Bloco em Branco */}
                    <div className="flex rounded-lg bg-muted p-1 border text-xs font-semibold shrink-0">
                      <button
                        type="button"
                        className={cn(
                          "py-1 px-3 rounded-md transition-all",
                          reciboModo === 'preenchido' 
                            ? "bg-background text-foreground shadow-xs" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => setReciboModo('preenchido')}
                      >
                        ✍️ Preencher no Sistema
                      </button>
                      <button
                        type="button"
                        className={cn(
                          "py-1 px-3 rounded-md transition-all",
                          reciboModo === 'branco' 
                            ? "bg-background text-foreground shadow-xs" 
                            : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={() => {
                          setReciboModo('branco')
                          setReciboValor("")
                          setReciboExtenso("")
                          setReciboBeneficiarioNome("")
                          setReciboBeneficiarioCpf("")
                          setReciboPagador("")
                          setReciboReferente("")
                          setSelectedMember(null)
                          setSearchTerm("")
                        }}
                      >
                        📄 Bloco em Branco (Manual)
                      </button>
                    </div>
                  </div>

                  {reciboModo === 'branco' ? (
                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-900 dark:text-amber-200 text-sm">
                        <span>📋 Modo Bloco / Talão em Branco Ativado</span>
                      </div>
                      <p className="text-amber-800 dark:text-amber-300 leading-relaxed">
                        Os recibos serão emitidos com o cabeçalho e CNPJ da <strong>Igreja O Brasil Para Cristo</strong>, com a legenda <em>"Recebi(emos) de: Igreja O Brasil Para Cristo"</em> e todos os campos pautados com linhas em branco (Valor, Extenso, Beneficiário, CPF na parte inferior e assinaturas). Perfeito para formar o bloco físico e deixar com o tesoureiro preencher manualmente à caneta.
                      </p>
                      <div className="pt-2 flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 text-xs bg-white dark:bg-slate-900"
                          onClick={() => setReciboModo('preenchido')}
                        >
                          Trocar para Preenchimento no Sistema
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Ações Rápidas */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-muted-foreground">Preencha os campos abaixo para que o recibo seja gerado automaticamente:</span>
                        <div className="flex items-center gap-2">
                          <Button 
                            type="button" 
                            variant="secondary" 
                            size="sm" 
                            className="h-7 text-xs bg-primary/10 text-primary hover:bg-primary/20"
                            onClick={() => {
                              setReciboModo('preenchido')
                              setReciboBeneficiarioNome("Irmã Maria da Silva")
                              setReciboBeneficiarioCpf("123.456.789-00")
                              setReciboValor("350,00")
                              setReciboExtenso("Trezentos e cinquenta reais")
                              setReciboReferente("Oferta de auxílio fraterno para necessidades básicas")
                              setReciboRecebiDe("Igreja Evangélica Pentecostal O Brasil Para Cristo")
                              setReciboData(new Date().toLocaleDateString('pt-BR'))
                            }}
                          >
                            🎁 Exemplo: Oferta de Auxílio à Irmã
                          </Button>
                          {(reciboValor || reciboBeneficiarioNome || reciboReferente) && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-xs text-muted-foreground h-7"
                              onClick={() => {
                                setReciboValor("")
                                setReciboExtenso("")
                                setReciboReferente("")
                                setReciboBeneficiarioNome("")
                                setReciboBeneficiarioCpf("")
                                setReciboPagador("")
                                setSelectedMember(null)
                                setSearchTerm("")
                              }}
                            >
                              Limpar Campos
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Bloco 1: Beneficiário (Quem recebe) e CPF */}
                      <div className="p-3.5 rounded-lg bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-900/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold text-sky-950 dark:text-sky-200 flex items-center gap-1.5">
                            <span>👤 Pessoa Beneficiada (Quem está recebendo a oferta da igreja)</span>
                          </Label>
                          <span className="text-[10px] text-sky-700 dark:text-sky-300 font-medium">
                            Sairá lá embaixo com espaço para ela assinar e com o CPF
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs font-medium">Nome Completo do(a) Beneficiário(a)</Label>
                            <Input 
                              placeholder="Ex: Irmã Maria de Lourdes da Silva..." 
                              value={reciboBeneficiarioNome} 
                              onChange={(e) => {
                                setReciboBeneficiarioNome(e.target.value)
                                setReciboPagador(e.target.value)
                              }} 
                              className="bg-white dark:bg-slate-900 h-9"
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs font-medium">CPF do(a) Beneficiário(a)</Label>
                            <Input 
                              placeholder="Ex: 000.000.000-00" 
                              value={reciboBeneficiarioCpf} 
                              onChange={(e) => setReciboBeneficiarioCpf(e.target.value)} 
                              className="bg-white dark:bg-slate-900 h-9"
                            />
                          </div>
                        </div>

                        {selectedMember && (
                          <div className="flex items-center justify-between text-xs text-sky-800 dark:text-sky-300 bg-sky-100/60 dark:bg-sky-900/40 p-2 rounded border border-sky-300/40">
                            <span>✓ Preenchido com o membro selecionado no topo: <strong>{selectedMember.nome || selectedMember.name}</strong></span>
                            {selectedMember.cpf && <span className="font-mono text-[11px]">CPF: {selectedMember.cpf}</span>}
                          </div>
                        )}
                      </div>

                      {/* Bloco 2: Origem dos Recursos e Congregação */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">Recebi(emos) de (Origem dos Recursos)</Label>
                            <span className="text-[10px] font-semibold text-primary">Sempre Igreja Brasil Para Cristo</span>
                          </div>
                          <Input 
                            value={reciboRecebiDe} 
                            onChange={(e) => setReciboRecebiDe(e.target.value)} 
                            className="h-9 font-medium"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium">Igreja / Congregação</Label>
                            {branches.length > 0 && (
                              <span className="text-[10px] text-muted-foreground">
                                (Selecione a filial)
                              </span>
                            )}
                          </div>
                          <Input 
                            placeholder="Nome da congregação" 
                            value={reciboCongregacao} 
                            onChange={(e) => setReciboCongregacao(e.target.value)} 
                            className="h-9"
                          />
                          {branches.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {branches.map(b => (
                                <Button
                                  key={b.id}
                                  type="button"
                                  variant={(reciboCongregacao || "").toLowerCase() === (b.name || "").toLowerCase() ? "default" : "outline"}
                                  size="sm"
                                  className="h-6 text-[10px] px-2 py-0"
                                  onClick={() => setReciboCongregacao(b.name)}
                                >
                                  {b.name}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bloco 3: Valores */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Valor - R$</Label>
                          <Input 
                            placeholder="Ex: 250,00" 
                            value={reciboValor} 
                            onChange={(e) => handleValorChange(e.target.value)} 
                            className="h-9 font-semibold text-emerald-700 dark:text-emerald-400"
                          />
                        </div>
                        <div className="space-y-1.5 md:col-span-2">
                          <Label className="text-xs font-medium">Valor por Extenso (Automático)</Label>
                          <Input 
                            placeholder="Ex: Duzentos e cinquenta reais" 
                            value={reciboExtenso} 
                            onChange={(e) => setReciboExtenso(e.target.value)} 
                            className="h-9"
                          />
                        </div>
                      </div>

                      {/* Bloco 4: Referente */}
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Referente a (Motivo da Oferta / Pagamento)</Label>
                        <Input 
                          placeholder="Ex: Oferta de auxílio fraterno para a irmã em necessidade, Ajuda de custo..." 
                          value={reciboReferente} 
                          onChange={(e) => setReciboReferente(e.target.value)} 
                          className="h-9"
                        />
                      </div>

                      {/* Bloco 5: Data e Tesoureiro */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Data do Recibo</Label>
                          <Input 
                            value={reciboData} 
                            onChange={(e) => setReciboData(e.target.value)} 
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-medium">Tesoureiro ou Responsável da Igreja</Label>
                          <Input 
                            value={reciboTesoureiro} 
                            placeholder={leadership.tesoureiro.name || "Tesoureiro"}
                            onChange={(e) => setReciboTesoureiro(e.target.value)} 
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Painel de Preenchimento da Ficha de Batismo */}
              {formType === 'ficha-batismo' && (
                <div className="mt-6 pt-5 border-t border-dashed space-y-4 bg-sky-50/50 dark:bg-sky-950/20 p-4 rounded-xl border border-sky-200 dark:border-sky-900/60">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-sky-800 dark:text-sky-300">
                      <FileText className="h-4 w-4" /> Dados Específicos para a Ficha de Batismo
                    </h3>
                    {selectedMember && (
                      <span className="text-xs text-emerald-600 font-medium">
                        ✓ Dados pessoais preenchidos automaticamente do cadastro de {selectedMember.nome || selectedMember.name}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Os campos abaixo complementam a ficha impressa. Se preferir imprimir em branco para preenchimento manual pelo candidato, deixe-os vazios.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Data Prevista do Batismo</Label>
                      <Input 
                        placeholder="Ex: 25/10/2026" 
                        value={batismoDataPrevista} 
                        onChange={(e) => setBatismoDataPrevista(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Instrutor(a) do Discipulado</Label>
                      <Input 
                        placeholder="Nome do líder / professor" 
                        value={batismoInstrutor} 
                        onChange={(e) => setBatismoInstrutor(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Local / Tanque Batismal</Label>
                      <Input 
                        placeholder="Templo Sede / Tanque Batismal" 
                        value={batismoLocal} 
                        onChange={(e) => setBatismoLocal(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Pastor Celebrante / Oficiante</Label>
                      <Input 
                        placeholder={churchData?.pastorTitular || "Pr. Presidente"} 
                        value={batismoPastor} 
                        onChange={(e) => setBatismoPastor(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Livro de Batismos nº</Label>
                      <Input 
                        placeholder="Ex: 01" 
                        value={batismoLivro} 
                        onChange={(e) => setBatismoLivro(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Folha nº</Label>
                      <Input 
                        placeholder="Ex: 12" 
                        value={batismoFolha} 
                        onChange={(e) => setBatismoFolha(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Painel de Preenchimento da Ficha de Apresentação de Criança */}
              {formType === 'ficha-apresentacao' && (
                <div className="mt-6 pt-5 border-t border-dashed space-y-4 bg-amber-50/50 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/60">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-900 dark:text-amber-300">
                      <FileText className="h-4 w-4" /> Dados da Apresentação de Criança (Dedicação)
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs font-medium">Nome Completo da Criança</Label>
                      <Input 
                        placeholder="Nome do bebê / criança..." 
                        value={apresentacaoNomeCrianca} 
                        onChange={(e) => setApresentacaoNomeCrianca(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Data de Nascimento da Criança</Label>
                      <Input 
                        placeholder="Ex: 15/04/2026" 
                        value={apresentacaoDataNasc} 
                        onChange={(e) => setApresentacaoDataNasc(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs font-medium">Certidão de Nascimento (Termo, Livro, Folha, Cartório)</Label>
                      <Input 
                        placeholder="Termo nº 12345, Livro A-12, Fls 34, Cartório de Valparaíso" 
                        value={apresentacaoCertidao} 
                        onChange={(e) => setApresentacaoCertidao(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Data do Culto de Apresentação</Label>
                      <Input 
                        placeholder="Ex: 20/10/2026" 
                        value={apresentacaoDataCulto} 
                        onChange={(e) => setApresentacaoDataCulto(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Nome do Pai</Label>
                      <Input 
                        placeholder="Nome do pai" 
                        value={apresentacaoPai} 
                        onChange={(e) => setApresentacaoPai(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Nome da Mãe</Label>
                      <Input 
                        placeholder="Nome da mãe" 
                        value={apresentacaoMae} 
                        onChange={(e) => setApresentacaoMae(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Padrinhos de Consagração / Apresentação</Label>
                      <Input 
                        placeholder="Nomes dos padrinhos" 
                        value={apresentacaoPadrinhos} 
                        onChange={(e) => setApresentacaoPadrinhos(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Painel de Preenchimento da Reconciliação */}
              {formType === 'ficha-reconciliacao' && (
                <div className="mt-6 pt-5 border-t border-dashed space-y-4 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
                      <FileText className="h-4 w-4" /> Dados de Reconciliação e Novos Convertidos
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Tipo de Decisão</Label>
                      <Select value={reconciliacaoTipo} onValueChange={setReconciliacaoTipo}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="reconciliacao">Reconciliação com Cristo</SelectItem>
                          <SelectItem value="decisao">Primeira Decisão (Conversão)</SelectItem>
                          <SelectItem value="transferencia">Vindo de outra Denominação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Discipulador(a) Designado(a)</Label>
                      <Input 
                        placeholder="Nome do líder de discipulado" 
                        value={reconciliacaoDiscipulador} 
                        onChange={(e) => setReconciliacaoDiscipulador(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Data da Decisão</Label>
                      <Input 
                        placeholder="Ex: 18/10/2026" 
                        value={reconciliacaoData} 
                        onChange={(e) => setReconciliacaoData(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-3">
                      <Label className="text-xs font-medium">Pedidos de Oração e Observações</Label>
                      <Input 
                        placeholder="Pedidos de oração pela família, saúde, libertação, trabalho..." 
                        value={reconciliacaoObservacoes} 
                        onChange={(e) => setReconciliacaoObservacoes(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Painel de Preenchimento de Casamento */}
              {formType === 'ficha-casamento' && (
                <div className="mt-6 pt-5 border-t border-dashed space-y-4 bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-200 dark:border-purple-900/60">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-purple-900 dark:text-purple-300">
                      <FileText className="h-4 w-4" /> Dados do Requerimento de Casamento Religioso
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Nome Completo do Noivo</Label>
                      <Input 
                        placeholder="Nome completo do noivo" 
                        value={casamentoNoivo} 
                        onChange={(e) => setCasamentoNoivo(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Nome Completo da Noiva</Label>
                      <Input 
                        placeholder="Nome completo da noiva" 
                        value={casamentoNoiva} 
                        onChange={(e) => setCasamentoNoiva(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Data e Horário Pretendidos</Label>
                      <Input 
                        placeholder="Ex: 12/12/2026 às 19:30 hs" 
                        value={casamentoDataHora} 
                        onChange={(e) => setCasamentoDataHora(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Local da Celebração</Label>
                      <Input 
                        placeholder="Templo Sede / Outro local" 
                        value={casamentoLocal} 
                        onChange={(e) => setCasamentoLocal(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs font-medium">Padrinhos e Testemunhas Oficiais</Label>
                      <Input 
                        placeholder="Nomes dos padrinhos e testemunhas..." 
                        value={casamentoTestemunhas} 
                        onChange={(e) => setCasamentoTestemunhas(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Painel de Configuração da Ficha de Cesta Básica (Analítica & Simplificada) */}
              {(formType === 'ficha-cesta-basica' || formType === 'ficha-cesta-basica-analitica' || formType === 'ficha-cesta-basica-simples') && (
                <div className="mt-6 pt-5 border-t border-dashed space-y-4 bg-rose-50/60 dark:bg-rose-950/20 p-4 rounded-xl border border-rose-200 dark:border-rose-900/40">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <h3 className="text-sm font-semibold flex items-center gap-2 text-rose-800 dark:text-rose-300">
                      <HeartHandshake className="h-4 w-4 text-rose-600" /> Ficha de Atendimento de Cesta Básica & Ação Social
                    </h3>
                    
                    <div className="flex items-center gap-3 flex-wrap">
                      {/* Seletor de Versão: Analítica vs Simplificada */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-rose-900 dark:text-rose-200">Versão:</span>
                        <div className="flex bg-muted p-0.5 rounded-lg border text-xs">
                          <button
                            type="button"
                            onClick={() => {
                              setCestaVersao('analitica');
                              setFormType('ficha-cesta-basica-analitica');
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-md font-medium transition-all",
                              cestaVersao === 'analitica' ? "bg-white dark:bg-card text-foreground shadow-xs font-bold text-rose-600" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            📄 Versão Analítica (Completa)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCestaVersao('simples');
                              setFormType('ficha-cesta-basica-simples');
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-md font-medium transition-all",
                              cestaVersao === 'simples' ? "bg-white dark:bg-card text-foreground shadow-xs font-bold text-rose-600" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            📝 Versão Simplificada (Rápida)
                          </button>
                        </div>
                      </div>

                      {/* Modo: Em Branco vs Preenchido */}
                      <div className="flex bg-muted p-0.5 rounded-lg border text-xs">
                        <button
                          type="button"
                          onClick={() => setCestaModo('em_branco')}
                          className={cn(
                            "px-2.5 py-1 rounded-md font-medium transition-all",
                            cestaModo === 'em_branco' ? "bg-white dark:bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          📄 Em Branco (Manual)
                        </button>
                        <button
                          type="button"
                          onClick={() => setCestaModo('preenchido')}
                          className={cn(
                            "px-2.5 py-1 rounded-md font-medium transition-all",
                            cestaModo === 'preenchido' ? "bg-white dark:bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                          )}
                        >
                          ✍️ Preenchido
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {cestaVersao === 'analitica' 
                      ? "A versão analítica inclui diagnóstico socioeconômico completo, composição familiar, renda per capita, moradia, parecer pastoral, histórico de concessões com visto e 3 assinaturas oficiais."
                      : "A versão simplificada é compacta em 1 página com recibo imediato de retirada, discriminação do auxílio e assinaturas de entrega."}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Tipo de Auxílio</Label>
                      <Select value={cestaTipoAuxilio} onValueChange={setCestaTipoAuxilio}>
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cesta_basica_padrao">Cesta Básica Padrão</SelectItem>
                          <SelectItem value="cesta_emergencial">Cesta Básica Emergencial</SelectItem>
                          <SelectItem value="higiene_limpeza">Kit Higiene & Limpeza</SelectItem>
                          <SelectItem value="vestuario">Vestuário / Agasalhos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Quantidade</Label>
                      <Input 
                        type="number"
                        min="1"
                        max="10"
                        value={cestaQtd} 
                        onChange={(e) => setCestaQtd(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Data do Atendimento</Label>
                      <Input 
                        placeholder="Ex: DD/MM/AAAA"
                        value={cestaData} 
                        onChange={(e) => setCestaData(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">Responsável / Triagem</Label>
                      <Input 
                        placeholder={leadership.secretaria.name || "Secretaria / Assistência"}
                        value={cestaResponsavelEntrega} 
                        onChange={(e) => setCestaResponsavelEntrega(e.target.value)} 
                        className="h-9 text-xs"
                      />
                    </div>

                    {cestaModo === 'preenchido' && (
                      <>
                        <div className="space-y-1 sm:col-span-2">
                          <Label className="text-xs font-medium">Motivo / Situação de Vulnerabilidade</Label>
                          <Input 
                            placeholder="Ex: Suporte alimentar temporário à família..."
                            value={cestaMotivo} 
                            onChange={(e) => setCestaMotivo(e.target.value)} 
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Renda Familiar (R$)</Label>
                          <Input 
                            placeholder="Ex: 850,00"
                            value={cestaRendaFamiliar} 
                            onChange={(e) => setCestaRendaFamiliar(e.target.value)} 
                            className="h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-medium">Tipo de Moradia</Label>
                          <Select value={cestaTipoMoradia} onValueChange={setCestaTipoMoradia}>
                            <SelectTrigger className="h-9 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Alugada">Alugada</SelectItem>
                              <SelectItem value="Propria">Própria</SelectItem>
                              <SelectItem value="Cedida">Cedida / Favor</SelectItem>
                              <SelectItem value="Ocupacao">Ocupação / Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {cestaVersao === 'analitica' && (
                          <>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Qtd. Membros Família</Label>
                              <Input 
                                type="number"
                                placeholder="Ex: 4"
                                value={cestaQtdMembros} 
                                onChange={(e) => setCestaQtdMembros(e.target.value)} 
                                className="h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs font-medium">Qtd. Crianças/Menores</Label>
                              <Input 
                                type="number"
                                placeholder="Ex: 2"
                                value={cestaQtdCriancas} 
                                onChange={(e) => setCestaQtdCriancas(e.target.value)} 
                                className="h-9 text-xs"
                              />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <Label className="text-xs font-medium">Benefícios Sociais</Label>
                              <Input 
                                placeholder="Ex: Bolsa Família, BPC"
                                value={cestaBeneficios} 
                                onChange={(e) => setCestaBeneficios(e.target.value)} 
                                className="h-9 text-xs"
                              />
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Botões Principais de Ação de Impressão */}
              <div className="mt-6 pt-5 border-t flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 p-4 rounded-xl border">
                <div>
                  <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Printer className="h-4 w-4 text-primary" /> Ações de Impressão Oficial
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formType === 'recibo' 
                      ? (reciboModo === 'branco' ? 'Modo Bloco em Branco (Manual para o tesoureiro preencher)' : 'Modo Preenchido no Sistema com dados do beneficiário') 
                      : 'Formulário configurado e pronto para emissão'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button 
                    type="button"
                    onClick={confirmPrintStandard} 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-9 text-xs sm:text-sm px-5 shadow-sm"
                  >
                    <Printer className="mr-2 h-4 w-4" /> Imprimir Formulário
                  </Button>
                  <Button 
                    type="button"
                    onClick={handleDownloadStandardPDF}
                    variant="outline" 
                    className="border-primary/40 text-primary hover:bg-primary/10 font-semibold h-9 text-xs sm:text-sm px-4 shadow-sm"
                  >
                    <Download className="mr-1.5 h-4 w-4" /> Baixar PDF Oficial
                  </Button>
                  <Button 
                    type="button"
                    onClick={handlePrintStandard} 
                    variant="ghost" 
                    size="sm"
                    className="text-xs text-muted-foreground h-9"
                  >
                    <Eye className="mr-1 h-3.5 w-3.5" /> Prévia em Janela
                  </Button>
                </div>
              </div>

              {/* Barra de Ajuste de Escala & Zoom na Tela (Alinhamento Perfeito) */}
              <div className="flex items-center justify-between bg-muted/40 p-3 rounded-xl border mt-6 flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Maximize2 className="h-3.5 w-3.5 text-primary" /> Visualização na Tela:
                  </span>
                  <div className="flex items-center gap-1">
                    <Button 
                      type="button"
                      variant={previewZoom === 0.72 ? "default" : "outline"} 
                      size="sm" 
                      className="h-7 text-xs px-2.5"
                      onClick={() => setPreviewZoom(0.72)}
                    >
                      Ajustar (72%)
                    </Button>
                    <Button 
                      type="button"
                      variant={previewZoom === 0.85 ? "default" : "outline"} 
                      size="sm" 
                      className="h-7 text-xs px-2.5"
                      onClick={() => setPreviewZoom(0.85)}
                    >
                      Ideal (85%)
                    </Button>
                    <Button 
                      type="button"
                      variant={previewZoom === 1 ? "default" : "outline"} 
                      size="sm" 
                      className="h-7 text-xs px-2.5"
                      onClick={() => setPreviewZoom(1)}
                    >
                      Real (100%)
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7 ml-1"
                      onClick={() => setPreviewZoom(prev => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10))}
                      title="Diminuir Zoom"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      className="h-7 w-7"
                      onClick={() => setPreviewZoom(prev => Math.min(1.2, Math.round((prev + 0.1) * 10) / 10))}
                      title="Aumentar Zoom"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    onClick={confirmPrintStandard} 
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-8 text-xs sm:text-sm px-4 shadow-sm"
                  >
                    <Printer className="mr-1.5 h-3.5 w-3.5" /> Imprimir Formulário
                  </Button>
                  <Button 
                    onClick={handleDownloadStandardPDF}
                    variant="outline" 
                    className="border-primary/40 text-primary hover:bg-primary/10 font-semibold h-8 text-xs sm:text-sm px-3.5 shadow-sm"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Baixar PDF Oficial
                  </Button>
                  <Button 
                    onClick={handlePrintStandard} 
                    variant="ghost" 
                    size="sm"
                    className="text-xs text-muted-foreground h-8"
                  >
                    <Eye className="mr-1 h-3.5 w-3.5" /> Prévia em Janela
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="overflow-x-auto overflow-y-visible bg-slate-200/80 dark:bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-border/80 flex justify-center min-h-[500px]">
             <div 
               style={{ 
                 transform: `scale(${previewZoom})`, 
                 transformOrigin: 'top center',
                 marginBottom: previewZoom < 1 ? `-${Math.round((1 - previewZoom) * 297 * 3.78)}px` : 0
               }} 
               className="transition-transform duration-150"
             >
                {formType === 'relatorio-culto' && renderRelatorioCulto()}
                {formType === 'recibo' && renderRecibo()}
                {formType === 'ficha-membro' && renderFichaMembro()}
                {formType === 'ficha-batismo' && renderFichaBatismo()}
                {formType === 'ficha-apresentacao' && renderFichaApresentacao()}
                {formType === 'ficha-reconciliacao' && renderFichaReconciliacao()}
                {formType === 'ficha-casamento' && renderFichaCasamento()}
                {formType === 'ficha-visitante' && renderFichaVisitante()}
                {(formType === 'ficha-cesta-basica' || formType === 'ficha-cesta-basica-analitica' || formType === 'ficha-cesta-basica-simples') && renderFichaCestaBasica()}
             </div>
          </div>

        </TabsContent>

        <TabsContent value="dinamicos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Modelos Dinâmicos</CardTitle>
              <CardDescription>Crie modelos como Cartas de Transferência e preencha automaticamente os dados do membro na hora de imprimir.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
                
                {/* Sidebar of templates */}
                <div className="space-y-4 border-r pr-6">
                   <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-sm">Meus Modelos</h3>
                      <Button variant="outline" size="icon" onClick={() => {
                         setSelectedTemplateId("")
                         setCurrentTemplateTitle("")
                         setCurrentTemplateContent("")
                         setIsEditingTemplate(true)
                      }}>
                         <Plus className="h-4 w-4" />
                      </Button>
                   </div>
                   <div className="space-y-2">
                      {templates.map(t => (
                         <div 
                           key={t.id} 
                           className={`p-3 text-sm rounded-md cursor-pointer border transition-colors ${selectedTemplateId === t.id ? 'bg-primary/10 border-primary font-medium' : 'hover:bg-muted'}`}
                           onClick={() => {
                              setSelectedTemplateId(t.id)
                              setCurrentTemplateTitle(t.title)
                              setCurrentTemplateContent(t.content)
                              setIsEditingTemplate(false)
                           }}
                         >
                            <FileText className="inline-block h-4 w-4 mr-2 text-muted-foreground" />
                            {t.title}
                         </div>
                      ))}
                      {templates.length === 0 && <p className="text-xs text-muted-foreground">Nenhum modelo criado.</p>}
                   </div>
                </div>

                {/* Editor / Viewer */}
                <div className="space-y-6">
                   {selectedTemplateId || isEditingTemplate ? (
                      <div className="space-y-4">
                         {isEditingTemplate ? (
                            <div className="space-y-4">
                               <div className="space-y-2">
                                  <Label>Título do Modelo</Label>
                                  <Input 
                                    value={currentTemplateTitle} 
                                    onChange={(e) => setCurrentTemplateTitle(e.target.value)} 
                                    placeholder="Ex: Carta de Apresentação"
                                  />
                               </div>
                               <div className="space-y-2">
                                  <Label>Conteúdo do Modelo</Label>
                                  <p className="text-xs text-muted-foreground mb-2">
                                     Variáveis disponíveis que serão trocadas na impressão: <br/>
                                     <code className="bg-muted px-1 py-0.5 rounded">[NOME_MEMBRO]</code> <code className="bg-muted px-1 py-0.5 rounded">[DOCUMENTO]</code> <code className="bg-muted px-1 py-0.5 rounded">[DATA_BATISMO]</code> <code className="bg-muted px-1 py-0.5 rounded">[DATA_ATUAL]</code>
                                  </p>
                                  <div className="bg-white rounded-lg border">
                                     <RichTextEditor 
                                        value={currentTemplateContent} 
                                        onChange={setCurrentTemplateContent} 
                                        placeholder="Digite o conteúdo do modelo..."
                                        className="min-h-[220px]"
                                     />
                                  </div>
                               </div>
                               <div className="flex justify-end gap-2 mt-4">
                                  <Button variant="outline" onClick={() => setIsEditingTemplate(false)}>Cancelar</Button>
                                  <Button onClick={saveTemplate}><Save className="h-4 w-4 mr-2"/> Salvar Modelo</Button>
                               </div>
                            </div>
                         ) : (
                            <div className="space-y-4">
                               <div className="flex justify-between items-center">
                                  <h2 className="text-xl font-semibold">{currentTemplateTitle}</h2>
                                  <div className="flex gap-2">
                                     <Button variant="outline" size="sm" onClick={() => setIsEditingTemplate(true)}>Editar</Button>
                                     <Button variant="destructive" size="sm" onClick={deleteTemplate}><Trash2 className="h-4 w-4"/></Button>
                                  </div>
                               </div>
                               
                               <div className="bg-muted/30 p-4 rounded-xl border border-dashed space-y-4 max-w-xl">
                                  <div className="flex items-center justify-between border-b pb-2">
                                     <h4 className="text-sm font-semibold flex items-center text-foreground">
                                        <Printer className="h-4 w-4 mr-2 text-primary"/> Preparar Impressão do Documento
                                     </h4>
                                     {selectedMember && (
                                        <Button 
                                          variant="ghost" 
                                          size="sm" 
                                          className="h-7 text-xs text-muted-foreground hover:text-red-500"
                                          onClick={() => {
                                            setSelectedMember(null);
                                            setSearchTerm("");
                                          }}
                                        >
                                          Limpar seleção
                                        </Button>
                                     )}
                                  </div>

                                  {/* Seleção do Modo: Membro Cadastrado VS Preenchimento Manual / Em Branco */}
                                  <div className="flex rounded-lg bg-muted p-1 border text-xs font-medium">
                                     <button
                                        type="button"
                                        className={cn(
                                           "flex-1 py-1.5 px-3 rounded-md transition-all text-center",
                                           solicitanteModo === 'membro'
                                              ? "bg-background text-foreground shadow-xs font-semibold"
                                              : "text-muted-foreground hover:text-foreground"
                                        )}
                                        onClick={() => setSolicitanteModo('membro')}
                                     >
                                        👤 Selecionar Membro Cadastrado
                                     </button>
                                     <button
                                        type="button"
                                        className={cn(
                                           "flex-1 py-1.5 px-3 rounded-md transition-all text-center",
                                           solicitanteModo === 'manual'
                                              ? "bg-background text-foreground shadow-xs font-semibold"
                                              : "text-muted-foreground hover:text-foreground"
                                        )}
                                        onClick={() => setSolicitanteModo('manual')}
                                     >
                                        ✍️ Informar Manualmente / Em Branco
                                     </button>
                                  </div>

                                  {solicitanteModo === 'membro' ? (
                                     <div className="space-y-3">
                                        <div className="space-y-1.5">
                                           <Label className="text-xs font-semibold">Escolha o Membro na Lista</Label>
                                           <Select 
                                              value={selectedMember?.id ? String(selectedMember.id) : "__none__"}
                                              onValueChange={(val) => {
                                                 if (val === "__none__") {
                                                    setSelectedMember(null);
                                                    setSearchTerm("");
                                                 } else {
                                                    const m = members.find(x => String(x.id) === val);
                                                    if (m) {
                                                       setSelectedMember(m);
                                                       setSearchTerm(m.nome || m.name || "");
                                                    }
                                                 }
                                              }}
                                           >
                                              <SelectTrigger className="bg-background h-9 text-xs">
                                                 <SelectValue placeholder="Selecione um membro da lista..." />
                                              </SelectTrigger>
                                              <SelectContent className="max-h-60">
                                                 <SelectItem value="__none__">-- Deixar em branco (Preencher à mão) --</SelectItem>
                                                 {members.map((m: any) => (
                                                    <SelectItem key={m.id || Math.random().toString()} value={String(m.id)}>
                                                       {m.nome || m.name || "Membro"} {m.role || m.cargo ? `(${m.role || m.cargo})` : ""} {m.cpf ? `• CPF: ${m.cpf}` : ""}
                                                    </SelectItem>
                                                 ))}
                                              </SelectContent>
                                           </Select>
                                        </div>

                                        <div className="space-y-1.5">
                                           <Label className="text-xs font-semibold text-muted-foreground">Ou busque por nome ou CPF</Label>
                                           <div className="relative">
                                              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                              <Input 
                                                 type="search" 
                                                 placeholder="Digite nome ou CPF para buscar..." 
                                                 className="pl-8 bg-background h-9 text-xs" 
                                                 value={searchTerm}
                                                 onChange={(e) => {
                                                    setSearchTerm(e.target.value);
                                                 }}
                                              />
                                           </div>
                                           {searchTerm && !selectedMember && (
                                              <div className="bg-popover text-popover-foreground border rounded-md shadow-lg p-1.5 max-h-48 overflow-auto text-xs">
                                                 {filteredMembers.length > 0 ? (
                                                    filteredMembers.map((m: any) => (
                                                       <div 
                                                          key={m.id} 
                                                          className="p-2 hover:bg-muted cursor-pointer rounded flex justify-between items-center"
                                                          onClick={() => {
                                                             setSelectedMember(m);
                                                             setSearchTerm(m.nome || m.name || "");
                                                          }}
                                                       >
                                                          <span className="font-medium text-foreground">{m.nome || m.name}</span>
                                                          <span className="text-[11px] text-muted-foreground">{m.cpf || "Sem CPF"}</span>
                                                       </div>
                                                    ))
                                                 ) : (
                                                    <div className="p-2 text-muted-foreground">Nenhum membro encontrado.</div>
                                                 )}
                                              </div>
                                           )}
                                        </div>

                                        {selectedMember && (
                                           <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                                              <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                                                 <Check className="h-4 w-4 text-emerald-600" />
                                                 <span>Membro Selecionado: {selectedMember.nome || selectedMember.name}</span>
                                              </div>
                                              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1">
                                                 <span><strong>CPF/Doc:</strong> {selectedMember.cpf || selectedMember.rg || "Não informado"}</span>
                                                 <span><strong>Data Batismo:</strong> {selectedMember.dataBatismo || selectedMember.baptismDate || "Não informado"}</span>
                                                 <span><strong>Cargo:</strong> {selectedMember.role || selectedMember.cargo || "Membro"}</span>
                                                 <span><strong>Status:</strong> {selectedMember.status || "Ativo"}</span>
                                              </div>
                                           </div>
                                        )}
                                     </div>
                                  ) : (
                                     <div className="space-y-3">
                                        <div className="space-y-1.5">
                                           <div className="flex items-center justify-between">
                                              <Label className="text-xs font-semibold">Nome do Solicitante / Membro</Label>
                                              <span className="text-[10px] text-muted-foreground">Deixe vazio para preencher à mão</span>
                                           </div>
                                           <Input 
                                              value={solicitanteManualNome}
                                              onChange={(e) => setSolicitanteManualNome(e.target.value)}
                                              placeholder="Ex: João da Silva (ou deixe vazio para linha manual)"
                                              className="bg-background h-9 text-xs"
                                           />
                                           <p className="text-[10px] text-muted-foreground">
                                              {solicitanteManualNome.trim() 
                                                 ? `Nome: "${solicitanteManualNome}"`
                                                 : "Deixando em branco, o documento gerará uma linha contínua (______) para preenchimento manual."}
                                           </p>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                           <div className="space-y-1.5">
                                              <Label className="text-xs font-semibold">Documento (RG ou CPF)</Label>
                                              <Input 
                                                 value={solicitanteManualDoc}
                                                 onChange={(e) => setSolicitanteManualDoc(e.target.value)}
                                                 placeholder="Ex: 12.345.678-9 ou deixe vazio"
                                                 className="bg-background h-9 text-xs"
                                              />
                                           </div>
                                           <div className="space-y-1.5">
                                              <Label className="text-xs font-semibold">Data do Batismo (se aplicável)</Label>
                                              <Input 
                                                 value={solicitanteManualBatismo}
                                                 onChange={(e) => setSolicitanteManualBatismo(e.target.value)}
                                                 placeholder="Ex: 15/03/2020 ou deixe vazio"
                                                 className="bg-background h-9 text-xs"
                                              />
                                           </div>
                                        </div>
                                     </div>
                                  )}

                                  <div className="pt-2 flex flex-col sm:flex-row gap-2">
                                     <Button className="flex-1" onClick={handlePrintDynamic}>
                                        <Printer className="mr-2 h-4 w-4"/> Visualizar & Imprimir Documento
                                     </Button>
                                     <Button variant="outline" onClick={handleDownloadDynamicPDF}>
                                        <Download className="mr-2 h-4 w-4 text-primary"/> Baixar PDF
                                     </Button>
                                  </div>
                               </div>

                               <div className="border rounded-md p-4 bg-white prose max-w-none text-sm opacity-70" dangerouslySetInnerHTML={{__html: currentTemplateContent}}></div>
                            </div>
                         )}
                      </div>
                   ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-4 py-20 border-2 border-dashed rounded-xl">
                         <FileText className="h-12 w-12 opacity-20" />
                         <p>Selecione um modelo ao lado ou crie um novo.</p>
                      </div>
                   )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Printable container mounted offscreen so html-to-image and window.print can capture it */}
          <div className="fixed -left-[9999px] top-0 pointer-events-none opacity-0 print:opacity-100 print:left-0 print:static print:pointer-events-auto">
             {renderDynamicDocument()}
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Emissões</CardTitle>
              <CardDescription>Registro de todos os formulários e documentos emitidos pelo sistema.</CardDescription>
            </CardHeader>
            <CardContent>
               {logs.length > 0 ? (
                 <div className="border rounded-md divide-y">
                   {logs.map(log => (
                     <div key={log.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                       <div className="flex items-center gap-4">
                         <div className="bg-primary/10 p-2 rounded-full">
                            <History className="h-5 w-5 text-primary" />
                         </div>
                         <div>
                            <p className="font-medium">{log.document}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                               <User className="h-3 w-3" /> Membro Referência: {log.member}
                            </p>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="text-sm font-medium">{new Date(log.date).toLocaleString('pt-BR')}</p>
                         <p className="text-xs text-muted-foreground">Emitido por: {log.user}</p>
                       </div>
                     </div>
                   ))}
                 </div>
               ) : (
                 <div className="text-center py-12 text-muted-foreground">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>Nenhuma emissão registrada ainda.</p>
                 </div>
               )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col print:hidden">
          <DialogHeader>
            <DialogTitle>Visualizar Impressão</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-gray-100 p-4 flex justify-center border rounded-md">
             <div className="scale-[0.8] origin-top">
                {previewType === 'standard' && formType === 'relatorio-culto' && renderRelatorioCulto()}
                {previewType === 'standard' && formType === 'recibo' && renderRecibo()}
                {previewType === 'standard' && formType === 'ficha-membro' && renderFichaMembro()}
                {previewType === 'standard' && formType === 'ficha-batismo' && renderFichaBatismo()}
                {previewType === 'standard' && formType === 'ficha-apresentacao' && renderFichaApresentacao()}
                {previewType === 'standard' && formType === 'ficha-reconciliacao' && renderFichaReconciliacao()}
                {previewType === 'standard' && formType === 'ficha-casamento' && renderFichaCasamento()}
                {previewType === 'standard' && formType === 'ficha-visitante' && renderFichaVisitante()}
                {previewType === 'standard' && (formType === 'ficha-cesta-basica' || formType === 'ficha-cesta-basica-analitica' || formType === 'ficha-cesta-basica-simples') && renderFichaCestaBasica()}
                {previewType === 'dynamic' && renderDynamicDocument()}
             </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t pt-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button 
                variant="secondary" 
                onClick={previewType === 'standard' ? handleDownloadStandardPDF : handleDownloadDynamicPDF}
                title="Caso deseje apenas baixar o arquivo PDF em vez de imprimir diretamente"
                className="w-full sm:w-auto"
              >
                <Download className="w-4 h-4 mr-2 text-primary" />
                Salvar em PDF
              </Button>
            </div>
            <Button 
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-md w-full sm:w-auto"
              onClick={previewType === 'standard' ? confirmPrintStandard : confirmPrintDynamic}
            >
              <Printer className="w-4 h-4 mr-2" />
              Confirmar Impressão (Escolher Impressora)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PrintDebugger 
        isOpen={showPrintDebugger} 
        onClose={() => setShowPrintDebugger(false)} 
        onForcePrint={() => {
           window.open('', '_blank')?.document.write('Pressione Ctrl+P (ou Cmd+P) para imprimir esta página.<br><br>Verifique se os bloqueadores de pop-up estão desativados.');
           toast.info("Tente imprimir usando o atalho de teclado na nova aba.");
        }} 
      />
    </div>
  )
}
