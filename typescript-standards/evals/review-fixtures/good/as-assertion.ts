function isConfig(x: unknown): x is { id: string } {
  return typeof x === "object" && x !== null && "id" in x;
}

const raw: unknown = JSON.parse("{}");
export const config = isConfig(raw) ? raw : { id: "" };
