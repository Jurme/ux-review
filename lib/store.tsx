"use client"

import { useSyncExternalStore } from "react"
import { createSeed } from "@/lib/seed"
import * as mutations from "@/lib/mutations"
import type { AppState, Mutation, Provider } from "@/lib/types"

const KEY = "ux-review.v1"

let memory: AppState | null = null
let bootstrapped = false
const listeners = new Set<() => void>()

function isState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false
  const candidate = value as AppState
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.users) &&
    Array.isArray(candidate.reviews) &&
    Array.isArray(candidate.criteria) &&
    Array.isArray(candidate.feedback)
  )
}

function bootstrap() {
  if (bootstrapped || typeof window === "undefined") return
  bootstrapped = true
  try {
    const raw = window.localStorage.getItem(KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isState(parsed)) {
        memory = {
          ...parsed,
          templates: parsed.templates ?? [],
          notifications: parsed.notifications ?? [],
          activities: parsed.activities ?? [],
          provider: parsed.provider ?? null,
        }
        return
      }
    }
  } catch {
    memory = null
  }
  memory = createSeed()
  window.localStorage.setItem(KEY, JSON.stringify(memory))
}

function commit(next: AppState) {
  memory = next
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next))
  listeners.forEach((listener) => listener())
}

function apply(result: Mutation) {
  if (result.ok && result.state !== memory) commit(result.state)
  return result
}

function read(): AppState | null {
  bootstrap()
  return memory
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useWorkspace() {
  const state = useSyncExternalStore(subscribe, read, () => null)
  const user = state?.users.find((item) => item.id === state.currentUserId) ?? null
  return {
    ready: state !== null,
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

function run(mutate: (state: AppState) => Mutation): Mutation {
  if (!memory) return { state: createSeed(), ok: false, message: "The workspace is still opening." }
  return apply(mutate(memory))
}

export function signIn(userId: string, provider: Provider) {
  return run((state) => mutations.signIn(state, userId, provider))
}

export function signOut() {
  return run((state) => mutations.signOut(state))
}

export function saveReview(...args: Parameters<typeof mutations.saveReview> extends [AppState, ...infer Rest] ? Rest : never) {
  return run((state) => mutations.saveReview(state, ...args))
}

export function publishReview(id: string) {
  return run((state) => mutations.publishReview(state, id))
}

export function deleteDraft(id: string) {
  return run((state) => mutations.deleteDraft(state, id))
}

export function rescheduleReview(id: string, startDate: string) {
  return run((state) => mutations.rescheduleReview(state, id, startDate))
}

export function setLifecycle(...args: Parameters<typeof mutations.setLifecycle> extends [AppState, ...infer Rest] ? Rest : never) {
  return run((state) => mutations.setLifecycle(state, ...args))
}

export function remindReviewer(reviewId: string, userId: string) {
  return run((state) => mutations.remindReviewer(state, reviewId, userId))
}

export function setReviewerStatus(...args: Parameters<typeof mutations.setReviewerStatus> extends [AppState, ...infer Rest] ? Rest : never) {
  return run((state) => mutations.setReviewerStatus(state, ...args))
}

export function saveFeedback(...args: Parameters<typeof mutations.saveFeedback> extends [AppState, ...infer Rest] ? Rest : never) {
  return run((state) => mutations.saveFeedback(state, ...args))
}

export function deleteFeedback(id: string) {
  return run((state) => mutations.deleteFeedback(state, id))
}

export function setFeedbackStatus(...args: Parameters<typeof mutations.setFeedbackStatus> extends [AppState, ...infer Rest] ? Rest : never) {
  return run((state) => mutations.setFeedbackStatus(state, ...args))
}

export function respondToFeedback(id: string, response: string) {
  return run((state) => mutations.respondToFeedback(state, id, response))
}

export function saveCriterion(...args: Parameters<typeof mutations.saveCriterion> extends [AppState, ...infer Rest] ? Rest : never) {
  return run((state) => mutations.saveCriterion(state, ...args))
}

export function duplicateCriterion(id: string) {
  return run((state) => mutations.duplicateCriterion(state, id))
}

export function deleteCriterion(id: string) {
  return run((state) => mutations.deleteCriterion(state, id))
}

export function reorderCriterion(id: string, direction: -1 | 1) {
  return run((state) => mutations.reorderCriterion(state, id, direction))
}

export function saveTemplate(name: string, criteriaIds: string[]) {
  return run((state) => mutations.saveTemplate(state, name, criteriaIds))
}

export function deleteTemplate(id: string) {
  return run((state) => mutations.deleteTemplate(state, id))
}

export function inviteMember(input: { name: string; email: string }) {
  return run((state) => mutations.inviteMember(state, input))
}

export function updateMember(...args: Parameters<typeof mutations.updateMember> extends [AppState, ...infer Rest] ? Rest : never) {
  return run((state) => mutations.updateMember(state, ...args))
}

export function removeMember(id: string) {
  return run((state) => mutations.removeMember(state, id))
}

export function updateProfile(patch: { name: string; title: string }) {
  return run((state) => mutations.updateProfile(state, patch))
}

export function updateWorkspace(patch: { name: string; timezone: string; reminderHours: number | null }) {
  return run((state) => mutations.updateWorkspace(state, patch))
}

export function markRead(id: string) {
  return run((state) => mutations.markRead(state, id))
}

export function markAllRead() {
  return run((state) => mutations.markAllRead(state))
}

export function resetDemo() {
  return run((state) => {
    const fresh = createSeed()
    const stillThere = fresh.users.some((user) => user.id === state.currentUserId)
    return {
      state: {
        ...fresh,
        currentUserId: stillThere ? state.currentUserId : "user_tashi",
        provider: state.provider,
      },
      ok: true,
      message: "Sample workspace restored.",
    }
  })
}
