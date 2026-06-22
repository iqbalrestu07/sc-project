import { useCmsAbout } from "@/hooks/useCmsData";
import { CheckCircle2, Target, Eye, Heart } from "lucide-react";

export function AboutSection() {
  const { data: about } = useCmsAbout();

  const defaultWhyChooseUs = [
    "Tim ahli bersertifikasi profesional",
    "Teknologi terkini dan modern",
    "Rencana perawatan yang dipersonalisasi",
    "Produk berkualitas premium",
    "Lingkungan yang nyaman dan mewah"
  ];

  const whyChooseUs = about?.why_choose_us || defaultWhyChooseUs;

  return (
    <section id="about" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-primary text-sm font-medium uppercase tracking-wider">
            Tentang Kami
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2">
            {about?.title || "Tentang Shasi Beauty Care"}
          </h2>
        </div>

        {/* Clinic Image + Introduction */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          {about?.image_url && (
            <div className="order-2 md:order-1">
              <img 
                src={about.image_url} 
                alt="Shasi Beauty Care Clinic"
                className="w-full h-80 object-cover rounded-2xl shadow-lg"
              />
            </div>
          )}
          <div className={`${about?.image_url ? 'order-1 md:order-2' : 'md:col-span-2 max-w-3xl mx-auto text-center'}`}>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {about?.introduction || "Shasi Beauty Care adalah klinik estetika premium yang berdedikasi untuk meningkatkan kecantikan alami Anda melalui perawatan canggih dan pelayanan yang dipersonalisasi."}
            </p>
          </div>
        </div>

        {/* Vision & Mission */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {about?.vision && (
            <div className="bg-gradient-to-br from-clinic-rose-light to-background p-8 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Eye className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Visi Kami</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">{about.vision}</p>
            </div>
          )}

          {about?.mission && (
            <div className="bg-gradient-to-br from-clinic-beige to-background p-8 rounded-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Misi Kami</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed">{about.mission}</p>
            </div>
          )}
        </div>

        {/* Why Choose Us */}
        <div className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 p-8 md:p-12 rounded-3xl">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <Heart className="w-6 h-6 text-primary" />
            <h3 className="text-2xl font-semibold text-foreground">Mengapa Memilih Shasi Beauty Care</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {whyChooseUs.map((item, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 p-4 bg-background rounded-xl shadow-sm"
              >
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-foreground">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
