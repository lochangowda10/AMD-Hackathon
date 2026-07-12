import * as React from "react"

import { cn } from "@/lib/utils"

interface EmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("text-center space-y-4 py-12", className)}>
      {icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted/50 text-muted-foreground mx-auto">
          {icon}
        </div>
      )}
      <h2 className="text-lg font-semibold text-foreground">
        {title}
      </h2>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4 flex justify-center">
          {action}
        </div>
      )}
    </div>
  )
}

export type { EmptyStateProps }