import { z } from 'zod'

const ALLOWED_KEYS = [
  'background','foreground','card','card_foreground','primary','primary_foreground','accent','accent_foreground','destructive','border','seat_available','seat_selected','seat_sold','seat_reserved','gradient_hero','gradient_hover','chart_1','chart_2','chart_3','chart_4','chart_5','color_surface','color_card','color_border','muted'
]

function isValidCssValue(v: string) {
  if (!v || typeof v !== 'string') return false
  const s = v.trim()
  // Accept hex (#rrggbb), rgb(a)(), oklch(), var(), and gradients
  const hex = /^#([0-9A-Fa-f]{6})$/
  const func = /^(rgba?|oklch|hsla?)\(/i
  const gradient = /(linear-gradient|radial-gradient|conic-gradient)/i
  if (hex.test(s)) return true
  if (func.test(s)) return true
  if (gradient.test(s)) return true
  if (s.startsWith('var(')) return true
  // Accept CSS color keywords as a last resort
  if (/^[a-zA-Z\-]+$/.test(s)) return true
  return false
}

export const themeTokensSchema = z.record(z.string(), z.string()).superRefine((obj, ctx) => {
  for (const key of Object.keys(obj)) {
    if (!ALLOWED_KEYS.includes(key)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unsupported key: ${key}` })
    }
    const val = obj[key]
    if (!isValidCssValue(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid CSS value for ${key}: ${val}` })
    }
  }
})

export function validateThemeTokens(tokens: unknown) {
  return themeTokensSchema.safeParse(tokens)
}
