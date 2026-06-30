import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Send, Users } from "lucide-react";
import { useSendWhatsAppBulk } from "@/hooks/useWhatsApp";
import { usePatients } from "@/hooks/usePatients";
import { toast } from "sonner";
import type { Recipient } from "@/types/whatsapp";

export function DirectMessageTab() {
  const { data: patients = [], isLoading: patientsLoading } = usePatients();
  const bulkMutation = useSendWhatsAppBulk();

  const [message, setMessage] = useState("");
  const [selectedPatients, setSelectedPatients] = useState<string[]>([]);
  const [result, setResult] = useState<{ attempted: number; success: number } | null>(null);

  // Filter only patients with valid whatsapp numbers
  const validPatients = patients.filter(p => p.whatsapp && p.whatsapp.trim() !== "");

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
    <Card className="shadow-clinic max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Direct Messages
        </CardTitle>
        <CardDescription>
          Select specific patients and send them a custom message. Only patients with registered WhatsApp numbers are shown.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {result && (
          <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center space-y-1">
            <h4 className="font-semibold text-success text-lg">Send Results</h4>
            <p className="text-sm text-success-foreground">
              Total Attempted: <b>{result.attempted}</b>
            </p>
            <p className="text-sm text-success-foreground">
              Successfully Sent: <b>{result.success}</b>
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Select Contacts ({selectedPatients.length} selected)</Label>
              <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-8 text-xs">
                {selectedPatients.length === validPatients.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            
            <div className="border rounded-md overflow-hidden h-64 flex flex-col">
              {patientsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : validPatients.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                  <Users className="h-8 w-8 mb-2 opacity-20" />
                  <p>No contacts with valid WhatsApp numbers found.</p>
                </div>
              ) : (
                <div className="overflow-y-auto flex-1 p-2 space-y-1">
                  {validPatients.map(patient => (
                    <div 
                      key={patient.id}
                      className="flex items-center space-x-3 p-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer"
                      onClick={() => handleTogglePatient(patient.id)}
                    >
                      <Checkbox 
                        id={`patient-${patient.id}`} 
                        checked={selectedPatients.includes(patient.id)}
                        onCheckedChange={() => handleTogglePatient(patient.id)}
                      />
                      <div className="flex-1 cursor-pointer">
                        <Label htmlFor={`patient-${patient.id}`} className="cursor-pointer font-medium">
                          {patient.full_name}
                        </Label>
                        <p className="text-xs text-muted-foreground">{patient.whatsapp}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Custom Message</Label>
            <Textarea
              id="message"
              placeholder="Type your message here... Use {{name}} to insert the patient's name."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Tip: You can use <code className="bg-muted px-1 rounded text-[10px]">{"{{name}}"}</code> as a placeholder.
            </p>
          </div>

          <Button 
            className="w-full gap-2 mt-4" 
            size="lg"
            onClick={handleSend}
            disabled={bulkMutation.isPending || selectedPatients.length === 0 || !message.trim()}
          >
            {bulkMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {bulkMutation.isPending ? "Sending..." : "Send Message"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
