"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Avatar, Boot, Mark } from "@/components/common"
import { signIn, useWorkspace } from "@/lib/store"
import type { Provider } from "@/lib/types"
import { cn } from "@/lib/utils"
import { tap } from "@/lib/presentation"

export function LoginScreen() {
  const { ready, user, users } = useWorkspace()
  const router = useRouter()
  const [provider, setProvider] = useState<Provider | null>(null)

  useEffect(() => {
    if (ready && user) router.replace("/dashboard")
  }, [ready, user, router])

  if (!ready || user) return <Boot label="Opening workspace" />

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <section className="flex flex-col justify-between px-6 py-8 sm:px-12 lg:px-16">
        <div className="flex items-center gap-3">
          <Mark />
          <span className="text-[15px] font-semibold tracking-tight">UX Review</span>
        </div>
        <div className="mx-auto w-full max-w-[420px] py-16">
          {provider ? (
            <>
              <button
                type="button"
                onClick={() => setProvider(null)}
                className={cn("text-[13px] font-medium text-[#717171] hover:text-[#222]", tap)}
              >
                All sign-in options
              </button>
              <h1 className="mt-4 text-[30px] font-semibold tracking-tight">
                Continue with {provider === "google" ? "Google" : "Microsoft"}
              </h1>
              <p className="mt-3 text-[15px] leading-6 text-[#717171]">
                Choose the Sunrise Studio account that matches this email. Membership is separate from sign-in, so an invited reviewer can enter after their first login.
              </p>
              <ul className="mt-8 space-y-2">
                {users.map((person) => (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => {
                        signIn(person.id, provider)
                        router.push("/dashboard")
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-2xl border border-[#EBEBEB] px-3 py-3 text-left hover:bg-[#F7F7F7]",
                        tap,
                      )}
                    >
                      <Avatar user={person} size={40} />
                      <span className="min-w-0">
                        <span className="block truncate text-[15px] font-medium">{person.name}</span>
                        <span className="block truncate text-[13px] text-[#717171]">
                          {person.email}
                          {person.accountStatus === "invited" ? " · Invited" : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h1 className="text-[32px] font-semibold tracking-tight">Welcome to UX Review</h1>
              <p className="mt-3 text-[16px] leading-7 text-[#717171]">
                Sign in to manage your design reviews and collaborate with your team.
              </p>
              <div className="mt-8 space-y-3">
                <ProviderButton provider="google" onClick={() => setProvider("google")} />
                <ProviderButton provider="microsoft" onClick={() => setProvider("microsoft")} />
              </div>
              <p className="mt-6 text-[13px] text-[#717171]">Secure authentication · No separate password required</p>
              <p className="mt-3 text-[13px] leading-5 text-[#717171]">
                This is a sample workspace stored in your browser. These buttons do not contact Google or Microsoft and never ask for a password.
              </p>
            </>
          )}
        </div>
        <p className="text-[12px] text-[#717171]">Sunrise Studio · Asynchronous design reviews</p>
      </section>
      <aside className="hidden bg-[#F7F7F7] lg:flex lg:items-center lg:justify-center lg:p-16">
        <div className="w-full max-w-[440px]">
          <p className="text-[13px] text-[#717171]">A review is a window of time</p>
          <h2 className="mt-2 text-[28px] leading-tight font-semibold tracking-tight">
            Nobody has to be in a room for the review to move.
          </h2>
          <div className="mt-8 space-y-3">
            <PreviewCard
              title="BusinessHub – Access Management"
              meta="Sunrise BusinessHub · Due in 3 days"
              status="In progress"
              tone="text-[#C41E45] bg-[#FFF1F3]"
            />
            <PreviewCard
              title="Notification preferences"
              meta="Needs your notes today"
              status="Due today"
              tone="text-[#8A5A12] bg-[#FBF6EE]"
            />
            <PreviewCard
              title="Pricing page refresh"
              meta="Opens tomorrow · 3 reviewers"
              status="Scheduled"
              tone="text-[#222] bg-white"
            />
          </div>
        </div>
      </aside>
    </div>
  )
}

function ProviderButton({ provider, onClick }: { provider: Provider; onClick: () => void }) {
  const label = provider === "google" ? "Continue with Google" : "Continue with Microsoft"
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[#EBEBEB] bg-white text-[15px] font-medium hover:bg-[#F7F7F7]",
        tap,
      )}
    >
      {provider === "google" ? <GoogleMark /> : <MicrosoftMark />}
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
