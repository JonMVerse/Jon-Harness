export enum OrderStatus {
  Pending,
  Shipped,
  Delivered,
}

export function label(s: OrderStatus): string {
  return OrderStatus[s];
}
