import React, { useState, useEffect } from "react";
import { removeImageBackground, getCachedTransparentLogo } from "@/lib/imageBackgroundRemover";

export interface BrasaoWatermarkProps {
  color?: string;
  size?: number | string;
  opacity?: number;
  registeredLogo?: string;
  customWatermarkUrl?: string;
  watermarkMode?: "parametros" | "brasao" | "upload";
  watermarkHarmony?: "accent" | "white" | "blend" | "original";
  className?: string;
}

/**
 * Brasão d'Água Oficial para Carteirinhas e Credenciais Eclesiásticas.
 * - Puxa automaticamente a Logo da Igreja configurada em Parâmetros SEM o pano de fundo.
 * - Harmonia cromática com a cor da credencial (dourado / cor dos detalhes, branca ou blend).
 * - Remove automaticamente fundos brancos/sólidos via canvas flood-fill.
 * - Suporta também upload de imagem própria ou Brasão Heráldico de Segurança.
 * - Fundo 100% transparente, centralizado e sem caixas/manchas de fundo.
 */
export function BrasaoWatermark({
  color = "#ffffff",
  size = 145,
  opacity = 0.2,
  registeredLogo,
  customWatermarkUrl,
  watermarkMode = "parametros",
  watermarkHarmony = "accent",
  className = "",
}: BrasaoWatermarkProps) {
  // Determina a imagem ativa com base na preferência do usuário e nos parâmetros
  let activeImageUrl: string | null = null;
  if (watermarkMode === "brasao") {
    activeImageUrl = null;
  } else if (watermarkMode === "upload") {
    activeImageUrl = customWatermarkUrl || registeredLogo || null;
  } else {
    // "parametros" ou não definido: prioridade máxima para a logo dos Parâmetros
    activeImageUrl = registeredLogo || customWatermarkUrl || null;
  }

  // Estado para a logo processada com fundo 100% transparente
  const [processedUrl, setProcessedUrl] = useState<string | null>(() => {
    return getCachedTransparentLogo(activeImageUrl) || null;
  });

  useEffect(() => {
    if (!activeImageUrl) {
      setProcessedUrl(null);
      return;
    }

    const cached = getCachedTransparentLogo(activeImageUrl);
    if (cached) {
      setProcessedUrl(cached);
      return;
    }

    let active = true;
    removeImageBackground(activeImageUrl)
      .then((transparent) => {
        if (active) {
          setProcessedUrl(transparent);
        }
      })
      .catch(() => {
        if (active) {
          setProcessedUrl(activeImageUrl);
        }
      });

    return () => {
      active = false;
    };
  }, [activeImageUrl]);

  const displayUrl = processedUrl || activeImageUrl;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div
        className="relative flex items-center justify-center transition-all duration-300"
        style={{
          width: size,
          height: size,
          color: color,
        }}
      >
        {displayUrl ? (
          watermarkHarmony === "accent" || !watermarkHarmony ? (
            /* HARMONIA OFICIAL DOURADA / COR DOS DETALHES DA CREDENCIAL */
            <div
              className="w-full h-full pointer-events-none select-none transition-all duration-300"
              style={{
                backgroundColor: color || "#f59e0b",
                WebkitMaskImage: `url(${displayUrl})`,
                maskImage: `url(${displayUrl})`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                opacity: opacity ?? 0.22,
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))",
              }}
            />
          ) : watermarkHarmony === "white" ? (
            /* FILIGRANA BRANCA TRANSLÚCIDA */
            <div
              className="w-full h-full pointer-events-none select-none transition-all duration-300"
              style={{
                backgroundColor: "#ffffff",
                WebkitMaskImage: `url(${displayUrl})`,
                maskImage: `url(${displayUrl})`,
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
                opacity: (opacity ?? 0.2) * 0.9,
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.3))",
              }}
            />
          ) : watermarkHarmony === "blend" ? (
            /* TOM SOBRE TOM / SCREEN BLEND COM O FUNDO DO CARTÃO */
            <img
              src={displayUrl}
              alt="Logo Marca d'Água do Fundo"
              className="w-full h-full object-contain pointer-events-none select-none bg-transparent"
              style={{
                opacity: opacity ?? 0.25,
                mixBlendMode: "screen",
                filter: "brightness(1.35) contrast(1.15)",
              }}
            />
          ) : (
            /* CORES ORIGINAIS SUAVES */
            <img
              src={displayUrl}
              alt="Logo Marca d'Água do Fundo"
              className="w-full h-full object-contain pointer-events-none select-none bg-transparent"
              style={{
                opacity: opacity ?? 0.22,
                filter: "contrast(105%) brightness(105%)",
              }}
            />
          )
        ) : (
          /* Selo Heráldico Circular de Autenticidade (Guilloché / Marca d'Água) */
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full object-contain"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
          {/* Anéis de filigrana e segurança concêntricos */}
          <circle cx="100" cy="100" r="95" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="100" cy="100" r="91" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="100" cy="100" r="85" stroke="currentColor" strokeWidth="0.9" />
          <circle cx="100" cy="100" r="68" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" />
          <circle cx="100" cy="100" r="64" stroke="currentColor" strokeWidth="1.6" />

          {/* Caminhos curvados para o texto em arco */}
          <defs>
            <path id="sealUpperArc" d="M 28,100 A 72,72 0 1,1 172,100" />
            <path id="sealLowerArc" d="M 172,100 A 72,72 0 0,1 28,100" />
          </defs>

          {/* Texto Superior em Arco */}
          <text fill="currentColor" fontSize="8.5" fontWeight="900" letterSpacing="1.2" textAnchor="middle">
            <textPath href="#sealUpperArc" startOffset="50%">
              IGREJA O BRASIL PARA CRISTO
            </textPath>
          </text>

          {/* Texto Inferior em Arco */}
          <text fill="currentColor" fontSize="7.5" fontWeight="bold" letterSpacing="1.8" textAnchor="middle">
            <textPath href="#sealLowerArc" startOffset="50%">
              CREDENCIAL ECLESIÁSTICA
            </textPath>
          </text>

          {/* Estrelas nas laterais */}
          <circle cx="28" cy="100" r="2.5" fill="currentColor" />
          <circle cx="172" cy="100" r="2.5" fill="currentColor" />

          {/* Raios de Luz Divina ao fundo da Cruz */}
          <g stroke="currentColor" strokeWidth="0.8" opacity="0.6">
            <line x1="100" y1="67" x2="100" y2="74" />
            <line x1="100" y1="126" x2="100" y2="133" />
            <line x1="71" y1="100" x2="78" y2="100" />
            <line x1="122" y1="100" x2="129" y2="100" />
            <line x1="78" y1="78" x2="84" y2="84" />
            <line x1="122" y1="78" x2="116" y2="84" />
            <line x1="78" y1="122" x2="84" y2="116" />
            <line x1="122" y1="122" x2="116" y2="116" />
          </g>

          {/* Cruz Cristã Central */}
          <path
            d="M 97,75 L 103,75 L 103,87 L 115,87 L 115,93 L 103,93 L 103,121 L 97,121 L 97,93 L 85,93 L 85,87 L 97,87 Z"
            fill="currentColor"
          />

          {/* Bíblia Sagrada aberta na base */}
          <path
            d="M 88,118 C 94,116 98,117 100,120 C 102,117 106,116 112,118 L 112,126 C 106,124 102,125 100,128 C 98,125 94,124 88,126 Z"
            fill="currentColor"
            opacity="0.9"
          />
        </svg>
        )}
      </div>
    </div>
  );
}
