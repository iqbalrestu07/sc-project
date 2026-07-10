import { useState } from "react";
import { Plus, Trash2, ChevronDown, ChevronUp, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useConsumableGroups, useConsumableGroupMutations } from "@/hooks/useConsumableGroups";
import { useProducts } from "@/hooks/useProducts";
import type { ConsumableGroup } from "@/types/consumable_group";

interface Props {
  serviceId: string;
}

export function ServiceConsumableGroupsEditor({ serviceId }: Props) {
  const { data: groups = [], isLoading } = useConsumableGroups(serviceId);
  const mutations = useConsumableGroupMutations(serviceId);
  const { products } = useProducts();

  // Only consumable products can be the "primary" product of a group
  const consumableProducts = products.filter((p) => p.is_consumable);

  // IDs already used as group primaries — each product can only be a primary once
  const usedPrimaryIds = new Set((groups ?? []).map((g) => g.name)); // name stores product_id

  // ── Add group form state ──────────────────────────────────────────────────
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newPrimaryProductId, setNewPrimaryProductId] = useState("");
  const [newGroupQty, setNewGroupQty] = useState<number>(1);

  // Available primary products = consumable products not yet used as a group primary
  const availablePrimary = consumableProducts.filter((p) => !usedPrimaryIds.has(p.id));

  const selectedPrimary = consumableProducts.find((p) => p.id === newPrimaryProductId);

  const handleCreateGroup = async () => {
    if (!newPrimaryProductId) return;
    const primary = consumableProducts.find((p) => p.id === newPrimaryProductId);
    if (!primary) return;
    // Group name stores the primary product_id so we can resolve it later.
    // We display primary.name in the UI.
    await mutations.createGroup.mutateAsync({
      name: primary.id,            // ← store product_id as the group identifier
      quantity_used: newGroupQty,
    });
    // Immediately add the primary product as priority-0 item
    // (happens in a second call after we get the new group id via cache refetch)
    setNewPrimaryProductId("");
    setNewGroupQty(1);
    setShowAddGroup(false);
  };

  if (isLoading) {
    return <p className="text-xs text-muted-foreground">Memuat data konsumabel...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold">Kebutuhan Produk Habis Pakai</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Produk yang dikonsumsi saat tindakan ini dilakukan. Kasir memilih alternatif yang tersedia stoknya.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setShowAddGroup((v) => !v)}
          disabled={availablePrimary.length === 0 && !showAddGroup}
        >
          <Plus className="h-3.5 w-3.5" />
          Tambah Kebutuhan
        </Button>
      </div>

      {/* Add group inline form */}
      {showAddGroup && (
        <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Produk habis pakai baru</p>

          {availablePrimary.length === 0 ? (
            <p className="text-xs text-amber-600">
              Semua produk habis pakai sudah ditambahkan. Tandai produk baru sebagai
              "Habis Pakai" di halaman Products terlebih dahulu.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Produk habis pakai</label>
                  <Select value={newPrimaryProductId} onValueChange={setNewPrimaryProductId}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Pilih produk..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePrimary.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}{p.unit ? ` (${p.unit})` : ""} — stok: {p.current_stock ?? 0}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Qty / sesi</label>
                  <Input
                    type="number"
                    min={0.001}
                    step={0.5}
                    className="h-8 text-xs w-20"
                    value={newGroupQty}
                    onChange={(e) => setNewGroupQty(Number(e.target.value))}
                  />
                </div>
              </div>

              {selectedPrimary && (
                <p className="text-xs text-muted-foreground">
                  Produk ini akan menjadi pilihan utama. Kamu bisa tambah alternatif lain (setara)
                  setelah disimpan.
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!newPrimaryProductId || mutations.createGroup.isPending}
                  onClick={handleCreateGroup}
                >
                  Simpan
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => {
                    setShowAddGroup(false);
                    setNewPrimaryProductId("");
                    setNewGroupQty(1);
                  }}
                >
                  Batal
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {(groups ?? []).length === 0 && !showAddGroup && (
        <div className="border border-dashed rounded-lg p-4 text-center">
          <Package className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
          {consumableProducts.length === 0 ? (
            <p className="text-xs text-amber-600">
              Belum ada produk bertipe "Habis Pakai". Tandai produk sebagai habis pakai di halaman
              Products terlebih dahulu, lalu kembali ke sini.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Belum ada kebutuhan konsumabel. Klik "Tambah Kebutuhan" untuk mulai.
            </p>
          )}
        </div>
      )}

      {/* List of groups */}
      {(groups ?? []).map((group) => (
        <ConsumableGroupCard
          key={group.id}
          group={group}
          consumableProducts={consumableProducts}
          mutations={mutations}
        />
      ))}
    </div>
  );
}

// ─── Individual group card ────────────────────────────────────────────────────

function ConsumableGroupCard({
  group,
  consumableProducts,
  mutations,
}: {
  group: ConsumableGroup;
  consumableProducts: { id: string; name: string; current_stock?: number | null; unit?: string | null }[];
  mutations: ReturnType<typeof useConsumableGroupMutations>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [editQty, setEditQty] = useState(group.quantity_used);
  const [editingQty, setEditingQty] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");

  // group.name stores the primary product_id
  const primaryProduct = consumableProducts.find((p) => p.id === group.name);
  const displayName = primaryProduct?.name ?? group.name;

  // Defensive: items may be null/undefined from API when list is empty
  const items = group.items ?? [];

  const usedProductIds = new Set(items.map((i) => i.product_id));
  // Also exclude the primary product itself from the alternatives list
  const availableAlternatives = consumableProducts.filter(
    (p) => !usedProductIds.has(p.id)
  );

  const handleSaveQty = async () => {
    await mutations.updateGroup.mutateAsync({
      groupId: group.id,
      name: group.name, // keep name (= product_id) unchanged
      quantity_used: editQty,
    });
    setEditingQty(false);
  };

  const handleAddItem = async () => {
    if (!selectedProduct) return;
    await mutations.addItem.mutateAsync({
      groupId: group.id,
      product_id: selectedProduct,
      priority: items.length,
    });
    setSelectedProduct("");
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Group header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/20">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        <span className="text-sm font-medium flex-1">{displayName}</span>

        {editingQty ? (
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0.001}
              step={0.5}
              className="h-7 text-xs w-20"
              value={editQty}
              onChange={(e) => setEditQty(Number(e.target.value))}
            />
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              onClick={handleSaveQty}
              disabled={mutations.updateGroup.isPending}
            >
              Simpan
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => { setEditingQty(false); setEditQty(group.quantity_used); }}
            >
              Batal
            </Button>
          </div>
        ) : (
          <>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setEditingQty(true)}
            >
              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-muted">
                {group.quantity_used} unit/sesi ✎
              </Badge>
            </button>
            <button
              type="button"
              className="text-destructive hover:opacity-70 ml-1"
              onClick={() => mutations.deleteGroup.mutateAsync(group.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Group items */}
      {expanded && (
        <div className="p-3 space-y-2">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Belum ada produk alternatif. Stok dari produk utama ({displayName}) akan digunakan.
              Tambah alternatif di bawah jika ada produk lain yang setara.
            </p>
          )}
          {items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2 text-xs">
              <span className="w-5 text-center text-muted-foreground shrink-0">{idx + 1}.</span>
              <span className="flex-1 font-medium">{item.product_name}</span>
              {item.product_unit && (
                <span className="text-muted-foreground shrink-0">{item.product_unit}</span>
              )}
              <Badge
                variant={
                  (item.current_stock ?? 0) <= 0
                    ? "destructive"
                    : (item.current_stock ?? 0) <= 5
                    ? "secondary"
                    : "outline"
                }
                className="text-xs shrink-0"
              >
                stok: {item.current_stock ?? 0}
              </Badge>
              {idx === 0 && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 shrink-0">
                  Prioritas
                </Badge>
              )}
              <button
                type="button"
                onClick={() => mutations.deleteItem.mutateAsync(item.id)}
                className="text-destructive hover:opacity-70 shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Add alternative product */}
          {availableAlternatives.length > 0 && (
            <>
              <Separator className="my-1" />
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Tambah produk alternatif yang setara dengan {displayName}:
                </p>
                <div className="flex items-center gap-2">
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="h-7 text-xs flex-1">
                      <SelectValue placeholder="Pilih produk alternatif..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAlternatives.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}{p.unit ? ` (${p.unit})` : ""} — stok: {p.current_stock ?? 0}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    size="sm"
                    className="h-7 text-xs gap-1 shrink-0"
                    disabled={!selectedProduct || mutations.addItem.isPending}
                    onClick={handleAddItem}
                  >
                    <Plus className="h-3 w-3" />
                    Tambah
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
