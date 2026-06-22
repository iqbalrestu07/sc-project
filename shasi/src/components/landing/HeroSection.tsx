import { Button } from "@/components/ui/button";
import { MessageCircle, Calendar } from "lucide-react";
import { useCmsHero } from "@/hooks/useCmsData";
export function HeroSection() {
  const {
    data: hero
  } = useCmsHero();
  const whatsappUrl = hero?.whatsapp_url || "https://wa.me/6282123523139";
  return <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background image or gradient */}
      {hero?.background_image_url ? <>
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{
        backgroundImage: `url(${hero.background_image_url})`
      }} />
          <div className="absolute inset-0 bg-black/40" />
        </> : <>
          <div className="absolute inset-0 bg-gradient-to-br from-clinic-rose-light via-background to-clinic-beige" />
          {/* Decorative elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-clinic-rose/20 rounded-full blur-3xl" />
        </>}
      
      <div className="relative z-10 container mx-auto px-4 text-center">
        {/* Logo/Brand */}
        <div className="mb-6 animate-fade-in">
          <span className="inline-block px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium">
            ✨ Klinik Estetika Premium
          </span>
        </div>

        {/* Main heading */}
        <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in text-center text-destructive-foreground lg:text-6xl">
          Shasi Beauty Care
        </h1>

        {/* Tagline */}
        <p className="text-xl md:text-2xl lg:text-3xl text-primary font-light mb-4 animate-fade-in">
          {hero?.tagline || "Kecantikan Anda, Dedikasi Kami"}
        </p>

        {/* Description */}
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 animate-fade-in text-secondary bg-inherit">
          {hero?.description || "Rasakan perawatan estetika premium dengan tim ahli kami."}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
          <Button asChild size="lg" className="text-lg px-8 py-6 shadow-clinic hover:shadow-lg transition-all duration-300">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <Calendar className="mr-2 h-5 w-5" />
              {hero?.cta_primary_text || "Buat Janji"}
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6 border-2 hover:bg-primary/5 transition-all duration-300">
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-5 w-5" />
              {hero?.cta_secondary_text || "Chat via WhatsApp"}
            </a>
          </Button>
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap justify-center gap-8 text-muted-foreground text-sm animate-fade-in">
          <div className="flex items-center gap-2 text-secondary">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Tenaga Profesional Bersertifikat
          </div>
          <div className="flex items-center gap-2 text-secondary">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Produk Premium
          </div>
          <div className="flex items-center gap-2 text-secondary">
            <span className="w-2 h-2 bg-green-500 rounded-full" />
            Dipercaya 1000+ Klien
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-2">
          <div className="w-1 h-3 bg-muted-foreground/50 rounded-full" />
        </div>
      </div>
    </section>;
}