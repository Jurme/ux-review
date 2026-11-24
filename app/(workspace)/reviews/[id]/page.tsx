import { Suspense } from "react"
import type { Metadata } from "next"
import { ReviewWorkspace } from "@/components/reviews/review-workspace"

export const metadata: Metadata = { title: "Review" }

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-10 text-[#717171]">Opening review…</p>}>
      <ReviewGate params={params} />
    </Suspense>
  )
}

async function ReviewGate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ReviewWorkspace id={id} />
}
