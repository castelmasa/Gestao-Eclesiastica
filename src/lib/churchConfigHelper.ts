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
    const rawGlobal = localStorage.getItem("churchConfig");
    if (rawGlobal) savedConfig = JSON.parse(rawGlobal);
  } catch (e) {
    console.warn("Falha ao carregar churchConfig do localStorage:", e);
  }

  // Se houver filial específica selecionada, carregar sua respectiva configuração de parâmetros
  let branchSpecificConfig: any = {};
  if (activeBranchId && activeBranchId !== "all" && activeBranchId !== "sede") {
    try {
      const rawBranch = localStorage.getItem(`churchConfig_${activeBranchId}`);
      if (rawBranch) branchSpecificConfig = JSON.parse(rawBranch);
    } catch (e) {
      console.warn("Falha ao carregar branchConfig do localStorage:", e);
    }
  }

  // Merge das configurações: global < filial
  const mergedConfig = { ...savedConfig, ...branchSpecificConfig };

  let branchObj: any = null;
  if (activeBranchId && activeBranchId !== "all" && branchList.length > 0) {
    branchObj = branchList.find(b => b.id === activeBranchId);
  }

  const pastorName =
    branchObj?.pastor ||
    mergedConfig.pastorTitular ||
    mergedConfig.pastor ||
    DEFAULT_CHURCH_CONFIG.pastorTitular;

  const pastorSig =
    branchObj?.pastorSignatureUrl ||
    mergedConfig.pastorSignatureUrl ||
    savedConfig.pastorSignatureUrl ||
    "";

  const tesoureiroName =
    mergedConfig.tesoureiro1 ||
    mergedConfig.tesoureiro ||
    savedConfig.tesoureiro1 ||
    DEFAULT_CHURCH_CONFIG.tesoureiro1;

  const tesoureiroSig =
    mergedConfig.tesoureiro1SignatureUrl ||
    mergedConfig.tesoureiroSignatureUrl ||
    savedConfig.tesoureiro1SignatureUrl ||
    savedConfig.tesoureiroSignatureUrl ||
    "";

  const secretariaName =
    mergedConfig.secretario1 ||
    mergedConfig.secretaria ||
    mergedConfig.secretaryName ||
    savedConfig.secretario1 ||
    DEFAULT_CHURCH_CONFIG.secretario1;

  const secretariaSig =
    mergedConfig.secretario1SignatureUrl ||
    mergedConfig.secretarySignatureUrl ||
    savedConfig.secretario1SignatureUrl ||
    savedConfig.secretarySignatureUrl ||
    "";

  const churchName =
    branchObj?.name ||
    mergedConfig.nome ||
    DEFAULT_CHURCH_CONFIG.nome;

  const churchAddress =
    branchObj?.address ||
    mergedConfig.endereco ||
    DEFAULT_CHURCH_CONFIG.endereco;

  const churchCnpj =
    branchObj?.cnpj ||
    mergedConfig.cnpj ||
    DEFAULT_CHURCH_CONFIG.cnpj;

  return {
    pastor: {
      name: pastorName,
      role: "Pastor Presidente / Dirigente",
      signatureUrl: pastorSig,
      phone: branchObj?.phone || mergedConfig.pastorTelefone || savedConfig.pastorTelefone || "",
      email: mergedConfig.pastorEmail || savedConfig.pastorEmail || "",
    },
    tesoureiro: {
      name: tesoureiroName,
      role: "Tesoureiro(a) Responsável",
      signatureUrl: tesoureiroSig,
      phone: mergedConfig.tesoureiro1Telefone || savedConfig.tesoureiro1Telefone || "",
      email: mergedConfig.tesoureiro1Email || savedConfig.tesoureiro1Email || "",
    },
    secretaria: {
      name: secretariaName,
      role: "Secretário(a) Geral",
      signatureUrl: secretariaSig,
      phone: mergedConfig.secretario1Telefone || savedConfig.secretario1Telefone || "",
      email: mergedConfig.secretario1Email || savedConfig.secretario1Email || "",
    },
    church: {
      name: churchName,
      cnpj: churchCnpj,
      address: churchAddress,
      bairro: branchObj?.bairro || mergedConfig.bairro || DEFAULT_CHURCH_CONFIG.bairro,
      cidade: branchObj?.cidade || mergedConfig.cidade || DEFAULT_CHURCH_CONFIG.cidade,
      cep: mergedConfig.cep || savedConfig.cep || DEFAULT_CHURCH_CONFIG.cep,
      logoUrl: mergedConfig.logoDataUrl || savedConfig.logoDataUrl || "",
    }
  };
}
