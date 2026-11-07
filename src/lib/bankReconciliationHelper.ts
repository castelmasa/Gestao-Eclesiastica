import * as XLSX from "xlsx";

export interface BankStatementTransaction {
  id: string; // FITID ou gerado
  date: string; // YYYY-MM-DD
  description: string;
  amount: number;
  type: "entrada" | "saida"; // crédito = entrada, débito = saída
  documentNumber?: string;
  memo?: string;
  reconciliationStatus?: "matched" | "missing_in_church" | "missing_in_bank";
  matchedTransactionId?: string;
}

export interface BankStatementData {
  bankName: string;
  bankId?: string;
  accountNumber?: string;
  startDate?: string;
  endDate?: string;
  initialBalance?: number;
  finalBalance?: number;
  transactions: BankStatementTransaction[];
}

/**
 * Faz o parsing nativo de arquivos OFX (Open Financial Exchange), formato
 * padrão dos bancos brasileiros (Bradesco, Itaú, Banco do Brasil, Santander,
 * Caixa, Sicredi, Sicoob, NuBank, Inter, C6, etc.).
 */
export function parseOFX(ofxText: string): BankStatementData {
  const transactions: BankStatementTransaction[] = [];
  let bankName = "Extrato Bancário";
  let bankId = "";
  let accountNumber = "";
  let startDate = "";
  let endDate = "";
  let finalBalance: number | undefined;

  // Extrai Informações de Banco e Conta
  const bankIdMatch = ofxText.match(/<BANKID>([^<\r\n]+)/i);
  if (bankIdMatch) bankId = bankIdMatch[1].trim();

  const acctIdMatch = ofxText.match(/<ACCTID>([^<\r\n]+)/i);
  if (acctIdMatch) accountNumber = acctIdMatch[1].trim();

  // Mapeia alguns códigos de bancos comuns
  if (bankId === "001") bankName = "Banco do Brasil";
  else if (bankId === "237") bankName = "Bradesco";
  else if (bankId === "341") bankName = "Itaú";
  else if (bankId === "104") bankName = "Caixa Econômica Federal";
  else if (bankId === "033") bankName = "Santander";
  else if (bankId === "748") bankName = "Sicredi";
  else if (bankId === "756") bankName = "Sicoob";
  else if (bankId === "260") bankName = "NuBank";
  else if (bankId === "077") bankName = "Banco Inter";
  else if (accountNumber) bankName = `Banco (Conta: ${accountNumber})`;

  // Período
  const dtStartMatch = ofxText.match(/<DTSTART>([^<\r\n]+)/i);
  if (dtStartMatch) startDate = formatOfxDate(dtStartMatch[1].trim());

  const dtEndMatch = ofxText.match(/<DTEND>([^<\r\n]+)/i);
  if (dtEndMatch) endDate = formatOfxDate(dtEndMatch[1].trim());

  // Saldo final
  const balMatch = ofxText.match(/<BALAMT>([^<\r\n]+)/i);
  if (balMatch) {
    const rawBal = balMatch[1].trim().replace(",", ".");
    finalBalance = parseFloat(rawBal);
  }

  // Extrai cada bloco <STMTTRN>...</STMTTRN>
  const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  let match;
  let counter = 1;

  while ((match = trnRegex.exec(ofxText)) !== null) {
    const trnBlock = match[1];

    const typeMatch = trnBlock.match(/<TRNTYPE>([^<\r\n]+)/i);
    const dateMatch = trnBlock.match(/<DTPOSTED>([^<\r\n]+)/i);
    const amtMatch = trnBlock.match(/<TRNAMT>([^<\r\n]+)/i);
    const fitIdMatch = trnBlock.match(/<FITID>([^<\r\n]+)/i);
    const memoMatch = trnBlock.match(/<MEMO>([^<\r\n]+)/i);
    const nameMatch = trnBlock.match(/<NAME>([^<\r\n]+)/i);
    const checkNumMatch = trnBlock.match(/<CHECKNUM>([^<\r\n]+)/i);

    if (amtMatch && dateMatch) {
      const rawAmt = parseFloat(amtMatch[1].trim().replace(",", "."));
      const isPositive = rawAmt >= 0;
      const cleanDate = formatOfxDate(dateMatch[1].trim());
      const memo = memoMatch ? memoMatch[1].trim() : (nameMatch ? nameMatch[1].trim() : "Lançamento Bancário");
      const fitId = fitIdMatch ? fitIdMatch[1].trim() : `ofx_${cleanDate}_${counter}`;

      transactions.push({
        id: fitId,
        date: cleanDate,
        description: memo,
        amount: Math.abs(rawAmt),
        type: isPositive ? "entrada" : "saida",
        documentNumber: checkNumMatch ? checkNumMatch[1].trim() : undefined,
        memo,
      });

      counter++;
    }
  }

  // Ordena por data (mais recente primeiro ou cronológico)
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  return {
    bankName,
    bankId,
    accountNumber,
    startDate,
    endDate,
    finalBalance,
    transactions,
  };
}

/**
 * Converte data OFX (YYYYMMDD ou YYYYMMDDHHMMSS) para YYYY-MM-DD
 */
function formatOfxDate(rawDate: string): string {
  if (!rawDate || rawDate.length < 8) return new Date().toISOString().substring(0, 10);
  const year = rawDate.substring(0, 4);
  const month = rawDate.substring(4, 6);
  const day = rawDate.substring(6, 8);
  return `${year}-${month}-${day}`;
}

/**
 * Faz o parsing de planilhas Excel (.xlsx/.xls) ou CSV de extrato bancário
 */
export async function parseSpreadsheetStatement(file: File): Promise<BankStatementData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        const transactions: BankStatementTransaction[] = [];
        let counter = 1;

        // Tenta identificar as colunas (Data, Descrição, Valor ou Débito/Crédito)
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 3) continue;

          // Procura por campos que pareçam data
          const firstCol = String(row[0] || "").trim();
          const secondCol = String(row[1] || "").trim();

          const parsedDate = tryParseDate(firstCol) || tryParseDate(secondCol);
          if (!parsedDate) continue;

          // Procura pelo valor numérico
          let amount = 0;
          let isEntry = true;
          let desc = "";

          for (let j = 0; j < row.length; j++) {
            const cell = row[j];
            if (typeof cell === "number") {
              amount = Math.abs(cell);
              isEntry = cell >= 0;
            } else if (typeof cell === "string") {
              const num = parsePtBrNumber(cell);
              if (num !== null && num !== 0) {
                amount = Math.abs(num);
                isEntry = num >= 0 || cell.includes("+");
              } else if (cell.length > 3 && !cell.includes("/") && !desc) {
                desc = cell;
              }
            }
          }

          if (amount > 0) {
            transactions.push({
              id: `excel_${parsedDate}_${counter++}`,
              date: parsedDate,
              description: desc || "Lançamento em Extrato",
              amount,
              type: isEntry ? "entrada" : "saida",
            });
          }
        }

        resolve({
          bankName: file.name.replace(/\.[^/.]+$/, ""),
          transactions,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

function tryParseDate(str: string): string | null {
  if (!str) return null;
  // Formato DD/MM/YYYY
  const ptMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (ptMatch) {
    const day = ptMatch[1].padStart(2, "0");
    const month = ptMatch[2].padStart(2, "0");
    const year = ptMatch[3].length === 2 ? `20${ptMatch[3]}` : ptMatch[3];
    return `${year}-${month}-${day}`;
  }
  // Formato YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, "0");
    const day = isoMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return null;
}

function parsePtBrNumber(str: string): number | null {
  if (!str) return null;
  const clean = str.replace(/[R$\s]/g, "").trim();
  if (!clean || !/[\d]/.test(clean)) return null;

  // Se tiver formato brasileiro 1.234,56
  if (clean.includes(",") && clean.includes(".")) {
    const normalized = clean.replace(/\./g, "").replace(",", ".");
    const val = parseFloat(normalized);
    return isNaN(val) ? null : val;
  }
  if (clean.includes(",")) {
    const val = parseFloat(clean.replace(",", "."));
    return isNaN(val) ? null : val;
  }
  const val = parseFloat(clean);
  return isNaN(val) ? null : val;
}

export interface ReconciliationResult {
  matchedCount: number;
  missingInChurchCount: number;
  missingInBankCount: number;
  totalStatementEntradas: number;
  totalStatementSaidas: number;
  totalChurchEntradas: number;
  totalChurchSaidas: number;
  matchedItems: { statementTx: BankStatementTransaction; churchTx: any }[];
  missingInChurchItems: BankStatementTransaction[];
  missingInBankItems: any[];
}

/**
 * Motor de Conciliação Contábil Automática
 * Compara as transações do extrato bancário com os lançamentos do sistema da igreja.
 */
export function runBankReconciliation(
  statementTransactions: BankStatementTransaction[],
  churchTransactions: any[]
): ReconciliationResult {
  const matchedItems: { statementTx: BankStatementTransaction; churchTx: any }[] = [];
  const missingInChurchItems: BankStatementTransaction[] = [];
  const usedChurchTxIds = new Set<string>();

  let totalStatementEntradas = 0;
  let totalStatementSaidas = 0;

  statementTransactions.forEach((stmtTx) => {
    if (stmtTx.type === "entrada") totalStatementEntradas += stmtTx.amount;
    else totalStatementSaidas += stmtTx.amount;

    // Procura transação equivalente no caixa da igreja
    // Critérios: Mesmo tipo, mesmo valor (diferença < 0.05) e data próxima (+- 3 dias)
    const match = churchTransactions.find((chTx) => {
      if (usedChurchTxIds.has(chTx.id)) return false;
      if (chTx.type !== stmtTx.type) return false;

      const diffAmount = Math.abs(Number(chTx.amount || 0) - stmtTx.amount);
      if (diffAmount > 0.05) return false;

      // Compara datas
      if (chTx.date && stmtTx.date) {
        const d1 = new Date(chTx.date).getTime();
        const d2 = new Date(stmtTx.date).getTime();
        const diffDays = Math.abs((d1 - d2) / (1000 * 60 * 60 * 24));
        if (diffDays <= 3) return true;
      }
      return false;
    });

    if (match) {
      usedChurchTxIds.add(match.id);
      stmtTx.reconciliationStatus = "matched";
      stmtTx.matchedTransactionId = match.id;
      matchedItems.push({ statementTx: stmtTx, churchTx: match });
    } else {
      stmtTx.reconciliationStatus = "missing_in_church";
      missingInChurchItems.push(stmtTx);
    }
  });

  // Identifica itens do caixa da igreja que não constam no extrato
  let totalChurchEntradas = 0;
  let totalChurchSaidas = 0;
  const missingInBankItems: any[] = [];

  churchTransactions.forEach((chTx) => {
    if (chTx.type === "entrada") totalChurchEntradas += Number(chTx.amount || 0);
    else totalChurchSaidas += Number(chTx.amount || 0);

    if (!usedChurchTxIds.has(chTx.id)) {
      missingInBankItems.push(chTx);
    }
  });

  return {
    matchedCount: matchedItems.length,
    missingInChurchCount: missingInChurchItems.length,
    missingInBankCount: missingInBankItems.length,
    totalStatementEntradas,
    totalStatementSaidas,
    totalChurchEntradas,
    totalChurchSaidas,
    matchedItems,
    missingInChurchItems,
    missingInBankItems,
  };
}
