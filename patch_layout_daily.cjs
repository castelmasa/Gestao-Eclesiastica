const fs = require('fs');
let code = fs.readFileSync('src/components/layout/Layout.tsx', 'utf8');

const oldCheckDaily = /const checkDailyNotifications = async \(\) => \{[\s\S]*?localStorage\.setItem\('lastCheckedNotifs', today\);\n      \}\n    \};\n/;

const newCheckDaily = `const checkDailyNotifications = async () => {
      const today = new Date().toISOString().split('T')[0];
      const lastChecked = localStorage.getItem('lastCheckedNotifs');
      
      if (lastChecked !== today) {
        try {
            // Fetch Members and Transactions from Firestore
            const membersSnap = await getDocs(collection(db, 'members'));
            const txsSnap = await getDocs(collection(db, 'transactions'));
            
            const members = membersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const txs = txsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            const currentMonth = new Date().getMonth() + 1;
            const currentDay = new Date().getDate();
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
            
            members.forEach((m: any) => {
              if (m.birthDate) {
                const [y, mm, d] = m.birthDate.split('-');
                if (parseInt(mm) === currentMonth && parseInt(d) === currentDay) {
                  // Generate default notification
                  addDoc(collection(db, 'notifications'), {
                    title: "Aniversariante do Dia",
                    message: \`Hoje é aniversário de \${m.name}!\`,
                    link: "/secretaria",
                    read: false,
                    createdAt: serverTimestamp()
                  });
                  
                  // Dispatch automation event
                  window.dispatchEvent(new CustomEvent('app:birthday', { 
                     detail: { name: m.name, email: m.email, phone: m.phone, message: \`Feliz aniversário \${m.name}!\` } 
                  }));
                }
              }

              // Inactive Tither Check (90 days)
              if (m.status === 'ativo') {
                  const memberTithes = txs.filter((t: any) => t.memberId === m.id && t.type === 'entrada' && (t.category || '').toLowerCase().includes('dízimo'));
                  if (memberTithes.length > 0) {
                      // Has tithed before. When was the last one?
                      const lastTitheDate = new Date(Math.max(...memberTithes.map((t: any) => new Date(t.date).getTime())));
                      if (lastTitheDate < ninetyDaysAgo) {
                          // Inactive for > 90 days
                          window.dispatchEvent(new CustomEvent('app:inactive-tither', {
                              detail: { name: m.name, desc: \`O membro \${m.name} não registra dízimos há mais de 90 dias.\`, link: "/financeiro" }
                          }));
                      }
                  }
              }
            });

            // Pending Bills
            const todayDate = new Date();
            const in3Days = new Date();
            in3Days.setDate(todayDate.getDate() + 3);
            
            txs.forEach((t: any) => {
               if (t.type === 'saida' && t.status === 'Pendente' && t.date) {
                 const dueDate = new Date(t.date);
                 if (dueDate >= todayDate && dueDate <= in3Days) {
                   const notifId = \`vencimento_\${t.id}\`;
                   const alreadyNotified = localStorage.getItem(notifId);
                   if (!alreadyNotified) {
                     localStorage.setItem(notifId, 'true');
                     addDoc(collection(db, 'notifications'), {
                        title: "Conta Próxima ao Vencimento",
                        message: \`A despesa "\${t.description}" (\${t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}) vence em breve.\`,
                        link: "/financeiro",
                        read: false,
                        createdAt: serverTimestamp()
                     });
                   }
                 }
               }
            });

            localStorage.setItem('lastCheckedNotifs', today);
        } catch (err) {
            console.error("Erro ao verificar notificações diárias", err);
        }
      }
    };
`;

code = code.replace(oldCheckDaily, newCheckDaily);

fs.writeFileSync('src/components/layout/Layout.tsx', code);
