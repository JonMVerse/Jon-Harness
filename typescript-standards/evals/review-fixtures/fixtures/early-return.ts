export function classify(n: number): string {
  if (n > 0) {
    return "positive";
  } else {
    if (n < 0) {
      return "negative";
    } else {
      return "zero";
    }
  }
}
