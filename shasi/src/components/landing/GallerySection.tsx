import { useCmsGallery } from "@/hooks/useCmsData";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

export function GallerySection() {
  const { data: gallery } = useCmsGallery();

  if (!gallery || gallery.length === 0) {
    return null; // Don't render if no gallery items
  }

  return (
    <section id="gallery" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-primary text-sm font-medium uppercase tracking-wider">
            Hasil
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            Galeri Sebelum & Sesudah
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Lihat transformasi menakjubkan yang telah dicapai klien kami dengan perawatan kami.
          </p>
        </div>

        {/* Gallery grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {gallery.map((item) => (
            <Card 
              key={item.id} 
              className="group overflow-hidden border-0 shadow-clinic hover:shadow-xl transition-all duration-300"
            >
              <div className="relative">
                {/* Before/After images */}
                <div className="flex">
                  <div className="w-1/2 relative">
                    <img 
                      src={item.before_image_url} 
                      alt="Sebelum"
                      className="w-full h-48 object-cover"
                    />
                    <span className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                      Sebelum
                    </span>
                  </div>
                  <div className="w-1/2 relative">
                    <img 
                      src={item.after_image_url} 
                      alt="Sesudah"
                      className="w-full h-48 object-cover"
                    />
                    <span className="absolute bottom-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                      Sesudah
                    </span>
                  </div>
                </div>

                {/* Arrow indicator */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <ArrowRight className="w-4 h-4 text-primary" />
                </div>
              </div>

              {/* Caption */}
              {item.caption && (
                <div className="p-4">
                  <p className="text-sm text-muted-foreground text-center">{item.caption}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
