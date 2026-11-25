import { isState } from "@/lib/access"
import type { AppState } from "@/lib/types"

const CACHE_KEY = "ux-review.workspace"
const EMAIL_KEY = "ux-review.email"
const HINT = "ux-review-open"
const MAX_ACCOUNTS = 3

export function hasSessionHint() {
  if (typeof document === "undefined") return false
  return document.cookie.split(";").some((part) => part.trim() === `${HINT}=1`)
}

export function sessionHint(active: boolean) {
  if (typeof document === "undefined") return
  document.cookie = active
    ? `${HINT}=1; Path=/; SameSite=Lax; Max-Age=2592000`
    : `${HINT}=; Path=/; Max-Age=0`
}

type Entry = { revision: number; state: AppState }
type Envelope = { order: string[]; entries: Record<string, Entry> }

export function rememberedEmail() {
  if (typeof window === "undefined") return ""
  try {
    return localStorage.getItem(EMAIL_KEY)?.trim().toLowerCase() ?? ""
  } catch {
    return ""
  }
}

export function rememberEmail(email: string) {
  const value = email.trim().toLowerCase()
  if (!value || typeof window === "undefined") return
  try {
    localStorage.setItem(EMAIL_KEY, value)
  } catch {
    // Private browsing can reject storage writes.
  }
}

function accountEmail(state: AppState) {
  return state.users.find((user) => user.id === state.currentUserId)?.email.trim().toLowerCase() ?? ""
}

function usable(state: AppState) {
  return (
    isState(state) &&
    Array.isArray(state.templates) &&
    Array.isArray(state.notifications) &&
    Array.isArray(state.activities) &&
    Boolean(accountEmail(state))
  )
}

function readEnvelope(): Envelope {
  if (typeof window === "undefined") return { order: [], entries: {} }
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return { order: [], entries: {} }
    const parsed = JSON.parse(raw) as Partial<Envelope>
    if (!parsed || !Array.isArray(parsed.order) || !parsed.entries || typeof parsed.entries !== "object") {
      return { order: [], entries: {} }
    }
    return { order: parsed.order.filter((item) => typeof item === "string"), entries: parsed.entries }
  } catch {
    return { order: [], entries: {} }
  }
}

export function readCachedWorkspace(email?: string) {
  const envelope = readEnvelope()
  const key = (email?.trim().toLowerCase() || rememberedEmail() || envelope.order[0] || "")
  const entry = key ? envelope.entries[key] : undefined
  if (!entry || typeof entry.revision !== "number" || !usable(entry.state)) return null
  if (email && accountEmail(entry.state) !== email.trim().toLowerCase()) return null
  return { state: entry.state, revision: entry.revision }
}

export function saveCachedWorkspace(state: AppState, revision: number) {
  const email = accountEmail(state)
  if (!email || !Number.isFinite(revision) || typeof window === "undefined") return
  rememberEmail(email)
  const envelope = readEnvelope()
  const order = [email, ...envelope.order.filter((item) => item !== email)].slice(0, MAX_ACCOUNTS)
  const entries: Record<string, Entry> = {}
  for (const item of order) {
    if (item === email) entries[item] = { revision, state }
    else if (envelope.entries[item]) entries[item] = envelope.entries[item]
  }
  const json = JSON.stringify({ order, entries })
  try {
    localStorage.setItem(CACHE_KEY, json)
  } catch {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ order: [email], entries: { [email]: entries[email] } }))
    } catch {
      // Storage is full or blocked. The live session still works.
    }
  }
}
