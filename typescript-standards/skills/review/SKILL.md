---
name: review
description: Conventions to follow when writing or editing TypeScript at Multiverse, and an on-demand audit of a diff or file. Triggers on writing/reviewing `.ts`/`.tsx`, "typescript review", "check my types", `tsconfig`, generics, or runtime validation. NOT for formatting (Prettier/Biome) or React/Nest specifics beyond type safety.
---

# TypeScript Review

Multiverse TypeScript conventions, best-practice-forward: lead with modern
TypeScript; where the org's code diverges, flag it and point at the better
pattern; where the org has a strong house pattern, that's canonical.

Two modes — Claude picks by context, or the user invokes review:

- **Writing/editing TS** — follow the conventions in the references below
  without being asked.
- **`/typescript-standards:review`** — audit a diff or file and report; don't
  edit unless asked. Add **`--fix`** to also fix what's fixable and prove it
  against the build (see [Fixing](#fixing---fix)).

## Where to go

- **`tsconfig` / compiler** → [tsconfig](../../references/tsconfig.md)
- **Type design** (`type`/`interface`, unions, `unknown`, branding, derived types) → [type-design](../../references/type-design.md)
- **Functions & generics** (naming, early-return, RORO, mutation, exhaustiveness) → [functions-generics](../../references/functions-generics.md)
- **Runtime validation** (zod, env, I/O) → [runtime-validation](../../references/runtime-validation.md)
- **Data access / ORM types** → [data-access](../../references/data-access.md)
- **Testing** → [testing](../../references/testing.md)
- **Error handling & logging** → [error-handling](../../references/error-handling.md)
- **Bad → good catalogue** → [anti-patterns](../../references/anti-patterns.md)
- **What the codebase does** → [org-conventions](../../references/org-conventions.md)

## Reviewing

1. **Scope.** Default to the working diff (`git diff` / staged). If the user
   names a file or directory, use that. State what you reviewed.
2. **Audit against the [catalogue](../../references/anti-patterns.md)**, reading
   the topic reference for any construct in scope. Classify each finding:
   **High** (unsoundness), **Medium** (drift from convention), **Low** (polish).
3. **Report** `file:line` → the fix, citing the backing reference. Report every
   finding, ordered by the classification above — lead with **High** so what
   matters lands first, rather than dropping the **Low** ones to keep the list
   short.
4. **Don't edit — offer `--fix` instead.** Reviewing reports only. When it reports
   findings, close with a line like: *"If you'd like me to fix these, run
   `/typescript-standards:review --fix` and I'll apply the fixes and verify them
   against the build."* Omit the line when there are no findings, or when this is
   already a `--fix` run.

## Fixing (`--fix`)

Audit as above, then fix — but **the build is the contract: never leave typecheck
or build worse than you found it.** Most of these conventions are semantic
transforms with call-site ripple (`enum`→`as const`, dropping `as`/`!`, RORO,
ORM types), so a minimal token-deletion fix breaks the build. Make the *complete*
fix, verify it, escalate before reverting.

1. **Baseline first.** Record the repo's typecheck and build state before editing.
   Get commands from `package.json` scripts (`typecheck`/`type-check`, else
   `tsc --noEmit`; and `build`); pick the package manager from the lockfile
   (`pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn, else npm). If it's already red, note
   the failing set — you own only *new* breakage.
2. **Reuse the last review — don't re-run it.** If you already reviewed the same
   scope earlier this session (e.g. the user ran `/typescript-standards:review`
   then re-ran it with `--fix`), fix *those* findings directly. Only **audit and
   classify** (as in review mode) when there's no prior review of this scope, or
   the files in scope have actually changed since it ran — and then only over
   what changed.
3. **Fix at the level the convention requires**, not the minimal token edit — for
   *every* finding, apply the full fix the catalogue prescribes. The examples
   below set the bar: add the guard rather than just deleting `!`; narrow or
   validate rather than just dropping `as`; convert the `enum` **and** its call
   sites. Deleting the token alone is what breaks the build. Work in batches, High
   first; when a change touches a type or signature, update **every call site in
   the same batch** and re-run typecheck before the next.
4. **Verify**, in order: typecheck → build → the ESLint config over the changed
   files (`eslint --config <plugin-root>/eslint.config.mjs <files>`). All three
   green vs baseline.
5. **Escalate before reverting — but stop at a large refactor.** If a fix won't go
   green, try the fuller transform (widen the guard, thread the type further,
   restructure) before giving up. Treat it as a large refactor — **pause and check
   with the user first** — once it would touch >~20% of the files in scope, or any
   file outside scope (this catches ripple in one- or two-file reviews). Revert
   *just that change* only when even the complete fix can't pass, and flag it.
   Never settle for something that compiles but breaks the convention (`!`→`as`,
   re-widening to `any`).
6. **Report**: what was fixed (`file:line` → rule), what was reverted or deferred
   and why, and final typecheck / build / lint status vs baseline.
