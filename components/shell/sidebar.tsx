"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { toast } from "sonner"
import {
  Archive,
  Bell,
  CalendarDays,
  CircleHelp,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Settings,
} from "lucide-react"
import { Avatar, Mark } from "@/components/common"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import { tap } from "@/lib/presentation"

const items = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/reviews", label: "All reviews", icon: FolderOpen },
  { href: "/archive", label: "Archived reviews", icon: Archive },
  { href: "/settings", label: "Settings", icon: Settings },
]

function isActive(pathname: string, href: string) {
  if (href === "/reviews") return pathname === "/reviews" || (pathname.startsWith("/reviews/") && !pathname.startsWith("/reviews/new"))
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed?: boolean
  onToggle?: () => void
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, workspace: studio, unread, provider } = useWorkspace()
  if (!user || !studio) return null

  return (
    <div className={cn("flex h-full flex-col py-4", collapsed ? "px-2" : "px-3")}>
      <div className={cn("flex items-center", collapsed ? "flex-col gap-3" : "justify-between px-1")}>
        <Link href="/dashboard" className="flex items-center gap-2" onClick={onNavigate} title="UX Review">
          <Mark />
          {collapsed ? null : <span className="text-[15px] font-semibold tracking-tight">UX Review</span>}
        </Link>
        {onToggle ? (
          <button type="button" className={cn("grid size-9 place-items-center rounded-full hover:bg-black/5", tap)} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={onToggle}>
            <PanelLeft className="size-4" />
          </button>
        ) : null}
      </div>
      <nav className="mt-6 flex-1 space-y-1" aria-label="Primary">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActive(pathname, item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl text-[14px] font-medium",
                collapsed ? "justify-center" : "px-3",
                tap,
                active ? "bg-white text-[#222] shadow-[0_1px_4px_rgba(0,0,0,0.06)]" : "text-[#222] hover:bg-white/70",
              )}
            >
              <Icon className="size-[18px]" strokeWidth={1.75} />
              {collapsed ? null : item.label}
            </Link>
          )
        })}
      </nav>
      <div className="space-y-1">
        <Link
          href="/notifications"
          title="Notifications"
          onClick={onNavigate}
          className={cn("flex h-11 items-center gap-3 rounded-xl text-[14px] font-medium hover:bg-white/70", collapsed ? "justify-center" : "px-3", tap)}
        >
          <span className="relative">
            <Bell className="size-[18px]" strokeWidth={1.75} />
            {unread > 0 ? <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-[#FF385C]" /> : null}
          </span>
          {collapsed ? null : "Notifications"}
        </Link>
        <button
          type="button"
          title="Help"
          className={cn("flex h-11 w-full items-center gap-3 rounded-xl text-[14px] font-medium hover:bg-white/70", collapsed ? "justify-center" : "px-3", tap)}
          onClick={() => toast("Help is coming soon.")}
        >
          <CircleHelp className="size-[18px]" strokeWidth={1.75} />
          {collapsed ? null : "Help"}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger className={cn("flex h-12 w-full items-center gap-3 rounded-xl text-left hover:bg-white/70", collapsed ? "justify-center" : "px-2", tap)}>
            <Avatar user={user} size={32} />
            {collapsed ? null : (
              <span className="min-w-0">
                <span className="block truncate text-[14px] font-medium">{user.name.split(" ")[0]}</span>
                <span className="block truncate text-[12px] text-[#717171]">{studio.name}</span>
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-72">
            <DropdownMenuGroup>
              <DropdownMenuItem className="cursor-pointer" onClick={() => { onNavigate?.(); router.push("/settings") }}>
                <Settings className="size-4" />
                Account and preferences
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="size-4" />
                Log out
                {provider ? <span className="ml-auto text-[11px] text-[#717171]">{provider === "microsoft" ? "Microsoft" : "Google"}</span> : null}
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
