import React from "react";

interface ChurchLogoProps {
  className?: string;
  size?: number | string;
}

/**
 * Logotipo oficial do Sistema Eclesiástico:
 * Igreja azul-marinho com torre, cruz dourada no topo e selo de verificação dourado com checkmark.
 * Conforme imagem oficial fornecida pelo usuário.
 */
export function ChurchLogo({ className = "w-8 h-8", size }: ChurchLogoProps) {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="none"
      className={className}
      style={style}
      aria-label="Logo Sistema Eclesiástico"
    >
      {/* Cruz Dourada no Topo */}
      <rect x="238" y="24" width="36" height="110" rx="6" fill="#cca028" />
      <rect x="198" y="58" width="116" height="34" rx="6" fill="#cca028" />

      {/* Corpo Central e Telhado Principal da Igreja (Azul Marinho #0c2854) */}
      <path
        d="M 256 118 L 396 226 L 362 226 L 362 444 L 150 444 L 150 226 L 116 226 Z"
        fill="#0c2854"
      />

      {/* Filete Branco no Beiral do Telhado Central */}
      <path
        d="M 256 142 L 372 232"
        stroke="#ffffff"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M 256 142 L 140 232"
        stroke="#ffffff"
        strokeWidth="14"
        strokeLinecap="round"
      />

      {/* Asa e Telhado Esquerdo (Azul Marinho) */}
      <path
        d="M 150 236 L 40 318 L 40 336 L 62 336 L 62 444 L 150 444 Z"
        fill="#0c2854"
      />
      <path
        d="M 152 248 L 48 326"
        stroke="#ffffff"
        strokeWidth="13"
        strokeLinecap="round"
      />

      {/* Asa e Telhado Direito (Azul Marinho) */}
      <path
        d="M 362 236 L 472 318 L 472 336 L 450 336 L 450 444 L 362 444 Z"
        fill="#0c2854"
      />
      <path
        d="M 360 248 L 464 326"
        stroke="#ffffff"
        strokeWidth="13"
        strokeLinecap="round"
      />

      {/* Janela em Arco da Asa Esquerda */}
      <path
        d="M 90 358 A 18 18 0 0 1 126 358 L 126 414 L 90 414 Z"
        fill="#ffffff"
      />

      {/* Janela Superior Central em Arco com Divisórias (4 vidraças) */}
      <path
        d="M 228 230 A 28 28 0 0 1 284 230 L 284 278 L 228 278 Z"
        fill="#ffffff"
      />
      <line x1="256" y1="202" x2="256" y2="278" stroke="#0c2854" strokeWidth="6" />
      <line x1="228" y1="244" x2="284" y2="244" stroke="#0c2854" strokeWidth="6" />

      {/* Porta / Portal Central em Arco (Branco) */}
      <path
        d="M 214 346 A 42 42 0 0 1 298 346 L 298 444 L 214 444 Z"
        fill="#ffffff"
      />

      {/* Halo de proteção branco ao redor do selo dourado */}
      <circle cx="396" cy="396" r="86" fill="#ffffff" />

      {/* Selo Dourado com Checkmark */}
      <circle cx="396" cy="396" r="76" fill="#cca028" />
      <path
        d="M 358 396 L 388 428 L 442 360"
        stroke="#ffffff"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
