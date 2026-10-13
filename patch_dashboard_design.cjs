const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

// Replace the main div to include a gradient background
code = code.replace(
  '<motion.div\n      initial={{ opacity: 0, y: 15 }}',
  '<motion.div\n      initial={{ opacity: 0, y: 15 }}'
);

// We need to replace the 4 KPI cards.
// First, find the block.
const oldCardsRegex = /\{\/\* Main KPI Cards \*\/\}\s*<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">[\s\S]*?(?=<\/div>\s*<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-6">)/;

const newCards = `{/* Main KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-emerald-100/60 bg-gradient-to-br from-emerald-50/50 to-white hover:shadow-md transition-all duration-300 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="w-32 h-32 text-emerald-600" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between space-y-0 pb-4">
              <p className="text-sm font-semibold text-emerald-800/80 uppercase tracking-wider">Receitas do Mês</p>
              <div className="p-2.5 bg-emerald-100/80 text-emerald-700 rounded-xl shadow-sm">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-3xl font-bold tracking-tight text-emerald-950">{formatCurrency(stats.receitas)}</div>
              <p className="text-sm font-medium text-emerald-700/70 mt-1">Dízimos e Ofertas</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-rose-100/60 bg-gradient-to-br from-rose-50/50 to-white hover:shadow-md transition-all duration-300 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingDown className="w-32 h-32 text-rose-600" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between space-y-0 pb-4">
              <p className="text-sm font-semibold text-rose-800/80 uppercase tracking-wider">Despesas do Mês</p>
              <div className="p-2.5 bg-rose-100/80 text-rose-700 rounded-xl shadow-sm">
                <TrendingDown className="h-5 w-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-3xl font-bold tracking-tight text-rose-950">{formatCurrency(stats.despesas)}</div>
              <p className="text-sm font-medium text-rose-700/70 mt-1">Custos fixos e variáveis</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-blue-100/60 bg-gradient-to-br from-blue-50/50 to-white hover:shadow-md transition-all duration-300 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Wallet className="w-32 h-32 text-blue-600" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between space-y-0 pb-4">
              <p className="text-sm font-semibold text-blue-800/80 uppercase tracking-wider">Saldo Atual</p>
              <div className="p-2.5 bg-blue-100/80 text-blue-700 rounded-xl shadow-sm">
                <Wallet className="h-5 w-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-3xl font-bold tracking-tight text-blue-950">{formatCurrency(stats.saldo)}</div>
              <p className="text-sm font-medium text-blue-700/70 mt-1">Fluxo de caixa livre</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-indigo-100/60 bg-gradient-to-br from-indigo-50/50 to-white hover:shadow-md transition-all duration-300 rounded-2xl relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="w-32 h-32 text-indigo-600" />
          </div>
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between space-y-0 pb-4">
              <p className="text-sm font-semibold text-indigo-800/80 uppercase tracking-wider">Membros Ativos</p>
              <div className="p-2.5 bg-indigo-100/80 text-indigo-700 rounded-xl shadow-sm">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <div className="flex flex-col">
              <div className="text-3xl font-bold tracking-tight text-indigo-950">{members.length}</div>
              <p className="text-sm font-medium text-indigo-700/70 mt-1">Cadastrados no sistema</p>
            </div>
          </CardContent>
        </Card>`;

code = code.replace(oldCardsRegex, newCards);

fs.writeFileSync('src/pages/Dashboard.tsx', code);
