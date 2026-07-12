import type { ListResult } from "pocketbase";
import { authedUserId, COLLECTIONS, getPb } from "@/lib/pb";
import type { Payment, PaymentMethod, PaymentType } from "@/lib/types";

export async function paymentsByOrder(orderId: string): Promise<Payment[]> {
  const pb = getPb();
  return pb.collection(COLLECTIONS.payments).getFullList<Payment>({
    filter: pb.filter("order = {:orderId}", { orderId }),
    sort: "-created",
    expand: "user,recordedBy",
  });
}

export async function myPayments(
  page = 1,
  perPage = 20
): Promise<ListResult<Payment>> {
  const pb = getPb();
  return pb.collection(COLLECTIONS.payments).getList<Payment>(page, perPage, {
    filter: pb.filter("user = {:uid}", { uid: authedUserId() }),
    sort: "-created",
    expand: "order",
  });
}

export interface CreatePaymentClaimInput {
  order: string;
  amount: number;
  currency?: string;
  method: PaymentMethod;
  paymentType: PaymentType;
  reference?: string;
  notes?: string;
  receipt?: File;
}

/**
 * Client records "I paid" — always status pending_confirmation.
 * Server hooks reconcile order payment fields once the tailor confirms.
 */
export async function createClaim(
  input: CreatePaymentClaimInput
): Promise<Payment> {
  const pb = getPb();
  const uid = authedUserId();
  return pb.collection(COLLECTIONS.payments).create<Payment>({
    ...input,
    currency: input.currency ?? "NGN",
    user: uid,
    recordedBy: uid,
    status: "pending_confirmation",
  });
}

export interface RecordConfirmedPaymentInput extends Omit<CreatePaymentClaimInput, "receipt"> {
  /** The client the payment came from. */
  user: string;
  receipt?: File;
}

/** Tailor records a payment they received themselves — created already confirmed. */
export async function recordConfirmed(
  input: RecordConfirmedPaymentInput
): Promise<Payment> {
  const pb = getPb();
  return pb.collection(COLLECTIONS.payments).create<Payment>({
    ...input,
    currency: input.currency ?? "NGN",
    recordedBy: authedUserId(),
    status: "confirmed",
  });
}

export async function confirmClaim(id: string): Promise<Payment> {
  return getPb()
    .collection(COLLECTIONS.payments)
    .update<Payment>(id, { status: "confirmed" });
}

export async function rejectClaim(id: string, notes?: string): Promise<Payment> {
  return getPb()
    .collection(COLLECTIONS.payments)
    .update<Payment>(id, {
      status: "rejected",
      ...(notes ? { notes } : {}),
    });
}

/** Claims awaiting the signed-in tailor's confirmation. */
export async function pendingClaims(): Promise<Payment[]> {
  const pb = getPb();
  return pb.collection(COLLECTIONS.payments).getFullList<Payment>({
    filter: pb.filter(
      'status = "pending_confirmation" && order.tailor = {:uid}',
      { uid: authedUserId() }
    ),
    sort: "-created",
    expand: "order,user",
  });
}
