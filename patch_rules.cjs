const fs = require('fs');
let code = fs.readFileSync('firestore.rules', 'utf8');

const newRules = `
    // --- Categories ---
    match /categories/{categoryId} {
      allow read: if isSignedIn();
      allow create, update, delete: if hasFinanceRole();
    }
`;

code = code.replace(
  '// --- Audit Logs ---',
  newRules + '\n    // --- Audit Logs ---'
);

fs.writeFileSync('firestore.rules', code);
