import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { USAGE_PURPOSES } from "@/types/consumable";

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function formatDateSafe(dateString: string | undefined | null, formatStr: string): string {
  if (!dateString) return "—";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "—";
    return format(d, formatStr, { locale: idLocale });
  } catch (e) {
    return "—";
  }
}

export function purposeLabel(purpose: string) {
  return USAGE_PURPOSES.find((p) => p.value === purpose)?.label ?? purpose;
}

export function purposeBadgeVariant(
  purpose: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (purpose) {
    case "waste":
      return "destructive";
    case "treatment":
    case "appointment":
      return "default";
    case "internal":
      return "secondary";
    default:
      return "outline";
  }
}

export function StockBadge({
  current,
  minimum,
}: {
  current: number;
  minimum: number;
}) {
  if (current === 0)
    return <Badge variant="destructive">Habis</Badge>;
  if (current <= minimum)
    return (
      <Badge
        variant="secondary"
        className="bg-amber-100 text-amber-800 border-amber-200"
      >
        Stok Rendah
      </Badge>
    );
  return (
    <Badge
      variant="outline"
      className="text-emerald-700 border-emerald-300 bg-emerald-50"
    >
      Aman
    </Badge>
  );
}