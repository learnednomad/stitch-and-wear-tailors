"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { homePathFor, useAuth } from "@/lib/auth";
import { pbErrorMessage } from "@/lib/pb";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await signIn(email.trim(), password);
      router.replace(homePathFor(user));
    } catch (err) {
      setError(pbErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-neutral-900">
        Welcome back
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Sign in to manage your orders and fittings.
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
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" loading={submitting} className="w-full" size="lg">
          Sign in
        </Button>
      </form>

      <div className="mt-6 flex flex-col gap-2 text-sm">
        <Link
          href="/forgot-password"
          className="text-brand-700 hover:text-brand-800"
        >
          Forgot your password?
        </Link>
        <p className="text-neutral-500">
          New here?{" "}
          <Link
            href="/register"
            className="font-medium text-brand-700 hover:text-brand-800"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
