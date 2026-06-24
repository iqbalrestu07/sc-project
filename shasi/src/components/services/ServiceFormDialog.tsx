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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Service, ServiceFormData } from "@/types/service";
import { useCreateService, useUpdateService, useServiceCategories } from "@/hooks/useServices";
import { useEffect } from "react";

const serviceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  category_id: z.string().optional(),
  description: z.string().max(500, "Description is too long").optional(),
  duration_minutes: z.coerce.number().min(5, "Duration must be at least 5 minutes").max(480, "Duration must be at most 480 minutes"),
  base_price: z.coerce.number().min(0.01, "Base price is required and must be greater than 0"),
  doctor_commission_type: z.enum(["fixed", "percentage"], {
    required_error: "Doctor commission type is required",
    invalid_type_error: "Doctor commission type is required",
  }),
  doctor_commission_value: z.coerce.number().min(0, "Commission value cannot be negative"),
  therapist_commission_type: z.enum(["fixed", "percentage"], {
    required_error: "Therapist commission type is required",
    invalid_type_error: "Therapist commission type is required",
  }),
  therapist_commission_value: z.coerce.number().min(0, "Commission value cannot be negative"),
  requires_doctor: z.boolean().optional(),
});

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: Service | null;
}

export function ServiceFormDialog({ open, onOpenChange, service }: ServiceFormDialogProps) {
  const createService = useCreateService();
  const updateService = useUpdateService();
  const { data: categories = [] } = useServiceCategories();
  const isEditing = !!service;

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      category_id: "",
      description: "",
      duration_minutes: 30,
      base_price: 0,
      doctor_commission_type: "percentage",
      doctor_commission_value: 0,
      therapist_commission_type: "percentage",
      therapist_commission_value: 0,
      requires_doctor: false,
    },
  });

  useEffect(() => {
    if (service) {
      form.reset({
        name: service.name,
        category_id: service.category_id || "",
        description: service.description || "",
        duration_minutes: service.duration_minutes,
        base_price: service.base_price,
        doctor_commission_type: service.doctor_commission_type,
        doctor_commission_value: service.doctor_commission_value,
        therapist_commission_type: service.therapist_commission_type,
        therapist_commission_value: service.therapist_commission_value,
        requires_doctor: service.requires_doctor,
      });
    } else {
      form.reset({
        name: "",
        category_id: "",
        description: "",
        duration_minutes: 30,
        base_price: 0,
        doctor_commission_type: "percentage",
        doctor_commission_value: 0,
        therapist_commission_type: "percentage",
        therapist_commission_value: 0,
        requires_doctor: false,
      });
    }
  }, [service, form]);

  const onSubmit = async (data: ServiceFormData) => {
    try {
      if (isEditing && service) {
        await updateService.mutateAsync({ id: service.id, data });
      } else {
        await createService.mutateAsync(data);
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled in mutation
    }
  };

  const isPending = createService.isPending || updateService.isPending;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const doctorCommissionType = form.watch("doctor_commission_type");
  const therapistCommissionType = form.watch("therapist_commission_type");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Service" : "Add New Service"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Service Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Facial Hydrating Treatment" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
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
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input type="number" min={5} max={480} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="base_price"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Base Price (IDR) *</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe this service..." rows={2} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Doctor Commission */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground">Doctor Commission</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="doctor_commission_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount (IDR)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="doctor_commission_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Commission Value {doctorCommissionType === "percentage" ? "(%)" : "(IDR)"}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Therapist Commission */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-sm font-medium text-muted-foreground">Therapist Commission</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="therapist_commission_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Commission Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="percentage">Percentage (%)</SelectItem>
                          <SelectItem value="fixed">Fixed Amount (IDR)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="therapist_commission_value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Commission Value {therapistCommissionType === "percentage" ? "(%)" : "(IDR)"}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min={0} placeholder="0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Settings */}
            <div className="border-t pt-4">
              <FormField
                control={form.control}
                name="requires_doctor"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Requires Doctor</FormLabel>
                      <FormDescription>
                        Enable if this service must be performed by a doctor
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
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
                {isPending ? "Saving..." : isEditing ? "Update Service" : "Add Service"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
