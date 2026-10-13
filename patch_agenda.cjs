const fs = require('fs');

let agenda = fs.readFileSync('src/pages/Agenda.tsx', 'utf8');
if (!agenda.includes('PageHeader')) {
  agenda = agenda.replace(
    'import { Button } from "@/components/ui/button"',
    'import { Button } from "@/components/ui/button"\nimport { PageHeader } from "@/components/layout/PageHeader"'
  );
  
  const searchStr = `<div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Agenda & Eventos</h1>
          <p className="text-muted-foreground mt-1">Gestão global de cultos, reuniões e programações.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => {
            handleSelectSlot({ start: new Date(), end: new Date() });
          }} className="bg-primary hover:bg-primary/90 text-white shadow-sm">
            <Plus className="mr-2 h-4 w-4" /> Novo Evento
          </Button>
        </div>
      </div>`;
          
  const replacement = `<PageHeader 
        title="Agenda & Eventos" 
        description="Gestão global de cultos, reuniões e programações."
        action={
          <Button onClick={() => { handleSelectSlot({ start: new Date(), end: new Date() }); }} className="bg-white text-blue-600 hover:bg-slate-100 font-semibold px-6 shadow-md">
            <Plus className="mr-2 h-4 w-4" /> Novo Evento
          </Button>
        }
      />`;

  agenda = agenda.replace(searchStr, replacement);
  fs.writeFileSync('src/pages/Agenda.tsx', agenda);
}
