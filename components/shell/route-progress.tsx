"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useBusy } from "@/lib/store"

export function RouteProgress() {
  const pathname = usePathname()
  const busy = useBusy()
  const [pendingPath, setPendingPath] = useState<string | null>(null)
  const navigating = pendingPath !== null && pendingPath !== pathname

  useEffect(() => {
    if (!navigating) return
    const id = window.setTimeout(() => setPendingPath(null), 8000)
    return () => window.clearTimeout(id)
  }, [navigating])

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
      const link = (event.target as Element | null)?.closest("a")
      if (!link || link.target === "_blank") return
      const href = link.getAttribute("href")
      if (!href || href.startsWith("http") || href.startsWith("#")) return
      const next = href.split("?")[0]
      if (!next || next === pathname) return
      setPendingPath(next)
    }
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [pathname])

  if (!navigating && !busy) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-1 overflow-hidden bg-[#E8E8E8]" role="progressbar" aria-label="Loading">
      <div className="h-full w-1/3 animate-pulse bg-[#222]" />
    </div>
  )
}
