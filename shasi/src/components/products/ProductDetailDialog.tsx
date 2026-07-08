import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Package,
  Banknote,
  Tag,
  Layers,
  AlertTriangle,
  Percent,
  CalendarDays,
} from "lucide-react";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import type { Product } from "@/types/product";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

interface ProductDetailDialogProps {
  /** Pass productId to fetch from API, OR pass product object directly (no fetch) */
  productId?: string | null;
  product?: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailDialog({ productId, product: productProp, open, onOpenChange }: ProductDetailDialogProps) {
  const [fetched, setFetched] = useState<Product | null>(null);
  const [loading, setLoading] = useState(false);

  // Use the directly-passed object if available, otherwise the fetched one
  const product = productProp ?? fetched;

  useEffect(() => {
    if (!open || productProp) {
      setFetched(null);
      return;
    }
    if (!productId) {
      setFetched(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiClient
      .get<{ data: Product }>(API_ENDPOINTS.PRODUCTS.DETAIL(productId))
      .then((res) => { if (!cancelled) setFetched(res.data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, productId, productProp]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const commissionLabel = (type: string | null | undefined, value: number | null | undefined) => {
    if (!type || value == null) return "-";
    return type === "percentage" ? `${value}%` : fmt(value);
  };

  const categoryName =
    product?.category == null
      ? "-"
      : typeof product.category === "object"
      ? product.category.name
      : String(product.category);

  const isLowStock =
    (product?.current_stock ?? 0) <= (product?.minimum_stock ?? 0) && (product?.minimum_stock ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Detail Produk
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !product ? (
          <div className="py-12 text-center text-muted-foreground">Produk tidak ditemukan.</div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold leading-tight">{product.name}</h3>
                <p className="text-sm text-muted-foreground mt-0.5">{categoryName}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={product.is_active ? "default" : "secondary"}>
                  {product.is_active ? "Aktif" : "Nonaktif"}
                </Badge>
                {product.is_consumable && (
                  <Badge variant="outline" className="text-xs">Habis Pakai</Badge>
                )}
              </div>
            </div>

            {/* Price & Stock */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40">
                <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Harga Jual</p>
                  <p className="font-semibold">{fmt(product.selling_price ?? 0)}</p>
                </div>
              </div>
              <div className={`flex items-center gap-2 p-3 rounded-lg ${isLowStock ? "bg-destructive/10" : "bg-muted/40"}`}>
                <Layers className={`h-4 w-4 shrink-0 ${isLowStock ? "text-destructive" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-muted-foreground text-xs">Stok Saat Ini</p>
                  <p className={`font-semibold ${isLowStock ? "text-destructive" : ""}`}>
                    {product.current_stock ?? 0} {product.unit ?? ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40">
                <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Harga Beli</p>
                  <p className="font-semibold">{fmt(product.purchase_price ?? 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40">
                <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Stok Minimum</p>
                  <p className="font-semibold">{product.minimum_stock ?? 0} {product.unit ?? ""}</p>
                </div>
              </div>
            </div>

            {/* Extra info */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {product.sku && (
                <div>
                  <span className="text-muted-foreground">SKU: </span>
                  <span className="font-mono">{product.sku}</span>
                </div>
              )}
              {product.supplier && (
                <div>
                  <span className="text-muted-foreground">Supplier: </span>
                  <span>{product.supplier}</span>
                </div>
              )}
              {product.expiry_date && (
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">Expired: </span>
                  <span>{format(new Date(product.expiry_date), "dd MMM yyyy", { locale: idLocale })}</span>
                </div>
              )}
            </div>

            {isLowStock && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg p-3">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                Stok di bawah minimum! Segera lakukan restock.
              </div>
            )}

            {/* Commission (only if set) */}
            {(product.doctor_commission_value || product.therapist_commission_value) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <Percent className="h-4 w-4 text-muted-foreground" />
                    Komisi
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Dokter</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Handling</span>
                          <span className="font-medium text-xs">
                            {commissionLabel(product.doctor_commission_type, product.doctor_commission_value)}
                          </span>
                        </div>
                        {(product.doctor_offering_commission_value ?? 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Offering</span>
                            <span className="font-medium text-xs">
                              {commissionLabel(product.doctor_offering_commission_type, product.doctor_offering_commission_value)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Terapis</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-xs text-muted-foreground">Handling</span>
                          <span className="font-medium text-xs">
                            {commissionLabel(product.therapist_commission_type, product.therapist_commission_value)}
                          </span>
                        </div>
                        {(product.therapist_offering_commission_value ?? 0) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs text-muted-foreground">Offering</span>
                            <span className="font-medium text-xs">
                              {commissionLabel(product.therapist_offering_commission_type, product.therapist_offering_commission_value)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
