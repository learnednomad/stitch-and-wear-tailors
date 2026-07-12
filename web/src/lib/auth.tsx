"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { COLLECTIONS, getPb } from "@/lib/pb";
import type { User, UserType } from "@/lib/types";

export interface SignUpInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  userType: Exclude<UserType, "admin">;
}

interface AuthContextValue {
  user: User | null;
  /** True until the auth store has been read on the client. */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (input: SignUpInput) => Promise<User>;
  signOut: () => void;
  /** Re-validate + refresh the stored token and user record. */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// --- authStore as an external store (SSR-safe) ------------------------------
// The snapshot is a version counter: -1 on the server / during hydration,
// >= 0 once the browser store is readable. Bumped on every authStore change.
let authVersion = 0;
let bumpRegistered = false;

function subscribeAuthStore(onStoreChange: () => void): () => void {
  const pb = getPb();
  if (!bumpRegistered) {
    bumpRegistered = true;
    // Registered first so the version is bumped before React re-reads it.
    pb.authStore.onChange(() => {
      authVersion++;
    });
  }
  return pb.authStore.onChange(onStoreChange);
}

const getAuthVersion = () => authVersion;
const getServerAuthVersion = () => -1;

export function AuthProvider({ children }: { children: ReactNode }) {
  const version = useSyncExternalStore(
    subscribeAuthStore,
    getAuthVersion,
    getServerAuthVersion
  );
  const loading = version === -1;

  const user = useMemo<User | null>(() => {
    if (version === -1) return null;
    const pb = getPb();
    return pb.authStore.isValid
      ? (pb.authStore.record as unknown as User)
      : null;
  }, [version]);

  const signIn = useCallback(async (email: string, password: string) => {
    const result = await getPb()
      .collection(COLLECTIONS.users)
      .authWithPassword<User>(email, password);
    return result.record;
  }, []);

  const signUp = useCallback(async (input: SignUpInput) => {
    const pb = getPb();
    await pb.collection(COLLECTIONS.users).create({
      email: input.email,
      password: input.password,
      passwordConfirm: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      userType: input.userType,
      status: "pending_verification",
    });
    // Fire-and-forget the verification email, then log the user in
    // (PocketBase allows unverified sign-in).
    pb.collection(COLLECTIONS.users)
      .requestVerification(input.email)
      .catch(() => {});
    const result = await pb
      .collection(COLLECTIONS.users)
      .authWithPassword<User>(input.email, input.password);
    return result.record;
  }, []);

  const signOut = useCallback(() => {
    getPb().authStore.clear();
  }, []);

  const refresh = useCallback(async () => {
    const pb = getPb();
    if (!pb.authStore.isValid) return;
    try {
      await pb.collection(COLLECTIONS.users).authRefresh();
    } catch {
      pb.authStore.clear();
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, refresh }),
    [user, loading, signIn, signUp, signOut, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>.");
  return ctx;
}

/** Where a user's shell lives, by role. */
export function homePathFor(user: Pick<User, "userType">): string {
  return user.userType === "tailor" ? "/tailor" : "/app";
}

/**
 * Guard for shell layouts. Redirects to /login when signed out and to the
 * correct shell when the role doesn't match (admins pass everywhere).
 */
export function useRequireAuth(role?: "client" | "tailor"): {
  user: User | null;
  ready: boolean;
} {
  const { user, loading } = useAuth();
  const router = useRouter();

  const wrongRole =
    !!user &&
    !!role &&
    user.userType !== "admin" &&
    ((role === "client" && user.userType !== "client") ||
      (role === "tailor" && user.userType !== "tailor"));

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (wrongRole) {
      router.replace(homePathFor(user));
    }
  }, [loading, user, wrongRole, router]);

  return { user, ready: !loading && !!user && !wrongRole };
}
