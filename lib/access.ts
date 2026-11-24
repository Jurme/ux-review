import { uid } from "@/lib/format"
import type { AppState, Provider, User } from "@/lib/types"

export type Profile = { email: string; name: string; provider: Provider }

export function isState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false
  const candidate = value as AppState
  return (
    candidate.version === 1 &&
    Array.isArray(candidate.users) &&
    Array.isArray(candidate.reviews) &&
    Array.isArray(candidate.criteria) &&
    Array.isArray(candidate.feedback) &&
    candidate.workspace !== null &&
    typeof candidate.workspace === "object"
  )
}

export function emptyWorkspace(profile: Profile): AppState {
  const user: User = {
    id: uid("user"),
    name: profile.name.trim() || profile.email,
    email: profile.email.toLowerCase(),
    role: "admin",
    title: "",
    accountStatus: "active",
  }
  return {
    version: 1,
    currentUserId: user.id,
    provider: profile.provider,
    workspace: {
      name: "UX Review",
      timezone: "Asia/Thimphu",
      reminderHours: 20,
      projects: [],
      theme: "light",
    },
    users: [user],
    criteria: [],
    templates: [],
    reviews: [],
    feedback: [],
    notifications: [],
    activities: [],
  }
}

export function bindSession(
  state: AppState,
  profile: Profile,
): { ok: true; state: AppState; activate: boolean } | { ok: false; error: "invite_required" } {
  const email = profile.email.toLowerCase()
  const existing = state.users.find((user) => user.email.toLowerCase() === email)
  if (!existing) {
    if (state.users.length === 0) return { ok: true, state: emptyWorkspace(profile), activate: true }
    const member: User = {
      id: uid("user"),
      name: profile.name.trim() || email,
      email,
      role: "member",
      title: "",
      accountStatus: "active",
    }
    return {
      ok: true,
      activate: true,
      state: {
        ...state,
        currentUserId: member.id,
        provider: profile.provider,
        users: [...state.users, member],
      },
    }
  }
  const name = existing.accountStatus === "invited" && profile.name.trim() ? profile.name.trim() : existing.name
  const activate = existing.accountStatus !== "active" || existing.name !== name
  return {
    ok: true,
    activate,
    state: {
      ...state,
      currentUserId: existing.id,
      provider: profile.provider,
      users: state.users.map((user) =>
        user.id === existing.id ? { ...user, accountStatus: "active", name } : user,
      ),
    },
  }
}
