"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Archive,
  Bell,
  CalendarDays,
  Check,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Settings,
  Users,
} from "lucide-react"
import { Avatar, Mark } from "@/components/common"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { signIn, signOut, useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import { tap } from "@/lib/presentation"

const workspace = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/reviews", label: "All Reviews", icon: FolderOpen },
  { href: "/reviewers", label: "Reviewers", icon: Users },
]

const management = [
  { href: "/criteria", label: "Review Criteria", icon: ListChecks },
  { href: "/archive", label: "Archived Reviews", icon: Archive },
  { href: "/settings", label: "Settings", icon: Settings },
]

function isActive(pathname: string, href: string) {
  if (href === "/reviews") return pathname === "/reviews" || pathname.startsWith("/reviews/")
  return pathname === href
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, users, workspace: studio, unread, provider } = useWorkspace()
  if (!user || !studio) return null

  return (
    <div className="flex h-full flex-col bg-white px-3 py-5">
      <div className="flex items-start justify-between gap-2 px-2">
        <Link href="/dashboard" className="flex min-w-0 items-center gap-3" onClick={onNavigate}>
          <Mark />
          <span className="min-w-0">
            <span className="block text-[15px] font-semibold tracking-tight text-[#222]">UX Review</span>
            <span className="block truncate text-[12px] text-[#717171]">{studio.name}</span>
          </span>
        </Link>
        <Link
          href="/notifications"
          aria-label={unread ? `${unread} unread notifications` : "Notifications"}
          onClick={onNavigate}
          className={cn("relative grid size-10 shrink-0 place-items-center rounded-full hover:bg-[#F7F7F7]", tap)}
        >
          <Bell className="size-[18px]" strokeWidth={1.75} />
          {unread > 0 ? <span className="absolute top-2 right-2 size-2 rounded-full bg-[#FF385C]" /> : null}
        </Link>
      </div>
      <p className="mt-4 px-2 text-[11px] tracking-wide text-[#717171] uppercase">Sample workspace</p>

      <nav className="mt-6 flex-1 overflow-y-auto" aria-label="Primary">
        <p className="px-3 text-[11px] font-medium tracking-[0.08em] text-[#717171] uppercase">Workspace</p>
        <ul className="mt-2 space-y-0.5">
          {workspace.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={isActive(pathname, item.href)} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
        <p className="mt-7 px-3 text-[11px] font-medium tracking-[0.08em] text-[#717171] uppercase">Management</p>
        <ul className="mt-2 space-y-0.5">
          {management.map((item) => (
            <li key={item.href}>
              <NavLink item={item} active={isActive(pathname, item.href)} onNavigate={onNavigate} />
            </li>
          ))}
        </ul>
      </nav>

      <DropdownMenu>
        <DropdownMenuTrigger className={cn("mt-3 flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-[#F7F7F7]", tap)}>
          <Avatar user={user} size={36} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-medium text-[#222]">{user.name}</span>
            <span className="block truncate text-[12px] text-[#717171]">
              {user.title}
              {provider ? ` · ${provider === "google" ? "Google" : "Microsoft"}` : ""}
            </span>
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top" className="w-72">
          <DropdownMenuGroup>
          <DropdownMenuLabel>Switch account</DropdownMenuLabel>
          {users.map((person) => (
            <DropdownMenuItem
              key={person.id}
              className="cursor-pointer"
              onClick={() => {
                if (provider) signIn(person.id, provider)
                onNavigate?.()
              }}
            >
              <Avatar user={person} size={24} />
              <span className="min-w-0 flex-1">
                <span className="block truncate">{person.name}</span>
                <span className="block truncate text-[11px] text-[#717171]">
                  {person.accountStatus === "invited" ? "Invited" : person.title}
                </span>
              </span>
              {person.id === user.id ? <Check className="size-4" /> : null}
            </DropdownMenuItem>
          ))}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={() => { onNavigate?.(); router.push("/settings") }}>
            <Settings className="size-4" />
            Account and preferences
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => {
              signOut()
              router.replace("/login")
            }}
          >
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: { href: string; label: string; icon: typeof LayoutDashboard }
  active: boolean
  onNavigate?: () => void
}) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] font-medium",
        tap,
        active ? "bg-[#F7F7F7] text-[#222]" : "text-[#222] hover:bg-[#F7F7F7]",
      )}
    >
      <Icon className="size-[18px] text-[#222]" strokeWidth={1.75} />
      {item.label}
    </Link>
  )
}
