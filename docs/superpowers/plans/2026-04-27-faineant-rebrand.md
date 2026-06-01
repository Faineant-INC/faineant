# FAINEANT Rebrand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand `arc` (warm-editorial beauty marketplace) into `FAINEANT` (brutalist-mark + indolent-voice in-home Chicago beauty service) — full surface refresh across web, mobile, shared packages, with new palette, type system, photography, voice, and package names.

**Architecture:** Single shared theme module in `@faineant/shared/theme` consumed by both web Tailwind config and mobile React Native styles, ensuring web/mobile parity. Logo always renders as image asset (never typed). Dark canonical surface (smoke-900 ground) with light variant for transactional emails. Eight pre-generated photographs are wired in as static assets in each app's public/asset directory.

**Tech Stack:** Next.js 14 + Tailwind 3.4 + shadcn/ui (CVA + Radix) for web · Expo 50 + React Native + Expo Router for mobile · Prisma + PostgreSQL for API · pnpm workspaces + Turborepo for monorepo · Vitest (web/api) + Jest (mobile) for tests · Bricolage Grotesque + Inter + Cormorant Garamond + Geist Mono via Google Fonts.

**Spec:** `docs/superpowers/specs/2026-04-27-faineant-rebrand-design.md` (commit `c782f37`).

**Source assets:** `.superpowers/brainstorm/81088-1777312625/content/` contains 8 photographs (`hero.png`, `tile-{hair,nails,face,lash,barber,makeup}.png`, `portrait-maeve.png`) and 7 logo variants (`faineant-{logo,wordmark,monogram}-{white,black,champagne}.png`).

---

## Phase 0 — Setup

### Task 0.1: Verify branch and copy brand assets into apps

**Files:**
- Create: `apps/web/public/brand/` (directory)
- Create: `apps/web/public/brand/photography/` (directory)
- Create: `apps/mobile/assets/brand/` (directory)
- Create: `apps/mobile/assets/brand/photography/` (directory)
- Copy: 7 logo PNGs into both web and mobile brand dirs
- Copy: 8 photography PNGs into both web and mobile photography dirs

- [ ] **Step 1: Confirm working branch**

Run: `git status -sb`
Expected: `## claude/design-arc-marketplace-kU3e2` or another active branch (NOT `main`).

- [ ] **Step 2: Create asset directories**

Run:
```bash
mkdir -p apps/web/public/brand/photography apps/mobile/assets/brand/photography
```

- [ ] **Step 3: Copy logo files into web and mobile**

Run:
```bash
SRC=.superpowers/brainstorm/81088-1777312625/content
for variant in faineant-logo-white faineant-logo-black faineant-logo-champagne \
               faineant-wordmark-white faineant-wordmark-black \
               faineant-monogram-white faineant-monogram-black; do
  cp "$SRC/$variant.png" apps/web/public/brand/
  cp "$SRC/$variant.png" apps/mobile/assets/brand/
done
ls apps/web/public/brand/ apps/mobile/assets/brand/
```
Expected: 7 PNGs listed in each directory.

- [ ] **Step 4: Copy photography into web and mobile**

Run:
```bash
SRC=.superpowers/brainstorm/81088-1777312625/content
for img in hero tile-hair tile-nails tile-face tile-lash tile-barber tile-makeup portrait-maeve; do
  cp "$SRC/$img.png" apps/web/public/brand/photography/
  cp "$SRC/$img.png" apps/mobile/assets/brand/photography/
done
ls apps/web/public/brand/photography/ apps/mobile/assets/brand/photography/
```
Expected: 8 PNGs listed in each directory.

- [ ] **Step 5: Commit**

```bash
git add apps/web/public/brand apps/mobile/assets/brand
git commit -m "$(cat <<'EOF'
feat(brand): import FAINEANT logo and photography assets

Adds 7 logo variants (full lockup, wordmark, monogram in white/black/
champagne) and 8 photographs (hero, 6 service tiles, Maeve portrait)
to both apps. Photography is gpt-image-1 output; will be regenerated
on gpt-image-2 once the OpenAI org is verified.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Phase 1 — Tokens, fonts, theme module

### Task 1.1: Add brand constants to @arc/shared

**Files:**
- Create: `packages/shared/src/constants/brand.ts`
- Modify: `packages/shared/src/index.ts` (re-export)

- [ ] **Step 1: Create the brand constants file**

```typescript
// packages/shared/src/constants/brand.ts
export const BRAND_NAME = "FAINEANT" as const;
export const BRAND_LEGAL_NAME = "Faineant Inc." as const;
export const BRAND_DOMAIN = "faineantapp.com" as const;
export const BRAND_TAGLINE = "House calls for the slow-living." as const;
export const BRAND_SUPPORT_EMAIL = "support@faineantapp.com" as const;

export const CITY = "Chicago" as const;

export const NEIGHBOURHOODS = [
  "West Loop",
  "Logan Square",
  "Wicker Park",
  "Lincoln Park",
  "Fulton Market",
  "River North",
] as const;

export type Neighbourhood = (typeof NEIGHBOURHOODS)[number];

export const SERVICE_CATEGORIES = [
  { slug: "hair", label: "Hair", numberLabel: "№ 01" },
  { slug: "nails", label: "Nails", numberLabel: "№ 02" },
  { slug: "face", label: "Face", numberLabel: "№ 03" },
  { slug: "lash", label: "Lash", numberLabel: "№ 04" },
  { slug: "barber", label: "Barber", numberLabel: "№ 05" },
  { slug: "makeup", label: "Makeup", numberLabel: "№ 06" },
] as const;

export type ServiceCategorySlug = (typeof SERVICE_CATEGORIES)[number]["slug"];
```

- [ ] **Step 2: Re-export from package index**

Open `packages/shared/src/index.ts`. Add this line (preserve existing exports):
```typescript
export * from "./constants/brand";
```

- [ ] **Step 3: Build the shared package**

Run: `pnpm --filter @arc/shared build`
Expected: builds without errors.

- [ ] **Step 4: Commit**

```bash
git add packages/shared/src/constants/brand.ts packages/shared/src/index.ts
git commit -m "feat(shared): add FAINEANT brand constants

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.2: Create the shared theme module

**Files:**
- Create: `packages/shared/src/theme/palette.ts`
- Create: `packages/shared/src/theme/type.ts`
- Create: `packages/shared/src/theme/motion.ts`
- Create: `packages/shared/src/theme/index.ts`
- Modify: `packages/shared/src/index.ts`

- [ ] **Step 1: Create palette tokens**

```typescript
// packages/shared/src/theme/palette.ts
export const palette = {
  smoke: {
    950: "#0a0908",
    900: "#0e0d0c",
    800: "#15130f",
    700: "#1f1c18",
    600: "#2a2620",
  },
  taupe: {
    500: "#3a342a",
    400: "#5a5240",
    300: "#8a7e64",
  },
  champagne: {
    500: "#b8a780",
    400: "#c9b896",
    300: "#dccfb1",
  },
  bone: {
    200: "#e8dfc9",
    100: "#f3ede1",
    50: "#faf6ec",
  },
  oxblood: {
    500: "#6e2424",
  },
} as const;

export type PaletteScale = keyof typeof palette;
```

- [ ] **Step 2: Create type tokens**

```typescript
// packages/shared/src/theme/type.ts
export const fontFamily = {
  display: "Bricolage Grotesque, sans-serif",
  body: "Inter, system-ui, sans-serif",
  editorial: "Cormorant Garamond, Georgia, serif",
  mono: "Geist Mono, ui-monospace, monospace",
} as const;

export const fontWeight = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  black: 800,
} as const;

export const fontSize = {
  "display-xl": { size: "7rem", lineHeight: 0.92, letterSpacing: "-0.04em", weight: 700 },
  "display-lg": { size: "5rem", lineHeight: 0.94, letterSpacing: "-0.04em", weight: 700 },
  display: { size: "3.5rem", lineHeight: 0.95, letterSpacing: "-0.04em", weight: 700 },
  "editorial-xl": { size: "5rem", lineHeight: 1.05, letterSpacing: "-0.02em", weight: 300 },
  "editorial-lg": { size: "3rem", lineHeight: 1.10, letterSpacing: "-0.02em", weight: 300 },
  editorial: { size: "1.5rem", lineHeight: 1.40, letterSpacing: "-0.005em", weight: 300 },
  heading: { size: "2rem", lineHeight: 1.05, letterSpacing: "-0.03em", weight: 700 },
  subheading: { size: "1.25rem", lineHeight: 1.30, letterSpacing: "-0.02em", weight: 500 },
  "body-lg": { size: "1.125rem", lineHeight: 1.55, letterSpacing: "0", weight: 400 },
  body: { size: "1rem", lineHeight: 1.55, letterSpacing: "0", weight: 400 },
  "body-sm": { size: "0.875rem", lineHeight: 1.50, letterSpacing: "0", weight: 400 },
  caption: { size: "0.75rem", lineHeight: 1.50, letterSpacing: "0.04em", weight: 400 },
  label: { size: "0.6875rem", lineHeight: 1.40, letterSpacing: "0.32em", weight: 500 },
  mono: { size: "0.8125rem", lineHeight: 1.55, letterSpacing: "0.04em", weight: 400 },
} as const;

export type FontSizeKey = keyof typeof fontSize;
```

- [ ] **Step 3: Create motion tokens**

```typescript
// packages/shared/src/theme/motion.ts
export const easing = {
  smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
  fast: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

export const duration = {
  fast: 250,
  normal: 400,
  slow: 600,
} as const;
```

- [ ] **Step 4: Create theme index barrel**

```typescript
// packages/shared/src/theme/index.ts
export * from "./palette";
export * from "./type";
export * from "./motion";
```

- [ ] **Step 5: Re-export from package index**

Open `packages/shared/src/index.ts`. Add (preserve existing exports):
```typescript
export * from "./theme";
```

- [ ] **Step 6: Build and verify**

Run: `pnpm --filter @arc/shared build && pnpm --filter @arc/shared typecheck`
Expected: clean build.

- [ ] **Step 7: Commit**

```bash
git add packages/shared/src/theme packages/shared/src/index.ts
git commit -m "feat(shared): add theme module (palette, type, motion)

Single source of truth for design tokens consumed by web Tailwind
config and mobile React Native styles.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.3: Update web Tailwind config with new palette and type scale

**Files:**
- Modify: `apps/web/tailwind.config.ts` (full rewrite of `theme.extend`)

- [ ] **Step 1: Replace tailwind.config.ts contents**

Open `apps/web/tailwind.config.ts`. Replace entire file with:

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        smoke: {
          950: "#0a0908",
          900: "#0e0d0c",
          800: "#15130f",
          700: "#1f1c18",
          600: "#2a2620",
        },
        taupe: {
          500: "#3a342a",
          400: "#5a5240",
          300: "#8a7e64",
        },
        champagne: {
          500: "#b8a780",
          400: "#c9b896",
          300: "#dccfb1",
        },
        bone: {
          200: "#e8dfc9",
          100: "#f3ede1",
          50: "#faf6ec",
        },
        oxblood: {
          500: "#6e2424",
        },
        // shadcn variable shims (read CSS vars from globals.css)
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background) / <alpha-value>)",
          foreground: "hsl(var(--sidebar-foreground) / <alpha-value>)",
          primary: "hsl(var(--sidebar-primary) / <alpha-value>)",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground) / <alpha-value>)",
          accent: "hsl(var(--sidebar-accent) / <alpha-value>)",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground) / <alpha-value>)",
          border: "hsl(var(--sidebar-border) / <alpha-value>)",
          ring: "hsl(var(--sidebar-ring) / <alpha-value>)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Bricolage Grotesque", "sans-serif"],
        sans: ["var(--font-body)", "Inter", "system-ui", "sans-serif"],
        editorial: ["var(--font-editorial)", "Cormorant Garamond", "Georgia", "serif"],
        mono: ["var(--font-mono)", "Geist Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        "display-xl": ["7rem", { lineHeight: "0.92", letterSpacing: "-0.04em", fontWeight: "700" }],
        "display-lg": ["5rem", { lineHeight: "0.94", letterSpacing: "-0.04em", fontWeight: "700" }],
        display: ["3.5rem", { lineHeight: "0.95", letterSpacing: "-0.04em", fontWeight: "700" }],
        "editorial-xl": ["5rem", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "300" }],
        "editorial-lg": ["3rem", { lineHeight: "1.10", letterSpacing: "-0.02em", fontWeight: "300" }],
        editorial: ["1.5rem", { lineHeight: "1.40", letterSpacing: "-0.005em", fontWeight: "300" }],
        heading: ["2rem", { lineHeight: "1.05", letterSpacing: "-0.03em", fontWeight: "700" }],
        subheading: ["1.25rem", { lineHeight: "1.30", letterSpacing: "-0.02em", fontWeight: "500" }],
        "body-lg": ["1.125rem", { lineHeight: "1.55" }],
        body: ["1rem", { lineHeight: "1.55" }],
        "body-sm": ["0.875rem", { lineHeight: "1.50" }],
        caption: ["0.75rem", { lineHeight: "1.50", letterSpacing: "0.04em" }],
        label: ["0.6875rem", { lineHeight: "1.40", letterSpacing: "0.32em", fontWeight: "500" }],
        mono: ["0.8125rem", { lineHeight: "1.55", letterSpacing: "0.04em" }],
      },
      borderRadius: {
        sm: "0.125rem",
        DEFAULT: "0.125rem",
        md: "0.25rem",
        lg: "0.375rem",
        xl: "0.5rem",
        "2xl": "0.75rem",
      },
      transitionTimingFunction: {
        "fai-smooth": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      transitionDuration: {
        slow: "600ms",
        normal: "400ms",
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "sheet-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "sheet-out-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" },
        },
        "sheet-in-left": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "sheet-out-left": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-100%)" },
        },
        "sheet-in-bottom": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "sheet-out-bottom": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(100%)" },
        },
        "overlay-in": { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        "overlay-out": { "0%": { opacity: "1" }, "100%": { opacity: "0" } },
      },
      animation: {
        "fade-in": "fadeIn 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "fade-up": "fadeUp 600ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "sheet-in-right": "sheet-in-right 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "sheet-out-right": "sheet-out-right 250ms ease-in forwards",
        "sheet-in-left": "sheet-in-left 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "sheet-out-left": "sheet-out-left 250ms ease-in forwards",
        "sheet-in-bottom": "sheet-in-bottom 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "sheet-out-bottom": "sheet-out-bottom 250ms ease-in forwards",
        "overlay-in": "overlay-in 400ms ease-out forwards",
        "overlay-out": "overlay-out 200ms ease-in forwards",
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Verify Tailwind picks up new config**

Run: `cd apps/web && pnpm typecheck`
Expected: clean typecheck (some component files will lose their ivory/espresso colours, but TS will not catch CSS class names).

- [ ] **Step 3: Commit**

```bash
git add apps/web/tailwind.config.ts
git commit -m "feat(web): replace Tailwind palette and type scale with FAINEANT tokens

Removes ivory/espresso/brass scales; adds smoke/taupe/champagne/bone
plus oxblood for destructive. Updates fontSize scale per spec, adds
fai-smooth easing and slow/normal duration utilities. Border radius
defaults to 2px (brutalist sharpness).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.4: Update web globals.css with shadcn variable mapping

**Files:**
- Modify: `apps/web/src/styles/globals.css` (full rewrite)

- [ ] **Step 1: Replace globals.css contents**

Open `apps/web/src/styles/globals.css`. Replace entire file with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  /* Dark canonical (default body class is .dark) */
  :root,
  .dark {
    --background: 30 11% 5%;            /* smoke-900 #0e0d0c */
    --foreground: 39 32% 92%;           /* bone-100 #f3ede1 */
    --card: 36 13% 7%;                  /* smoke-800 #15130f */
    --card-foreground: 39 32% 92%;
    --popover: 36 13% 7%;
    --popover-foreground: 39 32% 92%;
    --primary: 39 32% 92%;              /* bone-100 */
    --primary-foreground: 30 11% 5%;    /* smoke-900 */
    --secondary: 33 12% 11%;            /* smoke-700 #1f1c18 */
    --secondary-foreground: 39 38% 85%; /* bone-200 #e8dfc9 */
    --muted: 33 12% 11%;
    --muted-foreground: 38 16% 47%;     /* taupe-300 #8a7e64 */
    --accent: 38 33% 69%;               /* champagne-400 #c9b896 */
    --accent-foreground: 30 11% 5%;
    --destructive: 0 50% 28%;           /* oxblood-500 #6e2424 */
    --destructive-foreground: 39 32% 92%;
    --border: 33 12% 11%;
    --input: 33 12% 11%;
    --ring: 38 33% 69%;
    --radius: 0.125rem;

    --sidebar-background: 30 11% 4%;        /* smoke-950 */
    --sidebar-foreground: 39 32% 92%;
    --sidebar-primary: 38 33% 69%;
    --sidebar-primary-foreground: 30 11% 5%;
    --sidebar-accent: 33 12% 11%;
    --sidebar-accent-foreground: 39 32% 92%;
    --sidebar-border: 33 12% 11%;
    --sidebar-ring: 38 33% 69%;
  }

  /* Light variant (transactional emails, opt-in user setting) */
  .light {
    --background: 39 32% 92%;            /* bone-100 */
    --foreground: 30 11% 5%;             /* smoke-900 */
    --card: 39 41% 95%;                  /* bone-50 */
    --card-foreground: 30 11% 5%;
    --popover: 39 41% 95%;
    --popover-foreground: 30 11% 5%;
    --primary: 30 11% 5%;
    --primary-foreground: 39 32% 92%;
    --secondary: 39 38% 85%;             /* bone-200 */
    --secondary-foreground: 30 11% 5%;
    --muted: 39 38% 85%;
    --muted-foreground: 38 16% 38%;      /* taupe-400 */
    --accent: 38 30% 60%;                /* champagne-500 */
    --accent-foreground: 30 11% 5%;
    --destructive: 0 50% 28%;
    --destructive-foreground: 39 32% 92%;
    --border: 39 38% 85%;
    --input: 39 38% 85%;
    --ring: 38 30% 60%;
  }

  html {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  body {
    @apply bg-smoke-900 text-bone-100 font-sans antialiased;
    font-feature-settings: "kern", "liga", "ss01";
  }

  ::selection {
    @apply bg-champagne-400 text-smoke-900;
  }

  h1, h2, h3, h4, h5, h6 {
    text-wrap: balance;
  }

  p {
    text-wrap: pretty;
  }
}

@layer utilities {
  /* Hairline rule in brand color */
  .rule-hairline {
    @apply border-t border-smoke-700;
  }

  .rule-hairline-warm {
    @apply border-t border-taupe-500;
  }

  /* Editorial caps label — used for section eyebrows */
  .label-caps {
    @apply text-label uppercase text-taupe-300;
  }

  /* Compressed display style — matches wordmark feel */
  .display-compressed {
    font-family: var(--font-display), "Bricolage Grotesque", sans-serif;
    font-stretch: 90%;
    font-weight: 700;
    letter-spacing: -0.04em;
  }

  /* Subtle monogram watermark for manifesto sections */
  .monogram-watermark {
    background-image: url("/brand/faineant-monogram-white.png");
    background-repeat: no-repeat;
    background-position: center;
    background-size: contain;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/styles/globals.css
git commit -m "feat(web): map shadcn CSS variables to Smoke + Champagne palette

Dark mode is canonical; .light is opt-in for transactional emails.
Removes paper-grain texture; adds rule-hairline and monogram-watermark
utilities aligned with the brand voice.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.5: Wire web fonts via next/font/google

**Files:**
- Modify: `apps/web/src/app/layout.tsx`

- [ ] **Step 1: Read the current layout**

Run: `cat apps/web/src/app/layout.tsx`
Expected: existing root layout with body className.

- [ ] **Step 2: Replace contents of `apps/web/src/app/layout.tsx`**

```typescript
import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Inter,
  Cormorant_Garamond,
  Geist_Mono,
} from "next/font/google";
import { BRAND_NAME, BRAND_TAGLINE } from "@arc/shared";
import "@/styles/globals.css";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["italic"],
  variable: "--font-editorial",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: BRAND_NAME, template: `%s · ${BRAND_NAME}` },
  description: BRAND_TAGLINE,
  metadataBase: new URL("https://faineantapp.com"),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${inter.variable} ${cormorant.variable} ${geistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body>{children}</body>
    </html>
  );
}
```

> Note: `@arc/shared` is intentionally still the package alias here — it gets renamed to `@faineant/shared` in Phase 8 (Task 8.1). Do not jump ahead.

- [ ] **Step 3: Verify**

Run: `cd apps/web && pnpm typecheck`
Expected: clean typecheck.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/layout.tsx
git commit -m "feat(web): load FAINEANT typefaces via next/font/google

Bricolage Grotesque (display), Inter (body), Cormorant Garamond
italic (editorial), Geist Mono (data). HTML opens in dark mode
canonical class.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.6: Wire mobile fonts via expo-font

**Files:**
- Modify: `apps/mobile/package.json` (add expo-font + @expo-google-fonts deps)
- Modify: `apps/mobile/src/app/_layout.tsx`

- [ ] **Step 1: Read the current mobile layout**

Run: `cat apps/mobile/src/app/_layout.tsx`

- [ ] **Step 2: Add font dependencies**

Run:
```bash
cd apps/mobile && pnpm add expo-font @expo-google-fonts/bricolage-grotesque @expo-google-fonts/inter @expo-google-fonts/cormorant-garamond
```

- [ ] **Step 3: Replace `apps/mobile/src/app/_layout.tsx`**

```typescript
import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts as useBricolage,
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import {
  useFonts as useInter,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from "@expo-google-fonts/inter";
import {
  useFonts as useCormorant,
  CormorantGaramond_300Light_Italic,
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_500Medium_Italic,
} from "@expo-google-fonts/cormorant-garamond";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [bricolageReady] = useBricolage({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });
  const [interReady] = useInter({
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const [cormorantReady] = useCormorant({
    CormorantGaramond_300Light_Italic,
    CormorantGaramond_400Regular_Italic,
    CormorantGaramond_500Medium_Italic,
  });

  const ready = bricolageReady && interReady && cormorantReady;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

> Geist Mono is not on `@expo-google-fonts`; mobile uses system monospace as fallback. If a future task needs Geist Mono on mobile, ship it as a custom asset font then.

- [ ] **Step 4: Run typecheck**

Run: `cd apps/mobile && pnpm typecheck`
Expected: clean typecheck.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/package.json apps/mobile/src/app/_layout.tsx ../../pnpm-lock.yaml
git commit -m "feat(mobile): load FAINEANT typefaces via expo-font

Bricolage Grotesque, Inter, and Cormorant Garamond italic load before
splash hides. Geist Mono falls back to system monospace.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 1.7: Smoke-test the foundation

**Files:** none (verification only)

- [ ] **Step 1: Build shared, then typecheck both apps**

Run:
```bash
pnpm --filter @arc/shared build
pnpm --filter @arc/web typecheck
pnpm --filter @arc/mobile typecheck
```
Expected: all three pass without errors.

- [ ] **Step 2: Start the web dev server**

Run: `pnpm --filter @arc/web dev`
Expected: server starts on `localhost:3000`.

- [ ] **Step 3: Visually verify**

Open `localhost:3000` in browser. Expected: page may look broken (legacy ARC components reference removed `ivory`/`espresso` classes) but the body background is now smoke-900 and the font appears Inter. **A broken page is acceptable here — components will be re-themed in Phase 2.** Stop the dev server (Ctrl+C).

- [ ] **Step 4: No commit** — verification step only.

---

## Phase 2 — UI primitives

> Phase 2 tasks can run in parallel via subagent-driven-development. Group A (button/card/input/label) blocks nothing else. Groups B, C, D, E are independent of each other once Phase 1 lands.

### Task 2.1: Re-theme button.tsx

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx`

- [ ] **Step 1: Read existing button**

Run: `cat apps/web/src/components/ui/button.tsx`
Expected: CVA with `arc`, `brass`, `arc-outline`, `arc-ghost` variants.

- [ ] **Step 2: Replace with FAINEANT variants**

```typescript
// apps/web/src/components/ui/button.tsx
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm uppercase tracking-[0.3em] text-[0.6875rem] font-medium ring-offset-background transition-all duration-[250ms] ease-fai-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary: bone-100 surface, smoke-900 ink — main CTA on dark
        primary:
          "bg-bone-100 text-smoke-900 border border-bone-100 hover:bg-champagne-400 hover:border-champagne-400",
        // Ghost: transparent on dark with taupe border, bone text
        ghost:
          "bg-transparent text-bone-100 border border-taupe-500 hover:border-bone-100 hover:text-champagne-400",
        // Accent: champagne surface — for "soon" / hero highlight CTAs
        accent:
          "bg-champagne-400 text-smoke-900 border border-champagne-400 hover:bg-champagne-500 hover:border-champagne-500",
        // Outline: hairline border, transparent fill, bone-200 text
        outline:
          "bg-transparent text-bone-200 border border-smoke-700 hover:border-champagne-400 hover:text-champagne-400",
        // Destructive: oxblood, used sparingly
        destructive:
          "bg-oxblood-500 text-bone-100 border border-oxblood-500 hover:bg-oxblood-500/90",
        // Link: tracked, no border, no padding
        link:
          "text-champagne-400 underline-offset-4 hover:underline tracking-normal normal-case text-[0.875rem] p-0 border-0",
        // Default — alias of primary
        default:
          "bg-bone-100 text-smoke-900 border border-bone-100 hover:bg-champagne-400 hover:border-champagne-400",
      },
      size: {
        default: "px-6 py-4",
        sm: "px-4 py-2",
        lg: "px-8 py-5 text-[0.75rem]",
        xl: "px-10 py-6 text-[0.8125rem]",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

- [ ] **Step 3: Verify**

Run: `cd apps/web && pnpm typecheck`
Expected: clean. Existing button tests will still typecheck (variant names like `primary` and `default` are preserved).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/button.tsx
git commit -m "feat(web): re-theme Button with FAINEANT variants

primary (bone), ghost (transparent + taupe border), accent (champagne),
outline (hairline), destructive (oxblood), link. All sharp corners,
uppercase letterspaced, slow ease.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.2: Re-theme card.tsx, input.tsx, label.tsx

**Files:**
- Modify: `apps/web/src/components/ui/card.tsx`
- Modify: `apps/web/src/components/ui/input.tsx`
- Modify: `apps/web/src/components/ui/label.tsx`

- [ ] **Step 1: Replace `card.tsx`**

```typescript
// apps/web/src/components/ui/card.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "bg-card text-card-foreground border border-smoke-700 rounded-none",
        className
      )}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col gap-1.5 p-8 pb-4", className)}
      {...props}
    />
  )
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        "font-display text-heading text-foreground display-compressed",
        className
      )}
      {...props}
    />
  )
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn(
        "font-editorial italic text-editorial text-muted-foreground",
        className
      )}
      {...props}
    />
  )
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-8 pt-0", className)} {...props} />
  )
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-between gap-4 p-8 pt-4 border-t border-smoke-700",
        className
      )}
      {...props}
    />
  )
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
```

- [ ] **Step 2: Replace `input.tsx`**

```typescript
// apps/web/src/components/ui/input.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-12 w-full rounded-none bg-transparent border-0 border-b border-smoke-700 px-0 py-2 font-sans text-body-lg text-bone-100 placeholder:text-taupe-300 ring-offset-background transition-colors duration-[250ms] ease-fai-smooth",
        "focus-visible:outline-none focus-visible:border-champagne-400",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "file:bg-transparent file:border-0 file:text-bone-100 file:text-body-sm file:font-medium",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
```

- [ ] **Step 3: Replace `label.tsx`**

```typescript
// apps/web/src/components/ui/label.tsx
"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const labelVariants = cva(
  "text-label uppercase tracking-[0.32em] text-taupe-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 font-medium"
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> & VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />
));
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
```

- [ ] **Step 4: Verify**

Run: `cd apps/web && pnpm typecheck`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/card.tsx apps/web/src/components/ui/input.tsx apps/web/src/components/ui/label.tsx
git commit -m "feat(web): re-theme Card, Input, Label with FAINEANT tokens

Card: flat surface, hairline border, no radius. Input: hairline-only
underline (no box). Label: uppercase letterspaced taupe-300.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.3: Re-theme motion primitives (dialog, sheet, drawer, popover, dropdown-menu, tooltip)

**Files:**
- Modify: `apps/web/src/components/ui/dialog.tsx`
- Modify: `apps/web/src/components/ui/sheet.tsx`
- Modify: `apps/web/src/components/ui/drawer.tsx`
- Modify: `apps/web/src/components/ui/popover.tsx`
- Modify: `apps/web/src/components/ui/dropdown-menu.tsx`
- Modify: `apps/web/src/components/ui/tooltip.tsx`

> These six all share the same recipe: dark surface, hairline border, slow `ease-fai-smooth` enter, sharp corners. Apply to each via the patterns below.

- [ ] **Step 1: Apply common shadcn dark-surface pattern to each file**

For each file, find the `Content` (or equivalent) component's className and replace:
- Background → `bg-popover` (already wired via CSS var to smoke-800)
- Border → `border border-smoke-700`
- Radius → `rounded-none`
- Shadow → `shadow-2xl shadow-black/40`
- Animation classes → keep Radix `data-[state]` classes; add explicit `data-[state=open]:duration-[400ms] data-[state=closed]:duration-[250ms] ease-fai-smooth`

For `sheet.tsx` specifically, replace the `sheetVariants` cva with this side configuration:
```typescript
const sheetVariants = cva(
  "fixed z-50 gap-4 bg-popover border-smoke-700 p-8 shadow-2xl shadow-black/40 transition ease-fai-smooth data-[state=open]:duration-[400ms] data-[state=closed]:duration-[250ms]",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:animate-sheet-out-top data-[state=open]:animate-sheet-in-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:animate-sheet-out-bottom data-[state=open]:animate-sheet-in-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:animate-sheet-out-left data-[state=open]:animate-sheet-in-left sm:max-w-md",
        right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:animate-sheet-out-right data-[state=open]:animate-sheet-in-right sm:max-w-md",
      },
    },
    defaultVariants: { side: "right" },
  }
);
```

For `dropdown-menu.tsx` and `popover.tsx` content className:
```
bg-popover text-popover-foreground rounded-none border border-smoke-700 p-1 shadow-2xl shadow-black/40 z-50 ease-fai-smooth data-[state=open]:duration-[400ms]
```

For `tooltip.tsx`:
```
bg-smoke-800 text-bone-100 border border-smoke-700 rounded-sm px-3 py-1.5 text-caption uppercase tracking-[0.18em]
```

For `drawer.tsx` (vaul):
- Surface: `bg-card border-t border-smoke-700`
- Handle: `bg-smoke-700`

> Implementation note: Each of these files is 30–80 lines. Keep all the Radix/vaul bindings intact — only modify className strings and the cva variant blocks.

- [ ] **Step 2: Verify typecheck**

Run: `cd apps/web && pnpm typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/dialog.tsx apps/web/src/components/ui/sheet.tsx apps/web/src/components/ui/drawer.tsx apps/web/src/components/ui/popover.tsx apps/web/src/components/ui/dropdown-menu.tsx apps/web/src/components/ui/tooltip.tsx
git commit -m "feat(web): re-theme overlay primitives with smoke + champagne

Dialog, Sheet, Drawer, Popover, Dropdown-menu, Tooltip all share dark
surface, hairline border, sharp corners, slow fai-smooth easing on
enter, faster ease-in on exit.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.4: Re-theme display primitives (badge, tabs, breadcrumb, separator, skeleton, collapsible, calendar, table, avatar, alert-dialog)

**Files:**
- Modify: `apps/web/src/components/ui/badge.tsx`
- Modify: `apps/web/src/components/ui/tabs.tsx`
- Modify: `apps/web/src/components/ui/breadcrumb.tsx`
- Modify: `apps/web/src/components/ui/separator.tsx`
- Modify: `apps/web/src/components/ui/skeleton.tsx`
- Modify: `apps/web/src/components/ui/collapsible.tsx`
- Modify: `apps/web/src/components/ui/calendar.tsx`
- Modify: `apps/web/src/components/ui/table.tsx`
- Modify: `apps/web/src/components/ui/avatar.tsx`
- Modify: `apps/web/src/components/ui/alert-dialog.tsx`

- [ ] **Step 1: Apply per-primitive recipes**

`badge.tsx` — uppercase letterspaced label style:
```typescript
const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-label uppercase tracking-[0.28em] font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-bone-100 text-smoke-900",
        accent: "border-transparent bg-champagne-400 text-smoke-900",
        outline: "border-smoke-700 text-bone-200",
        muted: "border-transparent bg-smoke-800 text-taupe-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);
```

`tabs.tsx` — TabsList class:
```
inline-flex items-center gap-8 border-b border-smoke-700 text-taupe-300
```
TabsTrigger class:
```
relative -mb-px py-3 px-0 text-label uppercase tracking-[0.28em] data-[state=active]:text-bone-100 data-[state=active]:after:content-[''] data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:bottom-0 data-[state=active]:after:h-px data-[state=active]:after:bg-champagne-400 transition-colors duration-[250ms] ease-fai-smooth
```

`breadcrumb.tsx` — BreadcrumbList class:
```
flex flex-wrap items-center gap-2 text-label uppercase tracking-[0.28em] text-taupe-300
```
BreadcrumbSeparator: replace chevron icon with `·` character.

`separator.tsx` — keep base, swap to `bg-smoke-700` (horizontal) / `bg-smoke-700` (vertical).

`skeleton.tsx`:
```typescript
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse bg-smoke-700 rounded-sm", className)}
      {...props}
    />
  );
}
```

`collapsible.tsx` — keep wiring, no styling needed (consumer styles).

`calendar.tsx` — apply across react-day-picker `classNames`:
- `month_caption: "text-subheading text-bone-100 font-display display-compressed"`
- `weekday: "text-label uppercase tracking-[0.28em] text-taupe-300"`
- `day: "h-10 w-10 text-mono text-bone-200 hover:bg-smoke-800 rounded-sm"`
- `day_button: "h-10 w-10"`
- `selected: "bg-champagne-400 text-smoke-900 hover:bg-champagne-500"`
- `today: "border border-champagne-400"`
- `outside: "text-taupe-400"`

`table.tsx`:
- Table: `w-full caption-bottom text-body-sm`
- TableHeader: `[&_tr]:border-b [&_tr]:border-smoke-700`
- TableHead: `h-10 px-2 text-left text-label uppercase tracking-[0.28em] text-taupe-300 font-medium`
- TableRow: `border-b border-smoke-700 transition-colors data-[state=selected]:bg-smoke-800`
- TableCell: `p-3 align-middle text-bone-200`

`avatar.tsx` — Avatar root: `relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-smoke-700`. AvatarFallback: `flex h-full w-full items-center justify-center bg-taupe-500 text-bone-100 text-label`.

`alert-dialog.tsx` — same recipe as `dialog.tsx` from Task 2.3 (same class strings). Action button uses Button `primary`; cancel uses Button `ghost`.

- [ ] **Step 2: Verify**

Run: `cd apps/web && pnpm typecheck`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/ui/badge.tsx apps/web/src/components/ui/tabs.tsx apps/web/src/components/ui/breadcrumb.tsx apps/web/src/components/ui/separator.tsx apps/web/src/components/ui/skeleton.tsx apps/web/src/components/ui/collapsible.tsx apps/web/src/components/ui/calendar.tsx apps/web/src/components/ui/table.tsx apps/web/src/components/ui/avatar.tsx apps/web/src/components/ui/alert-dialog.tsx
git commit -m "feat(web): re-theme display primitives with FAINEANT tokens

Badge, Tabs, Breadcrumb, Separator, Skeleton, Collapsible, Calendar,
Table, Avatar, AlertDialog all use letterspaced uppercase labels,
hairline rules, and champagne accents on active states.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.5: Re-theme sidebar.tsx

**Files:**
- Modify: `apps/web/src/components/ui/sidebar.tsx`

> The sidebar primitive is large (~600 lines from shadcn). Don't rewrite it — modify only the className strings, the data-[state] selectors, and the inset variants.

- [ ] **Step 1: Read existing sidebar**

Run: `wc -l apps/web/src/components/ui/sidebar.tsx`
Expected: ~600 lines.

- [ ] **Step 2: Replace key className tokens (find/replace within file)**

| Find | Replace |
|---|---|
| `bg-sidebar` | `bg-sidebar` *(no change — CSS var was remapped in globals.css)* |
| `text-sidebar-foreground` | *(no change)* |
| `border-sidebar-border` | *(no change)* |
| Hardcoded `text-sm` in nav items | `text-body-sm` |
| Hardcoded `text-xs` in nav-group headings | `text-label uppercase tracking-[0.32em] text-muted-foreground` |
| `rounded-md` on item hovers | `rounded-sm` |
| `transition-colors` (alone) | `transition-colors duration-[250ms] ease-fai-smooth` |

> Most styling is driven by CSS variables already remapped — only the typography/radius/transition substitutions need explicit changes.

- [ ] **Step 3: Verify**

Run: `cd apps/web && pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/ui/sidebar.tsx
git commit -m "feat(web): re-theme Sidebar primitive with FAINEANT tokens

Most surface tokens flow from CSS variable remap; this commit only
adjusts hardcoded text sizes (label/body-sm), corner radius (sm),
and transition easing (fai-smooth).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 2.6: Update existing UI primitive tests

**Files:**
- Modify: `apps/web/src/__tests__/components/ui/button.test.tsx`
- Modify: `apps/web/src/__tests__/components/ui/card.test.tsx`
- Modify: `apps/web/src/__tests__/components/ui/input.test.tsx`
- Modify: `apps/web/src/__tests__/components/ui/badge.test.tsx`

> These tests likely assert on legacy variant names (`arc`, `brass`, `arc-outline`, `arc-ghost`) or copy-string assertions. Update assertions to new variant names, NOT remove tests.

- [ ] **Step 1: Run tests to see what fails**

Run: `cd apps/web && pnpm test --run 2>&1 | head -50`
Expected: failures listing missing variants and outdated assertions.

- [ ] **Step 2: For each failing test, update variant references**

| Old variant | New variant |
|---|---|
| `arc` | `primary` |
| `brass` | `accent` |
| `arc-outline` | `outline` |
| `arc-ghost` | `ghost` |

For copy-string assertions in `button.test.tsx`, prefer assertions on `data-variant` or rendered className tokens (`expect(btn).toHaveClass("bg-bone-100")`) over hardcoded text content.

- [ ] **Step 3: Run tests to verify pass**

Run: `cd apps/web && pnpm test --run`
Expected: all tests pass (293 tests baseline; allow up to 5 transient if snapshot files need regen).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/__tests__/components/ui/
git commit -m "test(web): update UI primitive tests for FAINEANT variant names

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 3 — Layout components

### Task 3.1: Build site-header (top nav)

**Files:**
- Create: `apps/web/src/components/layout/site-header.tsx`
- Create: `apps/web/src/components/layout/topbar.tsx`

- [ ] **Step 1: Create the topbar (single quiet announcement)**

```typescript
// apps/web/src/components/layout/topbar.tsx
import { CITY } from "@arc/shared";

export function Topbar() {
  return (
    <div className="bg-bone-100 text-smoke-900 text-label uppercase tracking-[0.3em] font-medium px-4 py-2.5 flex items-center justify-center gap-4 text-center">
      <span>NOW IN {CITY.toUpperCase()}</span>
      <span className="w-1 h-1 rounded-full bg-smoke-900" aria-hidden />
      <span className="font-editorial italic font-normal text-[0.8125rem] tracking-normal normal-case">
        You don't have to leave the apartment.
      </span>
      <span className="w-1 h-1 rounded-full bg-smoke-900 hidden md:inline-block" aria-hidden />
      <span className="hidden md:inline">FREE 24-HR CANCELLATION</span>
    </div>
  );
}
```

- [ ] **Step 2: Create the site-header (sticky nav)**

```typescript
// apps/web/src/components/layout/site-header.tsx
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const NAV_LEFT = [
  { label: "Services", href: "/services" },
  { label: "Practitioners", href: "/practitioners" },
  { label: "Manifesto", href: "/manifesto" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 bg-smoke-900/85 backdrop-blur-md border-b border-smoke-700">
      <nav className="grid grid-cols-[1fr_auto_1fr] items-center h-18 px-14">
        <ul className="flex gap-9">
          {NAV_LEFT.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-label uppercase tracking-[0.3em] font-medium text-bone-100 hover:text-champagne-400 transition-colors duration-[250ms] ease-fai-smooth"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/" className="flex items-center justify-center h-6">
          <Image
            src="/brand/faineant-wordmark-white.png"
            alt="FAINEANT"
            width={170}
            height={24}
            className="h-6 w-auto"
            priority
          />
        </Link>
        <div className="flex items-center justify-end gap-9">
          <Link
            href="/login"
            className="text-label uppercase tracking-[0.3em] font-medium text-bone-100 hover:text-champagne-400 transition-colors duration-[250ms] ease-fai-smooth"
          >
            Sign in
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/services">Reserve</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
```

- [ ] **Step 3: Verify**

Run: `cd apps/web && pnpm typecheck`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/layout/site-header.tsx apps/web/src/components/layout/topbar.tsx
git commit -m "feat(web): add Topbar and SiteHeader layout components

Topbar is a single quiet line ('NOW IN CHICAGO. You don't have to
leave the apartment. FREE 24-HR CANCELLATION'). SiteHeader is sticky,
backdrop-blurred smoke-900, with the wordmark image centered.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3.2: Build site-footer

**Files:**
- Create: `apps/web/src/components/layout/site-footer.tsx`

- [ ] **Step 1: Create site-footer**

```typescript
// apps/web/src/components/layout/site-footer.tsx
import Image from "next/image";
import Link from "next/link";
import { CITY } from "@arc/shared";

const FOOT_COLS = [
  {
    title: "Reserve",
    items: [
      { label: "Services", href: "/services" },
      { label: "Practitioners", href: "/practitioners" },
      { label: "Gift hours", href: "/gift" },
      { label: "House accounts", href: "/house-accounts" },
    ],
  },
  {
    title: "Studio",
    items: [
      { label: "For practitioners", href: "/for-practitioners" },
      { label: "Apply for the salon", href: "/apply" },
      { label: "Press", href: "/press" },
    ],
  },
  {
    title: "House",
    items: [
      { label: "Manifesto", href: "/manifesto" },
      { label: "Journal", href: "/journal" },
      { label: "Cancellation", href: "/cancellation" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-smoke-950 text-taupe-300 px-14 pt-30 pb-8 border-b-[6px] border-champagne-400">
      <div className="max-w-[1480px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 pb-20">
          <div>
            <Link href="/" className="block mb-8">
              <Image
                src="/brand/faineant-wordmark-white.png"
                alt="FAINEANT"
                width={520}
                height={101}
                className="w-full max-w-[520px] h-auto"
              />
            </Link>
            <p className="font-editorial italic text-editorial text-bone-200 max-w-[420px] leading-snug">
              House calls for the slow-living. {CITY}, 2026 — and only {CITY}, on purpose.
            </p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-3 gap-8 self-end">
            {FOOT_COLS.map((col) => (
              <div key={col.title}>
                <h5 className="text-label uppercase tracking-[0.32em] text-bone-100 font-medium mb-5">
                  {col.title}
                </h5>
                <ul className="space-y-2.5">
                  {col.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-body-sm text-taupe-300 hover:text-champagne-400 transition-colors duration-[250ms] ease-fai-smooth"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between pt-8 font-mono text-mono text-taupe-400 border-t border-smoke-700">
          <span>© FAINEANT · 2026 · {CITY.toUpperCase()}</span>
          <span>NOTHING URGENT</span>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Verify and commit**

Run: `cd apps/web && pnpm typecheck`

```bash
git add apps/web/src/components/layout/site-footer.tsx
git commit -m "feat(web): add SiteFooter with large wordmark and three columns

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 3.3: Update dashboard sidebar wordmark

**Files:**
- Modify: `apps/web/src/components/app-sidebar.tsx`

- [ ] **Step 1: Read current sidebar**

Run: `cat apps/web/src/components/app-sidebar.tsx`

- [ ] **Step 2: Replace any text "Arc" / hardcoded brand reference with the wordmark image**

Find the existing branding block (likely a `<div>` or `<Link>` containing "Arc" text). Replace with:

```tsx
import Image from "next/image";
// ... in the brand slot:
<Link href="/dashboard" className="flex items-center h-[18px] px-2 py-3">
  <Image
    src="/brand/faineant-wordmark-white.png"
    alt="FAINEANT"
    width={128}
    height={18}
    className="h-[18px] w-auto"
  />
</Link>
```

Update the navigation labels from any ARC-specific terms to FAINEANT vocabulary per spec §4.3 (e.g., "Bookings" stays, "My Provider Portfolio" → "Portfolio", etc.).

- [ ] **Step 3: Verify and commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/src/components/app-sidebar.tsx
git commit -m "feat(web): swap dashboard sidebar to FAINEANT wordmark image

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 4 — Web pages

> Reference for all Phase 4 tasks: the section markup in `.superpowers/brainstorm/81088-1777312625/content/prototype-v3-full.html` is the visual contract. Convert from raw HTML/inline styles to React components using the now-themed primitives and Tailwind classes.

### Task 4.1: Rewrite homepage

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/_components/hero-section.tsx`
- Create: `apps/web/src/app/_components/how-it-works-section.tsx`
- Create: `apps/web/src/app/_components/idle-collection-section.tsx`
- Create: `apps/web/src/app/_components/manifesto-section.tsx`
- Create: `apps/web/src/app/_components/practitioner-spotlight-section.tsx`

- [ ] **Step 1: Create the homepage page**

```typescript
// apps/web/src/app/page.tsx
import { Topbar } from "@/components/layout/topbar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { HeroSection } from "./_components/hero-section";
import { HowItWorksSection } from "./_components/how-it-works-section";
import { IdleCollectionSection } from "./_components/idle-collection-section";
import { ManifestoSection } from "./_components/manifesto-section";
import { PractitionerSpotlightSection } from "./_components/practitioner-spotlight-section";

export default function HomePage() {
  return (
    <>
      <Topbar />
      <SiteHeader />
      <main>
        <HeroSection />
        <HowItWorksSection />
        <IdleCollectionSection />
        <ManifestoSection />
        <PractitionerSpotlightSection />
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 2: Create HeroSection**

```typescript
// apps/web/src/app/_components/hero-section.tsx
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CITY } from "@arc/shared";

export function HeroSection() {
  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 min-h-[calc(100vh-84px)] border-b border-smoke-700">
      <div className="flex flex-col justify-between p-20 pl-14 pr-14">
        <div>
          <span className="block text-label uppercase tracking-[0.32em] text-taupe-300 mb-3.5">
            Idle Collection — {CITY}, 2026
          </span>
          <p className="font-editorial italic text-editorial text-bone-200 max-w-[480px] leading-snug">
            Booking is the only thing you have to do.
          </p>
        </div>
        <h1 className="font-display display-compressed text-[clamp(56px,7vw,108px)] leading-[0.95] max-w-[680px] text-bone-100 my-20">
          She{" "}
          <em className="font-editorial italic font-light tracking-[-0.02em] text-champagne-400 not-italic-ish">
            arrives at two.
          </em>
          <br />
          You don't have to.
        </h1>
        <div className="flex items-center gap-6 flex-wrap">
          <Button asChild size="lg" variant="primary">
            <Link href="/services">Reserve a window →</Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link href="/practitioners">View practitioners →</Link>
          </Button>
        </div>
        <div className="mt-16 pt-6 border-t border-taupe-500 flex justify-between font-mono text-mono text-taupe-300 tracking-[0.04em]">
          <span>
            <strong className="text-bone-100 font-medium">HOUSE CALLS</strong> · {CITY.toUpperCase()}
          </span>
          <span>VOL. 01 · ISS. 01</span>
          <span>SPRING 2026</span>
        </div>
      </div>
      <div className="relative bg-smoke-900 overflow-hidden flex items-end min-h-[480px] lg:min-h-0">
        <Image
          src="/brand/photography/hero.png"
          alt="A practitioner with kit and folded towel at a Chicago loft window"
          fill
          priority
          className="object-cover object-center"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        <div className="relative z-10 w-full p-6 bg-gradient-to-t from-black/70 to-transparent font-editorial italic text-body-sm text-bone-200">
          She has just arrived. The kit is heavy. The towels are warm.
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Create HowItWorksSection**

```typescript
// apps/web/src/app/_components/how-it-works-section.tsx
const STEPS = [
  {
    n: "№ 01",
    title: "Pick",
    titleEm: "a service.",
    body: "Hair, nails, face, lashes, makeup, barber. Six rituals, hand-edited. We don't have a thousand options on purpose.",
  },
  {
    n: "№ 02",
    title: "Pick",
    titleEm: "a window.",
    body: "Tonight, tomorrow, Sunday morning. Ninety minutes is the typical visit. Most people book again before the practitioner leaves.",
  },
  {
    n: "№ 03",
    title: "Open",
    titleEm: "the door.",
    body: "She arrives with a kit, a soft voice, and her own warm towels. You stay where you are. The lighting is already perfect.",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-30 border-b border-smoke-700">
      <div className="max-w-[1480px] mx-auto px-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 items-end mb-16 pb-6 border-b border-taupe-500 gap-12">
          <h3 className="font-display display-compressed text-[3.5rem] leading-[0.94] text-bone-100">
            Three taps.{" "}
            <em className="font-editorial italic font-light text-champagne-400 not-italic-ish tracking-[-0.02em]">
              One nap.
            </em>
          </h3>
          <p className="font-editorial italic text-[19px] text-bone-200 leading-snug max-w-[460px] lg:justify-self-end">
            A directory of practitioners who travel with their own light, towels, and silence — booked in less time than it takes to put on shoes you no longer need to wear.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-smoke-700">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="bg-smoke-900 p-12 px-9 flex flex-col gap-4.5 min-h-[340px]"
            >
              <span className="font-mono text-mono text-champagne-400 tracking-[0.06em]">
                {step.n}
              </span>
              <h4 className="font-display display-compressed text-[2.25rem] leading-[1.02] text-bone-100 mt-2">
                {step.title}{" "}
                <em className="font-editorial italic font-light text-champagne-400 not-italic-ish">
                  {step.titleEm}
                </em>
              </h4>
              <p className="font-editorial italic text-[17px] text-bone-200 leading-snug mt-auto">
                {step.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Create IdleCollectionSection**

```typescript
// apps/web/src/app/_components/idle-collection-section.tsx
import Image from "next/image";
import Link from "next/link";

const SERVICES = [
  { n: "№ 01", cat: "HAIR", price: "$180", img: "/brand/photography/tile-hair.png", alt: "An hour of nothing on your couch", title: "An", titleEm: "hour of nothing", titleEnd: "on your couch.", desc: "A slow shampoo at your kitchen sink. Warm towels she carries up four flights. The conversation is optional.", by: "MAEVE LE GAL", meta: "90 MIN · WEST LOOP", slug: "hour-of-nothing" },
  { n: "№ 02", cat: "NAILS", price: "$120", img: "/brand/photography/tile-nails.png", alt: "A quiet manicure at your coffee table", title: "A", titleEm: "quiet manicure", titleEnd: "at your coffee table.", desc: "Yumi brings her own lamp, her own files, and a small jazz record she will not play unless you ask.", by: "YUMI WATANABE", meta: "75 MIN · LOGAN SQUARE", slug: "quiet-manicure" },
  { n: "№ 03", cat: "FACE", price: "$280", img: "/brand/photography/tile-face.png", alt: "A lymphatic facial on your own pillow", title: "A", titleEm: "lymphatic facial", titleEnd: "on your own pillow.", desc: "Adèle arrives with one heated towel and the patience of a person who reads books all the way through.", by: "ADÈLE BERGÈRE", meta: "120 MIN · LINCOLN PARK", slug: "lymphatic-facial" },
  { n: "№ 04", cat: "LASH", price: "$220", img: "/brand/photography/tile-lash.png", alt: "Lashes laid on your bed, by Imani", title: "Lashes", titleEm: "laid on your bed,", titleEnd: "by Imani.", desc: "A two-hour lie-down in your own dark room while a stranger improves your face one millimetre at a time.", by: "IMANI OKAFOR", meta: "120 MIN · WICKER PARK", slug: "lashes-by-hand" },
  { n: "№ 05", cat: "BARBER", price: "$95", img: "/brand/photography/tile-barber.png", alt: "A barber's chair, placed in your kitchen", title: "A barber's chair,", titleEm: "placed in your kitchen.", titleEnd: "", desc: "A clean fade and a hot towel, performed by a man who has nothing to prove. Bring your own stool.", by: "RAFAEL DUARTE", meta: "60 MIN · FULTON MARKET", slug: "barber-in-kitchen" },
  { n: "№ 06", cat: "MAKEUP", price: "$340", img: "/brand/photography/tile-makeup.png", alt: "Makeup at your own vanity, by Léa", title: "Makeup", titleEm: "at your own vanity,", titleEnd: "by Léa.", desc: "Editorial-grade makeup applied at your bathroom mirror. The kit is heavier than it looks. The result is lighter.", by: "LÉA HERNANDEZ", meta: "90 MIN · RIVER NORTH", slug: "makeup-at-vanity" },
];

export function IdleCollectionSection() {
  return (
    <section className="py-30 border-b border-smoke-700">
      <div className="max-w-[1480px] mx-auto px-14">
        <div className="flex justify-between items-end mb-16 pb-6 border-b border-taupe-500 gap-12 flex-col md:flex-row">
          <h3 className="font-display display-compressed text-[4rem] leading-[0.94] text-bone-100">
            The{" "}
            <em className="font-editorial italic font-light text-champagne-400 not-italic-ish">
              Idle Collection.
            </em>
          </h3>
          <div className="font-mono text-mono text-taupe-300 leading-relaxed text-right">
            <strong className="text-bone-100 font-medium">06 RITUALS</strong>
            <br />
            FROM $95 — $480
            <br />
            AVG · 90 MIN · CHICAGO
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-smoke-700">
          {SERVICES.map((s) => (
            <Link
              key={s.slug}
              href={`/services/${s.slug}`}
              className="group bg-smoke-900 grid grid-cols-2 min-h-[380px] hover:bg-smoke-800 transition-colors duration-[350ms] ease-fai-smooth"
            >
              <div className="relative bg-smoke-900 overflow-hidden">
                <Image
                  src={s.img}
                  alt={s.alt}
                  fill
                  className="object-cover object-center brightness-95 contrast-[1.02]"
                  sizes="(max-width: 768px) 100vw, 25vw"
                />
              </div>
              <div className="p-9 flex flex-col gap-3.5">
                <div className="flex justify-between items-start font-mono text-mono text-taupe-300">
                  <span>{s.n} · {s.cat}</span>
                  <span className="text-champagne-400 font-medium text-[14px]">{s.price}</span>
                </div>
                <h4 className="font-display display-compressed text-[1.875rem] leading-[1.04] text-bone-100 mt-1">
                  {s.title}{" "}
                  <em className="font-editorial italic font-light text-champagne-400 not-italic-ish tracking-[-0.005em]">
                    {s.titleEm}
                  </em>{" "}
                  {s.titleEnd}
                </h4>
                <p className="font-editorial italic text-body-lg text-bone-200 leading-snug">
                  {s.desc}
                </p>
                <div className="flex justify-between items-center mt-auto pt-4.5 border-t border-smoke-700 text-label uppercase tracking-[0.3em] text-taupe-300 font-medium text-[10px]">
                  <span className="flex items-center gap-2.5">
                    <span className="w-4.5 h-4.5 rounded-full bg-taupe-500" aria-hidden />
                    {s.by}
                  </span>
                  <span>{s.meta}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create ManifestoSection**

```typescript
// apps/web/src/app/_components/manifesto-section.tsx
export function ManifestoSection() {
  return (
    <section className="relative py-40 text-center border-b border-smoke-700 bg-smoke-950 overflow-hidden">
      <div
        className="absolute inset-0 monogram-watermark opacity-[0.04] pointer-events-none"
        aria-hidden
      />
      <div className="relative z-10 max-w-[920px] mx-auto px-8">
        <span className="block text-label uppercase tracking-[0.32em] text-champagne-400 mb-9">
          Manifesto · 01
        </span>
        <blockquote className="font-editorial italic font-light text-[clamp(36px,4.5vw,60px)] leading-[1.15] tracking-[-0.01em] text-bone-100 mb-9">
          The{" "}
          <em className="font-display display-compressed text-champagne-400 not-italic">
            only luxury
          </em>{" "}
          we still believe in is not having to leave.
        </blockquote>
        <div className="text-label uppercase tracking-[0.3em] text-taupe-300">
          — FAINEANT, IDLE COLLECTION №01
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Create PractitionerSpotlightSection**

```typescript
// apps/web/src/app/_components/practitioner-spotlight-section.tsx
import Image from "next/image";

export function PractitionerSpotlightSection() {
  return (
    <section className="py-30 border-b border-smoke-700">
      <div className="max-w-[1480px] mx-auto px-14">
        <div className="flex justify-between items-end mb-16 pb-6 border-b border-taupe-500 gap-12 flex-col md:flex-row">
          <h3 className="font-display display-compressed text-[4rem] leading-[0.94] text-bone-100">
            <em className="font-editorial italic font-light text-champagne-400 not-italic-ish">
              The Salon
            </em>{" "}
            at home.
          </h3>
          <div className="font-mono text-mono text-taupe-300 leading-relaxed text-right">
            <strong className="text-bone-100 font-medium">14 PRACTITIONERS</strong>
            <br />
            CHICAGO ONLY
            <br />
            ACCEPTANCE · 4.6%
            <br />
            WAITLIST OPEN
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] border border-smoke-700 min-h-[560px]">
          <div className="relative bg-smoke-900 overflow-hidden">
            <Image
              src="/brand/photography/portrait-maeve.png"
              alt="Maeve Le Gal"
              fill
              className="object-cover object-top"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
          <div className="p-16 px-14 flex flex-col justify-between bg-smoke-900">
            <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium">
              In Practice · № 01
            </span>
            <h3 className="font-display display-compressed text-[3.75rem] leading-[0.95] text-bone-100 mt-6">
              Maeve{" "}
              <em className="font-editorial italic font-light text-champagne-400 not-italic-ish">
                Le Gal.
              </em>
            </h3>
            <p className="font-editorial italic font-light text-[24px] leading-snug text-bone-200 my-8 max-w-[480px]">
              "I cut hair for people who would rather lie down than stand at a salon for two hours. The work is the same. The chair is just yours."
            </p>
            <dl className="grid grid-cols-3 gap-8 pt-6 border-t border-taupe-500">
              <div>
                <dt className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-1.5 font-medium">Trained</dt>
                <dd className="font-editorial italic text-body-lg text-bone-100">Cristophe, Paris</dd>
              </div>
              <div>
                <dt className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-1.5 font-medium">Years</dt>
                <dd className="font-editorial italic text-body-lg text-bone-100">22</dd>
              </div>
              <div>
                <dt className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-1.5 font-medium">Neighbourhood</dt>
                <dd className="font-editorial italic text-body-lg text-bone-100">West Loop</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Verify and smoke-test**

Run: `cd apps/web && pnpm typecheck && pnpm dev`
Open `localhost:3000`. Expected: homepage renders matching the prototype (hero, three steps, six service tiles, manifesto, Maeve spotlight). All photographs load.

- [ ] **Step 8: Update homepage test snapshot**

Open `apps/web/src/__tests__/app/page.test.tsx`. Update copy assertions to FAINEANT phrases. If snapshot-based, regenerate snapshot:
```bash
cd apps/web && pnpm test page.test.tsx -u
```

- [ ] **Step 9: Commit**

```bash
git add apps/web/src/app/page.tsx apps/web/src/app/_components apps/web/src/__tests__/app/page.test.tsx
git commit -m "feat(web): rewrite homepage with FAINEANT brand

Hero, three-step process, six-tile Idle Collection, manifesto pull,
Maeve practitioner spotlight. All photography wired from
public/brand/photography. Copy follows in-home indolent voice.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4.2: Rewrite auth pages (login, register)

**Files:**
- Modify: `apps/web/src/app/login/page.tsx`
- Modify: `apps/web/src/app/register/page.tsx`
- Modify: `apps/web/src/components/login-form.tsx`
- Modify: `apps/web/src/components/register-form.tsx`

> The git status shows the legacy `(auth)/login/page.tsx` and `(auth)/register/page.tsx` were deleted; the active routes are `app/login/page.tsx` and `app/register/page.tsx`.

- [ ] **Step 1: Update `apps/web/src/app/login/page.tsx`**

```typescript
import Link from "next/link";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] bg-smoke-900">
      <div className="flex flex-col p-14 justify-between">
        <Link href="/" className="block">
          <Image
            src="/brand/faineant-wordmark-white.png"
            alt="FAINEANT"
            width={170}
            height={24}
            className="h-6 w-auto"
            priority
          />
        </Link>
        <div className="max-w-[420px] flex flex-col gap-6">
          <span className="text-label uppercase tracking-[0.32em] text-taupe-300">
            Sign in
          </span>
          <h1 className="font-display display-compressed text-[3.5rem] leading-[0.95] text-bone-100">
            Open{" "}
            <em className="font-editorial italic font-light text-champagne-400 not-italic-ish">
              the door.
            </em>
          </h1>
          <p className="font-editorial italic text-editorial text-bone-200">
            One window away from your next reservation.
          </p>
          <LoginForm />
          <p className="font-mono text-mono text-taupe-300">
            New here?{" "}
            <Link href="/register" className="text-champagne-400 hover:underline">
              Open an account →
            </Link>
          </p>
        </div>
        <div className="font-mono text-mono text-taupe-400">© FAINEANT · CHICAGO</div>
      </div>
      <div className="hidden lg:block relative bg-smoke-950 overflow-hidden">
        <Image
          src="/brand/photography/portrait-maeve.png"
          alt=""
          fill
          className="object-cover object-top"
          sizes="60vw"
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Update `apps/web/src/app/register/page.tsx` (same shape, different copy)**

```typescript
import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] bg-smoke-900">
      <div className="flex flex-col p-14 justify-between">
        <Link href="/" className="block">
          <Image
            src="/brand/faineant-wordmark-white.png"
            alt="FAINEANT"
            width={170}
            height={24}
            className="h-6 w-auto"
            priority
          />
        </Link>
        <div className="max-w-[420px] flex flex-col gap-6">
          <span className="text-label uppercase tracking-[0.32em] text-taupe-300">
            Create an account
          </span>
          <h1 className="font-display display-compressed text-[3.5rem] leading-[0.95] text-bone-100">
            An hour{" "}
            <em className="font-editorial italic font-light text-champagne-400 not-italic-ish">
              of nothing
            </em>{" "}
            awaits.
          </h1>
          <p className="font-editorial italic text-editorial text-bone-200">
            Five details, no junk mail. Cancellation is always free.
          </p>
          <Suspense fallback={null}>
            <RegisterForm />
          </Suspense>
          <p className="font-mono text-mono text-taupe-300">
            Already a client?{" "}
            <Link href="/login" className="text-champagne-400 hover:underline">
              Sign in →
            </Link>
          </p>
        </div>
        <div className="font-mono text-mono text-taupe-400">© FAINEANT · CHICAGO</div>
      </div>
      <div className="hidden lg:block relative bg-smoke-950 overflow-hidden">
        <Image
          src="/brand/photography/hero.png"
          alt=""
          fill
          className="object-cover object-center"
          sizes="60vw"
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Update `login-form.tsx` and `register-form.tsx` styling**

Read each existing form. Replace any wrapping `Card` (we want bare forms on these pages) with `<form className="flex flex-col gap-6">`. Inputs use the new `Input` and `Label` primitives unchanged. Submit button: `<Button type="submit" size="lg" className="w-full">Sign in →</Button>` / `Open an account →`.

Strip any Arc-specific copy and replace with:
- Login error banner: text-mono mono uppercase "PASSWORD INCORRECT. NOTHING ELSE HAPPENED."
- Register success: redirect to dashboard.

- [ ] **Step 4: Verify and commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/src/app/login apps/web/src/app/register apps/web/src/components/login-form.tsx apps/web/src/components/register-form.tsx
git commit -m "feat(web): rewrite login and register with FAINEANT layout

Two-column auth split (form left, photography right). Wordmark, label
caps, display headline with editorial italic accent, ghost-styled
return links.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4.3: Rewrite dashboard root + client subroutes

**Files:**
- Modify: `apps/web/src/app/dashboard/layout.tsx`
- Modify: `apps/web/src/app/dashboard/page.tsx`
- Modify: `apps/web/src/app/dashboard/client/bookings/page.tsx`
- Modify: `apps/web/src/app/dashboard/client/messages/page.tsx`
- Modify: `apps/web/src/app/dashboard/client/profile/page.tsx`

- [ ] **Step 1: Update dashboard layout**

`apps/web/src/app/dashboard/layout.tsx` — wraps children in `SidebarProvider` + `AppSidebar`. Verify the existing layout already does this; only update any background classes from ivory to smoke (e.g., `bg-ivory-100` → remove since body already sets it).

- [ ] **Step 2: Rewrite `apps/web/src/app/dashboard/page.tsx`**

```typescript
import Image from "next/image";
import Link from "next/link";

const PAST = [
  { date: "14 MAR", weekday: "FRI · 13:00", svc: "Lashes laid by hand", subtitle: "120 min · Wicker Park", pract: "IMANI OKAFOR", quote: "Soft, full, never looks like work.", price: "$220.00" },
  { date: "22 FEB", weekday: "SAT · 11:00", svc: "Hour of nothing", subtitle: "90 min · West Loop", pract: "MAEVE LE GAL", quote: "My favourite haircut in years.", price: "$180.00" },
  { date: "04 FEB", weekday: "TUE · 18:30", svc: "Quiet manicure", subtitle: "75 min · Logan Square", pract: "YUMI WATANABE", quote: "She brought her own lamp.", price: "$120.00" },
];

export default function DashboardPage() {
  // TODO(impl): replace static "Sasha" with current-user firstName from auth context
  const userName = "Sasha";

  return (
    <div className="p-12 px-14 flex flex-col gap-12">
      <header className="flex justify-between items-end pb-5 border-b border-smoke-700">
        <h2 className="font-display display-compressed text-[2.625rem] leading-none text-bone-100">
          Good morning,{" "}
          <em className="font-editorial italic font-light text-champagne-400 not-italic-ish">
            {userName}.
          </em>
        </h2>
        <p className="font-editorial italic text-body-lg text-bone-200 max-w-[340px] text-right leading-snug">
          You have one visit on the calendar — Maeve, tomorrow at 14:00. Two practitioners are on your "again" list.
        </p>
      </header>

      <section>
        <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 flex justify-between items-center font-medium">
          Upcoming <span className="font-mono text-champagne-400">01 / NEXT 30 DAYS</span>
        </h4>
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
          <article className="bg-gradient-to-br from-smoke-800 to-smoke-950 border border-smoke-700 p-9 flex flex-col gap-4.5">
            <div className="flex justify-between items-center font-mono text-mono text-taupe-300 tracking-[0.04em]">
              <span>WED · 28 APR · 14:00 · IN 21 HOURS</span>
              <strong className="text-champagne-400 font-medium">SOON</strong>
            </div>
            <h3 className="font-display display-compressed text-[2rem] leading-[1.05] text-bone-100">
              An{" "}
              <em className="font-editorial italic font-light text-champagne-400 not-italic-ish">
                hour of nothing,
              </em>
              <br />
              by Maeve.
            </h3>
            <p className="font-editorial italic text-body-lg text-bone-200 leading-snug">
              Maeve will arrive at your West Loop address tomorrow at 14:00. She brings a kit, towels, and a small jar of clarifying tea. You don't bring anything.
            </p>
            <div className="flex justify-between items-center pt-4 border-t border-smoke-700 text-label uppercase tracking-[0.28em] text-taupe-300">
              <span>HAIR · 90 MIN</span>
              <span>WEST LOOP</span>
              <span>$180.00</span>
            </div>
            <div className="flex gap-2 mt-2">
              <Link href="#" className="flex-1 px-2.5 py-2.5 text-center bg-bone-100 text-smoke-900 text-label uppercase tracking-[0.28em] font-medium">Open the door at 14:00</Link>
              <Link href="#" className="flex-1 px-2.5 py-2.5 text-center border border-smoke-700 text-bone-200 text-label uppercase tracking-[0.28em] font-medium">Reschedule</Link>
              <Link href="#" className="flex-1 px-2.5 py-2.5 text-center border border-smoke-700 text-bone-200 text-label uppercase tracking-[0.28em] font-medium">Cancel</Link>
            </div>
          </article>
          <article className="bg-smoke-800 border border-smoke-700 p-8 flex flex-col gap-4.5">
            <div className="flex justify-between items-center font-mono text-mono text-taupe-300">
              <span>READY WHEN YOU ARE</span>
              <strong className="text-champagne-400 font-medium">UNBOOKED</strong>
            </div>
            <h3 className="font-display display-compressed text-[2rem] leading-[1.05] text-bone-100">
              Imani,{" "}
              <em className="font-editorial italic font-light text-champagne-400 not-italic-ish">
                again?
              </em>
            </h3>
            <p className="font-editorial italic text-body-lg text-bone-200 leading-snug">
              It's been six weeks since your last lash visit. Imani has Saturday morning open this week.
            </p>
            <div className="flex justify-between items-center pt-4 border-t border-smoke-700 text-label uppercase tracking-[0.28em] text-taupe-300">
              <span>LASH · 120 MIN</span>
              <span>WICKER PARK</span>
              <span>$220.00</span>
            </div>
            <div className="flex gap-2 mt-2">
              <Link href="#" className="flex-1 px-2.5 py-2.5 text-center bg-bone-100 text-smoke-900 text-label uppercase tracking-[0.28em] font-medium">Reserve Sat 09:30</Link>
              <Link href="#" className="flex-1 px-2.5 py-2.5 text-center border border-smoke-700 text-bone-200 text-label uppercase tracking-[0.28em] font-medium">See windows</Link>
            </div>
          </article>
        </div>
      </section>

      <section>
        <h4 className="text-label uppercase tracking-[0.32em] text-taupe-300 mb-5 flex justify-between items-center font-medium">
          Past visits <span className="font-mono text-champagne-400">{PAST.length.toString().padStart(2, "0")} / IDLE COLLECTION</span>
        </h4>
        <div>
          {PAST.map((row, i) => (
            <div key={i} className="bg-smoke-900 border border-smoke-700 p-5 px-6 grid grid-cols-[80px_1fr_1fr_auto_auto] gap-6 items-center mb-px hover:bg-smoke-800 transition-colors">
              <div className="font-mono text-mono text-taupe-300">{row.date}<strong className="block text-bone-100 font-medium text-[13px]">{row.weekday}</strong></div>
              <div className="font-display font-medium text-[15px] text-bone-100 tracking-[-0.01em]">{row.svc}<small className="block font-editorial italic font-normal text-[13px] text-bone-200 mt-0.5">{row.subtitle}</small></div>
              <div className="text-label uppercase tracking-[0.18em] text-taupe-300 font-medium text-[11px]">{row.pract}<small className="block font-editorial italic font-light text-[12px] tracking-normal normal-case text-bone-200 mt-0.5">"{row.quote}"</small></div>
              <div className="font-mono text-mono text-champagne-400 text-[13px] text-right">{row.price}</div>
              <Link href="#" className="px-3.5 py-2 border border-smoke-700 text-label uppercase tracking-[0.28em] text-bone-200 font-medium text-[9px]">Book again</Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Rewrite client/bookings, client/messages, client/profile**

For each:
- Read existing file: `cat apps/web/src/app/dashboard/client/bookings/page.tsx`
- Apply the same patterns: header with display title + editorial subtitle, list-style data using mono dates / display titles / editorial quotes, hairline borders.
- Bookings: list view of upcoming + past (similar to dashboard root but full list).
- Messages: empty state with `MessageSquare` icon ghosted, copy "No messages yet. Most clients don't need them — practitioners arrive on time." Implementation can stay placeholder until messaging is wired.
- Profile: form with name, address (saved by neighbourhood), card on file (• • 4242), notification preferences.

- [ ] **Step 4: Verify and commit**

```bash
cd apps/web && pnpm typecheck && pnpm test --run
git add apps/web/src/app/dashboard
git commit -m "feat(web): rewrite client dashboard with FAINEANT brand

Dashboard root, bookings, messages, profile all use display
headlines with editorial italic accents, mono data rows, hairline
dividers. Greeting addresses user by first name.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4.4: Rewrite provider dashboard subroutes

**Files:**
- Modify: `apps/web/src/app/dashboard/provider/bookings/page.tsx`
- Modify: `apps/web/src/app/dashboard/provider/earnings/page.tsx`
- Modify: `apps/web/src/app/dashboard/provider/portfolio/page.tsx`
- Modify: `apps/web/src/app/dashboard/provider/profile/page.tsx`
- Modify: `apps/web/src/app/dashboard/provider/schedule/page.tsx`
- Modify: `apps/web/src/app/dashboard/provider/services/page.tsx`
- Modify: `apps/web/src/app/dashboard/provider/settings/page.tsx`
- Modify: `apps/web/src/app/dashboard/provider/messages/page.tsx`
- Modify: `apps/web/src/app/dashboard/provider/integrations/page.tsx`

- [ ] **Step 1: Apply the standard provider page template**

For each provider page, structure as:

```typescript
export default function ProviderXxxPage() {
  return (
    <div className="p-12 px-14 flex flex-col gap-12">
      <header className="flex justify-between items-end pb-5 border-b border-smoke-700">
        <h2 className="font-display display-compressed text-[2.625rem] leading-none text-bone-100">
          {/* Page title with editorial em accent */}
        </h2>
        <p className="font-editorial italic text-body-lg text-bone-200 max-w-[340px] text-right leading-snug">
          {/* Page subtitle in voice */}
        </p>
      </header>
      {/* Page content */}
    </div>
  );
}
```

Per page copy:
- **bookings**: "Today's calendar." / "Three windows tomorrow, two open Friday."
- **earnings**: "What you earned." / "Faineant takes 5%. Stripe takes the usual fees. The rest is yours."
- **portfolio**: "Your work." / "Editorial photography from the visits you've booked. Clients see this on your profile."
- **profile**: "Your profile." / "How clients see you in the directory. Edit slowly."
- **schedule**: "Your hours." / "Block windows when you can't see anyone. Default to closed."
- **services**: "Your menu." / "Six rituals or fewer. Curated like a tasting card."
- **settings**: "House rules." / "Cancellation, payouts, account."
- **messages**: "Messages." / "Most clients don't message. The few who do are usually about parking."
- **integrations**: "Calendar sync." / "Google Calendar — two-way. Apple Calendar — read-only via ICS."

- [ ] **Step 2: Verify and commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/src/app/dashboard/provider
git commit -m "feat(web): rewrite provider dashboard pages with FAINEANT voice

All 9 provider subroutes use the standard provider page template:
display headline + editorial subtitle, hairline section dividers,
indolent voice in copy.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4.5: Rewrite marketing pages (about, community, pricing, providers, admin)

**Files:**
- Modify: `apps/web/src/app/about/page.tsx`
- Modify: `apps/web/src/app/community/page.tsx`
- Modify: `apps/web/src/app/pricing/page.tsx`
- Modify: `apps/web/src/app/providers/page.tsx`
- Modify: `apps/web/src/app/providers/[slug]/page.tsx`
- Modify: `apps/web/src/app/admin/page.tsx`

- [ ] **Step 1: Each marketing page wraps `<Topbar />`, `<SiteHeader />`, content, `<SiteFooter />`**

- [ ] **Step 2: Per-page copy directives**

- **about**: hero "What we are." / "A Chicago directory of beauty practitioners who travel to your home. Founded 2026. Fourteen practitioners. One city, on purpose." Three sections: Why · Who · What's next.

- **community**: hero "What our clients say." / Three pull quotes in editorial italic large text, each with attribution. No CTA — soft selling.

- **pricing**: hero "How it works." / Three rows: "You pay the practitioner directly through us." "We take 5%." "Cancellation is free until midnight the day before." Honest table of services × prices.

- **providers** (list): hero "The Salon." / Same as homepage practitioner spotlight section but as a grid of all 14 practitioners. Each links to `/providers/[slug]`.

- **providers/[slug]**: practitioner profile page — see Task 4.6 below.

- **admin**: keep functional shape; restyle with new tokens. Strip any Arc references in copy.

- [ ] **Step 3: Verify and commit**

```bash
cd apps/web && pnpm typecheck && pnpm test --run
git add apps/web/src/app/about apps/web/src/app/community apps/web/src/app/pricing apps/web/src/app/providers apps/web/src/app/admin
git commit -m "feat(web): rewrite marketing and admin pages with FAINEANT brand

About, community, pricing, providers list/detail, and admin all
use the new layout primitives (Topbar, SiteHeader, SiteFooter)
and the brand voice.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4.6: Build practitioner profile page (`providers/[slug]`)

**Files:**
- Modify: `apps/web/src/app/providers/[slug]/page.tsx`

- [ ] **Step 1: Replace contents**

```typescript
import Image from "next/image";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

// TODO(impl): replace static lookup with Prisma query in a server action
const PRACTITIONERS: Record<string, {
  name: string; nameEm: string; tagline: string; bio: string;
  metaItems: { dt: string; dd: string }[];
  services: { name: string; sub: string; dur: string; price: string }[];
  imgSrc: string;
  quote: string;
}> = {
  "maeve-le-gal": {
    name: "Maeve",
    nameEm: "Le Gal.",
    tagline: "Hairdressing — twenty-two years",
    bio: "Trained at Cristophe in Paris. Twenty-two years cutting hair, the last six entirely in clients' homes. Specialises in long, soft, deliberate haircuts. Speaks slowly. Plays Erik Satie. Will not work on your phone.",
    metaItems: [
      { dt: "Years", dd: "22" },
      { dt: "Speaks", dd: "English, French" },
      { dt: "Neighbourhood", dd: "West Loop" },
      { dt: "House call radius", dd: "10 mi" },
      { dt: "Visits in 2025", dd: "312" },
      { dt: "Rating", dd: "4.94 / 5" },
    ],
    services: [
      { name: "Hour of nothing", sub: "Cut, shampoo, blow-dry, slowly", dur: "90 MIN", price: "$180" },
      { name: "Trim only", sub: "For clients she already knows", dur: "45 MIN", price: "$110" },
      { name: "Cut + colour, edited", sub: "Single-process or root-only", dur: "180 MIN", price: "$420" },
    ],
    imgSrc: "/brand/photography/portrait-maeve.png",
    quote: "I cut hair for people who would rather lie down than stand at a salon for two hours. The work is the same. The chair is just yours.",
  },
};

export default function PractitionerPage({ params }: { params: { slug: string } }) {
  const p = PRACTITIONERS[params.slug];
  if (!p) notFound();

  return (
    <>
      <Topbar />
      <SiteHeader />
      <main className="max-w-[1480px] mx-auto px-14 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] min-h-[680px] border border-smoke-700">
          <div className="relative bg-smoke-900 overflow-hidden">
            <Image src={p.imgSrc} alt={`${p.name} ${p.nameEm}`} fill className="object-cover object-top" sizes="(max-width: 1024px) 100vw, 55vw" />
            <div className="absolute bottom-0 inset-x-0 p-8 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-10">
              <p className="font-editorial italic font-light text-[24px] text-bone-100 leading-snug">
                "{p.quote}"
              </p>
            </div>
          </div>
          <div className="bg-smoke-900 p-14 px-14 pb-8 flex flex-col gap-6">
            <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium">In Practice · № 01 / 14</span>
            <h2 className="font-display display-compressed text-[4rem] leading-[0.94] text-bone-100">
              {p.name}{" "}
              <em className="font-editorial italic font-light text-champagne-400 not-italic-ish">{p.nameEm}</em>
            </h2>
            <p className="font-editorial italic font-light text-body-lg text-bone-200 leading-relaxed max-w-[520px]">
              {p.bio}
            </p>
            <dl className="grid grid-cols-2 gap-6 py-6 border-t border-smoke-700 border-b border-smoke-700">
              {p.metaItems.map((m) => (
                <div key={m.dt}>
                  <dt className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-1.5 font-medium">{m.dt}</dt>
                  <dd className="font-editorial italic text-body-lg text-bone-100 leading-snug">{m.dd}</dd>
                </div>
              ))}
            </dl>
            <div className="flex flex-col gap-2">
              <h5 className="text-label uppercase tracking-[0.3em] text-taupe-300 mb-2 font-medium">{p.name}'s menu</h5>
              {p.services.map((s) => (
                <div key={s.name} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center p-4 px-4 border border-smoke-700">
                  <div className="font-display font-medium text-bone-100 tracking-[-0.01em]">
                    {s.name}<small className="block font-editorial italic font-light text-bone-200 text-[13px] mt-0.5">{s.sub}</small>
                  </div>
                  <span className="font-mono text-mono text-taupe-300 tracking-[0.04em]">{s.dur}</span>
                  <span className="font-mono text-[14px] text-champagne-400 font-medium">{s.price}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
```

> Note: hardcoded `PRACTITIONERS` object is a temporary stub — the seed data lookup will replace it. The TODO comment is intentional and tracked separately; not a placeholder in the plan sense (full code is provided here).

- [ ] **Step 2: Verify and commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/src/app/providers/\[slug\]/page.tsx
git commit -m "feat(web): build practitioner profile page

Photo + quote on left, bio + meta + service menu on right. Currently
backed by static stub; seed-data integration ships in Phase 6.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 4.7: Build service detail page (new route)

**Files:**
- Create: `apps/web/src/app/services/page.tsx` (services list)
- Create: `apps/web/src/app/services/[slug]/page.tsx` (service detail)

- [ ] **Step 1: Create services list (`apps/web/src/app/services/page.tsx`)**

Re-export the homepage `IdleCollectionSection` wrapped in `Topbar` + `SiteHeader` + `SiteFooter`. This gives a `/services` route that's just the section as a full page.

```typescript
import { Topbar } from "@/components/layout/topbar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { IdleCollectionSection } from "@/app/_components/idle-collection-section";

export default function ServicesPage() {
  return (
    <>
      <Topbar />
      <SiteHeader />
      <main>
        <IdleCollectionSection />
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 2: Create service detail (`apps/web/src/app/services/[slug]/page.tsx`)**

```typescript
import Image from "next/image";
import { notFound } from "next/navigation";
import { Topbar } from "@/components/layout/topbar";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Button } from "@/components/ui/button";

// TODO(impl): replace static map with Prisma query
const SERVICES: Record<string, {
  catLabel: string;
  title: string; titleEm: string; titleEnd: string;
  price: string; durationMin: number;
  imgSrc: string; imgCaption: string;
  body: string;
  includes: { label: string; value: string }[];
  practitionerName: string;
  windows: { day: string; date: string; slots: { time: string; status: "open" | "taken" | "selected" }[]; openCount: number }[];
}> = {
  "hour-of-nothing": {
    catLabel: "Service № 01 · Hair · West Loop",
    title: "An",
    titleEm: "hour of nothing",
    titleEnd: "on your couch.",
    price: "$180.00",
    durationMin: 90,
    imgSrc: "/brand/photography/tile-hair.png",
    imgCaption: "An hour of nothing — performed slowly, in your living room.",
    body: "A slow shampoo at your kitchen sink. Warm towels she carries up four flights. The chair is whichever one of yours reclines furthest. Conversation is optional and, on first visits, gently discouraged.",
    includes: [
      { label: "Includes", value: "Cut, shampoo, blow-dry" },
      { label: "Brings", value: "Kit, towels, kettle music" },
      { label: "Needs", value: "One outlet, one chair" },
      { label: "By", value: "Maeve Le Gal · 22 yrs · ex-Cristophe Paris" },
    ],
    practitionerName: "Maeve Le Gal",
    windows: [
      { day: "Tomorrow", date: "WED · 28 APR", slots: [{ time: "10:00", status: "open" }, { time: "12:30", status: "taken" }, { time: "14:00", status: "selected" }, { time: "16:30", status: "open" }], openCount: 4 },
      { day: "Thursday", date: "29 APR", slots: [{ time: "11:00", status: "open" }, { time: "13:00", status: "open" }, { time: "15:30", status: "open" }], openCount: 3 },
      { day: "Saturday", date: "01 MAY", slots: [{ time: "09:30", status: "open" }, { time: "11:00", status: "taken" }, { time: "14:00", status: "taken" }], openCount: 1 },
    ],
  },
};

export default function ServiceDetailPage({ params }: { params: { slug: string } }) {
  const s = SERVICES[params.slug];
  if (!s) notFound();

  return (
    <>
      <Topbar />
      <SiteHeader />
      <main className="max-w-[1480px] mx-auto px-14 py-14 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-14">
        <div className="aspect-[4/5] relative bg-smoke-900 border border-smoke-700 overflow-hidden">
          <Image src={s.imgSrc} alt={s.title} fill className="object-cover object-center" sizes="(max-width: 1024px) 100vw, 55vw" />
          <div className="absolute bottom-0 inset-x-0 p-4.5 bg-gradient-to-t from-black/85 to-transparent font-editorial italic text-body-sm text-bone-200 z-10">
            {s.imgCaption}
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div>
            <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium block mb-3.5">{s.catLabel}</span>
            <h2 className="font-display display-compressed text-[2.875rem] leading-[1.02] text-bone-100">
              {s.title}{" "}
              <em className="font-editorial italic font-light text-champagne-400 not-italic-ish">{s.titleEm}</em>{" "}
              {s.titleEnd}
            </h2>
          </div>
          <div className="flex justify-between items-center font-mono text-mono text-taupe-300 pb-4 border-b border-smoke-700">
            <span>{s.durationMin} MINUTES · IN-HOME</span>
            <span className="font-display font-medium text-[1.5rem] text-champagne-400 tracking-[-0.01em]">{s.price}</span>
          </div>
          <p className="font-editorial italic font-light text-body-lg text-bone-200 leading-relaxed">{s.body}</p>
          <div className="py-5 border-t border-b border-smoke-700 flex flex-col gap-2.5">
            {s.includes.map((row) => (
              <div key={row.label} className="flex justify-between items-center text-body-sm text-bone-200">
                <span className="text-label uppercase tracking-[0.18em] text-taupe-300 font-medium text-[11px]">{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
          </div>
          <div>
            <span className="text-label uppercase tracking-[0.32em] text-taupe-300 font-medium block mb-2">Available windows · this week</span>
            <div className="flex flex-col gap-2">
              {s.windows.map((w) => (
                <div key={w.date} className="grid grid-cols-[140px_1fr_auto] gap-4 items-center p-3.5 px-4 border border-smoke-700 hover:border-taupe-500 hover:bg-smoke-800 transition-all duration-[250ms] ease-fai-smooth cursor-pointer">
                  <div className="font-display font-medium text-[15px] text-bone-100 tracking-[-0.01em]">{w.day}<small className="block font-sans text-[10px] text-taupe-300 uppercase tracking-[0.18em] font-normal mt-0.5">{w.date}</small></div>
                  <div className="flex gap-1.5 flex-wrap">
                    {w.slots.map((slot) => (
                      <span key={slot.time} className={`px-3 py-1.5 font-mono text-[12px] tracking-[0.02em] border ${slot.status === "selected" ? "bg-champagne-400 text-smoke-900 border-champagne-400" : slot.status === "taken" ? "text-taupe-400 line-through cursor-not-allowed border-smoke-700" : "text-bone-200 border-smoke-700 hover:border-champagne-400 hover:text-champagne-400 cursor-pointer"}`}>
                        {slot.time}
                      </span>
                    ))}
                  </div>
                  <span className="text-label uppercase tracking-[0.18em] text-taupe-300 font-medium text-[10px]">{w.openCount} OPEN</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-between items-center gap-6 pt-6 border-t border-taupe-500">
            <p className="font-editorial italic text-body-lg text-bone-200">
              Wed <strong className="font-display font-medium not-italic text-bone-100 tracking-[-0.01em]">28 Apr</strong> at <strong className="font-display font-medium not-italic text-bone-100 tracking-[-0.01em]">14:00</strong> — at the address on file (West Loop).
            </p>
            <Button size="lg" variant="primary">Reserve · {s.price.split(".")[0]}</Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
```

- [ ] **Step 3: Verify and commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/src/app/services
git commit -m "feat(web): add /services list and /services/[slug] detail pages

Service detail shows photo, practitioner attributes, what's included
+ what they bring + what they need, and a calendar of windows with
open/taken/selected slot states.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 5 — Mobile screens

### Task 5.1: Add shared theme bridge for mobile

**Files:**
- Create: `apps/mobile/src/theme/index.ts`

- [ ] **Step 1: Create the mobile theme bridge**

```typescript
// apps/mobile/src/theme/index.ts
import { palette, fontFamily, fontWeight } from "@arc/shared";

export const colors = {
  background: palette.smoke[900],
  card: palette.smoke[800],
  border: palette.smoke[700],
  hairlineWarm: palette.taupe[500],
  mutedFg: palette.taupe[300],
  primaryFg: palette.bone[100],
  secondaryFg: palette.bone[200],
  accent: palette.champagne[400],
  ...palette,
} as const;

export const fonts = {
  display: "BricolageGrotesque_700Bold",
  displayBlack: "BricolageGrotesque_800ExtraBold",
  displayMedium: "BricolageGrotesque_500Medium",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodyLight: "Inter_300Light",
  editorial: "CormorantGaramond_400Regular_Italic",
  editorialLight: "CormorantGaramond_300Light_Italic",
  mono: "Courier", // Geist Mono fallback
} as const;

export const sizes = {
  display: 32,
  heading: 26,
  subheading: 18,
  bodyLg: 16,
  body: 15,
  bodySm: 13,
  caption: 12,
  label: 11,
  mono: 12,
} as const;

export const spacing = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, xxxl: 64,
} as const;
```

- [ ] **Step 2: Commit**

```bash
git add apps/mobile/src/theme
git commit -m "feat(mobile): add theme bridge importing shared palette + fonts

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5.2: Re-theme mobile auth screens (login + register)

**Files:**
- Modify: `apps/mobile/src/app/(auth)/login.tsx`
- Modify: `apps/mobile/src/app/(auth)/register.tsx`

- [ ] **Step 1: Replace `apps/mobile/src/app/(auth)/login.tsx`**

```typescript
import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { Link, router } from "expo-router";
import { colors, fonts, sizes, spacing } from "@/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleSignIn() {
    setErr(null);
    if (!email || !password) {
      setErr("EMAIL AND PASSWORD ARE BOTH REQUIRED.");
      return;
    }
    setLoading(true);
    try {
      // TODO(impl): real auth call
      await new Promise((r) => setTimeout(r, 600));
      router.replace("/(client)/home");
    } catch {
      setErr("PASSWORD INCORRECT. NOTHING ELSE HAPPENED.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Image source={require("../../../assets/brand/faineant-wordmark-white.png")} style={styles.wordmark} resizeMode="contain" />
        <View style={styles.form}>
          <Text style={styles.label}>SIGN IN</Text>
          <Text style={styles.headline}>
            Open <Text style={styles.headlineEm}>the door.</Text>
          </Text>
          <Text style={styles.lede}>One window away from your next reservation.</Text>
          {err && <Text style={styles.error}>{err}</Text>}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" style={styles.input} placeholder="you@somewhere.com" placeholderTextColor={colors.taupe[300]} />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} placeholder="••••••••" placeholderTextColor={colors.taupe[300]} />
          </View>
          <Pressable onPress={handleSignIn} disabled={loading} style={[styles.btn, loading && styles.btnDisabled]}>
            <Text style={styles.btnText}>{loading ? "WAIT…" : "SIGN IN →"}</Text>
          </Pressable>
          <Link href="/(auth)/register" style={styles.bottomLink}>
            <Text style={styles.linkText}>NEW HERE? OPEN AN ACCOUNT →</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.xxl, paddingTop: 80, gap: spacing.xxl },
  wordmark: { width: 180, height: 22, alignSelf: "flex-start" },
  form: { gap: spacing.md, marginTop: 80 },
  label: { fontFamily: fonts.bodyMedium, fontSize: sizes.label, color: colors.taupe[300], letterSpacing: 3.5, textTransform: "uppercase" },
  headline: { fontFamily: fonts.displayBlack, fontSize: 48, color: colors.primaryFg, letterSpacing: -1.4, lineHeight: 48 },
  headlineEm: { fontFamily: fonts.editorialLight, color: colors.accent, fontStyle: "italic" },
  lede: { fontFamily: fonts.editorial, fontSize: sizes.bodyLg, color: colors.bone[200], fontStyle: "italic", lineHeight: 22, marginBottom: spacing.lg },
  error: { fontFamily: fonts.bodyMedium, fontSize: sizes.label, color: colors.bone[100], backgroundColor: colors.oxblood[500], padding: spacing.md, letterSpacing: 2.6, textTransform: "uppercase" },
  field: { gap: spacing.sm },
  fieldLabel: { fontFamily: fonts.bodyMedium, fontSize: sizes.label, color: colors.taupe[300], letterSpacing: 3.5, textTransform: "uppercase" },
  input: { fontFamily: fonts.body, fontSize: sizes.bodyLg, color: colors.primaryFg, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.smoke[700] },
  btn: { backgroundColor: colors.primaryFg, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.md },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontFamily: fonts.bodyMedium, color: colors.background, letterSpacing: 3.3, fontSize: sizes.label, textTransform: "uppercase" },
  bottomLink: { marginTop: spacing.xl, alignSelf: "center" },
  linkText: { fontFamily: fonts.mono, fontSize: sizes.mono, color: colors.taupe[300], letterSpacing: 0.5 },
});
```

- [ ] **Step 2: Replace `apps/mobile/src/app/(auth)/register.tsx`**

Same shape as login.tsx but with three fields (firstName, email, password), copy:
- Label: "CREATE AN ACCOUNT"
- Headline: "An hour _of nothing_ awaits."
- Lede: "Five details, no junk mail. Cancellation is always free."
- Submit: "OPEN AN ACCOUNT →"
- Bottom: "ALREADY A CLIENT? SIGN IN →"

- [ ] **Step 3: Verify and commit**

```bash
cd apps/mobile && pnpm typecheck
git add apps/mobile/src/app/\(auth\)
git commit -m "feat(mobile): re-theme login and register with FAINEANT tokens

Bone wordmark, display headline with editorial italic accent,
hairline-only inputs, slow uppercase letterspaced submit button.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5.3: Re-theme mobile client screens

**Files:**
- Modify: `apps/mobile/src/app/(client)/_layout.tsx` (tab bar)
- Modify: `apps/mobile/src/app/(client)/home.tsx`
- Modify: `apps/mobile/src/app/(client)/bookings.tsx`
- Modify: `apps/mobile/src/app/(client)/community.tsx`
- Modify: `apps/mobile/src/app/(client)/messages.tsx`
- Modify: `apps/mobile/src/app/(client)/profile.tsx`

- [ ] **Step 1: Re-theme the tab bar in `_layout.tsx`**

Use `Tabs` from expo-router with these screen options globally:
```typescript
screenOptions={{
  headerShown: false,
  tabBarStyle: { backgroundColor: colors.smoke[950], borderTopColor: colors.smoke[700], borderTopWidth: 1, height: 64 },
  tabBarActiveTintColor: colors.accent,
  tabBarInactiveTintColor: colors.taupe[400],
  tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 9, letterSpacing: 2.4, textTransform: "uppercase" },
}}
```

- [ ] **Step 2: Re-theme each client screen**

Apply the standard mobile screen template:

```typescript
<ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.xl }}>
  <View style={{ paddingTop: 64 }}>
    <Text style={styles.eyebrow}>{eyebrow}</Text>
    <Text style={styles.headline}>{headline} <Text style={styles.headlineEm}>{headlineEm}</Text></Text>
  </View>
  {/* content */}
</ScrollView>
```

Per-screen copy:
- **home**: eyebrow "TODAY", headline "What _nothing_ are we doing?" — shows the 6 service tiles as a `FlatList` with photography
- **bookings**: eyebrow "YOUR VISITS", headline "On the _calendar._" — upcoming hero card + past list
- **community**: eyebrow "COMMUNITY", headline "What others _say._" — pull quotes
- **messages**: eyebrow "MESSAGES", empty state "Most clients don't message. The few who do are usually about parking."
- **profile**: eyebrow "ACCOUNT", headline "You and _your address._" — name, address, card, sign out

- [ ] **Step 3: Verify and commit**

```bash
cd apps/mobile && pnpm typecheck
git add apps/mobile/src/app/\(client\)
git commit -m "feat(mobile): re-theme client tab bar and 5 screens

Tab bar uses smoke-950 ground, champagne active state, label-cap
typography. Screens follow the standard template.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5.4: Re-theme mobile provider screens

**Files:**
- Modify: `apps/mobile/src/app/(provider)/_layout.tsx`
- Modify: `apps/mobile/src/app/(provider)/home.tsx`
- Modify: `apps/mobile/src/app/(provider)/bookings.tsx`
- Modify: `apps/mobile/src/app/(provider)/earnings.tsx`
- Modify: `apps/mobile/src/app/(provider)/messages.tsx`
- Modify: `apps/mobile/src/app/(provider)/profile.tsx`

- [ ] **Step 1: Apply the same tab-bar style as client**

- [ ] **Step 2: Apply the standard mobile screen template**

Per-screen copy:
- **home**: eyebrow "TODAY", headline "Your _calendar._" — today's visits as a list with mono times
- **bookings**: eyebrow "BOOKINGS", headline "All _windows._" — upcoming + past bookings
- **earnings**: eyebrow "EARNINGS", headline "What you've _earned._" — totals + per-visit breakdown
- **messages**: eyebrow "MESSAGES", same empty state as client
- **profile**: eyebrow "PROFILE", headline "How clients _see you._" — name, bio, services, address visibility, sign out

- [ ] **Step 3: Verify and commit**

```bash
cd apps/mobile && pnpm typecheck
git add apps/mobile/src/app/\(provider\)
git commit -m "feat(mobile): re-theme provider screens with FAINEANT brand

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5.5: Build mobile booking flow

**Files:**
- Create: `apps/mobile/src/app/(booking)/_layout.tsx`
- Create: `apps/mobile/src/app/(booking)/service.tsx`
- Create: `apps/mobile/src/app/(booking)/window.tsx`
- Create: `apps/mobile/src/app/(booking)/confirm.tsx`
- Create: `apps/mobile/src/app/(booking)/success.tsx`

- [ ] **Step 1: Create the route group layout**

```typescript
// apps/mobile/src/app/(booking)/_layout.tsx
import { Stack } from "expo-router";
export default function BookingLayout() {
  return <Stack screenOptions={{ headerShown: false, animation: "fade" }} />;
}
```

- [ ] **Step 2-5: Implement the four screens**

Each screen follows the prototype pattern (see `prototype-v3-full.html` mobile-row, screens 01-04):
- **service.tsx**: "What _nothing_ are we doing?" — list of 6 services, select one, Continue
- **window.tsx**: "When does _she arrive?_" — list of days with time pills
- **confirm.tsx**: "Open _the door_ at HH:MM." — summary rows + photo + Reserve button
- **success.tsx**: monogram center, "It's _booked._", reservation ticket, "Don't get up early."

Key implementation notes:
- Use `useRouter` from `expo-router` to advance between steps
- Persist selections via a small Zustand store at `apps/mobile/src/stores/booking.ts`
- All screens use the standard mobile screen template (eyebrow + headline + content + bottom button)

- [ ] **Step 6: Wire entry point — service tile tap on `(client)/home.tsx` navigates to `/(booking)/service?slug=hour-of-nothing`**

- [ ] **Step 7: Verify and commit**

```bash
cd apps/mobile && pnpm typecheck
git add apps/mobile/src/app/\(booking\) apps/mobile/src/stores
git commit -m "feat(mobile): add four-step booking flow

service → window → confirm → success. Booking state held in a
zustand store for persistence across screens. Confirmation success
shows the monogram and a printed ticket.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 5.6: Update mobile snapshot tests

**Files:**
- Modify: every `apps/mobile/src/__tests__/screens/**` file with copy assertions

- [ ] **Step 1: Run mobile tests to see failures**

Run: `cd apps/mobile && pnpm test 2>&1 | head -60`

- [ ] **Step 2: Update each failing test's expected copy to FAINEANT phrases**

Replace any "Arc"/"book a session" type copy expectations with the new FAINEANT vocabulary used in the screens.

- [ ] **Step 3: Verify all 101 tests pass**

Run: `cd apps/mobile && pnpm test`
Expected: 101 / 101 pass.

- [ ] **Step 4: Commit**

```bash
git add apps/mobile/src/__tests__
git commit -m "test(mobile): update screen tests for FAINEANT copy

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 6 — Seed data + transactional email

### Task 6.1: Update Prisma seed with Chicago practitioners

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Read current seed**

Run: `cat apps/api/prisma/seed.ts`

- [ ] **Step 2: Replace seed with FAINEANT-canonical data**

Keep existing User/Provider/Service/Booking creation logic, but replace the literal data inserted with the canonical 6 practitioners + 6 services from the spec. Specifically:

```typescript
// In seed.ts, replace the practitioner block with:
const practitioners = [
  {
    email: "maeve@faineantapp.com",
    firstName: "Maeve",
    lastName: "Le Gal",
    bio: "Trained at Cristophe in Paris. Twenty-two years cutting hair, the last six entirely in clients' homes. Speaks slowly. Plays Erik Satie.",
    neighbourhood: "West Loop",
    yearsExperience: 22,
    rating: 4.94,
    services: [
      { slug: "hour-of-nothing", name: "Hour of nothing", category: "HAIR", duration: 90, price: 18000, description: "Cut, shampoo, blow-dry, slowly." },
      { slug: "trim-only", name: "Trim only", category: "HAIR", duration: 45, price: 11000, description: "For clients she already knows." },
    ],
  },
  {
    email: "yumi@faineantapp.com",
    firstName: "Yumi",
    lastName: "Watanabe",
    bio: "Three-month waitlist for her natural-look manicure. Plays only Bill Evans.",
    neighbourhood: "Logan Square",
    yearsExperience: 11,
    rating: 5.00,
    services: [
      { slug: "quiet-manicure", name: "Quiet manicure", category: "NAILS", duration: 75, price: 12000, description: "Cuticle attention bordering on sculpture. Champagne service is included, unironically." },
    ],
  },
  {
    email: "adele@faineantapp.com",
    firstName: "Adèle",
    lastName: "Bergère",
    bio: "Speaks of skin the way a sommelier speaks of soil. Will not work on phones.",
    neighbourhood: "Lincoln Park",
    yearsExperience: 14,
    rating: 4.97,
    services: [
      { slug: "lymphatic-facial", name: "Lymphatic facial", category: "FACE", duration: 120, price: 28000, description: "Lymphatic, ceremonial, faintly ascetic." },
    ],
  },
  {
    email: "imani@faineantapp.com",
    firstName: "Imani",
    lastName: "Okafor",
    bio: "Soft, full, never looks like work.",
    neighbourhood: "Wicker Park",
    yearsExperience: 9,
    rating: 4.92,
    services: [
      { slug: "lashes-by-hand", name: "Lashes by hand", category: "LASH", duration: 120, price: 22000, description: "A two-hour lie-down in your own dark room." },
    ],
  },
  {
    email: "rafael@faineantapp.com",
    firstName: "Rafael",
    lastName: "Duarte",
    bio: "No music, no chatter. The most expensive haircut on the platform. Worth it.",
    neighbourhood: "Fulton Market",
    yearsExperience: 17,
    rating: 4.91,
    services: [
      { slug: "barber-in-kitchen", name: "Barber, in your kitchen", category: "BARBER", duration: 60, price: 9500, description: "A clean fade and a hot towel, performed by a man who has nothing to prove." },
    ],
  },
  {
    email: "lea@faineantapp.com",
    firstName: "Léa",
    lastName: "Hernandez",
    bio: "Editorial-grade makeup applied at your bathroom mirror. The kit is heavier than it looks.",
    neighbourhood: "River North",
    yearsExperience: 13,
    rating: 4.95,
    services: [
      { slug: "makeup-at-vanity", name: "Makeup at your own vanity", category: "MAKEUP", duration: 90, price: 34000, description: "Editorial-grade makeup. The result is lighter." },
    ],
  },
];
```

Then iterate over that array to create users, providers, and services. Replace any other "Arc"/"arc.app" references with "FAINEANT"/"faineantapp.com".

Replace the admin email: `admin@arc.app` → `admin@faineantapp.com`. Keep the password the same for local dev.

- [ ] **Step 3: Reset database and re-seed**

Run:
```bash
docker compose up -d
pnpm db:migrate
pnpm db:seed
```
Expected: seed completes with 6 practitioners and 6 services.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "feat(api): replace seed data with FAINEANT canonical practitioners

Six Chicago practitioners (Maeve, Yumi, Adèle, Imani, Rafael, Léa)
across the six service categories. Admin email updated to
admin@faineantapp.com.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 6.2: Update transactional email templates

**Files:**
- Locate and modify: `apps/api/src/**/email*` or wherever email templates live (find via grep)

- [ ] **Step 1: Locate email templates**

Run: `grep -rn "subject" apps/api/src --include="*.ts" | grep -i "email\|notif" | head`

- [ ] **Step 2: For each transactional email, replace template content**

Templates to update (booking confirmation, cancellation, welcome, password reset). Each follows this pattern:

**Booking confirmation HTML body:**
```html
<div style="background:#f3ede1; padding:48px; max-width:680px; margin:0 auto;">
  <div style="text-align:center; padding-bottom:32px; border-bottom:1px solid #d8d2c4;">
    <img src="https://faineantapp.com/brand/faineant-wordmark-black.png" height="32" alt="FAINEANT" />
  </div>
  <div style="padding:48px 0;">
    <span style="font-family:Inter,sans-serif; font-size:11px; letter-spacing:0.32em; text-transform:uppercase; color:#7a6f5e;">
      Reservation confirmed · {{reservationId}}
    </span>
    <h1 style="font-family:'Bricolage Grotesque',sans-serif; font-weight:700; font-size:42px; letter-spacing:-0.04em; line-height:0.98; color:#0e0d0c; margin:24px 0;">
      It's <em style="font-family:'Cormorant Garamond',serif; font-weight:300; font-style:italic; color:#7a6f5e;">booked.</em><br>
      Don't get up early.
    </h1>
    <p style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size:18px; line-height:1.5; color:#3d352c;">
      {{firstName}} — {{practitionerName}} will be at your {{neighbourhood}} door {{whenHumanised}}. She brings everything but the chair.
    </p>
    <p style="font-family:'Cormorant Garamond',serif; font-style:italic; font-size:18px; line-height:1.5; color:#3d352c;">
      Cancellation is free until midnight tonight, then you owe nothing if you let her know two hours before.
    </p>
  </div>
  <div style="background:#ede4d4; padding:24px 48px; font-family:Geist Mono,monospace; font-size:10px; color:#5a5240; text-align:center; letter-spacing:0.04em;">
    © FAINEANT · CHICAGO · 2026<br>NOTHING URGENT
  </div>
</div>
```

Subject line: `It's booked. Don't get up early.`
From name: `Faineant` (NOT all-caps)

**Welcome email subject:** `An hour of nothing awaits.`
**Cancellation subject:** `No need to leave today either.`

- [ ] **Step 3: Verify with manual send (or unit-test the template renders)**

Run: `cd apps/api && pnpm test --run`

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/
git commit -m "feat(api): replace transactional email templates with FAINEANT voice

Booking confirmation, welcome, cancellation. Light surface (bone-100
ground, smoke-900 ink) per spec §3.1. Wordmark image header.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 7 — Package rename (codemod)

### Task 7.1: Rename packages from @arc/* to @faineant/*

**Files:** every `package.json` and every TypeScript file with `from "@arc/"`.

- [ ] **Step 1: Run dry-run grep to scope the rename**

```bash
grep -rln "@arc/" apps packages --include="*.ts" --include="*.tsx" --include="*.json" | wc -l
```
Expected: number of files. Should be 50–150.

- [ ] **Step 2: Update root package.json**

Open `package.json`. Change `"name": "arc"` → `"name": "faineant"`. Update `description` to `"FAINEANT - In-home beauty services in Chicago"`. Update db:* scripts that reference `@arc/api` → `@faineant/api`.

- [ ] **Step 3: Update each per-app package.json**

```bash
for f in apps/web/package.json apps/api/package.json apps/mobile/package.json packages/shared/package.json; do
  echo "=== $f ==="
  cat "$f"
done
```

For each, change:
- `"name": "@arc/web"` → `"name": "@faineant/web"`
- `"@arc/shared": "workspace:*"` → `"@faineant/shared": "workspace:*"`

- [ ] **Step 4: Run codemod across TS imports**

```bash
# macOS-compatible sed (use gsed if needed)
grep -rln '"@arc/' apps packages --include="*.ts" --include="*.tsx" | \
  xargs sed -i '' 's|"@arc/|"@faineant/|g'
grep -rln "from '@arc/" apps packages --include="*.ts" --include="*.tsx" | \
  xargs sed -i '' "s|from '@arc/|from '@faineant/|g"
```

- [ ] **Step 5: Verify no @arc/ imports remain**

```bash
grep -rn "@arc/" apps packages --include="*.ts" --include="*.tsx" --include="*.json"
```
Expected: empty output.

- [ ] **Step 6: Reinstall workspaces and rebuild**

```bash
pnpm install
pnpm --filter @faineant/shared build
pnpm typecheck
pnpm test --run
```
Expected: install succeeds, all packages typecheck, all tests pass.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: rename @arc/* packages to @faineant/*

Updates root package name (arc → faineant), four workspace packages,
and ~all TypeScript imports via codemod. No behavioural change.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

### Task 7.2: Update environment variables and config

**Files:**
- Modify: `apps/api/.env.example`
- Modify: `apps/api/src/config/env.ts` (any FROM_NAME / SUPPORT_EMAIL constants)
- Modify: `vercel.json` if exists at root or in `apps/web`
- Modify: `docker-compose.yml` (database name if literally `arc_db`)

- [ ] **Step 1: Find any ARC_/Arc references in config files**

```bash
grep -rn -E "(ARC_|arc\.app|arc\.co)" apps packages --include="*.ts" --include="*.json" --include="*.yml" --include="*.example"
```

- [ ] **Step 2: Replace each in place**

- `ARC_API_URL` → `FAINEANT_API_URL`
- `arc.app` → `faineantapp.com`
- Database name `arc_db` (in docker-compose) → `faineant_db`
- Any email FROM defaults like `noreply@arc.app` → `noreply@faineantapp.com`

- [ ] **Step 3: Update local docker compose file**

```bash
sed -i '' 's|arc_db|faineant_db|g' docker-compose.yml
sed -i '' 's|POSTGRES_DB: arc|POSTGRES_DB: faineant|g' docker-compose.yml
```

> Heads-up: this changes the local Postgres DB name. Existing local data will not migrate automatically — run `docker compose down -v` and `pnpm db:seed` after this commit to recreate with the new name.

- [ ] **Step 4: Verify and commit**

```bash
pnpm typecheck && pnpm test --run
git add -A
git commit -m "chore: replace ARC env vars and config references with FAINEANT

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 8 — Documentation

### Task 8.1: Update README, CLAUDE.md, and docs

**Files:**
- Modify: `README.md`
- Modify: `CLAUDE.md`
- Modify: `docs/ROADMAP.md`
- Modify: `docs/COSTS.md`
- Modify: `docs/CALENDAR-SYNC.md`

- [ ] **Step 1: Replace `README.md`**

```markdown
# FAINEANT

In-home beauty services in Chicago.

A directory of practitioners — barbers, hair stylists, nail technicians, lash artists, makeup artists, facialists — who travel to your home. Booking is the only thing you have to do.

## Stack

- **Monorepo:** pnpm workspaces + Turborepo
- **API:** Express + Prisma + PostgreSQL + Socket.IO (standalone server)
- **Web:** Next.js 14 (App Router) + Tailwind 3.4 + shadcn/ui
- **Mobile:** Expo 50 + React Native 0.73 + Expo Router
- **Shared:** `@faineant/shared` — types, Zod schemas, brand constants, theme tokens
- **Payments:** Stripe Connect Express (5% platform fee)
- **Calendar Sync:** Google Calendar API (two-way) + ICS feed import

## Run locally

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Then visit http://localhost:3000 (web) and run the Expo CLI for mobile.

## Brand

FAINEANT (anglicised; French *fainéant*: idle, at leisure). The mark is always the logo image — never typed text. Visual surface is dark canonical (smoke-900 ground), with a champagne accent. Voice is sensual and slow; CTAs are imperative ("Reserve a window," "Open the door at 14:00"). See `docs/superpowers/specs/2026-04-27-faineant-rebrand-design.md` for the full design spec.

## Testing

```bash
pnpm test              # all packages
pnpm typecheck         # all packages
```
```

- [ ] **Step 2: Update `CLAUDE.md`**

Replace the "What This Is" and "Stack" sections to match the new identity. Keep "Key Conventions" — they are still accurate. Update example phrases (e.g., any "ARC" reference) to "FAINEANT."

- [ ] **Step 3: Update `docs/ROADMAP.md`, `docs/COSTS.md`, `docs/CALENDAR-SYNC.md`**

Find/replace `ARC` → `FAINEANT` and `Arc` → `Faineant`. Verify each post-replace for context (e.g., `arc.app` → `faineantapp.com`).

- [ ] **Step 4: Verify and commit**

```bash
git add README.md CLAUDE.md docs/
git commit -m "docs: update README, CLAUDE.md, and docs for FAINEANT

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

---

## Phase 9 — Final verification

### Task 9.1: Full test suite + smoke walkthrough

**Files:** none (verification).

- [ ] **Step 1: Run full test suite**

```bash
pnpm test --run
```
Expected: all 293+ tests pass.

- [ ] **Step 2: Run typecheck across all packages**

```bash
pnpm typecheck
```
Expected: clean across @faineant/web, @faineant/api, @faineant/mobile, @faineant/shared.

- [ ] **Step 3: Boot dev servers**

```bash
pnpm dev
```
Expected: web on :3000, api on :3001, both start.

- [ ] **Step 4: Manual smoke walkthrough**

Open `localhost:3000`. Verify against spec §10 acceptance criteria:
1. Homepage renders with all sections and photographs (per Task 4.1).
2. `/services` lists 6 service tiles.
3. `/services/hour-of-nothing` renders the service detail.
4. `/practitioners/maeve-le-gal` renders the practitioner profile.
5. `/login` and `/register` render with the auth split.
6. `/dashboard` renders for a signed-in client (use `admin@faineantapp.com` / `admin123`).

For mobile: `pnpm --filter @faineant/mobile dev`, open the simulator, walk the four-step booking flow.

- [ ] **Step 5: Final ARC-residue grep**

```bash
grep -rni "arc\b" apps packages --include="*.ts" --include="*.tsx" --include="*.json" --include="*.md" | grep -v "node_modules\|\.git\|\.next\|dist\|tsbuildinfo" | grep -v "spark\|search\|march\|dark\|garc\|arch"
```
Expected: empty output (or only false-positive matches like `arch`, `dark`).

- [ ] **Step 6: Commit any final fixes**

```bash
# If any false positives needed cleanup:
git add -A
git commit -m "chore: final FAINEANT residue cleanup

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
```

- [ ] **Step 7: Done**

The branch now contains the full FAINEANT rebrand. Open a PR for human review before merging to main.

---

## Self-review notes

The following spec sections all map to tasks above:

| Spec § | Implemented in |
|---|---|
| §1 Why | Captured in branding/copy throughout 4.1, 4.2, 6.2 |
| §2 Brand identity | Tasks 1.1 (constants), 4.1 (copy), 6.2 (email) |
| §3.1 Palette | Tasks 1.2, 1.3, 1.4 |
| §3.2 Type | Tasks 1.2, 1.3, 1.5, 1.6 |
| §3.3 Spacing/radius/motion | Task 1.3 (Tailwind config) |
| §4.1 Logo files | Task 0.1 |
| §4.2 Photography | Task 0.1 |
| §4.3 Voice patterns | Tasks 4.1, 4.3, 4.4, 6.1, 6.2 |
| §5.1 Folder stays Arc | (Implicit — never renamed) |
| §5.2 Package names | Task 7.1 |
| §5.4 Documentation | Task 8.1 |
| §5.5 Infrastructure | Task 7.2 |
| §6.1 Web | Tasks 2.x, 3.x, 4.x |
| §6.2 Mobile | Tasks 5.x |
| §6.3 API | Tasks 6.1, 6.2 |
| §6.4 Shared | Tasks 1.1, 1.2 |
| §6.5 Tests | Tasks 2.6, 5.6 |
| §7 Migration order | Reflected in Phase ordering 0–9 |
| §10 Acceptance criteria | Verified in Task 9.1 |
