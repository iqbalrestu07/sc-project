import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FlaskConical, AlertTriangle, Package, ClipboardList, History, PackageMinus } from "lucide-react";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useConsumableProducts } from "@/hooks/useConsumableItems";
import { useProducts } from "@/hooks/useProducts";
import { ProductsTab } from "./ProductsTab";
import { HistoryTab } from "./HistoryTab";
import { UsageDialog } from "./components/UsageDialog";

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConsumableItems() {
  const [activeTab, setActiveTab] = useState<"products" | "history">(
    "products"
  );
    const [usageDialogOpen, setUsageDialogOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<
    string | undefined
  >();

  const {
    data: consumableProducts = [],
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useConsumableProducts();

  // All products — for usage dialog filter
  const { products: allProducts = [] } = useProducts();

  // Summary stats
  const lowStockCount = consumableProducts.filter(
    (p) =>
      (p.current_stock ?? 0) <= (p.minimum_stock ?? 0) &&
      (p.current_stock ?? 0) > 0
  ).length;
  const outOfStockCount = consumableProducts.filter(
    (p) => (p.current_stock ?? 0) === 0
  ).length;

  function openUsageDialog(productId?: string) {
    setSelectedProductId(productId);
    setUsageDialogOpen(true);
  }

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Produk Habis Pakai"
        description="Manajemen dan tracking pemakaian produk habis pakai klinik"
      />

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">
                  Total Produk
                </p>
                <p className="text-2xl font-bold text-blue-800 mt-1">
                  {consumableProducts.length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <FlaskConical className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-amber-600 uppercase tracking-wide">
                  Stok Rendah
                </p>
                <p className="text-2xl font-bold text-amber-800 mt-1">
                  {lowStockCount}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600 uppercase tracking-wide">
                  Stok Habis
                </p>
                <p className="text-2xl font-bold text-red-800 mt-1">
                  {outOfStockCount}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <Package className="h-5 w-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabs ── */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as typeof activeTab)}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList className="h-10">
            <TabsTrigger value="products" className="gap-1.5">
              <ClipboardList className="h-4 w-4" />
              Daftar Produk
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1.5">
              <History className="h-4 w-4" />
              Riwayat Pemakaian
            </TabsTrigger>
          </TabsList>

          <Button
            id="btn-catat-pemakaian"
            onClick={() => openUsageDialog()}
            className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
          >
            <PackageMinus className="h-4 w-4" />
            Catat Pemakaian
          </Button>
        </div>

        {/* ═══ TAB 1: Daftar Produk ═══ */}
        <ProductsTab consumableProducts={consumableProducts} onRecordUsage={openUsageDialog} productsLoading={productsLoading} productsError={productsError} refetchProducts={refetchProducts} />
        {/* ═══ TAB 2: Riwayat Pemakaian ═══ */}
        <TabsContent value="history" className="mt-4">
          <ErrorBoundary>
            <HistoryTab consumableProducts={consumableProducts} />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* Usage dialog — passes all products, dialog handles sorting/filtering */}
      <UsageDialog
        open={usageDialogOpen}
        onClose={() => {
          setUsageDialogOpen(false);
          setSelectedProductId(undefined);
        }}
        defaultProductId={selectedProductId}
        allProducts={allProducts}
      />
    </div>
  );
}
