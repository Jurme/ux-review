import { currentProfile, openWorkspace, peekRevision } from "@/lib/server/workspace"

const headers = { "cache-control": "private, no-store" }

export async function GET(request: Request) {
  const profile = await currentProfile()
  if (!profile) return Response.json({ error: "signed_out" }, { status: 401, headers })
  const since = Number(request.headers.get("x-workspace-revision") || 0)
  if (since > 0) {
    const current = await peekRevision()
    if (current === since) return new Response(null, { status: 204, headers })
  }
  const opened = await openWorkspace(profile)
  if (!opened.ok && opened.error === "invite_required") {
    return Response.json({ error: "invite_required", email: opened.email }, { status: 403, headers })
  }
  if (!opened.ok) return Response.json({ error: "unavailable" }, { status: 500, headers })
  return Response.json({ state: opened.state, revision: opened.revision }, { headers })
}
