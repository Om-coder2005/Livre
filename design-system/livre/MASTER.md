# Livre Design System — Master Source of Truth (Phase 1)

**Product:** Livre — PDF-to-Book Web Application  
**Category:** Productivity / Digital Reading / Document Experience  
**Visual Direction:** Bohemian Editorial, Literary, Tactile, Artisanal Bookbinding, Calm  
**Platform:** Responsive Web Application (Desktop, Tablet, Mobile)  
**Implementation Stack:** React 18, Vite, TypeScript, PDF.js, Native CSS Variables  

---

## 1. Visual Identity & Brand Philosophy

Livre is designed as an intimate digital reading room that honors the physical craft of literary bookbinding. 
Ordinary digital PDFs are transformed into beautifully bound, tactile reading experiences.

### Key Aesthetic Tenets:
- **Warm Parchment & Ivory Ground:** Never harsh, sterile digital white (`#FFFFFF`) for reading surfaces; instead, warm ivory (`#FBF7EF`) and parchment (`#F2EDE3`).
- **Deep Espresso Ink:** Text is rendered in deep rich brown ink (`#332820`), delivering optimum contrast (11.2:1, AAA) without the digital fatigue of stark `#000000`.
- **Restrained Botanical Accents:** Forest Green (`#1B382B`), Muted Olive (`#737B5D`), and Terracotta (`#B76549`) inspired by cloth-bound volumes and marbled endpapers.
- **Antique Brass Foil:** Antique Brass (`#B59A62`) reading accessories, loupe metalwork, and delicate filigree.
- **Fine Bookbinding Lines:** Soft paper borders (`#D9D0C2`) and layered ambient shadows that evoke physical paper weight.
- **Typography with Provenance:** Instrument Serif for editorial display and Newsreader for book prose, paired with a clean interface sans-serif for functional controls.

### Anti-Patterns Strictly Avoided:
- ❌ Generic SaaS dashboard layouts.
- ❌ Neon colors, saturated purple/blue gradients, and glassmorphic blurs everywhere.
- ❌ Raw emojis used as interface icons (all replaced with vector icons).
- ❌ Overly bubbly cards or random floating shapes.
- ❌ Disorienting or slow (>300ms) page-shifting animations.

---

## 2. Color Palette & Semantic Tokens

| Semantic Token | Value | Fallback / Alias | Contrast Ratio / Usage |
|---|---|---|---|
| `--color-bg` | `#F2EDE3` | `--parchment` | Reading room parchment ground |
| `--color-bg-subtle` | `#FAF7F2` | `--paper-ground`, `--cream` | Subtle cream background wash |
| `--color-surface` | `#FBF7EF` | `--warm-ivory` | Ivory cards, book spread paper, popovers |
| `--color-surface-raised` | `#FFFFFF` | — | Elevated white surface |
| `--color-surface-sunken` | `#EAE3D6` | — | Recessed gutters, tracks, scrubber |
| `--color-surface-hover` | `#F5EFE3` | — | Card & button hover state |
| `--color-text-primary` | `#332820` | `--espresso`, `--ink` | Primary text (11.2:1 against parchment, AAA) |
| `--color-text-secondary` | `#5C4A3E` | `--espresso-soft`, `--ink-soft` | Subtitles, authors (6.5:1, AA) |
| `--color-text-muted` | `#7A685A` | `--espresso-faint`, `--ink-faint` | Metadata, counts, secondary notes (4.6:1, AA) |
| `--color-forest` | `#1B382B` | `--livre-green` | Primary interactive buttons, cloth darks |
| `--color-forest-hover` | `#2D4B39` | `--livre-green-mid` | Button hover |
| `--color-forest-light` | `#E3ECE2` | `--livre-sage` | Sage green pill wash |
| `--color-olive` | `#737B5D` | `--olive` | Chapter tree, bookmarks, progress |
| `--color-olive-light` | `#E8EBDD` | `--olive-light` | Active item wash |
| `--color-terracotta` | `#B76549` | `--terracotta`, `--livre-terracotta`| Editorial highlights, saved bookmarks |
| `--color-brass` | `#B59A62` | `--antique-brass` | Antique brass loupe & metallic accents |
| `--color-border` | `#D9D0C2` | `--muted-border` | Fine bookbinding borders & dividers |
| `--color-focus` | `#B76549` | — | High-visibility focus ring (3:1+ against all) |
| `--color-error` | `#A8321B` | — | Editorial crimson alert text |
| `--color-success` | `#2A6945` | — | Botanical forest green confirmation |

---

## 3. Typography Scale & Hierarchy

All fonts are bundled locally with zero external network dependencies.

- **Display:** `'Instrument Serif', Georgia, serif` (editorial headings, volume titles).
- **Prose / Serif:** `'Newsreader', Georgia, serif` (book contents, chapter titles, reader UI).
- **Interface Sans:** `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` (labels, badges, metadata).
- **Monospace:** `ui-monospace, SFMono-Regular, Menlo, Monaco, monospace` (keyboard shortcuts `<kbd>`).

### Fluid Type Scale:
```css
--text-xs:      clamp(0.6875rem, 0.65rem + 0.15vw, 0.75rem);   /* 11px - 12px */
--text-sm:      clamp(0.8125rem, 0.77rem + 0.2vw, 0.875rem);   /* 13px - 14px */
--text-base:    clamp(0.9375rem, 0.88rem + 0.25vw, 1rem);      /* 15px - 16px */
--text-md:      clamp(1.0625rem, 1rem + 0.3vw, 1.125rem);      /* 17px - 18px */
--text-lg:      clamp(1.1875rem, 1.1rem + 0.4vw, 1.3125rem);   /* 19px - 21px */
--text-xl:      clamp(1.375rem, 1.25rem + 0.6vw, 1.625rem);    /* 22px - 26px */
--text-2xl:     clamp(1.625rem, 1.45rem + 0.9vw, 2.125rem);    /* 26px - 34px */
--text-3xl:     clamp(2rem, 1.7rem + 1.5vw, 2.75rem);          /* 32px - 44px */
--text-4xl:     clamp(2.5rem, 2.1rem + 2vw, 3.75rem);          /* 40px - 60px */
--text-display: clamp(3rem, 2.5rem + 2.8vw, 4.75rem);          /* 48px - 76px */
```

### Typographic Rules:
- Headings use `text-wrap: balance` to eliminate awkward orphan words.
- Paragraphs use `text-wrap: pretty`.
- Number counters, page numbers, scrubbers, and badges use `font-variant-numeric: tabular-nums` to eliminate layout jitter.

---

## 4. Spacing, Radii & Elevation

### Spacing Scale:
- `3xs: 2px`, `2xs: 4px`, `xs: 8px`, `sm: 12px`, `md: 16px`, `lg: 20px`, `xl: 24px`, `2xl: 32px`, `3xl: 40px`, `4xl: 48px`, `5xl: 64px`, `6xl: 80px`, `7xl: 96px`.
- Page Horizontal Padding: `clamp(1rem, 0.6rem + 2vw, 3rem)`.

### Concentric Border Radius (`better-ui`):
- `outer_radius = inner_radius + padding`.
- Buttons / Small Inputs: `--radius-sm` (5px) to `--radius-md` (8px).
- Cards & Popovers: `--radius-lg` (12px) to `--radius-xl` (16px).
- Pills & Badges: `--radius-full` (9999px).

### Shadows:
- Layered transparent shadows (`rgba(51, 40, 32, ...)`):
  - `--shadow-sm`: subtle card elevation.
  - `--shadow-md`: card hover elevation.
  - `--shadow-book`: physical open codex ambient shadow.
  - `--shadow-popover`: appearance & settings menus.
  - `--shadow-drawer`: full-height sidebar drawer.
- Forced-colors fallback: `border: 1px solid transparent` included alongside shadows for Windows High Contrast mode.

---

## 5. Responsive Breakpoint Strategy

Livre uses a content-driven, mobile-first responsive architecture:

| Breakpoint | Target Screen | Primary Layout Adaptation |
|---|---|---|
| `< 480px` | Compact Mobile (iPhone SE, Galaxy S) | Single-column stack, full-width touch buttons, compact header, hidden secondary decor |
| `480px – 767px` | Standard Mobile (iPhone 14/15, Pixel) | Single-page continuous reader default, sliding bottom/drawer sidebar, compact scrubber |
| `768px – 1023px` | Tablet Portrait & Landscape (iPad) | Flexible 2-column or adaptive single-page, drawer sidebar with backdrop |
| `1024px – 1279px` | Compact Desktop / Laptop | Full two-page spread reader, persistent sidebar option, 2-column library grid |
| `1280px+` | Wide Desktop (1080p, 1440p) | Spacious central reading stage (65–75% stage width), 3-column library grid, full loupe workspace |

### Essential Responsive Techniques:
- Dynamic viewport height using `100dvh` to account for mobile browser URL bars.
- Safe area padding using `env(safe-area-inset-*)` on mobile notched devices.
- `overscroll-behavior: contain` on scrollable dialogs, popovers, and the sidebar to prevent background scroll chaining.
- `-webkit-tap-highlight-color: transparent` and `@media (hover: hover)` guards to eliminate stuck hover states on touch screens.
- `min-width: 0` on flex items containing text to prevent card/row horizontal blowout.

---

## 6. Motion & Animation Principles

Adhering to the **12 Principles of Animation** and **Motion System Rules**:
1. **Duration Cap:** User-initiated micro-interactions must never exceed 300ms (drawers max 340ms).
2. **Speed & Easing:**
   - Entrances: `--ease-enter` (`cubic-bezier(0.23, 1, 0.32, 1)`).
   - Exits: `--ease-exit` (`cubic-bezier(0.4, 0, 1, 1)`), closing 25% faster than opening.
   - Screen Movement: `--ease-move` (`cubic-bezier(0.77, 0, 0.175, 1)`).
3. **Trigger-Anchored Origin:** Menus and popovers scale from their trigger button edge (`transform-origin: top right`), not screen center.
4. **No Scale from Zero:** Elements enter from `scale(0.96)` with `opacity: 0` to prevent disorienting pop-ins.
5. **Reduced Motion:** Full `@media (prefers-reduced-motion: reduce)` override setting duration to `0.01ms` and disabling transforms for vestibular safety.

---

## 7. Accessibility Foundation (WCAG 2.2 AA)

1. **Focus Visibility:** High-contrast 2px focus ring (`--focus-ring`) visible on all keyboard interactive elements (`:focus-visible`).
2. **Touch Targets:** Minimum 44×44px interactive bounding box for touch controls (`--touch-target-min`).
3. **Contrast:** Every text pairing complies with WCAG AA (minimum 4.5:1 for normal text, 3:1 for large text / non-text controls).
4. **Accessible Icon Names:** All icons carry `aria-hidden="true"`, with parent buttons having explicit `aria-label` or visible text.
5. **Screen Reader Utilities:** `.sr-only` class provided for accessible assistive text.
