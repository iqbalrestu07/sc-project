import { useCmsAbout } from "@/hooks/useCmsData";
import { CheckCircle2, Target, Eye, Heart } from "lucide-react";
import { motion } from "framer-motion";

const MAROON = "#6B0F1A";
const MAROON_LIGHT = "#8B1A2A";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C870";
const GOLD_PALE = "#F5E6B5";
const CREAM = "#FDF8F0";

export function AboutSection() {
  const { data: about } = useCmsAbout();

  const defaultWhyChooseUs = [
    "Tim ahli bersertifikasi profesional",
    "Teknologi terkini dan modern",
    "Rencana perawatan yang dipersonalisasi",
    "Produk berkualitas premium",
    "Lingkungan yang nyaman dan mewah",
  ];

  const whyChooseUs = about?.why_choose_us || defaultWhyChooseUs;

  const fadeInVariants: any = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };
  
  const staggerContainer: any = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
  };

  return (
    <section id="about" className="py-20 relative overflow-hidden" style={{ background: CREAM }}>
      {/* Decorative maroon accent top */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(to right, ${MAROON}, ${GOLD}, ${MAROON})` }}
      />

      <div className="container mx-auto px-4">
        {/* Section header */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInVariants}
          className="text-center mb-16"
        >
          <span
            className="text-sm font-semibold uppercase tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            ✦ Tentang Kami ✦
          </span>
          <h2
            className="text-3xl md:text-4xl font-bold mt-3 mb-0"
            style={{ color: MAROON }}
          >
            {about?.title || "Tentang Shasi Beauty Care"}
          </h2>
          {/* Gold underline */}
          <div className="flex items-center justify-center mt-3">
            <div className="h-0.5 w-20" style={{ background: `linear-gradient(to right, transparent, ${GOLD}, transparent)` }} />
          </div>
        </motion.div>

        {/* Image + Introduction */}
        <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
          {about?.image_url && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, x: -30 }}
              whileInView={{ opacity: 1, scale: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="order-2 md:order-1"
            >
              <div
                className="relative"
                style={{
                  padding: "6px",
                  background: `linear-gradient(135deg, ${GOLD} 0%, ${MAROON} 50%, ${GOLD} 100%)`,
                  borderRadius: "18px",
                }}
              >
                <img
                  src={about.image_url}
                  alt="Shasi Beauty Care Clinic"
                  className="w-full h-80 object-cover rounded-2xl"
                />
              </div>
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className={`${about?.image_url ? "order-1 md:order-2" : "md:col-span-2 max-w-3xl mx-auto text-center"}`}
          >
            <p
              className="text-lg leading-relaxed"
              style={{ color: "#4a3028" }}
            >
              {about?.introduction ||
                "Shasi Beauty Care adalah klinik estetika premium yang berdedikasi untuk meningkatkan kecantikan alami Anda melalui perawatan canggih dan pelayanan yang dipersonalisasi."}
            </p>
          </motion.div>
        </div>

        {/* Vision & Mission */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {about?.vision && (
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInVariants}
              whileHover={{ y: -5, boxShadow: `0 15px 30px rgba(107,15,26,0.08)` }}
              className="p-8 rounded-2xl transition-all"
              style={{
                background: `linear-gradient(135deg, rgba(107,15,26,0.05) 0%, rgba(201,168,76,0.08) 100%)`,
                border: `1px solid rgba(201,168,76,0.25)`,
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${MAROON} 0%, ${MAROON_LIGHT} 100%)` }}
                >
                  <Eye className="w-6 h-6" style={{ color: GOLD_LIGHT }} />
                </div>
                <h3 className="text-xl font-semibold" style={{ color: MAROON }}>
                  Visi Kami
                </h3>
              </div>
              <p className="leading-relaxed" style={{ color: "#5a3a32" }}>
                {about.vision}
              </p>
            </motion.div>
          )}

          {about?.mission && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
              whileHover={{ y: -5, boxShadow: `0 15px 30px rgba(107,15,26,0.08)` }}
              className="p-8 rounded-2xl transition-all"
              style={{
                background: `linear-gradient(135deg, rgba(201,168,76,0.08) 0%, rgba(107,15,26,0.05) 100%)`,
                border: `1px solid rgba(201,168,76,0.25)`,
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${GOLD} 0%, ${GOLD_LIGHT} 100%)` }}
                >
                  <Target className="w-6 h-6" style={{ color: MAROON }} />
                </div>
                <h3 className="text-xl font-semibold" style={{ color: MAROON }}>
                  Misi Kami
                </h3>
              </div>
              <p className="leading-relaxed" style={{ color: "#5a3a32" }}>
                {about.mission}
              </p>
            </motion.div>
          )}
        </div>

        {/* Why Choose Us */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="p-8 md:p-12 rounded-3xl"
          style={{
            background: `linear-gradient(135deg, ${MAROON} 0%, #4A0A12 100%)`,
            boxShadow: `0 20px 60px rgba(107,15,26,0.3)`,
          }}
        >
          <div className="flex items-center gap-3 mb-8 justify-center">
            <Heart className="w-5 h-5" style={{ color: GOLD }} />
            <h3 className="text-2xl font-semibold" style={{ color: GOLD_PALE }}>
              Mengapa Memilih Shasi Beauty Care
            </h3>
            <Heart className="w-5 h-5" style={{ color: GOLD }} />
          </div>
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {whyChooseUs.map((item, index) => (
              <motion.div
                variants={fadeInVariants}
                key={index}
                className="flex items-center gap-3 p-4 rounded-xl transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: "rgba(245, 230, 181, 0.08)",
                  border: "1px solid rgba(201, 168, 76, 0.2)",
                }}
              >
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: GOLD }} />
                <span style={{ color: GOLD_PALE }}>{item}</span>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Decorative bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1"
        style={{ background: `linear-gradient(to right, ${MAROON}, ${GOLD}, ${MAROON})` }}
      />
    </section>
  );
}
