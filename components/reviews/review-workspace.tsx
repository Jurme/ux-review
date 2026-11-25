"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, ExternalLink, Link2, Pencil } from "lucide-react"
import { Avatar, PhasePill, SeverityPill, pageWrap } from "@/components/common"
import { assignedReviewers, isManager, phaseOf, visibleFeedback } from "@/lib/domain"
import { windowLabel } from "@/lib/format"
import { SEVERITY_META, tap } from "@/lib/presentation"
import {
  publishReview,
  remindReviewer,
  respondToFeedback,
  saveFeedback,
  setFeedbackStatus,
  setLifecycle,
  useWorkspace,
} from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Feedback, FeedbackStatus, Severity } from "@/lib/types"

const STATUSES: Exclude<FeedbackStatus, "draft">[] = ["open", "acknowledged", "resolved"]

export function ReviewWorkspace({ id }: { id: string }) {
  const router = useRouter()
  const { user, users, reviews, criteria, feedback } = useWorkspace()
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
  const assigned = assignedReviewers(review)
  const reviewedIds = new Set(notes.map((item) => item.authorId))
  const percent = assigned.length === 0 ? 0 : Math.round((assigned.filter((item) => reviewedIds.has(item.userId)).length / assigned.length) * 100)
  const ownsDesign = user.id === review.ownerId
  const links = [review.figmaUrl, ...review.referenceUrls].filter(Boolean)

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

  const reviewedCount = assigned.filter((item) => reviewedIds.has(item.userId)).length

  return (
    <div className={pageWrap("max-w-[1120px]")}>
      <button type="button" className={cn("mb-5 inline-flex items-center gap-1 text-[13px] font-medium text-[#717171]", tap)} onClick={() => router.push("/reviews")}>
        <ArrowLeft className="size-4" /> All reviews
      </button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[34px] font-bold tracking-tight md:text-[40px]">{review.title}</h1>
          <p className="mt-2 text-[14px] text-[#717171]">
            {[review.project, review.feature, owner?.name, windowLabel(review.startDate, review.deadline)].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {manager && review.lifecycle === "draft" ? (
            <button type="button" className={cn(solidBtn, tap)} onClick={() => act(publishReview(review.id))}>Publish</button>
          ) : null}
          {manager && review.lifecycle === "open" ? (
            <button type="button" className={cn(solidBtn, tap)} onClick={() => act(setLifecycle(review.id, "completed"))}>Close review</button>
          ) : null}
          {manager && (review.lifecycle === "completed" || review.lifecycle === "archived") ? (
            <button type="button" className={cn(solidBtn, tap)} onClick={() => act(setLifecycle(review.id, "open"))}>Reopen</button>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <PhasePill phase={phase} />
        {links.map((link, index) => (
          <a key={`${link}-${index}`} href={link} target="_blank" rel="noreferrer" className={cn(linkPill, tap)}>
            {links.length > 1 ? `Open design ${index + 1} in Figma` : "Open in Figma"}
            <ExternalLink className="size-3.5" />
          </a>
        ))}
        <button type="button" className={cn(quietBtn, tap)} onClick={copyLink}><Link2 className="size-3.5" />Copy review link</button>
        {manager && review.lifecycle !== "draft" && review.lifecycle !== "archived" ? (
          <button type="button" className={cn(quietBtn, tap)} onClick={() => act(setLifecycle(review.id, "archived"))}>Archive</button>
        ) : null}
      </div>

      {links.length === 0 ? <p className="mt-4 text-[14px] text-[#717171]">No Figma link yet.</p> : null}
      {review.description ? <p className="mt-5 max-w-[68ch] text-[15px] leading-7 text-[#3C3C3C]">{review.description}</p> : null}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0">
          <h2 className="text-[18px] font-semibold">Feedback</h2>
          <ul className="mt-2">
            {notes.length === 0 ? <li className="py-8 text-[14px] text-[#717171]">No feedback yet.</li> : null}
            {notes.map((item) => (
              <Note
                key={item.id}
                item={item}
                manager={manager}
                canEdit={review.lifecycle === "open" && item.authorId === user.id && !ownsDesign}
                canComment={review.lifecycle === "open" && ownsDesign}
                criteriaName={criteria.find((entry) => entry.id === item.criterionId)?.name ?? "Criterion"}
                author={users.find((person) => person.id === item.authorId)?.name ?? "Someone"}
                criteria={criteria
                  .filter((entry) => entry.active || entry.id === item.criterionId)
                  .sort((a, b) => a.order - b.order)
                  .map((entry) => ({ id: entry.id, name: entry.name }))}
              />
            ))}
          </ul>
          {review.lifecycle === "open" && !ownsDesign ? (
            <PointForm reviewId={review.id} criteria={activeCriteria.map((item) => ({ id: item.id, name: item.name }))} />
          ) : null}
          {review.lifecycle === "open" && ownsDesign ? (
            <p className="mt-4 text-[13px] text-[#717171]">You sent this design. Comment on the feedback instead of reviewing it.</p>
          ) : null}
        </section>

        <aside className="rounded-3xl bg-[#F6F7F8] p-5 lg:sticky lg:top-6">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-[15px] font-semibold">Progress</h2>
            <p className="text-[28px] font-semibold leading-none tracking-tight">{percent}%</p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white" role="meter" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${percent}% complete`}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(0, Math.min(100, percent))}%`,
                background: percent >= 100 ? "#1F9D55" : "linear-gradient(90deg, #F6D365, #F5A524)",
              }}
            />
          </div>
          <p className="mt-2 text-[12px] text-[#717171]">
            {assigned.length === 0 ? "No reviewers are assigned." : `${reviewedCount} of ${assigned.length} reviewed`}
          </p>
          {assigned.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {assigned.map((assignment) => {
                const person = users.find((entry) => entry.id === assignment.userId)
                const count = notes.filter((item) => item.authorId === assignment.userId).length
                const reviewed = count > 0
                return (
                  <li key={assignment.userId} className="flex items-center gap-3">
                    {person ? <Avatar user={person} size={36} /> : null}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{person?.name ?? "Reviewer"}</p>
                      <p className="text-[12px] leading-4 text-[#717171]">{assignment.focus} · {count} item{count === 1 ? "" : "s"}</p>
                      <p className={cn("text-[12px] leading-4", reviewed ? "text-[#1F9D55]" : "text-[#8A8A8A]")}>{reviewed ? "Reviewed" : "Pending review"}</p>
                    </div>
                    {manager && !reviewed ? (
                      <button type="button" className={cn(quietBtn, "h-8 px-3", tap)} onClick={() => act(remindReviewer(review.id, assignment.userId))}>Remind</button>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          ) : null}
        </aside>
      </div>
    </div>
  )
}

const quietBtn = "inline-flex h-9 items-center gap-1.5 rounded-full border border-[#E6E6E6] bg-white px-3.5 text-[13px] font-medium text-[#222]"
const solidBtn = "inline-flex h-9 items-center rounded-full bg-[#111] px-4 text-[13px] font-semibold text-white"
const linkPill = "inline-flex h-7 items-center gap-1 rounded-full border border-[#D5E4FF] bg-[#F3F7FF] px-2.5 text-[12px] font-medium text-[#2F6FED]"

function Note({
  item,
  manager,
  canEdit,
  canComment,
  criteriaName,
  author,
  criteria,
}: {
  item: Feedback
  manager: boolean
  canEdit: boolean
  canComment: boolean
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
    <li className="border-b border-[#EFEFEF] py-6">
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
            <button type="button" className={cn(quietBtn, tap)} onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" className={cn(solidBtn, tap)} onClick={() => void save()}>Save</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[18px] font-semibold leading-6">{item.observation}</p>
              <p className="mt-1 text-[13px] text-[#717171]">{author} · {criteriaName}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1">
          {!editing && manager && item.status !== "draft" ? (
            <select
              className="h-8 rounded-full border border-[#E6E6E6] bg-white pl-3 text-[13px]"
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
          {item.recommendation ? <p className="mt-3 max-w-[68ch] text-[14px] leading-6 text-[#3C3C3C]">{item.recommendation}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SeverityPill severity={item.severity} />
            {item.figmaLink ? (
              <a href={item.figmaLink} target="_blank" rel="noreferrer" className={cn(linkPill, tap)}>Figma comment</a>
            ) : null}
          </div>
          <OwnerComment item={item} canComment={canComment} />
        </>
      )}
    </li>
  )
}

function OwnerComment({ item, canComment }: { item: Feedback; canComment: boolean }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState(item.ownerResponse)

  async function save() {
    const result = await respondToFeedback(item.id, text)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message || "Comment saved.")
    setOpen(false)
  }

  if (!item.ownerResponse && !canComment) return null

  return (
    <div className="mt-4 rounded-2xl bg-[#F6F7F8] px-4 py-3">
      {item.ownerResponse && !open ? (
        <p className="text-[14px] leading-5"><span className="font-medium">Comment. </span>{item.ownerResponse}</p>
      ) : null}
      {canComment && !open ? (
        <button type="button" className={cn("mt-2 text-[13px] font-semibold", tap)} onClick={() => { setText(item.ownerResponse); setOpen(true) }}>
          {item.ownerResponse ? "Edit comment" : "Leave a comment"}
        </button>
      ) : null}
      {open ? (
        <div>
          <label className="field-label mt-0">Comment</label>
          <textarea className="field min-h-[64px]" value={text} onChange={(event) => setText(event.target.value)} />
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" className={cn("btn", tap)} onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className={cn("btn btn-primary", tap)} onClick={() => void save()}>Save comment</button>
          </div>
        </div>
      ) : null}
    </div>
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
      <button type="button" className={cn(solidBtn, "mt-2", tap)} onClick={() => setOpen(true)}>Add feedback</button>
    )
  }

  return (
    <div className="mt-2 rounded-3xl bg-[#F6F7F8] p-5">
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
