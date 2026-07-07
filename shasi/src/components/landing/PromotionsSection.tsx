import { useCmsPromotions } from "@/hooks/useCmsData";
import { MessageCircle, Percent, Clock, Tag } from "lucide-react";
import { format, differenceInDays } from "date-fns";

const MAROON = "#6B0F1A";
const MAROON_LIGHT = "#8B1A2A";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C870";
const GOLD_PALE = "#F5E6B5";

export function PromotionsSection() {
  const { data: promotions } = useCmsPromotions();

  if (!promotions || promotions.length === 0) return null;

  const whatsappUrl = "https://wa.me/6282123523139";

  return (
    <section
      id="promotions"
      className="py-20 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${MAROON} 0%, #4A0A12 50%, ${MAROON_LIGHT} 100%)`,
      }}
    >
      {/* Gold glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse, rgba(201,168,76,0.15) 0%, transparent 70%)`,
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <span
            className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] px-5 py-2 rounded-full"
            style={{
              background: "rgba(201,168,76,0.15)",
              border: `1px solid rgba(201,168,76,0.35)`,
              color: GOLD_LIGHT,
            }}
          >
            <Tag className="w-4 h-4" />
            Penawaran Spesial
          </span>
          <h2
            className="text-3xl md:text-4xl font-bold mt-5 mb-4"
            style={{
              background: `linear-gradient(135deg, ${GOLD_PALE} 0%, ${GOLD_LIGHT} 50%, ${GOLD} 100%)`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Promo Bulanan
          </h2>
          <div className="flex items-center justify-center mb-4">
            <div
              className="h-0.5 w-20"
              style={{
                background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`,
              }}
            />
          </div>
          <p style={{ color: "rgba(245,230,181,0.75)" }}>
            Jangan lewatkan penawaran eksklusif bulanan kami. Waktu terbatas!
          </p>
        </div>

        {/* Promotions grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {promotions.map((promo) => {
            const daysLeft = differenceInDays(new Date(promo.end_date), new Date());
            const isUrgent = daysLeft <= 7;

            return (
              <div
                key={promo.id}
                className="rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl group"
                style={{
                  background: "#FDF8F0",
                  boxShadow: `0 4px 24px rgba(0,0,0,0.3)`,
                }}
              >
                {/* Banner / placeholder */}
                <div
                  className="relative h-48 flex items-center justify-center overflow-hidden"
                  style={{
                    background: `linear-gradient(135deg, #4A0A12 0%, ${MAROON} 60%, ${MAROON_LIGHT} 100%)`,
                  }}
                >
                  {/* Gold shimmer on hover */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background: `linear-gradient(135deg, rgba(201,168,76,0.25) 0%, transparent 60%)`,
                    }}
                  />
                  {promo.banner_image_url ? (
                    <img
                      src={promo.banner_image_url}
                      alt={promo.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center relative z-10">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-2"
                        style={{
                          background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`,
                          boxShadow: `0 4px 16px rgba(201,168,76,0.4)`,
                        }}
                      >
                        <Percent className="w-8 h-8" style={{ color: MAROON }} />
                      </div>
                      <span
                        className="text-xl font-bold"
                        style={{ color: GOLD_PALE }}
                      >
                        PROMO
                      </span>
                    </div>
                  )}

                  {/* Urgency badge */}
                  {isUrgent && (
                    <div
                      className="absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-bold"
                      style={{
                        background: `linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)`,
                        color: "#fff",
                        boxShadow: "0 2px 8px rgba(220,38,38,0.4)",
                      }}
                    >
                      {daysLeft <= 0 ? "Hari Terakhir!" : `${daysLeft} hari lagi`}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3
                    className="text-xl font-semibold mb-3"
                    style={{ color: MAROON }}
                  >
                    {promo.title}
                  </h3>

                  {/* Gold divider */}
                  <div
                    className="w-10 h-0.5 mb-3 transition-all duration-300 group-hover:w-20"
                    style={{ background: GOLD }}
                  />

                  {promo.description && (
                    <p
                      className="text-sm mb-4 line-clamp-3 leading-relaxed"
                      style={{ color: "#6b4c40" }}
                    >
                      {promo.description}
                    </p>
                  )}

                  {/* Date range */}
                  <div
                    className="flex items-center gap-2 text-xs mb-4"
                    style={{ color: "#9a7060" }}
                  >
                    <Clock className="w-3.5 h-3.5" style={{ color: GOLD }} />
                    <span>
                      Berlaku:{" "}
                      {format(new Date(promo.start_date), "d MMM")} -{" "}
                      {format(new Date(promo.end_date), "d MMM yyyy")}
                    </span>
                  </div>

                  {promo.terms_conditions && (
                    <p
                      className="text-xs italic mb-4"
                      style={{ color: "#9a7060" }}
                    >
                      *{promo.terms_conditions}
                    </p>
                  )}

                  {/* CTA */}
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg"
                    style={{
                      background: `linear-gradient(135deg, ${MAROON} 0%, ${MAROON_LIGHT} 100%)`,
                      color: GOLD_PALE,
                      boxShadow: `0 2px 12px rgba(107,15,26,0.3)`,
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                    Klaim Penawaran
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
