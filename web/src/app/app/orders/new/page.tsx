"use client";

/* eslint-disable @next/next/no-img-element */

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { getFabric, getStyle, listFabrics, listStyles, listTailors } from "@/lib/api/catalog";
import { createMeasurement, listMine as listMyMeasurements } from "@/lib/api/measurements";
import { createOrder, getOrder } from "@/lib/api/orders";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/format";
import { fileUrl, pbErrorMessage } from "@/lib/pb";
import type {
  CatalogStyle,
  Fabric,
  Measurement,
  OrderPriority,
  OrderType,
  User,
} from "@/lib/types";
import { displayName, type ItemSpecifications } from "@/components/client/order-utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

const STEPS = ["Style", "Fabric", "Measurements", "Details", "Review"] as const;

const URGENCY_FEES: Record<OrderPriority, number> = {
  normal: 0,
  express: 5000,
  urgent: 10000,
};

const MEASUREMENT_GROUPS: Array<{
  label: string;
  fields: Array<[string, string]>;
}> = [
  {
    label: "Upper body",
    fields: [
      ["chest", "Chest"],
      ["waist", "Waist"],
      ["hips", "Hips"],
      ["shoulderWidth", "Shoulder width"],
      ["neck", "Neck"],
    ],
  },
  {
    label: "Arms",
    fields: [
      ["sleeveLength", "Sleeve length"],
      ["armhole", "Armhole"],
      ["bicep", "Bicep"],
      ["wrist", "Wrist"],
    ],
  },
  {
    label: "Torso",
    fields: [
      ["backLength", "Back length"],
      ["frontLength", "Front length"],
    ],
  },
  {
    label: "Lower body",
    fields: [
      ["inseam", "Inseam"],
      ["outseam", "Outseam"],
      ["thigh", "Thigh"],
      ["knee", "Knee"],
      ["ankle", "Ankle"],
      ["rise", "Rise"],
    ],
  },
];

function chipClass(active: boolean): string {
  return `rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
    active
      ? "bg-brand-700 text-white"
      : "border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
  }`;
}

function pickCardClass(selected: boolean): string {
  return `w-full rounded-xl border bg-white p-3 text-left shadow-sm transition-all hover:border-brand-400 ${
    selected ? "border-brand-600 ring-2 ring-brand-600/30" : "border-neutral-200"
  }`;
}

export default function NewOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      }
    >
      <NewOrderWizard />
    </Suspense>
  );
}

function NewOrderWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Catalog data
  const [styles, setStyles] = useState<CatalogStyle[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [tailors, setTailors] = useState<User[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);

  // Step 1 — style
  const [selStyle, setSelStyle] = useState<CatalogStyle | null>(null);
  const [customStyle, setCustomStyle] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Step 2 — fabric
  const [selFabric, setSelFabric] = useState<Fabric | null>(null);
  const [customerFabric, setCustomerFabric] = useState(false);
  const [meters, setMeters] = useState(4);
  const [fabricTypeFilter, setFabricTypeFilter] = useState("all");

  // Step 3 — measurements
  const [selMeasurement, setSelMeasurement] = useState("");
  const [showMeasureForm, setShowMeasureForm] = useState(false);
  const [mName, setMName] = useState("");
  const [mUnit, setMUnit] = useState("cm");
  const [mValues, setMValues] = useState<Record<string, string>>({});
  const [savingMeasurement, setSavingMeasurement] = useState(false);

  // Step 4 — details
  const [orderType, setOrderType] = useState<OrderType>("new_clothing");
  const [priority, setPriority] = useState<OrderPriority>("normal");
  const [quantity, setQuantity] = useState(1);
  const [tailorId, setTailorId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [instructions, setInstructions] = useState("");

  // Load catalog + prefill (?styleId= or ?from=<orderId>).
  useEffect(() => {
    let active = true;
    const styleId = searchParams.get("styleId");
    const fromOrderId = searchParams.get("from");

    (async () => {
      try {
        const [stylesRes, fabricsRes, tailorsRes, myMeasurements] =
          await Promise.all([
            listStyles({ perPage: 100 }),
            listFabrics({ perPage: 100 }),
            listTailors({ perPage: 100 }),
            listMyMeasurements(),
          ]);
        if (!active) return;
        setStyles(stylesRes.items);
        setFabrics(fabricsRes.items);
        setTailors(tailorsRes.items);
        setMeasurements(myMeasurements);
        const defaultMeasurement = myMeasurements.find((m) => m.isDefault);
        if (defaultMeasurement) setSelMeasurement(defaultMeasurement.id);

        if (fromOrderId) {
          // Reorder: copy style/fabric/measurement/details from the old order.
          const { order, items } = await getOrder(fromOrderId);
          if (!active) return;
          const item = items[0];
          const specs = (item?.specifications ?? {}) as ItemSpecifications;
          if (order.expand?.style) {
            setSelStyle(order.expand.style);
          } else {
            setCustomStyle(true);
          }
          if (order.measurement) setSelMeasurement(order.measurement);
          setOrderType(order.orderType || "new_clothing");
          setPriority(order.priority || "normal");
          setInstructions(order.specialInstructions || "");
          if (order.tailor) setTailorId(order.tailor);
          if (item) {
            setQuantity(item.quantity || 1);
            if (specs.fabricSelection?.quantity) {
              setMeters(specs.fabricSelection.quantity);
            }
            if (specs.paymentMethod) setPaymentMethod(specs.paymentMethod);
            if (item.fabric) {
              const fabric = await getFabric(item.fabric).catch(() => null);
              if (active && fabric) setSelFabric(fabric);
            } else if (order.fabricSource === "customer") {
              setCustomerFabric(true);
            }
          } else if (order.fabricSource === "customer") {
            setCustomerFabric(true);
          }
        } else if (styleId) {
          const style = await getStyle(styleId).catch(() => null);
          if (active && style) setSelStyle(style);
        }
      } catch (err) {
        if (active) toast.show(pbErrorMessage(err), "error");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // ---- Pricing -------------------------------------------------------------
  const basePrice = customStyle ? 0 : (selStyle?.basePrice ?? 0);
  const fabricCost =
    customerFabric || !selFabric ? 0 : selFabric.pricePerMeter * meters;
  const urgencyFee = URGENCY_FEES[priority] ?? 0;
  const perItem = basePrice + fabricCost + urgencyFee;
  const total = perItem * Math.max(quantity, 1);
  const depositRequired = Math.round(total / 2);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(styles.map((s) => s.category)))],
    [styles]
  );
  const fabricTypes = useMemo(
    () => ["all", ...Array.from(new Set(fabrics.map((f) => f.type)))],
    [fabrics]
  );
  const visibleStyles =
    categoryFilter === "all"
      ? styles
      : styles.filter((s) => s.category === categoryFilter);
  const visibleFabrics =
    fabricTypeFilter === "all"
      ? fabrics
      : fabrics.filter((f) => f.type === fabricTypeFilter);
  const selectedMeasurement = measurements.find((m) => m.id === selMeasurement);

  function canContinue(): boolean {
    if (step === 0) return customStyle || !!selStyle;
    if (step === 1) return customerFabric || !!selFabric;
    if (step === 2) return !!selMeasurement;
    return true;
  }

  async function handleSaveMeasurement() {
    if (!mName.trim()) {
      toast.show("Give this measurement profile a name.", "error");
      return;
    }
    setSavingMeasurement(true);
    try {
      const numeric: Record<string, number> = {};
      for (const [key, raw] of Object.entries(mValues)) {
        const n = Number(raw);
        if (raw !== "" && Number.isFinite(n) && n > 0) numeric[key] = n;
      }
      const created = await createMeasurement({
        name: mName.trim(),
        unit: mUnit,
        ...numeric,
      });
      setMeasurements((prev) => [created, ...prev]);
      setSelMeasurement(created.id);
      setShowMeasureForm(false);
      setMName("");
      setMValues({});
      toast.show("Measurement profile saved.", "success");
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setSavingMeasurement(false);
    }
  }

  async function handleSubmit() {
    if (!user) return;
    setSubmitting(true);
    try {
      const specifications: ItemSpecifications = {
        garmentType: customStyle ? "custom" : (selStyle?.category ?? "custom"),
        customerInfo: {
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
        },
        fabricSelection: customerFabric
          ? { customerProvided: true }
          : selFabric
            ? {
                type: selFabric.type,
                color: selFabric.color,
                quantity: meters,
                unitPrice: selFabric.pricePerMeter,
                totalPrice: fabricCost,
                inStock: selFabric.availableQuantity > 0,
              }
            : undefined,
        styleConfig: {
          designNotes: instructions,
          embellishments: [],
        },
        pricing: {
          basePrice,
          fabricCost,
          urgencyFee,
          complexityMultiplier: 1,
          currency: "NGN",
          totalPrice: total,
          depositRequired,
          balanceAmount: total - depositRequired,
        },
        paymentMethod,
      };

      const order = await createOrder(
        {
          tailor: tailorId,
          orderType,
          priority,
          style: customStyle ? undefined : selStyle?.id,
          measurement: selMeasurement || undefined,
          totalAmount: total,
          specialInstructions: instructions.trim(),
          fabricSource: customerFabric ? "customer" : "tailor",
        },
        [
          {
            itemType: customStyle ? "other" : "traditional",
            quantity: Math.max(quantity, 1),
            fabric: customerFabric ? undefined : selFabric?.id,
            designStyle: customStyle
              ? "Custom design"
              : (selStyle?.name ?? "Custom design"),
            itemPrice: perItem,
            totalPrice: total,
            specifications: specifications as unknown as Record<string, unknown>,
          },
        ]
      );
      toast.show(`Order ${order.orderNumber || ""} placed!`.trim(), "success");
      router.push(`/app/orders/${order.id}`);
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="New order"
        description="Tell us what you want made — a tailor will pick it up from there."
      />

      {/* Stepper */}
      <ol className="mb-6 flex items-center gap-1 overflow-x-auto sm:gap-2">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={label} className="flex shrink-0 items-center gap-1 sm:gap-2">
              {i > 0 && <span className="h-px w-4 bg-neutral-300 sm:w-8" />}
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                disabled={i > step}
                className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs font-medium transition-colors ${
                  current
                    ? "bg-brand-50 text-brand-800"
                    : done
                      ? "text-neutral-700 hover:bg-neutral-100"
                      : "text-neutral-400"
                }`}
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-[11px] font-semibold ${
                    current
                      ? "bg-brand-700 text-white"
                      : done
                        ? "bg-brand-100 text-brand-800"
                        : "bg-neutral-200 text-neutral-500"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                {label}
              </button>
            </li>
          );
        })}
      </ol>

      {/* Step 1 — Style */}
      {step === 0 && (
        <Card
          title="Choose a style"
          description="Pick from the catalog or go fully custom."
        >
          <div className="mb-4 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                className={chipClass(categoryFilter === c)}
              >
                {c === "all" ? "All styles" : c.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => {
                setCustomStyle(true);
                setSelStyle(null);
              }}
              className={pickCardClass(customStyle)}
            >
              <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-3xl text-neutral-400">
                ✂
              </div>
              <p className="mt-2 text-sm font-medium text-neutral-900">
                Custom design
              </p>
              <p className="text-xs text-neutral-500">
                Describe it in the details step
              </p>
            </button>
            {visibleStyles.map((s) => {
              const selected = !customStyle && selStyle?.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelStyle(s);
                    setCustomStyle(false);
                  }}
                  className={pickCardClass(selected)}
                >
                  {s.images?.[0] ? (
                    <img
                      src={fileUrl(s, s.images[0], "300x300")}
                      alt={s.name}
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center rounded-lg bg-brand-50 font-display text-2xl font-semibold text-brand-300">
                      {s.name.charAt(0)}
                    </div>
                  )}
                  <p className="mt-2 truncate text-sm font-medium text-neutral-900">
                    {s.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    from {formatNaira(s.basePrice, s.currency)}
                  </p>
                </button>
              );
            })}
          </div>
        </Card>
      )}

      {/* Step 2 — Fabric */}
      {step === 1 && (
        <Card
          title="Choose a fabric"
          description="From your tailor's stock, or bring your own."
        >
          <div className="mb-4 flex flex-wrap gap-1.5">
            {fabricTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFabricTypeFilter(t)}
                className={chipClass(fabricTypeFilter === t)}
              >
                {t === "all" ? "All fabrics" : t.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <button
              type="button"
              onClick={() => {
                setCustomerFabric(true);
                setSelFabric(null);
              }}
              className={pickCardClass(customerFabric)}
            >
              <div className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 text-3xl text-neutral-400">
                🧵
              </div>
              <p className="mt-2 text-sm font-medium text-neutral-900">
                I&apos;ll provide my own
              </p>
              <p className="text-xs text-neutral-500">No fabric cost added</p>
            </button>
            {visibleFabrics.map((f) => {
              const selected = !customerFabric && selFabric?.id === f.id;
              const out = f.availableQuantity <= 0;
              return (
                <button
                  key={f.id}
                  type="button"
                  disabled={out}
                  onClick={() => {
                    setSelFabric(f);
                    setCustomerFabric(false);
                  }}
                  className={`${pickCardClass(selected)} ${out ? "opacity-50" : ""}`}
                >
                  {f.images?.[0] ? (
                    <img
                      src={fileUrl(f, f.images[0], "300x300")}
                      alt={f.name}
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center rounded-lg bg-accent-50 font-display text-2xl font-semibold text-accent-300">
                      {f.name.charAt(0)}
                    </div>
                  )}
                  <p className="mt-2 truncate text-sm font-medium text-neutral-900">
                    {f.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatNaira(f.pricePerMeter)}/m ·{" "}
                    {out ? "Out of stock" : `${f.availableQuantity}m left`}
                  </p>
                </button>
              );
            })}
          </div>
          {selFabric && !customerFabric && (
            <div className="mt-5 max-w-48">
              <Input
                label="Metres needed"
                type="number"
                min="1"
                step="0.5"
                value={String(meters)}
                onChange={(e) =>
                  setMeters(Math.max(Number(e.target.value) || 1, 1))
                }
                hint={`Fabric cost: ${formatNaira(selFabric.pricePerMeter * meters)}`}
              />
            </div>
          )}
        </Card>
      )}

      {/* Step 3 — Measurements */}
      {step === 2 && (
        <Card
          title="Measurements"
          description="Pick a saved profile or add a new one."
          actions={
            !showMeasureForm ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowMeasureForm(true)}
              >
                New profile
              </Button>
            ) : undefined
          }
        >
          {measurements.length === 0 && !showMeasureForm && (
            <p className="mb-4 text-sm text-neutral-500">
              You haven&apos;t saved any measurements yet — create your first
              profile to continue.
            </p>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {measurements.map((m) => {
              const selected = selMeasurement === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelMeasurement(m.id)}
                  className={pickCardClass(selected)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-neutral-900">
                      {m.name}
                    </p>
                    {m.isDefault && (
                      <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    {[
                      m.chest ? `Chest ${m.chest}${m.unit}` : "",
                      m.waist ? `Waist ${m.waist}${m.unit}` : "",
                      m.hips ? `Hips ${m.hips}${m.unit}` : "",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No values recorded"}
                  </p>
                </button>
              );
            })}
          </div>

          {showMeasureForm && (
            <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Profile name"
                  placeholder="e.g. My standard measurements"
                  value={mName}
                  onChange={(e) => setMName(e.target.value)}
                />
                <Select
                  label="Unit"
                  value={mUnit}
                  onChange={(e) => setMUnit(e.target.value)}
                >
                  <option value="cm">Centimetres (cm)</option>
                  <option value="inch">Inches (inch)</option>
                </Select>
              </div>
              {MEASUREMENT_GROUPS.map((group) => (
                <fieldset key={group.label} className="mt-4">
                  <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    {group.label}
                  </legend>
                  <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {group.fields.map(([key, label]) => (
                      <Input
                        key={key}
                        label={`${label} (${mUnit})`}
                        type="number"
                        min="0"
                        step="0.5"
                        inputMode="decimal"
                        value={mValues[key] ?? ""}
                        onChange={(e) =>
                          setMValues((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                      />
                    ))}
                  </div>
                </fieldset>
              ))}
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowMeasureForm(false)}
                  disabled={savingMeasurement}
                >
                  Cancel
                </Button>
                <Button loading={savingMeasurement} onClick={handleSaveMeasurement}>
                  Save profile
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Step 4 — Details */}
      {step === 3 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card title="Order details" className="lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Order type"
                value={orderType}
                onChange={(e) => setOrderType(e.target.value as OrderType)}
              >
                <option value="new_clothing">New clothing</option>
                <option value="alteration">Alteration</option>
                <option value="repair">Repair</option>
              </Select>
              <Select
                label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as OrderPriority)}
              >
                <option value="normal">Normal</option>
                <option value="express">Express (+{formatNaira(URGENCY_FEES.express)})</option>
                <option value="urgent">Urgent (+{formatNaira(URGENCY_FEES.urgent)})</option>
              </Select>
              <Input
                label="Quantity"
                type="number"
                min="1"
                step="1"
                value={String(quantity)}
                onChange={(e) =>
                  setQuantity(Math.max(Math.round(Number(e.target.value) || 1), 1))
                }
              />
              <Select
                label="Preferred tailor"
                value={tailorId}
                onChange={(e) => setTailorId(e.target.value)}
              >
                <option value="">No preference — first available</option>
                {tailors.map((t) => (
                  <option key={t.id} value={t.id}>
                    {displayName(t)}
                    {t.location ? ` — ${t.location}` : ""}
                  </option>
                ))}
              </Select>
              <Select
                label="How you'll pay"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash</option>
                <option value="pos">POS</option>
                <option value="mobile_money">Mobile money</option>
              </Select>
            </div>
            <div className="mt-4 flex flex-col gap-1.5">
              <label
                htmlFor="order-instructions"
                className="text-sm font-medium text-neutral-700"
              >
                Special instructions
              </label>
              <textarea
                id="order-instructions"
                rows={4}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Fit preferences, embroidery, occasion, deadline…"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-2 focus:outline-offset-1 focus:outline-brand-700"
              />
            </div>
          </Card>
          <Card title="Estimated budget">
            <BudgetRows
              basePrice={basePrice}
              fabricCost={fabricCost}
              urgencyFee={urgencyFee}
              quantity={quantity}
              total={total}
              depositRequired={depositRequired}
            />
          </Card>
        </div>
      )}

      {/* Step 5 — Review */}
      {step === 4 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card
            title="Review your order"
            description="Double-check everything before submitting."
            className="lg:col-span-2"
          >
            <dl className="divide-y divide-neutral-100">
              <ReviewRow
                label="Style"
                value={customStyle ? "Custom design" : (selStyle?.name ?? "—")}
              />
              <ReviewRow
                label="Fabric"
                value={
                  customerFabric
                    ? "Customer-provided"
                    : selFabric
                      ? `${selFabric.name} — ${meters}m`
                      : "—"
                }
              />
              <ReviewRow
                label="Measurements"
                value={selectedMeasurement?.name ?? "—"}
              />
              <ReviewRow
                label="Order type"
                value={orderType.replace(/_/g, " ")}
                capitalize
              />
              <ReviewRow label="Priority" value={priority} capitalize />
              <ReviewRow label="Quantity" value={String(quantity)} />
              <ReviewRow
                label="Tailor"
                value={
                  tailorId
                    ? displayName(tailors.find((t) => t.id === tailorId))
                    : "First available"
                }
              />
              <ReviewRow
                label="Payment method"
                value={paymentMethod.replace(/_/g, " ")}
                capitalize
              />
              {instructions.trim() && (
                <ReviewRow label="Instructions" value={instructions.trim()} />
              )}
            </dl>
          </Card>
          <Card title="Estimated budget">
            <BudgetRows
              basePrice={basePrice}
              fabricCost={fabricCost}
              urgencyFee={urgencyFee}
              quantity={quantity}
              total={total}
              depositRequired={depositRequired}
            />
            <p className="mt-3 text-xs text-neutral-400">
              Final pricing is confirmed by your tailor when they accept the
              order.
            </p>
          </Card>
        </div>
      )}

      {/* Wizard controls */}
      <div className="mt-6 flex items-center justify-between">
        <Button
          variant="secondary"
          onClick={() => setStep((s) => Math.max(s - 1, 0))}
          disabled={step === 0 || submitting}
        >
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canContinue()}
          >
            Continue
          </Button>
        ) : (
          <Button loading={submitting} onClick={handleSubmit}>
            Place order
          </Button>
        )}
      </div>
    </div>
  );
}

function BudgetRows(props: {
  basePrice: number;
  fabricCost: number;
  urgencyFee: number;
  quantity: number;
  total: number;
  depositRequired: number;
}) {
  const { basePrice, fabricCost, urgencyFee, quantity, total, depositRequired } =
    props;
  return (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-neutral-500">Style base price</dt>
        <dd className="font-medium text-neutral-800">
          {basePrice > 0 ? formatNaira(basePrice) : "Tailor quote"}
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-neutral-500">Fabric</dt>
        <dd className="font-medium text-neutral-800">
          {fabricCost > 0 ? formatNaira(fabricCost) : "—"}
        </dd>
      </div>
      {urgencyFee > 0 && (
        <div className="flex justify-between">
          <dt className="text-neutral-500">Priority fee</dt>
          <dd className="font-medium text-neutral-800">
            {formatNaira(urgencyFee)}
          </dd>
        </div>
      )}
      {quantity > 1 && (
        <div className="flex justify-between">
          <dt className="text-neutral-500">Quantity</dt>
          <dd className="font-medium text-neutral-800">× {quantity}</dd>
        </div>
      )}
      <div className="flex justify-between border-t border-neutral-200 pt-2">
        <dt className="font-medium text-neutral-900">Estimated total</dt>
        <dd className="font-display font-semibold text-neutral-900">
          {formatNaira(total)}
        </dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-neutral-500">Typical deposit (50%)</dt>
        <dd className="text-neutral-600">{formatNaira(depositRequired)}</dd>
      </div>
    </dl>
  );
}

function ReviewRow({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="text-sm text-neutral-500">{label}</dt>
      <dd
        className={`max-w-[60%] text-right text-sm font-medium text-neutral-900 ${
          capitalize ? "capitalize" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
