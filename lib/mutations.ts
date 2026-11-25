import {
  assignmentFor,
  isManager,
  reviewToDraft,
  validateFeedback,
  validateReview,
} from "@/lib/domain"
import { createSeed } from "@/lib/seed"
import { addDaysISO, clip, diffDays, formatDay, isEmail, normalizeHttpUrl, todayISO, uid } from "@/lib/format"
import type {
  Activity,
  AppState,
  CriterionDraft,
  Feedback,
  FeedbackDraft,
  FeedbackStatus,
  Mutation,
  Notification,
  Provider,
  Review,
  ReviewDraft,
  ReviewerAssignment,
  ReviewerStatus,
  Role,
} from "@/lib/types"

function same(state: AppState, message: string): Mutation {
  return { state, ok: false, message }
}

function done(state: AppState, message?: string, id?: string): Mutation {
  return { state, ok: true, message, id }
}

function actor(state: AppState) {
  return state.users.find((user) => user.id === state.currentUserId) ?? null
}

function stamp() {
  return new Date().toISOString()
}

function withActivity(
  state: AppState,
  input: { type: Activity["type"]; message: string; reviewId?: string },
): AppState {
  if (!state.currentUserId) return state
  const activity: Activity = {
    id: uid("act"),
    type: input.type,
    message: input.message,
    reviewId: input.reviewId,
    actorId: state.currentUserId,
    createdAt: stamp(),
  }
  return { ...state, activities: [activity, ...state.activities].slice(0, 200) }
}

function withNotes(
  state: AppState,
  userIds: string[],
  note: { title: string; body: string; reviewId?: string; kind: Notification["kind"] },
): AppState {
  const createdAt = stamp()
  const seen = new Set<string>()
  const additions: Notification[] = []
  for (const userId of userIds) {
    if (!userId || userId === state.currentUserId || seen.has(userId)) continue
    seen.add(userId)
    additions.push({
      id: uid("ntf"),
      userId,
      title: note.title,
      body: note.body,
      reviewId: note.reviewId,
      kind: note.kind,
      read: false,
      createdAt,
    })
  }
  return { ...state, notifications: [...additions, ...state.notifications].slice(0, 120) }
}

function replaceReview(state: AppState, review: Review) {
  return { ...state, reviews: state.reviews.map((item) => (item.id === review.id ? review : item)) }
}

export function signIn(state: AppState, userId: string, provider: Provider): Mutation {
  const user = state.users.find((item) => item.id === userId)
  if (!user) return same(state, "That account is not in this workspace.")
  return done({
    ...state,
    currentUserId: user.id,
    provider,
    users: state.users.map((item) =>
      item.id === user.id ? { ...item, accountStatus: "active" } : item,
    ),
  })
}

export function signOut(state: AppState): Mutation {
  return done({ ...state, currentUserId: null, provider: null })
}

function reviewersFrom(
  state: AppState,
  draft: ReviewDraft,
  existing?: Review,
): ReviewerAssignment[] | string {
  const seen = new Set<string>()
  const reviewers: ReviewerAssignment[] = []
  for (const reviewer of draft.reviewers) {
    if (seen.has(reviewer.userId)) continue
    const member = state.users.find((user) => user.id === reviewer.userId)
    if (!member) return "One of the reviewers is no longer in the workspace."
    const previous = existing?.reviewers.find((item) => item.userId === reviewer.userId)
    if (member.accountStatus !== "active" && !previous) {
      return "Only people who have signed in can be added as reviewers."
    }
    seen.add(reviewer.userId)
    reviewers.push({
      userId: reviewer.userId,
      focus: clip(reviewer.focus, 80),
      status: previous?.status ?? "pending",
    })
  }
  return reviewers
}

export function saveReview(
  state: AppState,
  draft: ReviewDraft,
  mode: "draft" | "publish",
  id?: string,
): Mutation {
  const user = actor(state)
  if (!user) return same(state, "Sign in to save a review.")
  const existing = id ? state.reviews.find((review) => review.id === id) : undefined
  if (id && !existing) return same(state, "That review is no longer here.")
  if (existing && !isManager(user, existing)) return same(state, "Only the owner or an admin can edit this review.")
  if (existing && (existing.lifecycle === "completed" || existing.lifecycle === "archived")) {
    return same(state, "Reopen the review before editing it.")
  }
  const errors = validateReview(draft, mode === "publish" ? "publish" : "draft")
  if (errors.length) return same(state, errors[0])
  const reviewers = reviewersFrom(state, draft, existing)
  if (typeof reviewers === "string") return same(state, reviewers)
  const ownerId = user.role === "admin" ? draft.ownerId || user.id : (existing?.ownerId ?? user.id)
  if (!state.users.some((item) => item.id === ownerId)) return same(state, "Choose an owner who is in the workspace.")
  const now = stamp()
  const publishing = mode === "publish" && (!existing || existing.lifecycle === "draft")
  const review: Review = {
    id: existing?.id ?? id ?? uid("review"),
    title: clip(draft.title, 120),
    project: clip(draft.project, 80),
    feature: clip(draft.feature, 80),
    description: clip(draft.description, 2000),
    ownerId,
    figmaUrl: normalizeHttpUrl(draft.figmaUrl),
    designVersion: clip(draft.designVersion, 40),
    referenceUrls: draft.referenceUrls.map((url) => normalizeHttpUrl(url)).filter(Boolean),
    startDate: publishing ? todayISO() : draft.startDate,
    deadline: publishing ? addDaysISO(todayISO(), Math.max(draft.startDate && draft.deadline ? diffDays(draft.startDate, draft.deadline) : 0, 0)) : draft.deadline,
    startTime: publishing ? currentTime() : draft.startTime,
    endTime: draft.endTime,
    timezone: draft.timezone || state.workspace.timezone,
    reminderHours: draft.reminderHours,
    lifecycle: publishing ? "open" : (existing?.lifecycle ?? "draft"),
    shareFeedback: true,
    criteriaIds: [...new Set(draft.criteriaIds)],
    reviewers,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    completedAt: existing?.completedAt,
  }
  let next: AppState = existing
    ? replaceReview(state, review)
    : { ...state, reviews: [review, ...state.reviews] }
  const previousIds = new Set(existing?.reviewers.map((reviewer) => reviewer.userId) ?? [])
  const added = review.reviewers.filter((reviewer) => !previousIds.has(reviewer.userId)).map((reviewer) => reviewer.userId)
  if (!existing && review.lifecycle === "draft") {
    next = withActivity(next, { type: "created", message: `${user.name} saved a draft, ${review.title}.`, reviewId: review.id })
  } else if (publishing) {
    next = withActivity(next, {
      type: "published",
      message: `${user.name} published ${review.title} and invited ${review.reviewers.length} reviewer${review.reviewers.length === 1 ? "" : "s"}.`,
      reviewId: review.id,
    })
    next = withNotes(next, review.reviewers.map((reviewer) => reviewer.userId), {
      kind: "invited",
      title: "You were invited to review",
      body: `${user.name} asked you to review ${review.title}. It is asynchronous — open it when you have time.`,
      reviewId: review.id,
    })
  } else if (existing) {
    const datesMoved = existing.startDate !== review.startDate || existing.deadline !== review.deadline
    if (datesMoved) {
      next = withActivity(next, {
        type: "rescheduled",
        message: `${user.name} rescheduled ${review.title}.`,
        reviewId: review.id,
      })
      if (review.lifecycle === "open") {
        next = withNotes(next, review.reviewers.map((reviewer) => reviewer.userId), {
          kind: "rescheduled",
          title: "Review rescheduled",
          body: `${review.title} now runs ${formatDay(review.startDate)} to ${formatDay(review.deadline)}.`,
          reviewId: review.id,
        })
      }
    }
    if (review.lifecycle === "open" && added.length) {
      next = withNotes(next, added, {
        kind: "invited",
        title: "You were invited to review",
        body: `${user.name} added you to ${review.title}.`,
        reviewId: review.id,
      })
      next = withActivity(next, {
        type: "invited",
        message: `${user.name} invited ${added.length} reviewer${added.length === 1 ? "" : "s"} to ${review.title}.`,
        reviewId: review.id,
      })
    }
    if (!datesMoved && added.length === 0) {
      next = withActivity(next, { type: "updated", message: `${user.name} updated ${review.title}.`, reviewId: review.id })
    }
  }
  const message = publishing
    ? reviewers.length
      ? "Sent. Reviewers have been invited."
      : "Sent. Share the review link so anyone on the team can respond."
    : existing
      ? "Changes saved."
      : "Draft saved."
  return done(next, message, review.id)
}

export function publishReview(state: AppState, id: string): Mutation {
  const review = state.reviews.find((item) => item.id === id)
  if (!review) return same(state, "That review is no longer here.")
  if (review.lifecycle !== "draft") return same(state, "This review is already published.")
  return saveReview(state, reviewToDraft(review), "publish", id)
}

export function deleteDraft(state: AppState, id: string): Mutation {
  const user = actor(state)
  const review = state.reviews.find((item) => item.id === id)
  if (!user || !review) return same(state, "That review is no longer here.")
  if (!isManager(user, review)) return same(state, "Only the owner or an admin can delete this draft.")
  if (review.lifecycle !== "draft") return same(state, "Published reviews are archived rather than deleted.")
  return done(
    {
      ...state,
      reviews: state.reviews.filter((item) => item.id !== id),
      feedback: state.feedback.filter((item) => item.reviewId !== id),
    },
    "Draft deleted.",
  )
}

export function rescheduleReview(state: AppState, id: string, startDate: string): Mutation {
  const user = actor(state)
  const review = state.reviews.find((item) => item.id === id)
  if (!user || !review) return same(state, "That review is no longer here.")
  if (!isManager(user, review)) return same(state, "Only the owner or an admin can reschedule this review.")
  if (review.lifecycle === "completed" || review.lifecycle === "archived") {
    return same(state, "Reopen the review before moving it.")
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return same(state, "Choose a valid date.")
  const deadline = startDate
  const nextStart = review.startDate > deadline ? deadline : review.startDate
  if (review.deadline === deadline && review.startDate === nextStart) return done(state)
  const draft = reviewToDraft({ ...review, startDate: nextStart, deadline })
  return saveReview(state, draft, review.lifecycle === "draft" ? "draft" : "publish", review.id)
}

export function setLifecycle(
  state: AppState,
  id: string,
  lifecycle: "completed" | "archived" | "open",
): Mutation {
  const user = actor(state)
  const review = state.reviews.find((item) => item.id === id)
  if (!user || !review) return same(state, "That review is no longer here.")
  if (!isManager(user, review)) return same(state, "Only the owner or an admin can change this review.")
  const now = stamp()
  if (lifecycle === "completed") {
    if (review.lifecycle !== "open") return same(state, "Only an open review can be closed.")
    let next = replaceReview(state, { ...review, lifecycle: "completed", completedAt: now, updatedAt: now })
    next = withActivity(next, { type: "completed", message: `${user.name} closed ${review.title}.`, reviewId: review.id })
    next = withNotes(next, review.reviewers.map((reviewer) => reviewer.userId), {
      kind: "completed",
      title: "Review closed",
      body: `${user.name} closed ${review.title}. The notes stay in the history.`,
      reviewId: review.id,
    })
    return done(next, "Review closed.")
  }
  if (lifecycle === "archived") {
    if (review.lifecycle === "draft") return same(state, "Delete a draft, or publish it first.")
    if (review.lifecycle === "archived") return same(state, "This review is already archived.")
    let next = replaceReview(state, { ...review, lifecycle: "archived", updatedAt: now })
    next = withActivity(next, { type: "archived", message: `${user.name} archived ${review.title}.`, reviewId: review.id })
    return done(next, "Review archived.")
  }
  if (review.lifecycle !== "completed" && review.lifecycle !== "archived") {
    return same(state, "This review is already open.")
  }
  let next = replaceReview(state, { ...review, lifecycle: "open", completedAt: undefined, updatedAt: now })
  next = withActivity(next, { type: "reopened", message: `${user.name} reopened ${review.title}.`, reviewId: review.id })
  next = withNotes(next, review.reviewers.map((reviewer) => reviewer.userId), {
    kind: "reopened",
    title: "Review reopened",
    body: `${user.name} reopened ${review.title}. You can add or edit feedback again.`,
    reviewId: review.id,
  })
  return done(next, "Review reopened.")
}

export function remindReviewer(state: AppState, reviewId: string, userId: string): Mutation {
  const user = actor(state)
  const review = state.reviews.find((item) => item.id === reviewId)
  const reviewer = review ? assignmentFor(review, userId) : undefined
  const person = state.users.find((item) => item.id === userId)
  if (!user || !review || !reviewer || !person) return same(state, "That reviewer is not on this review.")
  if (!isManager(user, review)) return same(state, "Only the owner or an admin can send a reminder.")
  if (review.lifecycle !== "open") return same(state, "Reminders go out while a review is open.")
  if (reviewer.status === "completed") return same(state, `${person.name} has already finished.`)
  let next = withNotes(state, [person.id], {
    kind: "reminder",
    title: "Reminder to review",
    body: `${user.name} is waiting on your notes for ${review.title}.`,
    reviewId: review.id,
  })
  next = withActivity(next, {
    type: "reminder",
    message: `${user.name} reminded ${person.name} about ${review.title}.`,
    reviewId: review.id,
  })
  return done(next, `Reminder is in ${person.name.split(" ")[0]}’s notifications.`)
}

export function setReviewerStatus(
  state: AppState,
  reviewId: string,
  userId: string,
  status: Extract<ReviewerStatus, "completed" | "in_progress">,
): Mutation {
  const user = actor(state)
  const review = state.reviews.find((item) => item.id === reviewId)
  if (!user || !review) return same(state, "That review is no longer here.")
  if (review.lifecycle !== "open") return same(state, "This review is closed.")
  const assignment = assignmentFor(review, userId)
  if (!assignment) return same(state, "That person is not a reviewer.")
  if (user.id !== userId && !isManager(user, review)) return same(state, "You can update your own review status.")
  const reviewers = review.reviewers.map((reviewer) =>
    reviewer.userId === userId ? { ...reviewer, status } : reviewer,
  )
  let next = replaceReview(state, { ...review, reviewers, updatedAt: stamp() })
  const person = state.users.find((item) => item.id === userId)
  if (status === "completed" && person) {
    next = withActivity(next, {
      type: "feedback",
      message: `${person.name} marked their review of ${review.title} complete.`,
      reviewId: review.id,
    })
    next = withNotes(next, [review.ownerId], {
      kind: "feedback",
      title: "Reviewer finished",
      body: `${person.name} marked ${review.title} complete.`,
      reviewId: review.id,
    })
  }
  const updated = next.reviews.find((item) => item.id === review.id)
  if (
    status === "completed" &&
    updated &&
    updated.lifecycle === "open" &&
    updated.reviewers.length > 0 &&
    updated.reviewers.every((reviewer) => reviewer.status === "completed")
  ) {
    const closedAt = stamp()
    next = replaceReview(next, { ...updated, lifecycle: "completed", completedAt: closedAt, updatedAt: closedAt })
    next = withActivity(next, {
      type: "completed",
      message: `${updated.title} is complete. Every assigned reviewer is done.`,
      reviewId: updated.id,
    })
    return done(next, "All reviewers done. Review completed.")
  }
  return done(next, status === "completed" ? "Marked as completed." : "Review marked in progress.")
}

export function saveFeedback(state: AppState, draft: FeedbackDraft, mode: "draft" | "submit"): Mutation {
  const user = actor(state)
  if (!user) return same(state, "Sign in to leave feedback.")
  const review = state.reviews.find((item) => item.id === draft.reviewId)
  if (!review) return same(state, "That review is no longer here.")
  if (review.lifecycle !== "open") return same(state, "This review is closed.")
  if (user.accountStatus !== "active" && user.accountStatus !== "invited") return same(state, "Sign in to leave feedback.")
  const activeCriteria = state.criteria.filter((item) => item.active)
  if (!activeCriteria.length) return same(state, "Add a criterion in Settings before leaving feedback.")
  if (!activeCriteria.some((item) => item.id === draft.criterionId)) {
    return same(state, "Choose a criterion.")
  }
  const errors = validateFeedback(draft, mode)
  if (errors.length) return same(state, errors[0])
  const existing = draft.id ? state.feedback.find((item) => item.id === draft.id) : undefined
  if (draft.id && !existing) return same(state, "That note is no longer here.")
  if (existing && existing.authorId !== user.id) return same(state, "You can edit your own notes.")
  if (existing && existing.reviewId !== review.id) return same(state, "That note belongs to another review.")
  const now = stamp()
  const record: Feedback = {
    id: existing?.id ?? uid("fb"),
    reviewId: review.id,
    criterionId: draft.criterionId,
    authorId: user.id,
    observation: clip(draft.observation, 800),
    feedback: clip(draft.feedback, 1200),
    recommendation: clip(draft.recommendation, 800),
    severity: draft.severity,
    figmaLink: draft.figmaLink.trim() ? normalizeHttpUrl(draft.figmaLink) : "",
    status: existing && existing.status !== "draft" && mode === "submit" ? existing.status : mode === "draft" ? "draft" : "open",
    ownerResponse: existing?.ownerResponse ?? "",
    ownerResponseAt: existing?.ownerResponseAt,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  const feedback = existing
    ? state.feedback.map((item) => (item.id === record.id ? record : item))
    : [record, ...state.feedback]
  const known = review.reviewers.some((reviewer) => reviewer.userId === user.id)
  const reviewers = known
    ? review.reviewers.map((reviewer) => {
        if (reviewer.userId !== user.id) return reviewer
        if (reviewer.status === "pending" || (reviewer.status === "completed" && (!existing || mode === "draft"))) {
          return { ...reviewer, status: "in_progress" as const }
        }
        return reviewer
      })
    : [...review.reviewers, { userId: user.id, focus: "General", status: "in_progress" as const }]
  const today = todayISO()
  const startDate = review.startDate > today ? today : review.startDate
  let next: AppState = {
    ...replaceReview({ ...state, feedback }, { ...review, reviewers, startDate, updatedAt: now }),
  }
  if (mode === "submit" && (!existing || existing.status === "draft")) {
    next = withNotes(next, [review.ownerId], {
      kind: "feedback",
      title: "Feedback submitted",
      body: `${user.name} left notes on ${review.title}.`,
      reviewId: review.id,
    })
    next = withActivity(next, {
      type: "feedback",
      message: `${user.name} submitted feedback on ${review.title}.`,
      reviewId: review.id,
    })
  }
  return done(next, mode === "draft" ? "Draft saved." : "Feedback submitted.", record.id)
}

export function deleteFeedback(state: AppState, id: string): Mutation {
  const user = actor(state)
  const item = state.feedback.find((entry) => entry.id === id)
  if (!user || !item) return same(state, "That note is no longer here.")
  const review = state.reviews.find((entry) => entry.id === item.reviewId)
  if (!review || review.lifecycle !== "open") return same(state, "Notes can be removed while the review is open.")
  if (item.authorId !== user.id && !isManager(user, review)) return same(state, "You can remove your own notes.")
  const feedback = state.feedback.filter((entry) => entry.id !== id)
  const still = feedback.some((entry) => entry.reviewId === review.id && entry.authorId === item.authorId)
  const reviewers = review.reviewers.map((reviewer) => {
    if (reviewer.userId === item.authorId && !still && reviewer.status === "in_progress") {
      return { ...reviewer, status: "pending" as const }
    }
    return reviewer
  })
  return done(replaceReview({ ...state, feedback }, { ...review, reviewers, updatedAt: stamp() }), "Note removed.")
}

export function setFeedbackStatus(state: AppState, id: string, status: Exclude<FeedbackStatus, "draft">): Mutation {
  const user = actor(state)
  const item = state.feedback.find((entry) => entry.id === id)
  if (!user || !item) return same(state, "That note is no longer here.")
  if (item.status === "draft") return same(state, "Draft notes are not visible to the owner yet.")
  const review = state.reviews.find((entry) => entry.id === item.reviewId)
  if (!review) return same(state, "That review is no longer here.")
  if (!isManager(user, review)) return same(state, "Only the owner or an admin can update note status.")
  const feedback = state.feedback.map((entry) =>
    entry.id === id ? { ...entry, status, updatedAt: stamp() } : entry,
  )
  return done({ ...state, feedback }, status === "resolved" ? "Marked resolved." : status === "acknowledged" ? "Acknowledged." : "Reopened.")
}

export function respondToFeedback(state: AppState, id: string, response: string): Mutation {
  const user = actor(state)
  const item = state.feedback.find((entry) => entry.id === id)
  if (!user || !item) return same(state, "That note is no longer here.")
  const review = state.reviews.find((entry) => entry.id === item.reviewId)
  if (!review) return same(state, "That review is no longer here.")
  if (!isManager(user, review)) return same(state, "Only the owner or an admin can respond.")
  if (item.status === "draft") return same(state, "Wait until the note is submitted.")
  const text = clip(response, 800)
  if (!text) return same(state, "Write a response first.")
  const now = stamp()
  const feedback = state.feedback.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          ownerResponse: text,
          ownerResponseAt: now,
          status: entry.status === "open" ? "acknowledged" as const : entry.status,
          updatedAt: now,
        }
      : entry,
  )
  let next: AppState = { ...state, feedback }
  next = withNotes(next, [item.authorId], {
    kind: "response",
    title: "Owner responded",
    body: `${user.name} responded on ${review.title}.`,
    reviewId: review.id,
  })
  return done(next, "Response saved.")
}

export function saveCriterion(state: AppState, draft: CriterionDraft): Mutation {
  if (!actor(state)) return same(state, "Sign in to edit criteria.")
  const name = clip(draft.name, 80)
  if (!name) return same(state, "Name the criterion.")
  if (!clip(draft.description, 400)) return same(state, "Add a short description.")
  const nowOrder = state.criteria.reduce((max, item) => Math.max(max, item.order), 0) + 1
  const existing = draft.id ? state.criteria.find((item) => item.id === draft.id) : undefined
  const record = {
    id: existing?.id ?? uid("crit"),
    name,
    category: draft.category,
    description: clip(draft.description, 400),
    guidance: clip(draft.guidance, 1000),
    priority: draft.priority,
    active: draft.active,
    order: existing?.order ?? nowOrder,
  }
  const criteria = existing
    ? state.criteria.map((item) => (item.id === record.id ? record : item))
    : [...state.criteria, record]
  return done({ ...state, criteria }, existing ? "Criterion updated." : "Criterion added.", record.id)
}

export function duplicateCriterion(state: AppState, id: string): Mutation {
  const source = state.criteria.find((item) => item.id === id)
  if (!source) return same(state, "That criterion is no longer here.")
  return saveCriterion(state, {
    name: `${source.name} copy`.slice(0, 80),
    category: source.category,
    description: source.description,
    guidance: source.guidance,
    priority: source.priority,
    active: source.active,
  })
}

export function deleteCriterion(state: AppState, id: string): Mutation {
  if (!state.criteria.some((item) => item.id === id)) return same(state, "That criterion is no longer here.")
  return done({
    ...state,
    criteria: state.criteria.filter((item) => item.id !== id),
    reviews: state.reviews.map((review) => ({
      ...review,
      criteriaIds: review.criteriaIds.filter((item) => item !== id),
    })),
    templates: state.templates.map((template) => ({
      ...template,
      criteriaIds: template.criteriaIds.filter((item) => item !== id),
    })),
  }, "Criterion removed.")
}

export function reorderCriterion(state: AppState, id: string, direction: -1 | 1): Mutation {
  const list = [...state.criteria].sort((a, b) => a.order - b.order)
  const index = list.findIndex((item) => item.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= list.length) return same(state, "That criterion cannot move further.")
  const current = list[index]
  const swap = list[target]
  const criteria = state.criteria.map((item) => {
    if (item.id === current.id) return { ...item, order: swap.order }
    if (item.id === swap.id) return { ...item, order: current.order }
    return item
  })
  return done({ ...state, criteria })
}

export function saveTemplate(state: AppState, name: string, criteriaIds: string[]): Mutation {
  const title = clip(name, 80)
  if (!title) return same(state, "Name the template.")
  if (criteriaIds.length === 0) return same(state, "Select at least one criterion.")
  const template = { id: uid("tpl"), name: title, criteriaIds: [...new Set(criteriaIds)] }
  return done({ ...state, templates: [...state.templates, template] }, "Template saved.", template.id)
}

export function deleteTemplate(state: AppState, id: string): Mutation {
  return done({ ...state, templates: state.templates.filter((item) => item.id !== id) }, "Template removed.")
}

function currentTime() {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
}

export function inviteMember(state: AppState, input: { name: string; email: string }): Mutation {
  if (!actor(state)) return same(state, "Sign in to invite someone.")
  const email = clip(input.email, 120).toLowerCase()
  if (!isEmail(email)) return same(state, "Enter a valid email address.")
  const existing = state.users.find((user) => user.email.toLowerCase() === email)
  if (existing) return done(state, `${existing.name} is already in the workspace.`, existing.id)
  const local = email.split("@")[0] ?? "Reviewer"
  const fallback = local.charAt(0).toUpperCase() + local.slice(1)
  const user = {
    id: uid("user"),
    name: clip(input.name, 80) || fallback,
    email,
    role: "member" as const,
    title: "",
    accountStatus: "active" as const,
  }
  return done(
    { ...state, users: [...state.users, user] },
    `${user.name} is in the workspace.`,
    user.id,
  )
}

export function updateMember(
  state: AppState,
  id: string,
  patch: { role?: Role; title?: string },
): Mutation {
  const user = actor(state)
  if (!user || user.role !== "admin") return same(state, "Only an admin can change roles.")
  const target = state.users.find((item) => item.id === id)
  if (!target) return same(state, "That person is no longer here.")
  if (patch.role && patch.role !== "admin" && target.role === "admin") {
    const admins = state.users.filter((item) => item.role === "admin")
    if (admins.length === 1) return same(state, "The workspace needs at least one admin.")
  }
  return done({
    ...state,
    users: state.users.map((item) =>
      item.id === id
        ? { ...item, role: patch.role ?? item.role, title: patch.title !== undefined ? clip(patch.title, 80) : item.title }
        : item,
    ),
  }, "Member updated.")
}

export function removeMember(state: AppState, id: string): Mutation {
  const user = actor(state)
  if (!user || user.role !== "admin") return same(state, "Only an admin can remove a member.")
  if (user.id === id) return same(state, "You cannot remove yourself.")
  const owns = state.reviews.some((review) => review.ownerId === id && review.lifecycle !== "archived")
  const assigned = state.reviews.some((review) => review.reviewers.some((reviewer) => reviewer.userId === id) && review.lifecycle !== "archived")
  if (owns || assigned) return same(state, "Remove them from open reviews before removing them from the workspace.")
  return done({ ...state, users: state.users.filter((item) => item.id !== id) }, "Member removed.")
}

export function updateProfile(state: AppState, patch: { name: string; title: string }): Mutation {
  const user = actor(state)
  if (!user) return same(state, "Sign in to edit your profile.")
  const name = clip(patch.name, 80)
  if (!name) return same(state, "Your name cannot be empty.")
  return done({
    ...state,
    users: state.users.map((item) =>
      item.id === user.id ? { ...item, name, title: clip(patch.title, 80) } : item,
    ),
  }, "Profile saved.")
}

export function updateWorkspace(
  state: AppState,
  patch: { name: string; timezone: string; reminderHours: number | null },
): Mutation {
  const user = actor(state)
  if (!user || user.role !== "admin") return same(state, "Only an admin can change workspace settings.")
  const name = clip(patch.name, 60)
  if (!name) return same(state, "The workspace needs a name.")
  return done({
    ...state,
    workspace: { ...state.workspace, name, timezone: patch.timezone, reminderHours: patch.reminderHours },
  }, "Workspace saved.")
}

export function addProject(state: AppState, name: string): Mutation {
  const user = actor(state)
  if (!user) return same(state, "Sign in to add a project.")
  const project = clip(name, 80)
  if (!project) return same(state, "Enter a project name.")
  if (state.workspace.projects.some((item) => item.toLowerCase() === project.toLowerCase())) {
    return same(state, "That project already exists.")
  }
  return done({ ...state, workspace: { ...state.workspace, projects: [...state.workspace.projects, project] } }, "Project added.")
}

export function renameProject(state: AppState, from: string, to: string): Mutation {
  const user = actor(state)
  if (!user) return same(state, "Sign in to edit a project.")
  const nextName = clip(to, 80)
  if (!nextName) return same(state, "Enter a project name.")
  if (!state.workspace.projects.includes(from)) return same(state, "That project is no longer here.")
  if (state.workspace.projects.some((item) => item !== from && item.toLowerCase() === nextName.toLowerCase())) {
    return same(state, "That project already exists.")
  }
  return done({
    ...state,
    workspace: { ...state.workspace, projects: state.workspace.projects.map((item) => (item === from ? nextName : item)) },
    reviews: state.reviews.map((review) => (review.project === from ? { ...review, project: nextName } : review)),
  }, "Project updated.")
}

export function removeProject(state: AppState, name: string): Mutation {
  const user = actor(state)
  if (!user) return same(state, "Sign in to remove a project.")
  if (!state.workspace.projects.includes(name)) return same(state, "That project is no longer here.")
  return done({
    ...state,
    workspace: { ...state.workspace, projects: state.workspace.projects.filter((item) => item !== name) },
  }, "Project removed.")
}

export function setTheme(state: AppState, theme: "light" | "dark"): Mutation {
  if (!actor(state)) return same(state, "Sign in to change the appearance.")
  return done({ ...state, workspace: { ...state.workspace, theme } })
}

export function markRead(state: AppState, id: string): Mutation {
  return done({
    ...state,
    notifications: state.notifications.map((item) =>
      item.id === id && item.userId === state.currentUserId ? { ...item, read: true } : item,
    ),
  })
}

export function loadSample(state: AppState): Mutation {
  const me = actor(state)
  if (!me) return same(state, "Sign in first.")
  const fresh = createSeed()
  const swap = (id: string) => (id === "user_tashi" ? me.id : id)
  const users = [
    { ...me, role: "admin" as const },
    ...fresh.users.filter((user) => user.id !== "user_tashi" && user.email.toLowerCase() !== me.email.toLowerCase()),
  ]
  return done(
    {
      ...fresh,
      currentUserId: me.id,
      provider: state.provider,
      workspace: { ...fresh.workspace, theme: state.workspace.theme, name: state.workspace.name || fresh.workspace.name },
      users,
      reviews: fresh.reviews.map((review) => ({
        ...review,
        ownerId: swap(review.ownerId),
        reviewers: review.reviewers.map((reviewer) => ({ ...reviewer, userId: swap(reviewer.userId) })),
      })),
      feedback: fresh.feedback.map((item) => ({ ...item, authorId: swap(item.authorId) })),
      notifications: fresh.notifications
        .map((item) => ({ ...item, userId: swap(item.userId) }))
        .filter((item) => users.some((user) => user.id === item.userId)),
      activities: fresh.activities.map((item) => ({ ...item, actorId: swap(item.actorId) })),
    },
    "Sample workspace loaded. You stay signed in as yourself.",
  )
}

export function markAllRead(state: AppState): Mutation {
  return done({
    ...state,
    notifications: state.notifications.map((item) =>
      item.userId === state.currentUserId ? { ...item, read: true } : item,
    ),
  }, "Notifications marked read.")
}
