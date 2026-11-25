"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { SendDesignLink } from "@/components/reviews/create-review"
import { ReviewRoleToggle, type ReviewBucket } from "@/components/reviews/role-toggle"
import { Plus } from "lucide-react"
import { PageHeader, pageWrap } from "@/components/common"
import { ReviewSummary } from "@/components/reviews/review-summary"
import { buttonVariants } from "@/components/ui/button"
import { canSeeReview, completionOf, reviewBucket, reviewListStatus, type ReviewListStatus } from "@/lib/domain"
import { dateInTimeZone, formatDay, formatLongDate, greeting, timeAgo } from "@/lib/format"
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
  const [bucket, setBucket] = useState<ReviewBucket>("invited")
  const [today, setToday] = useState<string | null>(null)
  const zone = workspace?.timezone
  useEffect(() => {
    if (!zone) return
    const id = window.setTimeout(() => setToday(dateInTimeZone(zone)), 0)
    return () => window.clearTimeout(id)
  }, [zone])
  if (!user || !workspace) return null
  const people = new Map(users.map((person) => [person.id, person]))
  const visible = reviews.filter((review) => canSeeReview(user, review) && review.lifecycle !== "draft" && review.lifecycle !== "archived")
  const sentCount = visible.filter((review) => reviewBucket(user.id, review) === "sent").length
  const invitedCount = visible.filter((review) => reviewBucket(user.id, review) === "invited").length
  const scoped = visible.filter((review) => reviewBucket(user.id, review) === bucket)
  const coming = scoped
    .filter((review) => today !== null && review.deadline === today && reviewListStatus(review.id, feedback, review.ownerId) !== "completed")
    .sort((a, b) => a.title.localeCompare(b.title))
  const counts = Object.fromEntries(STATUS_ORDER.map((status) => [status, scoped.filter((review) => reviewListStatus(review.id, feedback, review.ownerId) === status).length])) as Record<ReviewListStatus, number>
  const stats = STATUS_ORDER.map((status) => ({ label: STATUS_META[status].label, value: counts[status] }))

  return (
    <div className={pageWrap()}>
      <PageHeader
        eyebrow={`${workspace.name} · ${formatLongDate(new Date())}`}
        title={greeting(user.name)}
        action={
          <SendDesignLink className={cn(buttonVariants({ size: "lg" }))}>
            <Plus />
            Send a design
          </SendDesignLink>
        }
      />

      <div className="mt-6">
        <ReviewRoleToggle value={bucket} onChange={setBucket} sent={sentCount} invited={invitedCount} />
      </div>

      {scoped.length === 0 && visible.length === 0 ? (
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
            <h2 className="text-[18px] font-semibold tracking-tight">Upcoming reviews</h2>
            <Link href="/reviews" className="text-[13px] font-medium text-[#222] underline-offset-4 transition-colors hover:text-[#FF385C] hover:underline">
              All reviews
            </Link>
          </div>
          <p className="mt-1 text-[13px] text-[#717171]">{bucket === "sent" ? "Designs you sent that are due today." : "Reviews you were invited to that are due today."}</p>
          <ul className="mt-1 divide-y divide-[var(--border)]">
            {today !== null && coming.length === 0 ? (
              <ClearToday />
            ) : (
              coming.map((review) => {
                const owner = people.get(review.ownerId)
                const reviewers = review.reviewers.map((item) => people.get(item.userId)).filter((item) => item !== undefined)
                const done = review.reviewers.filter((item) => item.status === "completed").length
                return (
                  <li key={review.id}>
                    <ReviewSummary
                      href={`/reviews/${review.id}`}
                      title={review.title}
                      project={review.project}
                      sent={formatDay(review.startDate)}
                      done={done}
                      total={review.reviewers.length}
                      progress={completionOf(review)}
                      owner={owner?.name || "Unknown"}
                      users={reviewers}
                      status={reviewListStatus(review.id, feedback, review.ownerId)}
                    />
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
                      <Link href={href} className="text-[14px] leading-5 text-[#222] underline-offset-4 transition-colors hover:text-[#FF385C] hover:underline">
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
              {scoped.length} review{scoped.length === 1 ? "" : "s"}. Pending until someone responds. In progress after the first response. Completed after three.
            </p>
            <div className="mt-4 flex h-2 overflow-hidden rounded-full bg-[#F7F7F7]">
              {STATUS_ORDER.map((status) => {
                if (!counts[status] || scoped.length === 0) return null
                return (
                  <div
                    key={status}
                    className={STATUS_META[status].dot}
                    style={{ width: `${(counts[status] / scoped.length) * 100}%` }}
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

function ClearToday() {
  return (
    <li className="flex items-center gap-4 py-8">
      <style>{`
        .clear-day { position: relative; display: grid; width: 36px; height: 36px; flex-shrink: 0; place-items: center; }
        .clear-day-dot { width: 8px; height: 8px; border-radius: 999px; background: #f3c3cd; }
        .clear-day-ring { position: absolute; inset: 6px; border-radius: 999px; border: 1px solid #f0d5db; animation: day-breathe 2.8s ease-out infinite; }
        @keyframes day-breathe { 0% { transform: scale(0.7); opacity: 0.75; } 75% { transform: scale(1.45); opacity: 0; } 100% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .clear-day-ring { animation: none; opacity: 0.7; } }
        :root[data-theme="dark"] .clear-day-dot { background: #8a4d5a; }
        :root[data-theme="dark"] .clear-day-ring { border-color: #5c3a42; }
      `}</style>
      <span className="clear-day" aria-hidden>
        <span className="clear-day-ring" />
        <span className="clear-day-dot" />
      </span>
      <span>
        <span className="block text-[15px] font-medium text-[#222]">No reviews waiting today</span>
        <span className="mt-0.5 block text-[13px] text-[#717171]">The day is clear. Anything due today will show up here.</span>
      </span>
    </li>
  )
}
