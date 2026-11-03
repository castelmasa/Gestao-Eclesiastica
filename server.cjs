var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_config = require("dotenv/config");
var ROBUST_GEMINI_MODELS = [
  "gemini-flash-lite-latest",
  "gemini-3.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-3.1-flash-lite",
  "gemini-3.8-flash"
];
async function generateWithFallback(ai, options) {
  const models = options.models && options.models.length > 0 ? options.models : ROBUST_GEMINI_MODELS;
  let lastError = null;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config
      });
      return response;
    } catch (err) {
      lastError = err;
      const errStr = err?.message || String(err);
      console.warn(`Tentativa Gemini com modelo '${model}' falhou:`, errStr);
      const isRecoverable = errStr.includes("503") || errStr.includes("UNAVAILABLE") || errStr.includes("high demand") || errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED") || errStr.includes("404") || errStr.includes("NOT_FOUND");
      if (isRecoverable && i < models.length - 1) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}
function extractFriendlyErrorMessage(error) {
  if (!error) return "Falha ao processar solicita\xE7\xE3o de IA.";
  const raw = error.message || String(error);
  try {
    const jsonMatch = raw.match(/\{[\s\S]*"error"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error?.message) {
        if (parsed.error.code === 503 || parsed.error.status === "UNAVAILABLE") {
          return "Os servidores de IA do Google est\xE3o com alta demanda tempor\xE1ria no momento. Por favor, tente novamente em instantes.";
        }
        if (parsed.error.code === 429) {
          return "Muitas requisi\xE7\xF5es simult\xE2neas de IA. Por favor, aguarde alguns instantes e tente novamente.";
        }
        return parsed.error.message;
      }
    }
  } catch {
  }
  if (raw.includes("503") || raw.includes("high demand") || raw.includes("UNAVAILABLE")) {
    return "Os servidores de IA do Google est\xE3o com alta demanda tempor\xE1ria. Por favor, tente novamente em alguns segundos.";
  }
  return raw;
}
async function startServer() {
  const app = (0, import_express.default)();
  const portArgIndex = process.argv.indexOf("--port");
  const portArg = portArgIndex !== -1 ? parseInt(process.argv[portArgIndex + 1], 10) : void 0;
  const PORT = portArg || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3);
  const hostArgIndex = process.argv.indexOf("--host");
  const hostArg = hostArgIndex !== -1 ? process.argv[hostArgIndex + 1] : void 0;
  const HOST = hostArg || process.env.HOST || "0.0.0.0";
  app.use(import_express.default.json({ limit: "50mb" }));
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }
      const { model = "gemini-flash-lite-latest", contents, prompt, config } = req.body;
      const contentPayload = contents || prompt || "Ol\xE1!";
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const response = await generateWithFallback(ai, {
        models: [model, ...ROBUST_GEMINI_MODELS],
        contents: contentPayload,
        config
      });
      res.json({ text: response.text ?? "" });
    } catch (error) {
      console.error("Gemini generate error:", error);
      res.status(500).json({ error: extractFriendlyErrorMessage(error) });
    }
  });
  app.post("/api/gemini/stream", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }
      const { model = "gemini-3.1-flash-lite", contents, prompt, config } = req.body;
      const contentPayload = contents || prompt || "Ol\xE1!";
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const responseStream = await ai.models.generateContentStream({
        model: model || "gemini-3.1-flash-lite",
        contents: contentPayload,
        config
      });
      for await (const chunk of responseStream) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}

`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error) {
      console.error("Gemini stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Streaming failed" });
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message })}

`);
        res.end();
      }
    }
  });
  app.post("/api/gemini/finance-analysis", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }
      const { transactions, last12Months } = req.body;
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const prompt = `Analise os seguintes dados financeiros de uma igreja dos \xFAltimos 12 meses.
Dados financeiros resumidos:
${JSON.stringify(last12Months)}

Com base nisso, sugira cortes de despesas inteligentes, identifique tend\xEAncias e proponha metas de arrecada\xE7\xE3o (ex: campanhas espec\xEDficas se houver d\xE9ficit ou para investimentos se houver super\xE1vit).
Retorne um JSON estruturado com a seguinte interface:
{
  "analiseGeral": "string",
  "sugestoesCorte": ["string", "string"],
  "metasArrecadacao": ["string", "string"]
}
Responda APENAS com o JSON v\xE1lido.`;
      const response = await generateWithFallback(ai, {
        models: ROBUST_GEMINI_MODELS,
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
      console.error("Finance analysis error:", error);
      res.status(500).json({ error: extractFriendlyErrorMessage(error) });
    }
  });
  app.post("/api/gemini/receipt-ocr", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }
      const { imageBase64, mimeType = "image/jpeg" } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Imagem n\xE3o fornecida." });
      }
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const prompt = `Voc\xEA \xE9 um contador e auditor eclesi\xE1stico especializado em tesouraria de igrejas crist\xE3s.
Analise a imagem deste recibo, comprovante de pagamento, cupom fiscal, nota fiscal ou PIX.
Extraia com precis\xE3o os dados financeiros do documento para lan\xE7amento cont\xE1bil no livro caixa da igreja.

Retorne OBRIGATORIAMENTE um JSON v\xE1lido com esta estrutura exata:
{
  "type": "saida", // "saida" para compras/despesas/pagamentos ou "entrada" para d\xEDzimos/ofertas/recebimentos
  "amount": 0.00, // n\xFAmero decimal com o valor total pago ou recebido
  "date": "YYYY-MM-DD", // data da emiss\xE3o ou pagamento (se n\xE3o encontrar ano use o ano atual)
  "supplier": "Nome da empresa, loja, posto ou pessoa benefici\xE1ria/pagadora",
  "documentNumber": "N\xFAmero da nota fiscal, cupom, comprovante ou autentica\xE7\xE3o (se houver)",
  "description": "Descri\xE7\xE3o clara e objetiva do que foi adquirido ou pago (ex: Compra de materiais de limpeza para o templo)",
  "category": "Categoria cont\xE1bil mais apropriada para igreja", // Exemplos: Energia El\xE9trica, \xC1gua e Esgoto, Limpeza e Conserva\xE7\xE3o, Miss\xF5es e Evangelismo, Manuten\xE7\xE3o do Templo, Equipamentos de Som, Combust\xEDvel, Material de Escrit\xF3rio, Alimenta\xE7\xE3o e Eventos, Honor\xE1rios Pastorais, Impostos e Taxas, Ajuda Social / Cesta B\xE1sica, D\xEDzimos e Ofertas
  "paymentMethod": "Pix", // "Pix", "Boleto", "Cart\xE3o", "Dinheiro" ou "Transfer\xEAncia"
  "notes": "Observa\xE7\xF5es \xFAteis ou itens identificados"
}

Se algum campo n\xE3o estiver leg\xEDvel, fa\xE7a a melhor infer\xEAncia plaus\xEDvel.
Responda APENAS com o JSON.`;
      const imagePart = {
        inlineData: {
          mimeType,
          data: cleanBase64
        }
      };
      const response = await generateWithFallback(ai, {
        models: ROBUST_GEMINI_MODELS,
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
          responseMimeType: "application/json"
        }
      });
      const parsed = JSON.parse(response.text || "{}");
      res.json(parsed);
    } catch (error) {
      console.error("Receipt OCR error:", error);
      res.status(500).json({ error: extractFriendlyErrorMessage(error) });
    }
  });
  app.post("/api/gemini/secretaria", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }
      const { type, payload, churchName = "Igreja Evang\xE9lica Pentecostal O Brasil para Cristo", branchName = "Templo Sede" } = req.body;
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const defaultDenominacao = "Igreja Evang\xE9lica Pentecostal O Brasil para Cristo";
      let cleanDenom = (churchName || "").trim();
      let cleanBranch = (branchName || "").trim();
      if (!cleanDenom || cleanDenom.toLowerCase() === cleanBranch.toLowerCase()) {
        cleanDenom = defaultDenominacao;
      }
      if (cleanBranch && cleanDenom.toLowerCase().includes(cleanBranch.toLowerCase())) {
        cleanDenom = cleanDenom.replace(new RegExp(`\\s*-\\s*${cleanBranch}`, "gi"), "").replace(new RegExp(`\\s*\u2013\\s*${cleanBranch}`, "gi"), "").trim();
        if (!cleanDenom) cleanDenom = defaultDenominacao;
      }
      const institutionFullName = cleanBranch && cleanBranch.toLowerCase() !== "sede" && cleanBranch.toLowerCase() !== "all" && cleanBranch.toLowerCase() !== cleanDenom.toLowerCase() ? `${cleanDenom} - ${cleanBranch}` : cleanDenom;
      const strictLanguageInstruction = `
DIRETRIZES DE LINGUAGEM E ESTILO OBRIGAT\xD3RIAS (PORTUGU\xCAS DO BRASIL):
1. PROIBI\xC7\xC3O ABSOLUTA DE TERMOS EM INGL\xCAS: \xC9 terminantemente PROIBIDO o uso de qualquer palavra ou express\xE3o em ingl\xEAs (anglicismos).
   - JAMAIS use "Head da Igreja" ou "Head", use SEMPRE "Cabe\xE7a da Igreja", "Supremo Pastor" ou "Senhor da Igreja".
   - JAMAIS use "Leader", "Worship", "Staff", "Team", "Meeting" ou similares; use "L\xEDder", "Minist\xE9rio de Louvor", "Corpo de Obreiros", "Equipe", "Reuni\xE3o / Assembleia".
2. ZERO DUPLICIDADE DE NOMES: NUNCA repita ou duplique o nome da igreja ou congrega\xE7\xE3o (JAMAIS escreva "${cleanBranch} - ${cleanBranch}" ou repeti\xE7\xF5es consecutivas). Escreva "${institutionFullName}" ou "${cleanDenom}".
3. REDA\xC7\xC3O CULTA E ECLESI\xC1STICA: Portugu\xEAs do Brasil impec\xE1vel, formal, b\xEDblico e reverente.`;
      let systemPrompt = "";
      let userPrompt = "";
      if (type === "carta") {
        const { tipoCarta, membroNome, cargo, membroDesde, dataBatismo, destinoIgreja, cidadeDestino, motivo, pastorName } = payload || {};
        systemPrompt = `Voc\xEA \xE9 o Secret\xE1rio Geral e Assessor Pastoral da ${institutionFullName}.
Sua fun\xE7\xE3o \xE9 redigir uma carta eclesi\xE1stica formal, reverente, b\xEDblica e com impec\xE1vel padr\xE3o de l\xEDngua portuguesa do Brasil.
${strictLanguageInstruction}
Use sauda\xE7\xF5es crist\xE3s tradicionais ("A paz do Senhor Jesus Cristo", "Amados irm\xE3os em Cristo"), declare a idoneidade moral, espiritual e financeira do membro, cite as atividades desempenhadas e conclua com b\xEAn\xE7\xE3os apost\xF3licas e votos fraternos.`;
        userPrompt = `Redija uma ${tipoCarta || "Carta de Recomenda\xE7\xE3o Eclesi\xE1stica"} oficial com os seguintes dados:
- Institui\xE7\xE3o emissora: ${institutionFullName}
- Nome do(a) Membro: ${membroNome || "Irm\xE3o(\xE3) em Cristo"}
- Cargo / Minist\xE9rio: ${cargo || "Membro em Plena Comunh\xE3o"}
- Membro desde: ${membroDesde || "Data regular de admiss\xE3o"}
- Batismo nas \xC1guas: ${dataBatismo || "Regularmente batizado(a)"}
- Igreja / Destino: ${destinoIgreja || "\xC0 amada Igreja coirm\xE3"} ${cidadeDestino ? `em ${cidadeDestino}` : ""}
- Motivo / Justificativa: ${motivo || "Mudan\xE7a de resid\xEAncia / viagem a trabalho"}
- Pastor Presidente: ${pastorName || "Pr. Presidente"}

Lembre-se: N\xC3O use estrangeirismos como "Head da Igreja", use "Cabe\xE7a da Igreja". N\xC3O duplique o nome da igreja.

Retorne um JSON com a seguinte estrutura:
{
  "titulo": "T\xEDtulo formal do documento",
  "assunto": "Resumo do assunto",
  "corpo": "Texto completo da carta formatado em par\xE1grafos claros",
  "versiculoChave": "Refer\xEAncia b\xEDblica e texto adequado para o encerramento"
}
Responda APENAS com o JSON v\xE1lido.`;
      } else if (type === "ata") {
        const { titulo, dataReuniao, horario, local, presidente, secretario, pauta, deliberacoes, presencas } = payload || {};
        systemPrompt = `Voc\xEA \xE9 o Secret\xE1rio Oficial encarregado da reda\xE7\xE3o de Atas de Assembleias Gerais e Reuni\xF5es da Diretoria de Igrejas Evang\xE9licas no Brasil.
${strictLanguageInstruction}
Redija a ata de acordo com os padr\xF5es formais e estatut\xE1rios eclesi\xE1sticos: in\xEDcio solene ("Aos [data], \xE0s [hor\xE1rio], reuniu-se..."), men\xE7\xE3o \xE0 presid\xEAncia, ora\xE7\xE3o de abertura, verifica\xE7\xE3o de qu\xF3rum, leitura e aprova\xE7\xE3o de atas anteriores, ordem do dia com cada delibera\xE7\xE3o numerada, aprova\xE7\xE3o por unanimidade ou maioria, encerramento em ora\xE7\xE3o e termo de encerramento para assinaturas. Sem rasuras ou quebras informais.`;
        userPrompt = `Elabore a Ata Formal da Assembleia com os seguintes t\xF3picos:
- Igreja: ${institutionFullName}
- T\xEDtulo da Assembleia: ${titulo || "Ata da Assembleia Geral Ordin\xE1ria de Presta\xE7\xE3o de Contas"}
- Data e Hor\xE1rio: ${dataReuniao || "Data atual"} \xE0s ${horario || "19:30h"}
- Local: ${local || cleanBranch || "Templo Sede"}
- Presidente da Mesa: ${presidente || "Pastor Presidente"}
- Secret\xE1rio(a): ${secretario || "1\xBA Secret\xE1rio(a)"}
- Pauta / Ordem do Dia: ${pauta || "Apresenta\xE7\xE3o e aprova\xE7\xE3o das contas do exerc\xEDcio, relat\xF3rios de minist\xE9rios e assuntos gerais"}
- Delibera\xE7\xF5es e Acordos: ${deliberacoes || "Aprovadas as contas sem ressalvas pelo plen\xE1rio conforme parecer do conselho fiscal"}
- Presen\xE7a / Qu\xF3rum: ${presencas || "Membros comungantes em qu\xF3rum estatut\xE1rio regular"}

Retorne um JSON com a seguinte estrutura:
{
  "numeroAta": "Ata n\xBA XX/2026",
  "titulo": "T\xEDtulo da Assembleia",
  "textoCompleto": "Texto integral e cont\xEDnuo da ata no formato oficial eclesi\xE1stico",
  "resumoDeliberacoes": ["Delibera\xE7\xE3o 1", "Delibera\xE7\xE3o 2"]
}
Responda APENAS com o JSON v\xE1lido.`;
      } else if (type === "analise_membro") {
        const { membro } = payload || {};
        systemPrompt = `Voc\xEA \xE9 um mentor eclesi\xE1stico e analista de minist\xE9rios crist\xE3os.
${strictLanguageInstruction}
Analise os dados do membro fornecido e sugira oportunidades de integra\xE7\xE3o ministerial, cuidado pastoral preventivo e pontos fortes para a lideran\xE7a.`;
        userPrompt = `Analise o perfil eclesi\xE1stico deste membro da ${institutionFullName}:
${JSON.stringify(membro, null, 2)}

Retorne um JSON estruturado:
{
  "resumoPerfil": "S\xEDntese pastoral da trajet\xF3ria do membro na igreja",
  "ministeriosSugeridos": ["Minist\xE9rio 1", "Minist\xE9rio 2", "Minist\xE9rio 3"],
  "justificativas": ["Motivo 1", "Motivo 2"],
  "pontosAtencaoPastoral": ["Acompanhamento ou visita recomendada", "Acolhimento familiar"],
  "versiculoIncentivo": "Vers\xEDculo b\xEDblico para edificar o membro"
}
Responda APENAS com o JSON v\xE1lido.`;
      } else {
        const { totalMembros, ativos, batizados, cargos, aniversariantesMes } = payload || {};
        systemPrompt = `Voc\xEA \xE9 o Secret\xE1rio Executivo da Igreja. Elabore um relat\xF3rio ministerial formal sintetizando as estat\xEDsticas da igreja.
${strictLanguageInstruction}`;
        userPrompt = `Estat\xEDsticas da ${institutionFullName}:
- Total de Membros: ${totalMembros}
- Membros Ativos: ${ativos}
- Batizados: ${batizados}
- Distribui\xE7\xE3o de Cargos: ${JSON.stringify(cargos)}
- Aniversariantes do M\xEAs: ${aniversariantesMes}

Retorne um JSON:
{
  "diagnosticoGeral": "Texto com o panorama geral da membresia",
  "destaquesPositivos": ["Destaque 1", "Destaque 2"],
  "metasSecretaria": ["Meta 1", "Meta 2"],
  "mensagemLideranca": "Palavra pastoral de encorajamento aos obreiros"
}
Responda APENAS com o JSON v\xE1lido.`;
      }
      const response = await generateWithFallback(ai, {
        models: ROBUST_GEMINI_MODELS,
        contents: `${systemPrompt}

${userPrompt}`,
        config: {
          responseMimeType: "application/json"
        }
      });
      let cleanText = (response.text || "{}").trim();
      cleanText = cleanText.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "").trim();
      cleanText = cleanText.replace(/\bHead da Igreja\b/gi, "Cabe\xE7a da Igreja").replace(/\bHead of the Church\b/gi, "Cabe\xE7a da Igreja").replace(/\bHead\b/g, "L\xEDder / Cabe\xE7a");
      if (cleanBranch) {
        const doubleRegex = new RegExp(`(${cleanBranch})\\s*-\\s*\\1`, "gi");
        cleanText = cleanText.replace(doubleRegex, "$1");
      }
      let parsed = {};
      try {
        parsed = JSON.parse(cleanText);
      } catch {
        const match = cleanText.match(/\{[\s\S]*\}/);
        if (match) {
          parsed = JSON.parse(match[0]);
        } else {
          parsed = { texto: cleanText };
        }
      }
      if (parsed && typeof parsed === "object") {
        ["corpo", "textoCompleto", "diagnosticoGeral", "resumoPerfil"].forEach((k) => {
          if (typeof parsed[k] === "string") {
            parsed[k] = parsed[k].replace(/\bHead da Igreja\b/gi, "Cabe\xE7a da Igreja").replace(/\bHead of the Church\b/gi, "Cabe\xE7a da Igreja");
            if (cleanBranch) {
              const dRegex = new RegExp(`(${cleanBranch})\\s*-\\s*\\1`, "gi");
              parsed[k] = parsed[k].replace(dRegex, "$1");
            }
          }
        });
      }
      res.json(parsed);
    } catch (error) {
      console.error("Erro na rota /api/gemini/secretaria:", error);
      res.status(500).json({ error: extractFriendlyErrorMessage(error) });
    }
  });
  app.post("/api/gemini/finance-parecer", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }
      const { period, summary, branchName, churchName, responsibleName } = req.body;
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const prompt = `Voc\xEA \xE9 o Tesoureiro Geral da ${churchName || "Igreja Evang\xE9lica Pentecostal O Brasil Para Cristo"} (${branchName || "Congrega\xE7\xE3o Sede"}).
Escreva um Parecer e Relat\xF3rio Executivo Financeiro formal, solene, transparente e pastoral para ser lido na Assembleia Geral Ordin\xE1ria de Membros ou Reuni\xE3o da Diretoria/Conselho Fiscal.

Dados do Per\xEDodo (${period}):
- Total de Entradas: R$ ${(summary?.totalEntradas || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Total de Sa\xEDdas (Despesas): R$ ${(summary?.totalSaidas || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Saldo L\xEDquido do Per\xEDodo: R$ ${(summary?.saldoPeriodo || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Saldo em Caixa / Banco Atual: R$ ${(summary?.saldoAtual || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
- Principais Despesas / Categorias: ${JSON.stringify(summary?.topCategories || [])}
- Nome do Relator / Tesoureiro: ${responsibleName || "Tesouraria Geral"}

Estrutura desejada:
1. Sauda\xE7\xE3o B\xEDblica de Abertura (ex: vers\xEDculo sobre mordomia crist\xE3 e fidelidade).
2. Resumo Executivo das Finan\xE7as (arrecada\xE7\xE3o de d\xEDzimos/ofertas e aplica\xE7\xE3o respons\xE1vel).
3. Destaques das Despesas (manuten\xE7\xE3o do templo, investimentos em miss\xF5es, assist\xEAncia social).
4. Parecer Conclusivo da Tesouraria e Recomenda\xE7\xE3o de Aprova\xE7\xE3o das Contas pela Assembleia.
5. Fechamento formal com local, data e espa\xE7o para assinatura.

Formate em texto limpo com par\xE1grafos bem espa\xE7ados, pronto para leitura em p\xFAlpito ou ata de assembleia.`;
      const response = await generateWithFallback(ai, {
        models: ROBUST_GEMINI_MODELS,
        contents: prompt
      });
      res.json({ parecer: response.text });
    } catch (error) {
      console.error("Finance Parecer error:", error);
      res.status(500).json({ error: extractFriendlyErrorMessage(error) });
    }
  });
  app.post("/api/gemini/generate-newsletter", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }
      const { events, birthdays } = req.body;
      const ai = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
      const prompt = `Voc\xEA \xE9 o secret\xE1rio de comunica\xE7\xE3o de uma igreja crist\xE3. Sua tarefa \xE9 escrever uma newsletter semanal envolvente, acolhedora e inspiradora para ser enviada por e-mail aos membros.
      
Abaixo est\xE3o os eventos da pr\xF3xima semana e os aniversariantes do m\xEAs atual.

Eventos da Semana:
${JSON.stringify(events, null, 2)}

Aniversariantes do M\xEAs:
${JSON.stringify(birthdays, null, 2)}

A newsletter deve conter:
1. Uma breve sauda\xE7\xE3o e mensagem encorajadora (com base em um vers\xEDculo curto).
2. A programa\xE7\xE3o/eventos da semana (convidando os membros a participarem).
3. Uma se\xE7\xE3o parabenizando os aniversariantes do m\xEAs, mencionando seus nomes (se houver algum).
4. Uma despedida carinhosa.

Formate a resposta em HTML limpo, usando tags como <h1>, <h2>, <p>, <ul>, <li>, <strong>, etc. N\xE3o inclua a tag <html> ou <body>, apenas o conte\xFAdo interno.
O design HTML deve usar estilos inline b\xE1sicos (cores suaves, fontes limpas) compat\xEDveis com e-mail.`;
      const response = await generateWithFallback(ai, {
        models: ROBUST_GEMINI_MODELS,
        contents: prompt
      });
      res.json({ html: response.text });
    } catch (error) {
      console.error("Generate newsletter error:", error);
      res.status(500).json({ error: extractFriendlyErrorMessage(error) });
    }
  });
  const distPath = import_path.default.join(process.cwd(), "dist");
  const distExists = import_fs.default.existsSync(distPath) && import_fs.default.existsSync(import_path.default.join(distPath, "index.html"));
  if (process.env.NODE_ENV === "production" && distExists) {
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  } else {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true, hmr: false },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.error(`Port ${PORT} is already in use. Please wait or terminate stale processes.`);
    } else {
      console.error("Server error:", err);
    }
  });
  const cleanup = () => {
    console.log("Shutting down server gracefully...");
    server.close(() => {
      process.exit(0);
    });
  };
  process.on("SIGTERM", cleanup);
  process.on("SIGINT", cleanup);
}
startServer();
//# sourceMappingURL=server.cjs.map
