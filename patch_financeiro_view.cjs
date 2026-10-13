const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

// Add comprovante to txData
code = code.replace(
  'receiptFileName: comprovanteName,',
  'receiptFileName: comprovanteName,\n      comprovante: comprovanteData,'
);

// Add action button for viewing attachment
const actionButtonsStr = `                    <TableCell className="text-right print:hidden">
                      <div className="flex justify-end gap-2">
`;
const actionButtonsReplacement = `                    <TableCell className="text-right print:hidden">
                      <div className="flex justify-end gap-2">
                        {t.comprovante && (
                          <Button variant="ghost" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2" onClick={() => window.open(t.comprovante, '_blank')} title="Ver Anexo">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
`;
code = code.replace(actionButtonsStr, actionButtonsReplacement);

// Make sure Download is imported if it isn't. Oh wait, we might need a different icon like FileText, Eye, etc. Let's use Eye or FileText.
if (!code.includes('Eye,')) {
    code = code.replace('Download,', 'Download, Eye,');
    code = code.replace('<Download className="h-4 w-4" />', '<Eye className="h-4 w-4" />');
} else {
    code = code.replace('<Download className="h-4 w-4" />', '<Eye className="h-4 w-4" />');
}

fs.writeFileSync('src/pages/Financeiro.tsx', code);
