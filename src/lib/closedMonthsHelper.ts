import { collection, doc, setDoc, onSnapshot, getDocs, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { logAction } from "@/lib/audit";

export interface ClosedMonthHistoryItem {
  action: "lock" | "unlock";
  timestamp: string;
  user: string;
  reason?: string;
}

export interface ClosedFinancialMonth {
  id: string; // `${branchId || 'sede'}_${yearMonth}`
  branchId: string;
  yearMonth: string; // Format: "YYYY-MM"
  monthName: string; // e.g., "Novembro de 2026"
  isLocked: boolean;
  lockedAt: string;
  lockedBy: string;
  lockedByEmail?: string;
  totalEntradas: number;
  totalSaidas: number;
  saldoFinal: number;
  notes?: string;
  unlockedAt?: string;
  unlockedBy?: string;
  unlockReason?: string;
  history?: ClosedMonthHistoryItem[];
}

const LOCAL_STORAGE_KEY = "church_closed_financial_months";

export function getLocalClosedMonths(): ClosedFinancialMonth[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.warn("Erro ao ler meses fechados do localStorage:", e);
    return [];
  }
}

export function saveLocalClosedMonths(months: ClosedFinancialMonth[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(months));
  } catch (e) {
    console.warn("Erro ao salvar meses fechados no localStorage:", e);
  }
}

/**
 * Escuta em tempo real a coleção de meses fechados no Firestore
 * com sincronização automática e fallback instantâneo no LocalStorage.
 */
export function subscribeToClosedMonths(
  callback: (months: ClosedFinancialMonth[]) => void
): () => void {
  // Dispara imediatamente os dados locais em cache para evitar flash de tela
  const localInitial = getLocalClosedMonths();
  if (localInitial.length > 0) {
    callback(localInitial);
  }

  try {
    const q = collection(db, "closed_financial_months");
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const remoteMonths = snapshot.docs.map(
          (d) => ({ ...d.data(), id: d.id } as ClosedFinancialMonth)
        );
        saveLocalClosedMonths(remoteMonths);
        callback(remoteMonths);
      },
      (err) => {
        console.warn("Aviso Firestore ao listar closed_financial_months, usando fallback local:", err);
        callback(getLocalClosedMonths());
      }
    );
    return unsub;
  } catch (e) {
    console.warn("Falha ao inicializar listener de closed_financial_months:", e);
    return () => {};
  }
}

/**
 * Normaliza qualquer data ("YYYY-MM-DD" ou "YYYY-MM") para o formato chave "YYYY-MM"
 */
export function extractYearMonth(dateOrYearMonth: string): string {
  if (!dateOrYearMonth) return "";
  const clean = dateOrYearMonth.trim();
  if (clean.length >= 7) {
    return clean.substring(0, 7);
  }
  return clean;
}

/**
 * Formata um ano-mês ("YYYY-MM") para nome amigável em português
 */
export function formatYearMonthDisplay(yearMonth: string): string {
  if (!yearMonth || !yearMonth.includes("-")) return yearMonth || "";
  const [y, m] = yearMonth.split("-").map(Number);
  const months = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];
  const name = months[m - 1] || String(m);
  return `${name} de ${y}`;
}

/**
 * Verifica se um mês/data específico está travado para determinada filial ou geral.
 */
export function isMonthLockedHelper(
  closedMonths: ClosedFinancialMonth[],
  dateOrYearMonth: string,
  branchId?: string
): boolean {
  if (!dateOrYearMonth) return false;
  const ym = extractYearMonth(dateOrYearMonth);
  if (!ym) return false;

  const resolvedBranch = branchId || "all";

  // Busca se há trava específica para esta filial OU trava global ('all')
  const record = closedMonths.find((item) => {
    if (item.yearMonth !== ym) return false;
    if (!item.isLocked) return false;
    if (item.branchId === "all" || item.branchId === resolvedBranch) return true;
    // Se a filial atual for 'sede', verifica travas associadas
    if ((resolvedBranch === "sede" || resolvedBranch === "all") && (item.branchId === "sede" || item.branchId === "all")) {
      return true;
    }
    return false;
  });

  return Boolean(record?.isLocked);
}

/**
 * Retorna os detalhes do fechamento de um mês
 */
export function getClosedMonthRecord(
  closedMonths: ClosedFinancialMonth[],
  dateOrYearMonth: string,
  branchId?: string
): ClosedFinancialMonth | undefined {
  const ym = extractYearMonth(dateOrYearMonth);
  if (!ym) return undefined;
  const resolvedBranch = branchId || "all";

  return closedMonths.find((item) => {
    if (item.yearMonth !== ym) return false;
    if (item.branchId === "all" || item.branchId === resolvedBranch) return true;
    if ((resolvedBranch === "sede" || resolvedBranch === "all") && (item.branchId === "sede" || item.branchId === "all")) {
      return true;
    }
    return false;
  });
}

/**
 * Trava e fecha um mês financeiro
 */
export async function lockFinancialMonth(params: {
  yearMonth: string;
  branchId: string;
  totalEntradas: number;
  totalSaidas: number;
  saldoFinal: number;
  userName: string;
  userEmail?: string;
  notes?: string;
}): Promise<{ success: boolean; message: string; record: ClosedFinancialMonth }> {
  const ym = extractYearMonth(params.yearMonth);
  const branchKey = params.branchId || "all";
  const docId = `${branchKey}_${ym}`;
  const nowIso = new Date().toISOString();
  const monthName = formatYearMonthDisplay(ym);

  const existingLocal = getLocalClosedMonths();
  const currentRecord = existingLocal.find((m) => m.id === docId);

  const historyItem: ClosedMonthHistoryItem = {
    action: "lock",
    timestamp: nowIso,
    user: params.userName,
    reason: params.notes || "Fechamento mensal aprovado e conferido.",
  };

  const newRecord: ClosedFinancialMonth = {
    id: docId,
    branchId: branchKey,
    yearMonth: ym,
    monthName,
    isLocked: true,
    lockedAt: nowIso,
    lockedBy: params.userName,
    lockedByEmail: params.userEmail || "",
    totalEntradas: params.totalEntradas,
    totalSaidas: params.totalSaidas,
    saldoFinal: params.saldoFinal,
    notes: params.notes || "",
    history: [...(currentRecord?.history || []), historyItem],
  };

  // 1. Atualiza LocalStorage imediatamente
  const updatedLocal = existingLocal.filter((m) => m.id !== docId).concat(newRecord);
  saveLocalClosedMonths(updatedLocal);

  // 2. Grava no Firestore com persistência
  try {
    await setDoc(doc(db, "closed_financial_months", docId), {
      ...newRecord,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Erro ao persistir trava no Firestore (usando LocalStorage):", err);
  }

  // 3. Registra na Auditoria
  logAction(
    "Fechamento e Trava de Mês Contábil",
    `Mês ${monthName} TRAVADO por ${params.userName}. Saldo Final: R$ ${params.saldoFinal.toFixed(2)}. ${params.notes ? 'Obs: ' + params.notes : ''}`,
    "Financeiro"
  );

  return {
    success: true,
    message: `O mês de ${monthName} foi fechado e travado com sucesso! Nenhuma alteração de transação será permitida.`,
    record: newRecord,
  };
}

/**
 * Destrava um mês financeiro com justificativa obrigatória
 */
export async function unlockFinancialMonth(params: {
  yearMonth: string;
  branchId: string;
  userName: string;
  userEmail?: string;
  reason: string;
}): Promise<{ success: boolean; message: string }> {
  const ym = extractYearMonth(params.yearMonth);
  const branchKey = params.branchId || "all";
  const docId = `${branchKey}_${ym}`;
  const nowIso = new Date().toISOString();
  const monthName = formatYearMonthDisplay(ym);

  const existingLocal = getLocalClosedMonths();
  const currentRecord = existingLocal.find((m) => m.id === docId);

  const historyItem: ClosedMonthHistoryItem = {
    action: "unlock",
    timestamp: nowIso,
    user: params.userName,
    reason: params.reason,
  };

  const updatedRecord: ClosedFinancialMonth = {
    id: docId,
    branchId: branchKey,
    yearMonth: ym,
    monthName,
    isLocked: false,
    lockedAt: currentRecord?.lockedAt || nowIso,
    lockedBy: currentRecord?.lockedBy || params.userName,
    totalEntradas: currentRecord?.totalEntradas || 0,
    totalSaidas: currentRecord?.totalSaidas || 0,
    saldoFinal: currentRecord?.saldoFinal || 0,
    notes: currentRecord?.notes || "",
    unlockedAt: nowIso,
    unlockedBy: params.userName,
    unlockReason: params.reason,
    history: [...(currentRecord?.history || []), historyItem],
  };

  // 1. Atualiza LocalStorage
  const updatedLocal = existingLocal.filter((m) => m.id !== docId).concat(updatedRecord);
  saveLocalClosedMonths(updatedLocal);

  // 2. Grava no Firestore
  try {
    await setDoc(doc(db, "closed_financial_months", docId), {
      ...updatedRecord,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    console.warn("Erro ao salvar destravamento no Firestore:", err);
  }

  // 3. Registra na Auditoria
  logAction(
    "Destravamento de Mês Contábil",
    `Mês ${monthName} DESTRAVADO por ${params.userName}. Motivo: ${params.reason}`,
    "Financeiro"
  );

  return {
    success: true,
    message: `O mês de ${monthName} foi destravado. Lançamentos e alterações foram liberados temporariamente.`,
  };
}
