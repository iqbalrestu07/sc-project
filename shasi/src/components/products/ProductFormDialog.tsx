import { useState, useEffect } from "react";
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
  FormDescription,
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
import type { Product } from "@/types/product";
import { PRODUCT_CATEGORIES, PRODUCT_UNITS } from "@/types/product";
import { CONSUMABLE_CATEGORIES } from "@/types/consumable";

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

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
}: ProductFormDialogProps) {
  const { createProduct, updateProduct } = useProducts();
  const { categories: apiCategories } = useProductCategories();
  const isEditing = !!product;

  // Consumable state — managed outside react-hook-form since it's a boolean + optional string
  const [isConsumable, setIsConsumable] = useState(false);
  const [consumableCategory, setConsumableCategory] = useState<string>("");

  // Use API categories if available, fall back to static list
  const categoryOptions =
    apiCategories.length > 0
      ? apiCategories.map((c) => ({ value: c.name.toLowerCase(), label: c.name }))
      : PRODUCT_CATEGORIES;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      sku: "",
      category: "other",
      unit: "pcs",
      purchase_price: 0,
      selling_price: 0,
      current_stock: 0,
      minimum_stock: 5,
      supplier: "",
      expiry_date: "",
    },
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        sku: product.sku || "",
        category: product.category || "other",
        unit: product.unit || "pcs",
        purchase_price: product.purchase_price || 0,
        selling_price: product.selling_price || 0,
        current_stock: product.current_stock || 0,
        minimum_stock: product.minimum_stock || 5,
        supplier: product.supplier || "",
        expiry_date: product.expiry_date || "",
      });
      setIsConsumable(product.is_consumable ?? false);
      setConsumableCategory(product.consumable_category ?? "");
    } else {
      form.reset({
        name: "",
        sku: "",
        category: "other",
        unit: "pcs",
        purchase_price: 0,
        selling_price: 0,
        current_stock: 0,
        minimum_stock: 5,
        supplier: "",
        expiry_date: "",
      });
      setIsConsumable(false);
      setConsumableCategory("");
    }
  }, [product, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const cleanedValues = {
        ...values,
        sku: values.sku || null,
        supplier: values.supplier || null,
        expiry_date: values.expiry_date || null,
        is_consumable: isConsumable,
        consumable_category: isConsumable && consumableCategory ? consumableCategory : null,
      };

      if (isEditing && product) {
        await updateProduct.mutateAsync({ id: product.id, ...cleanedValues });
      } else {
        await createProduct.mutateAsync(cleanedValues);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const isPending = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? "Edit Product" : "Add New Product"}
            {isConsumable && (
              <Badge
                variant="secondary"
                className="bg-rose-100 text-rose-700 border-rose-200 gap-1 text-xs font-normal"
              >
                <FlaskConical className="h-3 w-3" />
                Habis Pakai
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Basic Information
              </h3>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value}>
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

            {/* ── Consumable Section ─────────────────────────────────────── */}
            <Separator />
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Tipe Produk
              </h3>

              {/* Toggle */}
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

              {/* Consumable category — shown only when toggle is on */}
              {isConsumable && (
                <div className="space-y-1.5 pl-1">
                  <label className="text-sm font-medium">
                    Kategori Habis Pakai
                    <span className="text-muted-foreground font-normal ml-1">(opsional)</span>
                  </label>
                  <Select
                    value={consumableCategory}
                    onValueChange={setConsumableCategory}
                  >
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
              <h3 className="text-sm font-medium text-muted-foreground">
                Pricing
              </h3>
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

            {/* Stock / Inventory */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Inventory
              </h3>
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

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Saving..."
                  : isEditing
                  ? "Update Product"
                  : "Add Product"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
