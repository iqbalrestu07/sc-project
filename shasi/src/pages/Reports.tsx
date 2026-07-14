import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DateRangeFilter, type PeriodPreset } from "@/components/filters";
import { useDashboardTopServices, useDashboardTopProducts } from "@/hooks/useDashboard";
import { startOfDay, endOfDay } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function Reports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get("tab") || "services";

  const [dateFilter, setDateFilter] = useState<{ from: Date | undefined; to: Date | undefined; preset: PeriodPreset }>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
    preset: "today",
  });

  const [servicesPage, setServicesPage] = useState(1);
  const [productsPage, setProductsPage] = useState(1);
  const limit = 20;

  const backendDateRange = dateFilter.preset !== "all" && dateFilter.from && dateFilter.to
    ? { from: dateFilter.from, to: dateFilter.to }
    : undefined;

  const servicesQuery = useDashboardTopServices({ ...backendDateRange, page: servicesPage, limit });
  const productsQuery = useDashboardTopProducts({ ...backendDateRange, page: productsPage, limit });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
      <PageHeader 
        title="Laporan Penjualan" 
        description="Detail penjualan layanan dan produk"
        action={
          <DateRangeFilter
            value={dateFilter}
            onChange={(val) => {
              setDateFilter(val);
              setServicesPage(1);
              setProductsPage(1);
            }}
          />
        }
      />

      <Card className="shadow-clinic">
        <CardContent className="p-4">
          <Tabs value={currentTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="services">Layanan</TabsTrigger>
              <TabsTrigger value="products">Produk</TabsTrigger>
            </TabsList>

            <TabsContent value="services">
              {servicesQuery.isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
              ) : servicesQuery.data?.data.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Belum ada data penjualan layanan</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">No</TableHead>
                        <TableHead>Nama Layanan</TableHead>
                        <TableHead className="text-right">Kuantitas</TableHead>
                        <TableHead className="text-right">Total Pendapatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {servicesQuery.data?.data.map((service, idx) => (
                        <TableRow key={service.id}>
                          <TableCell className="font-medium">
                            {(servicesPage - 1) * limit + idx + 1}
                          </TableCell>
                          <TableCell>{service.name}</TableCell>
                          <TableCell className="text-right">{service.quantity} kali</TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {formatPrice(service.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between p-4 border-t mt-4">
                    <Button
                      variant="outline"
                      disabled={servicesPage === 1}
                      onClick={() => setServicesPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {servicesPage}</span>
                    <Button
                      variant="outline"
                      disabled={!servicesQuery.data?.has_next}
                      onClick={() => setServicesPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="products">
              {productsQuery.isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Memuat data...</div>
              ) : productsQuery.data?.data.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">Belum ada data penjualan produk</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">No</TableHead>
                        <TableHead>Nama Produk</TableHead>
                        <TableHead className="text-right">Kuantitas</TableHead>
                        <TableHead className="text-right">Total Pendapatan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {productsQuery.data?.data.map((product, idx) => (
                        <TableRow key={product.id}>
                          <TableCell className="font-medium">
                            {(productsPage - 1) * limit + idx + 1}
                          </TableCell>
                          <TableCell>{product.name}</TableCell>
                          <TableCell className="text-right">{product.quantity} pcs</TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {formatPrice(product.revenue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex items-center justify-between p-4 border-t mt-4">
                    <Button
                      variant="outline"
                      disabled={productsPage === 1}
                      onClick={() => setProductsPage(p => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {productsPage}</span>
                    <Button
                      variant="outline"
                      disabled={!productsQuery.data?.has_next}
                      onClick={() => setProductsPage(p => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
