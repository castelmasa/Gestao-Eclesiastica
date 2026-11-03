import { getRegisteredChurchLogo } from "./churchLogoHelper";

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
  conselhoFiscal: {
    cf1: { name: string; signatureUrl?: string; role: string };
    cf2: { name: string; signatureUrl?: string; role: string };
    cf3: { name: string; signatureUrl?: string; role: string };
  };
}

const DEFAULT_CHURCH_CONFIG = {
  nome: "Igreja Evangélica Pentecostal O Brasil para Cristo",
  cnpj: "51.105.484/0001-74",
  endereco: "Rua Bartolomeu Bueno, Nº 629",
  bairro: "Santa Casa",
  cidade: "Valparaíso - SP",
  cep: "16880-000",
  pastorTitular: "Pr. Samuel de Oliveira",
  pastorSignatureUrl: "",
  secretario1: "Secretaria Geral",
  secretario1SignatureUrl: "",
  tesoureiro1: "Carlos Roberto",
  tesoureiro1SignatureUrl: "",
  conselhoFiscal1: "1º Conselheiro(a) Fiscal",
  conselhoFiscal1SignatureUrl: "",
  conselhoFiscal2: "2º Conselheiro(a) Fiscal",
  conselhoFiscal2SignatureUrl: "",
  conselhoFiscal3: "3º Conselheiro(a) Fiscal",
  conselhoFiscal3SignatureUrl: "",
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

  // Merge seguro: valores não-vazios da filial têm prioridade; vazios herdam da Sede / Global
  const mergedConfig: any = { ...savedConfig };
  for (const [k, v] of Object.entries(branchSpecificConfig)) {
    if (v !== "" && v !== null && v !== undefined) {
      mergedConfig[k] = v;
    }
  }

  let branchObj: any = null;
  if (activeBranchId && activeBranchId !== "all" && branchList.length > 0) {
    branchObj = branchList.find(b => b.id === activeBranchId);
  }

  const pastorName =
    branchObj?.pastor ||
    mergedConfig.pastorTitular ||
    mergedConfig.pastor ||
    savedConfig.pastorTitular ||
    DEFAULT_CHURCH_CONFIG.pastorTitular;

  const pastorSig =
    branchSpecificConfig.pastorSignatureUrl ||
    branchSpecificConfig.pastorSignature ||
    savedConfig.pastorSignatureUrl ||
    savedConfig.pastorSignature ||
    mergedConfig.pastorSignatureUrl ||
    "";

  const tesoureiroName =
    mergedConfig.tesoureiro1 ||
    mergedConfig.tesoureiro ||
    savedConfig.tesoureiro1 ||
    DEFAULT_CHURCH_CONFIG.tesoureiro1;

  const tesoureiroSig =
    branchSpecificConfig.tesoureiro1SignatureUrl ||
    branchSpecificConfig.tesoureiroSignatureUrl ||
    savedConfig.tesoureiro1SignatureUrl ||
    savedConfig.tesoureiroSignatureUrl ||
    mergedConfig.tesoureiro1SignatureUrl ||
    "";

  const secretariaName =
    mergedConfig.secretario1 ||
    mergedConfig.secretaria ||
    mergedConfig.secretaryName ||
    savedConfig.secretario1 ||
    DEFAULT_CHURCH_CONFIG.secretario1;

  const secretariaSig =
    branchSpecificConfig.secretario1SignatureUrl ||
    branchSpecificConfig.secretarySignatureUrl ||
    savedConfig.secretario1SignatureUrl ||
    savedConfig.secretarySignatureUrl ||
    mergedConfig.secretario1SignatureUrl ||
    "";

  const churchName =
    branchObj?.name ||
    mergedConfig.nome ||
    savedConfig.nome ||
    DEFAULT_CHURCH_CONFIG.nome;

  const churchAddress =
    branchObj?.address ||
    mergedConfig.endereco ||
    savedConfig.endereco ||
    DEFAULT_CHURCH_CONFIG.endereco;

  const churchCnpj =
    branchObj?.cnpj ||
    mergedConfig.cnpj ||
    savedConfig.cnpj ||
    DEFAULT_CHURCH_CONFIG.cnpj;

  const churchLogoUrl =
    branchSpecificConfig.logoDataUrl ||
    savedConfig.logoDataUrl ||
    mergedConfig.logoDataUrl ||
    getRegisteredChurchLogo(activeBranchId);

  const cf1Name =
    mergedConfig.conselhoFiscal1 ||
    savedConfig.conselhoFiscal1 ||
    DEFAULT_CHURCH_CONFIG.conselhoFiscal1;
  const cf1Sig =
    branchSpecificConfig.conselhoFiscal1SignatureUrl ||
    savedConfig.conselhoFiscal1SignatureUrl ||
    mergedConfig.conselhoFiscal1SignatureUrl ||
    "";

  const cf2Name =
    mergedConfig.conselhoFiscal2 ||
    savedConfig.conselhoFiscal2 ||
    DEFAULT_CHURCH_CONFIG.conselhoFiscal2;
  const cf2Sig =
    branchSpecificConfig.conselhoFiscal2SignatureUrl ||
    savedConfig.conselhoFiscal2SignatureUrl ||
    mergedConfig.conselhoFiscal2SignatureUrl ||
    "";

  const cf3Name =
    mergedConfig.conselhoFiscal3 ||
    savedConfig.conselhoFiscal3 ||
    DEFAULT_CHURCH_CONFIG.conselhoFiscal3;
  const cf3Sig =
    branchSpecificConfig.conselhoFiscal3SignatureUrl ||
    savedConfig.conselhoFiscal3SignatureUrl ||
    mergedConfig.conselhoFiscal3SignatureUrl ||
    "";

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
      logoUrl: churchLogoUrl,
    },
    conselhoFiscal: {
      cf1: {
        name: cf1Name,
        signatureUrl: cf1Sig,
        role: "1º Conselheiro(a) Fiscal"
      },
      cf2: {
        name: cf2Name,
        signatureUrl: cf2Sig,
        role: "2º Conselheiro(a) Fiscal"
      },
      cf3: {
        name: cf3Name,
        signatureUrl: cf3Sig,
        role: "3º Conselheiro(a) Fiscal"
      }
    }
  };
}
