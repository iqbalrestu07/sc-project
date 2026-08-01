import { useEffect } from "react";
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
import { useVisitNotes } from "@/hooks/useVisitNotes";
import type { VisitNoteWithDetails } from "@/types/visit_note";

const formSchema = z.object({
  diagnosis: z.string().optional(),
  patient_condition_before: z.string().optional(),
  treatment_performed: z.string().optional(),
  treatment_outcome: z.string().optional(),
  follow_up_notes: z.string().optional(),
  next_visit_recommended: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface VisitNoteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patientId: string;
  visitNote?: VisitNoteWithDetails | null;
  /** Pre-fill treatment_performed from appointment/transaction services */
  prefillTreatment?: string | null;
  /** Pre-fill appointment_id to link visit note with appointment */
  prefillAppointmentId?: string | null;
}

export function VisitNoteFormDialog({
  open,
  onOpenChange,
  patientId,
  visitNote,
  prefillTreatment,
  prefillAppointmentId,
}: VisitNoteFormDialogProps) {
  const { createMutation, updateMutation } = useVisitNotes();
  const isEditing = !!visitNote;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      diagnosis: "",
      patient_condition_before: "",
      treatment_performed: "",
      treatment_outcome: "",
      follow_up_notes: "",
      next_visit_recommended: "",
    },
  });

  useEffect(() => {
    if (visitNote) {
      form.reset({
        diagnosis: visitNote.diagnosis || "",
        patient_condition_before: visitNote.patient_condition_before || "",
        treatment_performed: visitNote.treatment_performed || "",
        treatment_outcome: visitNote.treatment_outcome || "",
        follow_up_notes: visitNote.follow_up_notes || "",
        next_visit_recommended: visitNote.next_visit_recommended
          ? visitNote.next_visit_recommended.substring(0, 10)
          : "",
      });
    } else {
      // New visit note — pre-fill treatment_performed from appointment/transaction
      form.reset({
        diagnosis: "",
        patient_condition_before: "",
        treatment_performed: prefillTreatment || "",
        treatment_outcome: "",
        follow_up_notes: "",
        next_visit_recommended: "",
      });
    }
  }, [visitNote, prefillTreatment, form]);

  const onSubmit = async (values: FormValues) => {
    const input = {
      appointment_id: prefillAppointmentId || null,
      diagnosis: values.diagnosis || null,
      patient_condition_before: values.patient_condition_before || null,
      treatment_performed: values.treatment_performed || null,
      treatment_outcome: values.treatment_outcome || null,
      follow_up_notes: values.follow_up_notes || null,
      next_visit_recommended: values.next_visit_recommended
        ? `${values.next_visit_recommended}T09:00:00+07:00`
        : null,
    };

    if (isEditing && visitNote) {
      await updateMutation.mutateAsync({ id: visitNote.id, input });
    } else {
      await createMutation.mutateAsync({ patientId, input });
    }
    onOpenChange(false);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Rekam Medis" : "Tambah Rekam Medis"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="diagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diagnosa</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Diagnosa pasien..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="patient_condition_before"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kondisi Sebelum Tindakan</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Kondisi pasien sebelum tindakan..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="treatment_performed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tindakan yang Dilakukan</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tindakan yang dilakukan..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="treatment_outcome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hasil Tindakan</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Hasil tindakan..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="follow_up_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan Follow-up</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Rekomendasi untuk kunjungan berikutnya..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="next_visit_recommended"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rekomendasi Tanggal Kunjungan Berikutnya</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : isEditing ? "Perbarui" : "Simpan"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
