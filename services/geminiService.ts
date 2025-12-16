import { GoogleGenAI, Type } from "@google/genai";

// Lazy initialization to prevent top-level crashes
let ai: GoogleGenAI | null = null;

const getAi = () => {
  if (!ai) {
    // Safety check: ensure process.env exists or handle gracefully
    // This allows the app to render even if API key setup is pending
    // @ts-ignore
    const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : '';
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
};

export const analyzePriceTag = async (base64Image: string): Promise<{ price: number; guessedName: string } | null> => {
  try {
    const aiClient = getAi();
    
    // Clean the base64 string (remove the data:image/... prefix)
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");

    const response = await aiClient.models.generateContent({
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
            text: "Analyze this supermarket price tag image. Identify the main product price and the product name. Return the price as a number (use period for decimals) and the name as a string. If you cannot find a price, return 0."
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
              description: "The price of the item found in the image."
            },
            guessedName: { 
              type: Type.STRING,
              description: "The name of the product found in the image."
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