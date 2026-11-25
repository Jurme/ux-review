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
  const unfinished = review.reviewers.some((reviewer) => reviewer.userId !== review.ownerId && reviewer.status !== "completed")
  if (unfinished && review.deadline < today) return "feedback_pending"
  return "in_progress"
}

export function assignedReviewers(review: Review) {
  return review.reviewers.filter((reviewer) => reviewer.userId !== review.ownerId)
}

export function completionOf(review: Review) {
  const reviewers = assignedReviewers(review)
  if (reviewers.length === 0) return 0
  const done = reviewers.filter((reviewer) => reviewer.status === "completed").length
  return Math.round((done / reviewers.length) * 100)
}

export function readyToClose(review: Review) {
  const reviewers = assignedReviewers(review)
  return review.lifecycle === "open" && reviewers.length > 0 && reviewers.every((reviewer) => reviewer.status === "completed")
}

export function reviewBucket(userId: string, review: Review): "sent" | "invited" | "other" {
  if (review.ownerId === userId) return "sent"
  if (review.reviewers.some((reviewer) => reviewer.userId === userId)) return "invited"
  return "other"
}

export function appearanceOf(
  user: { theme?: "light" | "dark" } | null | undefined,
  workspace: { theme?: "light" | "dark" } | null | undefined,
) {
  return user?.theme ?? workspace?.theme ?? "light"
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
    return true
  })
}

export type ReviewListStatus = "pending" | "in_progress" | "completed"

export function reviewListStatus(reviewId: string, feedback: Feedback[], ownerId?: string): ReviewListStatus {
  const people = new Set(
    feedback
      .filter((item) => item.reviewId === reviewId && item.status !== "draft" && item.authorId !== ownerId)
      .map((item) => item.authorId),
  )
  if (people.size >= 3) return "completed"
  if (people.size >= 1) return "in_progress"
  return "pending"
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
  const pending = review.reviewers.some((reviewer) => reviewer.status !== "completed")
  return pending && days === 0
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
  if (!draft.project.trim()) errors.push("Choose a project.")
  if (!normalizeHttpUrl(draft.figmaUrl)) errors.push("Add a valid Figma URL starting with https://.")
  if (!draft.startDate || !draft.deadline) errors.push("Pick the day this review is sent.")
  if (draft.referenceUrls.some((url) => url.trim() && !normalizeHttpUrl(url))) {
    errors.push("Reference links need to be valid web addresses.")
  }
  return errors
}

export function validateFeedback(draft: FeedbackDraft, mode: "draft" | "submit") {
  void mode
  const errors: string[] = []
  if (!draft.criterionId) errors.push("Choose a criterion.")
  if (!draft.observation.trim()) errors.push("Write what you noticed.")
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
