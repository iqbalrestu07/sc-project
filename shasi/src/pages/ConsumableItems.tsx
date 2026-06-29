import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FlaskConical,
  PackageMinus,
  Search,
  AlertTriangle,
  Check,
  ChevronsUpDown,
  History,
  ClipboardList,
  X,
  Package,
  Tag,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useConsumableProducts,
  useConsumableUsageLogs,
  useCreateConsumableUsage,
} from "@/hooks/useConsumableItems";
import { useProducts } from "@/hooks/useProducts";
import type { Product } from "@/types/product";
import type { ConsumableUsageFilters, UsagePurpose } from "@/types/consumable";
import { USAGE_PURPOSES, CONSUMABLE_CATEGORIES } from "@/types/consumable";
import { ErrorBoundary } from "@/components/ui/error-boundary";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDateSafe(dateString: string | undefined | null, formatStr: string): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    return format(d, formatStr, { locale: idLocale });
  } catch (e) {
    return "—";
  }
}

function purposeLabel(purpose: string) {
  return USAGE_PURPOSES.find((p) => p.value === purpose)?.label ?? purpose;
}

function purposeBadgeVariant(
  purpose: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (purpose) {
    case "waste":
      return "destructive";
    case "treatment":
    case "appointment":
      return "default";
    case "internal":
      return "secondary";
    default:
      return "outline";
  }
}

function StockBadge({
  current,
  minimum,
}: {
  current: number;
  minimum: number;
}) {
  if (current === 0)
    return <Badge variant="destructive">Habis</Badge>;
  if (current <= minimum)
    return (
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-800 border-amber-200"
      >
        Stok Rendah
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="text-emerald-700 border-emerald-300 bg-emerald-50"
    >
      Aman
    </Badge>
  );
}

// ─── Dialog: Catat Pemakaian ──────────────────────────────────────────────────

interface UsageDialogProps {
  open: boolean;
  onClose: () => void;
  defaultProductId?: string;
  /** ALL products (consumable + regular). Dialog will sort and filter internally. */
  allProducts: Product[];
}

function UsageDialog({
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

function HistoryTab({ consumableProducts }: HistoryTabProps) {
  const [historyFilters, setHistoryFilters] = useState<ConsumableUsageFilters>({});
  const [tempFilters, setTempFilters] = useState<ConsumableUsageFilters>({});

  const {
    data: usageLogs = [],
    isLoading: logsLoading,
    isError: logsError,
    refetch,
  } = useConsumableUsageLogs(historyFilters);

  const hasFilters = Object.values(historyFilters).some(Boolean);

  function applyFilters() {
    setHistoryFilters({ ...tempFilters });
  }

  function clearFilters() {
    setTempFilters({});
    setHistoryFilters({});
  }

  return (
    <div className="space-y-4">
      {/* Filter panel */}
      <Card className="border-dashed">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
            <span>Filter Riwayat</span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Hapus filter
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Product filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Produk</Label>
              <Select
                value={tempFilters.productId ?? "all"}
                onValueChange={(v) =>
                  setTempFilters((f) => ({ ...f, productId: v === "all" ? undefined : v }))
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Semua produk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua produk</SelectItem>
                  {consumableProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Purpose filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tujuan</Label>
              <Select
                value={tempFilters.purpose ?? "all"}
                onValueChange={(v) =>
                  setTempFilters((f) => ({
                    ...f,
                    purpose: v === "all" ? undefined : (v as any),
                  }))
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Semua tujuan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua tujuan</SelectItem>
                  {USAGE_PURPOSES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* From date */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Dari Tanggal
              </Label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={tempFilters.from ?? ""}
                onChange={(e) =>
                  setTempFilters((f) => ({
                    ...f,
                    from: e.target.value || undefined,
                  }))
                }
              />
            </div>

            {/* To date */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Sampai Tanggal
              </Label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={tempFilters.to ?? ""}
                onChange={(e) =>
                  setTempFilters((f) => ({
                    ...f,
                    to: e.target.value || undefined,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end mt-3">
            <Button
              id="btn-apply-filters"
              size="sm"
              onClick={applyFilters}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Terapkan Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {logsError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Gagal memuat riwayat pemakaian.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="ml-3 h-7 gap-1.5"
            >
              <RefreshCw className="h-3 w-3" />
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* History table */}
      {!logsError && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal &amp; Waktu</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-center">Jumlah</TableHead>
                  <TableHead>Tujuan</TableHead>
                  <TableHead>Konteks</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      Memuat riwayat...
                    </TableCell>
                  </TableRow>
                ) : usageLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <History className="h-10 w-10 opacity-30" />
                        <div>
                          <p className="font-medium">
                            Belum ada riwayat pemakaian
                          </p>
                          <p className="text-sm">
                            {hasFilters
                              ? "Tidak ada data untuk filter yang dipilih"
                              : "Riwayat akan muncul setelah Anda mencatat pemakaian"}
                          </p>
                        </div>
                        {hasFilters && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearFilters}
                          >
                            Hapus filter
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  usageLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        <div className="font-medium">
                          {formatDateSafe(log.created_at, "dd MMM yyyy HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{log.product_name}</div>
                        <div className="text-xs text-muted-foreground">
                          Sisa: {log.current_stock} {log.product_unit}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        <span className="text-rose-700">
                          -
                          {log.quantity % 1 === 0
                            ? log.quantity
                            : log.quantity.toFixed(3)}
                        </span>
                        <span className="font-normal text-muted-foreground text-xs ml-1">
                          {log.product_unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={purposeBadgeVariant(log.usage_purpose)}
                          className="text-xs"
                        >
                          {purposeLabel(log.usage_purpose)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.patient_name || log.service_name ? (
                          <div>
                            {log.patient_name && (
                              <div className="text-xs">
                                Pasien: {log.patient_name}
                              </div>
                            )}
                            {log.service_name && (
                              <div className="text-xs text-muted-foreground">
                                Layanan: {log.service_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[180px]">
                        {log.notes ? (
                          <span
                            className="truncate block"
                            title={log.notes}
                          >
                            {log.notes}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConsumableItems() {
  const [activeTab, setActiveTab] = useState<"products" | "history">(
    "products"
  );
  const [search, setSearch] = useState("");
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

  // Filtered products list for the products tab
  const filteredProducts = useMemo(() => {
    if (!search.trim()) return consumableProducts;
    const q = search.toLowerCase();
    return consumableProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.unit ?? "").toLowerCase().includes(q)
    );
  }, [consumableProducts, search]);

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
                              onClick={() => openUsageDialog(product.id)}
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
