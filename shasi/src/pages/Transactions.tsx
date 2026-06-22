import { useState, useMemo } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTransactions } from "@/hooks/useTransactions";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import { PAYMENT_STATUSES, PAYMENT_METHODS, type TransactionWithRelations } from "@/types/transaction";
import { format, isWithinInterval } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Search, Receipt, Eye, MoreHorizontal, Trash2, CreditCard, Calendar, Filter, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DateRangeFilter, getDateRangeFromPreset, type PeriodPreset } from "@/components/filters";

export default function Transactions() {
  const { transactions, isLoading, updatePaymentStatus, deleteTransaction, fetchTransactionDetail } = useTransactions();
  const { settings } = useClinicSettings();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<{ from: Date | undefined; to: Date | undefined; preset: PeriodPreset }>({
    from: undefined,
    to: undefined,
    preset: "all",
  });
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionWithRelations | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("cash");
  const [detailLoading, setDetailLoading] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = PAYMENT_STATUSES.find((s) => s.value === status);
    return statusConfig || { label: status, color: "bg-muted text-muted-foreground" };
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Search filter
      const matchesSearch =
        tx.transaction_code?.toLowerCase().includes(search.toLowerCase()) ||
        tx.patient?.full_name?.toLowerCase().includes(search.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === "all" || tx.payment_status === statusFilter;
      
      // Payment method filter
      const matchesMethod = methodFilter === "all" || tx.payment_method === methodFilter;
      
      // Date filter — use paid_at for paid transactions, fallback to created_at
      let matchesDate = true;
      const txDateRaw = tx.paid_at || tx.created_at;
      if (txDateRaw) {
        const txDate = new Date(txDateRaw);
        if (dateFilter.from && dateFilter.to) {
          matchesDate = isWithinInterval(txDate, { start: dateFilter.from, end: dateFilter.to });
        } else if (dateFilter.preset !== "all") {
          const range = getDateRangeFromPreset(dateFilter.preset);
          if (range.from && range.to) {
            matchesDate = isWithinInterval(txDate, { start: range.from, end: range.to });
          }
        }
      }
      
      return matchesSearch && matchesStatus && matchesMethod && matchesDate;
    });
  }, [transactions, search, statusFilter, methodFilter, dateFilter]);

  const handleViewDetails = async (tx: TransactionWithRelations) => {
    setSelectedTransaction(tx);
    setDetailsOpen(true);
    setDetailLoading(true);
    try {
      const detail = await fetchTransactionDetail(tx.id);
      setSelectedTransaction(detail);
    } catch (e) {
      console.error("Failed to fetch detail", e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleOpenPaymentDialog = (tx: TransactionWithRelations) => {
    setSelectedTransaction(tx);
    setSelectedPaymentMethod("cash");
    setPaymentDialogOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedTransaction) return;
    await updatePaymentStatus.mutateAsync({
      id: selectedTransaction.id,
      payment_status: "paid",
      payment_method: selectedPaymentMethod,
    });
    setPaymentDialogOpen(false);
    setSelectedTransaction(null);
  };

  const handleOpenDeleteDialog = (tx: TransactionWithRelations) => {
    setSelectedTransaction(tx);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTransaction) return;
    await deleteTransaction.mutateAsync(selectedTransaction.id);
    setDeleteDialogOpen(false);
    setSelectedTransaction(null);
  };

  const handleRefund = async (tx: TransactionWithRelations) => {
    await updatePaymentStatus.mutateAsync({
      id: tx.id,
      payment_status: "refunded",
    });
  };

  const handlePrintInvoice = () => {
    if (!selectedTransaction) return;
    const tx = selectedTransaction;
    
    // Use invoice settings, fallback to clinic info
    const headerTitle = settings?.invoice_header_title || settings?.clinic_name || "Klinik";
    const headerDesc = settings?.invoice_header_description || [settings?.address, settings?.phone ? `Telp: ${settings.phone}` : ""].filter(Boolean).join("\n");
    const footerText = settings?.invoice_footer_text || "Terima kasih atas kunjungan Anda!";

    const headerDescHtml = headerDesc.split("\n").map((line: string) => `<p>${line}</p>`).join("");
    const footerHtml = footerText.split("\n").map((line: string) => `<p>${line}</p>`).join("");

    const itemsHtml = (tx.items || []).map((item) => `
      <tr>
        <td style="padding:2px 0;font-size:10px;">${item.item_type === "service" ? item.service?.name : item.product?.name || "-"}</td>
        <td style="padding:2px 0;font-size:10px;text-align:right;">${item.quantity}x${formatPrice(Number(item.unit_price))}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:0 0 2px 0;font-size:10px;text-align:right;font-weight:600;">${formatPrice(Number(item.total_price))}</td>
      </tr>
    `).join("");

    const printWindow = window.open("", "_blank", "width=300,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${tx.transaction_code}</title>
        <style>
          @page { margin: 0; size: 58mm auto; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Courier New', monospace; 
            width: 48mm; 
            margin: 0 auto; 
            padding: 2mm 0; 
            font-size: 10px; 
            color: #000; 
            line-height: 1.3;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: 700; }
          .divider { border-top: 1px dashed #000; margin: 3px 0; }
          .header p { font-size: 9px; margin: 1px 0; }
          .header h2 { font-size: 13px; font-weight: 700; margin: 0; }
          table { width: 100%; border-collapse: collapse; }
          .summary .row { display: flex; justify-content: space-between; font-size: 10px; padding: 1px 0; }
          .summary .total { font-size: 13px; font-weight: 700; border-top: 1px dashed #000; padding-top: 3px; margin-top: 2px; }
          .footer { margin-top: 6px; }
          .footer p { font-size: 9px; margin: 1px 0; }
          @media print { 
            body { width: 48mm; padding: 2mm 0; } 
          }
        </style>
      </head>
      <body>
        <div class="header center">
          <h2>${headerTitle}</h2>
          ${headerDescHtml}
        </div>
        <div class="divider"></div>
        <div style="font-size:10px;">
          <div style="display:flex;justify-content:space-between;">
            <span>No: ${tx.transaction_code}</span>
          </div>
          <div>${(tx.paid_at || tx.created_at) ? format(new Date(tx.paid_at || tx.created_at), "dd/MM/yyyy HH:mm", { locale: idLocale }) : "-"}</div>
          <div>Pasien: ${tx.patient?.full_name || "Walk-in"}</div>
        </div>
        <div class="divider"></div>
        <table>${itemsHtml}</table>
        <div class="divider"></div>
        <div class="summary">
          <div class="row"><span>Subtotal</span><span>${formatPrice(Number(tx.subtotal || 0))}</span></div>
          ${Number(tx.discount_amount || 0) > 0 ? `<div class="row"><span>Diskon</span><span>-${formatPrice(Number(tx.discount_amount || 0))}</span></div>` : ""}
          ${Number(tx.tax_amount || 0) > 0 ? `<div class="row"><span>Pajak</span><span>${formatPrice(Number(tx.tax_amount || 0))}</span></div>` : ""}
          <div class="row total"><span>TOTAL</span><span>${formatPrice(Number(tx.total_amount || 0))}</span></div>
          ${tx.payment_method ? `<div class="row"><span>Bayar</span><span>${PAYMENT_METHODS.find((m) => m.value === tx.payment_method)?.label || tx.payment_method}</span></div>` : ""}
        </div>
        <div class="divider"></div>
        <div class="footer center">
          ${footerHtml}
          <p style="margin-top:4px;font-size:8px;">${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Calculate summary stats
  const totalRevenue = filteredTransactions
    .filter((tx) => tx.payment_status === "paid")
    .reduce((sum, tx) => sum + Number(tx.total_amount || 0), 0);
  
  const pendingCount = filteredTransactions.filter((tx) => tx.payment_status === "pending").length;

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setMethodFilter("all");
    setDateFilter({ from: undefined, to: undefined, preset: "all" });
  };

  const hasActiveFilters = search || statusFilter !== "all" || methodFilter !== "all" || dateFilter.preset !== "all";

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 animate-fade-in">
      <PageHeader
        title="Riwayat Transaksi"
        description="Lihat dan kelola semua transaksi"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card className="shadow-clinic">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Transaksi</p>
                <p className="text-xl font-semibold">{filteredTransactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-clinic">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-success/10">
                <CreditCard className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendapatan Lunas</p>
                <p className="text-xl font-semibold">{formatPrice(totalRevenue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-clinic">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-warning/10">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pembayaran Pending</p>
                <p className="text-xl font-semibold">{pendingCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-clinic mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            {/* Row 1: Search and Date Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari kode transaksi atau pasien..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <DateRangeFilter
                value={dateFilter}
                onChange={setDateFilter}
              />
            </div>
            
            {/* Row 2: Status, Method filters */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filter:</span>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  {PAYMENT_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Metode Bayar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Metode</SelectItem>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
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

      {/* Transactions Table */}
      <Card className="shadow-clinic">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transaksi ({filteredTransactions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Memuat transaksi...
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Tidak ada transaksi ditemukan
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Pasien</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead>Pembayaran</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => {
                    const status = getStatusBadge(tx.payment_status);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="font-mono text-sm">
                          {tx.transaction_code}
                        </TableCell>
                        <TableCell>
                          {tx.paid_at || tx.created_at
                            ? format(new Date(tx.paid_at || tx.created_at!), "dd MMM yyyy HH:mm", { locale: idLocale })
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {tx.patient?.full_name || "Walk-in"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatPrice(Number(tx.total_amount || 0))}
                        </TableCell>
                        <TableCell>
                          {tx.payment_method
                            ? PAYMENT_METHODS.find((m) => m.value === tx.payment_method)?.label || tx.payment_method
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", status.color)}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewDetails(tx)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Lihat Detail
                              </DropdownMenuItem>
                              {tx.payment_status === "pending" && (
                                <DropdownMenuItem onClick={() => handleOpenPaymentDialog(tx)}>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Tandai Lunas
                                </DropdownMenuItem>
                              )}
                              {tx.payment_status === "paid" && (
                                <DropdownMenuItem onClick={() => handleRefund(tx)}>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Refund
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleOpenDeleteDialog(tx)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Hapus
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Detail Transaksi</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => handlePrintInvoice()}
              >
                <Printer className="h-4 w-4" />
                Print Invoice
              </Button>
            </DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4" id="invoice-content">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Kode Transaksi</Label>
                  <p className="font-mono font-semibold">{selectedTransaction.transaction_code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Tanggal</Label>
                  <p>{(selectedTransaction.paid_at || selectedTransaction.created_at) ? format(new Date(selectedTransaction.paid_at || selectedTransaction.created_at!), "dd MMM yyyy HH:mm", { locale: idLocale }) : "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Pasien</Label>
                  <p>{selectedTransaction.patient?.full_name || "Walk-in"}</p>
                  {selectedTransaction.patient?.patient_code && (
                    <p className="text-xs text-muted-foreground font-mono">{selectedTransaction.patient.patient_code}</p>
                  )}
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <Badge className={cn("text-xs", getStatusBadge(selectedTransaction.payment_status).color)}>
                    {getStatusBadge(selectedTransaction.payment_status).label}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Transaction Items */}
              <div>
                <Label className="text-muted-foreground text-xs mb-2 block">Item Transaksi</Label>
                {detailLoading ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">Memuat item...</p>
                ) : selectedTransaction.items && selectedTransaction.items.length > 0 ? (
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Staff</TableHead>
                          <TableHead className="text-center">Qty</TableHead>
                          <TableHead className="text-right">Harga</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTransaction.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">
                                  {item.item_type === "service" 
                                    ? item.service?.name 
                                    : item.product?.name || "-"}
                                </p>
                                <Badge variant="outline" className="text-[10px] mt-0.5">
                                  {item.item_type === "service" ? "Layanan" : "Produk"}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-xs space-y-0.5">
                                {item.doctor && <p>Dr. {(item.doctor as any)?.full_name}</p>}
                                {item.therapist && <p>Th. {(item.therapist as any)?.full_name}</p>}
                                {!item.doctor && !item.therapist && <span className="text-muted-foreground">-</span>}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right text-sm">{formatPrice(Number(item.unit_price))}</TableCell>
                            <TableCell className="text-right font-medium text-sm">{formatPrice(Number(item.total_price))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground py-2">Tidak ada item</p>
                )}
              </div>

              <Separator />

              {/* Payment Summary */}
              <div>
                <Label className="text-muted-foreground text-xs">Ringkasan Pembayaran</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(Number(selectedTransaction.subtotal || 0))}</span>
                  </div>
                  {Number(selectedTransaction.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-destructive">
                      <span>Diskon ({selectedTransaction.discount_type === "percentage" ? "%" : "Rp"})</span>
                      <span>-{formatPrice(Number(selectedTransaction.discount_amount || 0))}</span>
                    </div>
                  )}
                  {Number(selectedTransaction.tax_amount || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pajak</span>
                      <span>{formatPrice(Number(selectedTransaction.tax_amount || 0))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg border-t pt-2">
                    <span>Total</span>
                    <span>{formatPrice(Number(selectedTransaction.total_amount || 0))}</span>
                  </div>
                </div>
              </div>

              {selectedTransaction.payment_method && (
                <div>
                  <Label className="text-muted-foreground text-xs">Metode Pembayaran</Label>
                  <p className="capitalize">{PAYMENT_METHODS.find((m) => m.value === selectedTransaction.payment_method)?.label || selectedTransaction.payment_method}</p>
                </div>
              )}

              {selectedTransaction.paid_at && (
                <div>
                  <Label className="text-muted-foreground text-xs">Dibayar Pada</Label>
                  <p>{format(new Date(selectedTransaction.paid_at), "dd MMM yyyy HH:mm", { locale: idLocale })}</p>
                </div>
              )}

              {selectedTransaction.notes && (
                <div>
                  <Label className="text-muted-foreground text-xs">Catatan</Label>
                  <p className="text-sm">{selectedTransaction.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <div className="space-y-4">
              <div>
                <Label>Jumlah yang Harus Dibayar</Label>
                <p className="text-2xl font-bold text-primary">
                  {formatPrice(Number(selectedTransaction.total_amount || 0))}
                </p>
              </div>
              <div>
                <Label>Metode Pembayaran</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method.value} value={method.value}>
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                  Batal
                </Button>
                <Button onClick={handleConfirmPayment} disabled={updatePaymentStatus.isPending}>
                  {updatePaymentStatus.isPending ? "Memproses..." : "Konfirmasi Bayar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Transaksi{" "}
              <strong>{selectedTransaction?.transaction_code}</strong> akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTransaction.isPending ? "Menghapus..." : "Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
