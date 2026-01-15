export type ThemeTokens = Record<string, string>

/**
 * Apply theme tokens as CSS variables on :root.
 * Keys will be set as --<key> (underscores replaced with dashes).
 */
export function applyTheme(tokens: ThemeTokens) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  Object.entries(tokens || {}).forEach(([k, v]) => {
    const base = k.replace(/_/g, '-')
    const varNames = [
      `--${base}`,
      // Many parts of the codebase expect variables prefixed with "color-"
      `--color-${base}`,
    ]

    varNames.forEach((varName) => {
      try {
        if (v === null || v === undefined || v === '') {
          root.style.removeProperty(varName)
        } else {
          root.style.setProperty(varName, v)
        }
      } catch (e) {
        // ignore invalid css values
        // eslint-disable-next-line no-console
        console.warn('Failed to set theme variable', varName, v)
      }
    })
  })
}
