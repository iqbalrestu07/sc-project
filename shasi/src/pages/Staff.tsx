import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Stethoscope, Sparkles } from "lucide-react";
import { StaffFormDialog, StaffList } from "@/components/staff";
import { useStaff } from "@/hooks/useStaff";
import type { Staff } from "@/types/appointment";

export default function Staff() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const { doctors, therapists } = useStaff();

  const handleEdit = (staff: Staff) => {
    setEditingStaff(staff);
    setDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingStaff(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
      <PageHeader 
        title="Staff Management" 
        description="Manage your clinic team and commission schemes"
        action={
          <Button className="gap-2" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Staff
          </Button>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="shadow-clinic">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-blue-100">
                <Stethoscope className="h-5 w-5 text-blue-800" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Doctors</p>
                <p className="text-xl font-semibold">{doctors.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-clinic">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-purple-100">
                <Sparkles className="h-5 w-5 text-purple-800" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Therapists</p>
                <p className="text-xl font-semibold">{therapists.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <StaffList onEdit={handleEdit} />

      <StaffFormDialog
        open={dialogOpen}
        onOpenChange={handleDialogClose}
        staff={editingStaff}
      />
    </div>
  );
}
