import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { CheckIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Checkbox({
  className,
  ...props
}) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-5 shrink-0 rounded-md border border-white/18 bg-white/5 text-[#1c1917] shadow-[0_8px_18px_rgba(15,23,42,0.15)] outline-none transition-[border-color,background-color,box-shadow] data-[state=checked]:border-[#f4d58d] data-[state=checked]:bg-[#f4d58d] focus-visible:border-[#f4d58d]/60 focus-visible:ring-4 focus-visible:ring-[#f4d58d]/14 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}>
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current transition-none">
        <CheckIcon className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox }
