const fs = require('fs');

// Patch Secretaria.tsx
let secretaria = fs.readFileSync('src/pages/Secretaria.tsx', 'utf8');
// Upgrade table headers
secretaria = secretaria.replace(/<TableHead>/g, '<TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">');
secretaria = secretaria.replace(/<TableHead className="w-\[50px\]">/g, '<TableHead className="w-[50px] font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">');
// Upgrade important rows (Names)
secretaria = secretaria.replace(/<TableCell className="font-medium">\{member.name\}<\/TableCell>/g, '<TableCell className="font-bold text-slate-800">{member.name}</TableCell>');
fs.writeFileSync('src/pages/Secretaria.tsx', secretaria);

// Patch Financeiro.tsx
let finance = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');
finance = finance.replace(/<TableHead>/g, '<TableHead className="font-semibold text-slate-600 uppercase tracking-wider text-[11px] bg-slate-50/50">');
// Upgrade important rows (Description and Amounts)
finance = finance.replace(/<TableCell className="font-medium">\{t\.description\}<\/TableCell>/g, '<TableCell className="font-bold text-slate-800">{t.description}</TableCell>');
finance = finance.replace(/<TableCell className=\{t\.type === 'entrada' \? "text-emerald-600 font-medium" : "text-rose-600 font-medium"\}>/g, '<TableCell className={t.type === "entrada" ? "text-emerald-600 font-bold tracking-tight" : "text-rose-600 font-bold tracking-tight"}>');
// Add background styling to main charts/cards in Financeiro
finance = finance.replace(/<Card className="shadow-sm border-slate-200\/60 print:shadow-none">/g, '<Card className="shadow-sm border-slate-100 bg-white/80 backdrop-blur-sm print:shadow-none rounded-2xl">');
finance = finance.replace(/<Card className="print:shadow-none">/g, '<Card className="print:shadow-none shadow-sm border-slate-100 rounded-2xl bg-white/80">');
fs.writeFileSync('src/pages/Financeiro.tsx', finance);

// Patch Configuracoes.tsx
let config = fs.readFileSync('src/pages/Configuracoes.tsx', 'utf8');
config = config.replace(/<Card>/g, '<Card className="shadow-sm border-slate-100 rounded-2xl bg-white/60 backdrop-blur-sm">');
fs.writeFileSync('src/pages/Configuracoes.tsx', config);

