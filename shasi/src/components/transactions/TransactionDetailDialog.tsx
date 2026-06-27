import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Printer, Loader2 } from "lucide-react";
import { useTransactions } from "@/hooks/useTransactions";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import type { TransactionWithRelations } from "@/types/transaction";
import type { ClinicSettings } from "@/hooks/useClinicSettings";

interface TransactionDetailDialogProps {
  transactionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailDialog({
  transactionId,
  open,
  onOpenChange,
}: TransactionDetailDialogProps) {
  const { fetchTransactionDetail } = useTransactions();
  const { settings } = useClinicSettings();
  const [transaction, setTransaction] = useState<TransactionWithRelations | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && transactionId) {
      setLoading(true);
      fetchTransactionDetail(transactionId)
        .then(setTransaction)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setTransaction(null);
    }
  }, [open, transactionId, fetchTransactionDetail]);

  const handlePrint = () => {
    if (!transaction || !settings) return;
    printTransactionReceipt(transaction, settings);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span>Transaction {transaction?.transaction_code || ""}</span>
            {transaction && (
              <Badge variant={transaction.payment_status === "paid" ? "default" : "secondary"} className="capitalize">
                {transaction.payment_status}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !transaction ? (
          <div className="py-12 text-center text-muted-foreground">
            Transaction not found.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Patient</p>
                <p className="font-medium">{transaction.patient?.full_name || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">
                  {transaction.paid_at
                    ? format(new Date(transaction.paid_at), "dd MMM yyyy, HH:mm")
                    : format(new Date(transaction.created_at), "dd MMM yyyy, HH:mm")}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Method</p>
                <p className="font-medium capitalize">{transaction.payment_method || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-medium">
                  Rp {Number(transaction.total_amount).toLocaleString("id-ID")}
                </p>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium">Items</h4>
              {transaction.items?.map((item) => {
                const staff = [item.doctor?.full_name, item.therapist?.full_name]
                  .filter(Boolean)
                  .join(" · ");
                const hasItemDiscount = (item.discount_amount ?? 0) > 0;
                const grossPrice = item.unit_price * item.quantity;
                return (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 text-sm rounded-lg border p-3"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">
                        {item.service?.name || item.product?.name || "—"}
                        <span className="text-muted-foreground font-normal ml-2 capitalize">
                          ({item.item_type})
                        </span>
                      </p>
                      {staff && (
                        <p className="text-xs text-muted-foreground">Handled by: {staff}</p>
                      )}
                      {hasItemDiscount && (
                        <p className="text-xs text-destructive">
                          Diskon{" "}
                          {item.discount_type === "percentage"
                            ? `${item.discount_amount}%`
                            : `Rp ${Number(item.discount_amount).toLocaleString("id-ID")}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium">
                        Rp {Number(item.total_price).toLocaleString("id-ID")}
                      </p>
                      {hasItemDiscount ? (
                        <p className="text-xs text-muted-foreground line-through">
                          Rp {Number(grossPrice).toLocaleString("id-ID")}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          {item.quantity} x Rp {Number(item.unit_price).toLocaleString("id-ID")}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <Separator />

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rp {Number(transaction.subtotal).toLocaleString("id-ID")}</span>
              </div>
              {transaction.tax_amount > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>Rp {Number(transaction.tax_amount).toLocaleString("id-ID")}</span>
                </div>
              )}
              {(transaction.discount_amount ?? 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Discount</span>
                  <span>-Rp {Number(transaction.discount_amount).toLocaleString("id-ID")}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-semibold pt-2 border-t">
                <span>Total</span>
                <span>Rp {Number(transaction.total_amount).toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handlePrint} className="gap-2">
                <Printer className="h-4 w-4" />
                Print Receipt
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Print a thermal receipt for a PO 58mm printer.
 * Paper width  : 58 mm
 * Print area   : 48 mm  (5 mm margins each side)
 * Font         : Courier New / monospace — fixed-width characters align cleanly
 * Font size    : 9–10 px — fits ~32 chars per line at 48 mm
 * @page rule   : size 58mm auto — eliminates browser-added margins and
 *               forces the correct paper size when printing to a thermal driver.
 */
export function printTransactionReceipt(
  transaction: TransactionWithRelations,
  settings: ClinicSettings
) {
  const headerTitle = settings.invoice_header_title || settings.clinic_name || "Klinik";
  const headerDescription = settings.invoice_header_description || "";
  const footerText = settings.invoice_footer_text || "Terima kasih atas kunjungan Anda!";
  const fmt = (n: number) => `Rp ${Number(n).toLocaleString("id-ID")}`;

  // Build item rows — each item gets name, qty x price, optional staff & item discount
  const itemsHtml = (transaction.items ?? []).map((item) => {
    const name = escapeHtml(item.service?.name || item.product?.name || "—");
    const staff = [item.doctor?.full_name, item.therapist?.full_name]
      .filter(Boolean)
      .map(escapeHtml)
      .join(" / ");
    const gross = item.unit_price * item.quantity;
    const hasItemDisc = (item.discount_amount ?? 0) > 0;
    const discLabel = hasItemDisc
      ? item.discount_type === "percentage"
        ? `Disc ${item.discount_amount}%`
        : `Disc -${fmt(item.discount_amount!)}`
      : "";

    return `
      <tr>
        <td colspan="2" style="padding:3px 0 0;">
          <span style="font-weight:700;">${name}</span>
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 1px;font-size:9px;color:#444;">
          ${item.quantity}x ${fmt(item.unit_price)}${staff ? `<br>${staff}` : ""}${discLabel ? `<br><span style="color:#c00;">${discLabel}</span>` : ""}
        </td>
        <td style="padding:0 0 1px;text-align:right;vertical-align:bottom;font-weight:600;">
          ${hasItemDisc ? `<span style="text-decoration:line-through;color:#999;font-size:8px;">${fmt(gross)}</span><br>` : ""}${fmt(item.total_price)}
        </td>
      </tr>`;
  }).join("");

  // Header description — line breaks preserved
  const headerDescHtml = headerDescription
    .split("\n")
    .map((l) => `<p>${escapeHtml(l)}</p>`)
    .join("");

  const footerHtml = footerText
    .split("\n")
    .map((l) => `<p>${escapeHtml(l)}</p>`)
    .join("");

  const txDate = transaction.paid_at
    ? format(new Date(transaction.paid_at), "dd/MM/yyyy HH:mm")
    : format(new Date(transaction.created_at), "dd/MM/yyyy HH:mm");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Struk ${transaction.transaction_code}</title>
  <style>
    /* ── Page setup: 58mm paper, zero browser margins ── */
    @page {
      size: 58mm auto;
      margin: 0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Courier New', Courier, monospace;
      font-size: 10px;
      color: #000;
      width: 48mm;           /* print area (58mm - 5mm each side) */
      margin: 0 auto;
      padding: 3mm 0 4mm;
      line-height: 1.35;
    }

    /* ── Layout helpers ── */
    .center  { text-align: center; }
    .right   { text-align: right; }
    .bold    { font-weight: 700; }
    .divider { border-top: 1px dashed #000; margin: 3px 0; }

    /* ── Header ── */
    .header h2 { font-size: 13px; font-weight: 700; margin-bottom: 2px; }
    .header p  { font-size: 9px; margin: 1px 0; }

    /* ── Meta (receipt no / date / patient) ── */
    .meta      { font-size: 9px; margin: 1px 0; }

    /* ── Items table ── */
    table { width: 100%; border-collapse: collapse; }
    td    { vertical-align: top; font-size: 10px; }

    /* ── Summary rows ── */
    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      padding: 1px 0;
    }
    .summary-row.total {
      font-size: 12px;
      font-weight: 700;
      border-top: 1px dashed #000;
      padding-top: 3px;
      margin-top: 2px;
    }
    .summary-row.disc { color: #c00; }

    /* ── Footer ── */
    .footer    { margin-top: 5px; }
    .footer p  { font-size: 9px; margin: 1px 0; }
    .print-ts  { font-size: 8px; color: #666; margin-top: 3px; }

    /* ── Print-only: auto-trigger, hide scrollbar ── */
    @media print {
      body { width: 48mm; }
    }
  </style>
</head>
<body>

  <div class="header center">
    <h2>${escapeHtml(headerTitle)}</h2>
    ${headerDescHtml}
    ${settings.address ? `<p>${escapeHtml(settings.address)}</p>` : ""}
    ${settings.phone ? `<p>Telp: ${escapeHtml(settings.phone)}</p>` : ""}
  </div>

  <div class="divider"></div>

  <p class="meta">No : ${transaction.transaction_code}</p>
  <p class="meta">Tgl: ${txDate}</p>
  <p class="meta">Px : ${escapeHtml(transaction.patient?.full_name ?? "Walk-in")}</p>

  <div class="divider"></div>

  <table><tbody>${itemsHtml}</tbody></table>

  <div class="divider"></div>

  <div class="summary-row">
    <span>Subtotal</span><span>${fmt(transaction.subtotal)}</span>
  </div>
  ${(transaction.discount_amount ?? 0) > 0
    ? `<div class="summary-row disc">
        <span>Diskon</span><span>-${fmt(transaction.discount_amount!)}</span>
       </div>`
    : ""}
  ${transaction.tax_amount > 0
    ? `<div class="summary-row">
        <span>Pajak</span><span>${fmt(transaction.tax_amount)}</span>
       </div>`
    : ""}
  <div class="summary-row total">
    <span>TOTAL</span><span>${fmt(transaction.total_amount)}</span>
  </div>
  ${transaction.payment_method
    ? `<div class="summary-row">
        <span>Bayar</span><span style="text-transform:capitalize;">${escapeHtml(transaction.payment_method)}</span>
       </div>`
    : ""}

  <div class="divider"></div>

  <div class="footer center">
    ${footerHtml}
    <p class="print-ts">Dicetak: ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
  </div>

  <script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;

  const win = window.open("", "_blank", "width=300,height=600");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
