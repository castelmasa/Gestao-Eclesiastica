const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

const regex = /if \(res\.success\) \{\s*setIsTransactionModalOpen\(false\)\s*setSelectedCategory\(""\)\s*setEditingTransaction\(null\)\s*\}/;

const dispatchCode = `if (res.success) {
      // Automação: Nova Transação
      if (!editingTransaction) {
          window.dispatchEvent(new CustomEvent('app:tx-added', { detail: txData }));
          
          // Automação: Limite de Orçamento
          // Simulando um limite de 1000 para qualquer categoria, ou buscando configuração.
          // Para esta demo, dispararemos se for saída > 1000
          if (txData.type === 'saida' && txData.amount > 1000) {
              window.dispatchEvent(new CustomEvent('app:budget-exceeded', { 
                  detail: { ...txData, name: \`Despesa Alta (\${txData.category})\`, desc: \`A despesa de R$ \${txData.amount} excedeu o limite de segurança.\` }
              }));
          }

          // Automação: Novo Dizimista
          if (isDizimo && txData.memberId) {
             // Verificar se é o primeiro dízimo deste membro
             const previousTithes = transactions.filter(t => t.memberId === txData.memberId && t.type === 'entrada' && t.category.toLowerCase().includes('dízimo'));
             if (previousTithes.length === 0) {
                 window.dispatchEvent(new CustomEvent('app:new-tither', {
                     detail: { ...txData, name: \`Novo Dizimista: \${txData.memberId}\`, desc: 'Primeiro dízimo registrado no sistema.' }
                 }));
             }
          }
      }

      setIsTransactionModalOpen(false)
      setSelectedCategory("")
      setEditingTransaction(null)
    }`;

code = code.replace(regex, dispatchCode);

fs.writeFileSync('src/pages/Financeiro.tsx', code);
