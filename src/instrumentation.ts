// All booking-hours math (src/lib/availability.ts) uses JS Date's
// server-local-timezone behavior rather than an explicit IANA zone. That's
// only correct if the server's local time actually is the shop's timezone -
// true by coincidence in local dev (this machine is set to Asia/Dubai), but
// most hosts (Vercel included) default their functions to UTC. Pinning TZ
// here makes "server local time" reliably mean Dubai time regardless of
// where this gets deployed.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = "Asia/Dubai";
  }
}
