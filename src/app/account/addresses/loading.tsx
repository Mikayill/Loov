import GhostRows from "@/components/GhostRows";

// Row count must match AddressesClient's own <GhostRows /> call (default
// rows) — see the note in account/orders/loading.tsx.
export default function Loading() {
  return <GhostRows />;
}
