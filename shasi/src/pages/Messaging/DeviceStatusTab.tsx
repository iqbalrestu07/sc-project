import { useState, useEffect, useRef } from "react";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode, Smartphone, LogOut, CheckCircle2 } from "lucide-react";
import { useWhatsAppStatus, useWhatsAppLogout } from "@/hooks/useWhatsApp";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function DeviceStatusTab() {
  const { data: statusData, isLoading, refetch } = useWhatsAppStatus();
  const logoutMutation = useWhatsAppLogout();
  const { activeOrg } = useAuth();
  
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const isConnected = statusData?.connected || false;

  const stopQRStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setQrCode(null);
  };

  const generateQR = async () => {
    setConnectionError(null);
    setQrCode(null);
    setIsGenerating(true);
    
    abortControllerRef.current = new AbortController();
    const token = localStorage.getItem("access_token");

    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
      await fetchEventSource(`${baseUrl}/whatsapp/login`, {
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

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        toast.success("WhatsApp disconnected successfully.");
        setQrCode(null);
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
    <Card className="shadow-clinic max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          WhatsApp Device Connection
        </CardTitle>
        <CardDescription>
          Connect your clinic's WhatsApp number to send automatic invoices and blast messages.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 flex flex-col items-center py-6">
        {isConnected ? (
          <div className="text-center space-y-4 w-full">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-full bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-success" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-success">Device Connected</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your WhatsApp device is successfully linked and ready to send messages.
              </p>
            </div>
            <div className="pt-4">
              <Button 
                variant="destructive" 
                onClick={handleLogout} 
                disabled={logoutMutation.isPending}
                className="gap-2"
              >
                {logoutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Disconnect Device
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6 w-full">
            <div className="bg-muted/30 p-8 rounded-xl border border-dashed border-border max-w-sm mx-auto flex flex-col items-center justify-center min-h-[250px]">
              {qrCode ? (
                <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 rounded-lg shadow-sm mx-auto" />
                  <p className="text-sm text-muted-foreground animate-pulse">Waiting for scan...</p>
                </div>
              ) : isGenerating ? (
                <div className="space-y-4 flex flex-col items-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Generating QR Code...</p>
                </div>
              ) : (
                <div className="space-y-4 flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <QrCode className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Click below to generate a QR code for linking your device.</p>
                </div>
              )}
            </div>

            {connectionError && (
              <p className="text-sm text-destructive font-medium">{connectionError}</p>
            )}

            {!qrCode && !isGenerating && (
              <Button onClick={generateQR} className="gap-2">
                <QrCode className="h-4 w-4" />
                Generate QR Code
              </Button>
            )}
            
            {(qrCode || isGenerating) && (
              <Button variant="outline" onClick={stopQRStream}>
                Cancel
              </Button>
            )}

            <div className="text-left text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg mt-6">
              <h4 className="font-semibold text-foreground mb-2">How to connect:</h4>
              <ol className="list-decimal list-inside space-y-1">
                <li>Open WhatsApp on your phone</li>
                <li>Tap Menu (⋮) or Settings (⚙) and select <b>Linked Devices</b></li>
                <li>Tap on <b>Link a Device</b></li>
                <li>Point your phone to this screen to capture the code</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
