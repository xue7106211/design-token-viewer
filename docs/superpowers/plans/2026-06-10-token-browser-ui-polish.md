# Token Browser UI Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Grid/List feel like a professional design asset browser with clearer token previews, alias/mode readability, and lightweight interaction feedback.

**Architecture:** Keep data parsing, Zustand state, API, and edit flows unchanged. Limit changes to browser-facing React components and small presentational helpers inside existing component files.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, lucide-react.

---

### Task 1: Grid Asset Cards

**Files:**
- Modify: `src/components/features/token-card.tsx`
- Modify: `src/components/features/token-grid.tsx`

- [ ] Add compact type badge, alias target hint, and mode summary to TokenCard.
- [ ] Increase visual preview hierarchy for COLOR and create clear previews for NUMBER, STRING, BOOLEAN.
- [ ] Add restrained hover, selected, and active press feedback.
- [ ] Tighten TokenGrid group headers and responsive card sizing.

### Task 2: List Asset Table

**Files:**
- Modify: `src/components/features/token-list.tsx`

- [ ] Preserve existing sorting, selection, context menu, drag, and resize behavior.
- [ ] Add clearer type/value/alias visual treatment without changing row data flow.
- [ ] Strengthen selected and hover states for fast scanning.

### Task 3: Inspector Resize Feedback

**Files:**
- Modify: `src/components/features/token-inspector.tsx`

- [ ] Highlight resize rail while dragging.
- [ ] Keep feedback lightweight and avoid changing panel persistence.

### Task 4: Verification

**Files:**
- Run: `npm run lint`
- Run: `npm run build`

- [ ] Fix only issues introduced by these UI changes.
- [ ] Do not modify the existing unrelated `src/types/token.ts` working tree change.
