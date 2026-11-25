import Link from "next/link"
import { AvatarStack } from "@/components/common"
import type { ReviewListStatus } from "@/lib/domain"
import { cn } from "@/lib/utils"
import type { User } from "@/lib/types"

const STATUS: Record<ReviewListStatus, { label: string; pill: string; dot: string }> = {
  pending: { label: "Pending review", pill: "bg-[#E8F1FB] text-[#2B6CB0]", dot: "bg-[#2B7FFF]" },
  in_progress: { label: "In progress", pill: "bg-[#F8F1E3] text-[#C4922A]", dot: "bg-[#C4922A]" },
  completed: { label: "Completed", pill: "bg-[#E5F6EE] text-[#008A5B]", dot: "bg-[#008A5B]" },
}

export function ReviewSummary({
  href,
  title,
  project,
  sent,
  done,
  total,
  progress,
  owner,
  users,
  status,
}: {
  href: string
  title: string
  project: string
  sent: string
  done: number
  total: number
  progress: number
  owner: string
  users: Pick<User, "name">[]
  status: ReviewListStatus
}) {
  const meta = STATUS[status]
  const width = `${Math.max(0, Math.min(100, progress))}%`
  const count = total === 0 ? "No reviewers" : `${done} of ${total}`
  return (
    <Link
      href={href}
      className="block py-4 transition-colors duration-150 hover:bg-[var(--hover)]"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[15px] font-semibold tracking-tight text-[#222]">{title}</span>
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", meta.pill)}>
          <span className={cn("size-1.5 rounded-full", meta.dot)} />
          {meta.label}
        </span>
      </span>
      <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[12px] text-[#717171]">
        {project ? <span className="truncate rounded bg-[#F7F7F7] px-1.5 py-px text-[11px] font-medium">{project}</span> : null}
        <span className="shrink-0">Sent {sent}</span>
      </span>
      <span className="mt-2.5 flex items-center gap-2.5">
        <span className="review-track block h-1 min-w-0 flex-1 overflow-hidden rounded-full" role="meter" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${progress}% complete`}>
          <span className="review-fill block h-full rounded-full" style={{ width }} />
        </span>
        <span className="shrink-0 text-[12px] text-[#717171] tabular-nums">{count}</span>
        <span className="w-8 shrink-0 text-right text-[12px] font-medium text-[#222] tabular-nums">{progress}%</span>
      </span>
      <span className="mt-2.5 flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[12px] text-[#717171]">
          Requested by <span className="font-medium text-[#222]">{owner}</span>
        </span>
        <AvatarStack users={users} size={22} />
      </span>
    </Link>
  )
}
