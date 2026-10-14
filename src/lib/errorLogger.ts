import { db, auth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, updateDoc, deleteDoc, doc } from "firebase/firestore";

export type ErrorSeverity = "critical" | "error" | "warning";
export type ErrorSource = "ui" | "network" | "database" | "auth" | "unhandled" | "component_crash" | "processing";

export interface ErrorLogData {
  id?: string;
  message: string;
  source: ErrorSource;
  severity: ErrorSeverity;
  stack?: string;
  componentStack?: string;
  url?: string;
  userId?: string;
  userEmail?: string;
  churchBranch?: string;
  context?: Record<string, any>;
  createdAt?: any;
  resolved?: boolean;
  resolvedBy?: string;
  resolvedAt?: any;
}

// In-memory cache to prevent flood of identical errors in short succession
const recentErrorsCache = new Map<string, number>();

export async function logCriticalError(options: {
  error?: Error | unknown;
  message?: string;
  source?: ErrorSource;
  severity?: ErrorSeverity;
  componentStack?: string;
  context?: Record<string, any>;
  branchId?: string;
}): Promise<string | null> {
  try {
    const rawError = options.error as any;
    const msg =
      options.message ||
      rawError?.message ||
      (typeof rawError === "string" ? rawError : "Exceção não identificada");
    const stack = rawError?.stack || (typeof rawError === "object" ? JSON.stringify(rawError) : "");
    const severity: ErrorSeverity = options.severity || "critical";
    const source: ErrorSource = options.source || "ui";

    // Deduplication check: ignore identical errors within 10 seconds
    const cacheKey = `${msg}-${source}-${window.location.pathname}`;
    const now = Date.now();
    const lastOccurred = recentErrorsCache.get(cacheKey);
    if (lastOccurred && now - lastOccurred < 10000) {
      console.warn("[ErrorLogger] Erro duplicado suprimido para economizar chamadas:", msg);
      return null;
    }
    recentErrorsCache.set(cacheKey, now);

    // Clean up cache periodically
    if (recentErrorsCache.size > 50) {
      recentErrorsCache.clear();
    }

    const currentUser = auth.currentUser;
    const currentBranch =
      options.branchId ||
      localStorage.getItem("churchActiveBranch") ||
      "sede";

    const payload = {
      message: String(msg).slice(0, 1000),
      source,
      severity,
      stack: String(stack).slice(0, 4000),
      componentStack: options.componentStack ? String(options.componentStack).slice(0, 3000) : "",
      url: window.location.href.slice(0, 500),
      userId: currentUser?.uid || "anônimo",
      userEmail: currentUser?.email || "anônimo",
      churchBranch: currentBranch,
      context: options.context ? JSON.parse(JSON.stringify(options.context)) : {},
      createdAt: serverTimestamp(),
      resolved: false,
    };

    console.error(`[ErrorLogger] Gravando exceção crítica no Firestore [${severity}]:`, payload);

    const docRef = await addDoc(collection(db, "error_logs"), payload);

    // Notify any local UI monitors
    window.dispatchEvent(
      new CustomEvent("system:error-logged", {
        detail: { id: docRef.id, ...payload },
      })
    );

    return docRef.id;
  } catch (loggingErr) {
    // Failsafe: avoid throw inside error logger
    console.error("[ErrorLogger] Falha ao persistir erro no Firestore:", loggingErr);
    return null;
  }
}

// Global browser listeners for uncaught errors
let isInitialized = false;

export function initGlobalErrorHandlers() {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

  window.addEventListener("error", (event) => {
    const msg = event.message || "";
    // Ignore harmless browser extension, resize observer, or DOM translate mismatch errors
    if (
      msg.includes("ResizeObserver") ||
      msg.includes("Script error.") ||
      msg.includes("chrome-extension") ||
      msg.includes("The node to be removed is not a child of this node") ||
      msg.includes("removeChild") ||
      msg.includes("insertBefore")
    ) {
      return;
    }

    logCriticalError({
      message: event.message || "Erro não capturado na janela",
      error: event.error,
      source: "unhandled",
      severity: "critical",
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    // Ignore canceled navigation or cancelled firestore queries during unmount
    const reason = event.reason;
    const reasonMsg = reason?.message || String(reason || "");
    if (
      reasonMsg.includes("cancelled") ||
      reasonMsg.includes("aborted") ||
      reasonMsg.includes("ServiceWorker") ||
      reasonMsg.includes("sw.js") ||
      reasonMsg.includes("The node to be removed is not a child of this node")
    ) {
      return;
    }

    logCriticalError({
      message: `Promessa não tratada: ${reasonMsg}`,
      error: reason instanceof Error ? reason : undefined,
      source: "unhandled",
      severity: "error",
      context: {
        reason: typeof reason === "object" ? JSON.stringify(reason) : String(reason),
      },
    });
  });
}
