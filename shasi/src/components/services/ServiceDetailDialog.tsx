import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Stethoscope,
  Clock,
  Banknote,
  Percent,
  Package,
  Tag,
  CalendarDays,
  Pencil,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import { useConsumableGroups } from "@/hooks/useConsumableGroups";
import type { Service } from "@/types/service";

interface ServiceDetailDialogProps {
  /** Pass serviceId to fetch from API, OR pass service object directly (no fetch) */
  serviceId?: string | null;
  service?: Service | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional: called when user clicks the Edit button */
  onEdit?: (service: Service) => void;
}

export function ServiceDetailDialog({
  serviceId,
  service: serviceProp,
  open,
  onOpenChange,
  onEdit,
}: ServiceDetailDialogProps) {
  const [fetched, setFetched] = useState<Service | null>(null);
  const [loading, setLoading] = useState(false);

  const service = serviceProp ?? fetched;
  const resolvedId = service?.id ?? serviceId ?? null;

  // Fetch full service object if only id was provided
  useEffect(() => {
    if (!open || serviceProp) { setFetched(null); return; }
    if (!serviceId) { setFetched(null); return; }
    let cancelled = false;
    setLoading(true);
    apiClient
      .get<{ data: Service }>(API_ENDPOINTS.SERVICES.DETAIL(serviceId))
      .then((res) => { if (!cancelled) setFetched(res.data); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, serviceId, serviceProp]);

  // Fetch consumable groups for this service
  const { data: consumableGroups = [] } = useConsumableGroups(open ? resolvedId : null);

  // ── Formatters ─────────────────────────────────────────────────────────────
  const fmt = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(n);

  const fmtCommission = (type: string, value: number) =>
    type === "percentage" ? `${value}%` : fmt(value);

  const fmtDate = (iso: string) =>
    format(new Date(iso), "d MMMM yyyy, HH:mm", { locale: localeId });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              Detail Layanan
            </DialogTitle>
            {service && onEdit && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 shrink-0"
                onClick={() => { onEdit(service); onOpenChange(false); }}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !service ? (
          <div className="py-12 text-center text-muted-foreground">Layanan tidak ditemukan.</div>
        ) : (
          <div className="space-y-5 pb-2">

            {/* ── Header: nama + status ──────────────────────────────────────── */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-xl font-semibold leading-tight">{service.name}</h3>
                {service.category && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Tag className="h-3.5 w-3.5" />
                    {typeof service.category === "object" ? service.category.name : service.category}
                  </div>
                )}
              </div>
              <Badge
                variant={service.is_active ? "default" : "secondary"}
                className="gap-1 shrink-0"
              >
                {service.is_active
                  ? <><CheckCircle2 className="h-3 w-3" /> Aktif</>
                  : <><XCircle className="h-3 w-3" /> Nonaktif</>}
              </Badge>
            </div>

            {/* ── Info utama: harga + durasi ─────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <Banknote className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Harga Dasar</p>
                  <p className="font-semibold text-base">{fmt(service.base_price)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <Clock className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Durasi</p>
                  <p className="font-semibold text-base">{service.duration_minutes} menit</p>
                </div>
              </div>
            </div>

            {/* ── Deskripsi ──────────────────────────────────────────────────── */}
            {service.description && (
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">Deskripsi</p>
                <p className="text-sm leading-relaxed">{service.description}</p>
              </div>
            )}

            {/* ── Requires doctor ────────────────────────────────────────────── */}
            {service.requires_doctor && (
              <div className="flex items-center gap-2 text-sm text-primary bg-primary/5 rounded-lg p-3 border border-primary/20">
                <Stethoscope className="h-4 w-4 shrink-0" />
                Layanan ini <strong>wajib</strong> dilakukan oleh dokter
              </div>
            )}

            <Separator />

            {/* ── Komisi ─────────────────────────────────────────────────────── */}
            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Percent className="h-4 w-4 text-muted-foreground" />
                Komisi
              </p>

              {/* Dokter */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Dokter</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Handling</p>
                    <p className="font-medium">
                      {fmtCommission(service.doctor_commission_type, service.doctor_commission_value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      (PIC tindakan — selalu diberikan)
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Offering</p>
                    {(service.doctor_offering_commission_value ?? 0) > 0 ? (
                      <>
                        <p className="font-medium">
                          {fmtCommission(
                            service.doctor_offering_commission_type ?? "percentage",
                            service.doctor_offering_commission_value ?? 0
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          (jika pasien setuju ditawarkan)
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Terapis */}
              <div className="rounded-lg border p-3 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Terapis</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Handling</p>
                    <p className="font-medium">
                      {fmtCommission(service.therapist_commission_type, service.therapist_commission_value)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      (PIC tindakan — selalu diberikan)
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Offering</p>
                    {(service.therapist_offering_commission_value ?? 0) > 0 ? (
                      <>
                        <p className="font-medium">
                          {fmtCommission(
                            service.therapist_offering_commission_type ?? "percentage",
                            service.therapist_offering_commission_value ?? 0
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          (jika pasien setuju ditawarkan)
                        </p>
                      </>
                    ) : (
                      <p className="text-muted-foreground">—</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── Produk habis pakai ─────────────────────────────────────────── */}
            <Separator />
            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Package className="h-4 w-4 text-muted-foreground" />
                Produk Habis Pakai
              </p>

              {consumableGroups.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  Tidak ada kebutuhan produk habis pakai untuk layanan ini.
                </p>
              ) : (
                <div className="space-y-2">
                  {consumableGroups.map((group) => {
                    const items = group.items ?? [];
                    const allOutOfStock = items.length > 0 && items.every((i) => (i.current_stock ?? 0) <= 0);
                    return (
                      <div key={group.id} className="rounded-lg border p-3 space-y-2">
                        {/* Group header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {/* group.name stores the primary product_id; resolve it from items */}
                              {items[0]?.product_name ?? group.name}
                            </span>
                            {allOutOfStock && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Stok habis
                              </Badge>
                            )}
                          </div>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {group.quantity_used} unit / sesi
                          </Badge>
                        </div>

                        {/* Alternatives */}
                        {items.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">
                            Belum ada produk alternatif ditambahkan.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {items.map((item, idx) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2 text-xs"
                              >
                                <span className="w-4 text-center text-muted-foreground shrink-0">
                                  {idx + 1}.
                                </span>
                                <span className="flex-1">{item.product_name}</span>
                                {item.product_unit && (
                                  <span className="text-muted-foreground shrink-0">
                                    {item.product_unit}
                                  </span>
                                )}
                                <Badge
                                  variant={
                                    (item.current_stock ?? 0) <= 0
                                      ? "destructive"
                                      : (item.current_stock ?? 0) <= 5
                                      ? "secondary"
                                      : "outline"
                                  }
                                  className="text-xs shrink-0"
                                >
                                  stok: {item.current_stock ?? 0}
                                </Badge>
                                {idx === 0 && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs bg-green-100 text-green-700 shrink-0"
                                  >
                                    Prioritas
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── Metadata ───────────────────────────────────────────────────── */}
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div className="flex items-start gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground/70">Dibuat</p>
                  <p>{fmtDate(service.created_at)}</p>
                </div>
              </div>
              <div className="flex items-start gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-foreground/70">Diperbarui</p>
                  <p>{fmtDate(service.updated_at)}</p>
                </div>
              </div>
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
