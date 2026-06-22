import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, Tag, Sparkles, Package } from "lucide-react";
import { useServiceCategories } from "@/hooks/useServices";
import { useProductCategories } from "@/hooks/useProducts";
import type { ServiceCategory } from "@/types/service";
import type { ProductCategory } from "@/types/product";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

type CategoryType = "service" | "product";

interface CategoryFormValues {
  name: string;
  description: string;
}

const emptyForm: CategoryFormValues = { name: "", description: "" };

// ─── reusable inline form dialog ────────────────────────────────────────────
function CategoryFormDialog({
  open,
  onOpenChange,
  initialValues,
  onSubmit,
  isPending,
  title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialValues: CategoryFormValues;
  onSubmit: (values: CategoryFormValues) => void;
  isPending: boolean;
  title: string;
}) {
  const [values, setValues] = useState<CategoryFormValues>(initialValues);

  // Sync when dialog opens with new data
  const handleOpenChange = (v: boolean) => {
    if (v) setValues(initialValues);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="cat-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cat-name"
              value={values.name}
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
              placeholder="e.g. Facial Treatments"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-desc">Description</Label>
            <Textarea
              id="cat-desc"
              rows={3}
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
              placeholder="Short description (optional)"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!values.name.trim() || isPending}
            onClick={() => onSubmit(values)}
          >
            {isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── generic category table ──────────────────────────────────────────────────
function CategoryTable({
  categories,
  isLoading,
  onEdit,
  onDelete,
  emptyLabel,
}: {
  categories: (ServiceCategory | ProductCategory)[];
  isLoading: boolean;
  onEdit: (cat: ServiceCategory | ProductCategory) => void;
  onDelete: (cat: ServiceCategory | ProductCategory) => void;
  emptyLabel: string;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
        Loading categories…
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Tag className="h-10 w-10 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {categories.map((cat) => (
          <TableRow key={cat.id}>
            <TableCell className="font-medium">{cat.name}</TableCell>
            <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
              {cat.description || "—"}
            </TableCell>
            <TableCell>
              <Badge
                variant={cat.is_active ? "default" : "secondary"}
                className="text-xs"
              >
                {cat.is_active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {format(new Date(cat.created_at), "dd MMM yyyy", { locale: idLocale })}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(cat)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => onDelete(cat)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────
export default function Categories() {
  // Service categories
  const {
    data: serviceCategories = [],
    isLoading: serviceLoading,
    createCategory: createService,
    updateCategory: updateService,
    deleteCategory: deleteService,
  } = useServiceCategories();

  // Product categories
  const {
    categories: productCategories = [],
    isLoading: productLoading,
    createCategory: createProduct,
    updateCategory: updateProduct,
    deleteCategory: deleteProduct,
  } = useProductCategories();

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formValues, setFormValues] = useState<CategoryFormValues>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<CategoryType>("service");

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    type: CategoryType;
  } | null>(null);

  const openCreate = (type: CategoryType) => {
    setActiveType(type);
    setEditingId(null);
    setFormValues(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (cat: ServiceCategory | ProductCategory, type: CategoryType) => {
    setActiveType(type);
    setEditingId(cat.id);
    setFormValues({ name: cat.name, description: cat.description || "" });
    setFormOpen(true);
  };

  const handleSubmit = async (values: CategoryFormValues) => {
    const payload = { name: values.name.trim(), description: values.description.trim() || undefined };
    if (editingId) {
      if (activeType === "service") {
        await updateService.mutateAsync({ id: editingId, ...payload });
      } else {
        await updateProduct.mutateAsync({ id: editingId, ...payload });
      }
    } else {
      if (activeType === "service") {
        await createService.mutateAsync(payload);
      } else {
        await createProduct.mutateAsync(payload);
      }
    }
    setFormOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "service") {
      await deleteService.mutateAsync(deleteTarget.id);
    } else {
      await deleteProduct.mutateAsync(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  const isPending =
    createService.isPending ||
    updateService.isPending ||
    createProduct.isPending ||
    updateProduct.isPending;

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
      <PageHeader
        title="Categories"
        description="Manage categories for services and products"
      />

      <Tabs defaultValue="service" className="space-y-4">
        <TabsList>
          <TabsTrigger value="service" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Service Categories
            <Badge variant="secondary" className="ml-1 text-xs">
              {serviceCategories.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="product" className="gap-2">
            <Package className="h-4 w-4" />
            Product Categories
            <Badge variant="secondary" className="ml-1 text-xs">
              {productCategories.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ── Service Categories ── */}
        <TabsContent value="service">
          <Card className="shadow-clinic">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base">Service Categories</CardTitle>
              <Button size="sm" className="gap-2" onClick={() => openCreate("service")}>
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <CategoryTable
                categories={serviceCategories}
                isLoading={serviceLoading}
                onEdit={(cat) => openEdit(cat, "service")}
                onDelete={(cat) => setDeleteTarget({ id: cat.id, name: cat.name, type: "service" })}
                emptyLabel="No service categories yet. Add one to group your services."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Product Categories ── */}
        <TabsContent value="product">
          <Card className="shadow-clinic">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-base">Product Categories</CardTitle>
              <Button size="sm" className="gap-2" onClick={() => openCreate("product")}>
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <CategoryTable
                categories={productCategories}
                isLoading={productLoading}
                onEdit={(cat) => openEdit(cat, "product")}
                onDelete={(cat) => setDeleteTarget({ id: cat.id, name: cat.name, type: "product" })}
                emptyLabel="No product categories yet. Add one to group your products."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create / Edit dialog */}
      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValues={formValues}
        onSubmit={handleSubmit}
        isPending={isPending}
        title={editingId
          ? `Edit ${activeType === "service" ? "Service" : "Product"} Category`
          : `New ${activeType === "service" ? "Service" : "Product"} Category`}
      />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-medium">"{deleteTarget?.name}"</span> will be permanently deleted.
              Services or products in this category will become uncategorized.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
