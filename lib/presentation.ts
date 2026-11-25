import type { Phase, ReviewerStatus, Severity } from "@/lib/types"

export const tap =
  "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#222]"

export const rowHover =
  "-mx-2 rounded-xl px-2 transition-colors duration-150 hover:bg-[var(--hover)]"

export const cardHover =
  "transition duration-150 hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(0,0,0,0.1)]"

export const PHASE_META: Record<
  Phase,
  { label: string; description: string; chip: string; dot: string; tint: string }
> = {
  draft: {
    label: "Draft",
    description: "Saved, not sent",
    chip: "bg-[#F7F7F7] text-[#717171]",
    dot: "bg-[#999]",
    tint: "bg-[#F7F7F7] text-[#717171]",
  },
  scheduled: {
    label: "Scheduled",
    description: "Waiting for the send date",
    chip: "bg-[#E8F0FE] text-[#2B5CC7]",
    dot: "bg-[#2B5CC7]",
    tint: "bg-[#E8F0FE] text-[#2B5CC7]",
  },
  in_progress: {
    label: "In progress",
    description: "Reviewers are working through it",
    chip: "bg-[#FFF1D6] text-[#B7791F]",
    dot: "bg-[#B7791F]",
    tint: "bg-[#FFF1D6] text-[#B7791F]",
  },
  feedback_pending: {
    label: "Feedback pending",
    description: "Deadline passed with notes still outstanding",
    chip: "bg-[#FFE3E8] text-[#FF385C]",
    dot: "bg-[#FF385C]",
    tint: "bg-[#FFE3E8] text-[#FF385C]",
  },
  completed: {
    label: "Completed",
    description: "Every assigned reviewer is done, or the owner closed it",
    chip: "bg-[#DCF5EA] text-[#008A5B]",
    dot: "bg-[#008A5B]",
    tint: "bg-[#DCF5EA] text-[#008A5B]",
  },
  archived: {
    label: "Archived",
    description: "Kept for the record",
    chip: "bg-[#F7F7F7] text-[#717171]",
    dot: "bg-[#BBBBBB]",
    tint: "bg-[#F7F7F7] text-[#717171]",
  },
}

export const PHASE_ORDER: Phase[] = [
  "draft",
  "scheduled",
  "in_progress",
  "feedback_pending",
  "completed",
  "archived",
]

export const SEVERITY_META: Record<Severity, { label: string; chip: string }> = {
  critical: { label: "Critical", chip: "bg-[#FDECEC] text-[#D93B3B]" },
  major: { label: "Major", chip: "bg-[#FFF1D6] text-[#B7791F]" },
  minor: { label: "Minor", chip: "bg-[#F7F7F7] text-[#717171]" },
  suggestion: { label: "Suggestion", chip: "bg-[#DCF5EA] text-[#008A5B]" },
}

export const REVIEWER_META: Record<ReviewerStatus, { label: string; chip: string }> = {
  pending: { label: "Pending", chip: "bg-[#F7F7F7] text-[#717171]" },
  in_progress: { label: "In progress", chip: "bg-[#FFF1F3] text-[#C41E45]" },
  completed: { label: "Completed", chip: "bg-[#F1F8F5] text-[#046B48]" },
}

export const AVATAR_COLORS = ["#FF385C", "#7C5CFF", "#008A5B", "#E08A00", "#2B7FFF", "#C2410C"]

export function avatarColor(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}
