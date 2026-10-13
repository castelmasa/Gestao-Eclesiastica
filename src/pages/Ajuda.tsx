import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';

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
      'Balanço mensal consolidado de receitas e despesas',
      'Gráficos dinâmicos de fluxo de caixa e arrecadação',
      'Lista dos aniversariantes do mês com botão para WhatsApp',
      'Alternância imediata entre Sede Principal e Filiais pelo topo'
    ],
    destaques: 'Use o seletor de filial no cabeçalho superior para filtrar todos os números em tempo real.'
  },
  {
    id: 'formularios',
    nome: 'Formulários & Impressão Oficial',
    categoria: 'Documentos',
    icone: Printer,
    rota: '/formularios',
    descricao: 'Emissão oficial de recibos (preenchidos e blocos em branco), relatórios de culto, fichas de membros e declarações dinâmicas.',
    principaisFuncoes: [
      'Recibo Oficial (3 por folha A4 com corte pontilhado) com modos Preenchido ou Bloco em Branco',
      'Legendas circuladas em campos separados para "Beneficiário/Favorecido" e "Referente"',
      'Campos de assinatura com CPF da pessoa beneficiada e do tesoureiro',
      'Impressão física direta com escolha de impressora ou download em PDF oficial',
      'Declarações dinâmicas (Batismo, Transferência) com substituição automática de dados'
    ],
    destaques: 'Para emitir talões para o tesoureiro preencher à caneta, selecione o modo "Bloco em Branco".'
  },
  {
    id: 'secretaria',
    nome: 'Secretaria & Membresia',
    categoria: 'Eclesiástico',
    icone: Users,
    rota: '/secretaria',
    descricao: 'Gestão completa do rol de membros, novos convertidos, visitantes, carteirinhas oficiais e cartas de transferência.',
    principaisFuncoes: [
      'Ficha cadastral completa com foto, dados civis, batismo e endereço',
      'Geração de Carteirinhas de Membro em PDF oficial com foto e QR Code',
      'Emissão de Certificados de Batismo e Apresentação de Crianças',
      'Controle de status (Ativo, Afastado, Transferido, Falecido)'
    ],
    destaques: 'Você pode filtrar membros por congregação/filial e exportar listas completas para PDF ou Excel.'
  },
  {
    id: 'financeiro',
    nome: 'Financeiro & Tesouraria',
    categoria: 'Finanças',
    icone: CreditCard,
    rota: '/financeiro',
    descricao: 'Controle de entradas (dízimos e ofertas), despesas com comprovantes, fechamento mensal e relatórios fiscais.',
    principaisFuncoes: [
      'Lançamento ágil de Dízimos identificando o membro dizimista',
      'Registro de Ofertas de culto, campanhas de missões e doações',
      'Controle rigoroso de Saídas e despesas categorizadas',
      'Demonstrativo do fechamento mensal para prestação de contas'
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
      'Controle de entregas de Cestas Básicas com histórico individual',
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

export function Ajuda() {
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState('Todas');

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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 8 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.3 }}
      className="space-y-8 max-w-6xl mx-auto pb-12"
    >
      {/* Cabeçalho Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-xs">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                Central de Ajuda & Guia dos Módulos
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Manual prático e documentação completa de todos os recursos do Sistema Eclesiástico OBPC.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 text-xs font-semibold bg-primary/5 text-primary border-primary/20">
            {modulosSistema.length} Módulos Integrados
          </Badge>
          <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold">
            Versão Atualizada
          </Badge>
        </div>
      </div>

      {/* Cartões Rápidos de Boas Práticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-primary">
              <Lightbulb className="h-4 w-4" /> Dica de Operação Diária
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Sempre selecione no topo da tela a <strong>Congregação / Filial</strong> correta antes de lançar membros ou finanças. O sistema isola e calcula relatórios com precisão para cada sede e filiais.
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 border-emerald-500/20 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Printer className="h-4 w-4" /> Impressões & Recibos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Ao emitir recibos, você pode optar por preenchimento automático no sistema ou gerar <strong>Blocos em Branco</strong> (3 recibos pautados por folha A4) para o talão físico do tesoureiro.
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-sky-500/5 to-sky-500/10 border-sky-500/20 shadow-xs">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-sky-600 dark:text-sky-400">
              <ShieldCheck className="h-4 w-4" /> Segurança & Auditoria
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground leading-relaxed">
            Todas as emissões de formulários e alterações financeiras ficam gravadas com operador, data e hora no módulo de <strong>Auditoria</strong> para transparência total da liderança.
          </CardContent>
        </Card>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar módulo, recurso ou dúvida (ex: recibo, dizimo, carteirinha)..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 h-10 bg-background shadow-xs text-sm"
            />
            {busca && (
              <button 
                onClick={() => setBusca('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-semibold px-1"
              >
                Limpar
              </button>
            )}
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

        {busca && (
          <p className="text-xs text-muted-foreground">
            Encontrados {modulosFiltrados.length} módulo(s) para o termo "{busca}".
          </p>
        )}
      </div>

      {/* Grade de Módulos do Sistema */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" /> Módulos do Sistema ({modulosFiltrados.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            Clique no botão "Acessar Módulo" para ir direto à tela correspondente.
          </span>
        </div>

        {modulosFiltrados.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
            <HelpCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
            <h3 className="font-semibold text-foreground">Nenhum módulo encontrado</h3>
            <p className="text-xs text-muted-foreground mt-1">Tente pesquisar com outro termo ou selecione a categoria "Todas".</p>
            <Button variant="outline" size="sm" className="mt-4 text-xs" onClick={() => { setBusca(''); setCategoriaAtiva('Todas'); }}>
              Resetar Filtros
            </Button>
          </div>
        ) : (
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
                            <CheckCircle2 className="h-3 w-3 text-primary shrink-0 mt-0.5" />
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
        )}
      </div>

      {/* Seção Completa de Perguntas Frequentes (FAQ) com todos os Módulos */}
      <div className="space-y-4 pt-6 border-t">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" /> Perguntas Frequentes & Passo a Passo Detalhado
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Instruções detalhadas para as principais dúvidas e rotinas pastorais e administrativas.
          </p>
        </div>

        <Accordion className="w-full space-y-3">
          {/* Formulários & Recibos */}
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
                  Preencha o valor em R$ (o sistema escreve o valor por extenso automaticamente), selecione o membro beneficiário ou digite o nome e CPF, e defina a finalidade da oferta. O recibo sairá completo com campo para a pessoa assinar e com os dados da igreja recebedora.
                </div>
                <div>
                  <strong className="text-foreground block mb-1">📄 Modo Bloco em Branco (Manual):</strong>
                  Gera a folha oficial com todos os dados da Igreja Brasil Para Cristo e CNPJ, mantendo os campos de Valor, Extenso, Beneficiário, Referente e Data limpos e sem pré-preenchimento, para que o tesoureiro tenha um talão impresso para preencher à mão no templo.
                </div>
              </div>
              <p>
                <strong>Dica sobre vias:</strong> A marcação de <em>"1ª VIA"</em> ou <em>"2ª VIA"</em> fica localizada na parte superior ao lado da legenda <strong>RECIBO</strong>, mantendo o rodapé limpo e elegante com as assinaturas do beneficiário e do tesoureiro.
              </p>
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
                A <strong>Área Exclusiva do Pastor</strong> é o gabinete ministerial digital sob estrito sigilo eclesiástico:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Histórico Confidencial:</strong> Registre atendimentos pastorais, visitas a lares e aconselhamentos espirituais. Esses dados não ficam expostos na secretaria comum.</li>
                <li><strong>Ficha de Acompanhamento Pastoral:</strong> Pode ser impressa em branco (para anotações manuais na visita) ou preenchida com a seleção de um membro cadastrado ou nome avulso.</li>
                <li><strong>Livro de Intercessão:</strong> Acompanhe pedidos de oração da congregação e registre testemunhos de vitórias alcançadas.</li>
                <li><strong>Permissões:</strong> Apenas o Pastor Presidente, Administradores e usuários com autorização expressa em Configurações &gt; Usuários têm acesso a este módulo.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* Regra de Filiais e Congregações */}
          <AccordionItem value="faq-filial-restricao" className="border rounded-xl px-4 bg-card shadow-xs">
            <AccordionTrigger className="text-sm font-semibold hover:text-primary">
              <span className="flex items-center gap-2 text-left">
                <Building2 className="h-4 w-4 text-purple-600 shrink-0" />
                Quem pode alterar a Congregação / Filial no cadastro de membros?
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-2 border-t">
              <p>
                Por regra de segurança eclesiástica, apenas usuários da <strong>Igreja Sede Principal</strong> têm permissão para escolher outras congregações no formulário de membros.
              </p>
              <p>
                Usuários de congregações filiais têm o campo travado e vinculado estritamente à sua própria igreja local configurada, garantindo integridade e evitando lançamentos em filiais alheias.
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
                  <strong>Confirmar Impressão (Escolher Impressora):</strong> Abre imediatamente a janela nativa do seu navegador ou sistema operacional para você selecionar a sua impressora física instalada (HP, Epson, Brother, Canon), ajustar número de cópias e enviar direto para impressão sem precisar salvar arquivo no computador.
                </li>
                <li>
                  <strong>Baixar PDF Oficial / Salvar em PDF:</strong> Gera e baixa um arquivo PDF de alta definição formatado estritamente em A4, ideal para arquivar digitalmente na nuvem, anexar em atas ou enviar pelo WhatsApp para o membro.
                </li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* Secretaria & Carteirinhas */}
          <AccordionItem value="faq-carteirinhas" className="border rounded-xl px-4 bg-card shadow-xs">
            <AccordionTrigger className="text-sm font-semibold hover:text-primary">
              <span className="flex items-center gap-2 text-left">
                <Users className="h-4 w-4 text-blue-600 shrink-0" />
                Como gerar e imprimir as Carteirinhas de Membros com foto e dados eclesiásticos?
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-2 border-t">
              <p>
                1. Acesse o módulo <strong>Secretaria</strong>.<br/>
                2. No cadastro do membro, certifique-se de que os dados de <strong>Batismo</strong>, <strong>Data de Nascimento</strong>, <strong>Cargo/Função</strong> e foto estejam preenchidos.<br/>
                3. Clique no botão de carteirinha ao lado do membro ou na aba <strong>Relatórios &gt; Carteirinhas</strong>.<br/>
                4. O sistema gera a carteirinha nos padrões da Convenção, com frente e verso prontos para impressão em papel especial ou PVC com laminação.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Financeiro: Entradas e Dízimos */}
          <AccordionItem value="faq-dizimos" className="border rounded-xl px-4 bg-card shadow-xs">
            <AccordionTrigger className="text-sm font-semibold hover:text-primary">
              <span className="flex items-center gap-2 text-left">
                <CreditCard className="h-4 w-4 text-amber-600 shrink-0" />
                Como registrar Dízimos e Ofertas vinculados aos membros e filiais?
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-2 border-t">
              <p>
                Acesse o módulo <strong>Financeiro</strong> e clique no botão <strong>Nova Transação</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Selecione <strong>Entrada</strong>. O sistema filtra automaticamente as categorias de receita (Dízimo, Oferta de Culto, Oferta Missionária, Campanhas).</li>
                <li>No campo <em>Dizimista / Membro</em>, digite o nome do irmão cadastrado na Secretaria. O valor é somado ao histórico do membro.</li>
                <li>Selecione se o recebimento foi em Dinheiro, PIX ou Cartão.</li>
                <li>O saldo da filial selecionada no topo é atualizado imediatamente.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* Documentos Dinâmicos & Declarações */}
          <AccordionItem value="faq-dinamicos" className="border rounded-xl px-4 bg-card shadow-xs">
            <AccordionTrigger className="text-sm font-semibold hover:text-primary">
              <span className="flex items-center gap-2 text-left">
                <FileText className="h-4 w-4 text-indigo-600 shrink-0" />
                Como funcionam os Documentos Dinâmicos (Declaração de Batismo, Transferência)?
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-2 border-t">
              <p>
                Na aba <strong>Documentos & Declarações</strong> do módulo de Formulários, você pode escolher modelos prontos ou criar seus próprios textos com variáveis inteligentes que o sistema substitui automaticamente:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2 text-[11px] font-mono bg-muted p-2.5 rounded-lg border">
                <div><code>[NOME_MEMBRO]</code></div>
                <div><code>[DOCUMENTO]</code></div>
                <div><code>[DATA_BATISMO]</code></div>
                <div><code>[DATA]</code></div>
                <div><code>[CIDADE]</code></div>
                <div><code>[IGREJA]</code></div>
                <div><code>[PASTOR]</code></div>
                <div><code>[CARGO]</code></div>
              </div>
              <p>
                O documento é formatado com moldura cerimonial eclesiástica clássica, trazendo o nome da declaração centralizado com destaque e cabeçalho com a logo da igreja.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Serviço Social */}
          <AccordionItem value="faq-social" className="border rounded-xl px-4 bg-card shadow-xs">
            <AccordionTrigger className="text-sm font-semibold hover:text-primary">
              <span className="flex items-center gap-2 text-left">
                <HeartHandshake className="h-4 w-4 text-rose-600 shrink-0" />
                Como registrar entregas de Cestas Básicas e emitir fichas de atendimento?
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-2 border-t">
              <p>
                No módulo <strong>Serviço Social</strong>, cadastre a família atendida com quantidade de dependentes, renda média e endereço.
              </p>
              <p>
                Ao realizar uma doação de alimentos, registre a entrega para atualizar o saldo do estoque de cestas. Em seguida, na aba de Formulários, você pode imprimir a <strong>Ficha Analítica</strong> ou a <strong>Ficha Simplificada de Atendimento</strong> para colher a assinatura da família assistida.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Configurações: Logo e Assinaturas */}
          <AccordionItem value="faq-config-logo" className="border rounded-xl px-4 bg-card shadow-xs">
            <AccordionTrigger className="text-sm font-semibold hover:text-primary">
              <span className="flex items-center gap-2 text-left">
                <Settings className="h-4 w-4 text-slate-700 dark:text-slate-300 shrink-0" />
                Como alterar a Logomarca da Igreja e configurar assinaturas digitais?
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-2 border-t">
              <p>
                Acesse <strong>Configurações &gt; Dados da Igreja Sede</strong>:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Faça o upload do arquivo de imagem com o logotipo oficial da sua congregação (PNG com fundo transparente é recomendado).</li>
                <li>Na aba <strong>Liderança & Assinaturas</strong>, informe os nomes do Pastor Presidente, Tesoureiro Geral e Secretário, e faça o upload das imagens de suas respectivas rubricas ou assinaturas.</li>
                <li>Uma vez salvas, as assinaturas aparecerão automaticamente em todos os recibos, certificados de batismo e cartas oficiais emitidas.</li>
              </ul>
            </AccordionContent>
          </AccordionItem>

          {/* Gestão de Filiais e Permissões */}
          <AccordionItem value="faq-filiais" className="border rounded-xl px-4 bg-card shadow-xs">
            <AccordionTrigger className="text-sm font-semibold hover:text-primary">
              <span className="flex items-center gap-2 text-left">
                <Building2 className="h-4 w-4 text-purple-600 shrink-0" />
                Como cadastrar novas Congregações/Filiais e restringir o acesso de usuários?
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-2 border-t">
              <p>
                Vá até <strong>Configurações &gt; Sede & Congregações</strong> e clique em <em>Adicionar Nova Filial</em>. Preencha o nome do templo, endereço e pastor dirigente.
              </p>
              <p>
                Em seguida, em <strong>Configurações &gt; Usuários e Permissões</strong>, você pode criar uma conta para o tesoureiro ou secretário local e associá-lo especificamente à filial dele. Desta forma, ele só conseguirá visualizar e cadastrar membros e lançamentos de sua própria congregação, resguardando os dados da Sede.
              </p>
            </AccordionContent>
          </AccordionItem>

          {/* Patrimônio & Bens */}
          <AccordionItem value="faq-patrimonio" className="border rounded-xl px-4 bg-card shadow-xs">
            <AccordionTrigger className="text-sm font-semibold hover:text-primary">
              <span className="flex items-center gap-2 text-left">
                <Package className="h-4 w-4 text-amber-700 shrink-0" />
                Como controlar o tombamento e inventário dos bens da igreja?
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed space-y-2 pt-2 border-t">
              <p>
                No módulo <strong>Patrimônio</strong>, cadastre cada bem indicando número da plaqueta de tombamento, valor estimado, congregação onde se encontra alocado e departamento responsável (ex: Ministério de Louvor para instrumentos e caixas de som). O módulo gera termos de entrega e relatórios anuais de inventário patrimonial.
              </p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
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
