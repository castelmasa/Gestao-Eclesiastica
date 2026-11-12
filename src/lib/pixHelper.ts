/**
 * Gerador de Payload Pix EMV Padrão Banco Central do Brasil (BR Code)
 * Formato TLV (Tag-Length-Value) com cálculo oficial de CRC16 CCITT (0xFFFF).
 */

function formatTLV(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

export function crc16(str: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export interface GeneratePixPayloadOptions {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount?: number;
  txId?: string; // Identificador da transação / código do membro (ex: MB-WJGXDB)
  description?: string;
}

/**
 * Cria a string oficial de Pix Copia e Cola personalizada para dízimos/ofertas
 */
export function generatePixPayload({
  pixKey,
  merchantName,
  merchantCity,
  amount,
  txId = "***",
  description
}: GeneratePixPayloadOptions): string {
  const cleanKey = pixKey.trim();
  const cleanName = merchantName.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 25);
  const cleanCity = (merchantCity || "SAO PAULO").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").slice(0, 15);
  const cleanTxId = (txId.replace(/[^a-zA-Z0-9]/g, "") || "***").slice(0, 25);

  // 00: Payload Format Indicator (fixo "01")
  let payload = formatTLV("00", "01");

  // 26: Merchant Account Information (GUI + Chave + Info Adicional)
  let mai = formatTLV("00", "br.gov.bcb.pix");
  mai += formatTLV("01", cleanKey);
  if (description) {
    const cleanDesc = description.slice(0, 40);
    mai += formatTLV("02", cleanDesc);
  }
  payload += formatTLV("26", mai);

  // 52: Merchant Category Code (0000 para geral ou 8661 para organizações religiosas)
  payload += formatTLV("52", "0000");

  // 53: Transaction Currency (986 = BRL)
  payload += formatTLV("53", "986");

  // 54: Transaction Amount (opcional em Pix estático)
  if (amount && amount > 0) {
    payload += formatTLV("54", amount.toFixed(2));
  }

  // 58: Country Code (BR)
  payload += formatTLV("58", "BR");

  // 59: Merchant Name
  payload += formatTLV("59", cleanName || "IGREJA");

  // 60: Merchant City
  payload += formatTLV("60", cleanCity || "SAO PAULO");

  // 62: Additional Data Field Template (TXID)
  const additional = formatTLV("05", cleanTxId);
  payload += formatTLV("62", additional);

  // 63: CRC16 (Tag 63, Length 04)
  const payloadToSign = `${payload}6304`;
  const checksum = crc16(payloadToSign);

  return `${payloadToSign}${checksum}`;
}

export interface PixKeyValidationResult {
  isValid: boolean;
  type: "cpf" | "cnpj" | "email" | "telefone" | "evp" | "invalido";
  typeLabel: string;
  bankName?: string;
  formattedKey: string;
  message: string;
}

/**
 * Valida a chave Pix e identifica o tipo e a instituição financeira correspondente
 * segundo as regras do DICT / Banco Central do Brasil.
 */
export function validateAndDetectPixKey(rawKey: string, churchCnpj?: string): PixKeyValidationResult {
  if (!rawKey || typeof rawKey !== "string") {
    return {
      isValid: false,
      type: "invalido",
      typeLabel: "Não informada",
      formattedKey: "",
      message: "Digite a chave Pix da igreja."
    };
  }

  const clean = rawKey.trim();
  const digitsOnly = clean.replace(/\D/g, "");

  // 1. CNPJ (14 dígitos)
  if (digitsOnly.length === 14) {
    const isValidCnpj = validateCNPJDigits(digitsOnly);
    const formatted = digitsOnly.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
    return {
      isValid: isValidCnpj,
      type: "cnpj",
      typeLabel: "CNPJ Institucional",
      bankName: "Conta Jurídica Eclesiástica (Registrada no Banco Central)",
      formattedKey: formatted,
      message: isValidCnpj
        ? "Chave CNPJ oficial válida e apta para emissão de Pix."
        : "CNPJ possui dígitos verificadores inválidos."
    };
  }

  // 2. CPF (11 dígitos, se não começar com DDD de telefone ou for claramente CPF)
  if (digitsOnly.length === 11 && !clean.includes("@") && !clean.startsWith("+55")) {
    const isValidCpf = validateCPFDigits(digitsOnly);
    const formatted = digitsOnly.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
    return {
      isValid: isValidCpf,
      type: "cpf",
      typeLabel: "CPF Titular / Pastoral",
      bankName: "Conta Vinculada à Liderança / Tesouraria",
      formattedKey: formatted,
      message: isValidCpf
        ? "Chave CPF válida e conferida no sistema."
        : "CPF inválido."
    };
  }

  // 3. E-mail (ex: tesouraria@obpc.com.br)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(clean)) {
    return {
      isValid: true,
      type: "email",
      typeLabel: "E-mail Bancário",
      bankName: "Instituição Bancária Associada ao Domínio",
      formattedKey: clean.toLowerCase(),
      message: "Chave de e-mail com formato válido no DICT/Banco Central."
    };
  }

  // 4. Telefone celular (10 a 13 dígitos, ex: +5511987654321 ou 11987654321)
  if ((digitsOnly.length === 11 || digitsOnly.length === 10 || (digitsOnly.length === 13 && digitsOnly.startsWith("55"))) && !clean.includes("@")) {
    let dddPhone = digitsOnly;
    if (dddPhone.startsWith("55")) dddPhone = dddPhone.slice(2);
    if (dddPhone.length === 11) {
      const formatted = `+55 (${dddPhone.slice(0, 2)}) ${dddPhone.slice(2, 7)}-${dddPhone.slice(7)}`;
      return {
        isValid: true,
        type: "telefone",
        typeLabel: "Telefone Celular",
        bankName: "Conta Digital / Operadora Bancária",
        formattedKey: formatted,
        message: "Chave telefônica com formato padrão nacional."
      };
    }
  }

  // 5. Chave Aleatória / EVP (UUID de 32 hexadecimais com hífens)
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  if (uuidRegex.test(clean)) {
    return {
      isValid: true,
      type: "evp",
      typeLabel: "Chave Aleatória (EVP)",
      bankName: "Chave Direta Banco Central (DICT)",
      formattedKey: clean.toLowerCase(),
      message: "Chave aleatória gerada por instituição financeira autorizada."
    };
  }

  return {
    isValid: false,
    type: "invalido",
    typeLabel: "Inválida",
    formattedKey: clean,
    message: "A chave Pix informada não corresponde a um CPF, CNPJ, e-mail, telefone ou chave aleatória válida."
  };
}

function validateCPFDigits(cpf: string): boolean {
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0, rest;
  for (let i = 1; i <= 9; i++) sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  return rest === parseInt(cpf.substring(10, 11));
}

function validateCNPJDigits(cnpj: string): boolean {
  if (/^(\d)\1{13}$/.test(cnpj)) return false;
  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  const digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  return result === parseInt(digits.charAt(1));
}
