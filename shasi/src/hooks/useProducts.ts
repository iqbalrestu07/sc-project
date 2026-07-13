import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import { ApiListResponse } from "@/integrations/api/types";
import type { Product, ProductCategory, ProductInsert, ProductUpdate, ProductFormData } from "@/types/product";
import { toast } from "sonner";

export function useProducts(enabled = true, searchQuery?: string, page: number = 1, limit: number = 50) {
  const queryClient = useQueryClient();

  const productsQuery = useQuery({
    queryKey: ["products", searchQuery, page, limit],
    queryFn: async () => {
      try {
        const params: Record<string, any> = { page, limit };
        if (searchQuery) params.search = searchQuery;

        const data = await apiClient.get<ApiListResponse<Product>>(
          API_ENDPOINTS.PRODUCTS.LIST,
          params
        );
        return {
          data: data.data || [],
          has_next: data.has_next || false,
        };
      } catch (error) {
        console.error("Error fetching products:", error);
        throw error;
      }
    },
    enabled,
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
  // Stock statistics (using the current page data, which may be incomplete for total stats,
  // but enough for current view)
  const productsList = productsQuery.data?.data || [];
  const lowStockProducts = productsList.filter(
    (p) => (p.current_stock ?? 0) <= (p.minimum_stock ?? 5)
  );

  const expiringProducts = productsList.filter((p) => {
    if (!p.expiry_date) return false;
    const expiryDate = new Date(p.expiry_date);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow;
  });

  return {
    products: productsList,
    hasNext: productsQuery.data?.has_next || false,
    isLoading: productsQuery.isLoading,
    error: productsQuery.error,
    createProduct,
    updateProduct,
    deleteProduct,
    lowStockProducts,
    expiringProducts,
    totalProducts: productsList.length,
  };
}

export function useProductCategories() {
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ["product-categories"],
    queryFn: async (): Promise<ProductCategory[]> => {
      const data = await apiClient.get<{ data: ProductCategory[] }>(
        API_ENDPOINTS.PRODUCTS.CATEGORIES
      );
      return data.data || [];
    },
  });

  const createCategory = useMutation({
    mutationFn: async (category: { name: string; description?: string }) => {
      const data = await apiClient.post<{ data: ProductCategory }>(
        API_ENDPOINTS.PRODUCTS.CATEGORY_CREATE,
        category
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Category created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create category: ${(error as Error).message}`);
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name: string; description?: string }) => {
      const data = await apiClient.put<{ data: ProductCategory }>(
        API_ENDPOINTS.PRODUCTS.CATEGORY_UPDATE(id),
        updates
      );
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Category updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update category: ${(error as Error).message}`);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(API_ENDPOINTS.PRODUCTS.CATEGORY_DELETE(id));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Category deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete category: ${(error as Error).message}`);
    },
  });

  return {
    categories: categoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
