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
  return process.env[name]?.trim() ?? ""
}

export function pooledDatabaseUrl() {
  return readEnv("POSTGRES_URL") || readEnv("POSTGRES_PRISMA_URL") || readEnv("DATABASE_URL")
}

export function directDatabaseUrl() {
  return readEnv("POSTGRES_URL_NON_POOLING") || readEnv("DATABASE_URL_UNPOOLED") || pooledDatabaseUrl()
}

function needsSsl(url: string) {
  return /supabase\.(co|com)|pooler\.supabase|sslmode=require/i.test(url)
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

async function remote() {
  const url = pooledDatabaseUrl()
  if (!url) return null
  holders.uxReviewPg ??= postgres(url, {
    prepare: false,
    max: 1,
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: needsSsl(url) ? "require" : false,
  })
  holders.uxReviewPgReady ??= applyMigrations(holders.uxReviewPg).catch((error: unknown) => {
    holders.uxReviewPgReady = undefined
    throw error
  })
  await holders.uxReviewPgReady
  return holders.uxReviewPg
}

export async function sql<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const db = await remote()
  if (db) return (await db.unsafe(text, params as never[])) as unknown as T[]
  if (readEnv("VERCEL")) {
    throw new Error("Set POSTGRES_URL to the Supabase pooled connection string.")
  }
  holders.uxReviewLocal ??= startLocal().catch((error: unknown) => {
    holders.uxReviewLocal = undefined
    throw error
  })
  return (await (await holders.uxReviewLocal).query<T>(text, params)).rows
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
