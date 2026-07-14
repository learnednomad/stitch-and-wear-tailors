import type { Metadata } from "next";
import { AppointmentBooking } from "@/components/storefront/commerce/AppointmentBooking";
import { getTailorProfile } from "@/lib/api/storefront";
import type { AppointmentType } from "@/lib/types";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description: "Book a style consultation, measurement session, or garment fitting with a Stitch & Wear tailor.",
};

const PUBLIC_TYPES = new Set<AppointmentType>([
  "consultation",
  "measurement",
  "fitting",
]);

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string | string[];
    order?: string | string[];
    tailor?: string | string[];
    designer?: string | string[];
  }>;
}) {
  const values = await searchParams;
  const rawType = Array.isArray(values.type) ? values.type[0] : values.type;
  const initialType = PUBLIC_TYPES.has(rawType as AppointmentType)
    ? (rawType as AppointmentType)
    : "consultation";
  const initialOrder = Array.isArray(values.order) ? values.order[0] : values.order ?? "";
  let initialTailor = Array.isArray(values.tailor) ? values.tailor[0] : values.tailor ?? "";
  const designer = Array.isArray(values.designer)
    ? values.designer[0]
    : values.designer ?? "";
  if (!initialTailor && designer) {
    initialTailor = await getTailorProfile(designer)
      .then((profile) => profile.tailor)
      .catch(() => "");
  }

  return (
    <AppointmentBooking
      initialType={initialType}
      initialOrder={initialOrder.slice(0, 30)}
      initialTailor={initialTailor.slice(0, 30)}
    />
  );
}
