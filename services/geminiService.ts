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
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `Atue como um sistema OCR especialista em varejo. Sua tarefa é analisar a imagem e retornar um JSON estruturado seguindo estas regras:
            1. **Transcreva TODO o texto visível na imagem**, sem exceção. Inclua nomes, números, pesos e códigos de barras.
            2. **Identifique o NOME COMPLETO do produto** a partir do texto transcrito. Combine marca, nome, variante (sabor, tipo) e peso/volume (ex: "Leite Ninho Integral 1L"). Seja o mais detalhado e completo possível. O nome NUNCA deve ser vazio.
            3. **Identifique o PREÇO PRINCIPAL do produto**. Procure por 'R$', cifrões, ou números em grande destaque. Retorne como um número (ex: 12.99).
            4. **Extraia Códigos**: Se houver um código de barras numérico ou qualquer outro código de produto (SKU, etc), extraia-o como uma string.
            
            Se o preço não for encontrado, retorne 0 para o campo 'price'. Se o nome não for claro, use a transcrição para montar a melhor descrição possível.`
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
              description: "O nome detalhado do produto com marca, tipo e peso."
            },
            productCode: {
              type: Type.STRING,
              description: "O código de barras ou SKU do produto, se encontrado."
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
      guessedName: data.guessedName || "Produto Não Identificado",
      productCode: data.productCode
    };

  } catch (error) {
    console.error("Gemini analysis error:", error);
    return null;
  }
};