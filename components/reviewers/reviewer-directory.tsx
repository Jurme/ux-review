"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { Avatar, EmptyState, Field, PageHeader, ReviewerPill, pageWrap } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { phaseOf } from "@/lib/domain"
import { formatDay } from "@/lib/format"
import { tap } from "@/lib/presentation"
import { inviteMember, removeMember, updateMember, useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Role } from "@/lib/types"

export function ReviewerDirectory() {
  const { user, users, reviews } = useWorkspace()
  const [query, setQuery] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  if (!user) return null

  const shown = users.filter((person) => {
    const haystack = `${person.name} ${person.email} ${person.title}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })
  const person = users.find((item) => item.id === selected) ?? shown[0]
  const assignments = person
    ? reviews.filter((review) => review.ownerId === person.id || review.reviewers.some((reviewer) => reviewer.userId === person.id))
    : []

  function act(result: { ok: boolean; message?: string }) {
    if (!result.message) return
    if (result.ok) toast.success(result.message)
    else toast.error(result.message)
  }

  return (
    <div className={pageWrap()}>
      <PageHeader
        eyebrow="Workspace"
        title="Reviewers"
        description="People can be invited before they have an account. After they sign in with that email, assigned reviews are waiting."
      />
      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" aria-label="Search reviewers" className="max-w-md" />
          {shown.length === 0 ? (
            <div className="mt-6"><EmptyState title="No one matches" body="Try another name, or invite them by email." /></div>
          ) : (
            <ul className="mt-4 divide-y divide-[#EBEBEB]">
              {shown.map((item) => {
                const open = reviews.filter((review) => review.lifecycle === "open" && (review.ownerId === item.id || review.reviewers.some((reviewer) => reviewer.userId === item.id && reviewer.status !== "completed"))).length
                return (
                  <li key={item.id}>
                    <button type="button" onClick={() => setSelected(item.id)} className={cn("flex w-full items-center gap-3 py-4 text-left", tap, person?.id === item.id && "bg-[#FAFAFA] px-2")}>
                      <Avatar user={item} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{item.name}</span>
                        <span className="block truncate text-[13px] text-[#717171]">{item.title} · {item.email}</span>
                      </span>
                      <span className="text-right text-[12px] text-[#717171]">
                        {item.accountStatus === "invited" ? "Invited" : item.role === "admin" ? "Admin" : "Member"}
                        <span className="mt-1 block">{open} open</span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <aside className="space-y-4">
          {person ? (
            <section className="rounded-2xl border border-[#EBEBEB] p-5">
              <div className="flex items-center gap-3">
                <Avatar user={person} size={44} />
                <div>
                  <h2 className="text-[18px] font-semibold">{person.name}</h2>
                  <p className="text-[13px] text-[#717171]">{person.email}</p>
                </div>
              </div>
              {user.role === "admin" ? (
                <div className="mt-4 space-y-3">
                  <Field label="Title">
                    <Input defaultValue={person.title} key={person.id} onBlur={(event) => { if (event.target.value !== person.title) act(updateMember(person.id, { title: event.target.value })) }} />
                  </Field>
                  <Field label="Role">
                    <select
                      className="h-12 w-full rounded-xl border border-[#EBEBEB] px-3"
                      value={person.role}
                      onChange={(event) => act(updateMember(person.id, { role: event.target.value as Role }))}
                    >
                      <option value="member">Reviewer</option>
                      <option value="admin">Admin</option>
                    </select>
                  </Field>
                  {person.id !== user.id ? (
                    <button type="button" className={cn("text-[13px] text-[#D93B3B]", tap)} onClick={() => act(removeMember(person.id))}>
                      Remove from workspace
                    </button>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-[13px] text-[#717171]">{person.accountStatus === "invited" ? "Invited" : person.role === "admin" ? "Admin" : "Member"} · {person.title}</p>
              )}
              <ul className="mt-4 space-y-3">
                {assignments.length === 0 ? <li className="text-[13px] text-[#717171]">No reviews yet.</li> : assignments.slice(0, 6).map((review) => {
                  const slot = review.reviewers.find((item) => item.userId === person.id)
                  return (
                    <li key={review.id}>
                      <Link href={`/reviews/${review.id}`} className="block">
                        <span className="text-[14px] font-medium">{review.title}</span>
                        <span className="mt-0.5 flex items-center gap-2 text-[12px] text-[#717171]">
                          {review.ownerId === person.id ? "Owner" : slot?.focus || "Reviewer"} · due {formatDay(review.deadline)}
                          {slot ? <ReviewerPill status={slot.status} /> : null}
                          <span>{phaseOf(review).replaceAll("_", " ")}</span>
                        </span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : null}
          <section className="rounded-2xl bg-[#F7F7F7] p-5">
            <h2 className="font-semibold">Invite by email</h2>
            <div className="mt-3 space-y-2">
              <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" aria-label="Name" />
              <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email" aria-label="Email" />
              <Button
                onClick={() => {
                  const result = inviteMember({ name, email })
                  act(result)
                  if (result.ok) {
                    setName("")
                    setEmail("")
                    if (result.id) setSelected(result.id)
                  }
                }}
              >
                Send invite
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
