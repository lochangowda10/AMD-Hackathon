import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const inputVariants = cva(
  "flex h-[2.5rem] w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-valid disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "border-input bg-background shadow-sm hover:border-primary/30 focus:border-primary focus:ring-primary/20",
        outline: "border-input bg-background",
        flush: "border-b border-b-input bg-transparent px-0 py-0",
        underlined:
          "border-b border-b-input bg-transparent px-0 py-0 border-b-2 focus:border-b-primary focus:border-b-2 focus:border-b-2",
      },
      size: {
        default: "h-[2.5rem] px-3 py-1.5 text-sm",
        sm: "h-[2rem] px-2 text-xs",
        lg: "h-[3rem] px-4 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Input({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"input"> &
  VariantProps<typeof inputVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "input"

  return (
    <Comp
      data-slot="input"
      className={cn(inputVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Input, inputVariants }