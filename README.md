# Image Editor Generator

A powerful, AI-driven image editing tool designed specifically for content creators who need to quickly generate professional thumbnails and social media content. Built with React, Next.js, and integrated with FAL AI for intelligent image processing.

## Features

### Core Functionality
- **AI-Powered Image Editing** - Transform images using natural language prompts
- **Multiple Format Support** - Generate images in YouTube (16:9) and Shorts/Reels (9:16) aspect ratios
- **Batch Processing** - Edit multiple images simultaneously
- **Format Flexibility** - Output in JPEG, PNG, or WEBP formats

### User Experience
- **Drag & Drop Upload** - Intuitive file uploading with visual feedback
- **URL Import** - Direct image import via URL
- **Real-time Preview** - See your images before processing
- **Bulk Download** - Download all edited images as a ZIP file
- **Share Integration** - Native sharing capabilities with fallback to clipboard

## Tech Stack

- **Frontend**: React 18+ with TypeScript
- **Framework**: Next.js 14+ (App Router)
- **Form Management**: React Hook Form
- **UI Components**: Custom components with Tailwind CSS
- **Icons**: Lucide React
- **AI Integration**: FAL AI Client
- **File Processing**: JSZip for bulk downloads
- **Notifications**: React Hot Toast

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/image-editor-generator.git
cd image-editor-generator

# Install dependencies
npm install
# or
yarn install
# or
pnpm install

# Set up environment variables
cp .env.example .env.local
```

## Environment Variables

Create a `.env.local` file in your project root:

```env
NEXT_PUBLIC_FAL_KEY=your_fal_ai_api_key_here
```

## Getting Started

1. **Start the development server**:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

2. **Open your browser** and navigate to `http://localhost:3000`

3. **Upload images** using drag & drop or the file picker

4. **Enter your editing prompt** describing how you want to transform the images

5. **Select style tags** (optional) to enhance the editing process:
   - Choose a mood that fits your content
   - Pick a color theme for consistency
   - Select optimization settings for your use case

6. **Configure output settings**:
   - Number of variations (1-4)
   - Aspect ratios (16:9, 9:16, or both)
   - Output format (JPEG, PNG, WEBP)

7. **Click "Edit Image"** and wait for AI processing

8. **Download or share** your edited images

## Use Cases

### Content Creators
- **YouTube Thumbnails**: Create eye-catching thumbnails with consistent branding
- **Social Media Posts**: Generate content for Instagram, Twitter, Facebook
- **Video Covers**: Design covers for Shorts, Reels, and TikTok videos

### Marketers
- **Campaign Assets**: Quickly adapt images for different platforms
- **A/B Testing**: Generate multiple variations for testing
- **Brand Consistency**: Apply consistent styling across image sets

### Developers
- **Rapid Prototyping**: Generate placeholder images with specific styling
- **Asset Generation**: Create themed images for applications
- **Batch Processing**: Process multiple images with consistent edits

## 🔗 API Integration

The component integrates with several APIs:

### FAL AI Integration
```typescript
// Upload images to FAL storage
const uploadFileToFal = async (file: File): Promise<string> => {
  fal.config({
    credentials: process.env.NEXT_PUBLIC_FAL_KEY,
  });
  const url = await fal.storage.upload(file);
  return url;
};
```

### Custom Edit API
```typescript
// Process images with custom prompts and settings
const response = await axios.post("/api/edit", {
  prompt: data.prompt,
  numImages: data.numImages,
  outputFormat: data.outputFormat,
  images_urls: data.uploadedImages,
  aspectRatio: data.aspectRatios,
});
```

## Customization

1. **Update the form validation** if needed for new requirements

### Styling Customization

The component uses Tailwind CSS with a dark theme. Key design tokens:

- **Background**: `bg-neutral-950` (main), `bg-neutral-900/30` (cards)
- **Borders**: `border-neutral-800` (primary), `border-neutral-700` (secondary)
- **Text**: `text-neutral-100` (primary), `text-neutral-300` (secondary)
- **Accents**: Blue for focus states, gradient buttons for primary actions

## Security Considerations

- **File Upload Validation**: Only image files are accepted
- **URL Validation**: URL inputs are validated before processing
- **API Key Protection**: FAL AI keys are stored as environment variables
- **File Size Limits**: Consider implementing file size restrictions for production

## Deployment

### Vercel (Recommended)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📈 Performance Optimizations

- **Image Lazy Loading**: Images load on demand
- **Efficient State Management**: Minimal re-renders with React Hook Form
- **File Upload Optimization**: Chunked uploads for large files
- **Memory Management**: URL object cleanup after use

## Troubleshooting

### Common Issues

**Images not uploading:**
- Check FAL AI API key configuration
- Verify network connectivity
- Ensure image file formats are supported

**Slow processing:**
- Large images may take longer to process
- Consider resizing images before upload
- Check API rate limits

**Download failures:**
- Browser popup blockers may prevent downloads
- Check CORS settings for external image URLs

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Use meaningful component and variable names
- Add proper error handling for all async operations
- Include proper accessibility attributes

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [FAL AI](https://fal.ai/) for powerful image processing capabilities
- [Lucide React](https://lucide.dev/) for beautiful icons
- [Tailwind CSS](https://tailwindcss.com/) for utility-first styling
- [React Hook Form](https://react-hook-form.com/) for efficient form management

## Roadmap

- [ ] Add more aspect ratio options (1:1, 4:5, etc.)
- [ ] Implement image filters and effects
- [ ] Add collaborative editing features
- [ ] Include template library
- [ ] Add AI-suggested prompts
- [ ] Implement user accounts and history
- [ ] Add batch editing workflows
- [ ] Include analytics and usage tracking

---

**Built with ❤️ for content creators worldwide**
