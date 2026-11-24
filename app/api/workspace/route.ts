import { currentProfile, openWorkspace } from "@/lib/server/workspace"

export async function GET() {
  const profile = await currentProfile()
  if (!profile) return Response.json({ error: "signed_out" }, { status: 401, headers: { "cache-control": "private, no-store" } })
  const opened = await openWorkspace(profile)
  if (!opened.ok && opened.error === "invite_required") {
    return Response.json({ error: "invite_required", email: opened.email }, { status: 403, headers: { "cache-control": "private, no-store" } })
  }
  if (!opened.ok) return Response.json({ error: "unavailable" }, { status: 500, headers: { "cache-control": "private, no-store" } })
  return Response.json({ state: opened.state, revision: opened.revision }, { headers: { "cache-control": "private, no-store" } })
}
