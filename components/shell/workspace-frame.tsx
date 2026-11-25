"use client"

import { Menu } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { Boot, Mark } from "@/components/common"
import { Sidebar } from "@/components/shell/sidebar"
import { leaveWorkspace, useWorkspace } from "@/lib/store"
import { tap } from "@/lib/presentation"
import { cn } from "@/lib/utils"
import { signOut } from "next-auth/react"

export function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  const { ready, user, gate, inviteEmail } = useWorkspace()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    if (ready && gate === "signed_out") router.replace("/login")
  }, [ready, gate, router])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (!ready || gate === "loading" || gate === "signed_out") {
    return (
      <>
        <Boot />
        <div className="hidden">{children}</div>
      </>
    )
  }
  if (gate === "invite" || !user) {
    return (
      <div className="grid min-h-dvh place-items-center px-6">
        <div className="max-w-md">
          <h1 className="text-[28px] font-semibold tracking-tight">This workspace hasn’t invited you</h1>
          <p className="mt-3 text-[15px] leading-6 text-[#717171]">
            You’re signed in as {inviteEmail || "this account"}. Ask an admin to invite that email, then sign in again.
          </p>
          <button type="button" className={cn("btn mt-6", tap)} onClick={() => { leaveWorkspace(); void signOut({ callbackUrl: "/login" }) }}>Sign out</button>
        </div>
        <div className="hidden">{children}</div>
      </div>
    )
  }

  return (
    <div className="flex h-dvh gap-3 overflow-hidden bg-[var(--canvas)] p-3 text-[var(--foreground)]">
      <aside className={collapsed ? "hidden w-[88px] shrink-0 md:block" : "hidden w-[232px] shrink-0 md:block"}>
        <Suspense fallback={null}>
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
        </Suspense>
      </aside>
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-black/30" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-[280px] bg-[var(--canvas)]">
            <Suspense fallback={null}>
              <Sidebar onNavigate={() => setOpen(false)} />
            </Suspense>
          </aside>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--background)] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
        <header className="flex h-14 items-center justify-between border-b border-[var(--border)] px-4 md:hidden">
          <button type="button" className={tap} aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Mark className="size-7" />
            UX Review
          </Link>
          <span className="size-5" />
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
