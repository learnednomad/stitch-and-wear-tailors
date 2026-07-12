import type { ListResult } from "pocketbase";
import { authedUserId, COLLECTIONS, getPb } from "@/lib/pb";
import type { Invoice, InvoiceLineItem, InvoiceStatus } from "@/lib/types";

export interface InvoiceListFilters {
  status?: InvoiceStatus[];
  page?: number;
  perPage?: number;
}

/** Invoices issued by the signed-in tailor. */
export async function listByTailor(
  filters: InvoiceListFilters = {}
): Promise<ListResult<Invoice>> {
  const pb = getPb();
  const { status, page = 1, perPage = 20 } = filters;

  const parts: string[] = [
    pb.filter("tailor = {:uid}", { uid: authedUserId() }),
  ];
  if (status && status.length > 0) {
    parts.push(
      "(" +
        status.map((s) => pb.filter("status = {:s}", { s })).join(" || ") +
        ")"
    );
  }

  return pb.collection(COLLECTIONS.invoices).getList<Invoice>(page, perPage, {
    filter: parts.join(" && "),
    sort: "-created",
    expand: "order,customer",
  });
}

export async function invoicesByOrder(orderId: string): Promise<Invoice[]> {
  const pb = getPb();
  return pb.collection(COLLECTIONS.invoices).getFullList<Invoice>({
    filter: pb.filter("order = {:orderId}", { orderId }),
    sort: "-created",
  });
}

export async function getInvoice(id: string): Promise<Invoice> {
  return getPb().collection(COLLECTIONS.invoices).getOne<Invoice>(id, {
    expand: "order,customer,tailor",
  });
}

export interface CreateInvoiceInput {
  order: string;
  customer: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  depositRequired?: number;
  currency?: string;
  status?: Extract<InvoiceStatus, "draft" | "sent">;
  dueAt?: string;
  notes?: string;
}

/** Creates an invoice with a generated number: INV-YYYY-NNNNN. */
export async function createInvoice(
  input: CreateInvoiceInput
): Promise<Invoice> {
  const pb = getPb();
  const tailor = authedUserId();
  const year = new Date().getFullYear();

  // Sequence from the tailor's invoice count this year (best-effort, low volume).
  const existing = await pb
    .collection(COLLECTIONS.invoices)
    .getList<Invoice>(1, 1, {
      filter: pb.filter("tailor = {:tailor} && invoiceNumber ~ {:prefix}", {
        tailor,
        prefix: `INV-${year}-`,
      }),
    });
  const seq = String(existing.totalItems + 1).padStart(5, "0");

  const status = input.status ?? "draft";
  return pb.collection(COLLECTIONS.invoices).create<Invoice>({
    ...input,
    tailor,
    currency: input.currency ?? "NGN",
    status,
    invoiceNumber: `INV-${year}-${seq}`,
    ...(status === "sent" ? { issuedAt: new Date().toISOString() } : {}),
  });
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus
): Promise<Invoice> {
  return getPb()
    .collection(COLLECTIONS.invoices)
    .update<Invoice>(id, {
      status,
      ...(status === "sent" ? { issuedAt: new Date().toISOString() } : {}),
    });
}
