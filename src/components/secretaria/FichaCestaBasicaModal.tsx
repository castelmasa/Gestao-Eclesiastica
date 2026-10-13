import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HeartHandshake, Printer, FileText, Check, User, Sparkles } from "lucide-react";
import { getChurchLeadershipConfig } from "@/lib/churchConfigHelper";
import { useBranch } from "@/contexts/BranchContext";

interface FichaCestaBasicaModalProps {
  isOpen: boolean;
  onClose: () => void;
  members?: any[];
  initialData?: any;
}

export function FichaCestaBasicaModal({
  isOpen,
  onClose,
  members = [],
  initialData = null,
}: FichaCestaBasicaModalProps) {
  const { activeBranch, branches, activeBranchName } = useBranch();
  const [emBranco, setEmBranco] = useState(true);
  const [selectedMemberId, setSelectedMemberId] = useState("");

  // Dados do formulário
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("Valparaiso - SP");
  const [pontoReferencia, setPontoReferencia] = useState("");
  const [membrosCasa, setMembrosCasa] = useState("1");
  const [criancasCasa, setCriancasCasa] = useState("0");
  const [rendaFamiliar, setRendaFamiliar] = useState("");
  const [tipoMoradia, setTipoMoradia] = useState("Alugada");
  const [tipoCesta, setTipoCesta] = useState("Cesta Básica Completa de Alimentos");
  const [quantidade, setQuantidade] = useState("1");
  const [dataAtendimento, setDataAtendimento] = useState(() => new Date().toISOString().split("T")[0]);
  const [responsavelAtendimento, setResponsavelAtendimento] = useState("");
  const [motivoPedido, setMotivoPedido] = useState("");
  const [printCopies, setPrintCopies] = useState(1);

  const leadership = useMemo(() => {
    return getChurchLeadershipConfig(activeBranch, branches);
  }, [activeBranch, branches]);

  // Se selecionar um membro
  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    if (!memberId || memberId === "none") {
      setNome("");
      setCpf("");
      setRg("");
      setTelefone("");
      setEndereco("");
      setBairro("");
      return;
    }
    const mem = members.find(m => String(m.id) === String(memberId));
    if (mem) {
      setEmBranco(false);
      setNome(mem.name || "");
      setCpf(mem.cpf || "");
      setRg(mem.rg || "");
      setDataNascimento(mem.dataNascimento || mem.birthDate || "");
      setTelefone(mem.phone || mem.telefone || "");
      setEndereco(mem.address || mem.endereco || "");
      setBairro(mem.bairro || "");
      setCidade(mem.cidade || "Valparaiso - SP");
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById("printable-cesta-basica");
    if (!printContent) return;

    const win = window.open("", "_blank");
    if (!win) {
      window.print();
      return;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ficha de Atendimento - Cesta Básica</title>
          <style>
            @page { size: A4 portrait; margin: 8mm; }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #fff; color: #000; font-size: 10px; }
            .sheet { width: 100%; box-sizing: border-box; }
            .box { border: 1.5px solid #000; margin-bottom: 5px; }
            .header-table { width: 100%; border-collapse: collapse; }
            .header-table td { padding: 4px; vertical-align: middle; }
            .title-box { background: #e2e8f0; font-weight: bold; text-align: center; padding: 4px; font-size: 11px; text-transform: uppercase; border-top: 1px solid #000; border-bottom: 1px solid #000; }
            .sec-header { background: #f1f5f9; font-weight: bold; font-size: 9px; text-transform: uppercase; padding: 3px 6px; border-bottom: 1px solid #000; }
            .field-row { display: flex; border-bottom: 1px solid #ccc; }
            .field-row:last-child { border-bottom: none; }
            .field { padding: 4px 6px; box-sizing: border-box; }
            .field-lbl { font-size: 7.5px; text-transform: uppercase; color: #475569; font-weight: bold; display: block; }
            .field-val { font-size: 10px; font-weight: 600; min-height: 13px; margin-top: 1px; }
            .line-dots { border-bottom: 1px dotted #999; min-height: 14px; width: 100%; }
            .sig-table { width: 100%; margin-top: 18px; border-collapse: collapse; text-align: center; }
            .sig-table td { width: 33.33%; padding: 4px 8px; vertical-align: top; }
            .sig-line { border-top: 1px solid #000; margin: 0 auto 3px auto; width: 90%; }
            .protocolo { border-top: 1px dashed #666; margin-top: 12px; padding-top: 6px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 800);
            };
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[760px] max-h-[92vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 bg-muted/30 border-b">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-rose-600" />
            <DialogTitle className="text-xl font-bold">Ficha de Atendimento de Cesta Básica</DialogTitle>
          </div>
          <DialogDescription className="text-xs mt-1">
            Emita o modelo oficial em A4 com assinaturas oficiais da Secretaria e Pastor Presidente puxados das Configurações.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Opções de Emissão */}
          <div className="bg-card p-3 rounded-xl border space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="emBrancoCheck"
                  checked={emBranco}
                  onCheckedChange={(c) => {
                    const checked = Boolean(c);
                    setEmBranco(checked);
                    if (checked) {
                      setNome("");
                      setCpf("");
                      setRg("");
                      setTelefone("");
                      setEndereco("");
                      setBairro("");
                      setSelectedMemberId("");
                    }
                  }}
                />
                <Label htmlFor="emBrancoCheck" className="text-xs font-semibold cursor-pointer">
                  Imprimir Modelo Padrão em Branco (para preenchimento manual no balcão/visita)
                </Label>
              </div>

              {!emBranco && members.length > 0 && (
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Label className="text-xs whitespace-nowrap text-muted-foreground">Puxar Membro:</Label>
                  <Select value={selectedMemberId} onValueChange={handleSelectMember}>
                    <SelectTrigger className="h-8 text-xs w-[200px]">
                      <SelectValue placeholder="Selecione membro..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="none">-- Preenchimento Manual --</SelectItem>
                      {members.map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name} ({m.phone || "Sem tel"})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Campos de Pré-Preenchimento Opcionais */}
            {!emBranco && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold">Nome da Pessoa / Responsável</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">CPF</Label>
                  <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-semibold">Telefone</Label>
                  <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(00) 00000-0000" className="h-8 text-xs" />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-[11px] font-semibold">Endereço Completo e Bairro</Label>
                  <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} placeholder="Rua, Número, Bairro" className="h-8 text-xs" />
                </div>
              </div>
            )}
          </div>

          {/* Visualização da Ficha A4 */}
          <div className="border rounded-xl bg-slate-100 dark:bg-slate-900 p-4 overflow-x-auto flex justify-center">
            <div
              id="printable-cesta-basica"
              className="w-[190mm] bg-white text-black p-[6mm] text-[9.5px] font-sans border shadow-md box-border"
            >
              <div className="box">
                {/* Cabeçalho */}
                <table className="header-table" style={{ borderBottom: "1.5px solid #000" }}>
                  <tbody>
                    <tr>
                      <td style={{ width: "20mm", textAlign: "center", borderRight: "1px solid #000" }}>
                        {leadership.church.logoUrl ? (
                          <img src={leadership.church.logoUrl} alt="Logo" style={{ maxHeight: "18mm", maxWidth: "18mm", objectFit: "contain" }} />
                        ) : (
                          <div style={{ fontWeight: "bold", fontSize: "8px", lineHeight: "1.1" }}>LOGO<br />OFICIAL</div>
                        )}
                      </td>
                      <td style={{ textAlign: "center", padding: "4px 8px" }}>
                        <div style={{ fontWeight: "bold", fontSize: "12px", textTransform: "uppercase" }}>
                          {leadership.church.name}
                        </div>
                        <div style={{ fontSize: "8px", textTransform: "uppercase", marginTop: "2px", fontWeight: "600", color: "#333" }}>
                          {leadership.church.address} - {leadership.church.bairro} ({leadership.church.cidade}) | CNPJ: {leadership.church.cnpj}
                        </div>
                        <div style={{ fontSize: "8.5px", fontWeight: "bold", color: "#b91c1c", marginTop: "2px" }}>
                          DEPARTAMENTO DE ASSISTÊNCIA E AÇÃO SOCIAL
                        </div>
                      </td>
                      <td style={{ width: "32mm", borderLeft: "1px solid #000", textAlign: "center", background: "#f8fafc" }}>
                        <div style={{ fontSize: "8px", fontWeight: "bold", color: "#64748b" }}>PROTOCOLO</div>
                        <div style={{ fontSize: "14px", fontWeight: "900", color: "#b91c1c", marginTop: "2px" }}>
                          CESTA Nº
                        </div>
                        <div style={{ fontSize: "12px", fontWeight: "bold", letterSpacing: "1px" }}>
                          {Math.floor(1000 + Math.random() * 9000)}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                <div className="title-box">
                  FICHA DE ATENDIMENTO E CONCESSÃO DE BENEFÍCIO SOCIAL - CESTA BÁSICA
                </div>

                {/* Bloco 1: Dados do Beneficiário */}
                <div className="sec-header">1. Identificação do(a) Beneficiário(a) / Família</div>
                <div style={{ padding: "4px" }}>
                  <div className="field-row">
                    <div className="field" style={{ flex: 3 }}>
                      <span className="field-lbl">Nome Completo do(a) Responsável:</span>
                      <div className="field-val">{emBranco ? <div className="line-dots" /> : (nome || "________________________________________________________")}</div>
                    </div>
                    <div className="field" style={{ flex: 1.2, borderLeft: "1px solid #ccc" }}>
                      <span className="field-lbl">CPF:</span>
                      <div className="field-val">{emBranco ? <div className="line-dots" /> : (cpf || "___.___.___-__")}</div>
                    </div>
                    <div className="field" style={{ flex: 1, borderLeft: "1px solid #ccc" }}>
                      <span className="field-lbl">RG:</span>
                      <div className="field-val">{emBranco ? <div className="line-dots" /> : (rg || "__________")}</div>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field" style={{ flex: 1 }}>
                      <span className="field-lbl">Data de Nascimento:</span>
                      <div className="field-val">{emBranco ? <div className="line-dots" /> : (dataNascimento ? new Date(dataNascimento).toLocaleDateString("pt-BR", { timeZone: "UTC" }) : "__/__/____")}</div>
                    </div>
                    <div className="field" style={{ flex: 1.2, borderLeft: "1px solid #ccc" }}>
                      <span className="field-lbl">Telefone / WhatsApp:</span>
                      <div className="field-val">{emBranco ? <div className="line-dots" /> : (telefone || "(__) _____-____")}</div>
                    </div>
                    <div className="field" style={{ flex: 1.5, borderLeft: "1px solid #ccc" }}>
                      <span className="field-lbl">Congregação Atendente:</span>
                      <div className="field-val">{activeBranchName || "Sede"}</div>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field" style={{ flex: 3 }}>
                      <span className="field-lbl">Endereço Residencial (Rua, Número, Complemento):</span>
                      <div className="field-val">{emBranco ? <div className="line-dots" /> : (endereco || "________________________________________________________")}</div>
                    </div>
                    <div className="field" style={{ flex: 1.5, borderLeft: "1px solid #ccc" }}>
                      <span className="field-lbl">Bairro / Localidade:</span>
                      <div className="field-val">{emBranco ? <div className="line-dots" /> : (bairro || "____________________")}</div>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field" style={{ flex: 1 }}>
                      <span className="field-lbl">Ponto de Referência da Moradia:</span>
                      <div className="field-val">{emBranco ? <div className="line-dots" /> : (pontoReferencia || "________________________________________________________")}</div>
                    </div>
                  </div>
                </div>

                {/* Bloco 2: Perfil Socioeconômico */}
                <div className="sec-header">2. Composição Familiar e Situação Socioeconômica</div>
                <div style={{ padding: "4px" }}>
                  <div className="field-row">
                    <div className="field" style={{ flex: 1 }}>
                      <span className="field-lbl">Pessoas na Casa:</span>
                      <div className="field-val">{emBranco ? "[   ] pessoa(s)" : `${membrosCasa} pessoa(s)`}</div>
                    </div>
                    <div className="field" style={{ flex: 1, borderLeft: "1px solid #ccc" }}>
                      <span className="field-lbl">Crianças / Menores:</span>
                      <div className="field-val">{emBranco ? "[   ] criança(s)" : `${criancasCasa} criança(s)`}</div>
                    </div>
                    <div className="field" style={{ flex: 1.2, borderLeft: "1px solid #ccc" }}>
                      <span className="field-lbl">Condição da Moradia:</span>
                      <div className="field-val">{emBranco ? "( ) Própria ( ) Alugada ( ) Cedida" : tipoMoradia}</div>
                    </div>
                    <div className="field" style={{ flex: 1.2, borderLeft: "1px solid #ccc" }}>
                      <span className="field-lbl">Renda Familiar Est.:</span>
                      <div className="field-val">{emBranco ? "R$ ____________" : (rendaFamiliar ? `R$ ${rendaFamiliar}` : "Sem renda fixa")}</div>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field" style={{ flex: 1 }}>
                      <span className="field-lbl">Benefícios do Governo Recebidos:</span>
                      <div className="field-val">
                        ( &nbsp; ) Bolsa Família &nbsp;&nbsp;&nbsp;&nbsp; ( &nbsp; ) BPC / LOAS &nbsp;&nbsp;&nbsp;&nbsp; ( &nbsp; ) Auxílio Gás &nbsp;&nbsp;&nbsp;&nbsp; ( &nbsp; ) Nenhum
                      </div>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field" style={{ flex: 1 }}>
                      <span className="field-lbl">Motivo do Pedido / Parecer Social da Diaconia:</span>
                      <div className="field-val" style={{ minHeight: "22px" }}>
                        {emBranco ? (
                          <div style={{ borderBottom: "1px dotted #999", height: "18px" }} />
                        ) : (
                          motivoPedido || "Atendimento emergencial de provisão alimentar para sustento familiar."
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bloco 3: Concessão do Benefício */}
                <div className="sec-header">3. Concessão e Discriminação do Benefício Entregue</div>
                <div style={{ padding: "4px" }}>
                  <div className="field-row">
                    <div className="field" style={{ flex: 2 }}>
                      <span className="field-lbl">Tipo de Benefício:</span>
                      <div className="field-val">
                        ( &nbsp; ) Cesta Básica Completa &nbsp;&nbsp;&nbsp; ( &nbsp; ) Cesta Básica Emergencial &nbsp;&nbsp;&nbsp; ( &nbsp; ) Kit Higiene
                      </div>
                    </div>
                    <div className="field" style={{ flex: 0.8, borderLeft: "1px solid #ccc" }}>
                      <span className="field-lbl">Quantidade:</span>
                      <div className="field-val">[ &nbsp;{quantidade}&nbsp; ] unidade(s)</div>
                    </div>
                    <div className="field" style={{ flex: 1, borderLeft: "1px solid #ccc" }}>
                      <span className="field-lbl">Data da Entrega:</span>
                      <div className="field-val">{new Date(dataAtendimento).toLocaleDateString("pt-BR", { timeZone: "UTC" })}</div>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field" style={{ flex: 1 }}>
                      <span className="field-lbl">Responsável pela Entrega / Diaconia:</span>
                      <div className="field-val">{emBranco ? <div className="line-dots" /> : (responsavelAtendimento || "Equipe da Ação Social / Diaconia")}</div>
                    </div>
                    <div className="field" style={{ flex: 1, borderLeft: "1px solid #ccc" }}>
                      <span className="field-lbl">Previsão Próxima Liberação (Carência):</span>
                      <div className="field-val">Mínimo de 30 dias após esta concessão</div>
                    </div>
                  </div>
                </div>

                {/* Bloco 4: Termo de Declaração */}
                <div style={{ padding: "6px 8px", background: "#f8fafc", borderTop: "1px solid #000", fontSize: "8px", textAlign: "justify", lineHeight: "1.2" }}>
                  <strong>DECLARAÇÃO DO(A) BENEFICIÁRIO(A):</strong> Declaro que as informações acima são verdadeiras e que recebi gratuitamente da <strong>{leadership.church.name}</strong> a doação do benefício alimentício descrito para o sustento de minha família.
                </div>

                {/* Bloco 5: Assinaturas Oficiais (Pegas de Configurações!) */}
                <table className="sig-table" style={{ marginTop: "24px", marginBottom: "8px" }}>
                  <tbody>
                    <tr>
                      <td>
                        <div className="sig-line" />
                        <div style={{ fontWeight: "bold", fontSize: "8.5px" }}>{nome || "Assinatura do(a) Beneficiário(a)"}</div>
                        <div style={{ fontSize: "7px", color: "#64748b" }}>Recebedor(a) Responsável</div>
                      </td>
                      <td>
                        <div className="sig-line" />
                        <div style={{ fontWeight: "bold", fontSize: "8.5px" }}>{leadership.secretaria.name}</div>
                        <div style={{ fontSize: "7px", color: "#64748b" }}>Secretaria / Ação Social</div>
                      </td>
                      <td>
                        <div className="sig-line" />
                        <div style={{ fontWeight: "bold", fontSize: "8.5px" }}>{leadership.pastor.name}</div>
                        <div style={{ fontSize: "7px", color: "#64748b" }}>Pastor Presidente / Dirigente</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Protocolo picotado para secretaria */}
              <div className="protocolo" style={{ borderTop: "1.5px dashed #475569", marginTop: "10px", paddingTop: "6px" }}>
                <table style={{ width: "100%", fontSize: "8px" }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: "bold", textTransform: "uppercase" }}>
                        CANHOTO DE ARQUIVAMENTO - SECRETARIA DA IGREJA
                      </td>
                      <td style={{ textAlign: "right", fontWeight: "bold", color: "#b91c1c" }}>
                        DATA: {new Date(dataAtendimento).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={2} style={{ paddingTop: "3px" }}>
                        Beneficiário: <strong>{nome || "______________________________________"}</strong> &nbsp;|&nbsp; 
                        CPF: <strong>{cpf || "___.___.___-__"}</strong> &nbsp;|&nbsp; 
                        Auxílio: <strong>1 Cesta Básica</strong> &nbsp;|&nbsp; 
                        Visto Secretaria: <strong>{leadership.secretaria.name}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-muted/20 border-t flex flex-row items-center justify-between">
          <Button variant="outline" onClick={onClose} size="sm">
            Fechar
          </Button>
          <Button onClick={handlePrint} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold" size="sm">
            <Printer className="mr-1.5 h-4 w-4" /> Imprimir Ficha Padrão (A4)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
