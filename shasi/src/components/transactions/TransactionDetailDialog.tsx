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
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-medium">
                        Rp {Number(item.total_price).toLocaleString("id-ID")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.quantity} x Rp {Number(item.unit_price).toLocaleString("id-ID")}
                      </p>
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

export function printTransactionReceipt(
  transaction: TransactionWithRelations,
  settings: ClinicSettings
) {
  const headerTitle = settings.invoice_header_title || settings.clinic_name || "Clinic";
  const headerDescription = settings.invoice_header_description || "";
  const footerText = settings.invoice_footer_text || "Thank you for your visit";

  const itemsHtml = transaction.items
    ?.map((item) => {
      const name = item.service?.name || item.product?.name || "—";
      const staff = [item.doctor?.full_name, item.therapist?.full_name]
        .filter(Boolean)
        .join(" / ");
      return `
        <tr>
          <td>
            ${name}<br/>
            <small>${item.quantity} x Rp ${Number(item.unit_price).toLocaleString("id-ID")}${staff ? " — " + staff : ""}</small>
          </td>
          <td style="text-align:right">Rp ${Number(item.total_price).toLocaleString("id-ID")}</td>
        </tr>
      `;
    })
    .join("") || "";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Receipt ${transaction.transaction_code}</title>
        <style>
          body { font-family: sans-serif; padding: 16px; max-width: 320px; margin: 0 auto; font-size: 13px; }
          .center { text-align: center; }
          .header { margin-bottom: 12px; }
          .header h2 { margin: 0; font-size: 16px; }
          .header p { margin: 2px 0; }
          .line { border-top: 1px dashed #000; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; }
          td { vertical-align: top; padding: 4px 0; }
          .right { text-align: right; }
          .footer { margin-top: 12px; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header center">
          <h2>${escapeHtml(headerTitle)}</h2>
          ${headerDescription ? `<p>${escapeHtml(headerDescription)}</p>` : ""}
          ${settings.address ? `<p>${escapeHtml(settings.address)}</p>` : ""}
          ${settings.phone ? `<p>${escapeHtml(settings.phone)}</p>` : ""}
        </div>
        <div class="line"></div>
        <p><strong>Receipt:</strong> ${transaction.transaction_code}</p>
        <p><strong>Date:</strong> ${transaction.paid_at ? format(new Date(transaction.paid_at), "dd MMM yyyy HH:mm") : format(new Date(transaction.created_at), "dd MMM yyyy HH:mm")}</p>
        <p><strong>Patient:</strong> ${transaction.patient?.full_name ? escapeHtml(transaction.patient.full_name) : "—"}</p>
        <div class="line"></div>
        <table>
          <tbody>${itemsHtml}</tbody>
        </table>
        <div class="line"></div>
        <p class="right"><strong>Subtotal:</strong> Rp ${Number(transaction.subtotal).toLocaleString("id-ID")}</p>
        ${transaction.tax_amount > 0 ? `<p class="right"><strong>Tax:</strong> Rp ${Number(transaction.tax_amount).toLocaleString("id-ID")}</p>` : ""}
        ${(transaction.discount_amount ?? 0) > 0 ? `<p class="right"><strong>Discount:</strong> -Rp ${Number(transaction.discount_amount).toLocaleString("id-ID")}</p>` : ""}
        <p class="right"><strong>Total:</strong> Rp ${Number(transaction.total_amount).toLocaleString("id-ID")}</p>
        <p class="right"><strong>Payment:</strong> ${transaction.payment_method ? transaction.payment_method : "—"}</p>
        <div class="line"></div>
        <div class="footer center">
          <p>${escapeHtml(footerText)}</p>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
