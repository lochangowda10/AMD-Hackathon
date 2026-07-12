import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const textareaVariants = cva(
  "flex min-h-[8rem] w-full rounded-border border border-background bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-valid disabled:opacity-50 resize-none",
  {
    variants: {
      variant: {
        default: "border-input bg-background shadow-sm hover:border-primary/30 focus:border-primary focus:ring-primary/20",
        outline: "border-input bg-background",
      },
      size: {
        default: "min-h-[8rem] px-3 py-2 text-sm",
        sm: "min-h-[6rem] px-2 text-xs",
        lg: "min-h-[10rem] px-4 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Textarea({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"textarea"> &
  VariantProps<typeof textareaVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "textarea"

  return (
    <Comp
      data-slot="textarea"
      className={cn(textareaVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Textarea, textareaVariants }