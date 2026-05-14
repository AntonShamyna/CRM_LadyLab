export interface OrderLineDraft {
  quantity: number;
  salePriceKopecks: number;
}

export const calculateDiscountAmount = (productsTotalKopecks: number, discountPercent: number) => {
  return Math.round((productsTotalKopecks * discountPercent) / 100);
};

export const calculateTotals = (
  productsTotalKopecks: number,
  discountPercent: number,
  deliveryPriceKopecks: number,
) => {
  const discountAmountKopecks = calculateDiscountAmount(productsTotalKopecks, discountPercent);
  const productsTotalAfterDiscountKopecks = productsTotalKopecks - discountAmountKopecks;

  return {
    productsTotalKopecks,
    discountAmountKopecks,
    productsTotalAfterDiscountKopecks,
    totalToPayKopecks: productsTotalAfterDiscountKopecks + deliveryPriceKopecks,
  };
};

export const allocateDiscountToLines = (lines: OrderLineDraft[], discountPercent: number) => {
  const rawTotals = lines.map((line) => line.quantity * line.salePriceKopecks);
  const productsTotalKopecks = rawTotals.reduce((sum, value) => sum + value, 0);
  const { productsTotalAfterDiscountKopecks } = calculateTotals(productsTotalKopecks, discountPercent, 0);

  if (productsTotalKopecks === 0) {
    return lines.map(() => 0);
  }

  let allocatedSum = 0;
  return rawTotals.map((rawTotal, index) => {
    if (index === rawTotals.length - 1) {
      return productsTotalAfterDiscountKopecks - allocatedSum;
    }

    const value = Math.round((rawTotal / productsTotalKopecks) * productsTotalAfterDiscountKopecks);
    allocatedSum += value;
    return value;
  });
};
