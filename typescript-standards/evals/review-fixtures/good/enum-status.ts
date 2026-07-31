export const OrderStatus = {
  Pending: "pending",
  Shipped: "shipped",
  Delivered: "delivered",
} as const;

export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];

export function isFinal(status: OrderStatus): boolean {
  return status === OrderStatus.Delivered;
}
