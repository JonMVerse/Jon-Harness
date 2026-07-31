export function labelEvens(items: number[]): string[] {
  return items
    .filter((n) => n > 0 && n % 2 === 0 && n % 5 === 0)
    .map((n) => `${n}: positive even multiple-of-five`);
}
