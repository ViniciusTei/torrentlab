# Color Scheme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply a new OKLCH color palette to the shadcn/ui theming system and remove dark mode.

**Architecture:** Store full `oklch(...)` strings directly in CSS custom properties in `src/index.css`. Update `tailwind.config.js` to reference them with `var(--xxx)` instead of `hsl(var(--xxx))`. No new dependencies.

**Tech Stack:** Tailwind CSS v3, shadcn/ui CSS variable conventions, OKLCH color format.

---

## Files Changed

- **Modify:** `src/index.css` — replace `:root` color values with OKLCH, delete `.dark` block
- **Modify:** `tailwind.config.js` — remove `darkMode`, change color references from `hsl(var(...))` to `var(...)`

---

### Task 1: Update CSS custom properties in `src/index.css`

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Replace the entire `@layer base` block (lines 5–76) with the new OKLCH values**

Open `src/index.css` and replace everything from `@layer base {` through the closing `}` of the `.dark` block with:

```css
@layer base {
  :root {
    --background: oklch(95.127% 0.007 260.731);
    --foreground: oklch(32.437% 0.022 264.182);

    --card: oklch(93.299% 0.01 261.788);
    --card-foreground: oklch(32.437% 0.022 264.182);

    --popover: oklch(93.299% 0.01 261.788);
    --popover-foreground: oklch(32.437% 0.022 264.182);

    --primary: oklch(59.435% 0.077 254.027);
    --primary-foreground: oklch(11.887% 0.015 254.027);

    --secondary: oklch(69.651% 0.059 248.687);
    --secondary-foreground: oklch(13.93% 0.011 248.687);

    --muted: oklch(93.299% 0.01 261.788);
    --muted-foreground: oklch(45.229% 0.035 264.131);

    --accent: oklch(77.464% 0.062 217.469);
    --accent-foreground: oklch(15.492% 0.012 217.469);

    --destructive: oklch(60.61% 0.12 15.341);
    --destructive-foreground: oklch(12.122% 0.024 15.341);

    --border: oklch(89.925% 0.016 262.749);
    --input: oklch(89.925% 0.016 262.749);
    --ring: oklch(59.435% 0.077 254.027);

    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

- [ ] **Step 2: Verify the file looks correct**

Run:
```bash
cat src/index.css
```

Expected: No `.dark` block, no `hsl()` channel-only values, only the `:root` block and the two `@layer base` blocks.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: apply OKLCH color palette, remove dark mode"
```

---

### Task 2: Update Tailwind config to use `var()` instead of `hsl(var())`

**Files:**
- Modify: `tailwind.config.js`

- [ ] **Step 1: Replace the entire contents of `tailwind.config.js`**

```js
import tailwindAnimate from 'tailwindcss-animate'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [tailwindAnimate],
}
```

- [ ] **Step 2: Start the dev server and verify visually**

In one terminal:
```bash
cd server && npm start
```

In another terminal:
```bash
npm run dev
```

Open `http://localhost:5173`. The app should render with the new muted blue-gray palette. Check:
- Page background is a light cool gray (not white)
- Text is dark blue-gray (not black)
- Buttons use the muted blue primary color
- No dark mode toggle breaks anything (dark class no longer does anything)

- [ ] **Step 3: Run the linter**

```bash
npm run lint
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.js
git commit -m "feat: update tailwind config to use var() for OKLCH color tokens"
```
