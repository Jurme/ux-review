"use client"

import { SendDesignLink } from "@/components/reviews/create-review"
import { ReviewRoleToggle, type ReviewBucket } from "@/components/reviews/role-toggle"
import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { PageHeader, pageWrap } from "@/components/common"
import { ReviewSummary } from "@/components/reviews/review-summary"
import { buttonVariants } from "@/components/ui/button"
import { canSeeReview, completionOf, reviewBucket, reviewListStatus, type ReviewListStatus } from "@/lib/domain"
import { addDaysISO, dateInTimeZone, formatDay, formatWeekday, parseISODate, windowLabel } from "@/lib/format"
import { tap } from "@/lib/presentation"
import { useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Feedback, Review, User } from "@/lib/types"

const LIST_STATUS: Record<ReviewListStatus, { label: string; chip: string; dot: string }> = {
  pending: { label: "Pending review", chip: "bg-[#E8F1FB] text-[#1F4E8C]", dot: "bg-[#2B7FFF]" },
  in_progress: { label: "In progress", chip: "bg-[#FFF1D6] text-[#8A5A00]", dot: "bg-[#E08A00]" },
  completed: { label: "Completed", chip: "bg-[#DCF5EA] text-[#046B48]", dot: "bg-[#008A5B]" },
}

export function ReviewsList() {
  const { user, users, reviews, feedback, workspace } = useWorkspace()
  const [listStatus, setListStatus] = useState<ReviewListStatus | "all">("all")
  const [project, setProject] = useState("all")
  const [bucket, setBucket] = useState<ReviewBucket>("invited")
  const [day, setDay] = useState<string | null>(null)
  const [today, setToday] = useState<string | null>(null)
  const [allDays, setAllDays] = useState(false)
  const zone = workspace?.timezone
  useEffect(() => {
    if (!zone) return
    const id = window.setTimeout(() => {
      const current = dateInTimeZone(zone)
      setToday(current)
      setDay((value) => value ?? current)
    }, 0)
    return () => window.clearTimeout(id)
  }, [zone])
  const people = useMemo(() => new Map(users.map((person) => [person.id, person])), [users])
  if (!user || !workspace) return null

  const projects = [...workspace.projects].sort((a, b) => a.localeCompare(b))
  const showingToday = !allDays && today !== null && day === today
  const waitingForDay = !allDays && day === null
  const filtered = reviews
    .filter((review) => canSeeReview(user, review))
    .filter((review) => review.lifecycle !== "archived" && review.lifecycle !== "draft")
    .filter((review) => (listStatus === "all" ? true : reviewListStatus(review.id, feedback, review.ownerId) === listStatus))
    .filter((review) => (project === "all" ? true : review.project === project))
    .filter((review) => allDays || (day !== null && review.deadline === day))
    .sort((a, b) => a.deadline.localeCompare(b.deadline) || a.title.localeCompare(b.title))

  const sent = filtered.filter((review) => reviewBucket(user.id, review) === "sent")
  const invited = filtered.filter((review) => reviewBucket(user.id, review) === "invited")
  const shown = bucket === "sent" ? sent : invited
  const narrowed = Boolean(project !== "all" || listStatus !== "all" || !allDays)
  const dayLabel = !day || !today || day === today ? (day ? `Today, ${formatDay(day)}` : "Today") : formatWeekday(parseISODate(day))

  return (
    <div className={pageWrap()}>
      <PageHeader
        eyebrow="Workspace"
        title="All reviews"
        description="Opens on reviews due today. Switch between designs you sent and designs you were invited to review."
        action={
          <SendDesignLink className={cn(buttonVariants({ size: "lg" }))}>
            <Plus />
            Send a design
          </SendDesignLink>
        }
      />

      <div className="mt-6">
        <ReviewRoleToggle value={bucket} onChange={setBucket} sent={sent.length} invited={invited.length} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-xl", showingToday && "border-[#222]")}
            onClick={() => {
              const current = dateInTimeZone(workspace.timezone)
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
              setDay((current) => addDaysISO(current ?? dateInTimeZone(workspace.timezone), -1))
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
              setDay((current) => addDaysISO(current ?? dateInTimeZone(workspace.timezone), 1))
            }}
            aria-label="Next day"
          >
            <ChevronRight />
          </button>
          <button
            type="button"
            className={cn("h-10 rounded-xl px-3 text-[13px] font-medium transition-colors duration-150", tap, allDays ? "bg-[#222] text-white hover:bg-black" : "text-[#717171] hover:bg-[#F7F7F7] hover:text-[#222]")}
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

      <div className="mt-4 flex flex-wrap gap-3">
          {(Object.keys(LIST_STATUS) as ReviewListStatus[]).map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5 text-[12px] text-[#717171]">
              <span className={cn("size-2 rounded-full", LIST_STATUS[item].dot)} />
              {LIST_STATUS[item].label}
          </span>
        ))}
      </div>

      <ReviewGroup
        reviews={shown}
        people={people}
        feedback={feedback}
        empty={waitingForDay ? "" : bucket === "sent" ? sentEmpty(narrowed, showingToday, allDays) : invitedEmpty(narrowed, showingToday, allDays)}
      />
    </div>
  )
}

function ReviewGroup({
  reviews,
  people,
  feedback,
  empty,
}: {
  reviews: Review[]
  people: Map<string, User>
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
                <ReviewSummary
                  href={`/reviews/${review.id}`}
                  title={review.title}
                  users={reviewers}
                  progress={completionOf(review)}
                  caption={`${review.reviewers.filter((item) => item.status === "completed").length}/${review.reviewers.length || 0} finished · due ${formatDay(review.deadline)}`}
                  detail={
                    <span className="mt-1 block text-[13px] text-[#717171]">
                      {review.project}
                      {review.feature ? ` · ${review.feature}` : ""} · {windowLabel(review.startDate, review.deadline)} · {owner?.name}
                    </span>
                  }
                  status={<ListStatusPill status={reviewListStatus(review.id, feedback, review.ownerId)} />}
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function sentEmpty(narrowed: boolean, showingToday: boolean, allDays: boolean) {
  if (showingToday) return "Nothing you sent is due today."
  if (!allDays) return "Nothing you sent is due on this day."
  if (narrowed) return "None of the reviews you sent match these filters."
  return "You have not sent a design yet."
}

function invitedEmpty(narrowed: boolean, showingToday: boolean, allDays: boolean) {
  if (showingToday) return "Nobody invited you to a review due today."
  if (!allDays) return "Nobody invited you to a review due on this day."
  if (narrowed) return "No invitation matches these filters."
  return "Nobody has invited you to a review yet."
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

