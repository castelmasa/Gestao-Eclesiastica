const fs = require('fs');
let code = fs.readFileSync('src/pages/Configuracoes.tsx', 'utf8');

const renewFunction = `
  const handleRenewLicense = async () => {
    if (!currentUser?.id) return;
    const newExpiration = new Date();
    
    // Check if there's an existing valid expiration date
    if (currentUser.expirationDate && new Date(currentUser.expirationDate) > new Date()) {
      const currentExp = new Date(currentUser.expirationDate);
      currentExp.setDate(currentExp.getDate() + 30);
      newExpiration.setTime(currentExp.getTime());
    } else {
      newExpiration.setDate(newExpiration.getDate() + 30); // Renew for 30 days from today
    }
    
    await executeDbOperation({
      operation: async () => updateDoc(doc(db, 'users', currentUser.id), { 
        expirationDate: newExpiration.toISOString(), 
        status: 'active' 
      }),
      actionName: "Renovação Manual de Licença",
      successMessage: "Licença renovada com sucesso por mais 30 dias!",
      userName: currentUser?.name || "Desconhecido"
    });
  };

  const handleExportBackup = () => {
`;

code = code.replace(
  'const handleExportBackup = () => {',
  renewFunction.trim() + '\n'
);

code = code.replace(
  '<Button variant="default">Renovar ou Alterar Plano</Button>',
  '<Button variant="default" onClick={handleRenewLicense}>Renovar por 30 dias</Button>'
);

fs.writeFileSync('src/pages/Configuracoes.tsx', code);
