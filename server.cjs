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
  app.post("/api/gemini/finance-analysis", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }
      const { transactions, last12Months } = req.body;
      const ai = new import_genai.GoogleGenAI({ apiKey });
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
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });
  app.post("/api/gemini/generate-newsletter", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }
      const { events, birthdays } = req.body;
      const ai = new import_genai.GoogleGenAI({ apiKey });
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
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt
      });
      res.json({ html: response.text });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
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
