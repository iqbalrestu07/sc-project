import { Link } from "react-router-dom";
import { Phone, MapPin, Clock, Instagram, Facebook } from "lucide-react";
import { usePublicClinicInfo } from "@/hooks/usePublicClinicInfo";
import { useCmsContact } from "@/hooks/useCmsData";
import { buildWhatsAppUrl, resolveWhatsAppNumber } from "@/lib/whatsapp";

const MAROON = "#6B0F1A";
const MAROON_DARK = "#3D0610";
const GOLD = "#C9A84C";
const GOLD_LIGHT = "#E8C870";
const GOLD_PALE = "#F5E6B5";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();
  const { data: clinicInfo } = usePublicClinicInfo();
  const { data: contact } = useCmsContact();
  const logoSrc = clinicInfo?.logo_url || "/logo.png";
  const brandName = clinicInfo?.clinic_name || "Shasi Beauty Care";
  const whatsappUrl = buildWhatsAppUrl(contact?.whatsapp_number);
  const whatsappNumber = resolveWhatsAppNumber(contact?.whatsapp_number);

  return (
    <footer
      className="relative overflow-hidden"
      style={{
        background: `linear-gradient(180deg, ${MAROON_DARK} 0%, #1a0208 100%)`,
      }}
    >
      {/* Gold top border */}
      <div
        className="h-0.5"
        style={{
          background: `linear-gradient(to right, transparent, ${GOLD}, ${GOLD_LIGHT}, ${GOLD}, transparent)`,
        }}
      />

      {/* Gold ambient glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] pointer-events-none"
        style={{
          background: `radial-gradient(ellipse, rgba(201,168,76,0.12) 0%, transparent 70%)`,
        }}
      />

      <div className="container mx-auto px-4 py-14 relative z-10">
        <div className="grid md:grid-cols-3 gap-10 mb-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src={logoSrc}
                alt={`${brandName} logo`}
                className="w-11 h-11 rounded-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = "/logo.png";
                }}
              />
              <span
                className="font-bold text-lg tracking-wide"
                style={{
                  background: `linear-gradient(135deg, ${GOLD_PALE} 0%, ${GOLD} 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {brandName}
              </span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(245,230,181,0.65)" }}>
              Mitra terpercaya Anda untuk perawatan estetika premium. Rasakan seni
              kecantikan bersama tim ahli kami yang berpengalaman.
            </p>
            {/* Social icons */}
            <div className="mt-4 flex gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                style={{
                  background: "rgba(201,168,76,0.12)",
                  border: "1px solid rgba(201,168,76,0.25)",
                  color: GOLD_LIGHT,
                }}
                title="WhatsApp"
              >
                <Phone className="w-4 h-4" />
              </a>
              {contact?.instagram_url && (
                <a
                  href={contact.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                  style={{
                    background: "rgba(201,168,76,0.12)",
                    border: "1px solid rgba(201,168,76,0.25)",
                    color: GOLD_LIGHT,
                  }}
                  title="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {contact?.facebook_url && (
                <a
                  href={contact.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                  style={{
                    background: "rgba(201,168,76,0.12)",
                    border: "1px solid rgba(201,168,76,0.25)",
                    color: GOLD_LIGHT,
                  }}
                  title="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              )}
              {contact?.tiktok_url && (
                <a
                  href={contact.tiktok_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
                  style={{
                    background: "rgba(201,168,76,0.12)",
                    border: "1px solid rgba(201,168,76,0.25)",
                    color: GOLD_LIGHT,
                  }}
                  title="TikTok"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h3
              className="font-semibold mb-5 text-sm uppercase tracking-widest"
              style={{ color: GOLD }}
            >
              Menu Cepat
            </h3>
            <ul className="space-y-3 text-sm">
              {[
                { href: "#about", label: "Tentang Kami" },
                { href: "#services", label: "Layanan" },
                { href: "#promotions", label: "Promosi" },
                { href: "#testimonials", label: "Testimoni" },
                { href: "#contact", label: "Kontak" },
              ].map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="transition-colors duration-200 hover:pl-1 flex items-center gap-2"
                    style={{ color: "rgba(245,230,181,0.65)" }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLElement).style.color = GOLD_LIGHT)
                    }
                    onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.color =
                      "rgba(245,230,181,0.65)")
                    }
                  >
                    <span style={{ color: GOLD, fontSize: "0.6rem" }}>✦</span>
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3
              className="font-semibold mb-5 text-sm uppercase tracking-widest"
              style={{ color: GOLD }}
            >
              Hubungi Kami
            </h3>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: GOLD }} />
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "rgba(245,230,181,0.7)" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = GOLD_LIGHT)
                  }
                  onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLElement).style.color =
                    "rgba(245,230,181,0.7)")
                  }
                >
                  +{whatsappNumber}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: GOLD }} />
                <span style={{ color: "rgba(245,230,181,0.7)" }}>
                  Senin – Minggu, 09.00 – 20.00
                </span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: GOLD }} />
                <span style={{ color: "rgba(245,230,181,0.7)" }}>
                  Klinik Kecantikan {brandName}
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div
          className="border-t mb-6"
          style={{ borderColor: "rgba(201,168,76,0.15)" }}
        />

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs" style={{ color: "rgba(245,230,181,0.45)" }}>
            © {currentYear} {brandName}. Hak cipta dilindungi.
          </p>
          <Link
            to="/admin/login"
            className="text-xs transition-colors duration-200"
            style={{ color: "rgba(201,168,76,0.35)" }}
            onMouseEnter={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "rgba(201,168,76,0.65)")
            }
            onMouseLeave={(e) =>
            ((e.currentTarget as HTMLElement).style.color =
              "rgba(201,168,76,0.35)")
            }
          >
            Portal Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
