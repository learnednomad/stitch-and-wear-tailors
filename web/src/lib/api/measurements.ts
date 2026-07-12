import { authedUserId, COLLECTIONS, getPb } from "@/lib/pb";
import type { BaseRecord, Measurement } from "@/lib/types";

export async function listMine(): Promise<Measurement[]> {
  const pb = getPb();
  return pb.collection(COLLECTIONS.measurements).getFullList<Measurement>({
    filter: pb.filter("user = {:uid}", { uid: authedUserId() }),
    sort: "-isDefault,-created",
  });
}

/** Measurements for a set of users (tailor viewing customers' profiles). */
export async function listByUsers(userIds: string[]): Promise<Measurement[]> {
  if (userIds.length === 0) return [];
  const pb = getPb();
  const filter = userIds
    .map((id) => pb.filter("user = {:id}", { id }))
    .join(" || ");
  return pb.collection(COLLECTIONS.measurements).getFullList<Measurement>({
    filter,
    sort: "user,-isDefault,-created",
    expand: "user",
  });
}

export type MeasurementInput = Partial<
  Omit<Measurement, keyof BaseRecord | "user" | "expand">
> & { name: string };

export async function createMeasurement(
  input: MeasurementInput
): Promise<Measurement> {
  return getPb().collection(COLLECTIONS.measurements).create<Measurement>({
    unit: "cm",
    measurementType: "full_body",
    ...input,
    user: authedUserId(),
  });
}

export async function updateMeasurement(
  id: string,
  input: Partial<MeasurementInput>
): Promise<Measurement> {
  return getPb()
    .collection(COLLECTIONS.measurements)
    .update<Measurement>(id, input);
}

export async function deleteMeasurement(id: string): Promise<void> {
  await getPb().collection(COLLECTIONS.measurements).delete(id);
}
