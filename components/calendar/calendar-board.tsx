"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, PageHeader, pageWrap } from "@/components/common"
import { buttonVariants } from "@/components/ui/button"
import { SendDesignLink } from "@/components/reviews/create-review"
import { ReviewRoleToggle, type ReviewBucket } from "@/components/reviews/role-toggle"
import { canSeeReview, isManager, reviewBucket, reviewListStatus, type ReviewListStatus } from "@/lib/domain"
import { addDays, formatDay, formatMonth, startOfWeek, todayISO, toISODate } from "@/lib/format"
import { tap } from "@/lib/presentation"
import { rescheduleReview, useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Feedback, Review } from "@/lib/types"

type View = "week" | "month" | "day"

const STATUS_META: Record<ReviewListStatus, { label: string; chip: string; dot: string }> = {
  pending: { label: "Pending review", chip: "bg-[#E8F1FB] text-[#1F4E8C] border-[#D3E4F8]", dot: "bg-[#2B7FFF]" },
  in_progress: { label: "In progress", chip: "bg-[#FFF1D6] text-[#8A5A00] border-[#F3E0B5]", dot: "bg-[#E08A00]" },
  completed: { label: "Completed", chip: "bg-[#DCF5EA] text-[#046B48] border-[#C6EBD9]", dot: "bg-[#008A5B]" },
}

const HOUR_START = 8
const HOUR_END = 19
const HOUR_HEIGHT = 64
const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, index) => HOUR_START + index)

export function CalendarBoard() {
  const { user, users, reviews, feedback, workspace } = useWorkspace()
  const [cursor, setCursor] = useState<Date | null>(null)
  useEffect(() => {
    setCursor((current) => current ?? new Date())
  }, [])
  const [view, setView] = useState<View>("week")
  const [project, setProject] = useState("all")
  const [status, setStatus] = useState<ReviewListStatus | "all">("all")
  const [bucket, setBucket] = useState<ReviewBucket>("sent")
  const [dragging, setDragging] = useState<string | null>(null)
  const [dropDate, setDropDate] = useState<string | null>(null)

  const people = useMemo(() => new Map(users.map((person) => [person.id, person])), [users])
  if (!user || !cursor || !workspace) return null
  const focus = cursor
  const today = todayISO()
  const projects = [...workspace.projects].sort((a, b) => a.localeCompare(b))

  const matched = reviews.filter((review) => {
    if (!canSeeReview(user, review)) return false
    if (review.lifecycle === "draft" || review.lifecycle === "archived") return false
    if (project !== "all" && review.project !== project) return false
    if (status !== "all" && reviewListStatus(review.id, feedback) !== status) return false
    return true
  })
  const visible = matched.filter((review) => reviewBucket(user.id, review) === bucket)

  function shift(direction: number) {
    const next = new Date(focus)
    if (view === "month") next.setMonth(next.getMonth() + direction)
    else if (view === "week") next.setDate(next.getDate() + direction * 7)
    else next.setDate(next.getDate() + direction)
    setCursor(next)
  }

  async function move(id: string, date: string) {
    if (date < today) {
      toast.error("Choose today or a later day.")
      setDragging(null)
      setDropDate(null)
      return
    }
    const review = reviews.find((item) => item.id === id)
    if (!review || !isManager(user, review)) {
      setDragging(null)
      setDropDate(null)
      return
    }
    const result = await rescheduleReview(id, date)
    if (!result.ok && result.message) toast.error(result.message)
    else if (result.ok && review.deadline !== date) toast.success(`${review.title} is now due ${formatDay(date)}.`)
    setDragging(null)
    setDropDate(null)
  }

  const weekStart = startOfWeek(focus)
  const label = view === "month" ? formatMonth(focus) : view === "day" ? formatWeekTitle(focus, focus) : formatWeekTitle(weekStart, addDays(weekStart, 6))

  return (
    <div className={pageWrap("max-w-[1280px]")}>
      <PageHeader
        eyebrow="Calendar"
        title={label}
        description="The week shows each review on the day it is due. Drag a review to another day to move that deadline."
        action={
          <SendDesignLink className={cn(buttonVariants({ size: "lg" }))}>
            <Plus />
            Send a design
          </SendDesignLink>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl bg-[#F7F7F7] p-1">
          {(["week", "month", "day"] as View[]).map((item) => (
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
        <ReviewRoleToggle
          value={bucket}
          onChange={setBucket}
          sent={matched.filter((review) => reviewBucket(user.id, review) === "sent").length}
          invited={matched.filter((review) => reviewBucket(user.id, review) === "invited").length}
        />
        <Filter label="Project" value={project} onChange={setProject} options={projects.map((item) => ({ value: item, label: item }))} />
        <Filter
          label="Status"
          value={status}
          onChange={(value) => setStatus(value as ReviewListStatus | "all")}
          options={(Object.keys(STATUS_META) as ReviewListStatus[]).map((item) => ({ value: item, label: STATUS_META[item].label }))}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {(Object.keys(STATUS_META) as ReviewListStatus[]).map((item) => (
          <span key={item} className="inline-flex items-center gap-1.5 text-[12px] text-[#717171]">
            <span className={cn("size-2 rounded-full", STATUS_META[item].dot)} />
            {STATUS_META[item].label}
          </span>
        ))}
      </div>

      <div className="mt-5">
        {view === "month" ? (
          <MonthGrid cursor={focus} reviews={visible} feedback={feedback} dragging={dragging} dropDate={dropDate} today={today} onDragStart={setDragging} onDragEnd={() => { setDragging(null); setDropDate(null) }} onHover={setDropDate} onDrop={move} />
        ) : (
          <WeekGrid
            days={view === "day" ? [focus] : Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))}
            reviews={visible}
            feedback={feedback}
            people={people}
            dragging={dragging}
            dropDate={dropDate}
            today={today}
            onDragStart={setDragging}
            onDragEnd={() => { setDragging(null); setDropDate(null) }}
            onHover={setDropDate}
            onDrop={move}
          />
        )}
        {visible.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="Nothing due in this view" body={bucket === "sent" ? "Nothing you sent is due in this view." : "Nothing you were invited to is due in this view."} />
          </div>
        ) : null}
      </div>
    </div>
  )
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
      <select className="bg-transparent pr-1 outline-none" value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
        <option value="all">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function WeekGrid({
  days,
  reviews,
  feedback,
  people,
  dragging,
  dropDate,
  today,
  onDragStart,
  onDragEnd,
  onHover,
  onDrop,
}: {
  days: Date[]
  reviews: Review[]
  feedback: Feedback[]
  people: Map<string, { name: string }>
  dragging: string | null
  dropDate: string | null
  today: string
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onHover: (date: string) => void
  onDrop: (id: string, date: string) => void
}) {
  const dragged = useRef(false)
  const columns = days.length
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E5E5E5] bg-white">
      <div className={cn("min-w-[760px]", columns === 1 && "min-w-0")}>
        <div className="grid border-b border-[#E5E5E5]" style={{ gridTemplateColumns: `72px repeat(${columns}, minmax(0, 1fr))` }}>
          <div className="border-r border-[#E5E5E5]" />
          {days.map((day) => {
            const iso = toISODate(day)
            return (
              <div key={iso} className="border-l border-[#E5E5E5] px-2 py-3 text-center first:border-l-0">
                <div className="text-[12px] font-medium text-[#717171]">{day.toLocaleDateString("en-GB", { weekday: "short" })}</div>
                {iso >= today ? (
                  <SendDesignLink className={cn("mx-auto mt-1 grid size-8 place-items-center rounded-full text-[14px] font-semibold", iso === today ? "bg-[#FF385C] text-white" : "text-[#222] hover:bg-[#F7F7F7]")}>
                    {day.getDate()}
                  </SendDesignLink>
                ) : (
                  <span className="mx-auto mt-1 grid size-8 place-items-center rounded-full text-[14px] font-semibold text-[#222]">{day.getDate()}</span>
                )}
              </div>
            )
          })}
        </div>
        <div className="relative">
          <div className="grid" style={{ gridTemplateColumns: `72px repeat(${columns}, minmax(0, 1fr))` }}>
            {HOURS.map((hour) => (
              <div key={hour} className="contents">
                <div className="relative h-16 border-r border-b border-[#E5E5E5] pr-2 text-right">
                  <span className="absolute top-1 right-2 text-[11px] leading-none text-[#717171]">{hourLabel(hour)}</span>
                </div>
                {days.map((day) => {
                  const iso = toISODate(day)
                  return (
                    <div
                      key={`${iso}-${hour}`}
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
                      className={cn("h-16 border-b border-l border-[#E5E5E5]", dropDate === iso && dragging && "bg-[#F7F7F7]")}
                    />
                  )
                })}
              </div>
            ))}
          </div>
          <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `72px repeat(${columns}, minmax(0, 1fr))` }}>
            <div />
            {days.map((day) => {
              const iso = toISODate(day)
              const items = layoutDay(reviews.filter((review) => review.deadline === iso))
              return (
                <div key={iso} className="relative">
                  {items.map((item) => {
                    const state = reviewListStatus(item.review.id, feedback)
                    const owner = people.get(item.review.ownerId)
                    return (
                      <Link
                        key={item.review.id}
                        href={`/reviews/${item.review.id}`}
                        draggable
                        onDragStart={(drag) => {
                          dragged.current = true
                          drag.dataTransfer.setData("text/plain", item.review.id)
                          drag.dataTransfer.effectAllowed = "move"
                          onDragStart(item.review.id)
                        }}
                        onDragEnd={onDragEnd}
                        onClick={(click) => {
                          if (!dragged.current) return
                          click.preventDefault()
                          dragged.current = false
                        }}
                        style={{
                          top: item.top,
                          height: item.height,
                          left: `calc(${item.column * (100 / item.columns)}% + 4px)`,
                          width: `calc(${100 / item.columns}% - 8px)`,
                        }}
                        className={cn(
                          "pointer-events-auto absolute overflow-hidden rounded-lg border px-2 py-1 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04)]",
                          STATUS_META[state].chip,
                          dragging === item.review.id && "opacity-60",
                        )}
                      >
                        <span className="block truncate text-[12px] font-semibold">{item.review.title}</span>
                        <span className="block truncate text-[11px] font-normal opacity-80">{item.review.project}{owner ? ` · ${owner.name}` : ""}</span>
                      </Link>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function MonthGrid({
  cursor,
  reviews,
  feedback,
  dragging,
  dropDate,
  today,
  onDragStart,
  onDragEnd,
  onHover,
  onDrop,
}: {
  cursor: Date
  reviews: Review[]
  feedback: Feedback[]
  dragging: string | null
  dropDate: string | null
  today: string
  onDragStart: (id: string) => void
  onDragEnd: () => void
  onHover: (date: string) => void
  onDrop: (id: string, date: string) => void
}) {
  const dragged = useRef(false)
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const gridStart = startOfWeek(first)
  const days = Array.from({ length: 42 }, (_, index) => addDays(gridStart, index))
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E5E5E5] bg-white">
      <div className="min-w-[720px]">
        <div className="grid grid-cols-7 border-b border-[#E5E5E5]">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="border-r border-[#E5E5E5] px-2 py-2 text-[12px] font-medium text-[#717171] last:border-r-0">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const iso = toISODate(day)
            const outside = day.getMonth() !== cursor.getMonth()
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
                className={cn("min-h-[124px] border-r border-b border-[#E5E5E5] p-1.5 last:border-r-0", dropDate === iso && dragging && "bg-[#F7F7F7]")}
              >
                {iso >= today ? (
                  <SendDesignLink className={cn("mb-1 inline-flex size-7 items-center justify-center rounded-full text-[13px]", iso === today ? "bg-[#FF385C] font-medium text-white" : outside ? "text-[#B0B0B0] hover:bg-[#F7F7F7]" : "text-[#222] hover:bg-[#F7F7F7]")}>
                    {day.getDate()}
                  </SendDesignLink>
                ) : (
                  <span className={cn("mb-1 inline-flex size-7 items-center justify-center rounded-full text-[13px]", outside ? "text-[#B0B0B0]" : "text-[#222]")}>{day.getDate()}</span>
                )}
                <div className="space-y-1">
                  {items.map((review) => {
                    const state = reviewListStatus(review.id, feedback)
                    return (
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
                        className={cn("block truncate rounded-md border px-1.5 py-1 text-[11px] font-medium", STATUS_META[state].chip)}
                      >
                        {review.title}
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function layoutDay(reviews: Review[]) {
  const placed = reviews
    .map((review) => {
      const start = clampMinute(minutesOf(review.startTime))
      return { review, start, end: start + 60, column: 0, columns: 1 }
    })
    .sort((a, b) => a.start - b.start || a.review.title.localeCompare(b.review.title))
  const columnEnds: number[] = []
  for (const item of placed) {
    let column = columnEnds.findIndex((end) => end <= item.start)
    if (column === -1) {
      column = columnEnds.length
      columnEnds.push(item.end)
    } else {
      columnEnds[column] = item.end
    }
    item.column = column
  }
  const columns = Math.max(1, columnEnds.length)
  return placed.map((item) => ({
    ...item,
    columns,
    top: ((item.start - HOUR_START * 60) / 60) * HOUR_HEIGHT + 2,
    height: HOUR_HEIGHT - 6,
  }))
}

function minutesOf(time: string) {
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim())
  if (!match) return 9 * 60
  return Number(match[1]) * 60 + Number(match[2])
}

function clampMinute(minute: number) {
  const earliest = HOUR_START * 60
  const latest = (HOUR_END - 1) * 60
  return Math.min(Math.max(minute, earliest), latest)
}

function hourLabel(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM"
  const value = hour % 12 === 0 ? 12 : hour % 12
  return `${value} ${suffix}`
}

function formatWeekTitle(start: Date, end: Date) {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  if (sameMonth) return `${start.getDate()}–${end.getDate()} ${formatMonth(end)}`
  return `${start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`
}
