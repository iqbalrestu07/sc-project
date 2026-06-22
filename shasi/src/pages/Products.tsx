import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Package, AlertTriangle } from "lucide-react";
import { ProductFormDialog, ProductList } from "@/components/products";
import { useProducts } from "@/hooks/useProducts";
import type { Product } from "@/types/product";

export default function Products() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { totalProducts, lowStockProducts, expiringProducts } = useProducts();

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingProduct(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
      <PageHeader 
        title="Products & Inventory" 
        description="Manage products, consumables, and stock levels"
        action={
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-clinic">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-xl font-semibold">{totalProducts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-clinic">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Low Stock</p>
                <p className="text-xl font-semibold">{lowStockProducts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-clinic">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-xl font-semibold">{expiringProducts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product List */}
      <ProductList onEdit={handleEdit} />

      {/* Form Dialog */}
      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        product={editingProduct}
      />
    </div>
  );
}
