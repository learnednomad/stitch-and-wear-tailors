"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { customerName } from "@/components/tailor/data";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PageHeader } from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import {
  createMeasurement,
  deleteMeasurement,
  listByUsers,
  listMine,
  updateMeasurement,
  type MeasurementInput,
} from "@/lib/api/measurements";
import { listOrders } from "@/lib/api/orders";
import { formatDate } from "@/lib/format";
import { pbErrorMessage } from "@/lib/pb";
import type { Measurement, Order } from "@/lib/types";

type NumericField = keyof Pick<
  Measurement,
  | "chest"
  | "waist"
  | "hips"
  | "shoulderWidth"
  | "neck"
  | "sleeveLength"
  | "armhole"
  | "bicep"
  | "wrist"
  | "backLength"
  | "frontLength"
  | "inseam"
  | "outseam"
  | "thigh"
  | "knee"
  | "ankle"
  | "rise"
>;

const FIELD_GROUPS: Array<{
  title: string;
  fields: Array<{ key: NumericField; label: string }>;
}> = [
  {
    title: "Upper body",
    fields: [
      { key: "chest", label: "Chest" },
      { key: "waist", label: "Waist" },
      { key: "hips", label: "Hips" },
      { key: "shoulderWidth", label: "Shoulder width" },
      { key: "neck", label: "Neck" },
    ],
  },
  {
    title: "Arms",
    fields: [
      { key: "sleeveLength", label: "Sleeve length" },
      { key: "armhole", label: "Armhole" },
      { key: "bicep", label: "Bicep" },
      { key: "wrist", label: "Wrist" },
    ],
  },
  {
    title: "Torso",
    fields: [
      { key: "backLength", label: "Back length" },
      { key: "frontLength", label: "Front length" },
    ],
  },
  {
    title: "Lower body",
    fields: [
      { key: "inseam", label: "Inseam" },
      { key: "outseam", label: "Outseam" },
      { key: "thigh", label: "Thigh" },
      { key: "knee", label: "Knee" },
      { key: "ankle", label: "Ankle" },
      { key: "rise", label: "Rise" },
    ],
  },
];

/** Allowed values of the measurements.measurementType select field. */
const MEASUREMENT_TYPES = ["traditional", "suit", "shirt", "trouser", "dress"];

function ownerName(m: Measurement): string {
  const u = m.expand?.user;
  if (u) {
    const full = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
    if (full) return full;
    if (u.email) return u.email;
  }
  return `Customer ${m.user.slice(0, 5)}…`;
}

/** Read-only grouped view of one measurement profile. */
function MeasurementDetail({ measurement }: { measurement: Measurement }) {
  const custom = measurement.customMeasurements ?? {};
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm capitalize text-neutral-500">
        {measurement.measurementType.replace(/_/g, " ")} · values in{" "}
        {measurement.unit || "cm"} · updated {formatDate(measurement.updated)}
      </p>
      {FIELD_GROUPS.map((group) => {
        const filled = group.fields.filter((f) => measurement[f.key] > 0);
        if (filled.length === 0) return null;
        return (
          <div key={group.title}>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-400">
              {group.title}
            </p>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
              {filled.map((f) => (
                <div key={f.key} className="flex justify-between gap-2">
                  <dt className="text-neutral-500">{f.label}</dt>
                  <dd className="font-medium text-neutral-900">
                    {measurement[f.key]}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        );
      })}
      {Object.keys(custom).length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-400">
            Custom
          </p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-3">
            {Object.entries(custom).map(([key, value]) => (
              <div key={key} className="flex justify-between gap-2">
                <dt className="capitalize text-neutral-500">
                  {key.replace(/([A-Z])/g, " $1").replace(/[_-]/g, " ")}
                </dt>
                <dd className="font-medium text-neutral-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {measurement.notes && (
        <p className="rounded-xl bg-neutral-50 p-3 text-sm text-neutral-600">
          {measurement.notes}
        </p>
      )}
    </div>
  );
}

export default function TailorMeasurementsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"customers" | "templates">("customers");

  // Customers tab state
  const [customerMeasurements, setCustomerMeasurements] = useState<
    Measurement[] | null
  >(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [viewing, setViewing] = useState<Measurement | null>(null);

  // Templates tab state
  const [templates, setTemplates] = useState<Measurement[] | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Measurement | null>(null);
  const [deleting, setDeleting] = useState<Measurement | null>(null);
  const [acting, setActing] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [measurementType, setMeasurementType] = useState("traditional");
  const [unit, setUnit] = useState("cm");
  const [values, setValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");

  const loadCustomers = useCallback(async () => {
    try {
      const orders = await listOrders({ role: "tailor", perPage: 200 });
      setCustomerOrders(orders.items);
      const ids = [...new Set(orders.items.map((o) => o.customer))];
      setCustomerMeasurements(await listByUsers(ids));
    } catch {
      setCustomerMeasurements([]);
    }
  }, []);

  const loadTemplates = useCallback(async () => {
    try {
      setTemplates(await listMine());
    } catch {
      setTemplates([]);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await Promise.all([loadCustomers(), loadTemplates()]);
    })();
  }, [loadCustomers, loadTemplates]);

  const grouped = useMemo(() => {
    const map = new Map<string, Measurement[]>();
    for (const m of customerMeasurements ?? []) {
      const list = map.get(m.user) ?? [];
      list.push(m);
      map.set(m.user, list);
    }
    return map;
  }, [customerMeasurements]);

  function customerLabel(userId: string, list: Measurement[]): string {
    const withUser = list.find((m) => m.expand?.user);
    if (withUser) return ownerName(withUser);
    const order = customerOrders.find((o) => o.customer === userId);
    return order ? customerName(order) : `Customer ${userId.slice(0, 5)}…`;
  }

  function openForm(template: Measurement | null) {
    setEditing(template);
    setName(template?.name ?? "");
    setMeasurementType(template?.measurementType || "traditional");
    setUnit(template?.unit || "cm");
    const initial: Record<string, string> = {};
    if (template) {
      for (const group of FIELD_GROUPS) {
        for (const f of group.fields) {
          if (template[f.key] > 0) initial[f.key] = String(template[f.key]);
        }
      }
    }
    setValues(initial);
    setNotes(template?.notes ?? "");
    setFormError("");
    setFormOpen(true);
  }

  async function handleSave() {
    if (!name.trim()) {
      setFormError("Give this template a name.");
      return;
    }
    setActing(true);
    setFormError("");
    const input: MeasurementInput = {
      name: name.trim(),
      measurementType,
      unit,
      notes: notes.trim(),
    };
    for (const group of FIELD_GROUPS) {
      for (const f of group.fields) {
        const n = Number(values[f.key]);
        input[f.key] = Number.isFinite(n) && n > 0 ? n : 0;
      }
    }
    try {
      if (editing) {
        await updateMeasurement(editing.id, input);
        toast.show("Template updated.", "success");
      } else {
        await createMeasurement(input);
        toast.show("Template created.", "success");
      }
      setFormOpen(false);
      await loadTemplates();
    } catch (err) {
      setFormError(pbErrorMessage(err));
    } finally {
      setActing(false);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    setActing(true);
    try {
      await deleteMeasurement(deleting.id);
      toast.show("Template deleted.", "info");
      setDeleting(null);
      await loadTemplates();
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setActing(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Measurements"
        description="Customer measurement profiles and your reusable templates."
        actions={
          tab === "templates" ? (
            <Button onClick={() => openForm(null)}>New template</Button>
          ) : undefined
        }
      />

      <div className="mb-6 flex w-fit rounded-xl bg-neutral-100 p-1">
        {[
          { key: "customers" as const, label: "Customers" },
          { key: "templates" as const, label: "My Templates" },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t.key
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "customers" ? (
        customerMeasurements === null ? (
          <div className="flex justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : grouped.size === 0 ? (
          <EmptyState
            title="No customer measurements yet"
            description="Measurement profiles of customers who order from you will appear here."
          />
        ) : (
          <div className="flex flex-col gap-6">
            {[...grouped.entries()].map(([userId, list]) => (
              <Card key={userId} title={customerLabel(userId, list)} flush>
                <ul className="divide-y divide-neutral-100 p-5 pt-0 sm:p-6 sm:pt-0">
                  {list.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-center justify-between gap-3 py-3"
                    >
                      <div className="text-sm">
                        <p className="font-medium text-neutral-900">
                          {m.name}
                          {m.isDefault && (
                            <span className="ml-2 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800">
                              Default
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs capitalize text-neutral-400">
                          {m.measurementType.replace(/_/g, " ")} ·{" "}
                          {m.unit || "cm"} · updated {formatDate(m.updated)}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setViewing(m)}
                      >
                        View
                      </Button>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )
      ) : templates === null ? (
        <div className="flex justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          description="Save your house sizing templates for quick reference in the workshop."
          action={<Button onClick={() => openForm(null)}>New template</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((m) => (
            <Card key={m.id}>
              <p className="text-sm font-semibold text-neutral-900">{m.name}</p>
              <p className="mt-0.5 text-xs capitalize text-neutral-400">
                {m.measurementType.replace(/_/g, " ")} · {m.unit || "cm"} ·
                updated {formatDate(m.updated)}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setViewing(m)}
                >
                  View
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => openForm(m)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => setDeleting(m)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Read-only detail */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title={viewing?.name}
      >
        {viewing && <MeasurementDetail measurement={viewing} />}
      </Modal>

      {/* Create / edit template */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit template" : "New template"}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setFormOpen(false)}
              disabled={acting}
            >
              Cancel
            </Button>
            <Button loading={acting} onClick={handleSave}>
              {editing ? "Save changes" : "Create template"}
            </Button>
          </>
        }
      >
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
          <Input
            label="Name"
            placeholder="e.g. Standard male senator"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={formError}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={measurementType}
              onChange={(e) => setMeasurementType(e.target.value)}
            >
              {MEASUREMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </Select>
            <Select
              label="Unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value="cm">Centimetres (cm)</option>
              <option value="inch">Inches</option>
            </Select>
          </div>
          {FIELD_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-400">
                {group.title}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {group.fields.map((f) => (
                  <Input
                    key={f.key}
                    label={f.label}
                    type="number"
                    min={0}
                    step="0.5"
                    value={values[f.key] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [f.key]: e.target.value,
                      }))
                    }
                  />
                ))}
              </div>
            </div>
          ))}
          <Input
            label="Notes"
            placeholder="Fit preferences, ease allowances… (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this template?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleting(null)}
              disabled={acting}
            >
              Cancel
            </Button>
            <Button variant="danger" loading={acting} onClick={handleDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p>
          &ldquo;{deleting?.name}&rdquo; will be permanently deleted. This
          cannot be undone.
        </p>
      </Modal>
    </div>
  );
}
