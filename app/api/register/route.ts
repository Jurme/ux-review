import { isEmail } from "@/lib/format"
import { registerCredential } from "@/lib/credentials"

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
    console.error(error)
    const detail = error instanceof Error ? error.message : ""
    const message = detail.includes("POSTGRES_URL")
      ? "The database is not connected. Add the Supabase connection string on Vercel, then try again."
      : "Could not create the account. Try again."
    return Response.json({ ok: false, message }, { status: 500 })
  }
}
