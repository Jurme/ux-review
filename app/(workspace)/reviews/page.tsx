import type { Metadata } from "next"
import { ReviewsList } from "@/components/reviews/reviews-list"

export const metadata: Metadata = { title: "All reviews" }

export default function ReviewsPage() {
  return <ReviewsList />
}
