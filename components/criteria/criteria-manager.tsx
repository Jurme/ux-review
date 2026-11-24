"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Copy, Plus } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, Field, NativeSelect, PageHeader, pageWrap } from "@/components/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { PRIORITIES } from "@/lib/constants"
import { tap } from "@/lib/presentation"
import {
  deleteCriterion,
  duplicateCriterion,
  reorderCriterion,
  saveCriterion,
  useWorkspace,
} from "@/lib/store"
import { cn } from "@/lib/utils"
import type { Criterion, CriterionDraft, Priority } from "@/lib/types"

const blank = (): CriterionDraft => ({
  name: "",
  category: "UX",
  description: "",
  guidance: "",
  priority: "medium",
  active: true,
})

export function CriteriaManager() {
  const { criteria, reviews, user } = useWorkspace()
  const [draft, setDraft] = useState<CriterionDraft | null>(null)
  if (!user) return null

  const shown = [...criteria].sort((a, b) => a.order - b.order)

  async function act(result: Promise<{ ok: boolean; message?: string }>) {
    const settled = await result
    if (!settled.message) return settled
    if (settled.ok) toast.success(settled.message)
    else toast.error(settled.message)
    return settled
  }

  function open(item?: Criterion) {
    setDraft(item ? {
      id: item.id,
      name: item.name,
      category: item.category,
      description: item.description,
      guidance: item.guidance,
      priority: item.priority,
      active: item.active,
    } : blank())
  }

  return (
    <div className={pageWrap()}>
      <PageHeader
        eyebrow="Management"
        title="Review criteria"
        description="Reusable checks so a reviewer does not learn a new list for every project. Inactive criteria stay out of new reviews."
        action={<Button size="lg" onClick={() => open()}><Plus /> New criterion</Button>}
      />

      {shown.length === 0 ? (
        <div className="mt-8"><EmptyState title="No criteria" body="Add a criterion to use when leaving feedback." /></div>
      ) : (
        <ul className="mt-6 divide-y divide-[#EBEBEB]">
          {shown.map((item, index) => {
            const used = reviews.filter((review) => review.criteriaIds.includes(item.id)).length
            return (
              <li key={item.id} className="flex flex-wrap items-start gap-4 py-4">
                <span className="w-8 pt-1 text-[13px] text-[#717171]">{String(item.order).padStart(2, "0")}</span>
                <button type="button" onClick={() => open(item)} className={cn("min-w-0 flex-1 text-left", tap)}>
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.name}</span>
                    {!item.active ? <span className="text-[12px] text-[#717171]">Inactive</span> : null}
                  </span>
                  <span className="mt-1 block text-[14px] leading-6 text-[#717171]">{item.description}</span>
                  <span className="mt-1 block text-[12px] text-[#717171]">Used by {used} review{used === 1 ? "" : "s"}</span>
                </button>
                <span className="flex items-center gap-1">
                  <IconButton label="Move up" disabled={index === 0} onClick={() => act(reorderCriterion(item.id, -1))}><ArrowUp className="size-4" /></IconButton>
                  <IconButton label="Move down" disabled={index === shown.length - 1} onClick={() => act(reorderCriterion(item.id, 1))}><ArrowDown className="size-4" /></IconButton>
                  <IconButton label="Duplicate" onClick={() => act(duplicateCriterion(item.id))}><Copy className="size-4" /></IconButton>
                </span>
              </li>
            )
          })}
        </ul>
      )}

      <Sheet open={draft !== null} onOpenChange={(open) => { if (!open) setDraft(null) }}>
        <SheetContent className="overflow-y-auto">
          {draft ? (
            <div className="space-y-4">
              <SheetHeader>
                <SheetTitle>{draft.id ? "Edit criterion" : "New criterion"}</SheetTitle>
                <SheetDescription>Say what to evaluate, then give reviewers the questions to ask.</SheetDescription>
              </SheetHeader>
              <Field label="Name">
                <Input value={draft.name} maxLength={80} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
              </Field>
              <Field label="Description">
                <Textarea value={draft.description} maxLength={400} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
              </Field>
              <Field label="Review guidance">
                <Textarea value={draft.guidance} maxLength={1000} onChange={(event) => setDraft({ ...draft, guidance: event.target.value })} />
              </Field>
              <Field label="Default priority">
                <NativeSelect value={draft.priority ?? ""} onChange={(event) => setDraft({ ...draft, priority: (event.target.value || null) as Priority | null })}>
                  <option value="">None</option>
                  {PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}
                </NativeSelect>
              </Field>
              <label className="flex items-center justify-between text-[14px]">
                Active
                <button type="button" role="switch" aria-checked={draft.active} onClick={() => setDraft({ ...draft, active: !draft.active })} className={cn("relative h-6 w-11 rounded-full", tap, draft.active ? "bg-[#222]" : "bg-[#D6D6D6]")}>
                  <span className={cn("absolute top-0.5 size-5 rounded-full bg-white", draft.active ? "left-5" : "left-0.5")} />
                </button>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => { void (async () => { const result = await act(saveCriterion(draft)); if (result?.ok) setDraft(null) })() }}>Save</Button>
                {draft.id ? (
                  <Button variant="ghost" className="text-[#D93B3B]" onClick={() => { void (async () => { const result = await act(deleteCriterion(draft.id!)); if (result?.ok) setDraft(null) })() }}>
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  )
}

function IconButton({ label, children, ...props }: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button type="button" aria-label={label} {...props} className={cn("grid size-8 place-items-center rounded-full hover:bg-[#F7F7F7] disabled:opacity-30", tap)}>
      {children}
    </button>
  )
}
