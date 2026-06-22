import { useCmsContact } from "@/hooks/useCmsData";
import { MapPin, Phone, Mail, Instagram, Facebook } from "lucide-react";

export function ContactSection() {
  const { data: contact } = useCmsContact();

  const whatsappNumber = contact?.whatsapp_number || "6282123523139";

  return (
    <section id="contact" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="text-primary text-sm font-medium uppercase tracking-wider">
            Hubungi Kami
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 mb-4">
            Kunjungi Shasi Beauty Care
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Kami senang mendengar dari Anda. Hubungi kami melalui channel di bawah ini.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact info */}
          <div className="space-y-6">
            {/* Address */}
            {contact?.address && (
              <div className="flex items-start gap-4 p-6 bg-card rounded-xl shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Alamat</h3>
                  <p className="text-muted-foreground">{contact.address}</p>
                </div>
              </div>
            )}

            {/* WhatsApp */}
            <a 
              href={`https://wa.me/${whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-4 p-6 bg-card rounded-xl shadow-sm hover:shadow-md transition-shadow group"
            >
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Phone className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  WhatsApp
                </h3>
                <p className="text-muted-foreground">+{whatsappNumber}</p>
              </div>
            </a>

            {/* Email */}
            {contact?.email && (
              <a 
                href={`mailto:${contact.email}`}
                className="flex items-start gap-4 p-6 bg-card rounded-xl shadow-sm hover:shadow-md transition-shadow group"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Mail className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                    Email
                  </h3>
                  <p className="text-muted-foreground">{contact.email}</p>
                </div>
              </a>
            )}

            {/* Social media */}
            <div className="flex gap-4 pt-4">
              {contact?.instagram_url && (
                <a 
                  href={contact.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform"
                >
                  <Instagram className="w-6 h-6" />
                </a>
              )}
              {contact?.facebook_url && (
                <a 
                  href={contact.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform"
                >
                  <Facebook className="w-6 h-6" />
                </a>
              )}
              {contact?.tiktok_url && (
                <a 
                  href={contact.tiktok_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white hover:scale-110 transition-transform"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                  </svg>
                </a>
              )}
            </div>
          </div>

          {/* Map */}
          <div className="h-[400px] bg-card rounded-xl shadow-sm overflow-hidden">
            {contact?.google_maps_embed ? (
              <iframe
                src={contact.google_maps_embed}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Lokasi Shasi Beauty Care"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Lokasi peta segera hadir</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
