import { Branch } from '@/contexts/BranchContext';

/**
 * Normaliza strings para comparação flexível (remove acentos, espaços extras, minúsculas)
 */
export function normalizeBranchString(str?: string | null): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Identifica se um determinado identificador ou nome refere-se à Sede / Matriz
 */
export function isSedeBranch(branchIdOrName?: string | null, branches: Branch[] = []): boolean {
  if (!branchIdOrName) return true;
  const norm = normalizeBranchString(branchIdOrName);
  if (
    norm === "sede" || 
    norm === "matriz" || 
    norm === "principal" || 
    norm === "default_branch" ||
    norm.includes("brasil para cristo")
  ) {
    return true;
  }
  
  const found = branches.find(b => 
    b.id === branchIdOrName || 
    normalizeBranchString(b.id) === norm || 
    normalizeBranchString(b.name) === norm
  );
  if (found && found.type === "sede") return true;
  
  return false;
}

/**
 * Retorna o nome amigável de exibição da congregação
 */
export function getBranchDisplayName(branchId?: string | null, branches: Branch[] = []): string {
  if (!branchId || branchId === "all") return "Todas as Filiais";
  
  const found = branches.find(b => 
    b.id === branchId || 
    normalizeBranchString(b.id) === normalizeBranchString(branchId) ||
    normalizeBranchString(b.name) === normalizeBranchString(branchId)
  );

  if (found) {
    return found.name + (found.type === 'sede' ? ' (Sede)' : '');
  }

  if (isSedeBranch(branchId, branches)) {
    return "Sede Principal";
  }

  return branchId;
}

/**
 * Verifica se um registro (transação, membro, evento, patrimônio, arquivo) pertence à congregação ativa.
 *
 * Regras:
 * 1. Se activeBranch for "all", retorna true (visão consolidada de todas as unidades).
 * 2. Se a congregação ativa for a Sede:
 *    - Registros com branchId 'sede', 'matriz', 'default_branch', ou sem branchId definido (legados) pertencem à Sede.
 *    - Registros com congregação/localização mencionando a sede pertencem à Sede.
 * 3. Se a congregação ativa for uma filial específica (ex: '2ª Congregação'):
 *    - Registros pertencem a esta filial APENAS se o branchId ou nome da congregação/local coincidir com o ID ou nome da filial.
 *    - Registros sem branchId NÃO entram em filiais (evita que dados da matriz poluam as congregações filhas).
 */
export function matchesBranch(
  item: {
    branchId?: string | null;
    congregation?: string | null;
    location?: string | null;
    filial?: string | null;
  },
  activeBranch: string,
  branches: Branch[] = []
): boolean {
  if (!activeBranch || activeBranch === "all") {
    return true;
  }

  const activeBranchObj = branches.find(b => b.id === activeBranch);
  const activeIsSede = activeBranch === "sede" || activeBranchObj?.type === "sede" || isSedeBranch(activeBranch, branches);

  const itemBranch = item.branchId;
  const itemCong = item.congregation || item.filial;
  const itemLoc = item.location;

  // Se o item não tem nenhuma filiação especificada em nenhum campo:
  if (!itemBranch && !itemCong && !itemLoc) {
    // Registros não associados pertencem à Sede (Matriz)
    return activeIsSede;
  }

  const activeIdNorm = normalizeBranchString(activeBranch);
  const activeNameNorm = activeBranchObj ? normalizeBranchString(activeBranchObj.name) : activeIdNorm;

  // 1. Checagem por branchId direto
  if (itemBranch) {
    const itemBranchNorm = normalizeBranchString(itemBranch);
    if (itemBranchNorm === activeIdNorm || itemBranchNorm === activeNameNorm) {
      return true;
    }
    // Caso especial para sede/matriz/default_branch
    if (activeIsSede && isSedeBranch(itemBranch, branches)) {
      return true;
    }
    // Se o item tem um branchId explícito diferente da sede e estamos na sede:
    if (activeIsSede && !isSedeBranch(itemBranch, branches)) {
      return false;
    }
    // Se estivermos em uma filial específica e o itemBranch for sede:
    if (!activeIsSede && isSedeBranch(itemBranch, branches)) {
      return false;
    }
  }

  // 2. Checagem por congregação (comum em membros)
  if (itemCong) {
    const itemCongNorm = normalizeBranchString(itemCong);
    if (itemCongNorm === activeIdNorm || itemCongNorm === activeNameNorm || itemCongNorm.includes(activeNameNorm)) {
      return true;
    }
    if (activeIsSede && (itemCongNorm.includes("sede") || itemCongNorm.includes("matriz") || itemCongNorm.includes("brasil para cristo"))) {
      return true;
    }
    if (!activeIsSede && (itemCongNorm.includes("sede") || itemCongNorm.includes("matriz"))) {
      return false;
    }
  }

  // 3. Checagem por localização (comum em eventos e patrimônio)
  if (itemLoc) {
    const itemLocNorm = normalizeBranchString(itemLoc);
    if (itemLocNorm === activeIdNorm || itemLocNorm === activeNameNorm || itemLocNorm.includes(activeNameNorm)) {
      return true;
    }
    if (activeIsSede && (itemLocNorm.includes("sede") || itemLocNorm.includes("matriz") || itemLocNorm.includes("templo sede"))) {
      return true;
    }
  }

  return false;
}
