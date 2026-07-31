# Testing (TypeScript)

The org standard is **Vitest** (no Jest — see [org-conventions](org-conventions.md)).
This covers the type-safety side of tests; it is not a testing-strategy guide.

## Reusable, typed mocks — never `as any`

The usual reason `any` creeps into a test is to satisfy a type with a partial
object. Don't cast it away — build a **reusable, typed factory** with overrides,
kept in a shared test-support module. The mock stays type-safe, so when the type
changes the compiler flags every spec that drifts. (Bad/good pairing in
[anti-patterns](anti-patterns.md).)

## Mock against a minimal typed interface

When mocking a collaborator, define the *minimal interface at the point of use*
and mock that — not the whole concrete dependency. It decouples the test and
keeps the mock typed.

```ts
// production: business logic depends on a narrow interface
interface UserWriter {
  save(user: User): Promise<void>;
}

// test: a typed vi.fn() mock that matches the interface
const writer: UserWriter = { save: vi.fn() };
```

## Vitest idioms

| Idiom | Use |
|-------|-----|
| `vi.fn()` | A typed mock function. Assert with `expect(fn).toHaveBeenCalledWith(...)`. |
| `vi.mock('./module')` | Replace a module. Pair with `vi.importMock('./module')` to get the typed mock members. |
| `vi.restoreAllMocks()` in `afterEach` | Reset spies/mocks between tests so state doesn't leak. |
| `vi.waitFor(fn, { timeout, interval })` | Poll for an async condition (e.g. a DB row appearing) instead of a fixed `sleep`. |
| `expect.objectContaining({ ... })` | Assert the fields you care about without pinning the whole object. |

```ts
vi.mock("./entities");

describe("handleEvent", () => {
  const { upsertEntity } = await vi.importMock<typeof import("./entities")>("./entities");
  afterEach(() => vi.restoreAllMocks());

  it("upserts the mapped fields", async () => {
    upsertEntity.mockResolvedValue({ id: "1" });
    await handleEvent(event);
    expect(upsertEntity).toHaveBeenCalledWith(expect.objectContaining({ id: "1" }));
  });
});
```

## Unit vs integration

- **Unit** (`*.test.ts`) — mock the repository / collaborators; assert behaviour.
- **Integration** (`*.integration.test.ts`) — real dependencies (e.g. an
  isolated Postgres via `@multiverse-io/vitest-utils`); assert end state. Some
  domains use a more specific extension (e.g. `*.rabbitmq.test.ts`).

Pick one approach per concern — don't stack overlapping test layers.

## Review notes

- `as any` / `as T` on a partial mock → flag; suggest a reusable typed factory.
- An untyped mock (`{} as Service`) where a minimal typed interface would do → medium.
- A fixed `sleep`/timeout where `vi.waitFor` fits an async assertion → low.
