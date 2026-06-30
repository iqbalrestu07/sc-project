import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, MessageSquare } from "lucide-react";
import { useWhatsAppTemplates, useCreateWhatsAppTemplate } from "@/hooks/useWhatsApp";
import { toast } from "sonner";
import { format } from "date-fns";

export function TemplatesTab() {
  const { data: templates = [], isLoading } = useWhatsAppTemplates();
  const createMutation = useCreateWhatsAppTemplate();
  
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");

  const handleCreate = () => {
    if (!name || !content) {
      toast.error("Please fill in both name and content.");
      return;
    }

    createMutation.mutate(
      { name, content },
      {
        onSuccess: () => {
          toast.success("Template created successfully");
          setIsOpen(false);
          setName("");
          setContent("");
        },
        onError: (err: any) => {
          toast.error(err.message || "Failed to create template");
        }
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium">Message Templates</h3>
          <p className="text-sm text-muted-foreground">Manage your predefined WhatsApp messages.</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input 
                  id="name" 
                  placeholder="e.g. Promo Merdeka" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Message Content</Label>
                <Textarea 
                  id="content" 
                  placeholder="Halo {{name}}, kami ada promo..." 
                  rows={6}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  You can use variables like <code>{`{{name}}`}</code> which will be replaced dynamically.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Template
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-clinic">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
              <MessageSquare className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p>No templates found. Create one to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Content Snippet</TableHead>
                  <TableHead className="w-[150px]">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="max-w-[400px] truncate" title={t.content}>
                      {t.content}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {t.created_at ? format(new Date(t.created_at), "dd MMM yyyy") : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
