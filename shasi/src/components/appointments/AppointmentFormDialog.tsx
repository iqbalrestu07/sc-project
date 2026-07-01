import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppointments } from "@/hooks/useAppointments";
import { usePatients } from "@/hooks/usePatients";
import { useServices } from "@/hooks/useServices";
import { useStaff } from "@/hooks/useStaff";
import type { AppointmentWithRelations } from "@/types/appointment";
import { format } from "date-fns";

const formSchema = z.object({
  patient_id: z.string().min(1, "Patient is required"),
  service_id: z.string().min(1, "Service is required"),
  doctor_id: z.string().optional(),
  therapist_id: z.string().optional(),
  scheduled_date: z.string().min(1, "Date is required"),
  scheduled_time: z.string().min(1, "Time is required"),
  duration_minutes: z.coerce.number().min(5, "Duration must be at least 5 minutes"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface AppointmentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment?: AppointmentWithRelations | null;
  defaultDate?: Date;
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  appointment,
  defaultDate,
}: AppointmentFormDialogProps) {
  const { createAppointment, updateAppointment } = useAppointments();
  const patientsQuery = usePatients();
  const servicesQuery = useServices();
  const { doctors, therapists } = useStaff();
  const isEditing = !!appointment;

  const patients = patientsQuery.data || [];
  const services = servicesQuery.data || [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      patient_id: "",
      service_id: "",
      doctor_id: "",
      therapist_id: "",
      scheduled_date: defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      scheduled_time: "09:00",
      duration_minutes: 30,
      notes: "",
    },
  });

  // Watch service to update duration
  const selectedServiceId = form.watch("service_id");
  useEffect(() => {
    const service = services.find((s) => s.id === selectedServiceId);
    if (service?.duration_minutes) {
      form.setValue("duration_minutes", service.duration_minutes);
    }
  }, [selectedServiceId, services, form]);

  useEffect(() => {
    if (appointment) {
      const scheduledAt = new Date(appointment.scheduled_at);
      form.reset({
        patient_id: appointment.patient_id,
        service_id: appointment.service_id,
        doctor_id: appointment.doctor_id || "",
        therapist_id: appointment.therapist_id || "",
        scheduled_date: format(scheduledAt, "yyyy-MM-dd"),
        scheduled_time: format(scheduledAt, "HH:mm"),
        duration_minutes: appointment.duration_minutes || 30,
        notes: appointment.notes || "",
      });
    } else {
      form.reset({
        patient_id: "",
        service_id: "",
        doctor_id: "",
        therapist_id: "",
        scheduled_date: defaultDate ? format(defaultDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        scheduled_time: "09:00",
        duration_minutes: 30,
        notes: "",
      });
    }
  }, [appointment, defaultDate, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      // Treat the date/time selected by the user as Asia/Jakarta (WIB) so the
      // backend stores and returns the appointment in the clinic's local time.
      const scheduled_at = `${values.scheduled_date}T${values.scheduled_time}:00+07:00`;

      const payload = {
        patient_id: values.patient_id,
        service_id: values.service_id,
        doctor_id: values.doctor_id || null,
        therapist_id: values.therapist_id || null,
        scheduled_at,
        duration_minutes: values.duration_minutes || 30,
        notes: values.notes || null,
      };

      if (isEditing && appointment) {
        await updateAppointment.mutateAsync({ id: appointment.id, ...payload });
      } else {
        await createAppointment.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const isPending = createAppointment.isPending || updateAppointment.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Appointment" : "New Appointment"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="patient_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.full_name} ({patient.patient_code})
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
              name="service_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Service *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select service" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="scheduled_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scheduled_time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Time *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="doctor_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doctor</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select doctor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {doctors.map((doctor) => (
                          <SelectItem key={doctor.id} value={doctor.id}>
                            {doctor.full_name}
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
                    <FormLabel>Therapist</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "none" ? "" : value)} 
                      value={field.value || "none"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select therapist" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {therapists.map((therapist) => (
                          <SelectItem key={therapist.id} value={therapist.id}>
                            {therapist.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input type="number" min={5} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Additional notes..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? "Saving..."
                  : isEditing
                  ? "Update Appointment"
                  : "Create Appointment"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
