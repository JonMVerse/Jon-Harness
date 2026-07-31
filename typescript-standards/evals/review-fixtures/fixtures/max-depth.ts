export function labelEvens(items: number[]): string[] {
  const labels: string[] = [];
  for (const n of items) {
    if (n > 0) {
      if (n % 2 === 0) {
        if (n % 5 === 0) {
          labels.push(`${n}: positive even multiple-of-five`);
        }
      }
    }
  }
  return labels;
}
