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
  //  Rewriting user prompt
  const enhancedPrompt = await userPromptRewriting(rawUserPrompt);
  console.log({enhancedPrompt})

  // Rewriting user choices
  let enhancedChoicePrompt = ""
  if(Object.values(rawUserChoice).length>0){
   enhancedChoicePrompt = await userChoiceRewriting(rawUserChoice);
   console.log({enhancedChoicePrompt})
  }

  //  Applying aspect ratio instructions
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

  //  Generating final thumbnail design instructions
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
    console.log({finalThumbnailPrompt})

  return finalThumbnailPrompt;
};
