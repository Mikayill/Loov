import GhostRows from "@/components/GhostRows";

// Must match OrderDetailClient's own <GhostRows variant="orderDetail" />
// call — see the note in account/orders/loading.tsx.
export default function Loading() {
  return <GhostRows variant="orderDetail" />;
}
