# Error handling

Use standard, language-native error handling — `throw` and `try/catch` with
typed `Error`s. It's the readable default and the org's approach.

## Catch as `unknown`, narrow before use

JavaScript can `throw` anything, so a caught value is `unknown` (automatic
under `strict` / `useUnknownInCatchVariables`, TS 4.0+). Narrow before you
touch it.

```ts
try {
  await doWork();
} catch (err) {            // err: unknown
  log(err instanceof Error ? err.message : String(err));
}
```

## Only ever `throw` an `Error`

Only `Error` (and subclasses) carry a stack trace and reliable
`.message` / `.name`. Throwing strings or plain objects breaks `instanceof`
narrowing and logging. Enforce with `@typescript-eslint/only-throw-error`.

```ts
throw new Error("Order not found");          // good
// throw "Order not found";                  // bad — no stack, breaks narrowing
```

Subclass `Error` for domain errors you need to distinguish:

```ts
class NotFoundError extends Error {
  readonly name = "NotFoundError";
}
```

## Throw; don't wrap returns in `Result` types

`Result`/`Either` types (`ts-results-es`, `neverthrow`, fp-ts, Effect, or a
hand-rolled tagged union) are a legitimate, widely-used approach — they put
failure in the type signature, which `throw` does not (a thrown error is
invisible in the signature and propagates silently). It's a real tradeoff.

**This skill standardises on plain `throw`/`catch`** for consistency and
readability: errors propagate to a boundary that handles them, control flow stays
linear, and it composes naturally with `async/await` — without every caller
having to unwrap a `Result`. So don't introduce Result wrappers in new code; if
a codebase already uses them, that's its house style. Bad/good in
[anti-patterns](anti-patterns.md).

Reserve `try/catch` for where you can actually recover or add context. (Runtime
validation at I/O boundaries still uses zod — `.parse` throws, `.safeParse`
returns a parsed result; that's parsing, not a general error-handling style. See
[runtime-validation](runtime-validation.md).)

## Multiverse note

- **Throw `TRPCError` with a typed `code`** at tRPC boundaries.
- **Centralise custom error classes** in one `errors.ts` rather than scattering
  them.
- **Log `error.message`, never the raw error/cause chain** — a PII-safety rule.
  The scaffold calls it out, and the org source is
  [`global-tech-docs/docs/removing-pii-from-code.md`](https://github.com/Multiverse-io/global-tech-docs/blob/main/docs/removing-pii-from-code.md).
  Use `error instanceof Error ? error.message : String(error)`.
- **Logging discipline, generally**: every log line should carry an **ID**
  (entity id, request id, event id) for correlation, but **never the message
  payload or PII**. `logger.info("processed order", { orderId })`, not
  `logger.info("processed order", order)`.

See [org-conventions](org-conventions.md).

## Review notes

- A swallowed error — empty `catch {}`, or one that logs nothing and continues
  → **high**.
- `throw` of a non-`Error` value → high.
- A caught value used as if it were an `Error` without an `instanceof` /
  narrowing check → medium.
- A return wrapped in a `Result`/`Either` type where a plain `throw` reads
  better → low.

Sources: [useUnknownInCatchVariables](https://www.typescriptlang.org/tsconfig/useUnknownInCatchVariables.html), [Narrowing handbook](https://www.typescriptlang.org/docs/handbook/2/narrowing.html).
