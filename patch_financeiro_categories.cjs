const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

// Change categories state type
code = code.replace(
  'const [categories, setCategories] = useState<string[]>([]);',
  'const [categories, setCategories] = useState<any[]>([]);'
);

// Update snapshot to load objects
code = code.replace(
  `snap.forEach(doc => data.push(doc.data().name));`,
  `snap.forEach(doc => data.push({ id: doc.id, ...doc.data() }));`
);

// Update category filter to use names, since we store strings in transactions
const selectCategory = `
                      <Select 
                        value={selectedCategory} 
                        onValueChange={setSelectedCategory} 
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.filter(c => c.type === transactionType || !c.type).map(c => (
                            <SelectItem key={c.id || c.name} value={c.name}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>`;

// Note: I will just regex replace the Select for Category
const regexSelect = /<Select\s+value=\{selectedCategory\}[\s\S]*?<\/Select>/;
code = code.replace(regexSelect, selectCategory);

// For the category filter in list
const commandItemRegex = /\{categories\.map\(\(c\) => \([\s\S]*?<\/CommandItem>\n\s*\)\)\}/;
code = code.replace(commandItemRegex, `{categories.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={c.name}
                              onSelect={(currentValue) => {
                                setCategoryFilter(currentValue === categoryFilter ? "all" : c.name)
                                setOpenCategory(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  categoryFilter === c.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {c.name}
                            </CommandItem>
                          ))}`);

// In category manager
const tableRowsRegex = /\{availableCategories\.map\(\(c\) => \([\s\S]*?<\/TableRow>\n\s*\)\)\}/;
code = code.replace(tableRowsRegex, `{availableCategories.map((c) => (
                        <TableRow key={c.id || c.name}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              {c.name}
                              {c.type === 'entrada' ? <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200">Entrada</Badge> : <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">Saída</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleDeleteCategory(c.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}`);

fs.writeFileSync('src/pages/Financeiro.tsx', code);
