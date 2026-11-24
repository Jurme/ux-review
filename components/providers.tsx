"use client"

import { useEffect, type ReactNode } from "react"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useWorkspace } from "@/lib/store"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <TooltipProvider delay={400}>
        <ThemeSync />
        {children}
        <Toaster position="bottom-center" />
      </TooltipProvider>
    </SessionProvider>
  )
}

function ThemeSync() {
  const { workspace } = useWorkspace()
  useEffect(() => {
    document.documentElement.dataset.theme = workspace?.theme ?? "light"
  }, [workspace?.theme])
  return null
}
