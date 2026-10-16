import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  ShieldCheck, 
  BookOpen, 
  HeartHandshake, 
  Plus, 
  Printer, 
  Download, 
  Search, 
  Trash2, 
  Calendar, 
  UserCheck, 
  Lock, 
  Sparkles, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Cross, 
  Eye, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { printDocument, downloadElementAsPdf } from '@/lib/printUtils';
import { getChurchLeadershipConfig } from '@/lib/churchConfigHelper';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';

export interface PastoralRecord {
  id: string;
  type: string;
  personName: string;
  memberId?: string;
  date: string;
  responsible: string;
  notes: string;
  prayerRequests?: string;
  bibleVerses?: string;
  followUpDate?: string;
  confidentiality?: 'normal' | 'sigilo_absoluto';
  createdAt?: string;
  branchId?: string;
}

export interface PrayerRequest {
  id: string;
  name: string;
  motive: string;
  category: string;
  date: string;
  status: 'em_oracao' | 'vitoria';
  testimonyNotes?: string;
  branchId?: string;
}

export function AreaPastoral() {
  const { user } = useAuth();
  const { activeBranch, branches, activeBranchObj } = useBranch();
  const leadership = useMemo(() => getChurchLeadershipConfig(activeBranch, branches), [activeBranch, branches]);

  // Verificar permissão pastoral
  const hasPastoralAccess = useMemo(() => {
    if (!user) return false;
    const roleLower = (user.role || '').toLowerCase();
    const isAdmin = roleLower === 'administrador';
    const isPastor = roleLower.includes('pastor') || roleLower.includes('presbítero') || roleLower.includes('presbitero');
    const hasPermission = user.permissions?.pastoral?.view === true;
    return isAdmin || isPastor || hasPermission;
  }, [user]);

  // Estado de desbloqueio por PIN pastoral caso o usuário queira confirmar
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');

  // Membros do sistema para seleção
  const [members, setMembers] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('churchMembers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Registros pastorais
  const [pastoralRecords, setPastoralRecords] = useState<PastoralRecord[]>(() => {
    try {
      const saved = localStorage.getItem('church_pastoral_records');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Livro de intercessão
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>(() => {
    try {
      const saved = localStorage.getItem('church_prayer_requests');
      return saved ? JSON.parse(saved) : [
        {
          id: 'p1',
          name: 'Família Silva',
          motive: 'Restauração familiar e portas de emprego',
          category: 'Família & Emprego',
          date: new Date().toISOString().slice(0, 10),
          status: 'em_oracao'
        },
        {
          id: 'p2',
          name: 'Irmão Carlos',
          motive: 'Recuperação de cirurgia e saúde',
          category: 'Saúde / Cura',
          date: new Date().toISOString().slice(0, 10),
          status: 'vitoria',
          testimonyNotes: 'Cirurgia bem sucedida e recuperação rápida para a glória de Deus!'
        }
      ];
    } catch {
      return [];
    }
  });

  // Filtros e busca
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Modal Novo Atendimento Pastoral
  const [isNewRecordModalOpen, setIsNewRecordModalOpen] = useState(false);
  const [personMode, setPersonMode] = useState<'membro' | 'manual'>('membro');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [manualPersonName, setManualPersonName] = useState('');
  const [recordType, setRecordType] = useState('Visita Pastoral');
  const [recordDate, setRecordDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [recordResponsible, setRecordResponsible] = useState(() => user?.name || leadership.pastor.name || 'Pastor Titular');
  const [recordNotes, setRecordNotes] = useState('');
  const [recordPrayers, setRecordPrayers] = useState('');
  const [recordVerses, setRecordVerses] = useState('');
  const [recordFollowUpDate, setRecordFollowUpDate] = useState('');
  const [recordConfidentiality, setRecordConfidentiality] = useState<'normal' | 'sigilo_absoluto'>('normal');
  const [isSavingRecord, setIsSavingRecord] = useState(false);

  // Modal Novo Pedido de Oração
  const [isNewPrayerModalOpen, setIsNewPrayerModalOpen] = useState(false);
  const [prayerName, setPrayerName] = useState('');
  const [prayerMotive, setPrayerMotive] = useState('');
  const [prayerCategory, setPrayerCategory] = useState('Saúde / Cura');

  // Configuração da Ficha de Acompanhamento Pastoral
  const [fichaModo, setFichaModo] = useState<'branco' | 'membro' | 'manual'>('branco');
  const [fichaSelectedMemberId, setFichaSelectedMemberId] = useState('');
  const [fichaManualName, setFichaManualName] = useState('');
  const [fichaDataVisita, setFichaDataVisita] = useState(() => new Date().toLocaleDateString('pt-BR'));
  const [fichaPastor, setFichaPastor] = useState(() => leadership.pastor.name || user?.name || 'Pr. Titular');
  const [fichaMotivo, setFichaMotivo] = useState('Acompanhamento e cuidado espiritual no lar');
  const [fichaVersiculos, setFichaVersiculos] = useState('Salmo 23; Filipenses 4:6-7; Josué 1:9');
  const [fichaPedidosOracao, setFichaPedidosOracao] = useState('Paz na família, saúde, fortalecimento na fé e unção');
  const [fichaObservacoes, setFichaObservacoes] = useState('Família acolhedora, perseverando na oração e cultos da igreja.');

  // Sincronização Firestore
  useEffect(() => {
    const unsubscribeRecords = onSnapshot(collection(db, 'pastoral_records'), (snapshot) => {
      const records: PastoralRecord[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PastoralRecord));
      if (records.length > 0) {
        setPastoralRecords(records);
        localStorage.setItem('church_pastoral_records', JSON.stringify(records));
      }
    }, (err) => {
      console.warn("Pastoral records listener fallback to local:", err);
    });

    const unsubscribePrayers = onSnapshot(collection(db, 'prayer_requests'), (snapshot) => {
      const prayers: PrayerRequest[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PrayerRequest));
      if (prayers.length > 0) {
        setPrayerRequests(prayers);
        localStorage.setItem('church_prayer_requests', JSON.stringify(prayers));
      }
    }, (err) => {
      console.warn("Prayer requests listener fallback to local:", err);
    });

    return () => {
      unsubscribeRecords();
      unsubscribePrayers();
    };
  }, []);

  // Membro selecionado para ficha
  const fichaMember = useMemo(() => {
    if (fichaModo !== 'membro' || !fichaSelectedMemberId) return null;
    return members.find(m => String(m.id) === fichaSelectedMemberId) || null;
  }, [fichaModo, fichaSelectedMemberId, members]);

  // Nome exibido na ficha
  const fichaNomeExibido = useMemo(() => {
    if (fichaModo === 'branco') return '';
    if (fichaModo === 'manual') return fichaManualName;
    if (fichaModo === 'membro' && fichaMember) return fichaMember.nome || fichaMember.name || '';
    return '';
  }, [fichaModo, fichaManualName, fichaMember]);

  // Ações de cadastro
  const handleSaveRecord = async () => {
    const person = personMode === 'membro' 
      ? (members.find(m => String(m.id) === selectedMemberId)?.nome || 'Membro')
      : manualPersonName.trim();

    if (!person) {
      toast.warning("Informe o nome da pessoa atendida.");
      return;
    }

    setIsSavingRecord(true);
    const newRecord: PastoralRecord = {
      id: `pastoral-${Date.now()}`,
      type: recordType,
      personName: person,
      memberId: personMode === 'membro' ? selectedMemberId : undefined,
      date: recordDate,
      responsible: recordResponsible,
      notes: recordNotes,
      prayerRequests: recordPrayers,
      bibleVerses: recordVerses,
      followUpDate: recordFollowUpDate,
      confidentiality: recordConfidentiality,
      createdAt: new Date().toISOString(),
      branchId: activeBranch
    };

    try {
      await addDoc(collection(db, 'pastoral_records'), newRecord);
    } catch {
      // Fallback local
      const updated = [newRecord, ...pastoralRecords];
      setPastoralRecords(updated);
      localStorage.setItem('church_pastoral_records', JSON.stringify(updated));
    }

    toast.success("Registro pastoral salvo com sucesso no histórico ministerial!");
    setIsSavingRecord(false);
    setIsNewRecordModalOpen(false);

    // Limpar form
    setManualPersonName('');
    setSelectedMemberId('');
    setRecordNotes('');
    setRecordPrayers('');
    setRecordVerses('');
    setRecordFollowUpDate('');
  };

  const handleDeleteRecord = async (id: string) => {
    if (!confirm("Deseja realmente excluir este registro pastoral?")) return;
    try {
      await deleteDoc(doc(db, 'pastoral_records', id));
    } catch {
      const updated = pastoralRecords.filter(r => r.id !== id);
      setPastoralRecords(updated);
      localStorage.setItem('church_pastoral_records', JSON.stringify(updated));
    }
    toast.success("Registro pastoral removido.");
  };

  const handleSavePrayer = async () => {
    if (!prayerName.trim() || !prayerMotive.trim()) {
      toast.warning("Preencha o nome e o motivo de oração.");
      return;
    }

    const newPrayer: PrayerRequest = {
      id: `prayer-${Date.now()}`,
      name: prayerName.trim(),
      motive: prayerMotive.trim(),
      category: prayerCategory,
      date: new Date().toISOString().slice(0, 10),
      status: 'em_oracao',
      branchId: activeBranch
    };

    try {
      await addDoc(collection(db, 'prayer_requests'), newPrayer);
    } catch {
      const updated = [newPrayer, ...prayerRequests];
      setPrayerRequests(updated);
      localStorage.setItem('church_prayer_requests', JSON.stringify(updated));
    }

    toast.success("Pedido de oração adicionado ao Livro de Intercessão!");
    setIsNewPrayerModalOpen(false);
    setPrayerName('');
    setPrayerMotive('');
  };

  const handleTogglePrayerVictory = async (prayer: PrayerRequest) => {
    const newStatus: 'em_oracao' | 'vitoria' = prayer.status === 'em_oracao' ? 'vitoria' : 'em_oracao';
    try {
      await updateDoc(doc(db, 'prayer_requests', prayer.id), { status: newStatus });
    } catch {
      const updated = prayerRequests.map(p => p.id === prayer.id ? { ...p, status: newStatus } : p);
      setPrayerRequests(updated);
      localStorage.setItem('church_prayer_requests', JSON.stringify(updated));
    }
    if (newStatus === 'vitoria') {
      toast.success("Glória a Deus! Vitória alcançada registrada com sucesso!");
    } else {
      toast.info("Status alterado para em oração.");
    }
  };

  // Impressão da Ficha de Acompanhamento Pastoral
  const handlePrintFicha = () => {
    toast.info("Abrindo caixa de seleção de impressora para a Ficha de Acompanhamento...");
    printDocument(undefined, undefined, 'printable-ficha-pastoral');
  };

  const handleDownloadFichaPDF = async () => {
    const nome = fichaNomeExibido ? fichaNomeExibido.replace(/\s+/g, '_') : 'em_branco';
    await downloadElementAsPdf('printable-ficha-pastoral', `ficha-acompanhamento-pastoral-${nome}.pdf`);
  };

  // Registros filtrados
  const filteredRecords = useMemo(() => {
    return pastoralRecords.filter(r => {
      const matchesSearch = searchTerm === '' || 
        r.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.prayerRequests && r.prayerRequests.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = filterType === 'all' || r.type === filterType;
      return matchesSearch && matchesType;
    });
  }, [pastoralRecords, searchTerm, filterType]);

  // Se o usuário não tem permissão pastoral, renderizar tela de bloqueio eclesiástico
  if (!hasPastoralAccess && !isUnlocked) {
    return (
      <div className="container mx-auto p-4 sm:p-6 max-w-2xl py-12">
        <Card className="border-2 border-amber-500/30 shadow-lg text-center">
          <CardHeader className="space-y-3">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8" />
            </div>
            <CardTitle className="text-2xl font-bold">Área Exclusiva do Pastor</CardTitle>
            <CardDescription className="text-sm max-w-md mx-auto">
              Este módulo contém o histórico confidencial de atendimentos, aconselhamentos espirituais, fichas pastorais e pedidos de oração sob sigilo eclesiástico.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted/40 rounded-xl text-xs text-muted-foreground border">
              <p>O acesso é restrito a pastores presidentes, oficiais e administradores autorizados.</p>
              <p className="mt-1">Se você é o pastor ou possui autorização, solicite ao administrador para conceder o perfil ministerial em <strong>Configurações &gt; Usuários e Permissões</strong>.</p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Input 
                type="password" 
                placeholder="PIN ou senha ministerial..." 
                className="max-w-[200px] text-center"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
              />
              <Button 
                onClick={() => {
                  if (pinInput === '1234' || pinInput === 'pastor' || pinInput === '777') {
                    setIsUnlocked(true);
                    toast.success("Acesso pastoral liberado!");
                  } else {
                    toast.error("PIN incorreto. Acesso negado.");
                  }
                }}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Desbloquear Gabinete
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      {/* Header do Módulo Pastoral */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent p-5 sm:p-6 rounded-2xl border border-amber-500/20 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-600 text-white shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
                Área Exclusiva do Pastor
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                Gabinete Ministerial • Cuidado, Acompanhamento das Ovelhas e Fichas Oficiais
              </p>
            </div>
          </div>
          <div className="pt-1 flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/5">
              🔒 Sigilo Ministerial & Eclesiástico Ativo
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              {leadership.pastor.name || "Pr. Titular"} ({activeBranchObj?.name || "Sede"})
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={() => setIsNewRecordModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm text-xs sm:text-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Novo Atendimento Pastoral
          </Button>
        </div>
      </div>

      {/* Tabs Principais com layout adaptativo sem sobreposição */}
      <Tabs defaultValue="historico" className="space-y-6">
        <TabsList className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 w-full h-auto p-2 bg-muted/60 rounded-2xl border border-border/50">
          <TabsTrigger 
            value="historico" 
            className="h-11 px-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 rounded-xl transition-all data-active:bg-background data-active:text-foreground data-active:shadow-sm"
          >
            <HeartHandshake className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="truncate">Atendimentos & Visitas ({pastoralRecords.length})</span>
          </TabsTrigger>
          <TabsTrigger 
            value="ficha" 
            className="h-11 px-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 rounded-xl transition-all data-active:bg-background data-active:text-foreground data-active:shadow-sm"
          >
            <Printer className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="truncate">Ficha de Acompanhamento</span>
          </TabsTrigger>
          <TabsTrigger 
            value="intercessao" 
            className="h-11 px-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 rounded-xl transition-all data-active:bg-background data-active:text-foreground data-active:shadow-sm"
          >
            <Sparkles className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="truncate">Livro de Oração & Vitórias ({prayerRequests.length})</span>
          </TabsTrigger>
          <TabsTrigger 
            value="orientacoes" 
            className="h-11 px-3 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 rounded-xl transition-all data-active:bg-background data-active:text-foreground data-active:shadow-sm"
          >
            <BookOpen className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="truncate">Roteiros & Guia Pastoral</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: HISTÓRICO DE ATENDIMENTOS & VISITAS */}
        <TabsContent value="historico" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold">Registros de Visitas & Aconselhamento Pastoral</CardTitle>
                  <CardDescription className="text-xs">
                    Histórico reservado de visitas domiciliares, hospitalares, orientações e atendimentos em gabinete.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar por nome ou notas..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-44 h-9 text-xs">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Tipos</SelectItem>
                      <SelectItem value="Visita Pastoral">Visita Pastoral</SelectItem>
                      <SelectItem value="Aconselhamento">Aconselhamento</SelectItem>
                      <SelectItem value="Visita Hospitalar">Visita Hospitalar</SelectItem>
                      <SelectItem value="Oração no Lar">Oração no Lar</SelectItem>
                      <SelectItem value="Atendimento em Gabinete">Atendimento em Gabinete</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredRecords.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRecords.map((record) => (
                    <Card key={record.id} className="border border-border/80 hover:border-primary/40 transition-all bg-card/60 shadow-2xs">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-foreground">{record.personName}</span>
                              <Badge 
                                variant="secondary" 
                                className={`text-[10px] ${
                                  record.type === 'Visita Pastoral'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : record.type === 'Aconselhamento'
                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                    : record.type === 'Visita Hospitalar'
                                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                }`}
                              >
                                {record.type}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              Por: <strong>{record.responsible}</strong> • Data: {new Date(record.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-muted-foreground hover:text-red-600"
                            onClick={() => handleDeleteRecord(record.id)}
                            title="Excluir este registro pastoral"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {record.notes && (
                          <div className="text-xs text-foreground/90 bg-muted/30 p-2.5 rounded-lg whitespace-pre-wrap">
                            <span className="font-bold text-[10px] uppercase text-muted-foreground block mb-1">Notas do Atendimento:</span>
                            {record.notes}
                          </div>
                        )}

                        {(record.prayerRequests || record.bibleVerses) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                            {record.prayerRequests && (
                              <div className="bg-amber-50/50 dark:bg-amber-950/20 p-2 rounded border border-amber-200/40 text-amber-900 dark:text-amber-200">
                                <strong>🙏 Oração:</strong> {record.prayerRequests}
                              </div>
                            )}
                            {record.bibleVerses && (
                              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-2 rounded border border-blue-200/40 text-blue-900 dark:text-blue-200">
                                <strong>📖 Versículo:</strong> {record.bibleVerses}
                              </div>
                            )}
                          </div>
                        )}

                        {record.followUpDate && (
                          <div className="flex items-center gap-1.5 text-[11px] text-primary font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Próxima Visita / Retorno agendado para: <strong>{new Date(record.followUpDate + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground space-y-2">
                  <HeartHandshake className="w-10 h-10 mx-auto opacity-30 text-primary" />
                  <p className="text-sm font-medium">Nenhum atendimento pastoral encontrado com os filtros atuais.</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsNewRecordModalOpen(true)}
                    className="mt-2 text-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Cadastrar Primeiro Atendimento
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: FICHA DE ACOMPANHAMENTO PASTORAL (IMPRESSÃO A4) */}
        <TabsContent value="ficha" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Printer className="w-5 h-5 text-primary" />
                  Emissão da Ficha Oficial de Acompanhamento Pastoral (A4)
                </CardTitle>
                <CardDescription className="text-xs">
                  Gere e imprima a ficha oficial para levar na pasta pastoral, visitas a enfermos ou registro de aconselhamento no gabinete.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handleDownloadFichaPDF}
                  variant="outline"
                  size="sm"
                  className="text-xs h-8"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Salvar em PDF
                </Button>
                <Button 
                  onClick={handlePrintFicha}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs h-8 px-4 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" /> Imprimir Ficha
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Opções de Preenchimento Conforme Solicitado pelo Usuário */}
              <div className="p-4 rounded-xl bg-muted/40 border space-y-4">
                <div className="space-y-1">
                  <Label className="font-bold text-sm">Modalidade de Emissão da Ficha:</Label>
                  <p className="text-xs text-muted-foreground">
                    Escolha entre emitir a ficha em branco (para anotações manuais pelo pastor) ou já preenchida com os dados da pessoa.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div 
                    onClick={() => setFichaModo('branco')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      fichaModo === 'branco'
                        ? 'border-primary bg-primary/10 shadow-xs'
                        : 'border-border/80 hover:border-primary/50 bg-card'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>📄 Ficha em Branco</span>
                      {fichaModo === 'branco' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Linhas pautadas vazias para o pastor levar e preencher à caneta durante a visita externa.
                    </p>
                  </div>

                  <div 
                    onClick={() => setFichaModo('membro')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      fichaModo === 'membro'
                        ? 'border-primary bg-primary/10 shadow-xs'
                        : 'border-border/80 hover:border-primary/50 bg-card'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>👤 Membro Cadastrado</span>
                      {fichaModo === 'membro' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Selecionar um irmão(ã) cadastrado no rol para preencher dados e endereço automaticamente.
                    </p>
                  </div>

                  <div 
                    onClick={() => setFichaModo('manual')}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                      fichaModo === 'manual'
                        ? 'border-primary bg-primary/10 shadow-xs'
                        : 'border-border/80 hover:border-primary/50 bg-card'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>✍️ Escrever Nome Livremente</span>
                      {fichaModo === 'manual' && <CheckCircle2 className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Digitar o nome livremente de um visitante, familiar ou pessoa não cadastrada.
                    </p>
                  </div>
                </div>

                {/* Campos adicionais dependendo do modo */}
                {fichaModo === 'membro' && (
                  <div className="space-y-1.5 pt-2 border-t">
                    <Label className="text-xs font-semibold">Selecione o Membro Cadastrado:</Label>
                    <Select value={fichaSelectedMemberId} onValueChange={setFichaSelectedMemberId}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Escolha um membro do rol..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {members.map(m => (
                          <SelectItem key={m.id} value={String(m.id)}>
                            {m.nome || m.name} {m.cargo || m.role ? `(${m.cargo || m.role})` : ''} {m.telefone ? `• ${m.telefone}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {fichaModo === 'manual' && (
                  <div className="space-y-1.5 pt-2 border-t">
                    <Label className="text-xs font-semibold">Nome da Pessoa / Família Atendida:</Label>
                    <Input 
                      placeholder="Ex: Família Santos ou Irmão Lucas Pereira" 
                      value={fichaManualName}
                      onChange={(e) => setFichaManualName(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                )}

                {/* Opções de Conteúdo da Ficha */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Data da Visita / Atendimento:</Label>
                    <Input 
                      value={fichaDataVisita} 
                      onChange={(e) => setFichaDataVisita(e.target.value)} 
                      className="h-8 text-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Pastor Responsável:</Label>
                    <Input 
                      value={fichaPastor} 
                      onChange={(e) => setFichaPastor(e.target.value)} 
                      className="h-8 text-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Motivo Principal:</Label>
                    <Input 
                      value={fichaMotivo} 
                      onChange={(e) => setFichaMotivo(e.target.value)} 
                      className="h-8 text-xs" 
                    />
                  </div>
                </div>
              </div>

              {/* PRÉVIA DA FICHA DE ACOMPANHAMENTO PASTORAL (100% A4) */}
              <div className="overflow-x-auto bg-slate-200/80 dark:bg-slate-950 p-4 sm:p-6 rounded-2xl border flex justify-center">
                <div 
                  id="printable-ficha-pastoral"
                  className="w-[210mm] min-h-[297mm] max-h-[297mm] bg-white text-black p-[8mm] shadow-xl box-border font-sans relative flex flex-col justify-between"
                  style={{ boxSizing: 'border-box' }}
                >
                  <div className="space-y-3">
                    {/* Header Oficial OBPC */}
                    <div className="flex border-2 border-black p-2.5 items-center justify-between gap-3">
                      <div className="w-[24mm] h-[22mm] border-r-2 border-black flex items-center justify-center p-1 pr-2 shrink-0">
                        {leadership.church.logoUrl ? (
                          <img src={leadership.church.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <div className="text-center font-bold text-[8.5px] leading-tight">IGREJA<br/>OBPC</div>
                        )}
                      </div>
                      <div className="flex-1 text-center px-2">
                        <h1 className="font-bold text-[13px] uppercase tracking-tight leading-tight">
                          {leadership.church.name || "IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO"}
                        </h1>
                        <p className="text-[8.5px] uppercase font-bold text-gray-700 mt-0.5">
                          {activeBranchObj?.name || "CONGREGAÇÃO SEDE"} • CNPJ: {leadership.church.cnpj || "51.109.839/0001-10"}
                        </p>
                        <p className="text-[8px] uppercase text-gray-600 leading-tight">
                          {leadership.church.address} • {leadership.church.cidade}
                        </p>
                        <div className="border border-black bg-gray-100 font-black px-3 py-0.5 mt-1.5 text-[10px] uppercase tracking-wider">
                          FICHA OFICIAL DE ACOMPANHAMENTO PASTORAL & MINISTERIAL
                        </div>
                      </div>
                      <div className="w-[32mm] border-l-2 border-black flex flex-col items-center justify-center font-bold leading-none py-1 pl-2 shrink-0">
                        <span className="text-[12px] font-black text-black">OBPC</span>
                        <span className="text-[7.5px] font-bold text-gray-600 mt-1 uppercase">GABINETE PASTORAL</span>
                        <span className="text-red-600 font-bold text-[10px] mt-1">FICHA Nº</span>
                        <span className="text-red-600 font-black text-[15px]">0001</span>
                      </div>
                    </div>

                    <div className="text-center text-[8.5px] italic text-gray-700 border-b border-gray-300 pb-1">
                      "Apascentai o rebanho de Deus que está entre vós, tendo cuidado dele, não por força, mas voluntariamente segundo Deus..." (1 Pedro 5:2)
                    </div>

                    {/* Bloco 1: Identificação da Pessoa ou Família Atendida */}
                    <div>
                      <div className="bg-gray-200 border border-black font-bold text-[8.5px] uppercase px-2 py-0.5">
                        1. Identificação da Pessoa / Família Atendida
                      </div>
                      <div className="border-x border-b border-black text-[9px]">
                        <div className="flex border-b border-black">
                          <div className="flex-[3] p-1.5 border-r border-black">
                            <span className="font-bold block text-[7.5px] uppercase text-gray-700">Nome Completo:</span>
                            <div className="font-bold text-[10.5px] min-h-[14px]">
                              {fichaNomeExibido || "____________________________________________________________________"}
                            </div>
                          </div>
                          <div className="flex-1 p-1.5 border-r border-black">
                            <span className="font-bold block text-[7.5px] uppercase text-gray-700">Data do Atendimento:</span>
                            <div className="font-medium min-h-[14px]">
                              {fichaModo === 'branco' ? "____/____/202____" : fichaDataVisita}
                            </div>
                          </div>
                          <div className="flex-1 p-1.5">
                            <span className="font-bold block text-[7.5px] uppercase text-gray-700">Situação Eclesiástica:</span>
                            <div className="font-medium min-h-[14px]">
                              {fichaMember ? (fichaMember.cargo || "Membro Ativo") : "[ ] Membro  [ ] Visitante"}
                            </div>
                          </div>
                        </div>

                        <div className="flex border-b border-black">
                          <div className="flex-[2] p-1.5 border-r border-black">
                            <span className="font-bold block text-[7.5px] uppercase text-gray-700">Telefone / WhatsApp:</span>
                            <div className="min-h-[14px]">
                              {fichaMember?.telefone || fichaMember?.phone || (fichaModo === 'branco' ? "(____) _________________" : "________________________")}
                            </div>
                          </div>
                          <div className="flex-[3] p-1.5">
                            <span className="font-bold block text-[7.5px] uppercase text-gray-700">Endereço Residencial:</span>
                            <div className="min-h-[14px]">
                              {fichaMember?.endereco || (fichaModo === 'branco' ? "________________________________________________________" : "__________________________________")}
                            </div>
                          </div>
                        </div>

                        <div className="flex">
                          <div className="flex-1 p-1.5 border-r border-black">
                            <span className="font-bold block text-[7.5px] uppercase text-gray-700">Bairro / Cidade:</span>
                            <div className="min-h-[14px]">
                              {fichaMember ? `${fichaMember.bairro || ''} - ${fichaMember.cidade || ''}` : "__________________________________"}
                            </div>
                          </div>
                          <div className="flex-1 p-1.5">
                            <span className="font-bold block text-[7.5px] uppercase text-gray-700">Pastor / Líder Atendente:</span>
                            <div className="font-bold min-h-[14px]">
                              {fichaPastor}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bloco 2: Tipo de Atendimento & Diagnóstico Espiritual */}
                    <div>
                      <div className="bg-gray-200 border border-black font-bold text-[8.5px] uppercase px-2 py-0.5">
                        2. Modalidade do Atendimento Pastoral & Diagnóstico
                      </div>
                      <div className="border-x border-b border-black p-2 text-[9px] space-y-2">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="font-bold uppercase text-[8px]">Tipo de Encontro:</span>
                          <span>[ ] Visita Domiciliar</span>
                          <span>[ ] Aconselhamento no Gabinete</span>
                          <span>[ ] Visita Hospitalar</span>
                          <span>[ ] Oração no Lar</span>
                          <span>[ ] Atendimento Familiar</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-gray-300 pt-1">
                          <span className="font-bold uppercase text-[8px]">Área de Necessidade:</span>
                          <span>[ ] Espiritual / Fé</span>
                          <span>[ ] Casamento / Família</span>
                          <span>[ ] Saúde Física / Emocional</span>
                          <span>[ ] Luto / Consolação</span>
                          <span>[ ] Decisão / Batismo</span>
                          <span>[ ] Finanças / Trabalho</span>
                        </div>
                      </div>
                    </div>

                    {/* Bloco 3: Motivo da Visita & Orientações Pastorais */}
                    <div>
                      <div className="bg-gray-200 border border-black font-bold text-[8.5px] uppercase px-2 py-0.5">
                        3. Motivo do Atendimento & Orientações Bíblicas Ministradas
                      </div>
                      <div className="border-x border-b border-black p-2 text-[9px] space-y-2">
                        <div>
                          <span className="font-bold uppercase text-[8px] block mb-0.5">Motivo do Atendimento:</span>
                          <div className="text-[9.5px] min-h-[16px] border-b border-dashed border-gray-400 pb-0.5">
                            {fichaModo === 'branco' ? "____________________________________________________________________________________________________" : fichaMotivo}
                          </div>
                        </div>

                        <div>
                          <span className="font-bold uppercase text-[8px] block mb-0.5">Passagens Bíblicas e Conselhos Ministrados:</span>
                          <div className="text-[9px] min-h-[16px] border-b border-dashed border-gray-400 pb-0.5">
                            {fichaModo === 'branco' ? "____________________________________________________________________________________________________" : fichaVersiculos}
                          </div>
                        </div>

                        <div>
                          <span className="font-bold uppercase text-[8px] block mb-0.5">Observações Pastorais Reservadas:</span>
                          <div className="text-[9px] min-h-[28px] leading-relaxed">
                            {fichaModo === 'branco' ? (
                              <div className="space-y-2">
                                <div className="border-b border-dashed border-gray-400 h-3"></div>
                                <div className="border-b border-dashed border-gray-400 h-3"></div>
                              </div>
                            ) : (
                              fichaObservacoes
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bloco 4: Pedidos de Oração Específicos & Alvos de Fé */}
                    <div>
                      <div className="bg-gray-200 border border-black font-bold text-[8.5px] uppercase px-2 py-0.5">
                        4. Pedidos Específicos de Oração & Alvos de Fé
                      </div>
                      <div className="border-x border-b border-black p-2 text-[9px] space-y-1.5">
                        <div className="min-h-[28px]">
                          {fichaModo === 'branco' ? (
                            <div className="space-y-2">
                              <div className="border-b border-dashed border-gray-400 h-3"></div>
                              <div className="border-b border-dashed border-gray-400 h-3"></div>
                            </div>
                          ) : (
                            <p className="text-[9.5px]">{fichaPedidosOracao}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bloco 5: Encaminhamentos e Plano de Acompanhamento */}
                    <div>
                      <div className="bg-gray-200 border border-black font-bold text-[8.5px] uppercase px-2 py-0.5">
                        5. Plano de Cuidado e Acompanhamento
                      </div>
                      <div className="border-x border-b border-black p-2 text-[9px]">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="font-bold uppercase text-[8px] block">Próxima Visita / Retorno Agendado:</span>
                            <div className="mt-1">
                              Data: <strong>____/____/202____</strong> | Horário: <strong>____:____</strong>
                            </div>
                          </div>
                          <div>
                            <span className="font-bold uppercase text-[8px] block">Encaminhamento:</span>
                            <div className="mt-1">
                              [ ] Discipulado   [ ] Círculo de Oração   [ ] Ajuda Social (Cesta)
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Assinaturas & Encerramento */}
                  <div className="pt-4 border-t-2 border-black space-y-2">
                    <div className="grid grid-cols-2 gap-8 text-center pt-2">
                      <div>
                        <div className="border-b border-black min-h-[18px]"></div>
                        <span className="font-bold text-[9px] uppercase block mt-1">{fichaNomeExibido || "Pessoa Atendida / Representante Familiar"}</span>
                        <span className="text-[7.5px] text-gray-600 block">Assinatura da Pessoa ou Familiar</span>
                      </div>
                      <div>
                        <div className="border-b border-black min-h-[18px]"></div>
                        <span className="font-bold text-[9px] uppercase block mt-1">{fichaPastor}</span>
                        <span className="text-[7.5px] text-gray-600 block">Pastor Titular / Ministro Responsável</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[7.5px] text-gray-500 pt-1">
                      <span>Documento de Uso Restrito e Eclesiástico • Gabinete Pastoral OBPC</span>
                      <span className="font-bold uppercase px-2 py-0.5 border border-black bg-gray-100 text-black">
                        Via Única Pastoral
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: LIVRO DE ORAÇÃO & INTERCESSÃO */}
        <TabsContent value="intercessao" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    Livro de Intercessão & Testemunhos de Vitória
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Motivos de oração da congregação apresentados diante do altar do Senhor e testemunhos alcançados.
                  </CardDescription>
                </div>
                <Button 
                  onClick={() => setIsNewPrayerModalOpen(true)}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs h-9"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Adicionar Pedido de Oração
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {prayerRequests.map((prayer) => (
                  <div 
                    key={prayer.id}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      prayer.status === 'vitoria'
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-card border-border/80'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{prayer.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {prayer.category}
                        </Badge>
                        {prayer.status === 'vitoria' ? (
                          <Badge className="bg-emerald-600 text-white text-[10px]">
                            🎉 Vitória Alcançada!
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">
                            🙏 Em Oração
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-foreground/90">{prayer.motive}</p>
                      {prayer.testimonyNotes && (
                        <p className="text-[11px] text-emerald-700 dark:text-emerald-300 italic">
                          "{prayer.testimonyNotes}"
                        </p>
                      )}
                      <span className="text-[10px] text-muted-foreground block">
                        Registrado em: {new Date(prayer.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button 
                        size="sm"
                        variant={prayer.status === 'vitoria' ? 'outline' : 'default'}
                        className={`text-xs h-8 ${prayer.status !== 'vitoria' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : ''}`}
                        onClick={() => handleTogglePrayerVictory(prayer)}
                      >
                        {prayer.status === 'vitoria' ? 'Voltar para Em Oração' : 'Marcar Vitória Alcançada!'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: ROTEIROS & GUIA PASTORAL */}
        <TabsContent value="orientacoes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                Princípios Eclesiásticos & Roteiros de Visitação
              </CardTitle>
              <CardDescription className="text-xs">
                Diretrizes bíblicas e modelos litúrgicos para o pastor e o corpo de obreiros.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border bg-card space-y-2">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Cross className="w-4 h-4 text-primary" />
                    Unção dos Enfermos (Tiago 5:14-15)
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <em>"Está alguém entre vós doente? Chame os presbíteros da igreja, e orem sobre ele, ungindo-o com azeite em nome do Senhor; e a oração da fé salvará o doente, e o Senhor o levantará."</em>
                  </p>
                  <ul className="text-xs space-y-1 text-foreground/80 list-disc pl-4 pt-1">
                    <li>Ouvir com carinho as dores e aflições da pessoa antes de orar.</li>
                    <li>Ministrar fé na autoridade do Nome de Jesus Cristo e nas Suas pisaduras (Isaías 53:5).</li>
                    <li>Ungir a fronte com reverência e orar crendo na cura e restauração divina.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border bg-card space-y-2">
                  <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600" />
                    Sigilo Eclesiástico Ministerial
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Confissões, desabafos de casal e aconselhamentos espirituais são protegidos pelo dever sagrado e legal de confidencialidade (Código Penal Brasileiro, Art. 154 e princípios bíblicos de Provérbios 11:13).
                  </p>
                  <ul className="text-xs space-y-1 text-foreground/80 list-disc pl-4 pt-1">
                    <li>Nunca expor em púlpito exemplos que possam identificar quem procurou ajuda.</li>
                    <li>Tratar casais com imparcialidade, incentivando perdão e santidade.</li>
                    <li>Manter os registros pastorais sob custódia pessoal e segura.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* MODAL: NOVO ATENDIMENTO PASTORAL */}
      <Dialog open={isNewRecordModalOpen} onOpenChange={setIsNewRecordModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Novo Atendimento Pastoral
            </DialogTitle>
            <DialogDescription className="text-xs">
              Registre a visita ou aconselhamento no histórico confidencial do gabinete.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Modo de seleção da pessoa */}
            <div className="flex rounded-lg bg-muted p-1 text-xs font-semibold">
              <button 
                type="button" 
                className={`flex-1 py-1.5 rounded-md transition-all ${personMode === 'membro' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                onClick={() => setPersonMode('membro')}
              >
                Membro Cadastrado
              </button>
              <button 
                type="button" 
                className={`flex-1 py-1.5 rounded-md transition-all ${personMode === 'manual' ? 'bg-background shadow-xs text-foreground' : 'text-muted-foreground'}`}
                onClick={() => setPersonMode('manual')}
              >
                Digitar Nome Avulso / Visitante
              </button>
            </div>

            {personMode === 'membro' ? (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Selecione o Membro:</Label>
                <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Escolha o membro..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {members.map(m => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.nome || m.name} {m.cargo || m.role ? `(${m.cargo || m.role})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Nome da Pessoa / Família:</Label>
                <Input 
                  placeholder="Ex: Família Souza, Irmão Carlos..."
                  value={manualPersonName}
                  onChange={(e) => setManualPersonName(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Tipo de Atendimento:</Label>
                <Select value={recordType} onValueChange={setRecordType}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Visita Pastoral">Visita Pastoral</SelectItem>
                    <SelectItem value="Aconselhamento">Aconselhamento</SelectItem>
                    <SelectItem value="Visita Hospitalar">Visita Hospitalar</SelectItem>
                    <SelectItem value="Oração no Lar">Oração no Lar</SelectItem>
                    <SelectItem value="Atendimento em Gabinete">Atendimento em Gabinete</SelectItem>
                    <SelectItem value="Contato Telefônico">Contato Telefônico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Data do Atendimento:</Label>
                <Input 
                  type="date" 
                  value={recordDate} 
                  onChange={(e) => setRecordDate(e.target.value)} 
                  className="h-9 text-xs" 
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Pastor / Obreiro Responsável:</Label>
              <Input 
                value={recordResponsible} 
                onChange={(e) => setRecordResponsible(e.target.value)} 
                className="h-9 text-xs" 
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Notas e Detalhes do Aconselhamento / Visita:</Label>
              <Textarea 
                placeholder="Descreva a conversa, orientações dadas e situação observada..." 
                value={recordNotes}
                onChange={(e) => setRecordNotes(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Pedidos de Oração:</Label>
                <Input 
                  placeholder="Motivos de oração da família..."
                  value={recordPrayers}
                  onChange={(e) => setRecordPrayers(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Passagens Bíblicas Ministradas:</Label>
                <Input 
                  placeholder="Ex: Salmo 91; Filipenses 4:13"
                  value={recordVerses}
                  onChange={(e) => setRecordVerses(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Próxima Visita / Retorno Agendado (Opcional):</Label>
              <Input 
                type="date" 
                value={recordFollowUpDate} 
                onChange={(e) => setRecordFollowUpDate(e.target.value)} 
                className="h-9 text-xs" 
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsNewRecordModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button 
              onClick={handleSaveRecord} 
              disabled={isSavingRecord}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs"
            >
              {isSavingRecord ? "Salvando..." : "Salvar no Histórico Pastoral"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: NOVO PEDIDO DE ORAÇÃO */}
      <Dialog open={isNewPrayerModalOpen} onOpenChange={setIsNewPrayerModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Novo Pedido de Intercessão
            </DialogTitle>
            <DialogDescription className="text-xs">
              Adicione um pedido ao Livro de Oração da liderança pastoral.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Nome da Pessoa ou Família:</Label>
              <Input 
                placeholder="Ex: Família Pereira, Irmã Eunice..." 
                value={prayerName} 
                onChange={(e) => setPrayerName(e.target.value)} 
                className="h-9 text-xs" 
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Categoria:</Label>
              <Select value={prayerCategory} onValueChange={setPrayerCategory}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Saúde / Cura">Saúde / Cura Divina</SelectItem>
                  <SelectItem value="Família & Casamento">Família & Casamento</SelectItem>
                  <SelectItem value="Emprego & Provisão">Emprego & Provisão</SelectItem>
                  <SelectItem value="Conversão & Salvação">Conversão & Salvação</SelectItem>
                  <SelectItem value="Libertação Espiritual">Libertação Espiritual</SelectItem>
                  <SelectItem value="Causas na Justiça">Causas na Justiça</SelectItem>
                  <SelectItem value="Outro">Outro Motivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Motivo e Detalhes da Oração:</Label>
              <Textarea 
                placeholder="Descreva o motivo pelo qual estaremos intercedendo..." 
                value={prayerMotive}
                onChange={(e) => setPrayerMotive(e.target.value)}
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsNewPrayerModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button onClick={handleSavePrayer} className="bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs">
              Salvar no Livro de Oração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
