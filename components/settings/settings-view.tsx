"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { CriteriaManager } from "@/components/criteria/criteria-manager"
import { ReviewerDirectory } from "@/components/reviewers/reviewer-directory"
import { ConfirmDialog, Field, NativeSelect, PageHeader, pageWrap } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { REMINDER_OPTIONS, TIMEZONES } from "@/lib/constants"
import { tap } from "@/lib/presentation"
import { signOut } from "next-auth/react"
import { appearanceOf } from "@/lib/domain"
import { addProject, removeProject, renameProject, resetDemo, setTheme, updateProfile, updateWorkspace, useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"

const TABS = [
  { id: "projects", label: "Projects" },
  { id: "people", label: "Reviewers" },
  { id: "criteria", label: "Criteria" },
  { id: "general", label: "General" },
] as const

export function SettingsView() {
  const { user, workspace, reviews } = useWorkspace()
  const router = useRouter()
  const params = useSearchParams()
  const tab = TABS.some((item) => item.id === params.get("tab")) ? params.get("tab")! : "projects"
  const [confirm, setConfirm] = useState(false)
  const [projectName, setProjectName] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [pendingRemove, setPendingRemove] = useState<string | null>(null)
  if (!user || !workspace) return null

  return (
    <div className={pageWrap("max-w-[960px]")}>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Projects, reviewers, and criteria live here. Active criteria are included in every new review until you turn one off."
      />
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn("chip", tab === item.id && "chip-on", tap)}
            onClick={() => router.replace(`/settings?tab=${item.id}`)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab === "projects" ? (
        <section className="mt-8 max-w-[640px]">
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              void (async () => {
                const result = await addProject(projectName)
                if (result.ok) {
                  toast.success(result.message)
                  setProjectName("")
                } else toast.error(result.message)
              })()
            }}
          >
            <Input value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="New project" maxLength={80} />
            <Button type="submit">Add</Button>
          </form>
          {workspace.projects.length === 0 ? (
            <p className="mt-4 text-[14px] text-[#717171]">No projects yet. Add one, then choose it when you send a design.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[var(--border)]">
              {workspace.projects.map((name) => {
                const count = reviews.filter((review) => review.project === name).length
                if (editing === name) {
                  return (
                    <li key={name} className="py-3">
                      <form
                        className="flex flex-wrap gap-2"
                        onSubmit={(event) => {
                          event.preventDefault()
                          const next = editName.trim()
                          if (!next || next === name) {
                            setEditing(null)
                            return
                          }
                          void (async () => {
                            const result = await renameProject(name, next)
                            if (result.ok) {
                              toast.success(result.message)
                              setEditing(null)
                            } else toast.error(result.message)
                          })()
                        }}
                      >
                        <Input value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={80} aria-label="Project name" autoFocus />
                        <Button type="submit">Save</Button>
                        <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                      </form>
                    </li>
                  )
                }
                return (
                  <li key={name} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span>
                      <span className="font-medium">{name}</span>
                      <span className="ml-2 text-[13px] text-[#717171]">{count} review{count === 1 ? "" : "s"}</span>
                    </span>
                    <span className="flex gap-1">
                      <Button variant="ghost" type="button" onClick={() => { setEditing(name); setEditName(name) }}>Edit</Button>
                      <Button variant="ghost" type="button" className="text-[#D93B3B]" onClick={() => setPendingRemove(name)}>Remove</Button>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
          <ConfirmDialog
            open={pendingRemove !== null}
            title="Remove this project?"
            body={pendingRemove ? `${pendingRemove} will leave the project list. Reviews already sent under that name stay as they are.` : ""}
            confirmLabel="Remove project"
            onClose={() => setPendingRemove(null)}
            onConfirm={() => {
              const name = pendingRemove
              if (!name) return
              void (async () => {
                const result = await removeProject(name)
                if (result.ok) toast.success(result.message)
                else toast.error(result.message)
                setPendingRemove(null)
              })()
            }}
          />
        </section>
      ) : null}
      {tab === "people" ? <div className="-mx-6 md:-mx-10"><ReviewerDirectory /></div> : null}
      {tab === "criteria" ? <div className="-mx-6 md:-mx-10"><CriteriaManager /></div> : null}
      {tab === "general" ? <General confirm={confirm} setConfirm={setConfirm} /> : null}
    </div>
  )
}

function General({ confirm, setConfirm }: { confirm: boolean; setConfirm: (value: boolean) => void }) {
  const { user, workspace, provider } = useWorkspace()
  if (!user || !workspace) return null
  return (
    <>
      <div className="mt-8 max-w-[760px]">
        <h2 className="text-[18px] font-semibold">Appearance</h2>
        <div className="mt-3 flex gap-2">
          {(["light", "dark"] as const).map((theme) => (
            <button key={theme} type="button" className={cn("chip capitalize", appearanceOf(user, workspace) === theme && "chip-on", tap)} onClick={() => setTheme(theme)}>
              {theme}
            </button>
          ))}
        </div>
        <p className="mt-3 text-[13px] text-[#717171]">Light or dark follows this account. Other people keep their own.</p>
      </div>
      <form
        key={user.id}
        className="mt-8 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          void (async () => {
            const result = await updateProfile({
              name: String(data.get("name") ?? ""),
              title: String(data.get("title") ?? ""),
            })
            if (result.ok) toast.success(result.message)
            else toast.error(result.message)
          })()
        }}
      >
        <h2 className="text-[18px] font-semibold">Profile</h2>
        <Field label="Name">
          <Input name="name" defaultValue={user.name} maxLength={80} />
        </Field>
        <Field label="Title">
          <Input name="title" defaultValue={user.title} maxLength={80} />
        </Field>
        <Field label="Email" hint="Email is the link between an invitation and a sign-in. It isn’t editable here.">
          <Input value={user.email} disabled />
        </Field>
        <p className="text-[13px] text-[#717171]">
          Signed in with {provider === "microsoft" ? "Microsoft" : provider === "email" ? "email" : "Google"} · {user.role === "admin" ? "Admin" : "Member"}
        </p>
        <Button type="submit">Save profile</Button>
      </form>

      <form
        key={`${workspace.name}-${workspace.timezone}-${workspace.reminderHours}`}
        className="mt-12 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const reminder = String(data.get("reminder") ?? "20")
          void (async () => {
            const result = await updateWorkspace({
              name: String(data.get("workspace") ?? ""),
              timezone: String(data.get("timezone") ?? workspace.timezone),
              reminderHours: Number(reminder),
            })
            if (result.ok) toast.success(result.message)
            else toast.error(result.message)
          })()
        }}
      >
        <h2 className="text-[18px] font-semibold">Workspace</h2>
        {user.role !== "admin" ? <p className="text-[14px] text-[#717171]">Only an admin can change these. You can still read them.</p> : null}
        <Field label="Workspace name">
          <Input name="workspace" defaultValue={workspace.name} maxLength={60} disabled={user.role !== "admin"} />
        </Field>
        <Field label="Time zone">
          <NativeSelect name="timezone" defaultValue={workspace.timezone} disabled={user.role !== "admin"}>
            {TIMEZONES.map((zone) => <option key={zone.value} value={zone.value}>{zone.label}</option>)}
          </NativeSelect>
        </Field>
        <Field label="Default reminder">
          <NativeSelect name="reminder" defaultValue={REMINDER_OPTIONS.some((item) => item.value === String(workspace.reminderHours)) ? String(workspace.reminderHours) : "20"} disabled={user.role !== "admin"}>
            {REMINDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </NativeSelect>
        </Field>
        {user.role === "admin" ? <Button type="submit">Save workspace</Button> : null}
      </form>

      <section className="mt-12 space-y-3 border-t border-[#EBEBEB] pt-8">
        <h2 className="text-[18px] font-semibold">Sample data</h2>
        <p className="text-[14px] leading-6 text-[#717171]">
          The workspace starts empty so you can add projects, criteria, and reviewers yourself. Loading the sample fills in Sunrise Studio reviews and keeps you signed in as yourself.
        </p>
        {confirm ? (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                void (async () => {
                  const result = await resetDemo()
                  if (result.ok) toast.success(result.message)
                  else toast.error(result.message)
                  setConfirm(false)
                })()
              }}
            >
              Load sample workspace
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setConfirm(true)}>Reset sample data</Button>
        )}
        <div>
          <Button
            variant="ghost"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Log out
          </Button>
        </div>
      </section>
    </>
  )
}
