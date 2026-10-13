const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

if (!code.includes('Maximize,')) {
  code = code.replace(
    'import { Users, DollarSign, TrendingUp, TrendingDown, Calendar, Loader2, Download } from "lucide-react"',
    'import { Users, DollarSign, TrendingUp, TrendingDown, Calendar, Loader2, Download, Maximize } from "lucide-react"'
  );
  fs.writeFileSync('src/pages/Dashboard.tsx', code);
}
