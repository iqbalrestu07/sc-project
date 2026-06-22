import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarIcon, X } from "lucide-react";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { id } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

export type PeriodPreset = 
  | "today" 
  | "yesterday" 
  | "this_week" 
  | "last_week" 
  | "this_month" 
  | "last_month" 
  | "this_year" 
  | "custom" 
  | "all";

interface DateRangeFilterProps {
  value: { from: Date | undefined; to: Date | undefined; preset: PeriodPreset };
  onChange: (value: { from: Date | undefined; to: Date | undefined; preset: PeriodPreset }) => void;
  showPresets?: boolean;
  className?: string;
}

const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "all", label: "Semua Waktu" },
  { value: "today", label: "Hari Ini" },
  { value: "yesterday", label: "Kemarin" },
  { value: "this_week", label: "Minggu Ini" },
  { value: "last_week", label: "Minggu Lalu" },
  { value: "this_month", label: "Bulan Ini" },
  { value: "last_month", label: "Bulan Lalu" },
  { value: "this_year", label: "Tahun Ini" },
  { value: "custom", label: "Pilih Tanggal" },
];

export function getDateRangeFromPreset(preset: PeriodPreset): { from: Date | undefined; to: Date | undefined } {
  const now = new Date();
  
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday":
      const yesterday = subDays(now, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    case "this_week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) };
    case "last_week":
      const lastWeek = subDays(now, 7);
      return { from: startOfWeek(lastWeek, { weekStartsOn: 1 }), to: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
    case "this_month":
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case "last_month":
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    case "this_year":
      return { from: startOfYear(now), to: endOfYear(now) };
    case "all":
    case "custom":
    default:
      return { from: undefined, to: undefined };
  }
}

export function DateRangeFilter({ value, onChange, showPresets = true, className }: DateRangeFilterProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handlePresetChange = (preset: PeriodPreset) => {
    if (preset === "custom") {
      onChange({ from: undefined, to: undefined, preset: "custom" });
      setCalendarOpen(true);
    } else {
      const range = getDateRangeFromPreset(preset);
      onChange({ ...range, preset });
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    onChange({
      from: range?.from,
      to: range?.to,
      preset: "custom",
    });
  };

  const handleClear = () => {
    onChange({ from: undefined, to: undefined, preset: "all" });
  };

  const getDisplayText = () => {
    if (value.preset !== "custom" && value.preset !== "all") {
      return PERIOD_PRESETS.find((p) => p.value === value.preset)?.label || "Pilih periode";
    }
    if (value.from && value.to) {
      return `${format(value.from, "dd MMM yyyy", { locale: id })} - ${format(value.to, "dd MMM yyyy", { locale: id })}`;
    }
    if (value.from) {
      return `Dari ${format(value.from, "dd MMM yyyy", { locale: id })}`;
    }
    return "Semua Waktu";
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {showPresets && (
        <Select value={value.preset} onValueChange={(v) => handlePresetChange(v as PeriodPreset)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Pilih periode" />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_PRESETS.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {value.preset === "custom" && (
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal min-w-[200px]",
                !value.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value.from ? (
                value.to ? (
                  <>
                    {format(value.from, "dd MMM", { locale: id })} - {format(value.to, "dd MMM yyyy", { locale: id })}
                  </>
                ) : (
                  format(value.from, "dd MMM yyyy", { locale: id })
                )
              ) : (
                <span>Pilih tanggal</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={value.from}
              selected={{ from: value.from, to: value.to }}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              locale={id}
            />
            <div className="p-3 border-t flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  handleClear();
                  setCalendarOpen(false);
                }}
              >
                Reset
              </Button>
              <Button size="sm" onClick={() => setCalendarOpen(false)}>
                Terapkan
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {value.preset !== "all" && (
        <Button variant="ghost" size="icon" onClick={handleClear} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
