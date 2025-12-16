import { GoogleGenAI, Type } from "@google/genai";

// Lazy init to avoid top-level crashes if environment is unstable
let ai: GoogleGenAI | null = null;

const getAiClient = () => {
  if (!ai) {
    // Initialize strictly following guidelines
    ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return ai;
};

export const analyzePriceTag = async (base64Image: string): Promise<{ price: number; guessedName: string } | null> => {
  // Check for offline status immediately
  if (!navigator.onLine) {
    throw new Error("OFFLINE_MODE");
  }

  try {
    const client = getAiClient();
    
    // Clean the base64 string (remove the data:image/... prefix)
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `Atue como um scanner de supermercado de alta precisão. Analise a imagem e extraia:
            1. O PREÇO (procure por cifrões, números grandes, decimais).
            2. O NOME COMPLETO DO PRODUTO.
            
            REGRAS PARA O NOME:
            - LEIA TUDO: Combine a Marca, o Tipo do produto e o PESO/VOLUME (kg, g, L, ml, un).
            - CÓDIGOS: Se houver um código de barras ou numeração numérica visível, use-o para inferir o produto se o nome estiver abreviado, mas o resultado final deve ser o nome legível.
            - TEXTO PEQUENO: Leia as letras miúdas para encontrar o sabor ou variante (ex: "Morango", "Zero Açúcar").
            - EXEMPLO BOM: "Refrigerante Coca Cola Zero 2L" ou "Arroz Tio João Parboilizado 5kg".
            - EXEMPLO RUIM: "Coca" ou "Arroz".`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            price: { 
              type: Type.NUMBER,
              description: "O valor numérico do preço encontrado."
            },
            guessedName: { 
              type: Type.STRING,
              description: "O nome detalhado do produto com marca, tipo e peso."
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    const data = JSON.parse(text);
    return {
      price: data.price || 0,
      guessedName: data.guessedName || "Produto Identificado"
    };

  } catch (error: any) {
    // Re-throw offline error if caught during execution
    if (error.message === "OFFLINE_MODE") throw error;
    
    console.error("Gemini analysis error:", error);
    return null;
  }
};