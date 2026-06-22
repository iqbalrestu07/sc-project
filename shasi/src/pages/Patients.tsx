import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Search, Users } from "lucide-react";
import { usePatients } from "@/hooks/usePatients";
import { PatientFormDialog, PatientList } from "@/components/patients";
import { Patient } from "@/types/patient";
import { useDebounce } from "@/hooks/useDebounce";

export default function Patients() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  
  const debouncedSearch = useDebounce(searchQuery, 300);
  const { data: patients = [], isLoading } = usePatients(debouncedSearch);

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient);
    setIsFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingPatient(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
      <PageHeader 
        title="Patients" 
        description="Manage your patient database"
        action={
          <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
            <UserPlus className="h-4 w-4" />
            Add Patient
          </Button>
        }
      />

      {/* Search & Filters */}
      <Card className="mb-6 shadow-clinic">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search patients by name, phone, or ID..." 
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline">Filters</Button>
          </div>
        </CardContent>
      </Card>

      {/* Patient List or Empty State */}
      {patients.length > 0 ? (
        <PatientList patients={patients} onEdit={handleEdit} isLoading={isLoading} />
      ) : (
        <Card className="shadow-clinic">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? "No patients found" : "No patients yet"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                {searchQuery 
                  ? "Try adjusting your search terms."
                  : "Get started by adding your first patient to the system."
                }
              </p>
              {!searchQuery && (
                <Button className="gap-2" onClick={() => setIsFormOpen(true)}>
                  <UserPlus className="h-4 w-4" />
                  Add Your First Patient
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patient Form Dialog */}
      <PatientFormDialog 
        open={isFormOpen} 
        onOpenChange={handleCloseForm}
        patient={editingPatient}
      />
    </div>
  );
}
