const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

// The condition for showing the paperclip currently checks `t.comprovante`.
// But it's possible that `t.comprovante` is null while `t.receiptFileName` exists (from earlier versions or missing fields).
// Also if the user clicks it, it should open it. If there is no data URL but just a filename, they can't open it anyway.
// Wait, why did the user see `receiptFileName` in edit, but no paperclip?
// Because `t.comprovante` is falsy for that transaction. 
// We should check `t.comprovante || t.receiptFileName` to show the clip, and handle the click accordingly.

const oldPaperclip = `                    <TableCell className="text-center">
                      {t.comprovante ? (
                         <Button variant="ghost" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 h-8" onClick={() => window.open(t.comprovante, '_blank')} title="Ver Anexo">
                           <Paperclip className="h-4 w-4" />
                         </Button>
                      ) : (
                         <span className="text-slate-300">-</span>
                      )}
                    </TableCell>`;
                    
const newPaperclip = `                    <TableCell className="text-center">
                      {(t.comprovante || t.receiptFileName) ? (
                         <Button variant="ghost" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 h-8" onClick={() => {
                             if (t.comprovante) {
                                window.open(t.comprovante, '_blank');
                             } else {
                                toast.error("O arquivo original não está disponível no banco de dados.");
                             }
                         }} title={t.receiptFileName || "Ver Anexo"}>
                           <Paperclip className="h-4 w-4" />
                         </Button>
                      ) : (
                         <span className="text-slate-300">-</span>
                      )}
                    </TableCell>`;

code = code.replace(oldPaperclip, newPaperclip);

fs.writeFileSync('src/pages/Financeiro.tsx', code);
