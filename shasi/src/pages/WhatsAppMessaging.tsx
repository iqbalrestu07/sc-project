import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  MessageSquare, 
  Send, 
  Search, 
  Phone,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Users
} from "lucide-react";
import { usePatients } from "@/hooks/usePatients";
import { useAppointments } from "@/hooks/useAppointments";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays } from "date-fns";

interface MessageLog {
  id: string;
  to: string;
  patientName: string;
  message: string;
  status: "sent" | "failed" | "pending";
  timestamp: Date;
}

export default function WhatsAppMessaging() {
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [messageLogs, setMessageLogs] = useState<MessageLog[]>([]);

  const patientsQuery = usePatients();
  const patients = patientsQuery.data || [];
  const { appointments } = useAppointments({ date: new Date(), view: "week" });

  // Filter upcoming appointments for reminders
  const upcomingAppointments = appointments.filter((apt) => {
    const aptDate = new Date(apt.scheduled_at);
    const now = new Date();
    return aptDate > now && aptDate <= addDays(now, 7);
  });

  const filteredPatients = patients.filter((p) =>
    p.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.whatsapp?.includes(searchTerm) ||
    p.phone?.includes(searchTerm)
  );

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatient(patientId);
    const patient = patients.find((p) => p.id === patientId);
    if (patient) {
      setPhoneNumber(patient.whatsapp || patient.phone || "");
    }
  };

  const sendWhatsAppMessage = async () => {
    if (!phoneNumber || !message) {
      toast.error("Please enter phone number and message");
      return;
    }

    setIsSending(true);
    const patient = patients.find((p) => p.id === selectedPatient);

    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: { to: phoneNumber, message },
      });

      if (error) throw error;

      if (data.success) {
        toast.success("Message sent successfully!");
        setMessageLogs((prev) => [
          {
            id: Date.now().toString(),
            to: phoneNumber,
            patientName: patient?.full_name || "Unknown",
            message,
            status: "sent",
            timestamp: new Date(),
          },
          ...prev,
        ]);
        setMessage("");
      } else {
        throw new Error(data.error || "Failed to send message");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(errorMessage);
      setMessageLogs((prev) => [
        {
          id: Date.now().toString(),
          to: phoneNumber,
          patientName: patient?.full_name || "Unknown",
          message,
          status: "failed",
          timestamp: new Date(),
        },
        ...prev,
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const sendBulkReminders = async () => {
    if (upcomingAppointments.length === 0) {
      toast.error("No upcoming appointments to send reminders for");
      return;
    }

    setIsSendingBulk(true);
    let successCount = 0;
    let failCount = 0;

    for (const apt of upcomingAppointments) {
      const patient = apt.patient;
      const phone = patient?.whatsapp || patient?.phone;

      if (!phone) {
        failCount++;
        continue;
      }

      const aptDate = new Date(apt.scheduled_at);
      const reminderMessage = `Halo ${patient?.full_name || "Pasien"},\n\nIni adalah pengingat untuk janji temu Anda:\n\n📅 Tanggal: ${format(aptDate, "dd MMMM yyyy")}\n⏰ Waktu: ${format(aptDate, "HH:mm")} WIB\n💆 Layanan: ${apt.service?.name || "Konsultasi"}\n\nMohon hadir 15 menit lebih awal.\n\nTerima kasih!`;

      try {
        const { data, error } = await supabase.functions.invoke("send-whatsapp", {
          body: { to: phone, message: reminderMessage },
        });

        if (error || !data.success) {
          failCount++;
        } else {
          successCount++;
        }
      } catch {
        failCount++;
      }
    }

    setIsSendingBulk(false);

    if (successCount > 0) {
      toast.success(`Sent ${successCount} reminders successfully`);
    }
    if (failCount > 0) {
      toast.error(`Failed to send ${failCount} reminders`);
    }
  };

  const getStatusIcon = (status: MessageLog["status"]) => {
    switch (status) {
      case "sent":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "pending":
        return <Clock className="h-4 w-4 text-warning" />;
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
      <PageHeader
        title="WhatsApp Messaging"
        description="Send messages and reminders to patients via WhatsApp"
      />

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList>
          <TabsTrigger value="compose">
            <MessageSquare className="h-4 w-4 mr-2" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="reminders">
            <Clock className="h-4 w-4 mr-2" />
            Send Reminders
          </TabsTrigger>
          <TabsTrigger value="history">
            <Users className="h-4 w-4 mr-2" />
            Message History
          </TabsTrigger>
        </TabsList>

        {/* Compose Message Tab */}
        <TabsContent value="compose" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Patient Selection */}
            <Card className="shadow-clinic">
              <CardHeader>
                <CardTitle className="text-lg">Select Patient</CardTitle>
                <CardDescription>Choose a patient to message</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search patients..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2">
                  {filteredPatients.slice(0, 20).map((patient) => (
                    <div
                      key={patient.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedPatient === patient.id
                          ? "bg-primary/10 border-primary border"
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                      onClick={() => handlePatientSelect(patient.id)}
                    >
                      <p className="font-medium text-sm">{patient.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {patient.whatsapp || patient.phone || "No phone"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Message Composer */}
            <Card className="lg:col-span-2 shadow-clinic">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-success" />
                  Compose Message
                </CardTitle>
                <CardDescription>Write your message to send via WhatsApp</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp Number</Label>
                  <div className="flex gap-2">
                    <Phone className="h-5 w-5 text-muted-foreground mt-2" />
                    <Input
                      id="phone"
                      placeholder="+62 812 xxxx xxxx"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Type your message here..."
                    rows={6}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {message.length} characters
                  </p>
                </div>
                <Button
                  className="gap-2"
                  onClick={sendWhatsAppMessage}
                  disabled={isSending || !phoneNumber || !message}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {isSending ? "Sending..." : "Send Message"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Bulk Reminders Tab */}
        <TabsContent value="reminders" className="space-y-6">
          <Card className="shadow-clinic">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Upcoming Appointments
              </CardTitle>
              <CardDescription>
                Send reminders to patients with appointments in the next 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {upcomingAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No upcoming appointments in the next 7 days
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Patient</TableHead>
                        <TableHead>Service</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Phone</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingAppointments.map((apt) => (
                        <TableRow key={apt.id}>
                          <TableCell className="font-medium">
                            {apt.patient?.full_name || "Unknown"}
                          </TableCell>
                          <TableCell>{apt.service?.name || "—"}</TableCell>
                          <TableCell>
                            {format(new Date(apt.scheduled_at), "dd MMM yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            {apt.patient?.whatsapp || apt.patient?.phone || (
                              <span className="text-muted-foreground">No phone</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">
                      {upcomingAppointments.length} appointments found
                    </p>
                    <Button
                      className="gap-2"
                      onClick={sendBulkReminders}
                      disabled={isSendingBulk}
                    >
                      {isSendingBulk ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      {isSendingBulk ? "Sending..." : "Send All Reminders"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Message History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="shadow-clinic">
            <CardHeader>
              <CardTitle className="text-lg">Message History</CardTitle>
              <CardDescription>Recent messages sent this session</CardDescription>
            </CardHeader>
            <CardContent>
              {messageLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No messages sent yet this session
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {messageLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{getStatusIcon(log.status)}</TableCell>
                        <TableCell className="font-medium">{log.patientName}</TableCell>
                        <TableCell>{log.to}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.message}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {format(log.timestamp, "HH:mm:ss")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
