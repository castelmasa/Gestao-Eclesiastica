const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

const effectCode = `
  useEffect(() => {
    const handleSaveShortcut = () => {
      if (isTransactionModalOpen) {
        const form = document.getElementById('transactionForm');
        if (form) {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    };
    window.addEventListener('app:save-record', handleSaveShortcut);
    return () => window.removeEventListener('app:save-record', handleSaveShortcut);
  }, [isTransactionModalOpen]);
`;

code = code.replace(
  '  const handleSaveTransaction =',
  effectCode + '\n  const handleSaveTransaction ='
);

fs.writeFileSync('src/pages/Financeiro.tsx', code);
