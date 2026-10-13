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
  startOfWeek,
  getDay,
  locales,
});

export function Agenda() {
  const { user } = useAuth();
  const { activeBranch, branches, activeBranchName } = useBranch();
  const [events, setEvents] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

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
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading events:", error);
      toast.error("Erro ao carregar calendário");
      setIsLoading(false);
    });

    return () => unsubscribe();
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

  const eventStyleGetter = (event: any) => {
    let backgroundColor = '#3b82f6'; // blue-500 (culto/default)
    
    switch (event.type) {
      case 'reuniao': backgroundColor = '#8b5cf6'; break; // violet-500
      case 'ensaio': backgroundColor = '#f59e0b'; break; // amber-500
      case 'evento_especial': backgroundColor = '#10b981'; break; // emerald-500
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '0.85rem',
        fontWeight: 500,
        padding: '2px 6px'
      }
    };
  };

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
            <span>Agenda & Eventos</span>
            <Badge variant="outline" className="text-xs px-2.5 py-0.5 border-white/40 bg-white/10 text-white flex items-center gap-1.5 font-medium">
              <Building2 className="w-3.5 h-3.5" />
              {activeBranchName}
            </Badge>
          </div>
        } 
        description="Gestão de programações e eventos da congregação."
        action={
          <Button onClick={() => { handleSelectSlot({ start: new Date(), end: new Date() }); }} className="bg-white text-blue-600 hover:bg-slate-100 font-semibold px-6 shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Novo Evento
          </Button>
        }
      />

      <Card className="shadow-sm border-slate-200/60 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="h-[650px] flex items-center justify-center bg-slate-50/50">
               <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="h-[650px] bg-white p-4">
              <Calendar
                localizer={localizer}
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
                  noEventsInRange: "Não há eventos neste período."
                }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
          <div className="bg-slate-50 border-b px-6 py-4 flex justify-between items-center">
             <div>
               <DialogTitle className="text-xl">{selectedEvent ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
               <DialogDescription>Preencha os detalhes da programação na agenda.</DialogDescription>
             </div>
          </div>
          <form onSubmit={handleSaveEvent} className="p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-slate-700 font-semibold">Título do Evento</Label>
              <Input 
                id="title" 
                placeholder="Ex: Culto de Celebração" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
                className="bg-white"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Igreja / Congregação</Label>
              <Select value={eventBranch} onValueChange={setEventBranch}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Selecione a congregação" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label className="text-slate-700 font-semibold">Tipo de Evento</Label>
                 <Select value={eventType} onValueChange={setEventType}>
                   <SelectTrigger className="bg-white">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="culto">Culto</SelectItem>
                     <SelectItem value="reuniao">Reunião de Liderança</SelectItem>
                     <SelectItem value="ensaio">Ensaio (Ministério)</SelectItem>
                     <SelectItem value="evento_especial">Evento Especial / Congresso</SelectItem>
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label className="text-slate-700 font-semibold">Local (Opcional)</Label>
                 <div className="relative">
                   <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                   <Input 
                     className="pl-8 bg-white" 
                     placeholder="Templo principal, Sala 2..." 
                     value={location}
                     onChange={e => setLocation(e.target.value)}
                   />
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
               <div className="space-y-3">
                 <Label className="text-slate-700 font-semibold flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary"/> Início</Label>
                 <Input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-white" />
                 <Input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className="bg-white" />
               </div>
               <div className="space-y-3">
                 <Label className="text-slate-700 font-semibold flex items-center gap-2"><Clock className="w-4 h-4 text-primary"/> Término</Label>
                 <Input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-white" />
                 <Input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} className="bg-white" />
               </div>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold flex items-center gap-2"><AlignLeft className="w-4 h-4" /> Descrição e Detalhes</Label>
              <textarea 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Informações adicionais sobre o evento..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            <div className="flex justify-between pt-2">
              {selectedEvent ? (
                 <Button type="button" variant="destructive" onClick={handleDeleteEvent}>
                    <Trash2 className="w-4 h-4 mr-2"/> Excluir
                 </Button>
              ) : <div></div>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">Salvar Evento</Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
