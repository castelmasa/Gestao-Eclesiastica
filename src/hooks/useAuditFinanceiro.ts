import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface FinancialAuditLog {
  id: string;
  date: string;
  action: string;
  details: string;
  user: string;
  status: "success" | "failed";
  isCritical: boolean;
  metadata?: {
    transactionId?: string;
    type?: string;
    amount?: number;
    category?: string;
    documentNumber?: string;
    before?: any;
    after?: any;
    deletedTransaction?: any;
  };
}

export function useAuditFinanceiro() {
  const { user } = useAuth();
  const [financialAuditLogs, setFinancialAuditLogs] = useState<FinancialAuditLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Escuta logs de auditoria em tempo real
  useEffect(() => {
    let unsubscribe = () => {};

    try {
      if (db) {
        const q = query(collection(db, "audit_logs"), orderBy("createdAt", "desc"), limit(100));
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const list: FinancialAuditLog[] = [];
            snapshot.forEach((doc) => {
              const data = doc.data();
              const action = data.action || "";
              const isFinancial =
                action.toLowerCase().includes("financeir") ||
                action.toLowerCase().includes("transação") ||
                action.toLowerCase().includes("exclusão") ||
                action.toLowerCase().includes("edição");

              if (isFinancial) {
                list.push({
                  id: doc.id,
                  date: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.date || new Date().toISOString(),
                  action: data.action,
                  details: data.details,
                  user: data.user,
                  status: data.status || "success",
                  isCritical: !!data.isCritical,
                  metadata: data.metadata || (data.before || data.after ? { before: data.before, after: data.after } : undefined)
                });
              }
            });

            // Se o Firestore tiver dados, atualiza
            if (list.length > 0) {
              setFinancialAuditLogs(list);
              setIsLoadingLogs(false);
              return;
            }
          },
          (error) => {
            console.warn("Firestore audit listener error, fallback to localStorage:", error);
          }
        );
      }
    } catch (e) {
      console.warn("Error setting up firestore audit listener:", e);
    }

    // Sincronização e Fallback com localStorage
    const loadFromLocalStorage = () => {
      try {
        const raw = localStorage.getItem("churchAuditLogs");
        if (raw) {
          const parsed = JSON.parse(raw);
          const financial = parsed
            .filter((l: any) => {
              const act = (l.action || "").toLowerCase();
              return act.includes("financeir") || act.includes("transação") || act.includes("exclusão") || act.includes("edição");
            })
            .map((l: any) => ({
              ...l,
              isCritical: l.isCritical ?? (l.action?.includes("Exclusão") || l.action?.includes("Crítica"))
            }));
          setFinancialAuditLogs(financial);
        }
      } catch (err) {
        console.error("Error reading local audit logs:", err);
      } finally {
        setIsLoadingLogs(false);
      }
    };

    loadFromLocalStorage();
    window.addEventListener("churchAuditLogsUpdated", loadFromLocalStorage);

    return () => {
      unsubscribe();
      window.removeEventListener("churchAuditLogsUpdated", loadFromLocalStorage);
    };
  }, []);

  // Gravação centralizada de log de auditoria
  const recordAuditEntry = useCallback(
    async (
      action: string,
      details: string,
      isCritical: boolean = false,
      metadata?: FinancialAuditLog["metadata"]
    ) => {
      const userName = user?.name || user?.email || "Administrador / Tesouraria";
      const now = new Date();
      const localEntry: FinancialAuditLog = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        date: now.toISOString(),
        action,
        details,
        user: userName,
        status: "success",
        isCritical,
        metadata
      };

      // 1. Salvar no localStorage
      try {
        const existingRaw = localStorage.getItem("churchAuditLogs");
        const logs = existingRaw ? JSON.parse(existingRaw) : [];
        logs.unshift(localEntry);
        if (logs.length > 500) logs.length = 500;
        localStorage.setItem("churchAuditLogs", JSON.stringify(logs));
        window.dispatchEvent(new Event("churchAuditLogsUpdated"));
      } catch (e) {
        console.error("Failed to write audit log to localStorage", e);
      }

      // 2. Salvar no Firestore
      try {
        if (db) {
          await addDoc(collection(db, "audit_logs"), {
            action,
            details,
            user: userName,
            status: "success",
            isCritical,
            metadata: metadata || null,
            createdAt: serverTimestamp()
          });
        }
      } catch (e) {
        console.error("Failed to write audit log to Firestore", e);
      }
    },
    [user]
  );

  // 1. Registrar Exclusão Crítica Financeira
  const logCriticalDeletion = useCallback(
    async (transaction: any) => {
      const valorFormatado = Number(transaction.amount || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      const tipo = transaction.type === "entrada" ? "Entrada" : "Saída";
      const docInfo = transaction.documentNumber && transaction.documentNumber !== "-" ? ` | Doc/Cheque: ${transaction.documentNumber}` : "";
      const detalhes = `Exclusão Crítica de ${tipo} no valor de R$ ${valorFormatado} (Desc: "${transaction.description}", Cat: "${transaction.category}"${docInfo}). Registro permanente para segurança e controle.`;

      await recordAuditEntry("Exclusão Financeira Crítica", detalhes, true, {
        transactionId: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        documentNumber: transaction.documentNumber,
        deletedTransaction: transaction
      });
    },
    [recordAuditEntry]
  );

  // 2. Registrar Edição Financeira (com detecção de alterações críticas)
  const logCriticalUpdate = useCallback(
    async (oldTx: any, newTx: any) => {
      const changes: string[] = [];
      let isCritical = false;

      // Comparar valor
      const oldAmount = Number(oldTx.amount || 0);
      const newAmount = Number(newTx.amount || 0);
      if (oldAmount !== newAmount) {
        const diff = Math.abs(newAmount - oldAmount);
        changes.push(
          `Valor: R$ ${oldAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} → R$ ${newAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
        );
        if (diff >= 500) {
          isCritical = true;
        }
      }

      // Comparar tipo (entrada/saída)
      if (oldTx.type && newTx.type && oldTx.type !== newTx.type) {
        changes.push(`Tipo: ${oldTx.type} → ${newTx.type}`);
        isCritical = true;
      }

      // Comparar categoria
      if (oldTx.category && newTx.category && oldTx.category !== newTx.category) {
        changes.push(`Categoria: "${oldTx.category}" → "${newTx.category}"`);
      }

      // Comparar descrição
      if (oldTx.description && newTx.description && oldTx.description !== newTx.description) {
        changes.push(`Descrição: "${oldTx.description}" → "${newTx.description}"`);
      }

      // Comparar status (Pago/Pendente)
      if (oldTx.status && newTx.status && oldTx.status !== newTx.status) {
        changes.push(`Status: ${oldTx.status} → ${newTx.status}`);
        isCritical = true;
      }

      // Comparar documento
      if (oldTx.documentNumber !== newTx.documentNumber) {
        changes.push(`Nº Doc/Cheque: ${oldTx.documentNumber || "-"} → ${newTx.documentNumber || "-"}`);
      }

      const detalhes =
        changes.length > 0
          ? `Alterações em "${newTx.description || oldTx.description}": ${changes.join("; ")}.`
          : `Atualização de dados cadastrais da transação "${newTx.description || oldTx.description}".`;

      const actionTitle = isCritical ? "Edição Financeira Crítica" : "Edição Financeira";

      await recordAuditEntry(actionTitle, detalhes, isCritical, {
        transactionId: newTx.id || oldTx.id,
        before: oldTx,
        after: newTx
      });
    },
    [recordAuditEntry]
  );

  // 3. Registrar Criação Financeira
  const logFinancialCreation = useCallback(
    async (transaction: any) => {
      const valorFormatado = Number(transaction.amount || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      const tipo = transaction.type === "entrada" ? "Entrada" : "Saída";
      const docInfo = transaction.documentNumber && transaction.documentNumber !== "-" ? ` | Doc/Cheque: ${transaction.documentNumber}` : "";
      const isHighValue = Number(transaction.amount || 0) >= 2000;
      const detalhes = `Lançamento de ${tipo} de R$ ${valorFormatado} - "${transaction.description}" (Cat: "${transaction.category}"${docInfo}).`;

      await recordAuditEntry("Criação Financeira", detalhes, isHighValue, {
        transactionId: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        category: transaction.category,
        documentNumber: transaction.documentNumber
      });
    },
    [recordAuditEntry]
  );

  return {
    financialAuditLogs,
    isLoadingLogs,
    logCriticalDeletion,
    logCriticalUpdate,
    logFinancialCreation,
    recordAuditEntry
  };
}
