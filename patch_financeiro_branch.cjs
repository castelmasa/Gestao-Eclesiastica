const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

code = code.replace(
  'const { activeBranch } = useBranch();',
  'const { activeBranch, branches } = useBranch();'
);

const oldBranchSelect = `<Select name="branchId" defaultValue={editingTransaction?.branchId || "sede"}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a congregação" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sede">Sede Principal</SelectItem>
                        <SelectItem value="filial_1">Filial 1 (Centro)</SelectItem>
                        <SelectItem value="filial_2">Filial 2 (Bairro)</SelectItem>
                      </SelectContent>
                    </Select>`;

const newBranchSelect = `<Select name="branchId" defaultValue={editingTransaction?.branchId || branches[0]?.id || ""}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a congregação" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map(b => (
                          <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>`;

code = code.replace(oldBranchSelect, newBranchSelect);

fs.writeFileSync('src/pages/Financeiro.tsx', code);
