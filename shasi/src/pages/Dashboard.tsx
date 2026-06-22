import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  Calendar, 
  Clock, 
  AlertTriangle,
  UserPlus,
  CalendarPlus,
  ShoppingCart,
  TrendingUp,
  Receipt,
} from "lucide-react";
import { PatientFormDialog } from "@/components/patients";
import { useDashboardStats, useDashboardRevenue, useDashboardAppointmentsToday } from "@/hooks/useDashboard";
import { useCommissions } from "@/hooks/useCommissions";
import { useProducts } from "@/hooks/useProducts";
import { DateRangeFilter, type PeriodPreset } from "@/components/filters";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { id } from "date-fns/locale";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function Dashboard() {
  const navigate = useNavigate();
  const [isPatientFormOpen, setIsPatientFormOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<{ from: Date | undefined; to: Date | undefined; preset: PeriodPreset }>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
    preset: "today",
  });
  
  // Fetch from backend dashboard endpoints
  const { data: stats } = useDashboardStats();
  const { data: revenuePoints } = useDashboardRevenue();
  const { data: appointmentsToday } = useDashboardAppointmentsToday();
  const { commissions } = useCommissions();
  const { products } = useProducts();

  // Filter commissions by date range (client-side for flexibility)
  const filteredCommissions = commissions.filter((c) => {
    if (!dateFilter.from || !dateFilter.to || !c.created_at) {
      return dateFilter.preset === "all";
    }
    const cDate = new Date(c.created_at);
    return isWithinInterval(cDate, { start: dateFilter.from, end: dateFilter.to });
  });

  // Calculate filtered pending commissions
  const filteredPendingCommissions = filteredCommissions
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + Number(c.commission_amount || 0), 0);

  // Low stock products (client-side from products list)
  const lowStockProducts = products.filter(
    (p) => p.is_active && (p.current_stock || 0) <= (p.minimum_stock || 5)
  );

  // Revenue chart data from backend (last 30 days)
  const revenueData = (revenuePoints || []).slice(0, 14).reverse().map((p) => ({
    label: format(new Date(p.date), "dd MMM", { locale: id }),
    revenue: Number(p.revenue),
  }));

  // Appointment status distribution from backend today's data
  const getAppointmentStats = () => {
    const statusCounts: Record<string, number> = {};
    (appointmentsToday || []).forEach((apt) => {
      statusCounts[apt.status] = (statusCounts[apt.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));
  };

  // Top staff by commission (filtered by date range)
  const getTopStaffCommissions = () => {
    const staffMap: Record<string, { name: string; role: string; total: number; pending: number }> = {};
    
    filteredCommissions.forEach((comm) => {
      if (!comm.staff) return;
      const staffId = comm.staff_id;
      if (!staffMap[staffId]) {
        staffMap[staffId] = {
          name: (comm.staff as any)?.full_name || "Unknown",
          role: comm.staff_role,
          total: 0,
          pending: 0,
        };
      }
      staffMap[staffId].total += Number(comm.commission_amount || 0);
      if (comm.status === "pending") {
        staffMap[staffId].pending += Number(comm.commission_amount || 0);
      }
    });

    return Object.values(staffMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const appointmentStats = getAppointmentStats();
  const topStaff = getTopStaffCommissions();
  const pendingAppointments = (appointmentsToday || []).filter((a) => a.status === "scheduled").length;

  const statCards = [
    {
      title: "Pendapatan Hari Ini",
      value: formatPrice(stats?.revenue_today ?? 0),
      change: `${stats?.paid_transactions_today ?? 0} transaksi lunas`,
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
      onClick: () => navigate("/transactions"),
    },
    {
      title: "Total Pasien",
      value: (stats?.patients ?? 0).toString(),
      change: "Terdaftar",
      icon: Receipt,
      color: "text-primary",
      bgColor: "bg-primary/10",
      onClick: () => navigate("/patients"),
    },
    {
      title: "Appointment Hari Ini",
      value: (stats?.appointments_today ?? (appointmentsToday?.length ?? 0)).toString(),
      change: `${pendingAppointments} terjadwal`,
      icon: Calendar,
      color: "text-primary",
      bgColor: "bg-primary/10",
      onClick: () => navigate("/appointments"),
    },
    {
      title: "Komisi Pending",
      value: formatPrice(filteredPendingCommissions),
      change: `${filteredCommissions.filter((c) => c.status === "pending").length} entri`,
      icon: Clock,
      color: "text-warning",
      bgColor: "bg-warning/10",
      onClick: () => navigate("/commissions"),
    },
    {
      title: "Stok Menipis",
      value: (stats?.low_stock_products ?? lowStockProducts.length).toString(),
      change: (stats?.low_stock_products ?? lowStockProducts.length) === 0 ? "Stok aman" : "Perlu restok",
      icon: AlertTriangle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      onClick: () => navigate("/products"),
    },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
      <PageHeader 
        title="Dashboard" 
        description="Selamat datang! Berikut ringkasan klinik Anda."
        action={
          <DateRangeFilter
            value={dateFilter}
            onChange={setDateFilter}
          />
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card 
            key={stat.title} 
            className="shadow-clinic cursor-pointer hover:shadow-md transition-shadow"
            onClick={stat.onClick}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions & Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="shadow-clinic">
          <CardHeader>
            <CardTitle className="text-lg">Aksi Cepat</CardTitle>
            <CardDescription>Tugas umum</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => setIsPatientFormOpen(true)}
            >
              <UserPlus className="h-4 w-4" />
              Pasien Baru
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => navigate("/appointments")}
            >
              <CalendarPlus className="h-4 w-4" />
              Appointment Baru
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-12"
              onClick={() => navigate("/pos")}
            >
              <ShoppingCart className="h-4 w-4" />
              Transaksi Baru
            </Button>
          </CardContent>
        </Card>

        {/* Revenue Trend Chart */}
        <Card className="lg:col-span-2 shadow-clinic">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Tren Pendapatan
            </CardTitle>
            <CardDescription>
              {dateFilter.preset === "all" ? "7 hari terakhir" : 
                dateFilter.from && dateFilter.to ? 
                  `${format(dateFilter.from, "dd MMM", { locale: id })} - ${format(dateFilter.to, "dd MMM yyyy", { locale: id })}` :
                  "Periode terpilih"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {revenueData.every((d) => d.revenue === 0) ? (
              <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/30">
                <p className="text-muted-foreground text-sm">
                  Grafik akan muncul saat ada transaksi
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" className="text-xs" />
                  <YAxis 
                    tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                    className="text-xs"
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatPrice(value), "Pendapatan"]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Appointment Status Pie Chart */}
        <Card className="shadow-clinic">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Appointment Hari Ini
            </CardTitle>
            <CardDescription>Distribusi status</CardDescription>
          </CardHeader>
          <CardContent>
            {appointmentStats.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/30">
                <p className="text-muted-foreground text-sm">
                  Tidak ada appointment hari ini
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={appointmentStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {appointmentStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Commission Summary */}
        <Card className="shadow-clinic">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Ringkasan Komisi
            </CardTitle>
            <CardDescription>Top earners periode ini</CardDescription>
          </CardHeader>
          <CardContent>
            {topStaff.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center border-2 border-dashed border-border rounded-lg bg-muted/30">
                <p className="text-muted-foreground text-sm">
                  Belum ada data komisi
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {topStaff.map((staff, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium text-sm">{staff.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{staff.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatPrice(staff.total)}</p>
                      <p className="text-xs text-warning">{formatPrice(staff.pending)} pending</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <Card className="shadow-clinic mt-6 border-destructive/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Peringatan Stok Menipis
            </CardTitle>
            <CardDescription>Produk yang perlu restok</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {lowStockProducts.slice(0, 6).map((product) => (
                <div 
                  key={product.id} 
                  className="p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <p className="font-medium text-sm">{product.name}</p>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-muted-foreground">Saat ini: {product.current_stock}</span>
                    <span className="text-xs text-destructive">Min: {product.minimum_stock}</span>
                  </div>
                </div>
              ))}
            </div>
            {lowStockProducts.length > 6 && (
              <Button 
                variant="outline" 
                className="w-full mt-3"
                onClick={() => navigate("/products")}
              >
                Lihat semua {lowStockProducts.length} produk stok menipis
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Patient Form Dialog */}
      <PatientFormDialog 
        open={isPatientFormOpen} 
        onOpenChange={setIsPatientFormOpen}
        patient={null}
      />
    </div>
  );
}
