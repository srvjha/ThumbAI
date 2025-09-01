import { OpenAI } from "openai";
import { userPromptRewriting } from "./userPromptRewriting";
import { userChoiceRewriting } from "./userChoiceRewrting";
import { ASPECT_RATIO_INSTRUCTIONS } from "./prompts/aspectRatio";
import { THUMBNAIL_DESIGN_INSTRUCTIONS } from "./prompts/thumbnail";
const client = new OpenAI();

export const generateThumbnailPrompt = async (
  rawUserPrompt: string,
  rawUserChoice: any,
  aspectRatio: "16:9" | "9:16"
) => {
  // Step 1: Rewrite user free-text prompt
  const enhancedPrompt = await userPromptRewriting(rawUserPrompt);

  // Step 2: Rewrite structured user choices
  let enhancedChoicePrompt = ""
  if(rawUserChoice.length>0){
   enhancedChoicePrompt = await userChoiceRewriting(rawUserChoice);
  }

  // Step 3: Apply aspect ratio instructions
  const aspectRatioResponse = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: ASPECT_RATIO_INSTRUCTIONS },
      {
        role: "user",
        content: `Please refine this thumbnail request with correct aspect ratio (${aspectRatio}):  
        ${enhancedPrompt}\n\n${enhancedChoicePrompt}`,
      },
    ],
  });
  const refinedAspectRatioPrompt =
    aspectRatioResponse.choices[0].message.content?.trim() ?? "";

  // Step 4: Generate final thumbnail design instructions
  const finalResponse = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: THUMBNAIL_DESIGN_INSTRUCTIONS },
      {
        role: "user",
        content: `Here is the refined user request:  
        ${refinedAspectRatioPrompt}`,
      },
    ],
  });

  const finalThumbnailPrompt =
    finalResponse.choices[0].message.content?.trim() ?? refinedAspectRatioPrompt;

  return finalThumbnailPrompt;
};
