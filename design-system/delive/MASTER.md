# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** DeLive
**Generated:** 2026-03-10 20:33:05
**Category:** Productivity Tool

---

## Global Rules

### Color Palette

| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#2563EB` | `--color-primary` |
| Secondary | `#3B82F6` | `--color-secondary` |
| CTA/Accent | `#F97316` | `--color-cta` |
| Background | `#F8FAFC` | `--color-background` |
| Text | `#1E293B` | `--color-text` |

**Color Notes:** Event orange + map blue

### Typography

- **Heading Font:** Atkinson Hyperlegible
- **Body Font:** Atkinson Hyperlegible
- **Mood:** accessible, readable, inclusive, WCAG, dyslexia-friendly, clear
- **Google Fonts:** [Atkinson Hyperlegible + Atkinson Hyperlegible](https://fonts.google.com/share?selection.family=Atkinson+Hyperlegible:wght@400;700)

**CSS Import:**
```css
@import url('https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap');
```

### Spacing Variables

| Token | Value | Usage |
|-------|-------|-------|
| `--space-xs` | `4px` / `0.25rem` | Tight gaps |
| `--space-sm` | `8px` / `0.5rem` | Icon gaps, inline spacing |
| `--space-md` | `16px` / `1rem` | Standard padding |
| `--space-lg` | `24px` / `1.5rem` | Section padding |
| `--space-xl` | `32px` / `2rem` | Large gaps |
| `--space-2xl` | `48px` / `3rem` | Section margins |
| `--space-3xl` | `64px` / `4rem` | Hero padding |

### Shadow Depths

| Level | Value | Usage |
|-------|-------|-------|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift |
| `--shadow-md` | `0 4px 6px rgba(0,0,0,0.1)` | Cards, buttons |
| `--shadow-lg` | `0 10px 15px rgba(0,0,0,0.1)` | Modals, dropdowns |
| `--shadow-xl` | `0 20px 25px rgba(0,0,0,0.15)` | Hero images, featured cards |

---

## Component Specs

### Buttons

```css
/* Primary Button */
.btn-primary {
  background: #F97316;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-1px);
}

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: #2563EB;
  border: 2px solid #2563EB;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  transition: all 200ms ease;
  cursor: pointer;
}
```

### Cards

```css
.card {
  background: #F8FAFC;
  border-radius: 12px;
  padding: 24px;
  box-shadow: var(--shadow-md);
  transition: all 200ms ease;
  cursor: pointer;
}

.card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
```

### Inputs

```css
.input {
  padding: 12px 16px;
  border: 1px solid #E2E8F0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 200ms ease;
}

.input:focus {
  border-color: #2563EB;
  outline: none;
  box-shadow: 0 0 0 3px #2563EB20;
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal {
  background: white;
  border-radius: 16px;
  padding: 32px;
  box-shadow: var(--shadow-xl);
  max-width: 500px;
  width: 90%;
}
```

---

## Style Guidelines

**Style:** Flat Design Mobile (Touch-First)

**Keywords:** flat, 2D, no shadow, color blocking, geometric, bold, poster, icon, touch-first, minimal, clean, tailored, cross-platform

**Best For:** Cross-platform apps (iOS+Android parity), information-dense dashboards, system UI, brand illustration, onboarding flows, marketing pages, icon design

**Key Effects:** Immediate press feedback (scale 0.97, no delay), color section blocking (full-width contrasting View), zero elevation/shadow, solid icon containers (colored squares/circles), geometric low-opacity shape overlays, bottom tabs solid fill (no floating)

### Page Pattern

**Pattern Name:** Newsletter / Content First

- **Conversion Strategy:** Single field form (Email only). Show 'Join X, 000 readers'. Read sample link.
- **CTA Placement:** Hero inline form + Sticky header form
- **Section Order:** 1. Hero (Value Prop + Form), 2. Recent Issues/Archives, 3. Social Proof (Subscriber count), 4. About Author

---

## Anti-Patterns (Do NOT Use)

- ❌ Complex onboarding
- ❌ Slow performance

### Additional Forbidden Patterns

- ❌ **Emojis as icons** — Use SVG icons (Heroicons, Lucide, Simple Icons)
- ❌ **Missing cursor:pointer** — All clickable elements must have cursor:pointer
- ❌ **Layout-shifting hovers** — Avoid scale transforms that shift layout
- ❌ **Low contrast text** — Maintain 4.5:1 minimum contrast ratio
- ❌ **Instant state changes** — Always use transitions (150-300ms)
- ❌ **Invisible focus states** — Focus states must be visible for a11y

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from consistent icon set (Heroicons/Lucide)
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile
