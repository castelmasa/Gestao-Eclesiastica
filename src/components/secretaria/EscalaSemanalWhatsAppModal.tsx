import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  Copy,
  ExternalLink,
  Share2,
  Calendar,
  Building2,
  Sparkles,
  Check,
  Send,
  Users,
  Clock,
  RefreshCw,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { getChurchLeadershipConfig } from "@/lib/churchConfigHelper";

export interface EscalaSemanalWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  branchId?: string;
  branchName?: string;
}

export function EscalaSemanalWhatsAppModal({
  isOpen,
  onClose,
  branchId = "all",
  branchName = "Sede Geral",
}: EscalaSemanalWhatsAppModalProps) {
  const [copied, setCopied] = useState(false);
  const [groupPhone, setGroupPhone] = useState("");

  const churchLeadership = useMemo(() => {
    return getChurchLeadershipConfig(branchId);
  }, [branchId]);

  // Identifica a semana atual (segunda a domingo)
  const defaultWeekLabel = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // ajusta para segunda
    startOfWeek.setDate(diff);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const format = (d: Date) =>
      `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;

    return `Semana de ${format(startOfWeek)} a ${format(endOfWeek)}/${endOfWeek.getFullYear()}`;
  }, []);

  const [periodLabel, setPeriodLabel] = useState(defaultWeekLabel);

  // Template da mensagem formatada para WhatsApp
  const [messageText, setMessageText] = useState("");

  // Monta a mensagem padrão bem estruturada
  const generateDefaultMessage = () => {
    const churchName = churchLeadership.church.name || "Igreja Evangélica Pentecostal O Brasil para Cristo";
    const pastorName = churchLeadership.pastor.name || "Carlito Carvalho Rodrigues";

    return `🕊️ *ESCALA SEMANAL DE MINISTÉRIOS* 📖
*${churchName.toUpperCase()}*
📍 _Congregação: ${branchName}_
🗓️ _${periodLabel}_

_"Servi ao Senhor com alegria e apresentai-vos a ele com cântico." (Salmos 100:2)_

━━━━━━━━━━━━━━━━━━━━
📅 *QUINTA-FEIRA (19:30) - CULTO DE DOUTRINA & ORAÇÃO*
🎙️ *Dirigente:* Presb. Marcos Silva
📖 *Pregador:* ${pastorName}
🎵 *Louvor:* Grupo de Louvor Local
🛡️ *Diaconato:* Diác. José e Equipe
🧹 *Limpeza:* Grupo 01

━━━━━━━━━━━━━━━━━━━━
📅 *SÁBADO (19:30) - CULTO DE JOVENS & EVENTOS*
🎙️ *Dirigente:* Liderança de Jovens
📖 *Pregador da Palavra:* Obreiro Convidado
🎵 *Louvor:* Banda Jovem
🛡️ *Recepção:* Voluntários do Diaconato

━━━━━━━━━━━━━━━━━━━━
📅 *DOMINGO (09:00) - ESCOLA BÍBLICA DOMINICAL (EBD)*
🎙️ *Dirigente:* Superintendente da EBD
📖 *Ministrantes:* Professores das Classes
🛡️ *Recepção:* Equipe de Acolhimento

━━━━━━━━━━━━━━━━━━━━
📅 *DOMINGO (19:00) - GRANDE CULTO DA FAMÍLIA & CELEBRAÇÃO*
🎙️ *Dirigente:* Evangelista Responsável
📖 *Pregador:* ${pastorName}
🎵 *Ministério de Louvor:* Equipe Geral
🛡️ *Diaconato & Portaria:* Equipe Escala do Mês
🧹 *Conservação:* Grupo de Apoio

━━━━━━━━━━━━━━━━━━━━
⚠️ *ORIENTAÇÕES IMPORTANTES PARA OS OBREIROS:*
• Solicitamos aos irmãos escalados a presença com *15 minutos de antecedência* para a oração de consagração no gabinete.
• Em caso de extrema necessidade de permuta, avisar a liderança da secretaria com antecedência.

_Contamos com a dedicação e o amor de todos na obra do Senhor Jesus!_ 🙏`;
  };

  useEffect(() => {
    if (isOpen) {
      setMessageText(generateDefaultMessage());
    }
  }, [isOpen, periodLabel, branchName, churchLeadership]);

  // Copiar mensagem
  const handleCopy = () => {
    navigator.clipboard.writeText(messageText);
    setCopied(true);
    toast.success("Escala copiada com formatação para o WhatsApp!");
    setTimeout(() => setCopied(false), 2500);
  };

  // Abrir WhatsApp Web
  const handleOpenWhatsAppWeb = () => {
    const encoded = encodeURIComponent(messageText);
    const cleanPhone = groupPhone.replace(/\D/g, "");
    const url = cleanPhone
      ? `https://web.whatsapp.com/send?phone=55${cleanPhone}&text=${encoded}`
      : `https://web.whatsapp.com/send?text=${encoded}`;
    window.open(url, "_blank");
  };

  // Abrir wa.me no celular / app
  const handleOpenWhatsAppApp = () => {
    const encoded = encodeURIComponent(messageText);
    const cleanPhone = groupPhone.replace(/\D/g, "");
    const url = cleanPhone
      ? `https://wa.me/55${cleanPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(url, "_blank");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-2xl max-h-[94vh] flex flex-col p-0 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
        {/* Header */}
        <DialogHeader className="!m-0 p-5 sm:p-6 pb-4 border-b border-border bg-muted/20 sticky top-0 bg-background z-10 shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Disparo da Escala Semanal no WhatsApp</span>
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm mt-0.5">
                Gere o resumo completo dos cultos da semana e envie no grupo dos obreiros e ministérios.
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300">
                <Building2 className="w-3.5 h-3.5 mr-1" />
                {branchName}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Conteúdo */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Período da Escala</Label>
              <Input
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                className="text-xs h-8 bg-background"
                placeholder="Ex: Semana de 10 a 16 de Novembro"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Número do Grupo ou Obreiro (Opcional)</Label>
              <Input
                value={groupPhone}
                onChange={(e) => setGroupPhone(e.target.value)}
                className="text-xs h-8 bg-background font-mono"
                placeholder="Ex: (18) 99109-9608"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Texto da Mensagem Formatada (Editável antes de enviar)</Label>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setMessageText(generateDefaultMessage())}
                className="text-[11px] h-6 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Restaurar Padrão
              </Button>
            </div>
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="text-xs font-mono h-72 resize-none bg-background leading-relaxed"
            />
          </div>

          {/* Dica de Envio */}
          <div className="bg-emerald-500/10 border border-emerald-300 dark:border-emerald-800/60 rounded-xl p-3 text-xs text-emerald-950 dark:text-emerald-200 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Dica de Envio:</span> Clique em <strong>"Copiar Texto"</strong> para colar diretamente em qualquer grupo do WhatsApp, ou clique em <strong>"WhatsApp Web"</strong> para abrir a conversa já com a mensagem pronta.
            </div>
          </div>
        </div>

        {/* Footer com Botões de Ação */}
        <DialogFooter className="p-4 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
            Fechar
          </Button>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleCopy}
              variant="outline"
              size="sm"
              className="text-xs font-semibold border-slate-300"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 mr-1 text-primary" />}
              {copied ? "Copiado!" : "Copiar Texto"}
            </Button>

            <Button
              onClick={handleOpenWhatsAppWeb}
              size="sm"
              className="text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              WhatsApp Web
            </Button>

            <Button
              onClick={handleOpenWhatsAppApp}
              size="sm"
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
            >
              <Send className="w-3.5 h-3.5 mr-1.5" />
              Enviar no Celular (wa.me)
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
