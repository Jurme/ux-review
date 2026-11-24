export function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function parseISODate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(year || 1970, (month || 1) - 1, day || 1)
}

export function todayISO() {
  return toISODate(new Date())
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export function addDaysISO(iso: string, days: number) {
  return toISODate(addDays(parseISODate(iso), days))
}

export function diffDays(from: string, to: string) {
  return Math.round(
    (parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000,
  )
}

export function shiftISO(days: number) {
  return toISODate(addDays(startOfDay(new Date()), days))
}

export function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 3_600_000).toISOString()
}

export function isISODate(value: string | null | undefined) {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function formatDay(iso: string) {
  return parseISODate(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

export function formatFull(iso: string) {
  return parseISODate(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatWeekday(date: Date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}

export function formatMonth(date: Date) {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

export function formatLongDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 14) return `${days}d ago`
  return formatFull(iso.slice(0, 10))
}

export function greeting(name: string) {
  const hour = new Date().getHours()
  const part =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  return `${part}, ${name.split(" ")[0]}`
}

export function startOfWeek(date: Date) {
  const next = startOfDay(date)
  const day = next.getDay()
  const diff = day === 0 ? -6 : 1 - day
  return addDays(next, diff)
}

export function monthWeeks(cursor: Date) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const start = startOfWeek(first)
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)),
  )
}

export function sameDate(a: Date, b: Date) {
  return toISODate(a) === toISODate(b)
}

export function safeHttpUrl(value: string) {
  try {
    const url = new URL(value)
    if (url.protocol === "https:" || url.protocol === "http:") return url.toString()
  } catch {
    return null
  }
  return null
}

export function normalizeHttpUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return safeHttpUrl(withProtocol) ?? ""
}

export function clip(value: string, max: number) {
  return value.trim().slice(0, max)
}

export function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function uid(prefix: string) {
  const bytes =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)
  return `${prefix}_${bytes.slice(0, 8)}`
}

export function windowLabel(start: string, deadline: string, startTime = "", endTime = "") {
  const same = start === deadline
  if (same && startTime && endTime) return `${formatDay(start)}, ${startTime}–${endTime}`
  if (startTime || endTime) {
    return `${formatDay(start)}${startTime ? `, ${startTime}` : ""} – ${formatDay(deadline)}${endTime ? `, ${endTime}` : ""}`
  }
  if (same) return formatDay(start)
  return `${formatDay(start)} – ${formatDay(deadline)}`
}
