import * as React from "react"
import { cn } from "cn"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "block min-h-28 w-full max-w-full resize-y rounded-xl border border-input bg-white px-3.5 py-3 text-[15px] leading-6 transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-[#222] focus-visible:ring-0 disabled:cursor-not-allowed disabled:bg-[#F7F7F7] disabled:opacity-60 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
