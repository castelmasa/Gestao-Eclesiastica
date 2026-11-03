export interface GenerateContentParams {
  model?: string;
  contents: string | any;
  config?: any;
}

export interface GenerateContentResponse {
  text: string;
}

/**
 * Client-side Gemini service that safely delegates all requests to the server.
 * The browser never holds an API key or imports the @google/genai SDK directly.
 */
export const ai = {
  models: {
    generateContent: async (
      params: GenerateContentParams | string
    ): Promise<GenerateContentResponse> => {
      const payload = typeof params === 'string' ? { contents: params } : params;
      const res = await fetch('/api/gemini/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      return {
        text: data.text ?? '',
      };
    },

    generateContentStream: async function* (
      params: GenerateContentParams | string
    ): AsyncGenerator<GenerateContentResponse, void, unknown> {
      const payload = typeof params === 'string' ? { contents: params } : params;
      const res = await fetch('/api/gemini/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok || !res.body) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') return;
            try {
              const parsed = JSON.parse(raw);
              if (parsed.error) throw new Error(parsed.error);
              yield { text: parsed.text ?? '' };
            } catch (err: any) {
              if (err.message && !err.message.includes('JSON')) throw err;
              yield { text: raw };
            }
          }
        }
      }
    },
  },
};