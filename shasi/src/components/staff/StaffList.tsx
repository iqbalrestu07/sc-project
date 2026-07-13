import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal, Edit, UserCircle, Stethoscope, Sparkles } from "lucide-react";
import { useStaff } from "@/hooks/useStaff";
import type { Staff } from "@/types/appointment";

interface StaffListProps {
  onEdit: (staff: Staff) => void;
}

export function StaffList({ onEdit }: StaffListProps) {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { staff, hasNext, isLoading, doctors, therapists } = useStaff(undefined, page, limit);

  if (isLoading) {
    return (
      <Card className="shadow-clinic">
        <CardContent className="py-16">
          <div className="text-center text-muted-foreground">
            Loading staff...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (staff.length === 0) {
    return (
      <Card className="shadow-clinic">
        <CardContent className="py-16">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <UserCircle className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium mb-2">No staff members added</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Add your clinic's doctors and therapists to assign them to appointments.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-clinic">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Specialization</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((member) => (
              <TableRow key={member.id}>
                <TableCell className="font-medium">{member.full_name}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={
                      member.role === "doctor"
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : "bg-purple-100 text-purple-800 border-purple-200"
                    }
                  >
                    {member.role === "doctor" ? (
                      <Stethoscope className="h-3 w-3 mr-1" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-1" />
                    )}
                    {member.role === "doctor" ? "Doctor" : "Therapist"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.specialization || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.phone || "-"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {member.email || "-"}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(member)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between p-4 border-t">
          <Button
            variant="outline"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <Button
            variant="outline"
            disabled={!hasNext}
            onClick={() => setPage(p => p + 1)}
          >
            Next
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
