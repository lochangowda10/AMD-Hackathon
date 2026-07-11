import * as React from "react"

import { cn } from "@/lib/utils"

interface SkeletonTextProps {
  className?: string
  lines?: number
  width?: string | number
}

export function SkeletonText({
  className,
  lines = 3,
  width = "100%",
}: SkeletonTextProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {[...Array(lines)].map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-4 w-full rounded-md bg-mute animate-pulse",
            "bg-[linear-gradient(90px,_transparent_#0000,_currentColor_35%,_currentColor_65%,_transparent)]",
            "bg-[background-size:200%_100%]",
            "animate-[loading_1.5s_ease-in-out_infinite]",
            "@keyframes_loading_{from{background-position:200%_0;}to{background-position:-200%_0;}}",
            typeof width === "number" ? `w-[${width}px]` : `w-${width}`
          )}
        />
      ))}
    </div>
  )
}