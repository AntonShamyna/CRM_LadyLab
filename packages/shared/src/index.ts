import { z } from 'zod';

export const roles = ['SUPER_ADMIN', 'MANAGER'] as const;
export type Role = (typeof roles)[number];

export const orderStatuses = [
  'ON_ASSEMBLY',
  'AWAITING_PAYMENT',
  'CLOSED',
  'RETURNED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const deliveryServices = ['BELPOST', 'EUROPOST', 'CDEK', 'AUTOLIGHT', 'PICKUP'] as const;
export type DeliveryService = (typeof deliveryServices)[number];

export const paymentMethods = ['CASH_ON_DELIVERY', 'CASH', 'CASHLESS'] as const;
export type PaymentMethod = (typeof paymentMethods)[number];

export const returnStockActions = ['RETURN_TO_STOCK', 'WRITE_OFF'] as const;
export type ReturnStockAction = (typeof returnStockActions)[number];

export const reminderStatuses = ['ACTIVE', 'DONE', 'CANCELLED'] as const;
export type ReminderStatus = (typeof reminderStatuses)[number];

export const productUnits = ['G', 'ML', 'KG', 'PCS'] as const;
export type ProductUnit = (typeof productUnits)[number];

export const countedOrderStatuses: OrderStatus[] = ['ON_ASSEMBLY', 'AWAITING_PAYMENT', 'CLOSED'];
export const terminalOrderStatuses: OrderStatus[] = ['RETURNED', 'CANCELLED'];

export const orderStatusLabels: Record<OrderStatus, string> = {
  ON_ASSEMBLY: 'На сборке',
  AWAITING_PAYMENT: 'Ожидает оплаты',
  CLOSED: 'Закрыт',
  RETURNED: 'Возврат',
  CANCELLED: 'Отменен',
};

export const deliveryServiceLabels: Record<DeliveryService, string> = {
  BELPOST: 'Белпочта',
  EUROPOST: 'Европочта',
  CDEK: 'СДЭК',
  AUTOLIGHT: 'Автолайт',
  PICKUP: 'Самовывоз',
};

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH_ON_DELIVERY: 'Наложенный платеж',
  CASH: 'Наличный платеж',
  CASHLESS: 'Безналичный платеж',
};

export const productUnitLabels: Record<ProductUnit, string> = {
  G: 'г',
  ML: 'мл',
  KG: 'кг',
  PCS: 'шт',
};

export const returnStockActionLabels: Record<ReturnStockAction, string> = {
  RETURN_TO_STOCK: 'Вернуть на склад',
  WRITE_OFF: 'Списать',
};

export const statusPriority: Record<OrderStatus, number> = {
  ON_ASSEMBLY: 1,
  AWAITING_PAYMENT: 2,
  CLOSED: 3,
  RETURNED: 4,
  CANCELLED: 5,
};

export const canTransitionOrder = (from: OrderStatus, to: OrderStatus): boolean => {
  const allowed: Record<OrderStatus, OrderStatus[]> = {
    ON_ASSEMBLY: ['AWAITING_PAYMENT', 'CANCELLED'],
    AWAITING_PAYMENT: ['CLOSED', 'RETURNED', 'CANCELLED'],
    CLOSED: [],
    RETURNED: [],
    CANCELLED: [],
  };

  return allowed[from].includes(to);
};

export const moneySchema = z.number().int().min(0);
export const discountSchema = z.number().min(0).max(100);

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  batchId: z.string().min(1),
  quantity: z.number().int().positive(),
});

export const createOrderSchema = z.object({
  customerId: z.string().min(1),
  deliveryService: z.enum(deliveryServices),
  deliveryPriceKopecks: moneySchema,
  paymentMethod: z.enum(paymentMethods),
  discountPercent: discountSchema,
  comment: z.string().optional(),
  items: z.array(orderItemSchema).min(1),
});

export type CreateOrderPayload = z.infer<typeof createOrderSchema>;

export const returnOrderSchema = z.object({
  stockAction: z.enum(returnStockActions),
  comment: z.string().optional(),
});

export type ReturnOrderPayload = z.infer<typeof returnOrderSchema>;

export interface AnalyticsSummary {
  ordersCount: number;
  returnsCount: number;
  goodsRevenueKopecks: number;
  deliveryRevenueKopecks: number;
  totalToPayKopecks: number;
  costKopecks: number;
  grossProfitKopecks: number;
  expensesKopecks: number;
  netProfitKopecks: number;
  averageCheckKopecks: number;
  newCustomersCount: number;
  repeatOrdersCount: number;
}

export interface ProductAnalyticsRow {
  productName: string;
  soldQuantity: number;
  salesKopecks: number;
  costKopecks: number;
  profitKopecks: number;
  ordersCount: number;
}

export const calculateDiscount = (productsTotalKopecks: number, discountPercent: number): number => {
  return Math.round((productsTotalKopecks * discountPercent) / 100);
};

export const calculateOrderTotals = (
  productsTotalKopecks: number,
  discountPercent: number,
  deliveryPriceKopecks: number,
) => {
  const discountAmountKopecks = calculateDiscount(productsTotalKopecks, discountPercent);
  const productsTotalAfterDiscountKopecks = productsTotalKopecks - discountAmountKopecks;

  return {
    discountAmountKopecks,
    productsTotalAfterDiscountKopecks,
    totalToPayKopecks: productsTotalAfterDiscountKopecks + deliveryPriceKopecks,
  };
};

export const formatBYN = (kopecks: number): string => {
  return new Intl.NumberFormat('ru-BY', {
    style: 'currency',
    currency: 'BYN',
    minimumFractionDigits: 2,
  }).format(kopecks / 100);
};

export const formatDate = (value: string | Date): string => {
  return new Intl.DateTimeFormat('ru-BY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
};

export const formatDateTime = (value: string | Date): string => {
  return new Intl.DateTimeFormat('ru-BY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
};
