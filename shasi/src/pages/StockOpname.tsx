import { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
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
import {
  PackagePlus,
  PackageMinus,
  SlidersHorizontal,
  Search,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Check,
  ChevronsUpDown,
  ClipboardList,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useProducts } from "@/hooks/useProducts";
import { useStockMovements, type StockMovementInsert } from "@/hooks/useStockMovements";
import type { Product } from "@/types/product";

// ─── Types ────────────────────────────────────────────────────────────────────

type MovementType = "in" | "out" | "adjustment";

interface MovementFormState {
  product_id: string;
  movement_type: MovementType;
  quantity: string;
  reason: string;
  notes: string;
}

const EMPTY_FORM: MovementFormState = {
  product_id: "",
  movement_type: "in",
  quantity: "",
  reason: "",
  notes: "",
};

const MOVEMENT_REASONS: Record<MovementType, { value: string; label: string }[]> = {
  in: [
    { value: "purchase", label: "Pembelian / Restock" },
    { value: "return", label: "Retur dari Pelanggan" },
    { value: "transfer_in", label: "Transfer Masuk" },
    { value: "opname_correction", label: "Koreksi Opname" },
    { value: "other", label: "Lainnya" },
  ],
  out: [
    { value: "usage", label: "Pemakaian Layanan" },
    { value: "expired", label: "Kadaluarsa" },
    { value: "damaged", label: "Rusak / Pecah" },
    { value: "transfer_out", label: "Transfer Keluar" },
    { value: "opname_correction", label: "Koreksi Opname" },
    { value: "other", label: "Lainnya" },
  ],
  adjustment: [
    { value: "opname", label: "Stock Opname" },
    { value: "system_correction", label: "Koreksi Sistem" },
    { value: "other", label: "Lainnya" },
  ],
};

const MOVEMENT_TYPE_META: Record<MovementType, { label: string; color: string; icon: React.ElementType }> = {
  in: { label: "Stok Masuk", color: "bg-green-100 text-green-800", icon: TrendingUp },
  out: { label: "Stok Keluar", color: "bg-red-100 text-red-800", icon: TrendingDown },
  adjustment: { label: "Penyesuaian", color: "bg-blue-100 text-blue-800", icon: SlidersHorizontal },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stockStatusBadge(current: number, minimum: number) {
  if (current === 0) return <Badge variant="destructive">Habis</Badge>;
  if (current <= minimum) return <Badge className="bg-orange-100 text-orange-800">Hampir Habis</Badge>;
  return <Badge className="bg-green-100 text-green-800">Tersedia</Badge>;
}

// ─── Product Combobox ──────────────────────────────────────────────────────────

interface ProductComboboxProps {
  products: Product[];
  value: string;
  onChange: (id: string) => void;
}

function ProductCombobox({ products, value, onChange }: ProductComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = products.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="truncate">
              {selected.name}
              <span className="ml-2 text-muted-foreground text-xs">
                (Stok: {selected.current_stock ?? 0} {selected.unit ?? "pcs"})
              </span>
            </span>
          ) : (
            "Pilih produk..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Cari nama produk atau SKU..." />
          <CommandList className="max-h-64">
            <CommandEmpty>Produk tidak ditemukan.</CommandEmpty>
            <CommandGroup>
              {products.map((p) => (
                <CommandItem
                  key={p.id}
                  value={`${p.name} ${p.sku ?? ""}`}
                  onSelect={() => {
                    onChange(p.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", p.id === value ? "opacity-100" : "opacity-0")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.sku ? `SKU: ${p.sku} · ` : ""}
                      Stok: {p.current_stock ?? 0} {p.unit ?? "pcs"}
                    </p>
                  </div>
                  {stockStatusBadge(p.current_stock ?? 0, p.minimum_stock ?? 5)}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── Movement Dialog ───────────────────────────────────────────────────────────

interface MovementDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialProductId?: string;
  initialType?: MovementType;
  products: Product[];
  onSubmit: (payload: StockMovementInsert) => void;
  isPending: boolean;
}

function MovementDialog({
  open, onOpenChange, initialProductId, initialType, products, onSubmit, isPending,
}: MovementDialogProps) {
  const [form, setForm] = useState<MovementFormState>(EMPTY_FORM);

  // Setiap kali dialog dibuka, sinkronkan form dengan produk & tipe yang dipilih dari baris tabel
  useEffect(() => {
    if (open) {
      setForm({
        ...EMPTY_FORM,
        product_id: initialProductId ?? "",
        movement_type: initialType ?? "in",
      });
    }
  }, [open, initialProductId, initialType]);

  const handleOpenChange = (v: boolean) => {
    onOpenChange(v);
  };

  const selectedProduct = products.find((p) => p.id === form.product_id);
  const reasons = MOVEMENT_REASONS[form.movement_type];
  const typeMeta = MOVEMENT_TYPE_META[form.movement_type];

  // Projected stock after movement
  const projectedStock = useMemo(() => {
    const current = selectedProduct?.current_stock ?? 0;
    const qty = parseInt(form.quantity) || 0;
    if (qty <= 0) return null;
    if (form.movement_type === "in") return current + qty;
    if (form.movement_type === "out") return Math.max(0, current - qty);
    return qty; // adjustment = new delta
  }, [selectedProduct, form.quantity, form.movement_type]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id || !form.quantity || parseInt(form.quantity) <= 0) return;
    onSubmit({
      product_id: form.product_id,
      movement_type: form.movement_type,
      quantity: parseInt(form.quantity),
      reason: form.reason || undefined,
      notes: form.notes || undefined,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Catat Pergerakan Stok</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipe pergerakan */}
          <div className="grid grid-cols-3 gap-2">
            {(["in", "out", "adjustment"] as MovementType[]).map((t) => {
              const meta = MOVEMENT_TYPE_META[t];
              const Icon = meta.icon;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, movement_type: t, reason: "" }))}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border-2 text-sm font-medium transition-colors",
                    form.movement_type === t
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {meta.label}
                </button>
              );
            })}
          </div>

          {/* Produk */}
          <div className="space-y-2">
            <Label>Produk <span className="text-destructive">*</span></Label>
            <ProductCombobox
              products={products}
              value={form.product_id}
              onChange={(id) => setForm((f) => ({ ...f, product_id: id }))}
            />
            {selectedProduct && (
              <p className="text-xs text-muted-foreground">
                Stok saat ini:{" "}
                <span className="font-semibold">{selectedProduct.current_stock ?? 0} {selectedProduct.unit ?? "pcs"}</span>
              </p>
            )}
          </div>

          {/* Jumlah */}
          <div className="space-y-2">
            <Label>
              {form.movement_type === "adjustment" ? "Delta Jumlah (+/−)" : "Jumlah"}{" "}
              <span className="text-destructive">*</span>
            </Label>
            <div className="flex gap-3 items-center">
              <Input
                type="number"
                min={form.movement_type === "adjustment" ? undefined : 1}
                placeholder="0"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="w-32"
                required
              />
              {selectedProduct && projectedStock !== null && (
                <p className="text-sm">
                  Proyeksi stok:{" "}
                  <span className={cn("font-semibold", projectedStock <= 0 && "text-destructive")}>
                    {projectedStock} {selectedProduct.unit ?? "pcs"}
                  </span>
                </p>
              )}
            </div>
            {form.movement_type === "adjustment" && (
              <p className="text-xs text-muted-foreground">
                Masukkan nilai positif untuk menambah, negatif untuk mengurangi stok.
              </p>
            )}
          </div>

          {/* Alasan */}
          <div className="space-y-2">
            <Label>Alasan</Label>
            <Select
              value={form.reason}
              onValueChange={(v) => setForm((f) => ({ ...f, reason: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih alasan..." />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Catatan */}
          <div className="space-y-2">
            <Label>Catatan (opsional)</Label>
            <Textarea
              placeholder="Catatan tambahan..."
              rows={2}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={!form.product_id || !form.quantity || isPending}
              className={cn(
                typeMeta.color.includes("green") && "bg-green-600 hover:bg-green-700",
                typeMeta.color.includes("red") && "bg-red-600 hover:bg-red-700"
              )}
            >
              {isPending ? "Menyimpan..." : `Catat ${typeMeta.label}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StockOpname() {
  const { products, isLoading: productsLoading, lowStockProducts } = useProducts();
  const { movements, isLoading: movementsLoading, createMovement } = useStockMovements();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<MovementType>("in");
  const [dialogProductId, setDialogProductId] = useState<string>("");

  const [searchProduct, setSearchProduct] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "low" | "out">("all");
  const [historyProductFilter, setHistoryProductFilter] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState<"all" | MovementType>("all");

  // Summary stats
  const totalProducts = products.length;
  const outOfStockCount = products.filter((p) => (p.current_stock ?? 0) === 0).length;
  const lowStockCount = lowStockProducts.length;

  // Filtered product list for inventory table
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        !searchProduct ||
        p.name.toLowerCase().includes(searchProduct.toLowerCase()) ||
        (p.sku ?? "").toLowerCase().includes(searchProduct.toLowerCase());
      const current = p.current_stock ?? 0;
      const minimum = p.minimum_stock ?? 5;
      const matchStatus =
        filterStatus === "all" ||
        (filterStatus === "out" && current === 0) ||
        (filterStatus === "low" && current > 0 && current <= minimum);
      return matchSearch && matchStatus;
    });
  }, [products, searchProduct, filterStatus]);

  // Filtered movement history
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const product = products.find((p) => p.id === m.product_id);
      const matchProduct =
        !historyProductFilter ||
        product?.name.toLowerCase().includes(historyProductFilter.toLowerCase()) ||
        false;
      const matchType =
        historyTypeFilter === "all" || m.movement_type === historyTypeFilter;
      return matchProduct && matchType;
    });
  }, [movements, products, historyProductFilter, historyTypeFilter]);

  const openDialog = (type: MovementType, productId = "") => {
    setDialogType(type);
    setDialogProductId(productId);
    setDialogOpen(true);
  };

  const productName = (productId: string) =>
    products.find((p) => p.id === productId)?.name ?? productId;

  const productUnit = (productId: string) =>
    products.find((p) => p.id === productId)?.unit ?? "pcs";

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in space-y-6">
      <PageHeader
        title="Stock Opname"
        description="Kelola pergerakan stok produk: penerimaan, pengeluaran, dan penyesuaian"
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => openDialog("out")}>
              <PackageMinus className="h-4 w-4" />
              Stok Keluar
            </Button>
            <Button className="gap-2" onClick={() => openDialog("in")}>
              <PackagePlus className="h-4 w-4" />
              Stok Masuk
            </Button>
          </div>
        }
      />

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-clinic">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Produk</p>
              <p className="text-2xl font-semibold">{totalProducts}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-clinic">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-orange-100">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stok Hampir Habis</p>
              <p className="text-2xl font-semibold text-orange-600">{lowStockCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-clinic">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-red-100">
              <PackageMinus className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Stok Habis</p>
              <p className="text-2xl font-semibold text-destructive">{outOfStockCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Inventory Table ────────────────────────────────────────────────── */}
      <Card className="shadow-clinic">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Daftar Stok Produk
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari produk atau SKU..."
                  value={searchProduct}
                  onChange={(e) => setSearchProduct(e.target.value)}
                  className="pl-9 w-full sm:w-56"
                />
              </div>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="low">Hampir Habis</SelectItem>
                  <SelectItem value="out">Habis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-center">Stok</TableHead>
                  <TableHead className="text-center">Min.</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Memuat data...
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Tidak ada produk ditemukan.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const current = product.current_stock ?? 0;
                    const minimum = product.minimum_stock ?? 5;
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <p className="font-medium">{product.name}</p>
                          {product.supplier && (
                            <p className="text-xs text-muted-foreground">{product.supplier}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {product.sku ?? "—"}
                        </TableCell>
                        <TableCell className="text-center font-semibold">
                          {current}{" "}
                          <span className="text-xs text-muted-foreground font-normal">
                            {product.unit ?? "pcs"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center text-muted-foreground">
                          {minimum}
                        </TableCell>
                        <TableCell className="text-center">
                          {stockStatusBadge(current, minimum)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs h-7"
                              onClick={() => openDialog("in", product.id)}
                            >
                              <TrendingUp className="h-3 w-3 text-green-600" />
                              Masuk
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs h-7"
                              onClick={() => openDialog("out", product.id)}
                            >
                              <TrendingDown className="h-3 w-3 text-red-600" />
                              Keluar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-xs h-7"
                              onClick={() => openDialog("adjustment", product.id)}
                            >
                              <SlidersHorizontal className="h-3 w-3 text-blue-600" />
                              Sesuai
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* ── Movement History ───────────────────────────────────────────────── */}
      <Card className="shadow-clinic">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4" />
              Riwayat Pergerakan Stok
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Filter nama produk..."
                  value={historyProductFilter}
                  onChange={(e) => setHistoryProductFilter(e.target.value)}
                  className="pl-9 w-full sm:w-48"
                />
              </div>
              <Select
                value={historyTypeFilter}
                onValueChange={(v) => setHistoryTypeFilter(v as typeof historyTypeFilter)}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tipe</SelectItem>
                  <SelectItem value="in">Stok Masuk</SelectItem>
                  <SelectItem value="out">Stok Keluar</SelectItem>
                  <SelectItem value="adjustment">Penyesuaian</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produk</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-center">Jumlah</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead>Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movementsLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Memuat riwayat...
                    </TableCell>
                  </TableRow>
                ) : filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      Belum ada riwayat pergerakan stok.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((m) => {
                    const meta = MOVEMENT_TYPE_META[m.movement_type];
                    const Icon = meta.icon;
                    const qtyPrefix = m.movement_type === "out" ? "−" : m.movement_type === "in" ? "+" : "±";
                    const qtyColor =
                      m.movement_type === "in"
                        ? "text-green-600"
                        : m.movement_type === "out"
                        ? "text-red-600"
                        : "text-blue-600";
                    return (
                      <TableRow key={m.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{productName(m.product_id)}</p>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1", meta.color)}>
                            <Icon className="h-3 w-3" />
                            {meta.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn("font-semibold", qtyColor)}>
                            {qtyPrefix}{m.quantity} {productUnit(m.product_id)}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {m.reason
                            ? MOVEMENT_REASONS[m.movement_type].find((r) => r.value === m.reason)?.label ?? m.reason
                            : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                          {m.notes ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(m.created_at), "dd MMM yyyy, HH:mm", { locale: idLocale })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Movement Dialog ────────────────────────────────────────────────── */}
      <MovementDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialProductId={dialogProductId}
        initialType={dialogType}
        products={products}
        onSubmit={(payload) => createMovement.mutate(payload)}
        isPending={createMovement.isPending}
      />
    </div>
  );
}
