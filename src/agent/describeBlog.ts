'use server';
import { Agent, run } from '@openai/agents';
import { z } from 'zod';
import { ArticleFetchError, fetchArticle } from '@/lib/fetchArticle';
import { PROMPT_MODEL } from '@/config/models';

/**
 * Validates a blog URL and drafts a cover-image prompt from the page's real
 * content.
 *
 * Replaces detectBlog + generatePromptForBlog, which each handed a bare URL
 * string to a model with no browsing tool. Neither could see the page, so
 * "is this a blog?" and the resulting design prompt were both guesses derived
 * from the URL slug. Two sequential calls, both hallucinating.
 */

const blogCoverSchema = z.object({
  isBlog: z
    .boolean()
    .describe(
      'True if the page is an article, blog post, or written editorial piece.',
    ),
  reason: z
    .string()
    .describe('Short explanation, shown to the user when isBlog is false.'),
  title: z.string().describe("The article's actual headline."),
  prompt: z
    .string()
    .describe(
      'A detailed image-generation prompt for the cover image. Empty when isBlog is false.',
    ),
});

export type BlogCover = z.infer<typeof blogCoverSchema>;

const blogCoverAgent = new Agent({
  name: 'Blog Cover Designer',
  instructions: `
You are an editorial art director. You are given the extracted contents of a web
page and must decide whether it is a written article, then design a cover image
for it.

First decide: is this an article, blog post, or editorial piece? Documentation
pages, product landing pages, pricing pages, search results and link
aggregators are NOT articles. If it is not, set isBlog false, explain briefly
in reason, and leave prompt empty.

If it IS an article, write an image-generation prompt for a 16:9 cover image.
Ground every choice in the article's actual content — reference the specific
subject matter, not generic stock imagery.

The prompt must specify:
- Subject and action: the concrete central image, ideally a visual metaphor for
  the article's core insight rather than a literal depiction of its topic.
- Composition: where the subject sits, and where negative space is left.
- Art style: be specific (3D isometric, flat vector, cinematic photography,
  digital oil painting, risograph, etc).
- Colour palette: named colours or hex values, with a dark background.
- Lighting and atmosphere.
- Typography: the exact short headline text to render (5 words maximum, drawn
  from the real title), its placement at the top, and that it must be bold,
  legible and correctly spelled.

Write it as flowing descriptive prose, not a numbered list. Be specific and
detailed — modern image models reward detail. Do not invent facts that are not
supported by the page contents.
`,
  outputType: blogCoverSchema,
  model: PROMPT_MODEL,
});

export const describeBlog = async (url: string): Promise<BlogCover> => {
  let article;

  try {
    article = await fetchArticle(url);
  } catch (err) {
    return {
      isBlog: false,
      reason:
        err instanceof ArticleFetchError
          ? err.message
          : 'Could not read that URL.',
      title: '',
      prompt: '',
    };
  }

  // A page with no readable prose is not an article we can design for.
  if (article.text.length < 200 && article.headings.length === 0) {
    return {
      isBlog: false,
      reason: 'That page has no readable article text.',
      title: article.title,
      prompt: '',
    };
  }

  const context = `
URL: ${article.url}
Title: ${article.title || '(none found)'}
Meta description: ${article.description || '(none found)'}
Headings:
${article.headings.map((heading) => `- ${heading}`).join('\n') || '(none found)'}

Page text:
${article.text}
`.trim();

  const result = await run(blogCoverAgent, context);

  if (!result.finalOutput) {
    return {
      isBlog: false,
      reason: 'Could not analyse that article.',
      title: article.title,
      prompt: '',
    };
  }

  return result.finalOutput;
};
