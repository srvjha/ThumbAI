export type BlogQuestionnaireData = {
  blogType: string[];
  audience: string[];
  colorScheme: string[];
  thumbnailStyle: string[];
  tone: string[];
};

/**
 * A question shown in the studio before generating. One option per question:
 * several picks per question used to reach the prompt as contradictions
 * ("vibrant" and "minimal" at once).
 *
 * `when` limits a question to requests with (or without) an attached photo:
 * how the user's own face is treated only makes sense when there is one.
 */
export type StudioQuestion = {
  id: string;
  title: string;
  when?: 'photo' | 'no-photo';
  options: { value: string; label: string; description: string }[];
};

export type YoutubeQuestionnaireData = {
  category: string[];
  face: string[];
  person: string[];
  appearance: string[];
  colorScheme: string[];
  thumbnailStyle: string[];
  audience: string[];
};

// Category values are archetype ids in src/server/prompts/archetypes.ts.
export const youtubeQuestionarie: StudioQuestion[] = [
  {
    id: 'category',
    title: 'What kind of video is it?',
    options: [
      {
        value: 'tutorial',
        label: 'Tutorial / how-to',
        description: 'Teaches a skill or walks through steps',
      },
      {
        value: 'explainer',
        label: 'Explainer',
        description: 'Breaks down a concept or answers "why"',
      },
      {
        value: 'launch',
        label: 'Launch / news',
        description: 'Something new was released or announced',
      },
      {
        value: 'review',
        label: 'Review',
        description: 'Your verdict on a product, tool or service',
      },
      {
        value: 'comparison',
        label: 'Comparison',
        description: 'X vs Y, which one wins',
      },
      {
        value: 'listicle',
        label: 'Top N list',
        description: '"7 tools", "10 tips", a ranked list',
      },
      {
        value: 'reaction',
        label: 'Reaction / opinion',
        description: 'Reacting to something or a hot take',
      },
      {
        value: 'story',
        label: 'Story / documentary',
        description: 'What happened, told cinematically',
      },
      {
        value: 'results',
        label: 'Results / case study',
        description: 'Numbers, growth, income, outcomes',
      },
      {
        value: 'podcast',
        label: 'Podcast / interview',
        description: 'A conversation with a guest',
      },
      {
        value: 'vlog',
        label: 'Vlog / lifestyle',
        description: 'Day in the life, travel, routines',
      },
      {
        value: 'gaming',
        label: 'Gaming',
        description: 'Gameplay, builds, speedruns',
      },
      {
        value: 'coding',
        label: 'Coding / tech',
        description: 'Programming, system design, dev tools',
      },
    ],
  },
  {
    id: 'face',
    title: 'How should you appear in the thumbnail?',
    when: 'photo',
    options: [
      {
        value: 'keep',
        label: 'Exactly as in my photo',
        description: 'Your real face and your original expression, untouched',
      },
      {
        value: 'excited',
        label: 'My face, excited',
        description: 'Same face, high-energy expression',
      },
      {
        value: 'curious',
        label: 'My face, curious',
        description: 'Same face, intrigued or surprised',
      },
      {
        value: 'confident',
        label: 'My face, confident',
        description: 'Same face, calm and credible',
      },
      {
        value: 'fun',
        label: 'My face, playful',
        description: 'Same face, smiling and lighthearted',
      },
      {
        value: 'none',
        label: "Don't feature me",
        description: 'Use the photo only as a reference',
      },
    ],
  },
  {
    id: 'person',
    title: 'Should a person appear?',
    when: 'no-photo',
    options: [
      {
        value: 'none',
        label: 'No person',
        description: 'Objects, text and scene only',
      },
      {
        value: 'presenter',
        label: 'A presenter',
        description: 'An AI-generated person reacting to the topic',
      },
    ],
  },
  {
    id: 'appearance',
    title: 'Where should you appear?',
    when: 'photo',
    options: [
      {
        value: 'left',
        label: 'Left side',
        description: 'Headline on the right',
      },
      {
        value: 'right',
        label: 'Right side',
        description: 'Headline on the left',
      },
      {
        value: 'center',
        label: 'Center',
        description: 'Headline above or below',
      },
    ],
  },
  {
    id: 'colorScheme',
    title: 'What color scheme do you prefer?',
    options: [
      {
        value: 'vibrant',
        label: 'Vibrant & Bold',
        description: 'Bright reds, yellows, and electric blues',
      },
      {
        value: 'dark',
        label: 'Dark & Moody',
        description: 'Black, dark grays, and deep purples',
      },
      {
        value: 'minimal',
        label: 'Clean & Minimal',
        description: 'White, light grays, and pastel tones',
      },
      {
        value: 'gradient',
        label: 'Gradients & Neon',
        description: 'Colorful gradients and neon accents',
      },
    ],
  },
  {
    id: 'thumbnailStyle',
    title: 'What should carry the thumbnail?',
    options: [
      {
        value: 'face',
        label: 'A face',
        description: 'Large face with a clear expression',
      },
      {
        value: 'text',
        label: 'The headline',
        description: 'Big bold words do the work',
      },
      {
        value: 'product',
        label: 'An object',
        description: 'A product, gadget, tool or logo',
      },
      {
        value: 'scene',
        label: 'A scene',
        description: 'A cinematic environment',
      },
    ],
  },
  {
    id: 'audience',
    title: 'Who is your target audience?',
    options: [
      {
        value: 'teens',
        label: 'Teens (13-17)',
        description: 'Young, energetic, and trend-focused',
      },
      {
        value: 'young-adults',
        label: 'Young Adults (18-25)',
        description: 'College-aged, lifestyle-oriented viewers',
      },
      {
        value: 'adults',
        label: 'Adults (26-40)',
        description: 'Professionals, families, and working adults',
      },
      {
        value: 'mature',
        label: 'Mature (40+)',
        description: 'Experienced, quality-focused audience',
      },
    ],
  },
];

export const blogQuestionarie: StudioQuestion[] = [
  {
    id: 'blogType',
    title: 'What type of blog is your post?',
    options: [
      {
        value: 'Technology',
        label: 'tech-blog',
        description: 'Tech related content',
      },
      {
        value: 'opinion',
        label: 'Opinion/Editorial',
        description: 'Personal opinion, commentary, or editorials',
      },
      {
        value: 'listicle',
        label: 'Listicle',
        description: 'Posts that feature a list of items or tips',
      },
      {
        value: 'news',
        label: 'News/Announcement',
        description: 'Reports on current events or news updates',
      },
      {
        value: 'review',
        label: 'Product/Service Review',
        description: 'Evaluation of products or services',
      },
      {
        value: 'story',
        label: 'Story/Experience',
        description: 'Personal storytelling and life experiences',
      },
    ],
  },
  {
    id: 'audience',
    title: 'Who is your primary audience?',
    options: [
      {
        value: 'beginners',
        label: 'Beginners',
        description: 'Newcomers to the topic or field',
      },
      {
        value: 'intermediate',
        label: 'Intermediate',
        description: 'Readers with some prior knowledge or experience',
      },
      {
        value: 'advanced',
        label: 'Advanced',
        description: 'Experts and industry professionals',
      },
      {
        value: 'general',
        label: 'General Audience',
        description: 'Open to everyone',
      },
    ],
  },
  {
    id: 'tone',
    title: 'What tone should your blog thumbnail convey?',
    options: [
      {
        value: 'professional',
        label: 'Professional & Trustworthy',
        description: 'Gives off credibility and authority',
      },
      {
        value: 'friendly',
        label: 'Friendly & Approachable',
        description: 'Warm, personal, and welcoming',
      },
      {
        value: 'exciting',
        label: 'Exciting & Bold',
        description: 'Energetic, engaging, and eye-catching',
      },
      {
        value: 'calm',
        label: 'Calm & Minimal',
        description: 'Minimalist, clean, and serene',
      },
    ],
  },
  {
    id: 'thumbnailStyle',
    title: 'What thumbnail style do you prefer?',
    options: [
      {
        value: 'text',
        label: 'Text-Heavy',
        description: 'Bold titles and text overlays',
      },
      {
        value: 'product',
        label: 'Product/Object Focus',
        description: 'Highlighting items, gadgets, or tools',
      },
      {
        value: 'scene',
        label: 'Cinematic Scene',
        description: 'Full scenes or dramatic environments',
      },
    ],
  },
  {
    id: 'colorScheme',
    title: 'Select a color scheme for your thumbnail',
    options: [
      {
        value: 'bright',
        label: 'Bright & Vibrant',
        description: 'Strong colors, high contrast, and attention-grabbing',
      },
      {
        value: 'pastel',
        label: 'Pastel & Soft',
        description: 'Subdued, soft colors for a gentle appearance',
      },
      {
        value: 'dark',
        label: 'Dark & Moody',
        description: 'Darker shades, dramatic and bold',
      },
      {
        value: 'neutral',
        label: 'Neutral & Simple',
        description: 'Monochrome, gray, or natural tones',
      },
    ],
  },
];
