import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Search,
  User,
  CreditCard,
  Banknote,
  ChevronsUpDown,
  Check,
  Printer,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { usePatients } from "@/hooks/usePatients";
import { useServices } from "@/hooks/useServices";
import { useProducts } from "@/hooks/useProducts";
import { useStaff } from "@/hooks/useStaff";
import { useTransactions } from "@/hooks/useTransactions";
import { useClinicSettings } from "@/hooks/useClinicSettings";
import { useConsumableGroups } from "@/hooks/useConsumableGroups";
import type { CartItem, PaymentMethod, TransactionWithRelations } from "@/types/transaction";
import { PAYMENT_METHODS } from "@/types/transaction";
import { toast } from "sonner";
import { printTransactionReceipt } from "@/components/transactions/TransactionDetailDialog";
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
import { ConsumableSelectionDialog } from "./ConsumableSelectionDialog";
import type { ConsumableGroup } from "@/types/consumable_group";

export function POSInterface() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [patientPopoverOpen, setPatientPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"services" | "products">("services");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [discount, setDiscount] = useState(0);
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">("fixed");
  const [showPrintPrompt, setShowPrintPrompt] = useState(false);
  const [completedTransaction, setCompletedTransaction] = useState<TransactionWithRelations | null>(null);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  // Consumable selection dialog state.
  // nonce changes every time a new service is added, ensuring useEffect fires even for repeated additions.
  const [pendingService, setPendingService] = useState<{
    itemId: string;
    name: string;
    unitPrice: number;
    nonce: number;
  } | null>(null);

  const patientsQuery = usePatients();
  const servicesQuery = useServices();
  const { products } = useProducts();
  const { doctors, therapists } = useStaff();
  const { createTransaction, updatePaymentStatus } = useTransactions();
  const { settings } = useClinicSettings();

  // Fetch consumable groups for the pending service (only when a service is being added)
  const {
    data: pendingServiceGroups = [],
    isLoading: pendingGroupsLoading,
  } = useConsumableGroups(pendingService?.itemId ?? null);

  const patients = patientsQuery.data?.data ?? [];
  const services = servicesQuery.data?.data ?? [];

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter((p) =>
    !p.is_consumable && p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Internal helper: actually push item into cart (called after consumable selection confirmed)
  const pushToCart = (
    type: "service" | "product",
    itemId: string,
    name: string,
    unitPrice: number,
    selectedConsumableProductId?: string,
    selectedConsumableProductName?: string
  ) => {
    const existingIndex = cart.findIndex(
      (item) => item.itemId === itemId && item.type === type
    );

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          type,
          itemId,
          name,
          unitPrice,
          quantity: 1,
          // Service items default to commission-eligible; product items never earn commission.
          commissionEligible: type === "service" ? true : undefined,
          selectedConsumableProductId,
          selectedConsumableProductName,
        },
      ]);
    }
  };

  const addToCart = (
    type: "service" | "product",
    itemId: string,
    name: string,
    unitPrice: number
  ) => {
    if (type === "service") {
      // Store as pending; once consumable groups load, the dialog opens (or we add directly if no groups)
      setPendingService({ itemId, name, unitPrice, nonce: Date.now() });
      return;
    }
    // Products go straight to cart
    pushToCart(type, itemId, name, unitPrice);
  };

  // Called when pendingServiceGroups loads and we need to decide what to do
  // This is done inside the render (see ConsumableSelectionDialog usage)
  const handleConsumableConfirm = (
    selections: Record<string, { productId: string; productName: string }>
  ) => {
    if (!pendingService) return;
    // For simplicity: use the first selection (we only support single-group selection per item currently)
    // Backend accepts only one selected_consumable_product_id per item
    const firstKey = Object.keys(selections)[0];
    const sel = firstKey ? selections[firstKey] : undefined;
    pushToCart(
      "service",
      pendingService.itemId,
      pendingService.name,
      pendingService.unitPrice,
      sel?.productId,
      sel?.productName
    );
    setPendingService(null);
  };

  const handleConsumableCancel = () => {
    setPendingService(null);
  };

  // Auto-add service to cart when it has no consumable groups (after groups finish loading)
  useEffect(() => {
    if (!pendingService || pendingGroupsLoading) return;
    const hasGroups = (pendingServiceGroups as ConsumableGroup[]).some((g) => g.items.length > 0);
    if (!hasGroups) {
      pushToCart("service", pendingService.itemId, pendingService.name, pendingService.unitPrice);
      setPendingService(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingService, pendingGroupsLoading, pendingServiceGroups]);

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(1, item.quantity + delta) }
            : item
        )
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateCartItemStaff = (
    id: string,
    field: "doctorId" | "therapistId",
    value: string,
    staffName?: string
  ) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value || undefined,
              [field === "doctorId" ? "doctorName" : "therapistName"]: staffName,
            }
          : item
      )
    );
  };

  const updateCartItemDiscount = (
    id: string,
    amount: number,
    type: "fixed" | "percentage"
  ) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, discountAmount: amount, discountType: type }
          : item
      )
    );
  };

  const updateCartItemCommission = (
    id: string,
    eligible: boolean,
    notes?: string
  ) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, commissionEligible: eligible, commissionNotes: notes ?? item.commissionNotes }
          : item
      )
    );
  };

  // Calculate item line total respecting per-item discount
  const itemTotal = (item: (typeof cart)[0]) => {
    const gross = item.unitPrice * item.quantity;
    if (!item.discountAmount || item.discountAmount <= 0) return gross;
    if (item.discountType === "percentage") {
      const pct = Math.min(item.discountAmount, 100);
      return gross * (1 - pct / 100);
    }
    return Math.max(0, gross - item.discountAmount);
  };

  const subtotal = cart.reduce((sum, item) => sum + itemTotal(item), 0);

  // Order-level discount (resolved to absolute value for display)
  const orderDiscountAbs =
    discount > 0
      ? discountType === "percentage"
        ? subtotal * Math.min(discount, 100) / 100
        : Math.min(discount, subtotal)
      : 0;

  const total = Math.max(0, subtotal - orderDiscountAbs);

  const handleCheckout = async () => {
    if (!selectedPatientId) {
      toast.error("Please select a patient");
      return;
    }
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    try {
      const transaction = await createTransaction.mutateAsync({
        transaction: {
          patient_id: selectedPatientId,
          appointment_id: null,
          subtotal,
          discount_amount: discount > 0 ? discount : null,
          discount_type: discount > 0 ? discountType : null,
          total_amount: total,
          tax_amount: 0,
          payment_method: null,
          payment_status: "pending",
          notes: null,
          created_by: null,
        },
        items: cart.map((item) => ({
          item_type: item.type,
          service_id: item.type === "service" ? item.itemId : null,
          product_id: item.type === "product" ? item.itemId : null,
          doctor_id: item.doctorId || null,
          therapist_id: item.therapistId || null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_amount: item.discountAmount && item.discountAmount > 0 ? item.discountAmount : null,
          discount_type: item.discountAmount && item.discountAmount > 0 ? (item.discountType ?? "fixed") : null,
          total_price: itemTotal(item),
          // Only pass for service items; product items never earn commission.
          commission_eligible: item.type === "service" ? (item.commissionEligible ?? true) : undefined,
          commission_notes: item.commissionNotes || null,
          // Selected consumable product (for service items with consumable groups)
          selected_consumable_product_id: item.selectedConsumableProductId || null,
        })),
      });

      // Process payment immediately
      const paidTransaction = await updatePaymentStatus.mutateAsync({
        id: transaction.id,
        payment_status: "paid",
        payment_method: paymentMethod,
        send_whatsapp: sendWhatsApp,
      });

      // Clear cart
      setCart([]);
      setSelectedPatientId("");
      setDiscount(0);
      setDiscountType("fixed");

      // Ask user whether to print receipt
      setCompletedTransaction(paidTransaction);
      setShowPrintPrompt(true);
    } catch (error) {
      // Error handled in mutation
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const handlePrintReceipt = () => {
    if (completedTransaction && settings) {
      printTransactionReceipt(completedTransaction, settings);
    }
    setShowPrintPrompt(false);
    setCompletedTransaction(null);
  };

  const handleSkipPrint = () => {
    setShowPrintPrompt(false);
    setCompletedTransaction(null);
    toast.success("Transaction completed!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
      {/* Left: Item Selection */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search and Tabs */}
        <Card className="shadow-clinic">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search services or products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={activeTab === "services" ? "default" : "outline"}
                  onClick={() => setActiveTab("services")}
                >
                  Services
                </Button>
                <Button
                  variant={activeTab === "products" ? "default" : "outline"}
                  onClick={() => setActiveTab("products")}
                >
                  Products
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items Grid */}
        <Card className="shadow-clinic flex-1 overflow-hidden">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[calc(100vh-380px)] overflow-y-auto">
              {activeTab === "services"
                ? filteredServices.map((service) => (
                    <button
                      key={service.id}
                      onClick={() =>
                        addToCart(
                          "service",
                          service.id,
                          service.name,
                          Number(service.base_price)
                        )
                      }
                      className="p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                    >
                      <div className="font-medium text-sm truncate">
                        {service.name}
                      </div>
                      <div className="text-primary font-semibold text-sm mt-1">
                        {formatPrice(Number(service.base_price))}
                      </div>
                      {service.duration_minutes && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {service.duration_minutes} min
                        </div>
                      )}
                    </button>
                  ))
                : filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() =>
                        addToCart(
                          "product",
                          product.id,
                          product.name,
                          Number(product.selling_price || 0)
                        )
                      }
                      className="p-4 rounded-lg border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                      disabled={(product.current_stock || 0) <= 0}
                    >
                      <div className="font-medium text-sm truncate">
                        {product.name}
                      </div>
                      <div className="text-primary font-semibold text-sm mt-1">
                        {formatPrice(Number(product.selling_price || 0))}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Stock: {product.current_stock || 0}
                      </div>
                    </button>
                  ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Cart */}
      <Card className="shadow-clinic flex flex-col">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShoppingCart className="h-5 w-5" />
            Cart
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          {/* Patient Selection — searchable combobox */}
          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block">Patient</label>
            <Popover open={patientPopoverOpen} onOpenChange={setPatientPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={patientPopoverOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedPatientId
                    ? (() => {
                        const p = patients.find((p) => p.id === selectedPatientId);
                        return p ? `${p.full_name} (${p.patient_code})` : "Select patient";
                      })()
                    : "Select patient"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search patient by name or code..." />
                  <CommandList>
                    <CommandEmpty>No patient found.</CommandEmpty>
                    <CommandGroup>
                      {patients.map((patient) => (
                        <CommandItem
                          key={patient.id}
                          value={`${patient.full_name} ${patient.patient_code}`}
                          onSelect={() => {
                            setSelectedPatientId(patient.id);
                            setPatientPopoverOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedPatientId === patient.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div>
                            <p className="text-sm font-medium">{patient.full_name}</p>
                            <p className="text-xs text-muted-foreground">{patient.patient_code}</p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <Separator className="my-2" />

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto space-y-3 py-2">
            {cart.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Cart is empty
              </div>
            ) : (
              cart.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border bg-muted/30 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatPrice(item.unitPrice)} x {item.quantity}
                      </div>
                      {item.type === "service" && item.selectedConsumableProductName && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="outline" className="text-xs h-4 px-1 bg-blue-50 text-blue-700 border-blue-200">
                            🧴 {item.selectedConsumableProductName}
                          </Badge>
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm text-primary">
                        {formatPrice(itemTotal(item))}
                      </div>
                      {item.discountAmount && item.discountAmount > 0 && (
                        <div className="text-xs text-destructive line-through">
                          {formatPrice(item.unitPrice * item.quantity)}
                        </div>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Per-item discount */}
                  <div className="flex items-center gap-1 pt-1">
                    <Select
                      value={item.discountType ?? "fixed"}
                      onValueChange={(v) =>
                        updateCartItemDiscount(item.id, item.discountAmount ?? 0, v as "fixed" | "percentage")
                      }
                    >
                      <SelectTrigger className="h-7 w-[70px] text-xs px-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Rp</SelectItem>
                        <SelectItem value="percentage">%</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={0}
                      max={item.discountType === "percentage" ? 100 : undefined}
                      placeholder="Diskon item"
                      value={item.discountAmount ?? ""}
                      onChange={(e) =>
                        updateCartItemDiscount(item.id, Number(e.target.value), item.discountType ?? "fixed")
                      }
                      className="h-7 text-xs flex-1"
                    />
                  </div>

                  {/* Staff Assignment + Offering toggle — for both services and products */}
                  <div className="space-y-1 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      {item.type === "service" && (
                        <Select
                          value={item.doctorId || "none"}
                          onValueChange={(value) => {
                            const actualValue = value === "none" ? "" : value;
                            const doctor = doctors.find((d) => d.id === actualValue);
                            updateCartItemStaff(item.id, "doctorId", actualValue, doctor?.full_name);
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Doctor" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {doctors.map((d) => (
                              <SelectItem key={d.id} value={d.id}>{d.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Select
                        value={item.therapistId || "none"}
                        onValueChange={(value) => {
                          const actualValue = value === "none" ? "" : value;
                          const therapist = therapists.find((t) => t.id === actualValue);
                          updateCartItemStaff(item.id, "therapistId", actualValue, therapist?.full_name);
                        }}
                      >
                        <SelectTrigger className={`h-8 text-xs ${item.type === "product" ? "col-span-2" : ""}`}>
                          <SelectValue placeholder="Therapist" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {therapists.map((t) => (
                            <SelectItem key={t.id} value={t.id}>{t.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Offering commission toggle — shown when any staff is assigned */}
                    {(item.therapistId || item.doctorId) && (
                      <div className="flex items-center gap-2 pt-0.5">
                        <Switch
                          id={`comm-${item.id}`}
                          checked={item.commissionEligible ?? true}
                          onCheckedChange={(checked) =>
                            updateCartItemCommission(item.id, checked)
                          }
                          className="scale-75"
                        />
                        <label
                          htmlFor={`comm-${item.id}`}
                          className="text-xs text-muted-foreground cursor-pointer select-none"
                        >
                          {item.commissionEligible ?? true
                            ? "Komisi offering: staff tawarkan & pasien setuju ✓"
                            : "Tidak ada komisi offering (pasien minta sendiri)"}
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <Separator className="my-3" />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>

            {/* Order-level discount */}
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground shrink-0">Diskon Order</span>
              <Select
                value={discountType}
                onValueChange={(v) => setDiscountType(v as "fixed" | "percentage")}
              >
                <SelectTrigger className="h-7 w-[60px] text-xs px-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed">Rp</SelectItem>
                  <SelectItem value="percentage">%</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                max={discountType === "percentage" ? 100 : undefined}
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="h-7 text-xs flex-1 text-right"
                placeholder="0"
              />
            </div>

            {/* Show resolved discount value when percentage */}
            {orderDiscountAbs > 0 && (
              <div className="flex justify-between text-sm text-destructive">
                <span>
                  Diskon{discountType === "percentage" ? ` (${discount}%)` : ""}
                </span>
                <span>-{formatPrice(orderDiscountAbs)}</span>
              </div>
            )}

            <Separator />
            <div className="flex justify-between font-semibold text-lg">
              <span>Total</span>
              <span className="text-primary">{formatPrice(total)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mt-4">
            <label className="text-sm font-medium mb-2 block">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.slice(0, 3).map((method) => (
                <Button
                  key={method.value}
                  variant={paymentMethod === method.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaymentMethod(method.value)}
                  className="gap-1"
                >
                  {method.value === "cash" && <Banknote className="h-3 w-3" />}
                  {method.value === "card" && <CreditCard className="h-3 w-3" />}
                  {method.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg border p-3 shadow-sm">
            <div className="space-y-0.5">
              <label htmlFor="send-wa" className="text-sm font-medium">
                Kirim via WhatsApp
              </label>
              <p className="text-xs text-muted-foreground">
                Kirim struk digital ke pasien
              </p>
            </div>
            <Switch
              id="send-wa"
              checked={sendWhatsApp}
              onCheckedChange={setSendWhatsApp}
            />
          </div>

          {/* Checkout Button */}
          <Button
            className="w-full mt-4"
            size="lg"
            onClick={handleCheckout}
            disabled={
              cart.length === 0 ||
              !selectedPatientId ||
              createTransaction.isPending ||
              updatePaymentStatus.isPending
            }
          >
            {createTransaction.isPending || updatePaymentStatus.isPending
              ? "Processing..."
              : `Pay ${formatPrice(total)}`}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={showPrintPrompt} onOpenChange={setShowPrintPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transaksi Berhasil!</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda ingin mencetak struk invoice untuk transaksi{" "}
              <span className="font-mono font-medium">
                {completedTransaction?.transaction_code}
              </span>
              ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleSkipPrint}>Tidak</AlertDialogCancel>
            <AlertDialogAction onClick={handlePrintReceipt} className="gap-2">
              <Printer className="h-4 w-4" />
              Cetak Struk
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Consumable selection dialog — shown when adding a service with consumable groups.
          The useEffect above handles the no-groups case (auto-add). */}
      {pendingService && !pendingGroupsLoading &&
        (pendingServiceGroups as ConsumableGroup[]).some((g) => g.items.length > 0) && (
        <ConsumableSelectionDialog
          open={true}
          serviceName={pendingService.name}
          groups={(pendingServiceGroups as ConsumableGroup[]).filter((g) => g.items.length > 0)}
          onConfirm={handleConsumableConfirm}
          onCancel={handleConsumableCancel}
        />
      )}
    </div>
  );
}
