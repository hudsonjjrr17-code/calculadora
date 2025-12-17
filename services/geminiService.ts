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

export const analyzePriceTag = async (base64Image: string): Promise<
  { price: number; guessedName: string; productCode?: string } | null
> => {
  try {
    const client = getAiClient();
    
    // The base64 string is already clean (without data:image/... prefix)
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `Analise a imagem da etiqueta de preço e retorne APENAS um objeto JSON com:
- "price": o preço como um número (ex: 12.99).
- "guessedName": o nome do produto.
Se não encontrar um preço, retorne o preço como 0.`
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
              description: "O valor numérico do preço encontrado, ou 0 se não houver."
            },
            guessedName: { 
              type: Type.STRING,
              description: "O nome detalhado do produto."
            }
          },
          required: ["price", "guessedName"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    const data = JSON.parse(text);

    return {
      price: data.price || 0,
      guessedName: data.guessedName || "Item não identificado",
    };

  } catch (error) {
    console.error("Gemini analysis error:", error);
    return null;
  }
};