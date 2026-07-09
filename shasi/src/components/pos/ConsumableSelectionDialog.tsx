import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Package } from "lucide-react";
import { useState } from "react";
import type { ConsumableGroup } from "@/types/consumable_group";

interface Props {
  open: boolean;
  serviceName: string;
  groups: ConsumableGroup[];
  // Called with the product_id selected per group, keyed by group_id.
  // Empty means user confirmed "no selection" (will skip stock deduction).
  onConfirm: (selections: Record<string, { productId: string; productName: string }>) => void;
  onCancel: () => void;
}

/**
 * ConsumableSelectionDialog
 *
 * Shown when a cashier adds a service that has consumable groups.
 * For each group the cashier must pick one alternative product to consume.
 * If any alternative has stock = 0 it is shown in red and cannot be selected.
 * Cashier must select one product per group before confirming.
 */
export function ConsumableSelectionDialog({
  open,
  serviceName,
  groups,
  onConfirm,
  onCancel,
}: Props) {
  // selections[groupId] = { productId, productName }
  const [selections, setSelections] = useState<
    Record<string, { productId: string; productName: string }>
  >({});

  // Groups that have at least one item to choose from
  const applicableGroups = groups.filter((g) => g.items.length > 0);

  const allSelected = applicableGroups.every((g) => !!selections[g.id]);

  const handleSelect = (
    groupId: string,
    productId: string,
    productName: string
  ) => {
    setSelections((prev) => ({
      ...prev,
      [groupId]: { productId, productName },
    }));
  };

  const handleConfirm = () => {
    onConfirm(selections);
    setSelections({});
  };

  const handleCancel = () => {
    setSelections({});
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleCancel()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Pilih Produk Habis Pakai
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium">{serviceName}</span> membutuhkan produk
            berikut. Pilih alternatif yang tersedia untuk setiap kebutuhan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
          {applicableGroups.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Tidak ada produk habis pakai yang perlu dipilih.
            </p>
          )}

          {applicableGroups.map((group) => {
            const selected = selections[group.id];
            return (
              <div key={group.id} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">{group.name}</p>
                  <Badge variant="outline" className="text-xs">
                    {group.quantity_used} unit/sesi
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  {group.items.map((item, idx) => {
                    const outOfStock = (item.current_stock ?? 0) <= 0;
                    const isSelected = selected?.productId === item.product_id;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={outOfStock}
                        onClick={() =>
                          !outOfStock &&
                          handleSelect(group.id, item.product_id, item.product_name ?? "")
                        }
                        className={[
                          "w-full flex items-center gap-3 px-3 py-2 rounded-md border text-sm transition-colors text-left",
                          isSelected
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : outOfStock
                            ? "border-destructive/30 bg-destructive/5 text-muted-foreground cursor-not-allowed opacity-60"
                            : "border-input hover:bg-muted cursor-pointer",
                        ].join(" ")}
                      >
                        <span className="w-5 text-center text-muted-foreground text-xs shrink-0">
                          {idx + 1}.
                        </span>
                        <span className="flex-1">{item.product_name}</span>
                        {item.product_unit && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {item.product_unit}
                          </span>
                        )}
                        {idx === 0 && !outOfStock && (
                          <Badge
                            variant="secondary"
                            className="text-xs bg-green-100 text-green-700 shrink-0"
                          >
                            Prioritas
                          </Badge>
                        )}
                        <Badge
                          variant={outOfStock ? "destructive" : "outline"}
                          className="text-xs shrink-0"
                        >
                          stok: {item.current_stock ?? 0}
                        </Badge>
                        {outOfStock && (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {group.items.every((i) => (i.current_stock ?? 0) <= 0) && (
                  <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded p-2">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Semua alternatif untuk <b>{group.name}</b> habis. Restok terlebih dahulu
                      atau transaksi tidak dapat diproses.
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleCancel}>
            Batal
          </Button>
          <Button type="button" disabled={!allSelected && applicableGroups.length > 0} onClick={handleConfirm}>
            Konfirmasi Pilihan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
