import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  Lightbulb, 
  ShieldCheck, 
  Users, 
  CreditCard, 
  FileText, 
  Printer, 
  HeartHandshake, 
  Package, 
  Truck, 
  Calendar, 
  Sliders, 
  Activity, 
  Sparkles, 
  Settings, 
  Palette, 
  HelpCircle, 
  CheckCircle2, 
  ArrowRight,
  Download,
  Building2,
  Check,
  Zap,
  Command,
  FileCheck,
  Compass,
  Droplet,
  Award,
  ClipboardList,
  UserCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { printDocument, downloadElementAsPdf } from '@/lib/printUtils';
import { toast } from 'sonner';

interface ModuloInfo {
  id: string;
  nome: string;
  categoria: string;
  icone: React.ComponentType<{ className?: string }>;
  rota: string;
  descricao: string;
  principaisFuncoes: string[];
  destaques: string;
}

interface PassoTutorial {
  passo: number;
  titulo: string;
  descricao: string;
  dica?: string;
}

interface TutorialGuia {
  id: string;
  titulo: string;
  categoria: string;
  icone: React.ComponentType<{ className?: string }>;
  descricao: string;
  tempoEstimado: string;
  passos: PassoTutorial[];
}

const modulosSistema: ModuloInfo[] = [
  {
    id: 'pastoral',
    nome: 'Área Exclusiva do Pastor',
    categoria: 'Pastoral',
    icone: ShieldCheck,
    rota: '/pastor',
    descricao: 'Gabinete pastoral para cuidado das ovelhas, histórico sigiloso de atendimentos, intercessão e fichas oficiais.',
    principaisFuncoes: [
      'Histórico confidencial de atendimentos, visitas e aconselhamentos pastorais sob sigilo ministerial',
      'Emissão e Impressão de Ficha de Acompanhamento Pastoral (em branco ou com dados do membro)',
      'Livro de Intercessão & Vitórias (pedidos de oração da igreja com registro de testemunhos)',
      'Roteiros e guias eclesiásticos para cerimônias, visitação hospitalar e Santa Ceia',
      'Acesso seguro protegido por permissão de administrador/pastor e PIN ministerial'
    ],
    destaques: 'Módulo confidencial separado do cadastro comum de membros para proteger o sigilo eclesiástico das conversas e orações.'
  },
  {
    id: 'dashboard',
    nome: 'Dashboard & Indicadores',
    categoria: 'Geral',
    icone: Sparkles,
    rota: '/',
    descricao: 'Painel central com visão panorâmica da igreja, saldo do mês, aniversariantes e atalhos rápidos.',
    principaisFuncoes: [
      'Balanço mensal consolidado de receitas e despesas em tempo real',
      'Gráficos dinâmicos de fluxo de caixa e arrecadação eclesiástica',
      'Lista dos aniversariantes do mês com botão para felicitação via WhatsApp',
      'Alternância imediata entre Sede Principal e Filiais pelo cabeçalho superior'
    ],
    destaques: 'Use o seletor de filial no topo para recalcular relatórios e estatísticas da congregação desejada.'
  },
  {
    id: 'secretaria',
    nome: 'Secretaria & Membresia',
    categoria: 'Eclesiástico',
    icone: Users,
    rota: '/secretaria',
    descricao: 'Gestão completa do rol de membros, novos convertidos, visitantes, carteirinhas oficiais, crachás e escalas.',
    principaisFuncoes: [
      'Ficha cadastral completa com foto 3x4, dados civis, batismo, filiação e endereço',
      'Geração de Carteirinhas de Membro em PDF/PNG com foto, QR Code e código de barras',
      'Emissão de Certificados de Batismo, Apresentação de Crianças e Cartas Pastorais',
      'Gestão de Escalas do Mural, Dirigentes, Músicos, Limpeza e Crachás de Voluntários',
      'Formulários Financeiros da Secretaria (Entradas, Saídas, Dizimistas & Fechamento A4)'
    ],
    destaques: 'Você pode filtrar membros por congregação/filial e exportar listas completas para PDF ou Excel.'
  },
  {
    id: 'formularios',
    nome: 'Formulários & Impressão Oficial',
    categoria: 'Documentos',
    icone: Printer,
    rota: '/formularios',
    descricao: 'Emissão oficial de recibos (preenchidos e blocos em branco), relatórios de culto, fichas de batismo e declarações dinâmicas.',
    principaisFuncoes: [
      'Recibo Oficial (3 por folha A4 com corte pontilhado) nos modos Preenchido ou Talão em Branco',
      'Ficha de Candidato ao Batismo nas Águas com bloco de Autorização dos Pais para Menores',
      'Fichas de Cesta Básica, Reconciliação, Visitas e Requerimento de Casamento Religioso',
      'Impressão física direta com escolha de impressora ou download de arquivo PDF oficial A4',
      'Declarações dinâmicas (Batismo, Transferência) com substituição automática de dados'
    ],
    destaques: 'Para emitir talões pautados para o tesoureiro preencher à caneta no templo, escolha o modo "Bloco em Branco".'
  },
  {
    id: 'financeiro',
    nome: 'Financeiro & Tesouraria',
    categoria: 'Finanças',
    icone: CreditCard,
    rota: '/financeiro',
    descricao: 'Controle de entradas (dízimos e ofertas), despesas com comprovantes, fechamento mensal e relatórios fiscais.',
    principaisFuncoes: [
      'Lançamento de Dízimos identificando o membro dizimista para histórico individual',
      'Registro de Ofertas de culto, campanhas de missões e doações especiais',
      'Controle rigoroso de Saídas e despesas categorizadas por fornecedor',
      'Demonstrativo do fechamento mensal para prestação de contas ao Conselho Fiscal'
    ],
    destaques: 'Secretários e tesoureiros têm níveis de permissão diferentes para proteger os registros contábeis.'
  },
  {
    id: 'servico-social',
    nome: 'Serviço Social & Cestas Básicas',
    categoria: 'Assistência',
    icone: HeartHandshake,
    rota: '/servico-social',
    descricao: 'Cadastro de famílias assistidas pela igreja, controle de doações de alimentos e fichas de acompanhamento.',
    principaisFuncoes: [
      'Cadastro de famílias em vulnerabilidade socioeconômica',
      'Controle de entregas de Cestas Básicas com histórico individual de doações',
      'Emissão de Fichas de Atendimento (Analítica completa ou Simplificada)',
      'Relatórios de impacto social e assistência comunitária'
    ],
    destaques: 'As fichas de atendimento podem ser impressas diretamente no módulo de Formulários.'
  },
  {
    id: 'patrimonio',
    nome: 'Patrimônio & Bens Eclesiásticos',
    categoria: 'Gestão',
    icone: Package,
    rota: '/patrimonio',
    descricao: 'Inventário e tombamento de todos os bens materiais da igreja (som, instrumentos, móveis, veículos e imóveis).',
    principaisFuncoes: [
      'Registro patrimonial com número de tombamento e número de série',
      'Vinculação do bem à congregação e departamento correspondente',
      'Controle de estado de conservação (Novo, Bom, Regular, Danificado)',
      'Emissão de termos de responsabilidade e inventário consolidado'
    ],
    destaques: 'Mantenha os instrumentos e equipamentos de som sempre tombados para controle e seguro.'
  },
  {
    id: 'fornecedores',
    nome: 'Fornecedores & Prestadores',
    categoria: 'Finanças',
    icone: Truck,
    rota: '/fornecedores',
    descricao: 'Cadastro de empresas parceiras, prestadores de serviços, credores e dados bancários/PIX para pagamentos.',
    principaisFuncoes: [
      'Cadastro completo de fornecedores com CNPJ, Razão Social e Contato',
      'Chave PIX e dados bancários salvos para facilitar a tesouraria',
      'Histórico de pagamentos vinculados ao módulo Financeiro',
      'Classificação por categoria (Manutenção, Som, Construção, Serviços)'
    ],
    destaques: 'Ao lançar uma despesa no Financeiro, selecione o fornecedor cadastrado para rastrear gastos.'
  },
  {
    id: 'agenda',
    nome: 'Agenda & Escalas de Culto',
    categoria: 'Geral',
    icone: Calendar,
    rota: '/agenda',
    descricao: 'Calendário unificado da igreja, eventos eclesiásticos, escalas de pregadores, louvor e departamentos.',
    principaisFuncoes: [
      'Calendário mensal com cultos regulares e eventos especiais',
      'Escalas de obreiros, grupos de louvor e equipes de recepção',
      'Alertas de eventos comemorativos (Santa Ceia, Batismo, Vigílias)',
      'Organização por departamentos e congregações'
    ],
    destaques: 'Evite conflitos de horário entre eventos dos departamentos acompanhando a agenda geral.'
  },
  {
    id: 'parametros',
    nome: 'Parâmetros & Eclesiástico',
    categoria: 'Configuração',
    icone: Sliders,
    rota: '/parametros',
    descricao: 'Configuração estrutural da igreja: departamentos, cargos eclesiásticos, ministérios e categorias contábeis.',
    principaisFuncoes: [
      'Cadastro de Departamentos (Jovens, Mulheres, Crianças, Varões, Missões)',
      'Cargos Eclesiásticos (Pastor, Evangelista, Presbítero, Diácono, Cooperador)',
      'Categorias financeiras personalizadas para receitas e despesas',
      'Adequação de títulos e terminologias da denominação'
    ],
    destaques: 'Os cargos e departamentos definidos aqui ficam disponíveis automaticamente na Secretaria.'
  },
  {
    id: 'automacoes',
    nome: 'Automações & Comunicação',
    categoria: 'Comunicação',
    icone: Activity,
    rota: '/automacoes',
    descricao: 'Disparos automáticos de felicitações, lembretes de contas e avisos de cultos para a irmandade.',
    principaisFuncoes: [
      'Mensagens automáticas de Feliz Aniversário para membros cadastrados',
      'Avisos de contas a pagar prestes a vencer para a tesouraria',
      'Lembretes de reuniões de liderança e ensaios dos grupos',
      'Modelos prontos para cópia rápida e envio por WhatsApp'
    ],
    destaques: 'Economize tempo da equipe pastoral com lembretes automáticos e felicitações carinhosas.'
  },
  {
    id: 'auditoria',
    nome: 'Auditoria & Logs de Segurança',
    categoria: 'Segurança',
    icone: ShieldCheck,
    rota: '/auditoria',
    descricao: 'Rastreamento completo e inviolável de todas as ações no sistema, emissões de recibos e movimentações.',
    principaisFuncoes: [
      'Registro de quem emitiu cada formulário, recibo ou relatório com data e hora',
      'Log de alterações cadastrais e lançamentos financeiros',
      'Rastreabilidade total para prestação de contas ao Conselho Fiscal',
      'Filtros por usuário, módulo, data e tipo de ação'
    ],
    destaques: 'Toda impressão e exportação em PDF gera registro imediato nos logs de emissão.'
  },
  {
    id: 'configuracoes',
    nome: 'Configurações & Filiais',
    categoria: 'Configuração',
    icone: Settings,
    rota: '/configuracoes',
    descricao: 'Dados oficiais da Igreja Sede, congregações vinculadas, logotipo oficial, assinaturas da liderança e usuários.',
    principaisFuncoes: [
      'Cadastro de CNPJ, endereço completo, telefone e e-mail da igreja',
      'Upload da Logo Oficial que estampa todos os formulários e cabeçalhos',
      'Cadastro e gerenciamento de Congregações / Filiais filiadas',
      'Assinaturas digitalizadas da liderança (Pastor, Tesoureiro, Secretário)',
      'Gestão de Usuários, perfis de acesso e controle de senhas'
    ],
    destaques: 'Cadastre a assinatura do pastor e do tesoureiro para que saiam automaticamente nos formulários e certificados.'
  },
  {
    id: 'paletas-cores',
    nome: 'Paletas de Cores & Visual',
    categoria: 'Visual',
    icone: Palette,
    rota: '/paletas-cores',
    descricao: 'Personalização do tema do sistema, cores institucionais e alternância entre Modo Claro e Modo Escuro.',
    principaisFuncoes: [
      'Escolha da cor primária do sistema alinhada à identidade da igreja',
      'Alternância imediata entre Modo Claro (Light) e Modo Escuro (Dark)',
      'Ajustes de contraste e densidade visual para melhor legibilidade',
      'Preferências salvas localmente para cada dispositivo'
    ],
    destaques: 'O modo escuro reduz o cansaço visual durante o fechamento de cultos à noite.'
  }
];

const tutoriaisPassoAPasso: TutorialGuia[] = [
  {
    id: 'tutorial-membros',
    titulo: 'Como Cadastrar Membros, Gerar Carteirinhas e Emitir Fichas A4',
    categoria: 'Secretaria',
    icone: Users,
    descricao: 'Aprenda o ciclo completo de cadastro de um novo membro na igreja, desde a coleta de dados civis até a emissão da carteirinha com QR Code.',
    tempoEstimado: '3 min',
    passos: [
      {
        passo: 1,
        titulo: 'Acessar o Módulo Secretaria',
        descricao: 'Clique em "Secretaria" no menu lateral. Verifique no topo da tela se está selecionada a congregação correta (Sede ou Filial).',
        dica: 'Apenas usuários da Sede podem alterar a congregação do membro no formulário.'
      },
      {
        passo: 2,
        titulo: 'Clicar em "+ Novo Membro"',
        descricao: 'Preencha o Nome Completo, CPF, Data de Nascimento, Cargo Eclesiástico, Data de Batismo e Endereço Residencial.',
        dica: 'Faça upload da foto 3x4 do membro para que ela apareça na carteirinha e nos documentos.'
      },
      {
        passo: 3,
        titulo: 'Gerar Carteirinha de Membro',
        descricao: 'Na lista de membros, clique no ícone de Impressão/Relatórios ou na aba "Carteirinhas". Escolha as cores da frente e do verso.',
        dica: 'A carteirinha traz QR Code de validação e código de barras por CPF/Matrícula.'
      },
      {
        passo: 4,
        titulo: 'Emitir Ficha de Cadastro em A4',
        descricao: 'Clique no botão de Ficha do membro para visualizar a folha cadastral completa pronta para arquivo físico e assinatura.'
      }
    ]
  },
  {
    id: 'tutorial-batismo',
    titulo: 'Como Inscrever Candidatos ao Batismo e Registrar Autorização de Menores',
    categoria: 'Discipulado',
    icone: Droplet,
    descricao: 'Passo a passo para matricular novos convertidos no curso de batismo, registrar consentimento dos pais quando menor de idade e emitir a ficha oficial.',
    tempoEstimado: '4 min',
    passos: [
      {
        passo: 1,
        titulo: 'Abrir a Ficha de Batismo',
        descricao: 'Acesse "Formulários > Ficha de Batismo" ou abra o modal de Batismo na Secretaria.',
        dica: 'Você pode selecionar um membro pré-cadastrado ou digitar um novo candidato.'
      },
      {
        passo: 2,
        titulo: 'Preencher Dados do Candidato & Discipulado',
        descricao: 'Informe a Data de Conversão, Nome do Discipulador/Instrutor e Turma de Estudo Bíblico.',
      },
      {
        passo: 3,
        titulo: 'Registrar Autorização dos Pais (Caso Menor < 18 Anos)',
        descricao: 'Ao inserir a data de nascimento de candidato menor de 18 anos, marque a opção "Candidato Menor de Idade". Preencha o Nome do Pai/Mãe ou Tutor, Grau de Parentesco e CPF/RG do Responsável.',
        dica: 'A ficha emite um termo de consentimento específico e cria uma linha para a assinatura do pai/mãe.'
      },
      {
        passo: 4,
        titulo: 'Imprimir Ficha Oficial de Batismo A4',
        descricao: 'Clique em "Visualizar Ficha A4" e selecione "Confirmar Impressão" ou "Baixar PDF Oficial".'
      }
    ]
  },
  {
    id: 'tutorial-recibos',
    titulo: 'Como Emitir Recibos Oficiais e Talões em Branco A4',
    categoria: 'Tesouraria',
    icone: Printer,
    descricao: 'Como emitir recibos com 3 vias por folha A4 com corte pontilhado, ou gerar talões em branco pautados para preenchimento manual.',
    tempoEstimado: '2 min',
    passos: [
      {
        passo: 1,
        titulo: 'Acessar "Formulários > Recibo"',
        descricao: 'Escolha a quantidade de cópias que deseja imprimir (1 folha = 3 recibos pautados).',
      },
      {
        passo: 2,
        titulo: 'Escolher entre "Preenchido no Sistema" ou "Bloco em Branco"',
        descricao: 'Para recibos imediatos com valor por extenso automático e nome do favorecido, use "Preenchido". Para blocos para o tesoureiro usar no culto, use "Bloco em Branco".',
        dica: 'O valor por extenso é escrito automaticamente ao digitar o número em R$.'
      },
      {
        passo: 3,
        titulo: 'Conferir Assinaturas & Vias',
        descricao: 'O recibo inclui espaço de assinatura para o favorecido (com CPF) e para o tesoureiro responsável.',
      },
      {
        passo: 4,
        titulo: 'Imprimir ou Baixar PDF',
        descricao: 'Clique em "Confirmar Impressão" para enviar direto à sua impressora física ou "Baixar PDF" para salvar no computador.'
      }
    ]
  },
  {
    id: 'tutorial-caixa',
    titulo: 'Como Lançar Dízimos, Ofertas e Gerar o Fechamento Mensal de Caixa',
    categoria: 'Finanças',
    icone: CreditCard,
    descricao: 'Aprenda a lançar entradas de culto, doações e realizar a prestação de contas mensal da tesouraria.',
    tempoEstimado: '5 min',
    passos: [
      {
        passo: 1,
        titulo: 'Lançar Dízimos e Ofertas no Financeiro',
        descricao: 'Acesse "Financeiro > Nova Transação". Escolha "Entrada", selecione a categoria (Dízimo ou Oferta de Culto) e indique o nome do dizimista para o histórico.',
      },
      {
        passo: 2,
        titulo: 'Registrar Saídas e Despesas',
        descricao: 'Lance as contas pagas selecionando a categoria (Água, Luz, Aluguel, Missões) e o Fornecedor cadastrado.',
        dica: 'Anexe fotos ou PDFs dos comprovantes e cupons fiscais para auditoria.'
      },
      {
        passo: 3,
        titulo: 'Gerar Formulário de Fechamento do Caixa (Anexo 4)',
        descricao: 'No módulo Secretaria ou Formulários, abra o "Formulário de Fechamento do Caixa". O documento exibe: Saldo Anterior, Entradas do Mês, Saídas do Mês e Saldo que passa para o próximo mês em fundo branco destacado.',
      },
      {
        passo: 4,
        titulo: 'Colher Assinaturas do Tesoureiro e Pastor',
        descricao: 'Imprima o balancete em A4 Retrato para colher o visto da Tesouraria e a aprovação do Pastor Titular.'
      }
    ]
  },
  {
    id: 'tutorial-escalas',
    titulo: 'Como Montar Escalas do Mural, Dirigentes, Músicos e Limpeza',
    categoria: 'Mural & Escalas',
    icone: ClipboardList,
    descricao: 'Saiba como organizar a escala mensal de voluntários da diaconia, dirigentes de culto, instrumentistas e equipes de zeladoria.',
    tempoEstimado: '3 min',
    passos: [
      {
        passo: 1,
        titulo: 'Acessar Secretaria > Quadro "Escalas da Igreja"',
        descricao: 'Selecione a escala desejada: Escala do Mural, Escala Dirigentes, Escala de Músicos ou Escala de Limpeza.',
      },
      {
        passo: 2,
        titulo: 'Adicionar Dias, Cultos e Voluntários Escalados',
        descricao: 'Indique a data do culto, dia da semana, dirigente, pregador, obreiros da recepção e ministério de louvor.',
      },
      {
        passo: 3,
        titulo: 'Imprimir para o Mural do Templo',
        descricao: 'Clique no botão "Imprimir Folha A4 do Mural". O sistema formata a escala em tabela limpa de alta visibilidade.',
        dica: 'A escala pode ser afixada no quadro de avisos do templo ou enviada nos grupos de WhatsApp.'
      }
    ]
  },
  {
    id: 'tutorial-pastoral',
    titulo: 'Como Utilizar o Gabinete Pastoral Confidencial',
    categoria: 'Pastoral',
    icone: ShieldCheck,
    descricao: 'Orientações para o Pastor Presidente utilizar a área confidencial de acompanhamento das ovelhas sob sigilo eclesiástico.',
    tempoEstimado: '3 min',
    passos: [
      {
        passo: 1,
        titulo: 'Acessar a Área do Pastor',
        descricao: 'Clique em "Área Exclusiva do Pastor" no menu lateral. Caso configurado, insira seu PIN ministerial de acesso.',
      },
      {
        passo: 2,
        titulo: 'Registrar Atendimento Espiritual / Visita',
        descricao: 'Abra um novo registro de atendimento informando o nome do membro, motivo do conselho, orientações bíblicas e status da situação.',
        dica: 'Este histórico é totalmente protegido e não aparece na secretaria administrativa comum.'
      },
      {
        passo: 3,
        titulo: 'Emitir Ficha de Acompanhamento Pastoral A4',
        descricao: 'Imprima fichas de visita em branco para levar na pasta ou fichas preenchidas para arquivo permanente.'
      }
    ]
  }
];

export function Ajuda() {
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');
  const [tabAtiva, setTabAtiva] = useState<'tutoriais' | 'modulos' | 'faq' | 'atalhos'>('tutoriais');

  const categorias = ['Todas', 'Pastoral', 'Documentos', 'Finanças', 'Eclesiástico', 'Assistência', 'Gestão', 'Configuração', 'Segurança'];

  const modulosFiltrados = modulosSistema.filter(mod => {
    const matchCategoria = categoriaAtiva === 'Todas' || mod.categoria === categoriaAtiva;
    const matchBusca = 
      mod.nome.toLowerCase().includes(busca.toLowerCase()) ||
      mod.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      mod.principaisFuncoes.some(f => f.toLowerCase().includes(busca.toLowerCase())) ||
      mod.destaques.toLowerCase().includes(busca.toLowerCase());
    return matchCategoria && matchBusca;
  });

  const tutoriaisFiltrados = tutoriaisPassoAPasso.filter(tut => {
    const matchBusca = 
      tut.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      tut.descricao.toLowerCase().includes(busca.toLowerCase()) ||
      tut.passos.some(p => p.titulo.toLowerCase().includes(busca.toLowerCase()) || p.descricao.toLowerCase().includes(busca.toLowerCase()));
    return matchBusca;
  });

  const handleImprimirManualPDF = () => {
    toast.info("Preparando Manual do Usuário em PDF A4...");
    printDocument(
      {
        elementId: 'manual-usuario-print-area',
        title: 'Manual_do_Usuario_Sistema_Eclesiastico_OBPC'
      },
      () => toast.success("Manual impresso / baixado com sucesso!")
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
      className="space-y-8 max-w-6xl mx-auto pb-12 font-sans"
    >
      {/* Cabeçalho Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-xs shrink-0">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                Central de Ajuda, Tutoriais & Manual do Usuário
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Aprenda passo a passo como operar o Sistema Eclesiástico OBPC para Secretaria, Tesouraria e Gabinete Pastoral.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            onClick={handleImprimirManualPDF} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-3.5 shadow-xs"
          >
            <Printer className="w-4 h-4 mr-1.5" />
            Imprimir Manual em PDF (A4)
          </Button>

          <Badge variant="outline" className="px-3 py-1 text-xs font-semibold bg-primary/5 text-primary border-primary/20">
            {modulosSistema.length} Módulos Integrados
          </Badge>
        </div>
      </div>

      {/* Cartões Rápidos de Boas Práticas e Dicas de Ouro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-primary font-bold">
              <Lightbulb className="h-4 w-4" /> Dica 1: Seleção de Congregação
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Sempre selecione no topo da tela a <strong>Congregação / Filial</strong> correta antes de lançar membros ou finanças. O sistema isola e calcula relatórios com precisão para cada sede e filiais.
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <Printer className="h-4 w-4" /> Dica 2: Impressão Directa vs PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Todos os documentos (recibos, fichas de batismo, cartas e carteirinhas) têm botão para <strong>Imprimir em Impressora Física</strong> ou <strong>Baixar PDF Oficial A4</strong> de alta resolução.
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-sky-500/5 to-sky-500/10 border-sky-500/20 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold">
              <ShieldCheck className="h-4 w-4" /> Dica 3: Segurança & Rastreio
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Todas as emissões de formulários, alterações de cadastros e lançamentos financeiros ficam gravadas com operador, data e hora no módulo de <strong>Auditoria</strong> para prestação de contas.
          </CardContent>
        </Card>
      </div>

      {/* Barra de Pesquisa */}
      <div className="space-y-4">
        <div className="relative flex-1 max-w-2xl mx-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Pesquisar dúvida, passo a passo, módulo ou recurso (ex: batismo menor, recibo, dizimo, carteirinha)..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-11 h-12 bg-background shadow-xs text-sm rounded-xl"
          />
          {busca && (
            <button 
              onClick={() => setBusca('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold px-2 py-1 bg-muted rounded-md"
            >
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Navegação por Abas Principais: Tutoriais, Módulos, FAQ e Atalhos */}
      <Tabs value={tabAtiva} onValueChange={(val: any) => setTabAtiva(val)} className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-muted/60 border rounded-xl">
          <TabsTrigger value="tutoriais" className="text-xs font-bold py-2.5 flex items-center justify-center gap-2">
            <Compass className="w-4 h-4 text-primary" />
            Guias Passo a Passo
          </TabsTrigger>
          <TabsTrigger value="modulos" className="text-xs font-bold py-2.5 flex items-center justify-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            Módulos do Sistema ({modulosFiltrados.length})
          </TabsTrigger>
          <TabsTrigger value="faq" className="text-xs font-bold py-2.5 flex items-center justify-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            Perguntas Frequentes
          </TabsTrigger>
          <TabsTrigger value="atalhos" className="text-xs font-bold py-2.5 flex items-center justify-center gap-2">
            <Zap className="w-4 h-4 text-purple-600" />
            Atalhos & Dicas
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: GUIAS DE PASSO A PASSO (TUTORIAIS ILUSTRADOS) */}
        <TabsContent value="tutoriais" className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" /> Tutoriais e Rotinas Práticas da Igreja
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Siga os passos numerados para executar as tarefas mais frequentes da secretaria e tesouraria.
              </p>
            </div>
            <Badge variant="outline" className="text-xs bg-primary/5 text-primary font-bold">
              {tutoriaisFiltrados.length} Guia(s) Disponível(is)
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tutoriaisFiltrados.map((tut) => {
              const Icon = tut.icone;
              return (
                <Card key={tut.id} className="border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between">
                  <CardHeader className="pb-3 border-b bg-muted/20">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold text-foreground">{tut.titulo}</CardTitle>
                          <span className="text-[10px] font-semibold text-muted-foreground">{tut.categoria} • Tempo médio: {tut.tempoEstimado}</span>
                        </div>
                      </div>
                    </div>
                    <CardDescription className="text-xs mt-2 leading-relaxed">
                      {tut.descricao}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      {tut.passos.map((p) => (
                        <div key={p.passo} className="flex items-start gap-3 p-2.5 rounded-lg bg-background border text-xs">
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground font-black flex items-center justify-center text-xs shrink-0 shadow-xs mt-0.5">
                            {p.passo}
                          </div>
                          <div className="space-y-0.5 flex-1">
                            <h4 className="font-bold text-foreground text-xs">{p.titulo}</h4>
                            <p className="text-muted-foreground text-[11px] leading-relaxed">{p.descricao}</p>
                            {p.dica && (
                              <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium italic mt-1 bg-amber-50 dark:bg-amber-950/30 p-1.5 rounded border border-amber-200/60">
                                💡 Dica: {p.dica}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ABA 2: MÓDULOS DO SISTEMA */}
        <TabsContent value="modulos" className="space-y-6 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" /> Todos os Módulos do Sistema ({modulosFiltrados.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Explore cada recurso e clique em "Acessar Módulo" para navegação direta.
              </p>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {categorias.map(cat => (
                <Button
                  key={cat}
                  type="button"
                  variant={categoriaAtiva === cat ? "default" : "outline"}
                  size="sm"
                  className="h-8 text-xs font-semibold px-3 whitespace-nowrap rounded-lg"
                  onClick={() => setCategoriaAtiva(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {modulosFiltrados.map((mod) => {
              const Icon = mod.icone;
              return (
                <Card key={mod.id} className="flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wider">
                        {mod.categoria}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold mt-2 text-foreground">
                      {mod.nome}
                    </CardTitle>
                    <CardDescription className="text-xs leading-relaxed line-clamp-2">
                      {mod.descricao}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5 border-t pt-2.5">
                      <span className="text-[11px] font-bold text-foreground/80 uppercase tracking-wider">
                        Recursos Principais:
                      </span>
                      <ul className="space-y-1">
                        {mod.principaisFuncoes.slice(0, 3).map((f, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5 leading-snug">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-muted/50 p-2.5 rounded-lg border text-[11px] text-muted-foreground mt-2">
                      <strong className="text-foreground">Dica:</strong> {mod.destaques}
                    </div>

                    <div className="pt-2">
                      <Link to={mod.rota} className="w-full">
                        <Button variant="outline" size="sm" className="w-full text-xs font-semibold hover:bg-primary hover:text-primary-foreground group">
                          <span>Acessar {mod.nome.split('&')[0].trim()}</span>
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ABA 3: PERGUNTAS FREQUENTES (FAQ) */}
        <TabsContent value="faq" className="space-y-4 pt-4">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-amber-600" /> Perguntas Frequentes & Respostas Detalhadas
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tire dúvidas operacionais sobre batismo, autorização de menor, recibos A4 e fechamento contábil.
            </p>
          </div>

          <Accordion className="w-full space-y-3">
            {/* Batismo de Menor de Idade */}
            <AccordionItem value="faq-batismo-menor" className="border rounded-xl px-4 bg-card shadow-xs">
              <AccordionTrigger className="text-sm font-semibold hover:text-primary">
                <span className="flex items-center gap-2 text-left">
                  <Droplet className="h-4 w-4 text-sky-600 shrink-0" />
                  Como funciona a opção de Candidato Menor de Idade e Autorização dos Pais no Batismo?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-2 border-t">
                <p>
                  No formulário de <strong>Candidato ao Batismo nas Águas</strong> (na Secretaria ou Formulários), ao informar a data de nascimento de um candidato com menos de 18 anos, a opção <strong>"Candidato Menor de Idade"</strong> é ativada automaticamente.
                </p>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200 space-y-1">
                  <strong>Campos do Termo de Consentimento para Menores:</strong>
                  <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                    <li>Nome Completo do Responsável Legal (Pai, Mãe ou Tutor).</li>
                    <li>Grau de Parentesco e Documento de Identidade (CPF/RG do responsável).</li>
                    <li>Termo de Autorização expressa para estudos bíblicos e descida às águas batismais.</li>
                    <li>Na impressão da Ficha A4, é gerada uma linha exclusiva de assinatura para o Pai/Mãe/Responsável.</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Recibos */}
            <AccordionItem value="faq-recibos" className="border rounded-xl px-4 bg-card shadow-xs">
              <AccordionTrigger className="text-sm font-semibold hover:text-primary">
                <span className="flex items-center gap-2 text-left">
                  <Printer className="h-4 w-4 text-primary shrink-0" />
                  Como emitir Recibos Oficiais (Preenchidos vs Bloco em Branco para o Tesoureiro)?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-2 border-t">
                <p>
                  No módulo <strong>Formulários &gt; Recibo</strong>, o sistema imprime uma folha padrão com <strong>3 recibos oficiais por página A4</strong> com marcações pontilhadas de recorte.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border">
                  <div>
                    <strong className="text-foreground block mb-1">✍️ Modo Preenchido no Sistema:</strong>
                    Preencha o valor em R$ (o sistema escreve o valor por extenso automaticamente), selecione o membro beneficiário ou digite o nome e CPF, e defina a finalidade da oferta.
                  </div>
                  <div>
                    <strong className="text-foreground block mb-1">📄 Modo Bloco em Branco (Manual):</strong>
                    Gera a folha oficial com todos os dados da Igreja Brasil Para Cristo e CNPJ, mantendo os campos de Valor, Extenso, Beneficiário, Referente e Data limpos para que o tesoureiro preencha à mão no templo.
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Área Pastoral */}
            <AccordionItem value="faq-area-pastoral" className="border rounded-xl px-4 bg-card shadow-xs">
              <AccordionTrigger className="text-sm font-semibold hover:text-primary">
                <span className="flex items-center gap-2 text-left">
                  <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
                  Como funciona a Área Exclusiva do Pastor e a Ficha de Acompanhamento Pastoral?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-2 border-t">
                <p>
                  A <strong>Área Exclusiva do Pastor</strong> é o gabinete ministerial digital sob estrito sigilo eclesiástico. Nele o pastor registra atendimentos espirituais, visitas aos lares e pedidos no Livro de Intercessão.
                </p>
              </AccordionContent>
            </AccordionItem>

            {/* Impressora vs PDF */}
            <AccordionItem value="faq-impressao-pdf" className="border rounded-xl px-4 bg-card shadow-xs">
              <AccordionTrigger className="text-sm font-semibold hover:text-primary">
                <span className="flex items-center gap-2 text-left">
                  <Printer className="h-4 w-4 text-emerald-600 shrink-0" />
                  Como funciona a Escolha de Impressora Física vs Download em PDF?
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-2 border-t">
                <p>
                  O sistema oferece dois botões complementares em todos os formulários e documentos:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <strong>Confirmar Impressão (Escolher Impressora):</strong> Abre imediatamente a janela nativa para você selecionar a sua impressora física instalada (HP, Epson, Brother, Canon).
                  </li>
                  <li>
                    <strong>Baixar PDF Oficial:</strong> Gera e baixa um arquivo PDF de alta definição formatado estritamente em A4, ideal para arquivar na nuvem ou enviar pelo WhatsApp.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </TabsContent>

        {/* ABA 4: ATALHOS & DICAS DE PRODUTIVIDADE */}
        <TabsContent value="atalhos" className="space-y-4 pt-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" /> Atalhos de Teclado & Dicas de Agilidade
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ganhe velocidade nas rotinas diárias do templo com teclas de atalho e comandos diretos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Command className="w-4 h-4 text-purple-600" /> Atalhos Globais no Teclado
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2.5">
                <div className="flex items-center justify-between p-2 rounded bg-muted/40 border">
                  <span>Buscar membro ou transação na tela</span>
                  <kbd className="px-2 py-1 bg-background border rounded font-mono text-[11px] font-bold shadow-2xs">Ctrl + F</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/40 border">
                  <span>Imprimir relatório ou formulário aberto</span>
                  <kbd className="px-2 py-1 bg-background border rounded font-mono text-[11px] font-bold shadow-2xs">Ctrl + P</kbd>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-muted/40 border">
                  <span>Fechar janelas modais / diálogos</span>
                  <kbd className="px-2 py-1 bg-background border rounded font-mono text-[11px] font-bold shadow-2xs">Esc</kbd>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-600">
                  <FileCheck className="w-4 h-4" /> Dicas de Impressão A4
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-muted-foreground leading-relaxed">
                <p>
                  • <strong>Margens da Impressora:</strong> Nas configurações de impressão do navegador, defina margens como <em>"Padrão"</em> ou <em>"Nenhuma"</em> e desative o cabeçalho/rodapé do navegador para impressão 100% limpa.
                </p>
                <p>
                  • <strong>Papel Recomendado:</strong> Para carteirinhas e crachás, recomendamos papel fotográfico fosco 180g ou PVC laminado. Para recibos e relatórios, use papel offset sulfite A4 75g ou 90g.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ÁREA OCULTA APENAS PARA IMPRESSÃO DO MANUAL DO USUÁRIO COMPLETO */}
      <div className="hidden">
        <div id="manual-usuario-print-area" className="p-8 bg-white text-slate-950 font-sans leading-relaxed text-xs">
          <div className="border-b-2 border-slate-900 pb-4 mb-6 text-center">
            <h1 className="text-lg font-black uppercase text-slate-950">IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO</h1>
            <p className="text-xs font-bold text-slate-700">MANUAL PRÁTICO DO USUÁRIO & GUIA OPERACIONAL DOS MÓDULOS</p>
            <p className="text-[10px] text-slate-500 font-mono mt-1">Secretaria Geral • Tesouraria • Gabinete Pastoral</p>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-black uppercase border-b border-slate-900 pb-1 mb-2 text-slate-900">1. VISÃO GERAL DO SISTEMA</h2>
              <p className="mb-2">
                O Sistema Eclesiástico OBPC foi projetado para gestão integral de membros, controle contábil transparente, emissão de documentos oficiais A4, carteirinhas PVC e acompanhamento pastoral sigiloso.
              </p>
            </div>

            <div>
              <h2 className="text-sm font-black uppercase border-b border-slate-900 pb-1 mb-2 text-slate-900">2. ROTINAS DA SECRETARIA E MEMBRESIA</h2>
              <p className="mb-1"><strong>A. Cadastro de Membros:</strong> Registrar dados civis, foto 3x4, batismo e endereço. Apenas a Igreja Sede tem permissão para alterar a filial vinculada do membro.</p>
              <p className="mb-1"><strong>B. Candidatos ao Batismo:</strong> Cadastrar novos convertidos, indicar discipulador e, para candidatos menores de 18 anos, registrar o termo de autorização dos pais e assinar a ficha A4.</p>
              <p className="mb-1"><strong>C. Carteirinhas Oficiais:</strong> Impressão de carteirinhas com foto, QR Code de validação e código de barras.</p>
            </div>

            <div>
              <h2 className="text-sm font-black uppercase border-b border-slate-900 pb-1 mb-2 text-slate-900">3. ROTINAS DA TESOURARIA E FINANCEIRO</h2>
              <p className="mb-1"><strong>A. Lançamento de Entradas:</strong> Registrar Dízimos associando o membro e Ofertas por culto/campanha.</p>
              <p className="mb-1"><strong>B. Emissão de Recibos A4:</strong> Emitir folhas com 3 recibos por página nos modos "Preenchido" ou "Bloco em Branco" para talão físico.</p>
              <p className="mb-1"><strong>C. Fechamento do Caixa Mensal:</strong> Gerar o balancete A4 exibindo Saldo Anterior, Entradas, Saídas e Saldo do Próximo Mês em fundo destacado com visto do tesoureiro e pastor.</p>
            </div>

            <div className="pt-8 border-t border-slate-900 text-center text-[10px] font-bold text-slate-600">
              Manual de Instruções de Uso Interno Eclesiástico • Emitido em {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé Informativo */}
      <div className="p-6 rounded-2xl bg-muted/40 border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <HelpCircle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-foreground">Precisa de suporte adicional ou personalização?</h4>
            <p className="text-xs text-muted-foreground">
              A equipe da Secretaria e Diretoria Geral pode atualizar parâmetros e permissões em Configurações.
            </p>
          </div>
        </div>

        <Link to="/configuracoes">
          <Button variant="outline" size="sm" className="text-xs font-semibold whitespace-nowrap">
            <Settings className="mr-1.5 h-3.5 w-3.5" /> Acessar Configurações
          </Button>
        </Link>
      </div>
    </motion.div>
  );
}
