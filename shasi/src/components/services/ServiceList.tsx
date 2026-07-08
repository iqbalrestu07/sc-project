import { useState } from "react";
import { Service } from "@/types/service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import { MoreHorizontal, Pencil, Trash2, Clock, Stethoscope, Eye } from "lucide-react";
import { useDeleteService } from "@/hooks/useServices";
import { ServiceDetailDialog } from "@/components/services/ServiceDetailDialog";

interface ServiceListProps {
  services: Service[];
  onEdit: (service: Service) => void;
  isLoading?: boolean;
}

export function ServiceList({ services, onEdit, isLoading }: ServiceListProps) {
  const deleteService = useDeleteService();
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [viewService, setViewService] = useState<Service | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatCommission = (type: string, value: number) => {
    if (value === 0) return "-";
    return type === "percentage" ? `${value}%` : formatCurrency(value);
  };

  const handleDelete = async () => {
    if (serviceToDelete) {
      await deleteService.mutateAsync(serviceToDelete.id);
      setServiceToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (services.length === 0) {
    return null;
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="hidden sm:table-cell">Duration</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="hidden lg:table-cell">Doctor Comm.</TableHead>
              <TableHead className="hidden lg:table-cell">Therapist Comm.</TableHead>
              <TableHead className="w-[80px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow key={service.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        <button
                          className="text-left hover:underline underline-offset-4 transition-colors hover:text-primary"
                          onClick={() => setViewService(service)}
                        >
                          {service.name}
                        </button>
                        {service.requires_doctor && (
                          <Stethoscope className="h-3.5 w-3.5 text-primary" />
                        )}
                      </div>
                      {service.description && (
                        <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                          {service.description}
                        </div>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {service.category ? (
                    <Badge variant="secondary">{service.category.name}</Badge>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <div className="flex items-center gap-1 text-sm">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {service.duration_minutes} min
                  </div>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(service.base_price)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  {formatCommission(service.doctor_commission_type, service.doctor_commission_value)}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm">
                  {formatCommission(service.therapist_commission_type, service.therapist_commission_value)}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setViewService(service)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Lihat Detail
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(service)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setServiceToDelete(service)}
                        className="text-destructive focus:text-destructive"
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

      <AlertDialog open={!!serviceToDelete} onOpenChange={() => setServiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{serviceToDelete?.name}"? This action cannot be undone.
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

      <ServiceDetailDialog
        service={viewService}
        open={!!viewService}
        onOpenChange={(open) => { if (!open) setViewService(null); }}
      />
    </>
  );
}
