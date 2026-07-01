import { PageHeader } from "@/components/layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DeviceStatusTab } from "./DeviceStatusTab";
import { TemplatesTab } from "./TemplatesTab";
import { BlastTab } from "./BlastTab";
import { DirectMessageTab } from "./DirectMessageTab";
import { OmniChatTab } from "./OmniChatTab";

export default function Messaging() {
  return (
    <div className="p-6 space-y-6">
      <PageHeader 
        title="WhatsApp Messaging" 
        description="Manage WhatsApp device connection, message templates, and run blast campaigns." 
      />

      <Tabs defaultValue="omnichat" className="space-y-6">
        <TabsList className="bg-muted/50 border">
          <TabsTrigger value="omnichat">Inbox</TabsTrigger>
          <TabsTrigger value="device">Device Status</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="blast">Blast Campaign</TabsTrigger>
          <TabsTrigger value="direct">Direct Message</TabsTrigger>
        </TabsList>

        <TabsContent value="omnichat" className="mt-0">
          <OmniChatTab />
        </TabsContent>

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
