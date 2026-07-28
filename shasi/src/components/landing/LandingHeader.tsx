import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { usePublicClinicInfo } from "@/hooks/usePublicClinicInfo";
import { useCmsContact } from "@/hooks/useCmsData";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

// ─── Maroon & Gold Design Tokens ─────────────────────────────────────────────
const COLORS = {
  maroon: "#6B0F1A",
  maroonLight: "#8B1A2A",
  maroonDark: "#4A0A12",
  gold: "#C9A84C",
  goldLight: "#E8C870",
  goldPale: "#F5E6B5",
  cream: "#FDF8F0",
};

export function LandingHeader() {
  const { orgSlug } = useParams<{ orgSlug?: string }>();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { data: clinicInfo } = usePublicClinicInfo();
  const { data: contact } = useCmsContact();
  const logoSrc = clinicInfo?.logo_url || "/logo.png";
  const brandName = clinicInfo?.clinic_name || "Shasi Beauty Care";
  const whatsappUrl = buildWhatsAppUrl(contact?.whatsapp_number);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const navLinks = [
    { href: "#about", label: "Tentang" },
    { href: "#services", label: "Layanan" },
    { href: "#promotions", label: "Promosi" },
    { href: "#testimonials", label: "Testimoni" },
    { href: "#contact", label: "Kontak" },
  ];

  const scrollToSection = (href: string) => {
    const element = document.querySelector(href);
    if (element) element.scrollIntoView({ behavior: "smooth" });
    setIsMenuOpen(false);
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: scrolled ? `rgba(61, 6, 16, 0.58)` : "transparent",
        backdropFilter: scrolled ? "blur(16px)" : "none",
        borderBottom: scrolled
          ? `1px solid rgba(201, 168, 76, 0.3)`
          : "1px solid transparent",
        boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.3)" : "none",
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to={orgSlug ? `/${orgSlug}` : "/"} className="flex items-center gap-3">
            <img
              src={logoSrc}
              alt={`${brandName} logo`}
              className="w-10 h-10 rounded-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/logo.png";
              }}
            />
            <span
              className="font-bold text-lg tracking-wide hidden sm:block"
              style={{
                background: `linear-gradient(135deg, ${COLORS.goldLight} 0%, ${COLORS.gold} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {brandName}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollToSection(link.href)}
                className="text-sm font-medium transition-all duration-200 hover:scale-105"
                style={{ color: "rgba(245, 230, 181, 0.85)" }}
                onMouseEnter={(e) =>
                  ((e.target as HTMLElement).style.color = COLORS.goldLight)
                }
                onMouseLeave={(e) =>
                  ((e.target as HTMLElement).style.color =
                    "rgba(245, 230, 181, 0.85)")
                }
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-4">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 hover:scale-105 hover:shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.goldLight} 100%)`,
                color: COLORS.maroon,
                boxShadow: `0 2px 12px rgba(201, 168, 76, 0.35)`,
              }}
            >
              Book Now
            </a>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-lg transition-colors"
              style={{ color: COLORS.goldLight }}
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div
            className="md:hidden fixed inset-x-0 top-16 z-40 max-h-[calc(100svh-4rem)] overflow-y-auto px-4 py-4"
            style={{
              background: "rgba(61, 6, 16, 0.55)",
              borderTop: `1px solid rgba(201, 168, 76, 0.2)`,
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
            }}
          >
            <nav className="flex flex-col gap-1 max-w-7xl mx-auto">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => scrollToSection(link.href)}
                  className="text-sm font-medium py-3 text-left px-2 rounded-lg transition-colors"
                  style={{ color: COLORS.goldPale }}
                >
                  {link.label}
                </button>
              ))}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center justify-center px-5 py-3 rounded-full text-sm font-semibold"
                style={{
                  background: `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.goldLight} 100%)`,
                  color: COLORS.maroon,
                }}
              >
                Book Now
              </a>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
