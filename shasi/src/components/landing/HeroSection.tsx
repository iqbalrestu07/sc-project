import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Calendar } from "lucide-react";
import { useCmsHero } from "@/hooks/useCmsData";

// ─── Star data (generated once, not on every render) ─────────────────────────
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
    size: Math.random() * 2.5 + 1,           // 1–3.5 px
    twinkleDuration: `${(Math.random() * 3 + 2).toFixed(1)}s`,  // 2–5 s
    twinkleDelay: `${(Math.random() * 5).toFixed(1)}s`,          // 0–5 s offset
    type: Math.random() > 0.85 ? "cross" : "dot",
  }));
}

// ─── Floating sparkle particles ──────────────────────────────────────────────
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
    "rgba(253,186,210,0.9)",   // rose pink
    "rgba(255,220,200,0.85)",  // warm peach
    "rgba(255,240,180,0.8)",   // soft gold
    "rgba(255,255,255,0.75)",  // white
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

// ─── StarField component ──────────────────────────────────────────────────────
function StarField() {
  const stars = useMemo(() => generateStars(130), []);
  const sparkles = useMemo(() => generateSparkles(18), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {/* Static + twinkling dots & crosses */}
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
              backgroundColor: "white",
              opacity: 0,
              "--twinkle-duration": star.twinkleDuration,
              "--twinkle-delay": star.twinkleDelay,
            } as React.CSSProperties}
          />
        ) : (
          // Cross / plus-shaped star
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
            <span
              style={{
                display: "block",
                position: "relative",
                width: star.size * 3,
                height: star.size * 3,
              }}
            >
              {/* horizontal bar */}
              <span style={{
                position: "absolute",
                top: "50%",
                left: 0,
                width: "100%",
                height: star.size * 0.7,
                marginTop: -(star.size * 0.35),
                background: "white",
                borderRadius: star.size,
              }} />
              {/* vertical bar */}
              <span style={{
                position: "absolute",
                left: "50%",
                top: 0,
                height: "100%",
                width: star.size * 0.7,
                marginLeft: -(star.size * 0.35),
                background: "white",
                borderRadius: star.size,
              }} />
            </span>
          </span>
        )
      )}

      {/* Floating sparkle particles that drift upward */}
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

// ─── HeroSection ─────────────────────────────────────────────────────────────
export function HeroSection() {
  const { data: hero } = useCmsHero();
  const whatsappUrl = hero?.whatsapp_url || "https://wa.me/6282123523139";

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* ── Background ───────────────────────────────────────────────────── */}
      {hero?.background_image_url ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${hero.background_image_url})` }}
          />
          {/* Dark overlay so text stays readable over any photo */}
          <div className="absolute inset-0 bg-black/60" />
        </>
      ) : (
        <>
          {/* Deep dark gradient: charcoal → dark wine → near-black */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#2d1a2e_0%,_#1a0d1e_45%,_#0d0810_100%)]" />
          {/* Soft rose ambient glow — top centre */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[420px] bg-[radial-gradient(ellipse,_rgba(200,60,100,0.22)_0%,_transparent_70%)]" />
          {/* Warm gold glow — bottom right */}
          <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-[radial-gradient(ellipse,_rgba(180,120,40,0.15)_0%,_transparent_70%)]" />
        </>
      )}

      {/* ── Bintang berkelap-kelip ────────────────────────────────────────── */}
      <StarField />

      {/* ── Content ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        {/* Badge */}
        <div className="mb-6 animate-fade-in">
          <span className="inline-block px-5 py-2 rounded-full text-sm font-medium tracking-wide border"
            style={{
              background: "rgba(255,255,255,0.08)",
              borderColor: "rgba(253,186,210,0.35)",
              color: "#fdb8cd",
              backdropFilter: "blur(6px)",
            }}>
            ✨ Klinik Estetika Premium
          </span>
        </div>

        {/* Main heading */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-5 animate-fade-in leading-tight"
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #fdb8cd 50%, #f9a8d4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 2px 24px rgba(253,186,210,0.35))",
          }}>
          Shasi Beauty Care
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl lg:text-3xl font-light mb-4 animate-fade-in"
          style={{ color: "#fce7f3" }}>
          {hero?.tagline || "Kecantikan Anda, Dedikasi Kami"}
        </p>

        {/* Description */}
        <p className="text-base md:text-lg max-w-2xl mx-auto mb-10 animate-fade-in leading-relaxed"
          style={{ color: "rgba(252,231,243,0.75)" }}>
          {hero?.description || "Rasakan perawatan estetika premium dengan tim ahli kami."}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
          <Button
            asChild
            size="lg"
            className="text-lg px-8 py-6 transition-all duration-300 font-semibold"
            style={{
              background: "linear-gradient(135deg, #e8517a 0%, #c73b6b 100%)",
              boxShadow: "0 4px 24px rgba(200,60,100,0.45)",
              border: "none",
              color: "#fff",
            }}
          >
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Calendar className="mr-2 h-5 w-5" />
              {hero?.cta_primary_text || "Buat Janji"}
            </a>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="text-lg px-8 py-6 transition-all duration-300 font-semibold hover:bg-white/10"
            style={{
              borderColor: "rgba(253,186,210,0.5)",
              color: "#fdb8cd",
              background: "rgba(255,255,255,0.06)",
              backdropFilter: "blur(6px)",
            }}
          >
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-5 w-5" />
              {hero?.cta_secondary_text || "Chat via WhatsApp"}
            </a>
          </Button>
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap justify-center gap-8 text-sm animate-fade-in">
          {[
            "Tenaga Profesional Bersertifikat",
            "Produk Premium",
            "Dipercaya 1000+ Klien",
          ].map((label) => (
            <div key={label} className="flex items-center gap-2" style={{ color: "rgba(252,231,243,0.7)" }}>
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "#4ade80", boxShadow: "0 0 6px rgba(74,222,128,0.7)" }}
              />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Scroll indicator ─────────────────────────────────────────────── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div
          className="w-6 h-10 rounded-full flex justify-center pt-2"
          style={{ border: "2px solid rgba(253,186,210,0.3)" }}
        >
          <div
            className="w-1 h-3 rounded-full"
            style={{ background: "rgba(253,186,210,0.5)" }}
          />
        </div>
      </div>
    </section>
  );
}
