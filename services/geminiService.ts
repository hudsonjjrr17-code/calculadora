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
            text: "Analise esta etiqueta de preço. Extraia duas informações:\n1. O PREÇO principal.\n2. O NOME do produto. IMPORTANTE: O nome deve conter os NÚMEROS, pesos e medidas escritos na etiqueta (ex: 'Coca Cola 2L', 'Arroz 5kg', 'Biscoito 200g'). Transcreva exatamente o texto que identifica o item com seus números."
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
              description: "O valor do preço encontrado."
            },
            guessedName: { 
              type: Type.STRING,
              description: "O nome completo do produto incluindo números e medidas."
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