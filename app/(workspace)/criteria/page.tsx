import type { Metadata } from "next"
import { CriteriaManager } from "@/components/criteria/criteria-manager"

export const metadata: Metadata = { title: "Review criteria" }

export default function CriteriaPage() {
  return <CriteriaManager />
}
