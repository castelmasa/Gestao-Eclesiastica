const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

const regex = /\{availableCategories\.map\(c => \([\s\S]*?<\/TableRow>\n\s*\)\)\}/;
code = code.replace(regex, `{availableCategories.map((c) => (
                        <TableRow key={c.id || c.name}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {c.name}
                              {c.type === 'entrada' ? <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Entrada</Badge> : (c.type === 'saida' ? <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">Saída</Badge> : null)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteCategory(c.id || c.name)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}`);

fs.writeFileSync('src/pages/Financeiro.tsx', code);
