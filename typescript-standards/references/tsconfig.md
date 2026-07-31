# tsconfig

Compiler configuration is the foundation — most type-safety wins come from
turning the right flags on. Lead with these defaults; see
[org-conventions](org-conventions.md) for where the Multiverse codebase
currently sits and what to migrate.

Four questions get you 95% of the way — *are you transpiling with `tsc`?
building a library? in a monorepo? does the code run in the DOM?*

## Base options — every project

```jsonc
{
  "compilerOptions": {
    "esModuleInterop": true,        // smooth CommonJS <-> ESM interop
    "skipLibCheck": true,           // skip type-checking .d.ts — big perf win
    "target": "es2022",             // stable modern target
    "allowJs": true,
    "resolveJsonModule": true,
    "moduleDetection": "force",     // every file is a module — no global leaks
    "isolatedModules": true,        // forbid features unsafe under single-file transpilers
    "verbatimModuleSyntax": true    // force explicit `import type` — predictable emit
  }
}
```

## Strictness — always on

```jsonc
{
  "strict": true,                     // the whole strict family — non-negotiable
  "noUncheckedIndexedAccess": true,   // arr[i] / obj[key] become T | undefined
  "noImplicitOverride": true,         // makes `override` meaningful in classes
  "exactOptionalPropertyTypes": true, // `x?: T` stops silently accepting `undefined`
  "erasableSyntaxOnly": true          // compiler-level ban on enums + namespaces (TS 5.8+)
}
```

`noUncheckedIndexedAccess` is the standout pick: without it, `arr[i]` is typed
`T` even when the index is out of bounds, which is a lie. With it, indexing
returns `T | undefined` and you must handle the gap. Expect it to surface real
latent bugs when first enabled.

The last two encode rules this skill already states, at the compiler level:

- `exactOptionalPropertyTypes` makes `x?: T` mean *absent*, not `T | undefined`,
  so the [type-design](type-design.md) rule "use `x: T | undefined` when a value
  must be supplied" is enforced by `tsc`, not just convention.
- `erasableSyntaxOnly` rejects any construct that emits runtime code (enums,
  `namespace`, parameter properties) — the compiler-level twin of the ESLint
  enum ban. Requires TS 5.8+.

Both are **aspirational**: no org repo sets them today (see the Multiverse note
below). They are stricter than current reality on purpose — turning them on is
part of migrating *toward* the standard, not a description of where the org is.

## Module setup — pick the variant

**Transpiling with `tsc` (Node):**

```jsonc
{ "module": "NodeNext", "outDir": "dist" }
```

Add for a **library**: `"declaration": true`, `"sourceMap": true`.
Add for a **monorepo** package: `"composite": true`, `"declarationMap": true`.

**Not transpiling with `tsc` (bundler / type-check only):**

```jsonc
{ "module": "preserve", "noEmit": true }
```

`module: "preserve"` implies `moduleResolution: "bundler"` and supersedes the
older `"ESNext"` + `"moduleResolution": "Bundler"` pairing. Pin whichever
matches the installed TS version.

## DOM vs non-DOM (`lib`)

- Browser: `"lib": ["es2022", "dom", "dom.iterable"]`
- Node / no DOM: `"lib": ["es2022"]`

## Multiverse note

The org's backend default (the `tscaffold` lineage) is `target: ES2022`,
`module: ESNext`, `moduleResolution: bundler`, `isolatedModules`,
`moduleDetection: force`, ESM — closest to the bundler variant above (not
`NodeNext`). `strict` is universal and travels with `noUnusedLocals`,
`noUnusedParameters`, `noFallthroughCasesInSwitch`. But:

- **`noUncheckedIndexedAccess` is only on in the T3/Next lineage** (~4 repos);
  the backends omit it. Recommend enabling it — highest-value upgrade.
- **`noImplicitOverride` / `verbatimModuleSyntax` are rare** — the org uses the
  `consistent-type-imports` lint rule instead of the latter.
- **There is no shared `@multiverse-io/tsconfig`** — config is copy-pasted or
  shared per-monorepo, so expect drift.

See [org-conventions](org-conventions.md).

## Review notes

- A repo without `strict` is a high-severity finding — almost everything else
  in this skill assumes it.
- `noUncheckedIndexedAccess` and `noImplicitOverride` are frequently missing
  even in otherwise-strict repos; flag as medium.
- Re-verify exact flag behaviour against the project's installed TS version —
  TypeScript evolves and defaults shift between releases.

Source: [TSConfig Cheat Sheet](https://www.totaltypescript.com/tsconfig-cheat-sheet) (updated 2024-04-23).
