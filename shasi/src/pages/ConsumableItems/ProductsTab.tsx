import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, FlaskConical, PackageMinus, Package, CheckCircle2, X, AlertTriangle, RefreshCw, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";
import { CONSUMABLE_CATEGORIES } from "@/types/consumable";
import { StockBadge } from "./components/Helpers";

interface ProductsTabProps {
  consumableProducts: Product[];
  onRecordUsage: (productId?: string) => void;
  productsLoading: boolean;
  productsError: boolean;
  refetchProducts: () => void;
}

export function ProductsTab({ consumableProducts, onRecordUsage, productsLoading, productsError, refetchProducts }: ProductsTabProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const filteredProducts = useMemo(() => {
    if (!consumableProducts) return [];
    const q = search.toLowerCase();
    return consumableProducts.filter(
      (p) => {
        const matchSearch = p.name.toLowerCase().includes(q) || (p.unit ?? "").toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q);
        const matchCat = categoryFilter === "all" || p.category === categoryFilter;
        return matchSearch && matchCat;
      }
    );
  }, [consumableProducts, search, categoryFilter]);

  return (
        <TabsContent value="products" className="mt-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search-consumable-products"
                placeholder="Cari produk habis pakai..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              {filteredProducts.length} produk
            </span>
          </div>

          {/* Error state for products */}
          {productsError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Gagal memuat daftar produk habis pakai.</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchProducts()}
                  className="ml-3 h-7 gap-1.5"
                >
                  <RefreshCw className="h-3 w-3" />
                  Coba lagi
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!productsError && (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produk</TableHead>
                      <TableHead>Kategori Habis Pakai</TableHead>
                      <TableHead className="text-center">Stok Saat Ini</TableHead>
                      <TableHead className="text-center">Min. Stok</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-12 text-muted-foreground"
                        >
                          Memuat data...
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center gap-3 text-muted-foreground">
                            <FlaskConical className="h-10 w-10 opacity-30" />
                            <div>
                              <p className="font-medium">
                                Belum ada produk habis pakai
                              </p>
                              <p className="text-sm">
                                Buka halaman{" "}
                                <a
                                  href="/products"
                                  className="text-primary underline-offset-2 hover:underline"
                                >
                                  Products
                                </a>
                                , edit produk, lalu aktifkan toggle{" "}
                                <strong>"Produk Habis Pakai"</strong>
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product) => (
                        <TableRow
                          key={product.id}
                          className={cn(
                            "transition-colors",
                            (product.current_stock ?? 0) === 0 &&
                            "bg-red-50/50"
                          )}
                        >
                          <TableCell>
                            <div className="font-medium">{product.name}</div>
                            {product.sku && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                SKU: {product.sku}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {product.consumable_category ? (
                              <Badge
                                variant="outline"
                                className="text-xs gap-1"
                              >
                                <Tag className="h-3 w-3" />
                                {CONSUMABLE_CATEGORIES.find(
                                  (c) => c.value === product.consumable_category
                                )?.label ?? product.consumable_category}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground text-sm">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {product.current_stock ?? 0}
                            <span className="font-normal text-muted-foreground text-xs ml-1">
                              {product.unit ?? "pcs"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {product.minimum_stock ?? 0}{" "}
                            {product.unit ?? "pcs"}
                          </TableCell>
                          <TableCell className="text-center">
                            <StockBadge
                              current={product.current_stock ?? 0}
                              minimum={product.minimum_stock ?? 0}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              id={`btn-use-${product.id}`}
                              size="sm"
                              variant="outline"
                              onClick={() => onRecordUsage(product.id)}
                              className="gap-1.5 text-rose-700 border-rose-200 hover:bg-rose-50 hover:border-rose-300"
                            >
                              <PackageMinus className="h-3.5 w-3.5" />
                              Gunakan
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

  );
}
