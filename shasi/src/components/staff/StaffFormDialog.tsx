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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStaff } from "@/hooks/useStaff";
import type { Staff } from "@/types/appointment";

const formSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  role: z.enum(["doctor", "therapist"]),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  specialization: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface StaffFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff?: Staff | null;
}

export function StaffFormDialog({
  open,
  onOpenChange,
  staff,
}: StaffFormDialogProps) {
  const { createStaff, updateStaff } = useStaff();
  const isEditing = !!staff;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      role: "therapist",
      phone: "",
      email: "",
      specialization: "",
    },
  });

  useEffect(() => {
    if (staff) {
      form.reset({
        full_name: staff.full_name,
        role: staff.role as "doctor" | "therapist",
        phone: staff.phone || "",
        email: staff.email || "",
        specialization: staff.specialization || "",
      });
    } else {
      form.reset({
        full_name: "",
        role: "therapist",
        phone: "",
        email: "",
        specialization: "",
      });
    }
  }, [staff, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        full_name: values.full_name,
        role: values.role,
        phone: values.phone || null,
        email: values.email || null,
        specialization: values.specialization || null,
      };

      if (isEditing && staff) {
        await updateStaff.mutateAsync({ id: staff.id, ...payload });
      } else {
        await createStaff.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const isPending = createStaff.isPending || updateStaff.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Staff Member" : "Add Staff Member"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Dr. Sarah Johnson" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="therapist">Therapist</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="specialization"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Specialization</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Dermatology, Facial Treatments" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input placeholder="+62..." {...field} />
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
                    <Input type="email" placeholder="email@example.com" {...field} />
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
                  ? "Update Staff"
                  : "Add Staff"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
