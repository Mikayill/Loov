import GhostRows from "@/components/GhostRows";

// Must match AddressesClient's own <GhostRows variant="addresses" /> call —
// see the note in account/orders/loading.tsx.
export default function Loading() {
  return <GhostRows variant="addresses" />;
}
