const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

const additionalState = `
  const [chartCategoryFilter, setChartCategoryFilter] = useState("all");
  const [chartCostCenterFilter, setChartCostCenterFilter] = useState("all");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  
  const generateFechamentoPDF = () => toast.info("Gerando Fechamento...");
  const churchData = { 
    name: "Igreja Local", 
    address: "Rua Principal, 123", 
    phone: "(00) 0000-0000", 
    logo: "" 
  };
`;

code = code.replace(
  'const [members, setMembers] = useState<any[]>([]);',
  'const [members, setMembers] = useState<any[]>([]);\n' + additionalState
);

fs.writeFileSync('src/pages/Financeiro.tsx', code);
