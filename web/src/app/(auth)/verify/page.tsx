"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { COLLECTIONS, getPb, pbErrorMessage } from "@/lib/pb";
import { Spinner } from "@/components/ui/Spinner";

type State = "waiting" | "verifying" | "success" | "error";

function VerifyContent() {
  const token = useSearchParams().get("token") ?? "";
  const { refresh } = useAuth();
  const [state, setState] = useState<State>(token ? "verifying" : "waiting");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    let active = true;
    getPb()
      .collection(COLLECTIONS.users)
      .confirmVerification(token)
      .then(async () => {
        await refresh();
        if (active) setState("success");
      })
      .catch((err) => {
        if (active) {
          setError(pbErrorMessage(err));
          setState("error");
        }
      });
    return () => {
      active = false;
    };
  }, [token, refresh]);

  if (state === "verifying") {
    return (
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <Spinner />
        <p className="text-sm text-neutral-500">Verifying your email…</p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div>
        <h1 className="font-display text-xl font-semibold text-neutral-900">
          Email verified
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          You&apos;re all set. Continue to your dashboard.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-xl bg-brand-700 px-4 py-2 text-sm font-medium text-white hover:bg-brand-800"
        >
          Continue
        </Link>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div>
        <h1 className="font-display text-xl font-semibold text-neutral-900">
          Verification failed
        </h1>
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
        <p className="mt-2 text-sm text-neutral-500">
          The link may have expired. Sign in and request a new verification
          email from Settings.
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

  // No token — plain "check your email" state.
  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-neutral-900">
        Check your email
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        We&apos;ve sent you a verification link. Click it to confirm your email
        address. You can keep using your account in the meantime.
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

export default function VerifyPage() {
  return (
    <Suspense fallback={<Spinner className="mx-auto" />}>
      <VerifyContent />
    </Suspense>
  );
}
