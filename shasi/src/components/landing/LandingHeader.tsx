import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sparkles, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
        background: scrolled
          ? `rgba(107, 15, 26, 0.97)`
          : `rgba(107, 15, 26, 0.70)`,
        backdropFilter: "blur(16px)",
        borderBottom: scrolled
          ? `1px solid rgba(201, 168, 76, 0.3)`
          : `1px solid rgba(201, 168, 76, 0.1)`,
        boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.3)" : "none",
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.goldLight} 100%)`,
                boxShadow: `0 2px 12px rgba(201, 168, 76, 0.4)`,
              }}
            >
              <Sparkles className="w-5 h-5" style={{ color: COLORS.maroon }} />
            </div>
            <span
              className="font-bold text-lg tracking-wide hidden sm:block"
              style={{
                background: `linear-gradient(135deg, ${COLORS.goldLight} 0%, ${COLORS.gold} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Shasi Beauty Care
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
              href="https://wa.me/6282123523139"
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
            className="md:hidden py-4"
            style={{ borderTop: `1px solid rgba(201, 168, 76, 0.2)` }}
          >
            <nav className="flex flex-col gap-1">
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
                href="https://wa.me/6282123523139"
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
