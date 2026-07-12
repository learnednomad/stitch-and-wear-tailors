"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import {
  cancelAppointment,
  createAppointment,
  listUpcoming,
} from "@/lib/api/appointments";
import { listTailors } from "@/lib/api/catalog";
import { useAuth } from "@/lib/auth";
import { formatDateTime, relativeTime } from "@/lib/format";
import { pbErrorMessage } from "@/lib/pb";
import type { Appointment, AppointmentType, User } from "@/lib/types";
import { displayName } from "@/components/client/order-utils";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { StatusChip } from "@/components/ui/StatusChip";
import { useToast } from "@/components/ui/Toast";

const TYPES: Array<{ value: AppointmentType; label: string }> = [
  { value: "fitting", label: "Fitting" },
  { value: "consultation", label: "Consultation" },
  { value: "measurement", label: "Measurement" },
  { value: "pickup", label: "Pickup" },
  { value: "delivery", label: "Delivery" },
];

// 9:00 → 17:00 hourly slots.
const TIME_SLOTS = Array.from({ length: 9 }, (_, i) => {
  const hour = 9 + i;
  return {
    value: `${String(hour).padStart(2, "0")}:00`,
    label: hour < 12 ? `${hour}:00 AM` : `${hour === 12 ? 12 : hour - 12}:00 PM`,
  };
});

const DURATIONS = [30, 45, 60, 90];

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

export default function AppointmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      }
    >
      <AppointmentsContent />
    </Suspense>
  );
}

function AppointmentsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const toast = useToast();

  const [tailors, setTailors] = useState<User[]>([]);
  const [upcoming, setUpcoming] = useState<Appointment[] | null>(null);

  // Booking form
  const [tailorId, setTailorId] = useState(searchParams.get("tailor") ?? "");
  const [type, setType] = useState<AppointmentType>("fitting");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState(45);
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [booking, setBooking] = useState(false);

  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadUpcoming = useCallback(() => {
    listUpcoming("customer", 50)
      .then(setUpcoming)
      .catch((err) => toast.show(pbErrorMessage(err), "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!user) return;
    loadUpcoming();
    listTailors({ perPage: 100 })
      .then((r) => setTailors(r.items))
      .catch((err) => toast.show(pbErrorMessage(err), "error"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loadUpcoming]);

  async function handleBook() {
    if (!tailorId || !date || !time) {
      setFormError("Pick a tailor, a date and a time slot.");
      return;
    }
    const scheduledAt = new Date(`${date}T${time}:00`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      setFormError("Pick a time in the future.");
      return;
    }
    setFormError("");
    setBooking(true);
    try {
      await createAppointment({
        tailor: tailorId,
        type,
        scheduledAt: scheduledAt.toISOString(),
        durationMinutes: duration,
        notes: notes.trim() || undefined,
      });
      toast.show("Appointment requested — your tailor will confirm.", "success");
      setDate("");
      setTime("");
      setNotes("");
      loadUpcoming();
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setBooking(false);
    }
  }

  async function handleCancel() {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelAppointment(cancelTarget.id);
      toast.show("Appointment cancelled.", "success");
      setCancelTarget(null);
      loadUpcoming();
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Appointments"
        description="Schedule fittings, consultations, pickups and deliveries."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Booking form */}
        <Card
          title="Book an appointment"
          description="Requests are confirmed by the tailor."
          className="lg:col-span-2 self-start"
        >
          <div className="space-y-4">
            <Select
              label="Tailor"
              value={tailorId}
              onChange={(e) => setTailorId(e.target.value)}
            >
              <option value="">Select a tailor…</option>
              {tailors.map((t) => (
                <option key={t.id} value={t.id}>
                  {displayName(t)}
                  {t.location ? ` — ${t.location}` : ""}
                </option>
              ))}
            </Select>
            <Select
              label="Appointment type"
              value={type}
              onChange={(e) => setType(e.target.value as AppointmentType)}
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
            <Input
              label="Date"
              type="date"
              min={todayISO()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <div>
              <p className="mb-1.5 text-sm font-medium text-neutral-700">
                Time slot
              </p>
              <div className="flex flex-wrap gap-1.5">
                {TIME_SLOTS.map((slot) => (
                  <button
                    key={slot.value}
                    type="button"
                    onClick={() => setTime(slot.value)}
                    aria-pressed={time === slot.value}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      time === slot.value
                        ? "bg-brand-700 text-white"
                        : "border border-neutral-300 bg-white text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
            <Select
              label="Duration"
              value={String(duration)}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} minutes
                </option>
              ))}
            </Select>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="appointment-notes"
                className="text-sm font-medium text-neutral-700"
              >
                Notes
              </label>
              <textarea
                id="appointment-notes"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything the tailor should prepare for"
                className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-2 focus:outline-offset-1 focus:outline-brand-700"
              />
            </div>
            {formError && (
              <p role="alert" className="text-sm text-red-600">
                {formError}
              </p>
            )}
            <Button loading={booking} onClick={handleBook} className="w-full">
              Request appointment
            </Button>
          </div>
        </Card>

        {/* Upcoming list */}
        <Card title="Upcoming" className="lg:col-span-3 self-start">
          {!upcoming ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : upcoming.length === 0 ? (
            <EmptyState
              title="Nothing scheduled"
              description="Book a fitting or consultation using the form."
            />
          ) : (
            <ul className="divide-y divide-neutral-100">
              {upcoming.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3.5"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold capitalize text-neutral-900">
                        {a.type}
                      </p>
                      <StatusChip kind="appointment" status={a.status} />
                    </div>
                    <p className="mt-0.5 text-sm text-neutral-600">
                      {formatDateTime(a.scheduledAt)}{" "}
                      <span className="text-neutral-400">
                        ({relativeTime(a.scheduledAt)} · {a.durationMinutes || 30}{" "}
                        min)
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                      {displayName(a.expand?.tailor) || "Tailor"}
                      {a.location ? ` · ${a.location}` : ""}
                    </p>
                    {a.notes && (
                      <p className="mt-1 text-xs text-neutral-400">{a.notes}</p>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setCancelTarget(a)}
                  >
                    Cancel
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel this appointment?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCancelTarget(null)}
              disabled={cancelling}
            >
              Keep it
            </Button>
            <Button variant="danger" loading={cancelling} onClick={handleCancel}>
              Cancel appointment
            </Button>
          </>
        }
      >
        {cancelTarget && (
          <p>
            Your <span className="font-medium capitalize">{cancelTarget.type}</span>{" "}
            on {formatDateTime(cancelTarget.scheduledAt)} with{" "}
            {displayName(cancelTarget.expand?.tailor) || "your tailor"} will be
            cancelled.
          </p>
        )}
      </Modal>
    </div>
  );
}
