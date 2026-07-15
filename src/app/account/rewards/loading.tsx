import GhostRows from "@/components/GhostRows";

// Must match RewardsClient's own loading-state variant (see the note in
// account/orders/loading.tsx) — this used to be a plain spinner, which meant
// shoppers saw a spinner, THEN a differently-shaped shimmer skeleton, THEN
// the real page: two ghost screens back to back instead of one.
export default function Loading() {
  return <GhostRows variant="rewards" />;
}
