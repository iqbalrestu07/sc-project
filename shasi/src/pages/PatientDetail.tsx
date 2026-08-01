import { useParams, useNavigate } from "react-router-dom";
import { format, differenceInYears } from "date-fns";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  Pencil, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  AlertTriangle,
  FileText,
  User
} from "lucide-react";
import { usePatient, usePatientVisits, usePatientTransactions } from "@/hooks/usePatients";
import { usePatientVisitNotes, useVisitNotes } from "@/hooks/useVisitNotes";
import { PatientFormDialog } from "@/components/patients";
import { TransactionDetailDialog } from "@/components/transactions/TransactionDetailDialog";
import { VisitNoteFormDialog } from "@/components/visit_notes/VisitNoteFormDialog";
import { useState } from "react";

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: patient, isLoading } = usePatient(id);
  const { data: visits = [] } = usePatientVisits(id);
  const { data: patientTransactions = [] } = usePatientTransactions(id);
  const { data: visitNotes = [] } = usePatientVisitNotes(id);
  const { deleteMutation } = useVisitNotes();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isVisitNoteFormOpen, setIsVisitNoteFormOpen] = useState(false);
  const [editingVisitNote, setEditingVisitNote] = useState<any>(null);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const calculateAge = (dob: string | null) => {
    if (!dob) return null;
    return differenceInYears(new Date(), new Date(dob));
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
        <div className="text-center py-16">
          <h2 className="text-xl font-semibold mb-2">Patient not found</h2>
          <p className="text-muted-foreground mb-4">
            The patient you're looking for doesn't exist or has been deleted.
          </p>
          <Button onClick={() => navigate("/patients")}>Back to Patients</Button>
        </div>
      </div>
    );
  }

  const age = calculateAge(patient.date_of_birth);

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
      <PageHeader
        title={
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/patients")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span>{patient.full_name}</span>
          </div>
        }
        description={
          <Badge variant="outline" className="font-mono">
            {patient.patient_code}
          </Badge>
        }
        action={
          <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit Patient
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="shadow-clinic">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-24 w-24 mb-4">
                <AvatarImage src={patient.photo_url || undefined} />
                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                  {getInitials(patient.full_name)}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-semibold">{patient.full_name}</h3>
              <div className="text-muted-foreground mt-1">
                {age !== null && <span>{age} years old</span>}
                {patient.gender && (
                  <span className="capitalize"> · {patient.gender}</span>
                )}
              </div>
              {patient.skin_type && (
                <Badge className="mt-3 capitalize">{patient.skin_type} skin</Badge>
              )}
            </div>

            <div className="mt-6 space-y-4">
              {patient.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{patient.phone}</span>
                </div>
              )}
              {patient.whatsapp && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>{patient.whatsapp} (WhatsApp)</span>
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{patient.email}</span>
                </div>
              )}
              {patient.address && (
                <div className="flex items-start gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span>{patient.address}</span>
                </div>
              )}
              {patient.date_of_birth && (
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{format(new Date(patient.date_of_birth), "MMMM d, yyyy")}</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t text-xs text-muted-foreground">
              <p>Registered: {format(new Date(patient.created_at.replace(/Z$/, "")), "MMM d, yyyy")}</p>
              <p>Last updated: {format(new Date(patient.updated_at.replace(/Z$/, "")), "MMM d, yyyy")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Details Section */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="medical" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="medical">Medical Info</TabsTrigger>
              <TabsTrigger value="records">Medical Records</TabsTrigger>
              <TabsTrigger value="history">Visit History</TabsTrigger>
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
            </TabsList>

            <TabsContent value="medical" className="mt-4 space-y-4">
              {/* Allergies */}
              <Card className="shadow-clinic">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    Allergy History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {patient.allergy_history || "No known allergies recorded."}
                  </p>
                </CardContent>
              </Card>

              {/* Notes */}
              {patient.notes && (
                <Card className="shadow-clinic">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4 text-primary" />
                      Notes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {patient.notes}
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Medical Records (Visit Notes) */}
            <TabsContent value="records" className="mt-4 space-y-4">
              <div className="flex justify-end">
                <Button
                  className="gap-2"
                  onClick={() => {
                    setEditingVisitNote(null);
                    setIsVisitNoteFormOpen(true);
                  }}
                >
                  <FileText className="h-4 w-4" />
                  Tambah Rekam Medis
                </Button>
              </div>
              {visitNotes.length === 0 ? (
                <Card className="shadow-clinic">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Belum ada rekam medis.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {visitNotes.map((note: any) => (
                    <Card key={note.id} className="shadow-clinic">
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="space-y-1">
                            <p className="font-medium text-sm">
                              {format(new Date(note.visit_date), "dd MMM yyyy, HH:mm")}
                            </p>
                            {note.doctor_name && (
                              <p className="text-xs text-muted-foreground">
                                Dokter: {note.doctor_name}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingVisitNote(note);
                                setIsVisitNoteFormOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => {
                                if (confirm("Hapus rekam medis ini?")) {
                                  deleteMutation.mutate(note.id);
                                }
                              }}
                            >
                              Hapus
                            </Button>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          {note.diagnosis && (
                            <div>
                              <span className="font-medium text-muted-foreground">Diagnosa: </span>
                              <span>{note.diagnosis}</span>
                            </div>
                          )}
                          {note.patient_condition_before && (
                            <div>
                              <span className="font-medium text-muted-foreground">Kondisi Sebelum: </span>
                              <span>{note.patient_condition_before}</span>
                            </div>
                          )}
                          {note.treatment_performed && (
                            <div>
                              <span className="font-medium text-muted-foreground">Tindakan: </span>
                              <span>{note.treatment_performed}</span>
                            </div>
                          )}
                          {note.treatment_outcome && (
                            <div>
                              <span className="font-medium text-muted-foreground">Hasil: </span>
                              <span>{note.treatment_outcome}</span>
                            </div>
                          )}
                          {note.follow_up_notes && (
                            <div>
                              <span className="font-medium text-muted-foreground">Follow-up: </span>
                              <span>{note.follow_up_notes}</span>
                            </div>
                          )}
                          {note.next_visit_recommended && (
                            <div className="pt-2 border-t">
                              <span className="font-medium text-primary">Rekomendasi kunjungan berikutnya: </span>
                              <span>{format(new Date(note.next_visit_recommended), "dd MMM yyyy")}</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {visits.length === 0 && visitNotes.length === 0 ? (
                <Card className="shadow-clinic">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No visit history found.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {/* Merge appointments + visit notes into a single timeline */}
                  {(() => {
                    type TimelineItem = {
                      id: string;
                      date: string;
                      type: "appointment" | "visit_note";
                      title: string;
                      subtitle?: string;
                      notes?: string;
                      status?: string;
                      hasMedicalRecord?: boolean;
                    };

                    const timeline: TimelineItem[] = [
                      ...visits.map((v: any) => ({
                        id: v.id,
                        date: v.scheduled_at,
                        type: "appointment" as const,
                        title: (v.all_services?.length ? v.all_services.join(", ") : v.service_name) || "—",
                        subtitle: [v.doctor_name ? `Dr. ${v.doctor_name}` : null, v.therapist_name ? `Therapist: ${v.therapist_name}` : null].filter(Boolean).join(" · ") || undefined,
                        notes: v.notes,
                        status: v.status,
                        hasMedicalRecord: visitNotes.some((vn: any) => vn.appointment_id === v.id),
                      })),
                      ...visitNotes
                        .filter((vn: any) => !vn.appointment_id || !visits.some((v: any) => v.id === vn.appointment_id))
                        .map((vn: any) => ({
                          id: vn.id,
                          date: vn.visit_date,
                          type: "visit_note" as const,
                          title: vn.treatment_performed || vn.diagnosis || "Kunjungan (walk-in)",
                          subtitle: vn.doctor_name ? `Dokter: ${vn.doctor_name}` : undefined,
                          notes: vn.diagnosis || vn.follow_up_notes,
                          status: "completed",
                          hasMedicalRecord: true,
                        })),
                    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                    return timeline.map((item) => (
                      <Card key={`${item.type}-${item.id}`} className="shadow-clinic">
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{item.title}</p>
                                {item.hasMedicalRecord && (
                                  <FileText className="h-3.5 w-3.5 text-primary" />
                                )}
                              </div>
                              {item.subtitle && (
                                <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                              )}
                              {item.notes && (
                                <p className="text-xs text-muted-foreground italic">{item.notes}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              {item.status && (
                                <Badge variant={item.status === "completed" ? "default" : "secondary"} className="capitalize text-xs mb-1">
                                  {item.status}
                                </Badge>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {item.date ? format(new Date(item.date), "dd MMM yyyy, HH:mm") : "—"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ));
                  })()}
                </div>
              )}
            </TabsContent>

            <TabsContent value="transactions" className="mt-4">
              {patientTransactions.length === 0 ? (
                <Card className="shadow-clinic">
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">No transactions found.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {patientTransactions.map((txn) => {
                    const staff = [txn.doctor_name, txn.therapist_name].filter(Boolean).join(" · ");
                    return (
                      <Card
                        key={txn.id}
                        className="shadow-clinic cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedTransactionId(txn.id)}
                      >
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <p className="font-medium text-sm font-mono">{txn.transaction_code}</p>
                              {txn.payment_method && (
                                <p className="text-xs text-muted-foreground capitalize">{txn.payment_method}</p>
                              )}
                              {staff && (
                                <p className="text-xs text-muted-foreground">Handled by: {staff}</p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <Badge variant={txn.payment_status === "paid" ? "default" : "secondary"} className="capitalize text-xs mb-1">
                                {txn.payment_status}
                              </Badge>
                              <p className="text-sm font-semibold">
                                Rp {Number(txn.total_amount).toLocaleString("id-ID")}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {txn.paid_at
                                  ? format(new Date(txn.paid_at), "dd MMM yyyy")
                                  : format(new Date(txn.created_at), "dd MMM yyyy")}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <TransactionDetailDialog
        transactionId={selectedTransactionId}
        open={!!selectedTransactionId}
        onOpenChange={(open) => {
          if (!open) setSelectedTransactionId(null);
        }}
      />

      <PatientFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        patient={patient}
      />

      <VisitNoteFormDialog
        open={isVisitNoteFormOpen}
        onOpenChange={setIsVisitNoteFormOpen}
        patientId={id!}
        visitNote={editingVisitNote}
      />
    </div>
  );
}