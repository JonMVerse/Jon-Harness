# Data access (ORM types)

The data layer is a place type-safety is easily lost. The org standard for new
work is **Drizzle ORM** (Prisma is legacy — see
[org-conventions](org-conventions.md)). The rules below are about keeping types
sound, not about query semantics.

## Derive types from the schema — one source of truth

Never hand-maintain a type that mirrors a table; derive it from the schema so it
can't drift. This is the [deriving-types](type-design.md) principle applied to
the database.

```ts
// Drizzle: infer insert/select types from the table (don't hand-write them)
import { entitiesTable } from "~/db/schema";
type Entity = typeof entitiesTable.$inferSelect;
type InsertEntity = typeof entitiesTable.$inferInsert;
```

For Prisma, use the generated model types (`Prisma.UserGetPayload<...>`, or the
exported model types) — don't redeclare them. Bad/good in
[anti-patterns](anti-patterns.md).

## Don't `as`-cast query results

A query result is typed by the ORM. If you reach for `as` to shape it, the type
and the runtime have already diverged — fix the query or narrow with a guard
instead. Bad/good in [anti-patterns](anti-patterns.md).

## Keep data access in a repository, not in handlers

Per the org's layered architecture, database calls live in a
repository/data-access module, never inline in HTTP handlers, event handlers, or
business logic. This keeps the ORM types in one place and makes the layer
mockable behind a typed interface ([testing](testing.md)).

```ts
// repository — the only place the ORM is touched
export async function upsertEntity(entity: InsertEntity): Promise<Entity | undefined> {
  const [result] = await db
    .insert(entitiesTable)
    .values(entity)
    .onConflictDoUpdate({ target: entitiesTable.id, set: { name: entity.name } })
    .returning();
  return result; // typed Entity | undefined — let the caller branch on it
}
```

Return the typed result (or `undefined`) and let the caller branch on it, rather
than throwing from the data layer for an expected "no row" outcome.

## Review notes

- Hand-written type duplicating a table instead of `$inferSelect`/`$inferInsert`
  (or Prisma's generated types) → medium.
- `as` cast on a query result → high (the ORM already types it).
- ORM/`db` calls inline in a handler or business-logic layer instead of a
  repository → medium.
