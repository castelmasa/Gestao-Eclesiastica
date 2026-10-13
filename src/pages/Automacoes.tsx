import { motion } from "motion/react"
import React, { useState, useEffect } from "react"
import { Plus, Settings, Play, CheckCircle2, Workflow, Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useAuth } from "@/contexts/AuthContext"
import { logAction } from "@/lib/audit"

interface Rule {
    id: string;
    name: string;
    trigger: string;
    action: string;
    actionParams: string;
    active: boolean;
}

const DEFAULT_RULES: Rule[] = [
    {
        id: "rule-budget",
        name: "Alerta de Limite Orçamentário",
        trigger: "BUDGET_EXCEEDED",
        action: "SEND_NOTIFICATION",
        actionParams: "Alerta ao Tesoureiro: Uma despesa ultrapassou o teto estipulado para a categoria.",
        active: true
    },
    {
        id: "rule-birthday",
        name: "Felicitações aos Aniversariantes",
        trigger: "BIRTHDAY",
        action: "SEND_WHATSAPP",
        actionParams: "Feliz Aniversário em nome de toda a igreja! Que o Senhor Deus derrame ricas bênçãos sobre sua vida.",
        active: true
    },
    {
        id: "rule-inactive-tither",
        name: "Atenção Pastoral: Dizimista Inativo (>90 dias)",
        trigger: "INACTIVE_TITHER",
        action: "SEND_NOTIFICATION",
        actionParams: "Notificação Pastoral/Secretaria: Membro sem registro de contribuição de dízimo há mais de 90 dias.",
        active: true
    },
    {
        id: "rule-new-tither",
        name: "Boas-vindas ao Novo Dizimista",
        trigger: "NEW_TITHER",
        action: "SEND_WHATSAPP",
        actionParams: "Agradecemos de coração pela sua fidelidade e generosidade. Seja muito bem-vindo como dizimista!",
        active: true
    }
];

export function Automacoes() {
    const { user } = useAuth();
    const [rules, setRules] = useState<Rule[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem("churchAutomations");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (parsed.length > 0) {
                    setRules(parsed);
                    return;
                }
            } catch (e) {
                console.error(e);
            }
        }
        // Seed default rules
        setRules(DEFAULT_RULES);
        localStorage.setItem("churchAutomations", JSON.stringify(DEFAULT_RULES));
    }, []);

    const saveRules = (newRules: Rule[]) => {
        setRules(newRules);
        localStorage.setItem("churchAutomations", JSON.stringify(newRules));
        window.dispatchEvent(new Event("churchAutomationsUpdated"));
    };

    const handleCreateRule = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const newRule: Rule = {
            id: Date.now().toString(),
            name: formData.get("name") as string,
            trigger: formData.get("trigger") as string,
            action: formData.get("action") as string,
            actionParams: formData.get("actionParams") as string,
            active: true
        };
        const newRules = [...rules, newRule];
        saveRules(newRules);
        setIsModalOpen(false);
        toast.success("Regra de automação criada com sucesso!");
        logAction("Criação de Automação", `Regra criada: ${newRule.name}`, user?.name || "Desconhecido");
    };

    const toggleRule = (id: string) => {
        const newRules = rules.map(r => r.id === id ? { ...r, active: !r.active } : r);
        saveRules(newRules);
    };

    const deleteRule = (id: string, name: string) => {
        const newRules = rules.filter(r => r.id !== id);
        saveRules(newRules);
        toast.success("Regra removida com sucesso!");
        logAction("Exclusão de Automação", `Regra deletada: ${name}`, user?.name || "Desconhecido");
    };

    const getTriggerLabel = (trigger: string) => {
        switch (trigger) {
            case 'BUDGET_EXCEEDED': return 'Despesa Ultrapassa Limite da Categoria';
            case 'BIRTHDAY': return 'Aniversário de Membro no Dia';
            case 'INACTIVE_TITHER': return 'Dizimista Inativo há mais de 90 dias';
            case 'NEW_TITHER': return 'Novo Dizimista (Primeiro Dízimo)';
            case 'MEMBER_ADDED': return 'Novo Membro Cadastrado';
            case 'TRANSACTION_ADDED': return 'Nova Transação Registrada';
            case 'DOCUMENT_ISSUED': return 'Documento / Certificado Emitido';
            case 'ASSET_MAINTENANCE': return 'Manutenção de Patrimônio';
            default: return trigger;
        }
    };

    const getActionLabel = (action: string) => {
        switch (action) {
            case 'SEND_NOTIFICATION': return '🔔 Notificação Interna no Sistema';
            case 'SEND_WHATSAPP': return '💬 Enviar Mensagem via WhatsApp';
            case 'SEND_EMAIL': return '📧 Disparar E-mail Automático';
            case 'CREATE_TASK': return '📅 Criar Tarefa na Agenda';
            default: return action;
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 max-w-5xl mx-auto"
        >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Workflow className="h-8 w-8 text-primary" />
                        Automações & Regras
                    </h2>
                    <p className="text-muted-foreground mt-1">Crie fluxos inteligentes para alertas financeiros, felicitações e acompanhamento de membros.</p>
                </div>
                <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> Nova Regra</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Criar Regra de Automação</DialogTitle>
                            <DialogDescription>Configure o gatilho e a ação desejada para o fluxo.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCreateRule}>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Nome da Regra</Label>
                                    <Input id="name" name="name" placeholder="Ex: Boas-vindas para Novo Dizimista" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="trigger">SE acontecer isso (Gatilho)</Label>
                                    <Select name="trigger" required defaultValue="BUDGET_EXCEEDED">
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BUDGET_EXCEEDED">Despesa Excede Limite da Categoria</SelectItem>
                                            <SelectItem value="BIRTHDAY">Aniversário de Membro</SelectItem>
                                            <SelectItem value="INACTIVE_TITHER">Dizimista Inativo (&gt; 90 dias)</SelectItem>
                                            <SelectItem value="NEW_TITHER">Novo Dizimista (Primeiro Dízimo)</SelectItem>
                                            <SelectItem value="MEMBER_ADDED">Novo Membro Cadastrado</SelectItem>
                                            <SelectItem value="TRANSACTION_ADDED">Nova Transação Registrada</SelectItem>
                                            <SelectItem value="DOCUMENT_ISSUED">Documento Emitido</SelectItem>
                                            <SelectItem value="ASSET_MAINTENANCE">Manutenção Preventiva (Patrimônio)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="action">ENTÃO faça aquilo (Ação)</Label>
                                    <Select name="action" required defaultValue="SEND_NOTIFICATION">
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="SEND_NOTIFICATION">Gerar Notificação no Sistema</SelectItem>
                                            <SelectItem value="SEND_WHATSAPP">Enviar Mensagem WhatsApp</SelectItem>
                                            <SelectItem value="SEND_EMAIL">Enviar E-mail</SelectItem>
                                            <SelectItem value="CREATE_TASK">Criar Tarefa na Agenda</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="actionParams">Mensagem / Parâmetros da Ação</Label>
                                    <Input id="actionParams" name="actionParams" placeholder="Ex: Alerta ao tesoureiro: despesa excedeu o limite..." required />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
                                <Button type="submit">Salvar Regra</Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {rules.length === 0 ? (
                    <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl border-border bg-card">
                        <Workflow className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground">Nenhuma automação configurada</h3>
                        <p className="text-muted-foreground mt-1">Clique em "Nova Regra" para criar o seu primeiro fluxo.</p>
                    </div>
                ) : (
                    rules.map(rule => (
                        <Card key={rule.id} className={`border-border/80 dark:border-border/60 transition-all ${rule.active ? 'bg-card shadow-sm' : 'opacity-65 bg-muted/20'}`}>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold flex justify-between items-start gap-2">
                                    <span className="text-foreground">{rule.name}</span>
                                    <div className="flex gap-1 shrink-0">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" onClick={() => deleteRule(rule.id, rule.name)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardTitle>
                                <CardDescription className="flex items-center gap-1 font-medium text-xs">
                                    {rule.active ? (
                                        <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                            <CheckCircle2 className="h-3.5 w-3.5"/> Regra Ativa
                                        </span>
                                    ) : (
                                        <span className="text-muted-foreground">Regra Inativa</span>
                                    )}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="text-sm space-y-3 pb-4">
                                <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                                    <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Gatilho (SE)</span>
                                    <div className="font-semibold text-foreground text-xs sm:text-sm">
                                        {getTriggerLabel(rule.trigger)}
                                    </div>
                                </div>
                                <div className="bg-muted/40 p-3 rounded-xl border border-border/60">
                                    <span className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider block mb-1">Ação Executada (ENTÃO)</span>
                                    <div className="font-semibold text-foreground text-xs sm:text-sm">
                                        {getActionLabel(rule.action)}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1.5 italic">
                                        "{rule.actionParams}"
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0">
                                <Button 
                                    variant={rule.active ? "outline" : "default"} 
                                    className="w-full text-xs font-medium h-8" 
                                    onClick={() => toggleRule(rule.id)}
                                >
                                    {rule.active ? 'Desativar Automação' : 'Ativar Automação'}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </motion.div>
    );
}
