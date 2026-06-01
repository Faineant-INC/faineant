# FAINEANT Rebrand — Design Spec

- **Date:** 2026-04-27
- **Status:** For approval
- **Owner:** @GVillegasPM
- **Scope:** Full rebrand of `arc` (beauty services marketplace) into `FAINEANT` — name, identity, palette, type, photography, voice, naming, and all surface-level UI across web, mobile, and shared packages.
- **Out of scope:** Backend logic, database schema, payment flow, calendar-sync engine — unchanged.
- **Implementation prototype:** `.superpowers/brainstorm/81088-1777312625/content/prototype-v3-full.html` (six screens, real photography wired).

---

## 1. Why we're doing this

The current `ARC` identity is warm-editorial (ivory paper, espresso brown, brass) — competent but generic SaaS-with-a-magazine-feel. It does not carry the brand promise of *house calls for in-home beauty services in Chicago*. **FAINEANT** (French *fainéant*: idle, at leisure, do-nothing — anglicised, no accent) reframes the product: booking is the only thing the client has to do. The practitioner arrives. The chair is yours. The luxury is not having to leave.

Visually, this means a brutalist fashion-house wordmark (closer to The Row / Balenciaga than to Vagaro / StyleSeat) carrying a sensual, indolent body voice (closer to Officine Universelle Buly than to "book your beauty appointment today").

## 2. Brand identity

### 2.1 Name and capitalisation
- **Mark:** `FAINEANT` — uppercase, no accent. Wordmark file is canonical; never re-typeset.
- **In body copy:** `Faineant` (title case). Avoid all-caps in prose.
- **Domain target:** `faineantapp.com` (acquisition is a separate workstream — not blocking spec).
- **Symbol:** the cruciform monogram (interlocking F's) is usable independent of the wordmark — favicons, app icons, loading states, watermarks.

### 2.2 Geographic scope
**Chicago only.** Surface only Chicago neighbourhoods in copy and seed data: West Loop, Logan Square, Wicker Park, Lincoln Park, Fulton Market, River North. No NY/LA references anywhere. Future markets are explicitly deferred.

### 2.3 Tone
- **Visual:** brutalist, geometric, restrained, never busy.
- **Copy:** sensual, slow, slightly literary. Long sentences allowed. Service names in lowercase italic ("hour of nothing," "quiet manicure"). Eyebrows / labels in ALL CAPS letterspaced 0.32em. Numbers as `№ 01`. Times in 24-hour format. Prices in mono with `.00` suffix.
- **Forbidden:** "book now," "save time," exclamation marks, growth-hacker language, generic stock smiles in photography.

### 2.4 Tagline candidates (pick during implementation)
- *"House calls for the slow-living."*
- *"You don't have to leave the apartment."*
- *"Booking is the only thing you have to do."*
- *"Nothing urgent."*

## 3. Design tokens

### 3.1 Colour palette — Smoke + Champagne (dark canonical)

```
smoke-950   #0a0908    /* page ground (deep) */
smoke-900   #0e0d0c    /* page ground (canonical) */
smoke-800   #15130f    /* card ground */
smoke-700   #1f1c18    /* hairline borders, grid lines */
smoke-600   #2a2620    /* hover states on dark */

taupe-500   #3a342a    /* warm hairline (emphasis dividers) */
taupe-400   #5a5240    /* muted warm */
taupe-300   #8a7e64    /* muted-foreground on dark */

champagne-500 #b8a780  /* hover/pressed accent */
champagne-400 #c9b896  /* canonical accent (price, ring, italic display) */
champagne-300 #dccfb1  /* accent on light surfaces */

bone-200    #e8dfc9    /* secondary foreground on dark */
bone-100    #f3ede1    /* primary foreground on dark / page ground on light */
bone-50     #faf6ec    /* card ground on light */
```

**shadcn variable mapping (dark mode is default):**
```
--background:        smoke-900
--foreground:        bone-100
--card:              smoke-800
--card-foreground:   bone-100
--popover:           smoke-800
--popover-foreground:bone-100
--primary:           bone-100         /* primary surface = bone, foreground = smoke */
--primary-foreground:smoke-900
--secondary:         smoke-700
--secondary-foreground:bone-200
--accent:            champagne-400
--accent-foreground: smoke-900
--muted:             smoke-700
--muted-foreground:  taupe-300
--destructive:       #6e2424          /* deep oxblood — used sparingly for errors only */
--destructive-foreground: bone-100
--border:            smoke-700
--input:             smoke-700
--ring:              champagne-400
--radius:            0.125rem         /* 2px — brutalist sharpness */
```

**Light mode (transactional emails, opt-in user setting):** mirror with `bone-100` background, `smoke-900` foreground, same accent. Spec only the dark canonical for v1; light surfaces will reuse the same tokens inverted.

### 3.2 Typography

**Four families, all loaded via Google Fonts (`next/font/google` for web, `expo-font` for mobile — no `@import` in production CSS).**

| Role | Family | Weights | Notes |
|---|---|---|---|
| Display | Bricolage Grotesque | 400, 500, 700, 800 | `font-stretch: 90%` for compressed feel matching wordmark |
| Body | Inter | 300, 400, 500, 600 | Workhorse |
| Editorial | Cormorant Garamond | 300, 400 italic; 500 italic | Italic-only in actual usage |
| Mono | Geist Mono | 400, 500 | Prices, times, reservation IDs, dates |

**Type scale (Tailwind `fontSize` keys):**

```
display-xl      7rem    / 0.92 / -0.04em / 700  Bricolage  (hero only)
display-lg      5rem    / 0.94 / -0.04em / 700  Bricolage
display         3.5rem  / 0.95 / -0.04em / 700  Bricolage
editorial-xl    5rem    / 1.05 / -0.02em / 300  Cormorant italic
editorial-lg    3rem    / 1.10 / -0.02em / 300  Cormorant italic
editorial       1.5rem  / 1.40 / -0.005em/ 300  Cormorant italic  (lede, pull-quotes)
heading         2rem    / 1.05 / -0.03em / 700  Bricolage
subheading      1.25rem / 1.30 / -0.02em / 500  Inter
body-lg         1.125rem/ 1.55 / 0       / 400  Inter
body            1rem    / 1.55 / 0       / 400  Inter
body-sm         0.875rem/ 1.50 / 0       / 400  Inter
caption         0.75rem / 1.50 / 0.04em  / 400  Inter
label           0.6875rem/1.40 / 0.32em  / 500  Inter (uppercase via class)
mono            0.8125rem/1.55/ 0.04em  / 400  Geist Mono
```

**Wordmark replacement of typed text everywhere:** the literal word "FAINEANT" must always render as the **logo image asset**, never as typed text — the inverted-E palindrome trick can't be reproduced typographically. This applies to nav, footer, marketing pages, email headers, mobile splash. Body copy may use "Faineant" as text, but never the all-caps mark.

### 3.3 Spacing, radius, motion

- **Border-radius:** `0.125rem` (2 px) on most controls, `0` on cards and large surfaces. Pills can use `9999px` for full-pill where contextually correct.
- **Shadows:** minimal — `0 30px 80px rgba(0,0,0,0.6)` only on floating modals and the browser-frame mockup convention. Page surfaces are flat.
- **Borders:** hairlines (1 px) on `smoke-700` for grid/card edges; `taupe-500` for emphasis dividers (section heads, CTA separators).
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` for everything — slow exit, gentle settle.
- **Durations:** fades 600 ms; sheets/drawers 400 ms; hover transitions 250 ms. **No springs, no overshoot, no bounce.**
- **Page transitions:** cross-fade only, 400 ms.

## 4. Brand assets

### 4.1 Logo files (already generated, in `.superpowers/brainstorm/.../content/`)
- `faineant-logo-white.png` / `-black.png` / `-champagne.png` — full lockup
- `faineant-wordmark-white.png` / `-black.png` — wordmark only
- `faineant-monogram-white.png` / `-black.png` — cruciform mark only

**Implementation note:** copy into `apps/web/public/brand/` and `apps/mobile/assets/brand/`. Future work: replace PNGs with SVG for crisp scaling — out of scope for v1.

### 4.2 Photography style guide

**Eight images already generated** (`gpt-image-1`, ~$2 total). Visual language is locked:

- 35 mm grainy film, fine warm tint, slight desaturation
- Single warm light source (tall industrial window or single brass lamp); shadow-side dominant
- Subjects mid-action, eyes closed or downcast — never camera-aware, never smiling
- Chicago apartment interiors: white-painted brick, wide-plank hardwood, sparse furniture
- Palette: smoke, taupe, champagne, bone — no chromatic outliers
- Composition asymmetric and breathing; generous negative space
- No logos in frame, no recognisable brand artifacts

**Future practitioners** (Yumi, Adèle, Imani, Rafael, Léa, plus more) need portraits in the same style. Re-run the same prompt scaffold with practitioner-specific descriptions. Once the OpenAI org is verified, regenerate the existing 8 on `gpt-image-2` for higher fidelity and character continuity across the set.

### 4.3 Voice / copy patterns

**Service headlines** combine a Bricolage geometric phrase with a Cormorant italic clause:
> "An *hour of nothing* on your couch."
> "A *quiet manicure* at your coffee table."
> "Lashes *laid on your bed,* by Imani."

**CTAs** are imperative and behavioural, never transactional:
> "Reserve a window" (not "Book now")
> "Open the door at 14:00" (the action on a confirmed booking)

**Confirmation states** address the body, not the calendar:
> "Maeve will be at your door tomorrow at 14:00. Don't get up early."

**Practitioner copy** sounds like a chef tasting card, not an SEO bio:
> "Trained at Cristophe in Paris. Plays Erik Satie. Will not work on your phone."

## 5. Naming and rename mapping

### 5.1 Repository (folder)
Keep `Arc/` folder name unchanged — folder rename gives nothing and risks broken machine-local paths. **Symbolic identity is "FAINEANT"; filesystem identity stays.**

### 5.2 Package names

| Before | After |
|---|---|
| `arc` (root) | `faineant` |
| `@arc/web` | `@faineant/web` |
| `@arc/api` | `@faineant/api` |
| `@arc/shared` | `@faineant/shared` |
| `@arc/mobile` | `@faineant/mobile` |

All `package.json` `name` fields update. All workspace dependencies (`"@arc/shared": "workspace:*"`) update. All TypeScript imports `from '@arc/shared'` update via codemod (`grep -rl "@arc/" | xargs sed`).

### 5.3 Generic identifier preservation
Do **not** rename generic types/symbols (`User`, `Provider`, `Booking`, `Service`, etc.) — those are not brand-specific. Only rename literal "ARC" / "Arc" string occurrences in:
- Display copy (titles, descriptions, error messages)
- README/docs
- Environment variable prefixes (`ARC_*` → `FAINEANT_*` if any exist; verify via grep)
- Database name in deploy config (only if literally named `arc_db`)

### 5.4 Documentation
- `README.md` — replace
- `CLAUDE.md` — update brand description; everything else (build order, conventions) stays
- `docs/ROADMAP.md`, `docs/COSTS.md`, `docs/CALENDAR-SYNC.md` — find/replace ARC → FAINEANT; check for stale assumptions

### 5.5 Infrastructure
- `vercel.json` — update project name if present
- Domain — separate workstream (TODO, not blocking spec)

## 6. Surface-level changes by package

### 6.1 `apps/web` (Next.js 14 + Tailwind + shadcn)

**Tokens:**
- Replace `tailwind.config.ts` colour scales (`ivory`, `espresso`, `brass`) with `smoke`, `taupe`, `champagne`, `bone`. Keep `neutral` for compatibility shim during migration but reroute usage.
- Update `globals.css` `:root` and `.dark` variables to the mapping in §3.1. **Default body class becomes dark** (`bg-smoke-900 text-bone-100`), not light.
- Remove `bg-paper-grain` utility (paper texture is off-brand) — replace with monogram watermark utility on manifesto sections only.
- Update `editorial-*` and `display-*` font-size keys to the §3.2 scale; add `mono` size key.

**Fonts:**
- Replace system-ui stack with `next/font/google` for Bricolage Grotesque, Inter, Cormorant Garamond (italic only), Geist Mono. Apply via root layout `<body className={`${bricolage.variable} ${inter.variable} ...`}>`.

**UI primitives** (`apps/web/src/components/ui/*` — 21 files):
- `button.tsx` — variants: `primary` (bone bg, smoke fg), `ghost` (transparent, taupe-500 border, bone fg), `accent` (champagne bg). All sharp corners.
- `card.tsx` — flat surface, hairline border, no shadow.
- `input.tsx`, `label.tsx` — bone-100 text, smoke-700 border, champagne-400 focus ring.
- `dialog.tsx`, `drawer.tsx`, `sheet.tsx`, `popover.tsx`, `dropdown-menu.tsx`, `tooltip.tsx` — smoke-800 surface, smoke-700 hairline, slow `cubic-bezier(0.16, 1, 0.3, 1)` enter.
- `badge.tsx` — uppercase letterspaced label style.
- `tabs.tsx`, `breadcrumb.tsx`, `separator.tsx`, `skeleton.tsx`, `tooltip.tsx`, `collapsible.tsx`, `calendar.tsx`, `table.tsx`, `avatar.tsx`, `alert-dialog.tsx`, `sidebar.tsx` — re-themed.

**Layout** (`apps/web/src/components/layout/`, `app-sidebar.tsx`, `nav-*`, `team-switcher.tsx`):
- Logo image swap (use `<Image>` with `/brand/faineant-wordmark-white.png`).
- Topbar marquee: single quiet line ("NOW IN CHICAGO. *You don't have to leave the apartment.*"), no scroll animation.
- Sidebar uses the wordmark at 18 px height; pared-down item list with mono counts.

**Pages** (`apps/web/src/app/*`):
- `page.tsx` (homepage) — full rewrite per prototype: hero, three-step, idle collection, manifesto, practitioner spotlight, footer.
- `(auth)/login`, `(auth)/register` — minimal forms with monogram lockup, Cormorant lede, Bricolage submit.
- `dashboard/page.tsx`, `dashboard/client/*`, `dashboard/provider/*` — sidebar layout, "good morning [name]," upcoming hero card, past visits with rebook.
- `community/page.tsx`, `pricing/page.tsx`, `providers/page.tsx`, `about/page.tsx`, `admin/page.tsx` — copy and theme refresh; structure stays.
- Service detail page (currently nested in `provide…` based on git status; verify path) — full prototype treatment with windows calendar.
- Practitioner profile page — new route `/practitioners/[slug]`.

### 6.2 `apps/mobile` (Expo + Expo Router + React Native)

**Token parity with web** via a shared theme module in `@faineant/shared/theme` consumed by both apps. Define palette + type scale in TypeScript so RN `StyleSheet` and web Tailwind both reference the same source.

**Fonts** via `expo-font` — load Bricolage Grotesque, Inter, Cormorant Garamond Italic, Geist Mono in the root layout. Splash uses the monogram at 64 px on smoke-900.

**Screens** (`apps/mobile/src/app/*` — already inventoried in git status):
- `(auth)/login.tsx`, `(auth)/register.tsx` — themed
- `(client)/home.tsx` — service grid, indolent voice
- `(client)/bookings.tsx` — upcoming hero, past list
- `(client)/community.tsx`, `(client)/messages.tsx`, `(client)/profile.tsx` — themed
- `(provider)/home.tsx`, `(provider)/bookings.tsx`, `(provider)/earnings.tsx` — themed
- `_layout.tsx` files — tab bar with monogram active indicator on champagne-400; smoke-900 ground

**Booking flow** — implement the four-screen flow shown in prototype mobile-row: pick service → pick window → confirm → success ticket.

### 6.3 `apps/api` (Express + Prisma)

- Error message strings update brand reference.
- Default seed data (`prisma/seed.ts`): replace generic provider names with `Maeve Le Gal`, `Yumi Watanabe`, `Adèle Bergère`, `Imani Okafor`, `Rafael Duarte`, `Léa Hernandez`, all in Chicago neighbourhoods. Service names per §4.3.
- Email template strings (transactional sender) — per §4.3 voice patterns. Light-surface template per §3.1.
- No route changes, no schema changes.

### 6.4 `packages/shared`

- Add `theme/` module: `palette.ts`, `type.ts`, `motion.ts` — single source consumed by web Tailwind config and mobile RN styles.
- Add `brand.ts`: `BRAND_NAME`, `LEGAL_NAME`, `TAGLINE`, `CITY`, `NEIGHBOURHOODS` — all importable.
- Constants in any other Zod schemas with brand-specific labels (e.g., service category labels) — update.

### 6.5 Tests

The repo has 293 tests (web Vitest, API Vitest, mobile Jest). Most are behaviour tests and survive the rebrand. Snapshot or copy-string tests will need updating:
- Web: `apps/web/src/__tests__/components/ui/*.test.tsx` — verify variants still pass after CVA rewrites.
- Mobile: `apps/mobile/src/__tests__/screens/**` — copy assertions update.

## 7. Migration approach

- **Single feature branch.** No backward compatibility shims (we're not maintaining ARC alongside).
- **Atomic commits per area, in this order:** (1) tokens (Tailwind + globals.css + shared theme module) → (2) fonts wired in both apps → (3) UI primitives re-themed → (4) layout (nav/footer/sidebar) → (5) pages → (6) seed data + email copy → (7) package rename (`@arc/*` → `@faineant/*`) → (8) docs.
- **Verification gate at each step:** typecheck + tests must pass before next commit.
- **Photography:** assets live in `apps/web/public/brand/photography/` (8 PNGs from the brainstorm session, copied in). When `gpt-image-2` access lands, regenerate and replace.
- **Mobile bundle bump** is implicit (assets change).

## 8. Non-goals

- Backend logic, database schema, payment, calendar-sync engine, real-time messaging — all unchanged.
- New features — *zero* added in this rebrand. New flows (e.g., the four-screen mobile booking) only ship if the screen already exists; the prototype defines the *look* of those existing flows, not new ones.
- Domain acquisition, app-store re-submission, PWA manifest, favicon SVG — separate workstreams.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Tailwind token rename breaks colour utilities everywhere at once | Compatibility shim: keep old colour classes (`bg-ivory-100`) as aliases of new tokens for one commit cycle, then remove |
| Font swap causes FOIT/CLS on slow networks | Use `next/font/google` `display: 'optional'` with explicit fallback metrics (`adjustFontFallback`) |
| Photography appears overcooked / "too editorial" for the actual product audience | A/B variant of hero copy (and image) is acceptable later; v1 ships the brand-canonical version |
| Reviewers find the voice "too precious" | Voice is calibrated by `apps/web/src/app/page.tsx` copy; tunable file-by-file post-launch |
| `gpt-image-2` org verification takes longer than expected | Ship with `gpt-image-1` outputs already in place; upgrade is a non-blocking refresh later |
| Existing 293 tests break en masse | Run typecheck + test suite at each atomic commit; revert and split if a single commit breaks > 5 tests |

## 10. Acceptance criteria

The rebrand is shippable when:

1. `pnpm typecheck` and `pnpm test` pass across all packages.
2. `pnpm dev` starts web and mobile; the homepage matches `prototype-v3-full.html` at the homepage section pixel-for-pixel within reason.
3. All 6 service tiles, 1 hero, and 1 practitioner portrait load from local assets (no external image hosts).
4. The literal mark "FAINEANT" never appears as typed text — always as logo image.
5. No `ARC` or `arc` strings remain in user-visible copy (allowed only in: git history, internal type names, CLAUDE.md historical notes).
6. Chicago is the only city referenced anywhere in seed data, copy, or examples.
7. The four-step mobile booking flow is reachable end-to-end on the Expo simulator.
8. The confirmation email template renders correctly with the Maeve example data.

## 11. Implementation plan

This spec produces an implementation plan via the `superpowers:writing-plans` skill (next step). The plan will sequence the atomic commits in §7 with verification gates and named subagent assignments where parallelism helps (e.g., UI primitives can be re-themed in parallel with mobile font wiring).

---

*End of spec. Awaiting reviewer approval before producing the implementation plan.*
