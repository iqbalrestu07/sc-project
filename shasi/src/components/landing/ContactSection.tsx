import { useCmsContact } from "@/hooks/useCmsData";
import { usePublicClinicInfo } from "@/hooks/usePublicClinicInfo";
import { MapPin, Phone, Mail, Instagram, Facebook } from "lucide-react";

const MAROON = "#6B0F1A";
const MAROON_LIGHT = "#8B1A2A";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C870";
const GOLD_PALE = "#F5E6B5";
const CREAM = "#FDF8F0";

export function ContactSection() {
  const { data: contact } = useCmsContact();
  const { data: publicClinic } = usePublicClinicInfo();

  const resolveMapsSrc = (): string | null => {
    const raw = publicClinic?.maps_embed_url?.trim();
    if (raw) {
      const match = raw.match(/src="([^"]+)"/);
      return match ? match[1] : raw;
    }
    return contact?.google_maps_embed ?? null;
  };
  const mapsSrc = resolveMapsSrc();
  const whatsappNumber = contact?.whatsapp_number || "6282123523139";

  const contactItem = (
    icon: React.ReactNode,
    title: string,
    value: string,
    href?: string,
    iconBg?: string
  ) => {
    const content = (
      <div
        className="flex items-start gap-4 p-5 rounded-xl transition-all duration-200 hover:scale-[1.01] group"
        style={{
          background: "#fff",
          border: `1px solid rgba(201,168,76,0.2)`,
          boxShadow: `0 2px 12px rgba(107,15,26,0.07)`,
        }}
      >
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: iconBg || `linear-gradient(135deg, ${MAROON} 0%, ${MAROON_LIGHT} 100%)`,
          }}
        >
          {icon}
        </div>
        <div>
          <h3 className="font-semibold mb-0.5" style={{ color: MAROON }}>
            {title}
          </h3>
          <p className="text-sm" style={{ color: "#6b4c40" }}>
            {value}
          </p>
        </div>
      </div>
    );
    return href ? (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    ) : (
      <div>{content}</div>
    );
  };

  return (
    <section
      id="contact"
      className="py-20 relative overflow-hidden"
      style={{ background: CREAM }}
    >
      {/* Top accent */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{
          background: `linear-gradient(to right, ${MAROON}, ${GOLD}, ${MAROON})`,
        }}
      />

      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <span
            className="text-sm font-semibold uppercase tracking-[0.2em]"
            style={{ color: GOLD }}
          >
            ✦ Hubungi Kami ✦
          </span>
          <h2
            className="text-3xl md:text-4xl font-bold mt-3 mb-4"
            style={{ color: MAROON }}
          >
            Kunjungi Shasi Beauty Care
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
            Kami senang mendengar dari Anda. Hubungi kami melalui channel di bawah ini.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact info */}
          <div className="space-y-4">
            {contact?.address &&
              contactItem(
                <MapPin className="w-6 h-6" style={{ color: GOLD_LIGHT }} />,
                "Alamat",
                contact.address
              )}

            {contactItem(
              <Phone className="w-6 h-6" style={{ color: GOLD_LIGHT }} />,
              "WhatsApp",
              `+${whatsappNumber}`,
              `https://wa.me/${whatsappNumber}`
            )}

            {contact?.email &&
              contactItem(
                <Mail className="w-6 h-6" style={{ color: GOLD_LIGHT }} />,
                "Email",
                contact.email,
                `mailto:${contact.email}`
              )}

            {/* Social media */}
            <div className="flex gap-3 pt-2">
              {contact?.instagram_url && (
                <a
                  href={contact.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 hover:shadow-lg"
                  style={{
                    background: `linear-gradient(135deg, #E1306C 0%, #C13584 100%)`,
                    color: "#fff",
                  }}
                  title="Instagram"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              )}
              {contact?.facebook_url && (
                <a
                  href={contact.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white hover:scale-110 hover:shadow-lg transition-all duration-200"
                  title="Facebook"
                >
                  <Facebook className="w-5 h-5" />
                </a>
              )}
              {contact?.tiktok_url && (
                <a
                  href={contact.tiktok_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white hover:scale-110 hover:shadow-lg transition-all duration-200"
                  title="TikTok"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Map */}
          <div
            className="h-[400px] rounded-2xl overflow-hidden"
            style={{
              border: `3px solid transparent`,
              background: `linear-gradient(#fff, #fff) padding-box, linear-gradient(135deg, ${GOLD}, ${MAROON}, ${GOLD}) border-box`,
              boxShadow: `0 8px 32px rgba(107,15,26,0.15)`,
            }}
          >
            {mapsSrc ? (
              <iframe
                src={mapsSrc}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                title="Lokasi Klinik"
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center"
                style={{
                  background: `linear-gradient(135deg, rgba(107,15,26,0.04) 0%, rgba(201,168,76,0.06) 100%)`,
                }}
              >
                <div className="text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{
                      background: `linear-gradient(135deg, ${MAROON} 0%, ${MAROON_LIGHT} 100%)`,
                    }}
                  >
                    <MapPin className="w-8 h-8" style={{ color: GOLD_LIGHT }} />
                  </div>
                  <p className="font-medium" style={{ color: MAROON }}>
                    Lokasi peta segera hadir
                  </p>
                  <p className="text-sm mt-1" style={{ color: "#9a7060" }}>
                    Hubungi kami via WhatsApp untuk petunjuk arah
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
