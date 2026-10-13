import { useEffect, useRef } from 'react';
import { getBackupConfig, shouldRunAutoBackup, runScheduledBackup } from '@/services/backupService';
import { toast } from 'sonner';

export function useAutoBackup() {
  const isRunningRef = useRef(false);

  useEffect(() => {
    // Check after app initialization (10s delay to prioritize UI responsiveness)
    const initialTimer = setTimeout(async () => {
      await checkAndRunAutoBackup();
    }, 10000);

    // Periodic check every 20 minutes while app is open
    const intervalTimer = setInterval(async () => {
      await checkAndRunAutoBackup();
    }, 20 * 60 * 1000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(intervalTimer);
    };
  }, []);

  const checkAndRunAutoBackup = async () => {
    if (isRunningRef.current) return;

    try {
      const config = await getBackupConfig();
      if (!config.enabled) return;

      if (shouldRunAutoBackup(config)) {
        isRunningRef.current = true;
        const currentUser = JSON.parse(localStorage.getItem('churchCurrentUser') || '{}');
        
        console.log('[AutoBackup] Executando backup agendado para o Firebase Storage...');
        const record = await runScheduledBackup({
          name: currentUser.name || 'Agendamento Automático',
          role: currentUser.role || 'Sistema'
        });

        toast.success(
          `Backup automático da igreja concluído e salvo no Firebase Storage (${record.membersCount} membros, ${record.transactionsCount} transações).`,
          { duration: 5000 }
        );
      }
    } catch (err) {
      console.warn('[AutoBackup] Falha ao processar backup agendado:', err);
    } finally {
      isRunningRef.current = false;
    }
  };
}
