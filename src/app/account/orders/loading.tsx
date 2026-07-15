import GhostRows from "@/components/GhostRows";

// Must match OrdersClient's own loading-state variant — otherwise the route
// transition shows this generic skeleton first, then the client component
// mounts and swaps to a differently-shaped one (two ghost screens in a row
// instead of one continuous skeleton).
export default function Loading() {
  return <GhostRows variant="list" rows={3} />;
}
