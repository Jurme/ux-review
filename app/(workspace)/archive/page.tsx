import type { Metadata } from "next"
import { ArchiveList } from "@/components/reviews/archive-list"

export const metadata: Metadata = { title: "Archive" }

export default function ArchivePage() {
  return <ArchiveList />
}
