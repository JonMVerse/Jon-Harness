export function applyDiscount(order: { total: number }, pct: number): { total: number } {
  return { ...order, total: order.total * (1 - pct) };
}
