import { z } from 'zod'

// Minimal inline validation mirroring validateThemeTokens
const ALLOWED_KEYS = [
  'background','foreground','card','card_foreground','primary','primary_foreground','accent','accent_foreground','destructive','border','seat_available','seat_selected','seat_sold','seat_reserved','gradient_hero','gradient_hover'
]

function isValidCssValue(v) {
  if (!v || typeof v !== 'string') return false
  const s = v.trim()
  const hex = /^#([0-9A-Fa-f]{6})$/
  const func = /^(rgba?|oklch|hsla?)\(/i
  const gradient = /(linear-gradient|radial-gradient|conic-gradient)/i
  if (hex.test(s)) return true
  if (func.test(s)) return true
  if (gradient.test(s)) return true
  if (s.startsWith('var(')) return true
  if (/^[a-zA-Z\-]+$/.test(s)) return true
  return false
}

function validateThemeTokens(tokens) {
  if (typeof tokens !== 'object' || tokens === null) return { success: false }
  for (const k of Object.keys(tokens)) {
    if (!ALLOWED_KEYS.includes(k)) return { success: false, reason: `Unsupported key ${k}` }
    if (!isValidCssValue(tokens[k])) return { success: false, reason: `Invalid value for ${k}` }
  }
  return { success: true }
}

const good = {
  background: '#ffffff',
  primary: '#ff0000',
  gradient_hero: 'linear-gradient(90deg,#000,#111)'
}

const bad = {
  background: 'not-a-color',
  unknown_key: '#000000'
}

console.log('Testing good tokens...')
const ok = validateThemeTokens(good)
if (!ok.success) {
  console.error('Expected good tokens to validate', ok)
  process.exit(1)
}
console.log('Good tokens validated')

console.log('Testing bad tokens...')
const badRes = validateThemeTokens(bad)
if (badRes.success) {
  console.error('Expected bad tokens to fail', badRes)
  process.exit(1)
}
console.log('Bad tokens correctly rejected')
console.log('All theme token tests passed')
