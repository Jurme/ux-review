"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Boot } from "@/components/common"
import { useWorkspace } from "@/lib/store"

export default function HomePage() {
  const { ready, user } = useWorkspace()
  const router = useRouter()

  useEffect(() => {
    if (!ready) return
    router.replace(user ? "/dashboard" : "/login")
  }, [ready, user, router])

  return <Boot />
}
