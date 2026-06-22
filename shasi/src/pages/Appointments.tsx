import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { AppointmentCalendar, AppointmentFormDialog } from "@/components/appointments";
import type { AppointmentWithRelations } from "@/types/appointment";

export default function Appointments() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<AppointmentWithRelations | null>(null);
  const [defaultDate, setDefaultDate] = useState<Date | undefined>();

  const handleNewAppointment = (date?: Date) => {
    setEditingAppointment(null);
    setDefaultDate(date);
    setDialogOpen(true);
  };

  const handleEditAppointment = (appointment: AppointmentWithRelations) => {
    setEditingAppointment(appointment);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingAppointment(null);
      setDefaultDate(undefined);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
      <PageHeader 
        title="Appointments" 
        description="Schedule and manage patient appointments"
      />

      <AppointmentCalendar
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        onNewAppointment={handleNewAppointment}
        onEditAppointment={handleEditAppointment}
      />

      <AppointmentFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        appointment={editingAppointment}
        defaultDate={defaultDate}
      />
    </div>
  );
}
