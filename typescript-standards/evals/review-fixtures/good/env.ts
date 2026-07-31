// config.ts — the one place process.env is read; validate here, export typed values.
// eslint-disable-next-line no-restricted-properties -- sanctioned single read
const rawPort = process.env.PORT ?? "3000";

if (!rawPort) {
  throw new Error("PORT must not be empty");
}

const port = Number(rawPort);
if (!Number.isInteger(port)) throw new Error(`invalid PORT: ${rawPort}`);

export const config = { port };
