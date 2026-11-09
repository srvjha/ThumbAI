-- AlterTable
ALTER TABLE "PromptFlag" ADD COLUMN     "image_urls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "prompt" TEXT;
