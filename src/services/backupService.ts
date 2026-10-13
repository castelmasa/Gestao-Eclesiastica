import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { collection, addDoc, getDocs, doc, setDoc, getDoc, deleteDoc, query, orderBy, limit } from "firebase/firestore";
import { db, storage } from "@/lib/firebase";

export interface BackupConfig {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  scheduledHour: number; // 0 to 23
  scheduledDayOfWeek?: number; // 0 (Sunday) to 6 (Saturday)
  scheduledDayOfMonth?: number; // 1 to 31
  destination: "firebase_storage" | "google_drive" | "both";
  format: "json" | "csv" | "both";
  includeMembers: boolean;
  includeFinance: boolean;
  includeAssets: boolean;
  includeCategories: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  lastStatus?: "success" | "failed";
  lastError?: string;
}

export interface SystemBackupRecord {
  id?: string;
  name: string;
  format: "json" | "csv";
  destination: string;
  storageUrl?: string;
  storagePath?: string;
  fileSizeBytes?: number;
  membersCount: number;
  transactionsCount: number;
  type: "manual" | "automatic";
  status: "success" | "failed";
  createdAt: string;
  createdBy: string;
}

export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  enabled: true,
  frequency: "weekly",
  scheduledHour: 23,
  scheduledDayOfWeek: 0, // Sunday night
  scheduledDayOfMonth: 1,
  destination: "firebase_storage",
  format: "json",
  includeMembers: true,
  includeFinance: true,
  includeAssets: true,
  includeCategories: true,
};

// Calculate next run ISO string
export function calculateNextRunDate(config: BackupConfig): string {
  const now = new Date();
  const next = new Date(now);
  next.setHours(config.scheduledHour, 0, 0, 0);

  if (config.frequency === "daily") {
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
  } else if (config.frequency === "weekly") {
    const targetDay = config.scheduledDayOfWeek ?? 0;
    let daysUntil = (targetDay - now.getDay() + 7) % 7;
    if (daysUntil === 0 && next <= now) {
      daysUntil = 7;
    }
    next.setDate(now.getDate() + daysUntil);
  } else if (config.frequency === "monthly") {
    const targetDay = Math.min(config.scheduledDayOfMonth ?? 1, 28);
    next.setDate(targetDay);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(targetDay);
    }
  }

  return next.toISOString();
}

// Retrieve backup configuration from Firestore or localStorage
export async function getBackupConfig(): Promise<BackupConfig> {
  try {
    const docRef = doc(db, "backup_configs", "default");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { ...DEFAULT_BACKUP_CONFIG, ...(snap.data() as BackupConfig) };
    }
  } catch {
    // Fallback to localStorage if Firestore query is not yet created or offline
  }

  const local = localStorage.getItem("church_backup_config");
  if (local) {
    try {
      return { ...DEFAULT_BACKUP_CONFIG, ...JSON.parse(local) };
    } catch {
      // ignore
    }
  }

  return DEFAULT_BACKUP_CONFIG;
}

// Save backup configuration
export async function saveBackupConfig(config: BackupConfig): Promise<void> {
  const nextRunAt = calculateNextRunDate(config);
  const updatedConfig = { ...config, nextRunAt };

  localStorage.setItem("church_backup_config", JSON.stringify(updatedConfig));

  try {
    const docRef = doc(db, "backup_configs", "default");
    await setDoc(docRef, { ...updatedConfig, updatedAt: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.warn("Failed to persist backup config to Firestore:", err);
  }
}

// Extract church data from Firestore and localStorage
export async function gatherChurchData(options: {
  includeMembers?: boolean;
  includeFinance?: boolean;
  includeAssets?: boolean;
  includeCategories?: boolean;
}) {
  const data: Record<string, any> = {
    exportedAt: new Date().toISOString(),
    system: "Gestão Eclesiástica SaaS - O Brasil Para Cristo",
    version: "2.5.0",
  };

  // 1. Members
  if (options.includeMembers !== false) {
    let members: any[] = [];
    try {
      const snap = await getDocs(collection(db, "members"));
      members = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      // fallback
    }
    if (members.length === 0) {
      members = JSON.parse(localStorage.getItem("churchMembers") || "[]");
    }
    data.members = members;
    data.membersCount = members.length;
  }

  // 2. Transactions
  if (options.includeFinance !== false) {
    let transactions: any[] = [];
    try {
      const snap = await getDocs(collection(db, "transactions"));
      transactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      // fallback
    }
    if (transactions.length === 0) {
      transactions = JSON.parse(localStorage.getItem("churchTransactions") || "[]");
    }
    data.transactions = transactions;
    data.transactionsCount = transactions.length;
  }

  // 3. Categories & Config
  if (options.includeCategories !== false) {
    let categories: any[] = [];
    try {
      const snap = await getDocs(collection(db, "categories"));
      categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch {
      // fallback
    }
    if (categories.length === 0) {
      categories = JSON.parse(localStorage.getItem("churchCategories") || "[]");
    }
    data.categories = categories;
    data.churchConfig = JSON.parse(localStorage.getItem("churchConfig") || "{}");
    data.branches = JSON.parse(localStorage.getItem("churchBranches") || "[]");
  }

  // 4. Assets
  if (options.includeAssets !== false) {
    data.assets = JSON.parse(localStorage.getItem("churchAssets") || "[]");
  }

  return data;
}

// Convert data to formatted CSV string with UTF-8 BOM
export function generateMembersCSV(members: any[]): string {
  const headers = [
    "ID",
    "Nome",
    "CPF",
    "Email",
    "Telefone",
    "Cargo / Ministério",
    "Status",
    "Data de Nascimento",
    "Congregação",
    "Data de Cadastro"
  ];

  const rows = members.map(m => [
    `"${(m.id || "").replace(/"/g, '""')}"`,
    `"${(m.nome || m.name || "").replace(/"/g, '""')}"`,
    `"${(m.cpf || "").replace(/"/g, '""')}"`,
    `"${(m.email || "").replace(/"/g, '""')}"`,
    `"${(m.telefone || m.phone || "").replace(/"/g, '""')}"`,
    `"${(m.cargo || m.role || "Membro").replace(/"/g, '""')}"`,
    `"${(m.status || "Ativo").replace(/"/g, '""')}"`,
    `"${(m.dataNascimento || m.birthDate || "").replace(/"/g, '""')}"`,
    `"${(m.branchName || m.branchId || "Sede").replace(/"/g, '""')}"`,
    `"${(m.createdAt || "").replace(/"/g, '""')}"`
  ]);

  return "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
}

export function generateTransactionsCSV(transactions: any[]): string {
  const headers = [
    "ID",
    "Data",
    "Tipo",
    "Categoria",
    "Valor (R$)",
    "Descrição",
    "Histórico",
    "Forma de Pagamento",
    "Status",
    "Congregação",
    "Nº Documento",
    "Data de Vencimento"
  ];

  const rows = transactions.map(t => [
    `"${(t.id || "").replace(/"/g, '""')}"`,
    `"${(t.date || "").replace(/"/g, '""')}"`,
    `"${(t.type === "entrada" ? "Receita / Entrada" : "Despesa / Saída")}"`,
    `"${(t.category || "Outros").replace(/"/g, '""')}"`,
    Number(t.amount || 0).toFixed(2).replace(".", ","),
    `"${(t.description || "").replace(/"/g, '""')}"`,
    `"${(t.historico || "").replace(/"/g, '""')}"`,
    `"${(t.paymentMethod || "Dinheiro").replace(/"/g, '""')}"`,
    `"${(t.status || "Pago").replace(/"/g, '""')}"`,
    `"${(t.branchId || "Sede").replace(/"/g, '""')}"`,
    `"${(t.documentNumber || "").replace(/"/g, '""')}"`,
    `"${(t.dueDate || "").replace(/"/g, '""')}"`
  ]);

  return "\uFEFF" + [headers.join(";"), ...rows.map(r => r.join(";"))].join("\r\n");
}

// Download file directly in browser
export function triggerBrowserDownload(content: string, filename: string, mimeType: string = "application/json") {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Upload backup to Firebase Storage and register in Firestore
export async function uploadBackupToFirebaseStorage(
  content: string,
  filename: string,
  format: "json" | "csv",
  metadata: {
    membersCount: number;
    transactionsCount: number;
    type: "manual" | "automatic";
    userName?: string;
  }
): Promise<SystemBackupRecord> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const storagePath = `backups/${timestamp}_${filename}`;
  const fileRef = ref(storage, storagePath);

  const contentType = format === "json" ? "application/json" : "text/csv;charset=utf-8";

  // Upload string to Firebase Storage
  await uploadString(fileRef, content, "raw", { contentType });
  
  let downloadUrl = "";
  try {
    downloadUrl = await getDownloadURL(fileRef);
  } catch (err) {
    console.warn("Unable to get public download URL immediately:", err);
  }

  const record: SystemBackupRecord = {
    name: filename,
    format,
    destination: "Firebase Storage",
    storageUrl: downloadUrl,
    storagePath,
    fileSizeBytes: new Blob([content]).size,
    membersCount: metadata.membersCount,
    transactionsCount: metadata.transactionsCount,
    type: metadata.type,
    status: "success",
    createdAt: new Date().toISOString(),
    createdBy: metadata.userName || "Administrador",
  };

  // Register in Firestore collection
  try {
    const backupsCol = collection(db, "system_backups");
    const docAdded = await addDoc(backupsCol, record);
    record.id = docAdded.id;
  } catch (err) {
    console.warn("Could not register backup record in Firestore collection:", err);
    // Persist in local storage list as fallback
    const existing = JSON.parse(localStorage.getItem("church_system_backups") || "[]");
    existing.unshift({ ...record, id: `local_${Date.now()}` });
    localStorage.setItem("church_system_backups", JSON.stringify(existing.slice(0, 50)));
  }

  return record;
}

// Fetch backup history from Firestore and localStorage
export async function getBackupHistory(): Promise<SystemBackupRecord[]> {
  const records: SystemBackupRecord[] = [];

  try {
    const backupsCol = collection(db, "system_backups");
    const q = query(backupsCol, orderBy("createdAt", "desc"), limit(30));
    const snap = await getDocs(q);
    snap.forEach(d => {
      records.push({ id: d.id, ...(d.data() as SystemBackupRecord) });
    });
  } catch (err) {
    console.warn("Could not query system_backups from Firestore, checking localStorage:", err);
  }

  // Merge with local storage backups if any
  const localList: SystemBackupRecord[] = JSON.parse(localStorage.getItem("church_system_backups") || "[]");
  localList.forEach(localItem => {
    if (!records.some(r => r.storagePath === localItem.storagePath || (r.id && r.id === localItem.id))) {
      records.push(localItem);
    }
  });

  return records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// Delete backup record
export async function deleteBackupRecord(recordId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "system_backups", recordId));
  } catch (err) {
    console.warn("Error deleting Firestore backup record:", err);
  }

  const localList: SystemBackupRecord[] = JSON.parse(localStorage.getItem("church_system_backups") || "[]");
  const filtered = localList.filter(item => item.id !== recordId);
  localStorage.setItem("church_system_backups", JSON.stringify(filtered));
}

// Check if scheduled auto-backup should run now
export function shouldRunAutoBackup(config: BackupConfig): boolean {
  if (!config.enabled) return false;

  const now = new Date();
  if (!config.lastRunAt) {
    // If never run, run once
    return true;
  }

  const lastRun = new Date(config.lastRunAt);
  const diffHours = (now.getTime() - lastRun.getTime()) / (1000 * 60 * 60);

  if (config.frequency === "daily" && diffHours >= 23) {
    return true;
  }
  if (config.frequency === "weekly" && diffHours >= 24 * 6) {
    return true;
  }
  if (config.frequency === "monthly" && diffHours >= 24 * 27) {
    return true;
  }

  if (config.nextRunAt) {
    const nextRun = new Date(config.nextRunAt);
    if (now >= nextRun) {
      return true;
    }
  }

  return false;
}

// Full automated backup execution
export async function runScheduledBackup(user?: { name?: string; role?: string }): Promise<SystemBackupRecord> {
  const config = await getBackupConfig();
  const churchData = await gatherChurchData({
    includeMembers: config.includeMembers,
    includeFinance: config.includeFinance,
    includeAssets: config.includeAssets,
    includeCategories: config.includeCategories,
  });

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const filename = `auto_backup_${dateStr}.json`;
  const jsonContent = JSON.stringify(churchData, null, 2);

  const record = await uploadBackupToFirebaseStorage(jsonContent, filename, "json", {
    membersCount: churchData.membersCount || 0,
    transactionsCount: churchData.transactionsCount || 0,
    type: "automatic",
    userName: user?.name || "Sistema Automático",
  });

  // Update config with lastRunAt and nextRunAt
  const updatedConfig: BackupConfig = {
    ...config,
    lastRunAt: now.toISOString(),
    nextRunAt: calculateNextRunDate(config),
    lastStatus: "success",
  };
  await saveBackupConfig(updatedConfig);

  return record;
}
