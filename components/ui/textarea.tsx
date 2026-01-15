import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        `placeholder:text-[var(--color-muted-foreground)] bg-[var(--color-popover)] border border-[var(--color-border)] min-h-16 w-full rounded-[var(--radius-md)] px-4 py-3 text-base text-[var(--color-foreground)] shadow-soft transition-[color,box-shadow] outline-none`,
        `focus-visible:ring-[var(--color-ring)] focus-visible:ring-[3px] aria-invalid:ring-[var(--color-destructive)]/20 dark:aria-invalid:ring-[var(--color-destructive)]/40 aria-invalid:border-[var(--color-destructive)] disabled:cursor-not-allowed disabled:opacity-50`,
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
