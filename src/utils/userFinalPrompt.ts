import { OpenAI } from "openai";
import { userPromptRewriting } from "./userPromptRewriting";
import { userChoiceRewriting } from "./userChoiceRewrting";
import { ASPECT_RATIO_INSTRUCTIONS } from "./prompts/aspectRatio";
import { THUMBNAIL_DESIGN_INSTRUCTIONS } from "./prompts/thumbnail";
const client = new OpenAI();

export const generateThumbnailPrompt = async (
  rawUserPrompt: string,
  choices: string,
  rawUserChoice: any,
  aspectRatio: "16:9" | "9:16",
) => {
  //  Rewriting user prompt
  const { valid_prompt, enhanced_prompt } =
    await userPromptRewriting(rawUserPrompt);
  if (!valid_prompt) {
    return { valid_prompt, response: "Please give a meaningfull prompt." };
  }

  // Rewriting user choices
  // let enhancedChoicePrompt = "";
  // if (choices.trim() === "form") {
  //   enhancedChoicePrompt = await userChoiceRewriting(rawUserChoice);
  //   console.log({ enhancedChoicePrompt });
  // }

  //  Generating final thumbnail design instructions
  const finalResponse = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: THUMBNAIL_DESIGN_INSTRUCTIONS },
      {
        role: "user",
        content: `
        Here is the user request with their prompt and thumbnail choices:
        Prompt: ${enhanced_prompt}
        Choice: ${choices}
        ${
          choices.trim() === "form"
            ? `UserChoice: ${JSON.stringify(rawUserChoice, null, 2)}`
            : ""
        }
        AspectRatio: ${aspectRatio}
        `,
      },
    ],
  });

  const finalThumbnailPrompt =
    finalResponse.choices[0].message.content?.trim() ?? enhanced_prompt;

  return { valid_prompt, response: finalThumbnailPrompt };
};
