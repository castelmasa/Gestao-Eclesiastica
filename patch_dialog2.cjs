const fs = require('fs');
let code = fs.readFileSync('src/components/ui/dialog.tsx', 'utf8');

// The user wants thicker gradient bars, similar to the attached image.
// Change h-2 (8px) to h-4 (16px) or h-3 (12px) for the top, and h-1.5 (6px) to h-3 (12px) for the bottom.
// Based on the image, the top bar is quite prominent, maybe 12px or 16px.

code = code.replace(
  'className="absolute top-0 left-0 right-0 h-2',
  'className="absolute top-0 left-0 right-0 h-4'
);

code = code.replace(
  'className="absolute bottom-0 left-0 right-0 h-1.5',
  'className="absolute bottom-0 left-0 right-0 h-3'
);

// We should also adjust padding of the main container and headers if needed to not overlap with the thicker borders
// Originally it's p-6. We can add pt-8 and pb-8 to ensure there is enough space.
code = code.replace(
  /gap-4 border border-border bg-background p-6 shadow-2xl/,
  'gap-4 border border-border bg-background p-6 pt-8 pb-8 shadow-2xl'
);

// Adjust close button again
code = code.replace(
  /className="absolute right-4 top-5/,
  'className="absolute right-4 top-6'
);

fs.writeFileSync('src/components/ui/dialog.tsx', code);
