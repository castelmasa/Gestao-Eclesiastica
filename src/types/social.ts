export interface SocialBeneficiary {
  id: string;
  nome: string;
  cpf: string;
  rg?: string;
  dataNascimento?: string;
  telefone: string;
  whatsapp?: boolean;
  endereco: string;
  numero?: string;
  bairro: string;
  cidade: string;
  cep?: string;
  pontoReferencia?: string;
  branchId: string;
  branchName?: string;
  estadoCivil?: string;
  quantidadeMembrosFamilia: number;
  quantidadeCriancas: number;
  rendaFamiliar?: number;
  tipoMoradia?: 'propria' | 'alugada' | 'cedida' | 'ocupacao' | 'outro';
  beneficiosSociais?: string[];
  situacaoVulnerabilidade?: string;
  status: 'ativo' | 'em_acompanhamento' | 'arquivado';
  dataCadastro: string;
  dataUltimoAtendimento?: string;
  totalCestasRecebidas: number;
  observacoes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type TipoAuxilioSocial = 
  | 'cesta_basica_padrao'
  | 'cesta_emergencial'
  | 'higiene_limpeza'
  | 'vestuario'
  | 'leite_infantil'
  | 'medicamento'
  | 'auxilio_financeiro'
  | 'outro';

export interface SocialAttendance {
  id: string;
  beneficiaryId: string;
  beneficiaryName: string;
  beneficiaryCpf: string;
  beneficiaryTelefone?: string;
  beneficiaryEndereco?: string;
  branchId: string;
  branchName?: string;
  tipoAuxilio: TipoAuxilioSocial;
  descricaoItens: string;
  quantidade: number;
  dataEntrega: string;
  responsavelEntrega: string;
  motivoAtendimento?: string;
  observacoes?: string;
  reciboAssinado?: boolean;
  createdAt?: any;
}

export interface SocialInventoryMovement {
  id: string;
  tipo: 'entrada' | 'saida';
  origemDestino: string;
  item: string;
  quantidade: number;
  data: string;
  branchId: string;
  branchName?: string;
  responsavel: string;
  observacoes?: string;
  createdAt?: any;
}

export const TIPO_AUXILIO_LABELS: Record<TipoAuxilioSocial, string> = {
  cesta_basica_padrao: "Cesta Básica Padrão",
  cesta_emergencial: "Cesta Básica Emergencial",
  higiene_limpeza: "Kit de Higiene & Limpeza",
  vestuario: "Vestuário / Agasalhos",
  leite_infantil: "Leite & Alimentos Infantis",
  medicamento: "Medicamento / Saúde",
  auxilio_financeiro: "Auxílio Emergencial em Dinheiro",
  outro: "Outro Benefício Social",
};
