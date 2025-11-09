import { OpenAI } from 'openai';

const client = new OpenAI();

const USER_CHOICE_PROMPT = `
You are a professional creative assistant. 
Your task is to take raw questionnaire answers from the user and rewrite them into a 
clear, descriptive, and professional design specification for a YouTube thumbnail.

### Rules:
1. Preserve the user's intent while improving clarity and style.
2. Expand short option values (like "tutorial", "vibrant", "face") into descriptive phrases 
   that fit creative design instructions.
3. Combine all selected answers into one cohesive paragraph that **describes** what the thumbnail should look like.
4. Always phrase in **descriptive form** (e.g., "The thumbnail should feature..." not "Create...").
5. Include:
   - Video type (e.g., tutorial, gaming, vlog, business/finance).
   - Color scheme (expanded into descriptive style).
   - Thumbnail style (expanded into descriptive style).
   - Target audience (phrased naturally).
   - Emotion or mood (expanded and descriptive).
6. Make the final result sound professional, inspirational, and actionable.
7. Correct grammar and spelling automatically.

### Example:
Input:
{
  "category": ["tutorial"],
  "appearance":["left"]
  "colorScheme": ["vibrant"],
  "thumbnailStyle": ["face","text"],
  "audience": ["young-adults"],
  "emotion": ["curiosity"]
}

Output:
"The thumbnail should represent an educational tutorial video. 
It should use a vibrant, bold color scheme with bright, eye-catching tones. 
The design should prominently feature a large expressive face paired with bold, clear text overlays, 
appealing specifically to young adults. The overall mood should evoke curiosity, inviting viewers 
with a sense of intrigue and discovery."
`;

export const userChoiceRewriting = async (userChoice: Record<string, any>) => {
  const userChoiceRewriteResponse = await client.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      { role: 'system', content: USER_CHOICE_PROMPT },
      {
        role: 'user',
        content: JSON.stringify(userChoice, null, 2),
      },
    ],
  });

  const rewriteUserChoice =
    userChoiceRewriteResponse.choices[0].message?.content?.trim() ?? '';

  return rewriteUserChoice;
};
