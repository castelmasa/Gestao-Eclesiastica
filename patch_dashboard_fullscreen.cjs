const fs = require('fs');
let code = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

const fullscreenBtn = `
            <Button onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch((err) => {
                  toast.error("Erro ao ativar tela cheia: " + err.message);
                });
              } else {
                document.exitFullscreen();
              }
            }} variant="outline" className="bg-white/10 text-white hover:bg-white/20 border-white/20 self-center whitespace-nowrap h-[54px] rounded-xl px-4 font-semibold hidden md:flex">
              <Maximize className="w-4 h-4 mr-2" /> Tela Cheia
            </Button>
            <Button onClick={handleExportPDF} className="bg-white text-blue-600 hover:bg-slate-100 self-center whitespace-nowrap h-[54px] rounded-xl px-6 font-semibold">
`;

code = code.replace(
  '<Button onClick={handleExportPDF} className="bg-white text-blue-600 hover:bg-slate-100 self-center whitespace-nowrap h-[54px] rounded-xl px-6 font-semibold">',
  fullscreenBtn
);

// We need to import Maximize if not imported
if (!code.includes('Maximize')) {
  code = code.replace('Download', 'Download, Maximize');
}

fs.writeFileSync('src/pages/Dashboard.tsx', code);
