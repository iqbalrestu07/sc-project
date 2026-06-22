import { useCmsTestimonials } from "@/hooks/useCmsData";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Star, Quote } from "lucide-react";

export function TestimonialsSection() {
  const { data: testimonials } = useCmsTestimonials();

  // Default testimonials if none in CMS
  const defaultTestimonials = [
    {
      id: "1",
      patient_name: "Sarah W.",
      testimonial_text: "Hasil yang luar biasa! Stafnya profesional dan membuat saya merasa nyaman sepanjang proses perawatan.",
      rating: 5,
      patient_photo_url: null
    },
    {
      id: "2",
      patient_name: "Diana K.",
      testimonial_text: "Sudah 2 tahun saya datang ke sini dan kualitas pelayanannya selalu excellent. Sangat direkomendasikan!",
      rating: 5,
      patient_photo_url: null
    },
    {
      id: "3",
      patient_name: "Lisa A.",
      testimonial_text: "Klinik estetika terbaik di kota. Mereka benar-benar mengerti kebutuhan setiap klien dan memberikan hasil yang menakjubkan.",
      rating: 5,
      patient_photo_url: null
    }
  ];

  const displayTestimonials = testimonials && testimonials.length > 0 ? testimonials : defaultTestimonials;

  return (
    <section id="testimonials" className="py-20 bg-gradient-to-b from-clinic-rose-light/30 to-background">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-primary text-sm font-medium uppercase tracking-wider">
            Testimoni
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            Apa Kata Klien Kami
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Cerita nyata dari klien nyata yang telah merasakan perawatan kami.
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayTestimonials.map((testimonial) => (
            <Card 
              key={testimonial.id} 
              className="border-0 shadow-clinic hover:shadow-xl transition-all duration-300 bg-card"
            >
              <CardContent className="p-6">
                {/* Quote icon */}
                <Quote className="w-8 h-8 text-primary/30 mb-4" />

                {/* Testimonial text */}
                <p className="text-foreground mb-6 italic leading-relaxed">
                  "{testimonial.testimonial_text}"
                </p>

                {/* Rating */}
                {testimonial.rating && (
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i}
                        className={`w-4 h-4 ${
                          i < testimonial.rating! 
                            ? "text-yellow-400 fill-yellow-400" 
                            : "text-muted"
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Author */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={testimonial.patient_photo_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {testimonial.patient_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-foreground">{testimonial.patient_name}</p>
                    <p className="text-xs text-muted-foreground">Klien Terverifikasi</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
