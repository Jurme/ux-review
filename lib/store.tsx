"use client"

import { useSyncExternalStore } from "react"
import type { AppState, Mutation } from "@/lib/types"

type Snap =
  | { gate: "loading" }
  | { gate: "signed_out" }
  | { gate: "invite"; email: string }
  | { gate: "ready"; state: AppState; revision: number }

const LOADING: Snap = { gate: "loading" }
let snap: Snap = LOADING
let revision = 0
let started = false
let queue: Promise<void> = Promise.resolve()
const listeners = new Set<() => void>()

function publish(next: Snap) {
  snap = next
  if (next.gate === "ready") revision = next.revision
  listeners.forEach((listener) => listener())
}

export async function refreshWorkspace() {
  try {
    const response = await fetch("/api/workspace", { cache: "no-store", signal: AbortSignal.timeout(8000) })
    if (response.status === 401) {
      publish({ gate: "signed_out" })
      return
    }
    const body = (await response.json().catch(() => null)) as { state?: AppState; revision?: number; email?: string } | null
    if (response.status === 403) {
      publish({ gate: "invite", email: body?.email ?? "" })
      return
    }
    if (!response.ok || !body?.state || typeof body.revision !== "number") {
      publish({ gate: "signed_out" })
      return
    }
    publish({ gate: "ready", state: body.state, revision: body.revision })
  } catch {
    publish({ gate: "signed_out" })
  }
}

function bootstrap() {
  if (started || typeof window === "undefined") return
  started = true
  void refreshWorkspace()
}

function read(): Snap {
  bootstrap()
  return snap
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useWorkspace() {
  const current = useSyncExternalStore(subscribe, read, () => LOADING)
  const state = current.gate === "ready" ? current.state : null
  const user = state?.users.find((item) => item.id === state.currentUserId) ?? null
  return {
    ready: current.gate !== "loading",
    gate: current.gate,
    inviteEmail: current.gate === "invite" ? current.email : "",
    state,
    user,
    workspace: state?.workspace ?? null,
    users: state?.users ?? [],
    criteria: state?.criteria ?? [],
    templates: state?.templates ?? [],
    reviews: state?.reviews ?? [],
    feedback: state?.feedback ?? [],
    notifications: state?.notifications.filter((item) => item.userId === user?.id) ?? [],
    activities: state?.activities ?? [],
    provider: state?.provider ?? null,
    unread: state?.notifications.filter((item) => item.userId === user?.id && !item.read).length ?? 0,
  }
}

async function send(action: string, args: unknown[], retry: boolean): Promise<Mutation> {
  const response = await fetch("/api/mutate", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, args, revision }),
  })
  if (response.status === 401) {
    publish({ gate: "signed_out" })
    return { state: fallbackState(), ok: false, message: "Sign in again." }
  }
  if (response.status === 409 && retry) {
    await refreshWorkspace()
    return send(action, args, false)
  }
  const body = (await response.json().catch(() => null)) as { ok?: boolean; message?: string; id?: string; state?: AppState; revision?: number; email?: string } | null
  if (response.status === 403) {
    publish({ gate: "invite", email: body?.email ?? "" })
    return { state: fallbackState(), ok: false, message: "This workspace has not invited you." }
  }
  if (body?.state && typeof body.revision === "number") {
    publish({ gate: "ready", state: body.state, revision: body.revision })
  }
  return {
    state: body?.state ?? fallbackState(),
    ok: Boolean(body?.ok),
    message: body?.message,
    id: body?.id,
  }
}

function fallbackState(): AppState {
  if (snap.gate === "ready") return snap.state
  return {
    version: 1,
    currentUserId: null,
    provider: null,
    workspace: { name: "UX Review", timezone: "Asia/Thimphu", reminderHours: 20, projects: [], theme: "light" },
    users: [],
    criteria: [],
    templates: [],
    reviews: [],
    feedback: [],
    notifications: [],
    activities: [],
  }
}

function run(action: string, args: unknown[]): Promise<Mutation> {
  if (snap.gate !== "ready") return Promise.resolve({ state: fallbackState(), ok: false, message: "The workspace is still opening." })
  const job = queue.then(() => send(action, args, true))
  queue = job.then(() => undefined, () => undefined)
  return job
}

export function saveReview(...args: unknown[]) {
  return run("saveReview", args)
}

export function publishReview(id: string) {
  return run("publishReview", [id])
}

export function deleteDraft(id: string) {
  return run("deleteDraft", [id])
}

export function rescheduleReview(id: string, startDate: string) {
  return run("rescheduleReview", [id, startDate])
}

export function setLifecycle(...args: unknown[]) {
  return run("setLifecycle", args)
}

export function remindReviewer(reviewId: string, userId: string) {
  return run("remindReviewer", [reviewId, userId])
}

export function setReviewerStatus(...args: unknown[]) {
  return run("setReviewerStatus", args)
}

export function saveFeedback(...args: unknown[]) {
  return run("saveFeedback", args)
}

export function deleteFeedback(id: string) {
  return run("deleteFeedback", [id])
}

export function setFeedbackStatus(...args: unknown[]) {
  return run("setFeedbackStatus", args)
}

export function respondToFeedback(id: string, response: string) {
  return run("respondToFeedback", [id, response])
}

export function saveCriterion(...args: unknown[]) {
  return run("saveCriterion", args)
}

export function duplicateCriterion(id: string) {
  return run("duplicateCriterion", [id])
}

export function deleteCriterion(id: string) {
  return run("deleteCriterion", [id])
}

export function reorderCriterion(id: string, direction: -1 | 1) {
  return run("reorderCriterion", [id, direction])
}

export function saveTemplate(name: string, criteriaIds: string[]) {
  return run("saveTemplate", [name, criteriaIds])
}

export function deleteTemplate(id: string) {
  return run("deleteTemplate", [id])
}

export function inviteMember(input: { name: string; email: string }) {
  return run("inviteMember", [input])
}

export function updateMember(...args: unknown[]) {
  return run("updateMember", args)
}

export function removeMember(id: string) {
  return run("removeMember", [id])
}

export function updateProfile(patch: { name: string; title: string }) {
  return run("updateProfile", [patch])
}

export function updateWorkspace(patch: { name: string; timezone: string; reminderHours: number | null }) {
  return run("updateWorkspace", [patch])
}

export function addProject(name: string) {
  return run("addProject", [name])
}

export function renameProject(from: string, to: string) {
  return run("renameProject", [from, to])
}

export function removeProject(name: string) {
  return run("removeProject", [name])
}

export function setTheme(theme: "light" | "dark") {
  return run("setTheme", [theme])
}

export function markRead(id: string) {
  return run("markRead", [id])
}

export function markAllRead() {
  return run("markAllRead", [])
}

export function resetDemo() {
  return run("resetDemo", [])
}
