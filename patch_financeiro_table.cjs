const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

// Replace table header in "Transações Recentes"
const headerOld = `                <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Data</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Nº Doc</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Descrição</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right print:hidden">Ações</TableHead>`;

const headerNew = `                <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Data</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Nº Doc</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50 w-[300px]">Descrição</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Categoria</TableHead>
                <TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50 w-[60px] text-center"><Paperclip className="h-4 w-4 mx-auto text-slate-500" /></TableHead>
                <TableHead className="text-right font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50 min-w-[120px]">Valor</TableHead>
                <TableHead className="text-right print:hidden font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">Ações</TableHead>`;

code = code.replace(headerOld, headerNew);

if (!code.includes('Paperclip')) {
    code = code.replace('import { Users,', 'import { Users, Paperclip,');
}

// Update TableRow
const rowOld = `                    <TableCell>
                      {t.category}
                      {t.type === 'saida' && t.status === 'Pendente' && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Pendente</span>
                      )}
                    </TableCell>
                    <TableCell className={\`text-right font-medium \${t.type === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}\`}>
                      {t.type === 'entrada' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right print:hidden">
                      <div className="flex justify-end gap-2">
                        {t.comprovante && (
                          <Button variant="ghost" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2" onClick={() => window.open(t.comprovante, '_blank')} title="Ver Anexo">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(t)}>Editar</Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setTransactionToDelete(t)}>Excluir</Button>
                      </div>
                    </TableCell>`;

const rowNew = `                    <TableCell>
                      {t.category}
                      {t.type === 'saida' && t.status === 'Pendente' && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">Pendente</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {t.comprovante ? (
                         <Button variant="ghost" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 h-8" onClick={() => window.open(t.comprovante, '_blank')} title="Ver Anexo">
                           <Paperclip className="h-4 w-4" />
                         </Button>
                      ) : (
                         <span className="text-slate-300">-</span>
                      )}
                    </TableCell>
                    <TableCell className={\`text-right font-semibold \${t.type === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}\`}>
                      {t.type === 'entrada' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-right print:hidden">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEditModal(t)}>Editar</Button>
                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={() => setTransactionToDelete(t)}>Excluir</Button>
                      </div>
                    </TableCell>`;

code = code.replace(rowOld, rowNew);

// Need to replace colSpan={6} with colSpan={7} for empty state
code = code.replace('<TableCell colSpan={6} className="h-24 text-center text-slate-500 dark:text-slate-400">', '<TableCell colSpan={7} className="h-24 text-center text-slate-500 dark:text-slate-400">');

// Now let's reorganize the menus.
const menuOld = `            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="relative w-full lg:max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type="search"
                  placeholder="Buscar transações..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap w-full lg:w-auto gap-2">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Todos os Tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="entrada">Entradas</SelectItem>
                    <SelectItem value="saida">Saídas</SelectItem>
                  </SelectContent>
                </Select>
                <Popover open={openCategory} onOpenChange={setOpenCategory}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCategory}
                      className="w-full sm:w-[200px] justify-between font-normal"
                    >
                      {categoryFilter === "all"
                        ? "Todas as Categorias"
                        : categories.find((c) => c.name === categoryFilter)?.name}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar categoria..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setCategoryFilter("all")
                              setOpenCategory(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                categoryFilter === "all" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Todas as Categorias
                          </CommandItem>
                          {categories.map((c) => (
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
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                <div className="flex items-center gap-2">
                  <Input 
                    type="month" 
                    className="w-full sm:w-auto font-normal" 
                    value={monthFilter} 
                    onChange={e => setMonthFilter(e.target.value)}
                  />
                </div>
                
                {(searchTerm || typeFilter !== 'all' || categoryFilter !== 'all' || monthFilter) && (
                  <Button 
                    variant="ghost" 
                    className="w-full sm:w-auto text-slate-500" 
                    onClick={() => {
                      setSearchTerm("");
                      setTypeFilter("all");
                      setCategoryFilter("all");
                      setMonthFilter("");
                    }}
                  >
                    <X className="w-4 h-4 mr-2" /> Limpar
                  </Button>
                )}
              </div>
            </div>`;

const menuNew = `            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="relative w-full lg:max-w-[350px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type="search"
                  placeholder="Buscar transações..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex flex-wrap flex-1 w-full gap-2 items-center lg:justify-end">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Todos os Tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="entrada">Entradas</SelectItem>
                    <SelectItem value="saida">Saídas</SelectItem>
                  </SelectContent>
                </Select>
                <Popover open={openCategory} onOpenChange={setOpenCategory}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCategory}
                      className="w-full sm:w-[180px] justify-between font-normal"
                    >
                      {categoryFilter === "all"
                        ? "Todas as Categorias"
                        : (categories.find((c) => c.name === categoryFilter)?.name || "Todas as Categorias")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar categoria..." />
                      <CommandList>
                        <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setCategoryFilter("all")
                              setOpenCategory(false)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                categoryFilter === "all" ? "opacity-100" : "opacity-0"
                              )}
                            />
                            Todas as Categorias
                          </CommandItem>
                          {categories.map((c) => (
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
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Input 
                    type="month" 
                    className="w-full sm:w-[150px] font-normal" 
                    value={monthFilter} 
                    onChange={e => setMonthFilter(e.target.value)}
                  />
                </div>
                
                {(searchTerm || typeFilter !== 'all' || categoryFilter !== 'all' || monthFilter) && (
                  <Button 
                    variant="ghost" 
                    className="w-full sm:w-auto text-slate-500 px-2" 
                    onClick={() => {
                      setSearchTerm("");
                      setTypeFilter("all");
                      setCategoryFilter("all");
                      setMonthFilter("");
                    }}
                    title="Limpar Filtros"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>`;

code = code.replace(menuOld, menuNew);

fs.writeFileSync('src/pages/Financeiro.tsx', code);
