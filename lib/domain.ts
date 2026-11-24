import { diffDays, normalizeHttpUrl, todayISO } from "@/lib/format"
import type {
  Feedback,
  FeedbackDraft,
  Phase,
  Review,
  ReviewDraft,
  User,
} from "@/lib/types"

export function phaseOf(review: Review, today = todayISO()): Phase {
  if (review.lifecycle === "draft") return "draft"
  if (review.lifecycle === "archived") return "archived"
  if (review.lifecycle === "completed") return "completed"
  if (review.startDate > today) return "scheduled"
  const unfinished = review.reviewers.some((reviewer) => reviewer.status !== "completed")
  if (unfinished && review.deadline < today) return "feedback_pending"
  return "in_progress"
}

export function completionOf(review: Review) {
  if (review.reviewers.length === 0) return 0
  const done = review.reviewers.filter((reviewer) => reviewer.status === "completed").length
  return Math.round((done / review.reviewers.length) * 100)
}

export function readyToClose(review: Review) {
  return (
    review.lifecycle === "open" &&
    review.reviewers.length > 0 &&
    review.reviewers.every((reviewer) => reviewer.status === "completed")
  )
}

export function isManager(user: User | null | undefined, review: Review) {
  if (!user) return false
  return user.role === "admin" || user.id === review.ownerId
}

export function canSeeReview(user: User | null | undefined, review: Review) {
  if (!user) return false
  if (review.lifecycle !== "draft") return true
  return isManager(user, review)
}

export function assignmentFor(review: Review, userId: string) {
  return review.reviewers.find((reviewer) => reviewer.userId === userId)
}

export function visibleFeedback(review: Review, user: User | null, feedback: Feedback[]) {
  return feedback.filter((item) => {
    if (item.reviewId !== review.id || !user) return false
    if (item.status === "draft") return item.authorId === user.id
    if (isManager(user, review) || item.authorId === user.id) return true
    return review.shareFeedback
  })
}

export function submittedCount(feedback: Feedback[], reviewId: string, userId?: string) {
  return feedback.filter(
    (item) =>
      item.reviewId === reviewId &&
      item.status !== "draft" &&
      (!userId || item.authorId === userId),
  ).length
}

export function reminderDue(review: Review, today = todayISO()) {
  if (review.lifecycle !== "open" || !review.reminderHours) return false
  const days = diffDays(today, review.deadline)
  const windowDays = Math.max(0, Math.ceil(review.reminderHours / 24))
  const pending = review.reviewers.some((reviewer) => reviewer.status !== "completed")
  return pending && days >= 0 && days <= windowDays
}

export function overlapsRange(review: Review, start: string, end: string) {
  return review.startDate <= end && review.deadline >= start
}

export function validateReview(draft: ReviewDraft, mode: "draft" | "publish") {
  const errors: string[] = []
  if (!draft.title.trim()) errors.push("Add a review title.")
  if (draft.startDate && draft.deadline && draft.deadline < draft.startDate) {
    errors.push("The deadline has to be on or after the start date.")
  }
  if (
    draft.startTime &&
    draft.endTime &&
    draft.startDate &&
    draft.startDate === draft.deadline &&
    draft.endTime <= draft.startTime
  ) {
    errors.push("The end time has to be later than the start time.")
  }
  if (mode === "draft") return errors
  if (!draft.project.trim()) errors.push("Add a project name.")
  if (!normalizeHttpUrl(draft.figmaUrl)) errors.push("Add a Figma link, including https://.")
  if (!draft.startDate || !draft.deadline) errors.push("Set a start date and a deadline.")
  if (draft.reviewers.length === 0) errors.push("Add at least one reviewer.")
  if (draft.criteriaIds.length === 0) errors.push("Choose at least one criterion.")
  if (draft.referenceUrls.some((url) => url.trim() && !normalizeHttpUrl(url))) {
    errors.push("Reference links need to be valid web addresses.")
  }
  return errors
}

export function validateFeedback(draft: FeedbackDraft, mode: "draft" | "submit") {
  const errors: string[] = []
  if (!draft.criterionId) errors.push("Choose a criterion.")
  if (!draft.observation.trim()) errors.push("Write what you noticed.")
  if (mode === "submit" && !draft.feedback.trim()) errors.push("Explain why it matters.")
  if (draft.figmaLink.trim() && !normalizeHttpUrl(draft.figmaLink)) {
    errors.push("The Figma comment link needs to be a valid URL.")
  }
  return errors
}

export function reviewToDraft(review: Review): ReviewDraft {
  return {
    title: review.title,
    project: review.project,
    feature: review.feature,
    description: review.description,
    ownerId: review.ownerId,
    figmaUrl: review.figmaUrl,
    designVersion: review.designVersion,
    referenceUrls: review.referenceUrls,
    startDate: review.startDate,
    deadline: review.deadline,
    startTime: review.startTime,
    endTime: review.endTime,
    timezone: review.timezone,
    reminderHours: review.reminderHours,
    shareFeedback: review.shareFeedback,
    criteriaIds: review.criteriaIds,
    reviewers: review.reviewers.map((reviewer) => ({
      userId: reviewer.userId,
      focus: reviewer.focus,
    })),
  }
}

export function userMap(users: User[]) {
  return new Map(users.map((user) => [user.id, user]))
}
