/**
 * Helper centralizado para obter dados institucionais, liderança e assinaturas oficiais
 * (Pastor Presidente/Titular, Tesoureiro, Secretária) a partir do módulo de Configurações/Parâmetros.
 */

export interface LeadershipSignatures {
  pastor: {
    name: string;
    role: string;
    signatureUrl?: string;
    phone?: string;
    email?: string;
  };
  tesoureiro: {
    name: string;
    role: string;
    signatureUrl?: string;
    phone?: string;
    email?: string;
  };
  secretaria: {
    name: string;
    role: string;
    signatureUrl?: string;
    phone?: string;
    email?: string;
  };
  church: {
    name: string;
    cnpj: string;
    address: string;
    bairro: string;
    cidade: string;
    cep: string;
    logoUrl?: string;
  };
}

const DEFAULT_CHURCH_CONFIG = {
  nome: "Igreja Evangélica Pentecostal O Brasil para Cristo",
  cnpj: "51.105.484/0001-74",
  endereco: "Rua Bartolomeu Bueno, Nº 629",
  bairro: "Santa Casa",
  cidade: "Valparaiso - SP",
  cep: "16880-000",
  pastorTitular: "Pr. Samuel de Oliveira",
  pastorSignatureUrl: "",
  secretario1: "Secretaria Geral",
  secretario1SignatureUrl: "",
  tesoureiro1: "Carlos Roberto",
  tesoureiro1SignatureUrl: "",
};

export function getChurchLeadershipConfig(activeBranchId?: string, branchList: any[] = []): LeadershipSignatures {
  let savedConfig: any = {};
  try {
    const raw = localStorage.getItem("churchConfig");
    if (raw) savedConfig = JSON.parse(raw);
  } catch (e) {
    console.warn("Falha ao carregar churchConfig do localStorage:", e);
  }

  // Se houver filial específica selecionada
  let branchObj: any = null;
  if (activeBranchId && activeBranchId !== "all" && branchList.length > 0) {
    branchObj = branchList.find(b => b.id === activeBranchId);
  }

  const pastorName = branchObj?.pastor || savedConfig.pastorTitular || DEFAULT_CHURCH_CONFIG.pastorTitular;
  const pastorSig = branchObj?.pastorSignatureUrl || savedConfig.pastorSignatureUrl || "";
  
  const tesoureiroName = savedConfig.tesoureiro1 || DEFAULT_CHURCH_CONFIG.tesoureiro1;
  const tesoureiroSig = savedConfig.tesoureiro1SignatureUrl || "";

  const secretariaName = savedConfig.secretario1 || DEFAULT_CHURCH_CONFIG.secretario1;
  const secretariaSig = savedConfig.secretario1SignatureUrl || "";

  const churchName = branchObj?.name || savedConfig.nome || DEFAULT_CHURCH_CONFIG.nome;
  const churchAddress = branchObj?.address || savedConfig.endereco || DEFAULT_CHURCH_CONFIG.endereco;
  const churchCnpj = branchObj?.cnpj || savedConfig.cnpj || DEFAULT_CHURCH_CONFIG.cnpj;

  return {
    pastor: {
      name: pastorName,
      role: "Pastor Presidente / Dirigente",
      signatureUrl: pastorSig,
      phone: branchObj?.phone || savedConfig.pastorTelefone || "",
      email: savedConfig.pastorEmail || "",
    },
    tesoureiro: {
      name: tesoureiroName,
      role: "Tesoureiro(a) Responsável",
      signatureUrl: tesoureiroSig,
      phone: savedConfig.tesoureiro1Telefone || "",
      email: savedConfig.tesoureiro1Email || "",
    },
    secretaria: {
      name: secretariaName,
      role: "Secretário(a) Geral",
      signatureUrl: secretariaSig,
      phone: savedConfig.secretario1Telefone || "",
      email: savedConfig.secretario1Email || "",
    },
    church: {
      name: churchName,
      cnpj: churchCnpj,
      address: churchAddress,
      bairro: branchObj?.bairro || savedConfig.bairro || DEFAULT_CHURCH_CONFIG.bairro,
      cidade: branchObj?.cidade || savedConfig.cidade || DEFAULT_CHURCH_CONFIG.cidade,
      cep: savedConfig.cep || DEFAULT_CHURCH_CONFIG.cep,
      logoUrl: savedConfig.logoDataUrl || "",
    }
  };
}
