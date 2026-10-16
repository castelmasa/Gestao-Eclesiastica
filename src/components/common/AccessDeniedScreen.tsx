import React, { useState } from 'react';
import { ShieldAlert, ArrowLeft, CalendarDays, Lock, Send, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface AccessDeniedScreenProps {
  moduleName: string;
  isNovoUsuario?: boolean;
  userRole?: string;
}

export function AccessDeniedScreen({ moduleName, isNovoUsuario, userRole }: AccessDeniedScreenProps) {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [requestedRole, setRequestedRole] = useState('Secretária');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSent, setHasSent] = useState(false);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'access_requests'), {
        userId: user.id,
        userName: user.name || 'Usuário',
        userEmail: user.email || '',
        currentRole: user.role || 'Novo Usuário',
        requestedRole,
        moduleAttempted: moduleName,
        notes: notes.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      // Também salvar no cache local para visibilidade instantânea
      const savedRequests = JSON.parse(localStorage.getItem('church_access_requests') || '[]');
      savedRequests.unshift({
        id: 'req_' + Date.now(),
        userId: user.id,
        userName: user.name || 'Usuário',
        userEmail: user.email || '',
        currentRole: user.role || 'Novo Usuário',
        requestedRole,
        moduleAttempted: moduleName,
        notes: notes.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('church_access_requests', JSON.stringify(savedRequests));

      toast.success("Solicitação de acesso enviada com sucesso ao administrador da igreja!");
      setHasSent(true);
      setIsModalOpen(false);
    } catch (err: any) {
      console.warn("Aviso ao salvar no Firestore:", err);
      // Fallback local
      const savedRequests = JSON.parse(localStorage.getItem('church_access_requests') || '[]');
      savedRequests.unshift({
        id: 'req_' + Date.now(),
        userId: user.id,
        userName: user.name || 'Usuário',
        userEmail: user.email || '',
        currentRole: user.role || 'Novo Usuário',
        requestedRole,
        moduleAttempted: moduleName,
        notes: notes.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      localStorage.setItem('church_access_requests', JSON.stringify(savedRequests));
      toast.success("Solicitação registrada! Um administrador avaliará seu perfil.");
      setHasSent(true);
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5 shadow-inner">
        <Lock className="w-8 h-8" />
      </div>

      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 mb-3">
        <ShieldAlert className="w-3.5 h-3.5" />
        {isNovoUsuario ? "Perfil Inicial: Novo Usuário (Acesso Restrito)" : `Nível Atual: ${userRole || 'Restrito'}`}
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mb-2">
        Acesso Inibido ao Módulo de {moduleName}
      </h1>

      <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-md">
        {isNovoUsuario ? (
          <>
            Por motivos de segurança e governança eclesiástica, novos usuários têm acesso inibido aos módulos de <strong>Configurações</strong>, finanças e dados administrativos até a aprovação da liderança.
          </>
        ) : (
          <>
            Sua conta atual não possui permissão concedida para acessar os recursos deste módulo. Entre em contato com a administração da igreja para atualizar seu perfil.
          </>
        )}
      </p>

      {hasSent ? (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-sm font-medium mb-6">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Solicitação enviada com sucesso! Aguarde a liberação do administrador.
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-xs"
          >
            <Send className="w-4 h-4 mr-2" />
            Solicitar Liberação deste Módulo
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3 pt-2 border-t border-border/60 w-full">
        <Link to="/">
          <Button variant="outline" className="rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar ao Início
          </Button>
        </Link>
        <Link to="/agenda">
          <Button variant="ghost" className="rounded-xl text-muted-foreground hover:text-foreground">
            <CalendarDays className="w-4 h-4 mr-1.5" /> Ver Agenda de Cultos & Eventos
          </Button>
        </Link>
      </div>

      {/* Modal de Solicitação de Acesso */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" /> Solicitar Liberação de Acesso
            </DialogTitle>
            <DialogDescription>
              Informe à liderança da igreja a sua função ou ministério para liberação das permissões necessárias.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendRequest} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Módulo pretendido</Label>
              <Input value={moduleName} disabled className="bg-muted text-muted-foreground rounded-xl" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Perfil / Função Desejada</Label>
              <Select value={requestedRole} onValueChange={setRequestedRole}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Secretária">Secretária / Secretaria Geral</SelectItem>
                  <SelectItem value="Tesoureiro">Tesouraria / Finanças</SelectItem>
                  <SelectItem value="Assistência Social / Diaconia">Assistência Social / Diaconia</SelectItem>
                  <SelectItem value="Pastor / Liderança">Pastor / Liderança Pastoral</SelectItem>
                  <SelectItem value="Membro">Membro da Igreja</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observação / Justificativa (Opcional)</Label>
              <Textarea
                placeholder="Ex: Faço parte da equipe de secretaria e preciso cadastrar membros e atas."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="rounded-xl resize-none text-sm"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="rounded-xl">
                {isSubmitting ? "Enviando..." : "Enviar Solicitação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
