"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Check, Plus, X } from "lucide-react"
import { toast } from "sonner"
import { Avatar, Field, NativeSelect, pageWrap } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FOCUS, PROJECTS, REMINDER_OPTIONS, TIMEZONES, timezoneLabel } from "@/lib/constants"
import { isManager, reviewToDraft, validateReview } from "@/lib/domain"
import { addDaysISO, formatDay, isISODate, todayISO, windowLabel } from "@/lib/format"
import { tap } from "@/lib/presentation"
import { deleteDraft, inviteMember, saveReview, useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { ReviewDraft } from "@/lib/types"

export function CreateReview({ reviewId }: { reviewId?: string }) {
  const params = useSearchParams()
  const { ready, user, criteria, templates, reviews, workspace } = useWorkspace()
  const key = reviewId ?? `new:${params.get("date") ?? ""}`

  if (!ready || !user || !workspace) {
    return <div className={pageWrap()}><p className="text-[#717171]">Opening the form…</p></div>
  }

  const existingForKey = reviewId ? reviews.find((review) => review.id === reviewId) : undefined
  const date = isISODate(params.get("date")) ? params.get("date")! : todayISO()
  const standard = templates.find((template) => template.id === "tpl_standard")?.criteriaIds
  const active = criteria.filter((item) => item.active).sort((a, b) => a.order - b.order).map((item) => item.id)
  const initial: ReviewDraft = existingForKey
    ? reviewToDraft(existingForKey)
    : {
        title: "",
        project: "",
        feature: "",
        description: "",
        ownerId: user.id,
        figmaUrl: "",
        designVersion: "",
        referenceUrls: [],
        startDate: date,
        deadline: addDaysISO(date, 4),
        startTime: "",
        endTime: "",
        timezone: workspace.timezone,
        reminderHours: workspace.reminderHours,
        shareFeedback: true,
        criteriaIds: standard ?? active.slice(0, 8),
        reviewers: [],
      }

  return (
    <CreateReviewForm
      key={key}
      initial={initial}
      reviewId={reviewId}
    />
  )
}

function CreateReviewForm({ initial, reviewId }: { initial: ReviewDraft; reviewId?: string }) {
  const router = useRouter()
  const { user, users, criteria, templates, reviews } = useWorkspace()
  const [draft, setDraft] = useState(initial)
  const [attempt, setAttempt] = useState<"draft" | "publish" | null>(null)
  const [query, setQuery] = useState("")
  const [invite, setInvite] = useState({ name: "", email: "", focus: "" })
  const [link, setLink] = useState("")

  if (!user) return null

  const existing = reviewId ? reviews.find((review) => review.id === reviewId) : undefined
  if (reviewId && !existing) {
    return (
      <div className={pageWrap()}>
        <h1 className="text-[28px] font-semibold tracking-tight">Review not found</h1>
        <p className="mt-2 text-[#717171]">It may have been deleted from this browser.</p>
        <Link href="/reviews" className="mt-4 inline-block text-[14px] font-medium underline">Back to reviews</Link>
      </div>
    )
  }
  if (existing && !isManager(user, existing)) {
    return (
      <div className={pageWrap()}>
        <h1 className="text-[28px] font-semibold tracking-tight">You can’t edit this review</h1>
        <p className="mt-2 text-[#717171]">Only the owner or an admin can change it.</p>
      </div>
    )
  }
  if (existing && (existing.lifecycle === "completed" || existing.lifecycle === "archived")) {
    return (
      <div className={pageWrap()}>
        <h1 className="text-[28px] font-semibold tracking-tight">This review is closed</h1>
        <p className="mt-2 max-w-lg text-[#717171]">Reopen it from the review page if you need to change the brief, the dates, or the reviewers.</p>
        <Link href={`/reviews/${existing.id}`} className="mt-4 inline-block font-medium underline">Go to the review</Link>
      </div>
    )
  }

  const errors = attempt ? validateReview(draft, attempt) : []
  const selected = new Set(draft.reviewers.map((reviewer) => reviewer.userId))
  const matches = users.filter((person) => {
    if (selected.has(person.id)) return false
    const q = query.trim().toLowerCase()
    if (!q) return true
    return person.name.toLowerCase().includes(q) || person.email.toLowerCase().includes(q)
  }).slice(0, 6)
  const orderedCriteria = [...criteria].sort((a, b) => a.order - b.order)
  const chosenCriteria = orderedCriteria.filter((item) => draft.criteriaIds.includes(item.id))

  function update(patch: Partial<ReviewDraft>) {
    setDraft((current) => (current ? { ...current, ...patch } : current))
  }

  function save(mode: "draft" | "publish") {
    if (!draft) return
    setAttempt(mode)
    if (validateReview(draft, mode).length) return
    const result = saveReview(draft, mode, reviewId)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    if (!reviewId) setDraft(initial)
    router.push(result.id ? `/reviews/${result.id}` : "/reviews")
  }

  return (
    <div className={pageWrap()}>
      <p className="text-[13px] text-[#717171]">{existing ? "Edit review" : "New review"}</p>
      <h1 className="mt-1 text-[30px] font-semibold tracking-tight">{existing ? existing.title : "Create a review"}</h1>
      <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[#717171]">
        A review takes a few minutes. Add the Figma file, the people, the criteria, and the deadline. Publishing invites them — it does not book a meeting.
      </p>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-10">
          <section className="space-y-4">
            <SectionTitle index="01" title="Review information" />
            <Field label="Review title">
              <Input value={draft.title} maxLength={120} onChange={(event) => update({ title: event.target.value })} placeholder="BusinessHub – Access Management" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Project">
                <Input value={draft.project} list="projects" maxLength={80} onChange={(event) => update({ project: event.target.value })} placeholder="Sunrise BusinessHub" />
                <datalist id="projects">
                  {[...new Set([...PROJECTS, ...reviews.map((review) => review.project)])].map((project) => (
                    <option key={project} value={project} />
                  ))}
                </datalist>
              </Field>
              <Field label="Feature or module" hint="Optional">
                <Input value={draft.feature} maxLength={80} onChange={(event) => update({ feature: event.target.value })} placeholder="Group Management" />
              </Field>
            </div>
            <Field label="Description" hint="What should reviewers look at, and what is out of scope?">
              <Textarea value={draft.description} maxLength={2000} onChange={(event) => update({ description: event.target.value })} placeholder="Review the updated group management workflow, including creation, editing and permission assignment." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Design owner">
                {user.role === "admin" ? (
                  <NativeSelect value={draft.ownerId} onChange={(event) => update({ ownerId: event.target.value })}>
                    {users.filter((person) => person.accountStatus === "active").map((person) => (
                      <option key={person.id} value={person.id}>{person.name}</option>
                    ))}
                  </NativeSelect>
                ) : (
                  <Input value={users.find((person) => person.id === draft.ownerId)?.name ?? user.name} disabled />
                )}
              </Field>
              <Field label="Design version" hint="Optional">
                <Input value={draft.designVersion} maxLength={40} onChange={(event) => update({ designVersion: event.target.value })} placeholder="v3.2" />
              </Field>
            </div>
            <Field label="Figma URL" hint="Figma stays the source of truth for visual comments.">
              <Input value={draft.figmaUrl} inputMode="url" maxLength={300} onChange={(event) => update({ figmaUrl: event.target.value })} placeholder="https://www.figma.com/design/…" />
            </Field>
            <Field label="Reference links" hint="Optional briefs or documents.">
              <div className="flex gap-2">
                <Input value={link} inputMode="url" onChange={(event) => setLink(event.target.value)} placeholder="https://" />
                <Button type="button" variant="outline" className="h-12 rounded-xl" onClick={() => {
                  if (!link.trim()) return
                  update({ referenceUrls: [...draft.referenceUrls, link.trim()] })
                  setLink("")
                }}>Add</Button>
              </div>
              <ul className="mt-2 space-y-1">
                {draft.referenceUrls.map((url) => (
                  <li key={url} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="truncate text-[#717171]">{url}</span>
                    <button type="button" className={tap} aria-label="Remove link" onClick={() => update({ referenceUrls: draft.referenceUrls.filter((item) => item !== url) })}>
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </Field>
          </section>

          <section className="space-y-4">
            <SectionTitle index="02" title="Schedule" body="The dates are the review window. Times are optional and do not mean everyone attends together." />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start date">
                <Input type="date" value={draft.startDate} onChange={(event) => update({ startDate: event.target.value })} />
              </Field>
              <Field label="Deadline">
                <Input type="date" value={draft.deadline} onChange={(event) => update({ deadline: event.target.value })} />
              </Field>
              <Field label="Start time" hint="Optional">
                <Input type="time" value={draft.startTime} onChange={(event) => update({ startTime: event.target.value })} />
              </Field>
              <Field label="End time" hint="Optional">
                <Input type="time" value={draft.endTime} onChange={(event) => update({ endTime: event.target.value })} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Time zone">
                <NativeSelect value={draft.timezone} onChange={(event) => update({ timezone: event.target.value })}>
                  {TIMEZONES.map((zone) => (
                    <option key={zone.value} value={zone.value}>{zone.label}</option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Reminder" hint="Flags reviewers who have not finished.">
                <NativeSelect
                  value={draft.reminderHours === null ? "none" : String(draft.reminderHours)}
                  onChange={(event) => update({ reminderHours: event.target.value === "none" ? null : Number(event.target.value) })}
                >
                  {REMINDER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <SectionTitle index="03" title="Reviewers" body="Search the workspace or invite someone by email before they have an account." />
            <Field label="Find a reviewer">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name or email" />
            </Field>
            {matches.length > 0 ? (
              <ul className="overflow-hidden rounded-2xl border border-[#EBEBEB]">
                {matches.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      className={cn("flex w-full items-center gap-3 px-3 py-3 text-left hover:bg-[#F7F7F7]", tap)}
                      onClick={() => {
                        update({ reviewers: [...draft.reviewers, { userId: person.id, focus: "" }] })
                        setQuery("")
                      }}
                    >
                      <Avatar user={person} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[14px] font-medium">{person.name}</span>
                        <span className="block text-[12px] text-[#717171]">{person.email}{person.accountStatus === "invited" ? " · Invited" : ""}</span>
                      </span>
                      <Plus className="size-4 text-[#717171]" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <ul className="space-y-3">
              {draft.reviewers.map((reviewer) => {
                const person = users.find((item) => item.id === reviewer.userId)
                if (!person) return null
                return (
                  <li key={reviewer.userId} className="grid items-center gap-3 rounded-2xl border border-[#EBEBEB] p-3 sm:grid-cols-[1fr_180px_auto]">
                    <span className="flex items-center gap-3">
                      <Avatar user={person} />
                      <span>
                        <span className="block text-[14px] font-medium">{person.name}</span>
                        <span className="block text-[12px] text-[#717171]">{person.title}</span>
                      </span>
                    </span>
                    <Input
                      value={reviewer.focus}
                      list="focuses"
                      maxLength={80}
                      placeholder="Assigned focus"
                      aria-label={`Focus for ${person.name}`}
                      onChange={(event) => update({
                        reviewers: draft.reviewers.map((item) => item.userId === reviewer.userId ? { ...item, focus: event.target.value } : item),
                      })}
                    />
                    <button type="button" className={cn("text-[13px] text-[#717171]", tap)} onClick={() => update({ reviewers: draft.reviewers.filter((item) => item.userId !== reviewer.userId) })}>
                      Remove
                    </button>
                  </li>
                )
              })}
            </ul>
            <datalist id="focuses">
              {FOCUS.map((focus) => <option key={focus} value={focus} />)}
            </datalist>
            <details className="rounded-2xl bg-[#F7F7F7] p-4">
              <summary className={cn("text-[14px] font-medium", tap)}>Invite by email</summary>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <Input value={invite.name} placeholder="Name" aria-label="Invitee name" onChange={(event) => setInvite({ ...invite, name: event.target.value })} />
                <Input value={invite.email} placeholder="Email" aria-label="Invitee email" onChange={(event) => setInvite({ ...invite, email: event.target.value })} />
                <Input value={invite.focus} placeholder="Focus" aria-label="Invitee focus" list="focuses" onChange={(event) => setInvite({ ...invite, focus: event.target.value })} />
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-3 rounded-xl"
                onClick={() => {
                  const result = inviteMember({ name: invite.name, email: invite.email })
                  if (!result.ok || !result.id) {
                    toast.error(result.message)
                    return
                  }
                  if (!draft.reviewers.some((item) => item.userId === result.id)) {
                    update({ reviewers: [...draft.reviewers, { userId: result.id, focus: invite.focus }] })
                  }
                  toast.success(result.message)
                  setInvite({ name: "", email: "", focus: "" })
                }}
              >
                Invite and add
              </Button>
            </details>
          </section>

          <section className="space-y-4">
            <SectionTitle index="04" title="Criteria" body="Reuse a template, or pick the checks that matter for this work." />
            <Field label="Template">
              <NativeSelect
                value=""
                onChange={(event) => {
                  const template = templates.find((item) => item.id === event.target.value)
                  if (template) update({ criteriaIds: template.criteriaIds })
                }}
              >
                <option value="">Apply a template…</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </NativeSelect>
            </Field>
            <ul className="grid gap-2 sm:grid-cols-2">
              {orderedCriteria.filter((item) => item.active || draft.criteriaIds.includes(item.id)).map((item) => {
                const on = draft.criteriaIds.includes(item.id)
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => update({
                        criteriaIds: on ? draft.criteriaIds.filter((id) => id !== item.id) : [...draft.criteriaIds, item.id],
                      })}
                      className={cn(
                        "flex h-full w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left",
                        tap,
                        on ? "border-[#222]" : "border-[#EBEBEB]",
                      )}
                    >
                      <span className={cn("mt-0.5 grid size-5 place-items-center rounded-full border", on ? "border-[#222] bg-[#222] text-white" : "border-[#EBEBEB]")}>
                        {on ? <Check className="size-3" /> : null}
                      </span>
                      <span>
                        <span className="block text-[14px] font-medium">{item.name}</span>
                        <span className="mt-0.5 block text-[12px] text-[#717171]">{item.category} · {item.description}</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <label className="flex items-center justify-between gap-4 rounded-2xl bg-[#F7F7F7] px-4 py-3 text-[14px]">
              <span>
                <span className="block font-medium">Reviewers can read each other’s notes</span>
                <span className="mt-0.5 block text-[12px] text-[#717171]">You always see everything. Drafts stay private to their author.</span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={draft.shareFeedback}
                onClick={() => update({ shareFeedback: !draft.shareFeedback })}
                className={cn("relative h-6 w-11 rounded-full transition-colors", tap, draft.shareFeedback ? "bg-[#222]" : "bg-[#D6D6D6]")}
              >
                <span className={cn("absolute top-0.5 size-5 rounded-full bg-white transition-transform", draft.shareFeedback ? "left-5" : "left-0.5")} />
              </button>
            </label>
          </section>

          {errors.length > 0 ? (
            <ul className="space-y-1 text-[14px] text-[#D93B3B]">
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {existing && existing.lifecycle === "open" ? (
              <Button type="button" size="lg" onClick={() => save("publish")}>Save changes</Button>
            ) : (
              <>
                <Button type="button" size="lg" onClick={() => save("publish")}>Publish review</Button>
                <Button type="button" size="lg" variant="outline" onClick={() => save("draft")}>Save as draft</Button>
              </>
            )}
            <Button type="button" size="lg" variant="ghost" onClick={() => router.push(existing ? `/reviews/${existing.id}` : "/reviews")}>
              Cancel
            </Button>
            {existing?.lifecycle === "draft" ? (
              <Button
                type="button"
                size="lg"
                variant="ghost"
                className="text-[#D93B3B]"
                onClick={() => {
                  const result = deleteDraft(existing.id)
                  if (!result.ok) toast.error(result.message)
                  else {
                    toast.success(result.message)
                    router.push("/reviews")
                  }
                }}
              >
                Delete draft
              </Button>
            ) : null}
          </div>
        </div>

        <aside className="rounded-2xl border border-[#EBEBEB] p-5 lg:sticky lg:top-8">
          <p className="text-[11px] font-medium tracking-[0.08em] text-[#717171] uppercase">Summary</p>
          <h2 className="mt-3 text-[20px] font-semibold tracking-tight">{draft.title || "Untitled review"}</h2>
          <dl className="mt-4 space-y-3 text-[14px]">
            <Row label="Project" value={draft.project || "Not set"} />
            <Row label="Feature" value={draft.feature || "—"} />
            <Row label="Window" value={draft.startDate && draft.deadline ? `${windowLabel(draft.startDate, draft.deadline, draft.startTime, draft.endTime)} · ${timezoneLabel(draft.timezone)}` : "Not set"} />
            <Row label="Figma" value={draft.figmaUrl ? "Link added" : "Missing"} />
            <Row label="Reviewers" value={draft.reviewers.length ? `${draft.reviewers.length} selected` : "None yet"} />
            <Row label="Criteria" value={chosenCriteria.length ? chosenCriteria.map((item) => item.name).join(", ") : "None yet"} />
            <Row label="Deadline" value={draft.deadline ? formatDay(draft.deadline) : "Not set"} />
          </dl>
        </aside>
      </div>
    </div>
  )
}

function SectionTitle({ index, title, body }: { index: string; title: string; body?: string }) {
  return (
    <div>
      <p className="text-[12px] font-medium tracking-[0.08em] text-[#717171]">{index}</p>
      <h2 className="mt-1 text-[20px] font-semibold tracking-tight">{title}</h2>
      {body ? <p className="mt-1 text-[14px] leading-6 text-[#717171]">{body}</p> : null}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12px] text-[#717171]">{label}</dt>
      <dd className="mt-0.5 leading-5">{value}</dd>
    </div>
  )
}
