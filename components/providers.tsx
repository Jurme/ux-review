"use client"

import { Suspense, useEffect, type ReactNode } from "react"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { RouteProgress } from "@/components/shell/route-progress"
import { appearanceOf } from "@/lib/domain"
import { useWorkspace } from "@/lib/store"

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider delay={400}>
      <ThemeSync />
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      {children}
      <ThemedToaster />
    </TooltipProvider>
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
