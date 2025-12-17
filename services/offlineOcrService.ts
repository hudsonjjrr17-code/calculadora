import { ScannedData } from '../types';

// Adiciona TextDetector ao tipo global da janela para o TypeScript
declare global {
  interface Window {
    TextDetector: any;
  }
}

// Otimização: Em vez de carregar a imagem em alta resolução, nós a desenhamos
// em um canvas menor. O OCR funciona bem em imagens menores e isso é muito mais rápido.
const createOptimizedCanvas = (base64Image: string): Promise<HTMLCanvasElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_DIMENSION = 1024; // Processar imagens com no máximo 1024px
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Não foi possível obter o contexto do canvas'));
      }

      let { width, height } = img;
      if (width > height) {
        if (width > MAX_DIMENSION) {
          height = Math.round(height * (MAX_DIMENSION / width));
          width = MAX_DIMENSION;
        }
      } else {
        if (height > MAX_DIMENSION) {
          width = Math.round(width * (MAX_DIMENSION / height));
          height = MAX_DIMENSION;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      
      // Desenha a imagem redimensionada no canvas
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas);
    };
    img.onerror = (err) => reject(err);
    img.src = base64Image;
  });
};


// Expressão regular para encontrar preços, lidando com R$, pontos e vírgulas
const priceRegex = /(?:R\$?\s*)?(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+[,.]\d{2})/;

// Converte o texto do preço encontrado para um número
const parsePrice = (text: string): number => {
    const match = text.match(priceRegex);
    if (!match) return 0;
    
    // Normaliza a string para usar '.' como separador decimal
    const priceStr = match[1].replace(/\./g, '').replace(',', '.');
    return parseFloat(priceStr) || 0;
};

export const analyzeImageOffline = async (base64Image: string): Promise<ScannedData | null> => {
  if (!('TextDetector' in window)) {
    console.warn('A API TextDetector não é suportada neste navegador.');
    return null;
  }

  try {
    const textDetector = new window.TextDetector();
    // Usa a imagem otimizada em vez da imagem em tamanho real
    const canvas = await createOptimizedCanvas(base64Image);
    const detectedTexts = await textDetector.detect(canvas);

    if (!detectedTexts || detectedTexts.length === 0) {
      return null;
    }
    
    let foundPrice = 0;
    const textParts: string[] = [];

    // Ordena os textos pela posição na imagem (de cima para baixo, da esquerda para a direita)
    detectedTexts.sort((a: any, b: any) => {
        if (a.boundingBox.y !== b.boundingBox.y) {
            return a.boundingBox.y - b.boundingBox.y;
        }
        return a.boundingBox.x - b.boundingBox.x;
    });

    for (const text of detectedTexts) {
      const rawValue = text.rawValue;
      textParts.push(rawValue);

      // Procura o maior preço válido entre os textos detectados
      const priceInText = parsePrice(rawValue);
      if (priceInText > foundPrice) {
        foundPrice = priceInText;
      }
    }

    // Heurística para um nome melhor: junta todos os textos e remove o preço
    let guessedName = textParts.join(' ').replace(/\s+/g, ' ').trim();
    if (foundPrice > 0) {
        const priceStringMatch = guessedName.match(priceRegex);
        if (priceStringMatch) {
            guessedName = guessedName.replace(priceStringMatch[0], '').trim();
        }
    }

    return {
      price: foundPrice,
      guessedName: guessedName || "Item desconhecido",
    };

  } catch (error) {
    console.error('Erro durante a análise OCR offline:', error);
    throw error; // Propaga o erro para ser tratado no App.tsx
  }
};