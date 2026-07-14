import { ClientResponseError } from "pocketbase";
import { authedUserId, COLLECTIONS, getPb } from "@/lib/pb";
import type {
  Appointment,
  AppointmentType,
  TailorAvailability,
} from "@/lib/types";

export async function listAvailability(
  tailorId: string
): Promise<TailorAvailability[]> {
  const pb = getPb();
  return pb
    .collection(COLLECTIONS.tailorAvailability)
    .getFullList<TailorAvailability>({
      filter: pb.filter("tailor = {:tailor} && isActive = true", {
        tailor: tailorId,
      }),
      sort: "weekday,startTime",
    });
}

export interface TailorAvailabilityInput {
  weekday: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes?: number;
  location?: string;
  appointmentTypes?: AppointmentType[];
  timezone?: string;
  isActive?: boolean;
}

export async function createAvailability(
  input: TailorAvailabilityInput
): Promise<TailorAvailability> {
  validateAvailabilityInput(input);
  return getPb()
    .collection(COLLECTIONS.tailorAvailability)
    .create<TailorAvailability>({
      slotDurationMinutes: 30,
      timezone: "Africa/Lagos",
      isActive: true,
      ...input,
      tailor: authedUserId(),
    });
}

export async function updateAvailability(
  id: string,
  input: Partial<TailorAvailabilityInput>
): Promise<TailorAvailability> {
  return getPb()
    .collection(COLLECTIONS.tailorAvailability)
    .update<TailorAvailability>(id, input);
}

export async function deleteAvailability(id: string): Promise<void> {
  await getPb().collection(COLLECTIONS.tailorAvailability).delete(id);
}

export interface CreateStorefrontAppointmentInput {
  tailor: string;
  scheduledAt: string;
  type: AppointmentType;
  order?: string;
  durationMinutes?: number;
  location?: string;
  notes?: string;
}

export class SlotUnavailableError extends Error {
  constructor(message = "That appointment time is no longer available.") {
    super(message);
    this.name = "SlotUnavailableError";
  }
}

/**
 * Validate a requested start against the tailor's public recurring schedule.
 * The database's partial unique index is the final race-safe conflict check;
 * other customers' appointment records never need to be exposed.
 */
export async function createStorefrontAppointment(
  input: CreateStorefrontAppointmentInput
): Promise<Appointment> {
  const scheduled = new Date(input.scheduledAt);
  if (Number.isNaN(scheduled.getTime()) || scheduled.getTime() <= Date.now()) {
    throw new SlotUnavailableError("Choose a future appointment time.");
  }

  const availability = await listAvailability(input.tailor);
  const window = availability.find((candidate) =>
    appointmentFitsWindow(scheduled, input, candidate)
  );
  if (!window) {
    throw new SlotUnavailableError(
      "That time is outside the tailor's available appointment hours."
    );
  }

  try {
    return await getPb()
      .collection(COLLECTIONS.appointments)
      .create<Appointment>({
        customer: authedUserId(),
        tailor: input.tailor,
        type: input.type,
        scheduledAt: scheduled.toISOString(),
        order: input.order ?? "",
        durationMinutes: input.durationMinutes ?? window.slotDurationMinutes ?? 30,
        location: input.location?.trim() || window.location,
        notes: input.notes?.trim() ?? "",
        status: "requested",
      });
  } catch (error) {
    if (isSlotConflict(error)) throw new SlotUnavailableError();
    throw error;
  }
}

function appointmentFitsWindow(
  scheduled: Date,
  input: CreateStorefrontAppointmentInput,
  window: TailorAvailability
): boolean {
  if (window.appointmentTypes?.length && !window.appointmentTypes.includes(input.type)) {
    return false;
  }

  const local = localDateParts(scheduled, window.timezone || "Africa/Lagos");
  if (local.weekday !== window.weekday) return false;

  const start = timeToMinutes(window.startTime);
  const end = timeToMinutes(window.endTime);
  const duration = input.durationMinutes ?? window.slotDurationMinutes ?? 30;
  if (start === null || end === null || duration < 1) return false;
  if (local.minutes < start || local.minutes + duration > end) return false;

  const step = window.slotDurationMinutes || duration;
  return step > 0 && (local.minutes - start) % step === 0;
}

function localDateParts(
  date: Date,
  timeZone: string
): { weekday: number; minutes: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  const weekdays: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    weekday: weekdays[parts.weekday] ?? -1,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function timeToMinutes(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function validateAvailabilityInput(input: TailorAvailabilityInput): void {
  if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) {
    throw new Error("Weekday must be between 0 and 6.");
  }
  const start = timeToMinutes(input.startTime);
  const end = timeToMinutes(input.endTime);
  if (start === null || end === null || start >= end) {
    throw new Error("Availability must have a valid start and end time.");
  }
}

function isSlotConflict(error: unknown): boolean {
  if (!(error instanceof ClientResponseError)) return false;
  if (error.status === 400) return true;
  return String(error.response?.message ?? error.message).includes(
    "idx_appointments_active_slot"
  );
}
