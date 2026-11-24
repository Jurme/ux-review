import { redirect } from "next/navigation"

export default function ReviewersPage() {
  redirect("/settings?tab=people")
}
