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
            text: "Analise esta imagem de etiqueta de supermercado. Identifique o PREÇO principal do produto e o NOME do produto. Retorne o preço como um número (float) e o nome como string. Se não encontrar o preço, retorne 0."
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
              description: "O preço do item encontrado na imagem."
            },
            guessedName: { 
              type: Type.STRING,
              description: "O nome curto do produto encontrado na imagem."
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
      guessedName: data.guessedName || ""
    };

  } catch (error) {
    console.error("Gemini analysis error:", error);
    return null;
  }
};