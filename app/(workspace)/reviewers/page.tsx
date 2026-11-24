import type { Metadata } from "next"
import { ReviewerDirectory } from "@/components/reviewers/reviewer-directory"

export const metadata: Metadata = { title: "Reviewers" }

export default function ReviewersPage() {
  return <ReviewerDirectory />
}
