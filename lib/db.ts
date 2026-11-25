import { mkdir, readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { PGlite } from "@electric-sql/pglite"
import postgres from "postgres"

const localDir = path.join(process.cwd(), ".data", "pglite")

type Remote = ReturnType<typeof postgres>

const holders = globalThis as unknown as {
  uxReviewPg?: Remote
  uxReviewPgReady?: Promise<void>
  uxReviewLocal?: Promise<PGlite>
}

function readEnv(name: string) {
  let value = process.env[name]?.trim() ?? ""
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1).trim()
  }
  return value
}

function databaseCandidates() {
  const seen = new Set<string>()
  const urls: string[] = []
  for (const name of ["POSTGRES_URL", "POSTGRES_PRISMA_URL", "DATABASE_URL", "POSTGRES_URL_NON_POOLING", "DATABASE_URL_UNPOOLED"]) {
    const value = readEnv(name)
    if (!value || seen.has(value)) continue
    seen.add(value)
    urls.push(value)
  }
  return urls
}

function isPoolerUrl(url: string) {
  return /pooler\.supabase\.com|:6543(?:\/|\?|$)/i.test(url)
}

export function pooledDatabaseUrl() {
  const urls = databaseCandidates()
  return urls.find(isPoolerUrl) ?? urls[0] ?? ""
}

export function directDatabaseUrl() {
  return readEnv("POSTGRES_URL_NON_POOLING") || readEnv("DATABASE_URL_UNPOOLED") || pooledDatabaseUrl()
}

function needsSsl(url: string) {
  return /supabase\.(co|com)|pooler\.supabase|sslmode=require/i.test(url)
}

const schema = [
  `create table if not exists workspace_state (
    id text primary key,
    document text not null,
    revision integer not null default 1,
    updated_at timestamptz not null default now()
  )`,
  `create table if not exists account_credentials (
    email text primary key,
    name text not null,
    password_hash text not null,
    created_at timestamptz not null default now()
  )`,
]

function prepareDatabaseUrl(url: string) {
  if (/\[(?:YOUR-)?PASSWORD\]/i.test(url)) {
    throw new Error("POSTGRES_URL still contains [YOUR-PASSWORD]. In Supabase, replace that with the database password, paste the URI into Vercel, and redeploy.")
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error("POSTGRES_URL could not be read. In Supabase, copy the Transaction pooler URI again. If the database password contains symbols, reset it to letters and numbers, then update Vercel and redeploy.")
  }
  parsed.search = ""
  parsed.hash = ""
  return { href: parsed.toString(), ssl: needsSsl(url) ? ({ rejectUnauthorized: false } as const) : false }
}

export function explainDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/POSTGRES_URL|Transaction pooler|\[YOUR-PASSWORD\]|could not be read/.test(message)) return message
  const nested = error instanceof AggregateError ? error.errors.map((item) => (item instanceof Error ? item.message : String(item))) : []
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : ""
  const text = [message, code, ...nested].join(" ")
  if (/password authentication failed|28P01/i.test(text)) {
    return "Supabase rejected the password in POSTGRES_URL. Copy the Transaction pooler URI again, replace [YOUR-PASSWORD] with the database password, update it in Vercel, and redeploy."
  }
  if (/tenant or user not found|tenant\/user/i.test(text)) {
    return "Supabase did not recognize the user in POSTGRES_URL. Copy the Transaction pooler URI again. The user looks like postgres.your-project-id."
  }
  if (/ENOTFOUND|ENETUNREACH|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|CONNECT_TIMEOUT|EHOSTUNREACH|AggregateError|getaddrinfo/i.test(text)) {
    return "Vercel could not reach Supabase. Set POSTGRES_URL to the Transaction pooler URI (host pooler.supabase.com, port 6543), then redeploy."
  }
  if (/certificate|self-signed|SSL/i.test(text)) {
    return "Supabase blocked the connection over SSL. Redeploy this update, then create the account again."
  }
  return "Could not create the account. Check that POSTGRES_URL is the Transaction pooler URI from Supabase, then redeploy."
}

function statements(source: string) {
  return source
    .split(";")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.split("\n").every((line) => line.trim().startsWith("--") || line.trim() === ""))
}

async function migrationFiles() {
  return (await readdir("migrations").catch(() => [])).filter((file) => file.endsWith(".sql")).sort()
}

async function applyMigrations(db: Remote) {
  for (const statement of schema) await db.unsafe(statement)
  await db.unsafe(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  )
  const applied = await db.unsafe("select name from schema_migrations")
  const done = new Set(applied.map((row) => String(row.name)))
  for (const file of await migrationFiles()) {
    if (done.has(file)) continue
    for (const statement of statements(await readFile(`migrations/${file}`, "utf8"))) {
      await db.unsafe(statement)
    }
    await db.unsafe("insert into schema_migrations (name) values ($1) on conflict (name) do nothing", [file])
  }
}

function forgetRemote(db: Remote | undefined) {
  holders.uxReviewPg = undefined
  holders.uxReviewPgReady = undefined
  if (db) void db.end({ timeout: 1 }).catch(() => undefined)
}

async function connect() {
  const url = pooledDatabaseUrl()
  if (!url) return null
  if (readEnv("VERCEL") && !isPoolerUrl(url) && /supabase\.(co|com)/i.test(url)) {
    throw new Error("POSTGRES_URL is the direct Supabase string. In Supabase, open Connect, choose Transaction pooler, copy that URI into POSTGRES_URL, and redeploy.")
  }
  if (!holders.uxReviewPg) {
    const prepared = prepareDatabaseUrl(url)
    holders.uxReviewPg = postgres(prepared.href, {
      prepare: false,
      fetch_types: false,
      max: 1,
      idle_timeout: 20,
      connect_timeout: 15,
      ssl: prepared.ssl,
    })
  }
  return holders.uxReviewPg
}

async function remote() {
  const db = await connect()
  if (!db) return null
  holders.uxReviewPgReady ??= applyMigrations(db).catch((error: unknown) => {
    forgetRemote(db)
    throw error
  })
  try {
    await holders.uxReviewPgReady
  } catch (error) {
    forgetRemote(db)
    throw error
  }
  return db
}

async function localRows<T>(text: string, params: unknown[]) {
  if (readEnv("VERCEL")) {
    throw new Error("Set POSTGRES_URL to the Supabase pooled connection string.")
  }
  holders.uxReviewLocal ??= startLocal().catch((error: unknown) => {
    holders.uxReviewLocal = undefined
    throw error
  })
  return (await (await holders.uxReviewLocal).query<T>(text, params)).rows
}

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const db = await remote()
  if (db) return (await db.unsafe(text, params as never[])) as unknown as T[]
  return localRows<T>(text, params)
}

// Sign-in only needs the credentials table, so it does not wait on workspace migrations.
export async function sqlConnected<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const db = await connect()
  if (db) return (await db.unsafe(text, params as never[])) as unknown as T[]
  return localRows<T>(text, params)
}

async function startLocal(): Promise<PGlite> {
  await mkdir(localDir, { recursive: true })
  const db = new PGlite(localDir)
  await db.waitReady
  for (const file of await migrationFiles()) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"))
  }
  return db
}
