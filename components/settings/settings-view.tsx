"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Field, NativeSelect, PageHeader, pageWrap } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { REMINDER_OPTIONS, TIMEZONES } from "@/lib/constants"
import { resetDemo, signOut, updateProfile, updateWorkspace, useWorkspace } from "@/lib/store"

export function SettingsView() {
  const { user, workspace, provider } = useWorkspace()
  const router = useRouter()
  const [confirm, setConfirm] = useState(false)
  if (!user || !workspace) return null

  return (
    <div className={pageWrap("max-w-[760px]")}>
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Your profile follows you across reviews. Workspace defaults apply to new reviews."
      />

      <form
        key={user.id}
        className="mt-8 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const result = updateProfile({
            name: String(data.get("name") ?? ""),
            title: String(data.get("title") ?? ""),
          })
          if (result.ok) toast.success(result.message)
          else toast.error(result.message)
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
          Signed in with {provider === "microsoft" ? "Microsoft" : provider === "google" ? "Google" : "this sample"} · {user.role === "admin" ? "Admin" : "Member"}
        </p>
        <Button type="submit">Save profile</Button>
      </form>

      <form
        key={`${workspace.name}-${workspace.timezone}-${workspace.reminderHours}`}
        className="mt-12 space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          const data = new FormData(event.currentTarget)
          const reminder = String(data.get("reminder") ?? "none")
          const result = updateWorkspace({
            name: String(data.get("workspace") ?? ""),
            timezone: String(data.get("timezone") ?? workspace.timezone),
            reminderHours: reminder === "none" ? null : Number(reminder),
          })
          if (result.ok) toast.success(result.message)
          else toast.error(result.message)
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
          <NativeSelect name="reminder" defaultValue={workspace.reminderHours === null ? "none" : String(workspace.reminderHours)} disabled={user.role !== "admin"}>
            {REMINDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </NativeSelect>
        </Field>
        {user.role === "admin" ? <Button type="submit">Save workspace</Button> : null}
      </form>

      <section className="mt-12 space-y-3 border-t border-[#EBEBEB] pt-8">
        <h2 className="text-[18px] font-semibold">Sample data</h2>
        <p className="text-[14px] leading-6 text-[#717171]">
          Reviews, notes, and invites are saved in this browser. Restoring the sample replaces anything you added. Google and Microsoft sign-in on the welcome screen chooses a workspace account; it does not contact those providers. A production workspace would use Supabase Auth for those providers and Resend for reminder email.
        </p>
        {confirm ? (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                const result = resetDemo()
                if (result.ok) toast.success(result.message)
                setConfirm(false)
              }}
            >
              Restore sample workspace
            </Button>
            <Button variant="ghost" onClick={() => setConfirm(false)}>Cancel</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setConfirm(true)}>Reset sample data</Button>
        )}
        <div>
          <Button
            variant="ghost"
            onClick={() => {
              signOut()
              router.replace("/login")
            }}
          >
            Log out
          </Button>
        </div>
      </section>
    </div>
  )
}
