"use client"

import Link from "next/link"
import { useState } from "react"
import { toast } from "sonner"
import { EmptyState, PageHeader, pageWrap } from "@/components/common"
import { Input } from "@/components/ui/input"
import { phaseOf } from "@/lib/domain"
import { tap } from "@/lib/presentation"
import { inviteMember, removeMember, updateMember, useWorkspace } from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Role } from "@/lib/types"

export function ReviewerDirectory() {
  const { user, users, reviews } = useWorkspace()
  const [query, setQuery] = useState("")
  const [email, setEmail] = useState("")
  const [pending, setPending] = useState(false)
  if (!user) return null

  const signedIn = users.filter((person) => person.accountStatus === "active")
  const shown = signedIn.filter((person) => {
    const haystack = `${person.name} ${person.email} ${person.title}`.toLowerCase()
    return haystack.includes(query.trim().toLowerCase())
  })

  async function addPerson() {
    setPending(true)
    const result = await inviteMember({ name: "", email })
    setPending(false)
    if (result.message) {
      if (result.ok) toast.success(result.message)
      else toast.error(result.message)
    }
    if (result.ok) setEmail("")
  }

  return (
    <div className={pageWrap()}>
      <PageHeader
        eyebrow="Workspace"
        title="Reviewers"
        description="People who have signed in. Add someone only after they have created an account."
      />
      {user.role === "admin" ? (
        <form
          className="mt-6 flex flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault()
            void addPerson()
          }}
        >
          <Input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email of someone who has signed in" aria-label="Email" className="max-w-md" />
          <button type="submit" className={cn("btn btn-primary", tap)} disabled={pending}>
            {pending ? "Adding…" : "Add"}
          </button>
        </form>
      ) : null}
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" aria-label="Search reviewers" className="mt-4 max-w-md" />
      {shown.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No signed-in reviewers" body="People appear here after they sign in. You can add an email once they have an account." />
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-[16px] border border-[#EBEBEB]">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead className="bg-[#F7F7F7] text-[12px] text-[#717171]">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Open reviews</th>
                <th className="px-4 py-3 font-medium">Reviews</th>
                {user.role === "admin" ? <th className="px-4 py-3 font-medium"> </th> : null}
              </tr>
            </thead>
            <tbody>
              {shown.map((person) => {
                const open = reviews.filter((review) => review.lifecycle === "open" && (review.ownerId === person.id || review.reviewers.some((reviewer) => reviewer.userId === person.id && reviewer.status !== "completed"))).length
                const related = reviews.filter((review) => review.ownerId === person.id || review.reviewers.some((reviewer) => reviewer.userId === person.id))
                return (
                  <tr key={person.id} className="border-t border-[#EBEBEB] align-top">
                    <td className="px-4 py-3 font-medium">{person.name}</td>
                    <td className="px-4 py-3 text-[#717171]">{person.email}</td>
                    <td className="px-4 py-3">
                      {user.role === "admin" ? (
                        <select
                          className="h-9 rounded-lg border border-[#EBEBEB] bg-white px-2"
                          value={person.role}
                          aria-label={`Role for ${person.name}`}
                          onChange={(event) => {
                            void updateMember(person.id, { role: event.target.value as Role }).then((result) => {
                              if (result.message) {
                                if (result.ok) toast.success(result.message)
                                else toast.error(result.message)
                              }
                            })
                          }}
                        >
                          <option value="member">Reviewer</option>
                          <option value="admin">Admin</option>
                        </select>
                      ) : (
                        person.role === "admin" ? "Admin" : "Reviewer"
                      )}
                    </td>
                    <td className="px-4 py-3">{open}</td>
                    <td className="px-4 py-3">
                      {related.length === 0 ? (
                        <span className="text-[#717171]">None</span>
                      ) : (
                        <ul className="space-y-1">
                          {related.slice(0, 4).map((review) => (
                            <li key={review.id}>
                              <Link href={`/reviews/${review.id}`} className="hover:underline">
                                {review.title}
                                <span className="ml-2 text-[12px] text-[#717171]">{phaseOf(review).replaceAll("_", " ")}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    {user.role === "admin" ? (
                      <td className="px-4 py-3">
                        {person.id !== user.id ? (
                          <button
                            type="button"
                            className={cn("text-[13px] text-[#D93B3B]", tap)}
                            onClick={() => {
                              void removeMember(person.id).then((result) => {
                                if (result.message) {
                                  if (result.ok) toast.success(result.message)
                                  else toast.error(result.message)
                                }
                              })
                            }}
                          >
                            Remove
                          </button>
                        ) : null}
                      </td>
                    ) : null}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
