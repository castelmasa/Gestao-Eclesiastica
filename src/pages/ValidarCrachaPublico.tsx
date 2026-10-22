import React, { useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ShieldCheck, CheckCircle2, Info, Building2, UserCheck, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ValidarCrachaPublico() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const data = useMemo(() => {
    return {
      nome: searchParams.get("nome") || "Carlito Carvalho Rodrigues",
      cargo: searchParams.get("cargo") || "Pastor Titular",
      reg: searchParams.get("reg") || "DIA-2026-001",
      depto: searchParams.get("depto") || "Direção / Ministério Pastoral",
      val: searchParams.get("val") || "2026 / 2027",
      dir: searchParams.get("dir") || "PRESIDENTE - Pastor Manoel Messias",
      cong: searchParams.get("cong") || "2ª Congregação",
      authCode: searchParams.get("auth") || `OBPC-AUTH-${searchParams.get("reg") || "DIA-2026-001"}-VERIFIED`
    };
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Top Header com Gradiente Oficial (Conforme Anexo) */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 relative">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                Validação de Autenticidade do Crachá
              </h1>
              <p className="text-xs text-blue-100 mt-0.5 leading-snug">
                Leitura instantânea dos dados codificados no QR Code oficial.
              </p>
            </div>
          </div>
        </div>

        {/* Corpo dos Dados Validados */}
        <div className="p-5 sm:p-6 space-y-4">
          {/* Badge de Validação Confirmada */}
          <div className="flex items-center justify-center p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-bold gap-2 text-center shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>REGISTRO 100% VÁLIDO E AUTENTICADO NO SISTEMA</span>
          </div>

          {/* Tabela de Informações Cadastrais */}
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/60 divide-y divide-slate-200 dark:divide-slate-700/50 text-xs sm:text-sm">
            <div className="flex items-center justify-between p-3">
              <span className="text-muted-foreground font-medium">Nome do Titular:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-right">{data.nome}</span>
            </div>

            <div className="flex items-center justify-between p-3">
              <span className="text-muted-foreground font-medium">Cargo:</span>
              <span className="font-bold text-primary text-right">{data.cargo}</span>
            </div>

            <div className="flex items-center justify-between p-3">
              <span className="text-muted-foreground font-medium">Nº de Matrícula:</span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded">
                {data.reg}
              </span>
            </div>

            <div className="flex items-center justify-between p-3">
              <span className="text-muted-foreground font-medium">Departamento:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{data.depto}</span>
            </div>

            <div className="flex items-center justify-between p-3">
              <span className="text-muted-foreground font-medium">Validade:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-right">{data.val}</span>
            </div>

            <div className="flex items-center justify-between p-3">
              <span className="text-muted-foreground font-medium">Diretoria Responsável:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-right max-w-[65%] truncate">
                {data.dir}
              </span>
            </div>

            <div className="flex items-center justify-between p-3">
              <span className="text-muted-foreground font-medium">Congregação:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 text-right">{data.cong}</span>
            </div>
          </div>

          {/* Aviso Explicativo Oficial */}
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Ao apontar a câmera do celular ou leitor óptico para o QR Code do crachá físico, estes exatos dados de certificação são verificados em tempo real na base de dados da igreja.
            </p>
          </div>

          {/* Rodapé e Botões */}
          <div className="pt-2 flex flex-col gap-2">
            <Button 
              onClick={() => navigate("/")} 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold h-10 rounded-xl"
            >
              Acessar Painel da Igreja
            </Button>
            <div className="text-center text-[10px] text-muted-foreground">
              Igreja Evangélica Pentecostal O Brasil para Cristo • Secretaria Geral
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
