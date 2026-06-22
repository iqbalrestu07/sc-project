import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import type { Product, ProductInsert, ProductUpdate } from "@/types/product";
import { toast } from "sonner";

export function useProducts() {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ["products"],
    queryFn: async (): Promise<Product[]> => {
      try {
        const data = await apiClient.get<{ data: Product[] }>(
          API_ENDPOINTS.PRODUCTS.LIST
        );
        return data.data || [];
      } catch (error) {
        console.error("Error fetching products:", error);
        throw error;
      }
    },
  });

  const createProduct = useMutation({
    mutationFn: async (product: ProductInsert) => {
      try {
        const data = await apiClient.post<{ data: Product }>(
          API_ENDPOINTS.PRODUCTS.CREATE,
          product
        );
        return data.data;
      } catch (error) {
        console.error("Error creating product:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create product: ${(error as Error).message}`);
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: ProductUpdate & { id: string }) => {
      try {
        const data = await apiClient.put<{ data: Product }>(
          API_ENDPOINTS.PRODUCTS.UPDATE(id),
          updates
        );
        return data.data;
      } catch (error) {
        console.error("Error updating product:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update product: ${(error as Error).message}`);
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      try {
        await apiClient.delete(API_ENDPOINTS.PRODUCTS.DELETE(id));
      } catch (error) {
        console.error("Error deleting product:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete product: ${(error as Error).message}`);
    },
  });

  // Stock statistics
  const lowStockProducts = productsQuery.data?.filter(
    (p) => (p.current_stock ?? 0) <= (p.minimum_stock ?? 5)
  ) || [];

  const expiringProducts = productsQuery.data?.filter((p) => {
    if (!p.expiry_date) return false;
    const expiryDate = new Date(p.expiry_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow;
  }) || [];

  return {
    products: productsQuery.data || [],
    isLoading: productsQuery.isLoading,
    error: productsQuery.error,
    createProduct,
    updateProduct,
    deleteProduct,
    lowStockProducts,
    expiringProducts,
    totalProducts: productsQuery.data?.length || 0,
  };
}
