export const categoryWiseData = {
  tutorial: `
    Composition & subject
    Place a close-up portrait of the instructor on the direction user has appearance (shoulders-up, expressive/confident), other side half reserved for the headline; face lit with rim light so it pops from the background.

    Headline & typography
    Big, 3–6 word headline on the direction using a heavy sans-serif (Impact/Montserrat-like). Make the keyword two-tone (neutral white + bright accent like yellow or cyan), add a thick dark outline and drop shadow so it’s readable at small sizes.

    Icons & symbols (always include)
    Extract 1–3 tech keywords from the tutorial title (e.g., Docker, Node, LLM, Python). Render matching simple icons/logos inside small rounded badges or tilted circles near the bottom-left/bottom-right (based on where user face is present) or next to the keyword; add a subtle glow or stroke to each icon.

    Background & effects
    Use a high-contrast gradient (dark → vivid color) with subtle tech texture (circuit lines, code blur). Add a soft light burst or halo behind the face and a vignette around edges for focus.

    Callouts, readability & export
    Add a small tag or callout ("NEW", "Quick", "Run LLM") or a question mark arrow to emphasize value. .
    `,

  gaming: `
     Main Character / Game Scene
     Show a dramatic in-game action moment or key scene as the main focus (e.g., a car crash, boss fight, explosion). Place it in the center or slightly to the left, making sure it’s clear and vibrant.

     Streamer / Player Reaction
     Add a close-up of the streamer or player on the right side with an exaggerated facial expression (surprised, shocked, excited). Make sure their face is well-lit and cut out cleanly with a slight glow or outline to pop.

     Title & Text Elements
     Include a short, bold title at the top or top-left with a mix of white + bright accent colors (like yellow, cyan, or red). Highlight key words in a different color (e.g., DESTROYING $5,000,000 SUPERCAR). Add episode numbers in bold at the bottom-left if it’s a series (#158).

     Game Logo / Branding
     Place the game’s logo in a top corner for instant recognition (like GTA V or Minecraft logo). Keep it small but visible, usually top-left or top-right.

     Dynamic Effects & Colors
     Add extra effects like fire, lightning, TNT explosions, speed lines, or glowing edges around weapons or vehicles to create excitement. Use high-contrast, colorful backgrounds with clear separation between elements for maximum visibility.
    `,

  vlog: `
    Use a relatable face with a clear emotion or action. 
    The thumbnails feature a person (or people) making a direct connection with the viewer through a dynamic pose or expression. Use a close-up shot of the face to highlight the emotion. For example, a shocked face for a surprising result, a focused look for a tutorial, or a happy expression for a positive outcome.

    Add large, bold, and high-contrast text. 
    The text is the primary element that grabs attention and provides context. Make it stand out with a thick, simple font and a solid background color that contrasts sharply with the text itself. The text should be short and to the point, using keywords from the video's title to tell a quick story, like "MUH TUT GAYA!" (My mouth broke!) or a phrase related to the tutorial.

    Include key props or visual elements from the video. 
    The thumbnails use objects that are central to the image's content to add more information. This could be a football and guitar for a sports-and-music theme, or a gaming keyboard for a tech-related video. These props visually represent the topic and make the thumbnail more informative.

    Use bright, eye-catching colors and outlines. The thumbnails have a vibrant, almost cartoonish look. Use a bright color palette and make sure to add strong outlines, like the white "glow" around the subjects and the text, to make them pop against the background. This creates a clear visual separation between the elements and makes the thumbnail easy to read, even when it's small.
    Craft a scene that tells a story. Instead of a generic shot, each thumbnail is a mini-story in a single frame. The scene is set with a background that hints at the video's location (a grassy yard, a living room, a gaming setup) and the subjects are arranged to create a narrative. The composition should feel natural and engaging, making the viewer want to click to find out what happens next.

    `,
  business: `
    Prominently feature a confident professional or expert. 
    The thumbnails center on a person, often an authority figure in the field, making direct eye contact with the viewer. The person should have a clean, professional appearance to build trust and credibility.

    Use bold, clear, and high-impact text to highlight the topic. 
    The title is the most important element. Use a large, bold font with a strong color contrast (e.g., yellow text on a black background) to make it stand out. The text should convey the core value proposition of the video, like "Finance Masterclass" or "How to Increase Your Financial IQ."

    Incorporate symbolic visuals related to finance and growth. 
    Use graphics that represent money, success, and investment. Examples include stacks of gold coins or currency, which immediately signal the topic is about finance and wealth. These visuals serve as a metaphor for the financial concepts being discussed.

    Add secondary text or badges to show social proof and authority. 
    The thumbnails include small, eye-catching text boxes or badges that provide extra information and credibility. These can include view counts ("8 Lakhs+ views"), ranking ("No.1"), or a specific step number ("Step - 35"), which suggests the video is part of a series or has proven success.

    Maintain a dark, professional background. 
    The backgrounds are generally dark and simple, which helps the bright text and the central figure stand out. The dark background adds to the serious and professional tone, making the thumbnail feel like an educational resource rather than entertainment.
    `,
  review: `
    Hero composition & expression

    Prompt: Close-up, centered mid-shot of a person in the image (excited/surprised expression), holding the main dish in hands. Place several complimentary food items (plates, sides) arranged around the person in the foreground. Shallow depth-of-field: subject crisp, background strongly blurred.

    Use: {MAIN_FOOD} appears in the main plate; always “food around the person.”

    Vivid color + lighting treatment

    Prompt: High saturation, high contrast, HDR look. Warm rim-light on the subject, slight vignette, strong pop (boost midtones). Colors punchy — emphasize yellows, reds and cyan sky for contrast.

    Use: makes the food and face “read” at small sizes.

    Bold text & callouts

    Prompt: Add a short, 1–3 word bold headline in uppercase (thick sans-serif) inside a rectangular color banner (top-right or top-left). Add a secondary bubble/badge for price or status (e.g., "UNDER $1", "VIRAL"). Use white stroke + drop shadow to separate from background.

    Use: derive headline words from user keywords ("VIRAL {MAIN_FOOD}", "{CITY} STREET FOOD", "UNDER {PRICE}").

    Graphical accents & ratings

    Prompt: Include small icons: 4–5 yellow stars, a colored arrow pointing to the food, and a green/red "UNDERRATED/OVERATED" tag if comparative. Give the person and food a thin white cutout outline + soft glow to separate from busy background.

    Use: quick visual cues for review/rating content.

    Technical & format specs + variable placeholders
    `,
  entertainment: `
    Dynamic Character Pose & Facial Expression

    Prompt: Center the person(s) with BIG, exaggerated facial expressions (shock, laughter, confusion). Use open hands, pointing fingers, or props that hint at the video’s theme. Slight tilt or zoom-in to create energy.

    Use: Capture raw emotion — excitement, surprise, or humor — so viewers feel the vibe instantly.

    Bold Colors & Background Drama

    Prompt: Use bright, contrasting colors in the background (split backgrounds work great — half red/half blue, or gradient explosions). Add motion blur, speed lines, or abstract rays for action feel.

    Use: Makes the thumbnail look like a “moment” from the video rather than a static shot.

    Text That Teases, Not Tells

    Prompt: Add short, curiosity-driven text in big bold uppercase — 1–4 words max ("INSANE!", "TRY NOT TO LAUGH", "EXTREME CHALLENGE"). Use playful fonts with outline + drop shadow for readability.

    Use: Should make viewers curious, not give away the whole video.

    Props, Icons & Emojis for Fun

    Prompt: Include relevant props (mic, camera, challenge item) and expressive emojis (😱🔥😂➡️) to quickly show mood. Add arrows pointing to key things (faces, objects).

    Use: Arrows + emojis guide the eye to the most interesting part.

    Composition & Technical Specs

    Prompt (template):

    Vibrant YouTube thumbnail, 16:9 (1280×720). {PERSON_DESC} centered, exaggerated facial expression ({EMOTION}), pointing or gesturing. Background is bright and dynamic with gradient or motion elements. Text: "{HOOK_TEXT}" in bold, outlined, playful font. Add arrows, emojis, and any props from video ({PROPS}). White outline around subject, soft glow, high saturation, sharp focus, readable at small sizes.


    Placeholders to fill:
    {PERSON_DESC} (solo or group, age/look), {EMOTION} (shock, laughing, scared), {HOOK_TEXT} (short title/teaser), {PROPS} (challenge items, funny objects).
    `,
};
