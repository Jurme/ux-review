import { auth } from "@/auth"
import { bindSession, emptyWorkspace, isState, type Profile } from "@/lib/access"
import { sql } from "@/lib/db"
import * as mutations from "@/lib/mutations"
import type { AppState, Mutation } from "@/lib/types"

const ID = "main"

type Row = { document: string; revision: number | string }

export async function currentProfile(): Promise<Profile | null> {
  const session = await auth()
  const email = session?.user?.email?.trim().toLowerCase()
  if (!session || !email) return null
  return {
    email,
    name: session.user?.name?.trim() || email,
    provider: session.provider === "microsoft" ? "microsoft" : session.provider === "email" ? "email" : "google",
  }
}

async function readRow() {
  const rows = await sql<Row>("select document, revision from workspace_state where id = $1", [ID])
  const row = rows[0]
  if (!row) return null
  const parsed: unknown = JSON.parse(row.document)
  if (!isState(parsed)) return null
  return { state: parsed, revision: Number(row.revision) }
}

async function insertRow(state: AppState) {
  const rows = await sql<Row>(
    "insert into workspace_state (id, document, revision) values ($1, $2, 1) on conflict (id) do nothing returning document, revision",
    [ID, JSON.stringify(state)],
  )
  return rows[0] ? Number(rows[0].revision) : null
}

async function updateRow(state: AppState, revision: number) {
  const rows = await sql<{ revision: number | string }>(
    "update workspace_state set document = $1, revision = revision + 1, updated_at = now() where id = $2 and revision = $3 returning revision",
    [JSON.stringify(state), ID, revision],
  )
  return rows[0] ? Number(rows[0].revision) : null
}

export async function openWorkspace(profile: Profile, attempt = 0) {
  let row = await readRow()
  if (!row) {
    const created = emptyWorkspace(profile)
    const revision = await insertRow(created)
    if (revision) return { ok: true as const, state: created, revision }
    row = await readRow()
    if (!row) return { ok: false as const, error: "unavailable" as const }
  }
  const bound = bindSession(row.state, profile)
  if (!bound.ok) return { ok: false as const, error: "invite_required" as const, email: profile.email }
  if (!bound.activate) return { ok: true as const, state: bound.state, revision: row.revision }
  const revision = await updateRow(bound.state, row.revision)
  if (!revision) {
    if (attempt > 2) return { ok: false as const, error: "unavailable" as const }
    return openWorkspace(profile, attempt + 1)
  }
  return { ok: true as const, state: bound.state, revision }
}

const actions = {
  saveReview: mutations.saveReview,
  publishReview: mutations.publishReview,
  deleteDraft: mutations.deleteDraft,
  rescheduleReview: mutations.rescheduleReview,
  setLifecycle: mutations.setLifecycle,
  remindReviewer: mutations.remindReviewer,
  setReviewerStatus: mutations.setReviewerStatus,
  saveFeedback: mutations.saveFeedback,
  deleteFeedback: mutations.deleteFeedback,
  setFeedbackStatus: mutations.setFeedbackStatus,
  respondToFeedback: mutations.respondToFeedback,
  saveCriterion: mutations.saveCriterion,
  duplicateCriterion: mutations.duplicateCriterion,
  deleteCriterion: mutations.deleteCriterion,
  reorderCriterion: mutations.reorderCriterion,
  saveTemplate: mutations.saveTemplate,
  deleteTemplate: mutations.deleteTemplate,
  inviteMember: mutations.inviteMember,
  updateMember: mutations.updateMember,
  removeMember: mutations.removeMember,
  updateProfile: mutations.updateProfile,
  updateWorkspace: mutations.updateWorkspace,
  addProject: mutations.addProject,
  removeProject: mutations.removeProject,
  setTheme: mutations.setTheme,
  markRead: mutations.markRead,
  markAllRead: mutations.markAllRead,
  resetDemo: mutations.loadSample,
} as const

export type ActionName = keyof typeof actions

export function isAction(value: unknown): value is ActionName {
  return typeof value === "string" && value in actions
}

export async function mutateWorkspace(profile: Profile, action: ActionName, args: unknown[], expected: number) {
  const opened = await openWorkspace(profile)
  if (!opened.ok) return opened
  if (opened.revision !== expected) return { ok: false as const, error: "conflict" as const }
  const run = actions[action] as (state: AppState, ...rest: unknown[]) => Mutation
  const result = run(opened.state, ...args)
  if (!result.ok) return { ok: false as const, error: "rejected" as const, message: result.message, state: opened.state, revision: opened.revision }
  const revision = await updateRow(result.state, opened.revision)
  if (!revision) return { ok: false as const, error: "conflict" as const }
  return { ok: true as const, message: result.message, id: result.id, state: result.state, revision }
}
