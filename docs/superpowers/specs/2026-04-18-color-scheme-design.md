# Color Scheme Design

**Date:** 2026-04-18  
**Status:** Approved

## Goal

Apply a new OKLCH-based color palette to the existing shadcn/ui theming system. Remove dark mode. No new dependencies.

## Approach

Store full `oklch(...)` color strings directly in CSS custom properties. Update Tailwind config to reference them via `var(--xxx)` instead of the current `hsl(var(--xxx))` pattern.

## Files Changed

### `src/index.css`

Replace `:root` block with OKLCH values. Delete `.dark` block entirely.

| Variable | Source (DaisyUI) | Value |
|---|---|---|
| `--background` | base-100 | `oklch(95.127% 0.007 260.731)` |
| `--foreground` | base-content | `oklch(32.437% 0.022 264.182)` |
| `--card` | base-200 | `oklch(93.299% 0.01 261.788)` |
| `--card-foreground` | base-content | `oklch(32.437% 0.022 264.182)` |
| `--popover` | base-200 | `oklch(93.299% 0.01 261.788)` |
| `--popover-foreground` | base-content | `oklch(32.437% 0.022 264.182)` |
| `--primary` | primary | `oklch(59.435% 0.077 254.027)` |
| `--primary-foreground` | primary-content | `oklch(11.887% 0.015 254.027)` |
| `--secondary` | secondary | `oklch(69.651% 0.059 248.687)` |
| `--secondary-foreground` | secondary-content | `oklch(13.93% 0.011 248.687)` |
| `--muted` | base-200 | `oklch(93.299% 0.01 261.788)` |
| `--muted-foreground` | neutral | `oklch(45.229% 0.035 264.131)` |
| `--accent` | accent | `oklch(77.464% 0.062 217.469)` |
| `--accent-foreground` | accent-content | `oklch(15.492% 0.012 217.469)` |
| `--destructive` | error | `oklch(60.61% 0.12 15.341)` |
| `--destructive-foreground` | error-content | `oklch(12.122% 0.024 15.341)` |
| `--border` | base-300 | `oklch(89.925% 0.016 262.749)` |
| `--input` | base-300 | `oklch(89.925% 0.016 262.749)` |
| `--ring` | primary | `oklch(59.435% 0.077 254.027)` |
| `--radius` | radius-box | `0.5rem` |

### `tailwind.config.js`

- Remove `darkMode: ["class"]`
- Change all color values from `hsl(var(--xxx))` to `var(--xxx)`

## Out of Scope

- DaisyUI installation
- Dark mode variant
- Component-level color overrides
- info/success/warning tokens (no shadcn/ui equivalents)
