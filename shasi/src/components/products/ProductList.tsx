import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Card, CardContent } from "@/components/ui/card";
import { Search, MoreHorizontal, Edit, Trash2, AlertTriangle, Package } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import type { Product } from "@/types/product";
import { PRODUCT_CATEGORIES } from "@/types/product";
import { format } from "date-fns";

interface ProductListProps {
  onEdit: (product: Product) => void;
}

export function ProductList({ onEdit }: ProductListProps) {
  const { products, isLoading, deleteProduct } = useProducts();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredProducts = products.filter((product) => {
    const search = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(search) ||
      (product.sku?.toLowerCase().includes(search) ?? false) ||
      (product.category?.toLowerCase().includes(search) ?? false)
    );
  });

  const handleDelete = async () => {
    if (deleteId) {
      await deleteProduct.mutateAsync(deleteId);
      setDeleteId(null);
    }
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "-";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getCategoryLabel = (value: string | null) => {
    if (!value) return "-";
    return PRODUCT_CATEGORIES.find((c) => c.value === value)?.label || value;
  };

  const isLowStock = (product: Product) => {
    return (product.current_stock ?? 0) <= (product.minimum_stock ?? 5);
  };

  const isExpiringSoon = (product: Product) => {
    if (!product.expiry_date) return false;
    const expiryDate = new Date(product.expiry_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow;
  };

  if (isLoading) {
    return (
      <Card className="shadow-clinic">
        <CardContent className="py-16">
          <div className="text-center text-muted-foreground">
            Loading products...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (products.length === 0) {
    return (
      <Card className="shadow-clinic">
        <CardContent className="py-16">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">No products added</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Add your clinic's products and consumables to track inventory.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-clinic">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, SKU, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-clinic mt-4">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.sku || "-"}
                    </TableCell>
                    <TableCell>{getCategoryLabel(product.category)}</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={
                          isLowStock(product)
                            ? "text-destructive font-medium"
                            : ""
                        }
                      >
                        {product.current_stock ?? 0} {product.unit}
                      </span>
                      {isLowStock(product) && (
                        <span className="text-xs text-muted-foreground block">
                          Min: {product.minimum_stock ?? 5}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(product.selling_price)}
                    </TableCell>
                    <TableCell>
                      {product.expiry_date
                        ? format(new Date(product.expiry_date), "dd/MM/yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isLowStock(product) && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Low Stock
                          </Badge>
                        )}
                        {isExpiringSoon(product) && (
                          <Badge variant="secondary" className="gap-1 bg-warning/20 text-warning-foreground">
                            <AlertTriangle className="h-3 w-3" />
                            Expiring
                          </Badge>
                        )}
                        {!isLowStock(product) && !isExpiringSoon(product) && (
                          <Badge variant="outline" className="text-primary border-primary">
                            OK
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(product)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteId(product.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
