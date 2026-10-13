const fs = require('fs');
let code = fs.readFileSync('src/pages/Formularios.tsx', 'utf8');

// Replace Relatorio Culto 2a via stamp
const relatorioStamp = /\{viaIdx > 0 && \(\s*<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">\s*<span className="text-\[120px\] font-black rotate-\[-45deg\] tracking-widest text-gray-200 opacity-50">\{viaIdx \+ 1\}ª VIA<\/span>\s*<\/div>\s*\)\}/g;
code = code.replace(relatorioStamp, '');

// Replace Recibo 2a via stamp inside the box
const reciboStamp = /\{viaIdx > 0 && \(\s*<div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">\s*<span className="text-\[100px\] font-black rotate-\[-15deg\] tracking-widest text-gray-200 opacity-50">\{viaIdx \+ 1\}ª VIA<\/span>\s*<\/div>\s*\)\}/g;
code = code.replace(reciboStamp, '');

// Change recibo viaIdx map to [0, 1, 2] to fit 3 per page and fix height.
const reciboBoxOld = `             return [0, 1].map((viaIdx) => (
             <div key={\`\${copyIdx}-\${viaIdx}\`} className={\`border-2 border-black rounded-xl p-4 flex flex-col gap-4 relative overflow-hidden \`}>`;
             
const reciboBoxNew = `             return [0, 1, 2].map((viaIdx) => (
             <div key={\`\${copyIdx}-\${viaIdx}\`} className={\`border-2 border-black rounded-xl p-4 flex flex-col justify-between relative overflow-hidden h-[86mm]\`}>`;
code = code.replace(reciboBoxOld, reciboBoxNew);

// Adjust gap of recibo container to be smaller so 3 fit in 297mm
const reciboContainerOld = `<div className="flex flex-col gap-8">`;
const reciboContainerNew = `<div className="flex flex-col gap-4">`;
code = code.replace(reciboContainerOld, reciboContainerNew);

// Remove the text that says "1a Via" / "2a Via" in the box
const reciboBoxTextOld = `<span className="text-[10px]">{viaIdx === 0 ? "1ª VIA" : "2ª VIA"}</span>`;
const reciboBoxTextNew = ``;
code = code.replace(reciboBoxTextOld, reciboBoxTextNew);

fs.writeFileSync('src/pages/Formularios.tsx', code);
