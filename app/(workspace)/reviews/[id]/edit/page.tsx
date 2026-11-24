import { Suspense } from "react"
import type { Metadata } from "next"
import { CreateReview } from "@/components/reviews/create-review"

export const metadata: Metadata = { title: "Edit review" }

export default function EditReviewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<p className="p-10 text-[#717171]">Opening the form…</p>}>
      <EditGate params={params} />
    </Suspense>
  )
}

async function EditGate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <CreateReview reviewId={id} />
}
