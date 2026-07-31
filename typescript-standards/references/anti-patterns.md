# Anti-patterns — bad → good catalogue

Canonical ❌ bad → ✅ good pairings. The ⚙️ rules also have a runnable
fixture + fix in `evals/review-fixtures/` that `check.mjs` lints, so the config
can't drift from this catalogue.

- ⚙️ **in the ESLint config** — enforced wherever the repo runs ESLint
  (editor/CI) and surfaced by the opt-in session-start injection.
- 👁 **review-only** — type-aware/semantic; caught by `/typescript-standards:review`.

In review, classify each finding High (unsoundness) / Medium (drift) / Low
(polish); rationale is in the linked topic docs.

---

## ⚙️ In the ESLint config

### `any` → `unknown` + a type guard (or a schema)

Avoid `any` — it disables type-checking and spreads. We don't take the common
exemptions (including the test-file one). For an uncertain value use `unknown` and narrow;
the only escape is a localized `// eslint-disable` in the rare
generic-implementation case the compiler can't express.
([type-design](type-design.md), [runtime-validation](runtime-validation.md))

```ts
// ❌
function handle(x: any) { return x.amount * 2; }
const data = JSON.parse(raw) as Config;

// ✅ — narrow unknown with a type guard, or parse with a schema
function isConfig(x: unknown): x is Config {
  return typeof x === "object" && x !== null && "version" in x;
}
const parsed: unknown = JSON.parse(raw);
if (isConfig(parsed)) use(parsed);
```

### `as` assertions → narrow or validate (`as const` is fine)

`as` lies to the compiler — compile-time only, no runtime check. `as unknown as X`
is the worst. `as const` is the safe exception (it narrows) — and it's the
sanctioned replacement for `enum` (the `as const` object + derived union, below).
([type-design](type-design.md))

```ts
const config = JSON.parse(raw) as Config;   // ❌
if (isConfig(parsed)) use(parsed);           // ✅ narrowed
const ROUTES = ["/", "/users"] as const;     // ✅ as const is fine
```

The one sanctioned `as` is a brand/validation constructor (where an assertion is
unavoidable) — confine it to a single function with a localized
`// eslint-disable-next-line @typescript-eslint/consistent-type-assertions`.
Prefer zod's `.brand()` so even that isn't needed ([type-design](type-design.md)).

### `enum` → `as const` object + derived union

Enums emit runtime code and are nominally typed; numeric ones leak reverse
mappings. ([type-design](type-design.md))

```ts
export enum OrderStatus { Pending, Shipped, Delivered }   // ❌

export const OrderStatus = { Pending: "pending", Shipped: "shipped", Delivered: "delivered" } as const;  // ✅
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
```

The `(typeof Obj)[keyof typeof Obj]` derivation is the standard handbook pattern
([typeof](https://www.typescriptlang.org/docs/handbook/2/typeof-types.html),
[indexed access](https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html)).

### Scattered `process.env` → read it once in a config module

`process.env` values are `string | undefined`. Read them in **one** config/env
module — guard or validate there (a schema for shape/coercion, or a presence
guard) — and import the typed value everywhere else, rather than reaching for
`process.env` across the codebase. That single read is the one sanctioned spot;
the lint flags it elsewhere. ([runtime-validation](runtime-validation.md))

```ts
const port = Number(process.env.PORT);                 // ❌ scattered, and NaN if unset/garbage

// ✅ config.ts — process.env read once, validated (not just coerced), typed value exported
// eslint-disable-next-line no-restricted-properties -- sanctioned single read
const rawPort = process.env.PORT ?? "3000";
if (!rawPort) throw new Error("PORT must not be empty");
const port = Number(rawPort);
if (!Number.isInteger(port)) throw new Error(`invalid PORT: ${rawPort}`);
export const config = { port };
// elsewhere: import { config } from "./config";
// (for many vars, a schema — z.coerce.number() etc. — validates + coerces in one step)
```

### `@ts-ignore` → `@ts-expect-error` (with a reason)

`@ts-ignore` suppresses forever; `@ts-expect-error` errors once the problem is
fixed, so it can't rot.

```ts
// @ts-ignore                                        // ❌
// @ts-expect-error – upstream types are wrong, see LIB-123   // ✅
foo.bar();
```

### Non-null `!` → narrow

Same risk as `as`, and one character so it's easy to miss.

```ts
const name = user!.name;                  // ❌
if (!user) return; const name = user.name; // ✅ narrowed
```

### Mutation → immutable update

Build new values; never reassign or mutate a parameter or shared state. Backs
the org's strong immutability preference. ([functions-generics](functions-generics.md))

```ts
function deactivate(user: User): User {
  user.active = false; return user;          // ❌ mutates the caller's object
}
function deactivate(user: User): User {
  return { ...user, active: false };         // ✅ returns a new object
}
```

The rule targets **caller-owned** data — don't reassign or mutate a parameter or
shared state. In-place mutation of a *local* value you own is fine (and avoids
needless copying).

Supporting habits: `const` over `let`, `readonly` props / `ReadonlyArray<T>`,
`as const`. Need a genuine deep copy? Prefer the built-in `structuredClone()`
over `lodash.cloneDeep` — but default to **structural sharing** (spread the path
you change), not cloning the whole tree. Where the repo runs type-aware lint,
enable `@typescript-eslint/prefer-readonly` to catch class fields that are never
reassigned (it needs type info, so it lives in the repo's full lint, not this
syntax-only config).

### Return early — guard clauses, not nested `if`/`else`

Handle edge cases up front and `return`, leaving the happy path flat and
unindented. No `else` after a `return`; avoid deep nesting.
([functions-generics](functions-generics.md))

```ts
// ❌ nested if/else, else-after-return
function classify(n: number): string {
  if (n > 0) { return "positive"; }
  else { if (n < 0) { return "negative"; } else { return "zero"; } }
}

// ✅ flat guard clauses
function classify(n: number): string {
  if (n > 0) return "positive";
  if (n < 0) return "negative";
  return "zero";
}
```

---

## 👁 Review-only

### Error handling: throw, don't wrap in `Result`

Use standard throw/catch with typed `Error`s; catch as `unknown` and narrow;
never throw a non-`Error`. `Result`/`Either` types are a legitimate alternative
(they put failure in the signature), but **this skill standardises on throw/catch
for consistency and readability** — don't introduce Result wrappers in new code.
([error-handling](error-handling.md))

```ts
function findUser(id: string): Result<User, NotFoundError> { … }  // ❌ wrapper
function findUser(id: string): User {                             // ✅ throw
  const u = db.get(id);
  if (!u) throw new NotFoundError(id);
  return u;
}
```

### Non-exhaustive `switch` → `assertNever`

Make the `default` assign to `never`, so adding a variant fails the build.
([functions-generics](functions-generics.md))

```ts
default: return 0;              // ❌ silently swallows new variants
default: return assertNever(s); // ✅ compile error if a variant is added
```

### `||` for defaults → `??`

`||` falls through on every falsy value (`0`, `''`, `false`), so a valid `0`
gets replaced. `??` only falls through on `null`/`undefined`.

```ts
return input.size || 20;   // ❌
return input.size ?? 20;   // ✅
```

### `as any` test mocks → reusable typed factory

Don't cast a partial object; build a typed factory with overrides, kept in a
shared test-support module. ([testing](testing.md))

```ts
const user = { id: "1" } as any;                                   // ❌
const buildUser = (o: Partial<User> = {}): User => ({ id: "1", name: "Test", email: "t@e.com", ...o }); // ✅
```

### Logging the payload → log an id only

Every log line carries an id for correlation, never the payload/PII.
([error-handling](error-handling.md))

```ts
logger.info("order received", order);              // ❌ leaks PII
logger.info("order received", { orderId: order.id }); // ✅
```

### Hand-typed ORM shapes / `as` on results → schema-derived types

Derive from the ORM schema; let the ORM type the result. ([data-access](data-access.md))

```ts
type User = { id: string; name: string };          // ❌ duplicates the table
return rows[0] as User;                             // ❌ as on a typed result

type User = typeof usersTable.$inferSelect;         // ✅ derived
return db.query.usersTable.findFirst({ where: eq(usersTable.id, id) }); // ✅ ORM-typed
```

### Untyped / `any` handlers → the library's generic contract

Type a handler from the library's generic, not by hand. ([functions-generics](functions-generics.md))

```ts
export const handle = async (event: any) => event.id;                       // ❌
export const handle: EventHandler<"entity.changelog", "v1"> = async (event) => ACK_MESSAGE; // ✅
```

### Vague function names + comments → self-documenting names

Prefer an exhaustive name over a short one propped up by a comment.
([functions-generics](functions-generics.md))

```ts
// Returns active users from the last 30 days
function get(users: User[], now: Date): User[] { … }     // ❌
function getRecentlyActiveUsers(users: User[], now: Date): User[] { … } // ✅
```

### Many positional args → RORO (receive an object, return an object)

For more than one or two parameters (or any optional ones), take a single
options object and return an object — named args, optional-friendly,
order-independent, and extensible without breaking callers.
([functions-generics](functions-generics.md))

```ts
createUser("Jo", "jo@x.com", true);                 // ❌ which boolean?
createUser({ name: "Jo", email: "jo@x.com", isAdmin: true }); // ✅ named, extensible
```

---

## Other type smells (👁, less common)

| Anti-pattern | Fix |
|--------------|-----|
| **bag-of-optionals** (`{ data?; error? }`) | discriminated union — make impossible states unrepresentable ([type-design](type-design.md)) |
| **optional `?`** where a value must be supplied | `x: T \| undefined` — force the decision at the call site |
| **`Function` type** | an explicit signature `(item: T) => number`; lint `no-unsafe-function-type` |
| **`{}` / `object`** | a specific shape or `Record<PropertyKey, never>`; lint `no-empty-object-type` |
| **wrapper types** `Number`/`String`/`Boolean`/`Object` | the lowercase primitives |
| **optional callback params** | callbacks are always supplied — don't mark their params `?` |
| **`: any` callback return** | type ignored-return callbacks `() => void` |

---

Sources: [`any` Considered Harmful](https://www.totaltypescript.com/any-considered-harmful), [Don't use the `Function` type](https://www.totaltypescript.com/dont-use-function-keyword-in-typescript), [The Empty Object Type](https://www.totaltypescript.com/the-empty-object-type-in-typescript), [Handbook Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html).
