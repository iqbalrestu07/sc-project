import { useEffect, Suspense, lazy } from "react";
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
import { usePublicClinicInfo } from "@/hooks/usePublicClinicInfo";
import { useDynamicFavicon } from "@/hooks/useDynamicFavicon";
import { useDeviceCapability } from "@/hooks/useDeviceCapability";
import { getLandingMode } from "@/config/landingMode";

// Lazy-load 3D scenes (code splitting — Three.js tidak masuk main bundle)
const Full3DScene = lazy(() => import("@/components/landing/Full3DScene"));

export default function LandingPage() {
  const { data: clinicInfo } = usePublicClinicInfo();
  useDynamicFavicon(clinicInfo?.favicon_url);
  const { supports3D } = useDeviceCapability();

  // Determine which 3D mode to use:
  // 1. If device doesn't support 3D → "2d" (no 3D at all)
  // 2. Otherwise use the mode from env variable (default: "hero3d")
  //    - "hero3d": 3D only in Hero section (HeroSection handles its own canvas)
  //    - "full3d": single canvas scroll-journey behind all sections
  //    - "2d":     no 3D, pure CSS/parallax
  const configMode = getLandingMode();
  const mode = supports3D ? configMode : "2d";

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
    <div className="min-h-screen relative">
      {/* ─── 3D Background Layer (full3d mode only) ──────────────────────────── */}
      {/* Single canvas scroll-journey di belakang semua section.
          pointer-events-none supaya HTML section di atas tetap bisa di-klik. */}
      {mode === "full3d" && (
        <Suspense fallback={null}>
          <Full3DScene />
        </Suspense>
      )}

      {/* ─── HTML Content Layer ─────────────────────────────────────────────── */}
      <LandingHeader />

      {/* z-10 supaya HTML content di atas 3D canvas di full3d mode */}
      <main className={mode === "full3d" ? "relative z-10" : ""}>
        {/*
          HeroSection mengecek getLandingMode() sendiri:
          - hero3d → render Hero3DScene internal
          - full3d → skip Hero3DScene (Full3DScene sudah jadi background)
          - 2d → skip 3D, pakai parallax CSS
        */}
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
