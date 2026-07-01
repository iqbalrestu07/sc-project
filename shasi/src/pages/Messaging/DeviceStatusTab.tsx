import { useState, useEffect, useRef } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode, Smartphone, LogOut, CheckCircle2, Plus } from "lucide-react";
import { useWhatsAppDevices, useWhatsAppLogout } from "@/hooks/useWhatsApp";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function DeviceStatusTab() {
  const { data: devices, isLoading, refetch } = useWhatsAppDevices();
  const logoutMutation = useWhatsAppLogout();
  const { activeOrg } = useAuth();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const stopQRStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setQrCode(null);
  };

  const handleOpenAddModal = () => {
    setNewDeviceName("");
    setQrCode(null);
    setIsGenerating(false);
    setConnectionError(null);
    setIsAddModalOpen(true);
  };

  const generateQR = async () => {
    if (!newDeviceName.trim()) {
      toast.error("Please enter a device name.");
      return;
    }

    setConnectionError(null);
    setQrCode(null);
    setIsGenerating(true);
    
    abortControllerRef.current = new AbortController();
    const token = localStorage.getItem("access_token");

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
      const url = new URL(`${baseUrl}/whatsapp/login`);
      url.searchParams.append("name", newDeviceName);
      
      await fetchEventSource(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-Organization-ID": activeOrg?.id || "",
        },
        signal: abortControllerRef.current.signal,
        onmessage(ev) {
          if (ev.event === "qr") {
            setQrCode(ev.data);
          } else if (ev.event === "success") {
            toast.success("WhatsApp Connected Successfully!");
            stopQRStream();
            setIsAddModalOpen(false);
            refetch(); // Refresh status
          } else if (ev.event === "timeout") {
            toast.error("QR Code timeout. Please try again.");
            stopQRStream();
          }
        },
        onerror(err) {
          console.error("SSE Error:", err);
          setConnectionError("Failed to connect to WhatsApp service.");
          stopQRStream();
          throw err;
        },
        onclose() {
          stopQRStream();
        }
      });
    } catch (err) {
      // Error handled in onerror or fetch failure
      stopQRStream();
    }
  };

  const handleLogout = (deviceId: string) => {
    logoutMutation.mutate(deviceId, {
      onSuccess: () => {
        toast.success("WhatsApp disconnected successfully.");
      },
      onError: (error: any) => {
        toast.error(error.message || "Failed to disconnect.");
      }
    });
  };

  // Clean up SSE on unmount
  useEffect(() => {
    return () => {
      stopQRStream();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight">WhatsApp Devices</h2>
          <p className="text-muted-foreground">
            Manage your connected WhatsApp devices for sending messages and blasts.
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Device
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {devices && devices.length > 0 ? (
          devices.map((device) => (
            <Card key={device.id} className="relative overflow-hidden group border shadow-sm transition-all hover:shadow-md">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-full ${device.status === 'connected' ? 'bg-green-100' : 'bg-red-100'}`}>
                      <Smartphone className={`h-5 w-5 ${device.status === 'connected' ? 'text-green-600' : 'text-red-600'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{device.name}</CardTitle>
                      <CardDescription className="text-xs font-mono">{device.jid.split('@')[0]}</CardDescription>
                    </div>
                  </div>
                  {device.status === "connected" ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="border-none">
                      Disconnected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-end pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={() => handleLogout(device.id)}
                    disabled={logoutMutation.isPending}
                  >
                    {logoutMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4 mr-2" />
                    )}
                    Disconnect
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
            <Smartphone className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No Devices Connected</h3>
            <p className="text-muted-foreground mb-4">You have not connected any WhatsApp devices yet.</p>
            <Button onClick={handleOpenAddModal} variant="outline">
              Connect a Device
            </Button>
          </div>
        )}
      </div>

      <Dialog open={isAddModalOpen} onOpenChange={(open) => {
        if (!open) stopQRStream();
        setIsAddModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connect New WhatsApp</DialogTitle>
            <DialogDescription>
              Name your device and scan the QR code using WhatsApp on your phone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col gap-4 py-4">
            {!qrCode && !isGenerating ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Device Name</label>
                  <Input 
                    placeholder="e.g. CS 1, Receptionist" 
                    value={newDeviceName}
                    onChange={(e) => setNewDeviceName(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button onClick={generateQR} className="w-full">
                  Generate QR Code
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-4 p-4">
                {connectionError ? (
                  <div className="text-center space-y-4">
                    <p className="text-red-500 font-medium">{connectionError}</p>
                    <Button onClick={generateQR} variant="outline">Try Again</Button>
                  </div>
                ) : !qrCode ? (
                  <div className="flex flex-col items-center justify-center space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Requesting QR code from server...</p>
                  </div>
                ) : (
                  <>
                    <div className="bg-white p-4 rounded-xl shadow-sm border">
                      <img 
                        src={qrCode} 
                        alt="WhatsApp QR Code" 
                        className="w-64 h-64 mx-auto"
                      />
                    </div>
                    <div className="text-center space-y-2">
                      <p className="font-medium text-primary">Scan with WhatsApp</p>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                        Open WhatsApp on your phone, go to Settings &gt; Linked Devices &gt; Link a Device.
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
