import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Hexagon, Smartphone, Copy } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { ChurchLogo } from "@/components/ChurchLogo";

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { loginWithGoogle, loginWithEmail, changePassword } = useAuth();
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://gestao.igreja';

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
    <div className="min-h-screen flex items-center justify-center bg-[#121212] p-4 relative overflow-hidden">
      {/* Subtle purple gradient background matching print */}
      <div className="absolute -left-[20%] top-1/3 w-[600px] h-[600px] bg-purple-900/20 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="flex flex-col items-center mb-8 space-y-4">
          <div className="w-20 h-20 bg-white/95 rounded-2xl p-2.5 shadow-xl ring-2 ring-white/20 flex items-center justify-center">
            <ChurchLogo className="w-16 h-16" />
          </div>
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-black text-white tracking-wide uppercase">SISTEMA DE GESTÃO</h1>
            <p className="text-[10px] font-bold text-amber-500 tracking-widest uppercase">
              DESENVOLVIDO PARA A IGREJA
            </p>
            <div className="h-0.5 w-12 bg-emerald-500 mx-auto mt-2"></div>
          </div>
        </div>

        <div className="w-full space-y-4 mb-8">
          {/* Primary Login: Google */}
          <Button 
            onClick={handleGoogleLogin} 
            disabled={isSubmitting}
            type="button"
            className="w-full h-13 bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-200 rounded-xl font-bold shadow-sm flex items-center justify-center text-sm transition-all"
          >
            <svg className="w-5 h-5 mr-3 shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Acessar com Google
          </Button>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-zinc-800"></div>
            <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs uppercase tracking-wider">ou entre com e-mail</span>
            <div className="flex-grow border-t border-zinc-800"></div>
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-3">
            <Input 
              type="email" 
              placeholder="E-mail" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              disabled={isSubmitting}
              className="h-11 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 rounded-xl text-sm" 
            />
            <Input 
              type="password" 
              placeholder="Senha" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              disabled={isSubmitting}
              className="h-11 bg-zinc-900 border-zinc-800 text-zinc-100 placeholder:text-zinc-500 rounded-xl text-sm" 
            />
            <Button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold text-sm transition-all"
            >
              {isSubmitting ? "Entrando..." : "Entrar com E-mail"}
            </Button>
          </form>

          <Button 
            onClick={handleInstallApp} 
            className="w-full h-12 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-semibold"
          >
            <Smartphone className="w-4 h-4 mr-2" />
            Instalar App na Tela Inicial
          </Button>
          
          <p className="text-center text-[11px] text-zinc-500 leading-tight px-4 pt-1">
            Instale o sistema no seu celular para acesso rápido e ícone na tela inicial.
          </p>
        </div>

        <div className="w-full border-t border-zinc-800/50 pt-8 flex flex-col items-center space-y-6">
          <p className="text-sm font-medium text-zinc-300">
            Acesse do seu celular:
          </p>
          
          <div className="bg-white p-3 rounded-2xl w-48 h-48 flex items-center justify-center">
            <QRCodeSVG value={currentUrl} size={160} />
          </div>

          <p className="text-center text-[11px] text-zinc-500 leading-tight px-4 max-w-[280px]">
            Aponte a câmera para o QR Code acima para abrir o sistema e instalá-lo na tela inicial do celular.
          </p>

          <Button 
            onClick={copyUrl} 
            variant="outline"
            className="w-full h-12 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 rounded-xl mt-2"
          >
            <Copy className="w-4 h-4 mr-2" />
            COPIAR LINK DO APP
          </Button>

          <p className="text-[10px] font-bold text-zinc-600 tracking-widest uppercase pt-6">
            AUTENTICAÇÃO SEGURA
          </p>
        </div>
      </div>
    </div>
  );
}
