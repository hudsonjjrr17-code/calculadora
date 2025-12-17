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
    
    // Clean the base64 string (remove the data:image/... prefix)
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
            text: `Analise a imagem da etiqueta de preço. Extraia as seguintes informações e retorne APENAS um objeto JSON.
- **price**: O preço principal, como um número (ex: 12.99). Se não houver preço, retorne 0.
- **guessedName**: O nome do produto, o mais completo possível.
- **productCode**: O código de barras ou SKU, se visível.
- **transcription**: A transcrição completa de todo o texto na imagem.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            transcription: {
              type: Type.STRING,
              description: "A transcrição completa de todo o texto visível na imagem."
            },
            price: { 
              type: Type.NUMBER,
              description: "O valor numérico do preço encontrado, ou 0 se não houver."
            },
            guessedName: { 
              type: Type.STRING,
              description: "O nome detalhado do produto ou a descrição principal do texto."
            },
            productCode: {
              type: Type.STRING,
              description: "O código de barras ou SKU do produto, se encontrado."
            }
          },
          required: ["transcription", "price", "guessedName"]
        }
      }
    });

    const text = response.text;
    if (!text) return null;

    const data = JSON.parse(text);

    // Use a transcrição como fallback se o nome não for identificado
    const finalName = data.guessedName || data.transcription || "Item não identificado";

    return {
      price: data.price || 0,
      guessedName: finalName.trim() === "" ? "Item não identificado" : finalName,
      productCode: data.productCode
    };

  } catch (error) {
    console.error("Gemini analysis error:", error);
    return null;
  }
};