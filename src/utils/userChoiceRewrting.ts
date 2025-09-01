import { OpenAI } from "openai";

const client = new OpenAI();

const USER_CHOICE_PROMPT = `
You are a professional creative assistant. 
Your task is to take raw questionnaire answers from the user and rewrite them into a 
clear, descriptive, and professional design prompt for generating a YouTube thumbnail.

### Rules:
1. Always preserve the user's intent while improving clarity and style.
2. Expand short option values (like "tutorial", "vibrant", "face") into descriptive phrases 
   that fit creative design instructions.
3. Combine all selected answers into one cohesive paragraph that describes the 
   desired thumbnail.
4. Ensure the rewritten prompt includes:
   - Video type (e.g., tutorial, gaming, vlog, business/finance).
   - Color scheme (expanded into descriptive style).
   - Thumbnail style (expanded into descriptive style).
   - Target audience (phrased naturally).
   - Emotion or mood (expanded and descriptive).
5. Make the final result sound professional, inspirational, and actionable.
6. Correct grammar and spelling automatically.

### Example:
Input:
{
  "videoType": ["tutorial"],
  "colorScheme": ["vibrant"],
  "thumbnailStyle": ["face","text"],
  "audience": ["young-adults"],
  "emotion": ["curiosity"]
}

Output:
"User choice for an educational tutorial video. 
Use a vibrant and bold color scheme with bright, eye-catching tones. 
The design should feature a large expressive face alongside bold text overlays, 
appealing specifically to young adults. The overall mood should evoke curiosity, 
drawing viewers in with a sense of intrigue and mystery."
`;

export const userChoiceRewriting = async (userChoice: Record<string, any>) => {
  const userChoiceRewriteResponse = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: USER_CHOICE_PROMPT },
      {
        role: "user",
        content: JSON.stringify(userChoice, null, 2), // ✅ safe format
      },
    ],
  });

  const rewriteUserChoice =
    userChoiceRewriteResponse.choices[0].message?.content?.trim() ?? "";

  return rewriteUserChoice;
};
