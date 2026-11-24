import { currentProfile, isAction, mutateWorkspace } from "@/lib/server/workspace"

export async function POST(request: Request) {
  const profile = await currentProfile()
  if (!profile) return Response.json({ error: "signed_out" }, { status: 401, headers: { "cache-control": "private, no-store" } })
  const body = (await request.json().catch(() => null)) as { action?: unknown; args?: unknown; revision?: unknown } | null
  if (!body || !isAction(body.action) || !Array.isArray(body.args) || typeof body.revision !== "number") {
    return Response.json({ ok: false, message: "That change could not be read." }, { status: 400 })
  }
  const result = await mutateWorkspace(profile, body.action, body.args, body.revision)
  if (!result.ok && result.error === "conflict") return Response.json({ error: "conflict" }, { status: 409 })
  if (!result.ok && result.error === "invite_required") {
    return Response.json({ error: "invite_required", email: profile.email }, { status: 403 })
  }
  if (!result.ok && result.error === "unavailable") return Response.json({ ok: false, message: "The workspace is unavailable." }, { status: 500 })
  if (!result.ok && result.error === "rejected") {
    return Response.json({ ok: false, message: result.message, state: result.state, revision: result.revision })
  }
  if (!result.ok) return Response.json({ ok: false, message: "That change did not save." }, { status: 400 })
  return Response.json({ ok: true, message: result.message, id: result.id, state: result.state, revision: result.revision })
}
