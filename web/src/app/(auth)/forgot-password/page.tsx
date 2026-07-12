"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { COLLECTIONS, getPb, pbErrorMessage } from "@/lib/pb";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await getPb()
        .collection(COLLECTIONS.users)
        .requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(pbErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div>
        <h1 className="font-display text-xl font-semibold text-neutral-900">
          Check your email
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          If an account exists for <span className="font-medium">{email}</span>,
          we&apos;ve sent a link to reset your password.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-brand-700 hover:text-brand-800"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-neutral-900">
        Reset your password
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" loading={submitting} className="w-full" size="lg">
          Send reset link
        </Button>
      </form>
      <Link
        href="/login"
        className="mt-6 inline-block text-sm text-brand-700 hover:text-brand-800"
      >
        Back to sign in
      </Link>
    </div>
  );
}
