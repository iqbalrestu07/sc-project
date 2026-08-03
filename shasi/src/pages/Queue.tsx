import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTodayQueue, useUpdateAppointmentStatus } from "@/hooks/useVisitNotes";
import { useAppointments } from "@/hooks/useAppointments";
import { apiClient } from "@/integrations/api/client";
import { format } from "date-fns";
import { Users, Clock, CheckCircle2, Play, ArrowRight, CheckCircle, XCircle } from "lucide-react";

export default function QueuePage() {
  const navigate = useNavigate();
  const { data: queue, isLoading } = useTodayQueue();
  const updateStatus = useUpdateAppointmentStatus();
  const { cancelAppointment } = useAppointments();
  const [loadingTxFor, setLoadingTxFor] = useState<string | null>(null);
  // Map of appointment_id → transaction payment status
  const [paidAppointments, setPaidAppointments] = useState<Set<string>>(new Set());
  const [txByAppointment, setTxByAppointment] = useState<Record<string, string>>({});
  const [cancelTarget, setCancelTarget] = useState<{ id: string; name: string } | null>(null);

  const waiting = queue?.waiting ?? [];
  const inProgress = queue?.in_progress ?? [];
  const completed = queue?.completed ?? [];

  // Fetch payment status for completed appointments (lightweight endpoint)
  useEffect(() => {
    if (completed.length === 0) {
      setPaidAppointments(new Set());
      return;
    }
    const ids = completed.map((a: any) => a.id).join(",");
    (async () => {
      try {
        const data = await apiClient.get<{ data: Record<string, { id: string; payment_status: string }> }>(
          `/transactions/by-appointment?ids=${ids}`
        );
        const paid = new Set<string>();
        const txMap: Record<string, string> = {};
        for (const [apptId, info] of Object.entries(data.data || {})) {
          if (info.payment_status === "paid") {
            paid.add(apptId);
          }
          txMap[apptId] = info.id;
        }
        setPaidAppointments(paid);
        setTxByAppointment(txMap);
      } catch (e) {
        console.error("Failed to fetch transaction status:", e);
      }
    })();
  }, [completed.length]);

  const handleStatusChange = (id: string, status: string) => {
    updateStatus.mutate({ id, status });
  };

  const handleCancel = (id: string, name: string) => {
    setCancelTarget({ id, name });
  };

  const confirmCancel = () => {
    if (!cancelTarget) return;
    cancelAppointment.mutate(cancelTarget.id);
    setCancelTarget(null);
  };

  // Find pending transaction for an appointment and navigate to POS with it
  const handleCheckout = (appointmentId: string, patientId: string) => {
    setLoadingTxFor(appointmentId);
    const txId = txByAppointment[appointmentId];
    if (txId) {
      navigate("/pos", { state: { transactionId: txId, patientId } });
    } else {
      navigate("/pos", { state: { patientId } });
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
                  {
                    label: "Batalkan",
                    icon: XCircle,
                    onClick: () => handleCancel(apt.id, apt.patient?.full_name || "Unknown"),
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
                  {
                    label: "Batalkan",
                    icon: XCircle,
                    onClick: () => handleCancel(apt.id, apt.patient?.full_name || "Unknown"),
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
            completed.map((apt: any) => {
              const isPaid = paidAppointments.has(apt.id);
              return (
                <QueueCard
                  key={apt.id}
                  appointment={apt}
                  onStatusChange={handleStatusChange}
                  actions={[
                    {
                      label: isPaid
                        ? "Transaksi Selesai"
                        : loadingTxFor === apt.id
                          ? "Loading..."
                          : "Buat Transaksi",
                      icon: isPaid ? CheckCircle : ArrowRight,
                      onClick: isPaid ? undefined : () => handleCheckout(apt.id, apt.patient_id),
                      variant: isPaid ? "outline" : "default",
                      disabled: isPaid,
                      tooltip: isPaid ? "Transaksi telah selesai dilakukan" : undefined,
                    },
                    {
                      label: "Lihat Detail",
                      icon: ArrowRight,
                      onClick: () => navigate(`/patients/${apt.patient_id}`),
                      variant: "outline",
                    },
                    ...(!isPaid
                      ? [{
                          label: "Batalkan",
                          icon: XCircle,
                          onClick: () => handleCancel(apt.id, apt.patient?.full_name || "Unknown"),
                          variant: "outline" as const,
                        }]
                      : []),
                  ]}
                />
              );
            })
          )}
        </div>
      </div>

      <AlertDialog open={!!cancelTarget} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Antrian?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin membatalkan antrian untuk{" "}
              <strong>{cancelTarget?.name}</strong>? Transaksi draft yang
              terkait juga akan dibatalkan. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tidak</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ya, Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
    disabled?: boolean;
    tooltip?: string;
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

          {/* Show all services from linked transaction, or fall back to appointment service */}
          {(appointment.all_services?.length > 0
            ? appointment.all_services
            : appointment.service?.name
              ? [appointment.service.name]
              : []
          ).map((svcName: string, idx: number) => (
            <div key={idx} className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-primary">{svcName}</span>
            </div>
          ))}

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
            {actions.map((action, i) => {
              const btn = (
                <Button
                  key={i}
                  size="sm"
                  variant={action.variant}
                  className="w-full gap-1.5 h-9 text-xs"
                  disabled={action.disabled}
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
              );
              return action.tooltip ? (
                <TooltipProvider key={i}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-full">{btn}</div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{action.tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                btn
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
