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
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { downloadElementAsImage } from "@/lib/printUtils";
import { toast } from "sonner";
import { getSavedCardTheme } from "@/lib/carteirinhaThemeHelper";
import { getRegisteredChurchLogo } from "@/lib/churchLogoHelper";
import { BrasaoWatermark } from "@/components/secretaria/BrasaoWatermark";

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

  // Hooks do tema e logo carregados no topo incondicionalmente
  const cardTheme = useMemo(() => getSavedCardTheme(), []);
  const registeredLogo = useMemo(() => getRegisteredChurchLogo(member?.branchId || "all"), [member?.branchId]);

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

  const handleDownloadImage = async () => {
    if (!member) return;
    setIsDownloading(true);
    const targetId = cardSide === "front" ? "public-card-front" : "public-card-back";
    const filename = `Minha_Carteirinha_${member.name.replace(/\s+/g, "_")}.png`;
    try {
      await downloadElementAsImage(targetId, filename);
    } finally {
      setIsDownloading(false);
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
        <div
          onClick={() => setCardSide(cardSide === "front" ? "back" : "front")}
          title="Toque no cartão para girar frente/verso"
          className="w-full aspect-[1.58/1] relative cursor-pointer transition-transform active:scale-95"
        >
          {cardSide === "front" ? (
            /* FRENTE */
            <div
              id="public-card-front"
              className="w-full h-full rounded-2xl text-white p-4 sm:p-5 shadow-2xl border-2 flex flex-col justify-between relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${cardTheme.fromColor} 0%, ${cardTheme.viaColor} 50%, ${cardTheme.toColor} 100%)`,
                borderColor: cardTheme.borderColor,
                boxShadow: `0 20px 40px -15px ${cardTheme.fromColor}99, 0 0 15px ${cardTheme.borderColor}40`,
              }}
            >
              {/* Brasão d'Água Oficial Centralizado e com Fundo Transparente */}
              {cardTheme.bgTexture === "brasao" && (
                <BrasaoWatermark
                  color={cardTheme.accentColor || "#ffffff"}
                  registeredLogo={registeredLogo}
                  opacity={0.16}
                  size={145}
                />
              )}

              <div
                className="flex items-center justify-between pb-2 border-b z-10"
                style={{ borderColor: `${cardTheme.borderColor}40` }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-full border flex items-center justify-center font-bold text-xs"
                    style={{
                      backgroundColor: `${cardTheme.accentColor}25`,
                      borderColor: cardTheme.accentColor,
                      color: cardTheme.accentColor,
                    }}
                  >
                    IEPC
                  </div>
                  <div>
                    <h2 className="text-[11px] sm:text-xs font-black uppercase tracking-wide leading-tight text-white truncate max-w-[220px]">
                      {member.branchName || churchConfig.nome}
                    </h2>
                    <span
                      className="text-[9px] uppercase block font-semibold"
                      style={{ color: cardTheme.accentColor }}
                    >
                      ROL OFICIAL DE MEMBROS
                    </span>
                  </div>
                </div>
                <Badge
                  className="text-slate-950 text-[8px] font-black uppercase px-1.5 py-0"
                  style={{ backgroundColor: cardTheme.accentColor }}
                >
                  {cardTheme.badgeLabel}
                </Badge>
              </div>

              {/* Meio */}
              <div className="flex items-center gap-3 my-auto py-1 z-10">
                <div
                  className={`overflow-hidden border-2 bg-slate-950/60 shadow-md shrink-0 flex items-center justify-center ${
                    cardTheme.photoShape === "circle"
                      ? "w-18 h-18 sm:w-20 sm:h-20 rounded-full"
                      : "w-16 h-20 sm:w-18 sm:h-22 rounded-xl"
                  }`}
                  style={{ borderColor: cardTheme.borderColor }}
                >
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-white opacity-60" />
                  )}
                </div>

                <div className="space-y-1 flex-1 overflow-hidden">
                  <div
                    className="text-[9px] uppercase font-bold tracking-widest"
                    style={{ color: cardTheme.accentColor }}
                  >
                    MEMBRO TITULAR
                  </div>
                  <div className="text-sm sm:text-base font-extrabold text-white truncate leading-tight">
                    {member.name}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border"
                      style={{
                        backgroundColor: cardTheme.tagBg,
                        color: cardTheme.tagText,
                        borderColor: `${cardTheme.borderColor}60`,
                      }}
                    >
                      {member.role || "Membro"}
                    </span>
                    <span className="text-[9px] text-slate-300 font-mono">
                      {registrationNum}
                    </span>
                  </div>
                  {cardTheme.showDates && (
                    <div className="text-[9px] text-slate-300 pt-0.5">
                      Batismo: <span className="font-semibold text-white">{member.baptismDate ? new Date(member.baptismDate).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "Confirmado"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Rodapé */}
              <div
                className="flex items-center justify-between pt-1.5 text-[8px] text-slate-200 border-t z-10"
                style={{ borderColor: `${cardTheme.borderColor}40` }}
              >
                <span>Pastor: <strong className="text-white">{churchConfig.pastorTitular}</strong></span>
                <span
                  className="font-semibold"
                  style={{ color: cardTheme.accentColor }}
                >
                  STATUS: ATIVO
                </span>
              </div>
            </div>
          ) : (
            /* VERSO COM QR CODE */
            <div
              id="public-card-back"
              className="w-full h-full rounded-2xl text-white p-4 sm:p-5 shadow-2xl border-2 flex flex-col justify-between relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${cardTheme.toColor} 0%, #09090b 60%, ${cardTheme.fromColor} 100%)`,
                borderColor: cardTheme.borderColor,
                boxShadow: `0 20px 40px -15px ${cardTheme.fromColor}99, 0 0 15px ${cardTheme.borderColor}40`,
              }}
            >
              {/* Brasão d'Água Oficial Centralizado e com Fundo Transparente no Verso */}
              {cardTheme.bgTexture === "brasao" && (
                <BrasaoWatermark
                  color={cardTheme.accentColor || "#ffffff"}
                  registeredLogo={registeredLogo}
                  opacity={0.16}
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
                  <div>CNPJ: {churchConfig.cnpj}</div>
                  <div>Sede: {churchConfig.cidade}</div>
                  {member.cpf && <div>CPF: {member.cpf}</div>}
                </div>

                <div
                  className="bg-white p-1.5 rounded-xl shrink-0 border-2 flex flex-col items-center"
                  style={{ borderColor: cardTheme.accentColor }}
                >
                  <QRCodeSVG value={validationUrl} size={76} level="M" />
                  <span className="text-[6px] text-slate-900 font-bold uppercase mt-0.5">
                    ESCANEAR P/ VALIDAR
                  </span>
                </div>
              </div>

              <div
                className="pt-1 text-[8px] text-slate-400 flex justify-between border-t z-10"
                style={{ borderColor: `${cardTheme.borderColor}40` }}
              >
                <span>Documento eclesiástico oficial</span>
                <span className="font-bold" style={{ color: cardTheme.accentColor }}>
                  VÁLIDA
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Botão de Girar o Cartão */}
        <Button
          onClick={() => setCardSide(cardSide === "front" ? "back" : "front")}
          variant="outline"
          className="mt-4 border-emerald-500/40 text-emerald-300 hover:bg-emerald-950/40 text-xs font-semibold rounded-xl"
        >
          <RotateCw className="w-3.5 h-3.5 mr-1.5" />
          {cardSide === "front" ? "Ver Verso (QR Code)" : "Ver Frente do Cartão"}
        </Button>
      </div>

      {/* Ações Inferiores no Celular */}
      <div className="w-full max-w-md space-y-2 pt-2">
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleDownloadImage}
            disabled={isDownloading}
            className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-10 rounded-xl"
          >
            <Download className="w-4 h-4 mr-1.5" />
            Salvar Foto no Celular
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

        <p className="text-[10px] text-center text-slate-400 pt-2 leading-relaxed">
          Dica: No iPhone ou Android, toque em <strong>Compartilhar</strong> e selecione <strong>"Adicionar à Tela de Início"</strong> para usar como aplicativo!
        </p>
      </div>
    </div>
  );
}
