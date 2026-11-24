import { readdir, readFile } from "node:fs/promises"
import { PGlite } from "@electric-sql/pglite"
import pg from "pg"

const databaseUrl = process.env.DATABASE_URL?.trim() ?? ""

const holders = globalThis as unknown as {
  uxReviewPool?: pg.Pool
  uxReviewLocal?: Promise<PGlite>
}

export async function sql<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  if (databaseUrl !== "") {
    holders.uxReviewPool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 })
    return (await holders.uxReviewPool.query(text, params)).rows as T[]
  }
  holders.uxReviewLocal ??= startLocal().catch((error: unknown) => {
    holders.uxReviewLocal = undefined
    throw error
  })
  return (await (await holders.uxReviewLocal).query<T>(text, params)).rows
}

async function startLocal(): Promise<PGlite> {
  const db = new PGlite()
  const files = (await readdir("migrations").catch(() => [])).filter((file) => file.endsWith(".sql")).sort()
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"))
  }
  return db
}
