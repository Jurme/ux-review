"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Plus, Search } from "lucide-react"
import { AvatarStack, EmptyState, PageHeader, PhasePill, pageWrap, ProgressBar } from "@/components/common"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { canSeeReview, completionOf, phaseOf } from "@/lib/domain"
import { formatDay, windowLabel } from "@/lib/format"
import { PHASE_META, PHASE_ORDER, tap } from "@/lib/presentation"
import { useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Phase } from "@/lib/types"

export function ReviewsList({ archive = false }: { archive?: boolean }) {
  const { user, users, reviews } = useWorkspace()
  const [query, setQuery] = useState("")
  const [phase, setPhase] = useState<Phase | "all">("all")
  const [project, setProject] = useState("all")
  const people = useMemo(() => new Map(users.map((person) => [person.id, person])), [users])
  if (!user) return null

  const projects = [...new Set(reviews.map((review) => review.project))].sort()
  const filtered = reviews
    .filter((review) => canSeeReview(user, review))
    .filter((review) => (archive ? review.lifecycle === "archived" || review.lifecycle === "completed" : review.lifecycle !== "archived"))
    .filter((review) => (phase === "all" ? true : phaseOf(review) === phase))
    .filter((review) => (project === "all" ? true : review.project === project))
    .filter((review) => {
      const haystack = `${review.title} ${review.project} ${review.feature} ${review.description}`.toLowerCase()
      return haystack.includes(query.trim().toLowerCase())
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline))

  const phases = (archive ? PHASE_ORDER.filter((item) => item === "completed" || item === "archived") : PHASE_ORDER.filter((item) => item !== "archived"))

  return (
    <div className={pageWrap()}>
      <PageHeader
        eyebrow={archive ? "History" : "Workspace"}
        title={archive ? "Archived reviews" : "All reviews"}
        description={
          archive
            ? "Closed and archived reviews stay here with their criteria, reviewers, and notes."
            : "Every review the workspace is running, including drafts only you and other admins can see."
        }
        action={
          archive ? undefined : (
            <Link href="/reviews/new" className={cn(buttonVariants({ size: "lg" }))}>
              <Plus />
              Send a design
            </Link>
          )
        }
      />

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#717171]" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reviews" className="pl-9" aria-label="Search reviews" />
        </div>
        <label className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#EBEBEB] px-3 text-[14px]">
          <span className="text-[#717171]">Project</span>
          <select className="bg-transparent outline-none" value={project} onChange={(event) => setProject(event.target.value)} aria-label="Filter by project">
            <option value="all">All</option>
            {projects.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto">
        <FilterChip active={phase === "all"} onClick={() => setPhase("all")}>All</FilterChip>
        {phases.map((item) => (
          <FilterChip key={item} active={phase === item} onClick={() => setPhase(item)}>
            {PHASE_META[item].label}
          </FilterChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title={query || phase !== "all" || project !== "all" ? "No reviews match" : archive ? "Nothing archived yet" : "No reviews yet"}
            body={query || phase !== "all" || project !== "all" ? "Try another word, or clear the filters." : "Create a review, add a Figma link, and invite the people who should respond."}
          />
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-[#EBEBEB]">
          {filtered.map((review) => {
            const owner = people.get(review.ownerId)
            const reviewers = review.reviewers.map((item) => people.get(item.userId)).filter((item) => item !== undefined)
            return (
              <li key={review.id}>
                <Link href={`/reviews/${review.id}`} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1.4fr)_160px_140px_120px] md:items-center">
                  <span>
                    <span className="block font-medium">{review.title}</span>
                    <span className="mt-1 block text-[13px] text-[#717171]">
                      {review.project}
                      {review.feature ? ` · ${review.feature}` : ""} · {windowLabel(review.startDate, review.deadline)} · {owner?.name}
                    </span>
                  </span>
                  <AvatarStack users={reviewers} />
                  <span>
                    <ProgressBar value={completionOf(review)} />
                    <span className="mt-1 block text-[12px] text-[#717171]">
                      {review.reviewers.filter((item) => item.status === "completed").length}/{review.reviewers.length || 0} finished · due {formatDay(review.deadline)}
                    </span>
                  </span>
                  <PhasePill phase={phaseOf(review)} />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function FilterChip({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("h-9 shrink-0 rounded-full px-3 text-[13px] font-medium", tap, active ? "bg-[#222] text-white" : "bg-[#F7F7F7] text-[#222]")}
    >
      {children}
    </button>
  )
}
