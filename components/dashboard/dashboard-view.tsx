"use client"

import Link from "next/link"
import { SendDesignLink } from "@/components/reviews/create-review"
import { Plus } from "lucide-react"
import { AvatarStack, PageHeader, pageWrap, ProgressBar } from "@/components/common"
import { buttonVariants } from "@/components/ui/button"
import { assignmentFor, canSeeReview, completionOf, reviewListStatus, type ReviewListStatus } from "@/lib/domain"
import { formatDay, formatLongDate, greeting, timeAgo } from "@/lib/format"
import { useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"

const STATUS_ORDER: ReviewListStatus[] = ["pending", "in_progress", "completed"]
const STATUS_META: Record<ReviewListStatus, { label: string; dot: string }> = {
  pending: { label: "Pending review", dot: "bg-[#2B7FFF]" },
  in_progress: { label: "In progress", dot: "bg-[#E08A00]" },
  completed: { label: "Completed", dot: "bg-[#008A5B]" },
}

export function DashboardView() {
  const { user, users, reviews, feedback, activities, workspace, criteria } = useWorkspace()
  if (!user || !workspace) return null
  const people = new Map(users.map((person) => [person.id, person]))
  const visible = reviews.filter((review) => canSeeReview(user, review) && review.lifecycle !== "draft" && review.lifecycle !== "archived")
  const needsYou = visible.filter((review) => {
    const mine = assignmentFor(review, user.id)
    return review.lifecycle === "open" && mine && mine.status !== "completed" && reviewListStatus(review.id, feedback) !== "completed"
  })
  const coming = visible
    .filter((review) => reviewListStatus(review.id, feedback) !== "completed")
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
    .slice(0, 4)
  const counts = Object.fromEntries(STATUS_ORDER.map((status) => [status, visible.filter((review) => reviewListStatus(review.id, feedback) === status).length])) as Record<ReviewListStatus, number>
  const stats = STATUS_ORDER.map((status) => ({ label: STATUS_META[status].label, value: counts[status] }))
  const line =
    needsYou.length === 0
      ? "Nothing is waiting on your feedback."
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
                      {review.project} · Sent {formatDay(review.startDate)} · {assignmentFor(review, user.id)?.focus}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] font-medium text-[#FF385C]">Give feedback</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8 grid grid-cols-1 overflow-hidden rounded-2xl border border-[#EBEBEB] sm:grid-cols-3">
        {stats.map((stat, index) => (
          <div key={stat.label} className={cn("bg-white px-5 py-4", index > 0 && "border-t border-[#EBEBEB] sm:border-t-0 sm:border-l")}>
            <p className="text-[13px] text-[#717171]">{stat.label}</p>
            <p className="mt-2 text-[28px] font-semibold tracking-tight">{stat.value}</p>
          </div>
        ))}
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.8fr)]">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-[18px] font-semibold tracking-tight">Open reviews</h2>
            <Link href="/reviews" className="text-[13px] font-medium text-[#222] underline-offset-4 hover:underline">
              All reviews
            </Link>
          </div>
          <p className="mt-1 text-[13px] text-[#717171]">Reviews that are still pending or in progress.</p>
          <ul className="mt-4 divide-y divide-[#EBEBEB]">
            {coming.length === 0 ? (
              <li className="py-8 text-[14px] text-[#717171]">Nothing is waiting. Send a design when you have one ready.</li>
            ) : (
              coming.map((review) => {
                const owner = people.get(review.ownerId)
                const reviewers = review.reviewers.map((item) => people.get(item.userId)).filter((item) => item !== undefined)
                const status = reviewListStatus(review.id, feedback)
                return (
                  <li key={review.id}>
                    <Link href={`/reviews/${review.id}`} className="flex flex-wrap items-center gap-4 py-4">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{review.title}</span>
                        <span className="mt-1 block text-[13px] text-[#717171]">
                          {review.project}
                          {review.feature ? ` · ${review.feature}` : ""} · Sent {formatDay(review.startDate)}
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
                      <span className="inline-flex items-center gap-1.5 text-[13px] text-[#222]">
                        <span className={cn("size-2 rounded-full", STATUS_META[status].dot)} />
                        {STATUS_META[status].label}
                      </span>
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
              {visible.length} review{visible.length === 1 ? "" : "s"}. Pending until someone responds. In progress after the first response. Completed after three.
            </p>
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[#F7F7F7]">
              {STATUS_ORDER.map((status) => {
                if (!counts[status] || visible.length === 0) return null
                return (
                  <div
                    key={status}
                    className={STATUS_META[status].dot}
                    style={{ width: `${(counts[status] / visible.length) * 100}%` }}
                  />
                )
              })}
            </div>
            <ul className="mt-4 space-y-2">
              {STATUS_ORDER.map((status) => (
                <li key={status} className="flex items-center justify-between text-[13px]">
                  <span className="flex items-center gap-2">
                    <span className={cn("size-2 rounded-full", STATUS_META[status].dot)} />
                    {STATUS_META[status].label}
                  </span>
                  <span className="text-[#717171]">{counts[status]}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
