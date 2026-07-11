import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm flex items-start gap-3",
  {
    variants: {
      variant: {
        default: "border border-muted bg-card/50 text-foreground",
        destructive:
          "border border-destructive/50 bg-destructive/20 text-destructive",
        outline:
          "border border-muted bg-background text-foreground",
        secondary:
          "border border-secondary/50 bg-secondary/20 text-secondary-foreground",
      },
      variant: {
        default: "border border-muted bg-card/50 text-foreground",
        destructive:
          "border border-destructive/50 bg-destructive/20 text-destructive",
        outline:
          "border border-muted bg-background text-foreground",
        secondary:
          "border border-secondary/50 bg-secondary/20 text-secondary-foreground",
        success:
          "border border-success/50 bg-success/20 text-success-foreground",
        warning:
          "border border-warning/50 bg-warning/20 text-warning-foreground",
        info:
          "border border-info/50 bg-info/20 text-info-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-semibold text-lg mb-1", className)}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }