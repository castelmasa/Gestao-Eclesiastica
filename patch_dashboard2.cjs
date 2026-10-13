const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const targetStr = `      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Visão Geral</h1>
          <p className="text-muted-foreground mt-1">Bem-vindo de volta, {user?.name || 'Administrador'}. Aqui está o resumo da sua congregação.</p>
        </div>
        <div className="flex flex-col text-left sm:text-right bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Status da Licença</span>
          <span className={\`text-sm font-medium \${
            user?.status === 'exempt' ? 'text-blue-600' :
            user?.status === 'expired' || (user?.expirationDate && new Date(user.expirationDate) < new Date()) ? 'text-red-600' :
            user?.status === 'trial' ? 'text-purple-600' : 'text-emerald-600'
          }\`}>
            {user?.status === 'exempt' ? 'Isento / Vitalício' :
              user?.status === 'expired' || (user?.expirationDate && new Date(user.expirationDate) < new Date()) ? 'Expirada' : 
              user?.status === 'trial' ? 'Período de Teste' : 'Licença Ativa'}
          </span>
          {user?.expirationDate && user.status !== 'exempt' && (
            <span className="text-xs text-muted-foreground mt-0.5">Vence em: {new Date(user.expirationDate).toLocaleDateString('pt-BR')}</span>
          )}
        </div>
      </div>`;

if (code.includes('Bem-vindo de volta, {user?.name || \'Administrador\'}')) {
  // Find index manually since backticks might complicate
  const startIdx = code.indexOf('<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">');
  const endIdx = code.indexOf('</div>\n      </div>', startIdx) + 18;
  
  if (startIdx !== -1 && endIdx !== -1) {
    const newHeader = `
      <PageHeader 
        title="Visão Geral" 
        description={\`Bem-vindo de volta, \${user?.name || 'Administrador'}. Aqui está o resumo da sua congregação.\`}
        action={
          <>
            <div className="flex flex-col text-left sm:text-right bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
              <span className="text-[10px] text-white/70 uppercase tracking-wider font-semibold mb-0.5">Licença</span>
              <span className="text-sm font-medium text-white">
                {user?.status === 'exempt' ? 'Vitalícia' :
                  user?.status === 'expired' || (user?.expirationDate && new Date(user.expirationDate) < new Date()) ? 'Expirada' : 
                  user?.status === 'trial' ? 'Teste' : 'Ativa'}
              </span>
            </div>
            <Button onClick={handleExportPDF} className="bg-white text-blue-600 hover:bg-slate-100 self-center whitespace-nowrap h-[54px] rounded-xl px-6 font-semibold">
              <Download className="w-4 h-4 mr-2" /> Exportar Relatório
            </Button>
          </>
        }
      />
    `;
    code = code.substring(0, startIdx) + newHeader + code.substring(endIdx);
  }
}

fs.writeFileSync('src/pages/Dashboard.tsx', code);
