"use client"

export default function WorkspaceError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="px-6 py-16">
      <h1 className="text-[28px] font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 max-w-md text-[15px] text-[#717171]">
        The page didn’t finish loading. Your reviews are still in this browser.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 h-10 rounded-xl bg-[#FF385C] px-4 text-[14px] font-medium text-white"
      >
        Try again
      </button>
    </div>
  )
}
