import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, Stethoscope, Clock, Banknote, Percent } from "lucide-react";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import type { Service } from "@/types/service";

interface ServiceDetailDialogProps {
  /** Pass serviceId to fetch from API, OR pass service object directly (no fetch) */
  serviceId?: string | null;
  service?: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ServiceDetailDialog({ serviceId, service: serviceProp, open, onOpenChange }: ServiceDetailDialogProps) {
  const [fetched, setFetched] = useState<Service | null>(null);
  const [loading, setLoading] = useState(false);

  // If a full service object is passed directly, use it — otherwise fetch by ID
  const service = serviceProp ?? fetched;

  useEffect(() => {
    // No need to fetch if a full object was already provided
    if (!open || serviceProp) {
      setFetched(null);
      return;
    }
    if (!serviceId) {
      setFetched(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiClient
      .get<{ data: Service }>(API_ENDPOINTS.SERVICES.DETAIL(serviceId))
      .then((res) => { if (!cancelled) setFetched(res.data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, serviceId, serviceProp]);

  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

  const commissionLabel = (type: string, value: number) =>
    type === "percentage" ? `${value}%` : fmt(value);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-primary" />
            Detail Layanan
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !service ? (
          <div className="py-12 text-center text-muted-foreground">Layanan tidak ditemukan.</div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold leading-tight">{service.name}</h3>
                {service.category && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {typeof service.category === "object" ? service.category.name : service.category}
                  </p>
                )}
              </div>
              <Badge variant={service.is_active ? "default" : "secondary"}>
                {service.is_active ? "Aktif" : "Nonaktif"}
              </Badge>
            </div>

            {/* Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40">
                <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Harga Dasar</p>
                  <p className="font-semibold">{fmt(service.base_price)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40">
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-muted-foreground text-xs">Durasi</p>
                  <p className="font-semibold">{service.duration_minutes} menit</p>
                </div>
              </div>
            </div>

            {service.description && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Deskripsi</p>
                <p className="text-sm">{service.description}</p>
              </div>
            )}

            <Separator />

            {/* Commission Rates */}
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-muted-foreground" />
                Komisi
              </p>

              {/* Doctor */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dokter</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Handling</p>
                    <p className="font-medium">
                      {commissionLabel(service.doctor_commission_type, service.doctor_commission_value)}
                    </p>
                  </div>
                  {(service.doctor_offering_commission_value ?? 0) > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Offering</p>
                      <p className="font-medium">
                        {commissionLabel(
                          service.doctor_offering_commission_type ?? "percentage",
                          service.doctor_offering_commission_value ?? 0
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Therapist */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Terapis</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Handling</p>
                    <p className="font-medium">
                      {commissionLabel(service.therapist_commission_type, service.therapist_commission_value)}
                    </p>
                  </div>
                  {(service.therapist_offering_commission_value ?? 0) > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">Offering</p>
                      <p className="font-medium">
                        {commissionLabel(
                          service.therapist_offering_commission_type ?? "percentage",
                          service.therapist_offering_commission_value ?? 0
                        )}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {service.requires_doctor && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/5 rounded-lg p-3">
                <Stethoscope className="h-4 w-4 shrink-0" />
                Layanan ini memerlukan dokter
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
