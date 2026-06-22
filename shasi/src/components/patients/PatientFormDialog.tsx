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
import { Patient, PatientFormData } from "@/types/patient";
import { useCreatePatient, useUpdatePatient } from "@/hooks/usePatients";
import { useEffect } from "react";

const patientSchema = z.object({
  full_name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  date_of_birth: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  phone: z.string().max(20, "Phone number is too long").optional(),
  whatsapp: z.string().max(20, "WhatsApp number is too long").optional(),
  email: z.string().email("Invalid email").max(255).optional().or(z.literal("")),
  address: z.string().max(500, "Address is too long").optional(),
  allergy_history: z.string().max(1000, "Too long").optional(),
  medical_conditions: z.string().max(1000, "Too long").optional(),
  skin_type: z.enum(["normal", "dry", "oily", "combination", "sensitive"]).optional(),
  notes: z.string().max(2000, "Notes are too long").optional(),
});

interface PatientFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
}

export function PatientFormDialog({ open, onOpenChange, patient }: PatientFormDialogProps) {
  const createPatient = useCreatePatient();
  const updatePatient = useUpdatePatient();
  const isEditing = !!patient;

  const form = useForm<PatientFormData>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      full_name: "",
      date_of_birth: "",
      gender: undefined,
      phone: "",
      whatsapp: "",
      email: "",
      address: "",
      allergy_history: "",
      medical_conditions: "",
      skin_type: undefined,
      notes: "",
    },
  });

  useEffect(() => {
    if (patient) {
      form.reset({
        full_name: patient.full_name,
        date_of_birth: patient.date_of_birth || "",
        gender: patient.gender || undefined,
        phone: patient.phone || "",
        whatsapp: patient.whatsapp || "",
        email: patient.email || "",
        address: patient.address || "",
        allergy_history: patient.allergy_history || "",
        medical_conditions: patient.medical_conditions || "",
        skin_type: patient.skin_type || undefined,
        notes: patient.notes || "",
      });
    } else {
      form.reset({
        full_name: "",
        date_of_birth: "",
        gender: undefined,
        phone: "",
        whatsapp: "",
        email: "",
        address: "",
        allergy_history: "",
        medical_conditions: "",
        skin_type: undefined,
        notes: "",
      });
    }
  }, [patient, form]);

  const onSubmit = async (data: PatientFormData) => {
    try {
      if (isEditing && patient) {
        await updatePatient.mutateAsync({ id: patient.id, data });
      } else {
        await createPatient.mutateAsync(data);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled in mutation
    }
  };

  const isPending = createPatient.isPending || updatePatient.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Patient" : "Add New Patient"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Full Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter patient's full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Contact Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="whatsapp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WhatsApp</FormLabel>
                      <FormControl>
                        <Input placeholder="WhatsApp number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Full address" rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Medical Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Medical Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="skin_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Skin Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select skin type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="dry">Dry</SelectItem>
                          <SelectItem value="oily">Oily</SelectItem>
                          <SelectItem value="combination">Combination</SelectItem>
                          <SelectItem value="sensitive">Sensitive</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="allergy_history"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allergy History</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Known allergies (medications, ingredients, etc.)"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="medical_conditions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical Conditions</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Existing medical conditions"
                        rows={2}
                        {...field}
                      />
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
                      <Textarea
                        placeholder="Additional notes about this patient"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : isEditing ? "Update Patient" : "Add Patient"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
