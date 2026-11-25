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
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-[#EBEBEB] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition duration-150 hover:-translate-y-px hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)]"
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0 text-[18px] font-semibold tracking-tight">{title}</span>
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium", meta.pill)}>
          <span className={cn("size-1.5 rounded-full", meta.dot)} />
          {meta.label}
        </span>
      </span>
      <span className="mt-2 flex flex-wrap items-center gap-2">
        {project ? <span className="rounded-md bg-[#F7F7F7] px-2 py-0.5 text-[12px] font-medium text-[#717171]">{project}</span> : null}
        <span className="text-[13px] text-[#717171]">Sent {sent}</span>
      </span>
      <span className="mt-5 flex items-baseline justify-between gap-3 text-[14px] text-[#222]">
        <span>{total === 0 ? "No reviewers yet" : `${done} of ${total} reviews done`}</span>
        <span className="font-semibold">{progress}%</span>
      </span>
      <span className="review-track mt-2 block h-2 overflow-hidden rounded-full" role="meter" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${progress}% complete`}>
        <span className="review-fill block h-full rounded-full" style={{ width }} />
      </span>
      <span className="mt-4 flex items-center justify-between gap-3 border-t border-[#EBEBEB] pt-4">
        <span className="min-w-0">
          <span className="block text-[13px] text-[#717171]">Requested by</span>
          <span className="mt-0.5 block truncate font-semibold">{owner}</span>
        </span>
        <AvatarStack users={users} size={32} />
      </span>
    </Link>
  )
}
