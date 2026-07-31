import { db } from "~/db";

type User = { id: string; name: string };

export async function getUser(id: string) {
  const rows = await db.query(id);
  return rows[0] as User;
}
