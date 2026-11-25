import { ChevronDown } from "lucide-react"
import { useEffect, type ComponentProps, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { avatarColor, initials, PHASE_META, REVIEWER_META, SEVERITY_META, tap } from "@/lib/presentation"
import type { Phase, ReviewerStatus, Severity, User } from "@/lib/types"

export function Mark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-[#FF385C] text-white",
        className,
      )}
      aria-hidden
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M2.8 3.2h6.2c.9 0 1.6.7 1.6 1.6v1.4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <path
          d="M5.2 6.2h6.4c.9 0 1.6.7 1.6 1.6v1.7c0 .9-.7 1.6-1.6 1.6H7.1L4.6 13.2V11.1H5.2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export function Avatar({
  user,
  size = 32,
}: {
  user: Pick<User, "name">
  size?: number
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white ring-2 ring-white"
      style={{
        width: size,
        height: size,
        background: avatarColor(user.name),
        fontSize: size < 28 ? 10 : 12,
      }}
      title={user.name}
    >
      {initials(user.name)}
    </span>
  )
}

export function AvatarStack({ users, size = 28 }: { users: Pick<User, "name">[]; size?: number }) {
  const shown = users.slice(0, 4)
  const extra = users.length - shown.length
  return (
    <div className="flex items-center pl-0.5" aria-label={users.map((user) => user.name).join(", ")}>
      <div className="flex -space-x-2">
        {shown.map((user) => (
          <Avatar key={user.name} user={user} size={size} />
        ))}
      </div>
      {extra > 0 && (
        <span className="ml-1.5 text-[12px] text-[#717171]">+{extra}</span>
      )}
    </div>
  )
}

export function PhasePill({ phase }: { phase: Phase }) {
  const meta = PHASE_META[phase]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium", meta.chip)}>
      <span className={cn("size-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  )
}

export function SeverityPill({ severity }: { severity: Severity }) {
  const meta = SEVERITY_META[severity]
  return <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-medium", meta.chip)}>{meta.label}</span>
}

export function ReviewerPill({ status }: { status: ReviewerStatus }) {
  const meta = REVIEWER_META[status]
  return <span className={cn("rounded-full px-2 py-0.5 text-[12px] font-medium", meta.chip)}>{meta.label}</span>
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-[#F7F7F7]"
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${value}% complete`}
    >
      <div className="h-full rounded-full bg-[#222]" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Ring({ value }: { value: number }) {
  const radius = 28
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.max(0, Math.min(100, value)) / 100) * circumference
  return (
    <svg width="76" height="76" viewBox="0 0 76 76" role="img" aria-label={`${value}% of reviewers finished`}>
      <circle cx="38" cy="38" r={radius} stroke="#F7F7F7" strokeWidth="6" fill="none" />
      <circle
        cx="38"
        cy="38"
        r={radius}
        stroke="#FF385C"
        strokeWidth="6"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 38 38)"
      />
      <text x="38" y="42" textAnchor="middle" fontSize="14" fontWeight="600" fill="#222222">
        {value}%
      </text>
    </svg>
  )
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow ? <p className="text-[13px] text-[#717171]">{eyebrow}</p> : null}
        <h1 className="text-[28px] font-semibold tracking-tight text-[#222] md:text-[30px]">{title}</h1>
        {description ? <p className="mt-2 text-[15px] leading-6 text-[#717171]">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-[#222]">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[12px] leading-5 text-[#717171]">{hint}</span> : null}
    </label>
  )
}

export function NativeSelect({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        {...props}
        className={cn(
          "h-12 w-full appearance-none rounded-xl border border-[#EBEBEB] bg-white px-3.5 pr-10 text-[15px] text-[#222] outline-none focus:border-[#222]",
          className,
        )}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2 size-4 -translate-y-1/2 text-[#717171]" />
    </div>
  )
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl bg-[#F7F7F7] px-6 py-10 text-center">
      <p className="text-[16px] font-medium text-[#222]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-[#717171]">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}

export function TextButton({
  className,
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={cn("text-[13px] font-medium text-[#222] underline-offset-4 hover:underline", tap, className)}
    />
  )
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  body: string
  confirmLabel: string
  onConfirm: () => void
  onClose: () => void
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] grid place-items-end px-4 py-6 sm:place-items-center">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Close" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="relative w-full max-w-[420px] rounded-2xl bg-white p-6 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
        <h2 id="confirm-title" className="text-[18px] font-semibold tracking-tight text-[#222]">{title}</h2>
        <p className="mt-2 text-[14px] leading-6 text-[#717171]">{body}</p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  )
}

export function pageWrap(className?: string) {
  return cn("mx-auto w-full max-w-[1180px] px-5 py-8 md:px-10 md:py-10", className)
}

export function Boot({ label = "Opening workspace" }: { label?: string }) {
  return (
    <div className="flex h-dvh bg-white">
      <div className="hidden w-[248px] border-r border-[#EBEBEB] md:block" />
      <div className="flex flex-1 items-center justify-center gap-3 text-[15px] text-[#717171]">
        <Mark />
        {label}
      </div>
    </div>
  )
}
