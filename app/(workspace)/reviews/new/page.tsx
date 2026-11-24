import { Suspense } from "react"
import type { Metadata } from "next"
import { CreateReview } from "@/components/reviews/create-review"

export const metadata: Metadata = { title: "Create review" }

export default function NewReviewPage() {
  return (
    <Suspense fallback={<p className="p-10 text-[#717171]">Opening the form…</p>}>
      <CreateReview />
    </Suspense>
  )
}
