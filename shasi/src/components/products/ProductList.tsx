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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Search, MoreHorizontal, Edit, Trash2, AlertTriangle, Package, Filter, ArrowUpDown, Eye } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import type { Product } from "@/types/product";
import { PRODUCT_CATEGORIES } from "@/types/product";
import { format } from "date-fns";
import { ProductDetailDialog } from "@/components/products/ProductDetailDialog";
import { useDebounce } from "@/hooks/useDebounce";

interface ProductListProps {
  onEdit: (product: Product) => void;
}

export function ProductList({ onEdit }: ProductListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { products, hasNext, isLoading, deleteProduct } = useProducts(true, debouncedSearch, page, limit);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewProduct, setViewProduct] = useState<Product | null>(null);

  const [productType, setProductType] = useState<string>("all");
  const [stockStatus, setStockStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("name_asc");

  const filteredProducts = products.filter((product) => {
    const search = searchQuery.toLowerCase();
    const catStr = typeof product.category === 'object' ? product.category?.name : product.category;
    
    const matchesSearch = product.name.toLowerCase().includes(search) ||
      (product.sku?.toLowerCase().includes(search) ?? false) ||
      (catStr?.toLowerCase().includes(search) ?? false);

    const matchesType = 
      productType === "all" ? true :
      productType === "consumable" ? product.is_consumable :
      productType === "normal" ? !product.is_consumable : true;

    const stock = product.current_stock ?? 0;
    const minStock = product.minimum_stock ?? 5;
    const matchesStock =
      stockStatus === "all" ? true :
      stockStatus === "low_stock" ? (stock > 0 && stock <= minStock) :
      stockStatus === "out_of_stock" ? stock <= 0 : true;

    return matchesSearch && matchesType && matchesStock;
  }).sort((a, b) => {
    if (sortBy === "name_asc") return a.name.localeCompare(b.name);
    if (sortBy === "name_desc") return b.name.localeCompare(a.name);
    if (sortBy === "stock_asc") return (a.current_stock ?? 0) - (b.current_stock ?? 0);
    if (sortBy === "stock_desc") return (b.current_stock ?? 0) - (a.current_stock ?? 0);
    return 0;
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

  const getCategoryLabel = (value: any) => {
    if (!value) return "-";
    if (typeof value === "object" && value.name) return value.name;
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
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, or category..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger className="w-[140px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <span>Type</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="normal">Retail / Normal</SelectItem>
                  <SelectItem value="consumable">Consumable</SelectItem>
                </SelectContent>
              </Select>

              <Select value={stockStatus} onValueChange={setStockStatus}>
                <SelectTrigger className="w-[140px]">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>Stock</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="low_stock">Low Stock</SelectItem>
                  <SelectItem value="out_of_stock">Out of Stock</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    <span>Sort</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                  <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                  <SelectItem value="stock_desc">Stock (High-Low)</SelectItem>
                  <SelectItem value="stock_asc">Stock (Low-High)</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
                    <TableCell className="font-medium">
                      <button
                        className="text-left hover:underline underline-offset-4 transition-colors text-foreground hover:text-primary"
                        onClick={() => setViewProduct(product)}
                      >
                        {product.name}
                      </button>
                    </TableCell>
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
                          <DropdownMenuItem onClick={() => setViewProduct(product)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Lihat Detail
                          </DropdownMenuItem>
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
          <div className="flex items-center justify-between p-4 border-t">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">Page {page}</span>
            <Button
              variant="outline"
              disabled={!hasNext}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
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

      <ProductDetailDialog
        product={viewProduct}
        open={!!viewProduct}
        onOpenChange={(open) => { if (!open) setViewProduct(null); }}
      />
    </>
  );
}
