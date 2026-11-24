"use client"

import { Bell, Menu } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { Boot, Mark } from "@/components/common"
import { Sidebar } from "@/components/shell/sidebar"
import { useWorkspace } from "@/lib/store"
import { tap } from "@/lib/presentation"

export function WorkspaceFrame({ children }: { children: React.ReactNode }) {
  const { ready, user, unread } = useWorkspace()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (ready && !user) router.replace("/login")
  }, [ready, user, router])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open])

  if (!ready || !user) return <Boot />

  return (
    <div className="flex h-dvh overflow-hidden bg-white text-[#222]">
      <aside className="hidden w-[248px] shrink-0 border-r border-[#EBEBEB] md:flex md:flex-col">
        <Suspense fallback={<div className="h-full bg-white" />}>
          <Sidebar />
        </Suspense>
      </aside>
      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button className="absolute inset-0 bg-black/30" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-[280px] bg-white shadow-xl">
            <Suspense fallback={null}>
              <Sidebar onNavigate={() => setOpen(false)} />
            </Suspense>
          </aside>
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-[#EBEBEB] px-4 md:hidden">
          <button type="button" className={tap} aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu className="size-5" />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Mark className="size-7" />
            UX Review
          </Link>
          <Link href="/notifications" aria-label="Notifications" className="relative">
            <Bell className="size-5" />
            {unread > 0 ? <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[#FF385C]" /> : null}
          </Link>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
