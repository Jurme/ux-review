"use client"

import Link from "next/link"
import { SendDesignLink } from "@/components/reviews/create-review"
import { Plus } from "lucide-react"
import { AvatarStack, PageHeader, PhasePill, pageWrap, ProgressBar } from "@/components/common"
import { buttonVariants } from "@/components/ui/button"
import { timezoneLabel } from "@/lib/constants"
import { assignmentFor, canSeeReview, completionOf, phaseOf } from "@/lib/domain"
import { formatDay, formatLongDate, greeting, timeAgo, todayISO, windowLabel } from "@/lib/format"
import { PHASE_META } from "@/lib/presentation"
import { useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Phase } from "@/lib/types"

const barPhases: Phase[] = ["scheduled", "in_progress", "feedback_pending", "completed"]

export function DashboardView() {
  const { user, users, reviews, activities, workspace, criteria } = useWorkspace()
  if (!user || !workspace) return null
  const people = new Map(users.map((person) => [person.id, person]))
  const visible = reviews.filter((review) => canSeeReview(user, review))
  const open = visible.filter((review) => review.lifecycle === "open" || review.lifecycle === "draft")
  const needsYou = visible.filter((review) => {
    const mine = assignmentFor(review, user.id)
    const phase = phaseOf(review)
    return mine && mine.status !== "completed" && (phase === "in_progress" || phase === "feedback_pending")
  })
  const coming = visible
    .filter((review) => {
      const phase = phaseOf(review)
      return phase === "scheduled" || phase === "in_progress" || phase === "feedback_pending"
    })
    .sort((a, b) => a.deadline.localeCompare(b.deadline))
    .slice(0, 4)
  const stats = [
    { label: "Total reviews", value: visible.filter((review) => review.lifecycle !== "archived").length },
    { label: "Upcoming", value: visible.filter((review) => phaseOf(review) === "scheduled").length },
    { label: "In progress", value: visible.filter((review) => {
      const phase = phaseOf(review)
      return phase === "in_progress" || phase === "feedback_pending"
    }).length },
    { label: "Completed", value: visible.filter((review) => phaseOf(review) === "completed").length },
    {
      label: "Pending feedback",
      value: visible
        .filter((review) => {
          const phase = phaseOf(review)
          return phase === "in_progress" || phase === "feedback_pending"
        })
        .reduce((sum, review) => sum + review.reviewers.filter((reviewer) => reviewer.status !== "completed").length, 0),
    },
  ]
  const counted = visible.filter((review) => barPhases.includes(phaseOf(review)))
  const line =
    needsYou.length === 0
      ? "Nothing is waiting on you. Open reviews are ordered by the soonest deadline."
      : needsYou.length === 1
        ? `You have one review waiting: ${needsYou[0].title}.`
        : `You have ${needsYou.length} reviews waiting on your feedback.`

  return (
    <div className={pageWrap()}>
      <PageHeader
        eyebrow={`${workspace.name} · ${formatLongDate(new Date())}`}
        title={greeting(user.name)}
        description={line}
        action={
          <SendDesignLink className={cn(buttonVariants({ size: "lg" }))}>
            <Plus />
            Send a design
          </SendDesignLink>
        }
      />

      {visible.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-[#EBEBEB] p-5">
          <h2 className="text-[16px] font-semibold">Set up this workspace</h2>
          <p className="mt-1 text-[14px] text-[#717171]">
            Add the projects you design, the people who review them, and the criteria you want checked. Then send a design.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/settings?tab=projects" className="chip">{workspace.projects.length} project{workspace.projects.length === 1 ? "" : "s"}</Link>
            <Link href="/settings?tab=people" className="chip">{Math.max(users.length - 1, 0)} reviewer{users.length - 1 === 1 ? "" : "s"} invited</Link>
            <Link href="/settings?tab=criteria" className="chip">{criteria.filter((item) => item.active).length} active criteria</Link>
          </div>
        </section>
      ) : null}

      {needsYou.length > 0 ? (
        <section className="mt-8 rounded-2xl border border-[#EBEBEB] px-5 py-4">
          <h2 className="text-[13px] font-medium text-[#717171]">Needs you</h2>
          <ul className="mt-1 divide-y divide-[#EBEBEB]">
            {needsYou.map((review) => (
              <li key={review.id}>
                <Link href={`/reviews/${review.id}`} className="flex items-center justify-between gap-4 py-3">
                  <span>
                    <span className="block font-medium">{review.title}</span>
                    <span className="mt-0.5 block text-[13px] text-[#717171]">
                      {review.project} · Due {formatDay(review.deadline)} · {assignmentFor(review, user.id)?.focus}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] font-medium text-[#FF385C]">Give feedback</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 grid grid-cols-2 overflow-hidden rounded-2xl border border-[#EBEBEB] sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat, index) => (
          <div key={stat.label} className={cn("bg-white px-5 py-4", index > 0 && "border-[#EBEBEB] lg:border-l", index % 2 === 1 && "border-l sm:border-l", index > 1 && "border-t sm:border-t-0")}>
            <p className="text-[13px] text-[#717171]">{stat.label}</p>
            <p className="mt-2 text-[28px] font-semibold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[18px] font-semibold tracking-tight">Coming up</h2>
            <Link href="/calendar" className="text-[13px] font-medium text-[#222] underline-offset-4 hover:underline">
              Calendar
            </Link>
          </div>
          <p className="mt-1 text-[13px] text-[#717171]">Open windows, soonest deadline first. These are not meetings.</p>
          <ul className="mt-4 divide-y divide-[#EBEBEB]">
            {coming.length === 0 ? (
              <li className="py-8 text-[14px] text-[#717171]">No open reviews. Create one from the calendar.</li>
            ) : (
              coming.map((review) => {
                const owner = people.get(review.ownerId)
                const reviewers = review.reviewers.map((item) => people.get(item.userId)).filter((item) => item !== undefined)
                return (
                  <li key={review.id}>
                    <Link href={`/reviews/${review.id}`} className="flex flex-wrap items-center gap-4 py-4">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{review.title}</span>
                        <span className="mt-1 block text-[13px] text-[#717171]">
                          {review.project}
                          {review.feature ? ` · ${review.feature}` : ""} ·{" "}
                          {review.deadline < todayISO() ? (
                            <span className="text-[#8A5A12]">Overdue {formatDay(review.deadline)}</span>
                          ) : (
                            windowLabel(review.startDate, review.deadline)
                          )}{" "}
                          · {timezoneLabel(review.timezone)}
                        </span>
                        <span className="mt-2 block text-[13px] text-[#717171]">
                          {owner ? owner.name : "Unknown owner"} · {review.reviewers.length} reviewer{review.reviewers.length === 1 ? "" : "s"}
                        </span>
                      </span>
                      <AvatarStack users={reviewers} />
                      <span className="w-28">
                        <ProgressBar value={completionOf(review)} />
                        <span className="mt-1 block text-[12px] text-[#717171]">{completionOf(review)}%</span>
                      </span>
                      <PhasePill phase={phaseOf(review)} />
                    </Link>
                  </li>
                )
              })
            )}
          </ul>
        </section>

        <div className="space-y-10">
          <section>
            <h2 className="text-[18px] font-semibold tracking-tight">Review activity</h2>
            <ul className="mt-4 space-y-4">
              {activities.slice(0, 6).map((activity) => {
                const person = people.get(activity.actorId)
                const href = activity.reviewId ? `/reviews/${activity.reviewId}` : "/reviews"
                return (
                  <li key={activity.id} className="flex gap-3">
                    <span className="mt-1 size-2 shrink-0 rounded-full bg-[#FF385C]" />
                    <span>
                      <Link href={href} className="text-[14px] leading-5 text-[#222] hover:underline">
                        {activity.message}
                      </Link>
                      <span className="mt-0.5 block text-[12px] text-[#717171]">
                        {person?.name} · {timeAgo(activity.createdAt)}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
          <section>
            <h2 className="text-[18px] font-semibold tracking-tight">Completion</h2>
            <p className="mt-1 text-[13px] text-[#717171]">
              {counted.length} review{counted.length === 1 ? "" : "s"} outside drafts and the archive. {open.filter((review) => review.lifecycle === "draft").length} still in draft.
            </p>
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[#F7F7F7]">
              {barPhases.map((phase) => {
                const count = counted.filter((review) => phaseOf(review) === phase).length
                if (!count || counted.length === 0) return null
                return (
                  <div
                    key={phase}
                    className={PHASE_META[phase].dot}
                    style={{ width: `${(count / counted.length) * 100}%` }}
                  />
                )
              })}
            </div>
            <ul className="mt-4 space-y-2">
              {barPhases.map((phase) => {
                const count = counted.filter((review) => phaseOf(review) === phase).length
                return (
                  <li key={phase} className="flex items-center justify-between text-[13px]">
                    <span className="flex items-center gap-2">
                      <span className={cn("size-2 rounded-full", PHASE_META[phase].dot)} />
                      {PHASE_META[phase].label}
                    </span>
                    <span className="text-[#717171]">{count}</span>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
