import React from "react";

export interface BrasaoWatermarkProps {
  color?: string;
  size?: number | string;
  opacity?: number;
  registeredLogo?: string;
  className?: string;
}

/**
 * Brasão d'Água Oficial para Carteirinhas e Credenciais Eclesiásticas.
 * - Fundo 100% transparente.
 * - Ocupa rigorosamente o centro do cartão.
 * - Cor harmonizada automaticamente com o tema/acabamento da carteirinha (sem manchas pretas ou vermelhas).
 * - Selo heráldico circular com anéis de segurança, Cruz, Bíblia e estrelas.
 */
export function BrasaoWatermark({
  color = "#ffffff",
  size = 145,
  opacity = 0.15,
  registeredLogo,
  className = "",
}: BrasaoWatermarkProps) {
  // Verifica se existe um logo customizado real (PNG/JPG) em vez do SVG com textos escuros
  const isCustomUploadedLogo =
    registeredLogo &&
    !registeredLogo.includes("data:image/svg+xml;utf8,<svg") &&
    !registeredLogo.includes("%230f172a") &&
    !registeredLogo.includes("#0f172a");

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div
        className="relative flex items-center justify-center"
        style={{
          width: size,
          height: size,
          opacity: opacity,
          color: color,
        }}
      >
        {/* Selo Heráldico Circular de Autenticidade (Guilloché / Marca d'Água) */}
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

        {/* Caso a congregação tenha enviado um arquivo de logo próprio em imagem */}
        {isCustomUploadedLogo && (
          <img
            src={registeredLogo}
            alt="Logo Customizado"
            className="absolute inset-0 m-auto w-14 h-14 object-contain pointer-events-none select-none bg-transparent"
            style={{
              filter: "brightness(0) invert(1)",
              opacity: 0.75,
            }}
          />
        )}
      </div>
    </div>
  );
}
