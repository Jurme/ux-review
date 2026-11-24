import type { Metadata } from "next"
import { ReviewsList } from "@/components/reviews/reviews-list"

export const metadata: Metadata = { title: "Archived reviews" }

export default function ArchivePage() {
  return <ReviewsList archive />
}
