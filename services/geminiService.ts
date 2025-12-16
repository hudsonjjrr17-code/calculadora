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
      model: 'gemini-2.5-flash',
      // Fix: The 'contents' property must be an array of Content objects.
      // The previous implementation was passing a single object instead of an array containing the object.
      contents: [{
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `Sua tarefa é atuar como um sistema OCR avançado. Analise a imagem e retorne um JSON.
            1. **transcription**: Transcreva absolutamente TODO texto e número que você conseguir ver na imagem, na ordem em que aparecem. Este campo é obrigatório.
            2. **price**: A partir da transcrição, encontre o número que mais parece ser um preço (ex: com 'R$', vírgula, ou em destaque). Retorne como um número. Se não encontrar, retorne 0.
            3. **guessedName**: Com base no texto transcrito, monte o nome mais descritivo possível para o item. Se for um produto, inclua marca e detalhes. Se for apenas texto genérico, use as palavras mais importantes. O nome não deve ser vazio.
            4. **productCode**: Extraia qualquer código de barras numérico ou SKU que encontrar.`
          }
        ]
      }],
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