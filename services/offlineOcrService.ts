import { ScannedData } from '../types';

// Adiciona TextDetector ao tipo global da janela para o TypeScript
declare global {
  interface Window {
    TextDetector: any;
  }
}

// Função auxiliar para carregar uma imagem a partir de uma string base64
const loadImage = (base64Image: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
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
    const img = await loadImage(base64Image);
    const detectedTexts = await textDetector.detect(img);

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
