import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppointments } from "@/hooks/useAppointments";
import { useServices } from "@/hooks/useServices";
import { useStaff } from "@/hooks/useStaff";
import type { Patient } from "@/types/patient";
import { Stethoscope, ShoppingBag, ArrowRight } from "lucide-react";

interface ServePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient: Patient | null;
}

export function ServePatientDialog({
  open,
  onOpenChange,
  patient,
}: ServePatientDialogProps) {
  const navigate = useNavigate();
  const { createAppointment } = useAppointments();
  const servicesQuery = useServices();
  const { doctors, therapists } = useStaff();
  const [mode, setMode] = useState<"choose" | "tindakan">("choose");

  const services = servicesQuery.data?.data ?? [];

  const formSchema = z.object({
    service_id: z.string().min(1, "Layanan wajib dipilih"),
    doctor_id: z.string().optional(),
    therapist_id: z.string().optional(),
  });

  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      service_id: "",
      doctor_id: "",
      therapist_id: "",
    },
  });

  const handleClose = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      setMode("choose");
      form.reset();
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!patient) return;

    // Walk-in: scheduled_at = now, masuk antrian dengan status "scheduled"
    const now = new Date();
    const jakartaOffset = 7 * 60; // WIB = UTC+7
    const local = new Date(now.getTime() + jakartaOffset * 60000);
    const scheduled_at = local.toISOString().replace("Z", "+07:00");

    await createAppointment.mutateAsync({
      patient_id: patient.id,
      service_id: values.service_id,
      doctor_id: values.doctor_id || null,
      therapist_id: values.therapist_id || null,
      scheduled_at,
      duration_minutes: 30,
      notes: "Walk-in (langsung)",
    });

    handleClose(false);
    navigate("/queue");
  };

  if (!patient) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
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
                  Pasien masuk antrian untuk tindakan
                </div>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-4"
              onClick={() => {
                handleClose(false);
                // Navigate to POS with patient pre-selected (via state)
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="service_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Layanan *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih layanan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                            {service.base_price && (
                              <span className="text-muted-foreground ml-1">
                                — Rp {Number(service.base_price).toLocaleString("id-ID")}
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="doctor_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dokter</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {doctors.map((doc: any) => (
                            <SelectItem key={doc.id} value={doc.id}>
                              {doc.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="therapist_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terapis</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {therapists.map((th: any) => (
                            <SelectItem key={th.id} value={th.id}>
                              {th.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-between gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setMode("choose")}
                >
                  Kembali
                </Button>
                <Button type="submit" disabled={createAppointment.isPending}>
                  {createAppointment.isPending
                    ? "Menambahkan..."
                    : "Masukkan ke Antrian"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
