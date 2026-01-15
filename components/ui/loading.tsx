"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ComponentProps } from "react"

interface LoadingButtonProps extends ComponentProps<typeof Button> {
  loading?: boolean
  loadingText?: string
}

export function LoadingButton({
  children,
  loading = false,
  loadingText = "Laster...",
  disabled,
  className,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      disabled={disabled || loading}
      className={cn(className)}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText}
        </>
      ) : (
        children
      )}
    </Button>
  )
}

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2 className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
    </div>
  )
}

interface LoadingPageProps {
  message?: string
}

export function LoadingPage({ message = "Laster..." }: LoadingPageProps) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  )
}