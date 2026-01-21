
import { GoogleGenAI, Type } from "@google/genai";
import { Location } from "../types";

export const generateLocations = async (): Promise<Location[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Generate 10 diverse geographic locations worldwide for a quiz. 
    For each: 
    - Provide 4 plausible options (countries/cities).
    - Identify correct index (0-3).
    - Give a brief atmosphere description for image generation.
    - Return as JSON.`,
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
              items: { type: Type.STRING }
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
  const prompt = `A realistic photographic view of a street or landscape in ${location.name}. ${location.description}. Cinematic, 8k. NO TEXT, NO SIGNS, NO UI. Focus on architecture and nature.`;
  
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
