import { toast } from "sonner";
import { logAction } from "./audit";

export async function executeDbOperation({
  operation,
  actionName,
  successMessage,
  userName
}: {
  operation: () => Promise<any>;
  actionName: string;
  successMessage: string;
  userName: string;
}) {
  try {
    const result = await operation();
    toast.success(successMessage);
    await logAction(actionName, successMessage, userName, 'success');
    return { success: true, data: result };
  } catch (error: any) {
    let friendlyMessage = "Erro desconhecido.";
    if (error.code === 'permission-denied') {
      friendlyMessage = "Você não tem permissão para realizar esta ação.";
    } else if (error.code === 'not-found') {
      friendlyMessage = "Registro não encontrado.";
    } else {
      friendlyMessage = error.message || friendlyMessage;
    }
    
    toast.error(`Falha na operação: ${friendlyMessage}`);
    await logAction(actionName, `Falha: ${friendlyMessage}`, userName, 'failed', error.message);
    
    return { success: false, error };
  }
}
