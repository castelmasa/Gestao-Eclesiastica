import { motion } from "motion/react";
import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/layout/PageHeader"
import { Plus, CalendarDays, BellRing, MapPin, AlignLeft, Users, Clock, Loader2, Trash2, Building2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { logAction } from "@/lib/audit"
import { useAuth } from "@/contexts/AuthContext"
import { useBranch } from "@/contexts/BranchContext"
import { matchesBranch } from "@/lib/branchUtils"
import { db } from "@/lib/firebase"
import { logCriticalError } from "@/lib/errorLogger"
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from "firebase/firestore"
import { Badge } from "@/components/ui/badge";
import { parseFirestoreDate } from "@/lib/dateUtils";
import { normalizeUTF8 } from "@/lib/unicodeUtils";

const locales = {
  'pt-BR': ptBR,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

const calendarFormats = {
  dateFormat: 'dd',
  dayFormat: (date: Date) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()],
  weekdayFormat: (date: Date) => ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][date.getDay()],
  monthHeaderFormat: (date: Date) => format(date, "MMMM 'de' yyyy", { locale: ptBR }),
  dayHeaderFormat: (date: Date) => format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR }),
  dayRangeHeaderFormat: ({ start, end }: { start: Date; end: Date }) =>
    `${format(start, 'dd/MM', { locale: ptBR })} – ${format(end, 'dd/MM/yyyy', { locale: ptBR })}`
};

export interface CustomEventType {
  id: string;
  label: string;
  color: string;
}

const DEFAULT_EVENT_TYPES: CustomEventType[] = [
  { id: 'culto', label: 'Culto', color: '#3b82f6' },
  { id: 'reuniao', label: 'Reunião de Liderança', color: '#8b5cf6' },
  { id: 'ensaio', label: 'Ensaio (Ministério)', color: '#f59e0b' },
  { id: 'evento_especial', label: 'Evento Especial / Congresso', color: '#10b981' },
  { id: 'ebd', label: 'Escola Bíblica (EBD)', color: '#06b6d4' },
  { id: 'oracao', label: 'Círculo de Oração / Vigília', color: '#ec4899' },
  { id: 'santa_ceia', label: 'Santa Ceia do Senhor', color: '#6366f1' },
  { id: 'social', label: 'Ação Social / Bazar', color: '#f97316' }
];

import { GestaoEscalasModal } from "@/components/agenda/GestaoEscalasModal";

export function Agenda() {
  const { user } = useAuth();
  const { activeBranch, branches, activeBranchName } = useBranch();
  const [events, setEvents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEscalasOpen, setIsEscalasOpen] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Custom Event Types state
  const [customTypes, setCustomTypes] = useState<CustomEventType[]>(() => {
    try {
      const saved = localStorage.getItem('church_custom_event_types');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });
  const [isNewTypeModalOpen, setIsNewTypeModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newTypeColor, setNewTypeColor] = useState("#3b82f6");

  const allEventTypes = useMemo(() => {
    return [...DEFAULT_EVENT_TYPES, ...customTypes];
  }, [customTypes]);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [eventType, setEventType] = useState("culto");
  const [eventBranch, setEventBranch] = useState("sede");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    const q = collection(db, 'events');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedEvents = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          start: parseFirestoreDate(data.start),
          end: parseFirestoreDate(data.end),
          description: data.description,
          location: data.location,
          type: data.type,
          branchId: data.branchId
        };
      });
      setEvents(loadedEvents);
      try { localStorage.setItem('church_events', JSON.stringify(loadedEvents)); } catch {}
      setIsLoading(false);
    }, (error) => {
      console.warn("Error loading events from Firestore, using cache:", error);
      const saved = localStorage.getItem('church_events');
      if (saved) {
        try { setEvents(JSON.parse(saved)); } catch (e) {}
      }
      setIsLoading(false);
    });

    const membersUnsub = onSnapshot(collection(db, 'members'), (snapshot) => {
      setMembers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {
      const saved = localStorage.getItem('churchMembers');
      if (saved) {
        try { setMembers(JSON.parse(saved)); } catch (e) {}
      }
    });

    return () => {
      unsubscribe();
      membersUnsub();
    };
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter(e => matchesBranch(e, activeBranch, branches));
  }, [events, activeBranch, branches]);

  const handleSelectSlot = (slotInfo: { start: Date, end: Date }) => {
    setStartDate(format(slotInfo.start, 'yyyy-MM-dd'));
    setEndDate(format(slotInfo.start, 'yyyy-MM-dd')); // default to same day
    setStartTime("19:00");
    setEndTime("21:00");
    setTitle("");
    setDescription("");
    setLocation("");
    setEventType("culto");
    setEventBranch(activeBranch !== 'all' ? activeBranch : branches[0]?.id || "sede");
    setSelectedEvent(null);
    setIsModalOpen(true);
  };

  const handleSelectEvent = (event: any) => {
    setSelectedEvent(event);
    setTitle(event.title);
    setDescription(event.description || "");
    setLocation(event.location || "");
    setEventType(event.type || "culto");
    setEventBranch(event.branchId || (activeBranch !== 'all' ? activeBranch : branches[0]?.id || "sede"));
    setStartDate(format(event.start, 'yyyy-MM-dd'));
    setStartTime(format(event.start, 'HH:mm'));
    setEndDate(format(event.end, 'yyyy-MM-dd'));
    setEndTime(format(event.end, 'HH:mm'));
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const startDateTime = new Date(`${startDate}T${startTime}`);
      const endDateTime = new Date(`${endDate}T${endTime}`);

      if (startDateTime > endDateTime) {
        toast.error("A data de término deve ser posterior à data de início.");
        return;
      }

      const eventData = {
        title: normalizeUTF8(title),
        description: normalizeUTF8(description),
        location: normalizeUTF8(location),
        type: eventType,
        start: startDateTime,
        end: endDateTime,
        branchId: eventBranch || (activeBranch !== 'all' ? activeBranch : branches[0]?.id || 'sede'),
        updatedAt: serverTimestamp(),
        updatedBy: user?.name || 'Sistema'
      };

      if (selectedEvent) {
        await updateDoc(doc(db, 'events', selectedEvent.id), eventData);
        logAction("Agenda", `Evento atualizado: ${title}`, user?.name || "Sistema");
        toast.success("Evento atualizado com sucesso!");
      } else {
        await addDoc(collection(db, 'events'), {
          ...eventData,
          createdAt: serverTimestamp(),
          createdBy: user?.name || 'Sistema'
        });
        logAction("Agenda", `Novo evento criado: ${title}`, user?.name || "Sistema");
        toast.success("Evento adicionado à agenda!");
      }

      setIsModalOpen(false);
    } catch (error: any) {
      logCriticalError({
        error,
        source: "database",
        severity: "critical",
        message: "Erro ao salvar evento na Agenda: " + (error.message || String(error)),
        context: { title, startDate, startTime, eventBranch }
      });
      console.error("Error saving event:", error);
      toast.error("Erro ao salvar evento");
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    if (confirm("Tem certeza que deseja excluir este evento?")) {
      try {
        await deleteDoc(doc(db, 'events', selectedEvent.id));
        logAction("Agenda", `Evento excluído: ${selectedEvent.title}`, user?.name || "Sistema");
        toast.success("Evento excluído!");
        setIsModalOpen(false);
      } catch (error: any) {
        logCriticalError({
          error,
          source: "database",
          severity: "error",
          message: "Erro ao excluir evento da Agenda: " + (error.message || String(error)),
          context: { eventId: selectedEvent.id }
        });
        console.error("Error deleting event:", error);
        toast.error("Erro ao excluir evento");
      }
    }
  };

  const handleCreateCustomType = () => {
    const trimmed = newTypeName.trim();
    if (!trimmed) {
      toast.error("Por favor, digite o nome do novo tipo de evento.");
      return;
    }
    const newId = 'tipo_' + Date.now();
    const newObj: CustomEventType = {
      id: newId,
      label: trimmed,
      color: newTypeColor || '#3b82f6'
    };
    const updated = [...customTypes, newObj];
    setCustomTypes(updated);
    try {
      localStorage.setItem('church_custom_event_types', JSON.stringify(updated));
    } catch {}
    setEventType(newId);
    setNewTypeName("");
    setIsNewTypeModalOpen(false);
    toast.success(`Tipo de evento "${trimmed}" cadastrado com sucesso!`);
  };

  const eventStyleGetter = (event: any) => {
    const matchedType = allEventTypes.find(t => t.id === event.type || t.label.toLowerCase() === (event.type || '').toLowerCase());
    const backgroundColor = matchedType?.color || '#3b82f6';

    return {
      style: {
        backgroundColor,
        borderRadius: '6px',
        opacity: 0.95,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '0.82rem',
        fontWeight: 600,
        padding: '3px 7px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
      }
    };
  };

  // Resumo analítico de eventos
  const calendarSummary = useMemo(() => {
    const total = filteredEvents.length;
    const nowTime = new Date().getTime();
    const upcoming = filteredEvents
      .filter(e => e.start && e.start.getTime() >= nowTime)
      .sort((a, b) => a.start.getTime() - b.start.getTime());

    const cultosCount = filteredEvents.filter(e => e.type === 'culto').length;
    const nextEvent = upcoming[0] || null;

    return { total, cultosCount, nextEvent };
  }, [filteredEvents]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-7xl mx-auto"
    >
      <PageHeader 
        title={
          <div className="flex items-center gap-2">
            <span>Agenda & Gestor de Eventos</span>
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-white/40 bg-white/10 text-white flex items-center gap-1.5 font-medium">
              <Building2 className="w-3.5 h-3.5" />
              {activeBranchName}
            </Badge>
          </div>
        } 
        description="Planejamento elegante e oficial de cultos, ensaios, reuniões e eventos da congregação."
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              onClick={() => setIsEscalasOpen(true)} 
              variant="outline" 
              className="bg-white/10 text-white hover:bg-white/20 border-white/30 font-semibold px-4 shadow-xs"
            >
              <Users className="mr-2 h-4 w-4" /> Escalas de Voluntários
            </Button>
            <Button 
              onClick={() => setIsNewTypeModalOpen(true)} 
              variant="outline" 
              className="bg-white/10 text-white hover:bg-white/20 border-white/30 font-semibold px-3 shadow-xs"
            >
              <Plus className="mr-1.5 h-4 w-4" /> Novo Tipo de Evento
            </Button>
            <Button onClick={() => { handleSelectSlot({ start: new Date(), end: new Date() }); }} className="bg-white text-blue-600 hover:bg-slate-100 font-semibold px-5 shadow-md">
              <Plus className="mr-2 h-4 w-4" /> Agendar Evento
            </Button>
          </div>
        }
      />

      {/* Cards de Resumo Elegante da Agenda */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-card border-border/80 shadow-xs rounded-2xl overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total de Eventos</span>
              <div className="text-2xl font-black text-foreground mt-1">{calendarSummary.total}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Programações cadastradas</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs rounded-2xl overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cultos Oficiais</span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{calendarSummary.cultosCount}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Celebrações e doutrinas</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs rounded-2xl overflow-hidden">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Próximo Evento</span>
              <div className="text-sm font-bold text-foreground mt-1 truncate">
                {calendarSummary.nextEvent ? calendarSummary.nextEvent.title : "Nenhum agendado"}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {calendarSummary.nextEvent ? format(calendarSummary.nextEvent.start, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "Agenda livre"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-border/80 rounded-2xl overflow-hidden bg-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-[650px] flex items-center justify-center bg-muted/20">
               <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="h-[680px] bg-card p-4 rounded-2xl">
              <Calendar
                localizer={localizer}
                culture="pt-BR"
                formats={calendarFormats}
                events={filteredEvents}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                selectable
                onSelectSlot={handleSelectSlot}
                onSelectEvent={handleSelectEvent}
                eventPropGetter={eventStyleGetter}
                views={['month', 'week', 'day', 'agenda']}
                view={view}
                onView={setView}
                date={date}
                onNavigate={setDate}
                messages={{
                  next: "Próximo",
                  previous: "Anterior",
                  today: "Hoje",
                  month: "Mês",
                  week: "Semana",
                  day: "Dia",
                  agenda: "Lista",
                  noEventsInRange: "Não há eventos agendados para este período."
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL DE CRIAÇÃO / EDIÇÃO DE EVENTO */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[560px] p-0 overflow-hidden rounded-2xl">
          <div className="bg-muted/40 border-b px-6 py-4 flex justify-between items-center">
             <div>
               <DialogTitle className="text-xl font-bold">{selectedEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
               <DialogDescription>Preencha os detalhes da programação na agenda.</DialogDescription>
             </div>
          </div>
          <form onSubmit={handleSaveEvent} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-foreground font-semibold text-xs">Título do Evento *</Label>
              <Input 
                id="title" 
                placeholder="Ex: Culto de Celebração, Ceia do Senhor, Ensaio Louvor" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
                className="bg-background"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label className="text-foreground font-semibold text-xs">Igreja / Congregação</Label>
              <Select value={eventBranch} onValueChange={setEventBranch}>
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Selecione a congregação" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-1.5">
                 <div className="flex items-center justify-between">
                   <Label className="text-foreground font-semibold text-xs">Tipo de Evento</Label>
                   <Button
                     type="button"
                     variant="ghost"
                     size="sm"
                     onClick={() => setIsNewTypeModalOpen(true)}
                     className="h-5 px-1.5 text-[11px] text-primary hover:bg-primary/10 font-semibold"
                   >
                     <Plus className="w-3 h-3 mr-0.5" /> Novo Tipo
                   </Button>
                 </div>
                 <Select value={eventType} onValueChange={(val) => {
                   if (val === '__add_new__') {
                     setIsNewTypeModalOpen(true);
                   } else {
                     setEventType(val);
                   }
                 }}>
                   <SelectTrigger className="bg-background">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     {allEventTypes.map((t) => (
                       <SelectItem key={t.id} value={t.id}>
                         <div className="flex items-center gap-2">
                           <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                           <span>{t.label}</span>
                         </div>
                       </SelectItem>
                     ))}
                     <SelectItem value="__add_new__" className="text-primary font-semibold border-t mt-1">
                       <div className="flex items-center gap-1.5">
                         <Plus className="w-3.5 h-3.5" />
                         <span>+ Cadastrar Novo Tipo...</span>
                       </div>
                     </SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-1.5">
                 <Label className="text-foreground font-semibold text-xs">Local (Opcional)</Label>
                 <div className="relative">
                   <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                   <Input 
                     className="pl-8 bg-background" 
                     placeholder="Templo principal, Sala 2..." 
                     value={location}
                     onChange={e => setLocation(e.target.value)}
                   />
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-muted/40 rounded-xl border border-border/60">
               <div className="space-y-2">
                 <Label className="text-foreground font-semibold text-xs flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5 text-primary"/> Início</Label>
                 <Input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-background text-xs" />
                 <Input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-background text-xs" />
               </div>
               <div className="space-y-2">
                 <Label className="text-foreground font-semibold text-xs flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary"/> Término</Label>
                 <Input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-background text-xs" />
                 <Input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-background text-xs" />
               </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-foreground font-semibold text-xs flex items-center gap-1.5"><AlignLeft className="w-3.5 h-3.5" /> Descrição e Detalhes</Label>
              <textarea 
                className="flex min-h-[75px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Informações adicionais sobre o evento, pregador convidado, tema, etc..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="flex justify-between pt-2">
              {selectedEvent ? (
                 <Button type="button" variant="destructive" size="sm" onClick={handleDeleteEvent}>
                    <Trash2 className="w-4 h-4 mr-1.5"/> Excluir Evento
                 </Button>
              ) : <div></div>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90 text-white font-semibold">Salvar Evento</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL PARA CADASTRAR NOVO TIPO DE EVENTO */}
      <Dialog open={isNewTypeModalOpen} onOpenChange={setIsNewTypeModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Novo Tipo de Evento
            </DialogTitle>
            <DialogDescription>
              Cadastre um novo tipo personalizado de evento para classificar a programação na agenda.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="newTypeNameInput" className="text-xs font-semibold">Nome do Tipo de Evento *</Label>
              <Input
                id="newTypeNameInput"
                placeholder="Ex: Retiro de Jovens, Vigília da Vitória, Ceia..."
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateCustomType();
                  }
                }}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Cor de Identificação no Calendário</Label>
              <div className="flex items-center gap-2.5 flex-wrap pt-1">
                {[
                  { color: '#3b82f6', label: 'Azul' },
                  { color: '#8b5cf6', label: 'Roxo' },
                  { color: '#10b981', label: 'Verde' },
                  { color: '#f59e0b', label: 'Âmbar' },
                  { color: '#ef4444', label: 'Vermelho' },
                  { color: '#ec4899', label: 'Rosa' },
                  { color: '#06b6d4', label: 'Ciano' },
                  { color: '#6366f1', label: 'Índigo' }
                ].map((item) => (
                  <button
                    key={item.color}
                    type="button"
                    onClick={() => setNewTypeColor(item.color)}
                    className={`w-7 h-7 rounded-full border-2 transition-transform ${
                      newTypeColor === item.color ? 'scale-115 border-foreground shadow-sm' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: item.color }}
                    title={item.label}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setIsNewTypeModalOpen(false)}>Cancelar</Button>
            <Button type="button" onClick={handleCreateCustomType} className="bg-primary text-white">Cadastrar Tipo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GestaoEscalasModal
        isOpen={isEscalasOpen}
        onClose={() => setIsEscalasOpen(false)}
        members={members}
        activeBranchName={activeBranchName}
      />
    </motion.div>
  );
}
