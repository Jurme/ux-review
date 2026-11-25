"use client"

import { useEffect, type ReactNode } from "react"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { appearanceOf } from "@/lib/domain"
import { useWorkspace } from "@/lib/store"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider session={null} refetchOnWindowFocus={false}>
      <TooltipProvider delay={400}>
        <ThemeSync />
        {children}
        <ThemedToaster />
      </TooltipProvider>
    </SessionProvider>
  )
}

function ThemeSync() {
  const { user, workspace } = useWorkspace()
  const theme = appearanceOf(user, workspace)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  return null
}

function ThemedToaster() {
  const { user, workspace } = useWorkspace()
  return <Toaster theme={appearanceOf(user, workspace)} position="bottom-center" />
}
