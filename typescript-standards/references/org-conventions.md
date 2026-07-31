# What the Multiverse codebase actually does

From a scan of the org's TS repos — chiefly the **`tscaffold`** starter
(strongest signal of intended conventions) and the **`utils-ts`** shared library,
plus ~20 repos (`client-xp`, `notifications`, `checker`, `aurora`, `rapids`,
`sessions-service`, …).

> This file is the **baseline to migrate *from***, not the target. The skill's
> standard is deliberately stricter (see README); where this records "the org
> does X", read it as today's reality to move past, except for the canonical
> sources below, which the skill defers to and must not contradict.

## Canonical org sources

There is **no prose TS style guide** in the org — TS is governed by a golden-path
template, an executable lint config, and cross-cutting PR rules. This skill is
the missing language layer; it defers to these and must not contradict them:

- **`tscaffold`** — golden-path fullstack starter, ratified template-first by
  [ADR-0005](https://github.com/Multiverse-io/global-tech-docs/blob/main/adrs/0005-tscaffold-template-first.md);
  its `AGENTS.md` is the de-facto conventions source.
- **`@multiverse-io/eslint`** (from `utils-ts`) — the only *executable* TS rules
  in the org. Where it and this skill disagree, lint wins for what CI enforces.
- **Org-wide [BugBot rules](https://github.com/Multiverse-io/global-tech-docs/blob/main/docs/bugbot/org-wide-rules.md)** — enforced every PR, but
  cross-language (security, migrations, hygiene), *not* TS style — complementary.
- **[Tech Radar](https://github.com/Multiverse-io/global-tech-docs/blob/main/docs/tech-radar.md)** — rates the adopted stack (tRPC, Zod, Drizzle, Vitest, Turborepo, Yarn, Hono, Next.js); prefer Radar-adopted tech.
- **[removing-pii-from-code.md](https://github.com/Multiverse-io/global-tech-docs/blob/main/docs/removing-pii-from-code.md)** — backs the error-logging rule ([error-handling](error-handling.md)).

(The repo named `coding-standards` is **Elixir-only** — not a TS source.)

## Lineages — read a repo's lineage before applying advice

- **`tscaffold` lineage** (newest backends: `rapids`, `growth_service`, `aurora`):
  Yarn 4 + Turborepo + tRPC + Drizzle + Vitest. The forward direction; canonical.
- **T3 / Next.js** (`client-xp`, `checker`, `account-hub`): Prisma,
  `@t3-oss/env-nextjs`, sometimes legacy Yarn 1.
- **Outliers**: `dpt-platform`/`skill-scan` (Bun), `stardust` (CJS lib),
  `backstage` (upstream Jest).

## Canonical conventions

| Area | Convention |
|------|------------|
| **Strictness** | `strict: true` + `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch` (universal). |
| **Module (backend)** | `target ES2022`, `module ESNext`, `moduleResolution bundler`, `isolatedModules`, `moduleDetection force`, ESM. |
| **Package manager** | Yarn 4 for backends/monorepos; Changesets for releases. |
| **Node** | Pinned via `.tool-versions` (not `.nvmrc`); Node 22.16+/24.x. |
| **Runner / build** | `tsx` for dev/scripts (never `ts-node`); `tsup` for builds. |
| **Lint / format** | ESLint flat config extending `@multiverse-io/eslint/base`; Prettier (single quotes, `es5` trailing commas, `@multiverse-io/*` import group). No Biome. |
| **Validation** | **Zod** everywhere (env, tRPC inputs, decoding); schema + `z.infer` is the source of truth. |
| **Tests** | **Vitest** (no Jest). `*.test.ts` / `*.integration.test.ts`; isolated Postgres via `@multiverse-io/vitest-utils`. |
| **Type style** | `type` by default, `interface` for service/repo contracts + React props. `as const` unions over `enum`; `unknown` over `any`; discriminated unions. |
| **Errors** | Standard throw/catch; `TRPCError` with a `code` at boundaries; catch `unknown` + narrow; centralise error classes; log `error.message` not the raw error (PII). (Some repos use `ts-results-es`; this skill prefers plain throw/catch.) |
| **Architecture** | Layered backend (Entrypoints → tRPC → Services → Repositories → Drizzle), no layer-skipping; factory-function DI, no container/decorators. |
| **Data** | **Drizzle** + postgres.js + drizzle-kit (Prisma is legacy). tRPC over Express (`superjson`); **Hono** emerging. |
| **UI** | `@multiverse-io/stardust` is mandatory (custom ESLint `prefer-stardust-*`). |
| **Standards docs** | `AGENTS.md` canonical (`CLAUDE.md` = `@AGENTS.md`); repo deltas in `.cursor/BUGBOT.md`; org rules in Cursor Team Rules. |

Evidence throughout: `tscaffold` (`apps/backend/tsconfig.json`, `AGENTS.md`,
`eslint.config.js`), `utils-ts`, and the scaffold-lineage backends.

## Where the org is behind best practice (flag pragmatically)

1. **`noUncheckedIndexedAccess`** — only on in the T3 lineage (~4 repos); the
   backends omit it. Highest-value strictness upgrade ([tsconfig](tsconfig.md)).
2. **`any` isn't lint-banned** — `@multiverse-io/eslint` sets `no-explicit-any: 'off'`,
   so the org's lint won't catch it; this plugin's config does ([anti-patterns](anti-patterns.md)).
3. **No shared `@multiverse-io/tsconfig`** — config is copy-pasted per monorepo;
   expect drift.
4. **`noImplicitOverride` / `verbatimModuleSyntax` rare** — the org uses
   `consistent-type-imports` instead; new repos should prefer the compiler flag.

## House specifics

- **Standard error handling, not Result types** — no `ts-results-es` / `neverthrow`
  wrappers ([error-handling](error-handling.md)).
- **Reach for shared packages**: `@multiverse-io/vitest-utils`, `@multiverse-io/eslint`,
  the generated `*-service-ts-client` packages.
- **Read `process.env` in one validated config module**, not scattered — the
  T3/Next.js lineage routes it through `@t3-oss/env-nextjs` (Zod).
- **PII**: log `error.message`, not the raw error/cause chain.
