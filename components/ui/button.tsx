import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:brightness-95 shadow-soft',
        destructive:
          'bg-[var(--color-destructive)] text-[var(--color-primary-foreground)] hover:brightness-95 focus-visible:ring-[var(--color-destructive)]/20 dark:focus-visible:ring-[var(--color-destructive)]/40 dark:bg-[var(--color-destructive)]/60',
        outline:
          'border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-foggy-white)] hover:border-[var(--color-border)] hover:text-[var(--color-foreground)]',
        secondary:
          'bg-[var(--color-accent)] text-[var(--color-spotlight-warm)] hover:opacity-95',
        ghost:
          'bg-transparent hover:bg-[var(--color-accent)] hover:text-[var(--color-spotlight-warm)] dark:hover:bg-[var(--color-accent)]/50',
        link: 'text-[var(--color-primary)] underline-offset-4 hover:underline',
      },
      size: {
  default: 'h-10 px-4 py-2 has-[>svg]:px-3 min-h-[44px] min-w-[44px]',
  sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
  lg: 'h-12 rounded-md px-8 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }

function Button({
  className,
  variant,
  size,
  asChild = false,
  type = 'button',
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button'

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
      // Default to type="button" for forms to avoid accidental submits
      type={type}
    />
  )
}

export { Button, buttonVariants }
