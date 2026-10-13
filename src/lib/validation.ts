import { toast } from "sonner";

export interface ValidationRule {
  field: string;
  value: any;
  required?: boolean;
  type?: 'email' | 'cpf' | 'phone' | 'number' | 'date';
  message?: string;
  custom?: (val: any) => boolean;
}

export function validateForm(rules: ValidationRule[]): boolean {
  for (const rule of rules) {
    const val = rule.value;
    
    if (rule.required && (val === undefined || val === null || val === '')) {
      toast.error(rule.message || `O campo ${rule.field} é obrigatório.`);
      return false;
    }

    if (val) {
      if (rule.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        toast.error(rule.message || "Formato de e-mail inválido.");
        return false;
      }
      
      if (rule.type === 'cpf') {
        const cpfDigits = String(val).replace(/\D/g, '');
        if (cpfDigits.length !== 11) {
          toast.error(rule.message || "CPF deve conter 11 dígitos numéricos.");
          return false;
        }
      }
      
      if (rule.type === 'phone') {
         const phoneDigits = String(val).replace(/\D/g, '');
         if (phoneDigits.length < 10) {
            toast.error(rule.message || "Telefone inválido.");
            return false;
         }
      }

      if (rule.custom && !rule.custom(val)) {
        toast.error(rule.message || `Valor inválido para ${rule.field}.`);
        return false;
      }
    }
  }
  return true;
}
