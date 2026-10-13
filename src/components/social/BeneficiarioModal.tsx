import React, { useState, useEffect } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus, Save, HeartHandshake } from "lucide-react";
import { SocialBeneficiary } from "@/types/social";
import { toast } from "sonner";
import { cpf as cpfValidator } from "cpf-cnpj-validator";

interface BeneficiarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiary?: SocialBeneficiary | null;
  onSave: (data: Partial<SocialBeneficiary>) => Promise<void>;
  branches?: any[];
  activeBranch?: string;
}

const BENEFICIOS_OPCOES = [
  "Bolsa Família",
  "BPC / LOAS",
  "Auxílio Gás",
  "Tarifa Social de Energia",
  "Pensão Alimentícia",
  "Aposentadoria / Pensão",
  "Nenhum Benefício",
];

export function BeneficiarioModal({
  isOpen,
  onClose,
  beneficiary,
  onSave,
  branches = [],
  activeBranch,
}: BeneficiarioModalProps) {
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [rg, setRg] = useState("");
  const [dataNascimento, setDataNascimento] = useState("");
  const [telefone, setTelefone] = useState("");
  const [whatsapp, setWhatsapp] = useState(true);
  const [endereco, setEndereco] = useState("");
  const [numero, setNumero] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("Valparaiso - SP");
  const [cep, setCep] = useState("16880-000");
  const [pontoReferencia, setPontoReferencia] = useState("");
  const [branchId, setBranchId] = useState("sede");
  const [quantidadeMembrosFamilia, setQuantidadeMembrosFamilia] = useState<number>(1);
  const [quantidadeCriancas, setQuantidadeCriancas] = useState<number>(0);
  const [rendaFamiliar, setRendaFamiliar] = useState<string>("");
  const [tipoMoradia, setTipoMoradia] = useState<'propria' | 'alugada' | 'cedida' | 'ocupacao' | 'outro'>("alugada");
  const [beneficiosSociais, setBeneficiosSociais] = useState<string[]>([]);
  const [situacaoVulnerabilidade, setSituacaoVulnerabilidade] = useState("");
  const [status, setStatus] = useState<'ativo' | 'em_acompanhamento' | 'arquivado'>("ativo");
  const [observacoes, setObservacoes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (beneficiary) {
      setNome(beneficiary.nome || "");
      setCpf(beneficiary.cpf || "");
      setRg(beneficiary.rg || "");
      setDataNascimento(beneficiary.dataNascimento || "");
      setTelefone(beneficiary.telefone || "");
      setWhatsapp(beneficiary.whatsapp ?? true);
      setEndereco(beneficiary.endereco || "");
      setNumero(beneficiary.numero || "");
      setBairro(beneficiary.bairro || "");
      setCidade(beneficiary.cidade || "Valparaiso - SP");
      setCep(beneficiary.cep || "16880-000");
      setPontoReferencia(beneficiary.pontoReferencia || "");
      setBranchId(beneficiary.branchId || "sede");
      setQuantidadeMembrosFamilia(beneficiary.quantidadeMembrosFamilia || 1);
      setQuantidadeCriancas(beneficiary.quantidadeCriancas || 0);
      setRendaFamiliar(beneficiary.rendaFamiliar ? String(beneficiary.rendaFamiliar) : "");
      setTipoMoradia(beneficiary.tipoMoradia || "alugada");
      setBeneficiosSociais(beneficiary.beneficiosSociais || []);
      setSituacaoVulnerabilidade(beneficiary.situacaoVulnerabilidade || "");
      setStatus(beneficiary.status || "ativo");
      setObservacoes(beneficiary.observacoes || "");
    } else {
      setNome("");
      setCpf("");
      setRg("");
      setDataNascimento("");
      setTelefone("");
      setWhatsapp(true);
      setEndereco("");
      setNumero("");
      setBairro("");
      setCidade("Valparaiso - SP");
      setCep("16880-000");
      setPontoReferencia("");
      setBranchId(activeBranch !== "all" ? activeBranch || "sede" : (branches[0]?.id || "sede"));
      setQuantidadeMembrosFamilia(1);
      setQuantidadeCriancas(0);
      setRendaFamiliar("");
      setTipoMoradia("alugada");
      setBeneficiosSociais([]);
      setSituacaoVulnerabilidade("");
      setStatus("ativo");
      setObservacoes("");
    }
  }, [beneficiary, activeBranch, branches, isOpen]);

  const toggleBeneficio = (item: string) => {
    setBeneficiosSociais(prev => 
      prev.includes(item) ? prev.filter(b => b !== item) : [...prev, item]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) {
      toast.error("O nome da pessoa beneficiária é obrigatório.");
      return;
    }

    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf && cleanCpf.length === 11 && !cpfValidator.isValid(cleanCpf)) {
      toast.error("CPF informado é inválido. Verifique os dígitos.");
      return;
    }

    const selectedBranchObj = branches.find(b => b.id === branchId);

    const payload: Partial<SocialBeneficiary> = {
      nome: nome.trim(),
      cpf: cpf.trim(),
      rg: rg.trim(),
      dataNascimento,
      telefone: telefone.trim(),
      whatsapp,
      endereco: endereco.trim(),
      numero: numero.trim(),
      bairro: bairro.trim(),
      cidade: cidade.trim(),
      cep: cep.trim(),
      pontoReferencia: pontoReferencia.trim(),
      branchId,
      branchName: selectedBranchObj?.name || "Sede",
      quantidadeMembrosFamilia: Number(quantidadeMembrosFamilia) || 1,
      quantidadeCriancas: Number(quantidadeCriancas) || 0,
      rendaFamiliar: rendaFamiliar ? parseFloat(rendaFamiliar) : 0,
      tipoMoradia,
      beneficiosSociais,
      situacaoVulnerabilidade: situacaoVulnerabilidade.trim(),
      status,
      observacoes: observacoes.trim(),
    };

    setIsSaving(true);
    try {
      await onSave(payload);
      toast.success(beneficiary ? "Dados do beneficiário atualizados!" : "Beneficiário cadastrado com sucesso!");
      onClose();
    } catch (err) {
      console.error("Erro ao salvar beneficiário:", err);
      toast.error("Erro ao salvar dados do beneficiário.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-5 pb-3 bg-muted/30 border-b">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-rose-600" />
            <DialogTitle className="text-xl font-bold">
              {beneficiary ? "Editar Dados do Beneficiário" : "Novo Cadastro de Beneficiário Social"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs mt-1">
            Cadastre a família necessitada para controle de doações de cestas básicas e acompanhamento diaconal.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* Dados Pessoais */}
          <div className="space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1">
              1. Identificação do Responsável Familiar
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="nome" className="font-semibold text-xs">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo do responsável"
                  required
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status" className="font-semibold text-xs">Status do Cadastro</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger id="status" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo no Programa</SelectItem>
                    <SelectItem value="em_acompanhamento">Em Acompanhamento</SelectItem>
                    <SelectItem value="arquivado">Arquivado / Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cpf" className="font-semibold text-xs">CPF</Label>
                <Input
                  id="cpf"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="000.000.000-00"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rg" className="font-semibold text-xs">RG</Label>
                <Input
                  id="rg"
                  value={rg}
                  onChange={(e) => setRg(e.target.value)}
                  placeholder="Número do RG"
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dataNascimento" className="font-semibold text-xs">Data de Nascimento</Label>
                <Input
                  id="dataNascimento"
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telefone" className="font-semibold text-xs">Telefone / Celular *</Label>
                <Input
                  id="telefone"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  required
                  className="h-9"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="branchSelect" className="font-semibold text-xs">Congregação Responsável</Label>
                <Select value={branchId} onValueChange={setBranchId}>
                  <SelectTrigger id="branchSelect" className="h-9">
                    <SelectValue placeholder="Selecione a congregação..." />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1">
              2. Endereço e Localização
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="sm:col-span-3 space-y-1.5">
                <Label htmlFor="endereco" className="font-semibold text-xs">Logradouro (Rua, Av.) *</Label>
                <Input
                  id="endereco"
                  value={endereco}
                  onChange={(e) => setEndereco(e.target.value)}
                  placeholder="Ex: Rua das Flores"
                  required
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="numero" className="font-semibold text-xs">Número</Label>
                <Input
                  id="numero"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Ex: 120 / S/N"
                  className="h-9"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="bairro" className="font-semibold text-xs">Bairro *</Label>
                <Input
                  id="bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  placeholder="Bairro"
                  required
                  className="h-9"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="cidade" className="font-semibold text-xs">Cidade / UF</Label>
                <Input
                  id="cidade"
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  placeholder="Valparaiso - SP"
                  className="h-9"
                />
              </div>

              <div className="sm:col-span-4 space-y-1.5">
                <Label htmlFor="pontoReferencia" className="font-semibold text-xs">Ponto de Referência</Label>
                <Input
                  id="pontoReferencia"
                  value={pontoReferencia}
                  onChange={(e) => setPontoReferencia(e.target.value)}
                  placeholder="Ex: Próximo à padaria central / Casa amarela nos fundos"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Composição Familiar e Vulnerabilidade */}
          <div className="space-y-3 pt-2">
            <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-b pb-1">
              3. Composição Familiar e Perfil Socioeconômico
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="membros" className="font-semibold text-xs">Total de Pessoas na Casa</Label>
                <Input
                  id="membros"
                  type="number"
                  min="1"
                  value={quantidadeMembrosFamilia}
                  onChange={(e) => setQuantidadeMembrosFamilia(parseInt(e.target.value) || 1)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="criancas" className="font-semibold text-xs">Crianças / Menores</Label>
                <Input
                  id="criancas"
                  type="number"
                  min="0"
                  value={quantidadeCriancas}
                  onChange={(e) => setQuantidadeCriancas(parseInt(e.target.value) || 0)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="renda" className="font-semibold text-xs">Renda Familiar Estimada (R$)</Label>
                <Input
                  id="renda"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={rendaFamiliar}
                  onChange={(e) => setRendaFamiliar(e.target.value)}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="moradia" className="font-semibold text-xs">Condição de Moradia</Label>
                <Select value={tipoMoradia} onValueChange={(v) => setTipoMoradia(v as any)}>
                  <SelectTrigger id="moradia" className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alugada">Alugada</SelectItem>
                    <SelectItem value="propria">Própria</SelectItem>
                    <SelectItem value="cedida">Cedida / Favor</SelectItem>
                    <SelectItem value="ocupacao">Ocupação / Assentamento</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="vulnerabilidade" className="font-semibold text-xs">Situação / Vulnerabilidade Principal</Label>
                <Input
                  id="vulnerabilidade"
                  value={situacaoVulnerabilidade}
                  onChange={(e) => setSituacaoVulnerabilidade(e.target.value)}
                  placeholder="Ex: Desemprego, Tratamento médico, Idoso dependente"
                  className="h-9"
                />
              </div>
            </div>

            {/* Programas Sociais */}
            <div className="space-y-2 pt-1">
              <Label className="font-semibold text-xs">Benefícios Sociais Recebidos:</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/20 p-2.5 rounded-lg border">
                {BENEFICIOS_OPCOES.map((b) => (
                  <div key={b} className="flex items-center space-x-1.5">
                    <Checkbox
                      id={`b-${b}`}
                      checked={beneficiosSociais.includes(b)}
                      onCheckedChange={() => toggleBeneficio(b)}
                    />
                    <Label htmlFor={`b-${b}`} className="text-[11px] cursor-pointer leading-none">
                      {b}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label htmlFor="obs" className="font-semibold text-xs">Observações da Diaconia / Assistência Social</Label>
              <Textarea
                id="obs"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Anotações internas sobre visitas, necessidades e acompanhamento pastoral..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="p-4 bg-muted/20 border-t flex flex-row items-center justify-between -mx-5 -mb-5">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs sm:text-sm"
              size="sm"
            >
              <Save className="mr-1.5 h-4 w-4" />
              {isSaving ? "Salvando..." : beneficiary ? "Salvar Alterações" : "Cadastrar Beneficiário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
