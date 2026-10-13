const fs = require('fs');

// Secretaria
let secretaria = fs.readFileSync('src/pages/Secretaria.tsx', 'utf8');
if (!secretaria.includes('PageHeader')) {
  secretaria = secretaria.replace(
    'import { Button } from "@/components/ui/button"',
    'import { Button } from "@/components/ui/button"\nimport { PageHeader } from "@/components/layout/PageHeader"'
  );
  
  const searchStr = `<div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Secretaria</h2>
            <p className="text-muted-foreground mt-1">Gestão completa de membros, certificações e ferramentas de comunicação.</p>
          </div>
          <Dialog open={isMemberModalOpen} onOpenChange={setIsMemberModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenAddModal} className="bg-primary text-primary-foreground shadow-md hover:shadow-lg transition-all" size="lg">
                <Plus className="mr-2 h-5 w-5" /> Novo Membro
              </Button>
            </DialogTrigger>
            {/* The content for this dialog is at the bottom of this grid */}
          </Dialog>
        </div>
      </div>`;
      
  const replacement = `<PageHeader 
        title="Secretaria" 
        description="Gestão completa de membros, certificações e ferramentas de comunicação."
        action={
          <Dialog open={isMemberModalOpen} onOpenChange={setIsMemberModalOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenAddModal} className="bg-white text-blue-600 hover:bg-slate-100 font-semibold px-6 shadow-md" size="lg">
                <Plus className="mr-2 h-5 w-5" /> Novo Membro
              </Button>
            </DialogTrigger>
            {/* Modal Content remains below */}
          </Dialog>
        }
      />`;

  secretaria = secretaria.replace(searchStr, replacement);
  fs.writeFileSync('src/pages/Secretaria.tsx', secretaria);
}

// Financeiro
let financeiro = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');
if (!financeiro.includes('PageHeader')) {
  financeiro = financeiro.replace(
    'import { Button } from "@/components/ui/button"',
    'import { Button } from "@/components/ui/button"\nimport { PageHeader } from "@/components/layout/PageHeader"'
  );
  
  const searchStrFin = `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Gestão Financeira</h2>
          <p className="text-muted-foreground mt-1">Controle de dízimos, ofertas e despesas da igreja.</p>
        </div>
        <div className="flex gap-2">
          {isFinanceiroAdmin && <Button variant="outline" onClick={() => setIsManagerModalOpen(true)}><Settings className="w-4 h-4 mr-2"/> Categorias</Button>}
          {isFinanceiroAdmin && <Button variant="outline" onClick={() => setIsImportModalOpen(true)}><FileText className="w-4 h-4 mr-2"/> Importar</Button>}
          <Button variant="outline" onClick={() => setIsReportModalOpen(true)}><Download className="w-4 h-4 mr-2"/> Relatórios</Button>
        </div>
      </div>`;
      
  const replacementFin = `<PageHeader 
        title="Gestão Financeira" 
        description="Controle de dízimos, ofertas e despesas da igreja."
        action={
          <>
            {isFinanceiroAdmin && <Button className="bg-white/20 text-white border-white/30 hover:bg-white/30 shadow-none" onClick={() => setIsManagerModalOpen(true)}><Settings className="w-4 h-4 mr-2"/> Categorias</Button>}
            {isFinanceiroAdmin && <Button className="bg-white/20 text-white border-white/30 hover:bg-white/30 shadow-none" onClick={() => setIsImportModalOpen(true)}><FileText className="w-4 h-4 mr-2"/> Importar</Button>}
            <Button className="bg-white/20 text-white border-white/30 hover:bg-white/30 shadow-none" onClick={() => setIsReportModalOpen(true)}><Download className="w-4 h-4 mr-2"/> Relatórios</Button>
          </>
        }
      />`;

  financeiro = financeiro.replace(searchStrFin, replacementFin);
  fs.writeFileSync('src/pages/Financeiro.tsx', financeiro);
}

// Configuracoes
let config = fs.readFileSync('src/pages/Configuracoes.tsx', 'utf8');
if (!config.includes('PageHeader')) {
  config = config.replace(
    'import { Button } from "@/components/ui/button"',
    'import { Button } from "@/components/ui/button"\nimport { PageHeader } from "@/components/layout/PageHeader"'
  );
  
  const searchStrConf = `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Configurações</h2>
          <p className="text-muted-foreground mt-1">Gerencie permissões, segurança e dados da sua conta.</p>
        </div>
      </div>`;
      
  const replacementConf = `<PageHeader 
        title="Configurações" 
        description="Gerencie permissões, licenças e dados da sua conta."
      />`;

  config = config.replace(searchStrConf, replacementConf);
  fs.writeFileSync('src/pages/Configuracoes.tsx', config);
}
