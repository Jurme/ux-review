import { sqlConnected as sql } from "@/lib/db"
import { hashPassword, verifyPassword } from "@/lib/passwords"

type Row = { email: string; name: string; password_hash: string }

let ready: Promise<void> | undefined

async function ensureTable() {
  ready ??= sql(
    "create table if not exists account_credentials (email text primary key, name text not null, password_hash text not null, created_at timestamptz not null default now())",
  )
    .then(() => undefined)
    .catch((error: unknown) => {
      ready = undefined
      throw error
    })
  await ready
}

export async function findCredential(email: string) {
  await ensureTable()
  const rows = await sql<Row>("select email, name, password_hash from account_credentials where email = $1", [email.toLowerCase()])
  return rows[0] ?? null
}

export async function registerCredential(input: { name: string; email: string; password: string }) {
  const email = input.email.trim().toLowerCase()
  const existing = await findCredential(email)
  if (existing) return { ok: false as const, message: "An account with that email already exists. Sign in instead." }
  const passwordHash = await hashPassword(input.password)
  await sql(
    "insert into account_credentials (email, name, password_hash) values ($1, $2, $3)",
    [email, input.name.trim(), passwordHash],
  )
  return { ok: true as const }
}

export async function checkCredential(email: string, password: string) {
  const row = await findCredential(email)
  if (!row) return "missing" as const
  const matches = await verifyPassword(password, row.password_hash)
  if (!matches) return "password" as const
  return { email: row.email, name: row.name }
}
