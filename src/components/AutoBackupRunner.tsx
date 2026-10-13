import { useAutoBackup } from "@/hooks/useAutoBackup";

export function AutoBackupRunner() {
  useAutoBackup();
  return null;
}
