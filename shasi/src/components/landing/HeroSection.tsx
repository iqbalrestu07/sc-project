import { useMemo, useRef } from "react";
import { MessageCircle, Calendar, Crown } from "lucide-react";
import { useCmsHero } from "@/hooks/useCmsData";
import { motion, useScroll, useTransform } from "framer-motion";

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
  const ref = useRef<HTMLDivElement>(null);

  // Parallax effects
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const backgroundY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.2]);
  const textY = useTransform(scrollYProgress, [0, 1], ["0%", "80%"]);

  // Staggered Text Reveal
  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.2 } },
  };
  const itemVariants: any = {
    hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
    visible: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: "easeOut" } },
  };

  return (
    <section ref={ref} className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background with Parallax */}
      <motion.div style={{ y: backgroundY, opacity }} className="absolute inset-0">
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
            <div className="absolute inset-0" style={{
              background: `radial-gradient(ellipse at top left, ${MAROON_MID} 0%, ${MAROON} 35%, ${MAROON_DARK} 70%, #1a0208 100%)`
            }} />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px]"
              style={{ background: `radial-gradient(ellipse, rgba(201,168,76,0.18) 0%, transparent 70%)` }} />
            <div className="absolute bottom-0 right-0 w-[500px] h-[400px]"
              style={{ background: `radial-gradient(ellipse, rgba(201,168,76,0.12) 0%, transparent 70%)` }} />
            <div className="absolute top-1/2 left-0 w-[400px] h-[500px] -translate-y-1/2"
              style={{ background: `radial-gradient(ellipse, rgba(139,26,42,0.25) 0%, transparent 70%)` }} />
          </>
        )}
      </motion.div>

      <StarField />

      {/* Content */}
      <motion.div 
        style={{ y: textY }}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 container mx-auto px-4 text-center"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="mb-6">
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
        </motion.div>

        {/* Main heading */}
        <motion.h1
          variants={itemVariants}
          className="text-4xl md:text-6xl lg:text-7xl font-bold mb-5 leading-tight"
          style={{
            background: `linear-gradient(135deg, ${GOLD_PALE} 0%, ${GOLD_LIGHT} 40%, ${GOLD} 70%, #b8893c 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: `drop-shadow(0 2px 24px rgba(201,168,76,0.4))`,
          }}
        >
          Shasi Beauty Care
        </motion.h1>

        {/* Gold divider */}
        <motion.div variants={itemVariants} className="flex items-center justify-center gap-4 mb-5">
          <div className="h-px w-24" style={{ background: `linear-gradient(to right, transparent, ${GOLD})` }} />
          <span style={{ color: GOLD, fontSize: "1.2rem" }}>✦</span>
          <div className="h-px w-24" style={{ background: `linear-gradient(to left, transparent, ${GOLD})` }} />
        </motion.div>

        {/* Tagline */}
        <motion.p
          variants={itemVariants}
          className="text-xl md:text-2xl lg:text-3xl font-light mb-4 tracking-wide"
          style={{ color: GOLD_PALE }}
        >
          {hero?.tagline || "Kecantikan Anda, Dedikasi Kami"}
        </motion.p>

        {/* Description */}
        <motion.p
          variants={itemVariants}
          className="text-base md:text-lg max-w-2xl mx-auto mb-10 leading-relaxed"
          style={{ color: "rgba(245, 230, 181, 0.72)" }}
        >
          {hero?.description || "Rasakan perawatan estetika premium dengan tim ahli kami yang berpengalaman dan bersertifikat."}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 justify-center">
          <motion.a
            whileHover={{ scale: 1.05, boxShadow: `0 4px 30px rgba(201, 168, 76, 0.6)` }}
            whileTap={{ scale: 0.95 }}
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 text-lg px-8 py-4 rounded-full font-semibold transition-colors duration-300 relative group overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`,
              color: MAROON,
              boxShadow: `0 4px 24px rgba(201, 168, 76, 0.45)`,
            }}
          >
            {/* Magnetic/Glow sweep effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12" />
            <Calendar className="h-5 w-5 relative z-10" />
            <span className="relative z-10">{hero?.cta_primary_text || "Buat Janji"}</span>
          </motion.a>

          <motion.a
            whileHover={{ scale: 1.05, backgroundColor: "rgba(201, 168, 76, 0.15)" }}
            whileTap={{ scale: 0.95 }}
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 text-lg px-8 py-4 rounded-full font-semibold transition-colors duration-300"
            style={{
              border: `2px solid rgba(201, 168, 76, 0.5)`,
              color: GOLD_LIGHT,
              background: "rgba(201, 168, 76, 0.08)",
              backdropFilter: "blur(8px)",
            }}
          >
            <MessageCircle className="h-5 w-5" />
            {hero?.cta_secondary_text || "Chat via WhatsApp"}
          </motion.a>
        </motion.div>

        {/* Trust badges */}
        <motion.div variants={itemVariants} className="mt-16 flex flex-wrap justify-center gap-8 text-sm">
          {[
            { text: "Tenaga Profesional Bersertifikat", icon: "🏆" },
            { text: "Produk Premium", icon: "💎" },
            { text: "Dipercaya 1000+ Klien", icon: "⭐" },
          ].map((item) => (
            <motion.div
              whileHover={{ y: -5 }}
              key={item.text}
              className="flex items-center gap-2 px-4 py-2 rounded-full cursor-default"
              style={{
                background: "rgba(201, 168, 76, 0.08)",
                border: "1px solid rgba(201, 168, 76, 0.2)",
                color: GOLD_PALE,
              }}
            >
              <span>{item.icon}</span>
              {item.text}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 1 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce pointer-events-none"
      >
        <div
          className="w-6 h-10 rounded-full flex justify-center pt-2"
          style={{ border: `2px solid rgba(201, 168, 76, 0.35)` }}
        >
          <div
            className="w-1 h-3 rounded-full"
            style={{ background: `rgba(201, 168, 76, 0.6)` }}
          />
        </div>
      </motion.div>
    </section>
  );
}
