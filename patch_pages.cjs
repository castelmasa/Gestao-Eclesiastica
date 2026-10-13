const fs = require('fs');

function applyPageHeader(filename, title, descText, actionMatchRegex) {
  if (!fs.existsSync(filename)) return;
  let code = fs.readFileSync(filename, 'utf8');
  
  if (!code.includes('PageHeader')) {
    code = code.replace(
      'import { Button } from "@/components/ui/button"',
      'import { Button } from "@/components/ui/button"\nimport { PageHeader } from "@/components/layout/PageHeader"'
    );
  }
  
  // A generic way to find the header div and replace it
  const headerStartStr = '<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">';
  
  if (code.includes(headerStartStr)) {
    const startIdx = code.indexOf(headerStartStr);
    const endIdx = code.indexOf('</div>\n      </div>', startIdx) + 18; // Close of the outer div
    
    if (startIdx !== -1 && endIdx !== -1) {
      // Extract the actions block if needed
      let originalHeaderBlock = code.substring(startIdx, endIdx);
      let newHeader = `
      <PageHeader 
        title="${title}" 
        description="${descText}"
      />
      `;
      // If we need to preserve actions, we can try to find buttons
      // For now, let's keep it simple or manually patch if there are actions.
      
      code = code.substring(0, startIdx) + newHeader + code.substring(endIdx);
    }
  }
  
  fs.writeFileSync(filename, code);
}

// Financeiro
let financeiro = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');
if (!financeiro.includes('PageHeader')) {
  financeiro = financeiro.replace(
    'import { Button } from "@/components/ui/button"',
    'import { Button } from "@/components/ui/button"\nimport { PageHeader } from "@/components/layout/PageHeader"'
  );
  
  const startIdx = financeiro.indexOf('<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">');
  const endIdx = financeiro.indexOf('</div>\n      </div>', startIdx) + 18;
  if (startIdx !== -1 && endIdx !== -1) {
     financeiro = financeiro.substring(0, startIdx) + `
      <PageHeader 
        title="Gestão Financeira" 
        description="Controle de dízimos, ofertas e despesas da igreja."
        action={
          <div className="flex gap-2">
             <Button variant="outline" className="bg-white/20 text-white border-white/30 hover:bg-white/30" onClick={() => setIsManagerModalOpen(true)}><Settings className="w-4 h-4 mr-2"/> Categorias</Button>
             <Button variant="outline" className="bg-white/20 text-white border-white/30 hover:bg-white/30" onClick={() => setIsImportModalOpen(true)}><FileText className="w-4 h-4 mr-2"/> Importar</Button>
             <Button variant="outline" className="bg-white/20 text-white border-white/30 hover:bg-white/30" onClick={() => setIsReportModalOpen(true)}><Download className="w-4 h-4 mr-2"/> Relatórios</Button>
          </div>
        }
      />
     ` + financeiro.substring(endIdx);
  }
  fs.writeFileSync('src/pages/Financeiro.tsx', financeiro);
}

// Secretaria
let secretaria = fs.readFileSync('src/pages/Secretaria.tsx', 'utf8');
if (!secretaria.includes('PageHeader')) {
  secretaria = secretaria.replace(
    'import { Button } from "@/components/ui/button"',
    'import { Button } from "@/components/ui/button"\nimport { PageHeader } from "@/components/layout/PageHeader"'
  );
  const startIdx = secretaria.indexOf('<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">');
  const endIdx = secretaria.indexOf('</div>\n      </div>', startIdx) + 18;
  if (startIdx !== -1 && endIdx !== -1) {
     secretaria = secretaria.substring(0, startIdx) + `
      <PageHeader 
        title="Secretaria" 
        description="Gestão de membros, documentos e comunicação."
        action={
          <Button onClick={() => { setEditingMember(null); setIsMemberModalOpen(true); }} className="bg-white text-blue-600 hover:bg-slate-100 font-semibold px-6">
            <Plus className="mr-2 h-4 w-4" /> Novo Membro
          </Button>
        }
      />
     ` + secretaria.substring(endIdx);
  }
  fs.writeFileSync('src/pages/Secretaria.tsx', secretaria);
}

// Configuracoes
let configuracoes = fs.readFileSync('src/pages/Configuracoes.tsx', 'utf8');
if (!configuracoes.includes('PageHeader')) {
  configuracoes = configuracoes.replace(
    'import { Button } from "@/components/ui/button"',
    'import { Button } from "@/components/ui/button"\nimport { PageHeader } from "@/components/layout/PageHeader"'
  );
  const startIdx = configuracoes.indexOf('<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">');
  const endIdx = configuracoes.indexOf('</div>\n      </div>', startIdx) + 18;
  if (startIdx !== -1 && endIdx !== -1) {
     configuracoes = configuracoes.substring(0, startIdx) + `
      <PageHeader 
        title="Configurações do Sistema" 
        description="Gerencie permissões, licenças e filiais."
      />
     ` + configuracoes.substring(endIdx);
  }
  fs.writeFileSync('src/pages/Configuracoes.tsx', configuracoes);
}

// Auditoria
if (fs.existsSync('src/pages/Auditoria.tsx')) {
  let auditoria = fs.readFileSync('src/pages/Auditoria.tsx', 'utf8');
  if (!auditoria.includes('PageHeader')) {
    auditoria = auditoria.replace(
      'import { Button } from "@/components/ui/button"',
      'import { Button } from "@/components/ui/button"\nimport { PageHeader } from "@/components/layout/PageHeader"'
    );
    const startIdx = auditoria.indexOf('<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">');
    if (startIdx !== -1) {
      const endIdx = auditoria.indexOf('</div>\n      </div>', startIdx) + 18;
      auditoria = auditoria.substring(0, startIdx) + `
        <PageHeader 
          title="Log de Auditoria" 
          description="Acompanhe as alterações críticas no sistema."
          action={
            <Button variant="outline" className="bg-white/20 text-white border-white/30 hover:bg-white/30" onClick={() => loadAuditLogs(true)} disabled={isLoading}>
              <RefreshCw className={\`w-4 h-4 mr-2 \${isLoading ? 'animate-spin' : ''}\`} /> Atualizar
            </Button>
          }
        />
      ` + auditoria.substring(endIdx);
      fs.writeFileSync('src/pages/Auditoria.tsx', auditoria);
    }
  }
}
