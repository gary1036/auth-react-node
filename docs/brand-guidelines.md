# Auth Lab — Brand Guidelines

Source of truth for product UI. Visual tokens live in `design-system/auth-lab/MASTER.md` and `apps/web/src/styles.css`.

## Positioning

Auth Lab is a focused auth + admin toolkit with a live weather module. Clear, modern, and operational — not decorative.

## Voice

- Direct and practical
- Short sentences, concrete labels
- Prefer “Sign in” over marketing flourish

## Visual identity

Default surface is **soft gray** — light zinc canvas, not near-black.

| Token | Value | Use |
|-------|-------|-----|
| Primary | `#52525B` | Brand, focus ring, nav active |
| Accent / CTA | `#3F3F46` | Primary buttons, key actions |
| Background | `#F4F4F5` | App canvas |
| Foreground | `#27272A` | Body text |
| Surface | `#FFFFFF` | Panels, inputs |
| Border | `#D4D4D8` | Dividers, inputs |
| Destructive | `#DC2626` | Errors, deactivate |

## Typography

- **Family:** Plus Jakarta Sans (300–700)
- Headings: 600–700, tight tracking
- Body: 400–500
- Brand wordmark uses the same family at display size (no separate serif)

## Logo / wordmark

- Product name **Auth Lab** is the primary brand signal on auth and shell surfaces
- Do not reduce the wordmark to a tiny nav-only label on first-view auth screens
- Keep wordmark gray (`--color-primary`)

## Motion

- Transitions: 150–200ms ease for controls
- Page enter: light rise/fade (~400ms)
- Respect `prefers-reduced-motion`

## Do / Don’t

- Do: soft gray light surfaces, clear hierarchy, visible focus rings
- Don’t: near-black backgrounds, teal/orange neon accents, purple gradients, emoji-as-icons
