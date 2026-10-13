const fs = require('fs');
let code = fs.readFileSync('src/components/layout/Layout.tsx', 'utf8');

const oldProcessRule = `    const processRule = (triggerType: string, payload: any) => {
        const rulesStr = localStorage.getItem("churchAutomations");
        if (!rulesStr) return;
        const rules = JSON.parse(rulesStr);
        rules.filter((r: any) => r.active && r.trigger === triggerType).forEach((rule: any) => {
            if (rule.action === 'CREATE_TASK') {
                // Add to agenda
                const eventsStr = localStorage.getItem("churchEvents");
                const events = eventsStr ? JSON.parse(eventsStr) : [];
                events.push({
                    id: Date.now() + Math.random(),
                    title: rule.actionParams + (payload.name ? \` - \${payload.name}\` : ''),
                    date: new Date().toISOString().split('T')[0],
                    type: 'Lembrete',
                    description: 'Gerado automaticamente por automação.'
                });
                localStorage.setItem("churchEvents", JSON.stringify(events));
                window.dispatchEvent(new Event("storage"));
            } else if (rule.action === 'SEND_NOTIFICATION') {
                // Send notification to DB
                addDoc(collection(db, 'notifications'), {
                  title: rule.name,
                  message: rule.actionParams + (payload.name ? \` (\${payload.name})\` : (payload.desc ? \` (\${payload.desc})\` : '')),
                  link: "/",
                  read: false,
                  createdAt: serverTimestamp()
                });
            }
        });
    };`;

const newProcessRule = `    const processRule = (triggerType: string, payload: any) => {
        const rulesStr = localStorage.getItem("churchAutomations");
        if (!rulesStr) return;
        const rules = JSON.parse(rulesStr);
        rules.filter((r: any) => r.active && r.trigger === triggerType).forEach((rule: any) => {
            const contextText = payload.name ? \` (\${payload.name})\` : (payload.desc ? \` (\${payload.desc})\` : (payload.message ? \` (\${payload.message})\` : ''));
            const finalMessage = rule.actionParams + contextText;
            
            if (rule.action === 'CREATE_TASK') {
                const eventsStr = localStorage.getItem("churchEvents");
                const events = eventsStr ? JSON.parse(eventsStr) : [];
                events.push({
                    id: Date.now() + Math.random(),
                    title: finalMessage,
                    date: new Date().toISOString().split('T')[0],
                    type: 'Lembrete',
                    description: 'Gerado automaticamente por automação.'
                });
                localStorage.setItem("churchEvents", JSON.stringify(events));
                window.dispatchEvent(new Event("storage"));
            } else if (rule.action === 'SEND_NOTIFICATION') {
                addDoc(collection(db, 'notifications'), {
                  title: rule.name,
                  message: finalMessage,
                  link: payload.link || "/",
                  read: false,
                  createdAt: serverTimestamp()
                });
            } else if (rule.action === 'SEND_EMAIL') {
                toast.success(\`E-mail automático na fila de envio: "\${finalMessage}"\`);
                addDoc(collection(db, 'notifications'), {
                  title: \`[E-mail Automático] \${rule.name}\`,
                  message: \`Enviado para: \${payload.email || 'Usuário/Contato'}. Conteúdo: \${finalMessage}\`,
                  link: payload.link || "/",
                  read: false,
                  createdAt: serverTimestamp()
                });
            } else if (rule.action === 'SEND_WHATSAPP') {
                toast.success(\`Mensagem de WhatsApp na fila: "\${finalMessage}"\`);
                addDoc(collection(db, 'notifications'), {
                  title: \`[WhatsApp Automático] \${rule.name}\`,
                  message: \`Enviado para: \${payload.phone || 'Usuário/Contato'}. Conteúdo: \${finalMessage}\`,
                  link: payload.link || "/",
                  read: false,
                  createdAt: serverTimestamp()
                });
            }
        });
    };`;

code = code.replace(oldProcessRule, newProcessRule);

// Add event listeners for new triggers
const oldEventListeners = `    const handleMemberAdded = (e: any) => processRule('MEMBER_ADDED', e.detail || {});
    const handleTxAdded = (e: any) => processRule('TRANSACTION_ADDED', e.detail || {});
    const handleDocIssued = (e: any) => processRule('DOCUMENT_ISSUED', e.detail || {});

    window.addEventListener('app:member-added', handleMemberAdded);
    window.addEventListener('app:tx-added', handleTxAdded);
    window.addEventListener('app:doc-issued', handleDocIssued);
    return () => {
        window.removeEventListener('app:member-added', handleMemberAdded);
        window.removeEventListener('app:tx-added', handleTxAdded);
        window.removeEventListener('app:doc-issued', handleDocIssued);
    };`;

const newEventListeners = `    const handleMemberAdded = (e: any) => processRule('MEMBER_ADDED', e.detail || {});
    const handleTxAdded = (e: any) => processRule('TRANSACTION_ADDED', e.detail || {});
    const handleDocIssued = (e: any) => processRule('DOCUMENT_ISSUED', e.detail || {});
    const handleNewTither = (e: any) => processRule('NEW_TITHER', e.detail || {});
    const handleInactiveTither = (e: any) => processRule('INACTIVE_TITHER', e.detail || {});
    const handleBudgetExceeded = (e: any) => processRule('BUDGET_EXCEEDED', e.detail || {});
    const handleBirthday = (e: any) => processRule('BIRTHDAY', e.detail || {});
    const handleAssetMaintenance = (e: any) => processRule('ASSET_MAINTENANCE', e.detail || {});

    window.addEventListener('app:member-added', handleMemberAdded);
    window.addEventListener('app:tx-added', handleTxAdded);
    window.addEventListener('app:doc-issued', handleDocIssued);
    window.addEventListener('app:new-tither', handleNewTither);
    window.addEventListener('app:inactive-tither', handleInactiveTither);
    window.addEventListener('app:budget-exceeded', handleBudgetExceeded);
    window.addEventListener('app:birthday', handleBirthday);
    window.addEventListener('app:asset-maintenance', handleAssetMaintenance);

    return () => {
        window.removeEventListener('app:member-added', handleMemberAdded);
        window.removeEventListener('app:tx-added', handleTxAdded);
        window.removeEventListener('app:doc-issued', handleDocIssued);
        window.removeEventListener('app:new-tither', handleNewTither);
        window.removeEventListener('app:inactive-tither', handleInactiveTither);
        window.removeEventListener('app:budget-exceeded', handleBudgetExceeded);
        window.removeEventListener('app:birthday', handleBirthday);
        window.removeEventListener('app:asset-maintenance', handleAssetMaintenance);
    };`;

code = code.replace(oldEventListeners, newEventListeners);

fs.writeFileSync('src/components/layout/Layout.tsx', code);
