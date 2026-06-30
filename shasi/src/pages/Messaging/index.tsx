import { PageHeader } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeviceStatusTab } from "./DeviceStatusTab";
import { TemplatesTab } from "./TemplatesTab";
import { BlastTab } from "./BlastTab";
import { DirectMessageTab } from "./DirectMessageTab";

export default function Messaging() {
  return (
    <div className="space-y-6">
      <PageHeader 
        title="WhatsApp Messaging" 
        description="Manage WhatsApp device connection, message templates, and run blast campaigns." 
      />

      <Tabs defaultValue="device" className="space-y-6">
        <TabsList className="bg-muted/50 border">
          <TabsTrigger value="device">Device Status</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="blast">Blast Campaign</TabsTrigger>
          <TabsTrigger value="direct">Direct Message</TabsTrigger>
        </TabsList>

        <TabsContent value="device" className="mt-0">
          <DeviceStatusTab />
        </TabsContent>

        <TabsContent value="templates" className="mt-0">
          <TemplatesTab />
        </TabsContent>

        <TabsContent value="blast" className="mt-0">
          <BlastTab />
        </TabsContent>

        <TabsContent value="direct" className="mt-0">
          <DirectMessageTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
