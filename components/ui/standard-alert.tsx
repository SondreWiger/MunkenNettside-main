"use client"

import { AlertCircle, CheckCircle, Info, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface StandardAlertProps {
  variant?: "error" | "success" | "warning" | "info"
  title?: string
  message: string
  onDismiss?: () => void
  className?: string
}

export function StandardAlert({
  variant = "info",
  title,
  message,
  onDismiss,
  className
}: StandardAlertProps) {
  const icons = {
    error: AlertCircle,
    success: CheckCircle,
    warning: AlertCircle,
    info: Info
  }

  const variants = {
    error: "destructive",
    success: "default",
    warning: "default",
    info: "default"
  } as const

  const colors = {
    error: "text-red-600",
    success: "text-green-600", 
    warning: "text-yellow-600",
    info: "text-blue-600"
  }

  const backgrounds = {
    error: "bg-red-50 border-red-200",
    success: "bg-green-50 border-green-200",
    warning: "bg-yellow-50 border-yellow-200", 
    info: "bg-blue-50 border-blue-200"
  }

  const Icon = icons[variant]

  return (
    <Alert 
      variant={variant === "error" ? "destructive" : "default"} 
      className={cn(
        variant !== "error" && backgrounds[variant],
        className
      )}
    >
      <Icon className={cn("h-4 w-4", colors[variant])} />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription className="flex items-center justify-between">
        <span>{message}</span>
        {onDismiss && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </AlertDescription>
    </Alert>
  )
}

interface FormErrorProps {
  errors: string[]
  onDismiss?: () => void
}

export function FormError({ errors, onDismiss }: FormErrorProps) {
  if (errors.length === 0) return null

  return (
    <StandardAlert
      variant="error"
      title="Feil oppstod"
      message={errors.length === 1 ? errors[0] : `${errors.length} feil må rettes`}
      onDismiss={onDismiss}
    />
  )
}