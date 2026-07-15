import GhostRows from "@/components/GhostRows";

// Must match SecurityClient's own loading-state variant (see the note in
// account/orders/loading.tsx) — was a plain spinner, causing the same
// spinner-then-different-skeleton flicker as rewards/loading.tsx did.
export default function Loading() {
  return <GhostRows variant="security" />;
}
