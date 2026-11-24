import { readdir, readFile } from "node:fs/promises"
import postgres from "postgres"

function read(name) {
  return process.env[name]?.trim() ?? ""
}

const url =
  read("POSTGRES_URL_NON_POOLING") ||
  read("DATABASE_URL_UNPOOLED") ||
  read("POSTGRES_URL") ||
  read("POSTGRES_PRISMA_URL") ||
  read("DATABASE_URL")

const files = (await readdir("migrations").catch(() => [])).filter((file) => file.endsWith(".sql")).sort()
if (url === "" || files.length === 0) {
  console.log("migrate: nothing to do")
  process.exit(0)
}

const sql = postgres(url, {
  prepare: false,
  max: 1,
  connect_timeout: 20,
  ssl: /supabase\.(co|com)|pooler\.supabase|sslmode=require/i.test(url) ? "require" : false,
})

try {
  await sql.unsafe(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  )
  const done = new Set((await sql.unsafe("select name from schema_migrations")).map((row) => row.name))
  for (const file of files.filter((name) => !done.has(name))) {
    const source = await readFile(`migrations/${file}`, "utf8")
    const parts = source
      .split(";")
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
    for (const statement of parts) await sql.unsafe(statement)
    await sql.unsafe("insert into schema_migrations (name) values ($1) on conflict (name) do nothing", [file])
    console.log(`migrate: applied ${file}`)
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  const unreachable = /connect|ENOTFOUND|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|timeout/i.test(message)
  if (!unreachable) throw error
  console.warn(`migrate: ${message}`)
  console.warn("migrate: database was unreachable during build; tables are created on the first request")
} finally {
  await sql.end({ timeout: 5 })
}
