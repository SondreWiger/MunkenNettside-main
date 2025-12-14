## Munken Teatret — Styling & Visual Direction

Goal: craft a minimalist, cinematic, tactile UI inspired by editorial film aesthetics (think A24-style). Bold typography, generous negative space, careful texture, and a limited warm/neutral palette — fresh and unique, not another generic theme.

Principles
- Cinematic: large type, cinematic crops, and breathing space.
- Minimal: remove non-essential UI chrome; use purposeful content hierarchy.
- Tactile: subtle textures (grain, paper-tones) and real-weight typography.
- Accessible: contrast and sizing meet WCAG; motion respects prefers-reduced-motion.

Typography
- Headings (display): a bold, elegant display face for headings. Primary choice: Playfair Display (or Prata) for headlines (serif display with strong contrast). If a more modern grotesk is preferred for headlines, use Space Grotesk or GT-America-style option. Fallbacks: 'Georgia', 'Times New Roman'.
- Body / UI: Inter (variable) — clean, neutral, excellent legibility. Use Inter for buttons, labels and all UI text.
- Pairing: Display serif for hero / page titles; Inter (sans) for body and UI.
- Weights & tracking:
  - Headline: 700–900 with tight tracking (letter-spacing: -0.02em for large displays), text-transform: none or small-caps for some sections.
  - H1: 56–72px (3.5–4.5rem) on desktop; H2: 40px; H3: 28px; Body: 16px; Small: 13–14px.
  - Line-height: headings 1.02–1.15, body ~1.5.

Color Palette
- Primary background: Off-white — #F7F5F3
- Primary foreground: Near-black — #0B0B0B
- Accent / Ochre: #D9A93A (warm, editorial accent for subtle highlights)
- Secondary accent (interactive / danger): Deep terracotta — #C84B31
- Muted gray: #6B6B6B (subtext and meta copy)
- Card / surface: #FFFFFF (slightly warm)
- Film/tone overlay (archive and hero): rgba(11,11,11,0.06) or sepia hints

Spacing & Grid
- Base spacing scale (4px system but biased large): 4, 8, 12, 16, 24, 32, 48, 64, 96.
- Generous negative space is part of the identity: prefer 24–48px spacing between large sections and 48–120px top padding for hero areas.
- Content max-widths: Body content comfortable at 680–760px for reading; hero/title areas can be full-bleed with asymmetric cropping.
- Grid: use a 12-column grid for large screens, collapse to single column on small screens.

Shadows & Elevation
- Keep shadows minimal and soft; avoid heavy neumorphism.
- Tokens:
  - shadow-soft: 0 8px 24px rgba(11,11,11,0.08)
  - shadow-pop: 0 18px 40px rgba(11,11,11,0.12)
  - shadow-focus: 0 0 0 4px rgba(217,169,58,0.12) (for keyboard focus rings on important CTA when visible)

Buttons & CTAs
- Primary CTA: solid near-black background, white uppercase text, medium letter spacing (0.08em), padding 12–14px vertical, 20–32px horizontal, rounded 2px or 4px square corner.
- Secondary CTA: outline with 1px border in near-black, transparent bg, dark text.
- Tertiary link: simple inline text with subtle underline on hover.
- Hover states: slight translateY(-1px) and subtle increase in shadow.

Forms & Inputs
- Inputs: tall, generous padding (14–16px vertical), subtle bottom border or ghost border (#EDEBE8), no heavy rounded corners.
- Labels: inter 12–13px uppercase or small-caps for microcopy.
- Error state: underline or small text in terracotta (#C84B31) and an accessible aria-live message.

Imagery & Treatments
- Hero and featured images: cinematic crops, portrait and close-ups, shallow depth-of-field. Prefer moody, desaturated color grades with a warm highlight.
- Apply a soft film-grain overlay (SVG or lightweight PNG) in hero and archival sections to add tactility.
- For archive pages use sepia/rolled paper tint or vignette to convey an 'archival' feel; use slightly different typography pairings (more serif feel) for those pages.

Layout patterns & Components
- Header: compact, slim height, understated links (no large sticky header). Use a subtle border-bottom only when scrolled.
- Hero / Landing: full-bleed image with oversized display title (H1) left or center aligned, small eyebrow label and primary CTA. Consider asymmetric composition (text block on left, image on right, or centred with generous negative space).
- Card: vertical card with cropped image on top, two-line title, muted metadata, slight shadow-soft.
- Grid & Listing: prominent card grid with generous spacing and large clickable areas.
- Archive list: typographic list with dates and small excerpt; filters easily accessible with button group.

Interaction & Motion
- Keep motion subtle and purposeful: fade + gentle translate on entrance; prefer scale/translate for hover cues on CTAs and images.
- Respect prefers-reduced-motion and reduce all motion durations to zero if set.

Accessibility & Performance
- Maintain contrast ratio >= 4.5:1 for body text; ensure focus outlines visible and clear.
- Fonts: use variable fonts and subset for web; self-host if privacy/performance demands.
- Optimize images: modern formats (AVIF/WebP), responsive srcset, lazy-load non-critical images.

Implementation Roadmap (short)
1. Create tokens in `globals.css` and Tailwind theme (`tailwind.config.mjs`) — colors, spacing, typography, shadows.
2. Add font imports (prefer local/Google) and preload critical fonts in `app/layout.tsx`.
3. Update `globals.css` to include base typographic rules and film grain utilities.
4. Refactor `Header`, `Footer`, `Button`, `Card`, and hero components to use tokens.
5. Add small visual snapshot tests (Playwright/Chromatic) and run accessibility checks.

Design Notes & Do's
- Use asymmetry, cinematic crops, and white space to stand out.
- Limit color usage: keep most of the site monochrome with selective warm accents.
- Avoid generic stock photography; prefer crafted imagery or color-graded stills.

Example CSS variables (starter)
```css
:root {
  --bg: #F7F5F3;
  --fg: #0B0B0B;
  --muted: #6B6B6B;
  --accent: #D9A93A;
  --danger: #C84B31;
  --card: #FFFFFF;
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px; --space-6: 24px; --space-8: 32px; --space-12: 48px;
  --shadow-soft: 0 8px 24px rgba(11,11,11,0.08);
}
```

Closing / Tone
This direction leans into editorial cinema — quiet but confident. It's less about flashy UI and more about craft: careful type, strong photography, and breathing space. If you want, I can implement the first three technical steps (tokens, fonts, base globals) and update Header and Footer to the new style.
