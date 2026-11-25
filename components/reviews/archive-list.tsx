"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { ConfirmDialog, PageHeader, pageWrap } from "@/components/common"
import { formatDay } from "@/lib/format"
import { rowHover, tap } from "@/lib/presentation"
import { deleteReview, useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Review } from "@/lib/types"

export function ArchiveList() {
  const { user, users, reviews } = useWorkspace()
  const [pending, setPending] = useState<Review | null>(null)
  const [removing, setRemoving] = useState(false)
  if (!user) return null

  const people = new Map(users.map((person) => [person.id, person]))
  const archived = reviews
    .filter((review) => review.lifecycle === "archived")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title))

  async function remove() {
    if (!pending) return
    setRemoving(true)
    const result = await deleteReview(pending.id)
    setRemoving(false)
    if (result.ok) {
      toast.success(result.message || "Review deleted.")
      setPending(null)
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className={pageWrap()}>
      <PageHeader
        eyebrow="Workspace"
        title="Archive"
        description="A shared repository of archived designs. Everyone in the workspace sees the same list."
      />

      {archived.length === 0 ? (
        <p className="mt-8 text-[14px] text-[#717171]">Nothing has been archived yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-[#EBEBEB]">
          {archived.map((review) => {
            const owner = people.get(review.ownerId)
            return (
              <li key={review.id} className={cn("flex items-center justify-between gap-4 py-3", rowHover)}>
                <Link href={`/reviews/${review.id}`} className="min-w-0">
                  <span className="block font-medium">{review.title}</span>
                  <span className="mt-1 block text-[13px] text-[#717171]">
                    {review.project}
                    {owner ? ` · ${owner.name}` : ""} · Archived {formatDay(review.updatedAt.slice(0, 10))}
                  </span>
                </Link>
                <button
                  type="button"
                  className={cn("shrink-0 rounded-lg px-2 py-1 text-[13px] font-medium text-[#FF385C] transition-colors hover:bg-[#FFE3E8]", tap)}
                  onClick={() => setPending(review)}
                >
                  Delete
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending ? `Delete ${pending.title}?` : "Delete this review?"}
        body="This removes the design and its notes for everyone in the workspace."
        confirmLabel={removing ? "Deleting…" : "Delete"}
        onConfirm={() => void remove()}
        onClose={() => { if (!removing) setPending(null) }}
      />
    </div>
  )
}
