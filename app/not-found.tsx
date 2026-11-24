import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <p className="text-[13px] text-[#717171]">404</p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight">That page isn’t in the workspace</h1>
      <Link href="/dashboard" className="mt-4 text-[14px] font-medium underline">
        Back to the dashboard
      </Link>
    </div>
  )
}
