import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Send, Rocket } from "lucide-react";
import { useWhatsAppTemplates, useSendWhatsAppBlast, useWhatsAppDevices } from "@/hooks/useWhatsApp";
import { usePatients } from "@/hooks/usePatients";
import { apiClient, API_ENDPOINTS } from "@/integrations/api";
import type { ApiListResponse } from "@/integrations/api/types";
import { toast } from "sonner";
import type { Patient } from "@/types/patient";
import type { Recipient } from "@/types/whatsapp";

async function loadExistingRecipients(): Promise<Recipient[]> {
  const recipients: Recipient[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const response = await apiClient.get<ApiListResponse<Patient>>(
      API_ENDPOINTS.PATIENTS.LIST,
      { page, limit: 100, has_whatsapp: "true" }
    );
    recipients.push(
      ...(response.data ?? []).flatMap((patient) =>
        patient.whatsapp?.trim()
          ? [{ to: patient.whatsapp, patient_name: patient.full_name }]
          : []
      )
    );
    hasNext = response.has_next ?? false;
    page += 1;
  }

  return recipients;
}

export function BlastTab() {
  const { data: templates = [], isLoading: templatesLoading } = useWhatsAppTemplates();
  const { data: devices = [], isLoading: devicesLoading } = useWhatsAppDevices();
  const patientsQuery = usePatients(undefined, 1, 50, true);
  const recipientTotal = patientsQuery.data?.total ?? 0;
  const blastMutation = useSendWhatsAppBlast();

  const connectedDevices = devices.filter(d => d.status === "connected");

  const [templateId, setTemplateId] = useState<string>("");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [regionCode, setRegionCode] = useState<string>("+628");
  const [maxBlast, setMaxBlast] = useState<string>("100");
  const [includeExisting, setIncludeExisting] = useState<boolean>(true);

  const [result, setResult] = useState<{attempted: number; success: number} | null>(null);

  const handleBlast = async () => {
    if (!templateId) {
      toast.error("Please select a template first.");
      return;
    }

    if (selectedDevices.length === 0) {
      toast.error("Please select at least one sender device.");
      return;
    }

    const max = parseInt(maxBlast, 10);
    if (isNaN(max) || max < 0) {
      toast.error("Invalid Max Blast limit");
      return;
    }

    let recipients: Recipient[] = [];
    try {
      if (includeExisting) {
        recipients = await loadExistingRecipients();
      }
    } catch (error) {
      toast.error(`Failed to load recipients: ${(error as Error).message}`);
      return;
    }

    setResult(null);

    blastMutation.mutate(
      {
        template_id: templateId,
        device_ids: selectedDevices,
        region_code: regionCode,
        max_blast: max,
        recipients
      },
      {
        onSuccess: (data) => {
          toast.success("Blast completed!");
          if (data) {
            setResult({
              attempted: data.total_attempted,
              success: data.success
            });
          }
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to start blast");
        }
      }
    );
  };

  return (
    <Card className="shadow-clinic max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          Broadcast Messages
        </CardTitle>
        <CardDescription>
          Send a blast message to your existing patients and automatically generate numbers based on region code. The system will only send to valid WhatsApp numbers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {result && (
          <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center space-y-1">
            <h4 className="font-semibold text-success text-lg">Blast Results</h4>
            <p className="text-sm text-success-foreground">
              Total Attempted: <b>{result.attempted}</b>
            </p>
            <p className="text-sm text-success-foreground">
              Successfully Sent: <b>{result.success}</b>
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template">Select Template</Label>
              <Select value={templateId} onValueChange={setTemplateId} disabled={templatesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="-- Choose a template --" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3">
              <Label>Sender Devices (Select Multiple)</Label>
              <div className="border rounded-md p-3 space-y-2 max-h-[120px] overflow-y-auto">
                {devicesLoading ? (
                  <p className="text-sm text-muted-foreground">Loading devices...</p>
                ) : connectedDevices.length === 0 ? (
                  <p className="text-sm text-destructive">No connected devices found</p>
                ) : (
                  connectedDevices.map(d => (
                    <div key={d.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`device-${d.id}`}
                        checked={selectedDevices.includes(d.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedDevices(prev => [...prev, d.id]);
                          } else {
                            setSelectedDevices(prev => prev.filter(id => id !== d.id));
                          }
                        }}
                      />
                      <Label htmlFor={`device-${d.id}`} className="font-normal cursor-pointer">
                        {d.name} <span className="text-muted-foreground text-xs">({d.jid.split('@')[0]})</span>
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="regionCode">Region / Prefix Code</Label>
              <Input 
                id="regionCode" 
                value={regionCode} 
                onChange={e => setRegionCode(e.target.value)}
                placeholder="+628"
              />
              <p className="text-xs text-muted-foreground">e.g. +628 for Indonesia</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maxBlast">Max Successful Messages</Label>
              <Input 
                id="maxBlast" 
                type="number"
                min="0"
                value={maxBlast} 
                onChange={e => setMaxBlast(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Stop after reaching this many success</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="includeExisting" 
              checked={includeExisting} 
              onCheckedChange={(c) => setIncludeExisting(!!c)} 
            />
            <Label htmlFor="includeExisting" className="font-normal cursor-pointer">
              Include existing patients with WhatsApp numbers 
              <span className="text-muted-foreground ml-1">
                ({recipientTotal} found)
              </span>
            </Label>
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/30 pt-6">
        <Button 
          className="w-full gap-2" 
          size="lg"
          onClick={handleBlast}
          disabled={blastMutation.isPending || templates.length === 0}
        >
          {blastMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          {blastMutation.isPending ? "Sending Blast (This may take a while)..." : "Start Broadcasting"}
        </Button>
      </CardFooter>
    </Card>
  );
}
