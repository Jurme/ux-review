import { registerCredential } from "@/lib/credentials"
import { explainDatabaseError } from "@/lib/db"
import { isEmail } from "@/lib/format"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: unknown; email?: unknown; password?: unknown } | null
  const name = typeof body?.name === "string" ? body.name.trim() : ""
  const email = typeof body?.email === "string" ? body.email.trim() : ""
  const password = typeof body?.password === "string" ? body.password : ""
  if (!name) return Response.json({ ok: false, message: "Enter your name." }, { status: 400 })
  if (!isEmail(email)) return Response.json({ ok: false, message: "Enter a valid email address." }, { status: 400 })
  if (password.length < 8) return Response.json({ ok: false, message: "Use a password of at least 8 characters." }, { status: 400 })
  try {
    const result = await registerCredential({ name, email, password })
    if (!result.ok) return Response.json(result, { status: 409 })
    return Response.json({ ok: true })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    console.error(detail.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://[redacted]"))
    return Response.json({ ok: false, message: explainDatabaseError(error) }, { status: 500 })
  }
}
