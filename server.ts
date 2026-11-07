import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

// Helper para geração com contingência / fallback automático de modelos Gemini
const ROBUST_GEMINI_MODELS = [
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite',
  'gemini-3.8-flash',
];

async function generateWithFallback(
  ai: GoogleGenAI,
  options: {
    contents: any;
    config?: any;
    models?: string[];
  }
) {
  const models = options.models && options.models.length > 0 
    ? options.models 
    : ROBUST_GEMINI_MODELS;
  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const response = await ai.models.generateContent({
        model,
        contents: options.contents,
        config: options.config,
      });
      return response;
    } catch (err: any) {
      lastError = err;
      const errStr = err?.message || String(err);
      console.warn(`Tentativa Gemini com modelo '${model}' falhou:`, errStr);

      const isRecoverable =
        errStr.includes("503") ||
        errStr.includes("UNAVAILABLE") ||
        errStr.includes("high demand") ||
        errStr.includes("429") ||
        errStr.includes("RESOURCE_EXHAUSTED") ||
        errStr.includes("404") ||
        errStr.includes("NOT_FOUND");

      if (isRecoverable && i < models.length - 1) {
        // Aguarda 500ms e tenta o próximo modelo da lista de contingência
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

function extractFriendlyErrorMessage(error: any): string {
  if (!error) return "Falha ao processar solicitação de IA.";
  const raw = error.message || String(error);
  try {
    const jsonMatch = raw.match(/\{[\s\S]*"error"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.error?.message) {
        if (parsed.error.code === 503 || parsed.error.status === "UNAVAILABLE") {
          return "Os servidores de IA do Google estão com alta demanda temporária no momento. Por favor, tente novamente em instantes.";
        }
        if (parsed.error.code === 429) {
          return "Muitas requisições simultâneas de IA. Por favor, aguarde alguns instantes e tente novamente.";
        }
        return parsed.error.message;
      }
    }
  } catch {}
  if (raw.includes("503") || raw.includes("high demand") || raw.includes("UNAVAILABLE")) {
    return "Os servidores de IA do Google estão com alta demanda temporária. Por favor, tente novamente em alguns segundos.";
  }
  return raw;
}

async function startServer() {
  const app = express();
  
  // Parse CLI args for port and host (e.g. tsx server.ts --port 3000 --host 0.0.0.0)
  const portArgIndex = process.argv.indexOf("--port");
  const portArg = portArgIndex !== -1 ? parseInt(process.argv[portArgIndex + 1], 10) : undefined;
  const PORT = portArg || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

  const hostArgIndex = process.argv.indexOf("--host");
  const hostArg = hostArgIndex !== -1 ? process.argv[hostArgIndex + 1] : undefined;
  const HOST = hostArg || process.env.HOST || "0.0.0.0";

  app.use(express.json({ limit: '50mb' }));

  // API Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // API Routes
  app.post("/api/gemini/generate", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const { model = "gemini-flash-lite-latest", contents, prompt, config } = req.body;
      const contentPayload = contents || prompt || "Olá!";

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await generateWithFallback(ai, {
        models: [model, ...ROBUST_GEMINI_MODELS],
        contents: contentPayload,
        config,
      });

      res.json({ text: response.text ?? '' });
    } catch (error: any) {
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
      const contentPayload = contents || prompt || "Olá!";

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const responseStream = await ai.models.generateContentStream({
        model: model || 'gemini-3.1-flash-lite',
        contents: contentPayload,
        config,
      });

      for await (const chunk of responseStream) {
        res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (error: any) {
      console.error("Gemini stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || "Streaming failed" });
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
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
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

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

      const response = await generateWithFallback(ai, {
        models: ROBUST_GEMINI_MODELS,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (error: any) {
      console.error("Finance analysis error:", error);
      res.status(500).json({ error: extractFriendlyErrorMessage(error) });
    }
  });

  // OCR de Recibos, Cupons Fiscais e Comprovantes PIX via IA
  app.post("/api/gemini/receipt-ocr", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const { imageBase64, mimeType = "image/jpeg" } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Imagem não fornecida." });
      }

      // Limpar prefixo data:image/...;base64, se existir
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Você é um contador e auditor eclesiástico especializado em tesouraria de igrejas cristãs.
Analise a imagem deste recibo, comprovante de pagamento, cupom fiscal, nota fiscal ou PIX.
Extraia com precisão os dados financeiros do documento para lançamento contábil no livro caixa da igreja.

Retorne OBRIGATORIAMENTE um JSON válido com esta estrutura exata:
{
  "type": "saida", // "saida" para compras/despesas/pagamentos ou "entrada" para dízimos/ofertas/recebimentos
  "amount": 0.00, // número decimal com o valor total pago ou recebido
  "date": "YYYY-MM-DD", // data da emissão ou pagamento (se não encontrar ano use o ano atual)
  "supplier": "Nome da empresa, loja, posto ou pessoa beneficiária/pagadora",
  "documentNumber": "Número da nota fiscal, cupom, comprovante ou autenticação (se houver)",
  "description": "Descrição clara e objetiva do que foi adquirido ou pago (ex: Compra de materiais de limpeza para o templo)",
  "category": "Categoria contábil mais apropriada para igreja", // Exemplos: Energia Elétrica, Água e Esgoto, Limpeza e Conservação, Missões e Evangelismo, Manutenção do Templo, Equipamentos de Som, Combustível, Material de Escritório, Alimentação e Eventos, Honorários Pastorais, Impostos e Taxas, Ajuda Social / Cesta Básica, Dízimos e Ofertas
  "paymentMethod": "Pix", // "Pix", "Boleto", "Cartão", "Dinheiro" ou "Transferência"
  "notes": "Observações úteis ou itens identificados"
}

Se algum campo não estiver legível, faça a melhor inferência plausível.
Responda APENAS com o JSON.`;

      const imagePart = {
        inlineData: {
          mimeType,
          data: cleanBase64,
        },
      };

      const response = await generateWithFallback(ai, {
        models: ROBUST_GEMINI_MODELS,
        contents: { parts: [imagePart, { text: prompt }] },
        config: {
          responseMimeType: "application/json",
        }
      });

      const parsed = JSON.parse(response.text || '{}');
      res.json(parsed);
    } catch (error: any) {
      console.error("Receipt OCR error:", error);
      res.status(500).json({ error: extractFriendlyErrorMessage(error) });
    }
  });

  // Módulo de IA para Secretaria Eclesiástica (Cartas, Atas, Perfis e Resumos)
  app.post("/api/gemini/secretaria", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const { type, payload, churchName = "Igreja Evangélica Pentecostal O Brasil para Cristo", branchName = "Templo Sede" } = req.body;

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Higieniza denominação e congregação para ELIMINAR qualquer duplicidade de nomes
      const defaultDenominacao = "Igreja Evangélica Pentecostal O Brasil para Cristo";
      let cleanDenom = (churchName || "").trim();
      let cleanBranch = (branchName || "").trim();

      if (!cleanDenom || cleanDenom.toLowerCase() === cleanBranch.toLowerCase()) {
        cleanDenom = defaultDenominacao;
      }

      // Se a denominação já contém a congregação (ex: "... - 2ª Congregação"), limpar a terminação duplicada
      if (cleanBranch && cleanDenom.toLowerCase().includes(cleanBranch.toLowerCase())) {
        cleanDenom = cleanDenom
          .replace(new RegExp(`\\s*-\\s*${cleanBranch}`, 'gi'), '')
          .replace(new RegExp(`\\s*–\\s*${cleanBranch}`, 'gi'), '')
          .trim();
        if (!cleanDenom) cleanDenom = defaultDenominacao;
      }

      // Nome limpo e respeitoso da instituição emissora
      const institutionFullName = (cleanBranch && cleanBranch.toLowerCase() !== "sede" && cleanBranch.toLowerCase() !== "all" && cleanBranch.toLowerCase() !== cleanDenom.toLowerCase())
        ? `${cleanDenom} - ${cleanBranch}`
        : cleanDenom;

      const strictLanguageInstruction = `
DIRETRIZES DE LINGUAGEM E ESTILO OBRIGATÓRIAS (PORTUGUÊS DO BRASIL):
1. PROIBIÇÃO ABSOLUTA DE TERMOS EM INGLÊS: É terminantemente PROIBIDO o uso de qualquer palavra ou expressão em inglês (anglicismos).
   - JAMAIS use "Head da Igreja" ou "Head", use SEMPRE "Cabeça da Igreja", "Supremo Pastor" ou "Senhor da Igreja".
   - JAMAIS use "Leader", "Worship", "Staff", "Team", "Meeting" ou similares; use "Líder", "Ministério de Louvor", "Corpo de Obreiros", "Equipe", "Reunião / Assembleia".
2. ZERO DUPLICIDADE DE NOMES: NUNCA repita ou duplique o nome da igreja ou congregação (JAMAIS escreva "${cleanBranch} - ${cleanBranch}" ou repetições consecutivas). Escreva "${institutionFullName}" ou "${cleanDenom}".
3. REDAÇÃO CULTA E ECLESIÁSTICA: Português do Brasil impecável, formal, bíblico e reverente.`;

      let systemPrompt = "";
      let userPrompt = "";

      if (type === "carta") {
        const { tipoCarta, membroNome, cargo, membroDesde, dataBatismo, destinoIgreja, cidadeDestino, motivo, pastorName } = payload || {};
        const letterTypeStr = (tipoCarta || "Carta de Recomendação Eclesiástica").toLowerCase();

        let letterSpecificGuidelines = "";
        if (letterTypeStr.includes("convite")) {
          letterSpecificGuidelines = `
ESTA É UMA CARTA CONVITE OFICIAL:
- O tom deve ser de honra, alegria cristã e reverência ao convidar o ministro da Palavra, preletor ou ministério de louvor/cantor.
- Mencione a honra de receber o convidado para ministrar a Palavra de Deus ou os louvores no culto especial/evento da igreja.
- Enfatize a expectativa espiritual da congregação e os votos de ricas bênçãos na preparação da ministração.`;
        } else if (letterTypeStr.includes("congresso") || letterTypeStr.includes("encontro")) {
          letterSpecificGuidelines = `
ESTA É UMA CARTA DE CONVOCAÇÃO / CREDENCIAMENTO PARA CONGRESSO:
- O tom deve ser solene e entusiasta, oficializando a participação de delegação, obreiros, jovens, mulheres (Círculo de Oração) ou varões no congresso.
- Destaque o propósito de avivamento espiritual, edificação bíblica e comunhão entre as congregações irmãs.`;
        } else if (letterTypeStr.includes("aniversário") || letterTypeStr.includes("aniversario")) {
          letterSpecificGuidelines = `
ESTA É UMA CARTA DE FELICITAÇÕES DE ANIVERSÁRIO (PASTORAL OU MEMBRO):
- O tom deve ser afetuoso, festivo, pastoral e profundamente bíblico.
- Agradeça a Deus pelo dom da vida, celebre a fidelidade do aniversariante na Casa do Senhor e invoque bênçãos de saúde, paz, renovo e anos multiplicados.`;
        } else if (letterTypeStr.includes("transferência") || letterTypeStr.includes("transferencia")) {
          letterSpecificGuidelines = `
ESTA É UMA CARTA DE TRANSFERÊNCIA DEFINITIVA DE MEMBRO:
- Formalize a transferência de membresia com respeito canônico, atestando que o membro deixa esta congregação em plena comunhão, paz e idoneidade.
- Transfira os cuidados pastorais e fraternos para a amada igreja de destino.`;
        } else if (letterTypeStr.includes("apresentação") || letterTypeStr.includes("apresentacao")) {
          letterSpecificGuidelines = `
ESTA É UMA CARTA DE APRESENTAÇÃO E BOAS-VINDAS:
- Apresente o irmão(ã) ou família com carinho cristão, recomendando acolhimento no Corpo de Cristo.`;
        } else if (letterTypeStr.includes("consagração") || letterTypeStr.includes("separação") || letterTypeStr.includes("consagracao")) {
          letterSpecificGuidelines = `
ESTA É UMA CARTA DE RECONHECIMENTO E CONSAGRAÇÃO MINISTERIAL:
- Celebre a vocação sagrada, o testemunho irrepreensível e a separação para a obra de Deus no ministério designado.`;
        } else if (letterTypeStr.includes("agradecimento")) {
          letterSpecificGuidelines = `
ESTA É UMA CARTA DE AGRADECIMENTO ECLESIÁSTICO:
- Expresse a gratidão da liderança e da igreja pela generosa doação, colaboração ou serviço prestado à obra de Deus.`;
        }

        systemPrompt = `Você é o Secretário Geral e Assessor Pastoral da ${institutionFullName}.
Sua função é redigir uma carta eclesiástica oficial, reverente, bíblica e com impecável padrão de língua portuguesa do Brasil.
${strictLanguageInstruction}
${letterSpecificGuidelines}
Use saudações cristãs tradicionais ("A paz do Senhor Jesus Cristo", "Amados irmãos em Cristo"), desenvolva parágrafos harmônicos e conclua com bênçãos apostólicas e votos fraternos.`;

        userPrompt = `Redija uma ${tipoCarta || "Carta de Recomendação Eclesiástica"} oficial com os seguintes dados:
- Instituição emissora: ${institutionFullName}
- Nome do(a) Destinatário(a) / Membro / Convidado: ${membroNome || "Irmão(ã) em Cristo"}
- Cargo / Ministério / Função: ${cargo || "Membro em Plena Comunhão"}
- Membro desde: ${membroDesde || "Data regular de admissão"}
- Batismo nas Águas: ${dataBatismo || "Regularmente batizado(a)"}
- Igreja / Destino / Local do Evento: ${destinoIgreja || "À amada Igreja coirmã"} ${cidadeDestino ? `em ${cidadeDestino}` : ""}
- Motivo / Justificativa / Tema do Evento: ${motivo || "Conforme solicitado"}
- Pastor Presidente: ${pastorName || "Pr. Presidente"}

Lembre-se: NÃO use estrangeirismos como "Head da Igreja", use "Cabeça da Igreja". NÃO duplique o nome da igreja.

Retorne um JSON com a seguinte estrutura:
{
  "titulo": "Título formal do documento em letras maiúsculas",
  "assunto": "Resumo do assunto do documento",
  "corpo": "Texto completo da carta formatado em parágrafos claros e elegantes",
  "versiculoChave": "Referência bíblica e texto adequado para o encerramento da carta"
}
Responda APENAS com o JSON válido.`;
      } else if (type === "ata") {
        const { titulo, dataReuniao, horario, local, presidente, secretario, pauta, deliberacoes, presencas } = payload || {};
        systemPrompt = `Você é o Secretário Oficial encarregado da redação de Atas de Assembleias Gerais e Reuniões da Diretoria de Igrejas Evangélicas no Brasil.
${strictLanguageInstruction}
Redija a ata de acordo com os padrões formais e estatutários eclesiásticos: início solene ("Aos [data], às [horário], reuniu-se..."), menção à presidência, oração de abertura, verificação de quórum, leitura e aprovação de atas anteriores, ordem do dia com cada deliberação numerada, aprovação por unanimidade ou maioria, encerramento em oração e termo de encerramento para assinaturas. Sem rasuras ou quebras informais.`;

        userPrompt = `Elabore a Ata Formal da Assembleia com os seguintes tópicos:
- Igreja: ${institutionFullName}
- Título da Assembleia: ${titulo || "Ata da Assembleia Geral Ordinária de Prestação de Contas"}
- Data e Horário: ${dataReuniao || "Data atual"} às ${horario || "19:30h"}
- Local: ${local || cleanBranch || "Templo Sede"}
- Presidente da Mesa: ${presidente || "Pastor Presidente"}
- Secretário(a): ${secretario || "1º Secretário(a)"}
- Pauta / Ordem do Dia: ${pauta || "Apresentação e aprovação das contas do exercício, relatórios de ministérios e assuntos gerais"}
- Deliberações e Acordos: ${deliberacoes || "Aprovadas as contas sem ressalvas pelo plenário conforme parecer do conselho fiscal"}
- Presença / Quórum: ${presencas || "Membros comungantes em quórum estatutário regular"}

Retorne um JSON com a seguinte estrutura:
{
  "numeroAta": "Ata nº XX/2026",
  "titulo": "Título da Assembleia",
  "textoCompleto": "Texto integral e contínuo da ata no formato oficial eclesiástico",
  "resumoDeliberacoes": ["Deliberação 1", "Deliberação 2"]
}
Responda APENAS com o JSON válido.`;
      } else if (type === "analise_membro") {
        const { membro } = payload || {};
        systemPrompt = `Você é um mentor eclesiástico e analista de ministérios cristãos.
${strictLanguageInstruction}
Analise os dados do membro fornecido e sugira oportunidades de integração ministerial, cuidado pastoral preventivo e pontos fortes para a liderança.`;

        userPrompt = `Analise o perfil eclesiástico deste membro da ${institutionFullName}:
${JSON.stringify(membro, null, 2)}

Retorne um JSON estruturado:
{
  "resumoPerfil": "Síntese pastoral da trajetória do membro na igreja",
  "ministeriosSugeridos": ["Ministério 1", "Ministério 2", "Ministério 3"],
  "justificativas": ["Motivo 1", "Motivo 2"],
  "pontosAtencaoPastoral": ["Acompanhamento ou visita recomendada", "Acolhimento familiar"],
  "versiculoIncentivo": "Versículo bíblico para edificar o membro"
}
Responda APENAS com o JSON válido.`;
      } else {
        // Resumo Executivo da Secretaria
        const { totalMembros, ativos, batizados, cargos, aniversariantesMes } = payload || {};
        systemPrompt = `Você é o Secretário Executivo da Igreja. Elabore um relatório ministerial formal sintetizando as estatísticas da igreja.
${strictLanguageInstruction}`;
        userPrompt = `Estatísticas da ${institutionFullName}:
- Total de Membros: ${totalMembros}
- Membros Ativos: ${ativos}
- Batizados: ${batizados}
- Distribuição de Cargos: ${JSON.stringify(cargos)}
- Aniversariantes do Mês: ${aniversariantesMes}

Retorne um JSON:
{
  "diagnosticoGeral": "Texto com o panorama geral da membresia",
  "destaquesPositivos": ["Destaque 1", "Destaque 2"],
  "metasSecretaria": ["Meta 1", "Meta 2"],
  "mensagemLideranca": "Palavra pastoral de encorajamento aos obreiros"
}
Responda APENAS com o JSON válido.`;
      }

      const response = await generateWithFallback(ai, {
        models: ROBUST_GEMINI_MODELS,
        contents: `${systemPrompt}\n\n${userPrompt}`,
        config: {
          responseMimeType: "application/json",
        }
      });

      let cleanText = (response.text || '{}').trim();
      cleanText = cleanText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim();

      // Sanitização pós-geração: remover qualquer resquício de "Head da Igreja" ou duplicações
      cleanText = cleanText
        .replace(/\bHead da Igreja\b/gi, 'Cabeça da Igreja')
        .replace(/\bHead of the Church\b/gi, 'Cabeça da Igreja')
        .replace(/\bHead\b/g, 'Líder / Cabeça');

      // Se a congregação foi repetida como "2ª Congregação - 2ª Congregação"
      if (cleanBranch) {
        const doubleRegex = new RegExp(`(${cleanBranch})\\s*-\\s*\\1`, 'gi');
        cleanText = cleanText.replace(doubleRegex, '$1');
      }

      let parsed: any = {};
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

      // Sanitizar campos de texto do JSON parseado
      if (parsed && typeof parsed === 'object') {
        ['corpo', 'textoCompleto', 'diagnosticoGeral', 'resumoPerfil'].forEach(k => {
          if (typeof parsed[k] === 'string') {
            parsed[k] = parsed[k]
              .replace(/\bHead da Igreja\b/gi, 'Cabeça da Igreja')
              .replace(/\bHead of the Church\b/gi, 'Cabeça da Igreja');
            if (cleanBranch) {
              const dRegex = new RegExp(`(${cleanBranch})\\s*-\\s*\\1`, 'gi');
              parsed[k] = parsed[k].replace(dRegex, '$1');
            }
          }
        });
      }

      res.json(parsed);
    } catch (error: any) {
      console.error("Erro na rota /api/gemini/secretaria:", error);
      res.status(500).json({ error: extractFriendlyErrorMessage(error) });
    }
  });

  // Parecer Financeiro Oficial para Assembleias e Reuniões de Membros
  app.post("/api/gemini/finance-parecer", async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
      }

      const { period, summary, branchName, churchName, responsibleName } = req.body;

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Você é o Tesoureiro Geral da ${churchName || "Igreja Evangélica Pentecostal O Brasil Para Cristo"} (${branchName || "Congregação Sede"}).
Escreva um Parecer e Relatório Executivo Financeiro formal, solene, transparente e pastoral para ser lido na Assembleia Geral Ordinária de Membros ou Reunião da Diretoria/Conselho Fiscal.

Dados do Período (${period}):
- Total de Entradas: R$ ${(summary?.totalEntradas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Total de Saídas (Despesas): R$ ${(summary?.totalSaidas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Saldo Líquido do Período: R$ ${(summary?.saldoPeriodo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Saldo em Caixa / Banco Atual: R$ ${(summary?.saldoAtual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
- Principais Despesas / Categorias: ${JSON.stringify(summary?.topCategories || [])}
- Nome do Relator / Tesoureiro: ${responsibleName || "Tesouraria Geral"}

Estrutura desejada:
1. Saudação Bíblica de Abertura (ex: versículo sobre mordomia cristã e fidelidade).
2. Resumo Executivo das Finanças (arrecadação de dízimos/ofertas e aplicação responsável).
3. Destaques das Despesas (manutenção do templo, investimentos em missões, assistência social).
4. Parecer Conclusivo da Tesouraria e Recomendação de Aprovação das Contas pela Assembleia.
5. Fechamento formal com local, data e espaço para assinatura.

Formate em texto limpo com parágrafos bem espaçados, pronto para leitura em púlpito ou ata de assembleia.`;

      const response = await generateWithFallback(ai, {
        models: ROBUST_GEMINI_MODELS,
        contents: prompt
      });

      res.json({ parecer: response.text });
    } catch (error: any) {
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
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

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

      const response = await generateWithFallback(ai, {
        models: ROBUST_GEMINI_MODELS,
        contents: prompt
      });

      res.json({ html: response.text });
    } catch (error: any) {
      console.error("Generate newsletter error:", error);
      res.status(500).json({ error: extractFriendlyErrorMessage(error) });
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
