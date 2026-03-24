# DESIGN_SYSTEM.md

> Visual design system for OriginClipAI v1. All colors, typography, spacing, and component patterns.

---

## Theme: Light (v1 default)

### Color Palette

```css
:root {
  /* Backgrounds */
  --bg-base: #f6f5f2;           /* Warm off-white canvas */
  --bg-surface: #ffffff;         /* Cards, sidebar, panels */
  --bg-surface-hover: #f0efec;  /* Surface hover state */
  --bg-elevated: #ffffff;        /* Modals, dropdowns */
  
  /* Borders */
  --border-default: #e4e2dd;    /* Warm gray borders */
  --border-active: #5046e5;     /* Focused/active state */
  --border-subtle: #eeedea;     /* Very light separator */
  
  /* Text */
  --text-primary: #1a1a1a;      /* Headings, primary content */
  --text-secondary: #6b6960;    /* Body text, descriptions */
  --text-tertiary: #a09e96;     /* Placeholders, disabled, metadata */
  
  /* Accent — Indigo */
  --accent: #5046e5;            /* Primary action color */
  --accent-hover: #4338ca;      /* Hover state */
  --accent-text: #4338ca;       /* Text on light backgrounds */
  --accent-soft: rgba(80,70,229,0.06);  /* Light accent background */
  --accent-border: rgba(80,70,229,0.18); /* Accent border */
  
  /* Semantic — Status */
  --green: #16a34a;
  --green-soft: rgba(22,163,74,0.08);
  --green-border: rgba(22,163,74,0.2);
  
  --amber: #d97706;
  --amber-soft: rgba(217,119,6,0.08);
  --amber-border: rgba(217,119,6,0.2);
  
  --red: #dc2626;
  --red-soft: rgba(220,38,38,0.06);
  --red-border: rgba(220,38,38,0.2);
  
  --cyan: #0891b2;
  --cyan-soft: rgba(8,145,178,0.07);
  --cyan-border: rgba(8,145,178,0.2);
  
  /* Shadows */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);
}
```

### Tailwind Configuration Mapping

```js
// tailwind.config.js (extend)
colors: {
  bg: { base: '#f6f5f2', surface: '#ffffff', hover: '#f0efec' },
  border: { DEFAULT: '#e4e2dd', active: '#5046e5', subtle: '#eeedea' },
  text: { primary: '#1a1a1a', secondary: '#6b6960', tertiary: '#a09e96' },
  accent: { DEFAULT: '#5046e5', hover: '#4338ca', text: '#4338ca', soft: 'rgba(80,70,229,0.06)' },
  status: {
    green: '#16a34a', 'green-soft': 'rgba(22,163,74,0.08)',
    amber: '#d97706', 'amber-soft': 'rgba(217,119,6,0.08)',
    red: '#dc2626', 'red-soft': 'rgba(220,38,38,0.06)',
    cyan: '#0891b2', 'cyan-soft': 'rgba(8,145,178,0.07)',
  }
}
```

---

## Typography

### Font Stack

| Role | Font | Fallback | Usage |
|------|------|----------|-------|
| Display | Instrument Sans | SF Pro Display, -apple-system, sans-serif | Headings, titles, hero text |
| Body | DM Sans | SF Pro Text, -apple-system, sans-serif | All body text, labels, descriptions |
| Mono | JetBrains Mono | SF Mono, monospace | Scores, timestamps, code, metadata |

### Type Scale

| Name | Size | Weight | Line Height | Letter Spacing | Usage |
|------|------|--------|-------------|----------------|-------|
| heading-xl | 30px | 700 | 1.2 | -0.03em | Page titles (Ingest heading) |
| heading-lg | 22px | 700 | 1.25 | -0.02em | Section titles (Schedule heading) |
| heading-md | 18px | 700 | 1.3 | -0.02em | Card titles, detail panel titles |
| heading-sm | 15px | 700 | 1.35 | -0.01em | Sub-section headers |
| body-lg | 15px | 400 | 1.5 | 0 | Large body text (descriptions) |
| body | 14px | 400 | 1.5 | 0 | Default body text |
| body-sm | 13px | 400/600 | 1.4 | 0 | List items, secondary content |
| caption | 12px | 400/600 | 1.4 | 0 | Captions, helper text |
| label | 11px | 600/700 | 1.3 | 0.02em | Badges, metadata |
| overline | 10px | 700 | 1.3 | 0.12em | Section labels (uppercase) |
| mono-sm | 11px | 400/600 | 1.3 | 0.02em | Timestamps, scores, technical data |

### Google Fonts Import
```
https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Instrument+Sans:wght@400;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap
```

---

## Spacing

Base unit: 4px. Use Tailwind spacing scale.

| Token | Value | Usage |
|-------|-------|-------|
| spacing-1 | 4px | Tight padding (badge internal) |
| spacing-2 | 8px | Compact gaps |
| spacing-3 | 12px | Standard gap between related items |
| spacing-4 | 16px | Card internal padding, section gap |
| spacing-5 | 20px | Panel padding |
| spacing-6 | 24px | Page padding, large section gaps |
| spacing-8 | 32px | Section separation |
| spacing-10 | 40px | Page-level separation |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| radius-sm | 6px | Badges, small pills |
| radius-md | 8px | Buttons, input fields |
| radius-lg | 10px | Sidebar items, list items |
| radius-xl | 12px | Cards, panels |
| radius-2xl | 14px | Large cards, dialogs |
| radius-3xl | 16px | Video preview, featured cards |
| radius-full | 9999px | Progress bars, circular elements |

---

## Component Patterns

### Badge

```
Background: semantic color soft (e.g., green-soft)
Text: semantic color (e.g., green)
Border: optional (semantic color at 20% opacity)
Padding: 2px 9px
Border-radius: radius-sm (6px)
Font: mono-sm (11px, weight 600)
```

Variants:
- **Score badge (90+):** green text, green-soft bg
- **Score badge (80-89):** amber text, amber-soft bg
- **Score badge (<80):** tertiary text, tertiary-soft bg
- **Speaker badge (host):** accent text, accent-soft bg
- **Speaker badge (guest):** cyan text, cyan-soft bg
- **Count badge:** tertiary text, base bg, border

### Button — Primary

```
Background: linear-gradient(135deg, accent, #7c3aed)
Text: white
Font: body-sm, weight 700
Padding: 10px 20px
Border-radius: radius-md (10px)
Shadow: 0 2px 8px rgba(80,70,229,0.3)
Hover: darken gradient slightly
```

### Button — Secondary

```
Background: surface
Text: text-primary or text-secondary
Border: 1px solid border-default
Font: body-sm, weight 600
Padding: 10px 16px
Border-radius: radius-md (10px)
Shadow: shadow-sm
Hover: bg-surface-hover
```

### Button — Danger

```
Background: surface
Text: red
Border: 1px solid border-default
Font: body-sm, weight 600
Padding: 10px 16px
Border-radius: radius-md (10px)
Hover: red-soft bg
```

### Card

```
Background: surface
Border: 1px solid border-default
Border-radius: radius-2xl (14px)
Shadow: shadow-sm
Padding: 16-18px
Hover: shadow-md (for interactive cards)
```

### Input Field

```
Background: surface
Border: 1px solid border-default
Border-radius: radius-2xl (14px)
Padding: 6px container, inner input 10px 0
Font: body-lg (15px)
Placeholder color: text-tertiary
Focus: border-active, no shadow
```

### Status Dot

```
Width/height: 7px
Border-radius: full
Colors: green (approved), amber (review), red (rejected), tertiary (draft)
```

### Sidebar Navigation Item

```
Padding: 10px 16px
Margin: 0 10px
Border-radius: radius-lg (10px)
Active: accent-soft bg, accent text, inset shadow accent at 14%
Completed: text-primary, green icon
Inactive: text-secondary
Icon container: 34px square, radius 9px, themed bg + border
```

### Tab Bar

```
Border-bottom: 1px solid border-default
Item padding: 14px 20px
Active: accent-text color, 2px solid accent bottom border
Inactive: text-secondary color, transparent bottom border
Font: body-sm, weight 600
Count badge: accent bg/text (active) or base bg/tertiary text (inactive)
```

---

## Icon System

Use Lucide React icons (lucide-react package). 18px default size, 1.8 stroke width. 16px for inline/badge icons.

Key icons and their usage:
- Upload (ingest), Link (URL input), Video (video upload), FileText (PDF/article)
- Scissors (clips), Type (text outputs), Calendar (schedule), Check (approve)
- Play (video preview), Users (speakers), Sparkles (AI features)
- Settings (gear), Zap (processing), Clock (timestamps)
- Platform icons: custom or use brand-appropriate Lucide alternatives

---

## Layout

### App Shell
- Top bar: 56px height, sticky, blur backdrop, surface bg
- Sidebar: 228px width, fixed, surface bg, border-right
- Main content: flex-1, base bg, overflow-auto

### Review Layout (3-panel)
- Left list panel: 420px width, surface bg, border-right, scrollable
- Right detail panel: flex-1, base bg, scrollable, 28px padding

### Responsive Breakpoints
- Desktop (primary): ≥1024px — full 3-panel layout
- Tablet: 768-1023px — collapse sidebar to icons
- Mobile: <768px — ingest + processing only, "continue on desktop" for review

---

## Animation

Keep animations minimal and purposeful:
- **Page transitions:** none (instant route changes)
- **List item hover:** 0.12s ease background color
- **Card hover:** 0.15s ease box-shadow + transform (translateY -2px)
- **Button hover:** 0.2s ease background/shadow
- **Processing pulse:** 2s ease-in-out infinite scale(1) → scale(1.08)
- **Status transitions:** 0.3s ease color change
- **Progress bar:** 0.3s ease width

No spring animations, no page-level transitions, no skeleton loaders that animate indefinitely.
