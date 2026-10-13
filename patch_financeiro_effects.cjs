const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

const effectCode = `
  useEffect(() => {
    const unsubs = [];
    
    // Transactions
    unsubs.push(onSnapshot(collection(db, 'transactions'), (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setTransactions(data);
    }));

    // Categories
    unsubs.push(onSnapshot(collection(db, 'categories'), (snap) => {
      const data = [];
      snap.forEach(doc => data.push(doc.data().name));
      setCategories(data);
    }));

    // Members
    unsubs.push(onSnapshot(collection(db, 'members'), (snap) => {
      const data = [];
      snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));
      setMembers(data);
    }));

    // Fornecedores
    unsubs.push(onSnapshot(collection(db, 'fornecedores'), (snap) => {
      const data = [];
      snap.forEach(doc => {
        const docData = doc.data();
        data.push(docData);
        if (docData.name) {
          setAvailableSuppliers(prev => Array.from(new Set([...prev, docData.name])));
        }
      });
      setFornecedores(data);
    }));

    return () => unsubs.forEach(unsub => unsub());
  }, []);
`;

code = code.replace(
  '  // State added to replace the chunk missing',
  effectCode + '\n  // State added to replace the chunk missing'
);

fs.writeFileSync('src/pages/Financeiro.tsx', code);
