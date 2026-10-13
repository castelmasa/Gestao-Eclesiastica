const fs = require('fs');

let fornecedores = fs.readFileSync('src/pages/Fornecedores.tsx', 'utf8');
if (!fornecedores.includes('PageHeader')) {
  fornecedores = fornecedores.replace(
    'import { Button } from "@/components/ui/button"',
    'import { Button } from "@/components/ui/button"\nimport { PageHeader } from "@/components/layout/PageHeader"'
  );
  
  const searchStr = `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-8 h-8" />
            Fornecedores
          </h2>
          <p className="text-muted-foreground mt-1">Gerencie os prestadores de serviço e fornecedores.</p>
        </div>
      </div>`;
          
  const replacement = `<PageHeader 
        title="Fornecedores" 
        description="Gerencie os prestadores de serviço e fornecedores da congregação."
      />`;

  fornecedores = fornecedores.replace(searchStr, replacement);
  fs.writeFileSync('src/pages/Fornecedores.tsx', fornecedores);
}
