const fs = require('fs');
let code = fs.readFileSync('src/pages/Automacoes.tsx', 'utf8');

const newTriggers = `                                            <SelectItem value="MEMBER_ADDED">Novo Membro Cadastrado</SelectItem>
                                            <SelectItem value="NEW_TITHER">Novo Dizimista (Primeiro Dízimo)</SelectItem>
                                            <SelectItem value="INACTIVE_TITHER">Dizimista Inativo (> 90 dias)</SelectItem>
                                            <SelectItem value="BUDGET_EXCEEDED">Despesa Excede Limite da Categoria</SelectItem>
                                            <SelectItem value="TRANSACTION_ADDED">Nova Transação Registrada</SelectItem>
                                            <SelectItem value="DOCUMENT_ISSUED">Documento Emitido</SelectItem>
                                            <SelectItem value="BIRTHDAY">Aniversário de Membro</SelectItem>
                                            <SelectItem value="ASSET_MAINTENANCE">Manutenção Preventiva (Patrimônio)</SelectItem>`;

code = code.replace(
    /<SelectItem value="MEMBER_ADDED">[\s\S]*?<SelectItem value="ASSET_MAINTENANCE">Manutenção Preventiva \(Patrimônio\)<\/SelectItem>/,
    newTriggers
);

fs.writeFileSync('src/pages/Automacoes.tsx', code);
