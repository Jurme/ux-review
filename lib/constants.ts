import type { Category, Priority, Severity } from "@/lib/types"

export const PROJECTS = [
  "Sunrise BusinessHub",
  "Sunrise Mobile",
  "Sunrise CPQ",
  "Marketplace",
  "Payments",
  "Analytics",
]

export const FOCUS = [
  "Usability",
  "Visual hierarchy",
  "Accessibility",
  "Information architecture",
  "Design consistency",
  "Edge cases",
  "Content",
  "Business alignment",
]

export const TIMEZONES = [
  { value: "Asia/Thimphu", label: "Thimphu" },
  { value: "Asia/Kolkata", label: "Kolkata" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Europe/London", label: "London" },
  { value: "America/New_York", label: "New York" },
  { value: "America/Los_Angeles", label: "Los Angeles" },
  { value: "UTC", label: "UTC" },
]

export const CATEGORIES: Category[] = [
  "UX",
  "UI",
  "Accessibility",
  "Technical",
  "Business",
]

export const PRIORITIES: Priority[] = ["low", "medium", "high"]

export const SEVERITIES: Severity[] = [
  "critical",
  "major",
  "minor",
  "suggestion",
]

export const REMINDER_OPTIONS: { value: string; label: string }[] = [
  { value: "none", label: "No reminder" },
  { value: "24", label: "24 hours before" },
  { value: "48", label: "48 hours before" },
  { value: "72", label: "72 hours before" },
]

export function timezoneLabel(value: string) {
  return TIMEZONES.find((zone) => zone.value === value)?.label ?? value
}
