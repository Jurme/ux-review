import type { Metadata } from "next"
import { CalendarBoard } from "@/components/calendar/calendar-board"

export const metadata: Metadata = { title: "Calendar" }

export default function CalendarPage() {
  return <CalendarBoard />
}
