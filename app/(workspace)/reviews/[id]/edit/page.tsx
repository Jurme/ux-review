import { redirect } from "next/navigation"

export default async function EditReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/reviews/${id}`)
}
