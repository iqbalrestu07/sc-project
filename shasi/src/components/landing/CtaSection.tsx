import { Button } from "@/components/ui/button";
import { MessageCircle, Calendar, Sparkles } from "lucide-react";
import { useCmsCta } from "@/hooks/useCmsData";

export function CtaSection() {
  const { data: cta } = useCmsCta();

  const whatsappUrl = cta?.whatsapp_url || "https://wa.me/6282123523139";

  return (
    <section className="py-20 bg-gradient-to-br from-primary to-primary/80 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/5 rounded-full translate-x-1/2 translate-y-1/2" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Icon */}
          <div className="mb-6">
            <span className="inline-flex items-center justify-center w-16 h-16 bg-white/20 rounded-full">
              <Sparkles className="w-8 h-8 text-white" />
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6">
            {cta?.headline || "Siap Untuk Tampil Lebih Cantik?"}
          </h2>

          {/* Subtext */}
          <p className="text-white/90 text-lg md:text-xl mb-10 leading-relaxed">
            {cta?.subtext || "Jadwalkan konsultasi gratis Anda hari ini dan biarkan tim ahli kami membuat rencana perawatan kecantikan yang sempurna untuk Anda."}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              asChild 
              size="lg" 
              variant="secondary"
              className="text-lg px-8 py-6 bg-white text-primary hover:bg-white/90 shadow-lg"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Calendar className="mr-2 h-5 w-5" />
                {cta?.cta_primary_text || "Buat Janji Sekarang"}
              </a>
            </Button>
            <Button 
              asChild 
              size="lg" 
              variant="outline"
              className="text-lg px-8 py-6 border-2 border-white text-white bg-transparent hover:bg-white/10"
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" />
                {cta?.cta_secondary_text || "Chat via WhatsApp"}
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
