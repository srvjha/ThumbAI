import { HomePageBackground } from "@/components/design/HomePageBackground";
import { Footer } from "@/components/ui/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { ShowcaseSection } from "@/components/home/ShowcaseSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HowItWorkSection } from "@/components/home/HowItWorkSection";
import { DemoSection } from "@/components/home/DemoSection";

const Home = () => {
  return (
    <>
      <HomePageBackground />
      <div className="min-h-screen  text-white z-10">
        {/* Hero Section */}
        <HeroSection />

        {/* Showcase Thumbnails  */}
        <ShowcaseSection />

        {/* Features Section */}
        <FeaturesSection />

        {/* How It Works Section */}
        <HowItWorkSection />

        {/* Demo Section */}
        <DemoSection />

        {/* Footer */}
        <Footer />
      </div>
    </>
  );
};

export default Home;
