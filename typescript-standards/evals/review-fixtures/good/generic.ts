import { z } from "zod";

export function coerce<T>(schema: z.ZodType<T>, value: unknown): T {
  return schema.parse(value);
}
