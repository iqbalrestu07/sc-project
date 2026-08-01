import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTodayQueue, useUpdateAppointmentStatus } from "@/hooks/useVisitNotes";
import { apiClient } from "@/integrations/api/client";
import { format } from "date-fns";
import { Users, Clock, CheckCircle2, Play, ArrowRight } from "lucide-react";

export default function QueuePage() {
  const navigate = useNavigate();
  const { data: queue, isLoading } = useTodayQueue();
  const updateStatus = useUpdateAppointmentStatus();
  const [loadingTxFor, setLoadingTxFor] = useState<string | null>(null);

  const waiting = queue?.waiting ?? [];
  const inProgress = queue?.in_progress ?? [];
  const completed = queue?.completed ?? [];

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
  };

  // Find pending transaction for an appointment and navigate to POS with it
  const handleCheckout = async (appointmentId: string, patientId: string) => {
    setLoadingTxFor(appointmentId);
    try {
      // Fetch all today's transactions and find by appointment_id
      const data = await apiClient.get<{ data: any[] }>(`/transactions?limit=100`);
      const tx = data.data?.find((t: any) => t.appointment_id === appointmentId);
      if (tx) {
        navigate("/pos", { state: { transactionId: tx.id, patientId } });
      } else {
        // No draft transaction, go to POS with just patientId
        navigate("/pos", { state: { patientId } });
      }
    } catch (e) {
      console.error("Failed to find transaction:", e);
      navigate("/pos", { state: { patientId } });
    } finally {
      setLoadingTxFor(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
      <PageHeader
        title="Antrian Hari Ini"
        description={format(new Date(), "EEEE, dd MMMM yyyy")}
      />

      <div className="grid gap-6 md:grid-cols-3">
        {/* Waiting / Antrian */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">Dalam Antrian</h3>
            <Badge variant="secondary">{waiting.length}</Badge>
          </div>
          {waiting.length === 0 ? (
            <Card className="shadow-clinic">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada antrian
              </CardContent>
            </Card>
          ) : (
            waiting.map((apt: any) => (
              <QueueCard
                key={apt.id}
                appointment={apt}
                onStatusChange={handleStatusChange}
                actions={[
                  {
                    label: "Mulai Layani",
                    icon: Play,
                    status: "in_progress",
                    variant: "default",
                  },
                  {
                    label: "Lihat Detail",
                    icon: ArrowRight,
                    onClick: () => navigate(`/patients/${apt.patient_id}`),
                    variant: "outline",
                  },
                ]}
              />
            ))
          )}
        </div>

        {/* In Progress / Sedang Dilayani */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-5 w-5 text-yellow-500" />
            <h3 className="font-semibold">Sedang Dilayani</h3>
            <Badge variant="secondary">{inProgress.length}</Badge>
          </div>
          {inProgress.length === 0 ? (
            <Card className="shadow-clinic">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Tidak ada yang sedang dilayani
              </CardContent>
            </Card>
          ) : (
            inProgress.map((apt: any) => (
              <QueueCard
                key={apt.id}
                appointment={apt}
                onStatusChange={handleStatusChange}
                actions={[
                  {
                    label: "Selesai",
                    icon: CheckCircle2,
                    status: "completed",
                    variant: "default",
                  },
                  {
                    label: "Lihat Detail",
                    icon: ArrowRight,
                    onClick: () => navigate(`/patients/${apt.patient_id}`),
                    variant: "outline",
                  },
                ]}
              />
            ))
          )}
        </div>

        {/* Completed / Selesai */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold">Selesai — Siap Bayar</h3>
            <Badge variant="secondary">{completed.length}</Badge>
          </div>
          {completed.length === 0 ? (
            <Card className="shadow-clinic">
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                Belum ada yang selesai
              </CardContent>
            </Card>
          ) : (
            completed.map((apt: any) => (
              <QueueCard
                key={apt.id}
                appointment={apt}
                onStatusChange={handleStatusChange}
                actions={[
                  {
                    label: loadingTxFor === apt.id ? "Loading..." : "Buat Transaksi",
                    icon: ArrowRight,
                    onClick: () => handleCheckout(apt.id, apt.patient_id),
                    variant: "default",
                  },
                  {
                    label: "Lihat Detail",
                    icon: ArrowRight,
                    onClick: () => navigate(`/patients/${apt.patient_id}`),
                    variant: "outline",
                  },
                ]}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface QueueCardProps {
  appointment: any;
  onStatusChange: (id: string, status: string) => void;
  actions: Array<{
    label: string;
    icon: any;
    status?: string;
    onClick?: () => void;
    variant: "default" | "outline";
  }>;
}

function QueueCard({ appointment, onStatusChange, actions }: QueueCardProps) {
  return (
    <Card className="shadow-clinic">
      <CardContent className="py-4">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-medium text-sm">
                {appointment.patient?.full_name || "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground">
                {appointment.patient?.patient_code}
              </p>
            </div>
            <Badge variant="outline" className="text-xs capitalize">
              {appointment.status}
            </Badge>
          </div>

          <p className="text-sm font-medium text-primary">
            {appointment.service?.name || "—"}
          </p>

          {appointment.doctor && (
            <p className="text-xs text-muted-foreground">
              Dokter: {appointment.doctor.full_name}
            </p>
          )}
          {appointment.therapist && (
            <p className="text-xs text-muted-foreground">
              Terapis: {appointment.therapist.full_name}
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            {format(new Date(appointment.scheduled_at), "HH:mm")} WIB
          </p>

          <div className="flex flex-col gap-2 pt-2 border-t">
            {actions.map((action, i) => (
              <Button
                key={i}
                size="sm"
                variant={action.variant}
                className="w-full gap-1.5 h-9 text-xs"
                onClick={() => {
                  if (action.status) {
                    onStatusChange(appointment.id, action.status);
                  } else if (action.onClick) {
                    action.onClick();
                  }
                }}
              >
                <action.icon className="h-3.5 w-3.5" />
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
