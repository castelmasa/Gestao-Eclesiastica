import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  
  // Parse CLI args for port and host (e.g. tsx server.ts --port 3000 --host 0.0.0.0)
  const portArgIndex = process.argv.indexOf("--port");
  const portArg = portArgIndex !== -1 ? parseInt(process.argv[portArgIndex + 1], 10) : undefined;
  const PORT = portArg || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

  const hostArgIndex = process.argv.indexOf("--host");
  const hostArg = hostArgIndex !== -1 ? process.argv[hostArgIndex + 1] : undefined;
  const HOST = hostArg || "0.0.0.0";

  app.use(express.json({ limit: '50mb' }));

  // API Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // API Routes
  app.post("/api/gemini/finance-analysis", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const { transactions, last12Months } = req.body;
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Analise os seguintes dados financeiros de uma igreja dos últimos 12 meses.
Dados financeiros resumidos:
${JSON.stringify(last12Months)}

Com base nisso, sugira cortes de despesas inteligentes, identifique tendências e proponha metas de arrecadação (ex: campanhas específicas se houver déficit ou para investimentos se houver superávit).
Retorne um JSON estruturado com a seguinte interface:
{
  "analiseGeral": "string",
  "sugestoesCorte": ["string", "string"],
  "metasArrecadacao": ["string", "string"]
}
Responda APENAS com o JSON válido.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (error: any) {
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
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Você é o secretário de comunicação de uma igreja cristã. Sua tarefa é escrever uma newsletter semanal envolvente, acolhedora e inspiradora para ser enviada por e-mail aos membros.
      
Abaixo estão os eventos da próxima semana e os aniversariantes do mês atual.

Eventos da Semana:
${JSON.stringify(events, null, 2)}

Aniversariantes do Mês:
${JSON.stringify(birthdays, null, 2)}

A newsletter deve conter:
1. Uma breve saudação e mensagem encorajadora (com base em um versículo curto).
2. A programação/eventos da semana (convidando os membros a participarem).
3. Uma seção parabenizando os aniversariantes do mês, mencionando seus nomes (se houver algum).
4. Uma despedida carinhosa.

Formate a resposta em HTML limpo, usando tags como <h1>, <h2>, <p>, <ul>, <li>, <strong>, etc. Não inclua a tag <html> ou <body>, apenas o conteúdo interno.
O design HTML deve usar estilos inline básicos (cores suaves, fontes limpas) compatíveis com e-mail.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });

      res.json({ html: response.text });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  const distPath = path.join(process.cwd(), 'dist');
  const distExists = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, 'index.html'));

  if (process.env.NODE_ENV === "production" && distExists) {
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Please wait or terminate stale processes.`);
    } else {
      console.error('Server error:', err);
    }
  });

  const cleanup = () => {
    console.log('Shutting down server gracefully...');
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
}

startServer();
