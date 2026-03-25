# DESIGN_SYSTEM.md — v2 ADDENDUM (March 2026, UPDATED)

> **This addendum is superseded by DESIGN-SYSTEM-v2.md for all NEW component work.**
> The patterns below remain valid for existing components that haven't been migrated yet.
> When rebuilding a component, follow DESIGN-SYSTEM-v2.md instead.

---

## Migration Status

The UI is being rebuilt from scratch with a new design system. See `DESIGN-SYSTEM-v2.md` for the complete specification including new color tokens, typography (Inter + Geist Mono), shadcn/ui components, and page layouts.

**Old palette (being retired):** #5046e5, #7c3aed, #f6f5f2, #e4e2dd, #6b6960, #a09e96, #1a1a1a
**New palette:** See DESIGN-SYSTEM-v2.md color system (electric indigo #6366F1 accent, slate surfaces)

### What to do when touching a file:
1. If the file is being **rebuilt** → follow DESIGN-SYSTEM-v2.md exclusively
2. If the file is being **patched** (bug fix, small change) → keep existing styles, don't mix systems
3. If unsure → ask. Don't create a Frankenstein mix of old and new tokens.

---

## Still-Valid Patterns (for unmigrated components)

The following interaction patterns from the original addendum remain correct regardless of visual styling:

### Toast Notifications
- Position: fixed bottom-center, 24px from bottom
- Stack: up to 3, newest on top
- Auto-dismiss: 4s success/info, 6s undo, never for error
- Usage: `const { toast } = useToast();`

### Confirmation Dialogs
- Required for ALL destructive actions (delete, cancel)
- Red button for destructive, gray for cancel
- Cancel auto-focused (safe option)

### Dropdown Menus
- Trigger: three-dot icon button
- Close on: click outside, click item, Escape
- Destructive items: red text

### Empty States
- Every list view needs one
- Illustration/icon + explanatory text + primary CTA

### Interaction Feedback Rules
- Every action gets visual feedback within 100ms
- No silent failures — toast on every error
- Loading states: button spinner (async), skeleton (page), disabled state

### Processing Progress
- Step-by-step stepper with elapsed/estimated time
- Substep labels ("Generating LinkedIn posts...")
- "Navigate away" message after 5 seconds
- Toast when background job completes

### Keyboard Shortcuts (review queue)
- A: Approve, E: Edit, R: Reject, →: Next item
- D: Delete (with confirmation), ?: Show help overlay
- Cmd+Z: Undo (within window)

---

## Responsive Breakpoints (unchanged)

```
Mobile:  < 640px  → single column, stacked
Tablet:  640-1024px → sidebar collapsed to icons
Desktop: > 1024px → full sidebar + content
```
