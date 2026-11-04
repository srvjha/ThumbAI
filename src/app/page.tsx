import { Footer } from '@/components/ui/Footer';
import { MotionRoot } from '@/components/motion/MotionRoot';
import { Hero } from '@/components/landing/Hero';
import { YouTubeSection } from '@/components/landing/YouTubeSection';
import { Workflows } from '@/components/landing/Workflows';
import { SamplesGallery } from '@/components/landing/SamplesGallery';
import { PricingTeaser } from '@/components/landing/PricingTeaser';
import { FinalCta } from '@/components/landing/FinalCta';

// Still a server component: MotionRoot only provides the motion features to
// the client islands inside it. `.landing` puts the page on white, with the
// usual paper kept for its tiles and for the footer it runs into.
const Home = () => (
  <MotionRoot>
    <main className='landing overflow-x-clip bg-background'>
      <Hero />
      <Workflows />
      <YouTubeSection />
      <SamplesGallery />
      <PricingTeaser />
      <FinalCta />
    </main>
    <Footer />
  </MotionRoot>
);

export default Home;
