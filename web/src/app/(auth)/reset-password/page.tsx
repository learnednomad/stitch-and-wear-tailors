"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { COLLECTIONS, getPb, pbErrorMessage } from "@/lib/pb";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await getPb()
        .collection(COLLECTIONS.users)
        .confirmPasswordReset(token, password, confirm);
      setDone(true);
    } catch (err) {
      setError(pbErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div>
        <h1 className="font-display text-xl font-semibold text-neutral-900">
          Invalid reset link
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          This link is missing its reset token. Request a new one and try
          again.
        </p>
        <Link
          href="/forgot-password"
          className="mt-6 inline-block text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div>
        <h1 className="font-display text-xl font-semibold text-neutral-900">
          Password updated
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Your password has been reset. Sign in with your new password.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-neutral-900">
        Choose a new password
      </h1>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" loading={submitting} className="w-full" size="lg">
          Reset password
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Spinner className="mx-auto" />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
