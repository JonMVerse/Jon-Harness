export function applyDiscount(order: { total: number }, pct: number) {
  order.total = order.total * (1 - pct);
  return order;
}
