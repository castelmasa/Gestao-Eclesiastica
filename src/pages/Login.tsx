import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  Smartphone, 
  Copy, 
  Sparkles, 
  ShieldCheck, 
  MessageCircle, 
  UserCheck, 
  ArrowRight,
  Building2,
  CheckCircle2,
  Lock
} from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { ChurchLogo } from "@/components/ChurchLogo";

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loginWithGoogle, loginWithEmail, loginAsTester } = useAuth();

  // Formulário para novos testadores / visitantes da demonstração
  const [testerName, setTesterName] = useState(() => {
    try {
      const saved = localStorage.getItem('church_tester_registered');
      if (saved) return JSON.parse(saved).name || '';
    } catch {}
    return '';
  });
  const [testerPhone, setTesterPhone] = useState(() => {
    try {
      const saved = localStorage.getItem('church_tester_registered');
      if (saved) return JSON.parse(saved).phone || '';
    } catch {}
    return '';
  });
  const [testerEmail, setTesterEmail] = useState(() => {
    try {
      const saved = localStorage.getItem('church_tester_registered');
      if (saved) return JSON.parse(saved).email || '';
    } catch {}
    return '';
  });
  const [testerChurch, setTesterChurch] = useState(() => {
    try {
      const saved = localStorage.getItem('church_tester_registered');
      if (saved) return JSON.parse(saved).church || '';
    } catch {}
    return '';
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginTab, setLoginTab] = useState<"teste" | "login">("teste");

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://gestao.igreja';

  // Formatação de telefone brasileira (XX) XXXXX-XXXX
  const handlePhoneChange = (val: string) => {
    const numbers = val.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) {
      setTesterPhone(numbers);
    } else if (numbers.length <= 7) {
      setTesterPhone(`(${numbers.slice(0, 2)}) ${numbers.slice(2)}`);
    } else {
      setTesterPhone(`(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`);
    }
  };

  const handleTesterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testerName.trim()) {
      toast.warning("Por favor, informe seu nome completo para testar.");
      return;
    }
    if (!testerPhone.trim() || testerPhone.replace(/\D/g, '').length < 10) {
      toast.warning("Por favor, informe seu celular / WhatsApp com DDD.");
      return;
    }
    if (!testerEmail.trim() || !testerEmail.includes('@')) {
      toast.warning("Por favor, informe um e-mail válido.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginAsTester({
        name: testerName,
        phone: testerPhone,
        email: testerEmail,
        church: testerChurch
      });

      if (res.success) {
        toast.success(`Seja bem-vindo(a), ${testerName}! Acesso de demonstração liberado.`);
      } else {
        toast.error(res.error || "Não foi possível iniciar o teste.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    try {
      const success = await loginWithGoogle();
      if (success) {
        toast.success("Login realizado com sucesso!");
      } else {
        toast.error("Erro ao realizar login com Google. Tente novamente.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      toast.warning("Informe o e-mail cadastrado.");
      return;
    }
    if (!password) {
      toast.warning("Informe sua senha.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await loginWithEmail(email, password);
      if (res.success) {
        toast.success("Login realizado com sucesso! Bem-vindo(a).");
      } else {
        toast.error(res.error || "Erro no login. Verifique seus dados.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInstallApp = () => {
    toast.info("Para instalar, adicione esta página à sua tela inicial através do menu do navegador.");
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    toast.success("Link copiado para a área de transferência!");
  };

  return (
    <div className="dark min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -left-[20%] top-1/4 w-[600px] h-[600px] bg-emerald-600/15 rounded-full blur-[140px] -z-10 pointer-events-none" />
      <div className="absolute -right-[20%] bottom-1/4 w-[600px] h-[600px] bg-purple-600/15 rounded-full blur-[140px] -z-10 pointer-events-none" />

      <div className="w-full max-w-md flex flex-col items-center py-6">
        {/* Cabeçalho Institucional de Abertura */}
        <div className="flex flex-col items-center mb-6 text-center space-y-3">
          <div className="w-20 h-20 bg-white rounded-2xl p-2.5 shadow-2xl ring-2 ring-emerald-500/30 flex items-center justify-center">
            <ChurchLogo className="w-16 h-16" />
          </div>

          <div>
            <h1 className="text-2xl font-black text-white tracking-wide uppercase">
              GESTÃO ECLESIÁSTICA
            </h1>
            <p className="text-xs font-semibold text-emerald-400 tracking-wider uppercase mt-0.5">
              Sistema Integrado de Administração Cristã &amp; Ministerial
            </p>
          </div>

          {/* Apresentação padrão organizada */}
          <p className="text-xs text-slate-300 max-w-sm leading-relaxed px-2">
            Plataforma completa de administração cristã, membresia, emissão de cartas timbradas com IA, balancete financeiro, patrimônio e escalas de ministérios.
          </p>

          <div className="h-0.5 w-16 bg-gradient-to-r from-emerald-500 to-teal-400 mx-auto rounded-full"></div>
        </div>

        {/* Card Principal com Abas (Testar Sistema vs Entrar com Conta) */}
        <Card className="w-full bg-slate-900/90 border-slate-800 shadow-2xl backdrop-blur-md rounded-2xl overflow-hidden mb-6">
          <Tabs value={loginTab} onValueChange={(v: any) => setLoginTab(v)} className="w-full">
            <div className="border-b border-slate-800 p-2 bg-slate-950/60">
              <TabsList className="grid grid-cols-2 w-full bg-slate-900 h-10 p-1">
                <TabsTrigger value="teste" className="text-xs font-bold data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                  Testar / Demonstração
                </TabsTrigger>
                <TabsTrigger value="login" className="text-xs font-bold data-[state=active]:bg-slate-800 data-[state=active]:text-white">
                  <Lock className="w-3.5 h-3.5 mr-1.5" />
                  Acesso com Conta
                </TabsTrigger>
              </TabsList>
            </div>

            {/* ABA 1: FORMULÁRIO DE TESTADORES / LEADS */}
            <TabsContent value="teste" className="p-5 space-y-4 m-0">
              <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-xl p-3 text-xs text-emerald-200">
                <div className="flex items-center gap-1.5 font-bold text-emerald-300 mb-1">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  Acesso Imediato para Testar o Sistema
                </div>
                Informe seus dados abaixo para liberar a demonstração completa de todas as ferramentas e relatórios.
              </div>

              <form onSubmit={handleTesterSubmit} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="testerName" className="text-xs font-semibold text-slate-200">
                    Seu Nome Completo *
                  </Label>
                  <Input
                    id="testerName"
                    value={testerName}
                    onChange={(e) => setTesterName(e.target.value)}
                    placeholder="Ex: Pastor Marcos Silva"
                    required
                    disabled={isSubmitting}
                    style={{ color: '#ffffff' }}
                    className="h-11 bg-slate-900 border-slate-700 !text-white text-white font-medium placeholder:text-slate-500 rounded-xl text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="testerPhone" className="text-xs font-semibold text-slate-200">
                      Celular / WhatsApp *
                    </Label>
                    <Input
                      id="testerPhone"
                      value={testerPhone}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      placeholder="(18) 99999-9999"
                      required
                      disabled={isSubmitting}
                      style={{ color: '#ffffff' }}
                      className="h-11 bg-slate-900 border-slate-700 !text-white text-white font-medium placeholder:text-slate-500 rounded-xl text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="testerEmail" className="text-xs font-semibold text-slate-200">
                      Seu E-mail *
                    </Label>
                    <Input
                      id="testerEmail"
                      type="email"
                      value={testerEmail}
                      onChange={(e) => setTesterEmail(e.target.value)}
                      placeholder="seuemail@igreja.com"
                      required
                      disabled={isSubmitting}
                      style={{ color: '#ffffff' }}
                      className="h-11 bg-slate-900 border-slate-700 !text-white text-white font-medium placeholder:text-slate-500 rounded-xl text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="testerChurch" className="text-xs font-semibold text-slate-200">
                    Sua Igreja / Congregação e Cidade (Opcional)
                  </Label>
                  <Input
                    id="testerChurch"
                    value={testerChurch}
                    onChange={(e) => setTesterChurch(e.target.value)}
                    placeholder="Ex: Igreja O Brasil para Cristo - Sede"
                    disabled={isSubmitting}
                    style={{ color: '#ffffff' }}
                    className="h-11 bg-slate-900 border-slate-700 !text-white text-white font-medium placeholder:text-slate-500 rounded-xl text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {isSubmitting ? (
                    "Liberando Acesso..."
                  ) : (
                    <>
                      Entrar e Começar a Testar
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* ABA 2: LOGIN TRADICIONAL (GOOGLE / EMAIL) */}
            <TabsContent value="login" className="p-5 space-y-4 m-0">
              <Button 
                onClick={handleGoogleLogin} 
                disabled={isSubmitting}
                type="button"
                className="w-full h-11 bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 rounded-xl font-bold shadow-sm flex items-center justify-center text-xs transition-all"
              >
                <svg className="w-4 h-4 mr-2.5 shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Acessar com Google
              </Button>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink-0 mx-3 text-slate-500 text-[10px] uppercase tracking-wider font-semibold">ou com e-mail cadastrado</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-3">
                <Input 
                  type="email" 
                  placeholder="E-mail cadastrado" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  disabled={isSubmitting}
                  style={{ color: '#ffffff' }}
                  className="h-11 bg-slate-900 border-slate-700 !text-white text-white font-medium placeholder:text-slate-500 rounded-xl text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner" 
                />
                <Input 
                  type="password" 
                  placeholder="Sua senha" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  disabled={isSubmitting}
                  style={{ color: '#ffffff' }}
                  className="h-11 bg-slate-900 border-slate-700 !text-white text-white font-medium placeholder:text-slate-500 rounded-xl text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner" 
                />
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full h-10 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold text-xs transition-all"
                >
                  {isSubmitting ? "Autenticando..." : "Entrar com E-mail"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Informações Oficiais do Desenvolvedor e Direitos Reservados */}
        <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 text-center space-y-2 mb-6">
          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Direitos Reservados • Gestão Eclesiástica
          </div>

          <p className="text-xs text-slate-300 font-semibold">
            Desenvolvido por: <span className="text-emerald-400 font-bold">Carlito Carvalho Rodrigues</span>
          </p>

          <div className="pt-1 flex justify-center">
            <a
              href="https://wa.me/5518991099608?text=Ol%C3%A1%20Carlito%2C%20estou%20testando%20o%20Sistema%20de%20Gest%C3%A3o%20Eclesi%C3%A1stica"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-semibold transition-all"
            >
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              WhatsApp Oficial: (18) 99109-9608
            </a>
          </div>

          <p className="text-[10px] text-slate-500 pt-0.5">
            Dúvidas, suporte, adesão ou implantação em outras congregações.
          </p>
        </div>

        {/* Instalação do Aplicativo e QR Code */}
        <div className="w-full border-t border-slate-800/60 pt-5 flex flex-col items-center space-y-3">
          <Button 
            onClick={handleInstallApp} 
            variant="outline"
            className="w-full h-10 border-slate-800 bg-slate-900/40 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium"
          >
            <Smartphone className="w-3.5 h-3.5 mr-2 text-emerald-400" />
            Instalar App no Celular (Tela Inicial)
          </Button>

          <div className="flex items-center gap-3 bg-slate-900/60 border border-slate-800 p-2.5 rounded-xl w-full">
            <div className="bg-white p-1.5 rounded-lg shrink-0">
              <QRCodeSVG value={currentUrl} size={64} />
            </div>
            <div className="text-left text-[11px] text-slate-400 leading-snug">
              <strong className="text-slate-200 block text-xs">Acesse pelo smartphone</strong>
              Aponte a câmera para abrir o sistema diretamente no navegador do seu celular.
            </div>
          </div>

          <Button 
            onClick={copyUrl} 
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-slate-400 hover:text-slate-200"
          >
            <Copy className="w-3 h-3 mr-1.5" />
            Copiar Link de Compartilhamento
          </Button>
        </div>
      </div>
    </div>
  );
}
