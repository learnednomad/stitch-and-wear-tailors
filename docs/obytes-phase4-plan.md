# Obytes Migration — Phase 4 Plan (Expo Router + Zustand)

Replaces React Navigation with **Expo Router** and MobX-State-Tree with **Zustand**,
completing the migration to the Obytes starter architecture. Phases 1–3 are done
(env/CI/husky; React Query + RHF; NativeWind). This is the final, largest phase.

## Sequencing (decided)

**Do Phase 4b (Zustand) BEFORE Phase 4a (Expo Router).** Both design passes converged
on this independently:
- React Query (Phase 2) already owns server state, so the MST → Zustand collapse is
  smaller than it looks (only ~3 real client-state stores survive). Landing it first
  stabilizes the state layer.
- Expo Router restructures the same screen files where `observer()`/`useStores` live.
  Doing Zustand first means those files are edited once, not twice, and avoids a
  merge-heavy collision between the two sub-phases.

**Gating on the parallel marketplace session:** Phase 4 rewrites the navigators and
touches nearly every screen — the exact surface the marketplace session is editing
(uncommitted). Phase 4 CANNOT start until that session commits/stashes. First step at
execution time: merge `phase3-nativewind` into `feature/obytes-migration` (73/75 files
auto-merge; the 2 notification screens resolve by "take phase3's version" — already
reconciled to hold both the back button and className). Then re-inventory routes/stores
to include the marketplace additions.

---

## Phase 4b — Zustand (do first)

### Store disposition (7 MST stores → 3 Zustand stores + React Query)
React Query absorbs all server data; only genuine client/UI/session state becomes Zustand.

| MST store / area | Becomes |
|---|---|
| **AuthStore** (session/user/tokens) | **`useAuthStore`** (Zustand). Preserve `mapPBUser` (avatar `""` not null, strict-ISO dates), the Zod `validateUser` gate in `setUser`, and `checkAuthStatus` token hydration. Do NOT persist tokens in the Zustand blob — keychain/`SecureStorage` keeps that role. |
| **OrderStore — wizard** (`orderCreationStep`, `orderCreationData`, `draftOrder`, `startReorderFrom`, pricing calc, `currentLanguage`) | **`useOrderDraftStore`** (Zustand). Ephemeral wizard state. `getTranslation` → extract to a pure `app/i18n/orderTranslations.ts` helper. |
| **OrderStore — lists/stats/realtime** | **DROP → React Query.** Add to `app/api/orders.ts`: `useClientOrders(userId)`, `useOrder(id)`, `useOrderStatistics`, mutations `useCreateOrder/useUpdateOrder/useCancelOrder/useDeleteOrder`. Derived views (urgent/overdue/byStatus) → `select`/`useMemo`. Realtime → `useOrderRealtime` hook that invalidates/`setQueryData` (keep the customer/tailor filter + 20s poll fallback). |
| **MeasurementStore** | Server lists/templates → RQ (`app/api/measurements.ts`). Active-session state → small **`useMeasurementSessionStore`**. |
| **UserStore / FabricStore / AppointmentStore / NotificationStore** | **Eliminated as data holders** → React Query (`useUserProfile`, `useFabrics` (exists), appointment hooks (exist), `useNotifications`/`useUnreadCount`). Residual filter/UI state → local `useState` or an optional tiny `useUiStore`. |
| **RootStore** (cross-store, aggregate counts, bootstrap) | Eliminated. `enabled: !!user` gating on RQ hooks; logout = `queryClient.clear()` + draft reset. |

### Mechanics
- New `app/state/`: `mmkv-persist.ts` (one `StateStorage` over existing MMKV), `authStore.ts`, `orderDraftStore.ts`, `measurementSessionStore.ts`. `app/models/` keeps only Zod schemas/types/utils.
- **`observer()` removal is the biggest change** (~41 files) — Zustand hooks are reactive without it. Codemod per file: drop `observer(...)` wrapper; `const {authStore}=useStores()` → granular `useAuthStore(s=>s.user)` etc.; list access → RQ hook. ~45 distinct files (41 observer + 23 useStores, overlapping).
- `AuthContext` collapses to a thin wrapper returning `useAuthStore` selectors (keeps `useAuth()` shape for the ~10 auth screens; minimizes churn). `useInitialRootStore`/`RootStoreProvider` removed; boot effect calls `checkAuthStatus()` (MMKV is sync — no async rehydrate wait).
- Deps: add `zustand`; after cutover remove `mobx`, `mobx-state-tree`, `mobx-react-lite`, `reactotron-mst` (remove the `mst()` Reactotron plugin AND `trackMstNode` call together or dev boot crashes).
- **Incremental, one store at a time** behind the `useStores` facade — AuthStore first (isolated behind AuthContext), then OrderStore split (add RQ hooks → migrate list/detail screens → move wizard + 6 step screens), then the rest, then delete RootStore + MST deps last. Verify each step: `yarn compile`, `yarn test` (9 suites, none touch MST — safe), sim walkthrough.

### Persistence migration
Old MMKV `root-v1` MST snapshot is dead — use fresh keys (`auth-v2`, …) with a one-time cleanup deleting `root-v1`. Zustand `persist` `partialize` to only what's needed (auth: user + rememberUser).

---

## Phase 4a — Expo Router (do second)

### Layout: keep source in `app/`, routes in `src/app/`
The `app/` dir holds ALL source and `@/* → ./app/*`. Do NOT move it. Configure
`expo-router` root to `src/app` (`plugins: [["expo-router", { root: "./src/app" }]]`).
Route files are **thin wrappers** importing the real screen from `@/screens/...` —
logic stays put; only navigation call-sites change.

### Route tree (groups + redirects replace AppNavigator's branch logic)
```
src/app/
  _layout.tsx            root: providers + <Slot/>, global.css import, Sentry via useNavigationContainerRef
  index.tsx              redirect: onboarding-seen? / auth / role home
  (auth)/                sign-in, sign-up, verify-email, verify-otp, forgot/reset-password, onboarding, 2fa/biometric setup
  (client)/(tabs)/       home, orders, browse, pay, settings   + orders/[id], [id]/track, [id]/chat, new, history,
                         fabrics/search, book-fitting, styles, catalog, wallet, notifications,
                         marketplace/index, products/[id], cart, checkout, purchases   ← marketplace, ported at merge
  (tailor)/(tabs)/       dashboard, orders, measurements, analytics, settings + orders/[id], measurements/add|[id],
                         invoices/index|[id]|new, notifications, manage-products   ← marketplace, ported at merge
  +not-found.tsx
```
Auth/role gating = group `_layout.tsx` files with `<Redirect>` reading `useAuth()`/`useAuthStore`. Modal routes (chat, invoice/new, measurement/add, delete-confirm) via `options={{ presentation: 'modal' }}`.

### Call-site migration (~40 files)
- `useNavigation`+`navigation.navigate("OrderDetail",{orderId})` → `useRouter`+`router.push(\`/orders/${orderId}\`)` (33 sites; drive with a name→path table codemod).
- `navigation.goBack()`/`canGoBack()` → `router.back()`/`router.canGoBack()` (34 sites).
- `route.params.x` → `useLocalSearchParams()` (13 sites; **all params are strings** — `Number()`-coerce `Payment.amount`, `Measurement.amount`).
- Drop `AppStackScreenProps<'X'>` prop typing (29 files); enable `experiments.typedRoutes` for compile-time `href` checks.
- Global `navigationUtilities` helpers → `import { router } from "expo-router"`; audit non-screen callers (`grep 'from "@/navigators"'`).

### Config / entry
- `package.json` `main` → `expo-router/entry` (delete `index.tsx` after moving `global.css` + url-polyfill imports into root `_layout`).
- `app.json`: `scheme: "stitchandwear"`, add `expo-router` plugin (`root: ./src/app`), `experiments.typedRoutes: true`. `withNativeWind` unchanged.
- **Drop nav-state persistence** (`useNavigationPersistence`, `NAVIGATION_STATE`) — Expo Router cold-starts to `index.tsx`'s redirect, which is the desired auth/role landing. `useBackButtonHandler` removed (router handles Android back).
- Deep links now derived from file tree; verify the reset-password email template still targets `stitchandwear://reset-password`.

### Cutover + safety
Big-bang for the entry (can't run two `main` entries), but screen bodies are already
Zustand-clean from 4b. Sequence: add dep+config+`src/app` wrappers (old app still boots)
→ flip `main` + root `_layout` + call-site codemod in one commit (app boots to sign-in)
→ migrate group-by-group (auth → client → tailor → marketplace). Verify each: iOS sim
(login, every tab, one detail per stack, a `simctl openurl` deep link) + `expo export`
(catches route/import errors CI misses). Rollback = revert the single cutover commit.

---

## Verification (whole phase)
- Per step: `yarn compile` 0 errors, `yarn test --forceExit` (126), iOS bundle exports.
- End-to-end on the simulator with both demo accounts: auth flow, order wizard → create,
  tailor board accept/status, invoicing + payment, chat, notifications, deep links.
- The `type-check.yml` CI gate (typed routes) is the primary guard for 4a.

## Top risks
1. **Marketplace merge** must land first — Phase 4 can't run against a moving navigator.
2. **AuthStore contract** (Zod gate + PB-token hydration) must survive the Zustand port.
3. **OrderStore realtime ↔ React Query** boundary (invalidate/setQueryData, keep poll fallback).
4. **~45-file observer/useStores churn** (4b) + **~40-file nav-call churn** (4a) — sequencing 4b→4a keeps each file edited once.
5. Reactotron MST plugin + `trackMstNode` must be removed together.
