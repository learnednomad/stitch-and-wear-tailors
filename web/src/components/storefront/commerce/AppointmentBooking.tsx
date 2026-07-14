"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
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
import {
  createStorefrontAppointment,
  listAvailability,
  SlotUnavailableError,
} from "@/lib/api/availability";
import { listTailorProfiles } from "@/lib/api/storefront";
import { useAuth } from "@/lib/auth";
import { fileUrl, pbErrorMessage } from "@/lib/pb";
import type {
  Appointment,
  AppointmentType,
  TailorAvailability,
  TailorProfile,
} from "@/lib/types";

const BOOKING_DRAFT_KEY = "stitchwear.storefront.appointment-draft.v1";
const NIGERIA_OFFSET = "+01:00";

type ServiceMode = "atelier" | "virtual" | "home";

interface BookingDraft {
  tailor: string;
  type: AppointmentType;
  scheduledAt: string;
  durationMinutes: number;
  serviceMode: ServiceMode;
  homeAddress: string;
  notes: string;
  order: string;
}

interface BookingSlot {
  value: string;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
  durationMinutes: number;
  location: string;
}

const TYPES: Array<{
  value: AppointmentType;
  label: string;
  description: string;
}> = [
  {
    value: "consultation",
    label: "Style consultation",
    description: "Discuss an occasion, silhouette, cloth, and finish.",
  },
  {
    value: "measurement",
    label: "Measurement session",
    description: "Create or confirm a precise made-to-measure profile.",
  },
  {
    value: "fitting",
    label: "Garment fitting",
    description: "Review an existing order before its final finish.",
  },
];

function nigeriaToday(): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(values.year), month: Number(values.month), day: Number(values.day) };
}

function minutes(value: string) {
  const [hours, mins] = value.split(":").map(Number);
  return hours * 60 + mins;
}

function timeValue(value: number) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}

function buildSlots(
  availability: TailorAvailability[],
  appointmentType: AppointmentType
): BookingSlot[] {
  const today = nigeriaToday();
  const slots = new Map<string, BookingSlot>();
  for (let offset = 0; offset < 28; offset += 1) {
    const day = new Date(Date.UTC(today.year, today.month - 1, today.day + offset));
    const dateKey = [
      day.getUTCFullYear(),
      String(day.getUTCMonth() + 1).padStart(2, "0"),
      String(day.getUTCDate()).padStart(2, "0"),
    ].join("-");
    const windows = availability.filter(
      (entry) =>
        entry.weekday === day.getUTCDay() &&
        (!entry.appointmentTypes?.length || entry.appointmentTypes.includes(appointmentType))
    );
    for (const window of windows) {
      const start = minutes(window.startTime);
      const end = minutes(window.endTime);
      const duration = window.slotDurationMinutes || 30;
      for (let cursor = start; cursor + duration <= end; cursor += duration) {
        const value = new Date(
          `${dateKey}T${timeValue(cursor)}:00${NIGERIA_OFFSET}`
        ).toISOString();
        if (new Date(value).getTime() <= Date.now() + 30 * 60 * 1000) continue;
        const date = new Date(value);
        slots.set(value, {
          value,
          dateKey,
          dateLabel: new Intl.DateTimeFormat("en-NG", {
            timeZone: "Africa/Lagos",
            weekday: "short",
            day: "numeric",
            month: "short",
          }).format(date),
          timeLabel: new Intl.DateTimeFormat("en-NG", {
            timeZone: "Africa/Lagos",
            hour: "numeric",
            minute: "2-digit",
          }).format(date),
          durationMinutes: duration,
          location: window.location,
        });
      }
    }
  }
  return [...slots.values()].sort((a, b) => a.value.localeCompare(b.value));
}

export function AppointmentBooking({
  initialType,
  initialOrder,
  initialTailor,
}: {
  initialType: AppointmentType;
  initialOrder: string;
  initialTailor: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<TailorProfile[]>([]);
  const [availability, setAvailability] = useState<TailorAvailability[]>([]);
  const [draft, setDraft] = useState<BookingDraft>({
    tailor: initialTailor,
    type: initialType,
    scheduledAt: "",
    durationMinutes: 30,
    serviceMode: "atelier",
    homeAddress: "",
    notes: "",
    order: initialOrder,
  });
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [appointment, setAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      try {
        const stored = window.localStorage.getItem(BOOKING_DRAFT_KEY);
        if (active && stored) {
          const saved = JSON.parse(stored) as Partial<BookingDraft>;
          setDraft((current) => ({
            ...current,
            ...saved,
            type: initialType || saved.type || current.type,
            order: initialOrder || saved.order || current.order,
            tailor: initialTailor || saved.tailor || current.tailor,
          }));
        }
      } catch {
        // Ignore a stale local booking draft.
      } finally {
        if (active) setDraftHydrated(true);
      }
    });
    return () => {
      active = false;
    };
  }, [initialOrder, initialTailor, initialType]);

  useEffect(() => {
    if (!draftHydrated) return;
    window.localStorage.setItem(BOOKING_DRAFT_KEY, JSON.stringify(draft));
  }, [draft, draftHydrated]);

  useEffect(() => {
    let active = true;
    listTailorProfiles({ perPage: 100 })
      .then((result) => {
        if (!active) return;
        setProfiles(result.items);
        if (!draft.tailor && result.items.length === 1) {
          setDraft((current) => ({ ...current, tailor: result.items[0].tailor }));
        }
      })
      .catch((reason) => {
        if (active) setError(pbErrorMessage(reason));
      })
      .finally(() => {
        if (active) setLoadingProfiles(false);
      });
    return () => {
      active = false;
    };
    // The initial selection is read once; subsequent choices should not reload profiles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draft.tailor) return;
    let active = true;
    queueMicrotask(() => {
      if (active) setLoadingSlots(true);
    });
    listAvailability(draft.tailor)
      .then((items) => {
        if (active) setAvailability(items);
      })
      .catch((reason) => {
        if (active) setError(pbErrorMessage(reason));
      })
      .finally(() => {
        if (active) setLoadingSlots(false);
      });
    return () => {
      active = false;
    };
  }, [draft.tailor]);

  const slots = useMemo(
    () => buildSlots(availability, draft.type),
    [availability, draft.type]
  );
  const dates = useMemo(
    () => [...new Map(slots.map((slot) => [slot.dateKey, slot.dateLabel])).entries()],
    [slots]
  );
  const selectedDate = draft.scheduledAt
    ? slots.find((slot) => slot.value === draft.scheduledAt)?.dateKey ?? ""
    : dates[0]?.[0] ?? "";
  const selectedSlot = slots.find((slot) => slot.value === draft.scheduledAt);
  const selectedProfile = profiles.find((profile) => profile.tailor === draft.tailor);

  function update<K extends keyof BookingDraft>(key: K, value: BookingDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!draft.tailor) {
      setError("Choose a tailor for your appointment.");
      return;
    }
    if (!selectedSlot) {
      setError("Choose an available date and time.");
      return;
    }
    if (draft.serviceMode === "home" && !draft.homeAddress.trim()) {
      setError("Enter the address for your home visit.");
      return;
    }
    if (!user) {
      const returnTo = `/appointments?type=${draft.type}${draft.order ? `&order=${encodeURIComponent(draft.order)}` : ""}${draft.tailor ? `&tailor=${encodeURIComponent(draft.tailor)}` : ""}`;
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    if (user.userType !== "client") {
      setError("Appointments can be booked from a customer account.");
      return;
    }

    setSubmitting(true);
    try {
      const modeNote =
        draft.serviceMode === "virtual"
          ? "Preferred format: virtual consultation."
          : draft.serviceMode === "home"
            ? "Preferred format: home visit."
            : "Preferred format: in-atelier appointment.";
      const created = await createStorefrontAppointment({
        tailor: draft.tailor,
        scheduledAt: selectedSlot.value,
        type: draft.type,
        order: draft.order || undefined,
        durationMinutes: selectedSlot.durationMinutes,
        location:
          draft.serviceMode === "virtual"
            ? "Virtual consultation"
            : draft.serviceMode === "home"
              ? draft.homeAddress.trim()
              : selectedSlot.location,
        notes: [modeNote, draft.notes.trim()].filter(Boolean).join(" "),
      });
      window.localStorage.removeItem(BOOKING_DRAFT_KEY);
      setAppointment(created);
    } catch (reason) {
      if (reason instanceof SlotUnavailableError) {
        setDraft((current) => ({ ...current, scheduledAt: "" }));
        setAvailability(await listAvailability(draft.tailor).catch(() => availability));
      }
      setError(pbErrorMessage(reason));
      setSubmitting(false);
    }
  }

  if (appointment) {
    const date = new Date(appointment.scheduledAt);
    return (
      <CommercePage title="Appointment requested" eyebrow="Your fitting journey" width="max-w-3xl">
        <section className="border border-[#8f6d39]/40 bg-[#101210] p-7 text-center sm:p-10">
          <div className="mx-auto grid size-16 place-items-center rounded-full border border-[#b8873e] text-2xl text-[#d4aa68]">✓</div>
          <h2 className="mt-6 font-display text-2xl">We’ve sent your request</h2>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#aaa397]">
            {selectedProfile?.displayName || "The tailor"} will confirm your {draft.type.replaceAll("_", " ")} appointment for{" "}
            {new Intl.DateTimeFormat("en-NG", {
              timeZone: "Africa/Lagos",
              dateStyle: "full",
              timeStyle: "short",
            }).format(date)}.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/app/appointments" className={goldButtonClass}>View appointments</Link>
            <Link href="/" className={outlineButtonClass}>Return home</Link>
          </div>
        </section>
      </CommercePage>
    );
  }

  return (
    <CommercePage
      title="Book an Appointment"
      eyebrow="Personal service"
      description="Choose a service, a trusted tailor, and a time drawn from their live recurring schedule."
      width="max-w-6xl"
    >
      <form onSubmit={submit} noValidate className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
          <fieldset>
            <legend className={luxuryLabelClass}>Consultation type</legend>
            <div className="space-y-2">
              {TYPES.map((item) => (
                <label
                  key={item.value}
                  className={`block cursor-pointer border p-4 transition ${
                    draft.type === item.value
                      ? "border-[#b8873e] bg-[#b8873e]/10"
                      : "border-white/10 bg-[#0e100e] hover:border-white/25"
                  }`}
                >
                  <input
                    type="radio"
                    name="appointmentType"
                    value={item.value}
                    checked={draft.type === item.value}
                    onChange={() => {
                      setDraft((current) => ({
                        ...current,
                        type: item.value,
                        scheduledAt: "",
                      }));
                      setError("");
                    }}
                    className="sr-only"
                  />
                  <span className="block text-sm text-[#eee6da]">{item.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-[#8f887d]">{item.description}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className={luxuryLabelClass}>Appointment format</legend>
            <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
              {[
                ["atelier", "In atelier"],
                ["virtual", "Virtual"],
                ["home", "Home visit"],
              ].map(([value, label]) => (
                <label
                  key={value}
                  className={`cursor-pointer border px-3 py-3 text-center text-xs transition lg:text-left ${
                    draft.serviceMode === value
                      ? "border-[#b8873e] text-[#e5c78f]"
                      : "border-white/10 text-[#918a80]"
                  }`}
                >
                  <input
                    type="radio"
                    name="serviceMode"
                    value={value}
                    checked={draft.serviceMode === value}
                    onChange={() => update("serviceMode", value as ServiceMode)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </aside>

        <div className="space-y-7">
          <section className="border border-white/10 bg-[#0e100e] p-5 sm:p-7">
            <h2 className="font-display text-xl">1. Choose your tailor</h2>
            <p className="mt-1 text-xs text-[#918a80]">Only safe public atelier profiles appear here.</p>
            {loadingProfiles ? (
              <div className="mt-5 h-32 animate-pulse bg-white/[0.03]" />
            ) : profiles.length === 0 ? (
              <p className="mt-5 border border-white/10 p-5 text-sm text-[#aaa397]">No tailors are accepting public appointments yet.</p>
            ) : (
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    aria-pressed={draft.tailor === profile.tailor}
                    onClick={() =>
                      setDraft((current) => ({
                        ...current,
                        tailor: profile.tailor,
                        scheduledAt: "",
                      }))
                    }
                    className={`flex items-center gap-3 border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-[#d4aa68] ${
                      draft.tailor === profile.tailor
                        ? "border-[#b8873e] bg-[#b8873e]/10"
                        : "border-white/10 hover:border-white/25"
                    }`}
                  >
                    <span className="relative size-14 shrink-0 overflow-hidden rounded-full bg-[#171916]">
                      <CommerceImage
                        src={profile.avatar ? fileUrl(profile, profile.avatar, "160x160") : undefined}
                        alt=""
                        sizes="56px"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-[#eee6da]">{profile.displayName}</span>
                      <span className="mt-1 block truncate text-[0.68rem] text-[#918a80]">{profile.location || profile.headline}</span>
                      {profile.rating > 0 ? (
                        <span className="mt-1 block text-[0.65rem] text-[#d4aa68]">★ {profile.rating.toFixed(1)}</span>
                      ) : null}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="border border-white/10 bg-[#0e100e] p-5 sm:p-7">
            <h2 className="font-display text-xl">2. Select a date and time</h2>
            <p className="mt-1 text-xs text-[#918a80]">Times shown in West Africa Time (WAT).</p>
            {!draft.tailor ? (
              <p className="mt-5 border border-white/10 p-5 text-sm text-[#918a80]">Choose a tailor to see their next available sessions.</p>
            ) : loadingSlots ? (
              <div className="mt-5 h-40 animate-pulse bg-white/[0.03]" />
            ) : slots.length === 0 ? (
              <p className="mt-5 border border-white/10 p-5 text-sm text-[#aaa397]">No {draft.type} times are available in the next four weeks. Try another tailor or service.</p>
            ) : (
              <div className="mt-5">
                <div className="flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Appointment date">
                  {dates.map(([dateKey, label]) => (
                    <button
                      type="button"
                      role="tab"
                      key={dateKey}
                      aria-selected={selectedDate === dateKey}
                      onClick={() => {
                        const first = slots.find((slot) => slot.dateKey === dateKey);
                        setDraft((current) => ({
                          ...current,
                          scheduledAt: first?.value ?? "",
                          durationMinutes: first?.durationMinutes ?? 30,
                        }));
                      }}
                      className={`min-w-24 shrink-0 border px-3 py-3 text-xs ${
                        selectedDate === dateKey
                          ? "border-[#b8873e] bg-[#b8873e]/10 text-[#e5c78f]"
                          : "border-white/10 text-[#918a80]"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
                  {slots
                    .filter((slot) => slot.dateKey === selectedDate)
                    .map((slot) => (
                      <button
                        type="button"
                        key={slot.value}
                        aria-pressed={draft.scheduledAt === slot.value}
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            scheduledAt: slot.value,
                            durationMinutes: slot.durationMinutes,
                          }))
                        }
                        className={`border px-2 py-3 text-xs ${
                          draft.scheduledAt === slot.value
                            ? "border-[#b8873e] bg-[#b8873e] text-black"
                            : "border-white/10 text-[#c0b6a8] hover:border-white/25"
                        }`}
                      >
                        {slot.timeLabel}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </section>

          <section className="border border-white/10 bg-[#0e100e] p-5 sm:p-7">
            <h2 className="font-display text-xl">3. Add appointment details</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              {draft.serviceMode === "home" ? (
                <label className="sm:col-span-2">
                  <span className={luxuryLabelClass}>Home visit address</span>
                  <textarea
                    className={`${luxuryInputClass} min-h-24 resize-y`}
                    value={draft.homeAddress}
                    onChange={(event) => update("homeAddress", event.target.value)}
                    maxLength={200}
                    autoComplete="street-address"
                  />
                </label>
              ) : null}
              <label className="sm:col-span-2">
                <span className={luxuryLabelClass}>Notes for the tailor (optional)</span>
                <textarea
                  className={`${luxuryInputClass} min-h-24 resize-y`}
                  value={draft.notes}
                  onChange={(event) => update("notes", event.target.value)}
                  maxLength={400}
                  placeholder="Tell the tailor about your occasion, existing order, accessibility needs, or goals for the session."
                />
              </label>
            </div>
            <FieldError>{error}</FieldError>
            <div className="mt-6 flex flex-col items-stretch justify-between gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center">
              <p className="text-xs leading-5 text-[#918a80]">
                {selectedSlot
                  ? `${selectedSlot.dateLabel} at ${selectedSlot.timeLabel} · ${selectedSlot.durationMinutes} minutes`
                  : "Choose a date and time to continue."}
              </p>
              <button
                type="submit"
                disabled={submitting || profiles.length === 0}
                className={goldButtonClass}
              >
                {submitting ? "Requesting…" : user ? "Request appointment" : "Sign in to request"}
              </button>
            </div>
          </section>
        </div>
      </form>
    </CommercePage>
  );
}
