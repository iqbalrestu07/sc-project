import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { 
  Building2, 
  Percent, 
  Bell,
  MessageSquare,
  Mail,
  Save,
  Loader2,
  FileText
} from "lucide-react";
import { useClinicSettings, ClinicSettings } from "@/hooks/useClinicSettings";

export default function SettingsPage() {
  const { settings, isLoading, updateSettings } = useClinicSettings();
  const [formData, setFormData] = useState<Partial<ClinicSettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        clinic_name: settings.clinic_name || "",
        address: settings.address || "",
        phone: settings.phone || "",
        email: settings.email || "",
        tax_rate: settings.tax_rate || 11,
        tax_inclusive: settings.tax_inclusive || false,
        low_stock_alerts: settings.low_stock_alerts ?? true,
        appointment_reminders: settings.appointment_reminders ?? true,
        expiry_warnings: settings.expiry_warnings ?? true,
        reminder_hours_before: settings.reminder_hours_before || 24,
        whatsapp_reminder_enabled: settings.whatsapp_reminder_enabled || false,
        email_reminder_enabled: settings.email_reminder_enabled || false,
        whatsapp_business_phone_id: settings.whatsapp_business_phone_id || "",
        invoice_header_title: settings.invoice_header_title || "",
        invoice_header_description: settings.invoice_header_description || "",
        invoice_footer_text: settings.invoice_footer_text || "",
      });
    }
  }, [settings]);

  const handleChange = (field: keyof ClinicSettings, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    updateSettings.mutate(formData, {
      onSuccess: () => setHasChanges(false),
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
        <PageHeader title="Settings" description="Configure your clinic system" />
        <div className="max-w-2xl space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="shadow-clinic">
              <CardHeader>
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-60" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
      <PageHeader 
        title="Settings" 
        description="Configure your clinic system"
      />

      <div className="max-w-2xl space-y-6">
        {/* Clinic Information */}
        <Card className="shadow-clinic">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Clinic Information
            </CardTitle>
            <CardDescription>Basic details about your clinic</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clinicName">Clinic Name</Label>
              <Input 
                id="clinicName" 
                placeholder="Your Aesthetic Clinic" 
                value={formData.clinic_name || ""}
                onChange={(e) => handleChange("clinic_name", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input 
                id="address" 
                placeholder="Clinic address" 
                value={formData.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  placeholder="+62 xxx xxx xxxx" 
                  value={formData.phone || ""}
                  onChange={(e) => handleChange("phone", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="clinic@email.com" 
                  value={formData.email || ""}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Settings */}
        <Card className="shadow-clinic">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Percent className="h-5 w-5 text-primary" />
              Tax & Pricing
            </CardTitle>
            <CardDescription>Configure tax and pricing rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="taxRate">Default Tax Rate (%)</Label>
              <Input 
                id="taxRate" 
                type="number" 
                placeholder="11" 
                value={formData.tax_rate || ""}
                onChange={(e) => handleChange("tax_rate", parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Include Tax in Prices</Label>
                <p className="text-sm text-muted-foreground">
                  Prices shown already include tax
                </p>
              </div>
              <Switch 
                checked={formData.tax_inclusive || false}
                onCheckedChange={(checked) => handleChange("tax_inclusive", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appointment Reminders */}
        <Card className="shadow-clinic">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Appointment Reminders
            </CardTitle>
            <CardDescription>Configure when and how to send reminders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Reminder Timing</Label>
              <Select 
                value={String(formData.reminder_hours_before || 24)}
                onValueChange={(value) => handleChange("reminder_hours_before", parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select timing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 hour before</SelectItem>
                  <SelectItem value="2">2 hours before</SelectItem>
                  <SelectItem value="6">6 hours before</SelectItem>
                  <SelectItem value="12">12 hours before</SelectItem>
                  <SelectItem value="24">24 hours before</SelectItem>
                  <SelectItem value="48">48 hours before</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-success" />
                  WhatsApp Reminders
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send reminders via WhatsApp
                </p>
              </div>
              <Switch 
                checked={formData.whatsapp_reminder_enabled || false}
                onCheckedChange={(checked) => handleChange("whatsapp_reminder_enabled", checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" />
                  Email Reminders
                </Label>
                <p className="text-sm text-muted-foreground">
                  Send reminders via email
                </p>
              </div>
              <Switch 
                checked={formData.email_reminder_enabled || false}
                onCheckedChange={(checked) => handleChange("email_reminder_enabled", checked)}
              />
            </div>

            {formData.whatsapp_reminder_enabled && (
              <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
                <Label htmlFor="whatsappPhoneId">WhatsApp Business Phone ID</Label>
                <Input 
                  id="whatsappPhoneId" 
                  placeholder="Enter your Meta WhatsApp Business Phone ID" 
                  value={formData.whatsapp_business_phone_id || ""}
                  onChange={(e) => handleChange("whatsapp_business_phone_id", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Get this from Meta Business Suite → WhatsApp → Phone Numbers
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Settings */}
        <Card className="shadow-clinic">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-success" />
              WhatsApp Configuration
            </CardTitle>
            <CardDescription>Configure WhatsApp Business API settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="whatsappPhoneIdMain">WhatsApp Business Phone ID</Label>
              <Input 
                id="whatsappPhoneIdMain" 
                placeholder="Enter your Meta WhatsApp Business Phone ID" 
                value={formData.whatsapp_business_phone_id || ""}
                onChange={(e) => handleChange("whatsapp_business_phone_id", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Get this from Meta Business Suite → WhatsApp → Phone Numbers
              </p>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                <Label className="font-medium">Setup Instructions</Label>
              </div>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Go to <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Meta Business Suite</a></li>
                <li>Navigate to WhatsApp → Getting Started</li>
                <li>Copy your Phone Number ID and paste it above</li>
                <li>Contact your administrator to configure the Access Token securely</li>
              </ol>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <Label>Enable WhatsApp Messaging</Label>
                <p className="text-sm text-muted-foreground">
                  Allow sending messages via WhatsApp
                </p>
              </div>
              <Switch 
                checked={formData.whatsapp_reminder_enabled || false}
                onCheckedChange={(checked) => handleChange("whatsapp_reminder_enabled", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="shadow-clinic">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              System Alerts
            </CardTitle>
            <CardDescription>Configure internal notifications</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Low Stock Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when products run low
                </p>
              </div>
              <Switch 
                checked={formData.low_stock_alerts || false}
                onCheckedChange={(checked) => handleChange("low_stock_alerts", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Appointment Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Show reminder notifications in dashboard
                </p>
              </div>
              <Switch 
                checked={formData.appointment_reminders || false}
                onCheckedChange={(checked) => handleChange("appointment_reminders", checked)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Expiry Warnings</Label>
                <p className="text-sm text-muted-foreground">
                  Alert when products near expiry
                </p>
              </div>
              <Switch 
                checked={formData.expiry_warnings || false}
                onCheckedChange={(checked) => handleChange("expiry_warnings", checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Invoice / Receipt Print Settings */}
        <Card className="shadow-clinic">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Pengaturan Cetak Invoice / Struk
            </CardTitle>
            <CardDescription>
              Header dan footer ini digunakan saat mencetak invoice maupun struk transaksi di printer thermal 58mm
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceHeaderTitle">Judul Header Invoice</Label>
              <Input 
                id="invoiceHeaderTitle" 
                placeholder="Contoh: Shasi Beauty Care" 
                value={formData.invoice_header_title || ""}
                onChange={(e) => handleChange("invoice_header_title", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Nama klinik yang akan ditampilkan di bagian atas invoice
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceHeaderDesc">Deskripsi Header</Label>
              <Textarea 
                id="invoiceHeaderDesc" 
                placeholder="Contoh: Jl. Raya Utama No. 123, Kota ABC&#10;Telp: 021-12345678" 
                value={formData.invoice_header_description || ""}
                onChange={(e) => handleChange("invoice_header_description", e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Alamat, telepon, atau informasi lainnya di bawah nama klinik. Gunakan enter untuk baris baru.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoiceFooter">Footer Invoice</Label>
              <Textarea 
                id="invoiceFooter" 
                placeholder="Contoh: Terima kasih atas kunjungan Anda!&#10;Follow IG: @shasibeautycare" 
                value={formData.invoice_footer_text || ""}
                onChange={(e) => handleChange("invoice_footer_text", e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Teks yang ditampilkan di bagian bawah invoice
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                💡 Invoice dioptimalkan untuk printer thermal 58mm. Lebar kertas ±48mm area cetak.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button 
          className="gap-2" 
          onClick={handleSave}
          disabled={!hasChanges || updateSettings.isPending}
        >
          {updateSettings.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {updateSettings.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
