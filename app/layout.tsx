import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { Providers } from "@/components/providers"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
})

export const metadata: Metadata = {
  title: {
    default: "UX Review",
    template: "%s · UX Review",
  },
  description:
    "Schedule asynchronous design reviews, invite reviewers, and track structured feedback in one place.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full bg-[var(--canvas)] text-[var(--foreground)]">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
