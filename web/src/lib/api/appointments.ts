import { authedUserId, COLLECTIONS, getPb } from "@/lib/pb";
import type { Appointment, AppointmentType } from "@/lib/types";

export interface CreateAppointmentInput {
  tailor: string;
  customer?: string;
  order?: string;
  type: AppointmentType;
  scheduledAt: string;
  durationMinutes?: number;
  location?: string;
  notes?: string;
}

export async function createAppointment(
  input: CreateAppointmentInput
): Promise<Appointment> {
  return getPb().collection(COLLECTIONS.appointments).create<Appointment>({
    durationMinutes: 30,
    ...input,
    customer: input.customer ?? authedUserId(),
    status: "requested",
  });
}

/**
 * Upcoming (requested/confirmed) appointments for the signed-in user,
 * soonest first. Pass role to pick which side of the appointment you are.
 */
export async function listUpcoming(
  role: "customer" | "tailor" = "customer",
  limit = 20
): Promise<Appointment[]> {
  const pb = getPb();
  const now = new Date().toISOString().replace("T", " ");
  const result = await pb
    .collection(COLLECTIONS.appointments)
    .getList<Appointment>(1, limit, {
      filter: pb.filter(
        `${role} = {:uid} && scheduledAt >= {:now} && (status = "requested" || status = "confirmed")`,
        { uid: authedUserId(), now }
      ),
      sort: "scheduledAt",
      expand: "customer,tailor,order",
    });
  return result.items;
}

export async function cancelAppointment(id: string): Promise<Appointment> {
  return getPb()
    .collection(COLLECTIONS.appointments)
    .update<Appointment>(id, { status: "cancelled" });
}
