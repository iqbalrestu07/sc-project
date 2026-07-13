import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Send, Users, Smartphone } from "lucide-react";
import { useSendWhatsAppBulk, useWhatsAppDevices } from "@/hooks/useWhatsApp";
import { usePatients } from "@/hooks/usePatients";
import { toast } from "sonner";
import type { Recipient } from "@/types/whatsapp";

export function DirectMessageTab() {
  const patientsQuery = usePatients();
  const patients = patientsQuery.data?.data ?? [];
  const patientsLoading = patientsQuery.isLoading;
  const { data: devices = [], isLoading: devicesLoading } = useWhatsAppDevices();
  const bulkMutation = useSendWhatsAppBulk();

  const [message, setMessage] = useState("");
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>("");
  const [result, setResult] = useState<{ attempted: number; success: number } | null>(null);

  // Filter only patients with valid whatsapp numbers
  const validPatients = patients.filter(p => p.whatsapp && p.whatsapp.trim() !== "");
  const connectedDevices = devices.filter(d => d.status === "connected");

  const handleTogglePatient = (patientId: string) => {
    setSelectedPatients(prev => 
      prev.includes(patientId) 
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    );
  };

  const handleSelectAll = () => {
    if (selectedPatients.length === validPatients.length) {
      setSelectedPatients([]);
    } else {
      setSelectedPatients(validPatients.map(p => p.id));
    }
  };

  const handleSend = () => {
    if (!selectedDevice) {
      toast.error("Please select a sender device.");
      return;
    }

    if (selectedPatients.length === 0) {
      toast.error("Please select at least one contact.");
      return;
    }

    if (!message.trim()) {
      toast.error("Please enter a message to send.");
      return;
    }

    const recipients: Recipient[] = selectedPatients.map(id => {
      const patient = validPatients.find(p => p.id === id)!;
      return {
        to: patient.whatsapp!,
        patient_name: patient.full_name
      };
    });

    setResult(null);

    bulkMutation.mutate(
      {
        device_id: selectedDevice,
        message: message.trim(),
        recipients
      },
      {
        onSuccess: (data) => {
          toast.success("Messages sent successfully!");
          if (data) {
            setResult({
              attempted: data.total_attempted,
              success: data.success
            });
            setMessage("");
            setSelectedPatients([]);
          }
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to send messages");
        }
      }
    );
  };

  return (
    <Card className="shadow-clinic max-w-2xl mx-auto border border-border/50">
      <CardHeader className="bg-muted/10 border-b pb-6">
        <CardTitle className="text-xl flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Direct Messages
        </CardTitle>
        <CardDescription>
          Select specific patients and send them a custom message. Only patients with registered WhatsApp numbers are shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {result && (
          <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center space-y-1">
            <h4 className="font-semibold text-success text-lg">Send Results</h4>
            <p className="text-sm text-success-foreground">
              Successfully sent {result.success} out of {result.attempted} messages.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-base">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            Sender Device
          </Label>
          <Select 
            value={selectedDevice} 
            onValueChange={setSelectedDevice}
            disabled={devicesLoading || connectedDevices.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                devicesLoading ? "Loading devices..." : 
                connectedDevices.length === 0 ? "No connected devices found" : 
                "Select a device to send from"
              } />
            </SelectTrigger>
            <SelectContent>
              {connectedDevices.map(device => (
                <SelectItem key={device.id} value={device.id}>
                  {device.name} ({device.jid.split('@')[0]})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {connectedDevices.length === 0 && !devicesLoading && (
            <p className="text-xs text-destructive">
              You need to connect a WhatsApp device in the Device Status tab first.
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end">
            <Label className="text-base">Select Recipients</Label>
            <div className="flex items-center gap-2">
              <Checkbox 
                id="select-all" 
                checked={validPatients.length > 0 && selectedPatients.length === validPatients.length}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="cursor-pointer text-sm font-normal">
                Select All ({validPatients.length})
              </Label>
            </div>
          </div>
          
          <div className="border rounded-md divide-y max-h-60 overflow-y-auto bg-muted/5">
            {patientsLoading ? (
              <div className="p-4 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : validPatients.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No patients with valid WhatsApp numbers found.
              </div>
            ) : (
              validPatients.map(patient => (
                <div key={patient.id} className="flex items-center gap-3 p-3 hover:bg-muted/10 transition-colors">
                  <Checkbox 
                    id={`contact-${patient.id}`}
                    checked={selectedPatients.includes(patient.id)}
                    onCheckedChange={() => handleTogglePatient(patient.id)}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <Label htmlFor={`contact-${patient.id}`} className="font-medium cursor-pointer">
                      {patient.full_name}
                    </Label>
                    <span className="text-xs text-muted-foreground">{patient.whatsapp}</span>
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {selectedPatients.length} selected
          </p>
        </div>

        <div className="space-y-3">
          <Label htmlFor="message" className="text-base">Message Content</Label>
          <Textarea 
            id="message" 
            placeholder="Type your message here... Use {{name}} to insert the patient's name."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-[120px] resize-y"
          />
          <p className="text-xs text-muted-foreground">
            Variables available: <code className="bg-muted px-1 py-0.5 rounded">{"{{name}}"}</code>
          </p>
        </div>

        <Button 
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={handleSend}
          disabled={bulkMutation.isPending || connectedDevices.length === 0}
        >
          {bulkMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Send to {selectedPatients.length} Contacts
        </Button>
      </CardContent>
    </Card>
  );
}
