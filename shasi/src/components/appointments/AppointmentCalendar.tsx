import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  MoreHorizontal,
  Clock,
  User,
  Stethoscope
} from "lucide-react";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { useAppointments } from "@/hooks/useAppointments";
import { APPOINTMENT_STATUSES, type AppointmentWithRelations, type AppointmentStatus } from "@/types/appointment";
import { cn } from "@/lib/utils";

interface AppointmentCalendarProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onNewAppointment: (date?: Date) => void;
  onEditAppointment: (appointment: AppointmentWithRelations) => void;
}

export function AppointmentCalendar({
  selectedDate,
  onDateChange,
  onNewAppointment,
  onEditAppointment,
}: AppointmentCalendarProps) {
  const [view, setView] = useState<"day" | "week">("week");
  const { appointments, updateStatus, isLoading } = useAppointments({ date: selectedDate, view });

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const timeSlots = Array.from({ length: 12 }, (_, i) => i + 8); // 8 AM to 7 PM

  const getStatusBadge = (status: string) => {
    const statusConfig = APPOINTMENT_STATUSES.find((s) => s.value === status);
    return statusConfig || { label: status, color: "bg-muted" };
  };

  const getAppointmentsForSlot = (date: Date, hour: number) => {
    return appointments.filter((apt) => {
      const aptDate = new Date(apt.scheduled_at);
      // Use UTC hours to match the stored UTC time
      return isSameDay(aptDate, date) && aptDate.getUTCHours() === hour;
    });
  };

  const handleStatusChange = async (id: string, status: AppointmentStatus) => {
    await updateStatus.mutateAsync({ id, status });
  };

  const navigateWeek = (direction: number) => {
    onDateChange(addDays(selectedDate, direction * 7));
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card className="shadow-clinic">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateWeek(-1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigateWeek(1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <h2 className="text-lg font-semibold">
                {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDateChange(new Date())}
              >
                Today
              </Button>
              <Button onClick={() => onNewAppointment(selectedDate)} className="gap-2">
                <Plus className="h-4 w-4" />
                New Appointment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar Grid */}
      <Card className="shadow-clinic overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading appointments...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {/* Day Headers */}
                <div className="grid grid-cols-8 border-b">
                  <div className="p-3 text-sm font-medium text-muted-foreground border-r">
                    Time
                  </div>
                  {weekDays.map((day) => (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "p-3 text-center border-r last:border-r-0",
                        isSameDay(day, new Date()) && "bg-primary/5"
                      )}
                    >
                      <div className="text-xs text-muted-foreground">
                        {format(day, "EEE")}
                      </div>
                      <div
                        className={cn(
                          "text-lg font-semibold",
                          isSameDay(day, new Date()) && "text-primary"
                        )}
                      >
                        {format(day, "d")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time Slots */}
                {timeSlots.map((hour) => (
                  <div key={hour} className="grid grid-cols-8 border-b last:border-b-0">
                    <div className="p-2 text-sm text-muted-foreground border-r flex items-start justify-end pr-3">
                      {format(new Date().setHours(hour, 0), "h a")}
                    </div>
                    {weekDays.map((day) => {
                      const slotAppointments = getAppointmentsForSlot(day, hour);
                      return (
                        <div
                          key={`${day.toISOString()}-${hour}`}
                          className={cn(
                            "p-1 border-r last:border-r-0 min-h-[60px]",
                            isSameDay(day, new Date()) && "bg-primary/5"
                          )}
                        >
                          {slotAppointments.map((apt) => {
                            const status = getStatusBadge(apt.status);
                            return (
                              <div
                                key={apt.id}
                                className={cn(
                                  "p-2 rounded-md text-xs mb-1 cursor-pointer hover:opacity-80 transition-opacity",
                                  status.color
                                )}
                                onClick={() => onEditAppointment(apt)}
                              >
                                <div className="font-medium truncate">
                                  {apt.patient?.full_name}
                                </div>
                                <div className="text-xs opacity-80 truncate">
                                  {apt.service?.name}
                                </div>
                                <div className="flex items-center gap-1 mt-1 opacity-70">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(apt.scheduled_at), "h:mm a")}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
