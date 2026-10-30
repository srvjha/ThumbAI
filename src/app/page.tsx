import { Footer } from '@/components/ui/Footer';
import { Hero } from '@/components/landing/Hero';
import { WhySection } from '@/components/landing/WhySection';
import { Workflows } from '@/components/landing/Workflows';
import { SamplesGallery } from '@/components/landing/SamplesGallery';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { PricingTeaser } from '@/components/landing/PricingTeaser';
import { FinalCta } from '@/components/landing/FinalCta';

const Home = () => (
  <>
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
  </>
);

export default Home;
