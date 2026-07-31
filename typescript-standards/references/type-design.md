# Type design

How to model data so the type system does the work and impossible states are
unrepresentable.

## `type` vs `interface`

- **Default to `type`.** It is the more flexible tool — unions, mapped types,
  conditional types, template-literal types.
- **Use `interface` for object inheritance via `extends`** and for declaration
  merging; reach for `type` for everything else (unions, mapped, conditional).
  (`interface extends` is also marginally cheaper for the compiler than `&`
  intersections, but that rarely matters — decide on the features above.)
- Beware **declaration merging**: two same-named interfaces in one scope
  silently merge into one; a `type` errors on redeclaration. Keep
  `no-redeclare` on.

([TS handbook: type aliases vs interfaces](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces))

> **Multiverse note** — this matches the codebase: `export type` outnumbers
> `interface` 3–10× per repo. `interface` is reserved for service/repository
> contracts and React props. `as const` + union literals are heavily used and
> `enum` is rare. See [org-conventions](org-conventions.md).

## Prefer unions / `as const` over `enum`

Don't add new `enum`s. They break "TypeScript is just JavaScript with types":
they emit runtime code, are nominally (not structurally) typed, numeric
variants leak reverse mappings and accept any raw number, and `const enum`
has `isolatedModules`/bundling problems. If an enum is unavoidable, use a
**string enum only**.

```ts
// Instead of `enum AlbumType { CD, Vinyl, Digital }`:
const AlbumType = { CD: "cd", VINYL: "vinyl", DIGITAL: "digital" } as const;
type AlbumType = (typeof AlbumType)[keyof typeof AlbumType]; // "cd" | "vinyl" | "digital"
```

## `unknown`, never `any`

For a value whose type you don't know, use `unknown` and narrow it with a
**type guard** before use. `any` silently switches off type-checking; `unknown`
forces a check. We don't allow the common exemptions (including the test-file
one). The only escape is
a localized `// eslint-disable-next-line` in the rare generic-implementation
case where the compiler genuinely can't express the relation — never in app
code or at a boundary. See [anti-patterns](anti-patterns.md) and the type-guard
guidance in [functions-generics](functions-generics.md).

## Make impossible states unrepresentable

Model state as a **discriminated union**, not a bag of optionals. A bag of
optionals permits nonsense ("success but no data"); a tagged union lets each
state carry only its valid fields.

```ts
// Bag of optionals — allows impossible combinations:
// { isLoading: boolean; data?: User; error?: Error }

type State =
  | { status: "loading" }
  | { status: "success"; data: User }
  | { status: "error"; error: Error };
```

- Use optional `?` **sparingly**. When a value must be supplied but may be
  `undefined`, prefer `x: T | undefined` over `x?: T` — `?` lets callers
  silently omit the property, while `| undefined` forces a decision at the
  call site.

## Brand validated primitives

TypeScript is structural — any `string` is interchangeable with any other. To
demand a *validated* value (an email that has passed validation, a positive
int), brand it ([zod `.brand()`](https://zod.dev/api?id=branded-types)). Use
**zod's `.brand()`** so the brand is only applied to values
that actually passed validation — and so you don't need an `as` (which the
guardrail bans):

```ts
const Email = z.string().email().brand<"Email">();
type Email = z.infer<typeof Email>;          // string & z.BRAND<"Email">

const send = (to: Email) => { /* ... */ };
send(Email.parse(input));                    // validated + branded
// send("raw")                               // ✗ a plain string won't type-check
```

For a brand with no runtime validation (e.g. an opaque internal id), an
assertion is unavoidable — confine it to a single constructor with a localized
disable, the one sanctioned `as`:

```ts
// eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- brand constructor
const toUserId = (s: string): UserId => s as UserId;
```

## Derive types from values — single source of truth

You can derive a type from a value; never maintain a value and a parallel type
by hand (they drift).

| Tool | Use |
|------|-----|
| `as const` | Freeze a value, infer narrow literals (stops `"cd"` widening to `string`). |
| `typeof value`, `keyof typeof` | Lift a runtime value into the type world. |
| Indexed access — `T["prop"]`, `T[number]`, `T[keyof T]` | Extract a member type instead of re-declaring it. |
| Utility types — `Partial`, `Pick`, `Omit`, `Record`, `ReturnType`, `Parameters`, `Awaited`, `NonNullable`, `Exclude`, `Extract` | Keep derived types coupled to their source. |
| Template literal types | Constrain string shapes so typos fail at compile time. |

```ts
const MODES = ["dark", "light", "system"] as const;
type Mode = (typeof MODES)[number];               // "dark" | "light" | "system"

const fetchUser = async (id: string) => ({ id, name: "Jo" });
type User = Awaited<ReturnType<typeof fetchUser>>; // { id: string; name: string }
```

Quirk: a literal union with bare `string` collapses to `string`. To keep
autocomplete while allowing any string, use `"a" | "b" | (string & {})`.

## Review notes

- New `enum` → medium (suggest `as const` + derived union).
- `any` in type positions → high (suggest `unknown`).
- Bag-of-optionals where a discriminated union fits → medium.
- Hand-maintained type duplicating a runtime value → medium (derive it).
