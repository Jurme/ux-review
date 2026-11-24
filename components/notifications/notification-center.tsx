"use client"

import Link from "next/link"
import { EmptyState, PageHeader, pageWrap } from "@/components/common"
import { Button } from "@/components/ui/button"
import { timeAgo } from "@/lib/format"
import { markAllRead, markRead, useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import { tap } from "@/lib/presentation"

export function NotificationCenter() {
  const { notifications, user } = useWorkspace()
  if (!user) return null
  const items = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  return (
    <div className={pageWrap("max-w-[760px]")}>
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description="Invitations, reminders, and responses land here. In this sample they stay in the workspace instead of going out by email."
        action={items.some((item) => !item.read) ? <Button variant="outline" onClick={() => markAllRead()}>Mark all read</Button> : undefined}
      />
      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="You’re caught up" body="When someone invites you, submits feedback, or moves a deadline, it will show up here." />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-[#EBEBEB]">
          {items.map((item) => {
            const href = item.reviewId ? `/reviews/${item.reviewId}` : "/notifications"
            return (
              <li key={item.id}>
                <Link
                  href={href}
                  onClick={() => { if (!item.read) markRead(item.id) }}
                  className={cn("flex gap-3 py-4", tap)}
                >
                  <span className={cn("mt-2 size-2 shrink-0 rounded-full", item.read ? "bg-transparent" : "bg-[#FF385C]")} />
                  <span>
                    <span className="block font-medium">{item.title}</span>
                    <span className="mt-1 block text-[14px] leading-6 text-[#717171]">{item.body}</span>
                    <span className="mt-1 block text-[12px] text-[#717171]">{timeAgo(item.createdAt)}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
