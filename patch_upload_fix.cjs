const fs = require('fs');
let code = fs.readFileSync('src/pages/Financeiro.tsx', 'utf8');

const oldUpload = `                              const file = e.target.files?.[0];
                              if (file) {
                                 setComprovanteName(file.name);
                                 setUploadProgress(0);
                                 
                                 // Simulate progress
                                 let progress = 0;
                                 const interval = setInterval(() => {
                                     progress += 25;
                                     if (progress <= 100) setUploadProgress(progress);
                                 }, 200);
                                 const reader = new FileReader();
                                 reader.onloadend = () => {
                                   clearInterval(interval);
                                   setUploadProgress(100);
                                   setTimeout(() => {
                                      setComprovanteData(reader.result as string);
                                      setUploadProgress(null);
                                      toast.success("Documento anexado com sucesso!");
                                   }, 500);
                                 };
                                 setTimeout(() => reader.readAsDataURL(file), 400); // add small delay to show bar
                              }`;
                              
const newUpload = `                              const file = e.target.files?.[0];
                              if (file) {
                                 // Check size: limit to ~1MB because Firestore limits docs to 1MB.
                                 if (file.size > 1048576) {
                                     toast.error("O arquivo é muito grande. O limite máximo é de 1MB.");
                                     return;
                                 }
                                 setComprovanteName(file.name);
                                 setUploadProgress(0);
                                 
                                 // Simulate progress
                                 let progress = 0;
                                 const interval = setInterval(() => {
                                     progress += 25;
                                     if (progress <= 100) setUploadProgress(progress);
                                 }, 200);
                                 const reader = new FileReader();
                                 reader.onloadend = () => {
                                   clearInterval(interval);
                                   setUploadProgress(100);
                                   setTimeout(() => {
                                      setComprovanteData(reader.result as string);
                                      setUploadProgress(null);
                                      toast.success("Documento anexado com sucesso!");
                                   }, 500);
                                 };
                                 setTimeout(() => reader.readAsDataURL(file), 400); // add small delay to show bar
                              }`;

code = code.replace(oldUpload, newUpload);

fs.writeFileSync('src/pages/Financeiro.tsx', code);
