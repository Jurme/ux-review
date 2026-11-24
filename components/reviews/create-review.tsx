"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"
import { toast } from "sonner"
import { Avatar } from "@/components/common"
import { DEFAULT_REMINDER_MINUTES, REMINDER_OPTIONS } from "@/lib/constants"
import { addDaysISO, isEmail, parseISODate, todayISO, toISODate } from "@/lib/format"
import { tap } from "@/lib/presentation"
import { addProject, inviteMember, saveReview, useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { ReviewDraft } from "@/lib/types"

const WINDOWS = [
  { days: 2, label: "2 days" },
  { days: 3, label: "3 days" },
  { days: 5, label: "5 days" },
  { days: 7, label: "1 week" },
]

export function CreateReview() {
  const params = useSearchParams()
  const initial = params.get("date")
  const fromQuery = initial && /^\d{4}-\d{2}-\d{2}$/.test(initial) ? initial : ""
  const [sendDefault, setSendDefault] = useState(fromQuery)
  useEffect(() => {
    if (!sendDefault) setSendDefault(todayISO())
  }, [sendDefault])
  if (!sendDefault) return null
  return <SendForm key={sendDefault} sendDefault={sendDefault} />
}

function SendForm({ sendDefault }: { sendDefault: string }) {
  const router = useRouter()
  const { user, users, reviews, workspace } = useWorkspace()
  const [title, setTitle] = useState("")
  const [project, setProject] = useState("")
  const [figma, setFigma] = useState("")
  const [note, setNote] = useState("")
  const [sendOn, setSendOn] = useState(sendDefault)
  const [windowDays, setWindowDays] = useState(3)
  const [month, setMonth] = useState(() => {
    const date = parseISODate(sendDefault)
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })
  const [reviewerIds, setReviewerIds] = useState<string[]>(() => users.filter((person) => person.id !== user?.id).map((person) => person.id))
  const [query, setQuery] = useState("")
  const [newProject, setNewProject] = useState("")
  const [reminder, setReminder] = useState(() => {
    const current = String(workspace?.reminderHours ?? "")
    return REMINDER_OPTIONS.some((item) => item.value === current) ? Number(current) : DEFAULT_REMINDER_MINUTES
  })

  const projects = useMemo(() => {
    const fromReviews = reviews.map((review) => review.project)
    return [...new Set([...(workspace?.projects ?? []), ...fromReviews])].filter(Boolean).sort()
  }, [reviews, workspace?.projects])

  if (!user || !workspace) return null
  const others = users.filter((person) => person.id !== user.id)
  const selected = reviewerIds.map((id) => users.find((person) => person.id === id)).filter((person): person is NonNullable<typeof person> => Boolean(person))
  const suggestions = query.trim()
    ? others.filter((person) => !reviewerIds.includes(person.id) && `${person.name} ${person.email}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : []

  function removeReviewer(id: string) {
    setReviewerIds((current) => current.filter((item) => item !== id))
  }

  function addReviewer(id: string) {
    setReviewerIds((current) => (current.includes(id) ? current : [...current, id]))
    setQuery("")
  }

  async function addProjectName() {
    const result = await addProject(newProject)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    setProject(newProject.trim())
    setNewProject("")
    toast.success(result.message ?? "Project added.")
  }

  async function addFromQuery() {
    const text = query.trim()
    if (!text) return
    const existing = others.find((person) => person.email.toLowerCase() === text.toLowerCase() || person.name.toLowerCase() === text.toLowerCase())
    if (existing) {
      addReviewer(existing.id)
      return
    }
    if (!isEmail(text)) {
      if (suggestions.length === 1) addReviewer(suggestions[0].id)
      return
    }
    const result = await inviteMember({ name: "", email: text })
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    if (result.id) addReviewer(result.id)
    toast.success(result.message ?? "Reviewer added.")
  }

  async function submit(mode: "draft" | "publish") {
    const draft: ReviewDraft = {
      title,
      project,
      feature: "",
      description: note,
      ownerId: user!.id,
      figmaUrl: figma,
      designVersion: "",
      referenceUrls: [],
      startDate: sendOn,
      deadline: addDaysISO(sendOn, windowDays),
      startTime: "",
      endTime: "",
      timezone: workspace!.timezone,
      reminderHours: reminder,
      shareFeedback: true,
      criteriaIds: [],
      reviewers: reviewerIds.map((userId) => ({ userId, focus: "General" })),
    }
    const result = await saveReview(draft, mode)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    if (result.id) router.push(`/reviews/${result.id}`)
    else router.push("/reviews")
  }

  return (
    <div className="mx-auto w-full max-w-[640px] px-6 py-8 md:px-0 md:py-2">
      <h1 className="text-[28px] font-bold tracking-tight">Send a design for review</h1>
      <p className="mt-1 text-[14px] text-[#717171]">
        Pick the day it goes out. Everyone in the workspace is on the review until you remove them.
      </p>
      <div className="mt-6 rounded-[20px] border border-[#EBEBEB] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <label className="mt-1 block text-[13px] font-semibold">Project</label>
        <select className="field" value={project} onChange={(event) => setProject(event.target.value)}>
          <option value="">Choose a project</option>
          {projects.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        <div className="mt-2 grid grid-cols-[1fr_auto] gap-2">
          <input className="field mt-0" value={newProject} onChange={(event) => setNewProject(event.target.value)} placeholder="Or add a project" />
          <button type="button" className={cn("btn", tap)} onClick={() => void addProjectName()}>Add</button>
        </div>
        <label className="field-label">Review title</label>
        <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Access management flow" />
        <label className="field-label">Figma link</label>
        <input className="field" value={figma} onChange={(event) => setFigma(event.target.value)} placeholder="https://figma.com/design/…" />
        <label className="field-label">Send on</label>
        <p className="text-[13px] text-[#717171]">Pick a day. Dots show days when other reviews are due.</p>
        <MiniMonth
          month={month}
          selected={sendOn}
          dueDates={reviews.filter((review) => review.lifecycle !== "archived").map((review) => review.deadline)}
          onSelect={setSendOn}
          onMonth={setMonth}
        />
        <label className="field-label">Reviewers have</label>
        <select className="field" value={windowDays} onChange={(event) => setWindowDays(Number(event.target.value))}>
          {WINDOWS.map((item) => (
            <option key={item.days} value={item.days}>{item.label}</option>
          ))}
        </select>
        <label className="field-label">Remind reviewers</label>
        <select className="field" value={reminder} onChange={(event) => setReminder(Number(event.target.value))}>
          {REMINDER_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>{item.label}</option>
          ))}
        </select>
        <label className="field-label">Reviewers</label>
        <p className="text-[13px] text-[#717171]">Everyone is included. Remove anyone who shouldn’t be on this review, or type an email to invite someone new.</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-[12px] border border-[#EBEBEB] bg-white px-2 py-2">
          {selected.map((person) => (
            <span key={person.id} className="inline-flex max-w-full items-center gap-1 rounded-full bg-[#F1F3F4] py-0.5 pr-1 pl-1 text-[13px] font-medium text-[#222]">
              <Avatar user={person} size={20} />
              <span className="truncate px-0.5">{person.name}</span>
              <button type="button" className={cn("grid size-5 shrink-0 place-items-center rounded-full text-[#5F6368] hover:bg-[#E0E0E0]", tap)} aria-label={`Remove ${person.name}`} onClick={() => removeReviewer(person.id)}>
                <X className="size-3" />
              </button>
            </span>
          ))}
          <input
            className="min-w-[160px] flex-1 bg-transparent px-2 py-1 text-[14px] outline-none"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                void addFromQuery()
              }
              if (event.key === "Backspace" && !query && selected.length) removeReviewer(selected[selected.length - 1].id)
            }}
            placeholder={selected.length ? "" : "Name or email"}
            aria-label="Add a reviewer"
          />
        </div>
        {suggestions.length ? (
          <ul className="mt-1 overflow-hidden rounded-[12px] border border-[#EBEBEB]">
            {suggestions.map((person) => (
              <li key={person.id}>
                <button type="button" className={cn("flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#F7F7F7]", tap)} onClick={() => addReviewer(person.id)}>
                  <Avatar user={person} size={24} />
                  <span className="min-w-0">
                    <span className="block truncate text-[14px]">{person.name}</span>
                    <span className="block truncate text-[12px] text-[#717171]">{person.email}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <label className="field-label">Note to reviewers (optional)</label>
        <textarea className="field min-h-[76px]" value={note} onChange={(event) => setNote(event.target.value)} />
        <p className="mt-4 text-[13px] text-[#717171]">
          {selected.length} reviewer{selected.length === 1 ? "" : "s"} · due {addDaysISO(sendOn, windowDays)}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className={cn("btn", tap)} onClick={() => router.back()}>Cancel</button>
          <button type="button" className={cn("btn", tap)} onClick={() => submit("draft")}>Save as draft</button>
          <button type="button" className={cn("btn btn-primary", tap)} onClick={() => submit("publish")}>Send to reviewers</button>
        </div>
      </div>
    </div>
  )
}

function MiniMonth({
  month,
  selected,
  dueDates,
  onSelect,
  onMonth,
}: {
  month: Date
  selected: string
  dueDates: string[]
  onSelect: (iso: string) => void
  onMonth: (date: Date) => void
}) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1)
  start.setDate(1 - start.getDay())
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
  const counts = new Map<string, number>()
  for (const due of dueDates) counts.set(due, (counts.get(due) ?? 0) + 1)
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between">
        <b className="text-[14px]">{month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</b>
        <span className="flex gap-1">
          <button type="button" className={cn("btn btn-sm", tap)} aria-label="Previous month" onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
          <button type="button" className={cn("btn btn-sm", tap)} aria-label="Next month" onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
        </span>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((label, index) => (
          <small key={`${label}-${index}`} className="py-1 text-[12px] text-[#717171]">{label}</small>
        ))}
        {days.map((date) => {
          const iso = toISODate(date)
          const outside = date.getMonth() !== month.getMonth()
          const due = counts.get(iso) ?? 0
          return (
            <button
              key={iso}
              type="button"
              onClick={() => onSelect(iso)}
              className={cn(
                "relative h-[38px] rounded-[10px] text-[14px] font-medium",
                tap,
                outside && "opacity-40",
                iso === selected ? "bg-[#FF385C] text-white" : "hover:bg-[#F7F7F7]",
              )}
              title={due ? `${due} review${due === 1 ? "" : "s"} due` : undefined}
            >
              {date.getDate()}
              {due ? <i className={cn("absolute bottom-1 left-1/2 size-[5px] -translate-x-1/2 rounded-full", iso === selected ? "bg-white" : "bg-[#008A5B]")} /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
