// Utility to convert currency values to written words in Portuguese (Brazilian Real)

const unidades = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove"];
const especiais = ["dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const dezenas = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const centenas = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];

function converteGrupo(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  
  const c = Math.floor(n / 100);
  const d = Math.floor((n % 100) / 10);
  const u = n % 10;
  
  const partes: string[] = [];
  
  if (c > 0) partes.push(centenas[c]);
  
  if (d === 1) {
    partes.push(especiais[u]);
  } else {
    if (d > 1) partes.push(dezenas[d]);
    if (u > 0) partes.push(unidades[u]);
  }
  
  return partes.join(" e ");
}

export function valorPorExtenso(valorNum: number | string): string {
  if (typeof valorNum === "string") {
    // Clean currency formatting
    const cleaned = valorNum
      .replace(/[^\d.,]/g, "")
      .replace(/\./g, "")
      .replace(",", ".");
    valorNum = parseFloat(cleaned);
  }
  
  if (isNaN(valorNum) || valorNum <= 0) return "";
  
  const inteiro = Math.floor(valorNum);
  const centavos = Math.round((valorNum - inteiro) * 100);
  
  const partes: string[] = [];
  
  if (inteiro > 0) {
    const milhoes = Math.floor(inteiro / 1000000);
    const milhares = Math.floor((inteiro % 1000000) / 1000);
    const resto = inteiro % 1000;
    
    if (milhoes > 0) {
      const txtMilhao = milhoes === 1 ? "um milhão" : `${converteGrupo(milhoes)} milhões`;
      partes.push(txtMilhao);
    }
    
    if (milhares > 0) {
      const txtMilhar = milhares === 1 ? "mil" : `${converteGrupo(milhares)} mil`;
      partes.push(txtMilhar);
    }
    
    if (resto > 0) {
      partes.push(converteGrupo(resto));
    }
    
    const moeda = inteiro === 1 ? "real" : "reais";
    partes.push(moeda);
  }
  
  if (centavos > 0) {
    const txtCentavos = centavos === 1 ? "um centavo" : `${converteGrupo(centavos)} centavos`;
    if (inteiro > 0) {
      partes.push("e");
    }
    partes.push(txtCentavos);
  }
  
  if (partes.length === 0) return "";
  
  const resultado = partes.join(" ").replace(/\s+/g, " ").trim();
  return resultado.charAt(0).toUpperCase() + resultado.slice(1);
}
