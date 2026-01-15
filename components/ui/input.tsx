"use client"
import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        `placeholder:text-[var(--color-muted-foreground)] selection:bg-[var(--color-primary)] selection:text-[var(--color-primary-foreground)] bg-[var(--color-popover)] border border-[var(--color-border)] h-11 w-full min-w-[44px] rounded-[var(--radius-md)] px-4 py-2 text-base text-[var(--color-foreground)] shadow-soft transition-[color,box-shadow] outline-none`,
        `focus-visible:ring-[var(--color-ring)] focus-visible:ring-[3px] aria-invalid:ring-[var(--color-destructive)]/20 dark:aria-invalid:ring-[var(--color-destructive)]/40 aria-invalid:border-[var(--color-destructive)]`,
        className,
      )}
      {...props}
    />
  )
}

export { Input }
