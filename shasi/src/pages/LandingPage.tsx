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
