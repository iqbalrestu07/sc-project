import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Megaphone, Smartphone } from "lucide-react";
import { useWhatsAppTemplates, useSendWhatsAppBlast, useWhatsAppDevices } from "@/hooks/useWhatsApp";
import { toast } from "sonner";
import type { BlastRequest } from "@/types/whatsapp";

export function BlastMessageTab() {
  const { data: templates = [], isLoading: templatesLoading } = useWhatsAppTemplates();
  const { data: devices = [], isLoading: devicesLoading } = useWhatsAppDevices();
  const blastMutation = useSendWhatsAppBlast();

  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [audience, setAudience] = useState("all");
  const [result, setResult] = useState<{ attempted: number; success: number } | null>(null);

  const connectedDevices = devices.filter(d => d.status === "connected");

  const handleToggleDevice = (deviceId: string) => {
    setSelectedDevices(prev => 
      prev.includes(deviceId) 
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleSend = () => {
    if (selectedDevices.length === 0) {
      toast.error("Please select at least one sender device.");
      return;
    }
    
    if (!selectedTemplate) {
      toast.error("Please select a template.");
      return;
    }

    setResult(null);

    const payload: BlastRequest = {
      template_id: selectedTemplate,
      device_ids: selectedDevices,
      audience: audience,
      region_code: "+628",
    };

    blastMutation.mutate(payload, {
      onSuccess: (data) => {
        toast.success("Blast completed!");
        if (data) {
          setResult({
            attempted: data.total_attempted,
            success: data.success,
          });
        }
      },
      onError: (err: any) => {
        toast.error(err.message || "Failed to send blast messages");
      },
    });
  };

  const selectedTemplateContent = templates.find((t) => t.id === selectedTemplate)?.content;

  return (
    <Card className="shadow-clinic max-w-2xl mx-auto border border-border/50">
      <CardHeader className="bg-muted/10 border-b pb-6">
        <CardTitle className="text-xl flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          Blast Messages
        </CardTitle>
        <CardDescription>
          Send a template message to multiple patients at once. If you select multiple devices, the messages will be distributed evenly among them to avoid spam limits.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {result && (
          <div className="bg-success/10 border border-success/30 rounded-lg p-4 text-center space-y-1">
            <h4 className="font-semibold text-success text-lg">Blast Results</h4>
            <p className="text-sm text-success-foreground">
              Successfully sent {result.success} out of {result.attempted} messages.
            </p>
          </div>
        )}

        <div className="space-y-3">
          <Label className="flex items-center gap-2 text-base">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
            Sender Devices
          </Label>
          <div className="border rounded-md divide-y max-h-40 overflow-y-auto bg-muted/5">
            {devicesLoading ? (
              <div className="p-4 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : connectedDevices.length === 0 ? (
              <div className="p-4 text-center text-sm text-destructive">
                No connected WhatsApp devices found. Please connect one first.
              </div>
            ) : (
              connectedDevices.map(device => (
                <div key={device.id} className="flex items-center gap-3 p-3 hover:bg-muted/10 transition-colors">
                  <Checkbox 
                    id={`device-${device.id}`}
                    checked={selectedDevices.includes(device.id)}
                    onCheckedChange={() => handleToggleDevice(device.id)}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <Label htmlFor={`device-${device.id}`} className="font-medium cursor-pointer">
                      {device.name}
                    </Label>
                    <span className="text-xs text-muted-foreground">{device.jid.split('@')[0]}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base">Target Audience</Label>
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger>
              <SelectValue placeholder="Select target audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Patients with WhatsApp</SelectItem>
              <SelectItem value="active">Active Patients</SelectItem>
              <SelectItem value="inactive">Inactive Patients</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-base">Message Template</Label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate} disabled={templatesLoading}>
            <SelectTrigger>
              <SelectValue placeholder={templatesLoading ? "Loading templates..." : "Select a template"} />
            </SelectTrigger>
            <SelectContent>
              {templates.length === 0 && !templatesLoading && (
                <SelectItem value="none" disabled>
                  No templates available
                </SelectItem>
              )}
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedTemplateContent && (
            <div className="mt-2 p-3 bg-muted/30 border rounded-md text-sm whitespace-pre-wrap">
              <span className="font-medium text-xs text-muted-foreground block mb-1">Preview:</span>
              {selectedTemplateContent}
            </div>
          )}
        </div>

        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={handleSend}
          disabled={blastMutation.isPending || connectedDevices.length === 0 || selectedDevices.length === 0}
        >
          {blastMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Megaphone className="mr-2 h-4 w-4" />}
          Start Blast
        </Button>
      </CardContent>
    </Card>
  );
}
