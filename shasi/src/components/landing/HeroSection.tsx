import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Calendar, Crown } from "lucide-react";
import { useCmsHero } from "@/hooks/useCmsData";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const MAROON = "#6B0F1A";
const MAROON_DARK = "#3D0610";
const MAROON_MID = "#8B1A2A";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C870";
const GOLD_PALE = "#F5E6B5";

// ─── Star / sparkle generators ────────────────────────────────────────────────
interface Star {
  id: number;
  top: string;
  left: string;
  size: number;
  twinkleDuration: string;
  twinkleDelay: string;
  type: "dot" | "cross";
}

function generateStars(count: number): Star[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 2.5 + 1,
    twinkleDuration: `${(Math.random() * 3 + 2).toFixed(1)}s`,
    twinkleDelay: `${(Math.random() * 5).toFixed(1)}s`,
    type: Math.random() > 0.82 ? "cross" : "dot",
  }));
}

interface Sparkle {
  id: number;
  left: string;
  size: number;
  floatDuration: string;
  floatDelay: string;
  color: string;
}

function generateSparkles(count: number): Sparkle[] {
  const colors = [
    `rgba(201, 168, 76, 0.9)`,   // gold
    `rgba(232, 200, 112, 0.8)`,  // gold light
    `rgba(245, 230, 181, 0.75)`, // gold pale
    `rgba(255, 255, 255, 0.6)`,  // white
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: Math.random() * 4 + 3,
    floatDuration: `${(Math.random() * 4 + 5).toFixed(1)}s`,
    floatDelay: `${(Math.random() * 8).toFixed(1)}s`,
    color: colors[Math.floor(Math.random() * colors.length)],
  }));
}

// ─── StarField ────────────────────────────────────────────────────────────────
function StarField() {
  const stars = useMemo(() => generateStars(120), []);
  const sparkles = useMemo(() => generateSparkles(20), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {stars.map((star) =>
        star.type === "dot" ? (
          <span
            key={star.id}
            className="absolute rounded-full animate-twinkle"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              backgroundColor: GOLD_PALE,
              opacity: 0,
              "--twinkle-duration": star.twinkleDuration,
              "--twinkle-delay": star.twinkleDelay,
            } as React.CSSProperties}
          />
        ) : (
          <span
            key={star.id}
            className="absolute animate-twinkle"
            style={{
              top: star.top,
              left: star.left,
              opacity: 0,
              "--twinkle-duration": star.twinkleDuration,
              "--twinkle-delay": star.twinkleDelay,
            } as React.CSSProperties}
          >
            <span style={{ display: "block", position: "relative", width: star.size * 3, height: star.size * 3 }}>
              <span style={{ position: "absolute", top: "50%", left: 0, width: "100%", height: star.size * 0.7, marginTop: -(star.size * 0.35), background: GOLD_PALE, borderRadius: star.size }} />
              <span style={{ position: "absolute", left: "50%", top: 0, height: "100%", width: star.size * 0.7, marginLeft: -(star.size * 0.35), background: GOLD_PALE, borderRadius: star.size }} />
            </span>
          </span>
        )
      )}
      {sparkles.map((sp) => (
        <span
          key={sp.id}
          className="absolute bottom-0 rounded-full animate-float-up"
          style={{
            left: sp.left,
            width: sp.size,
            height: sp.size,
            backgroundColor: sp.color,
            boxShadow: `0 0 ${sp.size * 2}px ${sp.color}`,
            opacity: 0,
            "--float-duration": sp.floatDuration,
            "--float-delay": sp.floatDelay,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

// ─── HeroSection ──────────────────────────────────────────────────────────────
export function HeroSection() {
  const { data: hero } = useCmsHero();
  const whatsappUrl = hero?.whatsapp_url || "https://wa.me/6282123523139";

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background */}
      {hero?.background_image_url ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${hero.background_image_url})` }}
          />
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, rgba(61,6,16,0.85) 0%, rgba(107,15,26,0.75) 100%)` }} />
        </>
      ) : (
        <>
          {/* Deep maroon dark gradient */}
          <div className="absolute inset-0" style={{
            background: `radial-gradient(ellipse at top left, ${MAROON_MID} 0%, ${MAROON} 35%, ${MAROON_DARK} 70%, #1a0208 100%)`
          }} />
          {/* Gold ambient glow — top center */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px]"
            style={{ background: `radial-gradient(ellipse, rgba(201,168,76,0.18) 0%, transparent 70%)` }} />
          {/* Warm glow — bottom right */}
          <div className="absolute bottom-0 right-0 w-[500px] h-[400px]"
            style={{ background: `radial-gradient(ellipse, rgba(201,168,76,0.12) 0%, transparent 70%)` }} />
          {/* Deep red glow — left */}
          <div className="absolute top-1/2 left-0 w-[400px] h-[500px] -translate-y-1/2"
            style={{ background: `radial-gradient(ellipse, rgba(139,26,42,0.25) 0%, transparent 70%)` }} />
        </>
      )}

      <StarField />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        {/* Badge */}
        <div className="mb-6 animate-fade-in">
          <span
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium tracking-wider"
            style={{
              background: "rgba(201, 168, 76, 0.12)",
              border: `1px solid rgba(201, 168, 76, 0.4)`,
              color: GOLD_LIGHT,
              backdropFilter: "blur(8px)",
            }}
          >
            <Crown className="w-4 h-4" style={{ color: GOLD }} />
            Klinik Estetika Premium
          </span>
        </div>

        {/* Main heading */}
        <h1
          className="text-4xl md:text-6xl lg:text-7xl font-bold mb-5 animate-fade-in leading-tight"
          style={{
            background: `linear-gradient(135deg, ${GOLD_PALE} 0%, ${GOLD_LIGHT} 40%, ${GOLD} 70%, #b8893c 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: `drop-shadow(0 2px 24px rgba(201,168,76,0.4))`,
          }}
        >
          Shasi Beauty Care
        </h1>

        {/* Gold divider */}
        <div className="flex items-center justify-center gap-4 mb-5">
          <div className="h-px w-24" style={{ background: `linear-gradient(to right, transparent, ${GOLD})` }} />
          <span style={{ color: GOLD, fontSize: "1.2rem" }}>✦</span>
          <div className="h-px w-24" style={{ background: `linear-gradient(to left, transparent, ${GOLD})` }} />
        </div>

        {/* Tagline */}
        <p
          className="text-xl md:text-2xl lg:text-3xl font-light mb-4 animate-fade-in tracking-wide"
          style={{ color: GOLD_PALE }}
        >
          {hero?.tagline || "Kecantikan Anda, Dedikasi Kami"}
        </p>

        {/* Description */}
        <p
          className="text-base md:text-lg max-w-2xl mx-auto mb-10 animate-fade-in leading-relaxed"
          style={{ color: "rgba(245, 230, 181, 0.72)" }}
        >
          {hero?.description || "Rasakan perawatan estetika premium dengan tim ahli kami yang berpengalaman dan bersertifikat."}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 text-lg px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:scale-105 hover:shadow-2xl"
            style={{
              background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`,
              color: MAROON,
              boxShadow: `0 4px 24px rgba(201, 168, 76, 0.45)`,
            }}
          >
            <Calendar className="h-5 w-5" />
            {hero?.cta_primary_text || "Buat Janji"}
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 text-lg px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:scale-105"
            style={{
              border: `2px solid rgba(201, 168, 76, 0.5)`,
              color: GOLD_LIGHT,
              background: "rgba(201, 168, 76, 0.08)",
              backdropFilter: "blur(8px)",
            }}
          >
            <MessageCircle className="h-5 w-5" />
            {hero?.cta_secondary_text || "Chat via WhatsApp"}
          </a>
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm animate-fade-in">
          {[
            { text: "Tenaga Profesional Bersertifikat", icon: "🏆" },
            { text: "Produk Premium", icon: "💎" },
            { text: "Dipercaya 1000+ Klien", icon: "⭐" },
          ].map((item) => (
            <div
              key={item.text}
              className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background: "rgba(201, 168, 76, 0.08)",
                border: "1px solid rgba(201, 168, 76, 0.2)",
                color: GOLD_PALE,
              }}
            >
              <span>{item.icon}</span>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div
          className="w-6 h-10 rounded-full flex justify-center pt-2"
          style={{ border: `2px solid rgba(201, 168, 76, 0.35)` }}
        >
          <div
            className="w-1 h-3 rounded-full"
            style={{ background: `rgba(201, 168, 76, 0.6)` }}
          />
        </div>
      </div>
    </section>
  );
}
