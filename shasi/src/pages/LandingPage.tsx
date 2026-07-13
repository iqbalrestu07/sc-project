import { useEffect } from "react";
import Lenis from "lenis";
import {
  HeroSection,
  AboutSection,
  ServicesSection,
  PromotionsSection,
  GallerySection,
  TestimonialsSection,
  CtaSection,
  ContactSection,
  LandingHeader,
  LandingFooter,
} from "@/components/landing";

export default function LandingPage() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    return () => {
      lenis.destroy();
    };
  }, []);

  return (
    <div className="min-h-screen">
      <LandingHeader />
      <main>
        <HeroSection />
        <AboutSection />
        <ServicesSection />
        <PromotionsSection />
        <GallerySection />
        <TestimonialsSection />
        <CtaSection />
        <ContactSection />
      </main>
      <LandingFooter />
    </div>
  );
}
