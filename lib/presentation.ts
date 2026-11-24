import type { Phase, ReviewerStatus, Severity } from "@/lib/types"

export const tap =
  "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#222]"

export const PHASE_META: Record<
  Phase,
  { label: string; description: string; chip: string; dot: string; tint: string }
> = {
  draft: {
    label: "Draft",
    description: "Saved, not published",
    chip: "bg-[#F7F7F7] text-[#717171]",
    dot: "bg-[#717171]",
    tint: "bg-[#F7F7F7] text-[#717171]",
  },
  scheduled: {
    label: "Scheduled",
    description: "Opens on the start date",
    chip: "bg-[#F7F7F7] text-[#222]",
    dot: "bg-[#222]",
    tint: "bg-[#F7F7F7] text-[#222]",
  },
  in_progress: {
    label: "In progress",
    description: "The review window is open",
    chip: "bg-[#FFF1F3] text-[#C41E45]",
    dot: "bg-[#FF385C]",
    tint: "bg-[#FFF1F3] text-[#C41E45]",
  },
  feedback_pending: {
    label: "Feedback pending",
    description: "Deadline passed with notes still outstanding",
    chip: "bg-[#FBF6EE] text-[#8A5A12]",
    dot: "bg-[#B7791F]",
    tint: "bg-[#FBF6EE] text-[#8A5A12]",
  },
  completed: {
    label: "Completed",
    description: "The owner closed the review",
    chip: "bg-[#F1F8F5] text-[#046B48]",
    dot: "bg-[#008A5B]",
    tint: "bg-[#F1F8F5] text-[#046B48]",
  },
  archived: {
    label: "Archived",
    description: "Kept for the record",
    chip: "bg-[#F7F7F7] text-[#717171]",
    dot: "bg-[#B0B0B0]",
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
  critical: { label: "Critical", chip: "bg-[#FDECEC] text-[#B42318]" },
  major: { label: "Major", chip: "bg-[#FBF6EE] text-[#8A5A12]" },
  minor: { label: "Minor", chip: "bg-[#F7F7F7] text-[#222]" },
  suggestion: { label: "Suggestion", chip: "bg-[#F7F7F7] text-[#717171]" },
}

export const REVIEWER_META: Record<ReviewerStatus, { label: string; chip: string }> = {
  pending: { label: "Pending", chip: "bg-[#F7F7F7] text-[#717171]" },
  in_progress: { label: "In progress", chip: "bg-[#FFF1F3] text-[#C41E45]" },
  completed: { label: "Completed", chip: "bg-[#F1F8F5] text-[#046B48]" },
}

export const AVATAR_COLORS = [
  "#222222",
  "#6B4F3A",
  "#8A4B45",
  "#3F6B5A",
  "#6E4B62",
  "#3E5166",
  "#8C6A2F",
  "#4F4F4F",
]

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
