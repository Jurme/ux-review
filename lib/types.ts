export type Role = "admin" | "member"
export type AccountStatus = "active" | "invited"
export type Provider = "google" | "microsoft" | "email"
export type Lifecycle = "draft" | "open" | "completed" | "archived"
export type Phase =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "feedback_pending"
  | "completed"
  | "archived"
export type ReviewerStatus = "pending" | "in_progress" | "completed"
export type Category = "UX" | "UI" | "Accessibility" | "Technical" | "Business"
export type Priority = "low" | "medium" | "high"
export type Severity = "critical" | "major" | "minor" | "suggestion"
export type FeedbackStatus = "draft" | "open" | "acknowledged" | "resolved"
export type NotificationKind =
  | "invited"
  | "published"
  | "feedback"
  | "response"
  | "rescheduled"
  | "reminder"
  | "completed"
  | "reopened"

export type User = {
  id: string
  name: string
  email: string
  role: Role
  title: string
  accountStatus: AccountStatus
}

export type Workspace = {
  name: string
  timezone: string
  reminderHours: number | null
  projects: string[]
  theme: "light" | "dark"
}

export type Criterion = {
  id: string
  name: string
  category: Category
  description: string
  guidance: string
  priority: Priority | null
  active: boolean
  order: number
}

export type CriteriaTemplate = {
  id: string
  name: string
  criteriaIds: string[]
}

export type ReviewerAssignment = {
  userId: string
  focus: string
  status: ReviewerStatus
}

export type Review = {
  id: string
  title: string
  project: string
  feature: string
  description: string
  ownerId: string
  figmaUrl: string
  designVersion: string
  referenceUrls: string[]
  startDate: string
  deadline: string
  startTime: string
  endTime: string
  timezone: string
  reminderHours: number | null
  lifecycle: Lifecycle
  shareFeedback: boolean
  criteriaIds: string[]
  reviewers: ReviewerAssignment[]
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export type Feedback = {
  id: string
  reviewId: string
  criterionId: string
  authorId: string
  observation: string
  feedback: string
  recommendation: string
  severity: Severity
  figmaLink: string
  status: FeedbackStatus
  ownerResponse: string
  ownerResponseAt?: string
  createdAt: string
  updatedAt: string
}

export type Notification = {
  id: string
  userId: string
  title: string
  body: string
  reviewId?: string
  kind: NotificationKind
  read: boolean
  createdAt: string
}

export type Activity = {
  id: string
  type:
    | "created"
    | "published"
    | "invited"
    | "feedback"
    | "completed"
    | "updated"
    | "rescheduled"
    | "reminder"
    | "archived"
    | "reopened"
  message: string
  reviewId?: string
  actorId: string
  createdAt: string
}

export type AppState = {
  version: 1
  currentUserId: string | null
  provider: Provider | null
  workspace: Workspace
  users: User[]
  criteria: Criterion[]
  templates: CriteriaTemplate[]
  reviews: Review[]
  feedback: Feedback[]
  notifications: Notification[]
  activities: Activity[]
}

export type ReviewDraft = {
  title: string
  project: string
  feature: string
  description: string
  ownerId: string
  figmaUrl: string
  designVersion: string
  referenceUrls: string[]
  startDate: string
  deadline: string
  startTime: string
  endTime: string
  timezone: string
  reminderHours: number | null
  shareFeedback: boolean
  criteriaIds: string[]
  reviewers: { userId: string; focus: string }[]
}

export type FeedbackDraft = {
  id?: string
  reviewId: string
  criterionId: string
  observation: string
  feedback: string
  recommendation: string
  severity: Severity
  figmaLink: string
}

export type CriterionDraft = {
  id?: string
  name: string
  category: Category
  description: string
  guidance: string
  priority: Priority | null
  active: boolean
}

export type Mutation = {
  state: AppState
  ok: boolean
  message?: string
  id?: string
}
