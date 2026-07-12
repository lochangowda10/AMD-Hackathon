import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string
  children: React.ReactNode
  className?: string
}

export function FormField({
  label,
  htmlFor,
  error,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {error && (
          <span className="ml-2 text-xs text-destructive">*</span>
        )}
      </Label>
      <div className="mt-block">{children}</div>
      {error && (
        <p className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}