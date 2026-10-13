import { motion } from "motion/react";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit, Trash2, Building2, ShoppingBag, MapPin, Phone, Mail, Loader2, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";
import { isValidCPFOrCNPJ } from "@/lib/validators";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs } from "firebase/firestore";
import { TablePagination } from "@/components/ui/table-pagination";
import { logCriticalError } from "@/lib/errorLogger";

interface Fornecedor {
  id: string;
  name: string;
  document?: string;
  phone?: string;
  email?: string;
  category?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  observacoes?: string;
  createdAt?: any;
  updatedAt?: any;
}

interface PurchaseItem {
  id: string;
  date: string;
  description: string;
  category?: string;
  value: number;
  source: 'financeiro' | 'patrimonio';
}

export function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Fornecedor> | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  // Purchase History Modal
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedSupplierForHistory, setSelectedSupplierForHistory] = useState<Fornecedor | null>(null);
  const [purchases, setPurchases] = useState<PurchaseItem[]>([]);
  const [isLoadingPurchases, setIsLoadingPurchases] = useState(false);

  // Delete Confirm Dialog
  const [supplierToDelete, setSupplierToDelete] = useState<Fornecedor | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<Fornecedor>>({
    name: "",
    document: "",
    phone: "",
    email: "",
    category: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    observacoes: ""
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [paginationMode, setPaginationMode] = useState<"pagination" | "infinite">("pagination");

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'fornecedores'), (snapshot) => {
      const data: Fornecedor[] = [];
      snapshot.forEach(docSnap => {
        data.push({ id: docSnap.id, ...docSnap.data() } as Fornecedor);
      });
      setFornecedores(data);
    }, (error) => {
      console.error(error);
      toast.error("Erro ao carregar fornecedores.");
    });
    return () => unsubscribe();
  }, []);

  // Format and search CEP
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (val.length > 8) val = val.slice(0, 8);
    const formatted = val.length > 5 ? `${val.slice(0, 5)}-${val.slice(5)}` : val;
    setFormData(prev => ({ ...prev, cep: formatted }));

    if (val.length === 8) {
      setIsLoadingCep(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${val}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            logradouro: data.logradouro || prev.logradouro,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            uf: data.uf || prev.uf
          }));
          toast.success("Endereço preenchido pelo CEP!");
        } else {
          toast.error("CEP não localizado.");
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({
      name: "",
      document: "",
      phone: "",
      email: "",
      category: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",
      observacoes: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (f: Fornecedor) => {
    setEditingSupplier(f);
    setFormData({
      name: f.name || "",
      document: f.document || "",
      phone: f.phone || "",
      email: f.email || "",
      category: f.category || "",
      cep: f.cep || "",
      logradouro: f.logradouro || "",
      numero: f.numero || "",
      complemento: f.complemento || "",
      bairro: f.bairro || "",
      cidade: f.cidade || "",
      uf: f.uf || "",
      observacoes: f.observacoes || ""
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error("Informe o nome do fornecedor.");
      return;
    }

    const documentId = formData.document?.replace(/\D/g, "") || "";
    if (documentId && !isValidCPFOrCNPJ(formData.document || "")) {
      toast.error("CPF ou CNPJ inválido!");
      return;
    }

    const payload = {
      name: formData.name.trim(),
      document: formData.document || "",
      phone: formData.phone || "",
      email: formData.email || "",
      category: formData.category || "",
      cep: formData.cep || "",
      logradouro: formData.logradouro || "",
      numero: formData.numero || "",
      complemento: formData.complemento || "",
      bairro: formData.bairro || "",
      cidade: formData.cidade || "",
      uf: formData.uf || "",
      observacoes: formData.observacoes || "",
      updatedAt: serverTimestamp()
    };

    try {
      if (editingSupplier?.id) {
        await updateDoc(doc(db, 'fornecedores', editingSupplier.id), payload);
        toast.success("Fornecedor atualizado com sucesso!");
      } else {
        await addDoc(collection(db, 'fornecedores'), { ...payload, createdAt: serverTimestamp() });
        toast.success("Fornecedor cadastrado com sucesso!");
      }
      setIsModalOpen(false);
      setEditingSupplier(null);
    } catch (err: any) {
      logCriticalError({
        error: err,
        source: "database",
        severity: "critical",
        message: "Erro ao salvar fornecedor: " + (err.message || String(err)),
        context: { payload, editingId: editingSupplier?.id }
      });
      toast.error("Erro ao salvar fornecedor.");
    }
  };

  const confirmDelete = async () => {
    if (!supplierToDelete) return;
    try {
      await deleteDoc(doc(db, 'fornecedores', supplierToDelete.id));
      toast.success("Fornecedor removido com sucesso!");
      setSupplierToDelete(null);
    } catch (err: any) {
      logCriticalError({
        error: err,
        source: "database",
        severity: "error",
        message: "Erro ao remover fornecedor: " + (err.message || String(err)),
        context: { supplierId: supplierToDelete.id }
      });
      toast.error("Erro ao remover fornecedor.");
    }
  };

  // Open purchase history
  const handleOpenHistory = async (supplier: Fornecedor) => {
    setSelectedSupplierForHistory(supplier);
    setIsLoadingPurchases(true);
    setHistoryModalOpen(true);
    setPurchases([]);

    try {
      const results: PurchaseItem[] = [];

      // 1. Check transactions in financeiro
      const transSnap = await getDocs(collection(db, 'transactions'));
      transSnap.forEach(d => {
        const data = d.data();
        const matchesSupplier = 
          (data.supplier && data.supplier.toLowerCase().includes(supplier.name.toLowerCase())) ||
          (data.description && data.description.toLowerCase().includes(supplier.name.toLowerCase()));
        
        if (matchesSupplier && data.type === 'expense') {
          results.push({
            id: d.id,
            date: data.date || "",
            description: data.description || "Despesa",
            category: data.category || "Geral",
            value: Number(data.amount) || 0,
            source: 'financeiro'
          });
        }
      });

      // 2. Check assets in patrimonio
      const assetsSnap = await getDocs(collection(db, 'assets'));
      assetsSnap.forEach(d => {
        const data = d.data();
        const matchesAsset = 
          (data.supplierName && data.supplierName.toLowerCase().includes(supplier.name.toLowerCase())) ||
          (data.notes && data.notes.toLowerCase().includes(supplier.name.toLowerCase()));
        
        if (matchesAsset) {
          results.push({
            id: d.id,
            date: data.acquisitionDate || data.purchaseDate || "",
            description: `Patrimônio: ${data.name || data.tag || 'Item'}`,
            category: data.category || "Equipamento",
            value: Number(data.acquisitionValue || data.value) || 0,
            source: 'patrimonio'
          });
        }
      });

      // Sort by date descending
      results.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setPurchases(results);
    } catch (error) {
      console.error("Erro ao buscar histórico de compras:", error);
      toast.error("Não foi possível carregar o histórico completo.");
    } finally {
      setIsLoadingPurchases(false);
    }
  };

  // Filter
  const filtered = fornecedores.filter(f => 
    f.name.toLowerCase().includes(search.toLowerCase()) || 
    f.document?.includes(search) ||
    f.category?.toLowerCase().includes(search.toLowerCase()) ||
    f.cidade?.toLowerCase().includes(search.toLowerCase())
  );

  const paginatedFornecedores = paginationMode === "infinite"
    ? filtered.slice(0, currentPage * pageSize)
    : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const hasMore = currentPage * pageSize < filtered.length;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <PageHeader 
        title="Fornecedores" 
        description="Gerencie prestadores de serviços, compras, contratos e o histórico de aquisições da igreja."
      />

      <Card className="shadow-sm border border-border/60 rounded-2xl">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              Cadastro de Fornecedores e Prestadores
            </CardTitle>
            <CardDescription>
              Dados completos de contato, endereço timbrado e rastreamento de compras.
            </CardDescription>
          </div>
          <div className="flex items-center w-full sm:w-auto gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por nome, documento ou cidade..." 
                className="pl-8" 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
              />
            </div>
            <Button onClick={handleOpenAdd} className="shrink-0 bg-primary">
              <Plus className="w-4 h-4 mr-2"/> Novo Fornecedor
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border/60 overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="font-semibold text-foreground">Fornecedor / Razão Social</TableHead>
                  <TableHead className="font-semibold text-foreground">CNPJ / CPF</TableHead>
                  <TableHead className="font-semibold text-foreground">Categoria</TableHead>
                  <TableHead className="font-semibold text-foreground">Endereço / Cidade</TableHead>
                  <TableHead className="font-semibold text-foreground">Contato</TableHead>
                  <TableHead className="text-right font-semibold text-foreground">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFornecedores.length > 0 ? paginatedFornecedores.map(f => (
                  <TableRow key={f.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-semibold text-foreground">
                      <div className="flex flex-col">
                        <span>{f.name}</span>
                        {f.observacoes && (
                          <span className="text-[11px] text-muted-foreground line-clamp-1 italic">{f.observacoes}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {f.document || "-"}
                    </TableCell>
                    <TableCell>
                      {f.category ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                          {f.category}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {f.cidade ? (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground/70 shrink-0" />
                          <span>{f.logradouro ? `${f.logradouro}, ${f.numero || 's/n'}` : ''} {f.cidade}{f.uf ? ` - ${f.uf}` : ''}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Não informado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        {f.phone && (
                          <div className="flex items-center gap-1 text-foreground">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            <span>{f.phone}</span>
                          </div>
                        )}
                        {f.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span className="truncate max-w-[140px]">{f.email}</span>
                          </div>
                        )}
                        {!f.phone && !f.email && <span className="text-muted-foreground">-</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleOpenHistory(f)}
                          title="Histórico de Compras"
                          className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleOpenEdit(f)}
                          title="Editar"
                          className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => setSupplierToDelete(f)}
                          title="Remover"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground h-32">
                      <div className="flex flex-col items-center justify-center gap-1">
                        <Building2 className="w-8 h-8 opacity-20" />
                        <p>Nenhum fornecedor cadastrado ou encontrado.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {filtered.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              mode={paginationMode}
              onModeChange={setPaginationMode}
              hasMore={hasMore}
              onLoadMore={() => setCurrentPage((p) => p + 1)}
              itemName="fornecedores"
            />
          )}
        </CardContent>
      </Card>

      {/* MODAL: CADASTRO / EDIÇÃO */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {editingSupplier ? "Editar Fornecedor" : "Cadastrar Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription>
              Informe os dados cadastrais, endereço com busca automática por CEP e ramo de atividade.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 py-2">
            {/* Dados Principais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 md:col-span-2">
                <Label className="text-xs font-semibold">Nome / Razão Social *</Label>
                <Input 
                  value={formData.name || ""} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  placeholder="Ex: Comercial Elétrica Silva LTDA" 
                  required 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">CNPJ ou CPF</Label>
                <Input 
                  value={formData.document || ""} 
                  onChange={e => setFormData({ ...formData, document: e.target.value })} 
                  placeholder="00.000.000/0000-00" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Ramo / Categoria</Label>
                <Input 
                  value={formData.category || ""} 
                  onChange={e => setFormData({ ...formData, category: e.target.value })} 
                  placeholder="Ex: Equipamentos de Som, Limpeza, Gráfica" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Telefone / WhatsApp</Label>
                <Input 
                  value={formData.phone || ""} 
                  onChange={e => setFormData({ ...formData, phone: e.target.value })} 
                  placeholder="(00) 00000-0000" 
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">E-mail</Label>
                <Input 
                  type="email" 
                  value={formData.email || ""} 
                  onChange={e => setFormData({ ...formData, email: e.target.value })} 
                  placeholder="contato@empresa.com" 
                />
              </div>
            </div>

            {/* Endereço */}
            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Endereço do Fornecedor
                </span>
                {isLoadingCep && (
                  <span className="text-xs text-primary flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" /> Buscando CEP...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">CEP</Label>
                  <Input 
                    value={formData.cep || ""} 
                    onChange={handleCepChange} 
                    placeholder="00000-000" 
                    maxLength={9}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Logradouro (Rua / Av.)</Label>
                  <Input 
                    value={formData.logradouro || ""} 
                    onChange={e => setFormData({ ...formData, logradouro: e.target.value })} 
                    placeholder="Ex: Rua das Palmeiras" 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Número</Label>
                  <Input 
                    value={formData.numero || ""} 
                    onChange={e => setFormData({ ...formData, numero: e.target.value })} 
                    placeholder="Ex: 120" 
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs font-semibold">Complemento</Label>
                  <Input 
                    value={formData.complemento || ""} 
                    onChange={e => setFormData({ ...formData, complemento: e.target.value })} 
                    placeholder="Ex: Sala 04 / Galpão" 
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bairro</Label>
                  <Input 
                    value={formData.bairro || ""} 
                    onChange={e => setFormData({ ...formData, bairro: e.target.value })} 
                    placeholder="Ex: Centro" 
                  />
                </div>

                <div className="space-y-1.5 flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs font-semibold">Cidade</Label>
                    <Input 
                      value={formData.cidade || ""} 
                      onChange={e => setFormData({ ...formData, cidade: e.target.value })} 
                      placeholder="Ex: Valparaíso" 
                    />
                  </div>
                  <div className="w-16">
                    <Label className="text-xs font-semibold">UF</Label>
                    <Input 
                      value={formData.uf || ""} 
                      onChange={e => setFormData({ ...formData, uf: e.target.value.toUpperCase() })} 
                      placeholder="SP" 
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Observações */}
            <div className="border-t pt-3 space-y-1.5">
              <Label className="text-xs font-semibold">Observações / Condições Comerciais</Label>
              <Input 
                value={formData.observacoes || ""} 
                onChange={e => setFormData({ ...formData, observacoes: e.target.value })} 
                placeholder="Ex: Faturamento 30 dias, chave Pix, contrato de manutenção..." 
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-primary">Salvar Fornecedor</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: HISTÓRICO DE COMPRAS */}
      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-600" />
              Histórico de Compras e Despesas
            </DialogTitle>
            <DialogDescription>
              Compras, notas fiscais e itens de patrimônio registrados para <strong>{selectedSupplierForHistory?.name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-4">
            {isLoadingPurchases ? (
              <div className="flex flex-col items-center justify-center p-8 gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm">Buscando lançamentos no financeiro e patrimônio...</p>
              </div>
            ) : purchases.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Total de transações localizadas: {purchases.length}</span>
                  <span className="font-bold text-primary">
                    Total Acumulado: R$ {purchases.reduce((acc, p) => acc + p.value, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="rounded-xl border border-border/60 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="text-xs">Data</TableHead>
                        <TableHead className="text-xs">Descrição / Item</TableHead>
                        <TableHead className="text-xs">Origem</TableHead>
                        <TableHead className="text-xs text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="text-xs font-mono text-muted-foreground">
                            {p.date ? p.date.split('-').reverse().join('/') : "-"}
                          </TableCell>
                          <TableCell className="text-xs font-medium text-foreground">
                            {p.description}
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              p.source === 'patrimonio' 
                                ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' 
                                : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            }`}>
                              {p.source === 'patrimonio' ? 'Patrimônio' : 'Tesouraria'}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs font-bold text-right text-foreground">
                            R$ {p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-xl space-y-2">
                <FileText className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-sm">Nenhuma transação vinculada a este fornecedor até o momento.</p>
                <p className="text-xs text-muted-foreground">Ao lançar despesas no Financeiro ou cadastrar compras no Patrimônio com este nome, elas aparecerão aqui automaticamente.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      <Dialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Remover Fornecedor
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover o fornecedor <strong>{supplierToDelete?.name}</strong>? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setSupplierToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Confirmar Exclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
