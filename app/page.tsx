"use client"

import { useRouter } from "next/navigation"
import { useLayoutEffect } from "react"
import { Boot } from "@/components/common"
import { useWorkspace } from "@/lib/store"

export default function HomePage() {
  const { ready, user, gate } = useWorkspace()
  const router = useRouter()

  useLayoutEffect(() => {
    if (!ready) return
    if (gate === "invite") router.replace("/login")
    else router.replace(user ? "/dashboard" : "/login")
  }, [ready, user, gate, router])

  return <Boot />
}
