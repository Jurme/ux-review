import { redirect } from "next/navigation"

export default function CriteriaPage() {
  redirect("/settings?tab=criteria")
}
