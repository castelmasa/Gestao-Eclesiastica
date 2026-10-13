const fs = require('fs');
let code = fs.readFileSync('src/components/ui/dialog.tsx', 'utf8');

// 1. Restore DialogContent
code = code.replace(
  /<div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600" \/>/,
  ''
);
code = code.replace(
  /<div className="absolute bottom-0 left-0 right-0 h-3 bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-600 opacity-90" \/>/,
  ''
);

// Revert padding in DialogContent
code = code.replace(
  'gap-4 border border-border bg-background p-6 pt-8 pb-8 shadow-2xl duration-200',
  'gap-4 border border-border bg-background p-6 shadow-2xl duration-200'
);

// Adjust Close button to be white
code = code.replace(
  '<DialogPrimitive.Close className="absolute right-4 top-6 rounded-full p-1 opacity-70 ring-offset-background transition-colors hover:bg-muted hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">',
  '<DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 opacity-70 ring-offset-background transition-colors hover:bg-white/20 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none text-white">'
);

// 2. Modify DialogHeader
code = code.replace(
  /"flex flex-col space-y-1\.5 text-center sm:text-left",/,
  '"flex flex-col space-y-1.5 text-center sm:text-left -mx-6 -mt-6 px-6 pt-6 pb-6 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600",'
);

// 3. Modify DialogFooter
code = code.replace(
  /"flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",/,
  '"flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 -mx-6 -mb-6 px-6 py-4 mt-6 bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-600",'
);

// 4. Modify DialogTitle text color
code = code.replace(
  /"text-xl font-semibold leading-none tracking-tight text-foreground",/,
  '"text-xl font-semibold leading-none tracking-tight text-white",'
);

// 5. Modify DialogDescription text color
code = code.replace(
  /"text-sm text-muted-foreground",/,
  '"text-sm text-white/80",'
);

fs.writeFileSync('src/components/ui/dialog.tsx', code);
