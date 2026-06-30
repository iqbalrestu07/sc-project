import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Check, ChevronsUpDown, Package, PackageMinus, FlaskConical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCreateConsumableUsage } from "@/hooks/useConsumableItems";
import type { Product } from "@/types/product";
import type { UsagePurpose } from "@/types/consumable";
import { USAGE_PURPOSES } from "@/types/consumable";

// ─── Dialog: Catat Pemakaian ──────────────────────────────────────────────────

interface UsageDialogProps {
  open: boolean;
  onClose: () => void;
  defaultProductId?: string;
  /** ALL products (consumable + regular). Dialog will sort and filter internally. */
  allProducts: Product[];
}

export function UsageDialog({
  open,
  onClose,
  defaultProductId,
  allProducts,
}: UsageDialogProps) {
  const createUsage = useCreateConsumableUsage();
  const [productOpen, setProductOpen] = useState(false);
  // showConsumableOnly: true = hanya habis pakai, false = semua produk
  const [showConsumableOnly, setShowConsumableOnly] = useState(true);
  const [form, setForm] = useState({
    product_id: defaultProductId ?? "",
    quantity: "",
    usage_purpose: "" as UsagePurpose | "",
    patient_name: "",
    service_name: "",
    notes: "",
  });

  // Sync selected product when dialog opens
  useEffect(() => {
    if (open) {
      setForm((f) => ({
        ...f,
        product_id: defaultProductId ?? "",
        quantity: "",
        usage_purpose: "",
        patient_name: "",
        service_name: "",
        notes: "",
      }));
      // If we are passing a specific product, make sure filter allows it
      if (defaultProductId) {
        const product = allProducts.find(p => p.id === defaultProductId);
        if (product && !product.is_consumable) {
          setShowConsumableOnly(false);
        }
      }
    }
  }, [open, defaultProductId, allProducts]);

  // Products sorted: consumable first, then regular
  const sortedProducts = useMemo(() => {
    const consumables = allProducts.filter((p) => p.is_consumable);
    const regular = allProducts.filter((p) => !p.is_consumable);
    return showConsumableOnly ? consumables : [...consumables, ...regular];
  }, [allProducts, showConsumableOnly]);

  const consumableCount = allProducts.filter((p) => p.is_consumable).length;

  const selectedProduct = allProducts.find((p) => p.id === form.product_id);

  function reset() {
    setForm({
      product_id: defaultProductId ?? "",
      quantity: "",
      usage_purpose: "",
      patient_name: "",
      service_name: "",
      notes: "",
    });
    setShowConsumableOnly(true);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.product_id || !form.quantity || !form.usage_purpose) return;

    await createUsage.mutateAsync({
      product_id: form.product_id,
      quantity: parseInt(form.quantity),
      usage_purpose: form.usage_purpose as UsagePurpose,
      patient_name: form.patient_name || undefined,
      service_name: form.service_name || undefined,
      notes: form.notes || undefined,
    });
    handleClose();
  }

  const currentQty = parseInt(form.quantity || "0");
  const currentStock = selectedProduct?.current_stock ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <PackageMinus className="h-5 w-5 text-rose-500" />
            Catat Pemakaian
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Product picker with filter toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Produk <span className="text-destructive">*</span>
              </Label>
              {/* Filter toggle */}
              <div className="flex items-center gap-2 text-xs">
                <span className={cn("transition-colors", !showConsumableOnly && "text-muted-foreground")}>
                  <FlaskConical className="inline h-3 w-3 mr-0.5" />
                  Habis Pakai
                  {consumableCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                      {consumableCount}
                    </Badge>
                  )}
                </span>
                <Switch
                  id="product-filter-toggle"
                  checked={!showConsumableOnly}
                  onCheckedChange={(v) => {
                    setShowConsumableOnly(!v);
                    // Clear selected product if it no longer appears
                    if (!v && selectedProduct && selectedProduct.is_consumable === false) {
                      setForm((f) => ({ ...f, product_id: "" }));
                    }
                  }}
                  className="scale-75"
                />
                <span className={cn("transition-colors", showConsumableOnly && "text-muted-foreground")}>
                  Semua
                </span>
              </div>
            </div>

            {sortedProducts.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed p-4 text-center text-sm text-muted-foreground">
                {showConsumableOnly ? (
                  <span>
                    Belum ada produk habis pakai.{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setShowConsumableOnly(false)}
                    >
                      Tampilkan semua produk
                    </button>
                  </span>
                ) : (
                  "Tidak ada produk tersedia."
                )}
              </div>
            ) : (
              <Popover open={productOpen} onOpenChange={setProductOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={productOpen}
                    className="w-full justify-between font-normal"
                  >
                    {selectedProduct ? (
                      <span className="flex items-center gap-1.5 min-w-0">
                        {selectedProduct.is_consumable && (
                          <FlaskConical className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                        )}
                        <span className="truncate">{selectedProduct.name}</span>
                        <span className="text-muted-foreground text-xs shrink-0">
                          (stok: {selectedProduct.current_stock ?? 0} {selectedProduct.unit ?? "pcs"})
                        </span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Pilih produk...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[440px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Cari produk..." />
                    <CommandList>
                      <CommandEmpty>Tidak ada produk.</CommandEmpty>
                      {/* Consumable group */}
                      {sortedProducts.filter((p) => p.is_consumable).length > 0 && (
                        <CommandGroup heading="Produk Habis Pakai">
                          {sortedProducts
                            .filter((p) => p.is_consumable)
                            .map((p) => (
                              <CommandItem
                                key={p.id}
                                value={`consumable-${p.name}`}
                                onSelect={() => {
                                  setForm((f) => ({ ...f, product_id: p.id }));
                                  setProductOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    form.product_id === p.id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <FlaskConical className="mr-1.5 h-3.5 w-3.5 text-rose-500" />
                                <span className="flex-1">{p.name}</span>
                                <span
                                  className={cn(
                                    "text-xs ml-2",
                                    (p.current_stock ?? 0) === 0
                                      ? "text-destructive font-medium"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {p.current_stock ?? 0} {p.unit ?? "pcs"}
                                </span>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      )}
                      {/* Regular products group — only visible when toggle is off */}
                      {!showConsumableOnly &&
                        sortedProducts.filter((p) => !p.is_consumable).length > 0 && (
                          <CommandGroup heading="Produk Reguler">
                            {sortedProducts
                              .filter((p) => !p.is_consumable)
                              .map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={`regular-${p.name}`}
                                  onSelect={() => {
                                    setForm((f) => ({ ...f, product_id: p.id }));
                                    setProductOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      form.product_id === p.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <span className="flex-1">{p.name}</span>
                                  <span
                                    className={cn(
                                      "text-xs ml-2",
                                      (p.current_stock ?? 0) === 0
                                        ? "text-destructive font-medium"
                                        : "text-muted-foreground"
                                    )}
                                  >
                                    {p.current_stock ?? 0} {p.unit ?? "pcs"}
                                  </span>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Quantity + Purpose side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="usage-qty">
                Jumlah{" "}
                {selectedProduct?.unit ? `(${selectedProduct.unit})` : ""}
                <span className="text-destructive"> *</span>
              </Label>
              <Input
                id="usage-qty"
                type="number"
                min="1"
                step="any"
                placeholder="0"
                value={form.quantity}
                onChange={(e) =>
                  setForm((f) => ({ ...f, quantity: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>
                Tujuan Pemakaian{" "}
                <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.usage_purpose}
                onValueChange={(v) =>
                  setForm((f) => ({
                    ...f,
                    usage_purpose: v as UsagePurpose,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih tujuan..." />
                </SelectTrigger>
                <SelectContent>
                  {USAGE_PURPOSES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional context fields — shown for treatment/appointment */}
          {(form.usage_purpose === "treatment" ||
            form.usage_purpose === "appointment") && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-muted/40 rounded-lg border border-border/60">
                <div className="space-y-1.5">
                  <Label htmlFor="patient-name">Nama Pasien</Label>
                  <Input
                    id="patient-name"
                    placeholder="Opsional"
                    value={form.patient_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, patient_name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="service-name">Nama Layanan</Label>
                  <Input
                    id="service-name"
                    placeholder="Opsional"
                    value={form.service_name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, service_name: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}

          <div className="space-y-1.5">
            <Label htmlFor="usage-notes">Catatan</Label>
            <Textarea
              id="usage-notes"
              placeholder="Catatan tambahan (opsional)..."
              rows={2}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>

          {/* Stock warning */}
          {selectedProduct && currentQty > currentStock && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                Jumlah melebihi stok saat ini ({currentStock}{" "}
                {selectedProduct.unit ?? "pcs"}). Stok akan menjadi 0.
              </span>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={
                !form.product_id ||
                !form.quantity ||
                !form.usage_purpose ||
                createUsage.isPending
              }
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {createUsage.isPending ? "Menyimpan..." : "Catat Pemakaian"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


// ─── History Tab ──────────────────────────────────────────────────────────────

interface HistoryTabProps {
  consumableProducts: Product[];
}