"use client"

import * as React from "react"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { XIcon, AlertTriangleIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog"

export function ConfirmationDialog({
  trigger,
  title,
  description,
  onConfirm,
  onCancel,
  destructiveText = "Confirm",
  cancelText = "Cancel",
  className,
}: {
  trigger: React.ReactNode
  title: string
  description: string
  onConfirm: () => void
  onCancel?: () => void
  destructiveText?: string
  cancelText?: string
  className?: string
}) {
  return (
    <AlertDialogPrimitive.Root className={className} onOpenChange={open => {
      if (!open && onCancel) {
        onCancel()
      }
    }}>
      <AlertDialogPortal>
        <AlertDialogOverlay />
        <AlertDialogContent className="text-center sm:text-left">
          <AlertDialogHeader>
            <AlertDialogTitle>
              <AlertTriangleIcon className="h-5 w-5 text-destructive mb-3" />
              {title}
            </AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <button variant="outline" onClick={onCancel}>
                {cancelText}
              </button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <button variant="destructive" onClick={onConfirm}>
                {destructiveText}
              </button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogPortal>
      <AlertDialogTrigger>{trigger}</AlertDialogTrigger>
    </AlertDialogPrimitive.Root>
  )
}

export {
  ConfirmationDialog,
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel
}