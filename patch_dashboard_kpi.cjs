const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Upgrade typography for KPI numbers
code = code.replace(/<div className="text-2xl font-bold text-slate-800">\{formatCurrency\(stats\.receitas\)\}<\/div>/g, '<div className="text-3xl font-bold tracking-tight text-slate-900">{formatCurrency(stats.receitas)}</div>');
code = code.replace(/<div className="text-2xl font-bold text-slate-800">\{formatCurrency\(stats\.despesas\)\}<\/div>/g, '<div className="text-3xl font-bold tracking-tight text-slate-900">{formatCurrency(stats.despesas)}</div>');
code = code.replace(/<div className="text-2xl font-bold text-slate-800">\{formatCurrency\(stats\.saldo\)\}<\/div>/g, '<div className="text-3xl font-bold tracking-tight text-slate-900">{formatCurrency(stats.saldo)}</div>');
code = code.replace(/<div className="text-2xl font-bold text-slate-800">\{members\.length\}<\/div>/g, '<div className="text-3xl font-bold tracking-tight text-slate-900">{members.length}</div>');

fs.writeFileSync('src/pages/Dashboard.tsx', code);
