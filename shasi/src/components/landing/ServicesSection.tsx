import { useCmsServicesOverview } from "@/hooks/useCmsData";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles } from "lucide-react";

export function ServicesSection() {
  const { data: services } = useCmsServicesOverview();

  // Default services if none in CMS
  const defaultServices = [
    {
      id: "1",
      name: "Perawatan Wajah",
      short_description: "Peremajaan kulit dengan perawatan wajah canggih yang disesuaikan dengan jenis kulit Anda.",
      image_url: null
    },
    {
      id: "2", 
      name: "Perawatan Laser",
      short_description: "Teknologi laser terkini untuk hair removal, peremajaan kulit, dan lainnya.",
      image_url: null
    },
    {
      id: "3",
      name: "Pembentukan Tubuh",
      short_description: "Dapatkan bentuk tubuh ideal dengan perawatan body contouring non-invasif.",
      image_url: null
    },
    {
      id: "4",
      name: "Solusi Anti-Penuaan",
      short_description: "Kembalikan masa muda dengan perawatan anti-aging komprehensif dan suntikan.",
      image_url: null
    },
    {
      id: "5",
      name: "Perawatan Kulit",
      short_description: "Produk skincare medical-grade dan perawatan untuk hasil yang tahan lama.",
      image_url: null
    },
    {
      id: "6",
      name: "Peningkatan Kecantikan",
      short_description: "Peningkatan halus yang menonjolkan kecantikan alami dan kepercayaan diri Anda.",
      image_url: null
    }
  ];

  const displayServices = services && services.length > 0 ? services : defaultServices;

  const serviceIcons = ["💆", "✨", "💫", "🌟", "💎", "🌸"];

  return (
    <section id="services" className="py-20 bg-gradient-to-b from-background to-clinic-rose-light/30">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-primary text-sm font-medium uppercase tracking-wider">
            Layanan Kami
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            Perawatan Estetika Premium
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Temukan berbagai perawatan profesional yang dirancang untuk meningkatkan kecantikan alami dan kepercayaan diri Anda.
          </p>
        </div>

        {/* Services grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayServices.map((service, index) => (
            <Card 
              key={service.id} 
              className="group overflow-hidden border-0 shadow-clinic hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
            >
              <CardContent className="p-0">
                {/* Image or placeholder */}
                <div className="h-48 bg-gradient-to-br from-clinic-rose-light to-clinic-beige flex items-center justify-center">
                  {service.image_url ? (
                    <img 
                      src={service.image_url} 
                      alt={service.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <span className="text-5xl">{serviceIcons[index % serviceIcons.length]}</span>
                  )}
                </div>
                {/* Content */}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {service.name}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {service.short_description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Bottom note */}
        <div className="text-center mt-12">
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Hubungi kami via WhatsApp untuk info lebih lanjut tentang layanan kami
          </p>
        </div>
      </div>
    </section>
  );
}
