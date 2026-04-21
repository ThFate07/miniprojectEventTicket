import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({
  className,
  ...props
}) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-28 w-full rounded-[1.4rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] px-4 py-3 text-base text-white shadow-[0_10px_30px_rgba(15,23,42,0.14)] transition-[border-color,box-shadow,background-color] outline-none placeholder:text-slate-400 hover:border-white/24 focus-visible:border-[#f4d58d]/55 focus-visible:ring-4 focus-visible:ring-[#f4d58d]/14 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      )}
      {...props} />
  );
}

export { Textarea }
