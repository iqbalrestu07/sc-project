import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, RefreshCw, History, Tag, ClipboardList, CheckCircle2, X, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { TabsContent } from "@/components/ui/tabs";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { useConsumableUsageLogs } from "@/hooks/useConsumableItems";
import type { ConsumableUsageFilters } from "@/types/consumable";
import { USAGE_PURPOSES } from "@/types/consumable";
import { formatDateSafe, purposeLabel, purposeBadgeVariant } from "./components/Helpers";
import type { Product } from "@/types/product";

interface HistoryTabProps { consumableProducts: Product[]; }

export function HistoryTab({ consumableProducts }: HistoryTabProps) {
  const [historyFilters, setHistoryFilters] = useState<ConsumableUsageFilters>({});
  const [tempFilters, setTempFilters] = useState<ConsumableUsageFilters>({});

  const {
    data: usageLogs = [],
    isLoading: logsLoading,
    isError: logsError,
    refetch,
  } = useConsumableUsageLogs(historyFilters);

  const hasFilters = Object.values(historyFilters).some(Boolean);

  function applyFilters() {
    setHistoryFilters({ ...tempFilters });
  }

  function clearFilters() {
    setTempFilters({});
    setHistoryFilters({});
  }

  return (
    <div className="space-y-4">
      {/* Filter panel */}
      <Card className="border-dashed">
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
            <span>Filter Riwayat</span>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Hapus filter
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Product filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Produk</Label>
              <Select
                value={tempFilters.productId ?? "all"}
                onValueChange={(v) =>
                  setTempFilters((f) => ({ ...f, productId: v === "all" ? undefined : v }))
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Semua produk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua produk</SelectItem>
                  {consumableProducts.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Purpose filter */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Tujuan</Label>
              <Select
                value={tempFilters.purpose ?? "all"}
                onValueChange={(v) =>
                  setTempFilters((f) => ({
                    ...f,
                    purpose: v === "all" ? undefined : (v as any),
                  }))
                }
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Semua tujuan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua tujuan</SelectItem>
                  {USAGE_PURPOSES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* From date */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Dari Tanggal
              </Label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={tempFilters.from ?? ""}
                onChange={(e) =>
                  setTempFilters((f) => ({
                    ...f,
                    from: e.target.value || undefined,
                  }))
                }
              />
            </div>

            {/* To date */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Sampai Tanggal
              </Label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={tempFilters.to ?? ""}
                onChange={(e) =>
                  setTempFilters((f) => ({
                    ...f,
                    to: e.target.value || undefined,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end mt-3">
            <Button
              id="btn-apply-filters"
              size="sm"
              onClick={applyFilters}
              className="gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Terapkan Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {logsError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Gagal memuat riwayat pemakaian.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="ml-3 h-7 gap-1.5"
            >
              <RefreshCw className="h-3 w-3" />
              Coba lagi
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* History table */}
      {!logsError && (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal &amp; Waktu</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead className="text-center">Jumlah</TableHead>
                  <TableHead>Tujuan</TableHead>
                  <TableHead>Konteks</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      Memuat riwayat...
                    </TableCell>
                  </TableRow>
                ) : usageLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center gap-3 text-muted-foreground">
                        <History className="h-10 w-10 opacity-30" />
                        <div>
                          <p className="font-medium">
                            Belum ada riwayat pemakaian
                          </p>
                          <p className="text-sm">
                            {hasFilters
                              ? "Tidak ada data untuk filter yang dipilih"
                              : "Riwayat akan muncul setelah Anda mencatat pemakaian"}
                          </p>
                        </div>
                        {hasFilters && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={clearFilters}
                          >
                            Hapus filter
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  usageLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm whitespace-nowrap">
                        <div className="font-medium">
                          {formatDateSafe(log.created_at, "dd MMM yyyy HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{log.product_name}</div>
                        <div className="text-xs text-muted-foreground">
                          Sisa: {log.current_stock} {log.product_unit}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        <span className="text-rose-700">
                          -
                          {log.quantity % 1 === 0
                            ? log.quantity
                            : log.quantity.toFixed(3)}
                        </span>
                        <span className="font-normal text-muted-foreground text-xs ml-1">
                          {log.product_unit}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={purposeBadgeVariant(log.usage_purpose)}
                          className="text-xs"
                        >
                          {purposeLabel(log.usage_purpose)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.patient_name || log.service_name ? (
                          <div>
                            {log.patient_name && (
                              <div className="text-xs">
                                Pasien: {log.patient_name}
                              </div>
                            )}
                            {log.service_name && (
                              <div className="text-xs text-muted-foreground">
                                Layanan: {log.service_name}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[180px]">
                        {log.notes ? (
                          <span
                            className="truncate block"
                            title={log.notes}
                          >
                            {log.notes}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}