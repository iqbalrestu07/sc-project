import { useCmsGallery } from "@/hooks/useCmsData";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const MAROON = "#6B0F1A";
const MAROON_LIGHT = "#8B1A2A";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C870";
const GOLD_PALE = "#F5E6B5";
const CREAM = "#FDF8F0";

export function GallerySection() {
  const { data: gallery } = useCmsGallery();

  if (!gallery || gallery.length === 0) {
    return null;
  }

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: "easeOut" } }
  };

  return (
    <section id="gallery" className="py-20 relative overflow-hidden" style={{ background: CREAM }}>
      <div className="container mx-auto px-4 relative z-10">
        {/* Section header */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <span
            className="text-sm font-semibold uppercase tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            ✦ Hasil ✦
          </span>
          <h2
            className="text-3xl md:text-4xl font-bold mt-3 mb-4"
            style={{ color: MAROON }}
          >
            Galeri Sebelum & Sesudah
          </h2>
          <div className="flex items-center justify-center mb-4">
            <div className="h-0.5 w-20" style={{ background: `linear-gradient(to right, transparent, ${GOLD}, transparent)` }} />
          </div>
          <p className="max-w-2xl mx-auto" style={{ color: "#6b4c40" }}>
            Lihat transformasi menakjubkan yang telah dicapai klien kami dengan perawatan profesional kami.
          </p>
        </motion.div>

        {/* Gallery grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {gallery.map((item) => (
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -8, boxShadow: `0 20px 40px rgba(107, 15, 26, 0.12)` }}
              key={item.id} 
              className="group overflow-hidden rounded-2xl transition-all duration-300 bg-white"
              style={{
                border: `1px solid rgba(201, 168, 76, 0.2)`,
                boxShadow: `0 4px 24px rgba(107, 15, 26, 0.08)`,
              }}
            >
              <div className="relative">
                {/* Before/After images */}
                <div className="flex h-56 relative overflow-hidden">
                  <div className="w-1/2 relative group/before overflow-hidden">
                    <img 
                      src={item.before_image_url} 
                      alt="Sebelum"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                    <span 
                      className="absolute bottom-3 left-3 text-xs px-3 py-1.5 rounded-full font-medium tracking-wide backdrop-blur-md"
                      style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                    >
                      Sebelum
                    </span>
                  </div>
                  <div className="w-1/2 relative group/after overflow-hidden">
                    <img 
                      src={item.after_image_url} 
                      alt="Sesudah"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
                    <span 
                      className="absolute bottom-3 right-3 text-xs px-3 py-1.5 rounded-full font-medium tracking-wide shadow-lg"
                      style={{ 
                        background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)`, 
                        color: MAROON 
                      }}
                    >
                      Sesudah
                    </span>
                  </div>
                </div>

                {/* Arrow indicator */}
                <div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center z-10 transition-transform duration-500 group-hover:rotate-180"
                  style={{
                    background: "#fff",
                    boxShadow: `0 4px 12px rgba(107, 15, 26, 0.15)`,
                    border: `1px solid rgba(201, 168, 76, 0.3)`
                  }}
                >
                  <ArrowRight className="w-5 h-5 transition-colors duration-300 group-hover:text-amber-500" style={{ color: MAROON }} />
                </div>
              </div>

              {/* Caption */}
              {item.caption && (
                <div className="p-5 text-center">
                  <Sparkles className="w-4 h-4 mx-auto mb-2 opacity-60" style={{ color: GOLD }} />
                  <p className="text-sm italic leading-relaxed" style={{ color: "#6b4c40" }}>
                    "{item.caption}"
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
