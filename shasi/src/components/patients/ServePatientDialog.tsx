import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { useServices } from "@/hooks/useServices";
import { useStaff } from "@/hooks/useStaff";
import { useTransactions } from "@/hooks/useTransactions";
import { useAppointments } from "@/hooks/useAppointments";
import type { Patient } from "@/types/patient";
import { Stethoscope, ShoppingBag, ArrowRight, Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ServePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
}

interface SelectedService {
  service_id: string;
  name: string;
  price: number;
  doctor_id?: string;
  therapist_id?: string;
}

export function ServePatientDialog({
  open,
  onOpenChange,
  patient,
}: ServePatientDialogProps) {
  const navigate = useNavigate();
  const servicesQuery = useServices();
  const { doctors, therapists } = useStaff();
  const { createTransaction } = useTransactions();
  const { createAppointment } = useAppointments();
  const [mode, setMode] = useState<"choose" | "tindakan">("choose");
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>([]);
  const [newServiceId, setNewServiceId] = useState("");

  const services = servicesQuery.data?.data ?? [];

  const handleClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setMode("choose");
      setSelectedServices([]);
      setNewServiceId("");
    }
  };

  const addService = () => {
    if (!newServiceId) return;
    const svc = services.find((s) => s.id === newServiceId);
    if (!svc) return;
    // Prevent duplicates
    if (selectedServices.some((s) => s.service_id === newServiceId)) {
      toast.error("Layanan sudah ditambahkan");
      return;
    }
    setSelectedServices((prev) => [
      ...prev,
      {
        service_id: svc.id,
        name: svc.name,
        price: Number(svc.base_price) || 0,
      },
    ]);
    setNewServiceId("");
  };

  const removeService = (id: string) => {
    setSelectedServices((prev) => prev.filter((s) => s.service_id !== id));
  };

  const updateServiceStaff = (
    id: string,
    field: "doctor_id" | "therapist_id",
    value: string
  ) => {
    setSelectedServices((prev) =>
      prev.map((s) =>
        s.service_id === id ? { ...s, [field]: value || undefined } : s
      )
    );
  };

  const onSubmit = async () => {
    if (!patient) return;
    if (selectedServices.length === 0) {
      toast.error("Pilih minimal 1 layanan");
      return;
    }

    try {
      // 1. Create appointment first (for queue tracking)
      const now = new Date();
      const jakartaOffset = 7 * 60;
      const local = new Date(now.getTime() + jakartaOffset * 60000);
      const scheduled_at = local.toISOString().replace("Z", "+07:00");

      const appointment = await createAppointment.mutateAsync({
        patient_id: patient.id,
        service_id: selectedServices[0].service_id,
        doctor_id: selectedServices[0].doctor_id || null,
        therapist_id: selectedServices[0].therapist_id || null,
        scheduled_at,
        duration_minutes: 30,
        notes: `Walk-in — ${selectedServices.length} layanan`,
      });

      // 2. Create transaction draft (pending) linked to appointment
      const subtotal = selectedServices.reduce((sum, s) => sum + s.price, 0);
      const transaction = await createTransaction.mutateAsync({
        transaction: {
          patient_id: patient.id,
          appointment_id: appointment.id,
          subtotal,
          discount_amount: null,
          discount_type: null,
          total_amount: subtotal,
          tax_amount: 0,
          payment_method: null,
          payment_status: "pending",
          notes: "Walk-in draft",
          created_by: null,
        },
        items: selectedServices.map((s) => ({
          item_type: "service",
          service_id: s.service_id,
          product_id: null,
          doctor_id: s.doctor_id || null,
          therapist_id: s.therapist_id || null,
          quantity: 1,
          unit_price: s.price,
          discount_amount: null,
          discount_type: null,
          total_price: s.price,
          commission_eligible: true,
          commission_notes: null,
          selected_consumable_product_id: null,
        })),
      });

      toast.success(`${selectedServices.length} layanan ditambahkan ke antrian`);
      handleClose(false);
      navigate("/queue");
    } catch (error) {
      // Error handled in mutation
    }
  };

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Layani Pasien</DialogTitle>
          <DialogDescription>
            {patient.full_name} ({patient.patient_code})
          </DialogDescription>
        </DialogHeader>

        {mode === "choose" && (
          <div className="space-y-3 py-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={() => setMode("tindakan")}
            >
              <Stethoscope className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium">Tindakan / Layanan</div>
                <div className="text-xs text-muted-foreground">
                  Pilih multiple tindakan, pasien masuk antrian
                </div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={() => {
                handleClose(false);
                navigate("/pos", { state: { patientId: patient.id } });
              }}
            >
              <ShoppingBag className="h-5 w-5 text-primary" />
              <div className="text-left">
                <div className="font-medium">Beli Produk</div>
                <div className="text-xs text-muted-foreground">
                  Langsung ke kasir untuk pembelian produk
                </div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </Button>
          </div>
        )}

        {mode === "tindakan" && (
          <div className="space-y-4 py-2">
            {/* Add service selector */}
            <div className="flex gap-2">
              <Select value={newServiceId} onValueChange={setNewServiceId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pilih layanan..." />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem
                      key={service.id}
                      value={service.id}
                      disabled={selectedServices.some(
                        (s) => s.service_id === service.id
                      )}
                    >
                      {service.name} — Rp{" "}
                      {Number(service.base_price).toLocaleString("id-ID")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={addService} disabled={!newServiceId}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Selected services list */}
            {selectedServices.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Belum ada layanan dipilih
              </p>
            ) : (
              <div className="space-y-3">
                {selectedServices.map((svc) => (
                  <div
                    key={svc.service_id}
                    className="rounded-lg border p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{svc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Rp {svc.price.toLocaleString("id-ID")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive"
                        onClick={() => removeService(svc.service_id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={svc.doctor_id || ""}
                        onValueChange={(v) =>
                          updateServiceStaff(svc.service_id, "doctor_id", v)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Dokter" />
                        </SelectTrigger>
                        <SelectContent>
                          {doctors.map((doc: any) => (
                            <SelectItem key={doc.id} value={doc.id}>
                              {doc.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={svc.therapist_id || ""}
                        onValueChange={(v) =>
                          updateServiceStaff(svc.service_id, "therapist_id", v)
                        }
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Terapis" />
                        </SelectTrigger>
                        <SelectContent>
                          {therapists.map((th: any) => (
                            <SelectItem key={th.id} value={th.id}>
                              {th.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Total</span>
                  <span className="font-semibold">
                    Rp{" "}
                    {selectedServices
                      .reduce((sum, s) => sum + s.price, 0)
                      .toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setMode("choose")}
              >
                Kembali
              </Button>
              <Button
                type="button"
                onClick={onSubmit}
                disabled={
                  selectedServices.length === 0 ||
                  createTransaction.isPending ||
                  createAppointment.isPending
                }
              >
                {createTransaction.isPending || createAppointment.isPending
                  ? "Memproses..."
                  : `Masukkan ke Antrian (${selectedServices.length})`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
