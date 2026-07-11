import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "bg-muted animate-pulse rounded-md",
        "bg-[linear-gradient(90px,_transparent_#0000,_currentColor_35%,_currentColor_65%,_transparent)]",
        "bg-[background-size:200%_100%]",
        "animate-[loading_1.5s_ease-in-out_infinite]",
        "@keyframes_loading_{from{background-position:200%_0;}to{background-position:-200%_0;}}",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }