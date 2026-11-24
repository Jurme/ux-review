"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ExternalLink, Pencil } from "lucide-react"
import { toast } from "sonner"
import {
  Avatar,
  EmptyState,
  Field,
  NativeSelect,
  PhasePill,
  ProgressBar,
  ReviewerPill,
  Ring,
  SeverityPill,
  pageWrap,
} from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { SEVERITIES, timezoneLabel } from "@/lib/constants"
import {
  assignmentFor,
  completionOf,
  isManager,
  phaseOf,
  readyToClose,
  reminderDue,
  submittedCount,
  visibleFeedback,
} from "@/lib/domain"
import { formatFull, safeHttpUrl, timeAgo, windowLabel } from "@/lib/format"
import { SEVERITY_META, tap } from "@/lib/presentation"
import {
  deleteFeedback,
  publishReview,
  remindReviewer,
  respondToFeedback,
  rescheduleReview,
  saveFeedback,
  setFeedbackStatus,
  setLifecycle,
  setReviewerStatus,
  useWorkspace,
} from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Feedback, FeedbackDraft, Severity } from "@/lib/types"

const emptyNote = (reviewId: string, criterionId: string): FeedbackDraft => ({
  reviewId,
  criterionId,
  observation: "",
  feedback: "",
  recommendation: "",
  severity: "major",
  figmaLink: "",
})

export function ReviewWorkspace({ id }: { id: string }) {
  const { user, users, reviews, criteria, feedback, ready } = useWorkspace()
  const review = reviews.find((item) => item.id === id)
  const people = useMemo(() => new Map(users.map((person) => [person.id, person])), [users])
  const [composer, setComposer] = useState<FeedbackDraft | null>(null)
  const [confirmClose, setConfirmClose] = useState(false)
  const [replyFor, setReplyFor] = useState<string | null>(null)
  const [reply, setReply] = useState("")
  const [severity, setSeverity] = useState<Severity | "all">("all")
  const [author, setAuthor] = useState("all")

  if (!ready || !user) return null
  if (!review) {
    return (
      <div className={pageWrap()}>
        <h1 className="text-[28px] font-semibold tracking-tight">Review not found</h1>
        <p className="mt-2 text-[#717171]">It isn’t in this workspace.</p>
        <Link href="/reviews" className="mt-4 inline-block font-medium underline">All reviews</Link>
      </div>
    )
  }

  const owner = people.get(review.ownerId)
  const manage = isManager(user, review)
  const mine = assignmentFor(review, user.id)
  const phase = phaseOf(review)
  const notes = visibleFeedback(review, user, feedback).filter((item) => {
    if (severity !== "all" && item.severity !== severity) return false
    if (author !== "all" && item.authorId !== author) return false
    return true
  })
  const criteriaUsed = criteria
    .filter((item) => review.criteriaIds.includes(item.id))
    .sort((a, b) => a.order - b.order)
  const figma = safeHttpUrl(review.figmaUrl)
  const pending = review.reviewers.filter((item) => item.status !== "completed")
  const canWrite = review.lifecycle === "open" && !!mine

  function act(result: { ok: boolean; message?: string }) {
    if (!result.message) return
    if (result.ok) toast.success(result.message)
    else toast.error(result.message)
  }

  return (
    <div className={pageWrap()}>
      <Link href="/reviews" className="text-[13px] font-medium text-[#717171] hover:text-[#222]">All reviews</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          <p className="text-[13px] text-[#717171]">{review.project}{review.feature ? ` · ${review.feature}` : ""}</p>
          <h1 className="mt-1 text-[30px] font-semibold tracking-tight">{review.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <PhasePill phase={phase} />
            {review.designVersion ? <span className="text-[13px] text-[#717171]">{review.designVersion}</span> : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {figma ? (
            <a href={figma} target="_blank" rel="noreferrer" className={cn("inline-flex h-10 items-center gap-2 rounded-xl border border-[#EBEBEB] px-3 text-[14px] font-medium hover:bg-[#F7F7F7]", tap)}>
              <ExternalLink className="size-4" />
              Open in Figma
            </a>
          ) : null}
          {canWrite ? (
            <Button onClick={() => setComposer(emptyNote(review.id, criteriaUsed[0]?.id ?? ""))}>Give feedback</Button>
          ) : null}
          {manage && review.lifecycle !== "archived" ? (
            <Link href={`/reviews/${review.id}/edit`} className={cn("inline-flex h-10 items-center gap-2 rounded-xl border border-[#EBEBEB] px-3 text-[14px] font-medium hover:bg-[#F7F7F7]", tap)}>
              <Pencil className="size-4" />
              Edit
            </Link>
          ) : null}
        </div>
      </div>

      {review.lifecycle === "draft" ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#F7F7F7] px-4 py-4">
          <p className="text-[14px]">This is a draft. Reviewers cannot see it until you publish.</p>
          <Button onClick={() => act(publishReview(review.id))}>Publish review</Button>
        </div>
      ) : null}
      {readyToClose(review) ? (
        <div className="mt-6 rounded-2xl bg-[#F1F8F5] px-4 py-4 text-[14px] text-[#046B48]">
          Every reviewer has finished. Close the review when you have responded to the notes you care about.
        </div>
      ) : null}
      {reminderDue(review) ? (
        <p className="mt-4 text-[14px] text-[#8A5A12]">
          Inside the reminder window. {pending.length} reviewer{pending.length === 1 ? "" : "s"} still to finish.
        </p>
      ) : null}

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <section>
            <h2 className="text-[18px] font-semibold">About this review</h2>
            <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-[#222]">{review.description || "No description yet."}</p>
            <dl className="mt-4 grid gap-3 text-[14px] sm:grid-cols-2">
              <div>
                <dt className="text-[12px] text-[#717171]">Window</dt>
                <dd>{windowLabel(review.startDate, review.deadline, review.startTime, review.endTime)} · {timezoneLabel(review.timezone)}</dd>
              </div>
              <div>
                <dt className="text-[12px] text-[#717171]">Owner</dt>
                <dd>{owner?.name}</dd>
              </div>
            </dl>
            {review.referenceUrls.length > 0 ? (
              <ul className="mt-4 space-y-1 text-[14px]">
                {review.referenceUrls.map((url) => {
                  const safe = safeHttpUrl(url)
                  return safe ? (
                    <li key={url}><a className="text-[#222] underline-offset-4 hover:underline" href={safe} target="_blank" rel="noreferrer">{safe.replace(/^https?:\/\//, "")}</a></li>
                  ) : null
                })}
              </ul>
            ) : null}
          </section>

          <section>
            <h2 className="text-[18px] font-semibold">Criteria</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {criteriaUsed.map((item) => (
                <li key={item.id} className="rounded-full bg-[#F7F7F7] px-3 py-1 text-[13px]">
                  {item.name}
                  <span className="text-[#717171]"> · {item.category}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-[18px] font-semibold">Feedback</h2>
                <p className="mt-1 text-[13px] text-[#717171]">Structured notes live here. Pin comments stay in Figma.</p>
              </div>
              <div className="flex gap-2">
                <select className="h-10 rounded-xl border border-[#EBEBEB] bg-white px-2 text-[13px]" value={severity} onChange={(event) => setSeverity(event.target.value as Severity | "all")} aria-label="Filter by severity">
                  <option value="all">All severities</option>
                  {SEVERITIES.map((item) => <option key={item} value={item}>{SEVERITY_META[item].label}</option>)}
                </select>
                <select className="h-10 rounded-xl border border-[#EBEBEB] bg-white px-2 text-[13px]" value={author} onChange={(event) => setAuthor(event.target.value)} aria-label="Filter by reviewer">
                  <option value="all">Everyone</option>
                  {review.reviewers.map((item) => (
                    <option key={item.userId} value={item.userId}>{people.get(item.userId)?.name}</option>
                  ))}
                </select>
              </div>
            </div>
            {notes.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No feedback yet"
                  body="Reviewers leave an observation, why it matters, and what to change — against a criterion, with a link back to the Figma frame."
                  action={canWrite ? <Button onClick={() => setComposer(emptyNote(review.id, criteriaUsed[0]?.id ?? ""))}>Give feedback</Button> : undefined}
                />
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {notes.map((item) => (
                  <FeedbackCard
                    key={item.id}
                    item={item}
                    authorName={people.get(item.authorId)?.name ?? "Reviewer"}
                    criterion={criteria.find((entry) => entry.id === item.criterionId)?.name ?? "Criterion"}
                    manage={manage}
                    mine={item.authorId === user.id && review.lifecycle === "open"}
                    replying={replyFor === item.id}
                    reply={reply}
                    onReplyChange={setReply}
                    onStartReply={() => { setReplyFor(item.id); setReply(item.ownerResponse) }}
                    onCancelReply={() => setReplyFor(null)}
                    onSendReply={() => {
                      act(respondToFeedback(item.id, reply))
                      setReplyFor(null)
                    }}
                    onEdit={() => setComposer({
                      id: item.id,
                      reviewId: item.reviewId,
                      criterionId: item.criterionId,
                      observation: item.observation,
                      feedback: item.feedback,
                      recommendation: item.recommendation,
                      severity: item.severity,
                      figmaLink: item.figmaLink,
                    })}
                    onDelete={() => act(deleteFeedback(item.id))}
                    onStatus={(status) => act(setFeedbackStatus(item.id, status))}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-8">
          <section className="rounded-2xl border border-[#EBEBEB] p-5">
            <div className="flex items-center gap-4">
              <Ring value={completionOf(review)} />
              <div>
                <p className="text-[15px] font-medium">{review.reviewers.filter((item) => item.status === "completed").length} of {review.reviewers.length} finished</p>
                <p className="mt-1 text-[13px] leading-5 text-[#717171]">Completion is finished reviewers divided by everyone assigned.</p>
              </div>
            </div>
            <div className="mt-4"><ProgressBar value={completionOf(review)} /></div>
          </section>

          {mine && review.lifecycle === "open" ? (
            <section className="rounded-2xl bg-[#F7F7F7] p-5">
              <p className="text-[13px] text-[#717171]">Your review · {mine.focus || "No focus set"}</p>
              <div className="mt-2"><ReviewerPill status={mine.status} /></div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => setComposer(emptyNote(review.id, criteriaUsed[0]?.id ?? ""))}>Add a note</Button>
                {mine.status === "completed" ? (
                  <Button variant="outline" onClick={() => act(setReviewerStatus(review.id, user.id, "in_progress"))}>Reopen mine</Button>
                ) : (
                  <Button variant="outline" onClick={() => act(setReviewerStatus(review.id, user.id, "completed"))}>I’m done</Button>
                )}
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-[#EBEBEB] p-5">
            <h2 className="text-[16px] font-semibold">Reviewers</h2>
            <ul className="mt-3 divide-y divide-[#EBEBEB]">
              {review.reviewers.map((item) => {
                const person = people.get(item.userId)
                if (!person) return null
                const noteCount = submittedCount(feedback, review.id, item.userId)
                return (
                  <li key={item.userId} className="py-3">
                    <span className="flex items-start gap-3">
                      <Avatar user={person} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium">{person.name}</span>
                        <span className="mt-0.5 block text-[12px] leading-5 text-[#717171]">
                          {item.focus || "No focus"} · {noteCount} {noteCount === 1 ? "note" : "notes"}
                        </span>
                        <span className="mt-2 flex items-center gap-3">
                          <ReviewerPill status={item.status} />
                          {manage && review.lifecycle === "open" && item.status !== "completed" ? (
                            <button type="button" className={cn("text-[12px] font-medium", tap)} onClick={() => act(remindReviewer(review.id, item.userId))}>
                              Remind
                            </button>
                          ) : null}
                        </span>
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>

          {manage && (review.lifecycle === "draft" || review.lifecycle === "open") ? (
            <section className="rounded-2xl border border-[#EBEBEB] p-5">
              <h2 className="text-[16px] font-semibold">Reschedule</h2>
              <p className="mt-1 text-[13px] text-[#717171]">Moving the start date keeps the same length of window.</p>
              <label className="mt-3 block text-[13px] font-medium">
                Start date
                <Input
                  className="mt-1.5"
                  type="date"
                  value={review.startDate}
                  onChange={(event) => {
                    if (event.target.value) act(rescheduleReview(review.id, event.target.value))
                  }}
                />
              </label>
            </section>
          ) : null}

          {manage ? (
            <section className="space-y-2">
              {review.lifecycle === "open" ? (
                confirmClose && pending.length > 0 ? (
                  <div className="rounded-2xl bg-[#F7F7F7] p-4 text-[14px]">
                    <p>{pending.length} reviewer{pending.length === 1 ? " is" : "s are"} still unfinished.</p>
                    <div className="mt-3 flex gap-2">
                      <Button onClick={() => { act(setLifecycle(review.id, "completed")); setConfirmClose(false) }}>Close anyway</Button>
                      <Button variant="ghost" onClick={() => setConfirmClose(false)}>Keep open</Button>
                    </div>
                  </div>
                ) : (
                  <Button className="w-full" onClick={() => (pending.length ? setConfirmClose(true) : act(setLifecycle(review.id, "completed")))}>
                    Close review
                  </Button>
                )
              ) : null}
              {review.lifecycle === "completed" || review.lifecycle === "archived" ? (
                <Button className="w-full" variant="outline" onClick={() => act(setLifecycle(review.id, "open"))}>Reopen review</Button>
              ) : null}
              {review.lifecycle === "open" || review.lifecycle === "completed" ? (
                <Button className="w-full" variant="ghost" onClick={() => act(setLifecycle(review.id, "archived"))}>Archive</Button>
              ) : null}
            </section>
          ) : null}
        </aside>
      </div>

      <Sheet open={composer !== null} onOpenChange={(open) => { if (!open) setComposer(null) }}>
        <SheetContent className="w-full overflow-y-auto">
          {composer ? (
            <FeedbackForm
              draft={composer}
              criteria={criteriaUsed.map((item) => ({ id: item.id, name: item.name }))}
              onChange={setComposer}
              onClose={() => setComposer(null)}
            />
          ) : (
            <SheetHeader>
              <SheetTitle>Feedback</SheetTitle>
              <SheetDescription>Add a note against one criterion.</SheetDescription>
            </SheetHeader>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function FeedbackCard({
  item,
  authorName,
  criterion,
  manage,
  mine,
  replying,
  reply,
  onReplyChange,
  onStartReply,
  onCancelReply,
  onSendReply,
  onEdit,
  onDelete,
  onStatus,
}: {
  item: Feedback
  authorName: string
  criterion: string
  manage: boolean
  mine: boolean
  replying: boolean
  reply: string
  onReplyChange: (value: string) => void
  onStartReply: () => void
  onCancelReply: () => void
  onSendReply: () => void
  onEdit: () => void
  onDelete: () => void
  onStatus: (status: "open" | "acknowledged" | "resolved") => void
}) {
  const link = item.figmaLink ? safeHttpUrl(item.figmaLink) : null
  return (
    <li className="rounded-2xl border border-[#EBEBEB] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13px] font-medium">{criterion}</span>
        <SeverityPill severity={item.severity} />
        <span className="text-[12px] text-[#717171]">{item.status === "draft" ? "Draft" : item.status}</span>
        <span className="ml-auto text-[12px] text-[#717171]">{authorName} · {timeAgo(item.updatedAt)}</span>
      </div>
      <p className="mt-3 text-[12px] font-medium tracking-wide text-[#717171] uppercase">Observation</p>
      <p className="mt-1 text-[15px] leading-6">{item.observation}</p>
      {item.feedback ? (
        <>
          <p className="mt-3 text-[12px] font-medium tracking-wide text-[#717171] uppercase">Feedback</p>
          <p className="mt-1 text-[15px] leading-6">{item.feedback}</p>
        </>
      ) : null}
      {item.recommendation ? (
        <>
          <p className="mt-3 text-[12px] font-medium tracking-wide text-[#717171] uppercase">Recommendation</p>
          <p className="mt-1 text-[15px] leading-6">{item.recommendation}</p>
        </>
      ) : null}
      {link ? (
        <a href={link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium underline-offset-4 hover:underline">
          Figma comment <ExternalLink className="size-3.5" />
        </a>
      ) : null}
      {item.ownerResponse ? (
        <div className="mt-4 rounded-xl bg-[#F7F7F7] px-3 py-3 text-[14px] leading-6">
          <p className="text-[12px] font-medium text-[#717171]">Owner response{item.ownerResponseAt ? ` · ${formatFull(item.ownerResponseAt.slice(0, 10))}` : ""}</p>
          <p className="mt-1">{item.ownerResponse}</p>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-3">
        {mine ? <button type="button" className={cn("text-[13px] font-medium", tap)} onClick={onEdit}>Edit</button> : null}
        {mine ? <button type="button" className={cn("text-[13px] font-medium text-[#717171]", tap)} onClick={onDelete}>Delete</button> : null}
        {manage && item.status === "open" ? <button type="button" className={cn("text-[13px] font-medium", tap)} onClick={() => onStatus("acknowledged")}>Acknowledge</button> : null}
        {manage && item.status !== "draft" && item.status !== "resolved" ? <button type="button" className={cn("text-[13px] font-medium", tap)} onClick={() => onStatus("resolved")}>Mark resolved</button> : null}
        {manage && item.status === "resolved" ? <button type="button" className={cn("text-[13px] font-medium", tap)} onClick={() => onStatus("open")}>Reopen note</button> : null}
        {manage && item.status !== "draft" ? <button type="button" className={cn("text-[13px] font-medium", tap)} onClick={onStartReply}>{item.ownerResponse ? "Edit response" : "Respond"}</button> : null}
      </div>
      {replying ? (
        <div className="mt-3 space-y-2">
          <Textarea value={reply} maxLength={800} onChange={(event) => onReplyChange(event.target.value)} placeholder="What will you change, or why will you leave it?" />
          <div className="flex gap-2">
            <Button onClick={onSendReply}>Save response</Button>
            <Button variant="ghost" onClick={onCancelReply}>Cancel</Button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

function FeedbackForm({
  draft,
  criteria,
  onChange,
  onClose,
}: {
  draft: FeedbackDraft
  criteria: { id: string; name: string }[]
  onChange: (draft: FeedbackDraft) => void
  onClose: () => void
}) {
  function save(mode: "draft" | "submit") {
    const result = saveFeedback(draft, mode)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    onClose()
  }

  return (
    <div className="flex flex-col gap-4 p-1">
      <SheetHeader>
        <SheetTitle>{draft.id ? "Edit feedback" : "Add feedback"}</SheetTitle>
        <SheetDescription>One criterion at a time. You can add as many notes as the design needs.</SheetDescription>
      </SheetHeader>
      <Field label="Criterion">
        <NativeSelect value={draft.criterionId} onChange={(event) => onChange({ ...draft, criterionId: event.target.value })}>
          {criteria.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </NativeSelect>
      </Field>
      <Field label="Observation" hint="What did you notice?">
        <Textarea value={draft.observation} maxLength={800} onChange={(event) => onChange({ ...draft, observation: event.target.value })} />
      </Field>
      <Field label="Feedback" hint="Why does it matter?">
        <Textarea value={draft.feedback} maxLength={1200} onChange={(event) => onChange({ ...draft, feedback: event.target.value })} />
      </Field>
      <Field label="Recommendation" hint="Optional. What should change?">
        <Textarea value={draft.recommendation} maxLength={800} onChange={(event) => onChange({ ...draft, recommendation: event.target.value })} />
      </Field>
      <Field label="Severity">
        <div className="grid grid-cols-2 gap-2">
          {SEVERITIES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onChange({ ...draft, severity: item })}
              className={cn("h-10 rounded-xl border text-[13px] font-medium", tap, draft.severity === item ? "border-[#222]" : "border-[#EBEBEB]")}
            >
              {SEVERITY_META[item].label}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Figma comment link" hint="Optional. Link the frame or comment, don’t recreate it.">
        <Input value={draft.figmaLink} inputMode="url" maxLength={300} onChange={(event) => onChange({ ...draft, figmaLink: event.target.value })} placeholder="https://" />
      </Field>
      <div className="flex gap-2 pt-2">
        <Button onClick={() => save("submit")}>Submit</Button>
        <Button variant="outline" onClick={() => save("draft")}>Save draft</Button>
      </div>
    </div>
  )
}
