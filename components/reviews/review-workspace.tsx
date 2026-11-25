"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, ExternalLink, Link2, Pencil } from "lucide-react"
import { Avatar, PhasePill, ProgressBar, SeverityPill, pageWrap } from "@/components/common"
import { completionOf, isManager, phaseOf, visibleFeedback } from "@/lib/domain"
import { windowLabel } from "@/lib/format"
import { PHASE_META, SEVERITY_META, tap } from "@/lib/presentation"
import {
  publishReview,
  remindReviewer,
  saveFeedback,
  setFeedbackStatus,
  setLifecycle,
  setReviewerStatus,
  useWorkspace,
} from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Feedback, FeedbackStatus, Severity } from "@/lib/types"

const STATUSES: Exclude<FeedbackStatus, "draft">[] = ["open", "acknowledged", "resolved"]

export function ReviewWorkspace({ id }: { id: string }) {
  const router = useRouter()
  const { user, users, reviews, criteria, feedback } = useWorkspace()
  const [linkIndex, setLinkIndex] = useState(0)
  const review = reviews.find((item) => item.id === id)
  if (!user || !review) {
    return (
      <div className={pageWrap()}>
        <p className="text-[15px]">That review is no longer here.</p>
        <Link href="/reviews" className="mt-3 inline-block text-[14px] font-semibold underline">Back to reviews</Link>
      </div>
    )
  }
  const phase = phaseOf(review)
  const owner = users.find((person) => person.id === review.ownerId)
  const manager = isManager(user, review)
  const notes = visibleFeedback(review, user, feedback).filter((item) => item.status !== "draft")
  const activeCriteria = criteria.filter((item) => item.active).sort((a, b) => a.order - b.order)
  const percent = completionOf(review)
  const links = [review.figmaUrl, ...review.referenceUrls].filter(Boolean)
  const activeLink = links[Math.min(linkIndex, Math.max(links.length - 1, 0))] ?? ""
  const embed = activeLink ? `https://www.figma.com/embed?embed_host=ux-review&url=${encodeURIComponent(activeLink)}` : ""

  async function act(result: Promise<{ ok: boolean; message?: string }>) {
    const settled = await result
    if (settled.ok) toast.success(settled.message || "Saved.")
    else toast.error(settled.message)
    return settled
  }

  async function copyLink() {
    const url = `${window.location.origin}/reviews/${review!.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Review link copied.")
    } catch {
      toast.error("Could not copy the link.")
    }
  }

  return (
    <div className={pageWrap("max-w-[920px]")}>
      <button type="button" className={cn("mb-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[#717171]", tap)} onClick={() => router.push("/reviews")}>
        <ArrowLeft className="size-4" /> All reviews
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">{review.title}</h1>
          <p className="mt-1 text-[14px] text-[#717171]">
            {[review.project, review.feature, owner?.name, windowLabel(review.startDate, review.deadline)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PhasePill phase={phase} />
          <button type="button" className={cn("btn btn-sm", tap)} onClick={copyLink}><Link2 className="mr-1 inline size-3.5" />Copy review link</button>
          {manager && review.lifecycle === "draft" ? (
            <button type="button" className={cn("btn btn-sm btn-primary", tap)} onClick={() => act(publishReview(review.id))}>Publish</button>
          ) : null}
          {manager && review.lifecycle === "open" ? (
            <button type="button" className={cn("btn btn-sm", tap)} onClick={() => act(setLifecycle(review.id, "completed"))}>Close review</button>
          ) : null}
          {manager && (review.lifecycle === "completed" || review.lifecycle === "archived") ? (
            <button type="button" className={cn("btn btn-sm btn-primary", tap)} onClick={() => act(setLifecycle(review.id, "open"))}>Reopen</button>
          ) : null}
          {manager && review.lifecycle !== "draft" && review.lifecycle !== "archived" ? (
            <button type="button" className={cn("btn btn-sm", tap)} onClick={() => act(setLifecycle(review.id, "archived"))}>Archive</button>
          ) : null}
        </div>
      </div>

      <section className="mt-6 overflow-hidden rounded-[16px] border border-[var(--border)]">
        {links.length > 1 ? (
          <div className="flex gap-2 overflow-x-auto border-b border-[var(--border)] px-3 py-2">
            {links.map((link, index) => (
              <button
                key={`${link}-${index}`}
                type="button"
                className={cn("h-8 shrink-0 rounded-full px-3 text-[13px] font-medium", tap, index === Math.min(linkIndex, links.length - 1) ? "bg-[#222] text-white" : "bg-[#F7F7F7] text-[#222]")}
                onClick={() => setLinkIndex(index)}
              >
                Design {index + 1}
              </button>
            ))}
          </div>
        ) : null}
        {embed ? (
          <iframe title="Figma design" src={embed} className="h-[420px] w-full bg-[#F7F7F7]" />
        ) : (
          <div className="grid h-[180px] place-items-center text-[14px] text-[#717171]">No Figma link yet.</div>
        )}
        {activeLink ? (
          <div className="flex justify-end border-t border-[var(--border)] px-4 py-2">
            <a href={activeLink} target="_blank" rel="noreferrer" className={cn("inline-flex items-center gap-1 text-[13px] font-semibold", tap)}>
              Open in Figma <ExternalLink className="size-3.5" />
            </a>
          </div>
        ) : null}
      </section>

      {review.description ? <p className="mt-5 text-[15px] leading-6">{review.description}</p> : null}

      <section className="mt-8">
        <h2 className="text-[18px] font-semibold">Feedback</h2>
        <ul className="mt-3 space-y-3">
          {notes.length === 0 ? <li className="text-[14px] text-[#717171]">No feedback yet.</li> : null}
          {notes.map((item) => (
            <Note
              key={item.id}
              item={item}
              manager={manager}
              canEdit={review.lifecycle === "open" && item.authorId === user.id}
              criteriaName={criteria.find((entry) => entry.id === item.criterionId)?.name ?? "Criterion"}
              author={users.find((person) => person.id === item.authorId)?.name ?? "Someone"}
              criteria={criteria
                .filter((entry) => entry.active || entry.id === item.criterionId)
                .sort((a, b) => a.order - b.order)
                .map((entry) => ({ id: entry.id, name: entry.name }))}
            />
          ))}
        </ul>
        {review.lifecycle === "open" ? (
          <PointForm reviewId={review.id} criteria={activeCriteria.map((item) => ({ id: item.id, name: item.name }))} />
        ) : null}
      </section>

      <section className="mt-8">
        <div className="flex items-end justify-between">
          <h2 className="text-[18px] font-semibold">Progress</h2>
          <span className="text-[14px] font-semibold">{percent}%</span>
        </div>
        <div className="mt-2"><ProgressBar value={percent} /></div>
        {review.reviewers.length === 0 ? (
          <p className="mt-3 text-[14px] text-[#717171]">Anyone with the link can review.</p>
        ) : (
          <ul className="mt-4 divide-y divide-[var(--border)]">
            {review.reviewers.map((assignment) => {
              const person = users.find((entry) => entry.id === assignment.userId)
              const count = notes.filter((item) => item.authorId === assignment.userId).length
              return (
                <li key={assignment.userId} className="flex flex-wrap items-center gap-3 py-3">
                  {person ? <Avatar user={person} size={32} /> : null}
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium">{person?.name ?? "Reviewer"}</p>
                    <p className="text-[12px] text-[#717171]">{assignment.focus} · {count} item{count === 1 ? "" : "s"}</p>
                  </div>
                  <span className={cn("chip", PHASE_META[assignment.status === "completed" ? "completed" : assignment.status === "in_progress" ? "in_progress" : "draft"].chip)}>
                    {assignment.status === "completed" ? "Done" : assignment.status === "in_progress" ? "In progress" : "Pending"}
                  </span>
                  {manager && assignment.status !== "completed" ? (
                    <button type="button" className={cn("btn btn-sm", tap)} onClick={() => act(remindReviewer(review.id, assignment.userId))}>Remind</button>
                  ) : null}
                  {(manager || user.id === assignment.userId) && review.lifecycle === "open" ? (
                    <button
                      type="button"
                      className={cn("btn btn-sm", tap)}
                      onClick={() => act(setReviewerStatus(review.id, assignment.userId, assignment.status === "completed" ? "in_progress" : "completed"))}
                    >
                      {assignment.status === "completed" ? "Mark in progress" : "Mark done"}
                    </button>
                  ) : null}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function Note({
  item,
  manager,
  canEdit,
  criteriaName,
  author,
  criteria,
}: {
  item: Feedback
  manager: boolean
  canEdit: boolean
  criteriaName: string
  author: string
  criteria: { id: string; name: string }[]
}) {
  const [editing, setEditing] = useState(false)
  const [criterionId, setCriterionId] = useState(item.criterionId)
  const [observation, setObservation] = useState(item.observation)
  const [recommendation, setRecommendation] = useState(item.recommendation)
  const [severity, setSeverity] = useState<Severity>(item.severity)
  const [figmaLink, setFigmaLink] = useState(item.figmaLink)

  function startEdit() {
    setCriterionId(item.criterionId)
    setObservation(item.observation)
    setRecommendation(item.recommendation)
    setSeverity(item.severity)
    setFigmaLink(item.figmaLink)
    setEditing(true)
  }

  async function save() {
    const result = await saveFeedback(
      {
        id: item.id,
        reviewId: item.reviewId,
        criterionId,
        observation,
        feedback: item.feedback,
        recommendation,
        severity,
        figmaLink,
      },
      "submit",
    )
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message || "Feedback updated.")
    setEditing(false)
  }

  return (
    <li className="rounded-2xl border border-[#EBEBEB] px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-[14px] font-medium">{author}</span>
        {editing ? null : <span className="text-[13px] text-[#717171]">{criteriaName}</span>}
        {editing ? null : <SeverityPill severity={item.severity} />}
        <span className="ml-auto flex shrink-0 items-center gap-1">
          {!editing && manager && item.status !== "draft" ? (
            <select
              className="h-8 rounded-lg border border-[#EBEBEB] bg-white px-2 text-[13px]"
              aria-label="Feedback status"
              value={item.status}
              onChange={(event) => {
                void setFeedbackStatus(item.id, event.target.value as Exclude<FeedbackStatus, "draft">).then((result) => {
                  if (!result.ok) toast.error(result.message)
                })
              }}
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>{status[0].toUpperCase() + status.slice(1)}</option>
              ))}
            </select>
          ) : null}
          {!editing && !manager ? <span className="text-[12px] capitalize text-[#717171]">{item.status}</span> : null}
          {canEdit && !editing ? (
            <button type="button" className={cn("grid size-8 place-items-center rounded-full text-[#222] hover:bg-[#F7F7F7]", tap)} aria-label="Edit feedback" onClick={startEdit}>
              <Pencil className="size-4" />
            </button>
          ) : null}
        </span>
      </div>
      {editing ? (
        <div>
          <p className="field-label mt-0">Criterion</p>
          <div className="flex flex-wrap gap-2">
            {criteria.map((entry) => (
              <button key={entry.id} type="button" className={cn("chip", criterionId === entry.id && "chip-on", tap)} onClick={() => setCriterionId(entry.id)}>
                {entry.name}
              </button>
            ))}
          </div>
          <label className="field-label">What you noticed</label>
          <textarea className="field min-h-[72px]" value={observation} onChange={(event) => setObservation(event.target.value)} />
          <label className="field-label">Recommendation</label>
          <textarea className="field min-h-[64px]" value={recommendation} onChange={(event) => setRecommendation(event.target.value)} />
          <label className="field-label">Severity</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {(Object.keys(SEVERITY_META) as Severity[]).map((level) => (
              <button key={level} type="button" className={cn("chip", severity === level && "chip-on", tap)} onClick={() => setSeverity(level)}>
                {SEVERITY_META[level].label}
              </button>
            ))}
          </div>
          <label className="field-label">Figma comment link (optional)</label>
          <input className="field" value={figmaLink} onChange={(event) => setFigmaLink(event.target.value)} placeholder="https://" />
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" className={cn("btn", tap)} onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" className={cn("btn btn-primary", tap)} onClick={() => void save()}>Save</button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-2 text-[14px] leading-5">{item.observation}</p>
          {item.recommendation ? <p className="mt-1 text-[13px] leading-5 text-[#717171]">{item.recommendation}</p> : null}
          {item.figmaLink ? (
            <a href={item.figmaLink} target="_blank" rel="noreferrer" className="mt-1 inline-block text-[13px] font-medium underline">Figma comment</a>
          ) : null}
        </>
      )}
    </li>
  )
}

function PointForm({ reviewId, criteria }: { reviewId: string; criteria: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false)
  const [ids, setIds] = useState<string[]>(criteria[0] ? [criteria[0].id] : [])
  const [observation, setObservation] = useState("")
  const [recommendation, setRecommendation] = useState("")
  const [severity, setSeverity] = useState<Severity>("major")
  const [figmaLink, setFigmaLink] = useState("")

  async function submit() {
    const chosen = ids.length ? ids : criteria[0] ? [criteria[0].id] : []
    if (!chosen.length) {
      toast.error("Add a criterion in Settings before leaving feedback.")
      return
    }
    let last: { ok: boolean; message?: string } = { ok: true, message: "Feedback submitted." }
    for (const criterionId of chosen) {
      last = await saveFeedback(
        {
          reviewId,
          criterionId,
          observation,
          feedback: "",
          recommendation,
          severity,
          figmaLink,
        },
        "submit",
      )
      if (!last.ok) {
        toast.error(last.message)
        return
      }
    }
    toast.success(chosen.length > 1 ? "Feedback points submitted." : last.message || "Feedback submitted.")
    setObservation("")
    setRecommendation("")
    setFigmaLink("")
    setOpen(false)
  }

  if (!open) {
    return (
      <button type="button" className={cn("btn mt-4", tap)} onClick={() => setOpen(true)}>Add feedback</button>
    )
  }

  return (
    <div className="mt-4 rounded-[14px] border border-[var(--border)] p-4">
      <p className="text-[13px] font-semibold">Which criterion is this about?</p>
      {criteria.length === 0 ? <p className="mt-2 text-[13px] text-[#717171]">No active criteria yet. Add them in Settings.</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        {criteria.map((item) => {
          const on = ids.includes(item.id)
          return (
            <button
              key={item.id}
              type="button"
              className={cn("chip", on && "chip-on", tap)}
              onClick={() => setIds((current) => (current.includes(item.id) ? current.filter((id) => id !== item.id) : [...current, item.id]))}
            >
              {item.name}
            </button>
          )
        })}
      </div>
      <label className="field-label">What you noticed</label>
      <textarea className="field min-h-[72px]" value={observation} onChange={(event) => setObservation(event.target.value)} />
      <label className="field-label">Recommendation</label>
      <textarea className="field min-h-[64px]" value={recommendation} onChange={(event) => setRecommendation(event.target.value)} />
      <label className="field-label">Severity</label>
      <div className="mt-1 flex flex-wrap gap-2">
        {(Object.keys(SEVERITY_META) as Severity[]).map((level) => (
          <button key={level} type="button" className={cn("chip", severity === level && "chip-on", tap)} onClick={() => setSeverity(level)}>
            {SEVERITY_META[level].label}
          </button>
        ))}
      </div>
      <label className="field-label">Figma comment link (optional)</label>
      <input className="field" value={figmaLink} onChange={(event) => setFigmaLink(event.target.value)} placeholder="https://" />
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" className={cn("btn", tap)} onClick={() => setOpen(false)}>Cancel</button>
        <button type="button" className={cn("btn btn-primary", tap)} onClick={submit}>Submit point</button>
      </div>
    </div>
  )
}
