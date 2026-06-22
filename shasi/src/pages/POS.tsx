import { PageHeader } from "@/components/layout";
import { POSInterface } from "@/components/pos";
import { useTransactions } from "@/hooks/useTransactions";
import { Card, CardContent } from "@/components/ui/card";
import { ShoppingCart, DollarSign, TrendingUp } from "lucide-react";

export default function POS() {
  const { todayTransactions, todayRevenue } = useTransactions();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
      <PageHeader 
        title="Point of Sale" 
        description="Process transactions and payments"
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-clinic">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShoppingCart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Transactions</p>
                <p className="text-xl font-semibold">{todayTransactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-clinic">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Today's Revenue</p>
                <p className="text-xl font-semibold">{formatPrice(todayRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-clinic">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Transaction</p>
                <p className="text-xl font-semibold">
                  {todayTransactions.length > 0
                    ? formatPrice(todayRevenue / todayTransactions.length)
                    : formatPrice(0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <POSInterface />
    </div>
  );
}
