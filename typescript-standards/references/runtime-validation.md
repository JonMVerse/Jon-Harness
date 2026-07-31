# Runtime validation at boundaries

TypeScript types are **erased at runtime**. Anything crossing a boundary into
your program — HTTP responses, request bodies, environment variables, queue
messages, parsed JSON, file contents — has a type you *assert*, not one the
compiler can check. Trust nothing at the boundary; validate it.
([Parse, don't validate](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/);
[TS types are erased](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html))

The org standard for this is **zod**, used universally — for env vars, tRPC
inputs, and API response decoding. `io-ts` and `class-validator` do not appear.
Treat the schema + `z.infer` as the source of truth for boundary types. In the
Next.js lineage, `process.env` / `NODE_ENV` is read in one place —
**`@t3-oss/env-nextjs`** (Zod under the hood) — and the typed values imported
elsewhere. See [org-conventions](org-conventions.md).

## Rules

| Rule | Why |
|------|-----|
| **Parse every external input with a schema** — never hand-write `as` casts for it. | A schema checks shape at runtime *and* narrows the compile-time type in one step. `as` does neither — it just silences the compiler. |
| **Derive the static type from the schema** with `z.infer`, never the reverse. | One declaration keeps the runtime check and the type from drifting apart. |
| **Use `.safeParse()` at boundaries you don't control.** | It returns a discriminated `{ success: true, data } \| { success: false, error }` you handle on the normal path, instead of throwing. |
| **Read `process.env` in one config module** — guard or validate at startup, import typed values elsewhere. | Env vars are an app boundary and always strings — read them once (fail fast, coerce there) rather than scattering `process.env` across the codebase. |

## Pattern

```ts
import { z } from "zod";

const Player = z.object({ username: z.string(), xp: z.number() });
type Player = z.infer<typeof Player>;          // single source of truth

const result = Player.safeParse(await res.json());
if (!result.success) return handleBadInput(result.error);
use(result.data);                              // typed as Player, validated
```

```ts
// Env at startup — fail fast, coerce strings:
const Env = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(["development", "test", "production"]),
});
export const env = Env.parse(process.env);     // throws loudly at boot if wrong
```

## Review notes

- An external input (`req.body`, `res.json()`, `process.env`, message payload)
  consumed via `as SomeType` with no runtime check → **high** severity.
- A schema present but the type hand-written separately instead of via
  `z.infer` → medium (they will drift).
- `.parse()` on an untrusted boundary where the throw isn't handled → medium
  (prefer `.safeParse()` or ensure the throw is caught).

Source: [zod.dev](https://zod.dev).
