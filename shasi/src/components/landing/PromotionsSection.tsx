import { useCmsPromotions } from "@/hooks/useCmsData";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Calendar, Percent, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";

export function PromotionsSection() {
  const { data: promotions } = useCmsPromotions();

  if (!promotions || promotions.length === 0) {
    return null; // Don't render section if no active promotions
  }

  const whatsappUrl = "https://wa.me/6282123523139";

  return (
    <section id="promotions" className="py-20 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 text-primary text-sm font-medium uppercase tracking-wider bg-primary/10 px-4 py-2 rounded-full">
            <Percent className="w-4 h-4" />
            Penawaran Spesial
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-4 mb-4">
            Promo Bulanan
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Jangan lewatkan penawaran eksklusif bulanan kami. Waktu terbatas!
          </p>
        </div>

        {/* Promotions grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {promotions.map((promo) => {
            const daysLeft = differenceInDays(new Date(promo.end_date), new Date());
            const isUrgent = daysLeft <= 7;

            return (
              <Card 
                key={promo.id} 
                className="group overflow-hidden border-0 shadow-clinic hover:shadow-xl transition-all duration-300"
              >
                <CardContent className="p-0">
                  {/* Banner image or gradient */}
                  <div className="relative h-48 bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    {promo.banner_image_url ? (
                      <img 
                        src={promo.banner_image_url} 
                        alt={promo.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center text-white p-4">
                        <Percent className="w-12 h-12 mx-auto mb-2 opacity-80" />
                        <span className="text-2xl font-bold">PROMO</span>
                      </div>
                    )}
                    
                    {/* Urgency badge */}
                    {isUrgent && (
                      <Badge className="absolute top-4 right-4 bg-destructive text-destructive-foreground">
                        {daysLeft <= 0 ? "Hari Terakhir!" : `${daysLeft} hari lagi`}
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-foreground mb-3">
                      {promo.title}
                    </h3>
                    
                    {promo.description && (
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
                        {promo.description}
                      </p>
                    )}

                    {/* Date range */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                      <Clock className="w-4 h-4" />
                      <span>
                        Berlaku: {format(new Date(promo.start_date), "d MMM")} - {format(new Date(promo.end_date), "d MMM yyyy")}
                      </span>
                    </div>

                    {/* Terms */}
                    {promo.terms_conditions && (
                      <p className="text-xs text-muted-foreground italic mb-4">
                        *{promo.terms_conditions}
                      </p>
                    )}

                    {/* CTA */}
                    <Button asChild className="w-full">
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Klaim Penawaran
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
