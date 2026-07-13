import { useCmsServicesOverview } from "@/hooks/useCmsData";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const MAROON = "#6B0F1A";
const MAROON_LIGHT = "#8B1A2A";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C870";
const GOLD_PALE = "#F5E6B5";

export function ServicesSection() {
  const { data: services } = useCmsServicesOverview();

  const defaultServices = [
    {
      id: "1",
      name: "Perawatan Wajah",
      short_description: "Peremajaan kulit dengan perawatan wajah canggih yang disesuaikan dengan jenis kulit Anda.",
      image_url: null,
      icon: "💆",
    },
    {
      id: "2",
      name: "Perawatan Laser",
      short_description: "Teknologi laser terkini untuk hair removal, peremajaan kulit, dan lainnya.",
      image_url: null,
      icon: "✨",
    },
    {
      id: "3",
      name: "Pembentukan Tubuh",
      short_description: "Dapatkan bentuk tubuh ideal dengan perawatan body contouring non-invasif.",
      image_url: null,
      icon: "💫",
    },
    {
      id: "4",
      name: "Solusi Anti-Penuaan",
      short_description: "Kembalikan masa muda dengan perawatan anti-aging komprehensif dan suntikan.",
      image_url: null,
      icon: "🌟",
    },
    {
      id: "5",
      name: "Perawatan Kulit",
      short_description: "Produk skincare medical-grade dan perawatan untuk hasil yang tahan lama.",
      image_url: null,
      icon: "💎",
    },
    {
      id: "6",
      name: "Peningkatan Kecantikan",
      short_description: "Peningkatan halus yang menonjolkan kecantikan alami dan kepercayaan diri Anda.",
      image_url: null,
      icon: "🌸",
    },
  ];

  const serviceIcons = ["💆", "✨", "💫", "🌟", "💎", "🌸"];
  const displayServices = services && services.length > 0 ? services : defaultServices;

  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants: any = {
    hidden: { opacity: 0, y: 50 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  return (
    <section
      id="services"
      className="py-20 relative overflow-hidden"
      style={{
        background: `linear-gradient(180deg, #FDF8F0 0%, #F9F0E4 50%, #FDF8F0 100%)`,
      }}
    >
      <div className="container mx-auto px-4">
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
            ✦ Layanan Kami ✦
          </span>
          <h2
            className="text-3xl md:text-4xl font-bold mt-3 mb-4"
            style={{ color: MAROON }}
          >
            Perawatan Estetika Premium
          </h2>
          <div className="flex items-center justify-center mb-4">
            <div className="h-0.5 w-20" style={{ background: `linear-gradient(to right, transparent, ${GOLD}, transparent)` }} />
          </div>
          <p className="max-w-2xl mx-auto" style={{ color: "#6b4c40" }}>
            Temukan berbagai perawatan profesional yang dirancang untuk meningkatkan
            kecantikan alami dan kepercayaan diri Anda.
          </p>
        </motion.div>

        {/* Services grid */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {displayServices.map((service, index) => (
            <motion.div
              variants={itemVariants}
              whileHover={{ y: -8, boxShadow: `0 20px 40px rgba(107,15,26,0.12)` }}
              key={service.id}
              className="group overflow-hidden rounded-2xl transition-all duration-300"
              style={{
                background: "#fff",
                border: `1px solid rgba(201, 168, 76, 0.2)`,
                boxShadow: `0 4px 20px rgba(107,15,26,0.08)`,
              }}
            >
              {/* Image / placeholder */}
              <div
                className="h-48 flex items-center justify-center relative overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${MAROON} 0%, ${MAROON_LIGHT} 60%, #5a0f1a 100%)`,
                }}
              >
                {/* Gold shimmer overlay on hover */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(135deg, rgba(201,168,76,0.2) 0%, transparent 60%)`,
                  }}
                />
                {service.image_url ? (
                  <img
                    src={service.image_url}
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                ) : (
                  <div className="text-center">
                    <span className="text-5xl block mb-2 group-hover:scale-110 transition-transform duration-300">
                      {(service as any).icon || serviceIcons[index % serviceIcons.length]}
                    </span>
                    {/* Gold frame decoration */}
                    <div
                      className="w-12 h-0.5 mx-auto transition-all duration-500 group-hover:w-24 group-hover:opacity-80"
                      style={{ background: `linear-gradient(to right, transparent, ${GOLD}, transparent)` }}
                    />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <h3
                  className="text-xl font-semibold mb-2 transition-colors duration-200"
                  style={{ color: MAROON }}
                >
                  {service.name}
                </h3>
                <div
                  className="w-8 h-0.5 mb-3 transition-all duration-300 group-hover:w-16"
                  style={{ background: GOLD }}
                />
                <p className="text-sm leading-relaxed" style={{ color: "#6b4c40" }}>
                  {service.short_description}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom note */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="text-center mt-12"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm cursor-pointer shadow-sm hover:shadow-md transition-shadow"
            style={{
              background: `linear-gradient(135deg, rgba(107,15,26,0.07) 0%, rgba(201,168,76,0.1) 100%)`,
              border: `1px solid rgba(201, 168, 76, 0.25)`,
              color: MAROON,
            }}
          >
            <Sparkles className="w-4 h-4" style={{ color: GOLD }} />
            Hubungi kami via WhatsApp untuk info lebih lanjut tentang layanan kami
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
