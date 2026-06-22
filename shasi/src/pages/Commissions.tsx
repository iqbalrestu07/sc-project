import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  DollarSign, 
  Clock, 
  CheckCircle,
  Download,
  Stethoscope,
  Sparkles,
  Filter,
  MoreHorizontal,
  CheckCheck
} from "lucide-react";
import { useCommissions } from "@/hooks/useCommissions";
import { useStaff } from "@/hooks/useStaff";
import { DateRangeFilter, type PeriodPreset } from "@/components/filters";
import { format, isWithinInterval } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function Commissions() {
  const { commissions, isLoading, updateStatus, isUpdating } = useCommissions();
  const { staff } = useStaff();
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<{ from: Date | undefined; to: Date | undefined; preset: PeriodPreset }>({
    from: undefined,
    to: undefined,
    preset: "all",
  });
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  // Filter commissions
  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      // Date filter
      let matchesDate = true;
      if (dateFilter.from && dateFilter.to && c.created_at) {
        const cDate = new Date(c.created_at);
        matchesDate = isWithinInterval(cDate, { start: dateFilter.from, end: dateFilter.to });
      }
      
      // Staff filter
      const matchesStaff = staffFilter === "all" || c.staff_id === staffFilter;
      
      // Role filter
      const matchesRole = roleFilter === "all" || c.staff_role === roleFilter;
      
      // Status filter
      const matchesStatus = statusFilter === "all" || c.status === statusFilter;
      
      return matchesDate && matchesStaff && matchesRole && matchesStatus;
    });
  }, [commissions, dateFilter, staffFilter, roleFilter, statusFilter]);

  // Calculate stats from filtered data
  const pendingCommissions = filteredCommissions.filter((c) => c.status === "pending");
  const paidCommissions = filteredCommissions.filter((c) => c.status === "paid");
  
  const totalPending = pendingCommissions.reduce(
    (sum, c) => sum + Number(c.commission_amount || 0),
    0
  );
  const totalPaid = paidCommissions.reduce(
    (sum, c) => sum + Number(c.commission_amount || 0),
    0
  );

  // Group by staff (filtered)
  const commissionsByStaff = useMemo(() => {
    const staffMap: Record<string, { 
      staff: { id: string; full_name: string; role: string }; 
      total: number; 
      pending: number; 
      count: number 
    }> = {};
    
    filteredCommissions.forEach((comm) => {
      if (!comm.staff) return;
      const staffId = comm.staff_id;
      if (!staffMap[staffId]) {
        staffMap[staffId] = {
          staff: {
            id: staffId,
            full_name: (comm.staff as any)?.full_name || "Unknown",
            role: comm.staff_role,
          },
          total: 0,
          pending: 0,
          count: 0,
        };
      }
      staffMap[staffId].total += Number(comm.commission_amount || 0);
      if (comm.status === "pending") {
        staffMap[staffId].pending += Number(comm.commission_amount || 0);
      }
      staffMap[staffId].count += 1;
    });

    return Object.values(staffMap);
  }, [filteredCommissions]);

  const clearFilters = () => {
    setDateFilter({ from: undefined, to: undefined, preset: "all" });
    setStaffFilter("all");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const hasActiveFilters = dateFilter.preset !== "all" || staffFilter !== "all" || roleFilter !== "all" || statusFilter !== "all";

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCommissions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCommissions.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkStatusChange = (status: "pending" | "paid") => {
    if (selectedIds.size === 0) return;
    updateStatus({ ids: Array.from(selectedIds), status });
    setSelectedIds(new Set());
  };

  const handleSingleStatusChange = (id: string, status: "pending" | "paid") => {
    updateStatus({ ids: [id], status });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
      <PageHeader 
        title="Komisi" 
        description="Lacak dan kelola komisi staff"
        action={
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Payroll
          </Button>
        }
      />

      {/* Filters */}
      <Card className="shadow-clinic mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Date Filter */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <span className="text-sm font-medium">Periode:</span>
              <DateRangeFilter
                value={dateFilter}
                onChange={setDateFilter}
              />
            </div>
            
            {/* Other Filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filter:</span>
              </div>
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Pilih Staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Staff</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Role</SelectItem>
                  <SelectItem value="doctor">Dokter</SelectItem>
                  <SelectItem value="therapist">Terapis</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Reset Filter
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-clinic">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/10">
                <Clock className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-semibold">{formatPrice(totalPending)}</p>
                <p className="text-xs text-muted-foreground">{pendingCommissions.length} entri</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-clinic">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Dihasilkan</p>
                <p className="text-xl font-semibold">{formatPrice(totalPending + totalPaid)}</p>
                <p className="text-xs text-muted-foreground">{filteredCommissions.length} entri</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-clinic">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sudah Dibayar</p>
                <p className="text-xl font-semibold">{formatPrice(totalPaid)}</p>
                <p className="text-xs text-muted-foreground">{paidCommissions.length} entri</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Summary */}
      {commissionsByStaff.length > 0 && (
        <Card className="shadow-clinic mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Komisi per Staff</CardTitle>
            <CardDescription>Ringkasan komisi yang dihasilkan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {commissionsByStaff.map((item) => (
                <div
                  key={item.staff.id}
                  className="p-4 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-3 mb-2">
                    {item.staff.role === "doctor" ? (
                      <Stethoscope className="h-4 w-4 text-primary" />
                    ) : (
                      <Sparkles className="h-4 w-4 text-accent-foreground" />
                    )}
                    <span className="font-medium">{item.staff.full_name}</span>
                  </div>
                  <div className="text-lg font-semibold text-primary">
                    {formatPrice(item.total)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.count} transaksi • {formatPrice(item.pending)} pending
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Commissions */}
      <Card className="shadow-clinic">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Entri Komisi ({filteredCommissions.length})</CardTitle>
              <CardDescription>Rekaman komisi terbaru</CardDescription>
            </div>
            {selectedIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selectedIds.size} dipilih</span>
                <Button 
                  size="sm" 
                  onClick={() => handleBulkStatusChange("paid")}
                  disabled={isUpdating}
                  className="gap-2"
                >
                  <CheckCheck className="h-4 w-4" />
                  Tandai Lunas
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleBulkStatusChange("pending")}
                  disabled={isUpdating}
                >
                  Tandai Pending
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Memuat komisi...
            </div>
          ) : filteredCommissions.length === 0 ? (
            <div className="py-16 text-center">
              <DollarSign className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">
                {hasActiveFilters 
                  ? "Tidak ada komisi ditemukan dengan filter ini." 
                  : "Belum ada komisi. Selesaikan transaksi untuk menghasilkan komisi."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox 
                      checked={selectedIds.size === filteredCommissions.length && filteredCommissions.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Transaksi</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead className="text-right">Base Amount</TableHead>
                  <TableHead className="text-right">Komisi</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommissions.slice(0, 50).map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell>
                      <Checkbox 
                        checked={selectedIds.has(commission.id)}
                        onCheckedChange={() => toggleSelectOne(commission.id)}
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(commission.created_at!), "dd/MM/yy HH:mm", { locale: idLocale })}
                    </TableCell>
                    <TableCell className="font-medium">
                      {commission.staff?.full_name || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          commission.staff_role === "doctor"
                            ? "bg-primary/20 text-primary"
                            : "bg-accent text-accent-foreground"
                        }
                      >
                        {commission.staff_role === "doctor" ? "Dokter" : "Terapis"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {commission.transaction?.transaction_code || "-"}
                    </TableCell>
                    <TableCell>
                      {commission.commission_type === "percentage"
                        ? `${commission.commission_value}%`
                        : formatPrice(Number(commission.commission_value))}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(Number(commission.base_amount))}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatPrice(Number(commission.commission_amount))}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={commission.status === "paid" ? "default" : "secondary"}
                      >
                        {commission.status === "paid" ? "Lunas" : "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {commission.status === "pending" ? (
                            <DropdownMenuItem onClick={() => handleSingleStatusChange(commission.id, "paid")}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Tandai Lunas
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleSingleStatusChange(commission.id, "pending")}>
                              <Clock className="h-4 w-4 mr-2" />
                              Tandai Pending
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
