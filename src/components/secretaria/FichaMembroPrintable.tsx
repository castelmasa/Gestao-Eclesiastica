import React from "react"
import { User } from "lucide-react"

export interface FichaMembroData {
  numeroFicha?: string | number
  nome?: string
  endereco?: string
  cidade?: string
  bairro?: string
  cep?: string
  telefone?: string
  email?: string
  naturalidade?: string
  estadoCivil?: string
  dataNascimento?: string
  cpf?: string
  rg?: string
  sexo?: string
  pai?: string
  mae?: string
  membroDesde?: string
  dataBatismo?: string
  batismoEspiritoSanto?: string
  igrejaOrigem?: string
  validade?: string
  cargo?: string
  expedida?: string
  observacoes?: string
  fotoUrl?: string
  signatureUrl?: string
}

interface FichaMembroPrintableProps {
  memberData?: FichaMembroData | null
  churchName?: string
  churchSubtitle?: string
  churchAddress?: string
  churchCityZip?: string
  churchCnpj?: string
  logoUrl?: string
  pastorName?: string
  secretariaName?: string
  pastorSignatureUrl?: string
  secretariaSignatureUrl?: string
  isEditable?: boolean
  onChangeField?: (field: keyof FichaMembroData, value: string) => void
  viaLabel?: string
  isSecondVia?: boolean
}

export function FichaMembroPrintable({
  memberData,
  churchName = "IGREJA EVANGÉLICA PENTECOSTAL O BRASIL PARA CRISTO",
  churchSubtitle = "2ª CONGREGAÇÃO DE VALPARAÍSO - SP | SECRETARIA GERAL",
  churchAddress = "Rua Bartolomeu Bueno, nº 629 - Bairro Santa Casa",
  churchCityZip = "Valparaíso - SP | CEP: 16880-000",
  churchCnpj = "CNPJ: 43.832.227/0001-44",
  logoUrl,
  pastorName,
  secretariaName,
  pastorSignatureUrl,
  secretariaSignatureUrl,
  viaLabel,
  isSecondVia = false,
}: FichaMembroPrintableProps) {
  const d = memberData || {}

  // Format dates into split boxes [D][D] [M][M] [A][A][A][A]
  const renderDateBoxes = (dateStr?: string) => {
    let clean = (dateStr || "").replace(/\D/g, "")
    const d1 = clean[0] || ""
    const d2 = clean[1] || ""
    const m1 = clean[2] || ""
    const m2 = clean[3] || ""
    const y1 = clean[4] || ""
    const y2 = clean[5] || ""
    const y3 = clean[6] || ""
    const y4 = clean[7] || ""

    return (
      <div className="inline-flex items-center gap-0.5 ml-1">
        <div className="w-3.5 h-5.5 border border-black bg-slate-50 text-black text-[10px] font-bold flex items-center justify-center">
          {d1}
        </div>
        <div className="w-3.5 h-5.5 border border-black bg-slate-50 text-black text-[10px] font-bold flex items-center justify-center mr-0.5">
          {d2}
        </div>
        <div className="w-3.5 h-5.5 border border-black bg-slate-50 text-black text-[10px] font-bold flex items-center justify-center">
          {m1}
        </div>
        <div className="w-3.5 h-5.5 border border-black bg-slate-50 text-black text-[10px] font-bold flex items-center justify-center mr-0.5">
          {m2}
        </div>
        <div className="w-3.5 h-5.5 border border-black bg-slate-50 text-black text-[10px] font-bold flex items-center justify-center">
          {y1}
        </div>
        <div className="w-3.5 h-5.5 border border-black bg-slate-50 text-black text-[10px] font-bold flex items-center justify-center">
          {y2}
        </div>
        <div className="w-3.5 h-5.5 border border-black bg-slate-50 text-black text-[10px] font-bold flex items-center justify-center">
          {y3}
        </div>
        <div className="w-3.5 h-5.5 border border-black bg-slate-50 text-black text-[10px] font-bold flex items-center justify-center">
          {y4}
        </div>
      </div>
    )
  }

  // Generate an elegant, clean sequential number (e.g. 0001, 0012)
  const getDisplayNumeroFicha = () => {
    if (!d.numeroFicha) return "0001"
    const str = String(d.numeroFicha).trim()
    if (/^\d+$/.test(str)) {
      return String(parseInt(str, 10)).padStart(4, "0")
    }
    const digits = str.replace(/\D/g, "")
    if (digits.length >= 1 && digits.length <= 4) {
      return digits.padStart(4, "0")
    }
    let hash = 0
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % 999
    return String(Math.abs(hash) + 1).padStart(4, "0")
  }

  // Official OBPC emblem or logo
  const renderObpcLogo = () => {
    if (logoUrl) {
      return (
        <img
          src={logoUrl}
          alt="Logo Igreja O Brasil para Cristo"
          className="max-h-[22mm] max-w-[42mm] object-contain block"
          crossOrigin="anonymous"
        />
      )
    }

    return (
      <div className="flex items-center gap-1.5">
        <svg viewBox="0 0 120 100" className="w-[42mm] h-[22mm]">
          <circle cx="45" cy="50" r="40" fill="none" stroke="#0f172a" strokeWidth="5" />
          <path d="M15 50 Q 45 20, 80 40 Q 60 70, 20 55" fill="#334155" opacity="0.8" />
          <path d="M30 40 L 75 35 L 50 65 Z" fill="#fff" stroke="#0f172a" strokeWidth="2.5" />
          <text x="86" y="32" fontFamily="sans-serif" fontSize="12" fontWeight="bold" fill="#0f172a">
            Igreja
          </text>
          <text x="84" y="52" fontFamily="sans-serif" fontSize="17" fontWeight="900" fill="#0f172a">
            Brasil
          </text>
          <text x="86" y="70" fontFamily="sans-serif" fontSize="11" fontWeight="bold" fill="#475569">
            para
          </text>
          <text x="84" y="90" fontFamily="sans-serif" fontSize="20" fontWeight="900" fill="#b91c1c">
            CRISTO
          </text>
        </svg>
      </div>
    )
  }

  return (
    <div
      id="printable-ficha-membro"
      className={`w-[210mm] max-w-[210mm] min-h-[297mm] bg-white p-[7mm] sm:p-[8mm] mx-auto text-[11px] font-sans print:block print:p-[5mm] relative box-border shadow-lg border-4 border-double border-slate-900 print:shadow-none print:border-4 print:border-double print:border-black print:m-0 ${
        isSecondVia ? 'text-neutral-600 opacity-75 print:opacity-75 via-talao-carbono' : 'text-black'
      }`}
    >
      {isSecondVia && (
        <div className="text-right text-[8px] font-bold text-neutral-400 uppercase tracking-widest mb-1 print:block">
          [ 2ª VIA - CARBONO / ARQUIVO ]
        </div>
      )}
      <div className="w-full h-full flex flex-col justify-between border border-slate-800 p-3 bg-white">
        {/* HEADER */}
        <div>
          <div className="flex items-start justify-between border-b-2 border-black pb-2.5">
            {/* Logo */}
            <div className="w-[44mm] flex items-center justify-start pt-0.5">
              {renderObpcLogo()}
            </div>

            {/* Cabeçalho Textual da Igreja */}
            <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-700">
                Convenção Nacional das Igrejas Evangélicas Pentecostais
              </span>
              <h1 className="font-black text-[18px] tracking-wide leading-tight uppercase text-black mt-0.5">
                {churchName}
              </h1>
              <p className="text-[10px] font-black uppercase tracking-wider text-red-700 mt-0.5">
                {churchSubtitle}
              </p>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-700 mt-0.5">
                {churchAddress} • {churchCityZip}
              </p>
              <p className="text-[8px] font-medium text-slate-500">
                {churchCnpj}
              </p>
            </div>

            {/* Box Número Sequencial e Foto 3x4 */}
            <div className="w-[32mm] flex flex-col items-end gap-1.5 shrink-0">
              {/* Box Nº Sequencial Oficial */}
              <div className="w-full flex items-center justify-between border-2 border-black bg-slate-50 px-2 py-0.5 shadow-2xs">
                <span className="font-black text-[11px] text-slate-900 uppercase tracking-wider">
                  Nº REG.
                </span>
                <span className="font-black text-[14px] text-red-700 font-mono tracking-wider">
                  {getDisplayNumeroFicha()}
                </span>
              </div>

              {/* Box Foto 3x4 - ENCAIXE PERFEITO RIGOROSO */}
              <div
                className="w-[30mm] h-[40mm] min-w-[30mm] min-h-[40mm] max-w-[30mm] max-h-[40mm] border-2 border-black bg-slate-100 flex items-center justify-center overflow-hidden p-0 m-0 relative box-border shadow-xs"
                style={{ width: "30mm", height: "40mm" }}
              >
                {d.fotoUrl ? (
                  <img
                    src={d.fotoUrl}
                    alt={d.nome || "Foto do Membro"}
                    crossOrigin="anonymous"
                    className="w-full h-full object-cover object-top block"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center top",
                      display: "block",
                      margin: 0,
                      padding: 0,
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-1 text-slate-400 bg-slate-50">
                    <User className="w-8 h-8 mb-1 text-slate-400 opacity-60" />
                    <span className="font-black text-[9px] text-slate-600 leading-tight uppercase tracking-wider">
                      FOTO
                      <br />
                      3x4
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TÍTULO DA FICHA */}
          <div className="text-center my-2 relative">
            <div className="inline-block bg-slate-900 text-white px-6 py-0.5 uppercase tracking-widest font-black text-[13px] shadow-xs">
              FICHA DE CADASTRO OFICIAL DE MEMBROS
            </div>
          </div>

          {/* DADOS DO MEMBRO (CAMPOS ESTRUTURADOS COM CAIXINHAS E BORDAS) */}
          <div className="space-y-1.5 text-[10.5px]">
            {/* LINHA 1: NOME COMPLETO */}
            <div className="flex items-center">
              <span className="font-black text-[11px] w-[75px] shrink-0 text-black uppercase">
                Nome:
              </span>
              <div className="flex-1 min-h-[26px] bg-slate-50 text-black px-2.5 py-0.5 font-black text-[12px] flex items-center border border-slate-700">
                {d.nome || ""}
              </div>
            </div>

            {/* LINHA 2: FILIAÇÃO PAI E MÃE */}
            <div className="flex items-center gap-2">
              <span className="font-black text-[11px] w-[75px] shrink-0 text-black uppercase">
                Pai:
              </span>
              <div className="flex-1 min-h-[24px] bg-slate-50 text-black px-2 py-0.5 font-semibold text-[10px] flex items-center border border-slate-700">
                {d.pai || ""}
              </div>
              <span className="font-black text-[11px] shrink-0 text-black uppercase ml-1">
                Mãe:
              </span>
              <div className="flex-1 min-h-[24px] bg-slate-50 text-black px-2 py-0.5 font-semibold text-[10px] flex items-center border border-slate-700">
                {d.mae || ""}
              </div>
            </div>

            {/* LINHA 3: DATA NASCIMENTO, NATURALIDADE, ESTADO CIVIL, SEXO */}
            <div className="flex items-center gap-1.5">
              <span className="font-black text-[10px] shrink-0 text-black uppercase">
                Data Nascto:
              </span>
              {renderDateBoxes(d.dataNascimento)}

              <span className="font-black text-[10px] shrink-0 ml-1.5 text-black uppercase">
                Naturalidade:
              </span>
              <div className="flex-1 min-h-[24px] bg-slate-50 text-black px-2 py-0.5 font-semibold text-[10px] flex items-center border border-slate-700">
                {d.naturalidade || ""}
              </div>

              <span className="font-black text-[10px] shrink-0 ml-1 text-black uppercase">
                Estado Civil:
              </span>
              <div className="w-[85px] min-h-[24px] bg-slate-50 text-black px-1.5 py-0.5 font-semibold text-[10px] flex items-center border border-slate-700">
                {d.estadoCivil || ""}
              </div>

              <span className="font-black text-[10px] shrink-0 ml-1 text-black uppercase">
                Sexo:
              </span>
              <div className="w-[70px] min-h-[24px] bg-slate-50 text-black px-1.5 py-0.5 font-semibold text-[10px] flex items-center border border-slate-700">
                {d.sexo || ""}
              </div>
            </div>

            {/* LINHA 4: DOCUMENTOS - CPF, RG */}
            <div className="flex items-center gap-2">
              <span className="font-black text-[11px] w-[75px] shrink-0 text-black uppercase">
                CPF:
              </span>
              <div className="w-[140px] min-h-[24px] bg-slate-50 text-black px-2 py-0.5 font-mono font-bold text-[10.5px] flex items-center border border-slate-700">
                {d.cpf || ""}
              </div>

              <span className="font-black text-[11px] shrink-0 text-black uppercase ml-1">
                RG:
              </span>
              <div className="w-[130px] min-h-[24px] bg-slate-50 text-black px-2 py-0.5 font-semibold text-[10.5px] flex items-center border border-slate-700">
                {d.rg || ""}
              </div>

              <span className="font-black text-[11px] shrink-0 text-black uppercase ml-1">
                Telefone / Celular:
              </span>
              <div className="flex-1 min-h-[24px] bg-slate-50 text-black px-2 py-0.5 font-semibold text-[10.5px] flex items-center border border-slate-700">
                {d.telefone || ""}
              </div>
            </div>

            {/* LINHA 5: ENDEREÇO RESIDENCIAL */}
            <div className="flex items-center">
              <span className="font-black text-[11px] w-[75px] shrink-0 text-black uppercase">
                Endereço:
              </span>
              <div className="flex-1 min-h-[24px] bg-slate-50 text-black px-2 py-0.5 font-semibold text-[10px] flex items-center border border-slate-700">
                {d.endereco || ""}
              </div>
            </div>

            {/* LINHA 6: BAIRRO, CIDADE, CEP */}
            <div className="flex items-center gap-2">
              <span className="font-black text-[11px] w-[75px] shrink-0 text-black uppercase">
                Bairro:
              </span>
              <div className="w-[150px] min-h-[24px] bg-slate-50 text-black px-2 py-0.5 font-semibold text-[10px] flex items-center border border-slate-700">
                {d.bairro || ""}
              </div>

              <span className="font-black text-[11px] shrink-0 text-black uppercase ml-1">
                Cidade / UF:
              </span>
              <div className="flex-1 min-h-[24px] bg-slate-50 text-black px-2 py-0.5 font-semibold text-[10px] flex items-center border border-slate-700">
                {d.cidade || "Valparaíso - SP"}
              </div>

              <span className="font-black text-[11px] shrink-0 text-black uppercase ml-1">
                CEP:
              </span>
              <div className="w-[100px] min-h-[24px] bg-slate-50 text-black px-2 py-0.5 font-mono font-semibold text-[10px] flex items-center border border-slate-700">
                {d.cep || "16880-000"}
              </div>
            </div>

            {/* LINHA 7: DADOS ECLESIÁSTICOS - CARGO, MEMBRO DESDE, DATA BATISMO, VALIDADE */}
            <div className="mt-2 pt-1 border-t border-slate-400">
              <div className="flex items-center justify-between gap-1 pb-1">
                <div className="flex items-center">
                  <span className="font-black text-[10px] shrink-0 text-black uppercase">
                    Membro Desde:
                  </span>
                  {renderDateBoxes(d.membroDesde)}
                </div>

                <div className="flex items-center">
                  <span className="font-black text-[10px] shrink-0 text-black uppercase">
                    Data Batismo:
                  </span>
                  {renderDateBoxes(d.dataBatismo)}
                </div>

                <div className="flex items-center">
                  <span className="font-black text-[10px] shrink-0 text-black uppercase">
                    Validade Ficha:
                  </span>
                  {renderDateBoxes(d.validade || "31/12/2026")}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <div className="flex-1 flex items-center">
                  <span className="font-black text-[11px] w-[75px] shrink-0 text-black uppercase">
                    Cargo / Função:
                  </span>
                  <div className="flex-1 min-h-[26px] bg-slate-100 text-black px-2 py-0.5 font-black text-[11.5px] uppercase flex items-center border border-slate-700 tracking-wide">
                    {d.cargo || "MEMBRO"}
                  </div>
                </div>

                <div className="flex items-center">
                  <span className="font-black text-[10px] shrink-0 ml-2 text-black uppercase">
                    Expedição:
                  </span>
                  {renderDateBoxes(d.expedida || new Date().toLocaleDateString("pt-BR"))}
                </div>
              </div>
            </div>
          </div>

          {/* SESSÃO DE OBSERVAÇÕES / HISTÓRICO DE VISITAS E REGISTROS */}
          <div className="mt-4 pt-2">
            <div className="text-center font-black text-[11px] tracking-wider text-slate-900 uppercase flex items-center justify-center gap-2">
              <span className="text-slate-400 font-normal">
                ...........................................................................
              </span>
              <span>HISTÓRICO PASTORAL & OBSERVAÇÕES</span>
              <span className="text-slate-400 font-normal">
                ...........................................................................
              </span>
            </div>

            {/* Linhas pautadas para preenchimento de histórico e visitas */}
            <div className="space-y-1.5 mt-2">
              <div className="w-full min-h-[22px] bg-slate-50 text-black px-2 py-0.5 text-[10px] font-medium border border-slate-400 flex items-center">
                {d.observacoes || ""}
              </div>
              <div className="w-full min-h-[22px] bg-slate-50 text-black px-2 py-0.5 text-[10px] font-medium border border-slate-400"></div>
              <div className="w-full min-h-[22px] bg-slate-50 text-black px-2 py-0.5 text-[10px] font-medium border border-slate-400"></div>
            </div>
          </div>
        </div>

        {/* RODAPÉ SOLENE COM ASSINATURAS E TERMO */}
        <div className="mt-6 pt-3 border-t border-slate-800">
          <p className="text-[8px] text-center text-slate-600 italic mb-4">
            &ldquo;Reconheço que os dados acima são verdadeiros e firmo meu compromisso de fidelidade ao Senhor Jesus Cristo, à comunhão do corpo de Cristo e à disciplina evangélica desta congregação.&rdquo;
          </p>

          <div className="flex items-end justify-between text-center px-2">
            {/* Assinatura do Membro */}
            <div className="w-[52mm] flex flex-col items-center">
              {d.signatureUrl ? (
                <img
                  src={d.signatureUrl}
                  alt="Assinatura"
                  className="max-h-[14mm] max-w-[48mm] object-contain mb-1"
                />
              ) : (
                <div className="h-[14mm]" />
              )}
              <div className="w-full border-t-2 border-black pt-1 font-black text-[10px] uppercase text-black">
                Assinatura do Membro
              </div>
              <span className="text-[8px] text-slate-500 font-medium">Titular da Ficha</span>
            </div>

            {/* Visto da Secretaria */}
            <div className="w-[50mm] flex flex-col items-center">
              {secretariaSignatureUrl ? (
                <img
                  src={secretariaSignatureUrl}
                  alt="Assinatura Secretaria"
                  className="max-h-[14mm] max-w-[46mm] object-contain mb-1"
                />
              ) : (
                <div className="h-[14mm]" />
              )}
              <div className="w-full border-t-2 border-black pt-1 font-black text-[10px] uppercase text-black">
                {secretariaName || "1º Secretário(a)"}
              </div>
              <span className="text-[8px] text-slate-500 font-medium">Secretaria Geral</span>
            </div>

            {/* Pastor Titular */}
            <div className="w-[52mm] flex flex-col items-center">
              {pastorSignatureUrl ? (
                <img
                  src={pastorSignatureUrl}
                  alt="Assinatura Pastor"
                  className="max-h-[14mm] max-w-[48mm] object-contain mb-1"
                />
              ) : (
                <div className="h-[14mm]" />
              )}
              <div className="w-full border-t-2 border-black pt-1 font-black text-[10px] uppercase text-black">
                {pastorName || "Pastor Presidente / Dirigente"}
              </div>
              <span className="text-[8px] text-slate-500 font-medium">Igreja O Brasil para Cristo</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-[8px] text-slate-500 font-medium mt-3 pt-1 border-t border-slate-200">
            <span>Registro Arquivístico Oficial - Igreja Evangélica Pentecostal O Brasil para Cristo (2ª Congregação)</span>
            <div className="flex items-center gap-2">
              {viaLabel && (
                <span className={`px-2 py-0.5 border rounded font-bold text-[8.5px] uppercase ${isSecondVia ? 'border-neutral-400 bg-neutral-100 text-neutral-600' : 'border-black bg-slate-100 text-black'}`}>
                  {viaLabel}
                </span>
              )}
              <span>Valparaíso - SP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
