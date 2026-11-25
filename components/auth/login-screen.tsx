"use client"

import { signOut } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Mark, Spinner } from "@/components/common"
import { refreshWorkspace, useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import { tap } from "@/lib/presentation"

let csrfPromise: Promise<string> | null = null

function csrfToken() {
  csrfPromise ??= fetch("/api/auth/csrf", { headers: { accept: "application/json" } })
    .then(async (response) => {
      const body = (await response.json().catch(() => null)) as { csrfToken?: string } | null
      if (!response.ok || !body?.csrfToken) throw new Error("csrf")
      return body.csrfToken
    })
    .catch((error: unknown) => {
      csrfPromise = null
      throw error
    })
  return csrfPromise
}

async function postCredentials(email: string, password: string, token: string) {
  const response = await fetch("/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "x-auth-return-redirect": "1",
    },
    body: new URLSearchParams({
      email,
      password,
      csrfToken: token,
      callbackUrl: "/dashboard",
    }),
  })
  const body = (await response.json().catch(() => null)) as { url?: string } | null
  const target = body?.url ? new URL(body.url, window.location.origin) : null
  const code = target?.searchParams.get("code") || target?.searchParams.get("error") || ""
  if (!response.ok || !target || code) return code || "failed"
  return "ok" as const
}

export function LoginScreen() {
  const { gate, inviteEmail } = useWorkspace()
  const router = useRouter()
  const params = useSearchParams()
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState("")

  useEffect(() => {
    void csrfToken().catch(() => undefined)
  }, [])

  const error = params.get("error")

  async function finishSignIn() {
    try {
      const token = await csrfToken()
      csrfPromise = null
      const outcome = await postCredentials(email, password, token)
      if (outcome !== "ok") {
        void csrfToken().catch(() => undefined)
        return outcome
      }
    } catch {
      csrfPromise = null
      return "failed" as const
    }
    void refreshWorkspace()
    router.replace("/dashboard")
    return "ok" as const
  }

  async function submitEmail() {
    if (!email.trim() || !password) {
      setNotice("Enter your email and password.")
      return
    }
    if (mode === "sign-up" && !name.trim()) {
      setNotice("Enter your name.")
      return
    }
    setNotice("")
    setPending(true)
    try {
      if (mode === "sign-in") {
        const outcome = await finishSignIn()
        if (outcome === "no_account") {
          const message = "No account for that email. Choose Sign up."
          setNotice(message)
          toast.error(message)
        } else if (outcome !== "ok") {
          const message = outcome === "wrong_password" ? "That password is wrong." : "Sign-in didn’t finish. Try again."
          setNotice(message)
          toast.error(message)
        }
        return
      }
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const body = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null
      if (response.status === 409) {
        const message = "An account with that email already exists. Sign in instead."
        setNotice(message)
        toast.error(message)
        return
      }
      if (!response.ok || !body?.ok) {
        const message = body?.message || "Could not create the account."
        setNotice(message)
        toast.error(message)
        return
      }
      const outcome = await finishSignIn()
      if (outcome !== "ok") {
        const message = "Account created, but sign-in did not finish. Try again."
        setNotice(message)
        toast.error(message)
      }
    } finally {
      setPending(false)
    }
  }

  if (gate === "invite") {
    return (
      <Shell>
        <h1 className="text-[32px] font-semibold tracking-tight">This workspace hasn’t invited you</h1>
        <p className="mt-3 text-[16px] leading-7 text-[#717171]">
          You’re signed in as {inviteEmail || "this account"}. An admin needs to invite that email before you can open reviews.
        </p>
        <button type="button" className={cn("btn mt-8", tap)} onClick={() => signOut({ callbackUrl: "/login" })}>
          Sign out
        </button>
      </Shell>
    )
  }

  return (
    <Shell>
      <div className="grid grid-cols-2 rounded-xl bg-[#F7F7F7] p-1">
        <button
          type="button"
          className={cn("h-10 rounded-lg text-[14px] font-medium", mode === "sign-in" ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-[#717171]", tap)}
          onClick={() => { setMode("sign-in"); setNotice("") }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={cn("h-10 rounded-lg text-[14px] font-medium", mode === "sign-up" ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]" : "text-[#717171]", tap)}
          onClick={() => { setMode("sign-up"); setNotice("") }}
        >
          Sign up
        </button>
      </div>
      <h1 className="mt-8 text-[32px] font-semibold tracking-tight">{mode === "sign-in" ? "Sign in" : "Create an account"}</h1>
      <p className="mt-3 text-[16px] leading-7 text-[#717171]">
        {mode === "sign-in" ? "Use the email and password for your account." : "Your name is how teammates see you in reviews."}
      </p>
      {error || notice ? (
        <p className="mt-4 rounded-xl bg-[#FDECEC] px-3 py-2 text-[13px] text-[#D93B3B]">
          {notice || "Sign-in didn’t finish. Use your email and password."}
        </p>
      ) : null}
      <form
        className="mt-8 space-y-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submitEmail()
        }}
      >
        {mode === "sign-up" ? (
          <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" autoComplete="name" aria-label="Name" />
        ) : null}
        <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" autoComplete="email" aria-label="Email" />
        <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" autoComplete={mode === "sign-up" ? "new-password" : "current-password"} aria-label="Password" minLength={8} />
        {mode === "sign-up" ? <p className="text-[13px] text-[#717171]">Use at least 8 characters.</p> : null}
        <button type="submit" className={cn("btn btn-primary inline-flex w-full items-center justify-center gap-2", tap)} disabled={pending}>
          {pending ? <Spinner className="size-4" /> : null}
          {pending ? (mode === "sign-in" ? "Signing in…" : "Creating account…") : mode === "sign-in" ? "Sign in" : "Create account"}
        </button>
      </form>
      <p className="mt-4 text-[13px] text-[#717171]">
        {mode === "sign-in" ? "New to the workspace? Choose Sign up." : "Already have an account? Choose Sign in."}
      </p>
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        <div className="flex items-center gap-3">
          <Mark />
          <span className="text-[15px] font-semibold tracking-tight">UX Review</span>
        </div>
        <div className="mx-auto w-full max-w-[460px] py-16">{children}</div>
        <p className="text-[12px] text-[#717171]">Asynchronous design reviews</p>
      </section>
      <aside className="hidden bg-[#F7F7F7] lg:flex lg:items-center lg:justify-center lg:p-16">
        <div className="w-full max-w-[440px]">
          <p className="text-[13px] text-[#717171]">A review is a window of time</p>
          <h2 className="mt-2 text-[28px] leading-tight font-semibold tracking-tight">
            Nobody has to be in a room for the review to move.
          </h2>
          <div className="mt-8 space-y-3">
            <PreviewCard title="Access management" meta="Due in 3 days" status="In progress" tone="text-[#B7791F] bg-[#FFF1D6]" />
            <PreviewCard title="Notification preferences" meta="Needs notes today" status="Due today" tone="text-[#FF385C] bg-[#FFE3E8]" />
            <PreviewCard title="Pricing page refresh" meta="Opens tomorrow · 3 reviewers" status="Scheduled" tone="text-[#2B5CC7] bg-[#E8F0FE]" />
          </div>
        </div>
      </aside>
    </div>
  )
}

function PreviewCard({ title, meta, status, tone }: { title: string; meta: string; status: string; tone: string }) {
  return (
    <div className="rounded-2xl bg-white px-4 py-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-[13px] text-[#717171]">{meta}</p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium", tone)}>{status}</span>
      </div>
    </div>
  )
}

