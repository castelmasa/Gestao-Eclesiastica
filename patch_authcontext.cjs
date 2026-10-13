const fs = require('fs');
let code = fs.readFileSync('src/contexts/AuthContext.tsx', 'utf8');

const newToastLogic = `
            if (currentStatus !== 'exempt' && currentStatus !== 'blocked' && currentStatus !== 'expired' && data.expirationDate) {
              const diffTime = new Date(data.expirationDate).getTime() - now.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays > 0 && diffDays <= 3) {
                toast.error(\`Acesso Limitado em breve: Sua licença expira em \${diffDays} dia(s). Renove agora para evitar o bloqueio.\`, { duration: 10000 });
              } else if (diffDays > 3 && diffDays <= 15) {
                toast.warning(\`Aviso de Renovação: Sua licença expira em \${diffDays} dias.\`, { duration: 8000 });
              }
            }
`;

code = code.replace(
  /if \(currentStatus !== 'exempt' && currentStatus !== 'blocked' && currentStatus !== 'expired' && data\.expirationDate\) \{[\s\S]*?\}\n\s*\}/,
  newToastLogic.trim()
);

fs.writeFileSync('src/contexts/AuthContext.tsx', code);
