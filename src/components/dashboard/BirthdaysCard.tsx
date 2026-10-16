import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Cake, 
  Search, 
  MessageCircle, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Copy, 
  UserCheck, 
  Phone,
  Gift
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { useBranch } from "@/contexts/BranchContext";
import { matchesBranch } from "@/lib/branchUtils";

interface Member {
  id: string | number;
  name: string;
  birthDate?: string;
  dataNascimento?: string;
  phone?: string;
  email?: string;
  role?: string;
  status?: string;
  photoUrl?: string;
  branchId?: string;
}

interface BirthdaysCardProps {
  members: Member[];
  activeBranch?: string;
}

export function BirthdaysCard({ members, activeBranch: propActiveBranch }: BirthdaysCardProps) {
  const { activeBranch: contextActiveBranch, branches } = useBranch();
  const activeBranch = propActiveBranch || contextActiveBranch;

  const [selectedMonthOffset, setSelectedMonthOffset] = useState(0); // 0 = current month, 1 = next month, -1 = prev month
  const [search, setSearch] = useState("");

  const targetDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + selectedMonthOffset);
    return d;
  }, [selectedMonthOffset]);

  const targetMonthNum = targetDate.getMonth() + 1; // 1-12
  const targetMonthName = targetDate.toLocaleDateString('pt-BR', { month: 'long' });
  const isCurrentCalendarMonth = selectedMonthOffset === 0;

  // Filter and parse birthdays
  const birthdaysList = useMemo(() => {
    const today = new Date();
    const todayDay = today.getDate();
    const todayMonth = today.getMonth() + 1;

    return members
      .filter(m => matchesBranch(m, activeBranch, branches))
      .map(m => {
        const rawDate = m.birthDate || m.dataNascimento;
        if (!rawDate) return null;

        let day = 0;
        let month = 0;
        let year: number | null = null;

        if (typeof rawDate === 'string') {
          if (rawDate.includes('/')) {
            const parts = rawDate.split('/');
            day = parseInt(parts[0], 10);
            month = parseInt(parts[1], 10);
            if (parts.length >= 3) year = parseInt(parts[2], 10);
          } else if (rawDate.includes('-')) {
            const parts = rawDate.split('-');
            if (parts[0].length === 4) {
              // YYYY-MM-DD
              year = parseInt(parts[0], 10);
              month = parseInt(parts[1], 10);
              day = parseInt(parts[2], 10);
            } else {
              // DD-MM-YYYY
              day = parseInt(parts[0], 10);
              month = parseInt(parts[1], 10);
              year = parseInt(parts[2], 10);
            }
          }
        } else if ((rawDate as any)?.toDate) {
          const d = (rawDate as any).toDate();
          day = d.getDate();
          month = d.getMonth() + 1;
          year = d.getFullYear();
        }

        if (!day || !month || isNaN(day) || isNaN(month)) return null;
        if (month !== targetMonthNum) return null;

        const isToday = isCurrentCalendarMonth && day === todayDay && month === todayMonth;
        const isPast = isCurrentCalendarMonth && day < todayDay;
        const daysUntil = isCurrentCalendarMonth ? day - todayDay : null;

        // Calculate age turning if year is valid
        let ageTurning: number | null = null;
        if (year && year > 1900 && year < today.getFullYear()) {
          ageTurning = today.getFullYear() - year;
        }

        return {
          ...m,
          day,
          month,
          year,
          isToday,
          isPast,
          daysUntil,
          ageTurning
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => {
        // Today first, then ascending by day
        if (a.isToday) return -1;
        if (b.isToday) return 1;
        return a.day - b.day;
      });
  }, [members, activeBranch, targetMonthNum, isCurrentCalendarMonth]);

  // Filter by search query
  const filteredBirthdays = useMemo(() => {
    if (!search.trim()) return birthdaysList;
    const q = search.toLowerCase();
    return birthdaysList.filter(m => 
      m.name.toLowerCase().includes(q) || 
      (m.role && m.role.toLowerCase().includes(q))
    );
  }, [birthdaysList, search]);

  const todayCount = useMemo(() => birthdaysList.filter(b => b.isToday).length, [birthdaysList]);

  // WhatsApp sender
  const handleOpenWhatsApp = (member: typeof birthdaysList[0]) => {
    if (!member.phone) {
      toast.error(`O membro ${member.name} não possui telefone cadastrado.`);
      return;
    }

    const cleanPhone = member.phone.replace(/\D/g, '');
    const churchName = localStorage.getItem("church_name") || "Igreja Evangélica Manancial";
    const text = encodeURIComponent(
      `A paz do Senhor, querido(a) ${member.name}! 🎉🎂\n\nEm nome da ${churchName}, queremos lhe desejar um abençoado Feliz Aniversário! Que o Senhor Deus derrame ricas bênçãos sobre sua vida, renovando suas forças com muita saúde, sabedoria, paz e alegria. Parabéns pelo seu dia!\n\n"O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e te dê a paz." (Números 6:24-26)`
    );

    const pref = localStorage.getItem("whatsappPreferredMode") || "app";
    if (pref === "app") {
      window.location.href = `whatsapp://send?phone=${phoneWithCountry}&text=${text}`;
      toast.success(`Abrindo WhatsApp para enviar parabéns a ${member.name}!`, {
        description: "Se não abrir o aplicativo, use o botão Copiar ou abra no WhatsApp Web."
      });
    } else {
      window.open(`https://web.whatsapp.com/send?phone=${phoneWithCountry}&text=${text}`, '_blank');
      toast.success(`Abrindo WhatsApp Web com mensagem de parabéns pronta!`);
    }
  };

  const handleCopyMessage = (member: typeof birthdaysList[0]) => {
    const churchName = localStorage.getItem("church_name") || "Igreja Evangélica Manancial";
    const text = `A paz do Senhor, querido(a) ${member.name}! 🎉🎂\n\nEm nome da ${churchName}, queremos lhe desejar um abençoado Feliz Aniversário! Que o Senhor Deus derrame ricas bênçãos sobre sua vida, renovando suas forças com muita saúde, sabedoria, paz e alegria. Parabéns pelo seu dia!\n\n"O Senhor te abençoe e te guarde; o Senhor faça resplandecer o seu rosto sobre ti e te dê a paz." (Números 6:24-26)`;
    navigator.clipboard.writeText(text);
    toast.success(`Mensagem de aniversário para ${member.name} copiada!`);
  };

  return (
    <Card className="border-border/80 dark:border-border/60 shadow-sm overflow-hidden flex flex-col h-full" id="birthdays-section">
      <CardHeader className="pb-3 border-b border-border/50 bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-transparent dark:from-pink-950/25 dark:via-purple-950/15">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-pink-500/15 text-pink-600 dark:text-pink-400">
              <Cake className="h-5 w-5" />
            </span>
            <div>
              <CardTitle className="text-lg font-bold tracking-tight flex items-center gap-2">
                Aniversariantes
                <Badge variant="outline" className="text-xs font-semibold px-2 border-pink-300 dark:border-pink-800 text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40 capitalize">
                  {targetMonthName} ({birthdaysList.length})
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Membros comemorando aniversário neste mês.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedMonthOffset(prev => prev - 1)}
              title="Mês Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {selectedMonthOffset !== 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2"
                onClick={() => setSelectedMonthOffset(0)}
              >
                Mês Atual
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedMonthOffset(prev => prev + 1)}
              title="Próximo Mês"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Highlight today's birthdays if any */}
        {todayCount > 0 && (
          <div className="mt-2 p-2.5 rounded-xl bg-gradient-to-r from-pink-500/20 via-purple-500/15 to-pink-500/10 border border-pink-300/60 dark:border-pink-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎉</span>
              <div>
                <span className="text-xs font-bold text-pink-900 dark:text-pink-200 block">
                  {todayCount === 1 ? 'Temos 1 aniversariante HOJE!' : `Temos ${todayCount} aniversariantes HOJE!`}
                </span>
                <span className="text-[11px] text-pink-800/80 dark:text-pink-300/80">
                  Aproveite para enviar uma mensagem de carinho e oração.
                </span>
              </div>
            </div>
            <Sparkles className="h-4 w-4 text-pink-500 animate-pulse" />
          </div>
        )}

        {/* Search bar inside card */}
        {birthdaysList.length > 5 && (
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar aniversariante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-background/50"
            />
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0 flex-1 overflow-hidden">
        {filteredBirthdays.length === 0 ? (
          <div className="p-8 text-center space-y-2 flex flex-col items-center justify-center h-full min-h-[220px]">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Gift className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium text-foreground">
              {search ? "Nenhum membro encontrado com este termo." : `Nenhum aniversariante em ${targetMonthName}.`}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Mantenha as datas de nascimento atualizadas na Secretaria para acompanhar as celebrações.
            </p>
            <Link to="/secretaria" className="mt-2 inline-flex">
              <Button size="sm" variant="outline" className="text-xs">
                Ir para Secretaria
              </Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border/60 max-h-[360px] overflow-y-auto">
            {filteredBirthdays.map((member) => {
              const initials = member.name
                .split(' ')
                .map(n => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div 
                  key={member.id} 
                  className={`p-3.5 flex items-center justify-between gap-3 transition-colors hover:bg-muted/40 ${
                    member.isToday 
                      ? 'bg-pink-500/10 dark:bg-pink-950/20' 
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Day badge or avatar */}
                    <div className={`h-11 w-11 rounded-2xl flex flex-col items-center justify-center shrink-0 text-center font-bold border ${
                      member.isToday 
                        ? 'bg-pink-600 text-white border-pink-400 ring-2 ring-pink-500/30' 
                        : 'bg-muted/60 text-foreground border-border/80'
                    }`}>
                      <span className="text-[10px] uppercase leading-none font-semibold opacity-80">DIA</span>
                      <span className="text-base leading-none mt-0.5">{member.day}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground truncate">
                          {member.name}
                        </span>
                        {member.isToday && (
                          <Badge className="text-[10px] font-bold px-1.5 py-0 h-4 bg-pink-600 text-white hover:bg-pink-600">
                            HOJE! 🎉
                          </Badge>
                        )}
                        {!member.isToday && member.daysUntil && member.daysUntil > 0 && member.daysUntil <= 7 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-purple-300 text-purple-700 dark:border-purple-800 dark:text-purple-300">
                            Em {member.daysUntil} {member.daysUntil === 1 ? 'dia' : 'dias'}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {member.role && (
                          <span className="truncate">{member.role}</span>
                        )}
                        {member.ageTurning && (
                          <span>• Completando {member.ageTurning} anos</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleCopyMessage(member)}
                      title="Copiar mensagem de parabéns"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      onClick={() => handleOpenWhatsApp(member)}
                      title="Enviar felicitações via WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                      WhatsApp
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
