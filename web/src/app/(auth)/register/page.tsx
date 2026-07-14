"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { homePathFor, useAuth } from "@/lib/auth";
import { pbErrorMessage } from "@/lib/pb";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type Role = "client" | "tailor";

function safeReturnTo(value: string | null): string | null {
  return value?.startsWith("/") && !value.startsWith("//") ? value : null;
}

function RegisterForm() {
  const { signUp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const [role, setRole] = useState<Role>("client");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await signUp({
        ...form,
        email: form.email.trim(),
        userType: role,
      });
      router.replace(returnTo ?? homePathFor(user));
    } catch (err) {
      setError(pbErrorMessage(err));
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-neutral-900">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        Order bespoke garments, or run your tailoring business.
      </p>

      {/* Role toggle */}
      <div
        role="radiogroup"
        aria-label="Account type"
        className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-neutral-100 p-1"
      >
        {(
          [
            { value: "client", label: "I'm a customer" },
            { value: "tailor", label: "I'm a tailor" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={role === opt.value}
            onClick={() => setRole(opt.value)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-700 ${
              role === opt.value
                ? "bg-white text-brand-800 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="First name"
            autoComplete="given-name"
            required
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
          />
          <Input
            label="Last name"
            autoComplete="family-name"
            required
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
          />
        </div>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
        <Input
          label="Phone"
          type="tel"
          autoComplete="tel"
          placeholder="+234 801 234 5678"
          required
          value={form.phone}
          onChange={(e) => set("phone", e.target.value)}
        />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          required
          minLength={8}
          value={form.password}
          onChange={(e) => set("password", e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <Button type="submit" loading={submitting} className="w-full" size="lg">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-sm text-neutral-500">
        Already have an account?{" "}
        <Link
          href={returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login"}
          className="font-medium text-brand-700 hover:text-brand-800"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<p className="text-sm text-neutral-500">Loading registration…</p>}>
      <RegisterForm />
    </Suspense>
  );
}
