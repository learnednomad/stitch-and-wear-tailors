"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { COLLECTIONS, getPb, pbErrorMessage } from "@/lib/pb";
import type { User } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PageHeader } from "@/components/ui/PageHeader";
import { useToast } from "@/components/ui/Toast";

/** Shared settings screen for both the client and tailor shells. */
export function SettingsPanel() {
  const { user } = useAuth();
  if (!user) return null;
  // Keyed by user id so the form re-initializes if the account changes.
  return <SettingsForm key={user.id} user={user} />;
}

function SettingsForm({ user }: { user: User }) {
  const { refresh, signOut } = useAuth();
  const toast = useToast();
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    phone: user.phone ?? "",
    businessName: user.businessName ?? "",
    bio: user.bio ?? "",
    location: user.location ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const isTailor = user.userType === "tailor";

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const payload: Record<string, string> = {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
      };
      if (isTailor) {
        payload.businessName = form.businessName;
        payload.bio = form.bio;
        payload.location = form.location;
      }
      await getPb().collection(COLLECTIONS.users).update(user.id, payload);
      await refresh();
      toast.show("Profile updated.", "success");
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setSaving(false);
    }
  }

  async function sendPasswordReset() {
    if (!user) return;
    setSendingReset(true);
    try {
      await getPb()
        .collection(COLLECTIONS.users)
        .requestPasswordReset(user.email);
      toast.show(`Password reset link sent to ${user.email}.`, "success");
    } catch (err) {
      toast.show(pbErrorMessage(err), "error");
    } finally {
      setSendingReset(false);
    }
  }

  function handleSignOut() {
    signOut();
    router.replace("/login");
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your profile and account."
      />
      <div className="space-y-6">
        <Card title="Profile" description="How you appear across Stitch & Wear.">
          <form onSubmit={saveProfile} className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="First name"
                required
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
              />
              <Input
                label="Last name"
                required
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
            </div>
            <Input
              label="Phone"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
            {isTailor && (
              <>
                <Input
                  label="Business name"
                  value={form.businessName}
                  onChange={(e) => set("businessName", e.target.value)}
                />
                <Input
                  label="Location"
                  placeholder="e.g. Surulere, Lagos"
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                />
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="settings-bio"
                    className="text-sm font-medium text-neutral-700"
                  >
                    Bio
                  </label>
                  <textarea
                    id="settings-bio"
                    rows={4}
                    value={form.bio}
                    onChange={(e) => set("bio", e.target.value)}
                    className="w-full rounded-xl border border-neutral-300 bg-white px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-2 focus:outline-offset-1 focus:outline-brand-700"
                    placeholder="Tell customers about your craft…"
                  />
                </div>
              </>
            )}
            <div>
              <Button type="submit" loading={saving}>
                Save changes
              </Button>
            </div>
          </form>
        </Card>

        <Card
          title="Password"
          description="We'll email you a secure link to change your password."
        >
          <Button
            variant="secondary"
            loading={sendingReset}
            onClick={sendPasswordReset}
          >
            Send password reset email
          </Button>
        </Card>

        <Card
          title="Account"
          description={`Signed in as ${user.email}${user.verified ? "" : " (email not verified)"}.`}
        >
          <Button variant="danger" onClick={handleSignOut}>
            Sign out
          </Button>
        </Card>
      </div>
    </div>
  );
}
