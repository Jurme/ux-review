import { Suspense } from "react"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { LoginScreen } from "@/components/auth/login-screen"

export const metadata: Metadata = { title: "Sign in" }

export default async function LoginPage() {
  const session = await auth()
  if (session?.user?.email) redirect("/dashboard")
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  )
}
