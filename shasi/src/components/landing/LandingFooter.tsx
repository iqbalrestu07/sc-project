import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

export function LandingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg">Shasi Beauty Care</span>
            </div>
            <p className="text-background/70 text-sm">
              Mitra terpercaya Anda untuk perawatan estetika premium. 
              Rasakan seni kecantikan bersama tim ahli kami.
            </p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="font-semibold mb-4">Menu Cepat</h3>
            <ul className="space-y-2 text-sm text-background/70">
              <li>
                <a href="#about" className="hover:text-background transition-colors">Tentang Kami</a>
              </li>
              <li>
                <a href="#services" className="hover:text-background transition-colors">Layanan</a>
              </li>
              <li>
                <a href="#promotions" className="hover:text-background transition-colors">Promosi</a>
              </li>
              <li>
                <a href="#contact" className="hover:text-background transition-colors">Kontak</a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Kontak</h3>
            <ul className="space-y-2 text-sm text-background/70">
              <li>
                <a 
                  href="https://wa.me/6282123523139" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-background transition-colors"
                >
                  WhatsApp: +62 821 2352 3139
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-background/20 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-background/60">
            © {currentYear} Shasi Beauty Care. Hak cipta dilindungi.
          </p>
          <Link 
            to="/admin/login" 
            className="text-sm text-background/40 hover:text-background/60 transition-colors"
          >
            Portal Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
