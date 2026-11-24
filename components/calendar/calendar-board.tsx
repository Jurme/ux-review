"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { toast } from "sonner"
import { AvatarStack, EmptyState, PageHeader, PhasePill, pageWrap } from "@/components/common"
import { buttonVariants } from "@/components/ui/button"
import { canSeeReview, isManager, phaseOf } from "@/lib/domain"
import {
  addDays,
  formatDay,
  formatMonth,
  formatWeekday,
  monthWeeks,
  startOfWeek,
  toISODate,
  windowLabel,
} from "@/lib/format"
import { PHASE_META, PHASE_ORDER, tap } from "@/lib/presentation"
import { rescheduleReview, useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Review } from "@/lib/types"

type View = "month" | "week" | "day"

export function CalendarBoard() {
  const { user, users, reviews } = useWorkspace()
  const router = useRouter()
  const [cursor, setCursor] = useState<Date | null>(null)
  useEffect(() => {
    setCursor((current) => current ?? new Date())
  }, [])
  const [view, setView] = useState<View>("month")
  const [project, setProject] = useState("all")
  const [owner, setOwner] = useState("all")
  const [reviewer, setReviewer] = useState("all")
  const [status, setStatus] = useState("all")
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropDate, setDropDate] = useState<string | null>(null)

  const people = useMemo(() => new Map(users.map((person) => [person.id, person])), [users])
  if (!user || !cursor) return null
  const focus = cursor

  const visible = reviews.filter((review) => {
    if (!canSeeReview(user, review)) return false
    const phase = phaseOf(review)
    if (project !== "all" && review.project !== project) return false
    if (owner !== "all" && review.ownerId !== owner) return false
    if (reviewer !== "all" && !review.reviewers.some((item) => item.userId === reviewer)) return false
    if (status !== "all" && phase !== status) return false
    return true
  })
  const projects = [...new Set(reviews.map((review) => review.project))].sort()

  function shift(direction: number) {
    const next = new Date(focus)
    if (view === "month") next.setMonth(next.getMonth() + direction)
    else if (view === "week") next.setDate(next.getDate() + direction * 7)
    else next.setDate(next.getDate() + direction)
    setCursor(next)
  }

  async function move(id: string, date: string) {
    const review = reviews.find((item) => item.id === id)
    if (!review || !isManager(user, review)) return
    const result = await rescheduleReview(id, date)
    if (!result.ok && result.message) toast.error(result.message)
    else if (result.ok && review.deadline !== date) toast.success(`${review.title} is now due ${formatDay(date)}.`)
    setDragging(null)
    setDropDate(null)
  }

  const label =
    view === "month"
      ? formatMonth(cursor)
      : view === "week"
        ? `${formatWeekday(startOfWeek(cursor))} – ${formatWeekday(addDays(startOfWeek(cursor), 6))}`
        : formatWeekday(cursor)

  return (
    <div className={pageWrap("max-w-[1280px]")}>
      <PageHeader
        eyebrow="Calendar"
        title={label}
        description="Reviews sit on the day they are due. Drag a review to move that deadline, or click a day to send a new one."
        action={
          <Link href="/reviews/new" className={cn(buttonVariants({ size: "lg" }))}>
            <Plus />
            Send a design
          </Link>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl bg-[#F7F7F7] p-1">
          {(["month", "week", "day"] as View[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setView(item)}
              className={cn("h-8 rounded-lg px-3 text-[13px] font-medium capitalize", tap, view === item ? "bg-white text-[#222] shadow-sm" : "text-[#717171]")}
            >
              {item}
            </button>
          ))}
        </div>
        <button type="button" className={cn(buttonVariants({ variant: "outline" }), "h-10 rounded-xl")} onClick={() => setCursor(new Date())}>
          Today
        </button>
        <button type="button" className={cn(buttonVariants({ variant: "outline", size: "icon" }), "rounded-xl")} onClick={() => shift(-1)} aria-label="Previous">
          <ChevronLeft />
        </button>
        <button type="button" className={cn(buttonVariants({ variant: "outline", size: "icon" }), "rounded-xl")} onClick={() => shift(1)} aria-label="Next">
          <ChevronRight />
        </button>
        <Filter label="Project" value={project} onChange={setProject} options={projects.map((item) => ({ value: item, label: item }))} />
        <Filter label="Designer" value={owner} onChange={setOwner} options={users.map((item) => ({ value: item.id, label: item.name }))} />
        <Filter label="Reviewer" value={reviewer} onChange={setReviewer} options={users.map((item) => ({ value: item.id, label: item.name }))} />
        <Filter label="Status" value={status} onChange={setStatus} options={PHASE_ORDER.map((item) => ({ value: item, label: PHASE_META[item].label }))} />
      </div>

      <div className="mt-4 hidden flex-wrap gap-3 md:flex">
        {PHASE_ORDER.map((phase) => (
          <span key={phase} className="inline-flex items-center gap-1.5 text-[12px] text-[#717171]">
            <span className={cn("size-2 rounded-full", PHASE_META[phase].dot)} />
            {PHASE_META[phase].label}
          </span>
        ))}
      </div>

      <div className="mt-5 md:hidden">
        <Agenda
          reviews={visible.filter((review) => review.deadline >= rangeStart(cursor, view) && review.deadline <= rangeEnd(cursor, view))}
          people={people}
          empty="Nothing is due in this range."
        />
      </div>

      <div className="mt-5 hidden md:block">
        {view === "month" ? (
          <MonthGrid
            cursor={cursor}
            reviews={visible}
            dragging={dragging}
            dropDate={dropDate}
            onDragStart={setDragging}
            onDragEnd={() => { setDragging(null); setDropDate(null) }}
            onHover={setDropDate}
            onDrop={move}
          />
        ) : null}
        {view === "week" ? (
          <ColumnGrid
            days={Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(cursor), index))}
            reviews={visible}
            dragging={dragging}
            dropDate={dropDate}
            onDragStart={setDragging}
            onDragEnd={() => { setDragging(null); setDropDate(null) }}
            onHover={setDropDate}
            onDrop={move}
          />
        ) : null}
        {view === "day" ? (
          <div className="rounded-2xl border border-[#EBEBEB] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">{formatWeekday(cursor)}</h2>
              <button type="button" className={cn("text-[13px] font-medium", tap)} onClick={() => router.push(`/reviews/new?date=${toISODate(cursor)}`)}>
                Create on this day
              </button>
            </div>
            <Agenda
              reviews={visible.filter((review) => review.deadline === toISODate(cursor))}
              people={people}
              empty="Nothing is due on this day."
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function rangeStart(cursor: Date, view: View) {
  if (view === "month") return toISODate(new Date(cursor.getFullYear(), cursor.getMonth(), 1))
  if (view === "week") return toISODate(startOfWeek(cursor))
  return toISODate(cursor)
}

function rangeEnd(cursor: Date, view: View) {
  if (view === "month") return toISODate(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0))
  if (view === "week") return toISODate(addDays(startOfWeek(cursor), 6))
  return toISODate(cursor)
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
    <label className="inline-flex items-center gap-2 rounded-xl border border-[#EBEBEB] bg-white px-3 text-[13px]">
      <span className="text-[#717171]">{label}</span>
      <select className="h-10 bg-transparent pr-1 outline-none" value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function Agenda({
  reviews,
  people,
  empty,
}: {
  reviews: Review[]
  people: Map<string, { id: string; name: string }>
  empty: string
}) {
  if (reviews.length === 0) return <EmptyState title="Nothing scheduled" body={empty} />
  return (
    <ul className="space-y-3">
      {reviews
        .slice()
        .sort((a, b) => a.deadline.localeCompare(b.deadline))
        .map((review) => {
          const owner = people.get(review.ownerId)
          const reviewers = review.reviewers.map((item) => people.get(item.userId)).filter((item) => item !== undefined)
          return (
            <li key={review.id}>
              <Link href={`/reviews/${review.id}`} className="block rounded-2xl border border-[#EBEBEB] px-4 py-4 hover:bg-[#F7F7F7]">
                <span className="flex items-start justify-between gap-3">
                  <span className="font-medium">{review.title}</span>
                  <PhasePill phase={phaseOf(review)} />
                </span>
                <span className="mt-1 block text-[13px] text-[#717171]">
                  {review.project} · {windowLabel(review.startDate, review.deadline, review.startTime, review.endTime)}
                </span>
                <span className="mt-3 flex items-center justify-between">
                  <span className="text-[13px] text-[#717171]">{owner?.name} · {review.reviewers.length} reviewers</span>
                  <AvatarStack users={reviewers} />
                </span>
              </Link>
            </li>
          )
        })}
    </ul>
  )
}

function MonthGrid({
  cursor,
  reviews,
  dragging,
  dropDate,
  onDragStart,
  onDragEnd,
  onHover,
  onDrop,
}: {
  cursor: Date
  reviews: Review[]
  dragging: string | null
  dropDate: string | null
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onHover: (date: string) => void
  onDrop: (id: string, date: string) => void
}) {
  const weeks = monthWeeks(cursor)
  const today = toISODate(new Date())
  const dragged = useRef(false)
  return (
    <div className="overflow-hidden rounded-2xl border border-[#EBEBEB]">
      <div className="grid grid-cols-7 border-b border-[#EBEBEB] bg-white">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div key={day} className="px-3 py-2 text-[12px] font-medium text-[#717171]">{day}</div>
        ))}
      </div>
      {weeks.map((week) => {
        const start = toISODate(week[0])
        const end = toISODate(week[6])
        const events = placeEvents(reviews.filter((review) => review.deadline >= start && review.deadline <= end), week)
        const lanes = Math.max(1, ...events.map((event) => event.lane + 1), 1)
        return (
          <div key={start} className="relative border-t border-[#EBEBEB]" style={{ minHeight: 52 + lanes * 28 }}>
            <div className="grid h-full grid-cols-7">
              {week.map((day) => {
                const iso = toISODate(day)
                const outside = day.getMonth() !== cursor.getMonth()
                return (
                  <div
                    key={iso}
                    onDragOver={(event) => {
                      if (!dragging) return
                      event.preventDefault()
                      onHover(iso)
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      const id = event.dataTransfer.getData("text/plain")
                      if (id) onDrop(id, iso)
                    }}
                    className={cn("border-r border-[#EBEBEB] last:border-r-0", dropDate === iso && dragging && "bg-[#F7F7F7]")}
                  >
                    <Link
                      href={`/reviews/new?date=${iso}`}
                      className={cn(
                        "m-2 inline-flex size-7 items-center justify-center rounded-full text-[13px]",
                        iso === today ? "bg-[#FF385C] font-medium text-white" : outside ? "text-[#B0B0B0]" : "text-[#222] hover:bg-[#F7F7F7]",
                      )}
                    >
                      {day.getDate()}
                    </Link>
                  </div>
                )
              })}
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-10 grid grid-cols-7 gap-y-1">
              {events.map((event) => (
                <Link
                  key={`${event.review.id}-${start}`}
                  href={`/reviews/${event.review.id}`}
                  draggable
                  onDragStart={(drag) => {
                    dragged.current = true
                    drag.dataTransfer.setData("text/plain", event.review.id)
                    drag.dataTransfer.effectAllowed = "move"
                    onDragStart(event.review.id)
                  }}
                  onDragEnd={onDragEnd}
                  onClick={(click) => {
                    if (!dragged.current) return
                    click.preventDefault()
                    dragged.current = false
                  }}
                  style={{ gridColumn: `${event.start + 1} / ${event.end + 2}`, gridRow: event.lane + 1 }}
                  className={cn(
                    "pointer-events-auto mx-1 flex h-6 items-center truncate rounded-md px-2 text-left text-[12px] font-medium",
                    PHASE_META[phaseOf(event.review)].tint,
                    dragging && "pointer-events-none",
                  )}
                >
                  {event.review.title}
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function placeEvents(reviews: Review[], week: Date[]) {
  const start = toISODate(week[0])
  const placed = reviews
    .map((review) => {
      const col = dayIndex(start, review.deadline)
      if (col < 0 || col > 6) return null
      return { review, start: col, end: col, lane: 0 }
    })
    .filter((event): event is { review: Review; start: number; end: number; lane: number } => event !== null)
    .sort((a, b) => a.start - b.start)
  const laneEnds: number[] = []
  for (const event of placed) {
    let lane = laneEnds.findIndex((end) => end < event.start)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(event.end)
    } else {
      laneEnds[lane] = event.end
    }
    event.lane = lane
  }
  return placed
}

function dayIndex(start: string, date: string) {
  const a = start.split("-").map(Number)
  const b = date.split("-").map(Number)
  const from = new Date(a[0], a[1] - 1, a[2]).getTime()
  const to = new Date(b[0], b[1] - 1, b[2]).getTime()
  return Math.round((to - from) / 86_400_000)
}

function ColumnGrid({
  days,
  reviews,
  dragging,
  dropDate,
  onDragStart,
  onDragEnd,
  onHover,
  onDrop,
}: {
  days: Date[]
  reviews: Review[]
  dragging: string | null
  dropDate: string | null
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onHover: (date: string) => void
  onDrop: (id: string, date: string) => void
}) {
  const today = toISODate(new Date())
  const dragged = useRef(false)
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((day) => {
        const iso = toISODate(day)
        const items = reviews.filter((review) => review.deadline === iso)
        return (
          <div
            key={iso}
            onDragOver={(event) => {
              if (!dragging) return
              event.preventDefault()
              onHover(iso)
            }}
            onDrop={(event) => {
              event.preventDefault()
              const id = event.dataTransfer.getData("text/plain")
              if (id) onDrop(id, iso)
            }}
            className={cn("min-h-[420px] rounded-2xl border border-[#EBEBEB] p-2", dropDate === iso && dragging && "bg-[#F7F7F7]")}
          >
            <Link href={`/reviews/new?date=${iso}`} className={cn("mb-2 inline-flex rounded-full px-2 py-1 text-[12px] font-medium", iso === today ? "bg-[#FF385C] text-white" : "text-[#717171] hover:bg-[#F7F7F7]")}>
              {formatWeekday(day)}
            </Link>
            <div className="space-y-2">
              {items.map((review) => (
                <Link
                  key={review.id}
                  href={`/reviews/${review.id}`}
                  draggable
                  onDragStart={(drag) => {
                    dragged.current = true
                    drag.dataTransfer.setData("text/plain", review.id)
                    drag.dataTransfer.effectAllowed = "move"
                    onDragStart(review.id)
                  }}
                  onDragEnd={onDragEnd}
                  onClick={(click) => {
                    if (!dragged.current) return
                    click.preventDefault()
                    dragged.current = false
                  }}
                  className={cn("block rounded-xl px-2 py-2 text-[12px] leading-4 font-medium", PHASE_META[phaseOf(review)].tint, dragging && "pointer-events-none")}
                >
                  {review.title}
                  <span className="mt-1 block font-normal opacity-80">{review.project}</span>
                </Link>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
