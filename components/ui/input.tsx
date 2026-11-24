import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-xl border border-input bg-white px-3.5 text-[15px] transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-[#222] focus-visible:ring-0 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-[#F7F7F7] disabled:opacity-60 aria-invalid:border-destructive aria-invalid:ring-0 md:text-[15px]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
