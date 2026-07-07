import { MessageCircle, Calendar, Sparkles } from "lucide-react";
import { useCmsCta } from "@/hooks/useCmsData";

const MAROON = "#6B0F1A";
const MAROON_DARK = "#3D0610";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C870";
const GOLD_PALE = "#F5E6B5";

export function CtaSection() {
  const { data: cta } = useCmsCta();
  const whatsappUrl = cta?.whatsapp_url || "https://wa.me/6282123523139";

  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${MAROON_DARK} 0%, ${MAROON} 50%, #5a0f1a 100%)`,
        }}
      />
      {/* Gold glow top center */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[300px]"
        style={{
          background: `radial-gradient(ellipse, rgba(201,168,76,0.2) 0%, transparent 70%)`,
        }}
      />
      {/* Decorative circles */}
      <div
        className="absolute top-0 left-0 w-64 h-64 rounded-full -translate-x-1/2 -translate-y-1/2"
        style={{ background: `rgba(201, 168, 76, 0.06)`, border: `1px solid rgba(201,168,76,0.12)` }}
      />
      <div
        className="absolute bottom-0 right-0 w-96 h-96 rounded-full translate-x-1/2 translate-y-1/2"
        style={{ background: `rgba(201, 168, 76, 0.05)`, border: `1px solid rgba(201,168,76,0.1)` }}
      />

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Icon */}
          <div className="mb-8">
            <span
              className="inline-flex items-center justify-center w-20 h-20 rounded-full"
              style={{
                background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`,
                boxShadow: `0 4px 32px rgba(201,168,76,0.5)`,
              }}
            >
              <Sparkles className="w-10 h-10" style={{ color: MAROON }} />
            </span>
          </div>

          {/* Gold divider */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="h-px w-20" style={{ background: `linear-gradient(to right, transparent, ${GOLD})` }} />
            <span style={{ color: GOLD }}>✦</span>
            <div className="h-px w-20" style={{ background: `linear-gradient(to left, transparent, ${GOLD})` }} />
          </div>

          {/* Headline */}
          <h2
            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6"
            style={{
              background: `linear-gradient(135deg, ${GOLD_PALE} 0%, ${GOLD_LIGHT} 50%, ${GOLD} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            {cta?.headline || "Siap Untuk Tampil Lebih Cantik?"}
          </h2>

          {/* Subtext */}
          <p
            className="text-lg md:text-xl mb-10 leading-relaxed"
            style={{ color: "rgba(245, 230, 181, 0.8)" }}
          >
            {cta?.subtext ||
              "Jadwalkan konsultasi gratis Anda hari ini dan biarkan tim ahli kami membuat rencana perawatan kecantikan yang sempurna untuk Anda."}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 text-lg px-8 py-4 rounded-full font-bold transition-all duration-300 hover:scale-105 hover:shadow-2xl"
              style={{
                background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`,
                color: MAROON,
                boxShadow: `0 4px 24px rgba(201, 168, 76, 0.5)`,
              }}
            >
              <Calendar className="h-5 w-5" />
              {cta?.cta_primary_text || "Buat Janji Sekarang"}
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 text-lg px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:scale-105"
              style={{
                border: `2px solid rgba(201, 168, 76, 0.55)`,
                color: GOLD_LIGHT,
                background: "rgba(201, 168, 76, 0.08)",
                backdropFilter: "blur(8px)",
              }}
            >
              <MessageCircle className="h-5 w-5" />
              {cta?.cta_secondary_text || "Chat via WhatsApp"}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
