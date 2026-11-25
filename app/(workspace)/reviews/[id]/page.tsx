import { Suspense } from "react"
import type { Metadata } from "next"
import { ReviewWorkspace } from "@/components/reviews/review-workspace"

export const metadata: Metadata = { title: "Review" }

export default function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<ReviewSkeleton />}>
      <ReviewGate params={params} />
    </Suspense>
  )
}

function ReviewSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-5 py-8 md:px-10" role="status" aria-label="Opening review">
      <div className="h-4 w-28 animate-pulse rounded bg-[var(--border)]" />
      <div className="mt-6 h-10 w-2/3 animate-pulse rounded bg-[var(--border)]" />
      <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-[var(--border)]" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-3">
          <div className="h-28 animate-pulse rounded-2xl bg-[var(--border)]" />
          <div className="h-28 animate-pulse rounded-2xl bg-[var(--border)]" />
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-[var(--border)]" />
      </div>
    </div>
  )
}

async function ReviewGate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ReviewWorkspace id={id} />
}
