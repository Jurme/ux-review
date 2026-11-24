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
  { value: "10", label: "10 minutes before" },
  { value: "20", label: "20 minutes before" },
  { value: "30", label: "30 minutes before" },
  { value: "60", label: "1 hour before" },
  { value: "120", label: "2 hours before" },
  { value: "240", label: "4 hours before" },
]

export const DEFAULT_REMINDER_MINUTES = 20

export function timezoneLabel(value: string) {
  return TIMEZONES.find((zone) => zone.value === value)?.label ?? value
}
