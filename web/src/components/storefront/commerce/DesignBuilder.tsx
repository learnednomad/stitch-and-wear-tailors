"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CommerceImage } from "@/components/storefront/commerce/CommerceImage";
import {
  CommercePage,
  FieldError,
  goldButtonClass,
  luxuryInputClass,
  luxuryLabelClass,
  outlineButtonClass,
} from "@/components/storefront/commerce/commerce-ui";
import { listFabrics, listStyles } from "@/lib/api/catalog";
import { listMine as listMyMeasurements } from "@/lib/api/measurements";
import { createOrder } from "@/lib/api/orders";
import { useAuth } from "@/lib/auth";
import { formatNaira } from "@/lib/format";
import { fileUrl, pbErrorMessage } from "@/lib/pb";
import type { CatalogStyle, Fabric, Measurement } from "@/lib/types";

const DRAFT_KEY = "stitchwear.storefront.design-draft.v1";
const STEPS = ["Style", "Fabric", "Design", "Measurements", "Review"] as const;
const METERS = 4;

function orderItemType(category: CatalogStyle["category"]): string {
  if (["suit", "shirt", "trouser", "dress"].includes(category)) return category;
  if (category === "ankara_gown") return "dress";
  if (category === "other") return "other";
  return "traditional";
}

type MeasureMode = "profile" | "manual" | "appointment";

interface DesignDraft {
  styleId: string;
  fabricId: string;
  fit: string;
  neckline: string;
  sleeve: string;
  embroidery: string;
  measureMode: MeasureMode;
  measurementId: string;
  measurements: Record<string, string>;
  notes: string;
}

const EMPTY_DRAFT: DesignDraft = {
  styleId: "",
  fabricId: "",
  fit: "relaxed",
  neckline: "classic",
  sleeve: "long",
  embroidery: "signature",
  measureMode: "appointment",
  measurementId: "",
  measurements: {},
  notes: "",
};

function Choice({
  selected,
  title,
  description,
  onClick,
}: {
  selected: boolean;
  title: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-20 border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-[#d4aa68] ${
        selected
          ? "border-[#b8873e] bg-[#b8873e]/10"
          : "border-white/10 bg-[#111310] hover:border-white/25"
      }`}
    >
      <span className="block text-sm font-medium text-[#f4eee4]">{title}</span>
      {description ? (
        <span className="mt-1 block text-xs leading-5 text-[#968f84]">{description}</span>
      ) : null}
    </button>
  );
}

export function DesignBuilder() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DesignDraft>(EMPTY_DRAFT);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [styles, setStyles] = useState<CatalogStyle[]>([]);
  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      try {
        const saved = window.localStorage.getItem(DRAFT_KEY);
        if (active && saved) {
          setDraft({ ...EMPTY_DRAFT, ...(JSON.parse(saved) as DesignDraft) });
        }
      } catch {
        // A malformed draft should never prevent starting a new design.
      } finally {
        if (active) setDraftHydrated(true);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draft, draftHydrated]);

  useEffect(() => {
    let active = true;
    Promise.all([listStyles({ perPage: 100 }), listFabrics({ perPage: 100 })])
      .then(([styleResult, fabricResult]) => {
        if (!active) return;
        setStyles(styleResult.items);
        setFabrics(fabricResult.items.filter((fabric) => fabric.availableQuantity > 0));
      })
      .catch((reason) => {
        if (active) setError(pbErrorMessage(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    listMyMeasurements()
      .then((items) => {
        setMeasurements(items);
        const preferred = items.find((item) => item.isDefault) ?? items[0];
        if (preferred) {
          setDraft((current) => ({
            ...current,
            measurementId: current.measurementId || preferred.id,
            measureMode: current.measureMode === "appointment" ? "profile" : current.measureMode,
          }));
        }
      })
      .catch(() => {
        // Guests and users without a profile can still enter values or book a session.
      });
  }, [authLoading, user]);

  const selectedStyle = styles.find((item) => item.id === draft.styleId);
  const selectedFabric = fabrics.find((item) => item.id === draft.fabricId);
  const metresRequired = selectedStyle?.fabricRequirements?.amount || METERS;
  const designFee = draft.embroidery === "none" ? 0 : draft.embroidery === "signature" ? 15000 : 30000;
  const estimate =
    (selectedStyle?.basePrice ?? 0) +
    (selectedFabric?.pricePerMeter ?? 0) * metresRequired +
    designFee;

  const canContinue = useMemo(() => {
    if (step === 0) return !!draft.styleId;
    if (step === 1) {
      return !!selectedFabric && selectedFabric.availableQuantity >= metresRequired;
    }
    if (step === 2) return !!draft.fit && !!draft.neckline && !!draft.sleeve;
    if (step === 3) {
      if (draft.measureMode === "profile") return !!draft.measurementId;
      if (draft.measureMode === "appointment") return true;
      return ["chest", "waist", "hips", "shoulderWidth", "sleeveLength"].every(
        (key) => Number(draft.measurements[key]) > 0
      );
    }
    return true;
  }, [draft, metresRequired, selectedFabric, step]);

  function update<K extends keyof DesignDraft>(key: K, value: DesignDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function submitDesign() {
    if (!user) {
      router.push(`/login?returnTo=${encodeURIComponent("/design?resume=1")}`);
      return;
    }
    if (!selectedStyle || !selectedFabric) return;
    setSubmitting(true);
    setError("");
    try {
      const specifications = {
        storefrontDesign: true,
        garmentType: selectedStyle.category,
        fabricSelection: {
          type: selectedFabric.type,
          color: selectedFabric.color,
          quantity: metresRequired,
          unitPrice: selectedFabric.pricePerMeter,
          totalPrice: selectedFabric.pricePerMeter * metresRequired,
          inStock: selectedFabric.availableQuantity >= metresRequired,
        },
        styleConfig: {
          fitPreference: draft.fit,
          neckline: draft.neckline,
          sleeve: draft.sleeve,
          embroidery: draft.embroidery,
          designNotes: draft.notes,
        },
        manualMeasurements:
          draft.measureMode === "manual" ? draft.measurements : undefined,
        measurementPlan: draft.measureMode,
        pricing: {
          basePrice: selectedStyle.basePrice,
          fabricCost: selectedFabric.pricePerMeter * metresRequired,
          embellishmentFee: designFee,
          totalPrice: estimate,
          currency: "NGN",
        },
      };
      const order = await createOrder(
        {
          tailor: "",
          orderType: "new_clothing",
          style: selectedStyle.id,
          measurement:
            draft.measureMode === "profile" ? draft.measurementId : undefined,
          totalAmount: estimate,
          currency: "NGN",
          fabricSource: "shop",
          specialInstructions: draft.notes,
        },
        [
          {
            itemType: orderItemType(selectedStyle.category),
            quantity: 1,
            fabric: selectedFabric.id,
            designStyle: selectedStyle.name,
            itemPrice: estimate,
            totalPrice: estimate,
            specifications,
          },
        ]
      );
      window.localStorage.removeItem(DRAFT_KEY);
      if (draft.measureMode === "appointment") {
        router.push(`/appointments?type=measurement&order=${order.id}`);
      } else {
        router.push(`/app/orders/${order.id}`);
      }
    } catch (reason) {
      setError(pbErrorMessage(reason));
      setSubmitting(false);
    }
  }

  return (
    <CommercePage
      eyebrow="Made for one"
      title="Design Your Own"
      description="Shape a signature garment in five considered steps. Your choices are saved on this device until you submit."
      width="max-w-6xl"
    >
      <ol className="mb-10 grid grid-cols-5 gap-1" aria-label="Design progress">
        {STEPS.map((label, index) => (
          <li key={label} className="text-center">
            <div
              className={`mx-auto grid size-8 place-items-center rounded-full border text-xs ${
                index <= step
                  ? "border-[#b8873e] bg-[#b8873e] text-black"
                  : "border-white/15 text-[#817a70]"
              }`}
            >
              {index + 1}
            </div>
            <span
              className={`mt-2 hidden text-[0.6rem] uppercase tracking-[0.15em] sm:block ${
                index === step ? "text-[#d4aa68]" : "text-[#817a70]"
              }`}
            >
              {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-h-[30rem] border border-white/10 bg-[#0e100e] p-5 sm:p-7">
          {loading ? <div className="h-80 animate-pulse bg-white/[0.03]" /> : null}

          {!loading && step === 0 ? (
            <div>
              <h2 className="font-display text-2xl">Choose your silhouette</h2>
              <p className="mt-2 text-sm text-[#9d968b]">Start with a form our tailors can make distinctly yours.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {styles.map((style) => {
                  const image = style.images?.[0] ? fileUrl(style, style.images[0], "600x750") : undefined;
                  return (
                    <button
                      type="button"
                      key={style.id}
                      aria-pressed={draft.styleId === style.id}
                      onClick={() => update("styleId", style.id)}
                      className={`overflow-hidden border text-left transition focus-visible:outline-2 focus-visible:outline-[#d4aa68] ${
                        draft.styleId === style.id ? "border-[#b8873e]" : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <span className="relative block aspect-[4/3] bg-[#171916]">
                        <CommerceImage src={image} alt={style.name} sizes="(max-width: 640px) 100vw, 33vw" />
                      </span>
                      <span className="block p-4">
                        <span className="block font-display text-lg">{style.name}</span>
                        <span className="mt-1 block text-xs capitalize text-[#948d82]">
                          {style.category.replaceAll("_", " ")} · from {formatNaira(style.basePrice)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {!loading && step === 1 ? (
            <div>
              <h2 className="font-display text-2xl">Select the cloth</h2>
              <p className="mt-2 text-sm text-[#9d968b]">The estimate includes {metresRequired} metres for this garment.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {fabrics.map((fabric) => {
                  const image = fabric.images?.[0] ? fileUrl(fabric, fabric.images[0], "500x500") : undefined;
                  return (
                    <button
                      type="button"
                      key={fabric.id}
                      aria-pressed={draft.fabricId === fabric.id}
                      onClick={() => update("fabricId", fabric.id)}
                      disabled={fabric.availableQuantity < metresRequired}
                      className={`overflow-hidden border text-left transition focus-visible:outline-2 focus-visible:outline-[#d4aa68] ${
                        draft.fabricId === fabric.id
                          ? "border-[#b8873e]"
                          : fabric.availableQuantity < metresRequired
                            ? "cursor-not-allowed border-white/5 opacity-45"
                            : "border-white/10 hover:border-white/30"
                      }`}
                    >
                      <span className="relative block aspect-square bg-[#171916]">
                        <CommerceImage src={image} alt={fabric.name} sizes="(max-width: 640px) 100vw, 33vw" />
                      </span>
                      <span className="block p-4">
                        <span className="block font-display text-lg">{fabric.name}</span>
                        <span className="mt-1 block text-xs capitalize text-[#948d82]">
                          {fabric.color} · {formatNaira(fabric.pricePerMeter)}/metre
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <h2 className="font-display text-2xl">Refine the details</h2>
              <p className="mt-2 text-sm text-[#9d968b]">A tailor reviews every choice before cutting begins.</p>
              <div className="mt-7 space-y-8">
                <fieldset>
                  <legend className={luxuryLabelClass}>Fit</legend>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      ["slim", "Slim", "Closer through the body"],
                      ["relaxed", "Relaxed", "Traditional ease and movement"],
                      ["oversized", "Statement", "A generous modern volume"],
                    ].map(([value, title, description]) => (
                      <Choice key={value} selected={draft.fit === value} title={title} description={description} onClick={() => update("fit", value)} />
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className={luxuryLabelClass}>Neckline</legend>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {["classic", "mandarin", "open collar"].map((value) => (
                      <Choice key={value} selected={draft.neckline === value} title={value.replace(/^./, (letter) => letter.toUpperCase())} onClick={() => update("neckline", value)} />
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-7 sm:grid-cols-2">
                  <label>
                    <span className={luxuryLabelClass}>Sleeve</span>
                    <select className={luxuryInputClass} value={draft.sleeve} onChange={(event) => update("sleeve", event.target.value)}>
                      <option value="long">Long sleeve</option>
                      <option value="short">Short sleeve</option>
                      <option value="three-quarter">Three-quarter sleeve</option>
                    </select>
                  </label>
                  <label>
                    <span className={luxuryLabelClass}>Embellishment</span>
                    <select className={luxuryInputClass} value={draft.embroidery} onChange={(event) => update("embroidery", event.target.value)}>
                      <option value="none">None</option>
                      <option value="signature">Signature embroidery (+₦15,000)</option>
                      <option value="heirloom">Heirloom handwork (+₦30,000)</option>
                    </select>
                  </label>
                </div>
                <label>
                  <span className={luxuryLabelClass}>Notes for the atelier</span>
                  <textarea
                    className={`${luxuryInputClass} min-h-28 resize-y`}
                    maxLength={500}
                    value={draft.notes}
                    onChange={(event) => update("notes", event.target.value)}
                    placeholder="Tell us about the occasion, preferred details, or anything that helps the tailor understand your vision."
                  />
                </label>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <h2 className="font-display text-2xl">Choose your measurement path</h2>
              <p className="mt-2 text-sm text-[#9d968b]">Precise measurements are confirmed before production.</p>
              <div className="mt-7 grid gap-3 sm:grid-cols-3">
                {measurements.length > 0 ? (
                  <Choice selected={draft.measureMode === "profile"} title="Saved profile" description="Use measurements already in your account" onClick={() => update("measureMode", "profile")} />
                ) : null}
                <Choice selected={draft.measureMode === "manual"} title="Enter measurements" description="Add five key measurements now" onClick={() => update("measureMode", "manual")} />
                <Choice selected={draft.measureMode === "appointment"} title="Book a session" description="Meet a tailor after submitting" onClick={() => update("measureMode", "appointment")} />
              </div>
              {draft.measureMode === "profile" ? (
                <label className="mt-7 block max-w-md">
                  <span className={luxuryLabelClass}>Measurement profile</span>
                  <select className={luxuryInputClass} value={draft.measurementId} onChange={(event) => update("measurementId", event.target.value)}>
                    <option value="">Select a profile</option>
                    {measurements.map((measurement) => (
                      <option key={measurement.id} value={measurement.id}>{measurement.name} ({measurement.unit})</option>
                    ))}
                  </select>
                </label>
              ) : null}
              {draft.measureMode === "manual" ? (
                <div className="mt-7 grid gap-5 sm:grid-cols-2">
                  {[
                    ["chest", "Chest"],
                    ["waist", "Waist"],
                    ["hips", "Hips"],
                    ["shoulderWidth", "Shoulder width"],
                    ["sleeveLength", "Sleeve length"],
                  ].map(([key, label]) => (
                    <label key={key}>
                      <span className={luxuryLabelClass}>{label} (cm)</span>
                      <input
                        type="number"
                        min="1"
                        step="0.1"
                        inputMode="decimal"
                        className={luxuryInputClass}
                        value={draft.measurements[key] ?? ""}
                        onChange={(event) =>
                          update("measurements", { ...draft.measurements, [key]: event.target.value })
                        }
                      />
                    </label>
                  ))}
                </div>
              ) : null}
              {draft.measureMode === "appointment" ? (
                <div className="mt-7 border border-[#b8873e]/30 bg-[#b8873e]/[0.06] p-5 text-sm leading-6 text-[#c7baa7]">
                  After the design request is created, we’ll take you to the booking calendar to choose a tailor and fitting time.
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <h2 className="font-display text-2xl">Review your design</h2>
              <p className="mt-2 text-sm text-[#9d968b]">Your tailor will confirm the final details and schedule before production.</p>
              <dl className="mt-7 divide-y divide-white/10 border-y border-white/10">
                {[
                  ["Style", selectedStyle?.name],
                  ["Fabric", selectedFabric?.name],
                  ["Fit", draft.fit],
                  ["Neckline", draft.neckline],
                  ["Sleeve", draft.sleeve],
                  ["Embellishment", draft.embroidery],
                  ["Measurements", draft.measureMode === "profile" ? measurements.find((item) => item.id === draft.measurementId)?.name : draft.measureMode],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-5 py-4 text-sm">
                    <dt className="text-[#948d82]">{label}</dt>
                    <dd className="text-right capitalize text-[#eee6da]">{value || "—"}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-6 border border-[#b8873e]/40 p-5">
                <div className="flex items-baseline justify-between gap-5">
                  <span className="font-display text-lg">Estimated total</span>
                  <strong className="font-display text-2xl font-medium text-[#d4aa68]">{formatNaira(estimate)}</strong>
                </div>
                <p className="mt-2 text-xs leading-5 text-[#918a80]">Final pricing may change only if the atelier recommends a material or construction adjustment.</p>
              </div>
            </div>
          ) : null}

          <FieldError>{error}</FieldError>
          <div className="mt-9 flex flex-wrap justify-between gap-3 border-t border-white/10 pt-6">
            <button
              type="button"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0 || submitting}
              className={outlineButtonClass}
            >
              Back
            </button>
            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setStep((current) => Math.min(STEPS.length - 1, current + 1));
                }}
                disabled={!canContinue}
                className={goldButtonClass}
              >
                Next: {STEPS[step + 1]}
              </button>
            ) : (
              <button type="button" onClick={submitDesign} disabled={submitting} className={goldButtonClass}>
                {submitting ? "Submitting…" : user ? "Submit design request" : "Sign in to submit"}
              </button>
            )}
          </div>
        </section>

        <aside className="h-fit border border-[#8f6d39]/40 bg-[#111310] p-5 lg:sticky lg:top-24">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#b8873e]">Your design</p>
          <div className="relative mt-4 aspect-[4/5] overflow-hidden bg-[#171916]">
            <CommerceImage
              src={selectedStyle?.images?.[0] ? fileUrl(selectedStyle, selectedStyle.images[0], "600x750") : undefined}
              alt={selectedStyle?.name || "Your custom garment preview"}
              sizes="320px"
            />
          </div>
          <div className="mt-5 flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-lg">{selectedStyle?.name || "Choose a silhouette"}</p>
              <p className="mt-1 text-xs text-[#918a80]">{selectedFabric?.name || "Fabric not selected"}</p>
            </div>
            <p className="text-sm text-[#d4aa68]">{formatNaira(estimate)}</p>
          </div>
          <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-[#8e877c]">
            Preview imagery represents the silhouette. Fabric placement and hand-finished details are reviewed by the assigned tailor.
          </p>
        </aside>
      </div>
    </CommercePage>
  );
}
