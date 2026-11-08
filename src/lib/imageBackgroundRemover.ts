/**
 * Utilitário para Remoção Automática do Pano de Fundo (Background) de Logotipos
 * e Imagens para Carteirinhas, Credenciais e Documentos Eclesiásticos.
 *
 * Utiliza Canvas HTML5 e algoritmo de Flood-Fill a partir das bordas
 * para tornar transparente qualquer fundo branco, cinza claro ou sólido,
 * preservando os detalhes internos do logo e suavizando as arestas.
 */

interface BackgroundRemovalOptions {
  /** Tolerância para detecção de cor de fundo (0 a 255). Padrão: 48 */
  tolerance?: number;
  /** Se deve remover qualquer branco puro/quase puro (R,G,B > 240). Padrão: true */
  removeNearWhite?: boolean;
  /** Limiar para considerar branco puro. Padrão: 232 */
  whiteThreshold?: number;
  /** Suavização de bordas (anti-aliasing). Padrão: true */
  featherEdges?: boolean;
}

// Cache em memória para evitar reprocessamento do mesmo URL/dataURL
const transparentImageCache = new Map<string, string>();

/**
 * Remove o fundo (pano de fundo) de uma imagem, retornando um dataURL PNG 100% transparente.
 */
export async function removeImageBackground(
  imageUrl: string,
  options: BackgroundRemovalOptions = {}
): Promise<string> {
  if (!imageUrl || typeof imageUrl !== "string") {
    return imageUrl;
  }

  // Se já está no cache, retorna imediatamente
  const cacheKey = `${imageUrl}_${options.tolerance || 48}_${options.whiteThreshold || 232}`;
  if (transparentImageCache.has(cacheKey)) {
    return transparentImageCache.get(cacheKey)!;
  }

  // Se for SVG, verifica se tem viewBox e retorna como está se já for transparente
  if (imageUrl.startsWith("data:image/svg+xml") && !imageUrl.includes("background") && !imageUrl.includes("fill=\"#fff\"")) {
    transparentImageCache.set(cacheKey, imageUrl);
    return imageUrl;
  }

  return new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        if (width === 0 || height === 0) {
          resolve(imageUrl);
          return;
        }

        // Limita o tamanho para performance se for gigantesco (máx 900px)
        let drawWidth = width;
        let drawHeight = height;
        const maxDim = 900;
        if (drawWidth > maxDim || drawHeight > maxDim) {
          if (drawWidth > drawHeight) {
            drawHeight = Math.round((drawHeight * maxDim) / drawWidth);
            drawWidth = maxDim;
          } else {
            drawWidth = Math.round((drawWidth * maxDim) / drawHeight);
            drawHeight = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = drawWidth;
        canvas.height = drawHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (!ctx) {
          resolve(imageUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
        const imageData = ctx.getImageData(0, 0, drawWidth, drawHeight);
        const data = imageData.data;
        const totalPixels = drawWidth * drawHeight;

        // 1. Amostragem da cor de fundo nos 4 cantos e bordas
        const cornerIndices = [
          0, // Top-left
          (drawWidth - 1) * 4, // Top-right
          (drawHeight - 1) * drawWidth * 4, // Bottom-left
          (drawWidth * drawHeight - 1) * 4, // Bottom-right
          Math.floor(drawWidth / 2) * 4, // Top-center
          ((drawHeight - 1) * drawWidth + Math.floor(drawWidth / 2)) * 4, // Bottom-center
          Math.floor(drawHeight / 2) * drawWidth * 4, // Left-center
          (Math.floor(drawHeight / 2) * drawWidth + drawWidth - 1) * 4, // Right-center
        ];

        let bgR = 255;
        let bgG = 255;
        let bgB = 255;
        let samplesCount = 0;
        let sumR = 0, sumG = 0, sumB = 0;
        let hasTransparentCorners = false;

        for (const idx of cornerIndices) {
          const a = data[idx + 3];
          if (a < 50) {
            hasTransparentCorners = true;
          } else {
            sumR += data[idx];
            sumG += data[idx + 1];
            sumB += data[idx + 2];
            samplesCount++;
          }
        }

        if (samplesCount > 0) {
          bgR = Math.round(sumR / samplesCount);
          bgG = Math.round(sumG / samplesCount);
          bgB = Math.round(sumB / samplesCount);
        }

        const tolerance = options.tolerance ?? 48;
        const removeNearWhite = options.removeNearWhite ?? true;
        const whiteThreshold = options.whiteThreshold ?? 232;

        // Se a imagem já tem todos os cantos transparentes e não é branca nas bordas,
        // ainda assim aplicamos a remoção de brancos espúrios se solicitado, ou mantemos.
        const visited = new Uint8Array(totalPixels);
        const isBackground = new Uint8Array(totalPixels);

        // Fila para Flood-Fill BFS a partir das 4 bordas
        // Isso garante que apenas o fundo externo seja removido, mantendo elementos internos
        const queue: number[] = [];

        function isBgColor(r: number, g: number, b: number, a: number): boolean {
          if (a < 20) return true;
          // Distância euclidiana para a cor média do fundo detectado
          const dist = Math.sqrt(
            Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2)
          );
          if (dist <= tolerance) return true;

          // Se for perto de branco (fundos brancos com sombras sutis ou compressão jpg)
          if (removeNearWhite && r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold) {
            return true;
          }

          // Se a luminância for muito alta e a saturação muito baixa (cinzas muito claros)
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const diff = max - min;
          if (diff < 18 && min > 218) {
            return true;
          }

          return false;
        }

        // Adiciona todos os pixels das 4 bordas à fila BFS se corresponderem ao fundo
        for (let x = 0; x < drawWidth; x++) {
          // Borda superior
          const topIdx = x;
          const topDataIdx = topIdx * 4;
          if (isBgColor(data[topDataIdx], data[topDataIdx + 1], data[topDataIdx + 2], data[topDataIdx + 3])) {
            visited[topIdx] = 1;
            isBackground[topIdx] = 1;
            queue.push(topIdx);
          }

          // Borda inferior
          const bottomIdx = (drawHeight - 1) * drawWidth + x;
          const bottomDataIdx = bottomIdx * 4;
          if (isBgColor(data[bottomDataIdx], data[bottomDataIdx + 1], data[bottomDataIdx + 2], data[bottomDataIdx + 3])) {
            visited[bottomIdx] = 1;
            isBackground[bottomIdx] = 1;
            queue.push(bottomIdx);
          }
        }

        for (let y = 0; y < drawHeight; y++) {
          // Borda esquerda
          const leftIdx = y * drawWidth;
          const leftDataIdx = leftIdx * 4;
          if (!visited[leftIdx] && isBgColor(data[leftDataIdx], data[leftDataIdx + 1], data[leftDataIdx + 2], data[leftDataIdx + 3])) {
            visited[leftIdx] = 1;
            isBackground[leftIdx] = 1;
            queue.push(leftIdx);
          }

          // Borda direita
          const rightIdx = y * drawWidth + (drawWidth - 1);
          const rightDataIdx = rightIdx * 4;
          if (!visited[rightIdx] && isBgColor(data[rightDataIdx], data[rightDataIdx + 1], data[rightDataIdx + 2], data[rightDataIdx + 3])) {
            visited[rightIdx] = 1;
            isBackground[rightIdx] = 1;
            queue.push(rightIdx);
          }
        }

        // BFS Flood-Fill
        let head = 0;
        while (head < queue.length) {
          const curr = queue[head++];
          const cx = curr % drawWidth;
          const cy = Math.floor(curr / drawWidth);

          // 4 vizinhos (Cima, Baixo, Esquerda, Direita)
          const neighbors = [
            cy > 0 ? curr - drawWidth : -1,
            cy < drawHeight - 1 ? curr + drawWidth : -1,
            cx > 0 ? curr - 1 : -1,
            cx < drawWidth - 1 ? curr + 1 : -1,
          ];

          for (const n of neighbors) {
            if (n >= 0 && !visited[n]) {
              visited[n] = 1;
              const nDataIdx = n * 4;
              if (isBgColor(data[nDataIdx], data[nDataIdx + 1], data[nDataIdx + 2], data[nDataIdx + 3])) {
                isBackground[n] = 1;
                queue.push(n);
              }
            }
          }
        }

        // Segunda passada: além do flood fill, qualquer pixel perto de branco puro isolado é limpo
        for (let i = 0; i < totalPixels; i++) {
          const dIdx = i * 4;
          const r = data[dIdx];
          const g = data[dIdx + 1];
          const b = data[dIdx + 2];
          const a = data[dIdx + 3];

          if (isBackground[i]) {
            data[dIdx + 3] = 0; // Transparência total para o fundo conectado
          } else if (removeNearWhite && r >= 242 && g >= 242 && b >= 242) {
            // Branco quase puro residual
            data[dIdx + 3] = 0;
          } else if (options.featherEdges && a > 0) {
            // Suavização das arestas de transição com o fundo
            const dist = Math.sqrt(
              Math.pow(r - bgR, 2) + Math.pow(g - bgG, 2) + Math.pow(b - bgB, 2)
            );
            if (dist < tolerance * 1.25) {
              const alphaFactor = Math.min(1, Math.max(0, (dist - tolerance * 0.6) / (tolerance * 0.65)));
              data[dIdx + 3] = Math.round(a * alphaFactor);
            }
          }
        }

        ctx.putImageData(imageData, 0, 0);
        const transparentResult = canvas.toDataURL("image/png");

        // Salva no cache
        transparentImageCache.set(cacheKey, transparentResult);
        resolve(transparentResult);
      } catch (err) {
        console.warn("Não foi possível remover o fundo via canvas (fallback para imagem original):", err);
        resolve(imageUrl);
      }
    };

    img.onerror = () => {
      resolve(imageUrl);
    };

    img.src = imageUrl;
  });
}

/**
 * Obtém do cache se já processado sincronicamente
 */
export function getCachedTransparentLogo(imageUrl?: string | null): string | null {
  if (!imageUrl) return null;
  const key1 = `${imageUrl}_48_232`;
  return transparentImageCache.get(key1) || null;
}
