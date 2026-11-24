"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
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
  return <SendForm />
}

function SendForm() {
  const router = useRouter()
  const { user, users, reviews, workspace } = useWorkspace()
  const [title, setTitle] = useState("")
  const [project, setProject] = useState("")
  const [figma, setFigma] = useState("")
  const [note, setNote] = useState("")
  const [windowDays, setWindowDays] = useState(3)
  const [reviewerIds, setReviewerIds] = useState<string[]>([])
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

  function toggleReviewer(id: string) {
    setReviewerIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  async function submit(mode: "draft" | "publish") {
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
    <div className="mx-auto w-full max-w-[720px] px-6 py-8 md:px-0 md:py-2">
      <h1 className="text-[28px] font-bold tracking-tight">Send a design for review</h1>
      <p className="mt-1 text-[14px] text-[#717171]">
        The review is stamped with the date and time you send it. Reviewers then have the window you choose.
      </p>
      <div className="mt-6 rounded-[20px] border border-[#EBEBEB] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <label className="mt-1 block text-[13px] font-semibold">Project</label>
        <select className="field" value={project} onChange={(event) => setProject(event.target.value)}>
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
        <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Access management flow" />
        <label className="field-label">Figma link</label>
        <input className="field" value={figma} onChange={(event) => setFigma(event.target.value)} placeholder="https://figma.com/design/…" />
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
        <p className="text-[13px] text-[#717171]">People who have signed in. Add the ones who should review this design.</p>
        {signedIn.length === 0 ? (
          <p className="mt-3 text-[13px] text-[#717171]">No one else has signed in yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto rounded-[12px] border border-[#EBEBEB]">
            <table className="w-full min-w-[420px] text-left text-[14px]">
              <thead className="bg-[#F7F7F7] text-[12px] text-[#717171]">
                <tr>
                  <th className="px-3 py-2 font-medium">Add</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                </tr>
              </thead>
              <tbody>
                {signedIn.map((person) => {
                  const added = reviewerIds.includes(person.id)
                  return (
                    <tr key={person.id} className="border-t border-[#EBEBEB]">
                      <td className="px-3 py-2">
                        <button type="button" className={cn("btn btn-sm", added && "btn-primary", tap)} onClick={() => toggleReviewer(person.id)}>
                          {added ? "Added" : "Add"}
                        </button>
                      </td>
                      <td className="px-3 py-2 font-medium">{person.name}</td>
                      <td className="px-3 py-2 text-[#717171]">{person.email}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <label className="field-label">Note to reviewers (optional)</label>
        <textarea className="field min-h-[76px]" value={note} onChange={(event) => setNote(event.target.value)} />
        <p className="mt-4 text-[13px] text-[#717171]">
          {reviewerIds.length} reviewer{reviewerIds.length === 1 ? "" : "s"} · due {addDaysISO(todayISO(), windowDays)} if you send it now
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
