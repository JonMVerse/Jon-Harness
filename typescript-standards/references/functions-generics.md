# Functions, generics & inference

## Keep functions small and single-purpose

A function should do one thing and read top-to-bottom. Extract a named helper
when a block would otherwise need a comment to explain it, when logic repeats, or
when one function juggles several concerns — small, composed functions are easier
to name, test, and reuse than one long one. Readability comes first.

## Name functions for what they do

A function name should say what the function does (or returns) — exhaustively
enough that the call site reads on its own. **Prefer a longer, self-documenting
name over a short name propped up by a comment** (the name drifts from the
comment, and call sites don't carry the comment with them). Name after the
return value or transformation (`parseOrder`, `toChangelogPayload`, `isExpired`).
Reserve comments for *why*, not *what*. Bad/good in [anti-patterns](anti-patterns.md).

## Let inference work; annotate at boundaries

- Let return types **infer** for internal functions — the inferred type is
  usually correct and tracks the implementation.
- **Annotate the return type at public/exported boundaries.** It pins the
  contract and stops an accidental `any` (or an over-wide type) leaking out of
  a module (declare return types on top-level module functions; JSX components
  excepted).
- Annotate **function inputs** — they are the contract callers depend on.

## Generics — only to relate types

Reach for a generic only when one type depends on another (the input type
drives the output type). If a function doesn't need that relationship, a
plain type or a union is simpler.

- **Never write a generic that doesn't use its type parameter.** A
  return-only / "phantom" generic is just a disguised `as` cast at the call
  site (official handbook).
- Represent a type parameter at the **lowest level** it needs to be — take the
  one field you need, not the whole object.
- Heuristic: *if you can't describe the type relationship in words, the code
  is probably too complex.*

## Function overloads — sparingly

Use overloads only when the **return type differs by input**. If the return
type is constant, a union parameter or a generic is simpler and less
error-prone.

## Narrowing

Narrow before you use. Built-in narrowing: `typeof`, `in`, `instanceof`,
truthiness, and discriminant checks on a tagged union.

- Write a **type predicate (`x is T`)** when the narrowing is reused — e.g. in
  `.filter` — so the narrowed type escapes the helper.
- Write an **assertion function (`asserts x is T`)** when you want to validate
  and throw, narrowing the rest of the scope.

```ts
const strings = ["a", undefined, "b"].filter((v): v is string => Boolean(v)); // string[]
```

## `satisfies` — check without widening

A `: T` annotation makes the type win (you lose narrow inference). `satisfies`
makes the value win — it is checked against `T` but stays narrowly inferred.
Use `as const satisfies T` for literal/readonly inference *and* shape-checking.

```ts
type Route = { auth: boolean };
// `: Record<string, Route>` would widen the keys away; satisfies keeps them:
const routes = {
  "/": { auth: false },
  "/users": { auth: true },
} satisfies Record<string, Route>;
```

## `readonly` by default

Mark properties `readonly` and accept `readonly T[]` / `ReadonlyArray<T>`
parameters by default. It prevents accidental mutation of caller-owned data
and documents intent, enforced at compile time.

## Avoid mutation

Treat data as immutable: build new values rather than mutating inputs or shared
state, and never reassign or mutate a parameter. This matches the org's strong
immutability preference (`checker`: "everything is immutable; any mutable state
lurking around will almost certainly be questioned in a PR"). Supporting habits:
`const` over `let`, `readonly` props / `ReadonlyArray<T>`, `as const`; reserve
in-place mutation for a tight local scope that never escapes (e.g. a local
accumulator you own). Need a genuine deep copy? Prefer the built-in `structuredClone()`
over `lodash.cloneDeep`, and **structural sharing** (spread the path you change)
over either. Enforced by `prefer-const` and `no-param-reassign`; the broader "no
in-place mutation anywhere" stance is review-only. Bad/good in
[anti-patterns](anti-patterns.md).

## Prefer array methods over `for` loops

Use `map`, `filter`, `reduce`, `flatMap`, `find`, `some`/`every` over an
imperative `for` / `for…of` loop wherever one fits — they state intent
(transform, select, fold, flatten) and return a new value rather than mutating an
accumulator. Reach for a loop only when no method expresses it cleanly: an early
`break`, `await` in sequence, or building several outputs in one pass. Don't
rebuild an array with `[...acc, x]` each iteration (O(n²)) — `map`/`reduce` build
the result in a single pass.

```ts
// ❌ imperative accumulation
const names = [];
for (const u of users) { if (u.active) names.push(u.name); }

// ✅ array methods
const names = users.filter((u) => u.active).map((u) => u.name);
```

## RORO — receive an object, return an object

For a function with more than one or two parameters (or any optional ones), take
a single **options object** instead of positional args, and **return an object**
when the result has multiple parts or may grow. You get named arguments at the
call site (no guessing order), optional/defaulted fields, and room to add a field
without breaking callers. Don't force it on a genuinely single-argument function
(`isExpired(date)`).

```ts
createUser("Jo", "jo@x.com", true);                            // ❌ positional
createUser({ name: "Jo", email: "jo@x.com", isAdmin: true });  // ✅ RORO
```

Review-only — the obvious lint proxy (`max-params`) false-positives on ordinary
callbacks, so it isn't in the config by default (it's an available knob).

## Return early

Handle edge cases up front and `return`, keeping the happy path flat and
unindented. No `else` after a `return`, and avoid deep `if`/`else` nesting.
Enforced by `no-else-return` and `max-depth`. Bad/good in
[anti-patterns](anti-patterns.md).

## Exhaustiveness

Assign the `default` case to `never` via an `assertNever` helper. When every
variant is handled the remainder is `never`; adding a new variant then stops
compiling, forcing you to handle it. (Back this with the lint rule
`@typescript-eslint/switch-exhaustiveness-check` — it is *not* in the presets.)

```ts
function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}

function render(s: State) {
  switch (s.status) {
    case "loading": return "…";
    case "success": return s.data.id;
    case "error":   return s.error.message;
    default:        return assertNever(s); // compile error if a status is added
  }
}
```

## Type from the contract's generic

When a library exposes a generic type for the thing you're implementing — a
route handler, event handler, middleware — type your function *from that generic*
(`EventHandler<"entity.changelog", "v1">`) rather than annotating each parameter
by hand or with `any`. You get the payload, envelope, and return types for free,
and they track the contract. The same applies to framework types (a typed tRPC
procedure, a Hono `Handler`). Bad/good in [anti-patterns](anti-patterns.md).

## Compose types from smaller pieces

Build types from small, reusable parts rather than redeclaring shapes: derive
with `Pick`/`Omit` from a base type, and model alternatives as a **union** rather
than a bag of optionals. Pair the union with a **type guard** (`x is T`) so a
check narrows to the right member. See [type-design](type-design.md).

```ts
type User = { id: string; name: string; email: string; role: "admin" | "member" };
type PublicUser = Omit<User, "email">;        // reuse, don't redeclare
type Credentials = Pick<User, "id" | "email">;
```

## Review notes

- Vague/abbreviated function name leaning on a comment to explain what it does
  → low (rename to be self-documenting).
- Generic that never uses its type parameter → high (it's a hidden cast).
- A handler/route typed by hand (or `any`) where the library provides a generic
  contract type (e.g. `EventHandler<...>`) → medium/high.
- Missing return type on an exported function → medium.
- `switch` over a union/enum without an exhaustive `default` → medium.
- Mutating a parameter the caller owns → medium (suggest `readonly`).
