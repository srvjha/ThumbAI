
export type BlogQuestionnaireData = {
  blogType: string[];
  audience: string[];
  colorScheme: string[];
  thumbnailStyle: string[];
  tone: string[];
};

export type youtubeQuestionarieData = {
  category: string[];
  appearance: string[];
  colorScheme: string[];
  thumbnailStyle: string[];
  tone: string[];
};

export const youtubeQuestionarie = [
  {
    id: 'category',
    title: 'For which category of video content are you creating?',
    options: [
      {
        value: 'tutorial',
        label: 'Tutorial/Educational',
        description: 'How-to guides, lessons, and explanations',
      },
      {
        value: 'gaming',
        label: 'Gaming Content',
        description: 'Gameplay, reviews, and gaming news',
      },
      {
        value: 'vlog',
        label: 'Vlog/Lifestyle',
        description: 'Personal vlogs, daily life, and lifestyle tips',
      },
      {
        value: 'business',
        label: 'Business/Finance',
        description: 'Entrepreneurship, investing, and business tips',
      },
      {
        value: 'review',
        label: 'Review/Reaction',
        description: 'Reactions or reviews on a specific topic',
      },
      {
        value: 'entertainment',
        label: 'Entertainment/Fun',
        description: 'Comedy, challenges, memes, and fun content',
      },
    ],
  },
  {
    id: 'appearance',
    title: 'On which side do you want your face to appear?',
    options: [
      {
        value: 'left',
        label: 'Left Side',
        description:
          'Your face will be positioned on the left side of the thumbnail',
      },
      {
        value: 'right',
        label: 'Right Side',
        description:
          'Your face will be positioned on the right side of the thumbnail',
      },
      {
        value: 'center',
        label: 'Center',
        description:
          'Your face will be positioned in the center of the thumbnail',
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
    title: 'What thumbnail style do you prefer?',
    options: [
      {
        value: 'face',
        label: 'Face-Focused',
        description: 'Large face with expressive emotions',
      },
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
  {
    id: 'emotion',
    title: 'What emotion should your thumbnail convey?',
    options: [
      {
        value: 'excitement',
        label: 'Excitement',
        description: 'High energy, enthusiasm, and wow factor',
      },
      {
        value: 'curiosity',
        label: 'Curiosity',
        description: 'Mystery, intrigue, and thought-provoking visuals',
      },
      {
        value: 'trust',
        label: 'Trust & Authority',
        description: 'Professional, credible, and reliable impression',
      },
      {
        value: 'fun',
        label: 'Fun & Playful',
        description: 'Lighthearted, entertaining, and humorous vibe',
      },
    ],
  },
];


export const blogQuestionarie = [
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