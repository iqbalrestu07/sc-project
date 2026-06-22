import { useState } from "react";
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
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  Search,
  User,
  CreditCard,
  Banknote
} from "lucide-react";
import { usePatients } from "@/hooks/usePatients";
import { useServices } from "@/hooks/useServices";
import { useProducts } from "@/hooks/useProducts";
import { useStaff } from "@/hooks/useStaff";
import { useTransactions } from "@/hooks/useTransactions";
import type { CartItem, PaymentMethod } from "@/types/transaction";
import { PAYMENT_METHODS } from "@/types/transaction";
import { toast } from "sonner";

export function POSInterface() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"services" | "products">("services");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [discount, setDiscount] = useState(0);

  const patientsQuery = usePatients();
  const servicesQuery = useServices();
  const { products } = useProducts();
  const { doctors, therapists } = useStaff();
  const { createTransaction, updatePaymentStatus } = useTransactions();

  const patients = patientsQuery.data || [];
  const services = servicesQuery.data || [];

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (
    type: "service" | "product",
    itemId: string,
    name: string,
    unitPrice: number
  ) => {
    const existingIndex = cart.findIndex(
      (item) => item.itemId === itemId && item.type === type
    );

    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([
        ...cart,
        {
          id: crypto.randomUUID(),
          type,
          itemId,
          name,
          unitPrice,
          quantity: 1,
        },
      ]);
    }
  };

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

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const total = subtotal - discount;

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
          subtotal,
          discount_amount: discount,
          discount_type: discount > 0 ? "fixed" : null,
          total_amount: total,
          payment_status: "pending",
        },
        items: cart.map((item) => ({
          item_type: item.type,
          service_id: item.type === "service" ? item.itemId : null,
          product_id: item.type === "product" ? item.itemId : null,
          doctor_id: item.doctorId || null,
          therapist_id: item.therapistId || null,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount_amount: 0,
          total_price: item.unitPrice * item.quantity,
        })),
      });

      // Process payment immediately
      await updatePaymentStatus.mutateAsync({
        id: transaction.id,
        payment_status: "paid",
        payment_method: paymentMethod,
      });

      // Clear cart
      setCart([]);
      setSelectedPatientId("");
      setDiscount(0);
      toast.success("Transaction completed!");
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
          {/* Patient Selection */}
          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block">Patient</label>
            <Select
              value={selectedPatientId}
              onValueChange={setSelectedPatientId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select patient" />
              </SelectTrigger>
              <SelectContent>
                {patients.map((patient) => (
                  <SelectItem key={patient.id} value={patient.id}>
                    {patient.full_name} ({patient.patient_code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </div>
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

                  {/* Staff Assignment for Services */}
                  {item.type === "service" && (
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <Select
                        value={item.doctorId || "none"}
                        onValueChange={(value) => {
                          const actualValue = value === "none" ? "" : value;
                          const doctor = doctors.find((d) => d.id === actualValue);
                          updateCartItemStaff(
                            item.id,
                            "doctorId",
                            actualValue,
                            doctor?.full_name
                          );
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Doctor" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {doctors.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={item.therapistId || "none"}
                        onValueChange={(value) => {
                          const actualValue = value === "none" ? "" : value;
                          const therapist = therapists.find((t) => t.id === actualValue);
                          updateCartItemStaff(
                            item.id,
                            "therapistId",
                            actualValue,
                            therapist?.full_name
                          );
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Therapist" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {therapists.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <Separator className="my-3" />

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Discount</span>
              <Input
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="h-8 w-24 text-right"
                min={0}
              />
            </div>
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
    </div>
  );
}
