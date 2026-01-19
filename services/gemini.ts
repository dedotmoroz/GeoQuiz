
import { GoogleGenAI, Type } from "@google/genai";
import { Location } from "../types";

export const generateLocations = async (): Promise<Location[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Сгенерируй список из 10 случайных и интересных географических локаций по всему миру для игры-викторины. 
    Для каждого места предложи 4 варианта ответа (названия стран или известных городов), из которых только один правильный.
    ПРАВИЛА:
    1. Локации должны быть разнообразными (разные континенты).
    2. Варианты ответов должны быть правдоподобными (например, если это город в Европе, другие варианты тоже должны быть европейскими).
    3. Не используй слишком очевидные туристические места.
    4. Укажи индекс правильного ответа (от 0 до 3).`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            lat: { type: Type.NUMBER },
            lng: { type: Type.NUMBER },
            name: { type: Type.STRING },
            options: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "4 варианта ответа, где один правильный."
            },
            correctOptionIndex: { type: Type.INTEGER },
            description: { type: Type.STRING },
          },
          required: ["lat", "lng", "name", "options", "correctOptionIndex", "description"]
        }
      }
    }
  });
  
  const text = response.text || "[]";
  return JSON.parse(text);
};

export const generateStreetViewImage = async (location: Location): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `A high-quality photographic panorama of a street or landscape in ${location.name}. 
  Context: ${location.description}. 
  STYLE: Realistic, cinematic, 8k resolution.
  IMPORTANT: 
  - ABSOLUTELY NO TEXT, NO SIGNS with names, NO LABELS.
  - No watermarks or digital UI elements.
  - Focus on local architecture, road type, nature and atmosphere.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: "16:9" } }
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Image generation failed");
};
