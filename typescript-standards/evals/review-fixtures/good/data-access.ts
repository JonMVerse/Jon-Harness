import { db } from "~/db";
import { usersTable } from "~/db/schema";
import { eq } from "drizzle-orm";

type User = typeof usersTable.$inferSelect;

export async function getUser(id: string): Promise<User | undefined> {
  return db.query.usersTable.findFirst({ where: eq(usersTable.id, id) });
}
