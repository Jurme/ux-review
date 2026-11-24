"use client"

import { signIn, signOut } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { Boot, Mark } from "@/components/common"
import { refreshWorkspace, useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import { tap } from "@/lib/presentation"

export function LoginScreen() {
  const { ready, user, gate, inviteEmail } = useWorkspace()
  const router = useRouter()
  const params = useSearchParams()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState("")
  const [providers, setProviders] = useState<{ google: boolean; microsoft: boolean } | null>(null)

  useEffect(() => {
    if (ready && user) router.replace("/dashboard")
  }, [ready, user, router])

  useEffect(() => {
    const controller = new AbortController()
    void fetch("/api/auth/providers", { signal: controller.signal })
      .then((response) => response.json())
      .then((body: Record<string, unknown>) => {
        setProviders({ google: "google" in body, microsoft: "microsoft-entra-id" in body })
      })
      .catch(() => {
        if (!controller.signal.aborted) setProviders({ google: false, microsoft: false })
      })
    return () => controller.abort()
  }, [])

  if (ready && user) return <Boot label="Opening workspace" />

  const error = params.get("error")

  async function finishSignIn() {
    let result
    try {
      result = await signIn("credentials", { email, password, redirect: false, redirectTo: "/dashboard" })
    } catch {
      const message = "Sign-in didn’t finish. Try again."
      setNotice(message)
      toast.error(message)
      return true
    }
    if (!result || result.error || result.ok === false) return false
    await refreshWorkspace()
    router.push("/dashboard")
    router.refresh()
    return true
  }

  async function submitEmail() {
    if (!email.trim() || !password) {
      setNotice("Enter your email and password.")
      return
    }
    setNotice("")
    setPending(true)
    try {
      if (await finishSignIn()) return
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const body = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null
      if (response.status === 409) {
        const message = "That email or password is wrong."
        setNotice(message)
        toast.error(message)
        return
      }
      if (!response.ok || !body?.ok) {
        const message = body?.message || "Enter your name to create an account."
        setNotice(message)
        toast.error(message)
        return
      }
      if (!(await finishSignIn())) {
        const message = "Account created, but sign-in did not finish. Try again."
        setNotice(message)
        toast.error(message)
      }
    } finally {
      setPending(false)
    }
  }

  function startProvider(kind: "google" | "microsoft") {
    const available = kind === "google" ? providers?.google : providers?.microsoft
    if (!available) {
      const message = "Google and Microsoft aren’t connected on this server yet. Sign in with email and password."
      setNotice(message)
      toast.error(message)
      return
    }
    void signIn(kind === "google" ? "google" : "microsoft-entra-id", { callbackUrl: "/dashboard" })
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
      <h1 className="text-[32px] font-semibold tracking-tight">Welcome to UX Review</h1>
      <p className="mt-3 text-[16px] leading-7 text-[#717171]">
        Sign in with Google, Microsoft, or your email. You’ll land in the workspace as yourself.
      </p>
      {error || notice ? (
        <p className="mt-4 rounded-xl bg-[#FDECEC] px-3 py-2 text-[13px] text-[#D93B3B]">
          {notice || "Google or Microsoft didn’t finish. Use your email and password below."}
        </p>
      ) : null}
      <div className="mt-8 space-y-3">
        <ProviderButton label="Continue with Google" mark={<GoogleMark />} onClick={() => startProvider("google")} />
        <ProviderButton label="Continue with Microsoft" mark={<MicrosoftMark />} onClick={() => startProvider("microsoft")} />
      </div>
      <div className="my-6 flex items-center gap-3 text-[12px] text-[#717171]">
        <span className="h-px flex-1 bg-[#EBEBEB]" />
        or
        <span className="h-px flex-1 bg-[#EBEBEB]" />
      </div>
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          void submitEmail()
        }}
      >
        <input className="field" value={name} onChange={(event) => setName(event.target.value)} placeholder="Name, if this is your first time" autoComplete="name" aria-label="Name" />
        <input className="field" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" autoComplete="email" aria-label="Email" />
        <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" autoComplete="current-password" aria-label="Password" />
        <button type="submit" className={cn("btn btn-primary w-full", tap)} disabled={pending}>
          {pending ? "Please wait…" : "Continue"}
        </button>
      </form>
      <p className="mt-4 text-[13px] text-[#717171]">Use the same email next time. A new email creates your account and opens the workspace.</p>
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

function ProviderButton({ label, mark, onClick }: { label: string; mark: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#EBEBEB] bg-white text-[15px] font-medium hover:bg-[#F7F7F7]",
        tap,
      )}
    >
      {mark}
      {label}
    </button>
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

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path fill="#4285F4" d="M17.6 9.2c0-.6-.1-1.2-.2-1.8H9v3.4h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.7-3.9 2.7-6.5z" />
      <path fill="#34A853" d="M9 18c2.4 0 4.5-.8 6-2.2l-2.9-2.2c-.8.6-1.9.9-3.1.9-2.4 0-4.4-1.6-5.1-3.8H.9v2.3A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.9 10.7A5.4 5.4 0 0 1 3.6 9c0-.6.1-1.2.3-1.7V5H.9A9 9 0 0 0 0 9c0 1.4.3 2.8.9 4l3-2.3z" />
      <path fill="#EA4335" d="M9 3.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 .9 5l3 2.3C4.6 5.2 6.6 3.6 9 3.6z" />
    </svg>
  )
}

function MicrosoftMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path fill="#F25022" d="M1 1h6.5v6.5H1z" />
      <path fill="#7FBA00" d="M8.5 1H15v6.5H8.5z" />
      <path fill="#00A4EF" d="M1 8.5h6.5V15H1z" />
      <path fill="#FFB900" d="M8.5 8.5H15V15H8.5z" />
    </svg>
  )
}
