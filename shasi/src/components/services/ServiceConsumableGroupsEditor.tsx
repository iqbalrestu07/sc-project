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

  // Only consumable products are selectable as alternatives
  const consumableProducts = products.filter((p) => p.is_consumable);

  // ── Add group form state ──────────────────────────────────────────────────
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupQty, setNewGroupQty] = useState<number>(1);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    await mutations.createGroup.mutateAsync({ name: newGroupName.trim(), quantity_used: newGroupQty });
    setNewGroupName("");
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
            Produk yang dikonsumsi saat tindakan ini dilakukan. Kasir akan memilih alternatif yang tersedia.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setShowAddGroup((v) => !v)}
        >
          <Plus className="h-3.5 w-3.5" />
          Tambah Kebutuhan
        </Button>
      </div>

      {/* Add group inline form */}
      {showAddGroup && (
        <div className="border rounded-lg p-3 bg-muted/30 space-y-2">
          <p className="text-xs font-medium">Kebutuhan baru</p>
          <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Nama kebutuhan</label>
              <Input
                placeholder='Contoh: "Masker wajah", "Serum"'
                className="h-8 text-xs"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
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
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              className="h-7 text-xs"
              disabled={!newGroupName.trim() || mutations.createGroup.isPending}
              onClick={handleCreateGroup}
            >
              Simpan
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setShowAddGroup(false)}
            >
              Batal
            </Button>
          </div>
        </div>
      )}

      {groups.length === 0 && !showAddGroup && (
        <div className="border border-dashed rounded-lg p-4 text-center">
          <Package className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
          <p className="text-xs text-muted-foreground">
            Belum ada kebutuhan konsumabel. Klik "Tambah Kebutuhan" untuk mulai.
          </p>
        </div>
      )}

      {/* List of groups */}
      {groups.map((group) => (
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
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [editQty, setEditQty] = useState(group.quantity_used);
  const [selectedProduct, setSelectedProduct] = useState("");

  const usedProductIds = new Set(group.items.map((i) => i.product_id));
  const availableProducts = consumableProducts.filter((p) => !usedProductIds.has(p.id));

  const handleSaveEdit = async () => {
    await mutations.updateGroup.mutateAsync({ groupId: group.id, name: editName, quantity_used: editQty });
    setEditing(false);
  };

  const handleAddItem = async () => {
    if (!selectedProduct) return;
    await mutations.addItem.mutateAsync({
      groupId: group.id,
      product_id: selectedProduct,
      priority: group.items.length,
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

        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <Input
              className="h-7 text-xs flex-1"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <Input
              type="number"
              min={0.001}
              step={0.5}
              className="h-7 text-xs w-20"
              value={editQty}
              onChange={(e) => setEditQty(Number(e.target.value))}
            />
            <Button type="button" size="sm" className="h-7 text-xs" onClick={handleSaveEdit}
              disabled={mutations.updateGroup.isPending}>
              Simpan
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs"
              onClick={() => { setEditing(false); setEditName(group.name); setEditQty(group.quantity_used); }}>
              Batal
            </Button>
          </div>
        ) : (
          <>
            <span className="text-sm font-medium flex-1">{group.name}</span>
            <Badge variant="outline" className="text-xs">
              {group.quantity_used} unit/sesi
            </Badge>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground ml-1"
              onClick={() => setEditing(true)}
            >
              Edit
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
          {group.items.length === 0 && (
            <p className="text-xs text-muted-foreground italic">
              Belum ada produk alternatif. Tambahkan di bawah.
            </p>
          )}
          {group.items.map((item, idx) => (
            <div key={item.id} className="flex items-center gap-2 text-xs">
              <span className="w-5 text-center text-muted-foreground">{idx + 1}.</span>
              <span className="flex-1 font-medium">{item.product_name}</span>
              <span className="text-muted-foreground">{item.product_unit}</span>
              <Badge
                variant={
                  (item.current_stock ?? 0) <= 0 ? "destructive" :
                  (item.current_stock ?? 0) <= 5 ? "secondary" : "outline"
                }
                className="text-xs"
              >
                stok: {item.current_stock ?? 0}
              </Badge>
              {idx === 0 && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  Prioritas
                </Badge>
              )}
              <button
                type="button"
                onClick={() => mutations.deleteItem.mutateAsync(item.id)}
                className="text-destructive hover:opacity-70"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}

          {/* Add alternative product */}
          {availableProducts.length > 0 && (
            <>
              <Separator className="my-1" />
              <div className="flex items-center gap-2">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="h-7 text-xs flex-1">
                    <SelectValue placeholder="Tambah produk alternatif..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProducts.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}{p.unit ? ` (${p.unit})` : ""} — stok: {p.current_stock ?? 0}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={!selectedProduct || mutations.addItem.isPending}
                  onClick={handleAddItem}
                >
                  <Plus className="h-3 w-3" />
                  Tambah
                </Button>
              </div>
            </>
          )}
          {availableProducts.length === 0 && consumableProducts.length > 0 && (
            <p className="text-xs text-muted-foreground italic">
              Semua produk konsumabel sudah ditambahkan.
            </p>
          )}
          {consumableProducts.length === 0 && (
            <p className="text-xs text-amber-600">
              Belum ada produk bertipe "Habis Pakai". Tandai produk sebagai habis pakai di halaman Products terlebih dahulu.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
