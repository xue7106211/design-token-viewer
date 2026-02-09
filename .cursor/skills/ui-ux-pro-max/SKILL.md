---
name: ui-ux-pro-max
description: "Applies UI/UX design intelligence for web and mobile. Use when building or reviewing landing pages, dashboards, components, or design systems. Generates or applies design systems (pattern, style, colors, typography, effects), follows 67 UI styles, 96 palettes, 57 font pairings, 99 UX guidelines, and runs pre-delivery checklist. Supports React, Next.js, Vue, Svelte, Tailwind, shadcn/ui, SwiftUI, React Native, Flutter. Triggers on build, design, create, implement, review, fix, improve UI/UX."
---

# UI UX Pro Max – Design Intelligence

Design intelligence for professional UI/UX across web and mobile. Use when designing components or pages, choosing colors/typography, building landing pages or dashboards, or reviewing UX.

## When to Apply

- Designing new UI components or pages
- Choosing color palettes and typography
- Building landing pages, dashboards, or apps
- Reviewing code for UX and accessibility
- User asks to build, design, create, implement, review, fix, or improve UI/UX

## Workflow

### 1. Check for Design System Script (Optional)

If the project has UI UX Pro Max installed (e.g. after `uipro init --ai cursor`), run the design system generator first:

```bash
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "<product_type> <industry> <keywords>" --design-system -p "Project Name"
```

Example:

```bash
python3 .cursor/skills/ui-ux-pro-max/scripts/search.py "beauty spa wellness" --design-system -p "Serenity Spa"
```

If the script is not present, skip to **Step 2** and apply the design system manually.

### 2. Analyze Requirements

From the user request, identify:

- **Product type**: SaaS, e-commerce, portfolio, dashboard, landing page, healthcare, fintech, beauty, etc.
- **Style keywords**: minimal, professional, dark mode, glassmorphism, etc.
- **Industry** and **tech stack** (default: HTML + Tailwind).

### 3. Apply or Generate Design System

- **If script ran**: Use its output (pattern, style, colors, typography, effects, anti-patterns).
- **If no script**: Choose a coherent system:
  - **Pattern**: e.g. Hero-Centric, Conversion-Optimized, Feature-Rich, Social Proof.
  - **Style**: e.g. Soft UI, Glassmorphism, Minimalism, Bento Grid, Dark Mode (match product type).
  - **Colors**: Primary, secondary, CTA, background, text; industry-appropriate.
  - **Typography**: Heading + body pair (e.g. Google Fonts); match mood.
  - **Effects**: Transitions 150–300ms, hover states, shadows as needed.
  - **Anti-patterns**: Avoid generic AI purple/pink gradients, emoji icons, poor contrast, harsh motion.

### 4. Implement and Validate

- Implement UI using the chosen stack and design system.
- Before delivery, run through the **Pre-Delivery Checklist** below.

## Rule Priorities

| Priority | Category            | Focus |
|----------|---------------------|--------|
| 1        | Accessibility       | Contrast 4.5:1, focus, labels, alt, keyboard |
| 2        | Touch & Interaction | 44px targets, cursor-pointer, loading/error states |
| 3        | Performance         | Images, reduced-motion, no layout jump |
| 4        | Layout & Responsive | Viewport, 375/768/1024/1440px, z-index scale |
| 5        | Typography & Color  | Line height/length, font pairing |
| 6        | Animation           | 150–300ms, transform/opacity, loading states |
| 7        | Style               | No emoji icons; use SVG (Heroicons/Lucide) |

## Pre-Delivery Checklist

Before delivering UI code, verify:

**Visual**
- [ ] No emojis as icons (use SVG: Heroicons/Lucide)
- [ ] Hover states don’t cause layout shift
- [ ] Consistent icon set and sizing

**Interaction**
- [ ] All clickable elements have `cursor-pointer`
- [ ] Hover feedback (color/shadow/border)
- [ ] Transitions 150–300ms
- [ ] Visible focus states for keyboard

**Contrast & Mode**
- [ ] Text contrast ≥ 4.5:1 (light mode)
- [ ] Glass/transparent elements readable in light mode
- [ ] Borders visible in both modes if applicable

**Layout**
- [ ] Fixed/floating elements spaced from edges
- [ ] No content under fixed navbars
- [ ] Responsive at 375, 768, 1024, 1440px
- [ ] No horizontal scroll on mobile

**Accessibility**
- [ ] Images have alt text; form inputs have labels
- [ ] Color not the only indicator
- [ ] `prefers-reduced-motion` respected

## Common Rules (Do / Don’t)

| Area | Do | Don’t |
|------|----|-------|
| Icons | SVG (Heroicons, Lucide) | Emoji as icons |
| Cursor | `cursor-pointer` on clickable | Default cursor on buttons/cards |
| Hover | Color/opacity/shadow transitions | Scale that shifts layout |
| Transitions | 150–300ms | Instant or >500ms |
| Light text | e.g. `#0F172A` (slate-900) body | slate-400 for body |
| Navbar | Floating with spacing (e.g. top-4) | Glued to top-0 with no padding |

## Stacks

Default: **HTML + Tailwind**. Also: React, Next.js, Vue, Nuxt, Svelte, Astro, shadcn/ui, SwiftUI, React Native, Flutter, Jetpack Compose. Match implementation to stack (e.g. components, SSR, theming).

## Full Install (Optional)

For the full script, data (67 styles, 96 palettes, 57 font pairings, 100 reasoning rules), and persist (design-system/MASTER.md):

```bash
npm install -g uipro-cli
cd /path/to/project
uipro init --ai cursor
```

Requires Python 3.x for the search script. See [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill).
