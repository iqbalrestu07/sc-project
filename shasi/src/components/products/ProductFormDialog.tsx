import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FlaskConical } from "lucide-react";
import { useProducts, useProductCategories } from "@/hooks/useProducts";
import type { Product, ProductInsert } from "@/types/product";
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from "@/types/product";
import { CONSUMABLE_CATEGORIES } from "@/types/consumable";
import type { CommissionType } from "@/types/service";

const formSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().optional(),
  category: z.string().optional(),
  unit: z.string().optional(),
  purchase_price: z.coerce.number().min(0, "Price cannot be negative").optional(),
  selling_price: z.coerce.number().min(0.01, "Selling price is required and must be greater than 0"),
  current_stock: z.coerce.number().min(0, "Stock cannot be negative").optional(),
  minimum_stock: z.coerce.number().min(0, "Minimum stock cannot be negative").optional(),
  supplier: z.string().optional(),
  expiry_date: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
}

// ─── Inner form — mounted fresh every time the dialog opens ──────────────────
// By using `key={product?.id ?? "new"}` on this component (via DialogContent),
// react-hook-form is always initialised with the correct defaultValues and we
// never need useEffect + form.reset(), which is the source of infinite loops.
function ProductForm({
  product,
  onOpenChange,
}: {
  product?: Product | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { createProduct, updateProduct } = useProducts();
  const { categories: apiCategories } = useProductCategories();
  const isEditing = !!product;

  // Normalise category to a plain string
  const categoryStr =
    typeof product?.category === "object" && product.category !== null
      ? (product.category as { name?: string; value?: string }).name ||
        (product.category as { name?: string; value?: string }).value ||
        "other"
      : (product?.category as string | undefined) || "other";

  // ── Local state for non-schema fields ──────────────────────────────────────
  const [isConsumable, setIsConsumable] = useState(product?.is_consumable ?? false);
  const [consumableCategory, setConsumableCategory] = useState(product?.consumable_category ?? "");

  const [docHandlingType, setDocHandlingType] = useState<CommissionType | "">(
    (product?.doctor_commission_type as CommissionType) ?? ""
  );
  const [docHandlingValue, setDocHandlingValue] = useState<number | "">(
    product?.doctor_commission_value ?? ""
  );
  const [therapistHandlingType, setTherapistHandlingType] = useState<CommissionType | "">(
    (product?.therapist_commission_type as CommissionType) ?? ""
  );
  const [therapistHandlingValue, setTherapistHandlingValue] = useState<number | "">(
    product?.therapist_commission_value ?? ""
  );
  const [docOfferingType, setDocOfferingType] = useState<CommissionType | "none">(
    (product?.doctor_offering_commission_type as CommissionType) ?? "none"
  );
  const [docOfferingValue, setDocOfferingValue] = useState<number | "">(
    product?.doctor_offering_commission_value ?? ""
  );
  const [therapistOfferingType, setTherapistOfferingType] = useState<CommissionType | "none">(
    (product?.therapist_offering_commission_type as CommissionType) ?? "none"
  );
  const [therapistOfferingValue, setTherapistOfferingValue] = useState<number | "">(
    product?.therapist_offering_commission_value ?? ""
  );

  // ── React-hook-form — defaultValues populated directly, no reset needed ────
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: product?.name ?? "",
      sku: product?.sku ?? "",
      category: categoryStr,
      unit: product?.unit ?? "pcs",
      purchase_price: product?.purchase_price ?? 0,
      selling_price: product?.selling_price ?? 0,
      current_stock: product?.current_stock ?? 0,
      minimum_stock: product?.minimum_stock ?? 5,
      supplier: product?.supplier ?? "",
      expiry_date: product?.expiry_date ?? "",
    },
  });

  const categoryOptions =
    apiCategories.length > 0
      ? apiCategories.map((c) => ({ value: c.name.toLowerCase(), label: c.name }))
      : PRODUCT_CATEGORIES;

  const onSubmit = async (values: FormValues) => {
    try {
      const cleanedValues: ProductInsert = {
        name: values.name,
        sku: values.sku || null,
        category: values.category,
        unit: values.unit,
        purchase_price: values.purchase_price,
        selling_price: values.selling_price,
        current_stock: values.current_stock,
        minimum_stock: values.minimum_stock,
        supplier: values.supplier || null,
        expiry_date: values.expiry_date || null,
        is_active: true,
        is_consumable: isConsumable,
        consumable_category: isConsumable && consumableCategory ? consumableCategory : null,
        doctor_commission_type: docHandlingType || null,
        doctor_commission_value: docHandlingValue !== "" ? Number(docHandlingValue) : null,
        therapist_commission_type: therapistHandlingType || null,
        therapist_commission_value: therapistHandlingValue !== "" ? Number(therapistHandlingValue) : null,
        doctor_offering_commission_type: docOfferingType !== "none" ? docOfferingType : null,
        doctor_offering_commission_value:
          docOfferingType !== "none" && docOfferingValue !== "" ? Number(docOfferingValue) : null,
        therapist_offering_commission_type: therapistOfferingType !== "none" ? therapistOfferingType : null,
        therapist_offering_commission_value:
          therapistOfferingType !== "none" && therapistOfferingValue !== ""
            ? Number(therapistOfferingValue)
            : null,
      };

      if (isEditing && product) {
        await updateProduct.mutateAsync({ id: product.id, ...cleanedValues });
      } else {
        await createProduct.mutateAsync(cleanedValues);
      }
      onOpenChange(false);
    } catch {
      // Error handled in mutation
    }
  };

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Hyaluronic Acid Serum" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., SKU-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PRODUCT_UNITS.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Consumable */}
        <Separator />
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Tipe Produk</h3>
          <div
            className={`flex items-start gap-4 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
              isConsumable
                ? "border-rose-200 bg-rose-50/60"
                : "border-border bg-muted/30 hover:bg-muted/60"
            }`}
            onClick={() => setIsConsumable((v) => !v)}
          >
            <Switch
              id="is-consumable-toggle"
              checked={isConsumable}
              onCheckedChange={setIsConsumable}
              onClick={(e) => e.stopPropagation()}
              className="mt-0.5"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <FlaskConical
                  className={`h-4 w-4 ${isConsumable ? "text-rose-600" : "text-muted-foreground"}`}
                />
                <span
                  className={`text-sm font-medium ${isConsumable ? "text-rose-800" : "text-foreground"}`}
                >
                  Produk Habis Pakai
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Aktifkan jika produk ini digunakan dalam treatment/layanan dan stoknya perlu ditracking per pemakaian
              </p>
            </div>
          </div>
          {isConsumable && (
            <div className="space-y-1.5 pl-1">
              <label className="text-sm font-medium">
                Kategori Habis Pakai
                <span className="text-muted-foreground font-normal ml-1">(opsional)</span>
              </label>
              <Select value={consumableCategory} onValueChange={setConsumableCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori habis pakai..." />
                </SelectTrigger>
                <SelectContent>
                  {CONSUMABLE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Pricing */}
        <Separator />
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Pricing</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="purchase_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Purchase Price (IDR)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="selling_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Selling Price (IDR)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Inventory */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">Inventory</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="current_stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current Stock</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="minimum_stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Minimum Stock (Alert Threshold)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="supplier"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <FormControl>
                    <Input placeholder="Supplier name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="expiry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expiry Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Commission */}
        <Separator />
        <div className="space-y-4">
          <h3 className="text-sm font-semibold">Komisi Terapis</h3>
          <p className="text-xs text-muted-foreground -mt-2">
            Handling: diberikan saat terapis ditugaskan menjual produk ini
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Tipe Handling</label>
              <Select
                value={therapistHandlingType || "none"}
                onValueChange={(v) => setTherapistHandlingType(v === "none" ? "" : (v as CommissionType))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Tidak ada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada</SelectItem>
                  <SelectItem value="percentage">Persentase (%)</SelectItem>
                  <SelectItem value="fixed">Nominal (IDR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Nilai Handling {therapistHandlingType === "percentage" ? "(%)" : "(IDR)"}
              </label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                className="h-8 text-xs"
                disabled={!therapistHandlingType}
                value={therapistHandlingValue}
                onChange={(e) =>
                  setTherapistHandlingValue(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Offering: diberikan saat terapis menawarkan produk dan pasien setuju
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Tipe Offering</label>
              <Select
                value={therapistOfferingType}
                onValueChange={(v) => setTherapistOfferingType(v as CommissionType | "none")}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Tidak ada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada</SelectItem>
                  <SelectItem value="percentage">Persentase (%)</SelectItem>
                  <SelectItem value="fixed">Nominal (IDR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Nilai Offering {therapistOfferingType === "percentage" ? "(%)" : "(IDR)"}
              </label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                className="h-8 text-xs"
                disabled={therapistOfferingType === "none"}
                value={therapistOfferingValue}
                onChange={(e) =>
                  setTherapistOfferingValue(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
          </div>

          <h3 className="text-sm font-semibold pt-2">Komisi Dokter</h3>
          <p className="text-xs text-muted-foreground -mt-2">
            Handling: diberikan saat dokter ditugaskan menjual produk ini
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Tipe Handling</label>
              <Select
                value={docHandlingType || "none"}
                onValueChange={(v) => setDocHandlingType(v === "none" ? "" : (v as CommissionType))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Tidak ada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada</SelectItem>
                  <SelectItem value="percentage">Persentase (%)</SelectItem>
                  <SelectItem value="fixed">Nominal (IDR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Nilai Handling {docHandlingType === "percentage" ? "(%)" : "(IDR)"}
              </label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                className="h-8 text-xs"
                disabled={!docHandlingType}
                value={docHandlingValue}
                onChange={(e) =>
                  setDocHandlingValue(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Offering: diberikan saat dokter menawarkan produk dan pasien setuju
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">Tipe Offering</label>
              <Select
                value={docOfferingType}
                onValueChange={(v) => setDocOfferingType(v as CommissionType | "none")}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Tidak ada" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada</SelectItem>
                  <SelectItem value="percentage">Persentase (%)</SelectItem>
                  <SelectItem value="fixed">Nominal (IDR)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Nilai Offering {docOfferingType === "percentage" ? "(%)" : "(IDR)"}
              </label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                className="h-8 text-xs"
                disabled={docOfferingType === "none"}
                value={docOfferingValue}
                onChange={(e) =>
                  setDocOfferingValue(e.target.value === "" ? "" : Number(e.target.value))
                }
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : isEditing ? "Update Product" : "Add Product"}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Shell — only responsible for the Dialog wrapper ─────────────────────────
export function ProductFormDialog({ open, onOpenChange, product }: ProductFormDialogProps) {
  const isEditing = !!product;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* key causes a full remount when product changes, so useForm always
          gets fresh defaultValues — no useEffect + reset needed */}
      <DialogContent
        key={isEditing ? product.id : "new"}
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Product" : "Add New Product"}</DialogTitle>
        </DialogHeader>
        <ProductForm product={product} onOpenChange={onOpenChange} />
      </DialogContent>
    </Dialog>
  );
}
