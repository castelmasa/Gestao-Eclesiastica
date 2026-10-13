const fs = require('fs');

// Agenda
if (fs.existsSync('src/pages/Agenda.tsx')) {
  let agenda = fs.readFileSync('src/pages/Agenda.tsx', 'utf8');
  if (!agenda.includes('PageHeader')) {
    agenda = agenda.replace(
      'import { Button } from "@/components/ui/button"',
      'import { Button } from "@/components/ui/button"\nimport { PageHeader } from "@/components/layout/PageHeader"'
    );
    
    const searchStr = `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Agenda</h2>
          <p className="text-muted-foreground mt-1">Gerencie os eventos, cultos e reuniões da igreja.</p>
        </div>
        <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAddModal}><Plus className="mr-2 h-4 w-4" /> Novo Evento</Button>
          </DialogTrigger>`;
          
    const replacement = `<PageHeader 
          title="Agenda" 
          description="Gerencie os eventos, cultos e reuniões da igreja."
          action={
            <Dialog open={isEventModalOpen} onOpenChange={setIsEventModalOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleOpenAddModal} className="bg-white text-blue-600 hover:bg-slate-100 font-semibold px-6 shadow-md"><Plus className="mr-2 h-4 w-4" /> Novo Evento</Button>
              </DialogTrigger>
          }
        />`;

    agenda = agenda.replace(searchStr, replacement);
    // Actually the DialogTrigger is inside a Dialog. 
    // Wait, let's just replace the header div if we can find it.
  }
}

// Auditoria
if (fs.existsSync('src/pages/Auditoria.tsx')) {
  let auditoria = fs.readFileSync('src/pages/Auditoria.tsx', 'utf8');
  if (!auditoria.includes('PageHeader')) {
    auditoria = auditoria.replace(
      'import { Button } from "@/components/ui/button"',
      'import { Button } from "@/components/ui/button"\nimport { PageHeader } from "@/components/layout/PageHeader"'
    );
    
    const searchStr = `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Auditoria do Sistema</h2>
          <p className="text-muted-foreground mt-1">Acompanhe as alterações críticas realizadas no sistema.</p>
        </div>
        <Button variant="outline" onClick={() => loadAuditLogs(true)} disabled={isLoading}>
          <RefreshCw className={\`w-4 h-4 mr-2 \${isLoading ? 'animate-spin' : ''}\`} /> 
          Atualizar
        </Button>
      </div>`;
          
    const replacement = `<PageHeader 
        title="Auditoria do Sistema" 
        description="Acompanhe as alterações críticas realizadas no sistema."
        action={
          <Button variant="outline" className="bg-white/20 text-white border-white/30 hover:bg-white/30" onClick={() => loadAuditLogs(true)} disabled={isLoading}>
            <RefreshCw className={\`w-4 h-4 mr-2 \${isLoading ? 'animate-spin' : ''}\`} /> Atualizar
          </Button>
        }
      />`;

    auditoria = auditoria.replace(searchStr, replacement);
    fs.writeFileSync('src/pages/Auditoria.tsx', auditoria);
  }
}

// Fornecedores
if (fs.existsSync('src/pages/Fornecedores.tsx')) {
  let fornecedores = fs.readFileSync('src/pages/Fornecedores.tsx', 'utf8');
  if (!fornecedores.includes('PageHeader')) {
    fornecedores = fornecedores.replace(
      'import { Button } from "@/components/ui/button"',
      'import { Button } from "@/components/ui/button"\nimport { PageHeader } from "@/components/layout/PageHeader"'
    );
    
    const searchStr = `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground">Fornecedores e Doadores</h2>
          <p className="text-muted-foreground mt-1">Gerencie as entidades com as quais a igreja realiza transações.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenAddModal}><Plus className="mr-2 h-4 w-4" /> Novo Contato</Button>
          </DialogTrigger>`;
          
    // Let's not mess with Fornecedores if it cuts Dialog off. Let's just regex the div.
  }
}
