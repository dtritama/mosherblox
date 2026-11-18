import { demoOrders } from "@/lib/orders/demo-orders";
import { createOrderId, normalizeOrderId } from "@/lib/orders/order-id";
import type { NewOrder, Order } from "@/lib/orders/types";

/**
 * The only place the UI talks to for orders. Phase 1 uses a demo implementation that keeps
 * orders in this browser (localStorage). Phase 2 swaps in an API-backed implementation with the
 * same interface — the components don't change. The server must then also recompute prices,
 * rate-limit lookups and own the order status (updated by the payment gateway webhook).
 */
export interface OrderService {
  readonly isDemo: boolean;
  createOrder(input: NewOrder): Promise<Order>;
  /** Both the ID and the WhatsApp number must match, so an ID alone can't reveal an order. */
  findOrder(id: string, whatsapp: string): Promise<Order | null>;
}

const STORAGE_KEY = "mosherblox:demo-orders";

function readStored(): Order[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as Order[]) : [];
  } catch {
    return [];
  }
}

function writeStored(orders: Order[]) {
  try {
    // Keep the demo store small.
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders.slice(0, 20)));
  } catch {
    // Storage can be unavailable (private mode, blocked site data) — the demo still works for this visit.
  }
}

const demoOrderService: OrderService = {
  isDemo: true,
  async createOrder(input) {
    const order: Order = { ...input, id: createOrderId(), status: "pending", createdAt: new Date().toISOString() };
    writeStored([order, ...readStored()]);
    return order;
  },
  async findOrder(id, whatsapp) {
    const wanted = normalizeOrderId(id);
    const match = [...readStored(), ...demoOrders].find((order) => order.id === wanted);
    return match && match.whatsapp === whatsapp ? match : null;
  },
};

export const orderService: OrderService = demoOrderService;
