"use client"

import { tap } from "@/lib/presentation"
import { cn } from "@/lib/utils"

export type ReviewBucket = "sent" | "invited"

export function ReviewRoleToggle({
  value,
  onChange,
  sent,
  invited,
}: {
  value: ReviewBucket
  onChange: (value: ReviewBucket) => void
  sent: number
  invited: number
}) {
  const items: { id: ReviewBucket; label: string; count: number }[] = [
    { id: "sent", label: "Sent for review", count: sent },
    { id: "invited", label: "Invited to review", count: invited },
  ]
  return (
    <div className="inline-flex max-w-full flex-wrap rounded-xl bg-[#F7F7F7] p-1" role="tablist" aria-label="Review ownership">
      {items.map((item) => {
        const selected = value === item.id
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(item.id)}
            className={cn("h-9 rounded-lg px-3 text-[13px] font-medium", tap, selected ? "bg-white text-[#222] shadow-sm" : "text-[#717171]")}
          >
            {item.label}
            <span className={cn("ml-2 text-[12px]", selected ? "text-[#717171]" : "text-[#999]")}>{item.count}</span>
          </button>
        )
      })}
    </div>
  )
}
