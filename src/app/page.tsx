import { Footer } from '@/components/ui/Footer';
import { MotionRoot } from '@/components/motion/MotionRoot';
import { Hero } from '@/components/landing/Hero';
import { WhySection } from '@/components/landing/WhySection';
import { Workflows } from '@/components/landing/Workflows';
import { SamplesGallery } from '@/components/landing/SamplesGallery';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { PricingTeaser } from '@/components/landing/PricingTeaser';
import { FinalCta } from '@/components/landing/FinalCta';

// Still a server component: MotionRoot only provides the motion features to
// the client islands inside it.
const Home = () => (
  <MotionRoot>
    <main className='overflow-x-clip'>
      <Hero />
      <WhySection />
      <Workflows />
      <SamplesGallery />
      <HowItWorks />
      <PricingTeaser />
      <FinalCta />
    </main>
    <Footer />
  </MotionRoot>
);

export default Home;
