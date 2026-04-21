import * as React from "react"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  ...props
}) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-slate-400 selection:bg-[#f4d58d] selection:text-slate-950 flex h-12 w-full min-w-0 rounded-2xl border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] px-4 py-3 text-base text-white shadow-[0_10px_30px_rgba(15,23,42,0.14)] transition-[border-color,box-shadow,background-color] outline-none file:mr-3 file:inline-flex file:h-8 file:border-0 file:rounded-full file:bg-white/10 file:px-3 file:text-sm file:font-medium hover:border-white/24 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-[#f4d58d]/55 focus-visible:ring-4 focus-visible:ring-[#f4d58d]/14",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props} />
  );
}

export { Input }
