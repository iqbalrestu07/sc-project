import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Sparkles } from "lucide-react";
import { useServices } from "@/hooks/useServices";
import { ServiceFormDialog, ServiceList } from "@/components/services";
import { Service } from "@/types/service";
import { useDebounce } from "@/hooks/useDebounce";

export default function Services() {
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20; // 20 per page
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { data, isLoading } = useServices(debouncedSearch, page, limit);
  const services = data?.data || [];
  const hasNext = data?.has_next || false;

  const handleEdit = (service: Service) => {
    setEditingService(service);
    setIsFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingService(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
      <PageHeader 
        title="Services & Treatments" 
        description="Manage your clinic services with commission rules"
        action={
          <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Service
          </Button>
        }
      />

      {/* Search & Filters */}
      <Card className="mb-6 shadow-clinic">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search services..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Button variant="outline">Filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* Service List or Empty State */}
      {services.length > 0 ? (
        <div className="space-y-4">
          <ServiceList services={services} onEdit={handleEdit} isLoading={isLoading} />
          <div className="flex items-center justify-between">
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
        </div>
      ) : (
        <Card className="shadow-clinic">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? "No services found" : "No services yet"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {searchQuery 
                  ? "Try adjusting your search terms."
                  : "Get started by adding your first service with commission rules."
                }
              </p>
              {!searchQuery && (
                <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Add Your First Service
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service Form Dialog */}
      <ServiceFormDialog 
        open={isFormOpen} 
        onOpenChange={handleCloseForm}
        service={editingService}
      />
    </div>
  );
}
