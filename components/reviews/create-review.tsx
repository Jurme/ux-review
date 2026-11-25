"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { X } from "lucide-react"
import { toast } from "sonner"
import { Avatar } from "@/components/common"
import { DEFAULT_REMINDER_MINUTES, REMINDER_OPTIONS } from "@/lib/constants"
import { addDaysISO, todayISO } from "@/lib/format"
import { tap } from "@/lib/presentation"
import { saveReview, useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { ReviewDraft } from "@/lib/types"

const WINDOWS = [
  { days: 2, label: "2 days" },
  { days: 3, label: "3 days" },
  { days: 5, label: "5 days" },
  { days: 7, label: "1 week" },
]

export function CreateReview() {
  const fresh = useSearchParams().get("new") ?? "blank"
  return <SendForm key={fresh} />
}

export function SendDesignLink({ className, children }: { className?: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <Link
      href="/reviews/new"
      className={className}
      onClick={(event) => {
        event.preventDefault()
        router.push(`/reviews/new?new=${crypto.randomUUID()}`)
      }}
    >
      {children}
    </Link>
  )
}

function SendForm() {
  const router = useRouter()
  const { user, users, reviews, workspace } = useWorkspace()
  const [title, setTitle] = useState("")
  const [project, setProject] = useState("")
  const [figma, setFigma] = useState("")
  const [note, setNote] = useState("")
  const [windowDays, setWindowDays] = useState(3)
  const [reviewerIds, setReviewerIds] = useState<string[] | null>(null)
  const [query, setQuery] = useState("")
  const [reminder, setReminder] = useState(() => {
    const current = String(workspace?.reminderHours ?? "")
    return REMINDER_OPTIONS.some((item) => item.value === current) ? Number(current) : DEFAULT_REMINDER_MINUTES
  })

  const projects = useMemo(() => {
    const fromReviews = reviews.map((review) => review.project)
    return [...new Set([...(workspace?.projects ?? []), ...fromReviews])].filter(Boolean).sort()
  }, [reviews, workspace?.projects])

  if (!user || !workspace) return null
  const signedIn = users.filter((person) => person.accountStatus === "active" && person.id !== user.id)
  const selectedIds = reviewerIds ?? signedIn.map((person) => person.id)
  const selected = selectedIds.map((id) => signedIn.find((person) => person.id === id)).filter((person) => person !== undefined)
  const suggestions = query.trim()
    ? signedIn.filter((person) => !selectedIds.includes(person.id) && `${person.name} ${person.email}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 6)
    : signedIn.filter((person) => !selectedIds.includes(person.id))

  function removeReviewer(id: string) {
    setReviewerIds((current) => (current ?? signedIn.map((person) => person.id)).filter((item) => item !== id))
  }

  function addReviewer(id: string) {
    setReviewerIds((current) => {
      const base = current ?? signedIn.map((person) => person.id)
      return base.includes(id) ? base : [...base, id]
    })
    setQuery("")
  }

  async function submit() {
    const startDate = todayISO()
    const draft: ReviewDraft = {
      title,
      project,
      feature: "",
      description: note,
      ownerId: user!.id,
      figmaUrl: figma,
      designVersion: "",
      referenceUrls: [],
      startDate,
      deadline: addDaysISO(startDate, windowDays),
      startTime: "",
      endTime: "",
      timezone: workspace!.timezone,
      reminderHours: reminder,
      shareFeedback: true,
      criteriaIds: [],
      reviewers: selectedIds.map((userId) => ({ userId, focus: "General" })),
    }
    const result = await saveReview(draft, "publish")
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    setTitle("")
    setProject("")
    setFigma("")
    setNote("")
    setQuery("")
    setReviewerIds(null)
    if (result.id) router.push(`/reviews/${result.id}`)
    else router.push("/reviews")
  }

  return (
    <div className="mx-auto w-full max-w-[720px] px-6 py-8 md:px-0 md:py-2">
      <h1 className="text-[28px] font-bold tracking-tight">Send a design for review</h1>
      <p className="mt-1 text-[14px] text-[#717171]">
        The review is stamped with the date and time you send it. Reviewers then have the window you choose.
      </p>
      <form className="mt-6 rounded-[20px] border border-[#EBEBEB] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]" autoComplete="off" onSubmit={(event) => event.preventDefault()}>
        <label className="mt-1 block text-[13px] font-semibold">Project</label>
        <select className="field" name="ux-review-project" autoComplete="off" value={project} onChange={(event) => setProject(event.target.value)}>
          <option value="">Choose a project</option>
          {projects.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
        {projects.length === 0 ? (
          <p className="mt-2 text-[13px] text-[#717171]">
            Add a project in <Link href="/settings?tab=projects" className="font-medium text-[#222] underline">Settings</Link> before sending.
          </p>
        ) : null}
        <label className="field-label">Review title</label>
        <input className="field" name="ux-review-title" autoComplete="off" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Access management flow" />
        <label className="field-label">Figma link</label>
        <input className="field" name="ux-review-figma" autoComplete="off" value={figma} onChange={(event) => setFigma(event.target.value)} placeholder="https://figma.com/design/…" />
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
        <p className="text-[13px] text-[#717171]">Everyone who has signed in is included. Remove anyone who should sit this one out, then add them back from the field.</p>
        {signedIn.length === 0 ? (
          <p className="mt-3 text-[13px] text-[#717171]">No one else has signed in yet.</p>
        ) : (
          <>
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
                  if (event.key === "Enter" && suggestions[0]) {
                    event.preventDefault()
                    addReviewer(suggestions[0].id)
                  }
                  if (event.key === "Backspace" && !query && selected.length) removeReviewer(selected[selected.length - 1].id)
                }}
                placeholder={selected.length ? "" : "Add a reviewer"}
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
          </>
        )}
        <label className="field-label">Note to reviewers (optional)</label>
        <textarea className="field min-h-[76px]" name="ux-review-note" autoComplete="off" value={note} onChange={(event) => setNote(event.target.value)} />
        <p className="mt-4 text-[13px] text-[#717171]">
          {selected.length} reviewer{selected.length === 1 ? "" : "s"} · due {addDaysISO(todayISO(), windowDays)} if you send it now
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className={cn("btn", tap)} onClick={() => router.back()}>Cancel</button>
          <button type="button" className={cn("btn btn-primary", tap)} onClick={() => submit()}>Send to reviewers</button>
        </div>
      </form>
    </div>
  )
}
