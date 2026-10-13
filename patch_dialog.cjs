const fs = require('fs');
let code = fs.readFileSync('src/components/ui/dialog.tsx', 'utf8');

// Add overflow-hidden and top/bottom decorative stripes
code = code.replace(
  'sm:rounded-[1.5rem]",',
  'sm:rounded-[1.5rem] overflow-hidden",'
);

code = code.replace(
  '{children}',
  `<div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600" />
      {children}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-600 opacity-90" />`
);

// Adjust close button position to not clash with the top stripe
code = code.replace(
  '<DialogPrimitive.Close className="absolute right-4 top-4',
  '<DialogPrimitive.Close className="absolute right-4 top-5'
);

fs.writeFileSync('src/components/ui/dialog.tsx', code);
