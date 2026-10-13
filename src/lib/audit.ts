import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export async function logAction(action: string, details: string, user: string, status: 'success' | 'failed' = 'success', errorDetails?: string) {
  try {
    // Local fallback/sync
    const existingStr = localStorage.getItem("churchAuditLogs");
    const logs = existingStr ? JSON.parse(existingStr) : [];
    const localLog = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      action,
      details,
      user,
      status,
      errorDetails
    };
    logs.unshift(localLog);
    if (logs.length > 1000) logs.length = 1000;
    localStorage.setItem("churchAuditLogs", JSON.stringify(logs));
    window.dispatchEvent(new Event('churchAuditLogsUpdated'));

    // Firestore log
    if (db) {
      await addDoc(collection(db, 'audit_logs'), {
        action,
        details,
        user,
        status,
        errorDetails: errorDetails || null,
        createdAt: serverTimestamp()
      });
    }
  } catch (e) {
    console.error("Failed to write audit log", e);
  }
}
