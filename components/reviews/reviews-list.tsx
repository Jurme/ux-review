"use client"

import Link from "next/link"
import { SendDesignLink } from "@/components/reviews/create-review"
import { ReviewRoleToggle, type ReviewBucket } from "@/components/reviews/role-toggle"
import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Plus, Search } from "lucide-react"
import { AvatarStack, PageHeader, PhasePill, pageWrap, ProgressBar } from "@/components/common"
import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { canSeeReview, completionOf, phaseOf, reviewBucket, reviewListStatus, type ReviewListStatus } from "@/lib/domain"
import { addDaysISO, formatDay, formatWeekday, parseISODate, todayISO, windowLabel } from "@/lib/format"
import { PHASE_META, PHASE_ORDER, tap } from "@/lib/presentation"
import { useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Feedback, Phase, Review, User } from "@/lib/types"

const LIST_STATUS: Record<ReviewListStatus, { label: string; chip: string; dot: string }> = {
  pending: { label: "Pending review", chip: "bg-[#E8F1FB] text-[#1F4E8C]", dot: "bg-[#2B7FFF]" },
  in_progress: { label: "In progress", chip: "bg-[#FFF1D6] text-[#8A5A00]", dot: "bg-[#E08A00]" },
  completed: { label: "Completed", chip: "bg-[#DCF5EA] text-[#046B48]", dot: "bg-[#008A5B]" },
}

export function ReviewsList({ archive = false }: { archive?: boolean }) {
  const { user, users, reviews, feedback, workspace } = useWorkspace()
  const [query, setQuery] = useState("")
  const [phase, setPhase] = useState<Phase | "all">("all")
  const [listStatus, setListStatus] = useState<ReviewListStatus | "all">("all")
  const [project, setProject] = useState("all")
  const [bucket, setBucket] = useState<ReviewBucket>("invited")
  const [day, setDay] = useState<string | null>(null)
  const [today, setToday] = useState<string | null>(null)
  const [allDays, setAllDays] = useState(false)
  useEffect(() => {
    const current = todayISO()
    setToday(current)
    setDay((value) => value ?? current)
  }, [])
  const people = useMemo(() => new Map(users.map((person) => [person.id, person])), [users])
  if (!user || !workspace) return null

  const projects = [...workspace.projects].sort((a, b) => a.localeCompare(b))
  const showingToday = !archive && !allDays && today !== null && day === today
  const waitingForDay = !archive && !allDays && day === null
  const filtered = reviews
    .filter((review) => canSeeReview(user, review))
    .filter((review) => (archive ? review.lifecycle === "archived" || review.lifecycle === "completed" : review.lifecycle !== "archived" && review.lifecycle !== "draft"))
    .filter((review) => (archive ? (phase === "all" ? true : phaseOf(review) === phase) : listStatus === "all" ? true : reviewListStatus(review.id, feedback, review.ownerId) === listStatus))
    .filter((review) => (project === "all" ? true : review.project === project))
    .filter((review) => archive || allDays || (day !== null && review.deadline === day))
    .filter((review) => {
      if (!archive) return true
      const haystack = `${review.title} ${review.project} ${review.feature} ${review.description}`.toLowerCase()
      return haystack.includes(query.trim().toLowerCase())
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline) || a.title.localeCompare(b.title))

  const sent = filtered.filter((review) => reviewBucket(user.id, review) === "sent")
  const invited = filtered.filter((review) => reviewBucket(user.id, review) === "invited")
  const shown = bucket === "sent" ? sent : invited
  const phases = PHASE_ORDER.filter((item) => item === "completed" || item === "archived")
  const narrowed = Boolean(project !== "all" || (archive ? phase !== "all" || query : listStatus !== "all" || !allDays))
  const dayLabel = !day || !today || day === today ? (day ? `Today, ${formatDay(day)}` : "Today") : formatWeekday(parseISODate(day))

  return (
    <div className={pageWrap()}>
      <PageHeader
        eyebrow={archive ? "History" : "Workspace"}
        title={archive ? "Archived reviews" : "All reviews"}
        description={
          archive
            ? "Closed and archived reviews stay here with their criteria, reviewers, and notes."
            : "Opens on reviews due today. Switch between designs you sent and designs you were invited to review."
        }
        action={
          archive ? undefined : (
            <SendDesignLink className={cn(buttonVariants({ size: "lg" }))}>
              <Plus />
              Send a design
            </SendDesignLink>
          )
        }
      />

      <div className="mt-6">
        <ReviewRoleToggle value={bucket} onChange={setBucket} sent={sent.length} invited={invited.length} />
      </div>

      {archive ? (
        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#717171]" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reviews" className="pl-9" aria-label="Search reviews" />
          </div>
          <Filter label="Project" value={project} onChange={setProject} options={projects.map((item) => ({ value: item, label: item }))} />
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-xl", showingToday && "border-[#222]")}
            onClick={() => {
              const current = todayISO()
              setAllDays(false)
              setToday(current)
              setDay(current)
            }}
          >
            Today
          </button>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "rounded-xl")}
            onClick={() => {
              setAllDays(false)
              setDay((current) => addDaysISO(current ?? todayISO(), -1))
            }}
            aria-label="Previous day"
          >
            <ChevronLeft />
          </button>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "icon" }), "rounded-xl")}
            onClick={() => {
              setAllDays(false)
              setDay((current) => addDaysISO(current ?? todayISO(), 1))
            }}
            aria-label="Next day"
          >
            <ChevronRight />
          </button>
          <button
            type="button"
            className={cn("h-10 rounded-xl px-3 text-[13px] font-medium", tap, allDays ? "bg-[#222] text-white" : "text-[#717171]")}
            onClick={() => setAllDays(true)}
          >
            All days
          </button>
          <span className="px-1 text-[14px] font-medium">{allDays ? "All days" : dayLabel}</span>
          <Filter label="Project" value={project} onChange={setProject} options={projects.map((item) => ({ value: item, label: item }))} />
          <Filter
            label="Status"
            value={listStatus}
            onChange={(value) => setListStatus(value as ReviewListStatus | "all")}
            options={(Object.keys(LIST_STATUS) as ReviewListStatus[]).map((item) => ({ value: item, label: LIST_STATUS[item].label }))}
          />
        </div>
      )}

      {archive ? (
        <div className="mt-4 flex gap-2 overflow-x-auto">
          <FilterChip active={phase === "all"} onClick={() => setPhase("all")}>All</FilterChip>
          {phases.map((item) => (
            <FilterChip key={item} active={phase === item} onClick={() => setPhase(item)}>
              {PHASE_META[item].label}
            </FilterChip>
          ))}
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {(Object.keys(LIST_STATUS) as ReviewListStatus[]).map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5 text-[12px] text-[#717171]">
              <span className={cn("size-2 rounded-full", LIST_STATUS[item].dot)} />
              {LIST_STATUS[item].label}
            </span>
          ))}
        </div>
      )}

      <ReviewGroup
        reviews={shown}
        people={people}
        archive={archive}
        feedback={feedback}
        empty={waitingForDay ? "" : bucket === "sent" ? sentEmpty(archive, narrowed, showingToday, allDays) : invitedEmpty(archive, narrowed, showingToday, allDays)}
      />
    </div>
  )
}

function ReviewGroup({
  reviews,
  people,
  archive,
  feedback,
  empty,
}: {
  reviews: Review[]
  people: Map<string, User>
  archive: boolean
  feedback: Feedback[]
  empty: string
}) {
  return (
    <section className="mt-4">
      {reviews.length === 0 ? (
        <p className="mt-4 text-[14px] text-[#717171]">{empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-[#EBEBEB]">
          {reviews.map((review) => {
            const owner = people.get(review.ownerId)
            const reviewers = review.reviewers.map((item) => people.get(item.userId)).filter((item) => item !== undefined)
            return (
              <li key={review.id}>
                <Link href={`/reviews/${review.id}`} className="grid gap-3 py-4 md:grid-cols-[minmax(0,1.4fr)_160px_160px_150px] md:items-center">
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
                  {archive ? <PhasePill phase={phaseOf(review)} /> : <ListStatusPill status={reviewListStatus(review.id, feedback, review.ownerId)} />}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function sentEmpty(archive: boolean, narrowed: boolean, showingToday: boolean, allDays: boolean) {
  if (showingToday) return "Nothing you sent is due today."
  if (!archive && !allDays) return "Nothing you sent is due on this day."
  if (narrowed) return "None of the reviews you sent match these filters."
  return archive ? "You have not archived a design you sent." : "You have not sent a design yet."
}

function invitedEmpty(archive: boolean, narrowed: boolean, showingToday: boolean, allDays: boolean) {
  if (showingToday) return "Nobody invited you to a review due today."
  if (!archive && !allDays) return "Nobody invited you to a review due on this day."
  if (narrowed) return "No invitation matches these filters."
  return archive ? "You have not archived a review you were invited to." : "Nobody has invited you to a review yet."
}

function Filter({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#EBEBEB] bg-white px-3 text-[13px]">
      <span className="text-[#717171]">{label}</span>
      <select className="bg-transparent outline-none" value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function ListStatusPill({ status }: { status: ReviewListStatus }) {
  const meta = LIST_STATUS[status]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium", meta.chip)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
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
