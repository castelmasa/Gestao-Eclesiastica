export interface ParsedContact {
  id?: string;
  name: string;
  phone: string;
  email: string;
  birthDate?: string;
  address?: string;
  bairro?: string;
  cidade?: string;
  cep?: string;
  role?: string;
  notes?: string;
  org?: string;
}

/**
 * Normaliza e formata data para o padrão DD/MM/AAAA
 */
function normalizeDateToBR(dateStr?: string): string {
  if (!dateStr) return "";
  const cleaned = dateStr.trim().replace(/[^\d-]/g, "");
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    const [y, m, d] = cleaned.split("-");
    return `${d}/${m}/${y}`;
  }
  // YYYYMMDD
  if (/^\d{8}$/.test(cleaned)) {
    const y = cleaned.substring(0, 4);
    const m = cleaned.substring(4, 6);
    const d = cleaned.substring(6, 8);
    return `${d}/${m}/${y}`;
  }
  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr.trim())) {
    return dateStr.trim();
  }
  return dateStr.trim();
}

/**
 * Limpa e formata números de telefone brasileiros
 */
function formatPhone(phoneStr?: string): string {
  if (!phoneStr) return "";
  const digits = phoneStr.replace(/\D/g, "");
  if (digits.length === 11) {
    // (XX) XXXXX-XXXX
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    // (XX) XXXX-XXXX
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 13 && digits.startsWith("55")) {
    // +55 (XX) XXXXX-XXXX
    const d = digits.slice(2);
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  return phoneStr.trim();
}

/**
 * Parser para formato MECARD comum em QR Codes de contatos
 * Ex: MECARD:N:Sobrenome,Nome;TEL:11999999999;EMAIL:email@exemplo.com;ADR:Rua X, 123;;
 */
export function parseMeCard(text: string): ParsedContact | null {
  if (!text.toUpperCase().startsWith("MECARD:")) return null;

  const content = text.slice(7);
  const parts = content.split(";");
  const contact: ParsedContact = {
    name: "",
    phone: "",
    email: ""
  };

  for (const part of parts) {
    const colonIdx = part.indexOf(":");
    if (colonIdx === -1) continue;
    const key = part.slice(0, colonIdx).toUpperCase();
    const val = part.slice(colonIdx + 1).trim();

    if (key === "N") {
      // MECARD uses "Sobrenome,Nome"
      if (val.includes(",")) {
        const [last, first] = val.split(",");
        contact.name = `${first.trim()} ${last.trim()}`.trim();
      } else {
        contact.name = val;
      }
    } else if (key === "TEL") {
      if (!contact.phone) contact.phone = formatPhone(val);
    } else if (key === "EMAIL") {
      if (!contact.email) contact.email = val;
    } else if (key === "ADR") {
      contact.address = val;
    } else if (key === "BDAY") {
      contact.birthDate = normalizeDateToBR(val);
    } else if (key === "NOTE") {
      contact.notes = val;
    } else if (key === "ORG") {
      contact.org = val;
    }
  }

  return contact.name || contact.phone || contact.email ? contact : null;
}

/**
 * Parser para blocos de arquivo vCard (vCard 2.1, 3.0, 4.0)
 */
export function parseVCardBlock(block: string): ParsedContact | null {
  const lines = block
    .split(/\r\n|\r|\n/)
    .map(l => l.trim())
    .filter(Boolean);

  if (!lines.some(l => l.toUpperCase().includes("BEGIN:VCARD"))) {
    return null;
  }

  const contact: ParsedContact = {
    name: "",
    phone: "",
    email: "",
    role: "Membro"
  };

  let formattedName = "";
  let structuredName = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const rawKey = line.slice(0, colonIdx).toUpperCase();
    const val = line.slice(colonIdx + 1).trim();
    // Ex: TEL;TYPE=CELL,VOICE
    const mainKey = rawKey.split(";")[0].trim();

    switch (mainKey) {
      case "FN":
        formattedName = val;
        break;

      case "N":
        // Last;First;Middle;Prefix;Suffix
        const nParts = val.split(";");
        const last = nParts[0] || "";
        const first = nParts[1] || "";
        const middle = nParts[2] || "";
        structuredName = [first, middle, last].filter(Boolean).join(" ");
        break;

      case "TEL":
        if (!contact.phone) {
          contact.phone = formatPhone(val);
        }
        break;

      case "EMAIL":
        if (!contact.email) {
          contact.email = val;
        }
        break;

      case "BDAY":
        contact.birthDate = normalizeDateToBR(val);
        break;

      case "ADR": {
        // ADR:;;Street;City;State;PostalCode;Country
        const adrParts = val.split(";");
        const street = adrParts[2] || "";
        const city = adrParts[3] || "";
        const bairro = adrParts[4] || "";
        const cep = adrParts[5] || "";
        if (street) contact.address = street;
        if (bairro) contact.bairro = bairro;
        if (city) contact.cidade = city;
        if (cep) contact.cep = cep;
        break;
      }

      case "TITLE":
      case "ROLE":
        contact.role = val || "Membro";
        break;

      case "ORG":
        contact.org = val;
        break;

      case "NOTE":
        contact.notes = val;
        break;
    }
  }

  contact.name = formattedName || structuredName;

  if (!contact.name && !contact.phone && !contact.email) {
    return null;
  }

  return contact;
}

/**
 * Lê uma string completa de arquivo VCard e retorna todos os contatos encontrados
 */
export function parseVCardString(rawText: string): ParsedContact[] {
  const meCard = parseMeCard(rawText.trim());
  if (meCard) {
    return [meCard];
  }

  // Tenta quebrar em múltiplos blocos BEGIN:VCARD ... END:VCARD
  const blocks: string[] = [];
  const lines = rawText.split(/\r\n|\r|\n/);
  let currentBlock: string[] = [];
  let inBlock = false;

  for (const line of lines) {
    if (line.toUpperCase().includes("BEGIN:VCARD")) {
      inBlock = true;
      currentBlock = [line];
    } else if (line.toUpperCase().includes("END:VCARD")) {
      currentBlock.push(line);
      blocks.push(currentBlock.join("\n"));
      currentBlock = [];
      inBlock = false;
    } else if (inBlock) {
      currentBlock.push(line);
    }
  }

  // Se nenhum bloco com BEGIN/END foi achado mas tem conteúdo, tenta tratar como bloco único
  if (blocks.length === 0 && rawText.includes(":")) {
    const single = parseVCardBlock(rawText);
    if (single) return [single];
  }

  const results: ParsedContact[] = [];
  for (const b of blocks) {
    const parsed = parseVCardBlock(b);
    if (parsed) results.push(parsed);
  }

  return results;
}
