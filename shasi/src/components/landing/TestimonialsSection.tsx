import { useCmsTestimonials } from "@/hooks/useCmsData";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";

const MAROON = "#6B0F1A";
const MAROON_DARK = "#3D0610";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C870";
const GOLD_PALE = "#F5E6B5";

export function TestimonialsSection() {
  const { data: testimonials } = useCmsTestimonials();

  const defaultTestimonials = [
    {
      id: "1",
      patient_name: "Sarah W.",
      testimonial_text:
        "Hasil yang luar biasa! Stafnya profesional dan membuat saya merasa nyaman sepanjang proses perawatan.",
      rating: 5,
      patient_photo_url: null,
    },
    {
      id: "2",
      patient_name: "Diana K.",
      testimonial_text:
        "Sudah 2 tahun saya datang ke sini dan kualitas pelayanannya selalu excellent. Sangat direkomendasikan!",
      rating: 5,
      patient_photo_url: null,
    },
    {
      id: "3",
      patient_name: "Lisa A.",
      testimonial_text:
        "Klinik estetika terbaik di kota. Mereka benar-benar mengerti kebutuhan setiap klien dan memberikan hasil yang menakjubkan.",
      rating: 5,
      patient_photo_url: null,
    },
  ];

  const displayTestimonials =
    testimonials && testimonials.length > 0 ? testimonials : defaultTestimonials;

  return (
    <section
      id="testimonials"
      className="py-20 relative overflow-hidden"
      style={{
        background: `linear-gradient(180deg, #FDF8F0 0%, #F5EAD8 100%)`,
      }}
    >
      {/* Subtle maroon watermark */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 80% 50%, rgba(107,15,26,0.05) 0%, transparent 60%)`,
        }}
      />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <div className="text-center mb-16">
          <span
            className="text-sm font-semibold uppercase tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            ✦ Testimoni ✦
          </span>
          <h2
            className="text-3xl md:text-4xl font-bold mt-3 mb-4"
            style={{ color: MAROON }}
          >
            Apa Kata Klien Kami
          </h2>
          <div className="flex items-center justify-center mb-4">
            <div
              className="h-0.5 w-20"
              style={{
                background: `linear-gradient(to right, transparent, ${GOLD}, transparent)`,
              }}
            />
          </div>
          <p className="max-w-2xl mx-auto" style={{ color: "#6b4c40" }}>
            Cerita nyata dari klien nyata yang telah merasakan perawatan kami.
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayTestimonials.map((testimonial, idx) => (
            <div
              key={testimonial.id}
              className="relative p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              style={{
                background: "#fff",
                border: `1px solid rgba(201,168,76,0.2)`,
                boxShadow: `0 4px 20px rgba(107,15,26,0.08)`,
              }}
            >
              {/* Gold quote icon */}
              <Quote
                className="w-8 h-8 mb-4"
                style={{ color: `rgba(201,168,76,0.4)` }}
              />

              {/* Stars */}
              {testimonial.rating && (
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4"
                      style={{
                        color: i < testimonial.rating! ? GOLD : "#e5e7eb",
                        fill: i < testimonial.rating! ? GOLD : "#e5e7eb",
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Testimonial text */}
              <p
                className="italic leading-relaxed mb-6 text-sm"
                style={{ color: "#5a3a32" }}
              >
                "{testimonial.testimonial_text}"
              </p>

              {/* Gold separator */}
              <div
                className="w-full h-px mb-4"
                style={{
                  background: `linear-gradient(to right, ${GOLD}40, transparent)`,
                }}
              />

              {/* Author */}
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={testimonial.patient_photo_url || undefined} />
                  <AvatarFallback
                    style={{
                      background: `linear-gradient(135deg, ${MAROON} 0%, #8B1A2A 100%)`,
                      color: GOLD_LIGHT,
                      fontWeight: "bold",
                    }}
                  >
                    {testimonial.patient_name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm" style={{ color: MAROON }}>
                    {testimonial.patient_name}
                  </p>
                  <p className="text-xs" style={{ color: GOLD }}>
                    Klien Terverifikasi ✓
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
