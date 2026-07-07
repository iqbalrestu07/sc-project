import { useState, useRef, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Loader2,
  Info,
  RotateCcw,
} from "lucide-react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { apiClient } from "@/integrations/api/client";
import { API_ENDPOINTS } from "@/integrations/api/endpoints";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImportResult {
  processed: number;
  created: number;
  updated: number;
  failed: number;
  errors?: string[];
}

async function importExcel(file: File): Promise<{ success: boolean; message: string; data: ImportResult }> {
  const formData = new FormData();
  formData.append("file", file);
  return apiClient.postForm(API_ENDPOINTS.MIGRATION.IMPORT_EXCEL, formData);
}

// ─── Template Download Helper ─────────────────────────────────────────────────
function downloadTemplate() {
  const headers = ["nama", "jenis", "harga", "komisi", "modal"];
  const examples = [
    ["Facial Brightening", "tindakan", "150000", "15000", ""],
    ["Serum Vitamin C", "product", "120000", "", "65000"],
    ["Handuk Kecil", "barang habis pakai", "25000", "", "12000"],
    ["Peeling Acne", "tindakan", "200000", "20000", ""],
    ["Masker Kolagen", "product", "85000", "", "40000"],
  ];
  const csvContent = [headers, ...examples].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-import.csv";
  link.click();
  URL.revokeObjectURL(url);
}

const JENIS_INFO = [
  {
    label: "tindakan",
    color: "bg-violet-100 text-violet-800 border-violet-200",
    desc: "Ditambahkan sebagai Layanan (Treatment/Service)",
    icon: "💆",
    fields: "nama, harga, komisi",
  },
  {
    label: "product",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    desc: "Ditambahkan sebagai Produk biasa",
    icon: "📦",
    fields: "nama, harga, modal",
  },
  {
    label: "barang habis pakai",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    desc: "Ditambahkan sebagai Produk dengan flag Habis Pakai",
    icon: "🧴",
    fields: "nama, harga, modal",
  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ImportExcel() {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: importExcel,
    onSuccess: (res) => {
      setResult(res.data);
      if (res.data.failed === 0) {
        toast.success("Import berhasil!", {
          description: `${res.data.created} data ditambahkan, ${res.data.updated} diperbarui.`,
        });
      } else {
        toast.warning("Import selesai dengan beberapa kegagalan", {
          description: `${res.data.failed} baris gagal diproses.`,
        });
      }
    },
    onError: (err: any) => {
      toast.error("Import gagal", {
        description: err?.message || "Terjadi kesalahan saat memproses file.",
      });
    },
  });

  const handleFile = useCallback((file: File) => {
    const validExts = /\.(xlsx|xls|csv)$/i;
    if (!validExts.test(file.name)) {
      toast.error("Format file tidak didukung", {
        description: "Gunakan file .xlsx, .xls, atau .csv",
      });
      return;
    }
    setSelectedFile(file);
    setResult(null);
    mutation.reset();
  }, [mutation]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleReset = () => {
    setSelectedFile(null);
    setResult(null);
    mutation.reset();
  };

  const total = result ? result.processed + result.failed : 0;
  const successRate = total > 0 ? Math.round((result!.processed / total) * 100) : 0;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Import Data Excel"
        description="Upload file Excel untuk menambahkan data produk, layanan, atau barang habis pakai secara massal"
      />

      {/* Info card */}
      <Card className="border-blue-100 bg-blue-50/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Format File yang Diterima
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {/* Column info */}
            <div>
              <p className="font-semibold text-blue-900 mb-2">Kolom yang dibutuhkan:</p>
              <div className="space-y-1.5">
                {[
                  { col: "nama", req: true, desc: "Nama item" },
                  { col: "jenis", req: true, desc: "Tipe data (lihat di bawah)" },
                  { col: "harga", req: true, desc: "Harga jual (angka/Rp)" },
                  { col: "komisi", req: false, desc: "Komisi tindakan" },
                  { col: "modal", req: false, desc: "Harga beli / HPP" },
                ].map((col) => (
                  <div key={col.col} className="flex items-center gap-2">
                    <code className="text-xs bg-white border border-blue-200 px-1.5 py-0.5 rounded font-mono text-blue-700 min-w-[60px]">
                      {col.col}
                    </code>
                    <span className={cn("text-xs", col.req ? "text-blue-700 font-medium" : "text-blue-500")}>
                      {col.desc}{col.req ? " *" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Jenis info */}
            <div className="col-span-2">
              <p className="font-semibold text-blue-900 mb-2">
                Nilai kolom{" "}
                <code className="text-xs bg-white border border-blue-200 px-1 rounded font-mono">jenis</code>:
              </p>
              <div className="space-y-2">
                {JENIS_INFO.map((j) => (
                  <div
                    key={j.label}
                    className={cn("flex items-start gap-2 p-2 rounded-md border", j.color)}
                  >
                    <span className="text-base leading-none mt-0.5">{j.icon}</span>
                    <div>
                      <code className="text-xs font-bold font-mono">{j.label}</code>
                      <p className="text-xs mt-0.5 opacity-80">{j.desc}</p>
                      <p className="text-xs mt-0.5 opacity-60">Kolom relevan: {j.fields}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2 border-t border-blue-100">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-100"
              onClick={downloadTemplate}
            >
              <Download className="h-4 w-4" />
              Download Template CSV
            </Button>
            <p className="text-xs text-blue-600">
              Jika nama sudah ada, data akan diperbarui (update). Jika belum ada, data baru akan dibuat (insert).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Upload area */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-10 text-center transition-all duration-200",
              mutation.isPending
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer",
              dragOver
                ? "border-primary bg-primary/5 scale-[1.01]"
                : selectedFile
                ? "border-green-400 bg-green-50"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
            )}
            onDragOver={(e) => { e.preventDefault(); if (!mutation.isPending) setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !mutation.isPending && fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleInputChange}
            />

            {selectedFile ? (
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <div className="bg-green-100 p-4 rounded-full">
                    <FileSpreadsheet className="h-10 w-10 text-green-600" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-green-700">{selectedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB · Siap untuk diimport
                  </p>
                </div>
                {!mutation.isPending && (
                  <p className="text-xs text-muted-foreground">Klik untuk mengganti file</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-center">
                  <div className="bg-muted p-4 rounded-full">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {dragOver ? "Lepaskan file di sini" : "Drag & drop file Excel di sini"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    atau klik untuk memilih · Format: .xlsx, .xls, .csv
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Loading progress */}
          {mutation.isPending && (
            <div className="space-y-2">
              <Progress value={undefined} className="h-1.5 animate-pulse" />
              <p className="text-sm text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Sedang memproses file...
              </p>
            </div>
          )}

          {/* Action buttons */}
          {selectedFile && !result && (
            <div className="flex gap-3">
              <Button
                className="flex-1 gap-2"
                onClick={() => mutation.mutate(selectedFile)}
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Memproses...</>
                ) : (
                  <><Upload className="h-4 w-4" />Import Sekarang</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={mutation.isPending}
              >
                Batal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Hasil Import</span>
              <Button variant="outline" size="sm" className="gap-2" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                Import File Baru
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Success rate bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tingkat keberhasilan</span>
                <span
                  className={cn(
                    "font-semibold",
                    successRate === 100
                      ? "text-green-600"
                      : successRate >= 70
                      ? "text-amber-600"
                      : "text-red-600"
                  )}
                >
                  {successRate}%
                </span>
              </div>
              <Progress value={successRate} className="h-2" />
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Diproses", value: result.processed, color: "text-foreground", bg: "bg-muted/50" },
                { label: "Baru Ditambahkan", value: result.created, color: "text-green-600", bg: "bg-green-50" },
                { label: "Diperbarui", value: result.updated, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Gagal", value: result.failed, color: "text-red-600", bg: "bg-red-50" },
              ].map((stat) => (
                <div key={stat.label} className={cn("p-4 rounded-lg text-center", stat.bg)}>
                  <p className={cn("text-3xl font-bold", stat.color)}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Success alert */}
            {result.failed === 0 && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-700">Import Selesai!</AlertTitle>
                <AlertDescription className="text-green-600">
                  Semua {result.processed} baris data berhasil diimport.
                  {result.created > 0 && ` ${result.created} data baru ditambahkan.`}
                  {result.updated > 0 && ` ${result.updated} data diperbarui.`}
                </AlertDescription>
              </Alert>
            )}

            {/* Partial success */}
            {result.failed > 0 && result.processed > 0 && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-700">Import Sebagian Berhasil</AlertTitle>
                <AlertDescription className="text-amber-600">
                  {result.processed} baris berhasil, {result.failed} baris gagal.
                </AlertDescription>
              </Alert>
            )}

            {/* Error list */}
            {result.errors && result.errors.length > 0 && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4" />
                  Detail Baris yang Gagal ({result.errors.length})
                </p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-red-400 shrink-0 font-mono">•</span>
                      <span className="text-red-700">{err}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
