---
name: a11y-audit
description: "Audit TSX files for WCAG 2.1 AA accessibility compliance. Reports findings by severity with WCAG references and code fixes. Use when the user says 'a11y audit', 'accessibility check', 'check accessibility', 'WCAG audit', 'is this accessible', 'audit for screen readers', or asks about accessibility of changed or specific files."
user-invocable: true
---

# Accessibility Audit

Audit TSX files for WCAG 2.1 AA compliance. Reports findings by severity with WCAG references and code fixes.

## Process

### 1. Identify Target Files

If the user specified files or a directory, use those. Otherwise, run these commands in order, stopping at the first that returns results:

1. `git diff --cached --name-only --diff-filter=ACMR -- '*.tsx'` (staged files)
2. `git diff --name-only --diff-filter=ACMR HEAD -- '*.tsx'` (unstaged changes)
3. If both empty, ask the user which files or directory to audit

Report the file list before proceeding. If more than 15 files, confirm with the user before continuing.

### 2. Load Project Standards

Check for `A11Y_STANDARDS.md` at the project root or the projects steering documentation. If it exists, read it — those are the authoritative rules for this project and supplement the checklist below. If it doesn't exist, proceed with the built-in checklist only flagging you cannot find the wider set of rules "CANNOT LOCATE A11Y_STANDARDS.md, USING BUILT IN CHECKLIST ONLY".

### 3. Audit Each File

Read each TSX file in full. For every file, check against the checklist below. Note the specific line numbers of issues.

**Be aware of component library primitives** — libraries like `@base-ui/react`, `@radix-ui`, `@headlessui`, and `shadcn/ui` provide built-in ARIA attributes, focus management, and keyboard navigation. Do not flag issues that the primitive already handles. If unsure, read the component's import to confirm what the library provides.

#### Checklist

**Semantic Structure** — WCAG 1.3.1 Info and Relationships (A)

- Uses semantic HTML (`<main>`, `<nav>`, `<header>`, `<section>`, `<article>`, `<aside>`) over generic `<div>` for landmark content
- Headings follow hierarchy — no skipped levels (h1 → h3)
- Lists use `<ul>`/`<ol>`/`<li>` for list content
- `<section>` elements have a heading or `aria-label`/`aria-labelledby`

**Keyboard Accessibility** — WCAG 2.1.1 Keyboard (A), 2.4.3 Focus Order (A)

- All interactive elements reachable via Tab (natively focusable or `tabIndex={0}`)
- Custom controls (dropdowns, menus, tabs) support Arrow keys, Escape, Enter/Space per WAI-ARIA APG
- No positive `tabIndex` values
- Focus managed on route changes and modal open/close
- Modals and dropdowns trap focus; focus returns to trigger on close

**Images and Icons** — WCAG 1.1.1 Non-text Content (A)

- Decorative images/SVGs have `aria-hidden="true"` and/or `alt=""`
- Informational images have descriptive `alt` text
- Icon-only buttons have `aria-label` or visually hidden text (`sr-only`)

**Forms** — WCAG 1.3.1 (A), 3.3.2 Labels or Instructions (A)

- Every `<input>`, `<textarea>`, `<select>` has an associated `<label>` via `htmlFor`/`id`
- Error messages linked to inputs via `aria-describedby`
- Required fields use `required` attribute (not just visual indicators)
- Help/description text linked via `aria-describedby`

**ARIA Patterns** — WCAG 4.1.2 Name, Role, Value (A)

- Tabs use `role="tablist"`, `role="tab"`, `role="tabpanel"`, `aria-selected`
- Toggle controls use `aria-expanded`
- No ARIA misuse (e.g., `role="button"` on an `<a>` that navigates)
- Loading containers use `aria-busy="true"`
- Disabled elements use the `disabled` attribute (not just visual styling)

**Dynamic Content** — WCAG 4.1.3 Status Messages (AA)

- Error messages wrapped in `role="alert"` or use `aria-live="assertive"`
- Status updates (loading tips, progress) use `aria-live="polite"`
- New dynamic content (chat messages, notifications) announced via `aria-live="polite"`
- Form validation errors linked to fields via `aria-describedby`

**Focus Management** — WCAG 2.4.7 Focus Visible (AA)

- Focus rings visible on all interactive elements (`focus-visible:` or `focus:ring-*` classes)
- Focus not trapped in non-modal contexts; properly trapped in modals
- Auto-focus used appropriately (primary action only, not disorienting)

**Color and Contrast** — WCAG 1.4.3 Contrast Minimum (AA), 1.4.1 Use of Color (A)

- Text meets 4.5:1 contrast ratio against its background (check brand token pairings)
- Information not conveyed by color alone (always paired with text, icons, or patterns)
- Interactive states distinguishable without color reliance

**Motion** — WCAG 2.3.1 Three Flashes (A)

- CSS animations respect `prefers-reduced-motion` media query
- No content flashes more than 3 times per second
- JavaScript animations check `matchMedia('(prefers-reduced-motion: reduce)')`

### 4. Report Findings

For each issue found, output in this format:

```
### [SEVERITY] path/to/component.tsx:LINE

**WCAG:** 1.3.1 Info and Relationships (Level A)
**Issue:** Tab buttons use plain `<button>` without `role="tab"` or `aria-selected`
**Fix:**
```tsx
<button
  role="tab"
  aria-selected={activeTab === id}
  onClick={() => setActiveTab(id)}
>
  {label}
</button>
```
```

Group findings by file, then by severity within each file.

### Severity Definitions

- **Critical** — Blocks access for users with disabilities. Must fix before merging.
  - Missing keyboard access to interactive elements
  - No labels on form controls
  - Missing alt text on informational images
  - No focus management in modals/dialogs
  - Interactive elements not reachable via keyboard

- **Important** — Significantly degrades experience. Should fix before merging.
  - Missing `aria-live` regions for dynamic content
  - No skip-to-content link (when layout files in scope)
  - Inconsistent heading hierarchy
  - No `prefers-reduced-motion` support for animations
  - Form errors not linked via `aria-describedby`
  - Missing tab/tablist ARIA roles on tab-like UI
  - Charts without text alternatives

- **Minor** — Best-practice improvements. Fix when convenient.
  - Redundant ARIA attributes
  - Suboptimal semantic element choice (`<div>` where `<section>` would be better)
  - Missing `aria-describedby` on help text that isn't critical
  - Decorative image handling could be cleaner

### 5. Summary

End with:

| Severity  | Count |
| --------- | ----- |
| Critical  | N     |
| Important | N     |
| Minor     | N     |

**Verdict:**

- **PASS** — 0 Critical and 0 Important findings. Ready to commit.
- **NEEDS WORK** — 0 Critical but Important findings exist. List them. Should fix before merging.
- **FAIL** — Critical findings. List them. Must fix before merging.

### 6. Remediation

If issues are found, ask: "Would you like me to fix the Critical and Important issues now?"

If yes, fix them file by file, re-reading each file before editing. After fixes, re-run the audit on the modified files to confirm resolution.

## Notes

- This audit is **file-scoped** — it checks changed files, not the full app
- Page-level concerns (heading hierarchy across layouts + pages, skip-link presence) are checked when layout files are in scope
- Color contrast is checked heuristically against known brand token pairings, not computed programmatically
- For a **full-app audit**, specify `src/` as the target directory when prompted
- This skill complements `eslint-plugin-jsx-a11y` — ESLint catches mechanical issues at lint time; this skill provides deeper contextual analysis
