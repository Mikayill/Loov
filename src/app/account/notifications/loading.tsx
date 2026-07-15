import GhostRows from "@/components/GhostRows";

// Must match NotificationsClient's own loading-state variant (see the note
// in account/orders/loading.tsx) so the route transition and the client's
// data-fetch skeleton read as one continuous shape.
export default function Loading() {
  return <GhostRows variant="notifications" />;
}
