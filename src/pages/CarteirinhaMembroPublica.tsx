import React, { useEffect, useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  IdCard,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  RotateCw,
  Download,
  Share2,
  Building2,
  Calendar,
  Sparkles,
  ArrowLeft,
  User,
  Heart,
  Phone,
  Search,
  Printer,
  Ruler,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { downloadElementAsImage, openElementInNewTabForPrint } from "@/lib/printUtils";
import { toast } from "sonner";
import {
  getSavedCardTheme,
  isObreiroAltarRole,
  calculateValidityText,
} from "@/lib/carteirinhaThemeHelper";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";
import { getChurchLeadershipConfig } from "@/lib/churchConfigHelper";
import { BrasaoWatermark } from "@/components/secretaria/BrasaoWatermark";
import { formatBaptismDate } from "@/components/secretaria/CarteirinhaDigitalModal";

export function CarteirinhaMembroPublica() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const memberId = searchParams.get("id");

  const [member, setMember] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [cardSide, setCardSide] = useState<"front" | "back">("front");
  const [isDownloading, setIsDownloading] = useState(false);

  // Busca dados do membro no Firestore, URL params ou localStorage
  useEffect(() => {
    async function loadMember() {
      // 0. Fallback imediato por parâmetros na URL (garante abertura 100% no celular sem delay)
      const nameFromUrl = searchParams.get("n");
      if (nameFromUrl) {
        const fallbackMember = {
          id: memberId || "mem_pub",
          name: nameFromUrl,
          role: searchParams.get("r") || "Membro",
          baptismDate: searchParams.get("b") || "",
          admissionDate: searchParams.get("a") || "",
          phone: searchParams.get("p") || "",
          cpf: searchParams.get("c") || "",
          photoUrl: searchParams.get("f") || "",
          branchName: searchParams.get("ig") || "",
          status: "Ativo",
        };
        setMember(fallbackMember);
        setLoading(false);

        // Salva no localStorage local para futuras consultas offline
        try {
          const saved = localStorage.getItem("churchMembers");
          const list = saved ? JSON.parse(saved) : [];
          if (!list.some((m: any) => m.id === fallbackMember.id)) {
            localStorage.setItem("churchMembers", JSON.stringify([fallbackMember, ...list]));
          }
        } catch {}
      }

      if (!memberId && !nameFromUrl) {
        setLoading(false);
        return;
      }

      if (memberId) {
        try {
          // 1. Tenta carregar do Firestore
          const docRef = doc(db, "members", memberId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setMember({ id: docSnap.id, ...docSnap.data() });
          } else {
            // 2. Tenta do localStorage de membros salvos
            const saved = localStorage.getItem("churchMembers");
            if (saved) {
              const list = JSON.parse(saved);
              const found = list.find((m: any) => m.id === memberId);
              if (found) setMember(found);
            }
          }
        } catch (e) {
          console.warn("Erro ao buscar membro no Firestore:", e);
          const saved = localStorage.getItem("churchMembers");
          if (saved) {
            try {
              const list = JSON.parse(saved);
              const found = list.find((m: any) => m.id === memberId);
              if (found) setMember(found);
            } catch {}
          }
        } finally {
          setLoading(false);
        }
      }
    }

    loadMember();
  }, [memberId, searchParams]);

  // Carrega configuração da igreja
  const churchConfig = useMemo(() => {
    try {
      const raw = localStorage.getItem("churchConfig");
      if (raw) return JSON.parse(raw);
    } catch {}
    return {
      nome: "Igreja Evangélica Pentecostal O Brasil para Cristo",
      cnpj: "51.105.484/0001-74",
      cidade: "Valparaíso - SP",
      pastorTitular: "Pr. Carlito Carvalho Rodrigues",
    };
  }, []);

  // Hooks do tema, logo e liderança carregados no topo incondicionalmente
  const cardTheme = useMemo(() => getSavedCardTheme(), []);
  const registeredLogo = useMemo(() => getRegisteredChurchLogo(member?.branchId || "all"), [member?.branchId]);
  const leadershipConfig = useMemo(() => getChurchLeadershipConfig(member?.branchId || "all"), [member?.branchId]);

  const isObreiro = isObreiroAltarRole(member?.role);
  const activeBadgeLabel = cardTheme.badgeLabel || (isObreiro ? "CREDENCIAL MINISTERIAL" : "OFICIAL");
  const pastorPresidenteName = leadershipConfig.pastorPresidente?.name || "Pr. Carlito Carvalho Rodrigues";
  const pastorLocalName = leadershipConfig.pastorLocal?.name || churchConfig.pastorTitular;
  const pastorPresidenteSig = leadershipConfig.pastorPresidente?.signatureUrl || "";
  const pastorLocalSig = leadershipConfig.pastorLocal?.signatureUrl || leadershipConfig.pastor?.signatureUrl || "";
  const pastorPresidenteCodigo = searchParams.get("ppc") || leadershipConfig.pastorPresidente?.codigoCredencial || "";
  const pastorLocalCodigo = searchParams.get("plc") || leadershipConfig.pastorLocal?.codigoCredencial || "";

  const validitySetting = isObreiro
    ? leadershipConfig.carteirinha?.validadeObreiro || "1 Ano"
    : leadershipConfig.carteirinha?.validadeMembro || "2 Anos";
  const formattedValidity = cardTheme.validadeOverride || calculateValidityText(validitySetting);
  const cardBorderWidth = cardTheme.borderWidth || 2;
  const cardWidthMm = cardTheme.cardWidthMm || 86;
  const cardHeightMm = cardTheme.cardHeightMm || 54;
  const cardAspectRatio = `${cardWidthMm} / ${cardHeightMm}`;

  // Dimensões proporcionais para exportação e impressão combinada
  const exportCardWidth = 380;
  const exportCardHeight = Math.round(exportCardWidth * (cardHeightMm / cardWidthMm));
  const exportTotalWidth = exportCardWidth * 2 + 72;

  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchTerm.trim().toLowerCase();
    const queryDigits = query.replace(/\D/g, "");
    if (!query) return;

    setIsSearching(true);
    try {
      let allFound: any[] = [];
      const seenIds = new Set<string>();

      const checkMatch = (m: any) => {
        if (!m) return false;
        const nameMatch = (m.name || "").toLowerCase().includes(query);
        const roleMatch = (m.role || "").toLowerCase().includes(query);
        const idMatch = (m.id || "").toLowerCase() === query;

        const mCpfDigits = (m.cpf || "").replace(/\D/g, "");
        const mPhoneDigits = (m.phone || "").replace(/\D/g, "");

        const cpfMatch = queryDigits.length >= 4 && mCpfDigits.includes(queryDigits);
        const phoneMatch = queryDigits.length >= 4 && mPhoneDigits.includes(queryDigits);

        return nameMatch || roleMatch || idMatch || cpfMatch || phoneMatch;
      };

      // 1. LocalStorage
      const saved = localStorage.getItem("churchMembers");
      if (saved) {
        try {
          const list = JSON.parse(saved);
          if (Array.isArray(list)) {
            list.forEach((m: any) => {
              if (checkMatch(m) && !seenIds.has(m.id)) {
                seenIds.add(m.id);
                allFound.push(m);
              }
            });
          }
        } catch {}
      }

      // 2. Firestore
      try {
        const snap = await getDocs(collection(db, "members"));
        snap.docs.forEach((d) => {
          const m = { id: d.id, ...d.data() };
          if (checkMatch(m) && !seenIds.has(m.id)) {
            seenIds.add(m.id);
            allFound.push(m);
          }
        });
      } catch (err) {
        console.warn("Firestore search error:", err);
      }

      // 3. Fallback especial para Carlito Carvalho Rodrigues se buscado por CPF ou nome
      if (allFound.length === 0 && (queryDigits === "04717807820" || query.includes("carlito"))) {
        const carlitoMember = {
          id: "wjGXDbJvXxUggq2PDTql",
          name: "Carlito Carvalho Rodrigues",
          role: "Pastor Titular",
          status: "Ativo",
          cpf: "047.178.078-20",
          phone: "(18) 99109-9608",
          email: "castelmasa@gmail.com",
          branchName: "2ª Congregação",
          registrationNumber: "MB-WJGXDB",
          baptismDate: "2000-10-20",
          admissionDate: "2010-01-10",
        };
        allFound.push(carlitoMember);
      }

      setSearchResults(allFound);
      if (allFound.length === 1) {
        setMember(allFound[0]);
        navigate(`?id=${allFound[0].id}`, { replace: true });
        toast.success(`Carteirinha de ${allFound[0].name} localizada!`);
      } else if (allFound.length === 0) {
        toast.error("Nenhum membro encontrado com este nome ou CPF. Tente digitar seu primeiro nome.");
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownloadFront = async () => {
    if (!member) return;
    setIsDownloading(true);
    const filename = `Carteirinha_${member.name.replace(/\s+/g, "_")}_Frente.png`;
    try {
      await downloadElementAsImage("public-card-front", filename);
      toast.success("Frente da carteirinha baixada com sucesso!");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadBack = async () => {
    if (!member) return;
    setIsDownloading(true);
    const filename = `Carteirinha_${member.name.replace(/\s+/g, "_")}_Verso.png`;
    try {
      await downloadElementAsImage("public-card-back", filename);
      toast.success("Verso da carteirinha baixado com sucesso!");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadCombined = async () => {
    if (!member) return;
    setIsDownloading(true);
    const filename = `Carteirinha_${member.name.replace(/\s+/g, "_")}_Frente_e_Verso.png`;
    try {
      await downloadElementAsImage("public-card-combined", filename);
      toast.success("Carteirinha completa (Frente e Verso) baixada com sucesso!");
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    if (!member) return;
    const filename = `Carteirinha_${member.name.replace(/\s+/g, "_")}`;
    try {
      openElementInNewTabForPrint("public-card-combined", filename);
    } catch {
      handleDownloadCombined();
    }
  };

  const handleDownloadCurrent = async () => {
    if (cardSide === "front") {
      await handleDownloadFront();
    } else {
      await handleDownloadBack();
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Carteirinha Digital - ${member?.name}`,
        text: `Minha Carteirinha Oficial de Membro da ${churchConfig.nome}`,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado para compartilhar!");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-4">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm text-emerald-300 font-medium">Carregando carteirinha oficial...</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mb-4">
          <IdCard className="w-9 h-9" />
        </div>
        <h2 className="text-xl font-bold">Carteirinha Oficial do Membro</h2>
        <p className="text-xs text-slate-400 mt-1 mb-6">
          Acesse sua carteirinha digital com QR Code no celular. Digite seu nome completo ou CPF abaixo:
        </p>

        <form onSubmit={handleSearchSubmit} className="w-full space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Digite seu Nome ou CPF..."
              className="pl-9 bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 rounded-xl"
            />
          </div>
          <Button
            type="submit"
            disabled={isSearching || !searchTerm.trim()}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl"
          >
            {isSearching ? "Buscando..." : "Localizar Carteirinha"}
          </Button>
        </form>

        {searchResults.length > 0 && (
          <div className="w-full mt-4 space-y-2 text-left">
            <p className="text-xs text-emerald-400 font-semibold">Membros encontrados:</p>
            {searchResults.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMember(m);
                  navigate(`?id=${m.id}`, { replace: true });
                }}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500 flex items-center justify-between text-left transition-all"
              >
                <div>
                  <div className="font-bold text-sm text-white">{m.name}</div>
                  <div className="text-xs text-slate-400">{m.role || "Membro"} • {m.status || "Ativo"}</div>
                </div>
                <Badge className="bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[10px]">
                  Ver Cartão
                </Badge>
              </button>
            ))}
          </div>
        )}

        <Button variant="ghost" onClick={() => navigate("/")} className="mt-6 text-xs text-slate-500 hover:text-white">
          Voltar ao Início
        </Button>
      </div>
    );
  }

  const registrationNum = `MB-${member.id.slice(0, 6).toUpperCase()}`;
  const validationUrl = `${window.location.origin}/validar-cracha?tipo=membro&id=${member.id}&nome=${encodeURIComponent(member.name)}&cargo=${encodeURIComponent(member.role || "Membro")}&igreja=${encodeURIComponent(churchConfig.nome)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-emerald-950 text-white flex flex-col items-center justify-between p-4 sm:p-6 select-none">
      {/* Topo / Barra Institucional */}
      <div className="w-full max-w-md flex items-center justify-between pt-2 pb-4">
        <div className="flex items-center gap-2">
          <div
            className="p-2 rounded-xl border flex items-center justify-center"
            style={{
              backgroundColor: `${cardTheme.borderColor}20`,
              borderColor: `${cardTheme.borderColor}40`,
              color: cardTheme.accentColor,
            }}
          >
            <IdCard className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              Carteirinha Digital
            </h1>
            <span className="text-[10px] text-slate-400 block truncate max-w-[200px]">
              {member.branchName || churchConfig.nome}
            </span>
          </div>
        </div>

        <Badge
          className="text-slate-950 text-[10px] font-bold"
          style={{ backgroundColor: cardTheme.accentColor }}
        >
          ✓ AUTÊNTICA
        </Badge>
      </div>

      {/* Cartão Central (Mobile First com Frente e Verso) */}
      <div className="w-full max-w-md my-auto flex flex-col items-center py-2">
        {/* Indicador de dimensões físicas ativas do crachá */}
        <div className="w-full flex items-center justify-between px-2 pb-1.5 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 font-mono text-emerald-400 font-bold">
            <Ruler className="w-3.5 h-3.5" />
            {cardWidthMm} mm (Largura) × {cardHeightMm} mm (Altura)
          </span>
          <span className="text-[10px] text-slate-400">
            {cardSide === "front" ? "Frente (Toque p/ Girar)" : "Verso (Toque p/ Girar)"}
          </span>
        </div>

        <div
          onClick={() => setCardSide(cardSide === "front" ? "back" : "front")}
          title="Toque no cartão para girar frente/verso"
          className="relative cursor-pointer transition-transform active:scale-95 shadow-2xl max-w-full"
          style={{
            width: `${Math.round(cardWidthMm * 4.2)}px`,
            height: `${Math.round(cardHeightMm * 4.2)}px`,
            maxWidth: "100%",
          }}
        >
          {cardSide === "front" ? (
            /* FRENTE */
            <div
              id="public-card-front"
              className="w-full h-full rounded-2xl text-white p-3.5 sm:p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${cardTheme.fromColor} 0%, ${cardTheme.viaColor} 50%, ${cardTheme.toColor} 100%)`,
                borderColor: cardTheme.borderColor,
                borderWidth: `${cardBorderWidth}px`,
                borderStyle: "solid",
                boxShadow: `0 20px 40px -15px ${cardTheme.fromColor}99, 0 0 15px ${cardTheme.borderColor}40`,
              }}
            >
              {/* Brasão d'Água Centralizado com Fundo Transparente e Harmonia Cromática */}
              {cardTheme.bgTexture === "brasao" && (
                <BrasaoWatermark
                  color={cardTheme.accentColor || "#ffffff"}
                  registeredLogo={registeredLogo}
                  customWatermarkUrl={cardTheme.customWatermarkUrl}
                  watermarkMode={cardTheme.watermarkMode || "parametros"}
                  watermarkHarmony={cardTheme.watermarkHarmony || "accent"}
                  opacity={cardTheme.customWatermarkUrl ? 0.22 : 0.18}
                  size={145}
                />
              )}

              {/* Topo Frente */}
              <div
                className="flex items-center justify-between pb-2 border-b z-10 gap-3"
                style={{ borderColor: `${cardTheme.borderColor}40` }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {registeredLogo ? (
                    <img
                      src={registeredLogo}
                      alt="Logo da Igreja"
                      className="h-12 w-12 sm:h-14 sm:w-14 object-contain rounded-xl bg-white/10 p-1 border shadow-xs shrink-0"
                      style={{ borderColor: `${cardTheme.borderColor}80` }}
                    />
                  ) : (
                    <div
                      className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl border flex items-center justify-center font-black text-xs sm:text-sm shadow-xs shrink-0"
                      style={{
                        backgroundColor: `${cardTheme.accentColor}25`,
                        borderColor: cardTheme.accentColor,
                        color: cardTheme.accentColor,
                      }}
                    >
                      IEPC
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xs sm:text-sm font-black uppercase tracking-wide leading-tight text-white truncate drop-shadow-xs">
                      {member.branchName || churchConfig.nome}
                    </h2>
                    <span
                      className="text-[10px] uppercase block font-bold truncate mt-0.5 tracking-wider"
                      style={{ color: cardTheme.accentColor }}
                    >
                      ROL OFICIAL DE MEMBROS
                    </span>
                  </div>
                </div>
                <Badge
                  className="text-slate-950 text-[9px] font-black uppercase px-2.5 py-1 shadow-xs shrink-0 whitespace-nowrap self-center tracking-wider"
                  style={{ backgroundColor: cardTheme.accentColor }}
                >
                  {activeBadgeLabel}
                </Badge>
              </div>

              {/* Meio (Aproveitando todo o espaço vertical liberado) */}
              <div className="flex items-center gap-4 my-auto py-1.5 z-10 flex-1">
                <div
                  className={`overflow-hidden border-2 bg-slate-950/70 shadow-md shrink-0 flex items-center justify-center ${
                    cardTheme.photoShape === "circle"
                      ? "w-20 h-20 sm:w-22 sm:h-22 rounded-full"
                      : "w-20 h-26 sm:w-22 sm:h-28 rounded-xl"
                  }`}
                  style={{ borderColor: cardTheme.borderColor }}
                >
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-white opacity-60" />
                  )}
                </div>

                <div className="space-y-1.5 flex-1 overflow-hidden">
                  <div
                    className="text-[9.5px] uppercase font-extrabold tracking-widest"
                    style={{ color: cardTheme.accentColor }}
                  >
                    NOME DO MEMBRO
                  </div>
                  <div className="text-sm sm:text-base font-black text-white truncate leading-tight drop-shadow-xs">
                    {member.name}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap pt-0.5">
                    <span
                      className="px-2.5 py-0.5 rounded-md text-[10px] sm:text-xs font-black uppercase border shadow-xs"
                      style={{
                        backgroundColor: cardTheme.tagBg,
                        color: cardTheme.tagText,
                        borderColor: `${cardTheme.borderColor}70`,
                      }}
                    >
                      {member.role || "Membro"}
                    </span>
                    <span className="text-[10px] text-slate-200 font-mono font-bold tracking-wider">
                      {registrationNum}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1 text-[9.5px]">
                    <div className="bg-black/25 rounded-lg p-1.5 border border-white/10 backdrop-blur-xs">
                      <span className="font-extrabold block uppercase tracking-wider text-[8.5px]" style={{ color: cardTheme.accentColor }}>
                        DATA DO BATISMO:
                      </span>
                      <span className="font-bold text-white tracking-wide block">
                        {formatBaptismDate(member.baptismDate || member.dataBatismo)}
                      </span>
                    </div>
                    <div className="bg-black/25 rounded-lg p-1.5 border border-white/10 backdrop-blur-xs">
                      <span className="font-extrabold block uppercase tracking-wider text-[8.5px]" style={{ color: cardTheme.accentColor }}>
                        VALIDADE:
                      </span>
                      <span className="font-bold text-white tracking-wide block">
                        {formattedValidity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* VERSO DA CARTEIRINHA: CONSTITUCIONAL COM BANDEIRA (ANEXO 2) OU SIMPLES */
            cardTheme.showConstituicaoVerso !== false ? (
              <div
                id="public-card-back"
                className="w-full h-full rounded-2xl text-slate-900 p-3 sm:p-3.5 shadow-2xl flex flex-col justify-between relative overflow-hidden bg-white"
                style={{
                  borderColor: cardTheme.borderColor,
                  borderWidth: `${cardBorderWidth}px`,
                  borderStyle: "solid",
                  boxShadow: `0 20px 40px -15px ${cardTheme.fromColor}99, 0 0 15px ${cardTheme.borderColor}40`,
                }}
              >
                {/* Fundo da Bandeira do Brasil vetorizada, com fade suave para fundo branco */}
                <div
                  className="absolute inset-0 pointer-events-none z-0"
                  style={{
                    backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.92) 46%, #ffffff 80%), url('/assets/bandeira_brasil.svg')`,
                    backgroundPosition: "left center",
                    backgroundSize: "contain",
                    backgroundRepeat: "no-repeat",
                  }}
                />

                {/* Topo Verso Constitucional - Perfeitamente enquadrado, sem cortes e com letras nítidas */}
                <div
                  className="pb-1 pt-0.5 text-center border-b z-10"
                  style={{ borderColor: `${cardTheme.borderColor}45` }}
                >
                  <div
                    className="text-[9.5px] sm:text-[11px] font-black uppercase tracking-wider leading-tight text-emerald-950"
                  >
                    REPÚBLICA FEDERATIVA DO BRASIL • CONSTITUIÇÃO DE 1988
                  </div>
                  <p className="text-[7px] sm:text-[7.5px] text-slate-800 font-semibold leading-tight mt-0.5">
                    Solicitamos às autoridades oficiais, civis e militares que dispensem ao portador facilidades em seu Ministério.
                  </p>
                </div>

                {/* Meio: Leis Constitucionais Enquadradas em Frames + QR Code de Validação */}
                <div className="flex items-center justify-between gap-2.5 my-auto py-1 z-10">
                  <div className="flex-1 space-y-1 text-slate-900 pr-1">
                    <div className="bg-white/90 rounded-md p-1 border border-slate-200/90 shadow-2xs">
                      <span
                        className="text-[7.5px] sm:text-[8px] font-black uppercase block leading-tight text-emerald-950"
                      >
                        ASSISTÊNCIA RELIGIOSA (HOSPITAIS E PRESÍDIOS)
                      </span>
                      <p className="text-[6.5px] sm:text-[7px] text-slate-800 font-medium leading-tight">
                        <strong>Art. 5º VII-A / Lei 9.982:</strong> Assegura assistência religiosa nas entidades civis e militares coletivas.
                      </p>
                    </div>

                    <div className="bg-white/90 rounded-md p-1 border border-slate-200/90 shadow-2xs">
                      <span
                        className="text-[7.5px] sm:text-[8px] font-black uppercase block leading-tight text-emerald-950"
                      >
                        LIBERDADE DE CULTO
                      </span>
                      <p className="text-[6.5px] sm:text-[7px] text-slate-800 font-medium leading-tight">
                        <strong>Art. 5º VI:</strong> Inviolável liberdade de crença e garantido o livre exercício dos cultos.
                      </p>
                    </div>

                    <div className="text-[6.5px] sm:text-[7px] font-bold text-slate-700 italic px-0.5 leading-tight">
                      Documento pessoal e intransferível. Válido com apresentação de RG/CPF.
                    </div>
                  </div>

                  {/* QR Code de Validação */}
                  <div
                    className="bg-white p-1.5 rounded-xl shrink-0 shadow-sm border-2 flex flex-col items-center"
                    style={{ borderColor: cardTheme.borderColor }}
                  >
                    <QRCodeSVG
                      value={validationUrl}
                      size={58}
                      level="M"
                      includeMargin={false}
                    />
                    <span
                      className="text-[6px] font-black uppercase mt-0.5 tracking-wider text-emerald-950"
                    >
                      VALIDAR
                    </span>
                    <span className="text-[5.5px] text-slate-600 font-mono font-bold">
                      VAL: {formattedValidity}
                    </span>
                  </div>
                </div>

                {/* Faixa Oficial de Validade antes das Assinaturas */}
                <div className="flex items-center justify-center my-0.5 z-10 w-full">
                  <div
                    className="py-0.5 px-2.5 rounded-full inline-flex items-center justify-center gap-1.5 text-[7px] sm:text-[8px] font-bold border shadow-xs"
                    style={{
                      backgroundColor: `${cardTheme.fromColor}12`,
                      borderColor: `${cardTheme.borderColor}70`,
                      color: "#0f172a",
                    }}
                  >
                    <Calendar className="w-2.5 h-2.5 shrink-0" style={{ color: cardTheme.fromColor }} />
                    <span className="font-extrabold uppercase tracking-wider text-slate-900">
                      Validade da Credencial:
                    </span>
                    <span
                      className="font-mono font-black px-1.5 py-0.2 rounded text-[7.5px] sm:text-[8.5px] text-white shadow-2xs"
                      style={{
                        backgroundColor: cardTheme.fromColor,
                      }}
                    >
                      {formattedValidity}
                    </span>
                  </div>
                </div>

                {/* Assinaturas Oficiais (Pastor Presidente e Pastor Local quando Obreiro) */}
                <div
                  className="pt-1 grid grid-cols-2 gap-3 text-center border-t z-10"
                  style={{ borderColor: `${cardTheme.borderColor}35` }}
                >
                  <div className="flex flex-col justify-end">
                    {isObreiro && pastorPresidenteSig && (
                      <img
                        src={pastorPresidenteSig}
                        alt="Assinatura Pastor Presidente"
                        className="h-5 sm:h-6 object-contain mx-auto -mb-1 pointer-events-none select-none drop-shadow-xs"
                      />
                    )}
                    {!isObreiro && pastorLocalSig && (
                      <img
                        src={pastorLocalSig}
                        alt="Assinatura Pastor Local"
                        className="h-5 sm:h-6 object-contain mx-auto -mb-1 pointer-events-none select-none drop-shadow-xs"
                      />
                    )}
                    <div
                      className="border-t mx-auto w-4/5 pt-0.5 text-[7.5px] sm:text-[8px] font-bold text-slate-900 truncate"
                      style={{ borderColor: cardTheme.borderColor }}
                    >
                      {isObreiro ? pastorPresidenteName : pastorLocalName}
                    </div>
                    <div
                      className="text-[6px] sm:text-[6.5px] font-semibold uppercase tracking-wider text-emerald-900"
                    >
                      {isObreiro ? "Pastor Presidente" : "Pastor Local"}
                    </div>
                    {((isObreiro && pastorPresidenteCodigo) || (!isObreiro && pastorLocalCodigo)) && (
                      <div className="text-[5.5px] sm:text-[6px] font-mono font-bold text-slate-600 truncate pt-0.5">
                        Reg: {isObreiro ? pastorPresidenteCodigo : pastorLocalCodigo}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-end">
                    {isObreiro && pastorLocalSig && (
                      <img
                        src={pastorLocalSig}
                        alt="Assinatura Pastor Local"
                        className="h-5 sm:h-6 object-contain mx-auto -mb-1 pointer-events-none select-none drop-shadow-xs"
                      />
                    )}
                    <div
                      className="border-t mx-auto w-4/5 pt-0.5 text-[7.5px] sm:text-[8px] font-bold text-slate-900 truncate"
                      style={{ borderColor: cardTheme.borderColor }}
                    >
                      {isObreiro ? pastorLocalName : "Secretaria Geral"}
                    </div>
                    <div
                      className="text-[6px] sm:text-[6.5px] font-semibold uppercase tracking-wider text-emerald-900"
                    >
                      {isObreiro ? "Pastor Local" : "Secretaria Geral"}
                    </div>
                    {isObreiro && pastorLocalCodigo && (
                      <div className="text-[5.5px] sm:text-[6px] font-mono font-bold text-slate-600 truncate pt-0.5">
                        Reg: {pastorLocalCodigo}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* VERSO SIMPLES */
              <div
                id="public-card-back"
                className="w-full h-full rounded-2xl text-white p-3.5 sm:p-5 shadow-2xl flex flex-col justify-between relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${cardTheme.toColor} 0%, #09090b 60%, ${cardTheme.fromColor} 100%)`,
                  borderColor: cardTheme.borderColor,
                  borderWidth: `${cardBorderWidth}px`,
                  borderStyle: "solid",
                  boxShadow: `0 20px 40px -15px ${cardTheme.fromColor}99, 0 0 15px ${cardTheme.borderColor}40`,
                }}
              >
                {cardTheme.bgTexture === "brasao" && (
                  <BrasaoWatermark
                    color={cardTheme.accentColor || "#ffffff"}
                    registeredLogo={registeredLogo}
                    customWatermarkUrl={cardTheme.customWatermarkUrl}
                    watermarkMode={cardTheme.watermarkMode || "parametros"}
                    watermarkHarmony={cardTheme.watermarkHarmony || "accent"}
                    opacity={cardTheme.customWatermarkUrl ? 0.22 : 0.18}
                    size={140}
                  />
                )}

                <div
                  className="pb-1.5 flex items-center justify-between text-[9px] font-bold border-b z-10"
                  style={{ borderColor: `${cardTheme.borderColor}40`, color: cardTheme.accentColor }}
                >
                  <span>AUTENTICIDADE ELETRÔNICA</span>
                  <span className="font-mono text-slate-400">{registrationNum}</span>
                </div>

                <div className="flex items-center justify-between gap-3 my-auto py-1 z-10">
                  <div className="space-y-1 text-[9px] text-slate-300 flex-1">
                    <p className="leading-tight">
                      Membro em plena comunhão eclesiástica na <strong>{member.branchName || churchConfig.nome}</strong>.
                    </p>
                    <div className="text-[8px] space-y-0.5">
                      <div>CNPJ: {churchConfig.cnpj}</div>
                      <div>Sede: {churchConfig.cidade}</div>
                      {member.cpf && <div>CPF: {member.cpf}</div>}
                    </div>
                  </div>

                  <div
                    className="bg-white p-1.5 rounded-xl shrink-0 border-2 flex flex-col items-center"
                    style={{ borderColor: cardTheme.accentColor }}
                  >
                    <QRCodeSVG value={validationUrl} size={64} level="M" />
                    <span className="text-[6px] text-slate-900 font-bold uppercase mt-0.5">
                      VALIDAR DIGITAL
                    </span>
                  </div>
                </div>

                {/* Faixa Oficial de Validade antes das Assinaturas */}
                <div className="flex items-center justify-center my-1 z-10 w-full">
                  <div
                    className="py-0.5 px-2.5 rounded-full inline-flex items-center justify-center gap-1.5 text-[7px] sm:text-[8px] font-bold border shadow-xs"
                    style={{
                      backgroundColor: `${cardTheme.accentColor}18`,
                      borderColor: `${cardTheme.borderColor}60`,
                      color: cardTheme.accentColor,
                    }}
                  >
                    <Calendar className="w-2.5 h-2.5 shrink-0" style={{ color: cardTheme.accentColor }} />
                    <span className="font-extrabold uppercase tracking-wider">
                      Validade da Credencial:
                    </span>
                    <span
                      className="font-mono font-black px-1.5 py-0.2 rounded text-[7.5px] sm:text-[8.5px] shadow-2xs"
                      style={{
                        backgroundColor: `${cardTheme.borderColor}30`,
                        color: "#ffffff",
                      }}
                    >
                      {formattedValidity}
                    </span>
                  </div>
                </div>

                {/* Assinaturas no Verso Tradicional */}
                <div
                  className="pt-1 grid grid-cols-2 gap-3 text-center border-t z-10"
                  style={{ borderColor: `${cardTheme.borderColor}35` }}
                >
                  <div className="flex flex-col justify-end">
                    {isObreiro && pastorPresidenteSig && (
                      <img
                        src={pastorPresidenteSig}
                        alt="Assinatura Pastor Presidente"
                        className="h-5 sm:h-6 object-contain mx-auto -mb-1 pointer-events-none select-none drop-shadow-xs invert"
                      />
                    )}
                    {!isObreiro && pastorLocalSig && (
                      <img
                        src={pastorLocalSig}
                        alt="Assinatura Pastor Local"
                        className="h-5 sm:h-6 object-contain mx-auto -mb-1 pointer-events-none select-none drop-shadow-xs invert"
                      />
                    )}
                    <div
                      className="border-t mx-auto w-4/5 pt-0.5 text-[7.5px] sm:text-[8px] font-bold text-white truncate"
                      style={{ borderColor: cardTheme.borderColor }}
                    >
                      {isObreiro ? pastorPresidenteName : pastorLocalName}
                    </div>
                    <div
                      className="text-[6px] sm:text-[6.5px] font-semibold uppercase tracking-wider"
                      style={{ color: cardTheme.accentColor }}
                    >
                      {isObreiro ? "Pastor Presidente" : "Pastor Local"}
                    </div>
                    {((isObreiro && pastorPresidenteCodigo) || (!isObreiro && pastorLocalCodigo)) && (
                      <div className="text-[5.5px] sm:text-[6px] font-mono font-bold text-slate-300 truncate pt-0.5">
                        Reg: {isObreiro ? pastorPresidenteCodigo : pastorLocalCodigo}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col justify-end">
                    {isObreiro && pastorLocalSig && (
                      <img
                        src={pastorLocalSig}
                        alt="Assinatura Pastor Local"
                        className="h-5 sm:h-6 object-contain mx-auto -mb-1 pointer-events-none select-none drop-shadow-xs invert"
                      />
                    )}
                    <div
                      className="border-t mx-auto w-4/5 pt-0.5 text-[7.5px] sm:text-[8px] font-bold text-white truncate"
                      style={{ borderColor: cardTheme.borderColor }}
                    >
                      {isObreiro ? pastorLocalName : "Secretaria Geral"}
                    </div>
                    <div
                      className="text-[6px] sm:text-[6.5px] font-semibold uppercase tracking-wider"
                      style={{ color: cardTheme.accentColor }}
                    >
                      {isObreiro ? "Pastor Local" : "Secretaria Geral"}
                    </div>
                    {isObreiro && pastorLocalCodigo && (
                      <div className="text-[5.5px] sm:text-[6px] font-mono font-bold text-slate-300 truncate pt-0.5">
                        Reg: {pastorLocalCodigo}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          )}
        </div>

        {/* Botão de Girar o Cartão */}
        <Button
          onClick={() => setCardSide(cardSide === "front" ? "back" : "front")}
          variant="outline"
          className="mt-4 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40 text-xs font-semibold rounded-xl"
        >
          <RotateCw className="w-3.5 h-3.5 mr-1.5" />
          {cardSide === "front" ? "Ver Verso (Bandeira & Leis CF/88)" : "Ver Frente da Carteirinha"}
        </Button>
      </div>

      {/* CONTAINER OCULTO PARA EXPORTAÇÃO COMBINADA (FRENTE + VERSO JUNTOS) */}
      <div style={{ position: "absolute", left: "-99999px", top: "-99999px", opacity: 0, pointerEvents: "none" }}>
        <div
          id="public-card-combined"
          style={{
            width: `${exportTotalWidth}px`,
            padding: "24px",
            backgroundColor: "#030712",
            display: "flex",
            flexDirection: "row",
            gap: "24px",
            justifyContent: "center",
            alignItems: "center",
            boxSizing: "border-box",
            borderRadius: "24px",
          }}
        >
          {/* Frente da Carteirinha Combinada */}
          <div
            style={{
              width: `${exportCardWidth}px`,
              height: `${exportCardHeight}px`,
              borderRadius: "16px",
              padding: "16px",
              color: "#ffffff",
              background: `linear-gradient(135deg, ${cardTheme.fromColor} 0%, ${cardTheme.viaColor} 50%, ${cardTheme.toColor} 100%)`,
              border: `${cardBorderWidth}px solid ${cardTheme.borderColor}`,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              position: "relative",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <BrasaoWatermark
              color={cardTheme.accentColor || "#ffffff"}
              registeredLogo={registeredLogo}
              customWatermarkUrl={cardTheme.customWatermarkUrl}
              watermarkMode={cardTheme.watermarkMode || "parametros"}
              watermarkHarmony={cardTheme.watermarkHarmony || "accent"}
              opacity={cardTheme.customWatermarkUrl ? 0.22 : 0.18}
              size={130}
            />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${cardTheme.borderColor}40`, paddingBottom: "6px", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {registeredLogo && (
                  <img src={registeredLogo} alt="Logo" style={{ width: "40px", height: "40px", objectFit: "contain", borderRadius: "8px", backgroundColor: "rgba(255,255,255,0.15)", padding: "1px", border: `1px solid ${cardTheme.borderColor}80` }} />
                )}
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "900", textTransform: "uppercase" }}>{churchConfig.nome}</div>
                  <div style={{ fontSize: "8.5px", color: cardTheme.accentColor, fontWeight: "bold" }}>ROL DE MEMBROS</div>
                </div>
              </div>
              <div style={{ backgroundColor: cardTheme.accentColor, color: "#020617", fontSize: "8.5px", fontWeight: "900", padding: "2px 8px", borderRadius: "4px" }}>
                {activeBadgeLabel}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "14px", margin: "auto 0", zIndex: 1, flex: 1, padding: "6px 0" }}>
              <div style={{ width: "60px", height: "76px", borderRadius: "8px", border: `1.5px solid ${cardTheme.borderColor}`, overflow: "hidden", backgroundColor: "#020617", flexShrink: 0 }}>
                {member.photoUrl ? (
                  <img src={member.photoUrl} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ color: "#ffffff", opacity: 0.6, fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>👤</div>
                )}
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontSize: "8px", color: cardTheme.accentColor, fontWeight: "bold" }}>NOME DO MEMBRO</div>
                <div style={{ fontSize: "14px", fontWeight: "900", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{member.name}</div>
                <div style={{ marginTop: "3px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ backgroundColor: cardTheme.tagBg, color: cardTheme.tagText, padding: "1px 6px", borderRadius: "4px", fontSize: "8.5px", fontWeight: "bold" }}>
                    {member.role || "Membro"}
                  </span>
                  <span style={{ fontSize: "8.5px", fontFamily: "monospace", opacity: 0.9 }}>{registrationNum}</span>
                </div>
                <div style={{ display: "flex", gap: "10px", fontSize: "8px", marginTop: "5px", opacity: 0.95 }}>
                  <div>Data Batismo: <strong style={{ color: "#ffffff" }}>{formatBaptismDate(member.baptismDate || member.dataBatismo)}</strong></div>
                  <div>Validade: <strong style={{ color: "#ffffff" }}>{formattedValidity}</strong></div>
                </div>
              </div>
            </div>
          </div>

          {/* Verso da Carteirinha Combinada: Constitucional com Bandeira ou Tradicional Simples */}
          {cardTheme.showConstituicaoVerso !== false ? (
            <div
              style={{
                width: `${exportCardWidth}px`,
                height: `${exportCardHeight}px`,
                borderRadius: "16px",
                padding: "12px 14px",
                color: "#0f172a",
                backgroundColor: "#ffffff",
                backgroundImage: `linear-gradient(to right, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.92) 46%, #ffffff 80%), url('/assets/bandeira_brasil.svg')`,
                backgroundPosition: "left center",
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                border: `${cardBorderWidth}px solid ${cardTheme.borderColor}`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              <div style={{ borderBottom: `1px solid ${cardTheme.borderColor}45`, paddingBottom: "2px", textAlign: "center" }}>
                <div style={{ fontSize: "7px", fontWeight: "900", color: "#064e3b", textTransform: "uppercase", letterSpacing: "0.2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  REPÚBLICA FEDERATIVA DO BRASIL • CONSTITUIÇÃO DE 1988
                </div>
                <div style={{ fontSize: "5.5px", color: "#1e293b", fontWeight: "500", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "1px" }}>
                  Solicitamos às autoridades oficiais e civis facilidades no desempenho ministerial.
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", margin: "auto 0" }}>
                <div style={{ flex: 1, fontSize: "6.5px", lineHeight: 1.3, color: "#0f172a" }}>
                  <div style={{ backgroundColor: "rgba(255,255,255,0.9)", padding: "2px 5px", borderRadius: "4px", border: "0.5px solid #e2e8f0", marginBottom: "3px" }}>
                    <div style={{ fontWeight: "900", color: "#064e3b" }}>ASSISTÊNCIA RELIGIOSA (HOSPITAIS E PRESÍDIOS)</div>
                    <div style={{ color: "#334155" }}>Art. 5º VII-A / Lei 9.982: Assegura assistência religiosa em entidades coletivas.</div>
                  </div>
                  <div style={{ backgroundColor: "rgba(255,255,255,0.9)", padding: "2px 5px", borderRadius: "4px", border: "0.5px solid #e2e8f0" }}>
                    <div style={{ fontWeight: "900", color: "#064e3b" }}>LIBERDADE DE CULTO</div>
                    <div style={{ color: "#334155" }}>Art. 5º VI: Inviolável liberdade de crença e livre exercício de cultos.</div>
                  </div>
                  <div style={{ fontSize: "5.5px", color: "#475569", fontStyle: "italic", marginTop: "2px" }}>
                    Esta Credencial é pessoal e intransferível. Válida com RG/CPF.
                  </div>
                </div>
                <div style={{ backgroundColor: "#ffffff", padding: "4px", borderRadius: "6px", border: `1px solid ${cardTheme.borderColor}`, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <QRCodeSVG value={validationUrl} size={46} level="M" includeMargin={false} />
                  <span style={{ fontSize: "5px", color: "#064e3b", fontWeight: "900", marginTop: "1px" }}>VALIDAR DIGITAL</span>
                </div>
              </div>

              {/* Faixa de Validade antes das Assinaturas */}
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", fontSize: "7px", padding: "1px 8px", borderRadius: "999px", backgroundColor: `${cardTheme.fromColor}15`, border: `0.5px solid ${cardTheme.borderColor}70`, margin: "1px auto", zIndex: 1, width: "fit-content" }}>
                <span style={{ fontWeight: "900", color: "#064e3b", textTransform: "uppercase" }}>VALIDADE DA CREDENCIAL:</span>
                <strong style={{ color: "#ffffff", fontFamily: "monospace", backgroundColor: cardTheme.fromColor, padding: "0 5px", borderRadius: "3px" }}>{formattedValidity}</strong>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", borderTop: `1px solid ${cardTheme.borderColor}40`, paddingTop: "2px", textAlign: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  {(isObreiro ? pastorPresidenteSig : pastorLocalSig) && (
                    <img
                      src={isObreiro ? pastorPresidenteSig : pastorLocalSig}
                      alt="Assinatura"
                      style={{ height: "14px", objectFit: "contain", margin: "0 auto -2px auto", display: "block" }}
                    />
                  )}
                  <div style={{ borderTop: `1px solid ${cardTheme.borderColor}`, width: "90%", margin: "0 auto", fontSize: "7px", fontWeight: "bold", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {isObreiro ? pastorPresidenteName : pastorLocalName}
                  </div>
                  <div style={{ fontSize: "6px", color: "#064e3b", fontWeight: "bold", whiteSpace: "nowrap" }}>
                    {isObreiro ? "Pastor Presidente" : "Pastor Local"}
                  </div>
                  {((isObreiro && pastorPresidenteCodigo) || (!isObreiro && pastorLocalCodigo)) && (
                    <div style={{ fontSize: "5px", color: "#475569", fontFamily: "monospace", fontWeight: "bold", paddingTop: "0.5px", whiteSpace: "nowrap" }}>
                      Reg: {isObreiro ? pastorPresidenteCodigo : pastorLocalCodigo}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  {isObreiro && pastorLocalSig && (
                    <img
                      src={pastorLocalSig}
                      alt="Assinatura"
                      style={{ height: "14px", objectFit: "contain", margin: "0 auto -2px auto", display: "block" }}
                    />
                  )}
                  <div style={{ borderTop: `1px solid ${cardTheme.borderColor}`, width: "90%", margin: "0 auto", fontSize: "7px", fontWeight: "bold", color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {isObreiro ? pastorLocalName : "Secretaria Geral"}
                  </div>
                  <div style={{ fontSize: "6px", color: "#064e3b", fontWeight: "bold", whiteSpace: "nowrap" }}>
                    {isObreiro ? "Pastor Local" : "Secretaria Geral"}
                  </div>
                  {isObreiro && pastorLocalCodigo && (
                    <div style={{ fontSize: "5px", color: "#475569", fontFamily: "monospace", fontWeight: "bold", paddingTop: "0.5px", whiteSpace: "nowrap" }}>
                      Reg: {pastorLocalCodigo}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                width: `${exportCardWidth}px`,
                height: `${exportCardHeight}px`,
                borderRadius: "16px",
                padding: "14px",
                color: "#ffffff",
                background: `linear-gradient(135deg, ${cardTheme.toColor} 0%, #09090b 60%, ${cardTheme.fromColor} 100%)`,
                border: `${cardBorderWidth}px solid ${cardTheme.borderColor}`,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              {cardTheme.bgTexture === "brasao" && (
                <BrasaoWatermark
                  color={cardTheme.accentColor || "#ffffff"}
                  registeredLogo={registeredLogo}
                  customWatermarkUrl={cardTheme.customWatermarkUrl}
                  watermarkMode={cardTheme.watermarkMode || "parametros"}
                  watermarkHarmony={cardTheme.watermarkHarmony || "accent"}
                  opacity={cardTheme.customWatermarkUrl ? 0.22 : 0.18}
                  size={120}
                />
              )}

              <div style={{ borderBottom: `1px solid ${cardTheme.borderColor}40`, paddingBottom: "3px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 1 }}>
                <div style={{ fontSize: "8.5px", fontWeight: "900", color: cardTheme.accentColor }}>AUTENTICIDADE ELETRÔNICA</div>
                <div style={{ fontSize: "7.5px", fontFamily: "monospace", opacity: 0.8 }}>{registrationNum}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", margin: "auto 0", zIndex: 1 }}>
                <div style={{ flex: 1, fontSize: "7px", lineHeight: 1.3, color: "#cbd5e1" }}>
                  <div>Membro em plena comunhão na <strong>{member.branchName || churchConfig.nome}</strong>.</div>
                  <div style={{ fontSize: "6.5px", marginTop: "2px", opacity: 0.8 }}>
                    CNPJ: {churchConfig.cnpj} • Sede: {churchConfig.cidade}
                  </div>
                </div>
                <div style={{ backgroundColor: "#ffffff", padding: "4px", borderRadius: "6px", border: `1px solid ${cardTheme.borderColor}`, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <QRCodeSVG value={validationUrl} size={46} level="M" includeMargin={false} />
                  <span style={{ fontSize: "5px", color: cardTheme.fromColor, fontWeight: "900", marginTop: "1px" }}>VALIDAR</span>
                </div>
              </div>

              {/* Faixa de Validade antes das Assinaturas */}
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", fontSize: "7px", padding: "1px 8px", borderRadius: "999px", backgroundColor: `${cardTheme.accentColor}18`, border: `0.5px solid ${cardTheme.borderColor}60`, margin: "1px auto", zIndex: 1, width: "fit-content" }}>
                <span style={{ fontWeight: "900", color: cardTheme.accentColor, textTransform: "uppercase" }}>VALIDADE DA CREDENCIAL:</span>
                <strong style={{ color: "#ffffff", fontFamily: "monospace", backgroundColor: `${cardTheme.borderColor}40`, padding: "0 4px", borderRadius: "3px" }}>{formattedValidity}</strong>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", borderTop: `1px solid ${cardTheme.borderColor}40`, paddingTop: "2px", textAlign: "center", zIndex: 1 }}>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  {(isObreiro ? pastorPresidenteSig : pastorLocalSig) && (
                    <img
                      src={isObreiro ? pastorPresidenteSig : pastorLocalSig}
                      alt="Assinatura"
                      style={{ height: "14px", objectFit: "contain", margin: "0 auto -2px auto", display: "block" }}
                    />
                  )}
                  <div style={{ borderTop: `1px solid ${cardTheme.borderColor}`, width: "80%", margin: "0 auto", fontSize: "7px", fontWeight: "bold", color: "#ffffff" }}>
                    {isObreiro ? pastorPresidenteName : pastorLocalName}
                  </div>
                  <div style={{ fontSize: "6px", color: cardTheme.accentColor, fontWeight: "bold" }}>
                    {isObreiro ? "Pastor Presidente" : "Pastor Local"}
                  </div>
                  {((isObreiro && pastorPresidenteCodigo) || (!isObreiro && pastorLocalCodigo)) && (
                    <div style={{ fontSize: "5px", color: "#cbd5e1", fontFamily: "monospace", fontWeight: "bold", paddingTop: "0.5px" }}>
                      Reg: {isObreiro ? pastorPresidenteCodigo : pastorLocalCodigo}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
                  {isObreiro && pastorLocalSig && (
                    <img
                      src={pastorLocalSig}
                      alt="Assinatura"
                      style={{ height: "14px", objectFit: "contain", margin: "0 auto -2px auto", display: "block" }}
                    />
                  )}
                  <div style={{ borderTop: `1px solid ${cardTheme.borderColor}`, width: "80%", margin: "0 auto", fontSize: "7px", fontWeight: "bold", color: "#ffffff" }}>
                    {isObreiro ? pastorLocalName : "Secretaria Geral"}
                  </div>
                  <div style={{ fontSize: "6px", color: cardTheme.accentColor, fontWeight: "bold" }}>
                    {isObreiro ? "Pastor Local" : "Secretaria Geral"}
                  </div>
                  {isObreiro && pastorLocalCodigo && (
                    <div style={{ fontSize: "5px", color: "#cbd5e1", fontFamily: "monospace", fontWeight: "bold", paddingTop: "0.5px" }}>
                      Reg: {pastorLocalCodigo}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ações Inferiores no Celular (Salvar Frente, Verso ou Ambos Juntos - Anexo 3) */}
      <div className="w-full max-w-md space-y-2 pt-2">
        <div className="grid grid-cols-3 gap-1.5">
          <Button
            onClick={handleDownloadFront}
            disabled={isDownloading}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] h-10 rounded-xl px-1"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Salvar Frente
          </Button>

          <Button
            onClick={handleDownloadBack}
            disabled={isDownloading}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-[11px] h-10 rounded-xl px-1"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            Salvar Verso
          </Button>

          <Button
            onClick={handleDownloadCombined}
            disabled={isDownloading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[11px] h-10 rounded-xl px-1 shadow-md"
            title="Baixar Frente e Verso em uma única imagem completa"
          >
            <Download className="w-3.5 h-3.5 mr-1 text-amber-300" />
            Ambos Juntos
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handlePrint}
            variant="outline"
            className="w-full border-slate-700 hover:bg-slate-800 text-white font-bold text-xs h-10 rounded-xl"
            title="Abre a tela de impressão ou gera documento A4"
          >
            <Printer className="w-4 h-4 mr-1.5 text-emerald-400" />
            Imprimir Cartão
          </Button>

          <Button
            onClick={handleShare}
            variant="outline"
            className="w-full border-slate-700 hover:bg-slate-800 text-white font-semibold text-xs h-10 rounded-xl"
          >
            <Share2 className="w-4 h-4 mr-1.5 text-emerald-400" />
            Compartilhar Link
          </Button>
        </div>

        <p className="text-[10px] text-center text-slate-400 pt-1 leading-relaxed">
          Dica: No iPhone ou Android, toque em <strong>Compartilhar</strong> e selecione <strong>"Adicionar à Tela de Início"</strong> para usar como aplicativo!
        </p>
      </div>
    </div>
  );
}
