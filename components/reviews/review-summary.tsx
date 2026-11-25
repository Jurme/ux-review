import Link from "next/link"
import type { ReactNode } from "react"
import { AvatarStack, ProgressBar } from "@/components/common"
import { rowHover } from "@/lib/presentation"
import { cn } from "@/lib/utils"
import type { User } from "@/lib/types"

export function ReviewSummary({
  href,
  title,
  detail,
  users,
  progress,
  caption,
  status,
}: {
  href: string
  title: string
  detail: ReactNode
  users: Pick<User, "name">[]
  progress: number
  caption: string
  status: ReactNode
}) {
  return (
    <Link href={href} className={cn("flex items-start justify-between gap-4 py-3", rowHover)}>
      <span className="min-w-0">
        <span className="block font-medium">{title}</span>
        {detail}
        <span className="mt-3 grid grid-cols-[120px_180px] items-center gap-x-4">
          <span className="flex w-[120px] justify-start">
            <AvatarStack users={users} />
          </span>
          <span className="w-[180px]">
            <ProgressBar value={progress} />
            <span className="mt-1 block text-left text-[12px] text-[#717171]">{caption}</span>
          </span>
        </span>
      </span>
      <span className="shrink-0 pt-0.5">{status}</span>
    </Link>
  )
}
